/* Audio rack — outboard effects fed by the Midas: TC Electronic M350 (AUX 1-2) and Behringer Virtualizer Pro DSP2024P
 * (AUX 3-4). Front panels laid out after the room photo; the knobs drive the real Web Audio effect in the Midas
 * (window.OUTBOARD). Not affiliated with TC Electronic / Behringer. */
(function(){
const root=document.getElementById('ob');if(!root)return;
const W=1080,H=100,X=f=>f*W,Y=f=>f*H;
const M350=[['input','INPUT GAIN',.226,0,1],['mix','MIX RATIO',.302,0,1],['predelay','PRE DELAY',.79,0,.2],['decay','DECAY TIME',.858,.3,8]];
const M350SEL={dtype:['DELAY|EFFECTS',.42,['Dynamic Delay','Tape Delay','Ping Pong','Chorus','Flanger','Off']],type:['REVERB',.645,['Live Stage','Spring','Plate','Hall','Cathedral','Ambience']]};
const VIRT=[['decay','DECAY',.42,.3,8],['predelay','PRE-DELAY',.47,0,.2],['delay','DELAY',.52,.05,1.2],['feedback','FEEDBACK',.57,0,.8],['mix','MIX',.655,0,1]];
const VPRE=['Plate','Hall','Room','Cathedral','Echo','Ping Pong'];
const knob=(dev,id,fx,fy,lab,r=13)=>`<g class="ob-k" data-dev="${dev}" data-id="${id}" data-tip="${lab.replace('|',' ')}: drag up/down or scroll (Shift+click = default)."><circle cx="${X(fx)}" cy="${Y(fy)}" r="${r}" class="vh-kn"/><circle cx="${X(fx)}" cy="${Y(fy)}" r="${r*.8}" class="vh-kn2"/><line class="ob-p" x1="${X(fx)}" y1="${Y(fy)-r*.75}" x2="${X(fx)}" y2="${Y(fy)-r*.3}"/></g><text x="${X(fx)}" y="${Y(fy)+r+9}" class="ob-l">${lab.split('|').join(' / ')}</text>`;
function m350(){let s=`<svg viewBox="0 0 ${W} ${H}" class="vh-svg" id="ob-m350"><rect x="1" y="1" width="${W-2}" height="${H-2}" rx="6" class="ob-silver"/>
  <text x="${X(.06)}" y="${Y(.72)}" class="ob-brand">t.c. electronic</text><text x="${X(.19)}" y="${Y(.2)}" class="ob-sec">INPUT | OUTPUT</text><text x="${X(.48)}" y="${Y(.2)}" class="ob-sec">DELAY | EFFECTS</text><text x="${X(.72)}" y="${Y(.2)}" class="ob-sec">REVERB</text>
  <text x="${X(.065)}" y="${Y(.3)}" class="ob-tape">AUX 1 Y 2</text><text x="${X(.17)}" y="${Y(.48)}" class="ob-sm">M350</text>
  <g data-tip="Input level LEDs (signal from the Midas AUX OUT 1-2)">${[0,1,2,3,4].map(i=>`<circle cx="${X(.2)+i*9}" cy="${Y(.32)}" r="2.6" class="ob-led" data-led="m350:${i}"/>`).join('')}</g>`;
  M350.forEach(([id,l,x,a,b])=>s+=knob('m350',id,x,.5,l));Object.entries(M350SEL).forEach(([id,[l,x]])=>s+=knob('m350',id,x,.5,l,17));
  s+=knob('m350','feedback',.58,.5,'FEEDBACK|depth')+`<g class="ob-k" data-dev="m350" data-id="tap" data-tip="TAP: tap the delay time (here: click twice)."><rect x="${X(.535)-9}" y="${Y(.18)}" width="18" height="12" rx="2" class="ob-btn"/><text x="${X(.535)}" y="${Y(.15)}" class="ob-l">TAP</text></g>`;
  s+=`<rect x="${X(.905)}" y="${Y(.25)}" width="${X(.07)}" height="${Y(.45)}" rx="3" class="ob-disp"/><text x="${X(.94)}" y="${Y(.52)}" class="ob-dt" id="ob-m350d"></text><text x="${X(.94)}" y="${Y(.85)}" class="ob-l">CONTROL PANEL</text>`;
  return s+'</svg>';}
function virt(){let s=`<svg viewBox="0 0 ${W} ${H}" class="vh-svg" id="ob-virt"><rect x="1" y="1" width="${W-2}" height="${H-2}" rx="6" class="ob-silver"/><rect x="${X(.04)}" y="${Y(.08)}" width="${X(.2)}" height="${Y(.84)}" rx="4" class="ob-dark"/>
  <text x="${X(.06)}" y="${Y(.3)}" class="ob-tape">AUX 3 Y 4</text><text x="${X(.06)}" y="${Y(.55)}" class="ob-brand2">VIRTUALIZER</text><text x="${X(.06)}" y="${Y(.7)}" class="ob-brand2">PRO</text><text x="${X(.06)}" y="${Y(.84)}" class="ob-sm2">MODEL DSP2024P</text>
  <rect x="${X(.25)}" y="${Y(.15)}" width="${X(.13)}" height="${Y(.7)}" rx="3" class="ob-disp"/><text x="${X(.315)}" y="${Y(.62)}" class="ob-red" id="ob-virtd"></text>
  <g data-tip="Input level LEDs (signal from the Midas AUX OUT 3-4)">${[0,1,2,3,4,5].map(i=>`<rect x="${X(.235)}" y="${Y(.78)-i*10}" width="6" height="6" class="ob-led" data-led="virt:${i}"/>`).join('')}</g>`;
  VIRT.forEach(([id,l,x])=>s+=knob('virt',id,x,.48,l,14));
  [['PRESET',.73,.32,'prev'],['STORE',.78,.32,''],['EFFECT',.73,.58,'next'],['COMPARE',.78,.58,''],['EDIT',.73,.84,''],['SETUP',.78,.84,'']].forEach(([l,x,y,id])=>s+=`<g class="ob-k" data-dev="virt" data-id="${id||'na'}" data-tip="${id==='prev'?'PRESET: previous algorithm':id==='next'?'EFFECT: next algorithm':l+': not simulated'}"><rect x="${X(x)-18}" y="${Y(y)-8}" width="36" height="14" rx="2" class="ob-btn2"/><text x="${X(x)}" y="${Y(y)+3}" class="ob-bl">${l}</text></g>`);
  s+=knob('virt','preset',.86,.5,'DATA WHEEL',20)+`<text x="${X(.95)}" y="${Y(.85)}" class="ob-l">POWER</text>`;return s+'</svg>';}
const P=()=>window.OUTBOARD;
function draw(){const O=P();if(!O)return;const m=O.get('m350'),v=O.get('virt');
  M350.concat([['feedback','',0,0,.8]]).forEach(([id,,,a,b])=>rot('m350',id,(m[id]-a)/(b-a)));rot('m350','dtype',m.dtypeI/5||0);rot('m350','type',M350SEL.type[2].indexOf(m.type)/5);
  VIRT.forEach(([id,,,a,b])=>rot('virt',id,(v[id]-a)/(b-a)));rot('virt','preset',VPRE.indexOf(v.type)/5);
  const d1=document.getElementById('ob-m350d');if(d1)d1.textContent=m.type.slice(0,8);const d2=document.getElementById('ob-virtd');if(d2)d2.textContent=String(VPRE.indexOf(v.type)+1).padStart(2,'0')+' '+v.type.slice(0,6);
  [['m350','aux1',5],['virt','aux3',6]].forEach(([k,id,n])=>{const db=O.level(id),f=db<=-60?0:(db+60)/60;for(let i=0;i<n;i++)root.querySelector(`[data-led="${k}:${i}"]`)?.classList.toggle('on',f>i/n);});}
function rot(dev,id,f){const g=root.querySelector(`.ob-k[data-dev="${dev}"][data-id="${id}"]`);if(!g)return;const c=g.querySelector('circle'),p=g.querySelector('.ob-p');if(p)p.setAttribute('transform',`rotate(${(Math.max(0,Math.min(1,f))*270-135).toFixed(1)} ${c.getAttribute('cx')} ${c.getAttribute('cy')})`);}
const DEF={m350:{input:.8,mix:.5,decay:2.4,predelay:.02,feedback:.25,type:'Hall'},virt:{decay:1.4,predelay:.01,delay:.25,feedback:.2,mix:.5,type:'Plate'}};
function turn(dev,id,d,reset){const O=P(),c=O.get(dev);
  if(id==='type'||id==='dtype'){const L=M350SEL[id][2];if(id==='type'){const i=(L.indexOf(c.type)+d+L.length)%L.length;O.set(dev,{type:L[i],decay:[1.2,1.6,1.8,2.4,4.5,.8][i]});}else{c.dtypeI=((c.dtypeI||0)+d+6)%6;O.set(dev,{delay:[.32,.4,.28,.02,.005,0][c.dtypeI],feedback:c.dtypeI>=3?.05:.25});}return;}
  if(id==='preset'||id==='prev'||id==='next'){const dd=id==='prev'?-1:id==='next'?1:d,i=(VPRE.indexOf(c.type)+dd+VPRE.length)%VPRE.length;O.set(dev,{type:VPRE[i],decay:[1.4,2.6,.9,5,1.2,1][i],delay:[.25,.25,.15,.25,.38,.3][i]});return;}
  const spec=(dev==='m350'?M350.concat([['feedback','',0,0,.8]]):VIRT).find(x=>x[0]===id);if(!spec)return;const [,, ,a,b]=spec;O.set(dev,{[id]:reset?DEF[dev][id]:Math.max(a,Math.min(b,c[id]+d*(b-a)/60))});}
function build(){if(root.dataset.built)return;root.dataset.built='1';
  root.innerHTML=`<div class="pwr-hd"><div><h2>Audio rack — outboard effects</h2><div class="kind">TC Electronic M350 (AUX 1-2) · Behringer Virtualizer Pro DSP2024P (AUX 3-4)</div>
    <p>In the <b>Midas</b>: send a channel to <b>Mix 1 / 2</b> (M350) or <b>Mix 3 / 4</b> (Virtualizer) with FADER FLIP, then raise the returns on layer <b>AUX IN</b> (M350 L/R, Virt L/R). These knobs change the effect.</p></div>
    <div class="pwr-btns"><button id="ob-mixer">Open the Midas</button></div></div>
    <button class="close" id="ob-close" aria-label="Close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
    <div class="vh-body"><div class="vh-units"><div class="vh-lab">TC ELECTRONIC M350 <span>— dual-engine reverb + delay · "AUX 1 y 2"</span></div><div class="vh-front">${m350()}</div>
      <div class="vh-lab">BEHRINGER VIRTUALIZER PRO DSP2024P <span>— multi-effects · "AUX 3 y 4"</span></div><div class="vh-front">${virt()}</div>
      <p class="um-note">The Midas has to be switched on (POWER on its rear) for the effects to sound. Front panels are simplified to the controls an operator uses.</p></div></div><div class="pwr-tip" id="ob-tip"></div>`;
  document.getElementById('ob-close').onclick=()=>window.closeOutboard();document.getElementById('ob-mixer').onclick=()=>{window.closeOutboard();openMixer();};
  root.addEventListener('pointerdown',e=>{const k=e.target.closest('.ob-k');if(!k)return;e.preventDefault();const dev=k.dataset.dev,id=k.dataset.id;if(id==='na'||id==='tap')return;
    if(id==='prev'||id==='next'){turn(dev,id,0);draw();return;}if(e.shiftKey){turn(dev,id,0,true);draw();return;}
    let y0=e.clientY;const mv=ev=>{const d=y0-ev.clientY;if(Math.abs(d)>=3){turn(dev,id,Math.sign(d));y0=ev.clientY;draw();}};const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);};addEventListener('pointermove',mv);addEventListener('pointerup',up);});
  root.addEventListener('wheel',e=>{const k=e.target.closest('.ob-k');if(!k)return;e.preventDefault();turn(k.dataset.dev,k.dataset.id,e.deltaY<0?1:-1);draw();},{passive:false});
  const tip=document.getElementById('ob-tip');root.addEventListener('mousemove',e=>{const t=e.target.closest('[data-tip]');if(!t){tip.classList.remove('on');return;}tip.innerHTML=`<span>${t.dataset.tip}</span>`;tip.style.left=e.clientX+'px';tip.style.top=e.clientY+'px';tip.classList.add('on');});}
let running=false,last=0;function loop(now){requestAnimationFrame(loop);if(!root.classList.contains('on')||now-last<80)return;last=now;draw();}
window.openOutboard=()=>{build();root.classList.add('on');draw();if(!running){running=true;requestAnimationFrame(loop);}};
window.closeOutboard=()=>{root.classList.remove('on');document.getElementById('ob-tip')?.classList.remove('on');};
})();
