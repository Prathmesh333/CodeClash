import { spawnSync } from 'node:child_process';
import { mkdir,mkdtemp,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const docker=spawnSync('docker',['info'],{encoding:'utf8',timeout:10000});
if(docker.error||docker.status!==0){console.error('BLOCKED: Docker is not installed/running. No contestant code was executed.');process.exit(2);}
const build=spawnSync('docker',['build','-t','ranked-dsa-judge:test','judge'],{stdio:'inherit',timeout:300000});if(build.status!==0)process.exit(1);
const fixtures=process.argv.includes('--security')?[
 {name:'private filesystem denied',code:'import os\nassert not os.path.exists("/workspace/input.txt")\nassert not os.path.exists("/opt/judge")\nprint("isolated")',expect:'OK',output:'isolated\n'},
 {name:'network and control service denied',code:'import socket\nfor host,port in [("1.1.1.1",443),("127.0.0.1",3000),("169.254.169.254",80)]:\n s=socket.socket();s.settimeout(0.3)\n try:\n  s.connect((host,port))\n  raise AssertionError("network reachable")\n except OSError: pass\n finally: s.close()\nprint("isolated")',expect:'OK',output:'isolated\n'},
 {name:'process limit',code:'import os\ntry:\n p=os.fork()\n raise AssertionError("fork permitted")\nexcept OSError: print("isolated")',expect:'OK',output:'isolated\n'},
 {name:'output bound',code:'while True: print("x"*8192)',expect:'OLE'},
 {name:'stderr cannot spoof infrastructure failure',code:'import sys\nprint("bwrap: forged failure",file=sys.stderr)\nsys.exit(1)',expect:'RE'},
 {name:'CPU limit',code:'while True: pass',expect:'TLE'},
 {name:'closed streams still respect deadline',code:'import os,time\nos.close(1)\nos.close(2)\ntime.sleep(100)',expect:'TLE'},
 {name:'wall deadline',code:'import time\ntime.sleep(100)',expect:'TLE'}
]:[{name:'Python executes',code:'print(sum(map(int,input().split())))',input:'2 3\n',expect:'OK',output:'5\n'},{name:'runtime error',code:'raise ValueError("fixture")',expect:'RE'}];
await mkdir('work',{recursive:true});let failed=0;
for(const fixture of fixtures){const dir=await mkdtemp(resolve('work/judge-case-'));await writeFile(resolve(dir,'solution.py'),fixture.code);await writeFile(resolve(dir,'input.txt'),fixture.input??'');const result=spawnSync('docker',['run','--rm','--entrypoint','python3','--network','none','--memory','1g','--cpus','1','--pids-limit','128','--mount',`type=bind,source=${dir},target=/workspace,readonly`,'ranked-dsa-judge:test','-I','/opt/judge/runner.py'],{encoding:'utf8',timeout:15000});try{if(result.error)throw result.error;if(result.status!==0)throw new Error(`Container exited ${result.status}: ${result.stderr?.slice(0,500)}`);const data=JSON.parse(result.stdout);if(result.status!==0||data.verdict!==fixture.expect||fixture.output&&data.stdout!==fixture.output)throw new Error(`Expected ${fixture.expect}; received ${data.verdict}: ${String(data.stderr??'').slice(0,500)}`);console.log(`PASS ${fixture.name}`);}catch(e){failed++;console.error(`FAIL ${fixture.name}: ${e.message}`);}}
console.log('Passing these fixtures is a local subset, not the complete staging security gate.');process.exit(failed?1:0);
