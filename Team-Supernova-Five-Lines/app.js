(()=>{
 const ids=['chris','ari','nina','herman','anna'],colors=['#bdd9a1','#e7b6ce','#c3b6ff','#9fc9ff','#f2c89d'];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,svg=document.querySelector('#geometry'),lines=[...svg.querySelectorAll('line')];
 let points=Array.from({length:5},()=>[50,44,50,44]),raf=0,timer=0,current='team',routeVersion=0;
 const narrow=()=>innerWidth<550;
 const mark=()=>{const cy=narrow()?42:43,rx=narrow()?14:9,ry=narrow()?8:13;return Array.from({length:5},(_,i)=>{let a=(-90+i*72)*Math.PI/180,b=(-90+(i+1)*72)*Math.PI/180;const x=50+Math.cos(a)*rx,y=cy+Math.sin(a)*ry,xx=50+Math.cos(b)*rx,yy=cy+Math.sin(b)*ry;return[x+(xx-x)*.16,y+(yy-y)*.16,x+(xx-x)*.84,y+(yy-y)*.84]})};
 const spread=()=>narrow()?[[44,37,29,29],[56,37,71,29],[58,49,72,59],[50,52,50,73],[42,49,28,59]]:[[44,42,29,31],[56,41,70,28],[57,53,74,63],[50,56,50,74],[43,53,28,68]];
 const frame=()=>[[4,20,4,43],[96,18,96,40],[96,59,96,80],[44,93,56,93],[4,59,4,80]];
 const journey=['team','collective',...ids];
 const collectiveMark=()=>mark().map(p=>p.map((v,j)=>j%2?18+(v-(narrow()?42:43))*.43:50+(v-50)*.43));
 const destination=()=>current==='team'?spread():current==='collective'?collectiveMark():frame();
 let navigationLock=0;
 function paint(){svg.setAttribute('viewBox',`0 0 ${innerWidth} ${innerHeight}`);points.forEach((p,i)=>{['x1','y1','x2','y2'].forEach((key,j)=>lines[i].setAttribute(key,p[j]*(j%2?innerHeight:innerWidth)/100))})}
 function morph(to,duration=1100){cancelAnimationFrame(raf);const from=points.map(p=>[...p]);let start; if(reduced||duration<=0){points=to;paint();return}function step(t){start??=t;let x=Math.min((t-start)/duration,1),e=1-Math.pow(1-x,4);points=from.map((p,i)=>p.map((v,j)=>v+(to[i][j]-v)*e));paint();if(x<1)raf=requestAnimationFrame(step)}raf=requestAnimationFrame(step)}
 function menuClose(){document.querySelector('#index').hidden=true;document.querySelector('.index-toggle').setAttribute('aria-expanded','false');document.querySelector('main').inert=false;}
 function show(id,animate=true){clearTimeout(timer);navigationLock=performance.now()+(reduced?250:1150);document.body.classList.remove('intro');document.querySelector('#opening').hidden=true;menuClose();current=journey.includes(id)?id:'team';const version=++routeVersion;document.body.classList.toggle('has-profile',current!=='team');document.body.classList.toggle('has-collective',current==='collective');document.body.style.setProperty('--accent',colors[ids.indexOf(current)]||'#c2b6e5');document.body.classList.add('routing');lines.forEach(l=>{l.style.stroke='';l.style.opacity=''});morph(destination(),animate?1050:0);setTimeout(()=>{if(version!==routeVersion)return;document.querySelectorAll('.screen').forEach(s=>{const active=s.id===current;s.classList.toggle('active',active);s.inert=!active;});document.body.classList.remove('routing');if(ids.includes(current))setView(document.getElementById(current),'overview');document.title=current==='team'?'Team Supernova':current==='collective'?'About the team · Supernova':document.querySelector('#'+current+' .bio h1').textContent+' · Supernova';},animate&&!reduced?360:0);const next=document.querySelector('#next');next.hidden=current==='team';next.href='#'+(current==='collective'?'chris':ids[(ids.indexOf(current)+1)%5]);next.textContent=current==='collective'?'MEET THE MEMBERS →':'NEXT PERSPECTIVE →';document.querySelector('#replay').hidden=current!=='team';document.querySelector('#scroll-hint').textContent=current==='anna'?'SCROLL UP TO REVISIT ↑':'SCROLL TO EXPLORE ↓';}
 function setView(profile,v){profile.querySelectorAll('.view').forEach(p=>{p.classList.toggle('selected',p.classList.contains(v));});profile.querySelectorAll('.chapter-nav [data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===v)));}
 function intro(){
  ++routeVersion;clearTimeout(timer);cancelAnimationFrame(raf);menuClose();
  document.body.classList.add('intro');document.body.classList.remove('has-profile','has-collective','routing');
  document.querySelector('#opening').hidden=false;
  document.querySelectorAll('.screen').forEach(s=>{s.classList.remove('active');s.inert=true;});
  if(reduced){show('team',false);return;}
  // A ten-second, continuous sequence: ignition, orbit, alignment, release.
  const transformMark=(scale,rotation)=>{const cy=narrow()?42:43,rx=narrow()?14:9,ry=narrow()?8:13;return mark().map(p=>{let q=[];for(let j=0;j<4;j+=2){const x=(p[j]-50)/rx,y=(p[j+1]-cy)/ry;q.push(50+(x*Math.cos(rotation)-y*Math.sin(rotation))*rx*scale,cy+(x*Math.sin(rotation)+y*Math.cos(rotation))*ry*scale);}return q;});};
  let started;
  function openingFrame(time){
   started??=time;const t=Math.min((time-started)/1000,10),ease=x=>x*x*(3-2*x);
   if(t<2.4){const k=ease(t/2.4);points=transformMark(.06+.94*k,-1.25*(1-k));}
   else if(t<6.2){const k=ease((t-2.4)/3.8);points=transformMark(1+.28*Math.sin(k*Math.PI),k*Math.PI*2);}
   else if(t<8){const k=ease((t-6.2)/1.8);points=transformMark(1-.2*Math.sin(k*Math.PI),Math.PI*2);}
   else{const k=ease((t-8)/2),from=mark(),to=spread();points=from.map((p,i)=>p.map((v,j)=>v+(to[i][j]-v)*k));}
   paint();if(t<10)raf=requestAnimationFrame(openingFrame);else show('team',false);
  }
  raf=requestAnimationFrame(openingFrame);
 }
 document.querySelector('#skip').addEventListener('click',()=>show('team'));
 document.querySelector('#replay').addEventListener('click',()=>{history.replaceState(null,'','#team');intro()});
 addEventListener('hashchange',()=>show(location.hash.slice(1)));
 document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',()=>{if(a.hash===location.hash)show(a.hash.slice(1))}));
 document.querySelectorAll('.profile').forEach(profile=>{profile.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(profile,b.dataset.view)));profile.querySelectorAll('.case').forEach((c,i)=>c.classList.toggle('selected',i===0));profile.querySelectorAll('[data-select]').forEach(b=>b.addEventListener('click',()=>{profile.querySelectorAll('[data-select]').forEach(t=>t.setAttribute('aria-pressed',String(t===b)));profile.querySelectorAll('.case').forEach(c=>c.classList.toggle('selected',c.dataset.case===b.dataset.select))}));});
 document.querySelectorAll('[data-cv]').forEach(b=>b.addEventListener('click',()=>document.getElementById(b.dataset.cv).showModal()));document.querySelectorAll('.close-cv').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
 document.querySelector('.index-toggle').addEventListener('click',()=>{const panel=document.querySelector('#index');const opening=panel.hidden;panel.hidden=!opening;document.querySelector('.index-toggle').setAttribute('aria-expanded',String(opening));document.querySelector('main').inert=opening;if(opening)panel.querySelector('a').focus()});
 addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.querySelector('dialog[open]'))menuClose()});
 document.querySelectorAll('.member-link').forEach(a=>{a.addEventListener('pointerenter',()=>{lines.forEach((l,i)=>{l.style.stroke=i===Number(a.dataset.i)?colors[i]:'#858b9b';l.style.opacity=i===Number(a.dataset.i)?'1':'.3'});});a.addEventListener('pointerleave',()=>lines.forEach(l=>{l.style.stroke='';l.style.opacity=''}));});
 addEventListener('resize',()=>{if(document.body.classList.contains('intro'))return;cancelAnimationFrame(raf);points=destination();paint()});
 // One scene per deliberate gesture. Momentum must settle before another scene can open.
 function overlayOpen(){return !document.querySelector('#index').hidden||!!document.querySelector('dialog[open]')||document.body.classList.contains('intro')}
 function nativeScroller(target){for(let el=target instanceof Element?target:null;el&&el!==document.body;el=el.parentElement){const css=getComputedStyle(el);if(/auto|scroll/.test(css.overflowY)&&el.scrollHeight>el.clientHeight+2)return true;}return false;}
 function advance(direction){if(overlayOpen()||performance.now()<navigationLock)return;const index=journey.indexOf(current),nextIndex=Math.max(0,Math.min(journey.length-1,index+direction));if(index!==nextIndex){navigationLock=performance.now()+1150;location.hash=journey[nextIndex];}}
 let wheelLast=0,wheelTotal=0,wheelUsed=false,wheelDirection=0;
 addEventListener('wheel',e=>{if(e.ctrlKey||Math.abs(e.deltaX)>Math.abs(e.deltaY)||overlayOpen())return;const now=performance.now();if(now-wheelLast>220){wheelTotal=0;wheelUsed=false;wheelDirection=0;}wheelLast=now;if(nativeScroller(e.target)){wheelUsed=true;return;}e.preventDefault();if(wheelUsed||now<navigationLock)return;const amount=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1),direction=Math.sign(amount);if(direction!==wheelDirection)wheelTotal=0;wheelDirection=direction;wheelTotal+=amount;if(Math.abs(wheelTotal)>=65){wheelUsed=true;advance(direction);}},{passive:false});
 let touch=null;
 addEventListener('touchstart',e=>{touch=e.touches.length===1&&!overlayOpen()?{x:e.touches[0].clientX,y:e.touches[0].clientY,native:nativeScroller(e.target)}:null;},{passive:true});
 addEventListener('touchmove',e=>{if(!touch||touch.native||overlayOpen())return;const dx=e.touches[0].clientX-touch.x,dy=e.touches[0].clientY-touch.y;if(Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>12)e.preventDefault();},{passive:false});
 addEventListener('touchend',e=>{if(!touch)return;const t=touch;touch=null;if(t.native||!e.changedTouches.length)return;const dy=t.y-e.changedTouches[0].clientY,dx=t.x-e.changedTouches[0].clientX;if(Math.abs(dy)>65&&Math.abs(dy)>Math.abs(dx)*1.4)advance(Math.sign(dy));},{passive:true});
 addEventListener('keydown',e=>{if(!['PageDown','PageUp'].includes(e.key)||overlayOpen()||nativeScroller(e.target))return;e.preventDefault();advance(e.key==='PageDown'?1:-1);});
 if(location.hash&&location.hash!=='#team')show(location.hash.slice(1),false);else intro();
})();
