/* Rear-panel cables with rope physics (verlet, idea taken from DMXSimulatoR's power patch).
 * The cabling is fixed (as in the real room): router OUT → ATEM IN between the units, plus the cables that come
 * from outside (cameras, vMix PC) or go to other equipment, hanging with a tag. Hover a cable = what it carries. */
(function(){
const N=16,G=0.45,DAMP=0.965,ITER=12,SLACK=1.07;
const vhWrap=()=>document.getElementById('vh-rearwrap');
/* generic rope set: cfg = {wrap, svg, list, active, sig} — used by the video rack and the Ultimatte screen */
function makeRopes(cfg){let ropes=[],raf=0,sig='';const wrap=cfg.wrap,svg=cfg.svg;
function centre(sel){const w=wrap(),e=w&&w.querySelector(sel);if(!e)return null;const c=e.querySelector('.vh-bnc')||e,r=c.getBoundingClientRect(),R=w.getBoundingClientRect();return {x:r.left+r.width/2-R.left,y:r.top+r.height/2-R.top};}
/* same height for every tag; only a tag that would overlap its neighbour (long name) goes one step further */
function stagger(L){[-1,1].forEach(dir=>{const row=L.filter(c=>!c.b&&Math.sign(c.hang)===dir).map(c=>({c,x:(centre(c.a)||{x:0}).x,w:c.tag.length*5+7})).sort((a,b)=>a.x-b.x);
    let prevR=-1e9,lvl=0;row.forEach(t=>{lvl=t.x-t.w/2<prevR-1?lvl+1:0;t.c.hang+=dir*lvl*17;prevR=t.x+t.w/2;});});return L;}
function build(){const s=svg();if(!s)return;const L=stagger(cfg.list());ropes=L.map(c=>{const A=centre(c.a),B=c.b?centre(c.b):null;if(!A||(c.b&&!B))return null;
    const end=B||{x:A.x-6,y:A.y+c.hang};   // negative hang = the cable leaves upwards (into the space between the rear panels)
    const pts=[];for(let k=0;k<N;k++){const t=k/(N-1);pts.push({x:A.x+(end.x-A.x)*t,y:A.y+(end.y-A.y)*t+Math.sin(Math.PI*t)*20,px:0,py:0});pts[k].px=pts[k].x;pts[k].py=pts[k].y;}
    const g=c.hang<0?-G:G;const len=c.b?Math.hypot(B.x-A.x,B.y-A.y)*SLACK/(N-1):Math.abs(c.hang)*1.25/(N-1);return {...c,pts,len,g};}).filter(Boolean);
  s.innerHTML=ropes.map((r,i)=>`<path class="vh-cab bnc" data-i="${i}" data-tip="${r.info}"/>`+(r.tag?`<g class="vh-tg" data-i="${i}"><rect class="vh-tagbg" rx="2.5" height="12"/><text class="vh-tag"></text></g>`:'')+`<circle class="vh-plugc" r="6" data-i="${i}"/>`+(r.b?`<circle class="vh-plugc" r="6" data-j="${i}"/>`:'')).join('');
  s.querySelectorAll('.vh-cab').forEach(p=>{p.addEventListener('mouseenter',()=>hl(+p.dataset.i,true));p.addEventListener('mouseleave',()=>hl(+p.dataset.i,false));});
  for(let k=0;k<80;k++)step();}
function hl(i,on){const s=svg(),r=ropes[i];if(!r)return;s.querySelector(`.vh-cab[data-i="${i}"]`).classList.toggle('hl',on);   // the text comes from data-tip (shared tooltip)
  [r.a,r.b].forEach(q=>{const el=q&&wrap().querySelector(q);if(el)el.classList.toggle('hl',on);});}
function step(){ropes.forEach(r=>{const A=centre(r.a),B=r.b?centre(r.b):null;if(!A)return;const P=r.pts;
  for(let k=1;k<N;k++){const p=P[k];if(k===N-1&&B)continue;const vx=(p.x-p.px)*DAMP,vy=(p.y-p.py)*DAMP;p.px=p.x;p.py=p.y;p.x+=vx;p.y+=vy+r.g;}
  for(let it=0;it<ITER;it++){P[0].x=A.x;P[0].y=A.y;if(B){P[N-1].x=B.x;P[N-1].y=B.y;}
    for(let k=0;k<N-1;k++){const p=P[k],q=P[k+1],dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy)||1e-6,df=(d-r.len)/d*.5;
      if(k>0){p.x+=dx*df;p.y+=dy*df;}if(!(k+1===N-1&&B)){q.x-=dx*df;q.y-=dy*df;}}}});}
function render(){const s=svg();if(!s)return;const w=wrap();s.setAttribute('viewBox',`0 0 ${w.clientWidth} ${w.clientHeight}`);
  ropes.forEach((r,i)=>{const P=r.pts;let d=`M${P[0].x.toFixed(1)} ${P[0].y.toFixed(1)}`;for(let k=1;k<N-1;k++){const mx=(P[k].x+P[k+1].x)/2,my=(P[k].y+P[k+1].y)/2;d+=` Q${P[k].x.toFixed(1)} ${P[k].y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;}d+=` L${P[N-1].x.toFixed(1)} ${P[N-1].y.toFixed(1)}`;
    s.querySelector(`.vh-cab[data-i="${i}"]`)?.setAttribute('d',d);const c0=s.querySelector(`circle[data-i="${i}"]`);if(c0){c0.setAttribute('cx',P[0].x);c0.setAttribute('cy',P[0].y);}
    const c1=s.querySelector(`circle[data-j="${i}"]`);if(c1){c1.setAttribute('cx',P[N-1].x);c1.setAttribute('cy',P[N-1].y);}
    const g=s.querySelector(`.vh-tg[data-i="${i}"]`);if(g){const t=g.querySelector('text'),e=P[N-1];t.textContent=r.tag;const tw=r.tag.length*5+7;g.querySelector('rect').setAttribute('width',tw);g.setAttribute('transform',`translate(${(e.x-tw/2).toFixed(1)} ${(r.g<0?e.y-13:e.y+1).toFixed(1)})`);t.setAttribute('x',3.5);t.setAttribute('y',9);}});}
function loop(){raf=requestAnimationFrame(loop);if(!cfg.active())return;const s2=cfg.sig()+'|'+(wrap()?wrap().clientWidth:0);if(s2!==sig){sig=s2;build();}step();render();}
return {start(){sig='';if(!raf)loop();},refresh(){sig='';}};}
window.ROPES=makeRopes;
/* the cables we know about (working assumption — see the Videohub notes) */
function list(){const L=[],st=window.VH?VH.state():null;if(!st)return L;
  st.cabOut.forEach((v,o)=>{const m=/^atem(\d+)$/.exec(v);if(m)L.push({a:`.vh-sock[data-s="o${o}"]`,b:`.at-sock[data-s="i${+m[1]-1}"]`,info:`Videohub SDI OUT ${o+1} → ATEM SDI INPUT ${m[1]}`});});
  st.cabIn.forEach((v,i)=>{const ao=/^ao(\d+)$/.exec(v)||(v==='atem'?[0,'1']:null);if(ao){L.push({a:`.at-sock[data-s="o${+ao[1]-1}"]`,b:`.vh-sock[data-s="i${i}"]`,info:`ATEM SDI OUTPUT ${ao[1]} → Videohub SDI IN ${i+1}`});return;}
    if(v==='none')return;const tag=/^cam\d$/.test(v)?'CAM '+v.slice(3):{vfill:'vMix FILL',vkey:'vMix KEY',hdk:'HyperDeck',gscam:'Chroma cam',ult1:'Ultimatte 1',ult2:'Ultimatte 2'}[v]||v;
    const up=i%2===0;   // top-row BNC (odd numbers) → cable and tag go up; bottom row → down
    L.push({a:`.vh-sock[data-s="i${i}"]`,hang:up?-35:34,tag,info:`${tag} → Videohub SDI IN ${i+1}`+(v.startsWith('cam')?' (from the studio patch panel, VIDEO '+v.slice(3)+')':v==='gscam'?' (test green-screen camera)':/^ult/.test(v)?' (Ultimatte PGM OUT)':' (DeckLink SDI out of the vMix PC)')});});
  st.cabOut.forEach((v,o)=>{const u=/^u(\d)(fg|bg)$/.exec(v);if(u)L.push({a:`.vh-sock[data-s="o${o}"]`,hang:o%2?34:-35,tag:'Ult '+u[1]+' '+u[2].toUpperCase(),info:`Videohub SDI OUT ${o+1} → Ultimatte ${u[1]} ${u[2]==='fg'?'CAMERA FG':'BACKGROUND'}`});const m=/^vmix(\d)$/.exec(v);if(m)L.push({a:`.vh-sock[data-s="o${o}"]`,hang:o%2?34:-35,tag:'vMix '+m[1],info:`Videohub SDI OUT ${o+1} → vMix PC (DeckLink SDI ${m[1]} capture)`});});
  L.push({a:'.at-sock[data-s="m0"]',hang:-26,tag:'MONITOR',info:'ATEM MULTIVIEW 1 → control-room monitor wall'});
  return L;}
const vhRopes=makeRopes({wrap:vhWrap,svg:()=>document.getElementById('vh-cables'),list,active:()=>!!document.getElementById('vh')?.classList.contains('on'),sig:()=>window.VH?JSON.stringify([VH.state().cabIn,VH.state().cabOut]):''});
/* ---------- PATCH MODE (admin): re-cable the rear and keep it ---------- */
let sel=null,wired=false;
function msg(t){const d=document.getElementById('vh-diag');if(d)d.innerHTML=`<span class="pw-chip bad"><i></i>PATCH MODE</span><span class="mx-sel">${t}</span>`;}
function mark(){document.querySelectorAll('#vh-rearwrap .psel').forEach(e=>e.classList.remove('psel'));if(sel)document.querySelector(`#vh-rearwrap .${sel[0]==='h'?'vh':'at'}-sock[data-s="${sel.slice(1)}"]`)?.classList.add('psel');}
function wire(){if(wired)return;wired=true;const root=document.getElementById('vh');
  document.getElementById('vh-patch').onclick=e=>{const on=!root.classList.contains('patch');if(on&&!confirm('Patch mode (admin): you can re-cable the rear panels. Changes are saved in this browser. Continue?'))return;
    root.classList.toggle('patch',on);e.currentTarget.classList.toggle('on',on);e.currentTarget.textContent=on?'Exit patch mode':'Patch mode';sel=null;mark();if(on)msg('Click a free socket and then the other end to run a cable (router OUT → ATEM IN, or ATEM OUT → router IN), in either order · click a plugged socket to unplug it · click a router socket twice for cameras, vMix and other devices.');else VH.save();};
  document.getElementById('vh-exp').onclick=()=>{const st=VH.state(),b=new Blob([JSON.stringify({tvstudio:'video-rack-cabling',v:1,cabIn:st.cabIn,cabOut:st.cabOut},null,1)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='tvstudio-video-cabling.json';a.click();};
  const fi=document.getElementById('vh-impfile');document.getElementById('vh-imp').onclick=()=>fi.click();
  fi.onchange=async()=>{try{const d=JSON.parse(await fi.files[0].text());if(!Array.isArray(d.cabIn)||!Array.isArray(d.cabOut))throw 0;const st=VH.state();st.cabIn=d.cabIn;st.cabOut=d.cabOut;VH.save();msg('Cabling imported.');}catch(_){alert('That file is not a cabling file.');}fi.value='';};
  document.getElementById('vh-def').onclick=()=>{if(!confirm('Put back the default (Tartanga) cabling?'))return;const st=VH.state();st.cabIn=[...VH.DEF.cabIn];st.cabOut=[...VH.DEF.cabOut];VH.save();msg('Default cabling restored.');};
  const nm=k=>({hi:'router IN ',ho:'router OUT ',ai:'ATEM IN ',ao:'ATEM OUT ',am:'ATEM MULTIVIEW '}[k.slice(0,2)]+(+k.slice(2)+1));
  const plugged=k=>{const st=VH.state(),t=k.slice(0,2),n=+k.slice(2);return t==='hi'?st.cabIn[n]!=='none':t==='ho'?st.cabOut[n]!=='none':t==='ai'?st.cabOut.includes('atem'+(n+1)):t==='ao'?st.cabIn.some(v=>v==='ao'+(n+1)||(n===0&&v==='atem')):true;};
  function unplug(k){const st=VH.state(),t=k.slice(0,2),n=+k.slice(2);
    if(t==='hi')st.cabIn[n]='none';else if(t==='ho')st.cabOut[n]='none';
    else if(t==='ai')st.cabOut.forEach((v,i)=>{if(v==='atem'+(n+1))st.cabOut[i]='none';});
    else if(t==='ao')st.cabIn.forEach((v,i)=>{if(v==='ao'+(n+1)||(n===0&&v==='atem'))st.cabIn[i]='none';});}
  function connect(x,y){const st=VH.state(),p={[x.slice(0,2)]:+x.slice(2),[y.slice(0,2)]:+y.slice(2)};
    if('ho' in p&&'ai' in p){unplug('ai'+p.ai);st.cabOut[p.ho]='atem'+(p.ai+1);return `Cable: router OUT ${p.ho+1} → ATEM IN ${p.ai+1}.`;}
    if('ao' in p&&'hi' in p){unplug('ao'+p.ao);st.cabIn[p.hi]='ao'+(p.ao+1);return `Cable: ATEM OUT ${p.ao+1} → router IN ${p.hi+1}.`;}
    return null;}
  vhWrap().addEventListener('click',e=>{if(!root.classList.contains('patch'))return;const g=e.target.closest('.vh-sock,.at-sock');if(!g)return;e.stopPropagation();
    const k=(g.classList.contains('vh-sock')?'h':'a')+g.dataset.s;
    if(k.startsWith('am')){msg('The MULTIVIEW output feeds the control-room monitor (fixed).');return;}
    if(sel){if(sel===k){sel=null;mark();if(k[0]==='h')VH.plugMenu(k.slice(1),e);else msg('Cancelled.');return;}   // same socket again = other sources / destinations
      const t=connect(sel,k);if(t){sel=null;mark();VH.save();msg(t);return;}
      msg(`${nm(sel)} cannot be cabled to ${nm(k)} (an output must go to an input).`);return;}
    if(plugged(k)){unplug(k);VH.save();msg(nm(k)+' unplugged.');return;}
    sel=k;mark();msg(`${nm(k)} selected: now click where the other end goes${k[0]==='h'?' — or click it again for other sources / destinations':''}.`);},true);}
window.CABLES={start(){wire();vhRopes.start();}};
})();
