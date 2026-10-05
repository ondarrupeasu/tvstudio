/* Behringer ULTRACURVE PRO DEQ2496 (docs/deq2496-spec.md, docs/deq2496-front-ref.jpg / -rear-ref.jpg).
 * Real audio on the control-room monitor feed: IN → GEQ → PEQ → FBD → DEQ → DYN → WIDTH → LIMITER → DELAY → OUT;
 * RTA / meters / DEQ / expander / FBD detection from AnalyserNodes. Orange 320×80 LCD = a <canvas> in a <foreignObject>.
 * MEMORY: 64 presets in localStorage 'deq2496-mem'. METER pages 2-3, MIDI: drawn, not simulated. */
(function(){
const A=window.AR;if(!A)return;const X=f=>f*A.W;
const FQ=[20,25,31.5,40,50,63,80,100,125,160,200,250,315,400,500,630,800,1000,1250,1600,2000,2500,3150,4000,5000,6300,8000,10000,12500,16000,20000];
const fq=f=>{f=Number(f.toPrecision(3));if(f<1000)return String(f);const k=Math.floor(f/1000);return k+'K'+String(Math.round(f%1000)).padStart(3,'0').replace(/0+$/,'');};
const PG={GEQ:1,PEQ:2,DEQ:3,WIDTH:2,FBD:3,DYN:3,UTILITY:2,'I/O':4,BYPASS:1,RTA:3,MEMORY:2,METER:3,AEQ:1};
const MODS=['GEQ','PEQ','DEQ','DYN','LIMIT','WIDTH'],RG=[15,30,60,90],MT=[-40,-24,-18,-12,-6,-3];
const cl=(v,a,b)=>Math.max(a,Math.min(b,v)),sg=v=>(v>0?'+':'')+v.toFixed(1),rf=i=>20*Math.pow(2,i/6),now=()=>performance.now();
const F0=[31.5,63,125,250,500,1000,2000,4000,8000,16000],PTY=['BELL','LSHELF','HSHELF','LCUT','HCUT'],PNT=['peaking','lowshelf','highshelf','highpass','lowpass'];
const BWS=['1/10','1/8','1/6','1/5','1/4','1/3','1/2','2/3','1','1.5','2','3','4','5','6','8','10'],FBW=['1/10','1/20','1/30','1/40','1/60'],FM=['OFF','PARAM','SNGL','AUTO'];
const DM=['BP','L6','L12','H6','H12'],DNT=['peaking','lowshelf','lowshelf','highshelf','highshelf'],DDT=['bandpass','lowpass','lowpass','highpass','highpass'];
const RT=[2,3,4,6,8,10,15,20,30,50,100],DR=[1.1,1.2,1.5,2,3,4,6,10,20,50,100],RATE=['FAST','MID','SLOW','AVRG'],RSM=[.5,.75,.9,.97],RPK=['FAST','MID','SLOW','HOLD','OFF'],RPD=[1.5,.6,.2,0,999];
const INS=['MAIN IN','DIG. IN XLR','DIG. IN OPT.','PINK NOISE'],TAPS=['INPUT','POST GEQ/PEQ','POST DYN','POST WIDTH'],RIN=['MAIN IN','MAIN OUT','AUX/DIG OUT','RTA/MIC'],RS=['L+R IN','L+R OUT','DIGOUT','RTA IN'];
const CLK=['44.1','48','88.2','96'],FMT=['S/PDIF','AES3'],DIT=['OFF','24 BIT','20 BIT','16 BIT'],MIC=['LINE','MIC','MIC +15V'],DU=['MSEC','FEET','METER'],CH=' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-+/.#';
const MKY={GEQ:['g'],PEQ:['peq'],DEQ:['deq'],WIDTH:['wd'],DYN:['dy','lim','lh','lr'],FBD:['fbd','fb'],'I/O':['io']},MODK=Object.keys(MKY),SK=['g','peq','fbd','fb','deq','wd','dy','lim','lh','lr','io','mb'];
const fr=t=>{const [a,b]=t.split('/');return b?a/b:+a;},bq=N=>Math.sqrt(Math.pow(2,N))/(Math.pow(2,N)-1),fz=f=>fq(f)+'Hz',ms=v=>v>=1000?(v/1000).toFixed(2)+'s':Math.round(v)+'ms';
const stp=(x,v,st,a,b)=>cl(Math.round((x+v*st)/st)*st,a,b),tm=(x,v,a,b)=>cl(x<20?x+v:Math.round(x*Math.pow(1.1,v)),a,b);
const DF={peq:()=>({on:0,t:0,f:1000,g:0,bw:8}),fbd:()=>({m:0,f:1000,g:0,bw:0,set:0,ts:0}),deq:f=>({m:0,f,bw:8,thr:-30,r:2,mg:0,at:10,rl:200})},two=f=>[f(),f()];
const fon=p=>p.m===1||(p.m>1&&p.set);
let MEM=null;const mem=()=>{if(!MEM){try{MEM=JSON.parse(localStorage.getItem('deq2496-mem'));}catch(_){}if(!Array.isArray(MEM))MEM=[];}return MEM;};
const msave=()=>{try{localStorage.setItem('deq2496-mem',JSON.stringify(MEM));}catch(_){}};
/* RBJ biquad magnitude (same formulas as Web Audio) → f => dB */
function rbj(t,f0,G,Q){const fs=A.ctx?A.ctx.sampleRate:48000,a=Math.pow(10,G/40),w=2*Math.PI*f0/fs,cs=Math.cos(w),sn=Math.sin(w);let b,q;
  if(t==='peaking'){const al=sn/(2*Q);b=[1+al*a,-2*cs,1-al*a];q=[1+al/a,-2*cs,1-al/a];}
  else if(t==='lowpass'||t==='highpass'){const al=sn/1.4142,u=t==='lowpass'?1:-1;b=[(1-u*cs)/2,u*(1-u*cs),(1-u*cs)/2];q=[1+al,-2*cs,1-al];}
  else{const sa=Math.sqrt(a)*sn*Math.SQRT2,h=t==='highshelf'?-1:1,c=h*cs;b=[a*((a+1)-(a-1)*c+sa),2*a*h*((a-1)-(a+1)*c),a*((a+1)-(a-1)*c-sa)];q=[(a+1)+(a-1)*c+sa,-2*h*((a-1)+(a+1)*c),(a+1)+(a-1)*c-sa];}
  return f=>{const w2=2*Math.PI*f/fs,c1=Math.cos(w2),c2=Math.cos(2*w2),s1=Math.sin(w2),s2=Math.sin(2*w2),m=v=>{const re=v[0]+v[1]*c1+v[2]*c2,im=v[1]*s1+v[2]*s2;return re*re+im*im;};return 10*Math.log10(m(b)/m(q));};}
A.type('deq2496',d=>{const H=100,s=d.st;
  Object.assign(s,{power:true,menu:'GEQ',page:1,band:17,ed:2,g:two(()=>Array(31).fill(0)),gp:{bw:1,m:0,v:0},peq:two(()=>F0.map(f=>({...DF.peq(),f}))),pn:0,fine:0,
    fbd:two(()=>Array.from({length:12},DF.fbd)),fn:0,fb:{sens:-6,thr:-40,max:-18,run:1,lock:0},deq:two(()=>[100,1000,5000].map(DF.deq)),dn:0,
    wd:{as:0,w:100,rot:0,bt:0,bf:700,sh:1},dy:{m:0,g:0,thr:0,r:3,at:10,kn:0,rl:100},lim:0,lh:0,lr:100,
    io:{in:0,clk:1,ng:-20,tap:0,fmt:0,dit:0,nsh:0,ig:0,og:0,rin:1,mic:0,du:0,dl:[0,0],tmp:20,tf:0,dm:0},
    ut:{ct:6,gm:0,go:0,nc:0,mb:1,ll:0,ml:-30,mc:1,mf:[1,1,1,1,1,1]},us:0,mb:{},hb:false,rmax:0,rrg:2,rcur:30,rrate:1,rpk:1,msrc:'INPUT',bsel:0,boot:0,
    pk:[[-120,-120],[-120,-120]],mp:1,mcur:0,mmod:0,dlg:null,cmp:null,lock:false,aeq:{run:0,rc:0,span:12,dm:1.5,it:0,st:''}});
  const snap=(k=SK)=>JSON.stringify(Object.fromEntries(k.map(x=>[x,s[x]]))),DEF=snap();s.ref=DEF;
  const pv={},rpk=new Float32Array(61).fill(-120);let t0=0,clipT=[0,0],bins=null,fbuf=null;
  const rt={de:two(()=>[-120,-120,-120]),dg:two(()=>[0,0,0]),dl:[-120,-120],xe:-120,xg:0,fs:two(()=>({k:0,n:0})),tc:0,acc:Array(61).fill(0),an:0};
  const fl=t=>{if(s.ut.mb)A.flash(t);},E=()=>s.ed===2?[0,1]:[s.ed],C=()=>s.ed===1?1:0,SD=()=>['L','R','L+R'][s.ed];
  const ed=(o,k,f)=>{const v=f(o(C())[k]);E().forEach(c=>o(c)[k]=v);},fs=(f,v)=>cl(f*Math.pow(2,v/(s.fine?60:6)),20,20000);
  const tgm=m=>{if(s.mb[m])delete s.mb[m];else s.mb[m]=true;},pre=i=>i===0?{n:'INITIAL DATA',d:DEF,pr:1}:mem()[i];
  const pend=()=>s.gp.bw>1||s.gp.m>0,spd=()=>331.3+.606*s.io.tmp;
  /* GEQ with the paragraphic (BW/OCT) or shelving edit still pending */
  function geff(c){const g=s.g[c].slice(),p=s.gp,b=s.band;if(!pend()||!E().includes(c))return g;
    return g.map((v,i)=>{const dd=i-b,h=(p.bw-1)/2;let a=0;if(!p.m){if(Math.abs(dd)<=h)a=p.v*(h?.5+.5*Math.cos(Math.PI*dd/(h+1)):1);}else if(p.m===1?dd<0:dd>0)a=p.v*Math.abs(dd)/3;return cl(v+a,-15,15);});}
  const enc=(name,i)=>({min:-9999,max:9999,def:0,step:1,a0:-9999*18,a1:9999*18,name,fmt:()=>{const p=view().p[i];return p&&p.n?p.n+' '+p.v:'(no function on this page)';}});
  /* ---------- each page: A / B labels + handlers, the 3 right-hand parameters (upper encoder, wheel, lower encoder): name, value, turn, push ---------- */
  const P=(n,v,t,p)=>({n,v,t,p}),N0=P('',''),LR=()=>'L/R:\n'+['LEFT','RIGHT','LINK'][s.ed],aLR=()=>{s.ed=(s.ed+1)%3;fl('Editing: '+['LEFT channel','RIGHT channel','both channels (STEREO LINK)'][s.ed]);};
  function view(){const M=s.menu,Pg=s.page,io=s.io;if(s.dlg)return dlgV();
    if(M==='GEQ'){const gp=s.gp,pd=pend(),G=c=>s.g[c],b=s.band;
      return {a:LR(),A:aLR,b:pd?'ACCEPT\nVALUES':'RESET\nGEQ',f:geq,
        B:l=>{if(pd){if(!l)E().forEach(c=>s.g[c]=geff(c).map(v=>Math.round(v*2)/2));Object.assign(gp,{bw:1,m:0,v:0});}else E().forEach(c=>l?s.g[c].fill(0):s.g[c][b]=0);},
        p:[P('FREQ',fz(FQ[b]),v=>s.band=cl(b+v,0,30)),pd?P(gp.m?'dB/OCT':'GAIN',sg(gp.v)+'dB',v=>gp.v=stp(gp.v,v,.5,-15,15),()=>gp.v=0):P('GAIN',sg(s.g[C()][b])+'dB',v=>ed(G,b,x=>stp(x,v,.5,-15,15)),()=>ed(G,b,()=>0)),
          P('BW/OCT',gp.m?['','LOW','HIGH'][gp.m]+' SHLV':gp.bw+'/3',v=>{if(!gp.m)gp.bw=cl(gp.bw+2*v,1,59);},()=>gp.m=(gp.m+1)%3)]};}
    if(M==='PEQ'){const pk=c=>s.peq[c][s.pn],q=pk(C()),e=(k,f)=>{ed(pk,k,f);E().forEach(c=>pk(c).on=1);},rs=c=>Object.assign(pk(c),DF.peq(),{f:F0[s.pn]}),cut=q.t>2;
      if(Pg===1)return {a:LR(),A:aLR,b:'NEXT\nFILTER',B:l=>{if(l)E().forEach(rs);else s.pn=(s.pn+1)%10;},f:peq1,
        p:[P('FREQ',fz(q.f),v=>e('f',f=>fs(f,v)),()=>s.fine^=1),P('GAIN',cut?'--':sg(q.g)+'dB',v=>e('g',g=>stp(g,v,.5,-15,15)),()=>e('g',()=>0)),
          P(cut?'TYPE':'BW/OCT',cut?PTY[q.t]:BWS[q.bw],v=>e('bw',x=>cl(x+v,0,16)),()=>e('t',t=>(t+1)%5))]};
      return {a:LR(),A:aLR,b:'RESET\nFILTER',B:l=>E().forEach(c=>l?s.peq[c]=F0.map(f=>({...DF.peq(),f})):rs(c)),f:peq2,
        p:[P('MODE',q.on?'PARAM':'OFF',v=>ed(pk,'on',()=>v>0?1:0)),P('NO.',String(s.pn+1),v=>s.pn=cl(s.pn+v,0,9)),P('TYPE',PTY[q.t],v=>ed(pk,'t',t=>cl(t+v,0,4)))]};}
    if(M==='FBD'){const fk=c=>s.fbd[c][s.fn],q=fk(C()),fb=s.fb,e=(k,f)=>{ed(fk,k,f);E().forEach(c=>{const x=fk(c);if(!x.m)x.m=1;else if(x.m>1)x.set=1;});},
        rs=c=>Object.assign(fk(c),DF.fbd(),{m:fk(c).m}),ra=c=>s.fbd[c]=Array.from({length:12},DF.fbd);
      if(Pg===1)return {a:LR(),A:aLR,b:'NEXT\nFILTER',B:l=>{if(l)E().forEach(rs);else s.fn=(s.fn+1)%12;},f:fbd1,
        p:[P('FREQ',fz(q.f),v=>e('f',f=>fs(f,v)),()=>s.fine^=1),P('GAIN',q.g+'dB',v=>e('g',g=>cl(g+v,-60,0)),()=>e('g',()=>0)),P('BW/OCT',FBW[q.bw],v=>e('bw',x=>cl(x+v,0,4)))]};
      if(Pg===2)return {a:LR(),A:aLR,b:'RESET\nFILTER',B:l=>E().forEach(l?ra:rs),f:fbd2,p:[P('MODE',FM[q.m],v=>ed(fk,'m',m=>cl(m+v,0,3))),P('NO.',String(s.fn+1),v=>s.fn=cl(s.fn+v,0,11)),N0]};
      return {a:'DETECT\n'+(fb.run?'RUN':'STOP'),A:()=>fb.run^=1,b:(fb.lock?'UNLOCK':'LOCK')+'\nFBD',B:()=>fb.lock^=1,f:fbd3,
        p:[P('SENS',fb.sens+'dB',v=>fb.sens=cl(fb.sens-v,-9,-3)),P('THRESH',fb.thr+'dB',v=>fb.thr=cl(fb.thr+v,-60,0)),P('MAX DEPTH',fb.max+'dB',v=>fb.max=cl(fb.max-6*v,-60,-18))]};}
    if(M==='DEQ'){const dk=c=>s.deq[c][s.dn],q=dk(C()),e=(k,f)=>ed(dk,k,f),TH=P('THRESHOLD',q.thr.toFixed(1)+'dB',v=>e('thr',t=>stp(t,v,.5,-60,0)));
      return {a:LR(),A:aLR,b:'DEQ NO\n#'+(s.dn+1),B:l=>{if(l)E().forEach(c=>Object.assign(dk(c),DF.deq([100,1000,5000][s.dn])));else s.dn=(s.dn+1)%3;},f:deqv,
        p:Pg===1?[P('M-GAIN',sg(q.mg)+'dB',v=>e('mg',g=>stp(g,v,.5,-15,15)),()=>e('mg',()=>0)),TH,P('RATIO','1:'+RT[q.r],v=>e('r',x=>cl(x+v,0,RT.length-1)))]
        :Pg===2?[P('ATTACK',ms(q.at),v=>e('at',x=>tm(x,v,0,200))),TH,P('RELEASE',ms(q.rl),v=>e('rl',x=>tm(x,v,20,4000)))]
        :[P('MODE',DM[q.m],v=>e('m',m=>cl(m+v,0,4))),P('FREQUENCY',fz(q.f),v=>e('f',f=>fs(f,v)),()=>s.fine^=1),P('BW/OCT',q.m?'--':BWS[q.bw],v=>e('bw',x=>cl(x+v,0,16)))]};}
    if(M==='WIDTH'){const w=s.wd;
      return {a:'',b:'RESET\nIMAGE',B:()=>Object.assign(w,{as:0,w:100,rot:0,bt:0,bf:700,sh:1}),f:Pg===1?wid1:wid2,
        p:Pg===1?[P('ASYMMETRY',w.as+'°',v=>w.as=cl(w.as+2*v,-90,90),()=>w.as=0),P('STEREOWIDTH',w.w+'%',v=>w.w=cl(w.w+2*v,0,200),()=>w.w=100),P('ROTATION',w.rot+'°',v=>w.rot=cl(w.rot+2*v,-90,90),()=>w.rot=0)]
        :[P('BASS TRIM',sg(w.bt)+'dB',v=>w.bt=stp(w.bt,v,.5,-3,3),()=>w.bt=0),P('FREQUENCY',fz(w.bf),v=>w.bf=Math.round(cl(w.bf*Math.pow(2,v/12),350,1400))),P('SHUFFLE',w.sh.toFixed(1),v=>w.sh=stp(w.sh,v,.1,1,3),()=>w.sh=1)]};}
    if(M==='DYN'){const y=s.dy;
      if(Pg===3)return {a:'',b:'DYN\nMENU',B:l=>{if(l){s.lim=0;s.lh=0;s.lr=100;}else s.page=1;},f:limv,ttl:'LIMITER',
        p:[P('HOLD',ms(s.lh),v=>s.lh=cl(s.lh+10*v,0,1000)),P('THRESH',s.lim.toFixed(1)+'dB',v=>s.lim=stp(s.lim,v,.5,-24,0)),P('RELEASE',ms(s.lr),v=>s.lr=tm(s.lr,v,20,4000))]};
      const o={a:'',f:dynv,ttl:y.m?'EXPANDER':'COMPRESSOR'};
      return Pg===1?{...o,b:'COMP./\nEXPA.',B:()=>y.m^=1,p:[P('GAIN',sg(y.g)+'dB',v=>y.g=stp(y.g,v,.5,-15,15),()=>y.g=0),P('THRESHOLD',y.thr.toFixed(1)+'dB',v=>y.thr=stp(y.thr,v,.5,-60,0)),P('RATIO','1:'+DR[y.r],v=>y.r=cl(y.r+v,0,DR.length-1))]}
        :{...o,b:'LIMIT\nMENU',B:()=>s.page=3,p:[P('ATTACK',ms(y.at),v=>y.at=tm(y.at,v,0,200)),y.m?P('KNEE','--'):P('KNEE',y.kn+'dB',v=>y.kn=cl(y.kn+v,0,30)),P('RELEASE',ms(y.rl),v=>y.rl=tm(y.rl,v,20,4000))]};}
    if(M==='I/O'){if(Pg===1)return {a:'',b:'',f:io1,p:[P('CLOCK',CLK[io.clk]+'k',v=>io.clk=cl(io.clk+v,0,3)),P('INPUT',INS[io.in],v=>io.in=cl(io.in+v,0,3)),P('NOISE GAIN',io.ng+'dB',v=>io.ng=cl(io.ng+v,-60,0))]};
      if(Pg===2)return {a:FMT[io.fmt],A:()=>io.fmt^=1,b:'DITHER\n'+DIT[io.dit],B:l=>{if(l){io.nsh^=1;fl('NOISE SHAPER '+(io.nsh?'ON':'OFF'));}else io.dit=(io.dit+1)%4;},f:io2,
        p:[P('IN GAIN',sg(io.ig)+'dB',v=>io.ig=stp(io.ig,v,.5,-12,12),()=>io.ig=0),P('AUX OUT',TAPS[io.tap],v=>io.tap=cl(io.tap+v,0,3)),P('OUT GAIN',sg(io.og)+'dB',v=>io.og=stp(io.og,v,.5,-12,12),()=>io.og=0)]};
      if(Pg===3)return {a:'MIC/\nLINE',A:()=>io.mic=io.mic?0:1,b:'+15V\n'+(io.mic===2?'ON':'OFF'),B:()=>{if(io.mic)io.mic=io.mic===2?1:2;else fl('+15 V phantom: select MIC first (A)');},f:io3,p:[N0,P('RTA INPUT',RIN[io.rin],v=>io.rin=cl(io.rin+v,0,3)),N0]};
      return {a:LR(),A:aLR,b:['MAIN','AUX'][io.dm]+'\nDELAY',B:()=>io.dm^=1,f:io4,
        p:[P('UNITS',DU[io.du],v=>io.du=cl(io.du+v,0,2)),P('DELAY '+SD(),dfm(io.dl[C()]),v=>{const x=stp(io.dl[C()],v,s.fine?.02:1,0,300);E().forEach(c=>io.dl[c]=x);},()=>s.fine^=1),
          P('TEMP',io.tf?Math.round(io.tmp*1.8+32)+'°F':io.tmp+'°C',v=>io.tmp=cl(io.tmp+v,-10,50),()=>io.tf^=1)]};}
    if(M==='UTILITY'){const L=Pg===1?UL():ML(),i=s.us=cl(s.us,0,L.length-1),sel=v=>s.us=cl(i+v,0,L.length-1),dmp=()=>fl('MIDI DUMP: nothing is connected to MIDI OUT');
      return {a:Pg===2?'DUMP\nEDIT':'',A:Pg===2?dmp:null,b:Pg===2?'DUMP\nALL':'',B:Pg===2?dmp:null,f:()=>util(L,i,Pg),p:[P('LINE',String(i+1),sel),P('VALUE',String(L[i][1]),L[i][2]),P('LINE',String(i+1),sel)]};}
    if(M==='MEMORY'){const mp=s.mp,pr=pre(mp),sel=v=>s.mp=cl(mp+v,0,64),prot=()=>{if(mp&&pr){pr.pr^=1;msave();}};
      if(Pg===1)return {a:'STORE\nPRESET',A:()=>stA(),b:'RECALL\nPRESET',B:()=>rcB(),f:mem1,p:[N0,P('PRESET',String(mp),sel),P('PROTECT',pr&&pr.pr?'ON':'OFF',prot,prot)]};
      return {a:'STORE\nMODULE',A:()=>stA(MODK[s.mmod]),b:'RECALL\nMODULE',B:()=>rcB(MODK[s.mmod]),f:mem2,p:[N0,P('PRESET',String(mp),sel),P('MODULE',MODK[s.mmod],v=>s.mmod=cl(s.mmod+v,0,MODK.length-1))]};}
    if(M==='RTA'){const o={f:rta,full:Pg===3,p:[P('MAX',s.rmax+'dB',v=>s.rmax=cl(s.rmax+v,-60,0),()=>s.rmax=0),P('LEV '+Math.round(rpk[s.rcur]),fz(rf(s.rcur)),v=>s.rcur=cl(s.rcur+v,0,60)),P('RANGE',RG[s.rrg]+'dB',v=>s.rrg=cl(s.rrg+v,0,3))]};
      if(Pg===2)return {...o,a:'RATE\n'+RATE[s.rrate],A:()=>s.rrate=(s.rrate+1)%4,b:'PEAK\n'+RPK[s.rpk],B:l=>{if(l)rpk.fill(-120);else s.rpk=(s.rpk+1)%5;}};
      return {...o,a:'SOURCE\n'+RS[io.rin],A:()=>io.rin=(io.rin+1)%4,b:'AUTO\nEQ',B:()=>{s.menu='AEQ';s.page=1;}};}
    if(M==='AEQ'){const q=s.aeq;return {a:(q.run?'STOP':'START')+'\nAUTO EQ',A:()=>q.run?aeqEnd('STOPPED'):aeqGo(),b:'DONE',B:()=>{if(q.run)aeqEnd('STOPPED');s.menu='RTA';s.page=1;},f:aeqv,
      p:[P('ROOM CORR',q.rc?'-1dB/OCT':'OFF',v=>q.rc=v>0?1:0),P('MAX SPAN','±'+q.span+'dB',v=>q.span=cl(q.span+v,3,15)),P('ΔMAX',q.dm.toFixed(1)+'dB',v=>q.dm=stp(q.dm,v,.5,.5,3))]};}
    if(M==='METER'&&Pg===1)return {a:'SOURCE\n'+s.msrc,A:()=>s.msrc=s.msrc==='INPUT'?'OUTPUT':'INPUT',b:'CLEAR\nPEAK',B:()=>s.pk=[[-120,-120],[-120,-120]],p:[N0,N0,N0],f:meter,ttl:'PEAK/RMS METER'};
    if(M==='BYPASS'){const tg=()=>tgm(MODS[s.bsel]),hb=v=>s.hb=v>0;
      return {a:'',b:'BYPASS\nMODULE',B:l=>{if(l)s.mb={};else tg();},f:byp,p:[P('BYPASS L',s.hb?'ON':'OFF',hb),P('MODULE',MODS[s.bsel],v=>s.bsel=(s.bsel+v+MODS.length)%MODS.length,tg),P('BYPASS R',s.hb?'ON':'OFF',hb)]};}
    return {a:'',b:'',p:[N0,N0,N0],f:ns};}
  const UL=()=>{const u=s.ut,io=s.io;return [['CONTRAST',u.ct,v=>u.ct=cl(u.ct+v,1,10)],['CHANNEL MODE',s.ed===2?'STEREO LINK':'DUAL MONO',()=>s.ed=s.ed===2?0:2],
    ['GEQ-MODE',u.gm?'UNCORRECTED':'TRUE RESPONSE',()=>u.gm^=1],['GAIN OFFSET (EQ)',sg(u.go)+'dB',v=>u.go=stp(u.go,v,.5,-15,15)],['RTA NOISE CORR.',u.nc?'ON':'OFF',()=>u.nc^=1],
    ['SHOW MESSAGEBOX',u.mb?'ON':'OFF',()=>u.mb^=1],['RTA/MIC INPUT',MIC[io.mic],v=>io.mic=cl(io.mic+v,0,2)],['RTA/MIC LINE-LEVEL',u.ll+'dBu',v=>u.ll=cl(u.ll+v,-14,22)],['RTA/MIC MIC-LEVEL',u.ml+'dBV/Pa',v=>u.ml=cl(u.ml+v,-42,-6)]];};
  const ML=()=>{const u=s.ut;return [['MIDI CHANNEL',u.mc,v=>u.mc=cl(u.mc+v,1,16)]].concat(['SEND CC','SEND PC','SEND SYSEX','RECEIVE CC','RECEIVE PC','RECEIVE SYSEX'].map((t,i)=>[t,u.mf[i]?'ON':'OFF',()=>u.mf[i]^=1]));};
  const dfm=v=>{const u=s.io.du;return u?(v*spd()/1000*(u===1?3.281:1)).toFixed(2)+(u===1?'ft':'m'):v.toFixed(2)+'ms';};
  /* ---------- MEMORY / COMPARE ---------- */
  const lets=o=>(o.g.some(a=>a.some(Boolean))?'G':'')+(o.peq.some(a=>a.some(p=>p.on))?'P':'')+(o.deq.some(a=>a.some(p=>p.mg))?'D':'')+(o.wd.w!==100||o.wd.as||o.wd.rot?'W':'')+(o.dy.thr<0||o.dy.g?'Y':'')+(o.io.dl.some(Boolean)||o.io.ig||o.io.og?'I':'');
  function load(js,k=SK){const o=JSON.parse(js);k.forEach(x=>{if(o[x]!==undefined)s[x]=o[x];});Object.assign(s.gp,{bw:1,m:0,v:0});apply();}
  function stA(mod){const p=pre(s.mp);if(!s.mp)fl('Preset 0 (INITIAL DATA) is read-only');else if(p&&p.pr)fl('Preset '+s.mp+' is protected (PROTECT ON)');
    else if(mod)p?s.dlg={k:'ow',mod}:store(0,mod);else s.dlg={k:'nm',nm:(p?p.n:'PRESET '+s.mp).toUpperCase().padEnd(16).slice(0,16),cur:0};}
  function rcB(mod){if(!pre(s.mp))fl('Preset '+s.mp+' is empty');else s.dlg={k:'rc',mod};}
  function store(nm,mod){const M=mem(),i=s.mp,o=M[i];let dd=snap();if(mod){const b=JSON.parse(o?o.d:dd);MKY[mod].forEach(k=>b[k]=s[k]);dd=JSON.stringify(b);}
    M[i]={n:(nm||(o&&o.n)||'PRESET '+i).trim(),d:dd,pr:o?o.pr:0,l:lets(JSON.parse(dd))};msave();if(!mod||s.mcur===i){s.mcur=i;s.ref=dd;}s.dlg=null;fl((mod?mod+' module':'Preset')+' stored in '+i+': '+M[i].n);}
  function recall(mod){const p=pre(s.mp);if(mod)load(p.d,MKY[mod]);else{load(p.d);s.mcur=s.mp;s.ref=p.d;}s.dlg=null;s.cmp=null;fl((mod?mod+' module':'Preset')+' recalled from '+s.mp+': '+p.n);}
  function dlgV(){const g=s.dlg,o={a:'CANCEL',A:()=>s.dlg=null,b:'OK',f:dlgD};
    if(g.k==='nm')return {...o,B:()=>{if(pre(s.mp))s.dlg={k:'ow',nm:g.nm};else store(g.nm);},
      p:[P('CURSOR',String(g.cur+1),v=>g.cur=cl(g.cur+v,0,15)),P('CHAR',`'${g.nm[g.cur]}'`,v=>{const i=(CH.indexOf(g.nm[g.cur])+v+CH.length)%CH.length;g.nm=g.nm.slice(0,g.cur)+CH[i]+g.nm.slice(g.cur+1);}),N0]};
    return {...o,B:()=>g.k==='ow'?store(g.nm,g.mod):recall(g.mod),p:[N0,N0,N0]};}
  function compare(){const M=s.menu;if(/RTA|METER|AEQ/.test(M)){fl('COMPARE is inactive in '+(M==='AEQ'?'RTA':M));return;}
    if(s.cmp){load(s.cmp.b,s.cmp.k);s.cmp=null;fl('COMPARE off: back to your edited setting');return;}
    const k=MKY[M]||SK,cur=snap(k),ref=JSON.parse(s.ref),st=JSON.stringify(Object.fromEntries(k.map(x=>[x,ref[x]])));
    if(cur===st){fl('COMPARE: no difference to the stored setting');return;}s.cmp={k,b:cur};load(st,k);fl('COMPARE: stored '+(MKY[M]?M+' module':'preset')+' of '+(s.mcur?'preset '+s.mcur:'INITIAL DATA'));}
  /* ---------- AUTO EQ: pink noise out, RTA on MAIN OUT, the GEQ moves toward the target curve ---------- */
  function aeqGo(){const q=s.aeq;if(s.mb.GEQ||s.hb){fl('AUTO EQ: GEQ bypassed or unit in BYPASS');return;}q.prev=[s.io.in,s.io.rin];s.io.in=3;s.io.rin=1;Object.assign(q,{run:1,it:0,st:''});rt.an=-8;rt.acc.fill(0);
    fl('AUTO EQ: pink noise to the outputs, RTA measuring MAIN OUT');}
  function aeqEnd(st){const q=s.aeq;if(q.run){[s.io.in,s.io.rin]=q.prev;q.run=0;s.g.forEach(a=>a.forEach((v,i)=>a[i]=Math.round(v*2)/2));}q.st=st;apply();}
  function aeqStep(){const q=s.aeq,a=rt.acc,L=FQ.map((f,j)=>10*Math.log10((a[Math.max(0,2*j-1)]+a[2*j]+a[Math.min(60,2*j+1)])/3+1e-30)+(q.rc?Math.log2(f/1000):0));
    const mid=L.slice(2,30),mean=mid.reduce((x,y)=>x+y,0)/mid.length;let mx=0;
    L.forEach((v,j)=>{const e=v-mean;if(j>1&&j<30)mx=Math.max(mx,Math.abs(e));s.g.forEach(g=>g[j]=cl(g[j]-cl(e*.5,-1.5,1.5),-q.span,q.span));});
    q.it++;if(mx<q.dm||q.it>=60)aeqEnd(mx<q.dm?'DONE':'DONE (60 STEPS)');else apply();}
  /* ---------- audio ---------- */
  function apply(){const n=d.n;if(!n||!A.ctx)return;const t=A.ctx.currentTime,T=(p,v)=>p.setTargetAtTime(v,t,.02),io=s.io,mb=s.mb,y=s.dy;
    const sb=(b,ty,f,g,Q)=>{if(b.type!==ty)b.type=ty;T(b.frequency,f);if(g!=null)T(b.gain,g);T(b.Q,ty==='lowpass'||ty==='highpass'?-3.01:Q);};
    T(n.nz.gain,io.in===3?A.db2g(io.ng):0);
    n.c.forEach((h,c)=>{const ge=geff(c),off=mb.DYN||y.m===1,r=Math.min(20,DR[y.r]);
      T(h.sm.gain,io.in===0?1:0);T(h.ig.gain,A.db2g(io.ig+s.ut.go));h.f.forEach((f,i)=>T(f.gain,mb.GEQ?0:ge[i]));
      h.p.forEach((b,i)=>{const p=s.peq[c][i],on=p.on&&!mb.PEQ;sb(b,on?PNT[p.t]:'peaking',p.f,on?p.g:0,bq(fr(BWS[p.bw])));});
      h.fb.forEach((b,i)=>{const p=s.fbd[c][i];sb(b,'peaking',p.f,fon(p)&&!mb.FBD?p.g:0,bq(fr(FBW[p.bw])));});
      s.deq[c].forEach((p,i)=>{const Q=bq(fr(BWS[p.bw]));sb(h.d[i],DNT[p.m],p.f,null,Q);sb(h.dd[i][0],DDT[p.m],p.f,null,Q);});
      T(h.cmp.threshold,off?0:y.thr);T(h.cmp.ratio,off?1:r);T(h.cmp.knee,off?0:y.kn);T(h.cmp.attack,y.at/1000);T(h.cmp.release,Math.min(1,y.rl/1000));
      T(h.ctr.gain,off?1:A.db2g(.6*y.thr*(1-1/r)));T(h.dg.gain,mb.DYN?1:A.db2g(y.g));if(!(y.m===1&&!mb.DYN))T(h.xg.gain,1);
      const th=mb.LIMIT?0:s.lim;T(h.lim.threshold,th);T(h.lim.release,Math.min(1,s.lr/1000));T(h.trim.gain,A.db2g(.57*th));
      T(h.dl.delayTime,io.dm?0:io.dl[c]/1000);T(h.og.gain,A.db2g(io.og));h.tg.forEach((g,k)=>T(g.gain,io.tap===k?1:0));
      T(h.wet.gain,s.hb?0:1);T(h.dry.gain,s.hb?1:0);T(h.out.gain,s.power?1:0);});
    const w=s.wd,W=n.w,bw=mb.WIDTH,a=bw?0:w.as/180,ww=bw?1:w.w/100,p=bw?0:w.rot/90,q=Math.max(0,-p),pp=Math.max(0,p);
    T(W.ml.gain,1-a);T(W.mr.gain,1+a);T(W.sl.gain,ww);T(W.sr.gain,-ww);T(W.shM.gain,bw?0:w.bt);T(W.shS.gain,bw?0:A.g2db(w.sh));T(W.shM.frequency,w.bf);T(W.shS.frequency,w.bf);
    [[1-pp,q],[pp,1-q]].forEach((r,o)=>r.forEach((v,j)=>T(W.ro[o][j].gain,v)));
    T(n.rIn.gain,io.rin===0?1:0);T(n.rOut.gain,io.rin===1?1:0);T(n.rAux.gain,io.rin===2?1:0);n.rta.smoothingTimeConstant=RSM[s.rrate];}
  function lv(an){const b=an._b||(an._b=new Float32Array(an.fftSize));an.getFloatTimeDomainData(b);let m=0,q=0;for(const v of b){const a=Math.abs(v);if(a>m)m=a;q+=v*v;}
    return [A.g2db(m),A.g2db(Math.sqrt(q/b.length))];}
  function bands(){if(!d.n)return Array(61).fill(-120);const an=d.n.rta;if(!bins){const hz=A.ctx.sampleRate/an.fftSize;fbuf=new Float32Array(an.frequencyBinCount);
      bins=Array.from({length:61},(_,i)=>{const f=rf(i);let lo=Math.round(f*Math.pow(2,-1/12)/hz),hi=Math.round(f*Math.pow(2,1/12)/hz);if(hi<lo)hi=lo;lo=cl(lo,1,fbuf.length-1);hi=cl(hi,1,fbuf.length-1);return [lo,hi,f*.1157/((hi-lo+1)*hz)];});}
    an.getFloatFrequencyData(fbuf);return bins.map(([lo,hi,k])=>{let p=0;for(let j=lo;j<=hi;j++)p+=Math.pow(10,fbuf[j]/10);return 10*Math.log10(p*k+1e-12);});}
  /* timer (30 ms): DEQ side-chains, expander, FBD detection, AUTO EQ */
  function tick(){const n=d.n;if(!n||!s.power)return;const t=A.ctx.currentTime,k=v=>1-Math.exp(-30/Math.max(.1,v)),y=s.dy;rt.tc++;
    n.c.forEach((h,c)=>s.deq[c].forEach((b,i)=>{const L=lv(h.dd[i][1])[1],e=rt.de[c][i],nv=e+(L-e)*k(L>e?b.at:b.rl);rt.de[c][i]=nv;let g=0;
      if(b.mg&&!s.mb.DEQ&&nv>b.thr)g=Math.sign(b.mg)*Math.min(Math.abs(b.mg),(nv-b.thr)*(1-1/RT[b.r]));if(g!==rt.dg[c][i]){rt.dg[c][i]=g;h.d[i].gain.setTargetAtTime(g,t,.005);}}));
    rt.dl=n.c.map(h=>lv(h.xa)[1]);
    if(y.m===1&&!s.mb.DYN){const L=Math.max(...rt.dl),e=rt.xe;rt.xe=e+(L-e)*k(L>e?y.at:y.rl);rt.xg=rt.xe<y.thr?Math.max(-60,-(y.thr-rt.xe)*(DR[y.r]-1)):0;n.c.forEach(h=>h.xg.gain.setTargetAtTime(A.db2g(rt.xg),t,.005));}else rt.xg=0;
    if(rt.tc%2===0&&s.fb.run&&!s.mb.FBD)[0,1].forEach(c=>{if(s.fbd[c].some(f=>f.m>1))fbScan(c);});
    if(s.aeq.run){bands().forEach((v,i)=>rt.acc[i]+=Math.pow(10,v/10));if(++rt.an>=14)aeqStep();if(rt.an>=14||rt.an<=0){rt.acc.fill(0);if(rt.an>=14)rt.an=0;}}}
  function fbScan(c){const a=d.n.c[c].fa,N=a.frequencyBinCount,b=rt.fbuf||(rt.fbuf=new Float32Array(N)),hz=A.ctx.sampleRate/a.fftSize,st=rt.fs[c];a.getFloatFrequencyData(b);
    let k=0,m=-300;for(let j=Math.ceil(60/hz),j1=Math.min(N-42,16000/hz);j<j1;j++)if(b[j]>m){m=b[j];k=j;}
    let sum=0,cnt=0;for(let j=Math.max(1,k-40);j<=k+40;j++)if(Math.abs(j-k)>5){sum+=b[j];cnt++;}
    if(m<s.fb.thr||m-sum/cnt<36+2*s.fb.sens){st.n=0;return;}if(Math.abs(k-st.k)<=1)st.n++;else{st.k=k;st.n=1;}if(st.n<10)return;st.n=0;
    const y1=b[k-1],y2=b[k],y3=b[k+1],f=(k+.5*(y1-y3)/((y1-2*y2+y3)||1))*hz,L=s.fbd[c],fb=s.fb;
    let x=L.find(p=>fon(p)&&Math.abs(Math.log2(p.f/f))<1/12),nw;
    if(x){if(x.m<2||(fb.lock&&x.m===2)||x.g<=fb.max)return;nw={f,g:Math.max(fb.max,x.g-6),ts:now()};}
    else{x=L.find(p=>p.m===2&&!p.set&&!fb.lock)||L.find(p=>p.m===3&&!p.set);if(!x){const au=L.filter(p=>p.m===3);if(!au.length){fl('FBD: feedback at '+fz(f)+' but no free SNGL / AUTO filter');return;}x=au.reduce((p,q)=>p.ts<q.ts?p:q);}
      let bw=4;while(bw>0&&f*fr(FBW[bw])*.693<2*hz)bw--;nw={f,g:-6,bw,set:1,ts:now()};}
    const i=L.indexOf(x);(s.ed===2?[0,1]:[c]).forEach(cc=>Object.assign(s.fbd[cc][i],nw,{m:s.fbd[cc][i].m||x.m}));apply();fl('FBD: feedback at '+fz(f)+' → filter '+(i+1)+' '+FM[x.m]+' '+s.fbd[c][i].g+' dB');}
  /* ---------- controls ---------- */
  const IX={e1:0,wh:1,e2:2},fixPage=()=>{if(s.menu==='PEQ'&&s.page===1&&!s.peq[C()].some(p=>p.on))s.page=2;};
  function turn(k,v){const p=view().p[IX[k]];if(p&&p.t){p.t(v);apply();fixPage();}}
  function push(k){const p=view().p[IX[k]];if(p&&p.p){p.p();apply();}}
  function key(b,long){const M=s.menu,Pg=s.page;
    if(PG[b]){if(long){if(['GEQ','PEQ','DEQ','WIDTH','DYN','FBD'].includes(b)){tgm(b);fl(b+(s.mb[b]?' bypassed':' active again'));}
        else if(b==='BYPASS'){s.hb=!s.hb;fl(s.hb?'BYPASS: both channels bypassed (relay)':'BYPASS off');}else if(b==='UTILITY'){s.lock=true;A.flash('PANEL LOCKED — hold UTILITY 1 s to unlock');}apply();return;}
      s.dlg=null;if(M===b)s.page=Pg%PG[b]+1;else{s.menu=b;s.page=1;}fixPage();return;}
    if(b==='page'){s.dlg=null;s.page=Pg%PG[M]+1;fixPage();return;}
    if(b==='compare'){compare();return;}
    if(s.cmp){fl('COMPARE is on: press COMPARE again to edit');return;}
    const h=view()[b==='A'?'A':'B'];if(h){h(long);apply();fixPage();}else fl(b+': no function on this page');}
  const K={e1:enc('UPPER ENCODER',0),wh:enc('DATA WHEEL',1),e2:enc('LOWER ENCODER',2)};
  /* ---------- LCD (canvas 320×80, dark on orange) ---------- */
  const BG='#ff9b26';let x,INK='#3a1400';
  const T=(t,px,py,al='left',sz=8)=>{x.font=`bold ${sz}px monospace`;x.textAlign=al;x.fillText(t,px,py);};
  const box=(bx,by,w,h,t,inv)=>{x.fillStyle=INK;if(inv)x.fillRect(bx,by,w,h);else x.strokeRect(bx+.5,by+.5,w-1,h-1);x.fillStyle=inv?BG:INK;const L=t.split('\n');L.forEach((l,i)=>T(l,bx+w/2,by+(h-L.length*8)/2+7+i*8,'center'));x.fillStyle=INK;};
  const fX=f=>50+Math.log2(f/20)/Math.log2(1000)*218,dots=y=>{for(let i=50;i<268;i+=4)x.fillRect(i,y,1,1);},vdot=px=>{for(let y=10;y<70;y+=3)x.fillRect(px,y,1,1);};
  const axis=()=>{x.fillRect(50,70,218,1);[[20,'20'],[100,'100'],[1000,'1K'],[10000,'10K'],[20000,'20K']].forEach(([f,t],i)=>T(t,fX(f),79,i?i===4?'right':'center':'left',7));};
  function curve(fn,cy,k,dot){let py=null;for(let i=0;i<=218;i++){const y=Math.round(cl(cy-fn(20*Math.pow(1000,i/218))*k,10,69));if(dot){if(i%3===0)x.fillRect(50+i,y,1,1);continue;}
    x.fillRect(50+i,py==null?y:Math.min(py,y),1,py==null?1:Math.abs(py-y)+1);py=y;}}
  function table(hd,rows,sel,cols){hd.forEach((t,j)=>T(t,cols[j],8,'left',7));x.fillRect(50,10,218,1);const st=cl(sel-3,0,Math.max(0,rows.length-7));
    for(let r=0;r<7&&st+r<rows.length;r++){const i=st+r,y=19+r*9;if(i===sel){x.fillRect(50,y-7,218,9);x.fillStyle=BG;}rows[i].forEach((t,j)=>T(String(t),cols[j],y,'left',7));x.fillStyle=INK;}}
  function lst(t,it,sel,info){T(t,159,8,'center',7);it.forEach((v,i)=>{const y=21+i*11;if(i===sel){x.fillRect(84,y-8,150,10);x.fillStyle=BG;}T(v,159,y,'center');x.fillStyle=INK;});if(info)T(info,159,77,'center',7);}
  function vbar(px,lab,v,lo,hi,mode){x.strokeRect(px+.5,12.5,9,52);const f=cl((v-lo)/(hi-lo),0,1),z=mode===1?.5:mode===2?1:0,a=12+52*(1-Math.max(f,z)),b=12+52*(1-Math.min(f,z));x.fillRect(px+2,a,6,Math.max(1,b-a));T(lab,px+5,72,'center',6);}
  function xfer(fn,lvl){x.strokeRect(56.5,10.5,61,61);for(let i=0;i<60;i+=3)x.fillRect(57+i,70-i,1,1);let py=null;
    for(let i=0;i<=60;i++){const y=Math.round(cl(70-(fn(i-60)+60),11,70));x.fillRect(57+i,py==null?y:Math.min(py,y),1,py==null?1:Math.abs(py-y)+1);py=y;}
    if(lvl>-60)x.fillRect(56+cl(lvl+60,0,60),cl(70-(fn(lvl)+60),11,70)-1,3,3);T('IN',87,79,'center',6);}
  function geq(){const gx=50,w=218/31,ge=geff(C()),p=s.gp;T('GRAPHIC EQ '+SD()+(pend()?'  BW '+(p.m?['','LOW','HIGH'][p.m]+' SHELF':p.bw+'/3'):'')+(s.mb.GEQ?'  (BYPASSED)':''),159,8,'center',7);x.fillRect(gx,40,218,1);
    for(const db of [15,-15]){for(let i=gx;i<268;i+=4)x.fillRect(i,40-db*2,1,1);}
    ge.forEach((v,i)=>{const bx=gx+i*w;if(i===s.band){x.fillRect(bx,9,w,62);x.fillStyle=BG;}const h=v*2;x.fillRect(bx+1,h>0?40-h:40,w-2,Math.max(1,Math.abs(h)));x.fillStyle=INK;});
    [[0,'20'],[6,'80'],[12,'315'],[18,'1K25'],[24,'5K'],[30,'20K']].forEach(([i,t])=>T(t,gx+i*w+w/2,79,'center',7));}
  function peq1(){const L=s.peq[C()],q=L[s.pn],rs=L.filter(p=>p.on).map(p=>rbj(PNT[p.t],p.f,p.g,bq(fr(BWS[p.bw]))));
    T(`PEQ NO #${s.pn+1} ${q.on?PTY[q.t]:'OFF'}  ${SD()}${s.fine?'  FINE':''}`+(s.mb.PEQ?' (BYPASSED)':''),159,8,'center',7);dots(16);dots(64);dots(40);
    curve(f=>rs.reduce((a,r)=>a+r(f),0),40,1.6);vdot(Math.round(fX(q.f)));axis();}
  function peq2(){table(['NO','MODE','TYPE','FREQ','BW','GAIN  '+SD()],s.peq[C()].map((p,i)=>[i+1,p.on?'PARAM':'OFF',PTY[p.t],fq(p.f),p.t>2?'--':BWS[p.bw],p.t>2?'--':sg(p.g)]),s.pn,[52,66,96,132,166,200]);}
  function fbd1(){const L=s.fbd[C()],q=L[s.fn];T(`FBD NO #${s.fn+1} ${FM[q.m]}  ${SD()}`+(s.mb.FBD?' (BYPASSED)':''),159,8,'center',7);x.fillRect(50,16,218,1);dots(16+.85*30);
    L.forEach((p,i)=>{if(!fon(p))return;const px=Math.round(fX(p.f)),h=Math.max(1,-p.g*.85);x.fillRect(px-(i===s.fn?1:0),17,i===s.fn?3:1,h);T(String(i+1),px,Math.min(69,24+h),'center',6);});
    if(!fon(q))vdot(Math.round(fX(q.f)));T('0',48,18,'right',6);T('-60',48,68,'right',6);axis();}
  function fbd2(){table(['NO','MODE','FREQ','BW','GAIN  '+SD()],s.fbd[C()].map((p,i)=>[i+1,FM[p.m],fon(p)?fq(p.f):'---',FBW[p.bw],fon(p)?p.g:'---']),s.fn,[52,68,100,140,180]);}
  function fbd3(){const fb=s.fb,L=s.fbd[C()],u=m=>L.filter(p=>p.m===m),us=m=>u(m).filter(p=>p.set).length+'/'+u(m).length;T('FEEDBACK DESTROYER  '+SD(),159,10,'center',7);
    T('DETECTION '+(fb.run?'RUNNING':'STOPPED')+(fb.lock?'  ·  SNGL LOCKED':''),159,26,'center');T(`SNGL ${us(2)}   AUTO ${us(3)}   PARAM ${u(1).length}`,159,42,'center',7);
    T(`SENS ${fb.sens}dB  THRESH ${fb.thr}dB  MAX DEPTH ${fb.max}dB`,159,56,'center',7);T('filters to SNGL / AUTO on page 2',159,72,'center',6);}
  const dga=(q,i)=>i>q.thr?Math.sign(q.mg)*Math.min(Math.abs(q.mg),(i-q.thr)*(1-1/RT[q.r])):0;
  function deqv(){const c=C(),q=s.deq[c][s.dn],lvl=rt.de[c][s.dn],gn=rt.dg[c][s.dn];
    if(s.page===3){T(`DEQ NO #${s.dn+1} ${DM[q.m]} ${SD()}  LEVEL ${Math.max(-99,lvl).toFixed(0)}dB`+(s.mb.DEQ?' (BYP)':''),159,8,'center',7);dots(40);
      const Q=bq(fr(BWS[q.bw]));curve(rbj(DNT[q.m],q.f,q.mg,Q),40,1.6,1);curve(rbj(DNT[q.m],q.f,gn,Q),40,1.6);vdot(Math.round(fX(q.f)));axis();return;}
    xfer(i=>i+dga(q,i),lvl);T(`DEQ NO #${s.dn+1}  ${SD()}`+(s.mb.DEQ?' BYP':''),172,16,'center',7);T(DM[q.m]+' '+fz(q.f)+(q.m?'':' '+BWS[q.bw]),172,28,'center',7);
    T('THR '+q.thr.toFixed(1)+' 1:'+RT[q.r],172,40,'center',7);T('M-GAIN '+sg(q.mg),172,52,'center',7);T('A '+ms(q.at)+' R '+ms(q.rl),172,64,'center',7);
    vbar(232,'LEV',lvl,-60,0);vbar(250,'GAIN',gn,-15,15,1);}
  function dynv(){const y=s.dy,r=DR[y.r],gr=d.n?Math.min(...d.n.c.map(h=>h.cmp.reduction)):0,fn=y.m?i=>i<y.thr?Math.max(-120,y.thr-(y.thr-i)*r):i:i=>i>y.thr?y.thr+(i-y.thr)/r:i;
    xfer(i=>fn(i)+y.g,Math.max(...rt.dl));T('THR '+y.thr.toFixed(1)+' 1:'+r,170,22,'center',7);T('GAIN '+sg(y.g)+(y.m?'':' KNEE '+y.kn),170,34,'center',7);
    T('ATT '+ms(y.at)+' REL '+ms(y.rl),170,46,'center',7);if(s.mb.DYN)T('(BYPASSED)',170,60,'center',7);
    vbar(220,'L',rt.dl[0],-60,0);vbar(235,'R',rt.dl[1],-60,0);vbar(252,'GAIN',y.m?rt.xg:gr,-30,0,2);}
  function wid1(){const w=s.wd,cx=159+w.rot/90*50,hw=Math.min(100,50*w.w/100);T('STEREO IMAGE  (STEREO LINK)'+(s.mb.WIDTH?' BYPASSED':''),159,8,'center',7);
    [[109,16],[209,16]].forEach(([px,py])=>{x.fillRect(px-3,py-3,7,7);for(let i=0;i<20;i++)x.fillRect(Math.round(159+(px-159)*i/20),Math.round(72+(py-72)*i/20),1,1);});
    x.fillRect(Math.round(cx-hw),28,Math.max(2,Math.round(2*hw)),3);x.fillRect(Math.round(cx+w.as/90*hw),23,1,13);T('L',101,19,'right',7);T('R',217,19,'left',7);x.fillRect(156,70,7,4);
    T('WIDTH '+w.w+'%  ASYM '+w.as+'°  ROT '+w.rot+'°',159,50,'center',7);}
  function wid2(){const w=s.wd;T('BASS TRIM (MID) ——   SHUFFLE (SIDE) ···',159,8,'center',7);dots(40);curve(rbj('lowshelf',w.bf,w.bt,1),40,3);curve(rbj('lowshelf',w.bf,A.g2db(w.sh),1),40,3,1);vdot(Math.round(fX(w.bf)));axis();}
  const io1=()=>{const io=s.io;lst('SELECT INPUT',INS,io.in,io.in===1||io.in===2?'UNLOCKED — no digital source: muted':'CLOCK '+CLK[io.clk]+' kHz'+(io.in===3?'   NOISE '+io.ng+' dB':''));};
  const io2=()=>{const io=s.io;lst('SELECT AUX/DIG. OUT',TAPS,io.tap,`${FMT[io.fmt]}  DITHER ${DIT[io.dit]}  SHAPER ${io.nsh?'ON':'OFF'}`);};
  const io3=()=>lst('SELECT RTA INPUT',RIN,s.io.rin,'RTA/MIC: '+MIC[s.io.mic]+(s.io.rin===3?'  (nothing connected)':''));
  function io4(){const io=s.io;T('DIGITAL DELAY  ('+['MAIN','AUX'][io.dm]+' OUT)',159,8,'center',7);
    ['LEFT','RIGHT'].forEach((t,c)=>{const y=30+c*18;if(E().includes(c)){x.fillRect(64,y-9,190,12);x.fillStyle=BG;}T(t,70,y);T(dfm(io.dl[c]),248,y,'right');x.fillStyle=INK;});
    T('SOUND '+spd().toFixed(1)+' m/s   STEP '+(s.fine?'0.02':'1')+' ms (push wheel)',159,74,'center',7);}
  const util=(L,i,Pg)=>table([Pg===1?'GENERAL SETUP':'MIDI SETUP','','V 1.4'],L.map(l=>[l[0],String(l[1])]),i,[52,158,246]);
  function mem1(){table(['NO.','TITLE','MOD'],Array.from({length:65},(_,i)=>{const p=pre(i);return [i,p?p.n+(p.pr&&i?' *':''):'- empty -',p?(i?p.l:'READONLY'):''];}),s.mp,[52,70,224]);}
  function mem2(){const p=pre(s.mp);T('STORE / RECALL MODULE',159,8,'center',7);T(MODK[s.mmod],159,34,'center',12);T('PRESET '+s.mp+': '+(p?p.n:'- empty -'),159,56,'center',7);}
  function dlgD(){const g=s.dlg,p=pre(s.mp);x.strokeRect(54.5,12.5,209,55);
    if(g.k==='nm'){T('STORE PRESET '+s.mp+' — NAME',159,24,'center',7);x.font='bold 8px monospace';const cw=x.measureText('M').width,x0=159-8*cw;x.textAlign='left';x.fillText(g.nm,x0,44);x.fillRect(x0+g.cur*cw,46,cw,1.5);}
    else{T(g.k==='ow'?'OVERWRITE DATA?':'RECALL '+(g.mod?g.mod+' MODULE':'ALL DATA')+'?',159,30,'center');T('PRESET '+s.mp+': '+(p?p.n:''),159,46,'center',7);}T('B = OK    A = CANCEL',159,62,'center',7);}
  function rta(full,ttl){const gx=full?2:50,gw=full?316:218,w=gw/61,db=bands(),lo=s.rmax-RG[s.rrg];
    T(ttl||'RTA '+RS[s.io.rin],gx+gw/2,8,'center',7);
    db.forEach((v,i)=>{rpk[i]=s.rpk===4?-120:Math.max(v,rpk[i]-RPD[s.rpk]);const h=cl((v-lo)/RG[s.rrg],0,1)*58,ph=cl((rpk[i]-lo)/RG[s.rrg],0,1)*58;x.fillRect(gx+i*w,70-h,Math.max(1,w-1),h);if(s.rpk<4)x.fillRect(gx+i*w,69-ph,Math.max(1,w-1),1);});
    if(!full&&!ttl){const cx=gx+s.rcur*w+w/2;for(let y=10;y<70;y+=3)x.fillRect(cx,y,1,1);}
    x.fillRect(gx,70,gw,1);[[0,'20'],[12,'80'],[24,'315'],[36,'1K25'],[48,'5K'],[60,'20K']].forEach(([i,t])=>T(t,gx+i*w+w/2,79,'center',7));}
  function aeqv(){const q=s.aeq,w=218/61;rta(false,'AUTO EQ  '+(q.run?'RUNNING  STEP '+q.it:q.st||'READY'));x.fillStyle=BG;
    s.g[0].forEach((g,j)=>{x.fillRect(50+2*j*w+w/2-2,Math.round(40-g*1.5)-2,5,5);});x.fillStyle=INK;s.g[0].forEach((g,j)=>x.fillRect(50+2*j*w+w/2-1,Math.round(40-g*1.5)-1,3,3));}
  function meter(){const m=d.n&&s.power?(s.msrc==='INPUT'?d.n.c.map(h=>h.anI):d.n.c.map(h=>h.anO)).map(lv):[[-120,-120],[-120,-120]],px=v=>50+cl((v+80)/80,0,1)*200;
    [0,1].forEach(c=>{const y=c?46:14,[p,r]=m[c];s.pk[c][0]=Math.max(s.pk[c][0],p);s.pk[c][1]=Math.max(s.pk[c][1],r);
      T(c?'RIGHT':'LEFT',50,c?78:9,'left',7);x.strokeRect(50.5,y+.5,200,14);x.fillRect(50,y+2,px(p)-50,3);x.fillRect(50,y+9,px(p)-50,3);x.fillRect(50,y+5,px(r)-50,4);x.fillRect(px(s.pk[c][0]),y,1,15);
      T(s.pk[c][0]>-.1?'CLIP':s.pk[c][0]<-99?'---':s.pk[c][0].toFixed(1),300,y+11,'center');});
    T('PEAK',300,9,'center');[-80,-60,-40,-20,0].forEach(v=>T(v?String(v):'00',px(v),40,'center',7));}
  function limv(){const gr=d.n?Math.min(...d.n.c.map(h=>h.lim.reduction)):0;T('PEAK LIMITER — always active',159,19,'center',7);
    x.strokeRect(60.5,25.5,200,12);x.fillRect(260-(-s.lim/24)*200,23,2,17);T('THRESHOLD '+s.lim.toFixed(1)+' dBFS',159,50,'center',7);
    x.strokeRect(60.5,58.5,200,8);x.fillRect(61,59,cl(-gr/24,0,1)*200,7);T('GAIN REDUCTION '+(-gr).toFixed(1)+' dB',159,76,'center',7);}
  function byp(){MODS.forEach((m,i)=>{const bx=52+i*36;if(i===s.bsel)box(bx,12,34,11,m,true);else T(m,bx+17,21,'center',7);
      ['LEFT','RIGHT'].forEach((_,c)=>T(s.hb||s.mb[m]?'BYP':'ON',bx+17,38+c*14,'center',7));});
    T('L',48,38,'right',7);T('R',48,52,'right',7);if(s.hb)T('RELAY BYPASS: BOTH CHANNELS',159,72,'center',7);}
  function ns(){T(s.menu+' — PAGE '+s.page,159,34,'center');T('not simulated',159,48,'center');}
  function lcd(){const cv=document.querySelector('canvas[data-d="deq"][data-tx="lcd"]');if(!cv)return;x=cv.getContext('2d');
    if(!s.power){x.fillStyle='#160d07';x.fillRect(0,0,320,80);return;}INK=`rgba(58,20,0,${.4+s.ut.ct*.06})`;x.fillStyle=BG;x.fillRect(0,0,320,80);x.fillStyle=INK;x.strokeStyle=INK;x.lineWidth=1;
    if(now()<s.boot){T('behringer',160,22,'center',10);T('ULTRACURVE PRO DEQ2496',160,42,'center');T('V 1.4',160,60,'center');return;}
    const v=view();if(v.full){v.f(true);box(0,0,30,11,s.menu,true);}
    else{box(0,0,40,13,s.menu,true);box(40,0,8,13,String(s.page),false);if(v.a)box(0,27,46,20,v.a);if(v.b)box(0,56,46,20,v.b);
      x.fillRect(270,0,1,80);v.p.forEach((p,i)=>{if(!p.n)return;const y=2+i*27;T(p.n,295,y+8,'center',7);T(String(p.v).slice(0,10),295,y+18,'center');});
      if(v.ttl)box(110,0,100,10,v.ttl,true);v.f(false);}
    [s.hb&&'BYPASS',s.lock&&'LOCKED',s.cmp&&'COMPARE'].filter(Boolean).forEach((t,i)=>box(255-i*50,0,46,11,t,true));}
  /* ---------- panel ---------- */
  const ears=h=>[[.015,.12],[.015,.85],[.982,.12],[.982,.85]].map(([px,py])=>`<rect x="${X(px)-7}" y="${h*py-4}" width="14" height="8" rx="4" class="ar-hole2"/>`).join('');
  const bt=(b,lab,px,py,tip,led,w=36)=>{const cy=py*100+4;let g=A.btn(d,b,X(px),cy,w,15,tip);if(led)g=g.replace(/<\/g>$/,A.rled(d,'k'+b,X(px)-12,cy,7,3,led)+'</g>');return A.txt(X(px),cy-11,lab,'ar-t4w')+g;};
  const W=`style="fill:none;stroke:#ddd;stroke-width:1.3"`;
  const lb=(x0,x1,t)=>`<rect x="${X(x0)}" y="84" width="${X(x1-x0)}" height="11" rx="2" style="fill:none;stroke:#ccc"/>`+A.txt(X((x0+x1)/2),92.5,t,'ar-t4');
  const MK=[['GEQ',.771,.18],['PEQ',.808,.18],['DEQ',.847,.18],['WIDTH',.766,.49],['FBD',.803,.49],['DYN',.8415,.49],['UTILITY',.761,.80],['I/O',.798,.80],['BYPASS',.8365,.80]];
  const MTIP={GEQ:'31-band graphic EQ',PEQ:'10-band parametric EQ',DEQ:'3-band dynamic EQ',WIDTH:'stereo width / image',FBD:'Feedback Destroyer (12 notch filters)',DYN:'compressor / expander + LIMITER',UTILITY:'setup, contrast, MIDI','I/O':'input select, pink noise, gains, delay',BYPASS:'bypass'};
  return {name:'Behringer DEQ2496',sub:'Ultracurve Pro · EQ / analyser on the control-room monitors (assumed)',ru:1,knobs:K,
    front(){let o=`<rect x="0" y="0" width="${A.W}" height="${H}" rx="3" class="ar-silver"/>`+ears(H);
      [[.062,.197],[.199,.728],[.732,.874]].forEach(([a,b])=>o+=`<rect x="${X(a)}" y="3" width="${X(b-a)}" height="93" rx="8" class="ar-black"/>`);
      o+=A.txt(X(.004),31,'ULTRA-CURVE','ar-t5d','start')+A.txt(X(.004),39,'PRO','ar-t5d','start')+A.txt(X(.004),46,'MODEL DEQ2496','ar-t4d','start')+`<rect x="${X(.004)}" y="51" width="17" height="19" rx="2" style="fill:#222"/>`+A.txt(X(.004)+8.5,59,'24','ar-t4w')+A.txt(X(.004)+8.5,67,'96','ar-t4w');
      ['ULTRA-HIGH','PRECISION','MASTERING','PROCESSOR'].forEach((t,i)=>o+=A.txt(X(.022),56+i*5,t,'ar-t4d','start'));
      o+=`<rect x="${X(.085)}" y="7" width="${X(.038)}" height="55" rx="2" style="fill:#151515"/>`;
      ['CLIP','-3','-6','-12','-18','-24','-40'].forEach((t,i)=>{const y=[13,20,27.5,35,42.5,49.5,56.5][i];o+=A.txt(X(.105),y+2,t,'ar-t4w')+[0,1].map(c=>A.rled(d,'m'+c+(6-i),X(c?.116:.0915),y,9,4,i?'g':'r')).join('');});
      o+=bt('RTA','RTA',.170,.18,'RTA: real-time analyser, 61 bands (A = source, B = AUTO EQ)')+bt('compare','COMPARE',.164,.49,'COMPARE: edited vs stored setting (module or whole preset)','a')
        +bt('METER','METER',.096,.80,'METER: peak / RMS meter (page 1 simulated)')+bt('MEMORY','MEMORY',.159,.80,'MEMORY: 64 presets (store / recall / name). LED = settings differ from the stored preset','a');
      o+=bt('page','PAGE',.233,.18,'PAGE: next page of the current menu',0,40)+bt('A','A',.228,.49,'A: function shown at the left of the LCD',0,40)+bt('B','B',.222,.80,'B: function shown at the left of the LCD (hold = reset all)',0,40);
      o+=`<path d="M${X(.255)} 22 h6 q3 0 4 4 q1 4 4 4 h5" ${W}/><path d="M${X(.255)} 53 h${X(.018)}" ${W}/><path d="M${X(.253)} 84 h6 q3 0 4 -4 q1 -4 4 -4 h5" ${W}/>`;
      o+=`<rect x="${X(.270)}" y="8" width="${X(.278)}" height="84" rx="6" style="fill:#050505"/><foreignObject x="${X(.300)}" y="19" width="${X(.216)}" height="62" data-tip="LCD 320 × 80, orange backlight. Upper encoder / wheel / lower encoder = the 3 values on the right; A / B = the boxes on the left"><canvas xmlns="http://www.w3.org/1999/xhtml" width="320" height="80" data-d="deq" data-tx="lcd" style="width:100%;height:100%;display:block;border-radius:3px;image-rendering:pixelated"></canvas></foreignObject>`;
      o+=`<path d="M${X(.549)} 28 h${X(.021)} M${X(.545)} 49 h${X(.09)} M${X(.541)} 70 h${X(.022)}" ${W}/>`;
      const PT='Turn = edit the value at the right of the LCD · Shift+click = PUSH';
      o+=A.knob(d,'e1',X(.590),27,15,'Upper encoder. '+PT)+A.knob(d,'e2',X(.5835),72,15,'Lower encoder. '+PT)+A.knob(d,'wh',X(.674),50,34,'DATA WHEEL (middle value). '+PT);
      [[.617,21],[.610,66],[.713,72]].forEach(([px,y])=>o+=A.txt(X(px),y,'PUSH','ar-t4w')+`<circle cx="${X(px)}" cy="${y+5}" r="2.2" ${W}/>`+A.txt(X(px),y+14,'TURN','ar-t4w'));
      o+=`<rect x="${X(.699)}" y="5" width="${X(.032)}" height="11" rx="2" style="fill:#eee"/>`+A.txt(X(.715),13.5,'24|96','ar-t5d');
      MK.forEach(([b,px,py])=>o+=bt(b,b,px,py,b+': '+MTIP[b]+'. Press = menu / next page · hold 1 s = '+(b==='BYPASS'?'bypass both channels':b==='UTILITY'?'panel lock / unlock':b==='I/O'?'—':'bypass the module'),b==='I/O'?'g':'a'));
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
    release(b){if(b==='power'||b==='max'||!s.power||now()<s.boot)return;const long=now()-t0>900;
      if(s.lock){if(b==='UTILITY'&&long){s.lock=false;A.flash('PANEL UNLOCKED');}else A.flash('PANEL LOCKED — hold UTILITY 1 s to unlock');return;}key(b,long);},
    change(k){const v=s[k],dl=v-(pv[k]||0);pv[k]=v;if(!dl){apply();return;}if(!s.power||now()<s.boot)return;
      if(s.lock){A.flash('PANEL LOCKED — hold UTILITY 1 s to unlock');return;}if(s.cmp){fl('COMPARE is on: press COMPARE again to edit');return;}
      if(Math.abs(dl)>1&&v===0)push(k);else turn(k,Math.sign(dl));},
    audio(c){const g=v=>{const n=c.createGain();n.gain.value=v;return n;},an=f=>{const a=c.createAnalyser();a.fftSize=f;return a;},nA=(k,f)=>Array.from({length:k},f),
        bf=(t,f)=>{const b=c.createBiquadFilter();b.type=t;b.frequency.value=f;b.gain.value=0;return b;},ser=(p,a)=>{a.forEach(b=>{p.connect(b);p=b;});return p;};
      const n=d.n={rIn:g(0),rOut:g(1),rAux:g(0),rta:an(8192),nz:g(0),c:[]},io={in:{},out:{}};n.rta.smoothingTimeConstant=.75;[n.rIn,n.rOut,n.rAux].forEach(v=>v.connect(n.rta));
      const nb=c.createBuffer(1,c.sampleRate*4,c.sampleRate),pd=nb.getChannelData(0);let k0=0,k1=0,k2=0,k3=0,k4=0,k5=0,k6=0;   // pink noise (Paul Kellet)
      for(let i=0;i<pd.length;i++){const w=Math.random()*2-1;k0=.99886*k0+w*.0555179;k1=.99332*k1+w*.0750759;k2=.969*k2+w*.153852;k3=.8665*k3+w*.3104856;k4=.55*k4+w*.5329522;k5=-.7616*k5-w*.016898;pd[i]=(k0+k1+k2+k3+k4+k5+k6+w*.5362)*.11;k6=w*.115926;}
      const src=c.createBufferSource();src.buffer=nb;src.loop=true;src.connect(n.nz);src.start();
      [0,1].forEach(()=>{const inp=g(1),sm=g(1),ig=g(1);inp.connect(sm);sm.connect(ig);n.nz.connect(ig);
        const f=FQ.map(q=>{const b=bf('peaking',q);b.Q.value=4.32;return b;}),p=nA(10,()=>bf('peaking',1000)),fb=nA(12,()=>bf('peaking',1000)),dq=nA(3,()=>bf('peaking',1000));
        const a1=ser(ig,[...f,...p]),a2=ser(a1,fb),dd=dq.map(()=>{const b=bf('bandpass',1000),a=an(512);a2.connect(b);b.connect(a);return [b,a];});
        const cmp=c.createDynamicsCompressor(),ctr=g(1),xg=g(1),dg=g(1),xa=an(1024),fa=an(8192),a3=ser(a2,dq);a2.connect(fa);a3.connect(xa);   // ctr cancels the compressor's automatic make-up gain
        const a4=ser(a3,[cmp,ctr,xg,dg]),h={inp,sm,ig,f,p,fb,d:dq,dd,cmp,ctr,xg,dg,xa,fa,a4,pt:[ig,a1,a4],anI:an(2048),anO:an(2048),dry:g(0)};ig.connect(h.anI);ig.connect(n.rIn);inp.connect(h.dry);n.c.push(h);});
      /* WIDTH: M/S matrix (asymmetry, width), bass trim on M, shuffle on S, then rotation */
      const W=n.w={},M=g(1),S=g(1);n.c.forEach((h,i)=>{const a=g(.5),b=g(i?-.5:.5);h.a4.connect(a);a.connect(M);h.a4.connect(b);b.connect(S);});
      W.shM=bf('lowshelf',700);W.shS=bf('lowshelf',700);M.connect(W.shM);S.connect(W.shS);const l1=g(1),r1=g(1);
      [['ml',W.shM,l1,1],['mr',W.shM,r1,1],['sl',W.shS,l1,1],['sr',W.shS,r1,-1]].forEach(([k,a,b,v])=>{W[k]=g(v);a.connect(W[k]);W[k].connect(b);});
      const sum=[g(1),g(1)];W.ro=[[g(1),g(0)],[g(0),g(1)]];[0,1].forEach(o=>[l1,r1].forEach((v,j)=>{v.connect(W.ro[o][j]);W.ro[o][j].connect(sum[o]);}));
      n.c.forEach((h,i)=>{const l=c.createDynamicsCompressor();l.ratio.value=20;l.knee.value=0;l.attack.value=.001;l.release.value=.1;l.threshold.value=0;   // limiter + trim (cancels make-up)
        const trim=g(1),dl=c.createDelay(.31),og=g(1),wet=g(1),out=g(1),aux=g(1),tg=h.pt.concat([sum[i]]).map(v=>{const t=g(0);v.connect(t);t.connect(aux);return t;});
        sum[i].connect(l);ser(l,[trim,dl,og,wet,out]);h.dry.connect(out);out.connect(h.anO);out.connect(n.rOut);aux.connect(n.rAux);
        Object.assign(h,{lim:l,trim,dl,og,wet,out,tg});io.in['in'+'LR'[i]]=h.inp;io.out['out'+'LR'[i]]=out;});
      setInterval(tick,30);apply();return io;},
    draw(side){const on=s.power&&now()>=s.boot,n=d.n,t=now();
      [0,1].forEach(c=>{let p=-120;if(n&&s.power){const h=n.c[c];p=A.peakDb(h.anI);if(p>-.1||(!s.hb&&h.lim.reduction<-.3))clipT[c]=t+250;}
        MT.forEach((th,i)=>A.setLed(d,'m'+c+i,s.power&&p>th));A.setLed(d,'m'+c+6,s.power&&t<clipT[c]);});
      ['GEQ','PEQ','DEQ','WIDTH','DYN','FBD'].forEach(m=>A.setLed(d,'k'+m,on&&!s.hb&&!s.mb[m]));A.setLed(d,'kUTILITY',false);
      A.setLed(d,'kI/O',on);A.setLed(d,'kBYPASS',on&&(s.hb||Object.values(s.mb).some(Boolean)));A.setLed(d,'kcompare',on&&!!s.cmp);
      A.setLed(d,'kMEMORY',on&&snap()!==s.ref);
      if(side!=='rear')lcd();}};});
})();
