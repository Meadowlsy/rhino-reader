(()=>{
 function initReader(root=document,{videoId=document.body.dataset.videoId,scroller=window}={}){
  const id=videoId,$=s=>root.querySelector(s),all=s=>[...root.querySelectorAll(s)];
  const controller=new AbortController(),signal=controller.signal;
  const on=(el,event,fn,opts={})=>el.addEventListener(event,fn,{...opts,signal});
  const chartLinks=all('.chart-open');
  let chartViewer,chartTrigger,chartIndex=0,actualSize=false;
  if(chartLinks.length){
   chartViewer=document.createElement('dialog');chartViewer.className='chart-viewer';
   chartViewer.setAttribute('aria-label','点位图大图');
   chartViewer.innerHTML='<div class="chart-viewer-bar"><div><strong class="chart-viewer-title"></strong><span class="chart-viewer-meta"></span></div><div class="chart-viewer-tools"><button data-chart-prev aria-label="上一张点位图">←</button><button data-chart-next aria-label="下一张点位图">→</button><button data-chart-size aria-pressed="false">放大细节</button><button data-chart-close aria-label="关闭点位图">×</button></div></div><div class="chart-viewer-scroll"><img alt=""></div>';
   document.body.append(chartViewer);
   const image=chartViewer.querySelector('img'),viewport=chartViewer.querySelector('.chart-viewer-scroll'),size=chartViewer.querySelector('[data-chart-size]');
   const previous=chartViewer.querySelector('[data-chart-prev]'),next=chartViewer.querySelector('[data-chart-next]');
   function resetSize(){actualSize=false;chartViewer.classList.remove('is-actual');image.style.width='';size.textContent='放大细节';size.setAttribute('aria-pressed','false');viewport.scrollTo(0,0);}
   function showChart(index){
    chartIndex=index;const link=chartLinks[index],thumb=link.querySelector('img');resetSize();
    image.src=link.href;image.alt=thumb.alt;
    chartViewer.querySelector('.chart-viewer-title').textContent=link.dataset.chartTitle;
    chartViewer.querySelector('.chart-viewer-meta').textContent=`原视频 ${link.dataset.chartTime} · ${index+1} / ${chartLinks.length}`;
    previous.disabled=index===0;next.disabled=index===chartLinks.length-1;
   }
   function closeChart(){chartViewer.close();if(chartTrigger?.isConnected)chartTrigger.focus({preventScroll:true});}
   chartLinks.forEach((link,index)=>on(link,'click',e=>{if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();chartTrigger=link;showChart(index);chartViewer.showModal();}));
   on(chartViewer.querySelector('[data-chart-close]'),'click',closeChart);
   on(previous,'click',()=>showChart(Math.max(0,chartIndex-1)));
   on(next,'click',()=>showChart(Math.min(chartLinks.length-1,chartIndex+1)));
   on(size,'click',()=>{actualSize=!actualSize;chartViewer.classList.toggle('is-actual',actualSize);image.style.width=actualSize?Math.max(image.naturalWidth,Math.round(viewport.clientWidth*1.5))+'px':'';size.textContent=actualSize?'适应窗口':'放大细节';size.setAttribute('aria-pressed',String(actualSize));});
   on(chartViewer,'cancel',e=>{e.preventDefault();e.stopPropagation();closeChart();});
   on(chartViewer,'click',e=>{if(e.target===chartViewer){const r=chartViewer.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeChart();}});
   on(chartViewer,'keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();showChart(Math.max(0,Math.min(chartLinks.length-1,chartIndex+(e.key==='ArrowLeft'?-1:1))));}});
  }
  let currentAnchor=Rhino.state(id).anchor||'chapter-1',timer,progress=0;
  const prior=Rhino.state(id),resume=$('#resume-note');
  if(prior.progress>.03&&!prior.read){
   resume.hidden=false;resume.textContent=`上次读到约 ${Math.round(prior.progress*100)}% `;
   if(/^chapter-\d+$/.test(prior.anchor||'')){
    const button=document.createElement('button');button.textContent='继续阅读 →';resume.append(button);
    on(button,'click',()=>$('#'+prior.anchor)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'}));
   }
  }
  Rhino.persist(id,{progress:Math.max(prior.progress||0,.01)});
  const mark=$('#mark-read');
  function updateRead(){const read=!!Rhino.state(id).read;mark.textContent=read?'✓ 已读 · 改为未读':'标为已读';mark.setAttribute('aria-pressed',String(read));}
  on(mark,'click',()=>{const read=!Rhino.state(id).read;Rhino.persist(id,{read,progress:read?1:0,anchor:read?currentAnchor:'chapter-1'});if(!read){currentAnchor='chapter-1';progress=0;resume.hidden=true;clearTimeout(timer);scroller.scrollTo({top:0,behavior:'instant'});}});
  on(document,'rhino-state',updateRead);updateRead();
  const audio=$('#audio'),panel=$('#transcript-panel'),toggle=$('#toggle-transcript'),list=$('#transcript-list');
  let segments=all('.transcript-segment'),loading=false;
  const play=$('#audio-play'),seek=$('#audio-seek');
  const format=t=>`${String(Math.floor((t||0)/60)).padStart(2,'0')}:${String(Math.floor((t||0)%60)).padStart(2,'0')}`;
  audio.hidden=true;audio.controls=false;$('#audio-player').hidden=false;
  on(play,'click',()=>{if(audio.paused)audio.play().catch(()=>Rhino.toast('音频暂时无法播放，请检查本地音频文件。'));else audio.pause();});
  function playbackState(){play.textContent=audio.paused?'播放':'暂停';play.setAttribute('aria-label',audio.paused?'播放回听':'暂停回听');}
  for(const event of ['play','pause','ended'])on(audio,event,playbackState);
  on(audio,'loadedmetadata',()=>{seek.max=audio.duration;$('#audio-duration').textContent=format(audio.duration);});
  on(audio,'timeupdate',()=>{seek.value=audio.currentTime;$('#audio-elapsed').textContent=format(audio.currentTime);seek.setAttribute('aria-valuetext',format(audio.currentTime));for(const s of segments)s.classList.toggle('playing',audio.currentTime>=Number(s.dataset.time)&&audio.currentTime<Number(s.dataset.end));});
  on(seek,'input',()=>{audio.currentTime=Number(seek.value);});
  on($('#audio-speed'),'change',e=>audio.playbackRate=Number(e.target.value));
  on($('#audio-mute'),'click',e=>{audio.muted=!audio.muted;e.target.textContent=audio.muted?'恢复声音':'静音';e.target.setAttribute('aria-pressed',String(audio.muted));});
  function filterTranscript(){const q=$('#transcript-search').value.trim().toLocaleLowerCase();let count=0;for(const s of segments){s.hidden=!s.textContent.toLocaleLowerCase().includes(q);if(!s.hidden)count++;}$('#search-empty').hidden=count>0;}
  async function loadTranscript(){
   if(!list.dataset.transcriptUrl||segments.length||loading)return;loading=true;list.textContent='正在读取完整转录…';
   try{
    const response=await fetch(list.dataset.transcriptUrl,{signal});if(!response.ok)throw Error('Transcript unavailable');
    const data=await response.json(),fragment=document.createDocumentFragment();
    for(const s of data.transcription){const b=document.createElement('button'),time=document.createElement('time'),span=document.createElement('span');b.className='transcript-segment';b.dataset.time=s.offsets.from/1000;b.dataset.end=s.offsets.to/1000;time.textContent=format(s.offsets.from/1000);span.textContent=s.text.trim();b.append(time,span);fragment.append(b);}
    if(signal.aborted)return;list.replaceChildren(fragment);segments=all('.transcript-segment');filterTranscript();
   }catch(e){if(signal.aborted)return;list.textContent='当前打开方式无法读取原稿，可在独立文章页查看，或使用本机启动入口。';const a=document.createElement('a');a.href=`articles/${id}.html#source`;a.textContent='查看完整转录 ↗';a.className='transcript-fallback';list.append(a);}
   finally{loading=false;}
  }
  on(toggle,'click',()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));toggle.textContent=panel.hidden?'展开完整转录':'收起完整转录';if(!panel.hidden)loadTranscript();});
  on($('#transcript-search'),'input',filterTranscript);
  on($('#print-button'),'click',()=>window.print());
  on(root,'click',async e=>{
   const button=e.target.closest('[data-time]');if(!button)return;
   try{if(audio.readyState===0){audio.load();await new Promise((resolve,reject)=>{audio.addEventListener('loadedmetadata',resolve,{once:true,signal});audio.addEventListener('error',reject,{once:true,signal});signal.addEventListener('abort',reject,{once:true});});}if(signal.aborted)return;audio.currentTime=Number(button.dataset.time);await audio.play();}
   catch{if(!signal.aborted){Rhino.toast('请在页面底部的播放器中播放音频。');$('#source').scrollIntoView();}}
  });
  function save(){Rhino.persist(id,{progress:Math.max(progress,Rhino.state(id).progress||0),anchor:currentAnchor});}
  function onScroll(){const b=$('.article-body').getBoundingClientRect(),bounds=scroller===window?{top:0,height:innerHeight}:scroller.getBoundingClientRect();progress=Math.max(0,Math.min(1,(bounds.top+bounds.height*.65-b.top)/b.height));$('#progress').style.width=`${progress*100}%`;clearTimeout(timer);timer=setTimeout(save,350);}
  on(scroller,'scroll',onScroll,{passive:true});on(window,'resize',onScroll);
  const observer=new IntersectionObserver(entries=>{const visible=entries.filter(x=>x.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top);if(visible.length){currentAnchor=visible[0].target.id;all('.toc-link').forEach(a=>a.classList.toggle('active',a.hash==='#'+currentAnchor));}},{root:scroller===window?null:scroller,rootMargin:'-8% 0px -65% 0px'});
  all('.chapter').forEach(el=>observer.observe(el));onScroll();Rhino.update();
  return ()=>{clearTimeout(timer);save();if(chartViewer){chartViewer.close();chartViewer.remove();}controller.abort();observer.disconnect();audio.pause();};
 }
 Rhino.initReader=initReader;
 if(document.body.dataset.page==='article')initReader();
})();
