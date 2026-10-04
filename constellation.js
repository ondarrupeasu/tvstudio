/* Blackmagic ATEM 2 M/E Constellation HD — rack unit, front-panel switching ("emergency switching" in the real manual).
 * Front and rear drawn from the manual's line drawings (docs/constellation-spec.md). Inputs come from the Videohub
 * outputs that are cabled to "ATEM IN n"; DSK 1 = vMix fill (IN 9) + key (IN 10), linear. Program can feed the Videohub
 * and the MULTIVIEW output shows the control-room monitor. Not affiliated with Blackmagic Design. */
(function(){
const PW=1080,PH=100,X=f=>f*PW,Y=f=>f*PH,CW=480,CH=270;
const ST_KEY='atem-state';
const SRCN={bars:'Color Bars',black:'Black',mp1:'Media Player 1',mp2:'Media Player 2',pgm:'Program',pvw:'Preview',clean1:'Clean Feed 1',mv1:'Multiview 1'};
const DEF={outs:['pgm','pvw','pgm','black','black','black','black','black','black','black','black','black'],mode:'pp',rate:25,dskRate:25,ftbRate:25,ip:[192,168,11,50],
  keys:[{type:'dve',fill:2,key:null,size:.35,x:.58,y:-.55},{type:'luma',fill:9,key:10,size:.35,x:-.58,y:-.55},{type:'chroma',fill:1,key:null,size:1,x:0,y:0},{type:'dve',fill:3,key:null,size:.35,x:-.58,y:.55}]};
let st;try{st=Object.assign(JSON.parse(JSON.stringify(DEF)),JSON.parse(localStorage.getItem(ST_KEY))||{});}catch(_){st=JSON.parse(JSON.stringify(DEF));}
if(!st.keys)st.keys=JSON.parse(JSON.stringify(DEF.keys));
const save=()=>{try{localStorage.setItem(ST_KEY,JSON.stringify(st));}catch(_){}};
const S={pgm:1,pvw:2,trans:'mix',T:null,ftb:{on:false,a:0},key1:{on:false,a:0},key2:{on:false,a:0},key3:{on:false,a:0},key4:{on:false,a:0},dsk1:{on:false,a:0,tie:false,cut:false},dsk2:{on:false,a:0,tie:false,cut:false},next:{bkgd:true,k1:false,k2:false,k3:false,k4:false},locked:false,lockFlash:0,
  menu:null,master:0,audioSel:null,msg:''};
const inName=n=>'Camera '+n;   // ATEM default input names
const srcLabel=id=>typeof id==='number'?inName(id):SRCN[id]||id;
/* ---------- signals ---------- */
const mk=(w=CW,h=CH)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const hubOutFor=n=>window.VH?VH.state().cabOut.indexOf('atem'+n):-1;
function bars(g,w,h){['#c0c0c0','#c0c000','#00c0c0','#00c000','#c000c0','#c00000','#0000c0'].forEach((c,i)=>{g.fillStyle=c;g.fillRect(i*w/7,0,w/7+1,h*.75);});g.fillStyle='#101010';g.fillRect(0,h*.75,w,h*.25);}
function src(id,g,w,h){g.fillStyle='#000';g.fillRect(0,0,w,h);
  if(typeof id==='number'){const o=hubOutFor(id);return o>=0&&VH.frame(o,g,w,h)!==false;}
  if(id==='bars'){bars(g,w,h);return true;}
  if(id==='mp1'||id==='mp2'){const gr=g.createLinearGradient(0,0,w,h);gr.addColorStop(0,id==='mp1'?'#1d3557':'#3a0ca3');gr.addColorStop(1,'#000');g.fillStyle=gr;g.fillRect(0,0,w,h);
    g.fillStyle='rgba(255,255,255,.8)';g.font=`700 ${h*.12}px sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText(id==='mp1'?'MEDIA PLAYER 1 · still':'MEDIA PLAYER 2 · still',w/2,h/2);return true;}
  return id==='black';}
/* program = background (+transition) → [clean feed 1] → DSK 1 / DSK 2 → FTB */
const pgmCv=mk(),pvwCv=mk(),cleanCv=mk(),tA=mk(),tB=mk(),fCv=mk(),kCv=mk();
function dskOver(g,a){if(a<=0)return;const fg=fCv.getContext('2d',{willReadFrequently:true}),kg=kCv.getContext('2d',{willReadFrequently:true});
  const okF=src(9,fg,CW,CH),okK=src(10,kg,CW,CH);if(!okF||!okK)return;
  const fd=fg.getImageData(0,0,CW,CH),kd=kg.getImageData(0,0,CW,CH).data,d=fd.data;
  for(let i=0;i<d.length;i+=4)d[i+3]=(kd[i]*.2126+kd[i+1]*.7152+kd[i+2]*.0722)*a;   // linear key: the key signal's luminance = transparency
  fg.putImageData(fd,0,0);g.drawImage(fCv,0,0);}
/* upstream keys (KEY 1-4 of M/E 1): DVE = picture in picture, LUMA = fill cut by the brightness of the key source, CHROMA = green removed */
const kF=mk(),kK=mk();
function keyOver(g,K,a){if(a<=0||K.fill==null)return;const fg=kF.getContext('2d',{willReadFrequently:true});if(!src(K.fill,fg,CW,CH))return;
  if(K.type==='dve'){const w=CW*K.size,h=CH*K.size,x=(CW-w)/2+K.x*CW/2,y=(CH-h)/2+K.y*CH/2;g.globalAlpha=a;g.fillStyle='#fff';g.fillRect(x-2,y-2,w+4,h+4);g.drawImage(kF,x,y,w,h);g.globalAlpha=1;return;}
  const fd=fg.getImageData(0,0,CW,CH),d=fd.data;let kd=null;if(K.type==='luma'&&K.key!=null){const kg=kK.getContext('2d',{willReadFrequently:true});if(src(K.key,kg,CW,CH))kd=kg.getImageData(0,0,CW,CH).data;}
  for(let i=0;i<d.length;i+=4){let al;if(K.type==='chroma'){const gEx=d[i+1]-Math.max(d[i],d[i+2]);al=1-Math.min(1,Math.max(0,(gEx-20)/50));if(gEx>0)d[i+1]-=gEx*(1-al);}
    else{const L=kd?kd[i]*.2126+kd[i+1]*.7152+kd[i+2]*.0722:d[i]*.2126+d[i+1]*.7152+d[i+2]*.0722;al=Math.min(1,Math.max(0,(L-40)/150));}d[i+3]=al*255*a;}
  fg.putImageData(fd,0,0);g.drawImage(kF,0,0);}
function render(){const g=pgmCv.getContext('2d'),T=S.T;
  src(S.pgm,g,CW,CH);
  if(T){const p=T.p,bg=tB.getContext('2d');src(S.pvw,bg,CW,CH);
    if(T.fx==='mix'){g.globalAlpha=p;g.drawImage(tB,0,0);g.globalAlpha=1;}
    else if(T.fx==='dip'){if(p<.5){g.fillStyle=`rgba(0,0,0,${p*2})`;g.fillRect(0,0,CW,CH);}else{g.drawImage(tB,0,0);g.fillStyle=`rgba(0,0,0,${(1-p)*2})`;g.fillRect(0,0,CW,CH);}}
    else if(T.fx==='wipe'){g.save();g.beginPath();g.rect(0,0,CW*p,CH);g.clip();g.drawImage(tB,0,0);g.restore();}
    else{g.drawImage(tB,CW*(1-p),CH*(1-p)/2*0,CW*p+1,CH);}}   // DVE: push in from the right
  [1,2,3,4].forEach(n=>keyOver(g,st.keys[n-1],S['key'+n].a));
  cleanCv.getContext('2d').drawImage(pgmCv,0,0);
  dskOver(g,S.dsk1.a);
  if(S.ftb.a>0){g.fillStyle=`rgba(0,0,0,${S.ftb.a})`;g.fillRect(0,0,CW,CH);}
  src(S.pvw,pvwCv.getContext('2d'),CW,CH);}
function outFrame(id,g,w,h){const c={pgm:pgmCv,pvw:pvwCv,clean1:cleanCv}[id];if(c){g.drawImage(c,0,0,w,h);return true;}if(id==='mv1'){g.drawImage(mvCv,0,0,w,h);return true;}return src(id,g,w,h);}
window.VH_SOURCES=window.VH_SOURCES||{};VH_SOURCES.atem=(g,w,h)=>outFrame(st.outs[0],g,w,h);   // ATEM SDI OUT 1 cabled back into the router (old name)
const aoUsed=k=>!!window.VH&&VH.state().cabIn.some(v=>v==='ao'+(k+1)||(k===0&&v==='atem'));
/* ---------- multiview 1: preview + program on top, inputs 1-8 below ---------- */
const mvCv=mk(960,540);
function drawMV(){const g=mvCv.getContext('2d'),W=960,H=540;g.fillStyle='#000';g.fillRect(0,0,W,H);
  const box=(c,x,y,w,h,lab,tally)=>{if(c)g.drawImage(c,x,y,w,h);g.lineWidth=tally?4:1.5;g.strokeStyle=tally==='pgm'?'#e5372a':tally==='pvw'?'#2fd36b':'#555';g.strokeRect(x+1,y+1,w-2,h-2);
    g.fillStyle='rgba(0,0,0,.65)';g.font='600 13px sans-serif';const tw=g.measureText(lab).width+12;g.fillRect(x+w/2-tw/2,y+h-22,tw,18);g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';g.fillText(lab,x+w/2,y+h-13);};
  box(pvwCv,0,0,W/2,H/2,'Preview','pvw');box(pgmCv,W/2,0,W/2,H/2,'Program','pgm');
  const sm=mk(240,135),sg=sm.getContext('2d');
  for(let i=0;i<8;i++){const n=i+1,ok=src(n,sg,240,135);if(!ok){sg.fillStyle='#000';sg.fillRect(0,0,240,135);}
    const onP=S.pgm===n||(S.T&&S.pvw===n),onV=S.pvw===n;box(sm,(i%4)*240,H/2+Math.floor(i/4)*135,240,135,inName(n)+(ok?'':' — no signal'),onP?'pgm':onV?'pvw':null);}}
/* ---------- drawing ---------- */
const KS=[18.6,19],KB=[31,31];
const kSmall=(id,fx,fy,l,tip)=>{const [w,h]=KS,cx=X(fx),cy=Y(fy),ls=l.split('|');return `<g class="at-k at-s" data-k="${id}" data-tip="${tip}"><rect x="${cx-w/2}" y="${cy-h/2}" width="${w}" height="${h}" rx="2.5"/>`+ls.map((t,i)=>`<text x="${cx}" y="${cy+2-(ls.length-1)*2.6+i*5.2}" class="at-st">${t}</text>`).join('')+'</g>';};
const kBig=(id,fx,fy,l,tip)=>{const [w,h]=KB,cx=X(fx),cy=Y(fy);return `<g class="at-k at-b" data-k="${id}" data-tip="${tip}"><rect x="${cx-w/2}" y="${cy-h/2}" width="${w}" height="${h}" rx="3"/><text x="${cx}" y="${cy-6}" class="at-bt">${l}</text></g>`;};
function front(){let s=`<svg viewBox="0 0 ${PW} ${PH}" class="vh-svg" id="at-fsvg"><rect x="1" y="1" width="${PW-2}" height="${PH-2}" rx="7" class="at-face"/>`;
  [0.0185,0.9815].forEach(c=>[0.1,0.9].forEach(y=>s+=`<rect x="${X(c)-9}" y="${Y(y)-4.5}" width="18" height="9" rx="4.5" class="vh-hole"/>`));
  s+=`<g data-tip="Talkback headset (5-pin XLR): intercom with the cameras. Not simulated."><circle cx="${X(0.096)}" cy="${Y(0.51)}" r="${X(0.023)}" class="at-xlr"/><circle cx="${X(0.096)}" cy="${Y(0.51)}" r="${X(0.017)}" class="at-xlr2"/><text x="${X(0.096)}" y="${Y(0.17)}" class="at-tiny">PUSH</text></g>`;
  const tb='Talkback / intercom with the camera operators. Not simulated.';
  [['ptalk',0.152,0.223,'PROD|TALK'],['etalk',0.178,0.223,'ENG|TALK'],['call',0.152,0.5,'CALL'],['pgmmix',0.178,0.5,'PGM|MIX'],['up',0.152,0.782,'△'],['dn',0.178,0.782,'▽']].forEach(([id,x,y,l])=>s+=kSmall(id,x,y,l,tb));
  s+=`<rect x="${X(0.2155)}" y="${Y(0.151)}" width="${X(0.3207)}" height="${Y(0.693)}" rx="4" class="at-frame"/>`;
  for(let n=1;n<=20;n++){const c=(n-1)%10;s+=kBig('s'+n,0.2315+c*0.0321,n<=10?0.325:0.671,n,`Source ${n} (${inName(n)}): press = PREVIEW (green). In cut-bus mode it goes straight to PROGRAM.`);}
  s+=`<rect x="${X(0.558)}" y="${Y(0.151)}" width="${X(0.032)}" height="${Y(0.693)}" rx="4" class="at-frame"/>`+kBig('cut',0.574,0.325,'CUT','CUT: preview and program swap instantly.')+kBig('auto',0.574,0.671,'AUTO','AUTO: runs the selected transition (MIX, DIP, WIPE, DVE) at its rate.');
  [['key1',0.6275,0.223,'KEY 1|MIX','KEY 1 MIX: upstream key 1 on/off with a mix (not set up here).'],['dsk1',0.6529,0.223,'DSK 1|MIX','DSK 1 MIX: downstream key 1 on/off — here the vMix graphics (fill IN 9 + key IN 10).'],['dsk2',0.6792,0.223,'DSK2|MIX','DSK 2 MIX: downstream key 2 (not set up here).'],['ftb',0.7046,0.223,'FTB','FTB: fade the whole programme to black (blinks while black).'],
   ['bars',0.6275,0.5,'BARS','BARS: colour bars as a source.'],['black',0.6529,0.5,'BLACK','BLACK as a source.'],['mp1',0.6792,0.5,'MP 1','MP 1: media player 1 (a still) as a source.'],['mp2',0.7046,0.5,'MP 2','MP 2: media player 2 as a source.'],
   ['tmix',0.6275,0.782,'MIX','Transition type: MIX (cross-dissolve).'],['twipe',0.6529,0.782,'WIPE','Transition type: WIPE.'],['tdip',0.6792,0.782,'DIP','Transition type: DIP (through black).'],['tdve',0.7046,0.782,'DVE','Transition type: DVE (push).']].forEach(([id,x,y,l,t])=>s+=kSmall(id,x,y,l,t));
  s+=`<rect x="${X(0.740)}" y="${Y(0.085)}" width="${X(0.1)}" height="${Y(0.825)}" rx="2" class="vh-lcdb"/>`;
  s+=`<text x="${X(0.874)}" y="${Y(0.15)}" class="at-logo">Blackmagic<tspan font-weight="300">design</tspan></text>`;[0.06,0.13,0.2].forEach(y=>s+=`<rect x="${X(0.9)}" y="${Y(y)}" width="5" height="5" rx="1.3" class="vh-bmd"/>`);
  s+=`<g class="vh-knob at-knob" data-tip="Knob: in the menus, scrolls; otherwise sets the audio level shown on the screen (Master)."><circle cx="${X(0.873)}" cy="${Y(0.53)}" r="${X(0.02)}" class="vh-kn"/><circle cx="${X(0.873)}" cy="${Y(0.53)}" r="${X(0.017)}" class="vh-kn2"/></g>`;
  [['menu',0.223,'MENU','MENU: settings menus on the screen (press again to go back).'],['set',0.5,'SET','SET: select / confirm in the menu.'],['lock',0.782,'LOCK','LOCK: hold 2 s = lock the panel (keys ignored), hold 1 s = unlock.']].forEach(([id,y,l,t])=>s+=kSmall(id,0.918,y,l,t));
  return s+'</svg>';}
function bnc(cx,cy,r=12.5){return `<circle cx="${cx}" cy="${cy}" r="${r}" class="vh-bnc"/><circle cx="${cx}" cy="${cy}" r="${r*.62}" class="vh-bnc2"/><circle cx="${cx}" cy="${cy}" r="${r*.18}" class="vh-bnc3"/>`;}
function rear(){let s=`<svg viewBox="0 0 ${PW} ${PH+14}" class="vh-svg" id="at-rsvg"><rect x="1" y="1" width="${PW-2}" height="${PH-2}" rx="7" class="at-face"/>`;
  [0.0185,0.9815].forEach(c=>[0.1,0.9].forEach(y=>s+=`<rect x="${X(c)-9}" y="${Y(y)-4.5}" width="18" height="9" rx="4.5" class="vh-hole"/>`));
  s+=`<g data-tip="IEC power inlet with fuse drawer. No power switch."><rect x="${X(0.074)}" y="${Y(0.12)}" width="${X(0.054)}" height="${Y(0.41)}" rx="3" class="vh-iec2"/><rect x="${X(0.08)}" y="${Y(0.55)}" width="${X(0.042)}" height="${Y(0.24)}" rx="2" class="vh-iec"/></g>`;
  s+=`<g data-tip="CONTROL: Ethernet to the ATEM panel, ATEM Software Control and the network (IP on the tape: 192.168.11.50)."><rect x="${X(0.149)}" y="${Y(0.11)}" width="${X(0.035)}" height="${Y(0.26)}" rx="2" class="vh-rj"/><text x="${X(0.1665)}" y="${Y(0.47)}" class="vh-rt">CONTROL</text></g>`;
  s+=`<g data-tip="USB-C: webcam output / updates."><rect x="${X(0.1665)-6}" y="${Y(0.78)-3}" width="12" height="6" rx="3" class="vh-rj"/><text x="${X(0.1665)}" y="${Y(0.92)}" class="vh-rt">USB-C</text></g>`;
  s+=`<g data-tip="TALKBACK (RJ45): intercom to the camera control units. Not simulated."><rect x="${X(0.192)}" y="${Y(0.11)}" width="${X(0.035)}" height="${Y(0.26)}" rx="2" class="vh-rj"/><text x="${X(0.2097)}" y="${Y(0.47)}" class="vh-rt">TALKBACK</text></g>`;
  s+=`<g data-tip="REF IN: reference (black burst / tri-sync).">${bnc(X(0.2095),Y(0.645),10)}<text x="${X(0.2095)}" y="${Y(0.92)}" class="vh-rt">REF IN</text></g>`;
  for(let k=0;k<20;k++){const cx=X(0.255+Math.floor(k/2)*0.03697),cy=Y(k%2?0.649:0.252);s+=`<g class="at-sock" data-s="i${k}">${bnc(cx,cy)}<text x="${cx-14}" y="${cy-13.5}" class="vh-rn">${k+1}</text><circle cx="${cx}" cy="${cy}" r="8.5" class="vh-plug"/></g>`;}
  s+=`<path d="M${X(0.238)} ${PH-16}v3H${X(0.605)}v-3" class="vh-brk"/><text x="${X(0.4215)}" y="${PH-8.5}" class="vh-rt">SDI INPUTS</text>`;
  for(let k=0;k<12;k++){const cx=X(0.6328+Math.floor(k/2)*0.0367),cy=Y(k%2?0.649:0.252);s+=`<g class="at-sock" data-s="o${k}">${bnc(cx,cy)}<text x="${cx-14}" y="${cy-13.5}" class="vh-rn">${k+1}</text><circle cx="${cx}" cy="${cy}" r="8.5" class="vh-plug"/></g>`;}
  s+=`<path d="M${X(0.616)} ${PH-16}v3H${X(0.835)}v-3" class="vh-brk"/><text x="${X(0.7255)}" y="${PH-8.5}" class="vh-rt">SDI OUTPUTS</text>`;
  [0,1].forEach(k=>{const cy=Y(k?0.649:0.252);s+=`<g class="at-sock" data-s="m${k}">${bnc(X(0.863),cy)}<text x="${X(0.863)-14}" y="${cy-13.5}" class="vh-rn">${k+1}</text><circle cx="${X(0.863)}" cy="${cy}" r="8.5" class="vh-plug"/></g>`;});
  s+=`<text x="${X(0.863)}" y="${PH-8.5}" class="vh-rt">MULTIVIEW</text>`;
  [0,1].forEach(k=>{const cy=Y(k?0.663:0.262);s+=`<g data-tip="Analog audio in CH ${k+1} (balanced 1/4&quot; jack)."><circle cx="${X(0.914)}" cy="${cy}" r="8" class="vh-rj"/><circle cx="${X(0.914)}" cy="${cy}" r="3.5" class="vh-bnc3"/><text x="${X(0.914)+12}" y="${cy+2}" class="vh-rn">CH ${k+1}</text></g>`;});
  s+=`<text x="${X(0.914)}" y="${PH-8.5}" class="vh-rt">ANALOG AUDIO IN</text>`;
  return s+'</svg>';}
/* ---------- LCD ---------- */
const MENU=['Program Source','Preview Source','Outputs','Transitions','Fade To Black','Settings'];
const OUTSRC=['pgm','pvw','clean1','mv1','bars','black','mp1','mp2',...Array.from({length:20},(_,i)=>i+1)];
function drawLcd(){const cv=document.getElementById('at-lcd');if(!cv)return;const c=cv.getContext('2d'),w=320,h=240;c.textAlign='left';c.textBaseline='alphabetic';
  if(S.menu){const m=S.menu;c.fillStyle='#14171b';c.fillRect(0,0,w,h);c.fillStyle='#9aa3ad';c.font='600 15px sans-serif';
    const list=(title,items,sel,val)=>{c.fillText(title,12,22);const top=Math.max(0,Math.min(sel-2,items.length-5));items.slice(top,top+5).forEach((t,i)=>{const k=top+i,y=40+i*38;if(k===sel){c.fillStyle='#2b6fd6';c.fillRect(6,y,w-12,34);}
      c.fillStyle='#fff';c.font='700 19px sans-serif';c.fillText(t,16,y+23);if(val){c.textAlign='right';c.fillStyle='#cfd6de';c.font='600 16px sans-serif';c.fillText(val(k),w-16,y+23);c.textAlign='left';}});};
    if(m.page==='main')list('Menu',MENU,m.i);
    else if(m.page==='outs')list('Outputs — SET to change',st.outs.map((_,i)=>'SDI Out '+(i+1)),m.i,k=>srcLabel(st.outs[k]));
    else if(m.page==='outsrc')list('SDI Out '+(m.o+1)+' source — SET',OUTSRC.map(srcLabel),m.i);
    else if(m.page==='trans')list('Transitions',['Rate'],0,()=>(st.rate/25).toFixed(2)+' s');
    else if(m.page==='set')list('Settings',['Switching mode','IP address'],m.i,k=>k?st.ip.join('.'):st.mode==='pp'?'Program / Preview':'Cut Bus');
    return;}
  c.fillStyle='#000';c.fillRect(0,0,w,h);c.drawImage(pgmCv,0,0,w-26,(w-26)*9/16+0);
  c.fillStyle='rgba(0,0,0,.6)';c.fillRect(0,0,w-26,24);c.fillStyle='#fff';c.font='700 15px sans-serif';c.fillText(S.audioSel?inName(S.audioSel):'Master',8,17);
  const lv=0;   // no embedded audio is simulated on the video sources['#3be07a'].forEach(col=>{c.fillStyle='#222';c.fillRect(w-22,4,7,h-40);c.fillRect(w-12,4,7,h-40);c.fillStyle=col;const hh=(h-40)*Math.min(1,lv);c.fillRect(w-22,4+(h-40)-hh,7,hh);c.fillRect(w-12,4+(h-40)-hh*.96,7,hh*.96);});
  c.fillStyle='#fff';c.font='700 16px sans-serif';c.textAlign='right';c.fillText((S.master>=0?'':'')+S.master.toFixed(1)+'dB',w-6,h-12);c.textAlign='left';
  c.font='600 13px sans-serif';c.fillStyle='#c9ced6';c.fillText(S.locked?'🔒 Panel locked':(S.msg||'PGM '+srcLabel(S.pgm)+' · PVW '+srcLabel(S.pvw)),8,h-12);}
/* ---------- keys ---------- */
function setK(id,cls,on){const g=document.querySelector(`#at-fsvg .at-k[data-k="${id}"]`);if(g)g.classList.toggle(cls,!!on);}
const SRCKEYS={bars:'bars',black:'black',mp1:'mp1',mp2:'mp2'};
function draw(){for(let n=1;n<=20;n++){setK('s'+n,'pgm',S.pgm===n||(S.T&&S.pvw===n));setK('s'+n,'pvw',st.mode==='pp'&&S.pvw===n&&!S.T);}
  Object.keys(SRCKEYS).forEach(k=>{setK(k,'pgm',S.pgm===k||(S.T&&S.pvw===k));setK(k,'pvw',st.mode==='pp'&&S.pvw===k&&!S.T);});
  ['mix','wipe','dip','dve'].forEach(t=>{setK('t'+t,'sel',S.trans===t);setK('t'+t,'pgm',S.trans===t&&!!S.T);});
  setK('auto','amber',!!S.T);setK('cut','sel',false);setK('key1','pgm',S.key1.on);setK('dsk1','pgm',S.dsk1.on);setK('dsk2','pgm',S.dsk2.on);setK('ftb','blink',S.ftb.on);
  setK('lock','pgm',S.locked);setK('lock','blink',S.lockFlash>performance.now());setK('menu','sel',!!S.menu);
  document.querySelectorAll('#at-rsvg .at-sock').forEach(g=>{const d=g.dataset.s[0],k=+g.dataset.s.slice(1);g.classList.toggle('plugged',d==='i'?hubOutFor(k+1)>=0:d==='m'?k===0:aoUsed(k));});
  drawLcd();}
function ties(){['dsk1','dsk2'].forEach(k=>{if(S[k].tie){S[k].on=!S[k].on;S[k].tie=false;}});}
function nextKeys(cut){[1,2,3,4].forEach(n=>{if(S.next['k'+n]){const k=S['key'+n];k.on=!k.on;if(cut)k.a=k.on?1:0;}});}
function take(){if(S.T)return;nextKeys(true);if(!S.next.bkgd){draw();return;}const a=S.pgm;S.pgm=S.pvw;S.pvw=a;['dsk1','dsk2'].forEach(k=>{if(S[k].tie){S[k].on=!S[k].on;S[k].a=S[k].on?1:0;S[k].tie=false;}});}
function auto(){if(S.T)return;nextKeys(false);if(!S.next.bkgd)return;S.T={t0:performance.now(),ms:st.rate*40,p:0,fx:S.trans};ties();}
function press(id){S.msg='';
  if(S.locked&&!['lock','menu','set','ptalk','etalk','call','pgmmix','up','dn'].includes(id)){S.lockFlash=performance.now()+600;return;}
  if(id==='menu'){S.menu=S.menu?(S.menu.page==='main'?null:{page:'main',i:S.menu.back??0}):{page:'main',i:0};return;}
  if(id==='set'){const m=S.menu;if(!m){S.audioSel=null;return;}
    if(m.page==='main'){const k=MENU[m.i];if(k==='Outputs')S.menu={page:'outs',i:0,back:m.i};else if(k==='Transitions')S.menu={page:'trans',back:m.i};else if(k==='Settings')S.menu={page:'set',i:0,back:m.i};else{S.menu=null;S.msg=k+': use the source keys';}}
    else if(m.page==='outs')S.menu={page:'outsrc',o:m.i,i:Math.max(0,OUTSRC.indexOf(st.outs[m.i])),back:2};
    else if(m.page==='outsrc'){st.outs[m.o]=OUTSRC[m.i];save();S.menu={page:'outs',i:m.o,back:2};}
    else if(m.page==='set'&&m.i===0){st.mode=st.mode==='pp'?'cut':'pp';save();}
    return;}
  if(/^s\d+$/.test(id)||SRCKEYS[id]){const v=SRCKEYS[id]||+id.slice(1);if(st.mode==='cut'){S.pgm=v;}else S.pvw=v;if(typeof v==='number')S.audioSel=v;return;}
  if(id==='cut')take();else if(id==='auto')auto();
  else if(id.startsWith('t')&&['tmix','twipe','tdip','tdve'].includes(id))S.trans=id.slice(1);
  else if(id==='ftb')S.ftb.on=!S.ftb.on;
  else if(id==='key1'||id==='dsk1'||id==='dsk2'){S[id].on=!S[id].on;if(id==='dsk2')S.msg='DSK 2: no fill/key set up';}}
function spin(d){const m=S.menu;
  if(!m){S.master=Math.max(-60,Math.min(10,S.master+d*.5));return;}
  if(m.page==='main')m.i=(m.i+d+MENU.length)%MENU.length;else if(m.page==='outs')m.i=(m.i+d+12)%12;else if(m.page==='outsrc')m.i=(m.i+d+OUTSRC.length)%OUTSRC.length;
  else if(m.page==='trans'){st.rate=Math.max(1,Math.min(250,st.rate+d));save();}else if(m.page==='set')m.i=(m.i+d+2)%2;}
/* ---------- mount + loop ---------- */
let mvWin=null;
function mount(){const f=document.getElementById('atem-front'),r=document.getElementById('atem-rear');if(!f||f.dataset.built)return;f.dataset.built='1';
  f.className='vh-front';f.innerHTML=front()+'<canvas id="at-lcd" width="320" height="240"></canvas>';
  r.className='vh-rear';r.innerHTML=rear();
  const mvb=document.getElementById('vh-mvbtn');
  const fs=document.getElementById('at-fsvg');let holdT=null,lockT0=0;
  fs.addEventListener('pointerdown',e=>{const k=e.target.closest('.at-k');if(!k)return;e.preventDefault();const id=k.dataset.k;k.classList.add('down');
    if(id==='lock'){lockT0=performance.now();holdT=setInterval(()=>{const t=performance.now()-lockT0;if(!S.locked&&t>=2000){S.locked=true;clearInterval(holdT);draw();}else if(S.locked&&t>=1000){S.locked=false;clearInterval(holdT);draw();}},50);}
    const up=()=>{k.classList.remove('down');clearInterval(holdT);removeEventListener('pointerup',up);};addEventListener('pointerup',up);
    if(id!=='lock')press(id);draw();});
  const kn=fs.querySelector('.at-knob');let y0=null,acc=0;
  kn.addEventListener('pointerdown',e=>{e.preventDefault();y0=e.clientY;acc=0;try{kn.setPointerCapture(e.pointerId);}catch(_){}});
  kn.addEventListener('pointermove',e=>{if(y0==null)return;acc+=(y0-e.clientY);y0=e.clientY;while(Math.abs(acc)>=10){const d=Math.sign(acc);acc-=d*10;spin(S.menu?-d:d);draw();}});
  kn.addEventListener('pointerup',()=>{y0=null;});
  kn.addEventListener('wheel',e=>{e.preventDefault();spin(e.deltaY>0?1:-1);draw();},{passive:false});
  if(mvb)mvb.onclick=()=>{mvWin=window.open('','atem_mv1','width=980,height=580');if(!mvWin)return alert('Allow pop-up windows for this site.');
    mvWin.document.title='ATEM Multiview 1';mvWin.document.body.style.cssText='margin:0;background:#000';mvWin.document.body.innerHTML='<canvas id="mv" width="960" height="540" style="width:100vw;height:100vh;object-fit:contain"></canvas>';};
  const root=document.getElementById('vh'),tip=document.getElementById('vh-tip');
  root.addEventListener('mousemove',e=>{const s=e.target.closest('.at-sock');if(!s)return;const d=s.dataset.s[0],k=+s.dataset.s.slice(1);let name,txt;
    if(d==='i'){const o=hubOutFor(k+1);name='SDI INPUT '+(k+1)+' — '+inName(k+1);txt=o>=0?`Cabled from Videohub OUT ${o+1}: now carrying ${VH.inputLabel(VH.state().routes[o])}.`:'Cabling not known yet.';}
    else if(d==='o'){name='SDI OUTPUT '+(k+1);txt='Carries: '+srcLabel(st.outs[k])+' (change it in MENU → Outputs). Where it goes in Tartanga: not known yet'+(k===2?' — a note on the rack says “Aux 3 – Plató”.':'.');}
    else{name='MULTIVIEW '+(k+1);txt=k?'Second multiview output (not used here).':'Multiview 1 → the control-room monitor shown below.';}
    tip.innerHTML=`<b>${name}</b><span>${txt}</span>`;tip.style.left=e.clientX+'px';tip.style.top=e.clientY+'px';tip.classList.add('on');e.stopPropagation();},true);
  draw();}
let last=0;
function loop(now){requestAnimationFrame(loop);const vis=document.getElementById('vh')?.classList.contains('on'),pop=mvWin&&!mvWin.closed,cr=document.getElementById('cr')?.classList.contains('on');if(!vis&&!pop&&!cr)return;
  if(now-last<38)return;last=now;   // ~25 fps
  if(S.T&&!S.T.manual){S.T.p=Math.min(1,(now-S.T.t0)/S.T.ms);if(S.T.p>=1){const a=S.pgm;S.pgm=S.pvw;S.pvw=a;S.T=null;draw();}}
  const ease=(o,ms=st.rate*40)=>{const t=o.on?1:0;o.a+=Math.sign(t-o.a)*Math.min(Math.abs(t-o.a),38/ms);};ease(S.ftb,st.ftbRate*40);ease(S.dsk1,st.dskRate*40);[1,2,3,4].forEach(n=>ease(S['key'+n]));ease(S.dsk2,st.dskRate*40);
  render();if(pop||cr)drawMV();
  if(vis){drawLcd();if(S.ftb.on||S.lockFlash>now)draw();}
  if(pop){const c=mvWin.document.getElementById('mv');if(c)c.getContext('2d').drawImage(mvCv,0,0);}}
requestAnimationFrame(loop);
/* control from the ATEM 1 M/E Advanced Panel (same switcher, same state) */
let tbStart=0;
const API={S,st:()=>st,mvOpen:()=>!!(mvWin&&!mvWin.closed),inName,srcLabel,program:()=>pgmCv,preview:()=>pvwCv,multiview:()=>mvCv,drawMV,
  pvw(v){if(st.mode==='cut')S.pgm=v;else S.pvw=v;draw();},pgm(v){S.pgm=v;draw();},cut(){take();draw();},auto(){auto();draw();},trans(t){S.trans=t;draw();},
  tbar(v){if(!S.T){if(Math.abs(v-tbStart)<.01)return;S.T={manual:true,p:0,fx:S.trans};ties();}if(!S.T.manual)return;S.T.p=Math.min(1,Math.abs(v-tbStart));
    if(S.T.p>=1){const a=S.pgm;S.pgm=S.pvw;S.pvw=a;S.T=null;tbStart=v;}draw();},
  ftb(){S.ftb.on=!S.ftb.on;draw();},dskCut(n){const d=S['dsk'+n];d.on=!d.on;d.a=d.on?1:0;draw();},dskAuto(n){const d=S['dsk'+n];d.on=!d.on;draw();},dskTie(n){S['dsk'+n].tie=!S['dsk'+n].tie;draw();},
  keyOn(n){const k=S['key'+n];k.on=!k.on;k.a=k.on?1:0;draw();},next(o){Object.assign(S.next,o);if(!Object.values(S.next).some(Boolean))S.next.bkgd=true;draw();},key:n=>st.keys[n-1],setKey(n,o){Object.assign(st.keys[n-1],o);save();},setRate(k,v){st[k]=Math.max(1,Math.min(250,v));save();},setOut(o,v){st.outs[o]=v;save();draw();}};
window.ATEMR={mount,api:API,redraw:()=>draw(),outFrame:(k,g,w,h)=>outFrame(st.outs[k],g,w,h),outLabel:k=>srcLabel(st.outs[k]),state:()=>st,program:()=>pgmCv};
})();
