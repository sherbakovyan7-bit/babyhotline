(() => {
 const receiver=document.getElementById('receiver');
 const style=document.createElement('style');
 style.textContent='@keyframes incomingRing{0%,45%,100%{transform:rotate(0)}5%,15%,25%,35%{transform:translateX(-3px) rotate(-4deg)}10%,20%,30%,40%{transform:translateX(3px) rotate(4deg)}}.receiver.ringing{animation:incomingRing 1.5s infinite;outline:3px solid #e9bc62}@media(prefers-reduced-motion:reduce){.receiver.ringing{animation:none}}';
 document.head.append(style);
 let context,timer,active=false,nodes=[];
 function unlock(){try{context??=new(window.AudioContext||window.webkitAudioContext)();context.resume().catch(()=>{});}catch{}}
 document.addEventListener('pointerdown',unlock);
 document.addEventListener('keydown',unlock);
 function burst(){if(!context||context.state!=='running')return;for(const delay of [0,.38])for(const frequency of [660,880]){const oscillator=context.createOscillator(),gain=context.createGain(),start=context.currentTime+delay;oscillator.frequency.value=frequency;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.045,start+.015);gain.gain.setValueAtTime(.045,start+.23);gain.gain.linearRampToValueAtTime(0,start+.28);oscillator.connect(gain).connect(context.destination);nodes.push(oscillator);oscillator.onended=()=>{nodes=nodes.filter(n=>n!==oscillator);oscillator.disconnect();gain.disconnect()};oscillator.start(start);oscillator.stop(start+.29);}}
 function stop(){active=false;clearInterval(timer);receiver.classList.remove('ringing');for(const node of nodes){try{node.stop()}catch{}}nodes=[];}
 window.hotlineRinger={start(){if(active)return;active=true;receiver.classList.add('ringing');burst();timer=setInterval(burst,1800)},stop};
 window.addEventListener('pagehide',stop);
})();
