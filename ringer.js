(() => {
 const receiver=document.getElementById('receiver');
 const phone=receiver.closest('.phone');
 const style=document.createElement('style');
  style.textContent='@keyframes incomingRing{0%,45%,100%{transform:rotate(0)}5%,15%,25%,35%{transform:translateX(-5px) rotate(-5deg)}10%,20%,30%,40%{transform:translateX(5px) rotate(5deg)}}@keyframes phoneRing{0%,45%,100%{transform:translateX(0)}5%,15%,25%,35%{transform:translateX(-3px)}10%,20%,30%,40%{transform:translateX(3px)}}.receiver.ringing{outline:3px solid #e9bc62}.receiver.ringing.shake-enabled{animation:incomingRing 1.5s infinite}.phone.ringing.shake-enabled{animation:phoneRing 1.5s infinite}';
  document.head.append(style);
 const ringtone=new Audio('ringtone.mp3');ringtone.loop=true;ringtone.preload='auto';
 let playback=0;
 let buffer,loop,loading;
 const check=document.createElement('button');check.type='button';check.textContent='🔔 Проверить звонок';
 const hint=document.createElement('p');hint.setAttribute('role','status');hint.className='mail-hint';
 receiver.closest('.phone').after(check,hint);
 const motionLabel=document.createElement('label'),motion=document.createElement('input');motion.type='checkbox';motion.style.width='auto';motion.checked=!matchMedia('(prefers-reduced-motion: reduce)').matches;
 try{const saved=localStorage.getItem('babyhotline-shake');if(saved!==null)motion.checked=saved==='true'}catch{}
 motionLabel.append(motion,document.createTextNode(' Тряска телефона при звонке'));check.after(motionLabel);
 function setMotion(){receiver.classList.toggle('shake-enabled',motion.checked);phone.classList.toggle('shake-enabled',motion.checked)}
 motion.onchange=()=>{setMotion();try{localStorage.setItem('babyhotline-shake',String(motion.checked))}catch{}};setMotion();
 const originalStart=()=>phone.classList.add('ringing');
 const originalStop=()=>phone.classList.remove('ringing');
 setInterval(()=>{if(receiver.classList.contains('ringing'))originalStart();else originalStop()},100);
 let previewTimer;
 check.addEventListener('click',()=>{if(active)return;phone.classList.add('ringing');receiver.classList.add('ringing');clearTimeout(previewTimer);previewTimer=setTimeout(()=>{previewTimer=null;if(!active){receiver.classList.remove('ringing');phone.classList.remove('ringing')}},3000)});
 async function prepare(){if(!context)return;if(!loading)loading=fetch('ringtone.mp3').then(r=>{if(!r.ok)throw Error('Рингтон не загрузился');return r.arrayBuffer()}).then(bytes=>context.decodeAudioData(bytes)).then(decoded=>buffer=decoded).catch(e=>{loading=null;throw e});return loading;}
 let context,timer,active=false,nodes=[];
   function unlock(){try{context??=new(window.AudioContext||window.webkitAudioContext)();context.resume().catch(()=>{});prepare().catch(()=>{});}catch{}if(active&&!loop&&ringtone.paused)playRingtone();}
 document.addEventListener('pointerdown',unlock);
 document.addEventListener('keydown',unlock);
 function burst(){if(!context||context.state!=='running')return;for(const delay of [0,.38])for(const frequency of [660,880]){const oscillator=context.createOscillator(),gain=context.createGain(),start=context.currentTime+delay;oscillator.frequency.value=frequency;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.045,start+.015);gain.gain.setValueAtTime(.045,start+.23);gain.gain.linearRampToValueAtTime(0,start+.28);oscillator.connect(gain).connect(context.destination);nodes.push(oscillator);oscillator.onended=()=>{nodes=nodes.filter(n=>n!==oscillator);oscillator.disconnect();gain.disconnect()};oscillator.start(start);oscillator.stop(start+.29);}}
  async function playRingtone(){const attempt=++playback;try{await prepare();if(attempt!==playback||!active)return;if(buffer&&context?.state==='running'){loop=context.createBufferSource();loop.buffer=buffer;loop.loop=true;loop.connect(context.destination);loop.start();hint.textContent='Входящий звонок';return}await ringtone.play();if(attempt!==playback||!active){if(!active)ringtone.pause();return}}catch{if(attempt!==playback||!active)return;hint.textContent='Нажми «Проверить звонок», чтобы разрешить звук в этой вкладке.';clearInterval(timer);burst();timer=setInterval(burst,1800)}}
   function stop(){active=false;playback++;clearInterval(timer);if(loop){try{loop.stop()}catch{}loop.disconnect();loop=null}ringtone.pause();if(ringtone.currentTime)ringtone.currentTime=0;receiver.classList.remove('ringing');for(const node of nodes){try{node.stop()}catch{}}nodes=[];}
 check.onclick=async()=>{unlock();try{await context.resume();await prepare();const sample=context.createBufferSource();sample.buffer=buffer;sample.connect(context.destination);sample.onended=()=>sample.disconnect();sample.start();sample.stop(context.currentTime+3);hint.textContent='Проверка рингтона: 3 секунды. Если тихо, проверь звук вкладки и громкость устройства.'}catch(e){hint.textContent='Не удалось включить рингтон: '+e.message}};
   window.hotlineRinger={start(){if(active)return;active=true;receiver.classList.add('ringing');playRingtone()},stop(){if(!active&&previewTimer)return;stop()}};
 window.addEventListener('pagehide',stop);
})();
