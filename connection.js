// Static-site adapter: only this app's /api/ requests use the chosen backend.
(() => {
 let backend='';
 try{backend=localStorage.getItem('babyhotline-server')||''}catch{}
 const nativeFetch=window.fetch.bind(window);
 window.fetch=(input,options)=>{
  if(typeof input==='string'&&input.startsWith('/api/')){
   if(backend)input=backend+input;
   else if(location.protocol==='file:'||location.hostname.endsWith('.github.io'))return Promise.reject(new Error('Укажи HTTPS-адрес работающего сервера звонков в настройках ниже.'));
  }
  return nativeFetch(input,options);
 };
 const panel=document.createElement('section');panel.className='panel';
 panel.innerHTML='<h2>Настройки телефона</h2><label for="backend">HTTPS-сервер звонков</label><input id="backend" type="url" placeholder="https://ваш-сервер" style="font-size:16px;letter-spacing:0"><button id="saveBackend" class="call" type="button">Сохранить и обновить</button><p class="mail-hint">На GitHub опубликован интерфейс. Для интернет-звонков обоим участникам нужен один работающий сервер. Постоянный сервер пока не размещён.</p><label for="musicFile">Музыка для 47823 · выбрать свой файл</label><input id="musicFile" type="file" accept="audio/*" style="font-size:14px;letter-spacing:0"><p id="settingsStatus" role="status" class="mail-hint">Файл остаётся на твоём устройстве и не загружается на сервер.</p>';
 document.querySelector('.phone-side').append(panel);
 const numberSettings=document.createElement('div');
 numberSettings.innerHTML='<label for="ownNumber">Свой номер Baby Hotline</label><input id="ownNumber" inputmode="numeric" maxlength="6" placeholder="Например, 583201"><button id="saveOwnNumber" type="button">Закрепить номер за мной</button><p class="mail-hint">Сначала подключись к линии. Выбери 6 цифр, первая — не ноль. Занятый номер выбрать нельзя. При смене старый номер освобождается. Это номер внутри Baby Hotline, не мобильного оператора.</p><p id="numberStatus" role="status"></p>';
 panel.append(numberSettings);
 document.getElementById('saveOwnNumber').onclick=async()=>{const button=document.getElementById('saveOwnNumber'),status=document.getElementById('numberStatus');button.disabled=true;try{const n=document.getElementById('ownNumber').value.trim();if(!/^[1-9][0-9]{5}$/.test(n))throw Error('Введи 6 цифр, первая — не ноль.');status.textContent='Сохраняем…';status.textContent='Твой номер: '+await window.hotlineNumber.change(n);}catch(e){status.textContent=e.message}finally{button.disabled=false}};
 document.getElementById('backend').value=backend;
 document.getElementById('saveBackend').onclick=()=>{
  try{const value=document.getElementById('backend').value.trim();let url='';if(value){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)throw Error('Нужен HTTPS-адрес без логина и пароля.');url=u.origin}localStorage.setItem('babyhotline-server',url);location.reload()}catch(e){document.getElementById('settingsStatus').textContent=e.message}
 };
 if(location.hostname.endsWith('.github.io')){hotlineMusic.pause();hotlineMusic.removeAttribute('src');hotlineMusic.load();}
 let localUrl;
 document.getElementById('musicFile').onchange=e=>{const f=e.target.files[0];if(!f)return;hotlineMusic.pause();if(localUrl)URL.revokeObjectURL(localUrl);localUrl=URL.createObjectURL(f);hotlineMusic.src=localUrl;document.getElementById('settingsStatus').textContent='Выбрано: '+f.name+'. Набери 47823 и позвони.'};
})();
