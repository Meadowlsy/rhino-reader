(()=>{
 const {catalog,state}=Rhino;const params=new URLSearchParams(location.search);
 let type=params.get('type')||'',month=params.get('month')||'',view=params.get('view')==='favorites'?'favorites':'',selectedStock=params.get('stock')||'';
 const search=document.getElementById('library-search');
 search.value=params.get('q')||selectedStock;
 const normalize=s=>s.normalize('NFKC').toLocaleLowerCase().trim();
 const archiveDays=new Map();for(const item of catalog){if(!archiveDays.has(item.published_date))archiveDays.set(item.published_date,[]);archiveDays.get(item.published_date).push(item);}
 const months=[...new Set(catalog.map(a=>a.published_date.slice(0,7)))].sort();
 const mobileCalendar=matchMedia('(max-width:720px)');let calendarExpanded=false;
 const calendarDateFormatter=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'});
 function todayInShanghai(){const parts=Object.fromEntries(calendarDateFormatter.formatToParts(new Date()).map(p=>[p.type,p.value]));return `${parts.year}-${parts.month}-${parts.day}`;}
 let today=todayInShanghai();
 const validMonth=m=>/^\d{4}-(0[1-9]|1[0-2])$/.test(m);
 let calendarMonth=validMonth(month)?month:today.slice(0,7);
 function shiftMonth(value,delta){const [y,m]=value.split('-').map(Number),d=new Date(y,m-1+delta,1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;}
 function renderCalendar(){
  today=todayInShanghai();
  const [year,m]=calendarMonth.split('-').map(Number),offset=(new Date(year,m-1,1).getDay()+6)%7,days=new Date(year,m,0).getDate();
  document.getElementById('calendar-month').textContent=`${year} 年 ${m} 月`;
  document.getElementById('calendar-today-number').textContent=Number(today.slice(8));
  document.getElementById('calendar-today').title=`今天：${today}（北京时间）`;
  const expanded=!mobileCalendar.matches||calendarExpanded;document.getElementById('calendar-panel').hidden=!expanded;
  const toggle=document.getElementById('calendar-toggle');toggle.setAttribute('aria-expanded',String(expanded));toggle.textContent=expanded?'收起月历':'展开月历';
  const grid=document.getElementById('calendar-days');grid.replaceChildren();
  for(let i=0;i<offset;i++){const blank=document.createElement('span');blank.setAttribute('aria-hidden','true');grid.append(blank);}
  for(let n=1;n<=days;n++){
   const date=`${calendarMonth}-${String(n).padStart(2,'0')}`,items=archiveDays.get(date),cell=document.createElement(items?'button':'span');cell.textContent=n;cell.dataset.date=date;
   if(date===today){cell.classList.add('is-today');cell.setAttribute('aria-current','date');cell.setAttribute('aria-label',`今天，${year}年${m}月${n}日`);}
   if(items){cell.classList.add('calendar-date');cell.setAttribute('aria-label',`${date===today?'今天，':''}${year}年${m}月${n}日 · ${items.length}期视频`);cell.title=items.map(a=>a.original_title).join('\n');cell.addEventListener('click',()=>{if(items.length===1){openReader(items[0].video_id,cell);return;}openDayPicker(items,cell);});}
   grid.append(cell);
  }
  const range=[...months,today.slice(0,7)].sort(),earliest=range[0],latest=range.at(-1);
  document.getElementById('calendar-prev').disabled=calendarMonth<=earliest;
  document.getElementById('calendar-next').disabled=calendarMonth>=latest;
 }
 function render(){
  const words=normalize(search.value).split(/\s+/).filter(Boolean),s=selectedStock;
  const visible=catalog.filter(a=>(!month||a.published_date.startsWith(month))&&(!type||a.analysis_types.includes(type))&&(!s||a.securities.some(x=>x.symbol===s))&&(view!=='favorites'||state(a.video_id).favorite)&&words.every(w=>normalize(a.search_text).includes(w)));
  const ids=new Set(visible.map(a=>a.video_id));document.querySelectorAll('.video-card').forEach(card=>card.hidden=!ids.has(card.dataset.id));
  for(const group of document.querySelectorAll('.month-group')){const count=[...group.querySelectorAll('.video-card')].filter(c=>!c.hidden).length;group.hidden=count===0;group.querySelector('.month-visible-count').textContent=`${count} 期`;}
  document.getElementById('empty-results').hidden=visible.length>0;
  const active=!!(month||type||s||search.value||view);document.getElementById('clear-filters').hidden=!active;document.getElementById('search-shortcut').hidden=active;
  document.querySelectorAll('[data-type]').forEach(b=>{const on=b.dataset.type===type;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
  document.querySelectorAll('.sidebar-link').forEach(a=>a.classList.toggle('selected',a.classList.contains('nav-all')?!view&&!month:a.dataset.viewLink?view===a.dataset.viewLink:!view&&month===a.dataset.monthLink));
  document.querySelectorAll('.stock-shortcut').forEach(a=>a.classList.toggle('selected',new URL(a.href).searchParams.get('stock')===s));
  const p=new URLSearchParams();for(const[k,v]of Object.entries({q:search.value.trim(),stock:s,type,month,view}))if(v)p.set(k,v);
  try{history.replaceState(history.state,'',location.pathname+(p.size?'?'+p.toString():'')+location.hash);}catch{}
  document.querySelectorAll('.article-link').forEach(link=>{const st=state(link.dataset.openId);link.href=`articles/${link.dataset.openId}.html`+(!st.read&&/^chapter-\d+$/.test(st.anchor||'')?'#'+st.anchor:'');});
  renderCalendar();
 }
 function reset(){type='';month='';view='';search.value='';selectedStock='';render();}
 function chooseStock(symbol){selectedStock=symbol;search.value=symbol;month='';view='';render();}
 search.addEventListener('input',()=>{selectedStock='';render();});
 document.querySelectorAll('[data-type]').forEach(b=>b.addEventListener('click',()=>{type=b.dataset.type;render();}));
 document.querySelectorAll('[data-filter-stock]').forEach(b=>b.addEventListener('click',()=>chooseStock(b.dataset.filterStock)));
 document.getElementById('calendar-toggle').addEventListener('click',()=>{calendarExpanded=!calendarExpanded;renderCalendar();});
 document.getElementById('calendar-today').addEventListener('click',()=>{calendarMonth=todayInShanghai().slice(0,7);renderCalendar();});
 mobileCalendar.addEventListener('change',renderCalendar);
 let dateTimer;function scheduleTodayUpdate(){clearTimeout(dateTimer);const [y,m,d]=todayInShanghai().split('-').map(Number),next=Date.UTC(y,m-1,d+1)-8*3600000;dateTimer=setTimeout(()=>{const previous=today;today=todayInShanghai();if(calendarMonth===previous.slice(0,7))calendarMonth=today.slice(0,7);renderCalendar();scheduleTodayUpdate();},Math.max(1000,next-Date.now()+100));}
 function refreshToday(){if(todayInShanghai()!==today){const previous=today;today=todayInShanghai();if(calendarMonth===previous.slice(0,7))calendarMonth=today.slice(0,7);renderCalendar();}scheduleTodayUpdate();}
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshToday();});addEventListener('pageshow',refreshToday);scheduleTodayUpdate();
 document.getElementById('calendar-prev').addEventListener('click',()=>{calendarMonth=shiftMonth(calendarMonth,-1);renderCalendar();});
 document.getElementById('calendar-next').addEventListener('click',()=>{calendarMonth=shiftMonth(calendarMonth,1);renderCalendar();});
 document.getElementById('clear-filters').addEventListener('click',reset);document.getElementById('empty-clear').addEventListener('click',reset);document.addEventListener('rhino-state',render);
 addEventListener('keydown',e=>{if(e.key==='/'&&!dialog.open&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){e.preventDefault();search.focus();}});
 function openDayPicker(items,trigger){
  const picker=document.createElement('dialog');picker.className='calendar-day-picker';picker.setAttribute('aria-label',`${items[0].published_date}的视频`);
  const heading=document.createElement('div');heading.className='day-picker-heading';const title=document.createElement('strong');title.textContent=items[0].published_date;heading.append(title);
  const close=document.createElement('button');close.textContent='×';close.setAttribute('aria-label','关闭当日视频列表');heading.append(close);picker.append(heading);
  for(const item of items){const button=document.createElement('button');button.className='day-picker-video';button.textContent=item.original_title;button.addEventListener('click',()=>{picker.close();picker.remove();openReader(item.video_id,trigger);});picker.append(button);}
  close.addEventListener('click',()=>picker.close());picker.addEventListener('close',()=>{picker.remove();trigger.focus({preventScroll:true});});picker.addEventListener('click',e=>{if(e.target===picker){const r=picker.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)picker.close();}});document.body.append(picker);picker.showModal();
 }
 const dialog=document.getElementById('article-reader'),content=document.getElementById('reader-content'),scroller=document.getElementById('reader-scroll');
 let opened='',cleanup,returnFocus,bodyOverflow='',afterClose;
 const hashId=()=>{const match=location.hash.match(/^#video=([A-Za-z0-9_-]+)$/);return match?match[1]:'';};
 function finishReader(){
  if(!opened)return;const focus=returnFocus;opened='';if(cleanup)cleanup();cleanup=null;
  dialog.close();content.replaceChildren();document.body.style.overflow=bodyOverflow;document.body.classList.remove('reader-open');
  document.body.append(document.getElementById('toast'));
  if(focus?.isConnected&&!focus.closest('[hidden]'))focus.focus({preventScroll:true});else search.focus({preventScroll:true});
  if(afterClose){const action=afterClose;afterClose=null;action();}
 }
 function openReader(id,trigger,push=true){
  const item=catalog.find(a=>a.video_id===id);if(!item?.reader_html||opened===id)return;
  if(opened)finishReader();returnFocus=trigger||document.activeElement;bodyOverflow=document.body.style.overflow;opened=id;
  content.innerHTML=item.reader_html;scroller.scrollTop=0;dialog.showModal();document.body.style.overflow='hidden';document.body.classList.add('reader-open');
  dialog.append(document.getElementById('toast'));cleanup=Rhino.initReader(content,{videoId:id,scroller});scroller.scrollTo({top:0,behavior:'instant'});
  if(push){try{history.pushState({...history.state,rhinoReader:id},'',location.pathname+location.search+'#video='+id);}catch{}}
  document.getElementById('reader-back').focus({preventScroll:true});
 }
 function requestClose(){
  if(!opened)return;
  if(history.state?.rhinoReader===opened&&hashId()===opened){history.back();}
  else{finishReader();try{history.replaceState(history.state,'',location.pathname+location.search);}catch{}}
 }
 document.getElementById('video-list').addEventListener('click',e=>{
  if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
  const link=e.target.closest('.article-link'),card=e.target.closest('.video-card');
  if(!card||(!link&&e.target.closest('a,button,input,select,summary'))||getSelection()?.toString())return;
  e.preventDefault();openReader(card.dataset.id,link||card);
 });
 document.getElementById('video-list').addEventListener('keydown',e=>{const card=e.target.closest('.video-card');if(card&&e.target===card&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openReader(card.dataset.id,card);}});
 document.getElementById('reader-back').addEventListener('click',requestClose);document.getElementById('reader-close').addEventListener('click',requestClose);
 document.getElementById('reader-directory').addEventListener('click',()=>{content.querySelector('.reader-chapters').open=true;scroller.scrollTo({top:0,behavior:'instant'});});
 dialog.addEventListener('cancel',e=>{e.preventDefault();requestClose();});
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)requestClose();}});
 content.addEventListener('click',e=>{
  if(e.target.closest('[data-close-reader]')){requestClose();return;}
  const link=e.target.closest('a');if(!link||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
  const href=link.getAttribute('href');
  if(/^#(?:chapter-\d+|source|takeaways|overview|key-[a-z0-9_-]+|point-[a-z0-9_-]+)$/.test(href||'')){
   const target=content.querySelector(href);if(target){e.preventDefault();content.querySelector('.reader-chapters').open=false;target.scrollIntoView({behavior:'instant',block:'start'});}
  }else if(href?.startsWith('index.html?stock=')){e.preventDefault();const selected=new URL(link.href).searchParams.get('stock');afterClose=()=>chooseStock(selected);requestClose();}
 });
 addEventListener('popstate',()=>{const id=hashId();if(id)openReader(id,null,false);else finishReader();});
 render();if(hashId())openReader(hashId(),null,false);
})();
