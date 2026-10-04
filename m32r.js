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
for(let i=1;i<=8;i++)mk('aux'+i,i<=6?'Aux'+i:'USB'+(i-6),i<=6?'Aux '+i:'USB '+(i-6),'off','aux');
for(let i=1;i<=8;i++)mk('fx'+i,'Fx'+Math.ceil(i/2)+(i%2?'L':'R'),'FxRtn '+Math.ceil(i/2)+(i%2?'L':'R'),'off','fx');
for(let i=1;i<=16;i++)mk('bus'+i,'MX'+String(i).padStart(2,'0'),'MixBus '+i,'off','bus');
for(let i=1;i<=8;i++)mk('dca'+i,'DCA'+i,'DCA '+i,'off','dca');
for(let i=1;i<=6;i++)mk('mtx'+i,'MT'+i,'Matrix '+i,'off','mtx');
mk('mainc','M/C','Main C','white','mainc');mk('main','LR','MAIN','white','main');
const P={};   // processing of the input channels
for(let i=1;i<=32;i++)P['in'+i]={gain:0,p48:false,pol:false,lc:false,lcf:80,gate:false,gthr:-60,comp:false,cthr:-20,ratio:3,eq:true,band:'low',
  b:{low:{t:'LSHV',f:80,g:0,q:2},lomid:{t:'PEQ',f:300,g:0,q:2},himid:{t:'PEQ',f:3000,g:0,q:2},high:{t:'HSHV',f:10000,g:0,q:2}},pan:0,st:true,mono:false,mcl:0};
const LAYERS_IN={i1:['in',1],i2:['in',9],i3:['in',17],i4:['in',25],aux:['aux',1],fxr:['fx',1],b1:['bus',1],b2:['bus',9]};
const LAYERS_BUS={dca:['dca',1],b1:['bus',1],b2:['bus',9],mtx:null};
const G={power:false,inL:'i1',busL:'dca',sel:'in1',tab:'home',page:'home',flip:false,rem:false,dim:false,talkA:false,talkB:false,
  assign:[true,true,true,true,false,false,false,false],mon:.6,phones:.5,talk:.5};
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
function fader(slot,x){let s=`<g class="mx-f" data-slot="${slot}">`;
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
  s+=`<g class="mx-lcd" data-lcd="${slot}"><rect x="${x-25}" y="756" width="50" height="66" rx="2" class="mx-lcdbg"/><rect class="mx-lcdc" x="${x-22}" y="759" width="44" height="60" rx="1.5"/>${T(x,778,'','mx-lcd1')}${T(x,800,'','mx-lcd2')}</g>`;
  s+=btn('mute:'+slot,x,854,'MUTE','mute',38,18);
  return s+fader(slot,x);}

function surface(){let s=`<svg class="mx-svg" viewBox="0 -70 1000 1430" role="img" aria-label="Midas M32R"><g class="mx-rear" id="mxRear" transform="translate(0,-66)">${rearSvg()}</g><g id="mxTop">`;
  s+=`<defs><linearGradient id="mxbody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26272c"/><stop offset="1" stop-color="#1b1c20"/></linearGradient></defs>`;
  s+=`<rect x="2" y="78" width="996" height="490" rx="22" fill="url(#mxbody)" stroke="#0c0c0e" stroke-width="3"/>`;
  // TALKBACK
  s+=panel(16,105,230,200,'TALKBACK')+btn('talkA',48,165,'TALK A','fn',40,20,'TALK A: talk to destination A (set on the screen). Drawn only.')+btn('talkB',98,165,'TALK B','fn',40,20,'TALK B: talk to destination B. Drawn only.')+knob('talk',182,150,15,'TALK|LEVEL'.replace('|',' '),'Talkback mic level (rear TALKBACK MIC input). Drawn only.');
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
  for(let e=0;e<6;e++)s+=knob('enc'+e,616+e*42,312,12,'');
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
  s+=knob('eqw',340,250,17,'WIDTH','WIDTH (Q) of the selected band.')+knob('eqf',340,330,17,'FREQUENCY','FREQUENCY of the selected band (20 Hz-20 kHz).')+knob('eqg',340,410,17,'GAIN','GAIN of the selected band (±15 dB).');
  s+=btn('eq',340,478,'EQ','fn',34,18,'EQ on/off for the selected channel.');
  [['high','HIGH',256],['himid','HI MID',292],['lomid','LO MID',350],['low','LOW',386]].forEach(([k,l,y])=>s+=btn('band:'+k,410,y,l,'fn',40,20,'Selects the '+l+' band for the three knobs.'));
  s+=T(394,276,'HIGH 2','mx-xs','end')+T(394,372,'LOW 2','mx-xs','end')+btn('veq',412,520,'VIEW','view',32,18);
  // ASSIGN
  s+=panel(455,352,598,541,'ASSIGN');for(let i=0;i<8;i++)s+=btn('asg:'+i,487+(i%2)*44,388+Math.floor(i/2)*38,i+1,'asg',30,22,'User-assignable key '+(i+1)+'. Drawn only.');
  s+=btn('vasg',576,520,'VIEW','view',30,18);
  // MAIN BUS
  s+=panel(603,352,775,541,'MAIN BUS')+knob('mcl',648,412,17,'M/C LEVEL','Send level to the mono/centre bus (Main C).')+knob('pan',730,412,17,'PAN/BAL','Pan of the selected channel in the stereo mix.');
  s+=btn('mono',648,478,'MONO|CENTRE','fn',46,24,'MONO CENTRE: sends the channel to the mono/centre bus.')+btn('st',716,478,'MAIN|STEREO','fn',46,24,'MAIN STEREO: sends the channel to the main L/R mix. Without it, the channel is not heard in the main mix.')+btn('vmain',756,520,'VIEW','view',30,18);
  // FADER LAYER
  s+=panel(781,352,983,541,'FADER LAYER');
  [['L:i1','INPUTS|1-8',805,384],['L:i2','INPUTS|9-16',850,384],['L:i3','INPUTS|17-24',805,420],['L:i4','INPUTS|25-32',850,420],['L:aux','AUX IN|USB',805,456],['L:fxr','FX|RET',850,456],['L:b1','BUS|1-8',805,492],['L:b2','BUS|9-16',850,492]].forEach(([id,l,x,y])=>s+=btn(id,x,y,l,'lay',40,28));
  [['B:dca','GROUP|DCA 1-8',955,384],['B:b1','BUS|1-8',955,420],['B:b2','BUS|9-16',955,456],['B:mtx','MATRIX|MAIN C',955,492]].forEach(([id,l,x,y])=>s+=btn(id,x,y,l,'lay',42,28));
  s+=btn('rem',902,400,'REM','fn',36,20,'REM: DAW remote control. Drawn only.')+T(902,420,'DAW REMOTE','mx-xs')+btn('flip',902,492,'FADER|FLIP','fn',40,28,'FADER FLIP (sends on fader). Not simulated yet.')+T(902,516,'SENDS ON FADER','mx-xs');
  s+=`</g><g id="mxBot"><rect x="2" y="560" width="996" height="698" rx="22" fill="#1d1e22" stroke="#0c0c0e" stroke-width="3"/><rect x="0" y="1246" width="1000" height="112" rx="26" fill="#141518" stroke="#0a0a0c" stroke-width="3"/><rect x="60" y="1268" width="880" height="40" fill="#cfcab4" opacity=".85" transform="rotate(-.3 500 1288)"/>`;
  // strips
  for(let k=0;k<8;k++)s+=strip('a'+k,35+k*56);
  for(let k=0;k<8;k++)s+=strip('b'+k,490+k*56);
  s+=strip('m',956,true)+T(956,898,'MAIN','mx-pt');
  s+=`<rect x="7" y="752" width="448" height="74" rx="3" fill="none" stroke="#000"/><rect x="462" y="752" width="453" height="74" rx="3" fill="none" stroke="#000"/>`;
  return s+'</g></svg>';}

function rearSvg(){const tip=(n,t,inner)=>`<g data-name="${n}" data-tip="${t}">${inner}</g>`;
  const xlr=(x,y,r=8)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#111" stroke="#9a9a9a"/><circle cx="${x}" cy="${y}" r="${r*.45}" fill="#2a2a2e"/>`;
  const rj=(x,y)=>`<rect x="${x-9}" y="${y-8}" width="18" height="16" rx="2" fill="#111" stroke="#9a9a9a"/><rect x="${x-5}" y="${y-3}" width="10" height="7" fill="#333"/>`;
  let s=`<rect x="2" y="4" width="996" height="122" rx="10" fill="#2b2c31" stroke="#0e0e10"/>`;
  s+=`<g class="mx-power" data-name="POWER switch" data-tip="Switches the console on (it boots in a moment). Click it!"><rect x="22" y="38" width="44" height="44" rx="4" fill="#0d0d0f"/><rect class="pr1" x="27" y="43" width="17" height="34" rx="2"/><rect class="pr2" x="44" y="43" width="17" height="34" rx="2"/>${T(35,64,'I','mx-wt')}${T(53,64,'O','mx-wt')}${T(44,98,'POWER','mx-wt')}</g>`;
  s+=tip('AC POWER','100-240 V mains input (IEC).',`<rect x="76" y="44" width="30" height="30" rx="3" fill="#0d0d0f" stroke="#888"/>${T(91,98,'AC IN','mx-wt')}`);
  s+=tip('DN32-USB card','Klark Teknik card: 32×32 audio over USB to a computer (record / playback).',`<rect x="120" y="36" width="70" height="46" rx="3" fill="#1a1b1f" stroke="#777"/>${T(155,56,'DN32-USB','mx-wt')}<rect x="146" y="62" width="18" height="10" fill="#111" stroke="#999"/>`);
  s+=tip('ETHERNET','Remote control from a computer or tablet.',rj(212,58)+T(212,98,'ETHERNET','mx-wt'));
  s+=tip('MIDI IN / OUT','MIDI control.',xlr(245,58,9)+xlr(270,58,9)+T(257,98,'MIDI','mx-wt'));
  s+=tip('ULTRANET','16 channels to personal monitor mixers (P16).',rj(300,58)+T(300,98,'ULTRANET','mx-wt'));
  s+=tip('AES50 A / B','Digital snakes: 48×48 channels each to stage boxes.',rj(335,58)+rj(362,58)+T(348,98,'AES50 B · A','mx-wt'));
  s+=tip('TALKBACK MIC','XLR input for the talkback microphone.',xlr(398,58)+T(398,98,'TALK','mx-wt'));
  s+=tip('MONITOR L / R','Outputs to the control-room speakers (MONITOR LEVEL).',xlr(428,50,6)+xlr(428,70,6)+T(428,98,'MON','mx-wt'));
  s+=tip('AUX IN / OUT 1-6','Line-level jacks (and RCA on 5/6).',[0,1,2].map(k=>xlr(458+k*16,50,5)+xlr(458+k*16,70,5)).join('')+T(474,98,'AUX','mx-wt'));
  let ins='';for(let k=0;k<8;k++){ins+=xlr(530+k*30,40,9)+xlr(530+k*30,74,9);}
  s+=tip('INPUTS 1-16','16 Midas PRO mic preamps (XLR). By default IN 1-16 feed channels 1-16. The studio mics arrive here through the patch panels.',ins+T(635,98,'IN 8 … 1  ·  IN 16 … 9','mx-wt'));
  let outs='';for(let k=0;k<8;k++)outs+=xlr(790+k*26,56,8);
  s+=tip('OUTPUTS 1-8','8 XLR outputs. OUT 7/8 = MAIN L/R by default.',outs+T(880,98,'OUT 8 (MAIN R) · 7 (MAIN L) … 1','mx-wt'));
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
async function startAudio(){if(A){A.ctx.resume();return;}
  const ctx=new (window.AudioContext||window.webkitAudioContext)();A={ctx,ch:{}};
  const mainBus=ctx.createGain(),mainF=ctx.createGain(),mainM=ctx.createGain(),soloBus=ctx.createGain(),mainToMon=ctx.createGain(),soloToMon=ctx.createGain(),mon=ctx.createGain(),lim=ctx.createDynamicsCompressor();
  lim.threshold.value=-3;lim.ratio.value=20;lim.attack.value=.002;lim.release.value=.1;
  const spl=ctx.createChannelSplitter(2),anL=ctx.createAnalyser(),anR=ctx.createAnalyser(),soloAn=ctx.createAnalyser();[anL,anR,soloAn].forEach(a=>a.fftSize=1024);
  mainBus.connect(mainF);mainF.connect(mainM);mainM.connect(spl);spl.connect(anL,0);spl.connect(anR,1);mainM.connect(mainToMon);soloBus.connect(soloToMon);soloBus.connect(soloAn);
  mainToMon.connect(mon);soloToMon.connect(mon);mon.connect(lim);lim.connect(ctx.destination);
  Object.assign(A,{mainBus,mainF,mainM,soloBus,mainToMon,soloToMon,mon,anL,anR,soloAn});
  const load=async u=>{const r=await fetch(u);return ctx.decodeAudioData(await r.arrayBuffer());};
  const srcs={in1:['buf','audio/pres.mp3',db2g(-40)],in2:['buf','audio/guest.mp3',db2g(-40)],in3:['music',null,db2g(-14)],in4:['noise',null,db2g(-46)],in5:['osc',null,db2g(-18)]};
  for(const id of ['in1','in2','in3','in4','in5','in6'])chain(id);
  for(const [id,[kind,url,lvl]] of Object.entries(srcs)){let node;
    if(kind==='buf'){node=ctx.createBufferSource();node.buffer=await load(url);node.loop=true;}
    else if(kind==='music'){node=ctx.createBufferSource();node.buffer=musicBuffer(ctx);node.loop=true;}
    else if(kind==='noise'){node=ctx.createBufferSource();node.buffer=noiseBuffer(ctx);node.loop=true;}
    else{node=ctx.createOscillator();node.frequency.value=1000;}
    const lv=ctx.createGain();lv.gain.value=lvl;node.connect(lv);lv.connect(A.ch[id].in);node.start();A.ch[id].src=node;}
  applyAll();}
function chain(id){const c=A.ctx,n={};
  n.in=c.createGain();                 // source arrives here at "mic level"
  n.phantom=c.createGain();n.pre=c.createGain();n.pol=c.createGain();n.hp=c.createBiquadFilter();n.hp.type='highpass';
  n.gate=c.createGain();n.comp=c.createDynamicsCompressor();n.comp.knee.value=6;n.comp.attack.value=.01;n.comp.release.value=.15;
  n.eq=[0,1,2,3].map(()=>c.createBiquadFilter());n.mute=c.createGain();n.fad=c.createGain();n.pan=c.createStereoPanner();n.st=c.createGain();n.solo=c.createGain();
  n.preAn=c.createAnalyser();n.postAn=c.createAnalyser();n.preAn.fftSize=n.postAn.fftSize=1024;
  n.in.connect(n.phantom);n.phantom.connect(n.pre);n.pre.connect(n.preAn);n.pre.connect(n.pol);n.pol.connect(n.hp);n.hp.connect(n.gate);n.gate.connect(n.comp);
  let last=n.comp;n.eq.forEach(f=>{last.connect(f);last=f;});last.connect(n.postAn);last.connect(n.solo);n.solo.connect(A.soloBus);
  last.connect(n.mute);n.mute.connect(n.fad);n.fad.connect(n.pan);n.pan.connect(n.st);n.st.connect(A.mainBus);
  n.gateOpen=1;A.ch[id]=n;}
const BT={LCUT:'highpass',LSHV:'lowshelf',PEQ:'peaking',VEQ:'peaking',HSHV:'highshelf',HCUT:'lowpass'};
function applyCh(id){if(!A||!A.ch[id])return;const n=A.ch[id],p=P[id],s=S[id],t=A.ctx.currentTime,sm=(prm,v)=>prm.setTargetAtTime(v,t,.015);
  sm(n.phantom.gain,S[id].cond&&!p.p48?0:1);sm(n.pre.gain,db2g(p.gain));sm(n.pol.gain,p.pol?-1:1);
  n.hp.frequency.setTargetAtTime(p.lc?p.lcf:10,t,.02);
  n.comp.threshold.value=p.comp?p.cthr:0;n.comp.ratio.value=p.comp?p.ratio:1;
  ['low','lomid','himid','high'].forEach((k,i)=>{const b=p.b[k],f=n.eq[i];
    if(!p.eq){f.type='peaking';f.gain.value=0;return;}
    f.type=BT[b.t];f.frequency.value=b.f;f.Q.value=b.t==='LCUT'||b.t==='HCUT'?.707:b.t==='LSHV'||b.t==='HSHV'?b.q/4:b.q;f.gain.value=b.g;});
  sm(n.mute.gain,s.mute?0:1);sm(n.fad.gain,db2g(f2db(s.fader)));n.pan.pan.setTargetAtTime(p.pan,t,.02);sm(n.st.gain,p.st?1:0);sm(n.solo.gain,s.solo?1:0);}
function applyMain(){if(!A)return;const t=A.ctx.currentTime,anySolo=Object.values(S).some(s=>s.solo&&s.type==='in');
  A.mainF.gain.setTargetAtTime(db2g(f2db(S.main.fader)),t,.015);A.mainM.gain.setTargetAtTime(S.main.mute?0:1,t,.015);
  const lvl=Math.max(G.mon,G.phones),v=lvl*lvl*(G.dim?0.1:1);
  A.mon.gain.setTargetAtTime(G.power?v:0,t,.02);A.mainToMon.gain.setTargetAtTime(anySolo?0:1,t,.02);A.soloToMon.gain.setTargetAtTime(anySolo?1:0,t,.02);}
function applyAll(){Object.keys(P).forEach(applyCh);applyMain();}
async function useMic(){if(!A)return;try{const st=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
  const src=A.ctx.createMediaStreamSource(st);const lv=A.ctx.createGain();lv.gain.value=db2g(-20);src.connect(lv);lv.connect(A.ch.in6.in);A.micOn=true;draw();}catch(e){A.micErr=true;draw();}}

/* ---------- meters ---------- */
const buf=new Float32Array(1024);
function peakDb(an){an.getFloatTimeDomainData(buf);let m=0;for(let i=0;i<buf.length;i++){const v=Math.abs(buf[i]);if(v>m)m=v;}return m>0?20*Math.log10(m):-120;}
const lev={};   // smoothed meter levels
function meterTick(){requestAnimationFrame(meterTick);if(!root.classList.contains('on'))return;
  const L=(k,on)=>{const e=svg.querySelector(`[data-l="${k}"]`);if(e)e.classList.toggle('lit',!!on);};
  const sm=(k,v)=>lev[k]=Math.max(v,(lev[k]??-120)-1.4);
  if(!A||!G.power){svg.querySelectorAll('.mx-led.lit').forEach(e=>{if(!e.dataset.l?.startsWith('eqm'))e.classList.remove('lit');});updLeds();return;}
  // gates (control-rate) + per-channel levels
  Object.entries(A.ch).forEach(([id,n])=>{const pre=peakDb(n.preAn),p=P[id];sm(id+':pre',pre);
    const open=!p.gate||pre>p.gthr;n.gateOpen=open;n.gate.gain.setTargetAtTime(open?1:0,A.ctx.currentTime,open?.005:.08);
    sm(id+':post',peakDb(n.postAn));});
  // strips
  [...stripsIn().map((id,k)=>['a'+k,id]),...stripsBus().map((id,k)=>['b'+k,id])].forEach(([slot,id])=>{const n=id&&A.ch[id];const v=n?lev[id+':post']:-120;
    [null,0,-6,-12,-18,-30,-60].forEach((th,k)=>{if(k===0)return;L('m:'+slot+':'+k,n&&(k===1?v>=-0.1:v>=th));});
    L('m:'+slot+':0',n&&P[id].comp&&n.comp.reduction<-1);L('m:'+slot+':7',slot.startsWith('a')&&n&&P[id].gate&&!n.gateOpen);});
  // selected channel: preamp + dynamics meters
  const n=A.ch[G.sel],pv=n?lev[G.sel+':pre']:-120;
  [0,-3,-6,-9,-12,-18,-30,-60].forEach((th,k)=>L('pre:'+k,n&&(k===0?pv>=-0.1:pv>=th)));
  const gr=n&&P[G.sel].comp?-n.comp.reduction:0;[0,3,6,9,12,18,30].forEach((th,k)=>{if(k===0)L('dyn:0',n&&P[G.sel].comp&&gr>1);else L('dyn:'+k,gr>=th);});
  L('dyn:7',n&&P[G.sel].gate&&!n.gateOpen);
  // main meter
  const anySolo=Object.values(S).some(s=>s.solo);const lv=[anySolo?sm('solo',peakDb(A.soloAn)):-120,sm('L',peakDb(A.anL)),sm('R',peakDb(A.anR))];
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
  const fill=(slot,id)=>{const g=svg.querySelector(`.mx-f[data-slot="${slot}"]`),lcd=svg.querySelector(`[data-lcd="${slot}"]`),s=id&&S[id];
    g.querySelector('.mx-cap').style.transform=`translateY(${fpos(s?s.fader:0)}px)`;
    lcd.classList.toggle('empty',!s||!on);lcd.querySelector('.mx-lcdc').setAttribute('fill',on&&s?COL[s.color]||COL.off:'#0b0c0e');
    const [l1,l2]=lcd.querySelectorAll('text');l1.textContent=on&&s?s.num:'';l2.textContent=on&&s?(s.name||s.num).slice(0,10):'';
    setLit('sel:'+slot,s&&G.sel===id);setLit('solo:'+slot,s&&s.solo);setLit('mute:'+slot,s&&s.mute);};
  stripsIn().forEach((id,k)=>fill('a'+k,id));stripsBus().forEach((id,k)=>fill('b'+k,id));fill('m','main');
  setLit('clrsolo',Object.values(S).some(s=>s.solo));
  Object.keys(LAYERS_IN).forEach(k=>setLit('L:'+k,G.inL===k));Object.keys(LAYERS_BUS).forEach(k=>setLit('B:'+k,G.busL===k));
  const p=P[G.sel];['p48','pol','lc','gate','comp','eq'].forEach(k=>setLit(k,p&&p[k]));setLit('st',p&&p.st);setLit('mono',p&&p.mono);
  ['low','lomid','himid','high'].forEach(k=>setLit('band:'+k,p&&p.band===k));
  G.assign.forEach((v,i)=>setLit('asg:'+i,v));setLit('dim',G.dim);setLit('talkA',G.talkA);setLit('talkB',G.talkB);setLit('flip',G.flip);setLit('rem',G.rem);
  svg.querySelectorAll('.mx-b.scrb').forEach(b=>b.classList.toggle('lit',on&&b.dataset.b==='scr:'+G.page));
  svg.querySelectorAll('.mx-k').forEach(drawKnob);updLeds();drawScreen();diag();}
/* ---------- screen (800×480 TFT, drawn at 252×158) ---------- */
const scr=()=>svg.querySelector('#mx-screen');
const TABS=['home','config','gate','dyn','eq','sends','main'];
function encDefs(){const p=P[G.sel],b=p&&p.b[p.band],s=S[G.sel];if(G.page!=='home')return [];
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
  else{const NA={routing:'ROUTING: default patch — local IN 1-16 → channels 1-16, OUT 7/8 = MAIN L/R. Editing not simulated.',library:'LIBRARY: presets for channels, effects and routing. Not simulated.',effects:'EFFECTS: 8-slot rack (reverbs, delays, chorus, GEQ…). Not simulated yet.',setup:'SETUP: global settings, scribble strips, preamps, card. Not simulated.',monitor:'MONITOR: monitor source, talkback and oscillator. Use the MONITOR / PHONES knobs.',scenes:'SCENES: save / recall full console snapshots. Not simulated yet.',mutegrp:'MUTE GRP: the 6 mute groups on the screen encoders. Not simulated yet.',utility:'UTILITY: copy / paste / name channels. Not simulated.'};
    h+=T(126,40,G.page.toUpperCase(),'mx-sbig')+wrap(NA[G.page]||'',126,62,40);}
  // encoder row
  const E=encDefs();h+=`<rect x="0" y="128" width="252" height="30" fill="#14202f"/>`;
  for(let i=0;i<6;i++){const e=E[i],x=21+i*42;if(!e)continue;h+=T(x,139,e.l,'mx-st')+T(x,151,e.get(),'mx-sv');}
  g.innerHTML=h;}
function wrap(t,x,y,n){const w=t.split(' '),L=[];let c='';w.forEach(z=>{if((c+' '+z).trim().length>n){L.push(c.trim());c=z;}else c+=' '+z;});L.push(c.trim());
  return L.map((l,i)=>T(x,y+i*11,l,'mx-s')).join('');}
function homeBody(s,p){let h='';
  if(!p){return T(126,70,s.name+' — '+({aux:'aux input',fx:'effects return',bus:'mix bus',dca:'DCA group',mtx:'matrix',mainc:'mono/centre bus',main:'main stereo bus'}[s.type]||''),'mx-s')+
    T(126,90,'Fader '+fmtDb(f2db(s.fader))+' dB'+(s.mute?' · MUTED':''),'mx-s')+T(126,108,'(processing of buses not simulated yet)','mx-st');}
  if(G.tab==='eq')return eqGraph(p);
  const blk=(x,l,v,on)=>`<rect x="${x}" y="36" width="38" height="40" rx="3" fill="${on?'#2c5a3a':'#20283a'}" stroke="#3b4a66"/>`+T(x+19,48,l,'mx-st')+T(x+19,64,v,'mx-sv');
  h+=blk(4,'Config',(p.p48?'48V ':'')+'+'+p.gain.toFixed(0),true)+blk(45,'Lo cut',p.lc?Math.round(p.lcf)+'Hz':'off',p.lc)+blk(86,'Gate',p.gate?p.gthr.toFixed(0):'off',p.gate)+blk(127,'Dyn',p.comp?p.cthr.toFixed(0):'off',p.comp)+blk(168,'EQ',p.eq?'on':'off',p.eq)+blk(209,'Main',(p.st?'LR ':'')+(p.mono?'M':''),p.st||p.mono);
  h+=`<g id="mx-shm"></g>`+T(126,122,'Fader '+fmtDb(f2db(s.fader))+' dB · Pan '+(p.pan===0?'C':(p.pan<0?'L':'R')+Math.round(Math.abs(p.pan)*100))+(s.mute?' · MUTED':''),'mx-s');
  if(S[G.sel].cond&&!p.p48)h+=T(126,108,'⚠ condenser mic: needs 48 V','mx-warn');
  if(G.sel==='in6'&&A&&!A.micOn)h+=`<g class="mx-micbtn" data-b="usemic"><rect x="70" y="80" width="112" height="16" rx="3" fill="#3d6db3"/>${T(126,91,A.micErr?'mic blocked by browser':'▶ use my microphone','mx-st')}</g>`;
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
  el.innerHTML=it(G.power,'Console POWER (rear)')+(p?it(has&&(!s.cond||p.p48)&&p.gain>=20,'Signal at the preamp (GAIN'+(s.cond?' + 48 V':'')+')')+it(p.st,'MAIN STEREO on')+it(!s.mute&&s.fader>.3,'Channel fader up, not muted'):'')+
    it(!S.main.mute&&S.main.fader>.3,'MAIN fader up')+it(Math.max(G.mon,G.phones)>.05,'MONITOR / PHONES level')+`<span class="mx-sel">Selected: <b>${s.num} ${s.name}</b>${s.mic?' · '+s.mic:''}</span>`;}

/* ---------- interaction ---------- */
function stripId(slot){if(slot==='m')return 'main';const k=+slot.slice(1);return slot[0]==='a'?stripsIn()[k]:stripsBus()[k];}
function press(id){if(!G.power||G.boot)return;const p=P[G.sel];
  let m;
  if((m=id.match(/^sel:(.+)$/))){const sid=stripId(m[1]);if(sid)G.sel=sid;}
  else if((m=id.match(/^solo:(.+)$/))){const s=S[stripId(m[1])];if(s)s.solo=!s.solo;}
  else if((m=id.match(/^mute:(.+)$/))){const s=S[stripId(m[1])];if(s)s.mute=!s.mute;}
  else if(id==='clrsolo')Object.values(S).forEach(s=>s.solo=false);
  else if((m=id.match(/^L:(.+)$/)))G.inL=m[1];
  else if((m=id.match(/^B:(.+)$/)))G.busL=m[1];
  else if(p&&['p48','pol','lc','gate','comp','eq','st','mono'].includes(id))p[id]=!p[id];
  else if(p&&id==='eqmode'){const allowed={low:['LCUT','LSHV','PEQ','VEQ'],lomid:['PEQ','VEQ'],himid:['PEQ','VEQ'],high:['HCUT','HSHV','PEQ','VEQ']}[p.band],b=p.b[p.band];b.t=allowed[(allowed.indexOf(b.t)+1)%allowed.length];}
  else if(p&&(m=id.match(/^band:(.+)$/)))p.band=m[1];
  else if((m=id.match(/^asg:(\d)$/)))G.assign[+m[1]]=!G.assign[+m[1]];
  else if(id==='dim')G.dim=!G.dim;else if(id==='talkA')G.talkA=!G.talkA;else if(id==='talkB')G.talkB=!G.talkB;else if(id==='flip')G.flip=!G.flip;else if(id==='rem')G.rem=!G.rem;
  else if((m=id.match(/^scr:(.+)$/))){G.page=m[1];if(m[1]==='home')G.tab='home';}
  else if(id.startsWith('v')){const t={vcfg:'config',vgate:'gate',vdyn:'dyn',veq:'eq',vmain:'main',vsend:'sends'}[id];if(t){G.page='home';G.tab=t;}else G.page={vmon:'monitor',vrec:'utility',vasg:'setup'}[id]||G.page;}
  else if(id==='cur:left'||id==='cur:right'){if(G.page==='home'){const i=TABS.indexOf(G.tab);G.tab=TABS[(i+(id==='cur:right'?1:TABS.length-1))%TABS.length];}}
  else if(id==='usemic')useMic();
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
const KNAME={gain:'GAIN',lcf:'LOW CUT FREQUENCY',gthr:'GATE THRESHOLD',cthr:'COMP THRESHOLD',eqw:'EQ WIDTH',eqf:'EQ FREQUENCY',eqg:'EQ GAIN',mcl:'M/C LEVEL',pan:'PAN/BAL',mon:'MONITOR LEVEL',phones:'PHONES LEVEL',talk:'TALK LEVEL'};
function build(){if(root.dataset.built)return;root.dataset.built='1';
  document.getElementById('mx-front').innerHTML=surface();
  svg=root.querySelector('.mx-svg');rear=root.querySelector('.mx-rear');
  const pt=e=>{const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(svg.getScreenCTM().inverse());};
  svg.addEventListener('pointerdown',e=>{
    const f=e.target.closest('.mx-f');
    if(f&&G.power&&!G.boot){const sid=stripId(f.dataset.slot);if(!sid)return;e.preventDefault();try{svg.setPointerCapture(e.pointerId);}catch(_){}
      const cap=f.querySelector('.mx-cap');cap.classList.add('drag');
      const set=ev=>{const q=svg.createSVGPoint();q.x=ev.clientX;q.y=ev.clientY;const y=q.matrixTransform(f.getScreenCTM().inverse()).y;S[sid].fader=cl((FY1-y)/(FY1-FY0));if(S[sid].type==='in')applyCh(sid);applyMain();draw();};set(e);
      const up=()=>{cap.classList.remove('drag');svg.removeEventListener('pointermove',set);svg.removeEventListener('pointerup',up);svg.removeEventListener('pointercancel',up);};
      svg.addEventListener('pointermove',set);svg.addEventListener('pointerup',up);svg.addEventListener('pointercancel',up);return;}
    const k=e.target.closest('.mx-k');
    if(k&&G.power&&!G.boot){e.preventDefault();try{svg.setPointerCapture(e.pointerId);}catch(_){}let y0=e.clientY;
      const mv=ev=>{const d=(y0-ev.clientY);if(Math.abs(d)>=2){knobSet(k.dataset.k,Math.round(d/2));y0=ev.clientY;}};
      const up=()=>{svg.removeEventListener('pointermove',mv);svg.removeEventListener('pointerup',up);svg.removeEventListener('pointercancel',up);};
      svg.addEventListener('pointermove',mv);svg.addEventListener('pointerup',up);svg.addEventListener('pointercancel',up);return;}
    const b=e.target.closest('[data-b]');if(b){e.preventDefault();press(b.dataset.b);}});
  svg.addEventListener('wheel',e=>{const k=e.target.closest('.mx-k');if(!k||!G.power)return;e.preventDefault();knobSet(k.dataset.k,e.deltaY<0?2:-2);},{passive:false});
  rear.querySelector('.mx-power').addEventListener('click',async()=>{G.power=!G.power;
    if(G.power){G.boot=true;draw();await startAudio();setTimeout(()=>{G.boot=false;applyAll();draw();},1400);}else{applyMain();if(A)A.ctx.suspend();}draw();});
  root.addEventListener('mousemove',e=>{const m=e.target.closest('[data-name]');if(!m||!root.contains(m)){tip.classList.remove('on');return;}
    let name=m.dataset.name,t=m.dataset.tip||TIPS[m.dataset.b||m.dataset.k]||'';
    if(m.dataset.k&&KNAME[m.dataset.k])name=KNAME[m.dataset.k];
    if(m.classList.contains('mx-f')){const s=S[stripId(m.dataset.slot)];name=s?s.num+' '+s.name:'(empty)';t=s?'Fader: '+fmtDb(f2db(s.fader))+' dB — drag it.':'';}
    if(m.dataset.b?.startsWith('sel:'))t='Selects this channel: the knobs above and the screen now edit it.';
    if(m.dataset.b?.startsWith('solo:'))t='SOLO: listen to this channel alone (PFL) in the monitors / phones.';
    if(m.dataset.b?.startsWith('mute:'))t='MUTE: cuts this channel.';
    if(m.dataset.b?.startsWith('L:')||m.dataset.b?.startsWith('B:'))t='Fader layer: changes what the '+(m.dataset.b[0]==='L'?'left 8 (input)':'right 8 (group/bus)')+' faders control. The motorised faders move to their stored positions.';
    if(m.dataset.b?.startsWith('v'))t=t||'VIEW: opens this section on the screen.';
    if(m.dataset.b?.startsWith('scr:'))t='Screen page.';
    if(m.dataset.k?.startsWith('enc')){const en=encDefs()[+m.dataset.k.slice(3)];name='Screen encoder '+(+m.dataset.k.slice(3)+1);t=en?'Edits: '+en.l+' ('+en.get()+')':'Nothing on this page.';}
    tip.innerHTML=`<b>${name}</b>${t?`<span>${t}</span>`:''}`;tip.style.left=e.clientX+'px';tip.style.top=e.clientY+'px';tip.classList.add('on');});
  root.addEventListener('mouseleave',()=>tip.classList.remove('on'));
  document.getElementById('mx-photo').addEventListener('click',e=>{const on=root.classList.toggle('photo');e.currentTarget.textContent=on?'Recreation':'Real photo';});
  document.getElementById('mx-close').addEventListener('click',()=>window.closeMixer());
  document.getElementById('mx-lay').addEventListener('click',()=>{LAY=LAY==='side'?'real':'side';fit();});
  draw();meterTick();}
let LAY=null;
function fit(){if(!root.classList.contains('on'))return;const body=root.querySelector('.mx-body'),cs=getComputedStyle(body);
  const aw=body.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight),ah=body.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom)-4;
  if(!LAY)LAY=innerWidth/innerHeight>1.25&&innerWidth>900?'side':'real';
  const top=svg.querySelector('#mxTop'),bot=svg.querySelector('#mxBot'),rr=svg.querySelector('#mxRear');let vb;
  if(LAY==='side'){rr.setAttribute('transform','translate(0,-66)');top.setAttribute('transform','translate(0,-12)');bot.setAttribute('transform','translate(1010,-630)');vb=[0,-70,2012,810];}
  else{rr.setAttribute('transform','translate(0,-66)');top.removeAttribute('transform');bot.removeAttribute('transform');vb=[0,-70,1000,1430];}
  svg.setAttribute('viewBox',vb.join(' '));
  const W=LAY==='side'?Math.min(aw,ah*vb[2]/vb[3]):Math.min(aw,1100);document.getElementById('mx-front').style.width=Math.floor(W)+'px';
  root.classList.toggle('side',LAY==='side');const b=document.getElementById('mx-lay');if(b)b.textContent=LAY==='side'?'Real layout':'Side by side';}
addEventListener('resize',fit);
window.openMixer=()=>{build();root.classList.add('on');fit();draw();};
window.closeMixer=()=>{root.classList.remove('on');tip.classList.remove('on');};
})();
