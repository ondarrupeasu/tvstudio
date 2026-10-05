/* Midas M32R — faithful replica of the control-room audio console (top surface + rear panel) with a
 * real Web Audio engine. Layout and behaviour from the official M32R manual / QSG (docs/m32r-spec.md).
 * v1: layers, SEL/SOLO/MUTE, motorised faders, channel strip (preamp, low cut, gate, comp, 4-band EQ,
 * main bus), screen (home tabs + meters), monitor/phones, real meters. Drawn-only items say so. */
(function(){
const NS='http://www.w3.org/2000/svg';
/* ---------- model ---------- */
const COL={blue:'#2f6fd6',red:'#d6453b',green:'#2fa35a',yellow:'#d6b22f',cyan:'#2fb7c9',magenta:'#c43fb4',white:'#d9dadc',off:'#2a2b30'};
const S={};      // every strip by id
const mk=(id,num,name,color,type)=>S[id]={id,num,name,color,type,fader:0,mute:false,solo:false};
for(let i=1;i<=32;i++)mk('in'+i,'Ch'+String(i).padStart(2,'0'),'',i<=6?'blue':'off','in');
Object.assign(S.in1,{name:'PRESENTER',color:'blue',mic:'Lavalier (condenser)',cond:true});
Object.assign(S.in2,{name:'GUEST',color:'blue',mic:'Lavalier (condenser)',cond:true});
Object.assign(S.in3,{name:'MUSIC',color:'magenta',mic:'Playback (line)'});
Object.assign(S.in4,{name:'AMBIENCE',color:'green',mic:'Room mic (dynamic)'});
Object.assign(S.in5,{name:'TONE 1k',color:'yellow',mic:'Test oscillator (line)'});
Object.assign(S.in6,{name:'YOUR MIC',color:'cyan',mic:'Your computer microphone'});
for(let i=1;i<=8;i++)mk('aux'+i,i<=6?'Aux'+i:'USB'+(i-6),i<=6?['M350 L','M350 R','Virt L','Virt R','Aux 5','Aux 6'][i-1]:'USB '+(i-6),i<=4?['magenta','magenta','cyan','cyan'][i-1]:'off','aux');   // AUX IN 1-4 = returns of the outboard effects (audio rack)
for(let i=1;i<=8;i++)mk('fx'+i,'Fx'+Math.ceil(i/2)+(i%2?'L':'R'),'FxRtn '+Math.ceil(i/2)+(i%2?'L':'R'),'off','fx');
for(let i=1;i<=16;i++)mk('bus'+i,'MX'+String(i).padStart(2,'0'),'MixBus '+i,'off','bus');
for(let i=1;i<=8;i++)mk('dca'+i,'DCA'+i,'DCA '+i,'off','dca');
for(let i=1;i<=6;i++)mk('mtx'+i,'MT'+i,'Matrix '+i,'off','mtx');
mk('mainc','M/C','Main C','white','mainc');mk('main','LR','MAIN','white','main');
const P={};   // processing of the input channels (sources: see SOURCES / setSource below)
for(let i=1;i<=32;i++)P['in'+i]={gain:0,p48:false,pol:false,lc:false,lcf:80,gate:false,gthr:-60,comp:false,cthr:-20,ratio:3,eq:true,band:'low',
  b:{low:{t:'LSHV',f:80,g:0,q:2},lomid:{t:'PEQ',f:300,g:0,q:2},himid:{t:'PEQ',f:3000,g:0,q:2},high:{t:'HSHV',f:10000,g:0,q:2}},pan:0,st:true,mono:false,mcl:0,sends:Array(17).fill(0)};
const P0=JSON.parse(JSON.stringify(P.in32));   // factory channel settings
const LAYERS_IN={i1:['in',1],i2:['in',9],i3:['in',17],i4:['in',25],aux:['aux',1],fxr:['fx',1],b1:['bus',1],b2:['bus',9]};
const LAYERS_BUS={dca:['dca',1],b1:['bus',1],b2:['bus',9],mtx:null};
const G={power:false,inL:'i1',busL:'dca',sel:'in1',tab:'home',page:'home',flip:false,rem:false,dim:false,talkA:false,talkB:false,
  assign:[true,true,true,true,false,false,false,false],mon:.6,phones:.5,talk:.5,fxSel:1,
  dcaM:{},mg:Array.from({length:6},()=>({on:false,m:[]})),holdSel:null,holdEnc:null,scene:0,sigT:{},libScope:{ha:true,cfg:true,gate:true,dyn:true,eq:true,send:true},libCur:0,libSel:0,libSlot:2,snip:0};
for(let i=1;i<=8;i++)G.dcaM['dca'+i]=[];
const busN=id=>+id.slice(3);
/* effective level of an input channel: own fader + its DCAs; muted by own MUTE, a muted DCA or an active mute group */
function effDb(id){let d=f2db(S[id].fader);Object.entries(G.dcaM).forEach(([dc,m])=>{if(m.includes(id))d+=f2db(S[dc].fader);});return d;}
function effMute(id){return S[id].mute||Object.entries(G.dcaM).some(([dc,m])=>m.includes(id)&&S[dc].mute)||G.mg.some(g=>g.on&&g.m.includes(id));}
/* sends on fader: what a fader shows/controls right now */
function fVal(slot,id){const fl=G.flip;if(fl&&id){if(fl.mode==='bus'&&slot[0]==='a'&&S[id].type==='in')return P[id].sends[fl.bus];if(fl.mode==='ch'&&slot[0]==='b'&&S[id].type==='bus')return P[fl.ch].sends[busN(id)];}return id?S[id].fader:0;}
function fSet(slot,id,v){const fl=G.flip;if(fl){if(fl.mode==='bus'&&slot[0]==='a'&&S[id].type==='in'){P[id].sends[fl.bus]=v;return;}if(fl.mode==='ch'&&slot[0]==='b'&&S[id].type==='bus'){P[fl.ch].sends[busN(id)]=v;return;}}S[id].fader=v;}
const stripsIn=()=>{const [p,a]=LAYERS_IN[G.inL];return Array.from({length:8},(_,k)=>p+(a+k));};
const stripsBus=()=>G.busL==='mtx'?['mtx1','mtx2','mtx3','mtx4','mtx5','mtx6','mainc',null]:(([p,a])=>Array.from({length:8},(_,k)=>p+(a+k)))(LAYERS_BUS[G.busL]);
/* fader law (X32/M32 family): position 0..1 → dB */
const f2db=f=>f>=.5?f*40-30:f>=.25?f*80-50:f>=.0625?f*160-70:f>0?f*480-90:-Infinity;
const db2g=d=>d===-Infinity?0:Math.pow(10,d/20);
const fmtDb=d=>d===-Infinity?'-∞':(d>0?'+':'')+d.toFixed(1);

/* ---------- drawing helpers ---------- */
const T=(x,y,t,c='mx-l',a='middle')=>`<text class="${c}" x="${x}" y="${y}" text-anchor="${a}">${t}</text>`;
const panel=(x0,y0,x1,y1,title)=>`<rect class="mx-pan" x="${x0}" y="${y0}" width="${x1-x0}" height="${y1-y0}" rx="7"/>`+(title?T(x1-7,y0+12,title,'mx-pt','end'):'');
const TIPS={};
function btn(id,x,y,label,kind='fn',w=36,h=20,tip=''){if(tip)TIPS[id]=tip;
  const lines=String(label).split('|');
  return `<g class="mx-b ${kind}" data-b="${id}" data-name="${lines.join(' ')}"><rect x="${x-w/2}" y="${y-h/2}" width="${w}" height="${h}" rx="5"/>`+
    lines.map((l,i)=>T(x,y+3.2+(i-(lines.length-1)/2)*8,l,'mx-bt')).join('')+`</g>`;}
function knob(id,x,y,r,label,tip=''){if(tip)TIPS[id]=tip;
  return `<g class="mx-k" data-k="${id}" data-name="${label}"><path class="mx-ring" d=""/><path class="mx-ringv" d=""/><circle cx="${x}" cy="${y}" r="${r}" class="mx-kb"/><circle cx="${x}" cy="${y}" r="${r*.55}" class="mx-kc"/><line class="mx-kp" x1="${x}" y1="${y}" x2="${x}" y2="${y-r+2}"/>`+
    (label?T(x,y+r+13,label,'mx-l'):'')+`<circle cx="${x}" cy="${y}" r="${r+7}" fill="transparent"/></g>`;}
const led=(id,x,y,w=10,h=4,c='r')=>`<rect class="mx-led ${c}" data-l="${id}" x="${x-w/2}" y="${y-h/2}" width="${w}" height="${h}" rx="1"/>`;
const FY0=933,FY1=1183;
const fpos=f=>FY1-(FY1-FY0)*f;
function fader(slot,x){let s=`<g class="mx-f" data-slot="${slot}" data-name="Fader">`;
  [[10,1],[5,.875],[0,.75],[5,.625],[10,.5],[20,.375],[30,.25],[40,.1875],[50,.125],[70,.0417],['∞',0]].forEach(([l,f])=>{const y=fpos(f);
    s+=`<line class="mx-tick" x1="${x-21}" y1="${y}" x2="${x-13}" y2="${y}"/>`+T(x-23,y+2.6,l,'mx-sc','end');});
  s+=`<rect x="${x-2.5}" y="${FY0-4}" width="5" height="${FY1-FY0+8}" rx="2" fill="#050506"/>`;
  s+=`<g class="mx-cap" style="transform:translateY(${FY1}px)"><rect x="${x-13}" y="-17" width="26" height="34" rx="3" fill="#1f2025" stroke="#4b4d55"/><rect x="${x-13}" y="-1.2" width="26" height="2.4" fill="#d6d7da"/><rect x="${x-9}" y="-12" width="18" height="2" fill="#3a3c43"/><rect x="${x-9}" y="9" width="18" height="2" fill="#3a3c43"/></g>`;
  return s+`<rect class="mx-hit" x="${x-20}" y="${FY0-20}" width="40" height="${FY1-FY0+40}" fill="transparent"/></g>`;}
function strip(slot,x,main){let s='';
  s+=btn('sel:'+slot,x,595,'SEL','sel',38,18);
  if(main){s+=led('mcomp',x+20,626,8,5,'y')+T(x+4,628,'COMP','mx-xs','end');s+=btn('clrsolo',x,660,'CLR|SOLO','fn',38,22);}
  else{['COMP','CLIP','-6','-12','-18','-30','-60',slot.startsWith('b')?'PRE':'GATE'].forEach((l,k)=>{const y=628+k*10;
    s+=led('m:'+slot+':'+k,x-10,y,8,5,k===0?'y':k===1?'r':k===7?(slot.startsWith('b')?'g':'r'):'g')+T(x-2,y+2.5,l,'mx-xs','start');});}
  s+=btn('solo:'+slot,x,725,'SOLO','solo',38,18);
  s+=`<g class="mx-lcd" data-lcd="${slot}" data-name="Scribble strip"><rect x="${x-25}" y="756" width="50" height="66" rx="2" class="mx-lcdbg"/><rect class="mx-lcdc" x="${x-22}" y="759" width="44" height="60" rx="1.5"/>${T(x,778,'','mx-lcd1')}${T(x,800,'','mx-lcd2')}</g>`;
  s+=btn('mute:'+slot,x,854,'MUTE','mute',38,18);
  return s+fader(slot,x);}

function surface(){let s=`<svg class="mx-svg" viewBox="0 -304 1000 1529" role="img" aria-label="Midas M32R"><g class="mx-rear" id="mxRear" transform="translate(0,-300)">${rearSvg()}</g><g id="mxTop">`;
  s+=`<defs><linearGradient id="mxbody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26272c"/><stop offset="1" stop-color="#1b1c20"/></linearGradient></defs>`;
  s+=`<rect x="2" y="78" width="996" height="490" rx="22" fill="url(#mxbody)" stroke="#0c0c0e" stroke-width="3"/>`;
  // TALKBACK
  s+=panel(16,105,230,200,'TALKBACK')+btn('talkA',48,165,'TALK A','fn',40,20,'TALK A: the talkback mic goes to mix buses 1-6 (studio monitors / earpieces), not to the main. To hear it here, SOLO one of buses 1-6. The control-room monitors dim while talking.')+btn('talkB',98,165,'TALK B','fn',40,20,'TALK B: the talkback mic goes to the main L/R mix (you hear it here if MAIN is up). The control-room monitors dim -10 dB while talking.')+knob('talk',182,150,15,'TALK|LEVEL'.replace('|',' '),'Talkback mic level (rear TALKBACK MIC input).');
  // MONITOR
  s+=panel(237,105,448,200,'MONITOR')+knob('mon',275,150,15,'MONITOR LEVEL','Level of the control-room speakers (MONITOR L/R outputs). Here: the volume you hear.')+btn('dim',327,160,'DIM','fn',34,20,'DIM: lowers the monitor/phones level (−20 dB) without touching the mix.')+knob('phones',380,150,15,'PHONES LEVEL','Headphones level. Here: also the volume you hear.')+btn('vmon',425,182,'VIEW','view',32,18);
  // REC + BUS SEND
  s+=panel(455,105,513,274,'REC')+`<rect x="472" y="132" width="24" height="12" rx="2" fill="#0b0b0d" stroke="#888"/>`+T(484,128,'USB','mx-xs')+led('access',484,170,8,6,'g')+T(484,184,'ACCESS','mx-xs')+btn('vrec',484,240,'VIEW','view',32,18);
  s+=panel(455,281,513,338,'BUS SEND')+btn('vsend',484,318,'VIEW','view',32,18);
  // screen bezel
  s+=`<rect x="523" y="85" width="463" height="257" rx="18" fill="#2c2d33" stroke="#0e0e10" stroke-width="2"/>`+T(721,103,'◉ MIDAS','mx-logo');
  [['HOME','home'],['METERS','meters'],['ROUTING','routing'],['LIBRARY','library'],['EFFECTS','effects']].forEach(([l,k],i)=>s+=btn('scr:'+k,559,138+i*30,l,'scrb',48,20));
  [['SETUP','setup'],['MONITOR','monitor'],['SCENES','scenes'],['MUTE GRP','mutegrp'],['UTILITY','utility']].forEach(([l,k],i)=>s+=btn('scr:'+k,955,138+i*30,l,'scrb',48,20));
  s+=`<rect x="591" y="115" width="260" height="166" rx="4" fill="#050608" stroke="#000"/><g id="mx-screen" transform="translate(595,119)"></g>`;
  // main meter (M/C SOLO, L, R)
  ['M/C','L','R'].forEach((l,c)=>{const x=874+c*14;s+=T(x,128,l,'mx-xs');for(let k=0;k<18;k++)s+=led('mm:'+c+':'+k,x,272-k*7.6,9,4.6,k>=17?'r':k>=13?'y':'g');});
  for(let e=0;e<6;e++)s+=knob('enc'+e,616+e*42,312,12,'Screen encoder '+(e+1),'Screen encoder '+(e+1)+': turn it (drag up/down or scroll) to change the parameter shown above it on the screen; push it (click without dragging) for its push action.');
  s+=btn('cur:up',915,298,'▲','scrb',18,15)+btn('cur:down',915,326,'▼','scrb',18,15)+btn('cur:left',896,312,'◀','scrb',18,15)+btn('cur:right',934,312,'▶','scrb',18,15);
  // CONFIG / PREAMP
  s+=panel(16,206,234,359,'CONFIG/PREAMP')+knob('gain',52,262,17,'GAIN','Preamp GAIN (0 to +60 dB): raise it until the meter next to it peaks around −12/−6 without CLIP.')+knob('lcf',172,262,17,'FREQUENCY','LOW CUT frequency (20-400 Hz): removes rumble below it when LOW CUT is on.');
  ['CLIP','-3','-6','-9','-12','-18','-30','SIG'].forEach((l,k)=>{const y=226+k*9.5;s+=led('pre:'+k,100,y,9,4.5,k===0?'r':k<3?'y':'g')+T(108,y+2.4,l,'mx-xs','start');});
  s+=btn('p48',40,335,'48 V','fn',34,18,'+48 V phantom power for condenser mics (the lavaliers on CH 1-2 need it).')+btn('pol',82,335,'Ø','fn',30,18,'Ø: flips the polarity of the channel.')+btn('lc',128,335,'LOW CUT','fn',46,18,'LOW CUT: high-pass filter at FREQUENCY.')+btn('vcfg',205,335,'VIEW','view',32,18);
  // GATE / DYNAMICS
  s+=panel(16,369,234,541,'')+T(118,382,'GATE','mx-pt','end')+T(227,382,'DYNAMICS','mx-pt','end')+`<line x1="125" y1="372" x2="125" y2="538" stroke="#5d6068"/>`;
  s+=knob('gthr',52,430,17,'THRESHOLD','GATE threshold: below it the channel is closed (silences noise between words).')+knob('cthr',180,430,17,'THRESHOLD','COMP threshold: above it the compressor reduces the level (ratio 3:1).');
  ['COMP','-3','-6','-9','-12','-18','-30','GATE'].forEach((l,k)=>{const y=398+k*9.5;s+=led('dyn:'+k,104,y,9,4.5,k===0||k===7?'r':'y')+T(112,y+2.4,l,'mx-xs','start');});
  s+=btn('gate',40,505,'GATE','fn',38,18,'GATE on/off.')+btn('vgate',96,525,'VIEW','view',32,18)+btn('comp',152,505,'COMP','fn',38,18,'COMP (compressor) on/off.')+btn('vdyn',206,525,'VIEW','view',32,18);
  // EQUALISER
  s+=panel(237,206,445,541,'EQUALISER');
  ['HCUT','HSHV','VEQ','PEQ','LSHV','LCUT'].forEach((l,k)=>{const y=244+k*16;s+=led('eqm:'+l,262,y,8,6,'r')+T(272,y+2.5,l,'mx-xs','start');});
  s+=btn('eqmode',268,380,'MODE','fn',38,18,'MODE: filter type of the selected band (shelf, parametric, cut…).');
  s+=knob('eqw',340,250,17,'WIDTH','WIDTH (Q) of the selected band.')+knob('eqf',340,330,17,'FREQUENCY','FREQUENCY of the selected band (20 Hz-20 kHz).')+knob('eqg',340,410,17,'GAIN','GAIN of the selected band (±15 dB). Simulator: Shift+click = 0 dB.');
  s+=btn('eq',340,478,'EQ','fn',34,18,'EQ on/off for the selected channel.');
  [['high','HIGH',256],['himid','HI MID',292],['lomid','LO MID',350],['low','LOW',386]].forEach(([k,l,y])=>s+=btn('band:'+k,410,y,l,'fn',40,20,'Selects the '+l+' band for the three knobs.'));
  s+=T(394,276,'HIGH 2','mx-xs','end')+T(394,372,'LOW 2','mx-xs','end')+btn('veq',412,520,'VIEW','view',32,18);
  // ASSIGN
  s+=panel(455,352,598,541,'ASSIGN');for(let i=0;i<8;i++)s+=btn('asg:'+i,487+(i%2)*44,388+Math.floor(i/2)*38,i+1,'asg',30,22,'User-assignable key '+(i+1)+'. Drawn only.');
  s+=btn('vasg',576,520,'VIEW','view',30,18);
  // MAIN BUS
  s+=panel(603,352,775,541,'MAIN BUS')+knob('mcl',648,412,17,'M/C LEVEL','Send level to the mono/centre bus (Main C).')+knob('pan',730,412,17,'PAN/BAL','Pan of the selected channel in the stereo mix. Endless encoder, no centre click: watch the LED ring. Simulator: Shift+click = centre.');
  s+=btn('mono',648,478,'MONO|CENTRE','fn',46,24,'MONO CENTRE: sends the channel to the mono/centre bus.')+btn('st',716,478,'MAIN|STEREO','fn',46,24,'MAIN STEREO: sends the channel to the main L/R mix. Without it, the channel is not heard in the main mix.')+btn('vmain',756,520,'VIEW','view',30,18);
  // FADER LAYER
  s+=panel(781,352,983,541,'FADER LAYER');
  [['L:i1','INPUTS|1-8',805,384],['L:i2','INPUTS|9-16',850,384],['L:i3','INPUTS|17-24',805,420],['L:i4','INPUTS|25-32',850,420],['L:aux','AUX IN|USB',805,456],['L:fxr','FX|RET',850,456],['L:b1','BUS|1-8',805,492],['L:b2','BUS|9-16',850,492]].forEach(([id,l,x,y])=>s+=btn(id,x,y,l,'lay',40,28));
  [['B:dca','GROUP|DCA 1-8',955,384],['B:b1','BUS|1-8',955,420],['B:b2','BUS|9-16',955,456],['B:mtx','MATRIX|MAIN C',955,492]].forEach(([id,l,x,y])=>s+=btn(id,x,y,l,'lay',42,28));
  s+=btn('rem',902,400,'REM','fn',36,20,'REM: DAW remote control. Drawn only.')+T(902,420,'DAW REMOTE','mx-xs')+btn('flip',902,492,'FADER|FLIP','fn',40,28,'FADER FLIP = sends on fader. SEL a mix bus → FLIP: the 8 input faders set how much each channel sends to that bus. SEL an input → FLIP: the bus faders are that channel\'s sends. Press again to exit.')+T(902,516,'SENDS ON FADER','mx-xs');
  s+=`<rect id="zCtl" x="10" y="98" width="592" height="450" fill="none"/><rect id="zScr" x="448" y="80" width="546" height="468" fill="none"/>`;
  s+=`</g><g id="mxBot"><rect x="2" y="560" width="996" height="660" rx="22" fill="#1d1e22" stroke="#0c0c0e" stroke-width="3"/>`;
  // strips
  for(let k=0;k<8;k++)s+=strip('a'+k,35+k*56);
  for(let k=0;k<8;k++)s+=strip('b'+k,490+k*56);
  s+=strip('m',956,true)+T(956,898,'MAIN','mx-pt');
  s+=`<rect x="7" y="752" width="448" height="74" rx="3" fill="none" stroke="#000"/><rect x="462" y="752" width="453" height="74" rx="3" fill="none" stroke="#000"/>`;
  s+=`<rect id="zStr" x="0" y="578" width="1000" height="295" fill="none"/><rect id="zFad" x="0" y="876" width="1000" height="334" fill="none"/>`;
  return s+'</g></svg>';}

/* rear panel exactly as seen from behind (official QSG drawing): talkback/monitor · aux in/out · OUT 8…1 on the left,
   IN 8…1 / IN 16…9 on the right, and the bottom row AC/POWER · DN32-USB card · ETHERNET · MIDI · ULTRANET · AES50 B/A */
function rearSvg(){const tip=(n,t,inner)=>`<g data-name="${n}" data-tip="${t}">${inner}</g>`;
  const xlr=(x,y,r=17)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#1a1b1e" stroke="#a9abb0" stroke-width="1.4"/><circle cx="${x}" cy="${y}" r="${r*.62}" fill="#2c2d31"/>${[[-.3,-.15],[.3,-.15],[0,.32]].map(([a,b])=>`<circle cx="${x+a*r}" cy="${y+b*r}" r="${r*.11}" fill="#8d8f94"/>`).join('')}`;
  const jack=(x,y,r=11)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#111" stroke="#a9abb0" stroke-width="1.2"/><circle cx="${x}" cy="${y}" r="${r*.42}" fill="#000"/>`;
  const rca=(x,y,c)=>`<circle cx="${x}" cy="${y}" r="9" fill="${c}" stroke="#ddd"/><circle cx="${x}" cy="${y}" r="3" fill="#111"/>`;
  const rj=(x,y)=>`<rect x="${x-20}" y="${y-17}" width="40" height="34" rx="4" fill="#111" stroke="#a9abb0"/><rect x="${x-11}" y="${y-8}" width="22" height="16" fill="#333"/>`;
  const din=(x,y)=>`<circle cx="${x}" cy="${y}" r="19" fill="#151515" stroke="#a9abb0"/>${[0,1,2,3,4].map(k=>`<circle cx="${x+11*Math.cos(Math.PI*(.15+k*.175))}" cy="${y-11*Math.sin(Math.PI*(.15+k*.175))}" r="2" fill="#888"/>`).join('')}`;
  const box=(x0,y0,x1,y1)=>`<rect x="${x0}" y="${y0}" width="${x1-x0}" height="${y1-y0}" rx="4" fill="none" stroke="#d6d7da" stroke-width="1.6"/>`;
  const sockG=(n,x,y,lbl)=>`<g class="mx-sock" data-in="${n}" data-name="IN ${n}">${xlr(x,y)}<g class="mx-plug"><circle cx="${x}" cy="${y}" r="19.5" class="mx-plugr"/><circle cx="${x}" cy="${y}" r="11" fill="#141416"/></g>${T(x,lbl,'IN '+n,'mx-wt')}<circle cx="${x}" cy="${y}" r="22" fill="transparent"/></g>`;
  let s=`<rect x="2" y="2" width="996" height="352" rx="6" fill="#3a3c41" stroke="#0e0e10" stroke-width="2"/>`;
  s+=`<text x="22" y="54" class="mx-rlogo">◉ MIDAS</text><text x="285" y="54" class="mx-rlogo">M32R</text>`;
  [[440,'FCC'],[540,'CAUTION'],[650,'中文'],[760,'SERIAL NUMBER · DATE CODE']].forEach(([x,t])=>s+=`<rect x="${x}" y="22" width="${x===760?225:96}" height="36" rx="2" fill="none" stroke="#9fa1a6"/>`+T(x+(x===760?112:48),44,t,'mx-xsw'));
  // talkback + monitor
  s+=box(16,64,132,157)+T(47,78,'TALKBACK','mx-wt')+T(107,78,'MONITOR','mx-wt');
  s+=`<g class="mx-sock" data-in="talk" data-name="TALKBACK MIC">${xlr(47,115)}<g class="mx-plug"><circle cx="47" cy="115" r="19.5" class="mx-plugr"/><circle cx="47" cy="115" r="11" fill="#141416"/></g>${T(47,150,'MIC','mx-wt')}<circle cx="47" cy="115" r="22" fill="transparent"/></g>`;
  s+=tip('MONITOR L / R','Outputs to the control-room speakers (MONITOR LEVEL). XLR or ¼" jack.',jack(107,96)+jack(107,136)+T(122,99,'L','mx-xsw','start')+T(122,139,'R','mx-xsw','start'));
  // aux in / out
  s+=box(138,64,495,157);
  s+=tip('AUX IN 1-6 / AUX OUT 1-6','Line-level ¼" jacks (and RCA on 5/6) — e.g. a computer or a playback player.',
    [175,292,336,380,424,468].map((x,k)=>jack(x,96)+jack(x,136)+T(x,77,[6,5,4,3,2,1][k],'mx-xsw')).join('')+rca(218,96,'#111')+rca(248,96,'#fff')+rca(218,136,'#111')+rca(248,136,'#fff')+T(150,118,'AUX IN','mx-xsw','start')+T(150,154,'AUX OUT','mx-xsw','start'));
  // outputs 8 … 1
  s+=box(15,161,495,241);
  s+=tip('OUTPUTS 1-8','8 XLR outputs. OUT 7 = MAIN LEFT, OUT 8 = MAIN RIGHT (to the PA / recorder).',[8,7,6,5,4,3,2,1].map((n,k)=>{const x=50+k*59;return xlr(x,192)+T(x,232,'OUT '+n,'mx-wt')+(n>=7?T(x,221,n===8?'(MAIN RIGHT)':'(MAIN LEFT)','mx-xsw'):'');}).join(''));
  // inputs: IN 8…1 (top), IN 16…9 (bottom)
  s+=box(501,64,985,241);
  for(let k=0;k<8;k++){const x=533+k*59.6;s+=sockG(8-k,x,113,82)+sockG(16-k,x,192,234);}
  // bottom row
  s+=`<g class="mx-power" data-name="AC / POWER switch" data-tip="Mains input + power switch. Click it!">${box(21,258,88,336)}<rect x="34" y="266" width="40" height="24" rx="3" fill="#0d0d0f"/><rect class="pr1" x="37" y="269" width="17" height="18" rx="2"/><rect class="pr2" x="54" y="269" width="17" height="18" rx="2"/>${T(45,283,'I','mx-wt')}${T(62,283,'O','mx-wt')}<rect x="37" y="296" width="34" height="30" rx="3" fill="#0d0d0f" stroke="#888"/>${T(54,250,'AC/POWER','mx-wt')}</g>`;
  s+=tip('DN32-USB card','Klark Teknik card: 32×32 channels over USB to a computer (record / play back a multitrack).',box(95,260,474,332)+T(105,276,'KLARK TEKNIK','mx-xsw','start')+T(460,276,'DN32-USB','mx-xsw','end')+`<rect x="333" y="296" width="22" height="18" fill="#111" stroke="#999"/>`);
  s+=tip('ETHERNET','Remote control from a computer or tablet (M32-Edit / M32-Mix).',box(480,255,534,334)+rj(507,295)+T(507,329,'ETHERNET','mx-xsw'));
  s+=tip('MIDI IN / OUT','MIDI control.',box(545,255,658,334)+din(570,292)+din(635,292)+T(570,267,'IN','mx-xsw')+T(635,267,'OUT','mx-xsw')+T(601,329,'MIDI','mx-xsw'));
  s+=tip('ULTRANET','16 channels to personal monitor mixers (P16).',box(667,255,743,334)+rj(705,290)+T(705,329,'ULTRANET','mx-xsw'));
  s+=tip('AES50 B / A','Digital snakes: 48×48 channels each to stage boxes (channels 17-32 would come from here).',box(754,255,880,334)+rj(785,290)+rj(847,290)+T(817,329,'B ━ AES50 ━ A','mx-xsw'));
  s+=`<text x="890" y="300" class="mx-rlogo2">◉ MIDAS</text>`;
  return s;}

/* ---------- audio engine ---------- */
let A=null;
function musicBuffer(ctx){const sr=ctx.sampleRate,len=Math.floor(sr*9.6),b=ctx.createBuffer(2,len,sr),L=b.getChannelData(0),R=b.getChannelData(1);
  const bpm=100,beat=60/bpm,chords=[[220,277.2,329.6],[196,246.9,293.7],[174.6,220,261.6],[196,246.9,329.6]];
  for(let i=0;i<len;i++){const t=i/sr,bar=Math.floor(t/(beat*4))%4,ch=chords[bar],tb=t%beat;let v=0;
    ch.forEach((f,k)=>{v+=Math.sin(2*Math.PI*f*t)*0.11+Math.sin(2*Math.PI*f*2*t+k)*0.03;});
    v*=0.55+0.45*Math.sin(2*Math.PI*t/(beat*4));
    v+=Math.sin(2*Math.PI*(55+90*Math.exp(-tb*30))*tb)*Math.exp(-tb*9)*0.55;                       // kick
    const hb=(t+beat/2)%beat;v+=(Math.random()*2-1)*Math.exp(-hb*45)*0.12;                         // hat
    const bass=ch[0]/2;v+=Math.sin(2*Math.PI*bass*t)*0.18*Math.exp(-(t%(beat*2))*1.2);
    L[i]=v*0.5;R[i]=v*0.5*(0.9+0.1*Math.sin(t));}
  return b;}
function noiseBuffer(ctx){const sr=ctx.sampleRate,len=sr*4,b=ctx.createBuffer(1,len,sr),d=b.getChannelData(0);let b0=0,b1=0,b2=0;
  for(let i=0;i<len;i++){const w=Math.random()*2-1;b0=.99765*b0+w*.099;b1=.963*b1+w*.2965;b2=.57*b2+w*1.0526;d[i]=(b0+b1+b2+w*.1848)*.12;}return b;}
/* ---------- effects ---------- */
const FXDEF={1:{name:'Hall Reverb',p:[{l:'Decay',v:2.6,min:.4,max:6,f:v=>v.toFixed(1)+' s'},{l:'Hi damp',v:7000,min:1500,max:16000,log:1,f:v=>fmtF(v)+' Hz'}]},
  2:{name:'Plate Reverb',p:[{l:'Decay',v:1.3,min:.3,max:4,f:v=>v.toFixed(1)+' s'},{l:'Hi damp',v:11000,min:1500,max:16000,log:1,f:v=>fmtF(v)+' Hz'}]},
  3:{name:'Stereo Delay',p:[{l:'Time',v:.375,min:.05,max:1.2,f:v=>Math.round(v*1000)+' ms'},{l:'Feedback',v:.35,min:0,max:.85,f:v=>Math.round(v*100)+' %'}]},
  4:{name:'Stereo Chorus',p:[{l:'Rate',v:.8,min:.1,max:4,f:v=>v.toFixed(2)+' Hz'},{l:'Depth',v:.5,min:0,max:1,f:v=>Math.round(v*100)+' %'}]}};
function irBuf(ctx,sec){const sr=ctx.sampleRate,len=Math.max(1,Math.floor(sr*sec)),b=ctx.createBuffer(2,len,sr);
  for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.2)*.6;}return b;}
/* outboard settings (the knobs of the M350 / Virtualizer front panels) */
const OB={m350:{input:.8,mix:.5,decay:2.4,predelay:.02,delay:.32,feedback:.25,type:'Hall'},virt:{input:.8,mix:.5,decay:1.4,predelay:.01,delay:.25,feedback:.2,type:'Plate'}};
function setOb(o){const c=OB[o.k],ctx=o.inG.context;o.inG.gain.value=c.input;o.dry.gain.value=0;o.wet.gain.value=1;o.pre.delayTime.value=c.predelay;o.dl.delayTime.value=c.delay;o.fb.gain.value=c.feedback;
  o.lp.frequency.value=c.type==='Plate'?7000:4500;if(o._d!==c.decay){o._d=c.decay;o.conv.buffer=irBuf(ctx,c.decay);}o.wet.gain.value=c.mix*1.2;}
window.OUTBOARD={get:k=>OB[k],set(k,v){Object.assign(OB[k],v);if(A&&A.ob&&A.ob[k])setOb(A.ob[k]);},level:id=>A&&A.aux&&A.aux[id]?peakDb(A.aux[id].an):-120};
function makeFx(ctx,i){const u={in:ctx.createGain(),out:ctx.createGain(),i};const P=FXDEF[i].p;
  if(i<=2){u.conv=ctx.createConvolver();u.conv.buffer=irBuf(ctx,P[0].v);u.lp=ctx.createBiquadFilter();u.lp.type='lowpass';u.lp.frequency.value=P[1].v;u.in.connect(u.conv);u.conv.connect(u.lp);u.lp.connect(u.out);}
  else if(i===3){const sp=ctx.createChannelSplitter(2),mg=ctx.createChannelMerger(2);u.dL=ctx.createDelay(2);u.dR=ctx.createDelay(2);u.fb=ctx.createGain();
    u.in.connect(u.dL);u.dL.connect(u.dR);u.dR.connect(u.fb);u.fb.connect(u.dL);u.dL.connect(mg,0,0);u.dR.connect(mg,0,1);mg.connect(u.out);setFx(u);}
  else{const mg=ctx.createChannelMerger(2);u.dL=ctx.createDelay(.1);u.dR=ctx.createDelay(.1);u.dL.delayTime.value=.018;u.dR.delayTime.value=.024;u.lfo=ctx.createOscillator();u.lg=ctx.createGain();u.lgR=ctx.createGain();
    u.lfo.connect(u.lg);u.lfo.connect(u.lgR);u.lg.connect(u.dL.delayTime);u.lgR.connect(u.dR.delayTime);u.lfo.start();u.in.connect(u.dL);u.in.connect(u.dR);u.dL.connect(mg,0,0);u.dR.connect(mg,0,1);mg.connect(u.out);setFx(u);}
  return u;}
function setFx(u){const P=FXDEF[u.i].p,ctx=A&&A.ctx||u.in.context;
  if(u.i<=2){if(u.conv&&u._dec!==P[0].v){u._dec=P[0].v;u.conv.buffer=irBuf(ctx,P[0].v);}u.lp&&(u.lp.frequency.value=P[1].v);}
  else if(u.i===3){u.dL.delayTime.value=P[0].v;u.dR.delayTime.value=P[0].v*.75;u.fb.gain.value=P[1].v;}
  else{u.lfo.frequency.value=P[0].v;u.lg.gain.value=.004*P[1].v;u.lgR.gain.value=-.004*P[1].v;}}
async function startAudio(){if(A){A.ctx.resume();return;}
  const ctx=new (window.AudioContext||window.webkitAudioContext)();A={ctx,ch:{}};
  const mainBus=ctx.createGain(),mainF=ctx.createGain(),mainM=ctx.createGain(),soloBus=ctx.createGain(),mainToMon=ctx.createGain(),soloToMon=ctx.createGain(),mon=ctx.createGain(),lim=ctx.createDynamicsCompressor();
  lim.threshold.value=-3;lim.ratio.value=20;lim.attack.value=.002;lim.release.value=.1;
  const spl=ctx.createChannelSplitter(2),anL=ctx.createAnalyser(),anR=ctx.createAnalyser(),soloAn=ctx.createAnalyser();[anL,anR,soloAn].forEach(a=>a.fftSize=1024);
  mainBus.connect(mainF);mainF.connect(mainM);mainM.connect(spl);spl.connect(anL,0);spl.connect(anR,1);mainM.connect(mainToMon);soloBus.connect(soloToMon);soloBus.connect(soloAn);
  mainToMon.connect(mon);soloToMon.connect(mon);mon.connect(lim);A.spk=ctx.createGain();lim.connect(A.spk);A.spk.connect(ctx.destination);   // A.spk: the audio rack re-routes it (DEQ2496 → JVC amp → SP-1 control-room speakers)
  Object.assign(A,{mainBus,mainF,mainM,soloBus,mainToMon,soloToMon,mon,anL,anR,soloAn});
  A.out78=ctx.createMediaStreamDestination();mainM.connect(A.out78);   // OUT 7/8 = MAIN L/R → the ATEM analog audio in (programme sound for the video side)
  A.bus={};for(let k=1;k<=16;k++){const b={sum:ctx.createGain(),fad:ctx.createGain(),mute:ctx.createGain(),solo:ctx.createGain(),an:ctx.createAnalyser()};b.an.fftSize=1024;
    b.sum.connect(b.fad);b.fad.connect(b.mute);b.mute.connect(b.an);b.mute.connect(b.solo);b.solo.connect(soloBus);A.bus[k]=b;}
  // mono / centre bus (Main C)
  A.mono=ctx.createGain();A.monoF=ctx.createGain();A.monoM=ctx.createGain();A.monoSolo=ctx.createGain();A.monoAn=ctx.createAnalyser();A.monoAn.fftSize=1024;
  A.mono.connect(A.monoF);A.monoF.connect(A.monoM);A.monoM.connect(A.monoAn);A.monoM.connect(A.monoSolo);A.monoSolo.connect(soloBus);
  // FX rack: slots 1-4 are send effects fed by Mix 13-16, returning on FX RET 1L/1R … 4L/4R (M32 default)
  A.fx={};for(let i=1;i<=4;i++){const u=makeFx(ctx,i);A.bus[12+i].mute.connect(u.in);const sp=ctx.createChannelSplitter(2),mg=ctx.createChannelMerger(2);
    u.gL=ctx.createGain();u.gR=ctx.createGain();u.anL=ctx.createAnalyser();u.anR=ctx.createAnalyser();u.anL.fftSize=u.anR.fftSize=1024;u.soloL=ctx.createGain();u.soloR=ctx.createGain();
    u.out.connect(sp);sp.connect(u.gL,0);sp.connect(u.gR,1);u.gL.connect(mg,0,0);u.gR.connect(mg,0,1);mg.connect(mainBus);u.gL.connect(u.anL);u.gR.connect(u.anR);
    u.gL.connect(u.soloL);u.gR.connect(u.soloR);u.soloL.connect(soloBus);u.soloR.connect(soloBus);A.fx[i]=u;}
  // outboard effects in the audio rack: AUX OUT 1-2 (Mix 1-2) → TC Electronic M350, AUX OUT 3-4 (Mix 3-4) → Behringer Virtualizer Pro; returns on AUX IN 1-4
  A.ob={};[['m350',1],['virt',3]].forEach(([k,b])=>{const mg=ctx.createChannelMerger(2),inG=ctx.createGain(),dry=ctx.createGain(),wet=ctx.createGain(),out=ctx.createGain(),conv=ctx.createConvolver(),pre=ctx.createDelay(1),dl=ctx.createDelay(2),fb=ctx.createGain(),lp=ctx.createBiquadFilter();
    A.bus[b].mute.connect(mg,0,0);A.bus[b+1].mute.connect(mg,0,1);mg.connect(inG);inG.connect(dry);dry.connect(out);inG.connect(pre);pre.connect(conv);conv.connect(lp);lp.connect(wet);inG.connect(dl);dl.connect(fb);fb.connect(dl);dl.connect(wet);wet.connect(out);lp.type='lowpass';
    const o={inG,dry,wet,out,conv,pre,dl,fb,lp,k};A.ob[k]=o;setOb(o);const sp=ctx.createChannelSplitter(2);out.connect(sp);
    [0,1].forEach(c=>{const id='aux'+(b+c),g=ctx.createGain(),m=ctx.createGain(),pn=ctx.createStereoPanner(),an=ctx.createAnalyser(),so=ctx.createGain();an.fftSize=1024;pn.pan.value=c?1:-1;sp.connect(g,c);g.connect(m);m.connect(an);m.connect(pn);pn.connect(mainBus);m.connect(so);so.connect(soloBus);A.aux=A.aux||{};A.aux[id]={g,m,an,so};});});
  // matrices 1-6: copies of the main mix for other destinations (recording, lobby…)
  A.mtx={};for(let i=1;i<=6;i++){const g=ctx.createGain(),m=ctx.createGain(),an=ctx.createAnalyser(),so=ctx.createGain();an.fftSize=1024;mainM.connect(g);g.connect(m);m.connect(an);m.connect(so);so.connect(soloBus);A.mtx[i]={g,m,an,so};}
  // talkback: TALKBACK MIC → TALK LEVEL → TALK A (mix 1-6) / TALK B (main L/R)
  A.talk={in:ctx.createGain(),lvl:ctx.createGain(),a:ctx.createGain(),b:ctx.createGain(),srcNodes:[],streams:[]};
  A.talk.in.connect(A.talk.lvl);A.talk.lvl.connect(A.talk.a);A.talk.lvl.connect(A.talk.b);A.talk.b.connect(mainBus);for(let k=1;k<=6;k++)A.talk.a.connect(A.bus[k].sum);
  const load=async u=>{const r=await fetch(u);return ctx.decodeAudioData(await r.arrayBuffer());};
  for(let i=1;i<=16;i++)chain('in'+i);
  for(const [id,k] of Object.entries(SRC))await setSource(id,k);
  applyAll();window.dispatchEvent(new Event('m32audio'));}
function chain(id){const c=A.ctx,n={};
  n.in=c.createGain();                 // source arrives here at "mic level"
  n.phantom=c.createGain();n.pre=c.createGain();n.pol=c.createGain();n.hp=c.createBiquadFilter();n.hp.type='highpass';
  n.gate=c.createGain();n.comp=c.createDynamicsCompressor();n.comp.knee.value=6;n.comp.attack.value=.01;n.comp.release.value=.15;
  n.eq=[0,1,2,3].map(()=>c.createBiquadFilter());n.mute=c.createGain();n.fad=c.createGain();n.pan=c.createStereoPanner();n.st=c.createGain();n.solo=c.createGain();
  n.preAn=c.createAnalyser();n.postAn=c.createAnalyser();n.preAn.fftSize=n.postAn.fftSize=1024;
  n.insS=c.createGain();n.insR=c.createGain();   // insert point (send / return): the audio rack can patch an outboard processor here
  n.in.connect(n.phantom);n.phantom.connect(n.pre);n.pre.connect(n.preAn);n.pre.connect(n.pol);n.pol.connect(n.hp);n.hp.connect(n.insS);n.insS.connect(n.insR);n.insR.connect(n.gate);n.gate.connect(n.comp);
  let last=n.comp;n.eq.forEach(f=>{last.connect(f);last=f;});last.connect(n.postAn);last.connect(n.solo);n.solo.connect(A.soloBus);
  last.connect(n.mute);n.mute.connect(n.fad);n.fad.connect(n.pan);n.pan.connect(n.st);n.st.connect(A.mainBus);
  n.mono=c.createGain();n.mono.gain.value=0;n.fad.connect(n.mono);n.mono.connect(A.mono);
  n.snd={};for(let k=1;k<=16;k++){const g=c.createGain();g.gain.value=0;n.fad.connect(g);g.connect(A.bus[k].sum);n.snd[k]=g;}
  n.gateOpen=1;A.ch[id]=n;}
const BT={LCUT:'highpass',LSHV:'lowshelf',PEQ:'peaking',VEQ:'peaking',HSHV:'highshelf',HCUT:'lowpass'};
function applyCh(id){if(!A||!A.ch[id])return;const n=A.ch[id],p=P[id],s=S[id],t=A.ctx.currentTime,sm=(prm,v)=>prm.setTargetAtTime(v,t,.015);
  sm(n.phantom.gain,S[id].cond&&!p.p48?0:1);sm(n.pre.gain,db2g(p.gain));sm(n.pol.gain,p.pol?-1:1);
  n.hp.frequency.setTargetAtTime(p.lc?p.lcf:10,t,.02);
  n.comp.threshold.value=p.comp?p.cthr:0;n.comp.ratio.value=p.comp?p.ratio:1;
  ['low','lomid','himid','high'].forEach((k,i)=>{const b=p.b[k],f=n.eq[i];
    if(!p.eq){f.type='peaking';f.gain.value=0;return;}
    f.type=BT[b.t];f.frequency.value=b.f;f.Q.value=b.t==='LCUT'||b.t==='HCUT'?.707:b.t==='LSHV'||b.t==='HSHV'?b.q/4:b.q;f.gain.value=b.g;});
  sm(n.mute.gain,effMute(id)?0:1);sm(n.fad.gain,db2g(effDb(id)));for(let k=1;k<=16;k++)sm(n.snd[k].gain,db2g(f2db(p.sends[k])));sm(n.mono.gain,p.mono?db2g(f2db(p.mcl)):0);n.pan.pan.setTargetAtTime(p.pan,t,.02);sm(n.st.gain,p.st?1:0);sm(n.solo.gain,s.solo?1:0);}
function applyMain(){if(!A)return;if(A.aux)Object.entries(A.aux).forEach(([id,n])=>{const s=S[id];n.g.gain.setTargetAtTime(db2g(f2db(s.fader)),A.ctx.currentTime,.015);n.m.gain.setTargetAtTime(s.mute?0:1,A.ctx.currentTime,.015);n.so.gain.setTargetAtTime(s.solo?1:0,A.ctx.currentTime,.015);});const t=A.ctx.currentTime,anySolo=Object.values(S).some(s=>s.solo&&s.type!=='dca'&&s.type!=='main');
  const g2=(prm,v)=>prm.setTargetAtTime(v,t,.015);
  g2(A.monoF.gain,db2g(f2db(S.mainc.fader)));g2(A.monoM.gain,S.mainc.mute?0:1);g2(A.monoSolo.gain,S.mainc.solo?1:0);
  for(let i=1;i<=4;i++){const u=A.fx[i],L=S['fx'+(2*i-1)],Rr=S['fx'+(2*i)];g2(u.gL.gain,L.mute?0:db2g(f2db(L.fader)));g2(u.gR.gain,Rr.mute?0:db2g(f2db(Rr.fader)));g2(u.soloL.gain,L.solo?1:0);g2(u.soloR.gain,Rr.solo?1:0);}
  for(let i=1;i<=6;i++){const m=A.mtx[i],s=S['mtx'+i];g2(m.g.gain,db2g(f2db(s.fader)));g2(m.m.gain,s.mute?0:1);g2(m.so.gain,s.solo?1:0);}
  g2(A.talk.lvl.gain,G.talk*G.talk*4);g2(A.talk.a.gain,G.talkA?1:0);g2(A.talk.b.gain,G.talkB?1:0);
  for(let k=1;k<=16;k++){const b=A.bus[k],s=S['bus'+k];b.fad.gain.setTargetAtTime(db2g(f2db(s.fader)),t,.015);b.mute.gain.setTargetAtTime(s.mute?0:1,t,.015);b.solo.gain.setTargetAtTime(s.solo?1:0,t,.015);}
  A.mainF.gain.setTargetAtTime(db2g(f2db(S.main.fader)),t,.015);A.mainM.gain.setTargetAtTime(S.main.mute?0:1,t,.015);
  const lvl=Math.max(G.mon,G.phones),v=lvl*lvl*(G.dim?0.1:G.talkA||G.talkB?0.32:1);   // DIM = -20 dB; talking dims the monitors -10 dB (so you still hear TALK B in the main)
  A.mon.gain.setTargetAtTime(G.power?v:0,t,.02);A.mainToMon.gain.setTargetAtTime(anySolo?0:1,t,.02);A.soloToMon.gain.setTargetAtTime(anySolo?1:0,t,.02);}
function applyAll(){Object.keys(P).forEach(applyCh);applyMain();}
/* ---------- input sources (the patch: what arrives at IN 1-8) ---------- */
const SOURCES={pres:{l:'Presenter (sample)',name:'PRESENTER',mic:'Lavalier (condenser)',cond:true,color:'blue'},
  guest:{l:'Guest (sample)',name:'GUEST',mic:'Lavalier (condenser)',cond:true,color:'blue'},
  music:{l:'Music (generated)',name:'MUSIC',mic:'Playback (line)',color:'magenta'},
  amb:{l:'Ambience (generated)',name:'AMBIENCE',mic:'Room mic (dynamic)',color:'green'},
  tone:{l:'Tone 1 kHz',name:'TONE 1k',mic:'Test oscillator (line)',color:'yellow'},
  tb:{l:'Director talkback mic (sample)',name:'TALK',mic:'Talkback mic',color:'white'},
  none:{l:'— nothing connected —',name:'',mic:'Nothing connected',color:'off'},
  dev:{l:'Microphone / audio input of this computer',name:'MY MIC',mic:'Computer input (mic level)',color:'cyan'},
  file:{l:'Audio or video file…',name:'FILE',mic:'File player (line)',color:'magenta'},
  tab:{l:'Browser tab audio (YouTube…)',name:'TAB AUDIO',mic:'Shared browser tab (line)',color:'magenta'}};
const SRC={in1:'pres',in2:'guest',in3:'music',in4:'amb',in5:'tone'};for(let i=6;i<=16;i++)SRC['in'+i]='none';SRC.talk='tb';
const SRCX={};
const PACK={};          // name → File, from the multicam pack folder chosen by the user
const PACKLEN=211;      // every file in the pack lasts 211 s and starts at the same instant
const SONG_AT=12.5;     // in the pack the band starts playing 12.5 s in (same moment as in the camera files)
/* multitrack playback of the pack (like the computer/recorder playing it into the desk): one clock for all pack files */
/* every audio file plugged into the desk (pack files or any file) plays on ONE clock, like a multitrack player:
   files that start together stay together (no hidden adjustments — they just start/stop/loop together) */
const packIds=()=>Object.keys(SRC).filter(id=>SRC[id].startsWith('pk:')||SRC[id]==='file');
const clipLen=()=>{let L=0;packIds().forEach(id=>{const d=A&&A.clipDur&&A.clipDur[id];if(d)L=Math.max(L,d);});return L||PACKLEN;};
function clockAt(len){return ((A.ctx.currentTime-A.packT0)%len+len)%len;}
function packPos(){if(!A||A.packT0==null)return 0;return A.packPaused!=null?A.packPaused:clockAt(clipLen());}
function packPlayFrom(pos){if(!A)return;A.packPaused=null;A.packT0=A.ctx.currentTime-pos;packIds().forEach(id=>setSource(id,SRC[id]));}
function packPause(){if(!A||A.packPaused!=null)return;A.packPaused=packPos();packIds().forEach(stopSource);}
function registerPack(files){let n=0;[...files].forEach(f=>{const m=f.name.match(/^(STEM_\w+|MIX_synced|CAM\d)\.(m4a|mp4|wav|mp3)$/i);if(!m)return;const key=m[1];PACK[key]=f;n++;
  const nice=key.replace(/^STEM_/,'').replace('MIX_synced','MIX').toUpperCase();
  SOURCES['pk:'+key]={l:'Pack · '+(key.startsWith('CAM')?key+' (camera audio)':key.startsWith('STEM_')?nice.toLowerCase()+' stem':'full mix (mono)'),name:nice,mic:'Multitrack playback (line)',color:key.startsWith('STEM_')?'magenta':'cyan'};});return n;}   // extra per channel: deviceId, file name
function stopSource(id){const n=A&&(id==='talk'?A.talk:A.ch[id]);if(!n)return;(n.srcNodes||[]).forEach(x=>{try{x.stop&&x.stop();}catch(_){}try{x.disconnect();}catch(_){}});
  (n.streams||[]).forEach(st=>st.getTracks().forEach(t=>t.stop()));if(n.media){n.media.pause();n.media.src='';n.media=null;}n.srcNodes=[];n.streams=[];}
async function setSource(id,kind,opt={}){SRC[id]=kind;const meta=SOURCES[kind];if(S[id])Object.assign(S[id],{name:kind==='file'&&opt.fileName?opt.fileName.replace(/\.[^.]+$/,'').slice(0,10).toUpperCase():meta.name,mic:meta.mic,cond:!!meta.cond,color:meta.color});
  if(!A){draw();return;}const ctx=A.ctx,n=id==='talk'?A.talk:A.ch[id];stopSource(id);
  const lv=ctx.createGain();lv.connect(n.in);n.srcNodes=[lv];const loop=b=>{const x=ctx.createBufferSource();x.buffer=b;x.loop=true;x.connect(lv);x.start();n.srcNodes.push(x);};
  try{
    if(kind.startsWith('pk:')||kind==='file'){const f=kind==='file'?(opt.file||(SRCX[id]||{}).file):PACK[kind.slice(3)];if(!f)throw new Error(kind==='file'?'Choose the file again':'Load the pack folder first');
      if(kind==='file')SRCX[id]={fileName:f.name,file:f};lv.gain.value=db2g(-20);
      A.pbufs=A.pbufs||{};const ck=f.name+':'+f.size;if(!A.pbufs[ck])A.pbufs[ck]=await ctx.decodeAudioData(await f.arrayBuffer());const b=A.pbufs[ck];
      A.clipDur=A.clipDur||{};A.clipDur[id]=b.duration;if(A.packT0==null)A.packT0=ctx.currentTime;if(A.packPaused!=null)return;
      const x=ctx.createBufferSource();x.buffer=b;x.loop=true;x.connect(lv);x.start(0,clockAt(b.duration));n.srcNodes.push(x);}   // same clock as the other files: they play together
    else if(kind==='tb'){lv.gain.value=db2g(-6);A.bufs=A.bufs||{};const u='audio/talk.mp3';if(!A.bufs[u])A.bufs[u]=await (async()=>ctx.decodeAudioData(await (await fetch(u)).arrayBuffer()))();loop(A.bufs[u]);}
    else if(kind==='pres'||kind==='guest'){lv.gain.value=db2g(-40);A.bufs=A.bufs||{};const u='audio/'+kind+'.mp3';if(!A.bufs[u])A.bufs[u]=await (async()=>ctx.decodeAudioData(await (await fetch(u)).arrayBuffer()))();loop(A.bufs[u]);}
    else if(kind==='music'){lv.gain.value=db2g(-14);A.music=A.music||musicBuffer(ctx);loop(A.music);}
    else if(kind==='amb'){lv.gain.value=db2g(-46);A.noise=A.noise||noiseBuffer(ctx);loop(A.noise);}
    else if(kind==='tone'){lv.gain.value=db2g(-18);const o=ctx.createOscillator();o.frequency.value=1000;o.connect(lv);o.start();n.srcNodes.push(o);}
    else if(kind==='dev'){lv.gain.value=db2g(-20);const st=await navigator.mediaDevices.getUserMedia({audio:{deviceId:opt.deviceId?{exact:opt.deviceId}:undefined,echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
      n.streams=[st];const m=ctx.createMediaStreamSource(st);m.connect(lv);n.srcNodes.push(m);SRCX[id]={deviceId:opt.deviceId,label:st.getAudioTracks()[0]?.label};}
    else if(kind==='tab'){lv.gain.value=db2g(-20);const st=await navigator.mediaDevices.getDisplayMedia({video:true,audio:true});st.getVideoTracks().forEach(t=>t.stop());
      if(!st.getAudioTracks().length)throw new Error('The shared tab has no audio (tick "Share tab audio").');n.streams=[st];const m=ctx.createMediaStreamSource(st);m.connect(lv);n.srcNodes.push(m);}
    SRCX[id]=Object.assign(SRCX[id]||{},{err:null});
  }catch(e){SRCX[id]={err:e.message||String(e)};if(S[id])Object.assign(S[id],{name:'NO SIGNAL',color:'off'});}
  applyCh(id);draw();}
/* patch dialog (HTML) */
async function plugMenu(n,ev){const menu=document.getElementById('mx-plugmenu'),tk=n==='talk',id=tk?'talk':'in'+n,cur=SRC[id];
  let devs=[];try{devs=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='audioinput');}catch(_){}
  const item=(v,l,on)=>`<button data-v="${v}" class="${on?'on':''}">${l}</button>`;
  menu.innerHTML=(tk?`<div class="mx-pmh"><b>TALKBACK MIC</b> · plug a microphone…</div>`+item('tb',SOURCES.tb.l,cur==='tb'):`<div class="mx-pmh"><b>IN ${n}</b> → Ch${String(n).padStart(2,'0')} · plug a cable from…</div>`+
    ['pres','guest','music','amb','tone'].map(k=>item(k,SOURCES[k].l,cur===k)).join(''))+
    `<div class="mx-pmg">This computer</div>`+(devs.length&&devs[0].label?devs.map(d=>item('dev:'+d.deviceId,d.label,cur==='dev'&&(SRCX[id]||{}).deviceId===d.deviceId)).join(''):item('dev:','Microphone / audio input',cur==='dev'))+
    (tk?'':item('file','Audio or video file…',cur==='file')+item('tab','Browser tab audio (YouTube… · Chrome/Edge)',cur==='tab')+
      `<div class="mx-pmg">Multicam pack (from your disk)</div>`+(Object.keys(PACK).length?Object.keys(PACK).filter(k=>!k.startsWith('CAM')||true).sort().map(k=>item('pk:'+k,SOURCES['pk:'+k].l,cur==='pk:'+k)).join('')+item('packband','▶ Plug the band: IN 9 vocals · 10 drums · 11 bass · 12 guitar',false):'')+
      item('packload',Object.keys(PACK).length?'Load another pack folder…':'Load the pack folder (unzipped)…',false)+`<div class="mx-pmnote">Pack: apps.cinemafilmak.com/tvstudio — <a href="https://apps.cinemafilmak.com/tvstudio/tvstudio-multicam-pack.zip">download</a>, unzip, then load the folder here.</div>`)+
    `<div class="mx-pmg"></div>`+item('none',cur==='none'?'(nothing plugged in)':'Unplug the cable',false)+((SRCX[id]||{}).err?`<div class="mx-perr">${SRCX[id].err}</div>`:'');
  const r=root.getBoundingClientRect();menu.style.left=Math.min(ev.clientX-r.left+8,r.width-300)+'px';menu.style.top=(ev.clientY-r.top+8)+'px';menu.classList.add('on');
  menu.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{const v=b.dataset.v;menu.classList.remove('on');
    if(v==='file'){const inp=document.getElementById('mx-file');inp.onchange=()=>{if(inp.files[0])setSource(id,'file',{file:inp.files[0],fileName:inp.files[0].name});inp.value='';};inp.click();return;}
    if(v==='packload'){const inp=document.getElementById('mx-packdir');inp.onchange=()=>{const k=registerPack(inp.files);inp.value='';G.msg=k+' pack files loaded';draw();plugMenu(n,ev);};inp.click();return;}
    if(v==='packband'){[['in9','STEM_vocals'],['in10','STEM_drums'],['in11','STEM_bass'],['in12','STEM_guitar']].forEach(([i,k])=>PACK[k]&&setSource(i,'pk:'+k));G.inL='i2';draw();return;}
    if(v.startsWith('dev:'))return setSource(id,'dev',{deviceId:v.slice(4)||undefined});setSource(id,v);}));}

/* ---------- meters ---------- */
const buf=new Float32Array(1024);
function peakDb(an){an.getFloatTimeDomainData(buf);let m=0;for(let i=0;i<buf.length;i++){const v=Math.abs(buf[i]);if(v>m)m=v;}return m>0?20*Math.log10(m):-120;}
const lev={};   // smoothed meter levels
function trpTick(){const tr=document.getElementById('mx-trp');if(!tr)return;const on=packIds().length>0&&G.power;tr.hidden=!on;if(!on)return;
  const p=packPos(),f=t=>String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.floor(t%60)).padStart(2,'0');
  const L=clipLen(),pk=packIds().some(id=>SRC[id].startsWith('pk:'));tr.querySelector('[data-t="song"]').hidden=!pk;
  tr.querySelector('.mx-tt').textContent=f(p)+' / '+f(L)+(pk&&p<SONG_AT?' · the song starts at 00:12':'');tr.querySelector('[data-t="pp"]').textContent=A&&A.packPaused!=null?'▶':'❚❚';
  tr.querySelector('.mx-tbar i').style.width=(p/L*100)+'%';}
function meterTick(){requestAnimationFrame(meterTick);if(!root.classList.contains('on'))return;trpTick();
  const L=(k,on)=>{const e=svg.querySelector(`[data-l="${k}"]`);if(e)e.classList.toggle('lit',!!on);};
  const sm=(k,v)=>lev[k]=Math.max(v,(lev[k]??-120)-1.4);
  if(!A||!G.power){svg.querySelectorAll('.mx-led.lit').forEach(e=>{if(!e.dataset.l?.startsWith('eqm'))e.classList.remove('lit');});updLeds();return;}
  // gates (control-rate) + per-channel levels
  Object.entries(A.ch).forEach(([id,n])=>{const pre=peakDb(n.preAn),p=P[id];sm(id+':pre',pre);if(pre>=-30)G.sigT[id]=performance.now();
    const open=!p.gate||pre>p.gthr;n.gateOpen=open;n.gate.gain.setTargetAtTime(open?1:0,A.ctx.currentTime,open?.005:.08);
    sm(id+':post',peakDb(n.postAn));});
  // strips
  for(let k=1;k<=16;k++)sm('bus'+k,peakDb(A.bus[k].an));if(A.aux)Object.entries(A.aux).forEach(([id,n])=>sm(id,peakDb(n.an)));for(let i=1;i<=4;i++){sm('fx'+(2*i-1),peakDb(A.fx[i].anL));sm('fx'+(2*i),peakDb(A.fx[i].anR));}for(let i=1;i<=6;i++)sm('mtx'+i,peakDb(A.mtx[i].an));sm('mainc',peakDb(A.monoAn));
  [...stripsIn().map((id,k)=>['a'+k,id]),...stripsBus().map((id,k)=>['b'+k,id])].forEach(([slot,id])=>{const n=id&&A.ch[id],isB=id&&(['bus','fx','mtx','mainc'].includes(S[id].type)||(S[id].type==='aux'&&A.aux&&A.aux[id]));const v=n?lev[id+':post']:isB?lev[id]:-120;
    [null,0,-6,-12,-18,-30,-60].forEach((th,k)=>{if(k===0)return;L('m:'+slot+':'+k,(n||isB)&&(k===1?v>=-0.1:v>=th));});
    L('m:'+slot+':0',n&&P[id].comp&&n.comp.reduction<-1);L('m:'+slot+':7',slot.startsWith('a')&&n&&P[id].gate&&!n.gateOpen);});
  const ok=performance.now()-(G.sigT[G.sel]||-1e9)<1500;if(ok!==G.sigOk){G.sigOk=ok;diag();}
  // selected channel: preamp + dynamics meters
  const n=A.ch[G.sel],pv=n?lev[G.sel+':pre']:-120;
  [0,-3,-6,-9,-12,-18,-30,-60].forEach((th,k)=>L('pre:'+k,n&&(k===0?pv>=-0.1:pv>=th)));
  const gr=n&&P[G.sel].comp?-n.comp.reduction:0;[0,3,6,9,12,18,30].forEach((th,k)=>{if(k===0)L('dyn:0',n&&P[G.sel].comp&&gr>1);else L('dyn:'+k,gr>=th);});
  L('dyn:7',n&&P[G.sel].gate&&!n.gateOpen);
  // main meter
  const anySolo=Object.values(S).some(s=>s.solo);const lv=[anySolo?sm('solo',peakDb(A.soloAn)):lev.mainc??-120,sm('L',peakDb(A.anL)),sm('R',peakDb(A.anR))];
  const sc=[-45,-42,-39,-36,-33,-30,-27,-24,-21,-18,-15,-12,-10,-8,-6,-4,-2,-0.1];
  lv.forEach((v,c)=>sc.forEach((th,k)=>L('mm:'+c+':'+k,v>=th)));
  L('mcomp',false);L('access',false);
  if(G.page==='meters'||G.tab==='home')drawScreenMeters();}

/* ---------- render ---------- */
const root=document.getElementById('mx'),tip=document.getElementById('mx-tip');let svg,rear;
function updLeds(){const p=P[G.sel];if(!svg)return;
  svg.querySelectorAll('[data-l^="eqm:"]').forEach(e=>e.classList.toggle('lit',!!(G.power&&p&&p.b[p.band].t===e.dataset.l.slice(4))));}
function setLit(id,on){const e=svg.querySelector(`[data-b="${id}"]`);if(e)e.classList.toggle('lit',!!(G.power&&on));}
function knobVal(id){const p=P[G.sel],b=p&&p.b[p.band];
  switch(id){case 'gain':return p?p.gain/60:0;case 'lcf':return p?Math.log(p.lcf/20)/Math.log(20):0;case 'gthr':return p?(p.gthr+80)/80:0;case 'cthr':return p?(p.cthr+60)/60:0;
    case 'eqw':return b?Math.log(b.q/.3)/Math.log(10/.3):0;case 'eqf':return b?Math.log(b.f/20)/Math.log(1000):0;case 'eqg':return b?(b.g+15)/30:.5;
    case 'mcl':return p?p.mcl:0;case 'pan':return p?(p.pan+1)/2:.5;case 'mon':return G.mon;case 'phones':return G.phones;case 'talk':return G.talk;default:return 0;}}
function drawKnob(g){const id=g.dataset.k,c=g.querySelector('.mx-kb'),x=+c.getAttribute('cx'),y=+c.getAttribute('cy'),r=+c.getAttribute('r');
  const v=id.startsWith('enc')?encVal(+id.slice(3)):knobVal(id);const a0=-135,ang=a0+270*Math.min(1,Math.max(0,v));
  const pt=a=>[x+(r+5)*Math.sin(a*Math.PI/180),y-(r+5)*Math.cos(a*Math.PI/180)];
  const arc=(a,b)=>{const [x1,y1]=pt(a),[x2,y2]=pt(b);return `M${x1} ${y1} A${r+5} ${r+5} 0 ${Math.abs(b-a)>180?1:0} 1 ${x2} ${y2}`;};
  g.querySelector('.mx-ring').setAttribute('d',arc(-135,135));
  const lit=G.power&&(id==='mon'||id==='phones'||id==='talk'||id.startsWith('enc')?v>=0:true);
  const centred=id==='pan'||id==='eqg';const [s0,s1]=centred?[Math.min(0,ang),Math.max(0,ang)]:[a0,ang];
  g.querySelector('.mx-ringv').setAttribute('d',lit&&s1-s0>.5?arc(s0,s1):'');
  g.querySelector('.mx-kp').setAttribute('transform',`rotate(${ang} ${x} ${y})`);}
function draw(){if(!svg)return;const on=G.power;
  svg.classList.toggle('off',!on);rear.classList.toggle('on',on);
  rear.querySelectorAll('.mx-sock').forEach(g=>{const id=g.dataset.in==='talk'?'talk':'in'+g.dataset.in,k=SRC[id];g.classList.toggle('plugged',k!=='none');g.querySelector('.mx-plugr').setAttribute('fill',COL[SOURCES[k].color]||'#888');});
  const fill=(slot,id)=>{const g=svg.querySelector(`.mx-f[data-slot="${slot}"]`),lcd=svg.querySelector(`[data-lcd="${slot}"]`),s=id&&S[id];
    g.querySelector('.mx-cap').style.transform=`translateY(${fpos(fVal(slot,id))}px)`;g.classList.toggle('flipf',!!(G.flip&&s&&((G.flip.mode==='bus'&&slot[0]==='a'&&s.type==='in')||(G.flip.mode==='ch'&&slot[0]==='b'&&s.type==='bus'))));
    lcd.classList.toggle('empty',!s||!on);lcd.querySelector('.mx-lcdc').setAttribute('fill',on&&s?COL[s.color]||COL.off:'#0b0c0e');
    const [l1,l2]=lcd.querySelectorAll('text');l1.textContent=on&&s?s.num:'';l2.textContent=on&&s?(s.name||s.num).slice(0,10):'';
    setLit('sel:'+slot,s&&G.sel===id);setLit('solo:'+slot,s&&s.solo);setLit('mute:'+slot,s&&(s.type==='in'?effMute(id):s.mute));};
  stripsIn().forEach((id,k)=>fill('a'+k,id));stripsBus().forEach((id,k)=>fill('b'+k,id));fill('m','main');
  setLit('clrsolo',Object.values(S).some(s=>s.solo));
  Object.keys(LAYERS_IN).forEach(k=>setLit('L:'+k,G.inL===k));Object.keys(LAYERS_BUS).forEach(k=>setLit('B:'+k,G.busL===k));
  const p=P[G.sel];['p48','pol','lc','gate','comp','eq'].forEach(k=>setLit(k,p&&p[k]));setLit('st',p&&p.st);setLit('mono',p&&p.mono);
  ['low','lomid','himid','high'].forEach(k=>setLit('band:'+k,p&&p.band===k));
  G.assign.forEach((v,i)=>setLit('asg:'+i,v));setLit('dim',G.dim);setLit('talkA',G.talkA);setLit('talkB',G.talkB);setLit('flip',!!G.flip);svg.classList.toggle('flipping',!!G.flip);setLit('rem',G.rem);
  svg.querySelectorAll('.mx-b.scrb').forEach(b=>b.classList.toggle('lit',on&&b.dataset.b==='scr:'+G.page));
  svg.querySelectorAll('.mx-k').forEach(drawKnob);updLeds();drawScreen();diag();}
/* ---------- screen (800×480 TFT, drawn at 252×158) ---------- */
const scr=()=>svg.querySelector('#mx-screen');
const TABS=['home','config','gate','dyn','eq','sends','main'];
/* ---------- scenes (SCENES page, saved in the browser) ---------- */
const SKEY='m32r-scenes';const scenes=()=>{try{return JSON.parse(localStorage.getItem(SKEY))||{};}catch(_){return {};}};
function snapshot(){return {S:Object.fromEntries(Object.values(S).map(x=>[x.id,{fader:x.fader,mute:x.mute,color:x.color,name:x.name}])),P:JSON.parse(JSON.stringify(P)),dcaM:JSON.parse(JSON.stringify(G.dcaM)),mg:JSON.parse(JSON.stringify(G.mg))};}
function saveScene(){const all=scenes();all[G.scene]={name:'Scene '+String(G.scene).padStart(2,'0'),t:Date.now(),d:snapshot()};try{localStorage.setItem(SKEY,JSON.stringify(all));}catch(_){} G.msg='Saved scene '+G.scene;}
function loadScene(){const sc=scenes()[G.scene];if(!sc){G.msg='Scene '+G.scene+' is empty';return;}const d=sc.d;
  const from={};Object.entries(d.S).forEach(([id,v])=>{if(S[id]){from[id]=S[id].fader;Object.assign(S[id],v);}});Object.entries(d.P).forEach(([id,v])=>{if(P[id])P[id]=v;});G.dcaM=d.dcaM;G.mg=d.mg;G.msg='Loaded scene '+G.scene;applyAll();
  const to=Object.fromEntries(Object.keys(from).map(id=>[id,S[id].fader])),t0=performance.now(),T=600;   // motorised faders travel to the stored positions
  (function step(now){const k=Math.min(1,(now-t0)/T),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;Object.keys(to).forEach(id=>S[id].fader=from[id]+(to[id]-from[id])*e);applyAll();draw();if(k<1&&!document.hidden)requestAnimationFrame(step);else{Object.keys(to).forEach(id=>S[id].fader=to[id]);applyAll();draw();}})(t0);}
const CO=['off','red','green','yellow','blue','magenta','cyan','white'];   // scribble-strip colours
const SNIP=['PRESENTER','GUEST','HOST','VOCAL','BKG VOX','KICK','SNARE','DRUMS','BASS','GUITAR','KEYS','MUSIC','VIDEO','PC','AMBIENT','TALKBACK','CLICK'];   // preset names (snippets)
function step(k,d){G.acc=G.acc||{};G.acc[k]=(G.acc[k]||0)+d;if(Math.abs(G.acc[k])>=3){const s=Math.sign(G.acc[k]);G.acc[k]=0;return s;}return 0;}   // one detent every few pixels
/* ---------- LIBRARY › channel: presets of the channel DSP chain (manual 2.5) ---------- */
const LKEY='m32r-chlib',LIBSC=[['ha','Head Amp'],['cfg','Config'],['gate','Gate'],['dyn','Compressor'],['eq','Equalizer'],['send','Sends']];
const LIBK={ha:['gain','p48'],cfg:['pol','lc','lcf'],gate:['gate','gthr'],dyn:['comp','cthr','ratio'],eq:['eq','band','b'],send:['sends','pan','st','mono','mcl']};
function libAll(){let l;try{l=JSON.parse(localStorage.getItem(LKEY));}catch(_){}if(!l){l={1:{name:'CLEAN',d:JSON.parse(JSON.stringify(P0))}};try{localStorage.setItem(LKEY,JSON.stringify(l));}catch(_){}}return l;}
function libList(){const l=libAll();return Object.keys(l).map(Number).sort((a,b)=>a-b).map(n=>({slot:n,...l[n]}));}
function libLoad(){const c=libList()[G.libSel],p=P[G.sel];if(!c||!p){G.msg='No preset / no channel';return;}
  Object.keys(LIBK).forEach(k=>{if(G.libScope[k])LIBK[k].forEach(f=>p[f]=JSON.parse(JSON.stringify(c.d[f])));});G.msg='Loaded '+c.name+' → '+S[G.sel].num;}
function libSave(){const p=P[G.sel];if(!p){G.msg='Select an input channel';return;}const l=libAll();l[G.libSlot]={name:(S[G.sel].name||S[G.sel].num).slice(0,12),d:JSON.parse(JSON.stringify(p))};
  try{localStorage.setItem(LKEY,JSON.stringify(l));}catch(_){}G.libSel=libList().findIndex(x=>x.slot===G.libSlot);G.msg='Saved '+S[G.sel].num+' to '+String(G.libSlot).padStart(3,'0');}
function libDel(){const c=libList()[G.libSel];if(!c)return;const l=libAll();delete l[c.slot];try{localStorage.setItem(LKEY,JSON.stringify(l));}catch(_){}G.libSel=Math.max(0,G.libSel-1);G.msg='Deleted '+String(c.slot).padStart(3,'0');}
function encPress(i){if(G.page==='mutegrp'&&G.shiftDown){G.mgArm=G.mgArm===i?null:i;draw();return;}const e=encDefs()[i];if(e&&e.press){e.press();applyAll();draw();}}
function encDefs(){const p=P[G.sel],b=p&&p.b[p.band],s=S[G.sel];
  if(G.page==='mutegrp')return G.mg.map((g,i)=>({l:'Mute '+(i+1),get:()=>(g.on?'ON':'off')+' · '+g.m.length+' ch',set:()=>{},v:()=>g.on?1:0,press:()=>{g.on=!g.on;}}));
  if(G.page==='scenes'){const sc=scenes();return [{l:'Scene',get:()=>String(G.scene).padStart(2,'0')+(sc[G.scene]?' ●':''),set:d=>{G.scene=cl(G.scene+Math.sign(d),0,99);},v:()=>G.scene/99},null,null,null,
    {l:'Save',get:()=>'push',set:()=>{},v:()=>0,press:saveScene},{l:'Load',get:()=>'push',set:()=>{},v:()=>0,press:loadScene}];}
  if(G.page==='effects'){const d=FXDEF[G.fxSel||1],u=A&&A.fx[G.fxSel||1];if(!d)return [null,null,null,null,null,{l:'Slot',get:()=>'FX'+G.fxSel,set:dd=>{G.fxSel=cl((G.fxSel||1)+Math.sign(dd),1,8);},v:()=>((G.fxSel||1)-1)/7}];
    const par=k=>{const q=d.p[k];return {l:q.l,get:()=>q.f(q.v),set:dd=>{q.v=q.log?cl(q.v*Math.pow(1.04,dd),q.min,q.max):cl(q.v+dd*(q.max-q.min)/100,q.min,q.max);if(u)setFx(u);},v:()=>q.log?Math.log(q.v/q.min)/Math.log(q.max/q.min):(q.v-q.min)/(q.max-q.min)};};
    return [par(0),par(1),null,null,null,{l:'Slot',get:()=>'FX'+G.fxSel,set:dd=>{G.fxSel=cl((G.fxSel||1)+Math.sign(dd),1,8);},v:()=>((G.fxSel||1)-1)/7}];}
  if(G.page==='library'){const L=libList(),cur=L[G.libSel],psh=(l,get,set,v,press)=>({l,get,set,v,press});
    return [psh('Recall',()=>LIBSC[G.libCur][1]+(G.libScope[LIBSC[G.libCur][0]]?' ✓':' ✗'),d=>{const k=step('lc',d);if(k)G.libCur=cl(G.libCur+k,0,5);},()=>G.libCur/5,()=>{const k=LIBSC[G.libCur][0];G.libScope[k]=!G.libScope[k];}),
      psh('Load',()=>cur?String(cur.slot).padStart(3,'0'):'—',d=>{const k=step('ls',d);if(k)G.libSel=cl(G.libSel+k,0,Math.max(0,L.length-1));},()=>L.length>1?G.libSel/(L.length-1):0,libLoad),
      psh('Save',()=>String(G.libSlot).padStart(3,'0'),d=>{const k=step('lv',d);if(k)G.libSlot=cl(G.libSlot+k,1,100);},()=>(G.libSlot-1)/99,libSave),
      psh('Delete',()=>'push',()=>{},()=>0,libDel),null,null];}
  if(G.page==='setup'){const s=S[G.sel],ids=Object.keys(P),i=ids.indexOf(G.sel);
    return [{l:'Channel',get:()=>s.num,set:d=>{const k=step('sc',d);if(k&&i>=0)G.sel=ids[cl(i+k,0,ids.length-1)];},v:()=>Math.max(0,i)/(ids.length-1)},
      {l:'Colour',get:()=>s.color==='off'?'black':s.color,set:d=>{const k=step('co',d);if(k)s.color=CO[(CO.indexOf(s.color)+k+CO.length)%CO.length];},v:()=>Math.max(0,CO.indexOf(s.color))/7,press:()=>{G.msg='Invert colour: not simulated';}},
      null,
      {l:'Name',get:()=>SNIP[G.snip],set:d=>{const k=step('sn',d);if(k)G.snip=(G.snip+k+SNIP.length)%SNIP.length;},v:()=>G.snip/(SNIP.length-1),press:()=>{s.name=SNIP[G.snip];G.msg=s.num+' named '+s.name;}},
      null,null];}
  if(G.page!=='home')return [];
  const E=(l,get,set,v)=>({l,get,set,v});
  const fd=E('Fader',()=>fmtDb(f2db(s.fader))+' dB',d=>{s.fader=cl(s.fader+d*.01);},()=>s.fader);
  if(!p)return [fd];
  const g=E('Gain',()=>'+'+p.gain.toFixed(1)+' dB',d=>p.gain=cl(p.gain+d*.5,0,60),()=>p.gain/60),
    lcf=E('Low cut',()=>Math.round(p.lcf)+' Hz',d=>p.lcf=cl(p.lcf*Math.pow(1.03,d),20,400),()=>Math.log(p.lcf/20)/Math.log(20)),
    gt=E('Gate thr',()=>p.gthr.toFixed(0)+' dB',d=>p.gthr=cl(p.gthr+d*.5,-80,0),()=>(p.gthr+80)/80),
    ct=E('Comp thr',()=>p.cthr.toFixed(0)+' dB',d=>p.cthr=cl(p.cthr+d*.5,-60,0),()=>(p.cthr+60)/60),
    ra=E('Ratio',()=>p.ratio.toFixed(1)+':1',d=>p.ratio=cl(p.ratio+d*.1,1.1,20),()=>(p.ratio-1)/19),
    pn=E('Pan',()=>p.pan===0?'C':(p.pan<0?'L':'R')+Math.round(Math.abs(p.pan)*100),d=>p.pan=cl(p.pan+d*.02,-1,1),()=>(p.pan+1)/2),
    ef=E('Freq',()=>fmtF(b.f),d=>b.f=cl(b.f*Math.pow(1.03,d),20,20000),()=>Math.log(b.f/20)/Math.log(1000)),
    eg=E('Gain',()=>(b.g>0?'+':'')+b.g.toFixed(1)+' dB',d=>b.g=cl(b.g+d*.25,-15,15),()=>(b.g+15)/30),
    eq=E('Width',()=>'Q '+b.q.toFixed(1),d=>b.q=cl(b.q*Math.pow(1.03,d),.3,10),()=>Math.log(b.q/.3)/Math.log(10/.3)),
    mc=E('M/C lvl',()=>Math.round(p.mcl*100)+' %',d=>p.mcl=cl(p.mcl+d*.01),()=>p.mcl);
  return {home:[g,lcf,gt,ct,pn,fd],config:[g,lcf,null,null,null,fd],gate:[gt,null,null,null,null,fd],dyn:[ct,ra,null,null,null,fd],eq:[ef,eg,eq,null,null,fd],sends:[null,null,null,null,null,fd],main:[pn,mc,null,null,null,fd]}[G.tab]||[];}
const cl=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const fmtF=f=>f>=1000?(f/1000).toFixed(f>=10000?1:2)+'k':Math.round(f)+'';
function encVal(i){const e=encDefs()[i];return e?e.v():-1;}
function drawScreen(){const g=scr();if(!g)return;const on=G.power;
  if(!on){g.innerHTML='';return;}
  if(G.boot){g.innerHTML=`<rect width="252" height="158" fill="#000"/>${T(126,74,'◉ MIDAS','mx-sbig')}${T(126,92,'M32R LIVE · booting…','mx-s')}`;return;}
  const s=S[G.sel],p=P[G.sel];let h=`<rect width="252" height="158" fill="#0e1622"/><rect width="252" height="16" fill="#1c2a3e"/>`;
  h+=`<rect x="2" y="2" width="12" height="12" rx="2" fill="${COL[s.color]||COL.off}"/>`+T(18,11,s.num+'  '+(s.name||''),'mx-s','start')+T(150,11,'00 Default','mx-samb','start')+T(248,11,'12:00','mx-s','end');
  if(G.page==='home'){h+=TABS.map((t,i)=>`<rect x="${2+i*35.5}" y="19" width="34" height="11" rx="2" fill="${G.tab===t?'#3d6db3':'#22324a'}"/>`+T(19+i*35.5,27.4,t,'mx-st')).join('');h+=homeBody(s,p);}
  else if(G.page==='meters')h+=T(126,28,'METERS · channel','mx-s')+`<g id="mx-smet"></g>`;
  else if(G.page==='effects'){h+=T(126,27,'EFFECTS RACK — enc 6 picks the slot · enc 1-2 edit it','mx-st');
    for(let i=1;i<=8;i++){const y=34+(i-1)*11,cur=i===G.fxSel,d=FXDEF[i];h+=(cur?`<rect x="4" y="${y}" width="244" height="10" rx="2" fill="#3d6db3"/>`:'')+
      T(8,y+7.5,'FX'+i+'  '+(d?d.name:'— empty —'),cur?'mx-sv':'mx-st').replace('text-anchor="middle"','text-anchor="start"')+
      T(244,y+7.5,i<=4?'in: Mix '+(12+i)+' → FX RET '+i+'L/R':'insert slot','mx-st').replace('text-anchor="middle"','text-anchor="end"');}}
  else if(G.page==='mutegrp'){h+=T(126,25,'MUTE GROUPS — push an encoder to mute / unmute','mx-st')+T(126,33,'assign: hold encoder + SEL  (mouse: Shift+click encoder, then Shift+click SEL)','mx-st');
    G.mg.forEach((g,i)=>{const x=4+i*41.3;h+=`<rect x="${x}" y="36" width="39" height="70" rx="3" fill="${g.on?'#7a2222':'#1d2a3d'}" stroke="${G.mgArm===i?'#ffb347':'#3b4a66'}" stroke-width="${G.mgArm===i?2:1}"/>`+T(x+19.5,50,'MG '+(i+1),'mx-sv')+T(x+19.5,64,g.on?'MUTED':'—','mx-st')+
      g.m.slice(0,3).map((id,k)=>T(x+19.5,78+k*9,S[id].num,'mx-st')).join('')+(g.m.length>3?T(x+19.5,104,'+'+(g.m.length-3),'mx-st'):'');});}
  else if(G.page==='scenes'){const sc=scenes();h+=T(126,28,'SCENES — encoder 1 picks the scene · push 5 = Save · push 6 = Load','mx-st');
    for(let k=-2;k<=2;k++){const n=G.scene+k;if(n<0||n>99)continue;const y=52+(k+2)*14,cur=k===0;
      h+=(cur?`<rect x="20" y="${y-9}" width="212" height="12" rx="2" fill="#3d6db3"/>`:'')+T(26,y,String(n).padStart(2,'0')+'  '+(sc[n]?sc[n].name+'  · saved':'(empty)'),cur?'mx-sv':'mx-st').replace('text-anchor="middle"','text-anchor="start"');}
    if(G.msg)h+=T(126,121,G.msg,'mx-samb');}
  else if(G.page==='library'){const L=libList();h+=T(126,25,'LIBRARY · channel → '+s.num+' '+s.name,'mx-sv');
    LIBSC.forEach(([k,l],i)=>{const x=4+i*41.3,on=G.libScope[k];h+=`<rect x="${x}" y="30" width="39" height="12" rx="2" fill="${on?'#2f6b3a':'#2a2b30'}" stroke="${G.libCur===i?'#ffb347':'none'}"/>`+T(x+19.5,38.5,l,'mx-st');});
    for(let k=-2;k<=2;k++){const n=G.libSel+k,c=L[n];if(!c)continue;const y=56+(k+2)*12,cur=k===0;
      h+=(cur?`<rect x="20" y="${y-8.5}" width="212" height="11" rx="2" fill="#3d6db3"/>`:'')+T(26,y,String(c.slot).padStart(3,'0')+'  '+c.name,cur?'mx-sv':'mx-st').replace('text-anchor="middle"','text-anchor="start"');}
    h+=T(126,118,'enc 1 recall list · 2 load · 3 save to '+String(G.libSlot).padStart(3,'0')+' · 4 delete','mx-st')+(G.msg?T(126,108,G.msg,'mx-samb'):'');}
  else if(G.page==='setup'){h+=T(126,25,'SETUP · scribble strips','mx-sv')+`<rect x="70" y="36" width="112" height="40" rx="4" fill="${COL[s.color]||COL.off}" stroke="#55585f"/>`+T(126,52,s.num,'mx-sv')+T(126,68,s.name||'','mx-sv')+
      T(126,92,'enc 1 channel · 2 colour · 4 name list (push = assign) — icon and text editor not simulated','mx-st')+(G.msg?T(126,110,G.msg,'mx-samb'):'');}
  else{const NA={routing:'ROUTING: local IN 1-16 → channels 1-16, OUT 7/8 = MAIN L/R. Choose what arrives at each IN by clicking its socket on the rear panel.',library:'',monitor:'MONITOR: monitor source, talkback and oscillator. Use the MONITOR / PHONES knobs.',scenes:'SCENES: save / recall full console snapshots. Not simulated yet.',mutegrp:'MUTE GRP: the 6 mute groups on the screen encoders. Not simulated yet.',recorder:'RECORDER: USB stick / DN32-USB multitrack recording. Not simulated.'};
    h+=T(126,40,G.page.toUpperCase(),'mx-sbig')+wrap(NA[G.page]||'',126,62,40);}
  // encoder row
  if(G.flip){const t=G.flip.mode==='bus'?'SENDS ON FADER · input faders = sends to '+S['bus'+G.flip.bus].name:'SENDS ON FADER · bus faders = sends of '+S[G.flip.ch].num+' '+S[G.flip.ch].name;h+=`<rect x="0" y="112" width="252" height="13" fill="#b5651d"/>`+T(126,121,t,'mx-st');}
  const E=encDefs();h+=`<rect x="0" y="128" width="252" height="30" fill="#14202f"/>`;
  for(let i=0;i<6;i++){const e=E[i],x=21+i*42;if(!e)continue;h+=T(x,139,e.l,'mx-st')+T(x,151,e.get(),'mx-sv');}
  g.innerHTML=h;}
function wrap(t,x,y,n){const w=t.split(' '),L=[];let c='';w.forEach(z=>{if((c+' '+z).trim().length>n){L.push(c.trim());c=z;}else c+=' '+z;});L.push(c.trim());
  return L.map((l,i)=>T(x,y+i*11,l,'mx-s')).join('');}
function homeBody(s,p){let h='';
  if(!p&&s.type==='dca'){const m=G.dcaM[s.id];return T(126,48,s.name+' — DCA group','mx-s')+T(126,64,m.length?'Members: '+m.map(id=>S[id].num).join(' '):'No members yet','mx-sv')+T(126,80,'Hold this SEL + press channel SELs (mouse: Shift+click them).','mx-st')+T(126,96,'Fader '+fmtDb(f2db(s.fader))+' dB (added to every member)'+(s.mute?' · MUTED':''),'mx-st');}
  if(!p&&s.type==='bus'){const n=busN(s.id),snd=Object.keys(P).filter(id=>P[id].sends[n]>0).map(id=>S[id].num);return T(126,48,s.name+' — mix bus (e.g. a monitor mix)','mx-s')+T(126,64,snd.length?'Fed by: '+snd.join(' '):'No sends yet','mx-sv')+T(126,80,'SEL this bus + FADER FLIP: the input faders become its sends.','mx-st')+T(126,96,'Hear it with SOLO. Fader '+fmtDb(f2db(s.fader))+' dB'+(s.mute?' · MUTED':''),'mx-st');}
  if(!p){return T(126,70,s.name+' — '+({aux:'aux input',fx:'effects return',bus:'mix bus',dca:'DCA group',mtx:'matrix',mainc:'mono/centre bus',main:'main stereo bus'}[s.type]||''),'mx-s')+
    T(126,90,'Fader '+fmtDb(f2db(s.fader))+' dB'+(s.mute?' · MUTED':''),'mx-s')+T(126,108,'(processing of buses not simulated yet)','mx-st');}
  if(G.tab==='eq')return eqGraph(p);
  const blk=(x,l,v,on)=>`<rect x="${x}" y="36" width="38" height="40" rx="3" fill="${on?'#2c5a3a':'#20283a'}" stroke="#3b4a66"/>`+T(x+19,48,l,'mx-st')+T(x+19,64,v,'mx-sv');
  h+=blk(4,'Config',(p.p48?'48V ':'')+'+'+p.gain.toFixed(0),true)+blk(45,'Lo cut',p.lc?Math.round(p.lcf)+'Hz':'off',p.lc)+blk(86,'Gate',p.gate?p.gthr.toFixed(0):'off',p.gate)+blk(127,'Dyn',p.comp?p.cthr.toFixed(0):'off',p.comp)+blk(168,'EQ',p.eq?'on':'off',p.eq)+blk(209,'Main',(p.st?'LR ':'')+(p.mono?'M':''),p.st||p.mono);
  h+=`<g id="mx-shm"></g>`+T(126,126,'Fader '+fmtDb(f2db(s.fader))+' dB · Pan '+(p.pan===0?'C':(p.pan<0?'L':'R')+Math.round(Math.abs(p.pan)*100))+(s.mute?' · MUTED':''),'mx-s');
  const nIn=+G.sel.slice(2);h+=T(126,108,'Source: '+(nIn<=16?'Local IN '+nIn:'AES50-A '+(nIn-16)),'mx-st');
  if(S[G.sel].cond&&!p.p48)h+=T(126,117,'⚠ condenser mic: needs 48 V','mx-warn');
  if(false)h+=`<g class="mx-micbtn" data-b="usemic"><rect x="70" y="80" width="112" height="16" rx="3" fill="#3d6db3"/>${T(126,91,A.micErr?'mic blocked by browser':'▶ use my microphone','mx-st')}</g>`;
  return h;}
function eqGraph(p){const W=244,H=88,X=4,Y=34;let h=`<rect x="${X}" y="${Y}" width="${W}" height="${H}" fill="#0a111b" stroke="#2c3b55"/>`;
  [100,1000,10000].forEach(f=>{const x=X+W*Math.log(f/20)/Math.log(1000);h+=`<line x1="${x}" y1="${Y}" x2="${x}" y2="${Y+H}" stroke="#1e2a3d"/>`+T(x,Y+H-2,fmtF(f),'mx-st');});
  h+=`<line x1="${X}" y1="${Y+H/2}" x2="${X+W}" y2="${Y+H/2}" stroke="#2c3b55"/>`;
  if(A&&A.ch[G.sel]&&p.eq){const N=120,fr=new Float32Array(N),mag=new Float32Array(N),ph=new Float32Array(N),tot=new Float32Array(N).fill(1);
    for(let i=0;i<N;i++)fr[i]=20*Math.pow(1000,i/(N-1));A.ch[G.sel].eq.forEach(f=>{f.getFrequencyResponse(fr,mag,ph);for(let i=0;i<N;i++)tot[i]*=mag[i];});
    h+=`<polyline fill="none" stroke="#ffb347" stroke-width="1.6" points="${Array.from(tot,(m,i)=>`${(X+W*i/(N-1)).toFixed(1)},${(Y+H/2-cl(20*Math.log10(m),-18,18)/18*(H/2)).toFixed(1)}`).join(' ')}"/>`;}
  else h+=T(X+W/2,Y+H/2-4,p.eq?'power the console to see the curve':'EQ off','mx-st');
  const b=p.b[p.band];h+=T(126,Y+H+4+0,'','mx-st');return h+T(X+4,Y+9,p.band.toUpperCase()+' · '+b.t+' · '+fmtF(b.f)+' Hz · '+(b.g>0?'+':'')+b.g.toFixed(1)+' dB','mx-st').replace('text-anchor="middle"','text-anchor="start"');}
function drawScreenMeters(){const g=svg.querySelector('#mx-smet')||svg.querySelector('#mx-shm');if(!g||!A)return;const met=g.id==='mx-smet';
  const ids=met?stripsIn():[G.sel];let h='';
  ids.forEach((id,k)=>{const v=A.ch[id]?lev[id+':post']:-120,f=cl((v+60)/60),x=met?14+k*28:200,y0=met?120:118,hh=met?84:0;
    if(met)h+=`<rect x="${x}" y="${y0-hh}" width="14" height="${hh}" fill="#132033"/><rect x="${x}" y="${y0-hh*f}" width="14" height="${hh*f}" fill="${v>-0.1?'#e5372a':v>-12?'#e8c33a':'#3be07a'}"/>`+T(x+7,y0+7,S[id].num,'mx-st');});
  if(!met){const v=A.ch[G.sel]?lev[G.sel+':pre']:-120,f=cl((v+60)/60);h=`<rect x="4" y="82" width="244" height="8" fill="#132033"/><rect x="4" y="82" width="${244*f}" height="8" fill="${v>-0.1?'#e5372a':v>-12?'#e8c33a':'#3be07a'}"/>`+T(6,98,'input level (after GAIN)','mx-st').replace('text-anchor="middle"','text-anchor="start"');}
  g.innerHTML=h;}
function diag(){const el=document.getElementById('mx-diag');if(!el)return;const s=S[G.sel],p=P[G.sel],has=!!(A&&A.ch[G.sel]);
  const it=(ok,t)=>`<span class="pw-chip ${ok?'ok':'bad'}"><i></i>${t}</span>`;
  el.innerHTML=it(G.power,'Console POWER (rear)')+(p?it(has&&(!s.cond||p.p48)&&performance.now()-(G.sigT[G.sel]||-1e9)<1500,'Signal at the preamp (input meter ≥ −30 dB'+(s.cond?' · needs 48 V':'')+')')+it(p.st,'MAIN STEREO on')+it(!s.mute&&s.fader>.3,'Channel fader up, not muted'):'')+
    it(!S.main.mute&&S.main.fader>.3,'MAIN fader up')+it(Math.max(G.mon,G.phones)>.05,'MONITOR / PHONES level')+`<span class="mx-sel">Selected: <b>${s.num} ${s.name}</b>${s.mic?' · '+s.mic:''}</span>`;}

/* ---------- interaction ---------- */
function srcInfo(id){const s=S[id];if(!s)return '';const n=+id.slice(2);
  if(s.type==='in')return n<=16?`Source: rear socket IN ${n} ← ${SOURCES[SRC[id]].l}${s.cond?' (condenser: needs 48 V)':''} — click IN ${n} on the rear panel to change it.`:`Source: channel ${n} has no local input (IN 1-16 only; 17-32 would come from AES50 stage boxes).`;
  return {aux:'Aux input: AUX IN 1-2 = TC Electronic M350 return (fed by Mix 1-2 on AUX OUT 1-2), AUX IN 3-4 = Behringer Virtualizer return (Mix 3-4 → AUX OUT 3-4) — the outboard effects of the audio rack. Send a channel to Mix 1 / 2 (FADER FLIP) and raise these faders.',fx:'Effects return: FX1 Hall reverb ← Mix 13, FX2 Plate ← Mix 14, FX3 Delay ← Mix 15, FX4 Chorus ← Mix 16. Send a channel to that mix bus (FADER FLIP) and raise this return fader.',bus:'Mix bus (e.g. a monitor mix for the studio): fed by the channel sends (FADER FLIP). Hear it with SOLO.',dca:'DCA group: one fader that controls several channels. Assign: hold its SEL + press channel SELs (mouse: SEL the DCA, then Shift+click the channels).',mtx:'Matrix: a copy of the main mix with its own level, for another destination (recording, lobby speakers…). Hear it with SOLO.',mainc:'Mono / centre bus (Main C): fed by MONO CENTRE + M/C LEVEL of each channel. Shown on the M/C meter next to the screen.',main:'Main stereo bus (L/R) → OUT 7/8.'}[s.type]||'';}
function stripId(slot){if(slot==='m')return 'main';const k=+slot.slice(1);return slot[0]==='a'?stripsIn()[k]:stripsBus()[k];}
function press(id){if(!G.power||G.boot)return;const p=P[G.sel];
  let m;
  if((m=id.match(/^sel:(.+)$/))){const sid=stripId(m[1]);if(!sid);
    else if(G.page==='mutegrp'&&S[sid].type==='in'&&(G.holdEnc!=null||(G.shiftDown&&G.mgArm!=null))){const a=G.mg[G.holdEnc??G.mgArm].m,i=a.indexOf(sid);i<0?a.push(sid):a.splice(i,1);}
    else if(S[sid].type==='in'&&((G.holdSel&&S[G.holdSel].type==='dca'&&sid!==G.holdSel)||(G.shiftDown&&S[G.sel].type==='dca'))){const dc=G.holdSel&&S[G.holdSel].type==='dca'?G.holdSel:G.sel,a=G.dcaM[dc],i=a.indexOf(sid);i<0?a.push(sid):a.splice(i,1);}
    else{G.sel=sid;G.holdSel=sid;}}
  else if((m=id.match(/^solo:(.+)$/))){const s=S[stripId(m[1])];if(s)s.solo=!s.solo;}
  else if((m=id.match(/^mute:(.+)$/))){const s=S[stripId(m[1])];if(s)s.mute=!s.mute;}
  else if(id==='clrsolo')Object.values(S).forEach(s=>s.solo=false);
  else if((m=id.match(/^L:(.+)$/)))G.inL=m[1];
  else if((m=id.match(/^B:(.+)$/)))G.busL=m[1];
  else if(p&&['p48','pol','lc','gate','comp','eq','st','mono'].includes(id))p[id]=!p[id];
  else if(p&&id==='eqmode'){const allowed={low:['LCUT','LSHV','PEQ','VEQ'],lomid:['PEQ','VEQ'],himid:['PEQ','VEQ'],high:['HCUT','HSHV','PEQ','VEQ']}[p.band],b=p.b[p.band];b.t=allowed[(allowed.indexOf(b.t)+1)%allowed.length];}
  else if(p&&(m=id.match(/^band:(.+)$/)))p.band=m[1];
  else if((m=id.match(/^asg:(\d)$/)))G.assign[+m[1]]=!G.assign[+m[1]];
  else if(id==='dim')G.dim=!G.dim;else if(id==='talkA')G.talkA=!G.talkA;else if(id==='talkB')G.talkB=!G.talkB;else if(id==='flip'){const t=S[G.sel].type;if(G.flip)G.flip=null;else if(t==='bus')G.flip={mode:'bus',bus:busN(G.sel)};else if(t==='in'){G.flip={mode:'ch',ch:G.sel};if(G.busL!=='b1'&&G.busL!=='b2')G.busL='b1';}}else if(id==='rem')G.rem=!G.rem;
  else if(id==='scr:utility'){if(G.page==='home'){G.page='library';G.msg='';}else if(G.page==='routing'||G.page==='effects')G.msg='LIBRARY routing / effects tab: not simulated';else if(G.page==='setup'){}else G.msg='No utility functions on this screen';}   // UTILITY = shortcut in the context of the current screen
  else if((m=id.match(/^scr:(.+)$/))){G.page=G.page===m[1]&&m[1]==='mutegrp'?'home':m[1];if(m[1]==='home')G.tab='home';G.msg='';}
  else if(id.startsWith('v')){const t={vcfg:'config',vgate:'gate',vdyn:'dyn',veq:'eq',vmain:'main',vsend:'sends'}[id];if(t){G.page='home';G.tab=t;}else G.page={vmon:'monitor',vrec:'recorder',vasg:'setup'}[id]||G.page;}
  else if(id==='cur:left'||id==='cur:right'){if(G.page==='home'){const i=TABS.indexOf(G.tab);G.tab=TABS[(i+(id==='cur:right'?1:TABS.length-1))%TABS.length];}}
  applyCh(G.sel);applyAll();draw();}
function knobSet(id,d){const p=P[G.sel],b=p&&p.b[p.band];
  if(id.startsWith('enc')){const e=encDefs()[+id.slice(3)];if(e)e.set(d);}
  else if(id==='mon')G.mon=cl(G.mon+d*.01);else if(id==='phones')G.phones=cl(G.phones+d*.01);else if(id==='talk')G.talk=cl(G.talk+d*.01);
  else if(!p)return;
  else if(id==='gain')p.gain=cl(p.gain+d*.5,0,60);else if(id==='lcf')p.lcf=cl(p.lcf*Math.pow(1.03,d),20,400);
  else if(id==='gthr')p.gthr=cl(p.gthr+d*.5,-80,0);else if(id==='cthr')p.cthr=cl(p.cthr+d*.5,-60,0);
  else if(id==='eqw')b.q=cl(b.q*Math.pow(1.03,d),.3,10);else if(id==='eqf')b.f=cl(b.f*Math.pow(1.03,d),20,20000);else if(id==='eqg')b.g=cl(b.g+d*.25,-15,15);
  else if(id==='mcl')p.mcl=cl(p.mcl+d*.01);else if(id==='pan')p.pan=cl(p.pan+d*.02,-1,1);
  applyCh(G.sel);applyMain();draw();}
/* live readout while dragging a fader / knob (the tooltip follows the hand) */
function liveTip(e,name,val){tip.innerHTML=`<b>${name}</b><span>${val}</span>`;tip.style.left=e.clientX+'px';tip.style.top=e.clientY+'px';tip.classList.add('on');}
function knobText(id){const p=P[G.sel],b=p&&p.b[p.band],pc=v=>Math.round(v*100)+' %';
  if(id.startsWith('enc')){const e=encDefs()[+id.slice(3)];return e?e.l+': '+e.get():'';}
  switch(id){case 'mon':return pc(G.mon);case 'phones':return pc(G.phones);case 'talk':return pc(G.talk);}
  if(!p)return '';switch(id){case 'gain':return '+'+p.gain.toFixed(1)+' dB';case 'lcf':return Math.round(p.lcf)+' Hz'+(p.lc?'':' (LOW CUT off)');
    case 'gthr':return p.gthr.toFixed(1)+' dB'+(p.gate?'':' (GATE off)');case 'cthr':return p.cthr.toFixed(1)+' dB'+(p.comp?'':' (COMP off)');
    case 'eqw':return p.band.toUpperCase()+' · Q '+b.q.toFixed(2);case 'eqf':return p.band.toUpperCase()+' · '+fmtF(b.f)+' Hz';case 'eqg':return p.band.toUpperCase()+' · '+(b.g>0?'+':'')+b.g.toFixed(1)+' dB';
    case 'mcl':return fmtDb(f2db(p.mcl))+' dB';case 'pan':return p.pan===0?'Centre':(p.pan<0?'L ':'R ')+Math.round(Math.abs(p.pan)*100);}return '';}
const KNAME={gain:'GAIN',lcf:'LOW CUT FREQUENCY',gthr:'GATE THRESHOLD',cthr:'COMP THRESHOLD',eqw:'EQ WIDTH',eqf:'EQ FREQUENCY',eqg:'EQ GAIN',mcl:'M/C LEVEL',pan:'PAN/BAL',mon:'MONITOR LEVEL',phones:'PHONES LEVEL',talk:'TALK LEVEL'};
function build(){if(root.dataset.built)return;root.dataset.built='1';
  document.getElementById('mx-front').innerHTML=surface();
  svg=root.querySelector('.mx-svg');rear=root.querySelector('.mx-rear');
  const pt=e=>{const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(svg.getScreenCTM().inverse());};
  svg.addEventListener('pointerdown',e=>{G.shiftDown=e.shiftKey;
    const f=e.target.closest('.mx-f');
    if(f&&G.power&&!G.boot){const sid=stripId(f.dataset.slot);if(!sid)return;e.preventDefault();
      if(e.shiftKey){fSet(f.dataset.slot,sid,.75);liveTip(e,S[sid].num+' '+(S[sid].name||''),(G.flip&&fVal(f.dataset.slot,sid)!==S[sid].fader?'Send':'Fader')+': 0.0 dB');if(S[sid].type==='dca'||G.flip)applyAll();else if(S[sid].type==='in')applyCh(sid);applyMain();draw();return;}   // simulator shortcut: Shift+click = 0 dB
      try{svg.setPointerCapture(e.pointerId);}catch(_){}
      const cap=f.querySelector('.mx-cap');cap.classList.add('drag');G.dragging=true;
      const set=ev=>{const q=svg.createSVGPoint();q.x=ev.clientX;q.y=ev.clientY;const y=q.matrixTransform(f.getScreenCTM().inverse()).y;fSet(f.dataset.slot,sid,cl((FY1-y)/(FY1-FY0)));{const v=fVal(f.dataset.slot,sid),fl=G.flip&&v!==S[sid].fader;liveTip(ev,S[sid].num+' '+(S[sid].name||''),(fl?'Send '+(G.flip.mode==='bus'?'→ '+S['bus'+G.flip.bus].name:'→ '+S[sid].name)+': ':'Fader: ')+fmtDb(f2db(v))+' dB');}if(S[sid].type==='dca'||G.flip)applyAll();else if(S[sid].type==='in')applyCh(sid);applyMain();draw();};set(e);
      const up=()=>{cap.classList.remove('drag');G.dragging=false;svg.removeEventListener('pointermove',set);svg.removeEventListener('pointerup',up);svg.removeEventListener('pointercancel',up);};
      svg.addEventListener('pointermove',set);svg.addEventListener('pointerup',up);svg.addEventListener('pointercancel',up);return;}
    const k=e.target.closest('.mx-k');
    if(k&&G.power&&!G.boot){e.preventDefault();
      if(e.shiftKey&&['pan','eqg'].includes(k.dataset.k)){const p=P[G.sel],b=p&&p.b[p.band];if(!p)return;k.dataset.k==='pan'?p.pan=0:b.g=0;applyCh(G.sel);applyMain();draw();liveTip(e,KNAME[k.dataset.k],knobText(k.dataset.k));return;}   // simulator shortcut: Shift+click = centre
      try{svg.setPointerCapture(e.pointerId);}catch(_){}let y0=e.clientY,moved=false;G.dragging=true;const ei=k.dataset.k.startsWith('enc')?+k.dataset.k.slice(3):null;if(ei!=null&&G.page==='mutegrp')G.holdEnc=ei;
      const mv=ev=>{const d=(y0-ev.clientY);if(Math.abs(d)>=2){moved=true;knobSet(k.dataset.k,Math.round(d/2));y0=ev.clientY;}const kk=k.dataset.k;liveTip(ev,KNAME[kk]||('Screen encoder '+(+kk.slice(3)+1)),knobText(kk));};
      const up=()=>{G.dragging=false;svg.removeEventListener('pointermove',mv);svg.removeEventListener('pointerup',up);svg.removeEventListener('pointercancel',up);
        if(ei!=null){const hadAssign=G.holdEnc!=null&&G.mgAssigned;G.holdEnc=null;G.mgAssigned=false;if(!moved&&!hadAssign)encPress(ei);}};
      svg.addEventListener('pointermove',mv);svg.addEventListener('pointerup',up);svg.addEventListener('pointercancel',up);return;}
    const b=e.target.closest('[data-b]');if(b){e.preventDefault();if(G.holdEnc!=null&&b.dataset.b.startsWith('sel:'))G.mgAssigned=true;press(b.dataset.b);
      const rel=()=>{if(b.dataset.b.startsWith('sel:'))G.holdSel=null;svg.removeEventListener('pointerup',rel);};svg.addEventListener('pointerup',rel);}});
  svg.addEventListener('wheel',e=>{
    if(e.ctrlKey){e.preventDefault();const p=toVB(e);zoomAt(p.x,p.y,Math.exp(-e.deltaY*.012));return;}   // trackpad pinch / ctrl+wheel = zoom the desk
    const k=e.target.closest('.mx-k');if(k&&G.power){e.preventDefault();knobSet(k.dataset.k,e.deltaY<0?2:-2);return;}
    if(root.classList.contains('zoomed')){e.preventDefault();const [x,y,w,h]=curVB(),s2=w/svg.clientWidth;setVB([x+e.deltaX*s2,y+e.deltaY*s2,w,h]);}},{passive:false});
  svg.addEventListener('dblclick',e=>{
    if(e.target.closest('[data-b],.mx-k,.mx-f,.mx-sock,.mx-power'))return;const p=toVB(e);root.classList.contains('zoomed')?setVB(VB0,true):(()=>{const [x,y,w,h]=curVB(),f=2.4;setVB([p.x-w/f/2,p.y-h/f/2,w/f,h/f],true);})();});
  svg.addEventListener('pointerdown',e=>{if(!root.classList.contains('zoomed')||e.target.closest('[data-b],.mx-k,.mx-f,.mx-sock,.mx-power'))return;
    const x0=e.clientX,y0=e.clientY,v0=curVB().slice(),s2=v0[2]/svg.clientWidth;try{svg.setPointerCapture(e.pointerId);}catch(_){}svg.classList.add('panning');
    const mv=ev=>setVB([v0[0]-(ev.clientX-x0)*s2,v0[1]-(ev.clientY-y0)*s2,v0[2],v0[3]]),up=()=>{svg.classList.remove('panning');svg.removeEventListener('pointermove',mv);svg.removeEventListener('pointerup',up);};
    svg.addEventListener('pointermove',mv);svg.addEventListener('pointerup',up);});
  root.querySelectorAll('[data-zoom]').forEach(b=>b.addEventListener('click',()=>focus(b.dataset.zoom)));
  rear.querySelectorAll('.mx-sock').forEach(g=>g.addEventListener('click',e=>{e.stopPropagation();plugMenu(g.dataset.in==='talk'?'talk':+g.dataset.in,e);}));
  root.addEventListener('pointerdown',e=>{if(!e.target.closest('#mx-plugmenu,.mx-sock'))document.getElementById('mx-plugmenu').classList.remove('on');});
  rear.querySelector('.mx-power').addEventListener('click',async()=>{G.power=!G.power;
    if(G.power){G.boot=true;draw();await startAudio();setTimeout(()=>{G.boot=false;applyAll();draw();},1400);}else{applyMain();if(A)A.ctx.suspend();}draw();});
  root.addEventListener('mousemove',e=>{if(G.dragging)return;const m=e.target.closest('[data-name]');if(!m||!root.contains(m)){tip.classList.remove('on');return;}
    let name=m.dataset.name,t=m.dataset.tip||TIPS[m.dataset.b||m.dataset.k]||'';
    if(m.dataset.k&&KNAME[m.dataset.k])name=KNAME[m.dataset.k];
    if(m.classList.contains('mx-f')){const s=S[stripId(m.dataset.slot)];name=s?s.num+' '+s.name:'(empty)';t=s?'Fader: '+fmtDb(f2db(s.fader))+' dB — drag it. Simulator: Shift+click = 0 dB.':'';}
    if(m.dataset.b?.startsWith('sel:'))t='Selects this channel: the knobs above and the screen now edit it.';
    if(m.dataset.b?.startsWith('solo:'))t='SOLO: listen to this channel alone (PFL) in the monitors / phones.';
    if(m.dataset.b?.startsWith('mute:'))t='MUTE: cuts this channel.';
    if(m.dataset.b?.startsWith('L:')||m.dataset.b?.startsWith('B:'))t='Fader layer: changes what the '+(m.dataset.b[0]==='L'?'left 8 (input)':'right 8 (group/bus)')+' faders control. The motorised faders move to their stored positions.';
    if(m.dataset.b?.startsWith('v'))t=t||'VIEW: opens this section on the screen.';
    if(m.dataset.b?.startsWith('scr:'))t='Screen page.';
    if(m.dataset.in==='talk'){name='TALKBACK MIC (XLR)';t=(SRC.talk==='none'?'Nothing plugged in.':'Plugged: '+SOURCES[SRC.talk].l+'.')+' TALK A → mix buses 1-6 (studio monitors), TALK B → main L/R. Click to plug / unplug.';}
    else if(m.dataset.in){const n=+m.dataset.in,k=SRC['in'+n];name='IN '+n+' (XLR, Midas PRO preamp) → Ch'+String(n).padStart(2,'0');t=(k==='none'?'Nothing plugged in.':'Plugged: '+SOURCES[k].l+'.')+' Click to plug / unplug a cable.';}
    if(m.dataset.k?.startsWith('enc')){const en=encDefs()[+m.dataset.k.slice(3)];name='Screen encoder '+(+m.dataset.k.slice(3)+1);t=en?'Edits: '+en.l+' ('+en.get()+')':'Nothing on this page.';}
    const slot=m.dataset.lcd||m.dataset.slot||(m.dataset.b||'').split(':')[1];
    if(slot&&/^(a\d|b\d|m)$/.test(slot)){const sid=stripId(slot);if(sid){const s=S[sid];if(m.dataset.lcd){name=s.num+' '+(s.name||'');t='Scribble strip: number, name and colour of the channel.';}t+=(t?'<br>':'')+srcInfo(sid);}}
    tip.innerHTML=`<b>${name}</b>${t?`<span>${t}</span>`:''}`;tip.style.left=e.clientX+'px';tip.style.top=e.clientY+'px';tip.classList.add('on');});
  root.addEventListener('mouseleave',()=>tip.classList.remove('on'));
  document.getElementById('mx-photo').addEventListener('click',e=>{const on=root.classList.toggle('photo');e.currentTarget.textContent=on?'Recreation':'Real photo';});
  document.getElementById('mx-close').addEventListener('click',()=>window.closeMixer());
  document.getElementById('mx-trp').addEventListener('click',e=>{const b=e.target.closest('[data-t]'),bar=e.target.closest('.mx-tbar');if(!A)return;
    if(bar){const r=bar.getBoundingClientRect();return packPlayFrom((e.clientX-r.left)/r.width*clipLen());}
    if(!b)return;const t=b.dataset.t;if(t==='pp')A.packPaused!=null?packPlayFrom(A.packPaused):packPause();else if(t==='start')packPlayFrom(0);else if(t==='song')packPlayFrom(SONG_AT-.5);});
  document.getElementById('mx-lay').addEventListener('click',()=>{LAY=LAY==='side'?'real':'side';fit();});
  document.getElementById('mx-guidebtn').addEventListener('click',()=>{document.getElementById('mx-guide').classList.toggle('on');});
  document.getElementById('mx-guideclose').addEventListener('click',()=>document.getElementById('mx-guide').classList.remove('on'));
  Object.entries(SRC).forEach(([id,k])=>{const m=SOURCES[k];if(S[id])Object.assign(S[id],{name:m.name,mic:m.mic,cond:!!m.cond,color:m.color});});
  draw();meterTick();}
let LAY=null,VB0=null,ZV=null,anim=0;
const curVB=()=>ZV||VB0;
function setVB(v,smooth){const from=curVB().slice(),to=clampVB(v);cancelAnimationFrame(anim);
  if(!smooth||document.hidden){ZV=to;svg.setAttribute('viewBox',to.join(' '));zoomUI();return;}
  const t0=performance.now();const step=t=>{const k=Math.min(1,(t-t0)/260),e=1-Math.pow(1-k,3),v2=from.map((a,i)=>a+(to[i]-a)*e);svg.setAttribute('viewBox',v2.join(' '));ZV=v2;if(k<1)anim=requestAnimationFrame(step);else{ZV=to;zoomUI();}};anim=requestAnimationFrame(step);}
function clampVB([x,y,w,h]){const [X,Y,W,H]=VB0;w=Math.min(W,Math.max(W/8,w));h=w*H/W;x=Math.min(X+W-w,Math.max(X,x));y=Math.min(Y+H-h,Math.max(Y,y));return [x,y,w,h];}
function zoomAt(px,py,f){const [x,y,w,h]=curVB(),nw=w/f,nh=h/f;setVB([px-(px-x)*nw/w,py-(py-y)*nh/h,nw,nh]);}
function toVB(e){const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(svg.getScreenCTM().inverse());}
function rectOf(el){const r=el.getBoundingClientRect(),a=toVB({clientX:r.left,clientY:r.top}),b=toVB({clientX:r.right,clientY:r.bottom});return [a.x,a.y,b.x-a.x,b.y-a.y];}
function focus(sel){if(sel==='all')return setVB(VB0,true);const [x,y,w,h]=rectOf(svg.querySelector(sel)),[,,W,H]=VB0,pad=12;
  let nw=w+pad*2,nh=h+pad*2;if(nw/nh>W/H)nh=nw*H/W;else nw=nh*W/H;setVB([x+w/2-nw/2,y+h/2-nh/2,nw,nh],true);}
function zoomUI(){const z=ZV&&VB0&&ZV[2]<VB0[2]-1;root.classList.toggle('zoomed',!!z);}

function fit(){if(!root.classList.contains('on'))return;const body=root.querySelector('.mx-body'),cs=getComputedStyle(body);
  const aw=body.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight),ah=body.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom)-4;
  if(!LAY)LAY=innerWidth/innerHeight>1.25&&innerWidth>900?'side':'real';
  const top=svg.querySelector('#mxTop'),bot=svg.querySelector('#mxBot'),rr=svg.querySelector('#mxRear');let vb;
  if(LAY==='side'){rr.setAttribute('transform','translate(0,-300)');top.setAttribute('transform','translate(0,-18)');bot.setAttribute('transform','translate(1010,-864)');vb=[0,-304,2012,866];}
  else{rr.setAttribute('transform','translate(0,-300)');top.removeAttribute('transform');bot.removeAttribute('transform');vb=[0,-304,1000,1529];}
  VB0=vb.slice();ZV=null;svg.setAttribute('viewBox',vb.join(' '));
  const W=LAY==='side'?Math.min(aw,ah*vb[2]/vb[3]):Math.min(aw,1100);document.getElementById('mx-front').style.width=Math.floor(W)+'px';
  root.classList.toggle('side',LAY==='side');const b=document.getElementById('mx-lay');if(b)b.textContent=LAY==='side'?'Real layout':'Side by side';}
addEventListener('resize',fit);
/* programme sound for the video side (ATEM analog in → embedded in the programme SDI → HyperDeck) */
window.M32={audio:()=>A,stream:()=>A&&G.power&&A.out78?A.out78.stream:null,levelDb:()=>A&&G.power?Math.max(peakDb(A.anL),peakDb(A.anR)):-120};
window.openMixer=()=>{build();root.classList.add('on');fit();draw();};
window.closeMixer=()=>{root.classList.remove('on');tip.classList.remove('on');};
})();
