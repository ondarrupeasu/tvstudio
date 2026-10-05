/* Audio rack of the control room — every unit drawn after the room photo (img/rack-audio-v2.jpg) and its manual
 * (docs/*-spec.md). FRONT or REAR (seen from behind), as big as the window allows; the side ⟲ buttons turn the rack round.
 * Device modules (ar-*.js) register a type with AR.type(name, factory). The rear cables carry real audio: Web Audio nodes of
 * the Midas (window.M32.audio()) are re-routed through the units. Cabling = assumed until Tartanga confirms it.
 * Not affiliated with JVC, Behringer, TC Electronic or Monacor / img Stage Line. */
(function(){
const root=document.getElementById('ob');if(!root)return;
const W=1080,UH=100;   // every unit is drawn in a viewBox 1080 wide, 100 per rack unit
const TYPES={},DEV={},$=s=>root.querySelector(s);
const EXT_REF={};
/* units from top to bottom, as in the photo */
const RACK=[['jvc','jvc'],['mdx1','mdx4600'],['mdx2','mdx4600'],['m350','m350'],['virt','virt'],['ls','ls280'],['deq','deq2496']];
/* assumed cabling (rear). a / b = 'unit:socket'; x = an end outside the rack (Midas, speakers, ATEM) with its tag */
const CAB=[
  {a:'deq:inL',x:'midas:monL',tag:'Midas MON L'},{a:'deq:inR',x:'midas:monR',tag:'Midas MON R'},
  {a:'deq:outL',b:'jvc:auxL'},{a:'deq:outR',b:'jvc:auxR'},
  {a:'jvc:sp1',x:'spk:ctrl',tag:'Speakers control'},{a:'jvc:sp2',x:'spk:stud',tag:'Speakers studio'},
  {a:'ls:inA',x:'midas:mainL',tag:'Midas OUT 7 (L)'},{a:'ls:inB',x:'midas:mainR',tag:'Midas OUT 8 (R)'},
  {a:'ls:out1',x:'atem:L',tag:'PGM L → ATEM'},{a:'ls:out5',x:'atem:R',tag:'PGM R → ATEM'},{a:'ls:out2',x:'vu:L',tag:'VU L'},{a:'ls:out6',x:'vu:R',tag:'VU R'},
  {a:'mdx1:in1',x:'midas:ins1S',tag:'Midas AUX OUT 5'},{a:'mdx1:out1',x:'midas:ins1R',tag:'Midas AUX IN 5'},
  {a:'mdx1:in2',x:'midas:ins2S',tag:'Midas AUX OUT 6'},{a:'mdx1:out2',x:'midas:ins2R',tag:'Midas AUX IN 6'},
  {a:'m350:inL',x:'midas:aux1',tag:'Midas AUX OUT 1'},{a:'m350:inR',x:'midas:aux2',tag:'Midas AUX OUT 2'},{a:'m350:outL',x:'midas:aret1',tag:'Midas AUX IN 1'},{a:'m350:outR',x:'midas:aret2',tag:'Midas AUX IN 2'},
  {a:'virt:in1',x:'midas:aux3',tag:'Midas AUX OUT 3'},{a:'virt:in2',x:'midas:aux4',tag:'Midas AUX OUT 4'},{a:'virt:out1',x:'midas:aret3',tag:'Midas AUX IN 3'},{a:'virt:out2',x:'midas:aret4',tag:'Midas AUX IN 4'}];
const EXT_INFO={'midas:monL':'Midas monitor (control room) L','midas:monR':'Midas monitor (control room) R','spk:ctrl':'JVC SPEAKERS SYSTEM 1 → the control-room speakers (what you hear)','spk:stud':'JVC SPEAKERS SYSTEM 2 → the studio speakers',
  'midas:mainL':'Midas MAIN L (OUT 7)','midas:mainR':'Midas MAIN R (OUT 8)','atem:L':'programme sound → ATEM analog audio in L (it goes on to the HyperDeck recording)','atem:R':'programme sound → ATEM analog audio in R',
  'vu:L':'VU meters (where? to confirm)','vu:R':'VU meters (where? to confirm)','midas:ins1S':'insert of Midas channel 1 (presenter mic): send','midas:ins1R':'insert of Midas channel 1: return','midas:ins2S':'insert of Midas channel 2: send','midas:ins2R':'insert of Midas channel 2: return'};
/* ---------- helpers for the device modules ---------- */
const knobPtr=(cx,cy,r)=>`<line class="ar-ptr" x1="${cx}" y1="${cy-r*.88}" x2="${cx}" y2="${cy-r*.35}"/>`;
const AR=window.AR={W,UH,
  type(name,fn){TYPES[name]=fn;},
  /* rotary control: v from min to max (or steps = list of detents), drawn -135°..+135° */
  knob(d,k,cx,cy,r,tip,cls='ar-kb'){return `<g class="ar-k" data-d="${d.id}" data-k="${k}" data-cx="${cx}" data-cy="${cy}" data-tip="${tip||''}"><circle cx="${cx}" cy="${cy}" r="${r}" class="${cls}"/><circle cx="${cx}" cy="${cy}" r="${r*.78}" class="${cls}2"/>${knobPtr(cx,cy,r)}</g>`;},
  btn(d,b,x,y,w,h,tip,cls='ar-bt'){return `<g class="ar-b" data-d="${d.id}" data-b="${b}" data-tip="${tip||''}"><rect x="${x-w/2}" y="${y-h/2}" width="${w}" height="${h}" rx="${Math.min(w,h)*.15}" class="${cls}"/></g>`;},
  led(d,l,x,y,r,col='g'){return `<circle cx="${x}" cy="${y}" r="${r}" class="ar-led ${col}" data-d="${d.id}" data-l="${l}"/>`;},
  rled(d,l,x,y,w,h,col='g'){return `<rect x="${x-w/2}" y="${y-h/2}" width="${w}" height="${h}" class="ar-led ${col}" data-d="${d.id}" data-l="${l}"/>`;},
  /* connectors (rear): kind = xlrF / xlrM / trs / rca / din / spk / iec */
  sock(d,s,x,y,kind,tip,r=13){const S=`data-s="${d.id}:${s}" data-tip="${tip||''}"`;
    if(kind==='xlrF'||kind==='xlrM')return `<g class="ar-s" ${S}><circle cx="${x}" cy="${y}" r="${r}" class="ar-xlr"/>${kind==='xlrF'?[0,1,2].map(i=>{const a=(i*120-90)*Math.PI/180;return `<circle cx="${x+Math.cos(a)*r*.42}" cy="${y+Math.sin(a)*r*.42}" r="${r*.12}" class="ar-pin"/>`;}).join(''):`<circle cx="${x}" cy="${y}" r="${r*.62}" class="ar-xlr2"/>`}</g>`;
    if(kind==='trs')return `<g class="ar-s" ${S}><circle cx="${x}" cy="${y}" r="${r*.62}" class="ar-jack"/><circle cx="${x}" cy="${y}" r="${r*.28}" class="ar-hole"/></g>`;
    if(kind==='rca')return `<g class="ar-s" ${S}><circle cx="${x}" cy="${y}" r="${r*.55}" class="ar-rca"/><circle cx="${x}" cy="${y}" r="${r*.2}" class="ar-hole"/></g>`;
    if(kind==='spk')return `<g class="ar-s" ${S}><rect x="${x-r*1.6}" y="${y-r*.7}" width="${r*3.2}" height="${r*1.4}" rx="3" class="ar-jack"/>${[-1,1].map(i=>`<circle cx="${x+i*r*.8}" cy="${y}" r="${r*.42}" class="ar-post"/>`).join('')}</g>`;
    return `<g class="ar-s" ${S}><rect x="${x-r}" y="${y-r*.7}" width="${r*2}" height="${r*1.4}" rx="3" class="ar-jack"/></g>`;},
  txt(x,y,t,cls='ar-t',anchor='middle'){return `<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${t}</text>`;},
  setLed(d,l,on){root.querySelectorAll(`.ar-led[data-d="${d.id}"][data-l="${l}"]`).forEach(e=>e.classList.toggle('on',!!on));},
  setText(d,id,t){const e=root.querySelector(`[data-d="${d.id}"][data-tx="${id}"]`);if(e&&e.textContent!==t)e.textContent=t;},
  ctx:null,ready:false,dev:DEV,ext:EXT_REF,
  db2g:db=>Math.pow(10,db/20),g2db:g=>20*Math.log10(Math.max(1e-6,g)),
  peakDb(an){if(!an)return -120;const b=an._b||(an._b=new Float32Array(an.fftSize));an.getFloatTimeDomainData(b);let m=0;for(const v of b)m=Math.max(m,Math.abs(v));return 20*Math.log10(Math.max(1e-6,m));},
  flash(t){const m=$('#ar-msg');if(!m)return;m.textContent=t;m.classList.add('on');clearTimeout(m._t);m._t=setTimeout(()=>m.classList.remove('on'),2600);}};
/* ---------- instances ---------- */
function make(){RACK.forEach(([id,t])=>{if(DEV[id]||!TYPES[t])return;const d={id,st:{}};Object.assign(d,TYPES[t](d,AR));d.knobs=d.knobs||{};Object.entries(d.knobs).forEach(([k,o])=>{if(d.st[k]==null)d.st[k]=o.def;});DEV[id]=d;});}
/* ---------- audio: the cables carry the Midas signal through the units ---------- */
let EXT=null;
function extNodes(A){const c=A.ctx,sp=n=>{const s=c.createChannelSplitter(2);n.connect(s);const L=c.createGain(),R=c.createGain();s.connect(L,0);s.connect(R,1);return [L,R];};
  const [monL,monR]=sp(A.spk),[mainL,mainR]=sp(A.mainM),ctrl=c.createGain(),stud=c.createGain(),atem=c.createChannelMerger(2),vu=c.createChannelMerger(2);ctrl.connect(c.destination);atem.connect(A.out78);
  const studAn=c.createAnalyser(),vuAn=c.createAnalyser();stud.connect(studAn);vu.connect(vuAn);
  return {out:{'midas:monL':monL,'midas:monR':monR,'midas:mainL':mainL,'midas:mainR':mainR,'midas:ins1S':A.ch.in1.insS,'midas:ins2S':A.ch.in2.insS},
    in:{'spk:ctrl':ctrl,'spk:stud':stud,'atem:L':[atem,0],'atem:R':[atem,1],'vu:L':[vu,0],'vu:R':[vu,1],'midas:ins1R':A.ch.in1.insR,'midas:ins2R':A.ch.in2.insR},studAn,vuAn};}
function wire(){const A=window.M32&&M32.audio&&M32.audio();if(!A)return;AR.ctx=A.ctx;make();
  if(!EXT){EXT=extNodes(A);EXT_REF.x=EXT;Object.values(DEV).forEach(d=>{d.io=d.audio?d.audio(A.ctx):{in:{},out:{}};});}
  /* take over the default paths that a cable replaces */
  const used=new Set(CAB.filter(c=>c.x&&DEV[c.a.split(':')[0]]&&DEV[c.a.split(':')[0]].io).map(c=>c.x));   // only ends whose unit exists
  if(used.has('spk:ctrl')){try{A.spk.disconnect(A.ctx.destination);}catch(_){}}
  if(used.has('atem:L')){try{A.mainM.disconnect(A.out78);}catch(_){}}
  [1,2].forEach(n=>{if(used.has('midas:ins'+n+'S')){try{A.ch['in'+n].insS.disconnect(A.ch['in'+n].insR);}catch(_){}}});
  const node=(ep,dir)=>{if(ep.includes(':')&&DEV[ep.split(':')[0]]){const [id,s]=ep.split(':');return DEV[id].io&&DEV[id].io[dir][s];}return EXT[dir][ep];};
  const link=(o,i)=>{if(!o||!i)return;if(Array.isArray(i))o.connect(i[0],0,i[1]);else o.connect(i);};
  CAB.forEach(c=>{if(c.b){link(node(c.a,'out'),node(c.b,'in'));link(node(c.b,'out'),node(c.a,'in'));}
    else{const dOut=node(c.a,'out'),dIn=node(c.a,'in');if(dOut&&EXT.in[c.x])link(dOut,EXT.in[c.x]);else if(dIn&&EXT.out[c.x])link(EXT.out[c.x],dIn);}});
  AR.ready=true;Object.values(DEV).forEach(d=>d.change&&Object.keys(d.knobs).forEach(k=>d.change(k)));}
addEventListener('m32audio',wire);
/* ---------- drawing ---------- */
let side='front';
function svgOf(d,face){const h=UH*d.ru;return `<svg viewBox="0 0 ${W} ${h}" class="ar-svg" data-dev="${d.id}" data-face="${face}" style="width:${(d.wFrac||1)*100}%">${face==='front'?d.front():d.rear()}</svg>`;}
function render(){make();const rk=$('#ar-rack');rk.innerHTML=RACK.map(([id])=>DEV[id]).filter(Boolean).map(d=>`<div class="ar-unit" data-u="${d.id}" title="${d.name} — ${(d.sub||'').replace(/"/g,'')}">${svgOf(d,side)}</div>`).join('')+'<svg class="vh-cables" id="ar-cables"></svg>';
  root.classList.toggle('rear',side==='rear');$('#ar-side').textContent=side==='front'?'FRONT':'REAR (seen from behind)';fit();draw();ropes&&ropes.start();}
function fit(){const rk=$('#ar-rack'),body=$('#ar-body');if(!rk||!body)return;const totRU=RACK.reduce((s,[id])=>s+(DEV[id]?DEV[id].ru:0),0),n=RACK.length;
  const H=body.clientHeight-10-n*3,Wd=body.clientWidth-2*130;rk.style.width=Math.max(500,Math.min(Wd,H/totRU*W/UH))+'px';}
addEventListener('resize',()=>{if(root.classList.contains('on'))fit();});
function draw(){Object.values(DEV).forEach(d=>{Object.entries(d.knobs).forEach(([k,o])=>{root.querySelectorAll(`.ar-k[data-d="${d.id}"][data-k="${k}"]`).forEach(g=>{const v=d.st[k],f=o.steps?o.steps.indexOf(v)/(o.steps.length-1):(v-o.min)/(o.max-o.min),a=(o.a0??-135)+f*((o.a1??135)-(o.a0??-135));
    g.querySelector('.ar-ptr')?.setAttribute('transform',`rotate(${a.toFixed(1)} ${g.dataset.cx} ${g.dataset.cy})`);});});d.draw&&d.draw(side);});}
/* ---------- cables on the rear ---------- */
let ropes=null;
function cableList(){if(side!=='rear')return [];const S=ep=>`.ar-s[data-s="${ep}"]`;return CAB.map(c=>c.b?{a:S(c.a),b:S(c.b),info:`${c.a.replace(':',' ')} → ${c.b.replace(':',' ')}`}:{a:S(c.a),hang:30,tag:c.tag,info:(EXT_INFO[c.x]||c.tag)+' (assumed cabling)'}).filter(c=>root.querySelector(c.a));}
/* ---------- interaction ---------- */
function setK(d,k,v,reset){const o=d.knobs[k];if(!o)return;let nv;if(reset)nv=o.def;else if(o.steps){const i=Math.max(0,Math.min(o.steps.length-1,o.steps.indexOf(d.st[k])+v));nv=o.steps[i];}
  else nv=Math.max(o.min,Math.min(o.max,d.st[k]+v*(o.step||(o.max-o.min)/100)));if(nv===d.st[k])return;d.st[k]=nv;d.change&&d.change(k);draw();showTip(d,k);}
function showTip(d,k){const o=d.knobs[k],t=$('#ar-tip');if(!o||!t||!t.classList.contains('on'))return;const val=o.fmt?o.fmt(d.st[k]):(Math.round(d.st[k]*10)/10)+(o.unit||'');t.querySelector('b').textContent=(o.name||k)+': '+val;}
let flipping=false;
function flip(){if(flipping)return;flipping=true;const rk=$('#ar-rack');rk.style.transition='transform .2s ease-in';rk.style.transform='rotateY(90deg)';
  setTimeout(()=>{side=side==='front'?'rear':'front';rk.style.transition='none';rk.style.transform='rotateY(-90deg)';render();
    setTimeout(()=>{rk.style.transition='transform .2s ease-out';rk.style.transform='rotateY(0)';setTimeout(()=>{flipping=false;ropes&&ropes.refresh();},230);},20);},200);}
function build(){if(root.dataset.built)return;root.dataset.built='1';make();
  root.innerHTML=`<div class="pwr-hd ar-hd"><div><h2>Audio rack <small id="ar-side"></small></h2><div class="kind">JVC A-X77 · 2× Behringer MDX4600 · TC Electronic M350 · Behringer DSP2024P · img Stage Line LS-280 · Behringer DEQ2496 — cabling assumed</div></div>
    <div class="pwr-btns"><button id="ar-guidebtn">How to use</button></div></div>
    <button class="close" id="ar-close" aria-label="Close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
    <div class="ar-body" id="ar-body"><div class="ar-side l"><button class="ar-mid" id="ar-midas" title="Go to the Midas">◀ Midas</button><button class="ar-flip" data-flip>⟲<span>turn round</span></button></div>
      <div class="ar-stage"><div class="ar-rack" id="ar-rack"></div></div><div class="ar-side r"><button class="ar-flip" data-flip>⟲<span>turn round</span></button></div></div>
    <div class="ar-msg" id="ar-msg"></div>
    <div class="mx-src mx-guide" id="ar-guide"><div class="mx-srchd"><b>The audio rack</b> <button id="ar-guideclose" aria-label="Close">✕</button></div><ol class="mx-steps">
      <li>You see the <b>front</b> (the controls). <b>⟲</b> on either side turns the rack round: the <b>rear</b>, seen from behind, with the cables.</li>
      <li>What you hear = the Midas monitor → <b>DEQ2496</b> (EQ of the control room) → <b>JVC</b> amplifier (input AUX) → SPEAKERS 1 = control-room speakers. Volume, tone, MUTING and SPEAKERS of the JVC change what you hear.</li>
      <li><b>MDX4600 (1)</b> ch 1-2: compressor / gate on the insert of Midas channels 1-2 (presenter mics).</li>
      <li><b>M350</b> (Mix 1-2 → AUX IN 1-2) and <b>Virtualizer</b> (Mix 3-4 → AUX IN 3-4): the effects of the Midas.</li>
      <li><b>LS-280</b>: the Midas main L / R → outputs 1 + 5 = <b>PGM</b> (to the ATEM, so it is what the HyperDeck records) and 2 + 6 = <b>VU</b>.</li>
      <li>Knobs: drag up / down or scroll; <b>Shift+click</b> = default (simulator shortcut). Hover anything. The Midas has to be powered for sound.</li></ol></div>
    <div class="pwr-tip" id="ar-tip"><b></b><span></span></div>`;
  $('#ar-close').onclick=()=>window.closeOutboard();$('#ar-midas').onclick=()=>{window.closeOutboard();window.openMixer&&openMixer();};
  root.querySelectorAll('[data-flip]').forEach(b=>b.onclick=flip);
  const gd=$('#ar-guide');$('#ar-guidebtn').onclick=()=>gd.classList.toggle('on');$('#ar-guideclose').onclick=()=>gd.classList.remove('on');
  const D=e=>DEV[e.dataset.d];
  root.addEventListener('pointerdown',e=>{const k=e.target.closest('.ar-k');if(k){e.preventDefault();const d=D(k),id=k.dataset.k;if(e.shiftKey){setK(d,id,0,true);return;}
      let y0=e.clientY;const mv=ev=>{const dd=y0-ev.clientY,o=d.knobs[id],st=o.steps?8:3;if(Math.abs(dd)>=st){setK(d,id,Math.sign(dd));y0=ev.clientY;}};const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);};addEventListener('pointermove',mv);addEventListener('pointerup',up);return;}
    const b=e.target.closest('.ar-b');if(b){e.preventDefault();const d=D(b);d.press&&d.press(b.dataset.b,e);draw();
      if(d.release)addEventListener('pointerup',()=>{d.release(b.dataset.b);draw();},{once:true});}});
  root.addEventListener('wheel',e=>{const k=e.target.closest('.ar-k');if(!k)return;e.preventDefault();setK(D(k),k.dataset.k,e.deltaY<0?1:-1);},{passive:false});
  const tip=$('#ar-tip');root.addEventListener('mousemove',e=>{const t=e.target.closest('[data-tip]');if(!t||!t.dataset.tip){tip.classList.remove('on');return;}
    tip.classList.add('on');tip.querySelector('span').textContent=t.dataset.tip;const k=t.closest('.ar-k');tip.querySelector('b').textContent='';if(k)showTip(D(k),k.dataset.k);tip.style.left=e.clientX+'px';tip.style.top=e.clientY+'px';});
  ropes=window.ROPES?ROPES({wrap:()=>$('#ar-rack'),svg:()=>$('#ar-cables'),list:cableList,active:()=>root.classList.contains('on')&&side==='rear'&&!flipping,sig:()=>side}):null;}
let running=false,last=0;function loop(now){requestAnimationFrame(loop);if(!root.classList.contains('on')||now-last<70)return;last=now;draw();}
window.openOutboard=()=>{build();root.classList.add('on');render();if(!running){running=true;requestAnimationFrame(loop);}};
window.closeOutboard=()=>{root.classList.remove('on');$('#ar-tip')?.classList.remove('on');};
})();
