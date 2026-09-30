import { spawn } from 'node:child_process';
const children = [
 spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--config','apps/worker/wrangler.jsonc','--ip','127.0.0.1','--port','8787'],{stdio:'inherit'}),
 spawn(process.execPath,['node_modules/vite/bin/vite.js','--config','apps/web/vite.config.ts'],{stdio:'inherit'})
];
console.log('\nCodeClash: http://127.0.0.1:5173\nPython judge stays disabled until Docker isolation is verified.\n');
function stop(){for(const child of children)child.kill();process.exit();}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
for(const child of children)child.on('exit',code=>{if(code)stop();});
