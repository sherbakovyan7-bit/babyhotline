import http from 'node:http';
import {randomBytes,randomInt,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {readFileSync,writeFileSync,renameSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';

export function createServer({iceServers=[{urls:'stun:stun.l.google.com:19302'}],publicOrigin=null,serveMusic=true,accountsFile=null}={}) {
 const users=new Map(),calls=new Map(),limits=new Map();
 const accounts=new Map();
 if(accountsFile){try{const saved=JSON.parse(readFileSync(accountsFile,'utf8'));if(!Array.isArray(saved))throw Error('Invalid accounts file');for(const a of saved){if(!/^\d{6}$/.test(a.number)||!/^\w{64}$/.test(a.token)||accounts.has(a.number))throw Error('Invalid account');accounts.set(a.number,a)}}catch(e){if(e.code!=='ENOENT')throw e;}}
 function saveAccounts(){if(!accountsFile)return;mkdirSync(dirname(accountsFile),{recursive:true});writeFileSync(accountsFile+'.tmp',JSON.stringify([...accounts.values()]),{mode:0o600});renameSync(accountsFile+'.tmp',accountsFile);}
 const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data))};
 const end=(c,reason)=>{c.state='ended';c.reason=reason;c.updated=Date.now();delete c.offer;delete c.answer};
 function sweep(){const now=Date.now();for(const [n,u] of users)if(now-u.seen>45000){users.delete(n);for(const c of calls.values())if(c.state!=='ended'&&(c.from===n||c.to===n))end(c,'Собеседник отключился')}
  for(const [id,c] of calls){if(c.state==='ringing'&&now-c.created>45000)end(c,'Нет ответа');if(c.state==='active'&&now-c.created>4*3600000)end(c,'Достигнут предел длительности');if(c.state==='ended'&&now-c.updated>60000)calls.delete(id)}for(const [ip,l] of limits)if(now>l.until)limits.delete(ip)}
 const timer=setInterval(sweep,1000);timer.unref();
 const server=http.createServer(async(req,res)=>{try{
  const origin=publicOrigin||`http://${req.headers.host}`;
   const allowed=new Set([origin,'https://sherbakovyan7-bit.github.io']);
   if(req.headers.origin&&!allowed.has(req.headers.origin))return json(res,403,{error:'Запрос с другого сайта запрещён'});
   if(req.headers.origin){res.setHeader('Access-Control-Allow-Origin',req.headers.origin);res.setHeader('Vary','Origin');}
   if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Max-Age':'600'});return res.end();}
   const path=new URL(req.url,'http://localhost').pathname;
   if(path==='/chat.js'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-cache'});return res.end(await readFile(new URL('./chat.js',import.meta.url)));}
   if(path==='/connection.js'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-cache'});return res.end(await readFile(new URL('./connection.js',import.meta.url)));}
  const files={'/':['index.html','text/html; charset=utf-8'],'/mail.css':['mail.css','text/css'],'/mail.js':['mail.js','text/javascript'],'/voice.js':['voice.js','text/javascript'],["/Jack%20Stauber's%20Micropop%20-%20Baby%20Hotline.mp3"]:["Jack Stauber's Micropop - Baby Hotline.mp3",'audio/mpeg']};
  if(req.method==='GET'&&files[path]){const [file,type]=files[path];if(type==='audio/mpeg'&&!serveMusic)return json(res,404,{error:'Локальный трек не публикуется'});const contents=await readFile(new URL(file,import.meta.url));res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});return res.end(contents)}
  if(path==='/api/config'&&req.method==='GET')return json(res,200,{iceServers});
  if(path==='/api/health'&&req.method==='GET')return json(res,200,{app:'baby-hotline',ok:true});
  sweep();let body={};
  if(req.method==='POST'){
   if(!req.headers['content-type']?.startsWith('application/json'))return json(res,415,{error:'Нужен JSON'});
   let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>30000)return json(res,413,{error:'Слишком большой запрос'})}
   try{body=JSON.parse(raw)}catch{return json(res,400,{error:'Некорректный JSON'})}
   if(!body||typeof body!=='object'||Array.isArray(body))return json(res,400,{error:'Нужен объект'});
  }
  if(path==='/api/register'&&req.method==='POST'){
   if(body.token!==undefined){const account=[...accounts.values()].find(a=>a.token===body.token);if(!account)return json(res,401,{error:'Ключ номера не найден на этом сервере. Проверь адрес сервера; сохранённый номер не заменён.'});let u=users.get(account.number);if(!u){u={...account,seen:Date.now(),attempts:[]};users.set(u.number,u)}u.seen=Date.now();return json(res,200,{number:u.number,token:u.token});}
   const ip=req.socket.remoteAddress;const l=limits.get(ip)||{count:0,until:Date.now()+60000};limits.set(ip,l);
   if(++l.count>20||users.size>=200)return json(res,429,{error:'Слишком много регистраций, подождите минуту'});
   if(accounts.size>=900000)return json(res,503,{error:'Свободных номеров нет'});
   let number;do{number=String(randomInt(100000,1000000))}while(accounts.has(number));
   const u={number,token:randomBytes(32).toString('hex'),seen:Date.now(),attempts:[]};accounts.set(number,{number,token:u.token});try{saveAccounts()}catch(e){accounts.delete(number);throw e}users.set(number,u);return json(res,201,{number,token:u.token});
  }
  const token=(req.headers.authorization||'').replace(/^Bearer /,'');
  const user=[...users.values()].find(u=>u.token===token);
  if(!user)return json(res,401,{error:'Линия отключена. Подключитесь снова.'});
  user.seen=Date.now();
  if(path==='/api/number'&&req.method==='POST'){
   const number=body.number;
   if(typeof number!=='string'||! /^[1-9][0-9]{5}$/.test(number))return json(res,400,{error:'Нужны 6 цифр, первая — не ноль.'});
   if(number===user.number)return json(res,200,{number,token:user.token});
   if(accounts.has(number))return json(res,409,{error:'Этот номер занят. Выбери другой.'});
   if([...calls.values()].some(c=>c.state!=='ended'&&[c.from,c.to].includes(user.number)))return json(res,409,{error:'Сначала заверши звонок.'});
   const old=user.number,account=accounts.get(old);
   accounts.delete(old);accounts.set(number,{number,token:user.token});
   try{saveAccounts()}catch(e){accounts.delete(number);accounts.set(old,account);throw e}
   users.delete(old);user.number=number;users.set(number,user);
   return json(res,200,{number,token:user.token});
  }
  if(path==='/api/messages'&&req.method==='GET')return json(res,200,{messages:user.messages||[]});
  if(path==='/api/messages'&&req.method==='POST'){
   if(typeof body.text!=='string'||!body.text.trim()||body.text.length>2000||typeof body.name!=='string'||!body.name.trim()||body.name.length>40)return json(res,400,{error:'Укажи ник до 40 символов и сообщение до 2000 символов'});
   const target=users.get(String(body.to));if(!target)return json(res,404,{error:'Друг не в сети. Попроси его подключиться и проверить номер.'});
   user.mailTimes=(user.mailTimes||[]).filter(t=>Date.now()-t<60000);if(user.mailTimes.length>=30)return json(res,429,{error:'Слишком много сообщений. Подожди минуту.'});user.mailTimes.push(Date.now());
   const msg={id:randomUUID(),from:user.number,to:target.number,name:body.name.trim(),text:body.text.trim(),time:Date.now()};
   target.messages=[...(target.messages||[]),msg].slice(-100);return json(res,201,{message:msg});
  }
  const visible=c=>({id:c.id,from:c.from,to:c.to,state:c.state,reason:c.reason||null,offer:user.number===c.to?c.offer:null,answer:user.number===c.from?c.answer:null});
  if(path==='/api/poll'&&req.method==='GET')return json(res,200,{calls:[...calls.values()].filter(c=>c.from===user.number||c.to===user.number).map(visible)});
  if(path==='/api/call'&&req.method==='POST'){
   user.attempts=user.attempts.filter(t=>Date.now()-t<60000);if(user.attempts.length>=10)return json(res,429,{error:'Слишком много вызовов. Подождите минуту.'});user.attempts.push(Date.now());
   const target=users.get(String(body.number));if(!target)return json(res,404,{error:'Номер не в сети'});
   if(target===user)return json(res,400,{error:'Нельзя позвонить самому себе'});
   if([...calls.values()].some(c=>c.state!=='ended'&&[c.from,c.to].some(n=>n===user.number||n===target.number)))return json(res,409,{error:'Линия занята'});
   if(body.offer?.type!=='offer'||typeof body.offer.sdp!=='string'||body.offer.sdp.length>20000)return json(res,400,{error:'Нет предложения голосового соединения'});
   const c={id:randomUUID(),from:user.number,to:target.number,state:'ringing',offer:body.offer,created:Date.now(),updated:Date.now()};calls.set(c.id,c);return json(res,201,visible(c));
  }
  const match=path.match(/^\/api\/call\/([^/]+)\/(answer|end)$/);
  if(match&&req.method==='POST'){
   const c=calls.get(match[1]);if(!c||![c.from,c.to].includes(user.number))return json(res,403,{error:'Нет доступа к звонку'});
   if(match[2]==='end'){end(c,'Звонок завершён');return json(res,200,visible(c))}
   if(c.to!==user.number)return json(res,403,{error:'Принять может только получатель'});
   if(c.state!=='ringing')return json(res,409,{error:'Вызов уже завершён или принят'});
   if(body.answer?.type!=='answer'||typeof body.answer.sdp!=='string'||body.answer.sdp.length>20000)return json(res,400,{error:'Нет ответа голосового соединения'});
   c.answer=body.answer;c.state='active';return json(res,200,visible(c));
  }
  json(res,404,{error:'Маршрут не найден'});
 }catch(e){if(!res.headersSent)json(res,500,{error:'Ошибка сервера'});else res.end();console.error(e.message)}});
 server.on('close',()=>clearInterval(timer));return server;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const iceServers=[{urls:'stun:stun.l.google.com:19302'}];
 if(process.env.TURN_URL&&process.env.TURN_USERNAME&&process.env.TURN_PASSWORD)iceServers.push({urls:process.env.TURN_URL,username:process.env.TURN_USERNAME,credential:process.env.TURN_PASSWORD});
  const server=createServer({iceServers,publicOrigin:process.env.PUBLIC_ORIGIN,serveMusic:process.env.SERVE_MUSIC!=='false',accountsFile:resolve(process.env.ACCOUNTS_FILE||fileURLToPath(new URL('./data/accounts.json',import.meta.url)))});
 server.on('error',e=>{console.error(e.message);process.exitCode=1});
 server.listen(Number(process.env.PORT||3001),process.env.HOST||'127.0.0.1',()=>console.log('Baby Hotline: http://localhost:'+ (process.env.PORT||3001)));
}
