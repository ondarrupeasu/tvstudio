/* Rear-panel cables with rope physics (verlet, idea taken from DMXSimulatoR's power patch).
 * The cabling is fixed (as in the real room): router OUT → ATEM IN between the units, plus the cables that come
 * from outside (cameras, vMix PC) or go to other equipment, hanging with a tag. Hover a cable = what it carries. */
(function(){
const N=16,G=0.45,DAMP=0.965,ITER=12,SLACK=1.07;
let ropes=[],raf=0,sig='';
const wrap=()=>document.getElementById('vh-rearwrap'),svg=()=>document.getElementById('vh-cables');
function centre(sel){const w=wrap(),e=w&&w.querySelector(sel);if(!e)return null;const c=e.querySelector('.vh-bnc')||e,r=c.getBoundingClientRect(),R=w.getBoundingClientRect();return {x:r.left+r.width/2-R.left,y:r.top+r.height/2-R.top};}
/* the cables we know about (working assumption — see the Videohub notes) */
function list(){const L=[],st=window.VH?VH.state():null;if(!st)return L;
  st.cabOut.forEach((v,o)=>{const m=/^atem(\d+)$/.exec(v);if(m)L.push({a:`.vh-sock[data-s="o${o}"]`,b:`.at-sock[data-s="i${+m[1]-1}"]`,info:`Videohub SDI OUT ${o+1} → ATEM SDI INPUT ${m[1]}`});});
  st.cabIn.forEach((v,i)=>{if(v==='none')return;const tag={cam1:'CAM 1',cam2:'CAM 2',cam3:'CAM 3',cam4:'CAM 4',vfill:'vMix FILL',vkey:'vMix KEY'}[v]||v;
    const up=i%2===0,lvl=Math.floor(i/2);   // top-row BNC (odd numbers) → cable and tag go up; bottom row → down
    L.push({a:`.vh-sock[data-s="i${i}"]`,hang:(up?-1:1)*(34+lvl*20),tag,info:`${tag} → Videohub SDI IN ${i+1}`+(v.startsWith('cam')?' (from the studio patch panel, VIDEO '+v.slice(3)+')':' (DeckLink SDI out of the vMix PC)')});});
  L.push({a:'.at-sock[data-s="m0"]',hang:-40,tag:'MONITOR',info:'ATEM MULTIVIEW 1 → control-room monitor wall'});
  return L;}
function build(){const s=svg();if(!s)return;const L=list();ropes=L.map(c=>{const A=centre(c.a),B=c.b?centre(c.b):null;if(!A||(c.b&&!B))return null;
    const end=B||{x:A.x-6,y:A.y+c.hang};   // negative hang = the cable leaves upwards (into the space between the rear panels)
    const pts=[];for(let k=0;k<N;k++){const t=k/(N-1);pts.push({x:A.x+(end.x-A.x)*t,y:A.y+(end.y-A.y)*t+Math.sin(Math.PI*t)*20,px:0,py:0});pts[k].px=pts[k].x;pts[k].py=pts[k].y;}
    const g=c.hang<0?-G:G;const len=c.b?Math.hypot(B.x-A.x,B.y-A.y)*SLACK/(N-1):Math.abs(c.hang)*1.25/(N-1);return {...c,pts,len,g};}).filter(Boolean);
  s.innerHTML=ropes.map((r,i)=>`<path class="vh-cab bnc" data-i="${i}"/>`+(r.tag?`<g class="vh-tg" data-i="${i}"><rect class="vh-tagbg" rx="3" height="14"/><text class="vh-tag"></text></g>`:'')+`<circle class="vh-plugc" r="6" data-i="${i}"/>`+(r.b?`<circle class="vh-plugc" r="6" data-j="${i}"/>`:'')).join('');
  s.querySelectorAll('.vh-cab').forEach(p=>{p.addEventListener('mouseenter',e=>hl(+p.dataset.i,true,e));p.addEventListener('mousemove',e=>hl(+p.dataset.i,true,e));p.addEventListener('mouseleave',()=>hl(+p.dataset.i,false));});
  for(let k=0;k<80;k++)step();}
function hl(i,on,e){const s=svg(),r=ropes[i],tip=document.getElementById('vh-tip');if(!r)return;s.querySelector(`.vh-cab[data-i="${i}"]`).classList.toggle('hl',on);
  [r.a,r.b].forEach(q=>{const el=q&&wrap().querySelector(q);if(el)el.classList.toggle('hl',on);});
  if(on&&e){tip.innerHTML=`<b>SDI cable (BNC)</b><span>${r.info}</span>`;tip.style.left=e.clientX+'px';tip.style.top=e.clientY+'px';tip.classList.add('on');}else if(!on)tip.classList.remove('on');}
function step(){ropes.forEach(r=>{const A=centre(r.a),B=r.b?centre(r.b):null;if(!A)return;const P=r.pts;
  for(let k=1;k<N;k++){const p=P[k];if(k===N-1&&B)continue;const vx=(p.x-p.px)*DAMP,vy=(p.y-p.py)*DAMP;p.px=p.x;p.py=p.y;p.x+=vx;p.y+=vy+r.g;}
  for(let it=0;it<ITER;it++){P[0].x=A.x;P[0].y=A.y;if(B){P[N-1].x=B.x;P[N-1].y=B.y;}
    for(let k=0;k<N-1;k++){const p=P[k],q=P[k+1],dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy)||1e-6,df=(d-r.len)/d*.5;
      if(k>0){p.x+=dx*df;p.y+=dy*df;}if(!(k+1===N-1&&B)){q.x-=dx*df;q.y-=dy*df;}}}});}
function render(){const s=svg();if(!s)return;const w=wrap();s.setAttribute('viewBox',`0 0 ${w.clientWidth} ${w.clientHeight}`);
  ropes.forEach((r,i)=>{const P=r.pts;let d=`M${P[0].x.toFixed(1)} ${P[0].y.toFixed(1)}`;for(let k=1;k<N-1;k++){const mx=(P[k].x+P[k+1].x)/2,my=(P[k].y+P[k+1].y)/2;d+=` Q${P[k].x.toFixed(1)} ${P[k].y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;}d+=` L${P[N-1].x.toFixed(1)} ${P[N-1].y.toFixed(1)}`;
    s.querySelector(`.vh-cab[data-i="${i}"]`)?.setAttribute('d',d);const c0=s.querySelector(`circle[data-i="${i}"]`);if(c0){c0.setAttribute('cx',P[0].x);c0.setAttribute('cy',P[0].y);}
    const c1=s.querySelector(`circle[data-j="${i}"]`);if(c1){c1.setAttribute('cx',P[N-1].x);c1.setAttribute('cy',P[N-1].y);}
    const g=s.querySelector(`.vh-tg[data-i="${i}"]`);if(g){const t=g.querySelector('text'),e=P[N-1];t.textContent=r.tag;const tw=r.tag.length*6.2+8;g.querySelector('rect').setAttribute('width',tw);g.setAttribute('transform',`translate(${(e.x-tw/2).toFixed(1)} ${(r.g<0?e.y-16:e.y+2).toFixed(1)})`);t.setAttribute('x',4);t.setAttribute('y',10.5);}});}
function loop(){raf=requestAnimationFrame(loop);const root=document.getElementById('vh');if(!root||!root.classList.contains('on'))return;
  const s2=window.VH?JSON.stringify([VH.state().cabIn,VH.state().cabOut,wrap().clientWidth]):'';if(s2!==sig){sig=s2;build();}step();render();}
window.CABLES={start(){sig='';if(!raf)loop();}};
})();
