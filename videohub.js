/* Blackmagic Smart Videohub 20x20 (6G) — training simulator.
 * Front and rear drawn from the official line drawing; operation as in the "Videohub 6G" manual
 * (docs/videohub-spec.md): DEST/SRC + numbered key or spin knob, TAKE flashes red, CLEAR discards,
 * VIDEO shows the signal on the LCD, hold DEST 2 s = lock, MENU = network / use take.
 * Rear BNCs are re-pluggable (what is cabled to each IN / OUT). Not affiliated with Blackmagic Design. */
(function(){
const root=document.getElementById('vh');if(!root)return;
const N=20,PW=1080,PH=100;                    // panel drawing units (1 RU ≈ 10.8 : 1)
const KEY='vh-state4';
/* ---------- what can be cabled ---------- */
const SRCS={none:'— nothing —',cam1:'CAM 1',cam2:'CAM 2',cam3:'CAM 3',cam4:'CAM 4',cam5:'CAM 5',cam6:'CAM 6',cam7:'CAM 7',cam8:'CAM 8',
  vfill:'vMix FILL',vkey:'vMix KEY',atem:'ATEM PGM',hdk:'HyperDeck'};
const SRCL={vfill:'vMix PC · DeckLink SDI 1 (Fill)',vkey:'vMix PC · DeckLink SDI 2 (Key)',atem:'ATEM Constellation · Program out',hdk:'HyperDeck Studio HD Pro · SDI out'};
const DSTS={none:'— nothing —',atem1:'ATEM IN 1',atem2:'ATEM IN 2',atem3:'ATEM IN 3',atem4:'ATEM IN 4',atem5:'ATEM IN 5',atem6:'ATEM IN 6',atem7:'ATEM IN 7',atem8:'ATEM IN 8',atem9:'ATEM IN 9',atem10:'ATEM IN 10',atem11:'ATEM IN 11',atem12:'ATEM IN 12',
  vmix:'vMix IN',hdk:'HyperDeck REC',mon:'Monitor wall',ult1:'Ultimatte 1',ult2:'Ultimatte 2'};
/* proposed cabling (to be confirmed with the real room) */
/* working cabling (Alex, 4-oct): IN/OUT 1-8 = the 8 cameras of the multicam pack, 9-10 = vMix fill/key → ATEM IN 1-10. */
const DEF={cabIn:['cam1','cam2','cam3','cam4','cam5','cam6','cam7','cam8','vfill','vkey',...Array(10).fill('none')],
  cabOut:['atem1','atem2','atem3','atem4','atem5','atem6','atem7','atem8','atem9','atem10',...Array(10).fill('none')],
  routes:[...Array(N).keys()],locks:Array(N).fill(false),useTake:true,net:[[192,168,11,50],[255,255,255,0],[192,168,11,1]]};
let st;try{st=Object.assign(JSON.parse(JSON.stringify(DEF)),JSON.parse(localStorage.getItem(KEY))||{});}catch(_){st=JSON.parse(JSON.stringify(DEF));}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(st));}catch(_){}};   // routes survive a power cut (real: "power fail protection")
const inLab=i=>{const v=st.cabIn[i],m=/^ao(\d+)$/.exec(v);return v==='none'?'Input '+(i+1):m?'ATEM OUT '+m[1]:SRCS[v];};
const outLab=o=>st.cabOut[o]==='none'?'Output '+(o+1):DSTS[st.cabOut[o]];
/* front-panel state */
const U={mode:'dest',dest:0,pend:null,video:false,menu:null,blink:0,holdT:null,msg:''};
/* ---------- signals ---------- */
const PACK={v:{},t0:null};   // CAM1-8 videos from the multicam pack folder
/* camera picture as set by its CCU strip (exposure, white balance, lift / gamma / gain, bars) */
const camTmp=document.createElement('canvas');
function camFrame(c,n,w,h,t){const cc=window.CCU;
  if(cc&&cc.bars(n)){['#c0c0c0','#c0c000','#00c0c0','#00c000','#c000c0','#c00000','#0000c0'].forEach((col,i)=>{c.fillStyle=col;c.fillRect(i*w/7,0,w/7+1,h*.75);});c.fillStyle='#111';c.fillRect(0,h*.75,w,h*.25);c.fillStyle='#fff';c.font=`700 ${h*.08}px sans-serif`;c.textAlign='center';c.fillText('CAM '+n,w/2,h*.88);return true;}
  const f=cc&&cc.filter(n);if(!f)return camRaw(c,n,w,h,t);
  if(camTmp.width!==w||camTmp.height!==h){camTmp.width=w;camTmp.height=h;}camRaw(camTmp.getContext('2d'),n,w,h,t);c.save();c.filter=f;c.drawImage(camTmp,0,0,w,h);c.restore();return true;}
function camRaw(c,n,w,h,t){const v=PACK.v[n];
  if(v&&v.readyState>=2){c.drawImage(v,0,0,w,h);return true;}
  const g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,['#264653','#2a9d8f','#8a5a44','#6d597a','#355070','#7f5539','#3d5a80','#5f0f40'][n-1]);g.addColorStop(1,'#111');
  c.fillStyle=g;c.fillRect(0,0,w,h);c.fillStyle='rgba(255,255,255,.85)';c.font=`800 ${h*.2}px sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillText('CAM '+n,w/2,h*.45);
  c.font=`600 ${h*.07}px sans-serif`;c.fillText('simulated camera · load the pack for real images',w/2,h*.7);
  const s=Math.floor(t/1000);c.fillText(String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')+':'+String(Math.floor(t/40)%25).padStart(2,'0'),w/2,h*.82);return true;}
/* draws input i into c; false = no signal */
function sigFrame(c,i,w,h){const k=st.cabIn[i],t=performance.now(),ao=/^ao(\d+)$/.exec(k);
  if(ao)return window.ATEMR?ATEMR.outFrame(+ao[1]-1,c,w,h)!==false:false;   // an ATEM SDI output cabled back into the router
  if(k.startsWith('cam'))return camFrame(c,+k.slice(3),w,h,t);
  const ext=window.VH_SOURCES&&window.VH_SOURCES[k];   // other simulators can feed a signal (vMix fill/key, ATEM PGM…)
  if(ext){try{return ext(c,w,h)!==false;}catch(_){}}
  return false;}
const hasSig=i=>{const k=st.cabIn[i];return k.startsWith('cam')||/^ao\d+$/.test(k)||!!(window.VH_SOURCES&&window.VH_SOURCES[k]);};

/* ---------- drawing ---------- */
const X=f=>f*PW,Y=f=>f*PH;
const KX=[0.367,0.399,0.431,0.464,0.495,0.528,0.560],KY=[0.22,0.49,0.76],KW=30,KH=22;
function key(id,cx,cy,label,tip){return `<g class="vh-k" data-k="${id}" data-tip="${tip}"><rect x="${cx-KW/2}" y="${cy-KH/2}" width="${KW}" height="${KH}" rx="3.5"/>`+(label?`<text x="${cx}" y="${cy+2.6}" class="vh-kt">${label}</text>`:'')+'</g>';}
function front(){let s=`<svg viewBox="0 0 ${PW} ${PH}" class="vh-svg" id="vh-fsvg"><rect x="1" y="1" width="${PW-2}" height="${PH-2}" rx="7" class="vh-face"/>`;
  [[0,0.048],[0.952,1]].forEach(([a,b])=>{s+=`<line x1="${X(a?a:b)}" y1="3" x2="${X(a?a:b)}" y2="${PH-3}" class="vh-fold"/>`;[0.15,0.85].forEach(y=>s+=`<rect x="${X((a+b)/2)-9}" y="${Y(y)-5}" width="18" height="10" rx="5" class="vh-hole"/>`);});
  s+=`<text x="${X(0.074)}" y="${Y(0.5)+5}" class="vh-name"><tspan font-weight="800">Smart Videohub</tspan><tspan font-weight="300" fill="#cfd2d6"> 20 x 20</tspan></text>`;
  for(let c=0;c<7;c++)for(let r=0;r<3;r++){const n=c*3+r+1;s+=n<=20?key('n'+n,X(KX[c]),Y(KY[r]),n,'Numbered key '+n+': after DEST it picks destination '+n+', after SRC source '+n+'.'):key('blank',X(KX[c]),Y(KY[r]),'','This key has no label and no documented function.');}
  [['SRC','src','SRC then a numbered key (or the knob) picks the SOURCE for the selected destination.'],['DEST','dest','DEST then a numbered key (or the knob) picks the DESTINATION. Hold DEST 2 s to lock / unlock it.'],['CLEAR','clear','CLEAR discards the route change you were preparing.']].forEach(([l,id,t],r)=>s+=key(id,X(0.597),Y(KY[r]),l,t));
  [['MENU','menu','MENU switches between the routing display and the settings (network, use take).'],['VIDEO','video','VIDEO + SRC/DEST shows that signal as live video on the LCD.'],['TAKE','take','TAKE confirms the route change (it flashes red when a change is waiting).']].forEach(([l,id,t],r)=>s+=key(id,X(0.629),Y(KY[r]),l,t));
  s+=`<rect x="${X(0.662)}" y="${Y(0.09)}" width="${X(0.098)}" height="${Y(0.80)}" rx="2" class="vh-lcdb"/>`;
  s+=`<g class="vh-knob" data-tip="Spin knob: turn it (drag up/down or scroll) to scroll destinations / sources by name, or menu items."><circle cx="${X(0.798)}" cy="${Y(0.48)}" r="${X(0.018)}" class="vh-kn"/><circle cx="${X(0.798)}" cy="${Y(0.48)}" r="${X(0.0155)}" class="vh-kn2"/><line class="vh-knd" x1="${X(0.798)}" y1="${Y(0.48)-X(0.0155)+3}" x2="${X(0.798)}" y2="${Y(0.48)-X(0.0155)+9}"/></g>`;
  s+=`<text x="${X(0.831)}" y="${Y(0.5)+4.5}" class="vh-logo">Blackmagic<tspan font-weight="300">design</tspan></text>`;
  [0.37,0.5,0.63].forEach(y=>s+=`<rect x="${X(0.926)-5}" y="${Y(y)-5}" width="10" height="10" rx="2.6" class="vh-bmd"/>`);
  return s+'</svg>';}
function bnc(cx,cy,r=13){return `<circle cx="${cx}" cy="${cy}" r="${r}" class="vh-bnc"/><circle cx="${cx}" cy="${cy}" r="${r*.62}" class="vh-bnc2"/><circle cx="${cx}" cy="${cy}" r="${r*.18}" class="vh-bnc3"/>`;}
function rear(){let s=`<svg viewBox="0 0 ${PW} ${PH+14}" class="vh-svg" id="vh-rsvg"><rect x="1" y="1" width="${PW-2}" height="${PH-2}" rx="7" class="vh-face vh-rface"/>`;
  [[0.021],[0.981]].forEach(([c])=>[0.15,0.85].forEach(y=>s+=`<rect x="${X(c)-9}" y="${Y(y)-5}" width="18" height="10" rx="5" class="vh-hole"/>`));
  s+=`<rect x="${X(0.042)}" y="4" width="${X(0.921)}" height="${PH-8}" rx="3" class="vh-rin"/>`;
  s+=`<g data-tip="IEC power inlet (90-240 V AC, one internal supply). No power switch: the router is always on; routes survive a power cut."><rect x="${X(0.05)}" y="${Y(0.1)}" width="${X(0.064)}" height="${Y(0.8)}" rx="3" class="vh-iec"/><rect x="${X(0.058)}" y="${Y(0.18)}" width="${X(0.048)}" height="${Y(0.38)}" rx="4" class="vh-iec2"/><rect x="${X(0.06)}" y="${Y(0.62)}" width="${X(0.044)}" height="${Y(0.2)}" rx="2" class="vh-iec2"/></g>`;
  s+=`<g data-tip="REF IN: reference (black burst / tri-sync).">${bnc(X(0.138),Y(0.25),12)}<text x="${X(0.138)}" y="${Y(0.5)}" class="vh-rt">REF IN</text></g>`;
  s+=`<g data-tip="RS-422 CNTRL: crosspoint control from a third-party controller."><rect x="${X(0.171)-11}" y="${Y(0.25)-10}" width="22" height="18" rx="2" class="vh-rj"/><text x="${X(0.171)}" y="${Y(0.5)}" class="vh-rt">RS-422</text><text x="${X(0.171)}" y="${Y(0.5)+6}" class="vh-rt">CNTRL</text></g>`;
  s+=`<g data-tip="ETHERNET: Videohub Control / Setup software and remote panels (port 9990)."><rect x="${X(0.138)-17}" y="${Y(0.66)-11}" width="34" height="22" rx="2" class="vh-rj"/><text x="${X(0.138)}" y="${Y(0.92)}" class="vh-rt">ETHERNET</text></g>`;
  s+=`<g data-tip="USB 2.0: Videohub Setup (IP address, firmware)."><rect x="${X(0.170)-7}" y="${Y(0.72)-4}" width="14" height="8" rx="1.5" class="vh-rj"/><text x="${X(0.170)}" y="${Y(0.92)}" class="vh-rt">USB 2.0</text></g>`;
  const grp=(x0,dir,lab)=>{for(let k=0;k<N;k++){const col=Math.floor(k/2),row=k%2,cx=X(x0+col*0.0385),cy=Y(row?0.66:0.25);
      s+=`<g class="vh-sock" data-s="${dir}${k}">${bnc(cx,cy)}<text x="${cx-14}" y="${cy-14.5}" class="vh-rn">${k+1}▸</text><circle cx="${cx}" cy="${cy}" r="9" class="vh-plug"/></g>`;}
    const a=X(x0)-14,b=X(x0+9*0.0385)+14;s+=`<path d="M${a} ${PH-16}v3H${b}v-3" class="vh-brk"/><text x="${(a+b)/2}" y="${PH-8.5}" class="vh-rt">${lab}</text>`;};
  grp(0.202,'i','SD/HD/3G/6G-SDI IN');grp(0.587,'o','SD/HD/3G/6G-SDI OUT');
  return s+'</svg>';}
function build(){if(root.dataset.built)return;root.dataset.built='1';
  root.innerHTML=`<div class="pwr-hd"><div><h2>Video rack</h2><div class="kind">Smart Videohub 20×20 (router) · ATEM 2 M/E Constellation HD (switcher)</div>
    <p><b>Videohub:</b> DEST + number = where · SRC + number = which signal · TAKE confirms · <b>ATEM:</b> a number = preview (green) · CUT / AUTO = on air (red) · hover anything to learn what it does.</p></div>
    <div class="pwr-btns"><button id="vh-patch" title="Admin: re-cable the rear panels and save the room cabling">Patch mode</button><span class="vh-pbtns"><button id="vh-exp">Export cabling</button><button id="vh-imp">Import</button><button id="vh-def">Default cabling</button></span><button id="vh-mvbtn">Multiview on a 2nd screen ↗</button><button id="vh-guidebtn">How to use</button><button id="vh-pack">Load the pack folder</button><button id="vh-reset">Reset routes</button></div></div>
  <button class="close" id="vh-close" aria-label="Close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
  <div class="vh-body"><div class="vh-units">
    <div class="vh-lab">SMART VIDEOHUB 20×20 <span>— front · rear below ↓</span></div><div class="vh-front">${front()}<canvas id="vh-lcd" width="320" height="240"></canvas></div>
    <div class="vh-rearwrap" id="vh-rearwrap"><div class="vh-lab">SMART VIDEOHUB — rear <span>(as seen from behind) · hover a cable to see what it carries</span></div><div class="vh-rear">${rear()}</div><div class="vh-gap"></div><div id="atem-rear"></div><svg class="vh-cables" id="vh-cables"></svg></div>
    <div class="vh-lab">ATEM 2 M/E CONSTELLATION HD <span>— rear ↑ · front ↓</span></div><div id="atem-front"></div>
    <div class="vh-tbl" id="vh-tbl"></div></div></div>
  <div class="pwr-status" id="vh-diag"></div>
  <div class="mx-plugmenu" id="vh-plugmenu"></div>
  <div class="mx-src mx-guide" id="vh-guide"><div class="mx-srchd"><b>How to use the Smart Videohub</b> <button id="vh-guideclose" aria-label="Close">✕</button></div>
    <ol class="mx-steps">
      <li>The router is a <b>matrix</b>: 20 SDI inputs (sources: cameras, vMix, ATEM programme…) and 20 SDI outputs (destinations: ATEM inputs, vMix, recorder, monitors). Each output carries exactly one input; one input can feed many outputs.</li>
      <li><b>Pick the destination:</b> press <b>DEST</b> and then a numbered key (1-20), or turn the knob to scroll destinations by name. The screen shows it in blue with the source it is carrying now.</li>
      <li><b>Pick the source:</b> press <b>SRC</b> and then a numbered key, or turn the knob.</li>
      <li><b>TAKE</b> flashes red: press it to make the change. <b>CLEAR</b> discards it.</li>
      <li><b>VIDEO</b>: with SRC or DEST, shows that signal as live video on the little screen — check it before you TAKE. Press VIDEO again for the labels.</li>
      <li><b>Lock</b> a destination so nobody changes it by mistake: select it and <b>hold DEST 2 s</b> (a padlock appears). Same again to unlock.</li>
      <li><b>MENU</b>: <i>network</i> (IP address, subnet, gateway) and <i>use take</i> (off = the source switches as soon as you pick it). Knob to move, TAKE to select / confirm, MENU to go back.</li>
      <li><b>Rear panel:</b> the cables stay where they are — routing happens <b>inside</b> the router. Hover a BNC to see what is cabled there. Cabled for now: IN 1-8 = cameras 1-8 (the multicam pack), IN 9-10 = vMix fill / key, and OUT 1-10 feed ATEM inputs 1-10.</li>
      <li>Cameras show a test image; <b>Load the pack folder</b> (multicam pack, CAM1-8) to see the real footage.</li>
      <li><b>ATEM Constellation</b> (the switcher, under the router): its inputs come from the router outputs (OUT 1-10 → ATEM IN 1-10). Press a source key = <b>preview</b> (green); <b>CUT</b> or <b>AUTO</b> = it goes <b>on air</b> (red). MIX / WIPE / DIP / DVE choose the AUTO transition.</li>
      <li><b>DSK 1 MIX</b> keys the vMix graphics over the programme (fill on IN 9, key on IN 10). In vMix turn on <b>External</b> with Alpha Channel <i>Straight</i> or <i>Premultiplied</i> so the fill and key arrive.</li>
      <li><b>FTB</b> fades everything to black. <b>MENU</b> → Outputs assigns what each of the 12 SDI outputs carries; Transitions = rate; Settings = cut-bus mode. <b>LOCK</b>: hold 2 s to lock the panel, 1 s to unlock.</li>
      <li>The <b>control-room monitor</b> at the bottom is the ATEM's MULTIVIEW 1: preview and programme on top, inputs 1-8 below with red / green tally. <i>Open on a second screen</i> puts it in its own window.</li>
    </ol></div>
  <input type="file" id="vh-packdir" webkitdirectory multiple hidden><input type="file" id="vh-impfile" accept=".json,application/json" hidden>
  <div class="pwr-tip" id="vh-tip"></div>`;
  wire();if(window.HDR)HDR.mount();if(window.ATEMR)ATEMR.mount();if(window.CABLES)CABLES.start();}
/* ---------- state → screen ---------- */
const lcd=()=>document.getElementById('vh-lcd');
function wrapTxt(c,t,x,y,max){c.fillText(t.length>14?t.slice(0,13)+'…':t,x,y,max);}
function drawLcd(){const cv=lcd();if(!cv)return;const c=cv.getContext('2d'),w=320,h=240;c.textAlign='left';c.textBaseline='alphabetic';
  if(U.menu){c.fillStyle='#16191e';c.fillRect(0,0,w,h);c.fillStyle='#9aa3ad';c.font='600 16px sans-serif';c.fillText('Settings',14,26);
    if(U.menu.page==='list'){['network','use take'].forEach((t,i)=>{const sel=U.menu.i===i;if(sel){c.fillStyle='#2b6fd6';c.fillRect(8,44+i*44,w-16,38);}c.fillStyle='#fff';c.font='700 24px sans-serif';c.fillText(t,20,71+i*44);
        if(i===1){c.textAlign='right';c.fillText(st.useTake?'on':'off',w-20,71+i*44);c.textAlign='left';}});}
    else if(U.menu.page==='take'){c.fillStyle='#fff';c.font='700 24px sans-serif';c.fillText('use take',20,74);c.fillStyle='#2b6fd6';c.fillRect(8,96,w-16,44);c.fillStyle='#fff';c.font='800 30px sans-serif';c.fillText(U.menu.v?'on':'off',22,129);}
    else{['IP address','Subnet mask','Gateway'].forEach((t,f)=>{const y=58+f*62;c.fillStyle='#9aa3ad';c.font='600 15px sans-serif';c.fillText(t,16,y);
        st.net[f].forEach((o,k)=>{const x=16+k*74,on=U.menu.f===f&&(U.menu.edit?U.menu.o===k:true);if(on){c.fillStyle=U.menu.edit?'#2b6fd6':'#34495e';c.fillRect(x-4,y+6,66,30);}c.fillStyle='#fff';c.font='700 22px sans-serif';c.fillText(String(o),x,y+29);});});}
    return;}
  const srcIdx=U.pend!=null?U.pend:st.routes[U.dest],srcActive=U.mode==='src';
  if(U.video){const sel=srcActive?srcIdx:st.routes[U.dest];c.fillStyle='#000';c.fillRect(0,0,w,h);const ok=sigFrame(c,sel,w,h);
    c.fillStyle='rgba(0,0,0,.55)';c.fillRect(0,0,w,26);c.fillRect(0,h-34,w,34);c.fillStyle='#fff';c.font='700 15px sans-serif';c.fillText(ok?'1080i50':'No signal',8,18);
    c.font='700 18px sans-serif';wrapTxt(c,(srcActive?'Source: ':'Dest: ')+(srcActive?inLab(sel):outLab(U.dest)),8,h-11,w-16);return;}
  const fld=(y,title,label,active,lock)=>{c.fillStyle=active?'#3c86ef':'#d9dde3';c.fillRect(0,y,w,26);c.fillStyle=active?'#fff':'#55606c';c.font='600 15px sans-serif';c.fillText(title,10,y+18);
    if(lock){c.fillStyle=active?'#fff':'#55606c';c.fillRect(w-26,y+11,14,10);c.strokeStyle=c.fillStyle;c.lineWidth=2.4;c.beginPath();c.arc(w-19,y+11,4.5,Math.PI,0);c.stroke();}
    c.fillStyle=active?'#1f6fe0':'#fff';c.fillRect(0,y+26,w,92);c.fillStyle=active?'#fff':'#111';c.font='700 40px sans-serif';wrapTxt(c,label,12,y+86,w-24);};
  fld(0,'Source'+(U.pend!=null?'  →  press TAKE':''),inLab(srcIdx),srcActive,false);fld(120,'Destination',outLab(U.dest),!srcActive,st.locks[U.dest]);}
function setKey(id,cls,on){const g=root.querySelector(`.vh-k[data-k="${id}"]`);if(g)g.classList.toggle(cls,!!on);}
function draw(){const lit=U.menu?null:U.mode==='dest'?U.dest+1:(U.pend!=null?U.pend:st.routes[U.dest])+1;
  for(let n=1;n<=20;n++)setKey('n'+n,'lit',n===lit);
  setKey('src','lit',!U.menu&&U.mode==='src');setKey('dest','lit',!U.menu&&U.mode==='dest');setKey('menu','lit',!!U.menu);setKey('video','lit',U.video&&!U.menu);
  const pending=U.pend!=null&&!U.menu,menuSel=U.menu&&(U.menu.page==='list'||U.menu.page==='take'||U.menu.page==='net');
  setKey('take','flash',pending||menuSel);setKey('clear','flash',pending);
  root.querySelectorAll('.vh-sock').forEach(g=>{const d=g.dataset.s[0],k=+g.dataset.s.slice(1),v=d==='i'?st.cabIn[k]:st.cabOut[k];g.classList.toggle('plugged',v!=='none');
    g.classList.toggle('hl',d==='o'?k===U.dest:k===(U.pend!=null?U.pend:st.routes[U.dest]));});
  const tb=document.getElementById('vh-tbl');if(tb)tb.innerHTML='<span class="vh-th">ROUTING NOW</span>'+st.cabOut.map((v,o)=>v==='none'&&o!==U.dest?'':`<span class="vh-rt2${o===U.dest?' on':''}" title="${outLab(o)}"><b>OUT ${o+1}</b> ← <b>IN ${st.routes[o]+1}</b> ${inLab(st.routes[o])}${st.locks[o]?' 🔒':''}</span>`).join('');
  const dg=document.getElementById('vh-diag');if(dg&&!root.classList.contains('patch')){const s=st.routes[U.dest];dg.innerHTML=`<span class="pw-chip ok"><i></i>Destination: OUT ${U.dest+1} · ${outLab(U.dest)}</span>`+
    `<span class="pw-chip ${hasSig(s)?'ok':'bad'}"><i></i>carrying IN ${s+1} · ${inLab(s)}${hasSig(s)?'':' (no signal)'}</span>`+(U.pend!=null?`<span class="pw-chip bad"><i></i>Waiting: IN ${U.pend+1} ${inLab(U.pend)} → press TAKE or CLEAR</span>`:'')+
    (st.locks[U.dest]?'<span class="pw-chip bad"><i></i>Destination locked (hold DEST 2 s)</span>':'')+(U.msg?`<span class="mx-sel">${U.msg}</span>`:'');}
  drawLcd();}
/* ---------- operation ---------- */
function route(o,i){st.routes[o]=i;save();window.dispatchEvent(new CustomEvent('videohub-change',{detail:{out:o,in:i}}));}
function pickNum(n){const k=n-1;U.msg='';
  if(U.mode==='dest'){U.dest=k;U.pend=null;}
  else{if(st.locks[U.dest]){U.msg='Destination locked: SRC does nothing (hold DEST 2 s to unlock).';return;}
    if(st.useTake)U.pend=k===st.routes[U.dest]?null:k;else{route(U.dest,k);U.pend=null;}}}
const byName=(n,lab)=>[...Array(N).keys()].sort((a,b)=>lab(a).localeCompare(lab(b),undefined,{numeric:true}));
function spin(d){if(!d)return;U.msg='';
  if(U.menu){const m=U.menu;if(m.page==='list')m.i=(m.i+d+2)%2;else if(m.page==='take')m.v=!m.v;
    else if(m.edit){const v=st.net[m.f][m.o];st.net[m.f][m.o]=(v+d+256)%256;save();}else m.f=(m.f+d+3)%3;return;}
  if(U.mode==='dest'){const o=byName(N,outLab),i=o.indexOf(U.dest);U.dest=o[(i+d+N)%N];U.pend=null;}
  else{if(st.locks[U.dest]){U.msg='Destination locked.';return;}const o=byName(N,inLab),cur=U.pend!=null?U.pend:st.routes[U.dest],i=o.indexOf(cur),k=o[(i+d+N)%N];
    if(st.useTake)U.pend=k===st.routes[U.dest]?null:k;else route(U.dest,k);}}
function press(id){U.msg='';
  if(id==='menu'){U.menu=U.menu?null:{page:'list',i:0};return;}
  if(U.menu){const m=U.menu;
    if(id==='take'){if(m.page==='list'){if(m.i===0)U.menu={page:'net',f:0,o:0,edit:false};else U.menu={page:'take',v:st.useTake};}
      else if(m.page==='take'){st.useTake=m.v;save();U.menu={page:'list',i:1};if(!st.useTake)U.pend=null;}
      else if(!m.edit){m.edit=true;m.o=0;}else if(m.o<3)m.o++;else{m.edit=false;}}
    return;}
  if(id==='src')U.mode='src';else if(id==='dest')U.mode='dest';
  else if(id==='video')U.video=!U.video;
  else if(id==='clear')U.pend=null;
  else if(id==='take'){if(U.pend!=null){route(U.dest,U.pend);U.pend=null;}}
  else if(id.startsWith('n'))pickNum(+id.slice(1));}
/* ---------- rear plugging ---------- */
function plugMenu(s,ev){const m=document.getElementById('vh-plugmenu'),d=s[0],k=+s.slice(1),L=d==='i'?SRCS:DSTS,cur=d==='i'?st.cabIn[k]:st.cabOut[k];
  m.innerHTML=`<div class="mx-srchd"><b>${d==='i'?'SDI IN':'SDI OUT'} ${k+1}</b> — ${d==='i'?'what is cabled into it?':'what does it feed?'}</div>`+
    Object.entries(L).map(([v,l])=>`<button data-v="${v}" class="${v===cur?'on':''}">${l}${d==='i'&&SRCL[v]?` <i>${SRCL[v]}</i>`:''}${d==='i'&&/^cam\d$/.test(v)?(PACK.v[+v.slice(3)]?' <i>— pack video loaded ✓</i>':' <i>— test image (load the pack for video)</i>'):''}</button>`).join('')+
    (d==='i'?'<p class="mx-snote">vMix fill / key arrive while vMix External is on; ATEM PGM = ATEM SDI OUT 1.</p>':'<p class="mx-snote">To cable it to an ATEM input you can also click this OUT and then the ATEM input on its rear panel.</p>');
  m.style.left=Math.min(ev.clientX,innerWidth-300)+'px';m.style.top=Math.max(10,Math.min(ev.clientY-40,innerHeight-m.offsetHeight-10))+'px';m.classList.add('on');
  m.querySelectorAll('button').forEach(b=>b.onclick=()=>{const v=b.dataset.v;if(d==='o'&&v.startsWith('atem'))st.cabOut.forEach((x,o)=>{if(x===v)st.cabOut[o]='none';});(d==='i'?st.cabIn:st.cabOut)[k]=v;save();m.classList.remove('on');draw();window.ATEMR&&ATEMR.redraw();});}
function loadPack(files){let n=0;Object.values(PACK.v).forEach(v=>{v.pause();URL.revokeObjectURL(v.src);});PACK.v={};
  [...files].forEach(f=>{const m=f.name.match(/^CAM(\d)\.(mp4|mov|m4v|webm)$/i);if(!m)return;const v=document.createElement('video');v.src=URL.createObjectURL(f);v.muted=true;v.loop=true;v.playsInline=true;PACK.v[+m[1]]=v;n++;});
  const vs=Object.values(PACK.v);vs.forEach(v=>{v.currentTime=0;v.play().catch(()=>{});});   // all start together = in sync (the files are synced)
  U.msg=n?`Pack loaded: ${n} cameras`:'No CAM1-8 files in that folder';draw();
}
/* ---------- events ---------- */
function wire(){const tip=document.getElementById('vh-tip'),fs=document.getElementById('vh-fsvg');
  document.getElementById('vh-close').onclick=()=>window.closeVideohub();


  const gd=document.getElementById('vh-guide');document.getElementById('vh-guidebtn').onclick=()=>gd.classList.toggle('on');document.getElementById('vh-guideclose').onclick=()=>gd.classList.remove('on');
  const pd=document.getElementById('vh-packdir');document.getElementById('vh-pack').onclick=()=>pd.click();pd.onchange=()=>{loadPack(pd.files);pd.value='';};
  document.getElementById('vh-reset').onclick=()=>{if(!confirm('Put every output back on its own input (OUT n ← IN n)?'))return;st=JSON.parse(JSON.stringify(DEF));save();U.pend=null;draw();};
  fs.addEventListener('pointerdown',e=>{const k=e.target.closest('.vh-k');if(!k)return;e.preventDefault();const id=k.dataset.k;if(id==='blank')return;
    k.classList.add('down');const up=()=>{k.classList.remove('down');clearTimeout(U.holdT);removeEventListener('pointerup',up);};addEventListener('pointerup',up);
    press(id);if(id==='dest'&&!U.menu){U.holdT=setTimeout(()=>{st.locks[U.dest]=!st.locks[U.dest];save();U.pend=null;U.msg=st.locks[U.dest]?'Locked':'Unlocked';draw();},2000);}draw();});
  const kn=fs.querySelector('.vh-knob');let y0=null,acc=0;
  kn.addEventListener('pointerdown',e=>{e.preventDefault();y0=e.clientY;acc=0;try{kn.setPointerCapture(e.pointerId);}catch(_){}});
  kn.addEventListener('pointermove',e=>{if(y0==null)return;acc+=(y0-e.clientY);y0=e.clientY;while(Math.abs(acc)>=10){const d=Math.sign(acc);acc-=d*10;spin(-d);rot(d);draw();}});
  kn.addEventListener('pointerup',()=>{y0=null;});
  kn.addEventListener('wheel',e=>{e.preventDefault();const d=e.deltaY>0?1:-1;spin(d);rot(-d);draw();},{passive:false});
  let ang=0;function rot(d){ang+=d*-18;kn.querySelector('.vh-knd').setAttribute('transform',`rotate(${ang} ${X(0.798)} ${Y(0.48)})`);}
  
  root.addEventListener('click',e=>{const m=document.getElementById('vh-plugmenu');if(!m.contains(e.target)&&!e.target.closest('.vh-sock'))m.classList.remove('on');});
  root.addEventListener('mousemove',e=>{const t=e.target.closest('[data-tip],.vh-sock');if(!t){tip.classList.remove('on');return;}
    let name='',txt=t.dataset.tip||'';
    if(t.classList.contains('vh-sock')){const d=t.dataset.s[0],k=+t.dataset.s.slice(1);name=(d==='i'?'SDI IN ':'SDI OUT ')+(k+1);
      txt=d==='i'?`Cabled: ${st.cabIn[k]==='none'?'not known yet':SRCS[st.cabIn[k]]}${SRCL[st.cabIn[k]]?' ('+SRCL[st.cabIn[k]]+')':''}. Feeds: ${st.routes.map((r,o)=>r===k&&st.cabOut[o]!=='none'?'OUT '+(o+1):null).filter(Boolean).join(', ')||'no used output'}. `
        :`Feeds: ${st.cabOut[k]==='none'?'not known yet':DSTS[st.cabOut[k]]}. Carrying IN ${st.routes[k]+1} (${inLab(st.routes[k])}).`;}
    else if(t.classList.contains('vh-k'))name=(t.dataset.k.startsWith('n')?'Key '+t.dataset.k.slice(1):t.dataset.k.toUpperCase());
    else if(t.classList.contains('vh-cab'))name='SDI cable (BNC)';
    else if(t.classList.contains('at-k'))name='ATEM · '+(t.querySelector('text')?[...t.querySelectorAll('text')].map(x=>x.textContent).join(' '):t.dataset.k);
    tip.innerHTML=(name?`<b>${name}</b>`:'')+`<span>${txt}</span>`;tip.style.left=e.clientX+'px';tip.style.top=e.clientY+'px';tip.classList.add('on');});
  root.addEventListener('mouseleave',()=>tip.classList.remove('on'));}
let raf=0;function loop(){raf=requestAnimationFrame(loop);if(!root.classList.contains('on'))return;U.blink++;if(U.video||U.blink%30===0)drawLcd();}
window.openVideohub=()=>{build();root.classList.add('on');draw();if(!raf)loop();};
window.closeVideohub=()=>{root.classList.remove('on');document.getElementById('vh-tip')?.classList.remove('on');};
window.VH={plugMenu,save:()=>{save();draw();window.ATEMR&&ATEMR.redraw();},DEF,state:()=>st,inputLabel:inLab,outputLabel:outLab,frame:(o,c,w,h)=>sigFrame(c,st.routes[o],w,h)};   // for the ATEM / multiview later
})();
