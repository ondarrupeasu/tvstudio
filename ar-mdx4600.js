/* Behringer MULTICOM PRO-XL MDX4600 (docs/mdx4600-spec.md, docs/mdx4600-front.png / -rear.png): 4-channel expander/gate →
 * compressor (IKA knee) + dynamic enhancer → OUTPUT → peak limiter. Knob dB are relative to the working level: 0 dB ≈ −18 dBFS (inferred).
 * Web Audio per channel: envelope-follower expander (GainNode driven from a 10 ms timer), DynamicsCompressorNode, highshelf enhancer,
 * output gain, limiter (DynamicsCompressorNode ratio 20 + WaveShaper clip). Not affiliated with Behringer / Music Tribe. */
(function(){
const A=window.AR;if(!A)return;const X=f=>f*A.W;
const T=(x,y,t,fs,fill,anc='middle',w=400)=>`<text x="${x}" y="${y}" text-anchor="${anc}" style="font:${w} ${fs}px Arial,Helvetica,sans-serif;fill:${fill}">${t}</text>`;
const R=(x,y,w,h,fill,rx=0,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" style="fill:${fill};${extra}"/>`;
const WH='#e6e6e6',DK='#2b2b2b',PP=[0,.2,.5,.8,1];
const pw=(p,v)=>{for(let i=1;i<5;i++)if(p<=PP[i]){const f=(p-PP[i-1])/(PP[i]-PP[i-1]);return v[i-1]+f*(v[i]-v[i-1]);}return v[4];};
/* knob positions 0..1 (−150°..+150°) → printed scale values */
const trigDb=p=>p<.02?null:pw(p,[-40,-30,-20,0,10]),thrDb=p=>pw(p,[-40,-30,-10,10,20]),ratioOf=p=>p>=.98?Infinity:Math.pow(2,pw(p,[0,1,2,3,5])),
  outDb=p=>pw(p,[-20,-10,0,10,20]),limDb=p=>p>.98?null:pw(p,[0,5,12,15,21]);
const f1=v=>(v>0?'+':'')+v.toFixed(1)+' dB';
const KDEF={trig:[.1,'TRIGGER (expander/gate threshold)',p=>trigDb(p)==null?'OFF':f1(trigDb(p))],thr:[.5,'THRESHOLD (compressor)',p=>f1(thrDb(p))],
  ratio:[.5,'RATIO (compressor)',p=>{const r=ratioOf(p);return r===Infinity?'∞:1':r.toFixed(1)+':1';}],out:[.5,'OUTPUT (make-up gain)',p=>f1(outDb(p))],
  lim:[.5,'LIMITER (peak limiter threshold)',p=>limDb(p)==null?'OFF':f1(limDb(p))]};
const SCALE={trig:['OFF','','-20','0','+10'],thr:['-40','-30','-10','+10','+20'],ratio:['1:1','2','4:1','8','∞'],out:['-20','-10','0','+10','+20'],lim:['0','+5','+12','','OFF']};
const KX={trig:[.079,64.8],thr:[.121,65.9],ratio:[.1635,64.8],out:[.2055,65.9],lim:[.2475,64.8]};
const KTIP={trig:'TRIGGER: expander/gate threshold. Below it the channel is turned down (red ▼); OFF disables the expander/gate',
  thr:'THRESHOLD: level above which the compressor starts reducing gain (GAIN REDUCTION meter)',ratio:'RATIO: how hard the compressor squeezes above the threshold (1:1 = nothing, ∞:1 = limiter)',
  out:'OUTPUT: make-up gain after the compressor, before the peak limiter',lim:'LIMITER: ceiling of the peak limiter (LIMIT LED). Fully right = OFF'};
const LINKED=['trig','thr','ratio','lim','rel','gate','knee'];   // follow the master channel when COUPLE is on
const BT={rel:['a','RELEASE: out = fast expander release · in = slow release (smoother, for long-decay sounds)'],gate:['g','GATE: the expander becomes a gate: below TRIGGER the signal is muted'],
  cont:['a','CONTOUR LOW: high-pass filter in the compressor detector, so bass does not cause "pumping"'],enh:['a','ENHANCER: adds treble in proportion to the compression, to keep the sound bright'],
  knee:['g','INTERACT KNEE: in = soft knee (IKA, gentle onset) · out = hard knee'],io:['a','I/O METER: in = the meter shows the INPUT level · out = the OUTPUT level'],
  inout:['g','IN/OUT: lit = the channel processes · off = bypass (signal passes untouched)'],couple:['r','COUPLE: stereo link. This channel follows the controls of the channel on its left (OUTPUT, CONTOUR, ENHANCER, I/O METER and IN/OUT stay its own)']};
A.type('mdx4600',d=>{const K={};
  for(let n=1;n<=4;n++){Object.entries(KDEF).forEach(([k,[def,nm,fmt]])=>K['c'+n+k]={min:0,max:1,def,step:.01,a0:-150,a1:150,name:'CH'+n+' '+nm,fmt});
    Object.assign(d.st,{['c'+n+'rel']:false,['c'+n+'gate']:false,['c'+n+'cont']:false,['c'+n+'enh']:false,['c'+n+'knee']:true,['c'+n+'io']:false,['c'+n+'inout']:true,['c'+n+'lvl']:false});}
  d.st.c2couple=false;d.st.c4couple=false;d.st.power=true;
  const master=i=>(i===1&&d.st.c2couple)?0:(i===3&&d.st.c4couple)?2:i;   // i = 0..3
  const P=(i,k)=>d.st['c'+((LINKED.includes(k)?master(i):i)+1)+k];
  const ledCache={},ledOn={};
  const L=(l,on)=>{on=!!on;let e=ledCache[l];if(!e||!e.isConnected){e=ledCache[l]=document.querySelector(`.ar-led[data-d="${d.id}"][data-l="${l}"]`);ledOn[l]=undefined;}if(e&&ledOn[l]!==on){e.classList.toggle('on',on);ledOn[l]=on;}};
  const GR=[30,25,20,15,10,6,3,1],IO=[-24,-18,-12,-6,0,6,12,18];
  const LX=[.0745,.084,.096,.105,.1145,.1235,.1325,.1415,.151,.16,.1705,.18,.1895,.1985,.208,.217,.226,.2355,.2475],
    LC=['r','g','r','r','r','r','r','r','r','r','g','g','g','g','g','y','y','r','r'],LT=['▼','▲','30','25','20','15','10','6','3','1','-24','-18','-12','-6','0','+6','+12','+18','LIMIT'],
    LID=n=>['e0','e1',...GR.map((_,i)=>'g'+i),...IO.map((_,i)=>'m'+i),'lim'].map(s=>'c'+n+s);
  const lbtn=(id,x,y,col,tip)=>A.btn(d,id,x,y,22,7.5,tip).replace(/<\/g>$/,A.rled(d,id,x,y,19,5,col)+'</g>');
  function knob(n,k,o){const [fx,cy]=KX[k],cx=X(fx+o),r=13.5,ra=17.5;let tk='';
    for(let j=0;j<11;j++){const a=(-150+j*30)*Math.PI/180,s=Math.sin(a),c=Math.cos(a);tk+=`M${(cx+ra*s).toFixed(1)} ${(cy-ra*c).toFixed(1)}L${(cx+(ra+2.4)*s).toFixed(1)} ${(cy-(ra+2.4)*c).toFixed(1)}`;}
    const a0=-150*Math.PI/180;let s=`<path d="M${(cx+ra*Math.sin(a0)).toFixed(1)} ${(cy-ra*Math.cos(a0)).toFixed(1)}A${ra} ${ra} 0 1 1 ${(cx-ra*Math.sin(a0)).toFixed(1)} ${(cy-ra*Math.cos(a0)).toFixed(1)}${tk}" style="fill:none;stroke:#cfcfcf;stroke-width:.7"/>`;
    const sc=SCALE[k];s+=T(cx-9.5,cy+21,sc[0],3.6,WH)+T(cx-21.9,cy+1.5,sc[1],3.6,WH,'start')+T(cx,cy-21.5,sc[2],3.6,WH)+T(cx+21.9,cy+1.5,sc[3],3.6,WH,'end')+T(cx+9.5,cy+21,sc[4],3.6,WH);
    const slave=(n===2||n===4)&&k!=='out'?` On CH${n}, COUPLE hands it to CH${n-1}.`:'';
    return s+A.knob(d,'c'+n+k,cx,cy,r,KTIP[k]+'.'+slave);}
  return {name:'Behringer MDX4600',sub:'Multicom Pro-XL · 4-ch expander/gate · compressor · enhancer · peak limiter',ru:1,knobs:K,
    front(){let s=`<rect x="0" y="0" width="${A.W}" height="100" rx="3" class="ar-silver"/>`+[[.0175,14.3],[.0175,86.3],[.9825,14.3],[.9825,86.3]].map(([x,y])=>`<rect x="${X(x)-7}" y="${y-4}" width="14" height="8" rx="4" class="ar-hole2"/>`).join('');
      s+=T(5,38.5,'MULTICOM',9,'#383838','start',700)+T(5,47.5,'PRO-XL',9,'#383838','start',700)+T(5,53.4,'AUDIO INTERACTIVE QUAD',3.5,'#383838','start')+T(5,59.4,'DYNAMICS PROCESSOR',3.5,'#383838','start')+T(5,65.4,'MODEL MDX4600',3.5,'#383838','start');
      for(let n=1;n<=4;n++){const o=.2075*(n-1),c='c'+n,ids=LID(n);
        s+=T(X(.133+o),8,'GAIN REDUCTION (dB)',3.6,'#333')+T(X(.205+o),8,'INPUT/OUTPUT LEVEL (dB)',3.6,'#333')+R(X(.0625+o),11,X(.202),16.5,'#121212',1.5);
        LX.forEach((x,j)=>s+=A.rled(d,ids[j],X(x+o),15.4,j===18?7:5.4,2.6,LC[j])+T(X(x+o),24,LT[j],LT[j].length>3?3:3.4,WH));
        s+=`<g data-tip="Meters CH${n}: ▼ red = expander/gate working (signal below TRIGGER), ▲ green = signal above TRIGGER · GAIN REDUCTION of the compressor (dB) · INPUT/OUTPUT LEVEL (0 dB = working level) · LIMIT = peak limiter working">${R(X(.0625+o),11,X(.202),16.5,'transparent')}</g>`;
        s+=R(X(.0625+o),31.3,X(.202),65.4,'#1c1c1c',4)+T(X(.10+o),38,'EXPANDER/GATE',4.8,WH,'middle',700)+T(X(.163+o),38,'COMPRESSOR/LIMITER',4.8,WH,'middle',700)+T(X(.262+o),38,'PEAK LIMITER',4.8,WH,'end',700);
        Object.keys(KX).forEach(k=>s+=knob(n,k,o));
        s+=lbtn(c+'rel',X(.10+o),45.6,'a',BT.rel[1])+T(X(.10+o),53.2,'RELEASE',3.6,WH)+lbtn(c+'cont',X(.1425+o),45.6,'a',BT.cont[1])+T(X(.1425+o),53.2,'CONTOUR',3.6,WH)+T(X(.1425+o),57.4,'LOW',3.6,WH)
          +lbtn(c+'knee',X(.184+o),45.6,'g',BT.knee[1])+T(X(.184+o),53.2,'INTERACT',3.6,WH)+T(X(.184+o),57.4,'KNEE',3.6,WH)+lbtn(c+'io',X(.2265+o),45.6,'a',BT.io[1])+T(X(.2265+o),53.2,'I/O METER',3.6,WH);
        s+=lbtn(c+'gate',X(.10+o),84.1,'g',BT.gate[1])+lbtn(c+'enh',X(.1425+o),84.1,'a',BT.enh[1])+lbtn(c+'inout',X(.2265+o),84.1,'g',BT.inout[1]);
        if(n===2||n===4){const bx=X(.184+o);s+=`<path d="M${bx-11} 76.5H${bx+3}V79.5" style="fill:none;stroke:${WH};stroke-width:.7"/>`+lbtn(c+'couple',bx,84.1,'r',BT.couple[1].replace('the channel on its left','CH'+(n-1)))+T(bx,95,'COUPLE CH'+(n-1),3.6,WH);}
        s+=`<rect x="${X(.2265+o)-4}" y="67.5" width="8" height="9" style="fill:none;stroke:${WH};stroke-width:.6"/>`+T(X(.2265+o),75,String(n),6.5,WH);
        [['trig','TRIGGER'],['thr','THRESHOLD'],['ratio','RATIO'],['out','OUTPUT'],['lim','LIMITER']].forEach(([k,l])=>s+=T(X(KX[k][0]+o),89.5,'dB',3.6,WH)+T(X(KX[k][0]+o),95,l,3.8,WH));
        s+=T(X(.10+o),95,'GATE',3.8,WH)+T(X(.1425+o),95,'ENHANCER',3.8,WH)+R(X(.2265+o)-10,91.5,20,4.8,'#ddd',1.5)+T(X(.2265+o),95.2,'IN/OUT',3.6,'#111',  'middle',700);}
      s+=T(X(.918),10.4,'▃ ON  ▆ OFF',3.6,'#333')+R(X(.897),19.2,X(.0425),61.6,'#0d0d0d',2)+A.btn(d,'power',X(.918),50.5,X(.0425)-7,55,'POWER: switches the unit on / off (latching push switch). Off = no sound through any channel')+T(X(.918),91,'POWER',3.8,'#333');
      s+=`<path d="M${X(.971)} 25L${X(.971)+14} 50H${X(.971)-14}Z" style="fill:none;stroke:#333;stroke-width:1.6"/><circle cx="${X(.971)}" cy="42" r="3" style="fill:none;stroke:#333;stroke-width:1.2"/>`+T(X(.971),66,'behringer',7.5,'#333');
      return s;},
    rear(){let s=`<rect x="0" y="0" width="${A.W}" height="100" rx="3" class="ar-rear"/>`+R(X(.043),0,X(.914),18,'rgba(255,255,255,.05)')
        +[0,X(.957)].map(x=>R(x,0,X(.043),100,'#bdbdbd')).join('')+[[.0215,14.3],[.0215,86.3],[.9785,14.3],[.9785,86.3]].map(([x,y])=>`<rect x="${X(x)-7}" y="${y-4}" width="14" height="8" rx="4" class="ar-hole2"/>`).join('')
        +[.063,.3,.42,.6,.78,.935].map(x=>`<circle cx="${X(x)}" cy="9" r="3.5" style="fill:#151515;stroke:#555;stroke-width:.6"/>`).join('');
      s+=R(X(.077),17,X(.063),50,'#101010',3)+A.sock(d,'ac',X(.1085),42,'iec','AC INPUT: mains socket (IEC) with fuse holder / voltage selector. No switch here: POWER is on the front',20)+T(X(.1085),76,'AC INPUT',4,WH);
      s+=T(X(.172),56,'behringer',7.5,WH)+T(X(.172),70.5,'MULTICOM PRO-XL',4.2,WH,'middle',700)+T(X(.172),77,'MODEL MDX4600',4.2,WH,'middle',700);
      for(let n=1;n<=4;n++){const o=-.181*(n-1),c='c'+n;
        s+=T(X(.808+o),25,'ALL INPUTS &amp; OUTPUTS',3.7,WH)+T(X(.808+o),30,'FULLY BALANCED',3.7,WH)+T(X(.797+o),38,'┼ TIP/PIN 2',3.2,WH,'start')+T(X(.797+o),44,'— RING/PIN 3',3.2,WH,'start')+T(X(.797+o),50,'⏚ SLEEVE/PIN 1',3.2,WH,'start');
        s+=T(X(.845+o),24,'OPERATING',3.7,WH)+T(X(.845+o),29,'LEVEL',3.7,WH)+A.btn(d,c+'lvl',X(.839+o),44.9,11,10,`OPERATING LEVEL CH${n}: out = +4 dBu (pro level, as the Midas) · in = −10 dBV (hi-fi level): the channel then works 11.8 dB hotter`)
          +T(X(.861+o),39,'+4 dBu',3.1,WH)+T(X(.861+o),44.5,'⊓',3.6,WH)+T(X(.861+o),50,'⊔',3.6,WH)+T(X(.861+o),55.5,'-10 dBV',3.1,WH);
        s+=A.sock(d,'out'+n,X(.775+o),59.5,'xlrM',`CH${n} OUT (male XLR, balanced): processed signal`,19)+A.sock(d,'outj'+n,X(.821+o),78.4,'trs',`CH${n} OUT (TRS jack, in parallel with the XLR)`,20)
          +A.sock(d,'inj'+n,X(.856+o),78.4,'trs',`CH${n} IN (TRS jack, balanced)`,20)+A.sock(d,'in'+n,X(.9015+o),61.1,'xlrF',`CH${n} IN (female XLR, balanced)`,19);
        s+=R(X(.758+o),92,X(.071),6.5,'#cfcfcf',1)+T(X(.7935+o),97,`CH ${n} OUT`,3.8,'#111','middle',700)+R(X(.838+o),92,X(.092),6.5,'none',1,`stroke:${WH};stroke-width:.6`)+T(X(.884+o),97,`CH ${n} IN`,3.8,WH,'middle',700);}
      return s;},
    press(b){const m=/^c(\d)(\w+)$/.exec(b);
      if(b==='power')d.st.power=!d.st.power;
      else if(m){const i=+m[1]-1,k=m[2];if(LINKED.includes(k)&&master(i)!==i){A.flash(`CH${i+1} is coupled to CH${master(i)+1}: use the CH${master(i)+1} button.`);return;}d.st[b]=!d.st[b];}
      apply();},
    change(){apply();},
    audio(c){d.c=c;const g=v=>{const n=c.createGain();n.gain.value=v??1;return n;},io={in:{},out:{}};d.ch=[];
      for(let i=0;i<4;i++){const inp=g(),out=g(),pre=g(),ex=g(),hi=g(),neg=g(-1),cA=g(1),cB=g(0),lowG=g(0),og=g(),lc=g(),post=g(),wet=g(1),dry=g(0);
        const anI=c.createAnalyser(),anO=c.createAnalyser(),lp=c.createBiquadFilter(),dl=c.createDelay(.05),cmp=c.createDynamicsCompressor(),enh=c.createBiquadFilter(),lim=c.createDynamicsCompressor(),clip=c.createWaveShaper();
        anI.fftSize=anO.fftSize=512;lp.type='lowpass';lp.frequency.value=100;dl.delayTime.value=.006;enh.type='highshelf';enh.frequency.value=3000;enh.gain.value=0;
        lim.ratio.value=20;lim.knee.value=0;lim.attack.value=.003;lim.release.value=.5;
        inp.connect(pre);pre.connect(anI);pre.connect(ex);
        /* CONTOUR LOW: the compressor only sees the signal above ~100 Hz; the bass band is re-added with the same gain reduction */
        ex.connect(lp);lp.connect(neg);ex.connect(hi);neg.connect(hi);ex.connect(cA);hi.connect(cB);cA.connect(cmp);cB.connect(cmp);lp.connect(dl);dl.connect(lowG);
        cmp.connect(enh);lowG.connect(enh);enh.connect(og);og.connect(lim);lim.connect(lc);lc.connect(clip);clip.connect(anO);clip.connect(post);post.connect(wet);wet.connect(out);inp.connect(dry);dry.connect(out);
        io.in['in'+(i+1)]=inp;io.out['out'+(i+1)]=out;
        d.ch.push({pre,ex,cA,cB,lowG,cmp,enh,og,lim,lc,clip,post,wet,dry,out,anI,anO,lv:-120,ed:0,below:false,trig:false,gr:0,mv:-120,cl:null});}
      apply();let last=performance.now();setInterval(()=>tick(last,(last=performance.now())),10);return io;},
    draw(side){
      if(side==='rear'){for(let n=1;n<=4;n++){const r=document.querySelector(`.ar-b[data-d="${d.id}"][data-b="c${n}lvl"] rect`);if(r)r.style.fill=d.st['c'+n+'lvl']?'#0b0b0b':'#454545';}return;}
      const pwr=d.st.power;
      for(let n=1;n<=4;n++){const c='c'+n,i=n-1,ids=LID(n),ch=d.ch&&d.ch[i],act=pwr&&d.st[c+'inout'];
        ['rel','gate','knee'].forEach(k=>L(c+k,pwr&&P(i,k)));['cont','enh','io','inout'].forEach(k=>L(c+k,pwr&&d.st[c+k]));if(n===2||n===4)L(c+"couple",pwr&&d.st[c+'couple']);
        if(!ch||!pwr){ids.forEach(l=>L(l,false));continue;}
        L(ids[0],act&&ch.trig&&ch.below);L(ids[1],act&&ch.trig&&!ch.below);
        const gr=act?ch.gr:0;GR.forEach((v,j)=>L(ids[2+j],gr>=v));
        const lv=(d.st[c+'io']?A.peakDb(ch.anI):A.peakDb(ch.anO))+18;ch.mv=Math.max(lv,ch.mv-4);IO.forEach((v,j)=>L(ids[10+j],ch.mv>=v));
        L(ids[18],act&&ch.lim.reduction<-.5);}}};
  /* expander/gate envelope follower + enhancer / contour that depend on the compressor's gain reduction */
  function tick(t0,t1){if(!d.ch||!d.st.power)return;const dt=Math.min(.1,(t1-t0)/1000),now=d.c.currentTime;
    d.ch.forEach(ch=>ch.lv=A.peakDb(ch.anI)+18);
    d.ch.forEach((ch,i)=>{const n=i+1,m=master(i),slave=m!==i;let lv=ch.lv;
      if(slave)lv=Math.max(lv,d.ch[m].lv);else if((i===0&&d.st.c2couple)||(i===2&&d.st.c4couple))lv=Math.max(lv,d.ch[i+1].lv);   // shared detector
      const tr=trigDb(P(i,'trig'));let tgt=0;ch.trig=tr!=null;ch.below=false;
      if(tr!=null&&d.st['c'+n+'inout']){const u=tr-lv;if(u>0){ch.below=true;tgt=P(i,'gate')?-80:-Math.min(80,u*(Math.min(8,2+u/5)-1));}}
      ch.ed=tgt>=ch.ed?tgt:Math.max(tgt,ch.ed-(P(i,'rel')?10:1000)*dt);   // attack instant · release FAST ≈1000 dB/s, SLOW ≈10 dB/s
      ch.ex.gain.setTargetAtTime(A.db2g(ch.ed),now,.002);
      const red=ch.cmp.reduction||0;ch.gr=-red;
      ch.enh.gain.setTargetAtTime(d.st['c'+n+'enh']?Math.min(28,ch.gr*.5):0,now,.02);
      ch.lowG.gain.setTargetAtTime(d.st['c'+n+'cont']?A.db2g(red):0,now,.01);});}
  function apply(){if(!d.ch)return;const now=d.c.currentTime,S=(p,v,tc=.02)=>p.setTargetAtTime(v,now,tc);
    d.ch.forEach((ch,i)=>{const n=i+1,c='c'+n,lvl=d.st[c+'lvl']?11.8:0,knee=P(i,'knee')?10:0,r=Math.min(20,ratioOf(P(i,'ratio')));
      const th=Math.min(0,-18+thrDb(P(i,'thr'))+(knee?5:0));
      S(ch.pre.gain,A.db2g(lvl));S(ch.post.gain,A.db2g(-lvl));
      S(ch.cmp.threshold,th);S(ch.cmp.knee,knee);S(ch.cmp.ratio,r);ch.cmp.attack.value=.01;ch.cmp.release.value=.2;
      /* DynamicsCompressorNode adds automatic make-up gain (≈0.6 × full-range reduction): cancel it, the MDX uses OUTPUT instead */
      S(ch.og.gain,A.db2g(outDb(d.st[c+'out'])+.6*th*(1-1/r)));
      const ld=limDb(P(i,'lim')),lt=ld==null?0:Math.min(0,-18+ld);S(ch.lim.threshold,lt);S(ch.lc.gain,A.db2g(.6*lt*.95));
      if(ch.cl!==lt){ch.cl=lt;const a=A.db2g(lt),cv=new Float32Array(1025);for(let j=0;j<1025;j++){const x=j/512-1;cv[j]=Math.max(-a,Math.min(a,x));}ch.clip.curve=cv;}
      const cont=d.st[c+'cont'];S(ch.cA.gain,cont?0:1,.005);S(ch.cB.gain,cont?1:0,.005);
      const on=d.st[c+'inout'];S(ch.wet.gain,on?1:0,.005);S(ch.dry.gain,on?0:1,.005);S(ch.out.gain,d.st.power?1:0,.01);});}
});
})();
