import { getSandbox, type Sandbox } from '@cloudflare/sandbox';
import { normalizeOutput } from '../../../packages/shared/game';
export { Sandbox } from '@cloudflare/sandbox';
type Env={Sandbox:DurableObjectNamespace<Sandbox>;ISOLATION_VERIFIED:string};
type Job={id:string;attempt:number;source:string;kind:'run'|'submit';tests:{input:string;output:string}[]};
export default {
 async fetch(req:Request,env:Env):Promise<Response> {
  // This Worker has no public route. It is reached only through a private service binding.
  if(env.ISOLATION_VERIFIED!=='true')return Response.json({verdict:'JUDGE_ERROR',message:'Isolation verification required.'},{status:503});
  if(req.method!=='POST'||new URL(req.url).pathname!=='/execute')return new Response('Not found',{status:404});
  const job=await req.json() as Job;
  if(!/^[\w-]{1,80}$/.test(job.id)||!Number.isSafeInteger(job.attempt)||!['run','submit'].includes(job.kind)||typeof job.source!=='string'||new TextEncoder().encode(job.source).length>65536||!Array.isArray(job.tests)||job.tests.length>100)return new Response('Invalid job',{status:400});
  let runtimeMs=0;let output='';const start=Date.now();
  const sandbox=getSandbox(env.Sandbox,`${job.id}-${job.attempt}`,{sleepAfter:'30s'});
  try {
   await sandbox.writeFile('/workspace/solution.py',job.source);
   for(const test of job.tests) {
    if(Date.now()-start>30000)return Response.json({verdict:'JUDGE_ERROR'});
    if(typeof test.input!=='string'||test.input.length>1048576)return Response.json({verdict:'JUDGE_ERROR'});
    await sandbox.writeFile('/workspace/input.txt',test.input);
    const execution=await sandbox.exec('python3 -I /opt/judge/runner.py',{timeout:7000});
    if(!execution.success)return Response.json({verdict:'JUDGE_ERROR'});
    const result=JSON.parse(execution.stdout) as {verdict:string;stdout:string;stderr:string;runtimeMs:number};
    runtimeMs+=result.runtimeMs;
    if(job.kind==='run')output+=(result.stdout+ (result.stderr?'\n'+result.stderr:'')).slice(0,65536-output.length);
    if(result.verdict!=='OK')return Response.json({verdict:result.verdict,runtimeMs,...(job.kind==='run'?{output}:{})});
    if(normalizeOutput(result.stdout)!==normalizeOutput(test.output))return Response.json({verdict:'WA',runtimeMs,...(job.kind==='run'?{output}:{})});
   }
   return Response.json({verdict:'AC',runtimeMs,...(job.kind==='run'?{output}:{})});
  } catch { return Response.json({verdict:'JUDGE_ERROR'}); }
  finally { await sandbox.destroy(); }
 }
} satisfies ExportedHandler<Env>;
