(()=>{
 const catalog=JSON.parse(document.getElementById('catalog-data').textContent);
 const key='rhino-reader-state-v1';let data={};
 try{data=JSON.parse(localStorage.getItem(key)||'{}');if(!data||typeof data!=='object'||Array.isArray(data))data={};}catch{}
 function state(id){return data[id]||{};}
 function toast(message){const el=document.getElementById('toast');el.textContent=message;el.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.hidden=true,3500);}
 function persist(id,patch){data[id]={...state(id),...patch};try{localStorage.setItem(key,JSON.stringify(data));}catch{toast('当前浏览器无法保存阅读状态，内容仍可正常阅读。');}update();document.dispatchEvent(new Event('rhino-state'));}
 function update(){
  document.getElementById('unread-count').textContent=String(catalog.filter(a=>!state(a.video_id).read).length).padStart(2,'0');
  document.getElementById('favorite-count').textContent=String(catalog.filter(a=>state(a.video_id).favorite).length).padStart(2,'0');
  document.querySelectorAll('[data-favorite]').forEach(b=>{const on=!!state(b.dataset.favorite).favorite;b.setAttribute('aria-pressed',String(on));b.classList.toggle('is-favorite',on);b.textContent=on?'★ 已收藏':'☆ 收藏';});
  document.querySelectorAll('[data-state-for]').forEach(el=>{const s=state(el.dataset.stateFor);el.textContent=s.read?'已读':s.progress>0?'阅读中':'未读';el.classList.toggle('is-read',!!s.read);});
 }
 document.addEventListener('click',e=>{const b=e.target.closest('[data-favorite]');if(b)persist(b.dataset.favorite,{favorite:!state(b.dataset.favorite).favorite});});
 document.querySelector('.menu-toggle').addEventListener('click',e=>{const on=document.body.classList.toggle('nav-open');e.currentTarget.setAttribute('aria-expanded',String(on));});
 addEventListener('storage',e=>{if(e.key===key){try{data=JSON.parse(e.newValue||'{}');}catch{data={};}update();document.dispatchEvent(new Event('rhino-state'));}});
 window.Rhino={catalog,state,persist,toast,update};update();
})();
