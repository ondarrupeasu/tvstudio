/* Behringer ULTRACURVE PRO DEQ2496 (docs/deq2496-spec.md, docs/deq2496-front-ref.jpg / -rear-ref.jpg).
 * Real audio: 31-band graphic EQ + peak limiter on the control-room monitor feed, RTA / meters from AnalyserNodes.
 * Orange 320×80 LCD = a <canvas> in a <foreignObject>. PEQ / DEQ / WIDTH / FBD / UTILITY / I/O / MEMORY: drawn, not simulated. */
(function(){
const A=window.AR;if(!A)return;const X=f=>f*A.W;
const FQ=[20,25,31.5,40,50,63,80,100,125,160,200,250,315,400,500,630,800,1000,1250,1600,2000,2500,3150,4000,5000,6300,8000,10000,12500,16000,20000];
const fq=f=>{f=Number(f.toPrecision(3));if(f<1000)return String(f);const k=Math.floor(f/1000);return k+'K'+String(Math.round(f%1000)).padStart(3,'0').replace(/0+$/,'');};
const PG={GEQ:1,PEQ:2,DEQ:3,WIDTH:2,FBD:3,DYN:3,UTILITY:2,'I/O':4,BYPASS:1,RTA:3,MEMORY:2,METER:3};
const MODS=['GEQ','PEQ','DEQ','DYN','LIMIT','WIDTH'],RG=[15,30,60,90],MT=[-40,-24,-18,-12,-6,-3];
const cl=(v,a,b)=>Math.max(a,Math.min(b,v)),sg=v=>(v>0?'+':'')+v.toFixed(1),rf=i=>20*Math.pow(2,i/6),now=()=>performance.now();
A.type('deq2496',d=>{const H=100,s=d.st;
  Object.assign(s,{power:true,menu:'GEQ',page:1,band:17,g:Array(31).fill(0),lim:0,hb:false,mb:{},rsrc:'OUT',rmax:0,rrg:2,rcur:30,msrc:'INPUT',bsel:0,boot:0,pk:[[-120,-120],[-120,-120]]});
  const pv={},rpk=new Float32Array(61).fill(-120);let t0=0,clipT=[0,0],bins=null,fbuf=null;
  const enc=(name,i)=>({min:-9999,max:9999,def:0,step:1,a0:-9999*18,a1:9999*18,name,fmt:()=>{const p=view().p[i];return p[0]?p.join(' ').replace('\n',' '):'(no function on this page)';}});
  /* ---------- what the LCD shows on each page: A / B labels, the 3 right-hand parameters (upper encoder, wheel, lower encoder) ---------- */
  function view(){const M=s.menu,P=s.page,nn=['',''];
    if(M==='GEQ')return {a:'LEFT/\nRIGHT',b:'RESET\nGEQ',p:[['FREQ',fq(FQ[s.band])+'Hz'],['GAIN',sg(s.g[s.band])+'dB'],['BW/OCT','1/3']],f:geq};
    if(M==='RTA'&&P!==2)return {a:'SOURCE\n'+s.rsrc,b:'AUTO\nEQ',p:[['MAX',s.rmax+'dB'],['LEV '+Math.round(rpk[s.rcur]),fq(rf(s.rcur))+'Hz'],['RANGE',RG[s.rrg]+'dB']],f:rta,full:P===3};
    if(M==='METER'&&P===1)return {a:'SOURCE\n'+s.msrc,b:'CLEAR\nPEAK',p:[nn,nn,nn],f:meter,ttl:'PEAK/RMS METER'};
    if(M==='DYN'&&P===3)return {a:'',b:'DYN\nMENU',p:[['HOLD','0ms'],['THRESH',s.lim.toFixed(1)+'dB'],['RELEASE','100ms']],f:limv,ttl:'LIMITER'};
    if(M==='BYPASS')return {a:'',b:'BYPASS\nMODULE',p:[['BYPASS L',s.hb?'ON':'OFF'],['MODULE',MODS[s.bsel]],['BYPASS R',s.hb?'ON':'OFF']],f:byp};
    return {a:'',b:'',p:[nn,nn,nn],f:ns};}
  /* ---------- audio ---------- */
  function apply(){const n=d.n;if(!n||!A.ctx)return;const t=A.ctx.currentTime,T=(p,v)=>p.setTargetAtTime(v,t,.02);
    [0,1].forEach(c=>{n.f[c].forEach((f,i)=>T(f.gain,s.mb.GEQ?0:s.g[i]));const th=s.mb.LIMIT?0:s.lim;T(n.lim[c].threshold,th);T(n.trim[c].gain,A.db2g(.57*th));T(n.wet[c].gain,s.hb?0:1);T(n.dry[c].gain,s.hb?1:0);T(n.out[c].gain,s.power?1:0);});
    T(n.rIn.gain,s.rsrc==='IN'?1:0);T(n.rOut.gain,s.rsrc==='OUT'?1:0);}
  function lv(an){const b=an._b||(an._b=new Float32Array(an.fftSize));an.getFloatTimeDomainData(b);let m=0,q=0;for(const v of b){const a=Math.abs(v);if(a>m)m=a;q+=v*v;}
    return [A.g2db(m),A.g2db(Math.sqrt(q/b.length))];}
  function bands(){if(!d.n)return Array(61).fill(-120);const an=d.n.rta;if(!bins){const hz=A.ctx.sampleRate/an.fftSize;fbuf=new Float32Array(an.frequencyBinCount);
      bins=Array.from({length:61},(_,i)=>{const f=rf(i);let lo=Math.round(f*Math.pow(2,-1/12)/hz),hi=Math.round(f*Math.pow(2,1/12)/hz);if(hi<lo)hi=lo;return [cl(lo,1,fbuf.length-1),cl(hi,1,fbuf.length-1)];});}
    an.getFloatFrequencyData(fbuf);return bins.map(([lo,hi])=>{let p=0;for(let j=lo;j<=hi;j++)p+=Math.pow(10,fbuf[j]/10);return 10*Math.log10(p+1e-12);});}
  /* ---------- controls ---------- */
  const na=t=>A.flash(t+': not simulated on this unit.');
  function turn(k,v){const M=s.menu,P=s.page;
    if(M==='GEQ'){if(k==='e1')s.band=cl(s.band+v,0,30);else if(k==='wh'){s.g[s.band]=cl(s.g[s.band]+v*.5,-15,15);apply();}else na('BW/OCT (paragraphic / shelving)');}
    else if(M==='RTA'&&P!==2){if(k==='e1')s.rmax=cl(s.rmax+v,-60,0);else if(k==='e2')s.rrg=cl(s.rrg+v,0,3);else s.rcur=cl(s.rcur+v,0,60);}
    else if(M==='DYN'&&P===3){if(k==='wh'){s.lim=cl(s.lim+v*.5,-24,0);apply();}}
    else if(M==='BYPASS'){if(k==='wh')s.bsel=(s.bsel+v+MODS.length)%MODS.length;else{s.hb=v>0;apply();}}}
  function push(k){const M=s.menu;if(M==='GEQ'&&k==='wh'){s.g[s.band]=0;apply();}else if(M==='RTA'&&k==='e1')s.rmax=0;else if(M==='BYPASS'&&k==='wh')key('B',false);}
  function key(b,long){const M=s.menu,P=s.page;
    if(PG[b]){if(long){if(['GEQ','PEQ','DEQ','WIDTH','DYN','FBD'].includes(b)){s.mb[b]=!s.mb[b];A.flash(b+(s.mb[b]?' bypassed':' active again'));apply();}
        else if(b==='BYPASS'){s.hb=!s.hb;A.flash(s.hb?'BYPASS: both channels bypassed (relay)':'BYPASS off');apply();}else if(b==='UTILITY')na('PANEL LOCK');return;}
      if(M===b)s.page=P%PG[b]+1;else{s.menu=b;s.page=1;}return;}
    if(b==='page'){s.page=P%PG[M]+1;return;}
    if(b==='compare'){na('COMPARE');return;}
    const isA=b==='A';
    if(M==='GEQ'){if(isA)A.flash('LEFT/RIGHT: the unit runs in STEREO LINK (both channels together).');else{if(long)s.g.fill(0);else s.g[s.band]=0;apply();}}
    else if(M==='RTA'&&P!==2){if(isA){s.rsrc=s.rsrc==='OUT'?'IN':'OUT';apply();}else na('AUTO EQ');}
    else if(M==='METER'&&P===1){if(isA)s.msrc=s.msrc==='INPUT'?'OUTPUT':'INPUT';else s.pk=[[-120,-120],[-120,-120]];}
    else if(M==='DYN'&&P===3){if(!isA){if(long){s.lim=0;apply();}else s.page=1;}}
    else if(M==='DYN'&&P===2&&!isA)s.page=3;
    else if(M==='BYPASS'&&!isA){if(long)s.mb={};else{const m=MODS[s.bsel];s.mb[m]=!s.mb[m];}apply();}
    else na(isA?'A':'B');}
  const K={e1:enc('UPPER ENCODER',0),wh:enc('DATA WHEEL',1),e2:enc('LOWER ENCODER',2)};
  /* ---------- LCD (canvas 320×80, dark on orange) ---------- */
  const BG='#ff9b26',INK='#3a1400';let x;
  const T=(t,px,py,al='left',sz=8)=>{x.font=`bold ${sz}px monospace`;x.textAlign=al;x.fillText(t,px,py);};
  const box=(bx,by,w,h,t,inv)=>{x.fillStyle=INK;if(inv)x.fillRect(bx,by,w,h);else x.strokeRect(bx+.5,by+.5,w-1,h-1);x.fillStyle=inv?BG:INK;const L=t.split('\n');L.forEach((l,i)=>T(l,bx+w/2,by+(h-L.length*8)/2+7+i*8,'center'));x.fillStyle=INK;};
  function geq(){const gx=50,w=218/31;T('GRAPHIC EQ'+(s.mb.GEQ?'  (BYPASSED)':''),159,8,'center',7);x.fillRect(gx,40,218,1);
    for(const db of [15,-15]){for(let i=gx;i<268;i+=4)x.fillRect(i,40-db*2,1,1);}
    s.g.forEach((v,i)=>{const bx=gx+i*w;if(i===s.band){x.fillRect(bx,9,w,62);x.fillStyle=BG;}const h=v*2;x.fillRect(bx+1,h>0?40-h:40,w-2,Math.max(1,Math.abs(h)));x.fillStyle=INK;});
    [[0,'20'],[6,'80'],[12,'315'],[18,'1K25'],[24,'5K'],[30,'20K']].forEach(([i,t])=>T(t,gx+i*w+w/2,79,'center',7));}
  function rta(full){const gx=full?2:50,gw=full?316:218,w=gw/61,db=bands(),lo=s.rmax-RG[s.rrg];
    T('RTA '+(s.rsrc==='OUT'?'L+R OUT':'L+R IN'),gx+gw/2,8,'center',7);
    db.forEach((v,i)=>{rpk[i]=Math.max(v,rpk[i]-.6);const h=cl((v-lo)/RG[s.rrg],0,1)*58,ph=cl((rpk[i]-lo)/RG[s.rrg],0,1)*58;x.fillRect(gx+i*w,70-h,Math.max(1,w-1),h);x.fillRect(gx+i*w,69-ph,Math.max(1,w-1),1);});
    if(!full){const cx=gx+s.rcur*w+w/2;for(let y=10;y<70;y+=3)x.fillRect(cx,y,1,1);}
    x.fillRect(gx,70,gw,1);[[0,'20'],[12,'80'],[24,'315'],[36,'1K25'],[48,'5K'],[60,'20K']].forEach(([i,t])=>T(t,gx+i*w+w/2,79,'center',7));}
  function meter(){const m=d.n&&s.power?(s.msrc==='INPUT'?d.n.anI:d.n.anO).map(lv):[[-120,-120],[-120,-120]],px=v=>50+cl((v+80)/80,0,1)*200;
    [0,1].forEach(c=>{const y=c?46:14,[p,r]=m[c];s.pk[c][0]=Math.max(s.pk[c][0],p);s.pk[c][1]=Math.max(s.pk[c][1],r);
      T(c?'RIGHT':'LEFT',50,c?78:9,'left',7);x.strokeRect(50.5,y+.5,200,14);x.fillRect(50,y+2,px(p)-50,3);x.fillRect(50,y+9,px(p)-50,3);x.fillRect(50,y+5,px(r)-50,4);x.fillRect(px(s.pk[c][0]),y,1,15);
      T(s.pk[c][0]>-.1?'CLIP':s.pk[c][0]<-99?'---':s.pk[c][0].toFixed(1),300,y+11,'center');});
    T('PEAK',300,9,'center');[-80,-60,-40,-20,0].forEach(v=>T(v?String(v):'00',px(v),40,'center',7));}
  function limv(){const gr=d.n?Math.min(d.n.lim[0].reduction,d.n.lim[1].reduction):0;T('PEAK LIMITER — always active',159,19,'center',7);
    x.strokeRect(60.5,25.5,200,12);x.fillRect(260-(-s.lim/24)*200,23,2,17);T('THRESHOLD '+s.lim.toFixed(1)+' dBFS',159,50,'center',7);
    x.strokeRect(60.5,58.5,200,8);x.fillRect(61,59,cl(-gr/24,0,1)*200,7);T('GAIN REDUCTION '+(-gr).toFixed(1)+' dB',159,76,'center',7);}
  function byp(){MODS.forEach((m,i)=>{const bx=52+i*36;if(i===s.bsel)box(bx,12,34,11,m,true);else T(m,bx+17,21,'center',7);
      ['LEFT','RIGHT'].forEach((_,c)=>T(s.hb||s.mb[m]?'BYP':'ON',bx+17,38+c*14,'center',7));});
    T('L',48,38,'right',7);T('R',48,52,'right',7);if(s.hb)T('RELAY BYPASS: BOTH CHANNELS',159,72,'center',7);}
  function ns(){T(s.menu+' — PAGE '+s.page,159,34,'center');T('not simulated',159,48,'center');}
  function lcd(){const cv=document.querySelector('canvas[data-d="deq"][data-tx="lcd"]');if(!cv)return;x=cv.getContext('2d');
    if(!s.power){x.fillStyle='#160d07';x.fillRect(0,0,320,80);return;}x.fillStyle=BG;x.fillRect(0,0,320,80);x.fillStyle=INK;x.strokeStyle=INK;x.lineWidth=1;
    if(now()<s.boot){T('behringer',160,22,'center',10);T('ULTRACURVE PRO DEQ2496',160,42,'center');T('V 1.4',160,60,'center');return;}
    const v=view();if(v.full){v.f(true);box(0,0,30,11,s.menu,true);}
    else{box(0,0,40,13,s.menu,true);box(40,0,8,13,String(s.page),false);if(v.a)box(0,27,46,20,v.a);if(v.b)box(0,56,46,20,v.b);
      x.fillRect(270,0,1,80);v.p.forEach(([n,val],i)=>{if(!n)return;const y=2+i*27;T(n,295,y+8,'center',7);T(val,295,y+18,'center');});
      if(v.ttl)box(110,0,100,10,v.ttl,true);v.f(false);}
    if(s.hb)box(255,0,46,11,'BYPASS',true);}
  /* ---------- panel ---------- */
  const ears=h=>[[.015,.12],[.015,.85],[.982,.12],[.982,.85]].map(([px,py])=>`<rect x="${X(px)-7}" y="${h*py-4}" width="14" height="8" rx="4" class="ar-hole2"/>`).join('');
  const bt=(b,lab,px,py,tip,led,w=36)=>{const cy=py*100+4;let g=A.btn(d,b,X(px),cy,w,15,tip);if(led)g=g.replace(/<\/g>$/,A.rled(d,'k'+b,X(px)-12,cy,7,3,led)+'</g>');return A.txt(X(px),cy-11,lab,'ar-t4w')+g;};
  const W=`style="fill:none;stroke:#ddd;stroke-width:1.3"`;
  const lb=(x0,x1,t)=>`<rect x="${X(x0)}" y="84" width="${X(x1-x0)}" height="11" rx="2" style="fill:none;stroke:#ccc"/>`+A.txt(X((x0+x1)/2),92.5,t,'ar-t4');
  const MK=[['GEQ',.771,.18],['PEQ',.808,.18],['DEQ',.847,.18],['WIDTH',.766,.49],['FBD',.803,.49],['DYN',.8415,.49],['UTILITY',.761,.80],['I/O',.798,.80],['BYPASS',.8365,.80]];
  const MTIP={GEQ:'31-band graphic EQ (simulated)',PEQ:'parametric EQ',DEQ:'dynamic EQ',WIDTH:'stereo width',FBD:'Feedback Destroyer',DYN:'dynamics + LIMITER (page 3 simulated)',UTILITY:'utility / setup','I/O':'inputs, outputs, delay',BYPASS:'bypass (simulated)'};
  return {name:'Behringer DEQ2496',sub:'Ultracurve Pro · EQ / analyser on the control-room monitors (assumed)',ru:1,knobs:K,
    front(){let o=`<rect x="0" y="0" width="${A.W}" height="${H}" rx="3" class="ar-silver"/>`+ears(H);
      [[.062,.197],[.199,.728],[.732,.874]].forEach(([a,b])=>o+=`<rect x="${X(a)}" y="3" width="${X(b-a)}" height="93" rx="8" class="ar-black"/>`);
      o+=A.txt(X(.004),31,'ULTRA-CURVE','ar-t5d','start')+A.txt(X(.004),39,'PRO','ar-t5d','start')+A.txt(X(.004),46,'MODEL DEQ2496','ar-t4d','start')+`<rect x="${X(.004)}" y="51" width="17" height="19" rx="2" style="fill:#222"/>`+A.txt(X(.004)+8.5,59,'24','ar-t4w')+A.txt(X(.004)+8.5,67,'96','ar-t4w');
      ['ULTRA-HIGH','PRECISION','MASTERING','PROCESSOR'].forEach((t,i)=>o+=A.txt(X(.022),56+i*5,t,'ar-t4d','start'));
      o+=`<rect x="${X(.085)}" y="7" width="${X(.038)}" height="55" rx="2" style="fill:#151515"/>`;
      ['CLIP','-3','-6','-12','-18','-24','-40'].forEach((t,i)=>{const y=[13,20,27.5,35,42.5,49.5,56.5][i];o+=A.txt(X(.105),y+2,t,'ar-t4w')+[0,1].map(c=>A.rled(d,'m'+c+(6-i),X(c?.116:.0915),y,9,4,i?'g':'r')).join('');});
      o+=bt('RTA','RTA',.170,.18,'RTA: real-time analyser (page 1 and 3 simulated; A = source)')+bt('compare','COMPARE',.164,.49,'COMPARE: edited vs stored setting (not simulated)','a')
        +bt('METER','METER',.096,.80,'METER: peak / RMS meter (page 1 simulated)')+bt('MEMORY','MEMORY',.159,.80,'MEMORY: presets (not simulated). LED = settings differ from the stored preset','a');
      o+=bt('page','PAGE',.233,.18,'PAGE: next page of the current menu',0,40)+bt('A','A',.228,.49,'A: function shown at the left of the LCD',0,40)+bt('B','B',.222,.80,'B: function shown at the left of the LCD (hold = reset all)',0,40);
      o+=`<path d="M${X(.255)} 22 h6 q3 0 4 4 q1 4 4 4 h5" ${W}/><path d="M${X(.255)} 53 h${X(.018)}" ${W}/><path d="M${X(.253)} 84 h6 q3 0 4 -4 q1 -4 4 -4 h5" ${W}/>`;
      o+=`<rect x="${X(.270)}" y="8" width="${X(.278)}" height="84" rx="6" style="fill:#050505"/><foreignObject x="${X(.300)}" y="19" width="${X(.216)}" height="62" data-tip="LCD 320 × 80, orange backlight. Upper encoder / wheel / lower encoder = the 3 values on the right; A / B = the boxes on the left"><canvas xmlns="http://www.w3.org/1999/xhtml" width="320" height="80" data-d="deq" data-tx="lcd" style="width:100%;height:100%;display:block;border-radius:3px;image-rendering:pixelated"></canvas></foreignObject>`;
      o+=`<path d="M${X(.549)} 28 h${X(.021)} M${X(.545)} 49 h${X(.09)} M${X(.541)} 70 h${X(.022)}" ${W}/>`;
      const PT='Turn = edit the value at the right of the LCD · Shift+click = PUSH';
      o+=A.knob(d,'e1',X(.590),27,15,'Upper encoder. '+PT)+A.knob(d,'e2',X(.5835),72,15,'Lower encoder. '+PT)+A.knob(d,'wh',X(.674),50,34,'DATA WHEEL (middle value). '+PT);
      [[.617,21],[.610,66],[.713,72]].forEach(([px,y])=>o+=A.txt(X(px),y,'PUSH','ar-t4w')+`<circle cx="${X(px)}" cy="${y+5}" r="2.2" ${W}/>`+A.txt(X(px),y+14,'TURN','ar-t4w'));
      o+=`<rect x="${X(.699)}" y="5" width="${X(.032)}" height="11" rx="2" style="fill:#eee"/>`+A.txt(X(.715),13.5,'24|96','ar-t5d');
      MK.forEach(([b,px,py])=>o+=bt(b,b,px,py,b+': '+MTIP[b]+'. Press = menu / next page · hold 1 s = '+(b==='BYPASS'?'bypass both channels':b==='UTILITY'?'panel lock':b==='I/O'?'—':'bypass the module'),b==='I/O'?'g':'a'));
      o+=`<rect x="${X(.886)}" y="19" width="${X(.048)}" height="61" rx="4" style="fill:#1b1b1b"/>`+A.btn(d,'power',X(.910),50,36,44,'POWER','ar-rock')+A.txt(X(.915),13,'⏻','ar-t6')+A.txt(X(.903),91,'POWER','ar-t4d');
      o+=`<path d="M${X(.973)} 30 l9 15 h-18 z" style="fill:none;stroke:#333;stroke-width:1.2"/>`+A.txt(X(.973),58,'behringer','ar-t4d');return o;},
    rear(){let o=`<rect x="0" y="0" width="${A.W}" height="${H}" rx="3" class="ar-rear"/><rect x="0" y="0" width="${X(.04)}" height="${H}" class="ar-silver"/><rect x="${X(.963)}" y="0" width="${X(.037)}" height="${H}" class="ar-silver"/>`+ears(H);
      o+=A.txt(X(.16),36,'behringer   ULTRACURVE PRO MODEL DEQ2496   CONCEIVED AND DESIGNED BY BEHRINGER GERMANY. MADE IN CHINA','ar-t4','start');
      o+=`<rect x="${X(.068)}" y="22" width="${X(.084)}" height="74" rx="5" style="fill:#181818"/>`+A.sock(d,'iec',X(.107),66,'iec','Mains IEC 100-240 V~ 50/60 Hz 10 W, fuse T 1.0 A H 250 V — no switch at the back',18)+`<rect x="${X(.092)}" y="28" width="${X(.03)}" height="14" class="ar-jack"/>`;
      o+=A.txt(X(.052),40,'100-240V~','ar-t4')+A.txt(X(.052),48,'50/60Hz 10W','ar-t4')+`<circle cx="${X(.166)}" cy="78" r="6" class="ar-hole2"/>`;
      o+=A.txt(X(.243),46,'MIDI','ar-t5')+[['midiout',.197,'OUT'],['midithru',.243,'THRU'],['midiin',.288,'IN']].map(([k,px,t])=>A.sock(d,k,X(px),64,'din','MIDI '+t+' (5-pin DIN)',15)).join('')+lb(.18,.305,'OUT     THRU     IN');
      o+=A.txt(X(.342),46,'WORDCLOCK','ar-t5')+A.sock(d,'wclk',X(.342),64,'rca','WORDCLOCK IN (BNC) — 44.1 / 48 / 88.2 / 96 kHz',26)+lb(.327,.357,'IN');
      o+=A.txt(X(.40),46,'S/PDIF','ar-t5')+A.sock(d,'optout',X(.385),66,'opt','S/PDIF OUT (optical)',9)+A.sock(d,'optin',X(.418),66,'opt','S/PDIF IN (optical)',9)+lb(.372,.432,'OUT   IN');
      o+=A.sock(d,'aesout',X(.472),58,'xlrM','AES/EBU OUT (male XLR, 110 Ω)',21)+A.sock(d,'aesin',X(.527),58,'xlrF','AES/EBU IN (female XLR, 110 Ω)',21)+lb(.446,.553,'OUT  AES/EBU  IN');
      o+=A.txt(X(.603),40,'AUX OUT','ar-t5')+A.txt(X(.603),47,'max +12dBu','ar-t4')+A.sock(d,'auxR',X(.582),64,'trs','AUX OUT R (balanced jack) — carries the digital-output signal',20)+A.sock(d,'auxL',X(.624),64,'trs','AUX OUT L (balanced jack)',20)+lb(.568,.638,'R       L');
      o+=A.sock(d,'rtamic',X(.677),58,'xlrF','RTA/MIC IN (female XLR): measurement mic or line, +15 V phantom switchable in the menu',21)+lb(.652,.702,'RTA/MIC IN');
      o+=A.txt(X(.716),30,'MAX','ar-t5')+A.txt(X(.716),38,'+12dBu','ar-t4')+A.txt(X(.716),56,'+22dBu','ar-t4')+A.btn(d,'max',X(.716),68,11,11,'MAX: maximum level of MAIN in / out, +12 or +22 dBu (in and out switch together: no change in the sound here)','ar-btr');
      [['outR',.754,'xlrM','OUT R','MAIN OUT R (male XLR, servo-balanced)'],['outL',.808,'xlrM','OUT L','MAIN OUT L (male XLR, servo-balanced) → JVC AUX L (assumed)'],
       ['inR',.864,'xlrF','IN R','MAIN IN R (female XLR, balanced 22 kΩ) ← Midas monitor R (assumed)'],['inL',.918,'xlrF','IN L','MAIN IN L (female XLR, balanced 22 kΩ) ← Midas monitor L (assumed)']]
        .forEach(([k,px,kd,t,tip])=>o+=A.sock(d,k,X(px),58,kd,tip,21)+A.txt(X(px),92.5,t,'ar-t4'));
      o+=`<rect x="${X(.73)}" y="84" width="${X(.105)}" height="11" rx="2" style="fill:none;stroke:#ccc"/><rect x="${X(.84)}" y="84" width="${X(.105)}" height="11" rx="2" style="fill:none;stroke:#ccc"/>`;return o;},
    press(b){t0=now();if(b==='power'){s.power=!s.power;if(s.power)s.boot=now()+1500;apply();}else if(b==='max'){s.max=!s.max;A.flash('MAX: '+(s.max?'+22':'+12')+' dBu (in and out together: same sound).');}},
    release(b){if(b==='power'||b==='max'||!s.power||now()<s.boot)return;key(b,now()-t0>900);},
    change(k){const v=s[k],dl=v-(pv[k]||0);pv[k]=v;if(!dl){apply();return;}if(!s.power||now()<s.boot)return;if(Math.abs(dl)>1&&v===0)push(k);else turn(k,Math.sign(dl));},
    audio(c){const g=v=>{const n=c.createGain();n.gain.value=v;return n;},an=f=>{const a=c.createAnalyser();a.fftSize=f;return a;};
      const n=d.n={f:[[],[]],lim:[],trim:[],wet:[],dry:[],out:[],anI:[],anO:[],rIn:g(0),rOut:g(1),rta:an(8192)},io={in:{},out:{}};n.rta.smoothingTimeConstant=.75;
      n.rIn.connect(n.rta);n.rOut.connect(n.rta);
      ['L','R'].forEach((ch,i)=>{const inp=g(1);let p=inp;FQ.forEach(f=>{const b=c.createBiquadFilter();b.type='peaking';b.frequency.value=f;b.Q.value=4.32;b.gain.value=0;p.connect(b);p=b;n.f[i].push(b);});
        const l=c.createDynamicsCompressor();   // + trim: cancels the node's automatic make-up gain (0.6 × full-range gain)
        l.ratio.value=20;l.knee.value=0;l.attack.value=.001;l.release.value=.1;l.threshold.value=0;p.connect(l);
        n.lim.push(l);n.trim.push(g(1));n.wet.push(g(1));n.dry.push(g(0));n.out.push(g(1));n.anI.push(an(2048));n.anO.push(an(2048));
        l.connect(n.trim[i]);n.trim[i].connect(n.wet[i]);inp.connect(n.dry[i]);n.wet[i].connect(n.out[i]);n.dry[i].connect(n.out[i]);inp.connect(n.anI[i]);n.out[i].connect(n.anO[i]);inp.connect(n.rIn);n.out[i].connect(n.rOut);
        io.in['in'+ch]=inp;io.out['out'+ch]=n.out[i];});
      apply();return io;},
    draw(side){const on=s.power&&now()>=s.boot,n=d.n,t=now();
      [0,1].forEach(c=>{let p=-120;if(n&&s.power){p=A.peakDb(n.anI[c]);if(p>-.1||(!s.hb&&n.lim[c].reduction<-.3))clipT[c]=t+250;}
        MT.forEach((th,i)=>A.setLed(d,'m'+c+i,s.power&&p>th));A.setLed(d,'m'+c+6,s.power&&t<clipT[c]);});
      ['GEQ','PEQ','DEQ','WIDTH','DYN'].forEach(m=>A.setLed(d,'k'+m,on&&!s.hb&&!s.mb[m]));A.setLed(d,'kFBD',false);A.setLed(d,'kUTILITY',false);
      A.setLed(d,'kI/O',on);A.setLed(d,'kBYPASS',on&&(s.hb||Object.values(s.mb).some(Boolean)));A.setLed(d,'kcompare',false);
      A.setLed(d,'kMEMORY',on&&(s.g.some(Boolean)||s.lim!==0||Object.values(s.mb).some(Boolean)));
      if(side!=='rear')lcd();}};});
})();
