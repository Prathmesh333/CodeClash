"""Execute one test only. Requires bubblewrap user/net/PID namespaces.

If the host disallows a required namespace, fail as JUDGE_ERROR. Never fall
back to unsandboxed Python. This file must only run in the judge container.
"""
import json
import os
import selectors
import signal
import subprocess
import time

def classify(verdict, returncode, status):
    # Only bubblewrap's private status channel can attest that isolation started.
    try:
        events = [json.loads(line) for line in status.splitlines() if line]
    except (ValueError, TypeError):
        return 'JUDGE_ERROR'
    if not all(isinstance(event, dict) for event in events) or not any('child-pid' in event for event in events):
        return 'JUDGE_ERROR'
    if verdict != 'OK':
        return verdict
    # bubblewrap omits exit-code when pre-exec setup fails, even if it created a child.
    if not any(event.get('exit-code') == returncode for event in events):
        return 'JUDGE_ERROR'
    if returncode == 0:
        return 'OK'
    if returncode in (-signal.SIGXCPU, 128 + signal.SIGXCPU):
        return 'TLE'
    return 'RE' if returncode > 0 and returncode != 128 + signal.SIGKILL else 'JUDGE_ERROR'

def run():
    status_read, status_write = os.pipe()
    command = ['bwrap', '--json-status-fd', str(status_write), '--unshare-all', '--die-with-parent', '--new-session',
               '--uid', '65534', '--gid', '65534', '--cap-drop', 'ALL',
               '--ro-bind', '/usr', '/usr', '--symlink', 'usr/bin', '/bin',
               '--symlink', 'usr/lib', '/lib', '--symlink', 'usr/lib64', '/lib64',
               '--proc', '/proc', '--dev', '/dev', '--size', '16777216', '--tmpfs', '/tmp',
               '--ro-bind', '/workspace/solution.py', '/solution.py',
               '--ro-bind', '/opt/judge/limits.py', '/limits.py',
               '--clearenv', '--setenv', 'PATH', '/usr/bin', '--setenv', 'HOME', '/tmp',
               '--chdir', '/tmp', '/usr/bin/python3', '-I', '/limits.py']
    start = time.monotonic()
    with open('/workspace/input.txt', 'rb') as stdin:
        proc = subprocess.Popen(command, stdin=stdin, stdout=subprocess.PIPE,
                                stderr=subprocess.PIPE, start_new_session=True, pass_fds=(status_write,))
        os.close(status_write)
        buffers = {'stdout': bytearray(), 'stderr': bytearray(), 'status': bytearray()}
        sel = selectors.DefaultSelector()
        sel.register(proc.stdout, selectors.EVENT_READ, 'stdout')
        sel.register(proc.stderr, selectors.EVENT_READ, 'stderr')
        status_stream = os.fdopen(status_read, 'rb', buffering=0)
        sel.register(status_stream, selectors.EVENT_READ, 'status')
        verdict = 'OK'
        try:
            while sel.get_map():
                if time.monotonic() - start >= 5:
                    verdict = 'TLE'
                    break
                for key, _ in sel.select(0.05):
                    chunk = os.read(key.fileobj.fileno(), 8192)
                    if not chunk:
                        sel.unregister(key.fileobj)
                        continue
                    buffer = buffers[key.data]
                    if len(buffer) + len(chunk) > 65536:
                        verdict = 'OLE'
                        break
                    buffer.extend(chunk)
                if verdict != 'OK':
                    break
            if verdict == 'OK':
                try:
                    proc.wait(timeout=max(0.01, 5 - (time.monotonic() - start)))
                except subprocess.TimeoutExpired:
                    verdict = 'TLE'
        finally:
            # Kill the namespace/process group even if the initial child exited.
            try:
                os.killpg(proc.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            proc.wait(timeout=2)
            sel.close()
            status_stream.close()
            proc.stdout.close()
            proc.stderr.close()
        stderr = buffers['stderr'].decode('utf-8', errors='replace')
        verdict = classify(verdict, proc.returncode, buffers['status'].decode('utf-8', errors='replace'))
        return {'verdict': verdict, 'stdout': buffers['stdout'].decode('utf-8', errors='replace'),
                'stderr': stderr, 'runtimeMs': round((time.monotonic() - start) * 1000)}

if __name__ == '__main__':
    try:
        print(json.dumps(run()))
    except Exception:
        print(json.dumps({'verdict': 'JUDGE_ERROR', 'stdout': '', 'stderr': '', 'runtimeMs': 0}))
