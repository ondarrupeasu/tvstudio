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
/* assumed cabling (rear). a / b = 'unit:socket' (output → input, either order); x = an end outside the rack */
const DEF_CAB=[
  {a:'deq:inL',x:'midas:monL'},{a:'deq:inR',x:'midas:monR'},{a:'deq:outL',b:'jvc:auxL'},{a:'deq:outR',b:'jvc:auxR'},{a:'jvc:sp1',x:'spk:ctrl'},{a:'jvc:sp2',x:'spk:stud'},
  {a:'ls:inA',x:'midas:mainL'},{a:'ls:inB',x:'midas:mainR'},{a:'ls:out1',x:'atem:L'},{a:'ls:out5',x:'atem:R'},{a:'ls:out2',x:'vu:L'},{a:'ls:out6',x:'vu:R'},
  {a:'mdx1:in1',x:'midas:ins1S'},{a:'mdx1:out1',x:'midas:ins1R'},{a:'mdx1:in2',x:'midas:ins2S'},{a:'mdx1:out2',x:'midas:ins2R'},
  {a:'m350:inL',x:'midas:aux1'},{a:'m350:inR',x:'midas:aux2'},{a:'m350:outL',x:'midas:aret1'},{a:'m350:outR',x:'midas:aret2'},
  {a:'virt:in1',x:'midas:aux3'},{a:'virt:in2',x:'midas:aux4'},{a:'virt:out1',x:'midas:aret3'},{a:'virt:out2',x:'midas:aret4'}];
const CKEY='ar-cab1';let CAB;try{CAB=JSON.parse(localStorage.getItem(CKEY))||null;}catch(_){}if(!Array.isArray(CAB))CAB=JSON.parse(JSON.stringify(DEF_CAB));
const saveCab=()=>{try{localStorage.setItem(CKEY,JSON.stringify(CAB));}catch(_){}};
/* ends outside the rack: o = a signal that comes in (feeds a rack input), i = a destination (fed by a rack output); tag, info */
const XO={'midas:monL':['Midas MON L','Midas monitor (control room) L'],'midas:monR':['Midas MON R','Midas monitor (control room) R'],'midas:mainL':['Midas OUT 7 (L)','Midas MAIN L (OUT 7)'],'midas:mainR':['Midas OUT 8 (R)','Midas MAIN R (OUT 8)'],
  'midas:ins1S':['Midas AUX OUT 5','insert send of Midas channel 1 (presenter mic)'],'midas:ins2S':['Midas AUX OUT 6','insert send of Midas channel 2'],
  'midas:aux1':['Midas AUX OUT 1','Mix 1 (effect send — the effect sound stays inside the Midas)'],'midas:aux2':['Midas AUX OUT 2','Mix 2 (effect send)'],'midas:aux3':['Midas AUX OUT 3','Mix 3 (effect send)'],'midas:aux4':['Midas AUX OUT 4','Mix 4 (effect send)']};
const XI={'spk:ctrl':['Speakers control','the control-room speakers — what you hear'],'spk:stud':['Speakers studio','the studio speakers'],'atem:L':['PGM L → ATEM','programme sound → ATEM analog audio in L (and the HyperDeck recording)'],'atem:R':['PGM R → ATEM','programme sound → ATEM analog audio in R'],
  'vu:L':['VU L','VU meters (where? to confirm)'],'vu:R':['VU R','VU meters (where? to confirm)'],'midas:ins1R':['Midas AUX IN 5','insert return of Midas channel 1'],'midas:ins2R':['Midas AUX IN 6','insert return of Midas channel 2'],
  'midas:aret1':['Midas AUX IN 1','effect return 1'],'midas:aret2':['Midas AUX IN 2','effect return 2'],'midas:aret3':['Midas AUX IN 3','effect return 3'],'midas:aret4':['Midas AUX IN 4','effect return 4']};
const xLab=x=>(XO[x]||XI[x]||[x])[0],xInfo=x=>(XO[x]||XI[x]||[x,x])[1];
/* socket direction from its id: in… / aux L-R = input, out… / sp1-2 = output; TRS twins (inj / outj) and the rest are drawn only */
const dirOf=s=>{const k=s.split(':')[1]||'';if(/^(inj|outj)/.test(k))return null;if(/^in/.test(k)||/^aux[LR]$/.test(k))return 'in';if(/^out/.test(k)||/^sp\d$/.test(k))return 'out';return null;};
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
function make(){RACK.forEach(([id,t])=>{if(DEV[id]||!TYPES[t])return;const d={id,st:{}};Object.assign(d,TYPES[t](d,AR));d._socks=new Set((d.rear().match(/data-s="[^"]+"/g)||[]).map(m=>m.slice(8,-1)).filter(s=>dirOf(s)));d.knobs=d.knobs||{};Object.entries(d.knobs).forEach(([k,o])=>{if(d.st[k]==null)d.st[k]=o.def;});DEV[id]=d;});}
/* ---------- audio: the cables carry the Midas signal through the units ---------- */
let EXT=null;
function extNodes(A){const c=A.ctx,sp=n=>{const s=c.createChannelSplitter(2);n.connect(s);const L=c.createGain(),R=c.createGain();s.connect(L,0);s.connect(R,1);return [L,R];};
  const [monL,monR]=sp(A.spk),[mainL,mainR]=sp(A.mainM),ctrl=c.createGain(),stud=c.createGain(),atem=c.createChannelMerger(2),vu=c.createChannelMerger(2);ctrl.connect(c.destination);atem.connect(A.out78);
  const studAn=c.createAnalyser(),vuAn=c.createAnalyser();stud.connect(studAn);vu.connect(vuAn);
  return {out:{'midas:monL':monL,'midas:monR':monR,'midas:mainL':mainL,'midas:mainR':mainR,'midas:ins1S':A.ch.in1.insS,'midas:ins2S':A.ch.in2.insS},
    in:{'spk:ctrl':ctrl,'spk:stud':stud,'atem:L':[atem,0],'atem:R':[atem,1],'vu:L':[vu,0],'vu:R':[vu,1],'midas:ins1R':A.ch.in1.insR,'midas:ins2R':A.ch.in2.insR},studAn,vuAn};}
let LINKS=[],DEFS=null;
function wire(){const A=window.M32&&M32.audio&&M32.audio();if(!A)return;AR.ctx=A.ctx;make();
  if(!EXT){EXT=extNodes(A);EXT_REF.x=EXT;Object.values(DEV).forEach(d=>{d.io=d.audio?d.audio(A.ctx):{in:{},out:{}};});
    DEFS={spk:[A.spk,A.ctx.destination],atem:[A.mainM,A.out78],ins1:[A.ch.in1.insS,A.ch.in1.insR],ins2:[A.ch.in2.insS,A.ch.in2.insR]};}
  LINKS.forEach(([o,i,ch])=>{try{ch==null?o.disconnect(i):o.disconnect(i,0,ch);}catch(_){}});LINKS=[];
  /* the default paths of the Midas stay, unless a cable takes them over */
  const used=new Set(CAB.filter(c=>c.x&&DEV[c.a.split(':')[0]]&&DEV[c.a.split(':')[0]].io).map(c=>c.x));
  const def=(k,on)=>{const [o,i]=DEFS[k];try{o.disconnect(i);}catch(_){}if(on)o.connect(i);};
  def('spk',!used.has('spk:ctrl'));def('atem',!used.has('atem:L')&&!used.has('atem:R'));def('ins1',!(used.has('midas:ins1S')||used.has('midas:ins1R')));def('ins2',!(used.has('midas:ins2S')||used.has('midas:ins2R')));
  const node=(ep,dir)=>{const [id,s]=ep.split(':');if(DEV[id])return DEV[id].io&&DEV[id].io[dir][s];return EXT[dir][ep];};
  const link=(o,i)=>{if(!o||!i)return;if(Array.isArray(i)){o.connect(i[0],0,i[1]);LINKS.push([o,i[0],i[1]]);}else{o.connect(i);LINKS.push([o,i,null]);}};
  CAB.forEach(c=>{if(c.b){link(node(c.a,'out'),node(c.b,'in'));link(node(c.b,'out'),node(c.a,'in'));}
    else{const dOut=node(c.a,'out'),dIn=node(c.a,'in');if(dOut&&EXT.in[c.x])link(dOut,EXT.in[c.x]);else if(dIn&&EXT.out[c.x])link(EXT.out[c.x],dIn);}});
  if(!AR.ready){AR.ready=true;Object.values(DEV).forEach(d=>d.change&&Object.keys(d.knobs).forEach(k=>d.change(k)));}}
addEventListener('m32audio',wire);
/* ---------- drawing ---------- */
let side='front';
function svgOf(d,face){const h=UH*d.ru;return `<svg viewBox="0 0 ${W} ${h}" class="ar-svg" data-dev="${d.id}" data-face="${face}" style="width:${(d.wFrac||1)*100}%">${face==='front'?d.front():d.rear()}</svg>`;}
function render(){make();const rk=$('#ar-rack');rk.innerHTML=RACK.map(([id])=>DEV[id]).filter(Boolean).map(d=>`<div class="ar-unit" data-u="${d.id}" title="${d.name} — ${(d.sub||'').replace(/"/g,'')}">${svgOf(d,side)}</div>`).join('')+'<svg class="vh-cables" id="ar-cables"></svg>';
  root.classList.toggle('rear',side==='rear');$('#ar-side').textContent=side==='front'?'FRONT':'REAR (seen from behind)';fit();draw();ropes&&ropes.start();}
function fit(){const rk=$('#ar-rack'),body=$('#ar-body');if(!rk||!body)return;const totRU=RACK.reduce((s,[id])=>s+(DEV[id]?DEV[id].ru:0),0),n=RACK.length;
  const H=body.clientHeight-10-n*3,Wd=body.clientWidth-2*96-2*74;rk.style.width=Math.max(500,Math.min(Wd,H/totRU*W/UH))+'px';}
addEventListener('resize',()=>{if(root.classList.contains('on'))fit();});
function draw(){Object.values(DEV).forEach(d=>{Object.entries(d.knobs).forEach(([k,o])=>{root.querySelectorAll(`.ar-k[data-d="${d.id}"][data-k="${k}"]`).forEach(g=>{const v=d.st[k],f=o.steps?o.steps.indexOf(v)/(o.steps.length-1):(v-o.min)/(o.max-o.min),a=(o.a0??-135)+f*((o.a1??135)-(o.a0??-135));
    g.querySelector('.ar-ptr')?.setAttribute('transform',`rotate(${a.toFixed(1)} ${g.dataset.cx} ${g.dataset.cy})`);});});d.draw&&d.draw(side);});}
/* ---------- cables on the rear ---------- */
let ropes=null;
const sLab=ep=>{const [id,k]=ep.split(':');return (DEV[id]?DEV[id].name.replace(/^(Behringer|TC Electronic|img Stage Line) /,''):id)+(id==='mdx1'?' (1)':id==='mdx2'?' (2)':'')+' '+k.replace(/^in/,'IN ').replace(/^out/,'OUT ').replace(/^aux/,'AUX ').replace(/^sp/,'SPEAKERS ').toUpperCase();};
function cableList(){if(side!=='rear')return [];const S=ep=>`.ar-s[data-s="${ep}"]`;return CAB.map(c=>c.b?{a:S(c.a),b:S(c.b),info:`${sLab(c.a)} ↔ ${sLab(c.b)}`}:{a:S(c.a),hang:30,tag:xLab(c.x),info:sLab(c.a)+' ↔ '+xInfo(c.x)}).filter(c=>root.querySelector(c.a));}
/* ---------- patch mode (admin): click a connector on the rear → what is cabled to it ---------- */
function patchMenu(ep,e){const pm=$('#ar-plugmenu'),dir=dirOf(ep);
  if(!dir){pm.innerHTML=`<div class="mx-srchd"><b>${sLab(ep)}</b></div><p class="mx-snote">Not an audio connector of this simulation (power, MIDI, digital, the jack twin of an XLR…).</p>`;}
  else{const cur=CAB.find(c=>c.a===ep||c.b===ep),curEnd=cur?(cur.x||(cur.a===ep?cur.b:cur.a)):null;
    const rack=Object.values(DEV).flatMap(d=>[...d._socks]).filter(s=>dirOf(s)===(dir==='in'?'out':'in')&&!s.startsWith(ep.split(':')[0]+':')),outside=Object.keys(dir==='in'?XO:XI);
    const opt=(v,l,note)=>`<button data-v="${v}" class="${v===curEnd?'on':''}">${l}${note?` <i>${note}</i>`:''}</button>`,busy=v=>{const c=CAB.find(c=>c.a===v||c.b===v||c.x===v);if(!c||c===cur)return '';const other=c.x===v?c.a:c.a===v?(c.b||c.x):c.a;return 'now: '+(DEV[other.split(':')[0]]?sLab(other):xLab(other));};
    pm.innerHTML=`<div class="mx-srchd"><b>${sLab(ep)}</b> — ${dir==='in'?'what feeds this input?':'where does this output go?'}</div>`+opt('','— not cabled —')+`<p class="mx-snote">Outside the rack</p>`+outside.map(x=>opt(x,xLab(x),busy(x))).join('')+`<p class="mx-snote">In the rack</p>`+rack.map(s=>opt(s,sLab(s),busy(s))).join('');
    pm.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{const v=b.dataset.v;CAB=CAB.filter(c=>c.a!==ep&&c.b!==ep&&(!v||(c.a!==v&&c.b!==v&&c.x!==v)));
      if(v)CAB.push(v.includes(':')&&DEV[v.split(':')[0]]?{a:ep,b:v}:{a:ep,x:v});saveCab();wire();ropes&&ropes.refresh();pm.classList.remove('on');AR.flash(v?sLab(ep)+' ↔ '+(DEV[v.split(':')[0]]?sLab(v):xLab(v)):sLab(ep)+' unplugged');});}
  pm.style.left=Math.min(e.clientX,innerWidth-310)+'px';pm.classList.add('on');pm.style.top=Math.max(10,Math.min(e.clientY-40,innerHeight-pm.offsetHeight-10))+'px';}
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
    <div class="pwr-btns"><button id="ar-patch">Patch mode</button><button id="ar-def" hidden>Default cabling</button><button id="ar-guidebtn">How to use</button></div></div>
    <button class="close" id="ar-close" aria-label="Close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
    <div class="ar-body" id="ar-body"><div class="ar-side l"><button class="ar-jump l" id="ar-midas" title="Go to the Midas">◀ Midas</button></div>
      <div class="ar-stage"><button class="ar-flip" data-flip title="Turn the rack round">⟲<span>turn round</span></button><div class="ar-rack" id="ar-rack"></div><button class="ar-flip" data-flip title="Turn the rack round">⟲<span>turn round</span></button></div><div class="ar-side r"></div></div>
    <div class="ar-msg" id="ar-msg"></div>
    <div class="mx-src mx-guide" id="ar-guide"><div class="mx-srchd"><b>The audio rack</b> <button id="ar-guideclose" aria-label="Close">✕</button></div><ol class="mx-steps">
      <li>You see the <b>front</b> (the controls). <b>⟲</b> on either side turns the rack round: the <b>rear</b>, seen from behind, with the cables.</li>
      <li>What you hear = the Midas monitor → <b>DEQ2496</b> (EQ of the control room) → <b>JVC</b> amplifier (input AUX) → SPEAKERS 1 = control-room speakers. Volume, tone, MUTING and SPEAKERS of the JVC change what you hear.</li>
      <li><b>MDX4600 (1)</b> ch 1-2: compressor / gate on the insert of Midas channels 1-2 (presenter mics).</li>
      <li><b>M350</b> (Mix 1-2 → AUX IN 1-2) and <b>Virtualizer</b> (Mix 3-4 → AUX IN 3-4): the effects of the Midas.</li>
      <li><b>LS-280</b>: the Midas main L / R → outputs 1 + 5 = <b>PGM</b> (to the ATEM, so it is what the HyperDeck records) and 2 + 6 = <b>VU</b>.</li>
      <li>Knobs: drag up / down or scroll; <b>Shift+click</b> = default (simulator shortcut). Hover anything. The Midas has to be powered for sound.</li></ol></div>
    <div class="mx-plugmenu" id="ar-plugmenu"></div><div class="pwr-tip" id="ar-tip"><b></b><span></span></div>`;
  $('#ar-close').onclick=()=>window.closeOutboard();$('#ar-midas').onclick=()=>{window.closeOutboard();window.openMixer&&openMixer();};
  root.querySelectorAll('[data-flip]').forEach(b=>b.onclick=flip);
  const pm=$('#ar-plugmenu');$('#ar-patch').onclick=e=>{const on=!root.classList.contains('patch');if(on&&!confirm('Patch mode (admin): you can re-cable the audio rack. The sound follows the new cables. Changes are saved in this browser. Continue?'))return;
    root.classList.toggle('patch',on);e.currentTarget.classList.toggle('on',on);e.currentTarget.textContent=on?'Exit patch mode':'Patch mode';$('#ar-def').hidden=!on;pm.classList.remove('on');if(on){if(side==='front')flip();AR.flash('Patch mode: click a connector on the rear');}};
  $('#ar-def').onclick=()=>{if(!confirm('Put back the default (assumed) cabling of the audio rack?'))return;CAB=JSON.parse(JSON.stringify(DEF_CAB));saveCab();wire();ropes&&ropes.refresh();AR.flash('Default cabling restored');};
  root.addEventListener('click',e=>{if(!root.classList.contains('patch')||pm.contains(e.target))return;const g=e.target.closest('.ar-s');if(!g||side!=='rear'){pm.classList.remove('on');return;}patchMenu(g.dataset.s,e);});
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
