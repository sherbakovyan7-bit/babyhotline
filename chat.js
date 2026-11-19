(() => {
 const el=id=>document.getElementById(id),form=el('paper');
 const label=document.createElement('label');label.htmlFor='recipient';label.textContent='Кому · шестизначный номер друга';
 const input=document.createElement('input');input.id='recipient';input.inputMode='numeric';input.maxLength=6;input.pattern='[0-9]{6}';input.required=true;input.placeholder='123456';
 form.insertBefore(label,el('message').previousElementSibling);label.after(input);
 el('mailStatus').textContent='Подключись к линии и укажи номер друга. Оба должны быть в сети на одном сервере.';
 document.querySelector('footer').textContent='Сообщения и номера передаются общему серверу. Вдохновлено названием песни Джека Стаубера. Неофициальный проект.';
 document.querySelector('.post-heading h2').textContent='Переписка этой вкладки';
 el('letters').replaceChildren();
 el('clearMail').onclick=()=>el('letters').replaceChildren();
 let sending=false,receiving=false;const seen=new Set();
 function show(m,outgoing){const card=document.createElement('article');card.className='letter';const name=document.createElement('strong'),text=document.createElement('p'),time=document.createElement('small');name.textContent=(outgoing?'Ты → '+m.to:m.name+' · '+m.from);text.textContent=m.text;time.textContent=new Date(m.time).toLocaleTimeString();card.append(name,text,time);el('letters').prepend(card);while(el('letters').children.length>100)el('letters').lastChild.remove();}
 el('paper').onsubmit=async e=>{e.preventDefault();if(sending)return;const name=el('sender').value.trim(),text=el('message').value.trim(),to=el('recipient').value.trim();if(!name||!text||!/^\d{6}$/.test(to)){el('mailStatus').textContent='Заполни ник, номер друга и сообщение.';return}sending=true;el('send').disabled=true;el('mailStatus').textContent='Передаём записку серверу…';try{const result=await window.hotlineChat.send(to,name,text);show(result.message,true);el('message').value='';el('paper').classList.add('folding');const rect=el('paper').getBoundingClientRect();setTimeout(()=>{const plane=document.createElement('div');plane.className='plane';plane.textContent='➤';plane.style.fontSize='75px';plane.style.left=rect.left+rect.width/2+'px';plane.style.top=rect.top+rect.height/2+'px';document.body.append(plane);setTimeout(()=>{plane.remove();el('paper').classList.remove('folding')},1100)},600);el('mailStatus').textContent='Записка принята сервером для '+to+'. Друг увидит её при следующем обновлении; это не отметка о прочтении.';}catch(error){el('mailStatus').textContent=error.message;}finally{sending=false;el('send').disabled=false;}};
 async function receive(){if(receiving)return;receiving=true;try{const result=await window.hotlineChat?.receive();if(!result)return;for(const m of result.messages){if(seen.has(m.id))continue;seen.add(m.id);show(m,false);el('mailStatus').textContent='✈ Новая записка от '+m.name+' · '+m.from;}if(seen.size>500){const ids=result.messages.map(m=>m.id);seen.clear();ids.forEach(id=>seen.add(id))}}catch(error){el('mailStatus').textContent='Не удалось получить сообщения: '+error.message}finally{receiving=false}}
 setInterval(receive,2000);
})();
