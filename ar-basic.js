/* Audio rack units: img Stage Line LS-280/SW line splitter, TC Electronic M350, Behringer Virtualizer Pro DSP2024P
 * (docs/audio-rack-misc-spec.md). The M350 / Virtualizer effects run inside the Midas audio (window.OUTBOARD). */
(function(){
const A=window.AR;if(!A)return;const X=f=>f*A.W;
const ears=(h,cls='ar-ear')=>`<rect x="0" y="0" width="${X(.045)}" height="${h}" class="${cls}"/><rect x="${X(.955)}" y="0" width="${X(.045)}" height="${h}" class="${cls}"/>`+
  [[.02,.15],[.02,.85],[.98,.15],[.98,.85]].map(([x,y])=>`<rect x="${X(x)-7}" y="${h*y-4}" width="14" height="8" rx="4" class="ar-hole2"/>`).join('');
/* ---------- img Stage Line LS-280/SW: 2 mono inputs (A, B) → 8 outputs; LINK: A feeds all 8 ---------- */
A.type('ls280',d=>{const H=100,lvl=k=>({min:0,max:10,def:7,step:.1,name:k,fmt:v=>v.toFixed(1)});
  d.st.link=false;d.st.power=true;
  const OX=[.308,.371,.433,.495,.620,.682,.744,.807];
  const K={inA:lvl('INPUT LEVEL A'),inB:lvl('INPUT LEVEL B')};OX.forEach((x,i)=>K['o'+(i+1)]=lvl('OUTPUT LEVEL '+(i+1)));
  return {name:'img Stage Line LS-280/SW',sub:'line splitter · "ST-L / ST-R" in · "PGM" / "VU" out',ru:1,knobs:K,
    front(){let s=`<rect x="0" y="0" width="${A.W}" height="${H}" rx="3" class="ar-black"/>`+ears(H,'ar-black2')+
      `<rect x="${X(.006)}" y="30" width="${X(.05)}" height="34" class="ar-plate"/>${A.txt(X(.031),44,'LS-280/SW','ar-t6b')}${A.txt(X(.031),56,'PROFESSIONAL','ar-t4')}${A.txt(X(.031),61,'LINE SPLITTER','ar-t4')}`;
      s+=`<rect x="${X(.086)}" y="10" width="${X(.133)}" height="78" rx="4" class="ar-box"/>${A.txt(X(.153),20,'INPUT LEVEL','ar-t5')}${A.txt(X(.153),27,'GREEN: SIGNAL · RED: PEAK','ar-t4')}`;
      s+=`<rect x="${X(.272)}" y="10" width="${X(.258)}" height="78" rx="4" class="ar-box"/>${A.txt(X(.40),17,'OUTPUT LEVEL SECTION A','ar-t5')}<rect x="${X(.586)}" y="10" width="${X(.257)}" height="78" rx="4" class="ar-box"/>${A.txt(X(.714),17,'OUTPUT LEVEL SECTION B','ar-t5')}`;
      [['A',.121],['B',.184]].forEach(([n,x])=>{s+=A.led(d,'in'+n,X(x),21,3.2,'g')+A.knob(d,'in'+n,X(x),52,15,'INPUT LEVEL '+n+(n==='A'?' (tape: ST-L)':' (tape: ST-R)'))+A.txt(X(x),82,n,'ar-t6');});
      OX.forEach((x,i)=>{s+=A.knob(d,'o'+(i+1),X(x),52,15,`OUTPUT LEVEL ${i+1}`+(i===0||i===4?' (tape: PGM — to the ATEM)':i===1||i===5?' (tape: VU)':''))+`<rect x="${X(x+.017)}" y="24" width="12" height="11" class="ar-numbox"/>`+A.txt(X(x+.017)+6,33,String(i+1),'ar-t5');});
      s+=A.txt(X(.559),40,'LINK TO','ar-t4')+A.txt(X(.559),46,'INPUT A','ar-t4')+A.txt(X(.559),53,'▲OFF ▼ON','ar-t4')+A.btn(d,'link',X(.559),68,13,13,'LINK TO INPUT A: OFF = A → outputs 1-4, B → 5-8 · ON = A → all 8 outputs','ar-btr')+A.led(d,'link',X(.559),68,3,'g');
      s+=A.led(d,'pwr',X(.908),21,3.2,'r')+A.btn(d,'power',X(.908),60,26,48,'POWER','ar-rock')+A.txt(X(.908),94,'POWER','ar-t5')+A.txt(X(.971),48,'img','ar-t6b')+A.txt(X(.971),58,'Stage Line','ar-t4');
      [['ST-L',.105],['INPUT',.15],['ST-R',.2],['PGM',.316],['VU',.38],['PGM',.628],['VU',.69]].forEach(([t,x],i)=>s+=`<g transform="rotate(${[-6,3,-4,5,-7,4,-5][i]} ${X(x)} 14)"><rect x="${X(x)-16}" y="7" width="32" height="13" class="ar-tape"/>${A.txt(X(x),17,t,'ar-tapet')}</g>`);
      return s;},
    rear(){let s=`<rect x="0" y="0" width="${A.W}" height="${H}" rx="3" class="ar-rear"/>`+ears(H,'ar-black2');
      s+=`<g data-tip="Fixed mains cable (230 V~ / 50 Hz)"><rect x="${X(.066)}" y="26" width="${X(.042)}" height="26" rx="3" class="ar-jack"/></g>${A.txt(X(.087),68,'230V~/50Hz','ar-t4')}${A.txt(X(.087),82,'MAINS','ar-t4')}`;
      s+=`<rect x="${X(.183)}" y="12" width="${X(.278)}" height="78" rx="3" class="ar-box"/>${A.txt(X(.32),24,'OUTPUT SECTION B','ar-t5')}<rect x="${X(.497)}" y="12" width="${X(.278)}" height="78" rx="3" class="ar-box"/>${A.txt(X(.636),24,'OUTPUT SECTION A','ar-t5')}`;
      [.217,.279,.342,.405].forEach((x,i)=>s+=A.sock(d,'out'+(5+i),X(x),48,'xlrM','OUTPUT CH'+(5+i)+' (male XLR)',14)+A.txt(X(x),78,'CH'+(5+i),'ar-t5'));
      [.529,.591,.654,.716].forEach((x,i)=>s+=A.sock(d,'out'+(1+i),X(x),48,'xlrM','OUTPUT CH'+(1+i)+' (male XLR)',14)+A.txt(X(x),78,'CH'+(1+i),'ar-t5'));
      s+=A.sock(d,'inB',X(.776),50,'xlrF','INPUT B (female XLR, PUSH to release)',15)+A.txt(X(.776),82,'B','ar-t5')+A.sock(d,'inA',X(.838),50,'xlrF','INPUT A (female XLR, PUSH to release)',15)+A.txt(X(.838),82,'A','ar-t5')+A.txt(X(.904),52,'INPUT','ar-t5');
      return s;},
    press(b){if(b==='link')d.st.link=!d.st.link;if(b==='power')d.st.power=!d.st.power;route();},
    change(){route();},
    audio(c){const g=()=>c.createGain(),io={in:{inA:g(),inB:g()},out:{}};d.n={ia:g(),ib:g(),an:[c.createAnalyser(),c.createAnalyser()],o:[],fa:[],fb:[]};
      io.in.inA.connect(d.n.ia);io.in.inB.connect(d.n.ib);d.n.ia.connect(d.n.an[0]);d.n.ib.connect(d.n.an[1]);
      for(let i=1;i<=8;i++){const o=g(),fa=g(),fb=g();d.n.ia.connect(fa);d.n.ib.connect(fb);fa.connect(o);fb.connect(o);io.out['out'+i]=o;d.n.o.push(o);d.n.fa.push(fa);d.n.fb.push(fb);}
      return io;},
    draw(){if(d.n){[0,1].forEach(i=>{const db=A.peakDb(d.n.an[i]);const e=document.querySelector(`.ar-led[data-d="${d.id}"][data-l="in${'AB'[i]}"]`);if(e){e.classList.toggle('on',db>-40&&d.st.power);e.classList.toggle('r',db>-3);e.classList.toggle('g',db<=-3);}});}
      A.setLed(d,'pwr',d.st.power);A.setLed(d,'link',d.st.link);}};
  function route(){if(!d.n||!A.ctx)return;const t=A.ctx.currentTime,L=v=>v<=0?0:A.db2g((v-7)*3);   // 7 ≈ unity (inferido)
    d.n.ia.gain.setTargetAtTime(L(d.st.inA),t,.02);d.n.ib.gain.setTargetAtTime(L(d.st.inB),t,.02);
    for(let i=0;i<8;i++){const fromA=d.st.link||i<4;d.n.fa[i].gain.setTargetAtTime(fromA?1:0,t,.02);d.n.fb[i].gain.setTargetAtTime(fromA?0:1,t,.02);d.n.o[i].gain.setTargetAtTime(d.st.power?L(d.st['o'+(i+1)]):0,t,.02);}}});
/* ---------- TC Electronic M350 (dual-engine reverb / delay) ---------- */
const OB=()=>window.OUTBOARD;
A.type('m350',d=>{const H=100;
  const RT=['Live Stage','Spring','Plate','Hall','Cathedral','Ambience'],DT=['Dynamic Delay','Tape Delay','Ping Pong','Chorus','Flanger','Off'];
  const K={input:{min:0,max:1,def:.8,name:'INPUT GAIN',fmt:v=>Math.round(v*100)+' %'},mix:{min:0,max:1,def:.5,name:'MIX RATIO',fmt:v=>Math.round(v*100)+' % wet'},
    feedback:{min:0,max:.8,def:.25,name:'FEEDBACK / depth',fmt:v=>Math.round(v*100)+' %'},predelay:{min:0,max:.2,def:.02,name:'PRE DELAY',fmt:v=>Math.round(v*1000)+' ms'},
    decay:{min:.3,max:8,def:2.4,name:'DECAY TIME',fmt:v=>v.toFixed(1)+' s'},type:{steps:RT,def:'Hall',name:'REVERB type',fmt:v=>v},dtype:{steps:DT,def:'Dynamic Delay',name:'DELAY / EFFECTS type',fmt:v=>v}};
  return {name:'TC Electronic M350',sub:'dual-engine reverb / delay · tape "AUX 1 y 2"',ru:1,knobs:K,
    front(){let s=`<rect x="0" y="0" width="${A.W}" height="${H}" rx="3" class="ar-silver"/><rect x="0" y="0" width="${X(.045)}" height="${H}" rx="6" class="ar-black"/><rect x="${X(.955)}" y="0" width="${X(.045)}" height="${H}" rx="6" class="ar-black"/>`;
      s+=A.txt(X(.075),72,'t.c. electronic','ar-brand','start')+`<rect x="${X(.065)}" y="12" width="60" height="14" class="ar-tape"/>${A.txt(X(.065)+30,22,'AUX 1 Y 2','ar-tapet')}`+A.txt(X(.19),20,'INPUT | OUTPUT','ar-sec')+A.txt(X(.48),20,'DELAY | EFFECTS','ar-sec')+A.txt(X(.72),20,'REVERB','ar-sec');
      s+=[0,1,2,3,4].map(i=>A.led(d,'lv'+i,X(.2)+i*9,32,2.6,i>3?'r':'g')).join('');
      [['input',.226,'INPUT GAIN'],['mix',.302,'MIX RATIO'],['feedback',.58,'FEEDBACK'],['predelay',.79,'PRE DELAY'],['decay',.858,'DECAY TIME']].forEach(([k,x,l])=>s+=A.knob(d,k,X(x),52,14,l+': drag / scroll')+A.txt(X(x),84,l,'ar-t5d'));
      s+=A.knob(d,'dtype',X(.42),52,18,'DELAY / EFFECTS type selector')+A.txt(X(.42),86,'TYPE','ar-t5d')+A.knob(d,'type',X(.645),52,18,'REVERB type selector')+A.txt(X(.645),86,'TYPE','ar-t5d');
      s+=`<rect x="${X(.905)}" y="25" width="${X(.045)}" height="45" rx="3" class="ar-lcd"/><text x="${X(.927)}" y="52" class="ar-lcdt" data-d="${d.id}" data-tx="disp"></text>`+A.txt(X(.927),85,'CONTROL PANEL','ar-t4d');return s;},
    rear(){let s=`<rect x="0" y="0" width="${A.W}" height="${H}" rx="3" class="ar-rear"/>`+A.txt(X(.08),30,'Serial Routing Mode','ar-t4')+A.txt(X(.08),62,'Dual Inputs (Send/Return)','ar-t4');
      s+=A.btn(d,'routing',X(.18),34,14,14,'ROUTING: OFF = serial · ON = dual input (here: as cabled, not simulated)','ar-btr')+A.txt(X(.18),60,'ROUTING','ar-t4');
      s+=`<rect x="${X(.201)}" y="8" width="${X(.114)}" height="10" class="ar-hdr"/>${A.txt(X(.258),16,'INPUTS','ar-t5w')}<rect x="${X(.320)}" y="8" width="${X(.116)}" height="10" class="ar-hdr"/>${A.txt(X(.378),16,'OUTPUTS','ar-t5w')}`;
      [['inL',.228,'1 LEFT'],['inR',.29,'2 RIGHT'],['outL',.348,'LEFT'],['outR',.408,'RIGHT']].forEach(([k,x,l])=>s+=A.sock(d,k,X(x),44,'trs',(k.startsWith('in')?'INPUT ':'OUTPUT ')+l+' (balanced jack)',18)+A.txt(X(x),74,l,'ar-t5'));
      s+=A.sock(d,'di',X(.473),36,'rca','S/PDIF digital in')+A.sock(d,'do',X(.473),68,'rca','S/PDIF digital out')+A.txt(X(.473),92,'DIGITAL I/O','ar-t4');
      s+=A.sock(d,'midiin',X(.53),46,'din','MIDI IN')+A.sock(d,'midiout',X(.589),46,'din','MIDI OUT')+A.txt(X(.56),80,'MIDI IN · OUT','ar-t4')+A.sock(d,'pedal',X(.65),42,'trs','PEDAL IN: tip = bypass, ring = tap tempo',16)+A.txt(X(.65),74,'PEDAL','ar-t4');
      s+=`<rect x="${X(.69)}" y="12" width="${X(.09)}" height="56" class="ar-label"/>${A.txt(X(.735),40,'CAUTION','ar-t5d')}<rect x="${X(.84)}" y="16" width="${X(.06)}" height="60" class="ar-label"/>${A.txt(X(.87),44,'SERIAL NO.','ar-t4d')}`;
      s+=A.sock(d,'iec',X(.951),42,'iec','Mains 100-240 V~ (IEC) — no power switch',16)+A.txt(X(.951),86,'100-240V~','ar-t4');return s;},
    audio(){const o=M32.audio().ob.m350;return {in:{inL:o.inL,inR:o.inR},out:{outL:o.outL,outR:o.outR}};},   // the effect engine runs in the Midas audio; its in / out follow the rack cables
    change(k){const O=OB();if(!O)return;const v=d.st[k];if(k==='type')O.set('m350',{type:v,decay:[1.2,1.6,1.8,2.4,4.5,.8][RT.indexOf(v)]});else if(k==='dtype'){const i=DT.indexOf(v);O.set('m350',{delay:[.32,.4,.28,.02,.005,0][i],feedback:i>=3?.05:.25});}else O.set('m350',{[k]:v});},
    draw(){const O=OB();if(!O)return;A.setText(d,'disp',d.st.type.slice(0,7));const db=O.level('aux1'),f=db<=-60?0:(db+60)/60;for(let i=0;i<5;i++)A.setLed(d,'lv'+i,f>i/5);}};});
/* ---------- Behringer Virtualizer Pro DSP2024P ---------- */
A.type('virt',d=>{const H=100,VP=['Plate','Hall','Room','Cathedral','Echo','Ping Pong'];
  const K={decay:{min:.3,max:8,def:1.4,name:'DECAY',fmt:v=>v.toFixed(1)+' s'},predelay:{min:0,max:.2,def:.01,name:'PRE-DELAY',fmt:v=>Math.round(v*1000)+' ms'},delay:{min:.05,max:1.2,def:.25,name:'DELAY',fmt:v=>Math.round(v*1000)+' ms'},
    feedback:{min:0,max:.8,def:.2,name:'FEEDBACK',fmt:v=>Math.round(v*100)+' %'},mix:{min:0,max:1,def:.5,name:'MIX',fmt:v=>Math.round(v*100)+' % wet'},type:{steps:VP,def:'Plate',name:'DATA WHEEL = algorithm',fmt:v=>v}};
  return {name:'Behringer Virtualizer Pro DSP2024P',sub:'multi-effects · tape "AUX 3 y 4"',ru:1,knobs:K,
    front(){let s=`<rect x="0" y="0" width="${A.W}" height="${H}" rx="3" class="ar-silver"/>`+ears(H,'ar-silver2')+`<rect x="${X(.05)}" y="8" width="${X(.19)}" height="84" rx="4" class="ar-black"/>`;
      s+=`<rect x="${X(.06)}" y="14" width="60" height="14" class="ar-tape"/>${A.txt(X(.06)+30,24,'AUX 3 Y 4','ar-tapet')}`+A.txt(X(.065),55,'VIRTUALIZER','ar-t7w','start')+A.txt(X(.065),70,'PRO','ar-t7w','start')+A.txt(X(.065),84,'MODEL DSP2024P','ar-t4','start');
      s+=`<rect x="${X(.25)}" y="15" width="${X(.13)}" height="70" rx="3" class="ar-lcd2"/><text x="${X(.315)}" y="60" class="ar-redt" data-d="${d.id}" data-tx="disp"></text>`;
      s+=[0,1,2,3,4,5].map(i=>A.rled(d,'lv'+i,X(.24),78-i*10,6,6,i>4?'r':'g')).join('');
      [['decay',.42,'DECAY'],['predelay',.47,'PRE-DELAY'],['delay',.52,'DELAY'],['feedback',.57,'FEEDBACK'],['mix',.655,'MIX']].forEach(([k,x,l])=>s+=A.knob(d,k,X(x),48,15,l)+A.txt(X(x),82,l,'ar-t5d'));
      [['PRESET',.73,32,'prev'],['STORE',.78,32,'na'],['EFFECT',.73,58,'next'],['COMPARE',.78,58,'na'],['EDIT',.73,84,'na'],['SETUP',.78,84,'na']].forEach(([l,x,y,b])=>s+=A.btn(d,b,X(x),y,36,14,b==='prev'?'PRESET: previous algorithm':b==='next'?'EFFECT: next algorithm':l+': not simulated','ar-bt2')+A.txt(X(x),y+3,l,'ar-t4w'));
      s+=A.knob(d,'type',X(.86),50,20,'DATA WHEEL: choose the algorithm')+A.btn(d,'na',X(.94),50,20,26,'POWER','ar-rock')+A.txt(X(.94),85,'POWER','ar-t4d');return s;},
    rear(){let s=`<rect x="0" y="0" width="${A.W}" height="${H}" rx="3" class="ar-rear"/>`+A.sock(d,'iec',X(.075),62,'iec','Mains (IEC) with fuse holder / voltage selector',16)+`<rect x="${X(.06)}" y="16" width="${X(.03)}" height="18" class="ar-jack"/>`;
      s+=`<rect x="${X(.15)}" y="8" width="${X(.145)}" height="10" class="ar-hdr"/>${A.txt(X(.222),16,'OUT    THRU    IN','ar-t5w')}`+[['midiout',.174],['midithru',.224],['midiin',.272]].map(([k,x])=>A.sock(d,k,X(x),48,'din','MIDI '+k.slice(4).toUpperCase())).join('')+A.txt(X(.222),86,'MIDI','ar-t4');
      s+=`<rect x="${X(.46)}" y="25" width="${X(.11)}" height="47" class="ar-label"/>${A.txt(X(.515),46,'SERIAL NUMBER','ar-t4d')}${A.txt(X(.515),60,'DATE CODE','ar-t4d')}`;
      [[2,0],[1,.207]].forEach(([n,dx])=>{s+=A.sock(d,'out'+n,X(.596+dx),44,'xlrM','OUTPUTS '+n+' (male XLR)',14)+A.sock(d,'outj'+n,X(.654+dx),71,'trs','OUTPUTS '+n+' (jack, parallel)',13)+A.btn(d,'na',X(.666+dx),25,12,12,'OPERATING LEVEL +4 dBu / -10 dBV','ar-btr')
        +A.sock(d,'inj'+n,X(.689+dx),71,'trs','INPUTS '+n+' (jack)',13)+A.sock(d,'in'+n,X(.737+dx),44,'xlrF','INPUTS '+n+' (female XLR)',15)+A.txt(X(.666+dx),95,'◄ OUTPUTS '+n+' ▬ INPUTS '+n+' ►','ar-t4');});
      return s;},
    press(b){const O=OB();if(!O)return;if(b==='prev'||b==='next'){const i=(VP.indexOf(d.st.type)+(b==='next'?1:-1)+VP.length)%VP.length;d.st.type=VP[i];this.change('type');}else if(b==='na')A.flash('Not simulated on this unit.');},
    audio(){const o=M32.audio().ob.virt;return {in:{in1:o.inL,in2:o.inR},out:{out1:o.outL,out2:o.outR}};},
    change(k){const O=OB();if(!O)return;const v=d.st[k];if(k==='type'){const i=VP.indexOf(v);O.set('virt',{type:v,decay:[1.4,2.6,.9,5,1.2,1][i],delay:[.25,.25,.15,.25,.38,.3][i]});}else O.set('virt',{[k]:v});},
    draw(){const O=OB();if(!O)return;A.setText(d,'disp',String(VP.indexOf(d.st.type)+1).padStart(2,'0'));const db=O.level('aux3'),f=db<=-60?0:(db+60)/60;for(let i=0;i<6;i++)A.setLed(d,'lv'+i,f>i/6);}};});
})();
