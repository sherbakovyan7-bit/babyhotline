import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from './server.mjs';

test('reserved numbers survive restart and require their secret',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'hotline-accounts-'));
 let server;
 async function start(){server=createServer({accountsFile:join(dir,'accounts.json')});await new Promise(r=>server.listen(0,'127.0.0.1',r));}
 async function register(body){const r=await fetch(`http://127.0.0.1:${server.address().port}/api/register`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
 async function stop(){await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
 try{
  await start();const a=await register({});assert.equal(a.status,201);
  await stop();await start();
  assert.equal((await register({token:'wrong'})).status,401);
  const b=await register({});assert.notEqual(b.data.number,a.data.number);
  const restored=await register({token:a.data.token});assert.equal(restored.status,200);assert.deepEqual(restored.data,a.data);
 }finally{if(server?.listening)await stop();await rm(dir,{recursive:true,force:true});}
});
