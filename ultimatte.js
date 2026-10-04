/* Blackmagic Ultimatte 12 HD (×2) + Ultimatte Smart Remote 4 — chroma keying (docs/ultimatte-spec.md).
 * FG = router OUT cabled to "Ultimatte n FG", BG = router OUT cabled to "Ultimatte n BG"; PGM OUT goes back into the router.
 * Matte (1 = background): green dominance vs the sampled backing, then Matte Density, Black Gloss, Red / Blue Density,
 * Clean Up, Shadow; Flare = spill suppression. Monitor Output: Program, FG, BG, Combined Matte, Internal Matte, Fill Out.
 * Also a test "chroma camera" (presenter on green) so there is something to key. Not affiliated with Blackmagic Design. */
(function(){
const root=document.getElementById('um');if(!root)return;
const CW=320,CH=180,mk=(w=CW,h=CH)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const PAGES={MATTE:[['Matte Density',-100,300,0],['Black Gloss',0,100,0],['Red Density',0,100,100],['Blue Density',0,100,100],['Clean Up Level',0,100,0],['Shadow Level',100,200,100],['Shadow Threshold',0,100,100],['Veil Master',0,100,0]],
  FOREGROUND:[['Flare Level',0,200,100],['White Level',0,200,100],['Black Level',-100,100,0],['Saturation',0,200,100],['Contrast',0,200,100],['',0,0,0],['',0,0,0],['',0,0,0]],
  BACKGROUND:[['BG Level',0,200,100],['BG Saturation',0,200,100],['',0,0,0],['',0,0,0],['',0,0,0],['',0,0,0],['',0,0,0],['',0,0,0]]};
const TABS=['MATTE','FOREGROUND','BACKGROUND','LAYER','MATTE IN','SETTINGS'],MONS=['Program','Foreground Input','Background Input','Combined Matte','Internal Matte','Fill Out'];
const defVals=()=>Object.fromEntries(Object.entries(PAGES).map(([k,v])=>[k,v.map(p=>p[3])]));
const U=[1,2].map(n=>({n,vals:defVals(),backing:[40,170,60],mon:0,preset:0,quick:{},lock:false,menu:null,out:mk(),monCv:mk(),fg:mk(),bg:mk(),online:true}));
const R={unit:0,tab:'MATTE',alt:false,msg:'',mt:0};
const val=(u,page,i)=>u.vals[page][i];
/* ---------- the test chroma camera: presenter on a green cyc (wrinkles, floor shadow, a bit of spill) ---------- */
const gsC=mk(480,270);
const CV={v:null,name:''};
function chromaCam(t){const g=gsC.getContext('2d'),w=480,h=270,sw=Math.sin(t/900)*6;if(CV.v&&CV.v.readyState>=2){g.drawImage(CV.v,0,0,w,h);return gsC;}   // a green-screen video loaded by the student
  const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#2fae4a');gr.addColorStop(.75,'#36b84f');gr.addColorStop(1,'#2a9c43');g.fillStyle=gr;g.fillRect(0,0,w,h);
  g.strokeStyle='rgba(20,90,35,.35)';g.lineWidth=3;for(let i=0;i<5;i++){g.beginPath();g.moveTo(60+i*90,0);g.bezierCurveTo(80+i*90,90,40+i*90,160,70+i*90,210);g.stroke();}   // wrinkles
  const sh=g.createRadialGradient(240+sw,250,10,240+sw,250,120);sh.addColorStop(0,'rgba(0,40,10,.45)');sh.addColorStop(1,'rgba(0,40,10,0)');g.fillStyle=sh;g.fillRect(0,200,w,70);   // floor shadow
  const x=240+sw;g.fillStyle='#4a6fd6';g.beginPath();g.moveTo(x-70,h);g.quadraticCurveTo(x-72,150,x,140);g.quadraticCurveTo(x+72,150,x+70,h);g.fill();   // jacket
  g.fillStyle='#e8eef5';g.beginPath();g.moveTo(x-18,142);g.lineTo(x,190);g.lineTo(x+18,142);g.fill();
  g.fillStyle='#d9a98a';g.beginPath();g.ellipse(x,108,28,36,0,0,7);g.fill();g.fillStyle='#3a2a1e';g.beginPath();g.ellipse(x,86,30,20,0,Math.PI,0);g.fill();
  g.strokeStyle='rgba(80,200,90,.45)';g.lineWidth=3;g.beginPath();g.ellipse(x,108,28,36,0,0,7);g.stroke();   // green spill on the edges
  return gsC;}
window.VH_SOURCES=window.VH_SOURCES||{};VH_SOURCES.gscam=(c,w,h)=>{c.drawImage(chromaCam(performance.now()),0,0,w,h);};
/* ---------- keyer ---------- */
const hubOutFor=k=>window.VH?VH.state().cabOut.indexOf(k):-1;
let depth=0;
function grab(dest,c){const o=hubOutFor(dest);if(o<0||!window.VH)return false;const g=c.getContext('2d',{willReadFrequently:true});g.fillStyle='#000';g.fillRect(0,0,CW,CH);return VH.frame(o,g,CW,CH)!==false;}
function process(u){const now=performance.now();if(depth||now-(u.t||0)<35)return;u.t=now;depth++;try{   /* once per frame even if several outputs read it */
  const okF=grab('u'+u.n+'fg',u.fg),okB=grab('u'+u.n+'bg',u.bg);u.okF=okF;u.okB=okB;const og=u.out.getContext('2d'),mg=u.monCv.getContext('2d');
  if(!okF){og.fillStyle='#000';og.fillRect(0,0,CW,CH);if(okB)og.drawImage(u.bg,0,0);mg.drawImage(u.out,0,0);return;}
  const F=u.fg.getContext('2d',{willReadFrequently:true}).getImageData(0,0,CW,CH),B=u.bg.getContext('2d',{willReadFrequently:true}).getImageData(0,0,CW,CH),f=F.data,b=B.data;
  const O=og.createImageData(CW,CH),o=O.data,M=mg.createImageData(CW,CH),mo=M.data;const ch=u.ch||1,oth=[[1,2],[0,2],[0,1]][ch];   // backing channel (green by default)
  const V=p=>val(u,'MATTE',p),Fg=p=>val(u,'FOREGROUND',p),Bg=p=>val(u,'BACKGROUND',p);
  const bk=u.backing,bDom=Math.max(8,bk[ch]-Math.max(bk[oth[0]],bk[oth[1]])),dens=V(0)/100*.3,gloss=V(1)/100,rd=V(2)/100,bd=V(3)/100,cu=V(4)/100,shL=(V(5)-100)/100,shT=V(6)/100,veil=V(7)/100;
  const flare=Fg(0)/100,wl=Fg(1)/100,bl=Fg(2)/100*.3,sat=Fg(3)/100,con=Fg(4)/100,bgl=Bg(0)/100,bgs=Bg(1)/100,bLum=(bk[0]+bk[1]+bk[2])/3;
  for(let i=0;i<f.length;i+=4){let c=[f[i],f[i+1],f[i+2]];const d=c[ch]-Math.max(rd*c[oth[0]],bd*c[oth[1]]);let m=Math.min(1,Math.max(0,d/bDom));
    m=Math.min(1,Math.max(0,(m-dens)/(1-Math.min(.95,dens))));const lum=(c[0]+c[1]+c[2])/765;m*=1-gloss*Math.max(0,.5-lum)*2;m=Math.min(1,m/(1-cu*.45));
    const sp=c[ch]-Math.max(c[oth[0]],c[oth[1]]);if(sp>0)c[ch]-=sp*Math.min(1,flare);   // flare: spill suppression
    for(let k=0;k<3;k++){let v=c[k]/255;v=(v-.5)*con+.5;v=v*wl+bl-veil*.1;c[k]=v*255;}const y=(c[0]+c[1]+c[2])/3;for(let k=0;k<3;k++)c[k]=y+(c[k]-y)*sat;
    const sf=1-Math.max(0,1-(f[i]+f[i+1]+f[i+2])/3/Math.max(1,bLum))*shL*shT;let bc=[b[i]*bgl,b[i+1]*bgl,b[i+2]*bgl];const by=(bc[0]+bc[1]+bc[2])/3;bc=bc.map(v=>(by+(v-by)*bgs)*Math.max(0,sf));
    for(let k=0;k<3;k++)o[i+k]=c[k]*(1-m)+bc[k]*m;o[i+3]=255;
    const mode=u.mon;let r,g2,b2;if(mode===0){r=o[i];g2=o[i+1];b2=o[i+2];}else if(mode===1){r=f[i];g2=f[i+1];b2=f[i+2];}else if(mode===2){r=b[i];g2=b[i+1];b2=b[i+2];}
    else if(mode===3||mode===4){r=g2=b2=m*255;}else{r=c[0]*(1-m);g2=c[1]*(1-m);b2=c[2]*(1-m);}mo[i]=r;mo[i+1]=g2;mo[i+2]=b2;mo[i+3]=255;}
  og.putImageData(O,0,0);mg.putImageData(M,0,0);}finally{depth--;}}
function autoKey(u){if(!u.okF){grab('u'+u.n+'fg',u.fg);}const d=u.fg.getContext('2d',{willReadFrequently:true}).getImageData(0,0,CW,CH).data,ch=u.ch||1,oth=[[1,2],[0,2],[0,1]][ch],c=[];
  for(let i=0;i<d.length;i+=16){const dom=d[i+ch]-Math.max(d[i+oth[0]],d[i+oth[1]]);c.push([dom,d[i],d[i+1],d[i+2]]);}c.sort((a,b)=>b[0]-a[0]);const top=c.slice(0,Math.max(1,c.length/20|0));
  u.backing=[1,2,3].map(k=>top.reduce((s,x)=>s+x[k],0)/top.length);flash('Auto Key: backing colour sampled');}
window.VH_SOURCES.ult1=(c,w,h)=>{const u=U[0];if(!depth)process(u);if(!u.okF&&!u.okB)return false;c.drawImage(u.out,0,0,w,h);};
window.VH_SOURCES.ult2=(c,w,h)=>{const u=U[1];if(!depth)process(u);if(!u.okF&&!u.okB)return false;c.drawImage(u.out,0,0,w,h);};
/* ---------- drawing: 12 HD fronts (half rack) ---------- */
function hdFront(i){const W=475,H=100,X=f=>f*W,Y=f=>f*H,k=(id,fx,fy,l)=>`<g class="um-k" data-u="${i}" data-k="${id}" data-tip="${{p1:'Quick preset 1',p2:'Quick preset 2',p3:'Quick preset 3',menu:'MENU: setup, network, matte status (backing colour, Auto Key), input status.',set:'SET: select / confirm in the menu.',lock:'LOCK: hold 1 s = lock, 2 s = unlock.'}[id]}"><rect x="${X(fx)-14}" y="${Y(fy)-11}" width="28" height="22" rx="3"/><text x="${X(fx)}" y="${Y(fy)+3}" class="um-kt">${l}</text></g>`;
  return `<svg viewBox="0 0 ${W} ${H}" class="vh-svg um-hd" data-u="${i}"><rect x="1" y="1" width="${W-2}" height="${H-2}" rx="6" class="at-face"/>
    <text x="${X(.03)}" y="${Y(.24)}" class="um-name">Ultimatte <tspan font-style="italic">12</tspan> <tspan fill="#f29a2e">HD</tspan></text><text x="${X(.03)}" y="${Y(.42)}" class="um-tape">${i+1}</text>
    <rect x="${X(.02)}" y="${Y(.5)}" width="${X(.09)}" height="${Y(.4)}" rx="3" class="vh-rj" data-tip="USB-C (behind the cover): Ultimatte Setup."/>
    ${k('p1',.495,.23,'1')}${k('p2',.495,.5,'2')}${k('p3',.495,.77,'3')}${k('menu',.569,.23,'MENU')}${k('set',.569,.5,'SET')}${k('lock',.569,.77,'LOCK')}
    <rect x="${X(.644)}" y="${Y(.09)}" width="${X(.224)}" height="${Y(.81)}" rx="2" class="vh-lcdb"/><text x="${X(.935)}" y="${Y(.17)}" class="at-logo" style="font-size:6px">Blackmagicdesign</text>
    <g class="vh-knob um-knob" data-u="${i}" data-tip="Knob: scrolls the LCD menu."><circle cx="${X(.933)}" cy="${Y(.57)}" r="${X(.045)}" class="vh-kn"/><circle cx="${X(.933)}" cy="${Y(.57)}" r="${X(.038)}" class="vh-kn2"/></g></svg><canvas class="um-lcd" data-u="${i}" width="240" height="180"></canvas>`;}
/* ---------- 12 HD rear, the 16-port switch, Smart Remote 4 connector edge (cabling) ---------- */
const bncU=(cx,cy,r=8)=>`<circle cx="${cx}" cy="${cy}" r="${r}" class="vh-bnc"/><circle cx="${cx}" cy="${cy}" r="${r*.62}" class="vh-bnc2"/><circle cx="${cx}" cy="${cy}" r="${r*.18}" class="vh-bnc3"/>`;
function hdRear(i){const W=475,H=100,X=f=>f*W,Y=f=>f*H,T=(x,y,t)=>`<text x="${X(x)}" y="${Y(y)}" class="um-rt">${t}</text>`;
  const sock=(id,x,y,lab,tip)=>`<g class="um-s" data-s="u${i}:${id}" data-tip="${tip}">${bncU(X(x),Y(y))}</g>`+T(x,y+(y<.5?.2:.22),lab);
  return `<svg viewBox="0 0 ${W} ${H}" class="vh-svg"><rect x="1" y="1" width="${W-2}" height="${H-2}" rx="6" class="at-face"/>
    <g data-tip="IEC power inlet (100-240 V)."><rect x="${X(.02)}" y="${Y(.15)}" width="${X(.105)}" height="${Y(.65)}" rx="3" class="vh-iec2"/></g>
    <g data-tip="GPIO (DE-15): tally input from a GPI interface."><rect x="${X(.217)-14}" y="${Y(.27)-6}" width="28" height="12" rx="4" class="vh-rj"/></g>${T(.217,.42,'GPIO')}
    <g class="um-s" data-s="u${i}:eth" data-tip="ETHERNET: to the rack network switch — the Smart Remote 4 (and Ultimatte Software Control) control the unit over the network."><rect x="${X(.207)-10}" y="${Y(.68)-8}" width="20" height="16" rx="2" class="vh-rj"/></g>${T(.207,.92,'ETHERNET')}
    ${sock('refo',.392,.27,'REF OUT','Reference output.')}${sock('refi',.392,.68,'REF IN','Reference input (same sync as the ATEM).')}
    ${sock('bg',.5,.68,'BACKGROUND','BACKGROUND: the picture that goes behind the presenter.')}${sock('fgl',.587,.27,'CAMERA FG LOOP','Loop of the camera input.')}${sock('fg',.587,.68,'CAMERA FG','CAMERA FG: the camera on the green screen.')}
    ${sock('fill',.675,.27,'PGM FILL','PGM FILL: foreground with the green removed (for a linear key in the switcher).')}${sock('gm',.675,.68,'G MATTE','Garbage matte input.')}
    ${sock('matte',.762,.27,'PGM MATTE','PGM MATTE: the key signal (for a linear key in the switcher).')}${sock('hm',.762,.68,'H MATTE','Holdout matte input.')}
    ${sock('pgm',.85,.27,'PGM OUT','PGM OUT: the finished composite.')}${sock('mono',.938,.27,'MON OUT','Monitor output (MONITOR OUTPUT selection).')}${sock('moni',.938,.68,'MON IN','Monitor input.')}
    <path d="M${X(.55)} ${Y(.05)}v-2H${X(.98)}v2" class="vh-brk"/></svg>`;}
function switchFront(){const W=1080,H=60,X=f=>f*W;let s=`<svg viewBox="0 0 ${W} ${H}" class="vh-svg"><rect x="1" y="1" width="${W-2}" height="${H-2}" rx="6" class="ob-silver"/><text x="${X(.03)}" y="34" class="ob-sm">Longshine LCS-GS8116 · 16 Port Gigabit Switch</text>`;
  for(let k=0;k<16;k++){const x=X(.42+(k%8)*.065),y=k<8?18:40;s+=`<g class="um-s" data-s="sw:${k}" data-tip="Switch port ${k+1}"><rect x="${x-11}" y="${y-8}" width="22" height="16" rx="2" class="vh-rj"/></g>`;}
  return s+'</svg>';}
function srRear(){const W=1000,H=56,X=f=>f*W,T=(x,t)=>`<text x="${X(x)}" y="52" class="um-rt">${t}</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" class="vh-svg"><rect x="1" y="1" width="${W-2}" height="${H-12}" rx="8" class="at-face"/><rect x="${X(.27)}" y="8" width="${X(.27)}" height="26" rx="3" class="ob-dark"/>
    <g data-tip="+12V DC power input (locking)."><circle cx="${X(.29)}" cy="21" r="7" class="vh-rj"/></g>${T(.29,'+12V DC')}
    <g data-tip="USB-C 3.0"><rect x="${X(.33)-6}" y="18" width="12" height="6" rx="3" class="vh-rj"/><rect x="${X(.36)-6}" y="18" width="12" height="6" rx="3" class="vh-rj"/></g>${T(.345,'USB-C 3.0')}
    <g class="um-s" data-s="sr:eth1" data-tip="ETHERNET 1: to the network switch (the Ultimattes are on the same network)."><rect x="${X(.405)-10}" y="13" width="20" height="16" rx="2" class="vh-rj"/></g><g class="um-s" data-s="sr:eth2" data-tip="ETHERNET 2"><rect x="${X(.44)-10}" y="13" width="20" height="16" rx="2" class="vh-rj"/></g>${T(.42,'ETHERNET')}
    <g data-tip="HDMI out: an extra monitor."><rect x="${X(.49)-11}" y="16" width="22" height="9" rx="2" class="vh-rj"/></g>${T(.49,'HDMI OUT')}</svg>`;}
/* the cables (rope physics shared with the video rack) */
function cableList(){const L=[{a:'[data-s="u0:eth"]',hang:34,tag:'Network',info:'Ethernet → the rack network switch: the Smart Remote 4 controls this unit through it'},{a:'[data-s="u1:eth"]',hang:34,tag:'Network',info:'Ethernet → the rack network switch'}];
  const st=window.VH?VH.state():null;if(st){const o=d=>st.cabOut.indexOf(d),i=v=>st.cabIn.indexOf(v);
    const src=k=>{const r=st.routes[o(k)];return window.VH?VH.inputLabel(r):'';};
    if(o('u1fg')>=0)L.push({a:'[data-s="u0:fg"]',hang:34,tag:'← Videohub OUT '+(o('u1fg')+1),info:`${src('u1fg')} → Videohub → OUT ${o('u1fg')+1} → Ultimatte 1 CAMERA FG (the camera arrives through the Videohub)`});
    if(o('u1bg')>=0)L.push({a:'[data-s="u0:bg"]',hang:34,tag:'← Videohub OUT '+(o('u1bg')+1),info:`${src('u1bg')} → Videohub → OUT ${o('u1bg')+1} → Ultimatte 1 BACKGROUND`});
    if(i('ult1')>=0)L.push({a:'[data-s="u0:pgm"]',hang:-30,tag:'→ Videohub IN '+(i('ult1')+1),info:`Ultimatte 1 PGM OUT → Videohub IN ${i('ult1')+1} (from there to the ATEM)`});
    if(o('u2fg')>=0)L.push({a:'[data-s="u1:fg"]',hang:34,tag:'← Videohub OUT '+(o('u2fg')+1),info:'Videohub → Ultimatte 2 CAMERA FG'});if(i('ult2')>=0)L.push({a:'[data-s="u1:pgm"]',hang:-30,tag:'→ Videohub IN '+(i('ult2')+1),info:'Ultimatte 2 PGM OUT → Videohub'});}
  return L;}
let ropes=null;
/* ---------- Smart Remote 4 ---------- */
function sr4(){const W=1000,H=406,X=f=>f*W,Y=f=>f*H,b=(id,fx,fy,l,tip,w=30,h=22)=>`<g class="um-k um-sr" data-k="${id}" data-tip="${tip}"><rect x="${X(fx)-w/2}" y="${Y(fy)-h/2}" width="${w}" height="${h}" rx="3"/>${l?`<text x="${X(fx)}" y="${Y(fy)+4}" class="um-kt">${l}</text>`:''}</g>`;
  let s=`<svg viewBox="0 0 ${W} ${H}" class="vh-svg" id="um-sr"><rect x="2" y="2" width="${W-4}" height="${H-4}" rx="14" class="at-face"/><circle cx="${X(.062)}" cy="${Y(.09)}" r="12" class="vh-bnc2"/><text x="${X(.19)}" y="${Y(.17)}" class="um-logo">ultimatte</text>
    <text x="${X(.175)}" y="${Y(.26)}" class="um-st"><tspan fill="#36d36e">ONLINE</tspan> / <tspan fill="#ff3b30">ON AIR</tspan></text><text x="${X(.035)}" y="${Y(.47)}" class="um-st" transform="rotate(-90 ${X(.035)} ${Y(.47)})" fill="#4aa3ff">UNITS</text>`;
  [0,1,2,3,4,5,6,7].forEach(i=>{const x=[.099,.144,.188,.231][i%4],y=i<4?.38:.53;s+=`<text x="${X(x)}" y="${Y(y)-16}" class="um-st um-un" data-un="${i}">${i+1}</text>`+b('unit'+i,x,y,'',`Unit ${i+1}: select which Ultimatte the remote controls (only 1 and 2 exist here).`);});
  s+=b('alt',.056,.68,'ALT','ALT: hold it (here: click it first) + QUICK LOAD = quick save; + FILE CLEAR = Auto Key with user presets.')+b('fileclear',.229,.68,'FILE','FILE CLEAR: Auto Key — samples the backing colour and makes the key again.',40,22);
  s+=`<text x="${X(.229)}" y="${Y(.68)+30}" class="um-st">CLEAR</text>`;
  [1,2,3,4,5].forEach((n,i)=>s+=`<text x="${X([.056,.099,.142,.186,.229][i])}" y="${Y(.82)-16}" class="um-st">${n}</text>`+b('ql'+n,[.056,.099,.142,.186,.229][i],.82,'',`QUICK LOAD ${n}: load quick preset ${n} (with ALT: save it).`));
  s+=`<text x="${X(.142)}" y="${Y(.93)}" class="um-st">QUICK LOAD</text><text x="${X(.142)}" y="${Y(.97)}" class="um-st" fill="#666">QUICK SAVE</text>`;
  [0,1,2,3].forEach(i=>{[[.309,i],[.938,i+4]].forEach(([x,n])=>s+=`<g class="vh-knob um-srk" data-n="${n}" data-tip="Knob ${n+1}: the control shown next to it on the screen. Drag up/down or scroll; Shift+click = default."><circle cx="${X(x)}" cy="${Y([.19,.39,.59,.79][i])}" r="${X(.027)}" class="vh-kn"/><circle cx="${X(x)}" cy="${Y([.19,.39,.59,.79][i])}" r="${X(.022)}" class="vh-kn2"/></g>`);});
  s+=`<rect x="${X(.375)}" y="${Y(.1)}" width="${X(.501)}" height="${Y(.75)}" rx="4" class="vh-lcdb"/><text x="${X(.625)}" y="${Y(.95)}" class="um-st" style="letter-spacing:.4em">SMART │ REMOTE │ <tspan fill="#4aa3ff">4</tspan></text>`;
  return s+'</svg><canvas id="um-touch" width="800" height="500"></canvas>';}
/* ---------- screens ---------- */
function drawHdLcd(i){const u=U[i],c=root.querySelector(`.um-lcd[data-u="${i}"]`);if(!c)return;const g=c.getContext('2d'),w=240,h=180;g.fillStyle='#000';g.fillRect(0,0,w,h);
  if(u.menu){g.fillStyle='#eef1f4';g.fillRect(0,0,w,h);g.fillStyle='#2b6fd6';g.fillRect(0,0,w,26);g.fillStyle='#fff';g.font='700 13px sans-serif';g.fillText(['Matte Status','Input Status','Network'][u.menu.p],8,18);g.fillStyle='#222';g.font='600 12px sans-serif';
    if(u.menu.p===0){g.fillText('Screen Reference Color: '+['Red','Green','Blue'][u.ch??1],8,52);g.fillText('Auto Key  ⟲  (SET)',8,76);}else if(u.menu.p===1){g.fillText('Foreground: '+(u.okF?'OK':'No Input'),8,52);g.fillText('Background: '+(u.okB?'OK':'No Input'),8,72);g.fillText('Reference: OK',8,92);}
    else{g.fillText('IP Address: 192.168.11.'+(60+i),8,52);g.fillText('Default: 192.168.10.220',8,72);}g.fillStyle='#666';g.font='600 10px sans-serif';g.fillText('Knob = page · SET = action · MENU = exit',8,h-10);return;}
  g.drawImage(u.out,0,0,w,135);g.fillStyle='rgba(0,0,0,.6)';g.fillRect(0,0,w,20);g.fillStyle='#fff';g.font='600 11px sans-serif';g.fillText('Ultimatte 12 HD '+(i+1),6,14);g.textAlign='right';g.fillText('1080i50',w-6,14);g.textAlign='left';
  g.fillStyle='#000';g.fillRect(0,135,w,45);g.fillStyle=u.okF?'#fff':'#ffb02e';g.font='800 20px sans-serif';g.fillText(u.okF?'STANDBY':'No Cam',8,166);g.font='600 10px sans-serif';g.fillStyle='#8b949e';g.fillText(R.msg&&R.unit===i?R.msg:'',110,166);
  root.querySelectorAll(`.um-k[data-u="${i}"]`).forEach(k=>{const id=k.dataset.k;k.classList.toggle('green',/^p\d$/.test(id)&&!!u.quick[+id[1]]&&u.preset!==+id[1]);k.classList.toggle('blue',/^p\d$/.test(id)&&u.preset===+id[1]);k.classList.toggle('red',id==='lock'&&u.lock);});}
function drawTouch(){const c=document.getElementById('um-touch');if(!c)return;const g=c.getContext('2d'),w=800,h=500,u=U[R.unit];g.fillStyle='#14181d';g.fillRect(0,0,w,h);g.textBaseline='middle';
  const P=PAGES[R.tab];TABS.forEach((t,i)=>{const x=150+i*84;g.fillStyle=t===R.tab?'#1f8a85':'#262c33';g.fillRect(x,8,80,30);g.fillStyle='#fff';g.font='700 11px sans-serif';g.textAlign='center';g.fillText(t,x+40,23);});
  g.textAlign='left';g.fillStyle='#fff';g.font='700 18px sans-serif';g.fillText(R.tab,150,64);g.fillStyle='#ffcf5a';g.font='600 13px sans-serif';g.fillText('⟲ auto key',300,64);
  [0,1,2,3,4,5,6,7].forEach(n=>{const left=n<4,x=left?10:w-130,y=60+(n%4)*105;g.fillStyle='#1d2228';g.fillRect(x,y,120,95);const p=P&&P[n];
    if(p&&p[0]){const v=val(u,R.tab,n),f=(v-p[1])/(p[2]-p[1]);g.fillStyle='#c9d1d9';g.font='600 11px sans-serif';g.textAlign='center';g.fillText(p[0],x+60,y+14);g.strokeStyle='#33404c';g.lineWidth=6;g.beginPath();g.arc(x+60,y+52,24,Math.PI*.75,Math.PI*2.25);g.stroke();
      g.strokeStyle='#1fb5ad';g.beginPath();g.arc(x+60,y+52,24,Math.PI*.75,Math.PI*(.75+1.5*f));g.stroke();g.fillStyle='#fff';g.font='700 13px sans-serif';g.fillText(Math.round(v)+' %',x+60,y+84);}});
  g.textAlign='left';
  if(!P){g.fillStyle='#8b949e';g.font='600 14px sans-serif';g.fillText(R.tab==='SETTINGS'?'Backing colour:':R.tab+': not used in this room (no layer / matte inputs cabled).',150,110);
    if(R.tab==='SETTINGS')['Red','Green','Blue'].forEach((t,i)=>{const x=150+i*90;g.fillStyle=(u.ch??1)===i?['#c0392b','#1e8449','#2e6fd6'][i]:'#262c33';g.fillRect(x,130,80,34);g.fillStyle='#fff';g.font='700 12px sans-serif';g.fillText(t,x+22,147);});}
  else{g.fillStyle='#8b949e';g.font='600 12px sans-serif';g.fillText(R.tab==='MATTE'?'1. FILE CLEAR / ⟲ = Auto Key   2. Matte Density (look at Combined Matte)   3. Clean Up · Shadow':R.tab==='FOREGROUND'?'Flare = how much green spill is removed from the presenter':'Level and saturation of the background',150,100,500);}
  g.fillStyle='#fff';g.font='700 12px sans-serif';g.fillText('MONITOR OUTPUT',150,300);MONS.forEach((m,i)=>{const x=150+(i%3)*170,y=315+Math.floor(i/3)*44;g.fillStyle=u.mon===i?'#1f8a85':'#262c33';g.fillRect(x,y,162,36);g.fillStyle='#fff';g.font='600 12px sans-serif';g.fillText(m,x+10,y+18);});
  for(let k=0;k<8;k++){const x=150+k*62,y=h-34;g.fillStyle=k===R.unit?'#2e6fd6':k<2?'#1e8449':'#2a2f35';g.fillRect(x,y,56,24);g.fillStyle='#fff';g.font='700 11px sans-serif';g.fillText(String(k+1),x+24,y+12);}
  g.fillStyle='#c9d1d9';g.font='600 11px sans-serif';g.fillText('Preset: '+(u.preset?'Quick '+u.preset:'Ultimatte Defaults')+'   ·   Ultimatte 12 HD   ·   Backing: ',150,h-50);g.fillStyle=`rgb(${u.backing.map(Math.round)})`;g.fillRect(560,h-58,16,16);
  if(R.msg){g.fillStyle='#ffcf5a';g.font='700 13px sans-serif';g.fillText(R.msg,150,270);}
  root.querySelectorAll('.um-sr').forEach(e=>{const k=e.dataset.k;e.classList.toggle('blue',k==='unit'+R.unit);e.classList.toggle('amber',k==='alt'&&R.alt);});
  root.querySelectorAll('.um-un').forEach(e=>{const i=+e.dataset.un;e.setAttribute('fill',i<2?'#36d36e':'#555');});}
function drawMon(){const c=document.getElementById('um-mon');if(!c)return;const u=U[R.unit];c.getContext('2d').drawImage(u.monCv,0,0,c.width,c.height);const l=document.getElementById('um-monl');if(l)l.textContent=`Ultimatte ${R.unit+1} · MON OUT: ${MONS[u.mon]}`;}
function flash(t){R.msg=t;clearTimeout(R.mt);R.mt=setTimeout(()=>{R.msg='';},2500);}
/* ---------- interaction ---------- */
function setVal(n,d,reset){const u=U[R.unit],P=PAGES[R.tab];if(!P||!P[n]||!P[n][0])return;const p=P[n];u.vals[R.tab][n]=reset?p[3]:Math.max(p[1],Math.min(p[2],u.vals[R.tab][n]+d*(p[2]-p[1])/100));u.preset=0;}
function srPress(k){const u=U[R.unit];
  if(k.startsWith('unit')){const i=+k.slice(4);if(i<2)R.unit=i;else flash('Unit '+(i+1)+': no Ultimatte here');return;}
  if(k==='alt'){R.alt=!R.alt;return;}if(k==='fileclear'){autoKey(u);if(R.alt){u.vals=defVals();R.alt=false;}return;}
  const m=/^ql(\d)$/.exec(k);if(m){const n=+m[1];if(R.alt){u.quick[n]=JSON.parse(JSON.stringify({vals:u.vals,backing:u.backing}));R.alt=false;flash('Quick preset '+n+' saved');}else if(u.quick[n]){Object.assign(u,JSON.parse(JSON.stringify(u.quick[n])));u.preset=n;flash('Quick preset '+n+' loaded');}else flash('Quick preset '+n+' is empty (ALT + QUICK LOAD saves it)');}}
function touch(x,y){const u=U[R.unit];if(y<40){const i=Math.floor((x-150)/84);if(i>=0&&i<TABS.length)R.tab=TABS[i];return;}if(y>=56&&y<=72&&x>=300&&x<=380){autoKey(u);return;}
  if(y>=315&&y<=395){const i=Math.floor((x-150)/170)+(y>355?3:0);if(x>=150&&i<6)u.mon=i;return;}if(y>=466){const k=Math.floor((x-150)/62);if(k>=0&&k<2)R.unit=k;return;}
  if(R.tab==='SETTINGS'&&y>=130&&y<=164){const i=Math.floor((x-150)/90);if(i>=0&&i<3){u.ch=i;autoKey(u);}}}
function hdPress(i,k){const u=U[i];if(u.lock&&k!=='lock')return;
  if(/^p\d$/.test(k)){const n=+k[1];if(u.quick[n]){Object.assign(u,JSON.parse(JSON.stringify(u.quick[n])));u.preset=n;}else{R.unit=i;flash('Preset '+n+' empty (save it from the Smart Remote: ALT + QUICK LOAD)');}return;}
  if(k==='menu'){u.menu=u.menu?null:{p:0};return;}if(k==='set'&&u.menu){if(u.menu.p===0)autoKey(u);return;}}
function build(){if(root.dataset.built)return;root.dataset.built='1';
  root.innerHTML=`<div class="pwr-hd"><div><h2>Chroma keying — Ultimatte</h2><div class="kind">2 × Ultimatte 12 HD · Ultimatte Smart Remote 4 (video rack)</div>
    <p><b>FILE CLEAR</b> = Auto Key · the 8 knobs = the 8 controls on the screen · tabs MATTE / FOREGROUND / BACKGROUND · <b>MONITOR OUTPUT</b> = what the monitor shows (Combined Matte to judge the key) · hover anything.</p></div>
    <div class="pwr-btns"><button id="um-load">Load a chroma video…</button><input type="file" id="um-file" accept="video/*" hidden><button id="um-guidebtn">How to use</button><button id="um-rack">Video rack</button></div></div>
    <button class="close" id="um-close" aria-label="Close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
    <div class="um-body" id="um-wrap"><div class="um-row"><div class="um-unit"><div class="vh-lab">ULTIMATTE 12 HD · 1 <span>— front · rear below</span></div><div class="um-hdw">${hdFront(0)}</div>${hdRear(0)}</div>
        <div class="um-unit"><div class="vh-lab">ULTIMATTE 12 HD · 2 <span>— front · rear below</span></div><div class="um-hdw">${hdFront(1)}</div>${hdRear(1)}</div></div>
      <div class="um-row2"><div class="um-srw"><div class="vh-lab">SMART REMOTE 4 <span>— controls the Ultimattes over Ethernet (rack network switch) · its HDMI OUT copies the touch screen to a monitor</span></div><div class="um-srf">${sr4()}</div></div><div class="um-monw"><div class="vh-lab" id="um-monl"></div><canvas id="um-mon" width="640" height="360"></canvas>
        <p class="um-note">Signal path: <b>chroma camera → Videohub IN 11 → OUT 15 → CAMERA FG</b> · <b>CAM 3 → Videohub OUT 16 → BACKGROUND</b> · <b>PGM OUT → Videohub IN 12</b> → (route it on the Videohub front panel) → ATEM. Unit 2 has nothing cabled. Hover a cable to see what it carries.</p></div></div><svg class="vh-cables" id="um-cables"></svg></div>
    <div class="mx-src mx-guide" id="um-guide"><div class="mx-srchd"><b>How to key with the Ultimatte</b> <button id="um-guideclose" aria-label="Close">✕</button></div><ol class="mx-steps">
      <li>Your own footage: <b>Load a chroma video…</b> (a clip shot on green or blue). It replaces the test chroma camera on Videohub IN 11, so it goes Videohub → Ultimatte like a real camera. For a blue screen: SETTINGS › Blue, then Auto Key.</li>
      <li><b>FILE CLEAR</b> (or ⟲ auto key on the screen): the Ultimatte samples the green and makes the key.</li>
      <li><b>MONITOR OUTPUT › Combined Matte</b>: the presenter must be solid <b>black</b>, the green <b>white</b>. Raise <b>Matte Density</b> until no grey is left inside the presenter.</li>
      <li><b>Clean Up</b> removes the wrinkles of the cyc (little by little), <b>Shadow Level</b> keeps the floor shadow on the background, <b>Black Gloss</b> removes green reflections in dark areas.</li>
      <li><b>FOREGROUND › Flare Level</b>: how much green spill is removed from the edges of the presenter.</li>
      <li><b>ALT + QUICK LOAD n</b> saves the look; <b>QUICK LOAD n</b> (or 1 / 2 / 3 on the unit) recalls it. Shift+click a knob = its default.</li>
      <li>On air: router front panel, DEST = an ATEM input, SRC = IN 12 (Ultimatte 1), TAKE — then cut to it on the ATEM.</li></ol></div>
    <div class="pwr-tip" id="um-tip"></div>`;
  document.getElementById('um-close').onclick=()=>window.closeUltimatte();
  const fi=document.getElementById('um-file');document.getElementById('um-load').onclick=()=>fi.click();
  fi.onchange=()=>{const f=fi.files[0];if(!f)return;if(CV.v){CV.v.pause();URL.revokeObjectURL(CV.v.src);}const v=document.createElement('video');v.src=URL.createObjectURL(f);v.loop=true;v.muted=true;v.playsInline=true;v.play().catch(()=>{});CV.v=v;CV.name=f.name;
    document.getElementById('um-load').textContent='Chroma video: '+f.name.slice(0,22);flash('Chroma camera (Videohub IN 11) now plays '+f.name+' — press FILE CLEAR (Auto Key)');fi.value='';};document.getElementById('um-rack').onclick=()=>{window.closeUltimatte();window.openVideohub&&openVideohub();};
  const gd=document.getElementById('um-guide');document.getElementById('um-guidebtn').onclick=()=>gd.classList.toggle('on');document.getElementById('um-guideclose').onclick=()=>gd.classList.remove('on');
  root.addEventListener('pointerdown',e=>{const k=e.target.closest('.um-k');if(k){e.preventDefault();if(k.dataset.u!=null)hdPress(+k.dataset.u,k.dataset.k);else srPress(k.dataset.k);
      if(k.dataset.k==='lock'){const u=U[+k.dataset.u],t0=performance.now(),tm=setInterval(()=>{const t=performance.now()-t0;if(!u.lock&&t>=1000){u.lock=true;clearInterval(tm);}else if(u.lock&&t>=2000){u.lock=false;clearInterval(tm);}},50);addEventListener('pointerup',()=>clearInterval(tm),{once:true});}return;}
    const kn=e.target.closest('.um-srk');if(kn){e.preventDefault();const n=+kn.dataset.n;if(e.shiftKey){setVal(n,0,true);return;}let y0=e.clientY;const mv=ev=>{const d=y0-ev.clientY;if(Math.abs(d)>=3){setVal(n,Math.sign(d));y0=ev.clientY;}};const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);};addEventListener('pointermove',mv);addEventListener('pointerup',up);return;}
    const hk=e.target.closest('.um-knob');if(hk){const u=U[+hk.dataset.u];if(u.menu)u.menu.p=(u.menu.p+1)%3;return;}
    if(e.target.id==='um-touch'){const r=e.target.getBoundingClientRect();touch((e.clientX-r.left)/r.width*800,(e.clientY-r.top)/r.height*500);}});
  root.addEventListener('wheel',e=>{const kn=e.target.closest('.um-srk');if(!kn)return;e.preventDefault();setVal(+kn.dataset.n,e.deltaY<0?1:-1);},{passive:false});
  const tip=document.getElementById('um-tip');root.addEventListener('mousemove',e=>{const t=e.target.closest('[data-tip]');if(!t){tip.classList.remove('on');return;}tip.innerHTML=`<span>${t.dataset.tip}</span>`;tip.style.left=e.clientX+'px';tip.style.top=e.clientY+'px';tip.classList.add('on');});}
let last=0,running=false;function loop(now){requestAnimationFrame(loop);if(!root.classList.contains('on'))return;if(now-last<60)return;last=now;U.forEach(u=>process(u));drawHdLcd(0);drawHdLcd(1);drawTouch();drawMon();}
window.openUltimatte=()=>{build();root.classList.add('on');if(!ropes&&window.ROPES){ropes=ROPES({wrap:()=>document.getElementById('um-wrap'),svg:()=>document.getElementById('um-cables'),list:cableList,active:()=>root.classList.contains('on'),sig:()=>window.VH?JSON.stringify([VH.state().cabIn,VH.state().cabOut]):''});}ropes&&ropes.start();if(window.VH&&!document.getElementById('vh')?.dataset.built){openVideohub();closeVideohub();}if(!running){running=true;requestAnimationFrame(loop);}};
window.closeUltimatte=()=>{root.classList.remove('on');document.getElementById('um-tip')?.classList.remove('on');};
})();
