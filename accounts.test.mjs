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
   await start();assert.equal((await register({})).status,400);const a=await register({firstName:'Анна',lastName:'Тест'});assert.equal(a.status,201);
  await stop();await start();
  assert.equal((await register({token:'wrong'})).status,401);
   const b=await register({firstName:'Иван',lastName:'Тест'});assert.notEqual(b.data.number,a.data.number);
  const restored=await register({token:a.data.token});assert.equal(restored.status,200);assert.deepEqual(restored.data,a.data);
  async function change(number,token=a.data.token){const r=await fetch(`http://127.0.0.1:${server.address().port}/api/number`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({number})});return {status:r.status,data:await r.json()};}
  assert.equal((await change('123456','wrong')).status,401);
   assert.equal((await change('012345')).status,403);
   assert.equal((await change(b.data.number)).status,403);
  const wanted=['123456','234567','345678'].find(n=>n!==a.data.number&&n!==b.data.number);
   assert.equal((await change(wanted)).status,403);
   async function api(path,body,token){const r=await fetch(`http://127.0.0.1:${server.address().port}/api/`+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};}
   const challenge=await api('login/request',{number:a.data.number});assert.equal(challenge.status,201);assert.equal(challenge.data.code,undefined);
   assert.equal((await api('login/pending',null,b.data.token)).data.requests.length,0);
   assert.equal((await api('login/pending',null,a.data.token)).data.requests[0].id,challenge.data.id);
   assert.equal((await api('login/answer',{id:challenge.data.id},b.data.token)).status,403);
   const code=(await api('login/answer',{id:challenge.data.id},a.data.token)).data.code;assert.match(code,/^\d{6}$/);
   assert.equal((await api('login/verify',{id:challenge.data.id,code:'000000'})).status,400);
   assert.deepEqual((await api('login/verify',{id:challenge.data.id,code})).data,a.data);
   assert.equal((await api('login/verify',{id:challenge.data.id,code})).status,400);
  await stop();await start();
   assert.equal((await register({token:a.data.token})).data.number,a.data.number);
  assert.equal((await register({token:b.data.token})).data.number,b.data.number);
 }finally{if(server?.listening)await stop();await rm(dir,{recursive:true,force:true});}
});
