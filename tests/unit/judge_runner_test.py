"""Trusted verdict classification only. Does not launch or execute contestant code."""
import importlib.util
import pathlib
import signal
import unittest
from unittest.mock import patch, MagicMock, mock_open
from types import SimpleNamespace

spec = importlib.util.spec_from_file_location('runner', pathlib.Path(__file__).parents[2] / 'judge' / 'runner.py')
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)

class VerdictTests(unittest.TestCase):
    def setUp(self):
        for name, value in [("SIGXCPU", 24), ("SIGKILL", 9)]:
            stub = patch.object(runner.signal, name, value, create=True)
            stub.start()
            self.addCleanup(stub.stop)
    def test_success_requires_trusted_start(self):
        self.assertEqual(runner.classify('OK', 0, '{"child-pid":12}\n{"exit-code":0}\n'), 'OK')
        self.assertEqual(runner.classify('OK', 0, ''), 'JUDGE_ERROR')
    def test_contestant_stderr_cannot_create_infrastructure_error(self):
        self.assertEqual(runner.classify('OK', 1, '{"child-pid":12}\n{"exit-code":1}\n'), 'RE')
    def test_timeout_and_output_limit(self):
        for verdict in ['TLE', 'OLE']:
            self.assertEqual(runner.classify(verdict, -9, '{"child-pid":12}\n'), verdict)
    def test_cpu_limit(self):
        self.assertEqual(runner.classify("OK", 152, '{"child-pid":12}\n{"exit-code":152}\n'), "TLE")
    def test_pre_exec_failure_is_infrastructure_error(self):
        self.assertEqual(runner.classify("OK", 1, '{"child-pid":12}\n'), "JUDGE_ERROR")
    def test_malformed_status_fails_closed(self):
        self.assertEqual(runner.classify('OK', 0, 'invalid'), 'JUDGE_ERROR')

class SupervisionTests(unittest.TestCase):
    def test_successful_child_is_waited_for_before_cleanup_kill(self):
        # Mock every process and OS call: this test never executes Python submissions.
        proc = MagicMock(pid=123, returncode=0)
        proc.stdout.fileno.return_value = 10
        proc.stderr.fileno.return_value = 11
        status = MagicMock()
        status.fileno.return_value = 12
        selector = MagicMock()
        registered = {}
        selector.register.side_effect = lambda stream, events, name: registered.update({stream.fileno(): SimpleNamespace(fileobj=stream, data=name)})
        selector.unregister.side_effect = lambda stream: registered.pop(stream.fileno())
        selector.get_map.side_effect = lambda: registered
        selector.select.side_effect = lambda timeout: [(key, 1) for key in list(registered.values())]
        chunks = {10: [b'answer\n', b''], 11: [b'bwrap: contestant text', b''], 12: [b'{"child-pid":123}\n{"exit-code":0}\n', b'']}
        actions = []
        proc.wait.side_effect = lambda **kwargs: actions.append('wait') or 0
        with patch.object(runner.os, 'pipe', return_value=(12,13)), patch.object(runner.os, 'close'), \
             patch.object(runner.os, 'fdopen', return_value=status), patch.object(runner.os, 'read', side_effect=lambda fd,n: chunks[fd].pop(0)), \
             patch.object(runner.os, 'killpg', create=True, side_effect=lambda *args: actions.append('kill')), \
             patch.object(runner.signal, 'SIGKILL', 9, create=True), patch.object(runner.subprocess, 'Popen', return_value=proc), \
             patch.object(runner.selectors, 'DefaultSelector', return_value=selector), patch('builtins.open', mock_open()):
            result = runner.run()
        self.assertEqual(result['verdict'], 'OK')
        self.assertEqual(result['stdout'], 'answer\n')
        self.assertEqual(actions, ['wait','kill','wait'])

if __name__ == '__main__':
    unittest.main()
