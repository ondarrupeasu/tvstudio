/* Blackmagic ATEM Camera Control Panel (4 CCU strips) — docs/atem-ccu-spec.md.
 * Each strip paints its camera: iris (joystick) + ND + MASTER GAIN + SHUTTER = exposure; W/B (K) against a 5600 K studio;
 * WHITE R/G/B = gain, BLACK R/G/B = lift, BLACK/FLARE + black wheels = gamma, side knob = Y gain, ring = master black.
 * The result is applied to that camera's picture everywhere (router, ATEM, multiview) through an SVG colour filter.
 * Not affiliated with Blackmagic Design. */
(function(){
const SCENE_K=5600,AVMIN=2,AVMAX=8;   // f2 … f16
const camDef=()=>({j:.667,nd:0,gain:0,shutter:50,wb:5600,tint:0,white:[1,1,1],black:[0,0,0],gamma:[0,0,0],ygain:1,mb:0,bars:false,sens:1,coarse:1});
const CAMS={};for(let n=1;n<=8;n++)CAMS[n]=camDef();
const STRIPS=[1,2,3,4].map(n=>({cam:n,rel:true,flare:false,wbMode:false,lock:false,irisLock:false,call:false,store:false,scenes:{},sceneLit:0,msg:''}));
/* ---------- picture model ---------- */
function av(c){const w=1+c.sens*5,open=AVMIN+(1-c.coarse)*(AVMAX-AVMIN-w);return open+(1-c.j)*w;}   // SENS = range width, COARSE = how far it can open
const fstop=c=>c.j<=0.01?0:Math.pow(2,av(c)/2);
function exposure(c){const N=fstop(c);if(!N)return 0;return Math.pow(4/N,2)*Math.pow(2,-c.nd)*Math.pow(10,c.gain/20)*(50/c.shutter);}
function filterAttrs(n){const c=CAMS[n],e=exposure(c),k=Math.log2(c.wb/SCENE_K),wb=[Math.pow(2,.35*k),Math.pow(2,c.tint*.01),Math.pow(2,-.35*k)];
  return [0,1,2].map(i=>({amp:e*wb[i]*c.white[i]*c.ygain,exp:Math.pow(2,-c.gamma[i]*.5),off:(c.black[i]+c.mb)*.12}));}
let defs=null;
function ensureDefs(){if(defs)return;defs=document.createElementNS('http://www.w3.org/2000/svg','svg');defs.setAttribute('width','0');defs.setAttribute('height','0');defs.style.cssText='position:absolute;left:-9px;top:-9px';
  defs.innerHTML='<defs>'+[1,2,3,4,5,6,7,8].map(n=>`<filter id="ccu-f${n}" color-interpolation-filters="sRGB"><feComponentTransfer>${['R','G','B'].map(ch=>`<feFunc${ch} type="gamma" amplitude="1" exponent="1" offset="0"/>`).join('')}<feFuncA type="identity"/></feComponentTransfer></filter>`).join('')+'</defs>';document.body.appendChild(defs);}
function updFilter(n){ensureDefs();const f=defs.querySelector('#ccu-f'+n);if(!f)return;filterAttrs(n).forEach((a,i)=>{const e=f.querySelectorAll('feFuncR,feFuncG,feFuncB')[i];e.setAttribute('amplitude',a.amp.toFixed(4));e.setAttribute('exponent',a.exp.toFixed(4));e.setAttribute('offset',a.off.toFixed(4));});}
window.CCU={filter:n=>{if(!CAMS[n])return null;ensureDefs();return `url(#ccu-f${n})`;},bars:n=>!!(CAMS[n]&&CAMS[n].bars),cams:CAMS};
for(let n=1;n<=8;n++)setTimeout(()=>updFilter(n),0);
/* camera n → ATEM input (through the router) → tally */
function atemInputOf(n){if(!window.VH)return 0;const st=VH.state(),i=st.cabIn.indexOf('cam'+n);if(i<0)return 0;let k=0;st.cabOut.forEach((v,o)=>{const m=/^atem(\d+)$/.exec(v);if(m&&st.routes[o]===i&&!k)k=+m[1];});return k;}
function tally(n){const k=atemInputOf(n),A=window.ATEMR&&ATEMR.api;if(!k||!A)return '';const S=A.S;return S.pgm===k||(S.T&&S.pvw===k)?'pgm':S.pvw===k?'pvw':'';}
/* ---------- drawing (viewBox 1000 × 965, coordinates from the manual drawing) ---------- */
const VW=1000,VH_=965,SX=[0.043,0.277,0.512,0.747],SW=0.210,SY=0.334,SHh=0.485;
const sx=(s,f)=>(SX[s]+f*SW)*VW,sy=f=>(SY+f*SHh)*VH_;
const btn=(s,id,fx,fy,l,w=22,h=13,tip='')=>`<g class="cc-b" data-s="${s}" data-k="${id}" data-tip="${tip}"><rect x="${sx(s,fx)-w/2}" y="${sy(fy)-h/2}" width="${w}" height="${h}" rx="2.5"/><text x="${sx(s,fx)}" y="${sy(fy)+2.3}" class="cc-bt">${l}</text></g>`;
const lab=(s,fx,fy,t,cls='cc-l')=>`<text x="${sx(s,fx)}" y="${sy(fy)}" class="${cls}">${t}</text>`;
const seg=(s,id,fx,fy,w)=>`<rect x="${sx(s,fx)-w/2}" y="${sy(fy)-9}" width="${w}" height="16" rx="2" class="cc-segbg"/><text x="${sx(s,fx)}" y="${sy(fy)+4.5}" class="cc-seg" data-d="${s}:${id}"></text>`;
const wheel=(s,id,fx,fy,col,tip)=>`<g class="cc-w" data-s="${s}" data-k="${id}" data-tip="${tip}"><circle cx="${sx(s,fx)}" cy="${sy(fy)}" r="15" class="cc-wr" style="stroke:${col}"/><circle cx="${sx(s,fx)}" cy="${sy(fy)}" r="11" class="cc-wk"/><line class="cc-wp" x1="${sx(s,fx)}" y1="${sy(fy)-10}" x2="${sx(s,fx)}" y2="${sy(fy)-4}"/></g>`;
function strip(s){let h=`<rect x="${sx(s,0)}" y="${sy(0)}" width="${SW*VW}" height="${SHh*VH_}" rx="10" class="cc-strip"/>`;
  h+=lab(s,.09,.02,'SCENE FILE','cc-l cc-l0')+`<circle cx="${sx(s,.03)}" cy="${sy(.016)}" r="2.2" class="cc-led" data-led="${s}:scene"/>`;
  [1,2,3,4,5].forEach((n,i)=>h+=btn(s,'sc'+n,[.09,.26,.42,.59,.76][i],.05,n,18,13,'Scene file '+n+': press = recall the stored settings; STORE then '+n+' = store.'));h+=btn(s,'store',.93,.05,'STORE',24,13,'STORE: then press 1-5 to save every setting of this camera.');
  h+=btn(s,'nd+',.09,.12,'△',18,11,'ND filter up (Studio Camera 6K Pro: clear, 2, 4, 6 stops).')+btn(s,'nd-',.09,.155,'▽',18,11,'ND filter down.')+seg(s,'nd',.31,.14,20)+lab(s,.31,.175,'ND');
  h+=seg(s,'cc',.44,.14,20)+lab(s,.44,.175,'CC')+btn(s,'cc+',.53,.115,'△',16,10,'CC: disabled in the real firmware.')+btn(s,'cc-',.53,.155,'▽',16,10,'CC: disabled in the real firmware.');
  h+=seg(s,'mg',.70,.14,40)+lab(s,.70,.175,'MASTER GAIN')+btn(s,'mg+',.93,.12,'△',18,11,'MASTER GAIN up (+dB = brighter but noisier).')+btn(s,'mg-',.93,.155,'▽',18,11,'MASTER GAIN down.');
  [['rel','REL',.09],['abs','ABS',.24],['bars','BARS',.39]].forEach(([k,t,x])=>h+=`<circle cx="${sx(s,x)-11}" cy="${sy(.2)}" r="2.2" class="cc-led" data-led="${s}:${k}"/>`+lab(s,x+.02,.203,t,'cc-l cc-ls'));
  h+=btn(s,'on',.10,.235,'ON',22,13,'ON: REL / ABS — relative controls continue from the current value, absolute ones jump to the control position.')+btn(s,'wb',.25,.235,'W/B',22,13,'W/B: on the real panel hold it + SHUTTER △▽ = colour temperature (K). Here: click W/B, then △▽. Hold 2 s = auto white balance.')+btn(s,'bars',.39,.235,'BARS',24,13,'BARS: hold 3 s = colour bars from the camera; press again to remove.');
  h+=seg(s,'sh',.68,.235,56)+lab(s,.68,.272,'SHUTTER')+btn(s,'sh+',.93,.215,'△',18,11,'SHUTTER faster (1/x). With W/B active: colour temperature up.')+btn(s,'sh-',.93,.25,'▽',18,11,'SHUTTER slower. With W/B active: colour temperature down.');
  h+=`<line x1="${sx(s,.05)}" y1="${sy(.30)}" x2="${sx(s,.95)}" y2="${sy(.30)}" class="cc-sep"/>`;
  ['R','G','B'].forEach((c,i)=>{const col=['#e5372a','#36d36e','#3c86ff'][i];h+=wheel(s,'w'+c,[.09,.32,.54][i],.36,col,`WHITE ${c}: gain of the ${c} channel (highlights). Drag up/down or scroll. Shift+click = reset.`)+wheel(s,'b'+c,[.09,.32,.54][i],.45,col,`BLACK ${c}: lift of the ${c} channel (shadows). Hold BLACK/FLARE = gamma (mid-tones). Shift+click = reset.`);});
  h+=lab(s,.32,.405,'WHITE','cc-l cc-ls')+btn(s,'flare',.23,.49,'BLACK/FLARE',44,11,'BLACK/FLARE: while active, the BLACK wheels adjust gamma (mid-tones) instead of lift. (Real panel: hold it.)');
  h+=`<g class="cc-w" data-s="${s}" data-k="yg" data-tip="Side knob: Y gain — overall luminance."><circle cx="${sx(s,.92)}" cy="${sy(.36)}" r="11" class="cc-wk"/><line class="cc-wp" x1="${sx(s,.92)}" y1="${sy(.36)-9}" x2="${sx(s,.92)}" y2="${sy(.36)-4}"/></g>`;
  h+=`<circle cx="${sx(s,.86)}" cy="${sy(.45)}" r="2.2" class="cc-led"/>`+lab(s,.93,.453,'D EXT','cc-l cc-ls')+`<circle cx="${sx(s,.86)}" cy="${sy(.48)}" r="2.2" class="cc-led"/>`+lab(s,.93,.483,'EXT','cc-l cc-ls');
  h+=`<line x1="${sx(s,.05)}" y1="${sy(.54)}" x2="${sx(s,.95)}" y2="${sy(.54)}" class="cc-sep"/>`;
  h+=`<rect x="${sx(s,.07)}" y="${sy(.585)}" width="${.27*SW*VW}" height="${.095*SHh*VH_}" rx="3" class="cc-segbg"/><text x="${sx(s,.205)}" y="${sy(.665)}" class="cc-cam" data-cam="${s}">${STRIPS[s].cam}</text>`+lab(s,.205,.705,'CAMERA');
  h+=seg(s,'iris',.20,.75,54)+lab(s,.20,.785,'IRIS')+seg(s,'mb',.20,.835,54)+lab(s,.20,.87,'MASTER BLACK');
  ['4.0','5.6','8.0','11','16','CLS'].forEach((t,i)=>{const y=.72+i*.036;h+=`<rect x="${sx(s,.42)}" y="${sy(y)-3}" width="7" height="6" rx="1" class="cc-led" data-led="${s}:iris${i}"/>`+`<text x="${sx(s,.42)-4}" y="${sy(y)+2.5}" class="cc-l cc-ls" text-anchor="end">${t}</text>`;});
  h+=`<rect x="${sx(s,.49)}" y="${sy(.62)}" width="${.26*SW*VW}" height="${.31*SHh*VH_}" rx="12" class="cc-guide"/>`;
  h+=`<g class="cc-joy" data-s="${s}" data-tip="Joystick: push up = open the iris (brighter), down = close. Scroll on it = the ring = MASTER BLACK. Click it without moving = send this camera to the preview aux. Shift+click = back to F4 / master black 0."><circle cx="${sx(s,.62)}" cy="${sy(.75)}" r="27" class="cc-ring"/><circle class="cc-knob" cx="${sx(s,.62)}" cy="${sy(.75)}" r="17"/><line class="cc-ringm" x1="${sx(s,.62)}" y1="${sy(.75)-27}" x2="${sx(s,.62)}" y2="${sy(.75)-21}"/></g>`;
  h+=`<g class="cc-w" data-s="${s}" data-k="sens" data-tip="SENS: how much of the iris range the joystick covers (less = finer control)."><circle cx="${sx(s,.93)}" cy="${sy(.61)}" r="9" class="cc-wk"/><line class="cc-wp" x1="${sx(s,.93)}" y1="${sy(.61)-8}" x2="${sx(s,.93)}" y2="${sy(.61)-3}"/></g>`+lab(s,.93,.645,'SENS','cc-l cc-ls');
  h+=`<g class="cc-w" data-s="${s}" data-k="coarse" data-tip="COARSE: limits how far the iris can open (CLOSE ↔ OPEN)."><circle cx="${sx(s,.91)}" cy="${sy(.70)}" r="9" class="cc-wk"/><line class="cc-wp" x1="${sx(s,.91)}" y1="${sy(.70)-8}" x2="${sx(s,.91)}" y2="${sy(.70)-3}"/></g>`+lab(s,.91,.74,'COARSE','cc-l cc-ls');
  h+=btn(s,'irislock',.93,.81,'IRIS/MB|ACTIVE'.replace('|',' '),34,12,'IRIS/MB ACTIVE: locks the iris and master black.')+btn(s,'autoiris',.93,.88,'AUTO IRIS',34,12,'AUTO IRIS: the camera sets the iris for a correct average exposure.')+btn(s,'call',.93,.955,'CALL',30,12,'CALL: hold = flashes the tally light of that camera (to get the operator’s attention).');
  h+=btn(s,'lock',.09,.955,'PANEL ACTIVE',40,12,'PANEL ACTIVE: locks the whole strip.')+btn(s,'pvw',.43,.955,'PREVIEW',30,12,'PREVIEW: sends this camera to the preview aux output (ATEM SDI OUT 2) to check it on a monitor.');
  ['NETWORK','ALARM','CABLE'].forEach((t,i)=>h+=`<circle cx="${sx(s,.22)}" cy="${sy(.93+i*.03)}" r="2" class="cc-led ${i===0?'g':''}"/>`+`<text x="${sx(s,.25)}" y="${sy(.933+i*.03)}" class="cc-l cc-ls" text-anchor="start">${t}</text>`);
  return h;}
/* cropped to the controls (no empty top / palm rest / logo) so the strips can be drawn bigger */
const VB=[.035*VW,.072*VH_,.93*VW,.758*VH_],pc=(v,o,l)=>((v-o)/l*100).toFixed(2)+'%';
function panel(){let h=`<svg viewBox="${VB.join(' ')}" class="cr-svg" id="cc-svg"><rect x="${VB[0]}" y="${VB[1]}" width="${VB[2]}" height="${VB[3]}" rx="16" class="cr-chassis"/><rect x="${VB[0]}" y="${VB[1]}" width="${VB[2]}" height="${.288*VH_-VB[1]}" rx="16" class="cr-top"/>`;
  [0,1,2,3].forEach(s=>{const x0=[.057,.291,.526,.761][s]*VW;h+=`<rect x="${x0}" y="${.105*VH_}" width="${.182*VW}" height="${.112*VH_}" rx="4" class="cr-lcdb"/>`;
    [0,1,2,3].forEach(i=>{h+=`<rect x="${(.083+i*.043+s*.2347)*VW-10}" y="${.081*VH_}" width="20" height="${.013*VH_}" rx="5" class="cr-soft" data-s="${s}" data-k="soft${i}"/>`;
      h+=`<g class="cc-w" data-s="${s}" data-k="lk${i}" data-tip="${i===0?'Knob under CAMERA: chooses which camera this strip controls.':'Soft knob (camera settings in the LCD menus — not simulated).'}"><circle cx="${(.070+i*.052+s*.2347)*VW}" cy="${.247*VH_}" r="11" class="cc-wk"/><line class="cc-wp" x1="${(.070+i*.052+s*.2347)*VW}" y1="${.247*VH_-10}" x2="${(.070+i*.052+s*.2347)*VW}" y2="${.247*VH_-5}"/></g>`;});
    h+=strip(s);});
  [.265,.5,.735].forEach(x=>h+=`<rect x="${x*VW-1.5}" y="${.09*VH_}" width="3" height="${.13*VH_}" rx="1.5" class="cr-pipe"/>`);
  return h+'</svg>'+[0,1,2,3].map(s=>`<canvas class="cc-lcd" data-s="${s}" width="240" height="148" style="left:${pc(([.057,.291,.526,.761][s]+.004)*VW,VB[0],VB[2])};top:${pc(.109*VH_,VB[1],VB[3])};width:${pc(.174*VW,0,VB[2])};height:${pc(.104*VH_,0,VB[3])}"></canvas>`).join('');}
/* ---------- state → screen ---------- */
const SH_LIST=[25,30,50,60,100,125,250,500,1000,2000];
function txt(s,id,v){const e=document.querySelector(`#cc-svg [data-d="${s}:${id}"]`);if(e)e.textContent=v;}
function led(s,id,on,cls='on'){const e=document.querySelector(`#cc-svg [data-led="${s}:${id}"]`);if(e)e.classList.toggle(cls,!!on);}
/* the knobs and wheels turn with their value (pointer line), the joystick moves with the iris */
function rot(s,k,v){const g=document.querySelector(`#cc-svg .cc-w[data-s="${s}"][data-k="${k}"]`);if(!g)return;const c=g.querySelector('circle'),p=g.querySelector('.cc-wp');
  p.setAttribute('transform',`rotate(${(Math.max(-1,Math.min(1,v))*140).toFixed(1)} ${c.getAttribute('cx')} ${c.getAttribute('cy')})`);}
function draw(){const now=performance.now();STRIPS.forEach((t,s)=>{const c=CAMS[t.cam];
  ['R','G','B'].forEach((ch,i)=>{rot(s,'w'+ch,(c.white[i]-1)/1.5);rot(s,'b'+ch,t.flare?c.gamma[i]/2:c.black[i]);});
  rot(s,'yg',(c.ygain-1)/1.5);rot(s,'sens',c.sens*2-1);rot(s,'coarse',c.coarse*2-1);rot(s,'lk0',(t.cam-1)/3.5-1);
  const jy=document.querySelector(`#cc-svg .cc-joy[data-s="${s}"]`);if(jy){const ring=jy.querySelector('.cc-ring'),cx=+ring.getAttribute('cx'),cy=+ring.getAttribute('cy');
    const dy=(sy(.775)-cy)-(c.j-.5)*(sy(.885)-sy(.665));jy.setAttribute('transform',`translate(0 ${dy.toFixed(1)})`);   // the whole joystick slides along its rail (up = open)
    jy.querySelector('.cc-ringm').setAttribute('transform',`rotate(${(c.mb/5*150).toFixed(1)} ${cx} ${cy})`);}
  txt(s,'nd',c.nd);txt(s,'cc','0');txt(s,'mg',(c.gain>=0?'':'-')+Math.abs(c.gain).toFixed(1));txt(s,'sh',t.wbMode?String(c.wb).padStart(4,'0'):String(c.shutter).padStart(4,'0'));
  const N=fstop(c);txt(s,'iris',N?'F'+(N<10?N.toFixed(1):Math.round(N)):'CLS');txt(s,'mb',c.mb.toFixed(1));
  led(s,'rel',t.rel);led(s,'abs',!t.rel);led(s,'bars',c.bars);led(s,'scene',t.sceneLit>now);
  const lit=N?Math.max(0,Math.min(5,Math.round((Math.log2(N)-2)/(4-2)*5))):5;for(let i=0;i<6;i++)led(s,'iris'+i,i===lit,'g');
  const ty=tally(t.cam),cm=document.querySelector(`#cc-svg [data-cam="${s}"]`);if(cm){cm.textContent=t.cam;cm.classList.toggle('red',ty==='pgm'||(t.call&&Math.floor(now/250)%2===0));}
  document.querySelectorAll(`#cc-svg .cc-b[data-s="${s}"]`).forEach(b=>{const k=b.dataset.k;b.classList.toggle('lit',(k==='store'&&t.store)||(k==='wb'&&t.wbMode)||(k==='flare'&&t.flare)||(k==='irislock'&&t.irisLock)||(k==='lock'&&t.lock)||(k==='on'&&!t.rel)||(k==='call'&&t.call)||(k==='mg+'&&c.gain>0)||(k==='mg-'&&c.gain<0));});
  const lc=document.querySelector(`.cc-lcd[data-s="${s}"]`);if(lc){const g=lc.getContext('2d'),w=240,h=148;g.fillStyle='#0d1117';g.fillRect(0,0,w,h);g.font='600 9px sans-serif';g.textAlign='center';
    ['PANEL SETTINGS','CAMERA SETTINGS','BANK A','RECALL ALL'].forEach((l,i)=>{g.fillStyle=i===2?'#ff9a2e':'#c9d1d9';g.fillText(l,30+i*60,12);});
    g.fillStyle='#8b949e';g.font='600 10px sans-serif';g.fillText('CAMERA CONTROL',w/2,44);g.fillStyle=ty==='pgm'?'#ff453a':'#fff';g.font='700 24px sans-serif';g.fillText('Camera '+t.cam,w/2,74);
    g.fillStyle=t.msg?'#ffcf5a':'#8b949e';g.font='600 9.5px sans-serif';g.fillText(t.msg||(c.bars?'BARS ON':tally(t.cam)==='pgm'?'ON AIR':''),w/2,96);
    g.font='600 10px sans-serif';g.fillStyle='#fff';g.fillText('Camera '+t.cam,30,128);g.fillText('Generic',90,128);g.fillStyle='#8b949e';g.font='600 8px sans-serif';g.fillText('CAMERA',30,140);g.fillText('CAMERA TYPE',90,140);}
  updFilter(t.cam);});}
/* ---------- interaction ---------- */
function setMsg(t,m){t.msg=m;clearTimeout(t.mt);t.mt=setTimeout(()=>{t.msg='';draw();},2200);}
function press(s,k){const t=STRIPS[s],c=CAMS[t.cam];if(t.lock&&k!=='lock'){setMsg(t,'PANEL ACTIVE: strip locked');return;}
  const snap=()=>JSON.parse(JSON.stringify(c));
  if(/^sc\d$/.test(k)){const n=+k[2];if(t.store){t.scenes[n]=snap();t.store=false;setMsg(t,'Scene '+n+' stored');}else if(t.scenes[n]){Object.assign(c,JSON.parse(JSON.stringify(t.scenes[n])));setMsg(t,'Scene '+n+' recalled');}else setMsg(t,'Scene '+n+' is empty');t.sceneLit=performance.now()+900;return;}
  const i=v=>SH_LIST.indexOf(v);
  switch(k){case 'store':t.store=!t.store;break;
    case 'nd+':c.nd=Math.min(6,c.nd+2);break;case 'nd-':c.nd=Math.max(0,c.nd-2);break;case 'cc+':case 'cc-':setMsg(t,'CC: not enabled (firmware)');break;
    case 'mg+':c.gain=Math.min(36,c.gain+2);break;case 'mg-':c.gain=Math.max(-12,c.gain-2);break;
    case 'on':t.rel=!t.rel;break;case 'wb':t.wbMode=!t.wbMode;break;
    case 'sh+':if(t.wbMode)c.wb=Math.min(10000,c.wb+100);else c.shutter=SH_LIST[Math.min(SH_LIST.length-1,i(c.shutter)+1)];break;
    case 'sh-':if(t.wbMode)c.wb=Math.max(2500,c.wb-100);else c.shutter=SH_LIST[Math.max(0,i(c.shutter)-1)];break;
    case 'flare':t.flare=!t.flare;break;case 'irislock':t.irisLock=!t.irisLock;break;case 'lock':t.lock=!t.lock;break;
    case 'autoiris':if(t.irisLock){setMsg(t,'Iris locked');break;}{const need=4*Math.sqrt(Math.pow(2,-c.nd)*Math.pow(10,c.gain/20)*50/c.shutter),w=1+c.sens*5,open=AVMIN+(1-c.coarse)*(AVMAX-AVMIN-w);c.j=Math.max(.02,Math.min(1,1-(2*Math.log2(need)-open)/w));setMsg(t,'Auto iris');}break;
    case 'pvw':case 'joyclick':{const k2=atemInputOf(t.cam);if(k2&&window.ATEMR){ATEMR.api.setOut(1,k2);setMsg(t,'Camera '+t.cam+' → preview aux (ATEM OUT 2)');}else setMsg(t,'This camera is not on an ATEM input');}break;
    case 'soft2':setMsg(t,'Bank A (cameras 1-4)');break;case 'soft0':case 'soft1':case 'soft3':setMsg(t,'Menu not simulated');break;}}
function turn(s,k,d){const t=STRIPS[s],c=CAMS[t.cam];if(t.lock)return;const ch={R:0,G:1,B:2};
  if(k==='lk0'){t.cam=((t.cam-1+d+8)%8)+1;return;}if(/^lk/.test(k))return;
  if(k[0]==='w'&&ch[k[1]]!=null)c.white[ch[k[1]]]=Math.max(0,Math.min(3,c.white[ch[k[1]]]+d*.02));
  else if(k[0]==='b'&&ch[k[1]]!=null){if(t.flare)c.gamma[ch[k[1]]]=Math.max(-2,Math.min(2,c.gamma[ch[k[1]]]+d*.04));else c.black[ch[k[1]]]=Math.max(-1,Math.min(1,c.black[ch[k[1]]]+d*.02));}
  else if(k==='yg')c.ygain=Math.max(0,Math.min(3,c.ygain+d*.02));else if(k==='sens')c.sens=Math.max(0,Math.min(1,c.sens+d*.03));else if(k==='coarse')c.coarse=Math.max(0,Math.min(1,c.coarse+d*.03));}
/* simulator shortcut: Shift+click a control = back to its default */
function reset(s,k){const t=STRIPS[s],c=CAMS[t.cam],d=camDef(),ch={R:0,G:1,B:2};if(t.lock)return;
  if(k==='joy'){c.j=d.j;c.mb=0;}else if(k[0]==='w'&&ch[k[1]]!=null)c.white[ch[k[1]]]=1;else if(k[0]==='b'&&ch[k[1]]!=null){if(t.flare)c.gamma[ch[k[1]]]=0;else c.black[ch[k[1]]]=0;}
  else if(k==='yg')c.ygain=1;else if(k==='sens')c.sens=1;else if(k==='coarse')c.coarse=1;else if(k==='nd+'||k==='nd-')c.nd=0;else if(k==='mg+'||k==='mg-')c.gain=0;
  else if(k==='sh+'||k==='sh-'){if(t.wbMode)c.wb=5600;else c.shutter=50;}else return false;setMsg(t,'Reset');return true;}
function mount(el){el.innerHTML=`<div class="cr-wrap cc-wrap">${panel()}</div>`;const svg=el.querySelector('#cc-svg'),tip=document.getElementById('cr-tip');
  svg.addEventListener('pointerdown',e=>{if(e.shiftKey){const r=e.target.closest('.cc-b,.cc-w,.cc-joy');if(r&&reset(+r.dataset.s,r.classList.contains('cc-joy')?'joy':r.dataset.k)){e.preventDefault();draw();return;}}
    const b=e.target.closest('.cc-b,.cr-soft');if(b){e.preventDefault();const s=+b.dataset.s,k=b.dataset.k,t=STRIPS[s];
      if(k==='bars'){const c=CAMS[t.cam];if(c.bars){c.bars=false;draw();return;}const tm=setTimeout(()=>{c.bars=true;draw();},3000);setMsg(t,'Hold BARS 3 s…');const up=()=>{clearTimeout(tm);removeEventListener('pointerup',up);};addEventListener('pointerup',up);draw();return;}
      if(k==='wb'){const tm=setTimeout(()=>{CAMS[t.cam].wb=SCENE_K;t.wbMode=false;setMsg(t,'Auto white balance: 5600 K');draw();},2000);const up=()=>{clearTimeout(tm);removeEventListener('pointerup',up);};addEventListener('pointerup',up);}
      if(k==='call'){t.call=true;const up=()=>{t.call=false;removeEventListener('pointerup',up);draw();};addEventListener('pointerup',up);draw();return;}
      press(s,k);draw();return;}
    const w=e.target.closest('.cc-w'),j=e.target.closest('.cc-joy');if(!w&&!j)return;e.preventDefault();let y0=e.clientY,moved=false;const s=+(w||j).dataset.s,k=w?w.dataset.k:'joy';
    const mv=ev=>{const d=y0-ev.clientY;if(Math.abs(d)<1)return;moved=true;y0=ev.clientY;const t=STRIPS[s],c=CAMS[t.cam];
      if(k==='joy'){if(t.lock||t.irisLock)return;c.j=Math.max(0,Math.min(1,c.j+d*.006));}else turn(s,k,d>0?1:-1);draw();};
    const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);if(k==='joy'&&!moved){press(s,'joyclick');draw();}};addEventListener('pointermove',mv);addEventListener('pointerup',up);});
  svg.addEventListener('wheel',e=>{const w=e.target.closest('.cc-w'),j=e.target.closest('.cc-joy');if(!w&&!j)return;e.preventDefault();const s=+(w||j).dataset.s,d=e.deltaY<0?1:-1;
    if(j){const t=STRIPS[s];if(t.lock||t.irisLock)return;CAMS[t.cam].mb=Math.max(-5,Math.min(5,CAMS[t.cam].mb+d*.1));}else turn(s,w.dataset.k,d);draw();},{passive:false});
  draw();}
window.CCUP={mount,draw};
})();
