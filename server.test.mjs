import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from './server.mjs';
test('voice call routing, busy, participant auth, answer and hangup',async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
  async function api(path,body,user){if(path==='register'&&body)body={firstName:'Тест',lastName:'Пользователь',...body};const r=await fetch(base+'/api/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(user?{Authorization:'Bearer '+user.token}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()}}
 try{
  const a=(await api('register',{})).data,b=(await api('register',{})).data,c=(await api('register',{})).data;
  assert.match(a.number,/^\d{6}$/);assert.notEqual(a.number,b.number);
  assert.equal((await api('messages')).status,401);
  assert.equal((await api('messages',{to:b.number,name:'Друг',text:' '},a)).status,400);
  assert.equal((await api('messages',{to:'000000',name:'Друг',text:'Привет'},a)).status,404);
  const letter=await api('messages',{to:b.number,name:'Друг',text:'Привет',from:c.number},a);
  assert.equal(letter.status,201);assert.equal(letter.data.message.from,a.number);
  assert.deepEqual((await api('messages',null,b)).data.messages,[letter.data.message]);
  assert.equal((await api('messages',null,c)).data.messages.length,0);
  for(let i=1;i<30;i++)assert.equal((await api('messages',{to:b.number,name:'Друг',text:'Привет'},a)).status,201);
  assert.equal((await api('messages',{to:b.number,name:'Друг',text:'Лимит'},a)).status,429);
  assert.equal((await api('poll')).status,401);
  assert.equal((await api('call',{number:a.number,offer:{type:'offer',sdp:'test'}},a)).status,400);
  const call=(await api('call',{number:b.number,offer:{type:'offer',sdp:'offer'}},a)).data;
  assert.equal(call.state,'ringing');
  assert.equal((await api('poll',null,b)).data.calls[0].offer.sdp,'offer');
  assert.equal((await api('call',{number:b.number,offer:{type:'offer',sdp:'test'}},c)).status,409);
  assert.equal((await api('call/'+call.id+'/end',{},c)).status,403);
  assert.equal((await api('call/'+call.id+'/answer',{answer:{type:'answer',sdp:'answer'}},a)).status,403);
  assert.equal((await api('call/'+call.id+'/answer',{answer:{type:'answer',sdp:'answer'}},b)).data.state,'active');
  assert.equal((await api('poll',null,a)).data.calls[0].answer.sdp,'answer');
  assert.equal((await api('call/'+call.id+'/end',{},a)).data.state,'ended');
  assert.equal((await api('call/'+call.id+'/answer',{answer:{type:'answer',sdp:'answer'}},b)).status,409);
  const page=await fetch(base);assert.equal(page.status,200);assert.match(await page.text(),/voice.js/);
  assert.equal((await api('health')).data.app,'baby-hotline');
  for(const file of ['voice.js','mail.js','mail.css'])assert.equal((await fetch(base+'/'+file)).status,200);
  assert.equal((await fetch(base+'/api/register',{method:'POST',headers:{Origin:'https://untrusted.example','Content-Type':'application/json'},body:'{}'})).status,403);
  assert.equal((await fetch(base+'/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:'{broken'})).status,400);
  assert.equal((await api('call',{number:'000000',offer:{type:'offer',sdp:'test'}},a)).status,404);
  const next=(await api('call',{number:b.number,offer:{type:'offer',sdp:'second'}},a)).data;
  assert.equal((await api('call/'+next.id+'/end',{},b)).data.state,'ended');
  assert.equal((await api('poll',null,c)).data.calls.length,0);
 }finally{await new Promise(r=>server.close(r))}
});
