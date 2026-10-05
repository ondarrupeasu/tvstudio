/* Audio rack unit: JVC A-X77 "Dynamic Super-A" stereo integrated amplifier (docs/jvc-ax7-spec.md, img/rack-audio-v2.jpg).
 * Drawn with the lower flap open, as in the photo. Only AUX carries audio (the DEQ2496 output); SPEAKERS 1 = control room. */
(function(){
const A=window.AR;if(!A)return;
A.type('jvc',d=>{const RU=3.2,H=A.UH*RU,X=f=>f*A.W,Y=f=>f*H;
  Object.assign(d.st,{power:true,mute:false,tmon:false,input:'aux',tone:false,sub:false,loud:false,mono:false});
  const K={vol:{min:-80,max:0,def:-4,step:1,name:'VOLUME',fmt:v=>v<=-80?'−∞ dB':v+' dB'},
    bass:{min:-8,max:8,def:0,step:.5,name:'BASS (100 Hz)',fmt:v=>(v>0?'+':'')+v+' dB'},
    treble:{min:-8,max:8,def:0,step:.5,name:'TREBLE (10 kHz)',fmt:v=>(v>0?'+':'')+v+' dB'},
    bal:{min:-1,max:1,def:0,step:.05,name:'BALANCE',fmt:v=>Math.abs(v)<.01?'centre':(v<0?'LEFT ':'RIGHT ')+Math.round(Math.abs(v)*100)+' %'},
    spk:{steps:['OFF','1','2','1+2'],def:'1',a0:-50,a1:75,name:'SPEAKERS',fmt:v=>v==='OFF'?'OFF (phones only)':v==='1'?'1 = control room':v==='2'?'2 = studio':'1+2 = both'},
    tplay:{steps:['2','1','3'],def:'1',a0:-45,a1:45,name:'TAPE PLAY',fmt:v=>'TAPE-'+v},
    trec:{steps:['SOURCE','OFF','1►2/3','2►1','3►1'],def:'OFF',a0:-50,a1:115,name:'TAPE REC',fmt:v=>v},
    phono:{steps:['1-MC','1-MM','2-MM','2-MC'],def:'1-MM',a0:-60,a1:80,name:'PHONO',fmt:v=>'PHONO-'+v}};
  let n=null,pOn=-1e9;   // power-on time (protection relay)
  const tape=(x,y,w,h,t,rot,cls='ar-tape',tc='ar-tapet')=>`<g transform="rotate(${rot} ${X(x)} ${Y(y)})" data-tip="Studio tape: “${t.replace(/<[^>]+>/g,' ')}”"><rect x="${X(x)-X(w)/2}" y="${Y(y)-Y(h)/2}" width="${X(w)}" height="${Y(h)}" class="${cls}"/>${t.split('|').map((s,i,a)=>A.txt(X(x),Y(y)+(i-(a.length-1)/2)*12+4,s,tc)).join('')}</g>`;
  const pink=(x,y,w,h,r)=>`<rect x="${X(x)-w/2}" y="${Y(y)-h/2}" width="${w}" height="${h}" transform="rotate(${r} ${X(x)} ${Y(y)})" fill="#f25ca0" opacity=".92" data-tip="Pink sticker (studio)"/>`;
  /* black key with white label top-left and a lamp */
  const key=(b,x,y,w,h,l,tip)=>A.btn(d,b,X(x),Y(y),X(w),Y(h),tip,'ar-bt2')+A.txt(X(x-w/2)+5,Y(y-h/2)+11,l,'ar-t5w','start')+A.rled(d,b,X(x+w/2)-9,Y(y-h/2)+7,8,4,'g');
  const sk=(b,x,y,tip)=>A.btn(d,b,X(x),Y(y),17,17,tip,'ar-bt');
  return {name:'JVC A-X77',sub:'integrated amplifier · SPEAKERS 1 = control room, 2 = studio',ru:RU,wFrac:.9,knobs:K,
    front(){let s=`<rect x="0" y="0" width="${A.W}" height="${H}" rx="6" class="ar-silver"/>`;
      /* upper aluminium panel */
      s+=A.txt(X(.078),Y(.255),'JVC','ar-brand')+A.txt(X(.135),Y(.275),'A-X77  STEREO INTEGRATED AMPLIFIER','ar-t5d','start')+A.txt(X(.36),Y(.275),'Dynamic Super-A','ar-t6b','start');
      s+=key('power',.078,.462,.067,.255,'POWER','POWER: push on / push off (default ON)');
      s+=`<circle cx="${X(.592)}" cy="${Y(.372)}" r="${X(.0675)+7}" class="ar-silver2" stroke="#ccc" stroke-width="2"/>`+A.knob(d,'vol',X(.592),Y(.372),X(.0675),'VOLUME: attenuation from max (drag / scroll). Feeds speakers and phones')+A.txt(X(.635),Y(.146),'VOLUME','ar-t5d');
      s+=A.led(d,'prot',X(.548),Y(.16),3.5,'r')+`<circle cx="${X(.548)}" cy="${Y(.16)}" r="9" fill="transparent" data-tip="Protection indicator: blinks a few seconds after power-on (speakers muted), then steady"/>`;
      s+=key('mute',.727,.192,.06,.129,'MUTING','MUTING: −20 dB, push again to restore');
      s+=key('tmon',.782,.555,.06,.134,'TAPE MONITOR','TAPE MONITOR: listen to the deck chosen with TAPE PLAY instead of the source (no deck connected here = silence)');
      [['phono',.195,'PHONO','PHONO input (PHONO selector chooses 1/2, MM/MC) — nothing connected'],['tuner',.377,'TUNER','TUNER input — nothing connected'],['aux',.555,'AUX','AUX input = the DEQ2496 output (Midas monitor)']]
        .forEach(([b,y,l,t])=>s+=key(b,.896,y,.129,.134,l,t));
      /* indicator band: 6 windows */
      s+=`<rect x="${X(.17)}" y="${Y(.652)}" width="${X(.29)}" height="${Y(.034)}" rx="2" fill="#2a2a2a"/>`;
      [['sp1','SP-1','SPEAKERS SYSTEM 1 on (control room)'],['sp2','SP-2','SPEAKERS SYSTEM 2 on (studio)'],['tone','TONE','TONE on: BASS / TREBLE active'],['sub','SUBSONIC','SUBSONIC filter on'],['mm','MM','PHONO MM cartridge selected'],['mc','MC','PHONO MC cartridge selected']]
        .forEach(([l,t,tip],i)=>{const x=X(.191+i*.0498);s+=A.rled(d,l,x,Y(.669),X(.03),Y(.024)-1,'g')+`<rect x="${x-X(.015)}" y="${Y(.652)}" width="${X(.03)}" height="${Y(.034)}" fill="transparent" data-tip="${t}: ${tip}"/>`;});
      /* studio tapes and stickers */
      s+=tape(.23,.32,.12,.16,'1 MONITOR CONTROL|2 MONITOR PLATO',-3);
      s+=`<g data-tip="Studio tape: SP-1 = control-room speakers"><rect x="${X(.15)}" y="${Y(.455)}" width="${X(.35)}" height="${Y(.07)}" fill="#fff"/>${A.txt(X(.325),Y(.505),'SP-1 = ALTAVOCES CONTROL','ar-t6b')}</g>`.replace('ar-t6b"','ar-t6b" style="fill:#1d3f9c"');
      s+=`<g data-tip="Studio tape: SP-2 = studio-floor speakers"><rect x="${X(.16)}" y="${Y(.555)}" width="${X(.31)}" height="${Y(.07)}" fill="#fff"/>${A.txt(X(.315),Y(.605),'SP-2 = ALTAVOCES PLATO','ar-t6b')}</g>`.replace('ar-t6b"','ar-t6b" style="fill:#1d3f9c"');
      s+=pink(.47,.32,52,26,8)+pink(.012,.47,24,26,0);
      /* hinge + open flap strip */
      s+=`<line x1="${X(.02)}" y1="${Y(.69)}" x2="${X(.98)}" y2="${Y(.69)}" stroke="#888" stroke-width="2"/><rect x="${X(.035)}" y="${Y(.735)}" width="${X(.93)}" height="${Y(.245)}" rx="3" fill="#3a3a3c"/>`;
      const P=[[.053,.177,''],[.181,.348,'TONE'],[.351,.45,''],[.455,.525,''],[.528,.709,'TAPE-3'],[.713,.855,'PLAY —— TAPE —— REC'],[.858,.94,'PHONO']];
      P.forEach(([a,b,h])=>{s+=`<rect x="${X(a)}" y="${Y(.745)}" width="${X(b-a)}" height="${Y(.228)}" fill="none" stroke="#9a9a9a" stroke-width="1"/>`+(h?A.txt(X((a+b)/2),Y(.755)+7,h,'ar-t4w'):'');});
      const ky=Y(.883),ly=Y(.79),kr=X(.0195);
      s+=A.sock(d,'phones',X(.085),ky,'trs','PHONES: 6.3 mm headphone jack (speakers keep playing)',26)+A.txt(X(.085),ly,'PHONES','ar-t4w');
      s+=A.knob(d,'spk',X(.144),ky,kr,'SPEAKERS: OFF · 1 (control room) · 2 (studio) · 1+2')+A.txt(X(.144),ly,'SPEAKERS','ar-t4w')+A.txt(X(.125),ky-kr-3,'OFF','ar-t4w')+A.txt(X(.165),ky-kr-3,'1 2 1+2','ar-t4w');
      s+=A.knob(d,'bass',X(.216),ky,kr,'BASS: ±8 dB at 100 Hz (only with TONE on)')+A.txt(X(.216),ly,'BASS','ar-t4w')+A.knob(d,'treble',X(.280),ky,kr,'TREBLE: ±8 dB at 10 kHz (only with TONE on)')+A.txt(X(.280),ly,'TREBLE','ar-t4w');
      s+=sk('tone',.333,.895,'TONE: in = ON (BASS / TREBLE active), out = OFF (flat)')+A.txt(X(.333),ly,'ON/OFF','ar-t4w');
      [['sub',.367,'SUBSONIC','SUBSONIC filter: 18 Hz, −6 dB/oct (in = ON)'],['loud',.401,'LOUDNESS','LOUDNESS: +6 dB at 100 Hz / +4 dB at 10 kHz at low volume (in = ON)'],['mono',.434,'MODE','MODE: in = MONO (L+R), out = STEREO']]
        .forEach(([b,x,l,t])=>s+=sk(b,x,.88,t)+A.txt(X(x),ly,l,'ar-t4w')+A.txt(X(x),ly+9,b==='mono'?'MONO/ST':'ON/OFF','ar-t4w'));
      s+=A.knob(d,'bal',X(.489),ky,kr,'BALANCE: LEFT ◄ ▮ ► RIGHT (centre click)')+A.txt(X(.489),ly,'BALANCE','ar-t4w');
      [['t3recL',.553,'REC L'],['t3recR',.592,'REC R'],['t3playL',.631,'PLAY L'],['t3playR',.672,'PLAY R']].forEach(([k,x,l])=>s+=A.sock(d,k,X(x),ky,'rca','TAPE-3 '+l+' (front RCA) — nothing connected',30)+A.txt(X(x),ly+8,l,'ar-t4w'));
      s+=A.knob(d,'tplay',X(.740),ky,kr,'TAPE PLAY: which deck TAPE MONITOR listens to (2 · 1 · 3)')+A.txt(X(.740),ly+8,'2 · 1 · 3','ar-t4w');
      s+=A.knob(d,'trec',X(.812),ky,kr,'TAPE REC: what goes to the REC outputs (SOURCE · OFF · 1►2/3 · 2►1 · 3►1)')+A.txt(X(.812),ly+8,'SRC·OFF·1►2/3','ar-t4w');
      s+=A.knob(d,'phono',X(.891),ky,kr,'PHONO: 1-MC · 1-MM · 2-MM · 2-MC (input and cartridge type)')+A.txt(X(.891),ly+8,'1:MC MM 2:MM MC','ar-t4w');
      return s;},
    rear(){let s=`<rect x="0" y="0" width="${A.W}" height="${H}" rx="6" class="ar-rear"/><rect x="${X(.055)}" y="${Y(.1)}" width="${X(.17)}" height="${Y(.86)}" rx="3" class="ar-box"/>`;
      const rc=(id,y,lab,tip)=>A.sock(d,id+'R',X(.075),Y(y),'rca',tip+' R')+A.sock(d,id+'L',X(.110),Y(y),'rca',tip+' L')+A.txt(X(.128),Y(y)+4,lab,'ar-t4','start');
      s+=A.txt(X(.075),Y(.12)-2,'R','ar-t4')+A.txt(X(.11),Y(.12)-2,'L','ar-t4');
      s+=rc('ph1',.18,'PHONO 1','PHONO-1 input (RCA) — nothing connected')+rc('ph2',.28,'PHONO 2','PHONO-2 input (RCA) — nothing connected')+rc('tun',.375,'TUNER','TUNER input (RCA) — nothing connected');
      s+=A.sock(d,'auxR',X(.075),Y(.47),'rca','AUX input R (RCA) ← DEQ2496 OUT R')+A.sock(d,'auxL',X(.110),Y(.47),'rca','AUX input L (RCA) ← DEQ2496 OUT L')+A.txt(X(.128),Y(.47)+4,'AUX','ar-t4','start');
      s+=rc('t1rec',.58,'REC','TAPE-1 REC output (RCA)')+rc('t1play',.68,'PLAY','TAPE-1 PLAY input (RCA)')+A.txt(X(.2),Y(.75),'TAPE-1 · SEA','ar-t4');
      s+=rc('t2rec',.80,'REC','TAPE-2 REC output (RCA)')+rc('t2play',.91,'PLAY','TAPE-2 PLAY input (RCA)')+A.txt(X(.2),Y(.86),'TAPE-2','ar-t4');
      s+=`<g data-tip="GND: ground terminal for the turntable"><circle cx="${X(.18)}" cy="${Y(.2)}" r="9" class="ar-post"/><line x1="${X(.18)-5}" y1="${Y(.2)}" x2="${X(.18)+5}" y2="${Y(.2)}" stroke="#333" stroke-width="2"/></g>`+A.txt(X(.18),Y(.2)+22,'GND','ar-t4');
      s+=A.sock(d,'din',X(.18),Y(.62),'din','TAPE-1 DIN REC/PLAY (parallel with the TAPE-1 RCAs)',14)+A.txt(X(.18),Y(.62)+26,'DIN','ar-t4');
      /* speaker terminals: R+ R− L− L+ ; the sock (cable end) sits on the inner pair */
      s+=`<rect x="${X(.33)}" y="${Y(.3)}" width="${X(.22)}" height="${Y(.6)}" rx="3" class="ar-box"/>`+A.txt(X(.44),Y(.3)+16,'SPEAKERS','ar-t5');
      [[1,.53,'sp1','SPEAKERS SYSTEM 1 → control-room speakers (SP-1)'],[2,.76,'sp2','SPEAKERS SYSTEM 2 → studio speakers (SP-2)']].forEach(([k,y,id,t])=>{
        s+=[.357,.517].map((x,i)=>`<circle cx="${X(x)}" cy="${Y(y)}" r="13" class="ar-post" data-tip="${t} — ${i?'LEFT +':'RIGHT +'}"/>`).join('')+A.sock(d,id,X(.437),Y(y),'spk',t+' (R− · L− shown; 4–16 Ω, 8–16 Ω with both pairs)',34);
        s+=A.txt(X(.44),Y(y)+30,'RIGHT — SYSTEM '+k+' — LEFT','ar-t4')+A.txt(X(.357),Y(y)-18,'+','ar-t5')+A.txt(X(.517),Y(y)-18,'+','ar-t5');});
      s+=`<g data-tip="FUSE holder (mains)"><circle cx="${X(.59)}" cy="${Y(.38)}" r="15" class="ar-jack"/><rect x="${X(.59)-8}" y="${Y(.38)-2}" width="16" height="4" fill="#222"/></g>`+A.txt(X(.59),Y(.38)+30,'FUSE','ar-t4');
      s+=`<g data-tip="LINE VOLTS selector (continental-Europe version: no AC outlets)"><rect x="${X(.67)}" y="${Y(.33)}" width="${X(.06)}" height="${Y(.16)}" rx="3" class="ar-jack"/></g>`+A.txt(X(.70),Y(.53),'LINE VOLTS','ar-t4');
      s+=`<rect x="${X(.77)}" y="${Y(.3)}" width="${X(.15)}" height="${Y(.22)}" class="ar-label"/>${A.txt(X(.845),Y(.38),'JVC  A-X77','ar-t5d')}${A.txt(X(.845),Y(.45),'220-240V~ 50Hz','ar-t4d')}`;
      s+=`<g data-tip="Mains cable (fixed)"><rect x="${X(.905)}" y="${Y(.84)}" width="${X(.03)}" height="${Y(.1)}" rx="3" class="ar-jack"/><path d="M${X(.92)} ${Y(.94)} L${X(.92)} ${H}" stroke="#111" stroke-width="7"/></g>`;
      return s;},
    press(b){const st=d.st;if(b==='power'){st.power=!st.power;if(st.power){pOn=performance.now();setTimeout(route,3100);}}
      else if(b==='phono'||b==='tuner'||b==='aux')st.input=b;
      else if(['mute','tmon','tone','sub','loud','mono'].includes(b))st[b]=!st[b];
      if(b==='phones')A.flash('PHONES: no headphones in the simulator — the speakers keep playing.');
      route();},
    change(){route();},
    audio(c){const g=v=>{const x=c.createGain();x.gain.value=v??1;return x;},f=(t,fr)=>{const x=c.createBiquadFilter();x.type=t;x.frequency.value=fr;x.gain.value=0;return x;};
      const inL=g(),inR=g(),mg=c.createChannelMerger(2);inL.connect(mg,0,0);inR.connect(mg,0,1);
      n={sel:g(0),sub:f('highpass',1),bass:f('lowshelf',100),tre:f('highshelf',10000),lb:f('lowshelf',100),lt:f('highshelf',10000),sp:c.createChannelSplitter(2),m:c.createChannelMerger(2),
        LL:g(1),LR:g(0),RL:g(0),RR:g(1),vol:g(0),o1:g(0),o2:g(0),an:c.createAnalyser()};
      n.sub.Q.value=.5;n.an.fftSize=512;
      mg.connect(n.sel);n.sel.connect(n.sub);n.sub.connect(n.bass);n.bass.connect(n.tre);n.tre.connect(n.lb);n.lb.connect(n.lt);n.lt.connect(n.sp);
      /* MODE + BALANCE matrix: LL/RL feed left out, LR/RR feed right out */
      n.sp.connect(n.LL,0);n.sp.connect(n.LR,0);n.sp.connect(n.RL,1);n.sp.connect(n.RR,1);n.LL.connect(n.m,0,0);n.RL.connect(n.m,0,0);n.LR.connect(n.m,0,1);n.RR.connect(n.m,0,1);
      n.m.connect(n.vol);n.vol.connect(n.an);n.vol.connect(n.o1);n.vol.connect(n.o2);
      pOn=-1e9;route();return {in:{auxL:inL,auxR:inR},out:{sp1:n.o1,sp2:n.o2}};},
    draw(){const st=d.st,on=st.power,now=performance.now(),boot=now-pOn<3000;
      A.setLed(d,'power',on);A.setLed(d,'prot',on&&(!boot||Math.floor(now/250)%2===0));
      A.setLed(d,'mute',on&&st.mute);A.setLed(d,'tmon',on&&st.tmon);['phono','tuner','aux'].forEach(b=>A.setLed(d,b,on&&st.input===b));
      A.setLed(d,'sp1',on&&(st.spk==='1'||st.spk==='1+2'));A.setLed(d,'sp2',on&&(st.spk==='2'||st.spk==='1+2'));
      A.setLed(d,'tone',on&&st.tone);A.setLed(d,'sub',on&&st.sub);
      A.setLed(d,'mm',on&&st.input==='phono'&&st.phono.endsWith('MM'));A.setLed(d,'mc',on&&st.input==='phono'&&st.phono.endsWith('MC'));}};
  function route(){if(!n||!A.ctx)return;const st=d.st,t=A.ctx.currentTime,T=(p,v)=>p.setTargetAtTime(v,t,.02);
    const live=st.power&&performance.now()-pOn>=3000;   // protection relay closes ~3 s after power-on
    T(n.sel.gain,st.input==='aux'&&!st.tmon?1:0);   // PHONO / TUNER / tape: nothing connected
    T(n.sub.frequency,st.sub?18:1);
    T(n.bass.gain,st.tone?st.bass:0);T(n.tre.gain,st.tone?st.treble:0);
    const lf=st.loud?Math.max(0,Math.min(1,(-st.vol-10)/20)):0;T(n.lb.gain,6*lf);T(n.lt.gain,4*lf);
    const bl=Math.min(1,1-st.bal),br=Math.min(1,1+st.bal),m=st.mono;
    T(n.LL.gain,(m?.5:1)*bl);T(n.RL.gain,(m?.5:0)*bl);T(n.LR.gain,(m?.5:0)*br);T(n.RR.gain,(m?.5:1)*br);
    T(n.vol.gain,live?(st.vol<=-80?0:A.db2g(st.vol))*(st.mute?A.db2g(-20):1):0);
    T(n.o1.gain,st.spk==='1'||st.spk==='1+2'?1:0);T(n.o2.gain,st.spk==='2'||st.spk==='1+2'?1:0);}
});
})();
