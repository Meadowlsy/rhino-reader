(()=>{
 const {catalog,state}=Rhino;const params=new URLSearchParams(location.search);
 let type=params.get('type')||'',month=params.get('month')||'',view=params.get('view')||'';
 const search=document.getElementById('library-search'),stock=document.getElementById('stock-filter'),sort=document.getElementById('sort-order');
 search.value=params.get('q')||'';stock.value=params.get('stock')||'';sort.value=params.get('sort')==='oldest'?'oldest':'newest';
 const normalize=s=>s.normalize('NFKC').toLocaleLowerCase().trim();
 function render(){
  const words=normalize(search.value).split(/\s+/).filter(Boolean),s=stock.value;
  const visible=catalog.filter(a=>(!month||a.published_date.startsWith(month))&&(!type||a.analysis_types.includes(type))&&(!s||a.securities.some(x=>x.symbol===s))&&(view!=='favorites'||state(a.video_id).favorite)&&(view!=='unread'||!state(a.video_id).read)&&words.every(w=>normalize(a.search_text).includes(w)));
  const ids=new Set(visible.map(a=>a.video_id));
  document.querySelectorAll('.video-card').forEach(card=>card.hidden=!ids.has(card.dataset.id));
  const oldest=sort.value==='oldest';const groups=[...document.querySelectorAll('.month-group')].sort((a,b)=>oldest?a.dataset.group.localeCompare(b.dataset.group):b.dataset.group.localeCompare(a.dataset.group));
  for(const group of groups){const cards=[...group.querySelectorAll('.video-card')].sort((a,b)=>{const ai=catalog.findIndex(x=>x.video_id===a.dataset.id),bi=catalog.findIndex(x=>x.video_id===b.dataset.id);return oldest?bi-ai:ai-bi;});cards.forEach(c=>group.querySelector('.month-cards').append(c));const count=cards.filter(c=>!c.hidden).length;group.hidden=count===0;group.querySelector('.month-visible-count').textContent=`${count} 期`;document.getElementById('video-list').append(group);}
  const labels=[view==='favorites'?'我的收藏':view==='unread'?'未读 / 阅读中':'全部视频',month,type,s].filter(Boolean);
  document.getElementById('results-label').textContent=`${labels.join(' / ')} · ${visible.length} 期`;
  document.getElementById('empty-results').hidden=visible.length>0;
  document.getElementById('clear-filters').hidden=!(month||type||s||search.value||view);
  document.querySelectorAll('[data-type]').forEach(b=>{const on=b.dataset.type===type;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
  document.querySelectorAll('.sidebar-link').forEach(a=>a.classList.toggle('selected',a.classList.contains('nav-all')?!view&&!month:a.dataset.viewLink?view===a.dataset.viewLink:!view&&month===a.dataset.monthLink));
  const p=new URLSearchParams();for(const[k,v]of Object.entries({q:search.value.trim(),stock:s,type,month,view,sort:oldest?'oldest':''}))if(v)p.set(k,v);
  try{history.replaceState(history.state,'',location.pathname+(p.size?'?'+p.toString():'')+location.hash);}catch{}
  document.querySelectorAll('.article-link').forEach(link=>{const st=state(link.dataset.openId);const base=`articles/${link.dataset.openId}.html`;link.href=base+(!st.read&&/^chapter-\d+$/.test(st.anchor||'')?'#'+st.anchor:'');});
 }
 function reset(){type='';month='';view='';search.value='';stock.value='';sort.value='newest';render();}
 search.addEventListener('input',render);stock.addEventListener('change',render);sort.addEventListener('change',render);
 document.querySelectorAll('[data-type]').forEach(b=>b.addEventListener('click',()=>{type=b.dataset.type;render();}));
 document.querySelectorAll('[data-filter-stock]').forEach(b=>b.addEventListener('click',()=>{stock.value=b.dataset.filterStock;render();}));
 document.getElementById('clear-filters').addEventListener('click',reset);document.getElementById('empty-clear').addEventListener('click',reset);document.addEventListener('rhino-state',render);
 addEventListener('keydown',e=>{if(e.key==='/'&&!dialog.open&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){e.preventDefault();search.focus();}});
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
  dialog.append(document.getElementById('toast'));cleanup=Rhino.initReader(content,{videoId:id,scroller});
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
 document.getElementById('reader-directory').addEventListener('click',()=>{content.querySelector('.reader-chapters').open=true;scroller.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});
 dialog.addEventListener('cancel',e=>{e.preventDefault();requestClose();});
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)requestClose();}});
 content.addEventListener('click',e=>{
  if(e.target.closest('[data-close-reader]')){requestClose();return;}
  const link=e.target.closest('a');if(!link||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
  const href=link.getAttribute('href');
  if(/^#(?:chapter-\d+|source|takeaways|key-[a-z0-9_-]+|point-[a-z0-9_-]+)$/.test(href||'')){
   const target=content.querySelector(href);if(target){e.preventDefault();content.querySelector('.reader-chapters').open=false;target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}
  }else if(href?.startsWith('index.html?stock=')){e.preventDefault();const selected=new URL(link.href).searchParams.get('stock');afterClose=()=>{stock.value=selected;render();};requestClose();}
 });
 addEventListener('popstate',()=>{const id=hashId();if(id)openReader(id,null,false);else finishReader();});
 render();if(hashId())openReader(hashId(),null,false);
})();
