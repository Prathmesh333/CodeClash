import WebSocket from 'ws';
import { readFile,mkdir,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const args=Object.fromEntries(process.argv.slice(2).reduce((pairs,x,i,a)=>x.startsWith('--')?[...pairs,[x.slice(2),a[i+1]]]:pairs,[]));
const base=args['base-url'];const players=Number(args.players??100),rounds=Number(args.rounds??20),seed=Number(args.seed??101);
if(!base||!process.env.SIM_SESSIONS_FILE||!process.env.SIM_SOLUTIONS_FILE){console.error('BLOCKED: supply --base-url, SIM_SESSIONS_FILE (JSON cookie strings) and SIM_SOLUTIONS_FILE (problemId → Python source). Test identities must already exist.');process.exit(2);}
const health=await(await fetch(new URL('/api/health',base))).json();
if(health.environment==='production'||health.judge!=='configured'||args.judge!=='real')throw new Error('Simulation requires a local/staging real judge and refuses production.');
if(players%2||players<2||players>1000||rounds<1||rounds>20)throw new Error('Invalid bounded simulation size.');
const cookies=JSON.parse(await readFile(process.env.SIM_SESSIONS_FILE,'utf8')).slice(0,players);const solutions=JSON.parse(await readFile(process.env.SIM_SOLUTIONS_FILE,'utf8'));if(cookies.length!==players||new Set(cookies).size!==players)throw new Error('Supply a unique authenticated session for every player.');
const pause=ms=>new Promise(r=>setTimeout(r,ms));let randomState=seed;function random(){randomState=(1664525*randomState+1013904223)>>>0;return randomState/2**32;}
const metrics={seed,players,rounds,judge:'real',status:'RUNNING',invariantViolations:0,profile:'baseline',note:'Baseline only; fault injection and full release latency/cost gates are not yet implemented.',matches:[],requestMs:[]};
async function api(cookie,path,data){const start=performance.now();const res=await fetch(new URL('/api'+path,base),{method:data===undefined?'GET':'POST',headers:{Cookie:cookie,Origin:base,'Content-Type':'application/json','Idempotency-Key':crypto.randomUUID()},body:data===undefined?undefined:JSON.stringify(data)});metrics.requestMs.push(performance.now()-start);const payload=await res.json();if(!res.ok)throw new Error(payload.message??`HTTP ${res.status}`);return payload;}
const uniqueUsers=await Promise.all(cookies.map(async c=>(await api(c,'/me')).user?.id));if(uniqueUsers.some(u=>!u)||new Set(uniqueUsers).size!==players)throw new Error('Sessions must belong to distinct accounts.');
async function play(cookie,index){
 let q=await api(cookie,'/matchmaking/join',{});const start=Date.now();
 while(!q.matchId){if(Date.now()-start>125000)throw new Error('Queue timeout; check eligible problem bank and pairing constraints.');await pause(1000);q=await api(cookie,'/matchmaking/status');}
 const socketUrl=new URL(`/api/match/${q.matchId}/ws`,base);socketUrl.protocol=socketUrl.protocol==='https:'?'wss:':'ws:';
 const socket=new WebSocket(socketUrl,{headers:{Cookie:cookie,Origin:base}});socket.on('error',()=>{});let latest;
 socket.on('message',msg=>{try{latest=JSON.parse(msg.toString()).payload;}catch{}});
 const ping=setInterval(()=>{if(socket.readyState===WebSocket.OPEN)socket.send(JSON.stringify({protocolVersion:1,type:'client.ping'}));},5000);
 try{
  await api(cookie,`/match/${q.matchId}/ready`,{});
  while(!latest?.problem){if(Date.now()-start>150000)throw new Error('Problem reveal timeout.');await pause(250);}
  if(!solutions[latest.problem.id])throw new Error(`Missing accepted fixture for ${latest.problem.id}`);
  await pause(200+random()*1200);
  try{await api(cookie,`/match/${q.matchId}/submit`,{source:solutions[latest.problem.id],language:'python',problemVersion:1});}catch(e){if(!e.message.includes('no longer accepting'))throw e;}
  while(!latest?.settled){if(Date.now()-start>210000)throw new Error('Result/settlement timeout.');await pause(500);}
  if(latest.players.length!==2||latest.players[0].id===latest.players[1].id)metrics.invariantViolations++;
  return {id:latest.id,user:uniqueUsers[index],outcome:latest.outcome,phase:latest.phase};
 }finally{clearInterval(ping);socket.close();}
}
try{for(let round=0;round<rounds;round++){const results=await Promise.all(cookies.map(play));const ids=new Map();for(const result of results){const prior=ids.get(result.id);if(prior&&JSON.stringify(prior.outcome)!==JSON.stringify(result.outcome))metrics.invariantViolations++;ids.set(result.id,result);}if(ids.size!==players/2)metrics.invariantViolations++;metrics.matches.push(...ids.values());console.log(`Round ${round+1}/${rounds}: ${ids.size} matches completed`);}metrics.status=metrics.invariantViolations?'FAIL':'BASELINE_COMPLETE';}catch(e){metrics.status='FAIL';metrics.error=e.message;process.exitCode=1;}finally{const out=resolve(args.output??'artifacts/simulation');await mkdir(out,{recursive:true});await writeFile(resolve(out,'report.json'),JSON.stringify(metrics,null,2));console.log('This baseline report does not satisfy the release gate.');}
