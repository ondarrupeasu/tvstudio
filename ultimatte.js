/* Blackmagic Ultimatte 12 HD (×2) + Ultimatte Smart Remote 4 — chroma keying (docs/ultimatte-spec.md).
 * FG = router OUT cabled to "Ultimatte n FG", BG = router OUT cabled to "Ultimatte n BG"; PGM OUT goes back into the router.
 * Matte (1 = background): green dominance vs the sampled backing, then Matte Density, Black Gloss, Red / Blue Density,
 * Clean Up, Shadow; Flare = spill suppression. Monitor Output: Program, FG, BG, Combined Matte, Internal Matte, Fill Out.
 * Also a test "chroma camera" (presenter on green) so there is something to key. Not affiliated with Blackmagic Design. */
(function(){
const root=document.getElementById('um');if(!root)return;
const CW=320,CH=180,mk=(w=CW,h=CH)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
/* Ultimatte Software Control (Smart Remote 4 screen): main menu › GROUPS (8 knobs) + FUNCTIONS. null = group exists, not simulated.
   Knob ids are global per unit (u.v), toggles in u.f. [MAN pp.32-35, 42-61] */
const K=(id,n,min,max,def,un='%')=>({id,n,min,max,def,un}),F=(id,n,type='toggle',def=false)=>({id,n,type,def});
const MENUS={
  MATTE:{'Matte Process':{k:[K('dens','Matte Density',-100,300,0),K('gloss','Black Gloss',0,100,0),K('rd','Red Density',0,100,100),K('bd','Blue Density',0,100,100),K('shl','Shadow Level',100,200,100),K('sht','Shadow Threshold',0,100,100)],
      f:[F('mreset','Matte Reset','action'),F('matte','Matte','toggle',true),F('scap','Screen Capture','action'),F('scor','Screen Correct')]},
    'Clean Up':{k:[K('cu','Clean Up Level',0,100,0),K('cud','Dark Recover',0,100,0),K('cul','Light Recover',0,100,0),K('cus','Strength',0,100,100)],f:[F('cureset','Clean Up Reset','action')]},
    'Veil':{k:[K('vm','Veil Master',0,100,0),K('vr','Veil Red',0,100,0),K('vg','Veil Green',0,100,0),K('vb','Veil Blue',0,100,0)],f:[F('vreset','Veil Reset','action')]},
    'Screen Sample':null,'Filter':null,'Custom Mon Out':null},
  FOREGROUND:{'Flare 1':{k:[K('flare','Flare Level',0,200,100)],f:[F('hmflare','Holdout Matte Flare','toggle',true)]},'Flare 2':null,
    'Ambiance 1':{k:[K('amb','Ambiance Level',0,100,0)],f:[]},'Ambiance 2':null,
    'Color':{k:[K('fwl','White Level',0,200,100),K('fbl','Black Level',-100,100,0),K('fcon','Contrast',0,200,100),K('fsat','Saturation',0,200,100)],f:[F('fcreset','Color Reset','action')]}},
  BACKGROUND:{'Color':{k:[K('bwl','White Level',0,200,100),K('bbl','Black Level',-100,100,0),K('bcon','Contrast',0,200,100),K('bsat','Saturation',0,200,100)],f:[F('bfreeze','Freeze'),F('bcreset','Color Reset','action')]}},
  LAYER:{'Layer':{k:[],f:[F('layer','Layer Input','na')]},'Lighting':null},
  'MATTE IN':{'Matte Inputs':{k:[],f:[F('gmin','Garbage Matte In'),F('hmin','Holdout Matte In'),F('bgmin','BG Matte In','na'),F('lymin','Layer Matte In','na')]},
    'Window':{k:[K('wt','Window Top',0,100,0),K('wb','Window Bottom',0,100,0),K('wl','Window Left',0,100,0),K('wr','Window Right',0,100,0),K('wst','Softness Top',0,100,0),K('wsb','Softness Bottom',0,100,0),K('wsl','Softness Left',0,100,0),K('wsr','Softness Right',0,100,0)],
      f:[F('win','Window'),F('wskew','Window Skew','na')]}},
  SETTINGS:{'System':{k:[],f:[F('bk0','Red','radio'),F('bk1','Green','radio'),F('bk2','Blue','radio'),F('cascade','Monitor Cascade')]},
    'Inputs':{k:[K('fgdelay','Frame Delay FG',0,14,0,'fr')],f:[]},
    'Outputs':{k:[K('mol','Matte Out Level',0,100,100)],f:[F('moinv','Matte Out Invert'),F('flmc','Fill Lin Mix Cor'),F('m2p','Monitor to Program')]},'Media':null,'On Air':null,'GPIO':null}};
const TABS=Object.keys(MENUS),MONS=['Program','Foreground Input','Background Input','Combined Matte','Internal Matte','Fill Out'];
const ALLK=Object.values(MENUS).flatMap(m=>Object.values(m).filter(Boolean).flatMap(g=>g.k)),ALLF=Object.values(MENUS).flatMap(m=>Object.values(m).filter(Boolean).flatMap(g=>g.f)).filter(f=>f.type==='toggle');
const defV=()=>Object.fromEntries(ALLK.map(k=>[k.id,k.def])),defF=()=>Object.fromEntries(ALLF.map(f=>[f.id,f.def]));
const U=[1,2,3].map(n=>({n,v:defV(),f:defF(),backing:[40,170,60],ch:1,mon:0,preset:0,quick:{},lock:false,menu:null,
  out:mk(),monCv:mk(),fillCv:mk(),matteCv:mk(),fg:mk(),bg:mk(),gm:mk(),hm:mk(),mi:mk(),loop:mk(),plate:null,dly:[],online:true}));
const R={unit:0,tab:'MATTE',grp:Object.fromEntries(TABS.map(t=>[t,Object.keys(MENUS[t])[0]])),alt:false,msg:'',mt:0};
const knobsOf=()=>{const g=MENUS[R.tab][R.grp[R.tab]];return g?g.k:[];};
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
const px=c=>c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,CW,CH);
/* one pass per frame: internal matte (+ garbage / window / holdout = combined matte), spill, colour, composite;
   outputs PGM OUT, PGM FILL, PGM MATTE, MON OUT (+ cascade), CAMERA FG LOOP */
function grabBG(u){const n=u.n;if(hubOutFor('u'+n+'bg')>=0)return grab('u'+n+'bg',u.bg);const D=window.VH&&VH.atemDirect,k=D?+Object.keys(D.out).find(o=>D.out[o]==='u'+n+'bg'):0;
  if(!k||!window.ATEMR)return false;const g=u.bg.getContext('2d',{willReadFrequently:true});g.fillStyle='#000';g.fillRect(0,0,CW,CH);return ATEMR.outFrame(k-1,g,CW,CH)!==false;}
function process(u){const now=performance.now();if(depth||now-(u.t||0)<35)return;u.t=now;depth++;try{
  const v=u.v,f_=u.f,n=u.n;u.okF=grab('u'+n+'fg',u.fg);if(!f_.bfreeze||!u.okB)u.okB=grabBG(u);
  u.okG=f_.gmin&&grab('u'+n+'gm',u.gm);u.okH=f_.hmin&&grab('u'+n+'hm',u.hm);
  const lg=u.loop.getContext('2d');lg.clearRect(0,0,CW,CH);lg.drawImage(u.fg,0,0);   // CAMERA FG LOOP = the camera, untouched
  const og=u.out.getContext('2d'),mg=u.monCv.getContext('2d'),fgc=u.fillCv.getContext('2d'),mtc=u.matteCv.getContext('2d');
  if(!u.okF){og.fillStyle='#000';og.fillRect(0,0,CW,CH);if(u.okB)og.drawImage(u.bg,0,0);mg.drawImage(u.out,0,0);fgc.fillStyle='#000';fgc.fillRect(0,0,CW,CH);mtc.fillStyle=f_.moinv?'#000':'#fff';mtc.fillRect(0,0,CW,CH);return;}
  let F=px(u.fg);if(v.fgdelay>0){u.dly.push(F);while(u.dly.length>v.fgdelay+1)u.dly.shift();F=u.dly[0];}else u.dly=[];   // Settings › Inputs › Frame Delay FG
  const B=px(u.bg),f=F.data,b=B.data,G=u.okG?px(u.gm).data:null,Hm=u.okH?px(u.hm).data:null,PL=f_.scor&&u.plate?u.plate.data:null;
  const O=og.createImageData(CW,CH),o=O.data,M=mg.createImageData(CW,CH),mo=M.data,FI=fgc.createImageData(CW,CH),fi=FI.data,MT=mtc.createImageData(CW,CH),mt=MT.data;
  const ch=u.ch,oth=[[1,2],[0,2],[0,1]][ch],bk=u.backing,bDom=Math.max(8,bk[ch]-Math.max(bk[oth[0]],bk[oth[1]]));
  const dens=v.dens/100*.3,gloss=v.gloss/100,rd=v.rd/100,bd=v.bd/100,shL=(v.shl-100)/100,shT=v.sht/100,cu=v.cu/100*v.cus/100,cud=v.cud/100,cul=v.cul/100;
  const veil=[v.vr,v.vg,v.vb].map(x=>(v.vm+x)/100*.1),flare=v.flare/100,wl=v.fwl/100,bl=v.fbl/100*.3,sat=v.fsat/100,con=v.fcon/100,amb=v.amb/100*.35;
  const bwl=v.bwl/100,bbl=v.bbl/100*.3*255,bcon=v.bcon/100,bsat=v.bsat/100,bLum=(bk[0]+bk[1]+bk[2])/3,mol=v.mol/100;
  let av=[0,0,0];if(amb>0){for(let i=0;i<b.length;i+=64){av[0]+=b[i];av[1]+=b[i+1];av[2]+=b[i+2];}av=av.map(x=>x/(b.length/64));}   // ambiance: the average colour of the background
  const W=f_.win?{t:v.wt/100,b:1-v.wb/100,l:v.wl/100,r:1-v.wr/100,st:v.wst/100,sb:v.wsb/100,sl:v.wsl/100,sr:v.wsr/100}:null,ss=(e0,e1,x)=>e1<=e0?(x>=e0?1:0):Math.min(1,Math.max(0,(x-e0)/(e1-e0)));
  const cas=f_.cascade&&R.unit!==u.idx&&grab('u'+n+'mi',u.mi),MI=cas?px(u.mi).data:null;   // monitor cascade: MON OUT passes the MON IN of the chain
  for(let y=0,i=0;y<CH;y++)for(let x=0;x<CW;x++,i+=4){let c=[f[i],f[i+1],f[i+2]];
    let dom=bDom;if(PL){dom=Math.max(8,PL[i+ch]-Math.max(rd*PL[i+oth[0]],bd*PL[i+oth[1]]));}   // screen correct: compare with the captured empty screen
    const d=c[ch]-Math.max(rd*c[oth[0]],bd*c[oth[1]]);let m=Math.min(1,Math.max(0,d/dom));
    m=Math.min(1,Math.max(0,(m-dens)/(1-Math.min(.95,dens))));const lum=(c[0]+c[1]+c[2])/765;m*=1-gloss*Math.max(0,.5-lum)*2;
    const cuE=cu*(1-cud*(1-lum))*(1-cul*lum);m=Math.min(1,m/(1-cuE*.45));if(!f_.matte)m=0;const mi=m;
    let gar=G?(G[i]*.2126+G[i+1]*.7152+G[i+2]*.0722)/255:0;   // garbage matte in: white = keep it out of the picture
    if(W){const yy=y/CH,xx=x/CW,ins=ss(W.t-W.st,W.t,yy)*(1-ss(W.b,W.b+W.sb,yy))*ss(W.l-W.sl,W.l,xx)*(1-ss(W.r,W.r+W.sr,xx));gar=Math.max(gar,1-ins);}
    m=Math.max(m,gar);const h=Hm?(Hm[i]*.2126+Hm[i+1]*.7152+Hm[i+2]*.0722)/255:0;m*=1-h;   // holdout matte in: white = never keyed
    const sp=c[ch]-Math.max(c[oth[0]],c[oth[1]]);if(sp>0)c[ch]-=sp*Math.min(1,flare)*(f_.hmflare?1:1-h);   // flare = spill suppression
    for(let k=0;k<3;k++){let q=c[k]/255;q=(q-.5)*con+.5;q=q*wl+bl-veil[k];c[k]=q*255+av[k]*amb;}const yv=(c[0]+c[1]+c[2])/3;for(let k=0;k<3;k++)c[k]=Math.max(0,Math.min(255,yv+(c[k]-yv)*sat));
    const sf=1-Math.max(0,1-(f[i]+f[i+1]+f[i+2])/3/Math.max(1,bLum))*shL*shT;let bc=[0,1,2].map(k=>((b[i+k]/255-.5)*bcon+.5)*255*bwl+bbl);const by=(bc[0]+bc[1]+bc[2])/3;bc=bc.map(q=>Math.max(0,by+(q-by)*bsat)*Math.max(0,sf));
    for(let k=0;k<3;k++){o[i+k]=c[k]*(1-m)+bc[k]*m;fi[i+k]=f_.flmc?(m<.996?c[k]:0):c[k]*(1-m);}o[i+3]=fi[i+3]=255;
    let mm=m*mol;if(f_.moinv)mm=1-mm;mt[i]=mt[i+1]=mt[i+2]=mm*255;mt[i+3]=255;   // PGM MATTE: 0 % black = opaque foreground, 100 % white = backing
    const md=u.mon;let r,g2,b2;if(MI){r=MI[i];g2=MI[i+1];b2=MI[i+2];}else if(md===0){r=o[i];g2=o[i+1];b2=o[i+2];}else if(md===1){r=f[i];g2=f[i+1];b2=f[i+2];}else if(md===2){r=b[i];g2=b[i+1];b2=b[i+2];}
    else if(md===3){r=g2=b2=m*255;}else if(md===4){r=g2=b2=mi*255;}else{r=fi[i];g2=fi[i+1];b2=fi[i+2];}mo[i]=r;mo[i+1]=g2;mo[i+2]=b2;mo[i+3]=255;}
  og.putImageData(f_.m2p?M:O,0,0);mg.putImageData(M,0,0);fgc.putImageData(FI,0,0);mtc.putImageData(MT,0,0);}finally{depth--;}}
function autoKey(u){if(!u.okF){grab('u'+u.n+'fg',u.fg);}const d=px(u.fg).data,ch=u.ch,oth=[[1,2],[0,2],[0,1]][ch],c=[];
  for(let i=0;i<d.length;i+=16){const dom=d[i+ch]-Math.max(d[i+oth[0]],d[i+oth[1]]);c.push([dom,d[i],d[i+1],d[i+2]]);}c.sort((a,b)=>b[0]-a[0]);const top=c.slice(0,Math.max(1,c.length/20|0));
  u.backing=[1,2,3].map(k=>top.reduce((s,x)=>s+x[k],0)/top.length);flash('Auto Key: backing colour sampled');}
U.forEach((u,i)=>{u.idx=i;const out=(name,cv,need)=>{VH_SOURCES[name]=(c,w,h)=>{if(!depth)process(u);if(need&&!need())return false;c.drawImage(cv(),0,0,w,h);};};
  out('ult'+u.n,()=>u.out,()=>u.okF||u.okB);out('ult'+u.n+'f',()=>u.fillCv,()=>u.okF);out('ult'+u.n+'m',()=>u.matteCv,()=>u.okF);out('ult'+u.n+'mo',()=>u.monCv,()=>u.okF||u.okB);out('ult'+u.n+'l',()=>u.loop,()=>u.okF);});
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
  return `<svg viewBox="0 0 ${W} ${H}" class="vh-svg um-rear"><rect x="1" y="1" width="${W-2}" height="${H-2}" rx="6" class="at-face"/>
    <g data-tip="IEC power inlet (100-240 V)."><rect x="${X(.02)}" y="${Y(.15)}" width="${X(.105)}" height="${Y(.65)}" rx="3" class="vh-iec2"/></g>
    <g data-tip="GPIO (DE-15): tally input from a GPI interface."><rect x="${X(.217)-14}" y="${Y(.27)-6}" width="28" height="12" rx="4" class="vh-rj"/></g>${T(.217,.42,'GPIO')}
    <g class="um-s" data-s="u${i}:eth" data-tip="ETHERNET: to the rack network switch — the Smart Remote 4 (and Ultimatte Software Control) control the unit over the network."><rect x="${X(.207)-10}" y="${Y(.68)-8}" width="20" height="16" rx="2" class="vh-rj"/></g>${T(.207,.92,'ETHERNET')}
    ${sock('refo',.392,.27,'REF OUT','REF OUT: reference loop (to the next unit).')}${sock('refi',.392,.68,'REF IN','Reference input (same sync as the ATEM).')}
    ${sock('bg',.5,.68,'BACKGROUND','BACKGROUND: the picture that goes behind the presenter.')}${sock('fgl',.587,.27,'CAMERA FG LOOP','CAMERA FG LOOP: the camera signal, re-clocked and untouched (e.g. to record the clean camera).')}${sock('fg',.587,.68,'CAMERA FG','CAMERA FG: the camera on the green screen.')}
    ${sock('fill',.675,.27,'PGM FILL','PGM FILL: the presenter with the spill removed and the screen suppressed to black (the fill for a linear key in the ATEM). SETTINGS › Outputs › Fill Lin Mix Cor for a switcher that does a linear mix.')}${sock('gm',.675,.68,'G MATTE','G MATTE IN: garbage matte — white areas are thrown out of the picture (MATTE IN › Garbage Matte In).')}
    ${sock('matte',.762,.27,'PGM MATTE','PGM MATTE: the combined matte — black = presenter, white = background (SETTINGS › Outputs › Matte Out Invert flips it). The key for a linear key in the ATEM.')}${sock('hm',.762,.68,'H MATTE','H MATTE IN: holdout matte — white areas are never keyed (e.g. a green logo on the desk). MATTE IN › Holdout Matte In.')}
    ${sock('pgm',.85,.27,'PGM OUT','PGM OUT: the finished composite.')}${sock('mono',.938,.27,'MON OUT','MON OUT: the view chosen in MONITOR OUTPUT (or, with Monitor Cascade, the selected unit of the chain).')}${sock('moni',.938,.68,'MON IN','MON IN: monitor cascade — the MON OUT of the previous unit (SETTINGS › System › Monitor Cascade).')}
    <path d="M${X(.55)} ${Y(.07)}v-3H${X(.98)}v3" class="vh-brk"/><text x="${X(.765)}" y="${Y(.05)}" class="um-rt um-brt">SDI OUT</text><path d="M${X(.46)} ${Y(.93)}v3H${X(.98)}v-3" class="vh-brk"/><text x="${X(.72)}" y="${Y(.995)}" class="um-rt um-brt">SDI IN</text></svg>`;}
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
function cableList(){const H=root.querySelector('.um-rear')?.getBoundingClientRect().height||140,dn=Math.round(.06*H),up=-dn;   // tags sit inside the panel: between a BNC and its name (bottom row) or the SDI OUT line (top row)
  const L=[{a:'[data-s="u0:eth"]',hang:dn,tag:'Network',info:'Ethernet → the rack network switch: the Smart Remote 4 controls this unit through it'},{a:'[data-s="u1:eth"]',hang:dn,tag:'Network',info:'Ethernet → the rack network switch'}];
  const st=window.VH?VH.state():null;if(!st)return L;const o=d=>st.cabOut.indexOf(d),i=v=>st.cabIn.indexOf(v),src=k=>VH.inputLabel(st.routes[o(k)]);
  [0,1,2].forEach(j=>{const n=j+1,S=id=>`[data-s="u${j}:${id}"]`;
    if(o('u'+n+'bg')<0){const D=VH.atemDirect,k=D?+Object.keys(D.out).find(x=>D.out[x]==='u'+n+'bg'):0;if(k)L.push({a:S('bg'),hang:dn,tag:'ATEM OUT '+k,info:`ATEM SDI OUT ${k} = BKG ${n} (${window.ATEMR?ATEMR.outLabel(k-1):''}) → Ultimatte ${n} BACKGROUND, straight from the ATEM (Inhar's sheet)`});}
    [['fg','CAMERA FG'],['bg','BACKGROUND'],['gm','G MATTE IN'],['hm','H MATTE IN'],['mi','MON IN']].forEach(([k,lab])=>{const q=o('u'+n+k);if(q>=0)L.push({a:S(k==='mi'?'moni':k),hang:dn,tag:'Hub OUT '+(q+1),info:`${src('u'+n+k)} → Videohub → OUT ${q+1} → Ultimatte ${n} ${lab}`});});
    [['','pgm','PGM OUT'],['f','fill','PGM FILL'],['m','matte','PGM MATTE'],['mo','mono','MON OUT'],['l','fgl','CAMERA FG LOOP']].forEach(([k,sock,lab])=>{const q=i('ult'+n+k);if(q>=0)L.push({a:S(sock),hang:up,tag:'Hub IN '+(q+1),info:`Ultimatte ${n} ${lab} → Videohub IN ${q+1}`});});});
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
  s+=`<rect x="${X(.347)}" y="${Y(.045)}" width="${X(.554)}" height="${Y(.86)}" rx="4" class="vh-lcdb"/><text x="${X(.625)}" y="${Y(.95)}" class="um-st" style="letter-spacing:.4em">SMART │ REMOTE │ <tspan fill="#4aa3ff">4</tspan></text>`;
  return s+'</svg><canvas id="um-touch" width="800" height="500"></canvas>';}
/* ---------- screens ---------- */
function drawHdLcd(i){const u=U[i],c=root.querySelector(`.um-lcd[data-u="${i}"]`);if(!c)return;const g=c.getContext('2d'),w=240,h=180;g.fillStyle='#000';g.fillRect(0,0,w,h);
  if(u.menu){g.fillStyle='#eef1f4';g.fillRect(0,0,w,h);g.fillStyle='#2b6fd6';g.fillRect(0,0,w,26);g.fillStyle='#fff';g.font='700 13px sans-serif';g.fillText(['Matte Status','Input Status','Network'][u.menu.p],8,18);g.fillStyle='#222';g.font='600 12px sans-serif';
    if(u.menu.p===0){g.fillText('Screen Reference Color: '+['Red','Green','Blue'][u.ch??1],8,52);g.fillText('Auto Key  ⟲  (SET)',8,76);}else if(u.menu.p===1){[['Reference','OK'],['Foreground',u.okF],['Background',u.okB],['Garbage Matte',hubOutFor('u'+u.n+'gm')>=0],['Holdout Matte',hubOutFor('u'+u.n+'hm')>=0],['Monitor',hubOutFor('u'+u.n+'mi')>=0]].forEach(([k,ok],j)=>g.fillText(k+': '+(ok?'OK':'No Input'),8,48+j*17));}
    else{g.fillText('IP Address: 192.168.11.'+(61+i),8,52);g.fillText('Default: 192.168.10.220',8,72);}g.fillStyle='#666';g.font='600 10px sans-serif';g.fillText('Knob = page · SET = action · MENU = exit',8,h-10);return;}
  g.drawImage(u.out,0,0,w,135);g.fillStyle='rgba(0,0,0,.6)';g.fillRect(0,0,w,20);g.fillStyle='#fff';g.font='600 11px sans-serif';g.fillText('Ultimatte 12 HD '+(i+1),6,14);g.textAlign='right';g.fillText('1080i50',w-6,14);g.textAlign='left';
  g.fillStyle='#000';g.fillRect(0,135,w,45);g.fillStyle=u.okF?'#fff':'#ffb02e';g.font='800 20px sans-serif';g.fillText(u.okF?'STANDBY':'No Cam',8,166);g.font='600 10px sans-serif';g.fillStyle='#8b949e';g.fillText(R.msg&&R.unit===i?R.msg:'',110,166);
  root.querySelectorAll(`.um-k[data-u="${i}"]`).forEach(k=>{const id=k.dataset.k;k.classList.toggle('green',/^p\d$/.test(id)&&!!u.quick[+id[1]]&&u.preset!==+id[1]);k.classList.toggle('blue',/^p\d$/.test(id)&&u.preset===+id[1]);k.classList.toggle('red',id==='lock'&&u.lock);});}
/* touch screen layout (800 × 500): tabs · title · GROUPS · FUNCTIONS · MONITOR OUTPUT · status bar; knobs 1-4 left, 5-8 right */
const TL={grp:{x:150,y:86,w:122,h:28,dx:126,dy:32,per:4},fn:{x:150,y:182,w:98,h:28,dx:101,dy:32,per:5},mon:{x:150,y:300,w:162,h:34,dx:170,dy:40,per:3}};
const cell=(L,j)=>({x:L.x+(j%L.per)*L.dx,y:L.y+Math.floor(j/L.per)*L.dy,w:L.w,h:L.h});
const hit=(L,n,x,y)=>{for(let j=0;j<n;j++){const c=cell(L,j);if(x>=c.x&&x<=c.x+c.w&&y>=c.y&&y<=c.y+c.h)return j;}return -1;};
function fnOn(u,F){if(F.type==='radio')return u.ch===+F.id.slice(2);if(F.type==='toggle')return !!u.f[F.id];return false;}
function drawTouch(){const c=document.getElementById('um-touch');if(!c)return;const g=c.getContext('2d'),w=800,h=500,u=U[R.unit];g.fillStyle='#14181d';g.fillRect(0,0,w,h);g.textBaseline='middle';
  TABS.forEach((t,i)=>{const x=150+i*84;g.fillStyle=t===R.tab?'#1f8a85':'#262c33';g.fillRect(x,8,80,30);g.fillStyle='#fff';g.font='700 11px sans-serif';g.textAlign='center';g.fillText(t,x+40,23);});
  g.textAlign='left';g.fillStyle='#fff';g.font='700 18px sans-serif';g.fillText(R.tab,150,58);g.fillStyle='#ffcf5a';g.font='600 13px sans-serif';g.fillText('⟲ auto key',380,58);
  const G=MENUS[R.tab],gn=Object.keys(G),grp=G[R.grp[R.tab]];
  g.fillStyle='#8b949e';g.font='700 10px sans-serif';g.fillText('GROUPS',150,77);
  gn.forEach((n,j)=>{const b=cell(TL.grp,j);g.fillStyle=n===R.grp[R.tab]?'#1f8a85':G[n]?'#262c33':'#1b1f24';g.fillRect(b.x,b.y,b.w,b.h);g.fillStyle=G[n]?'#fff':'#4d5560';g.font='600 11px sans-serif';g.textAlign='center';g.fillText(n,b.x+b.w/2,b.y+b.h/2);g.textAlign='left';});
  g.fillStyle='#8b949e';g.font='700 10px sans-serif';g.fillText('FUNCTIONS',150,173);
  (grp?grp.f:[]).forEach((F,j)=>{const b=cell(TL.fn,j),on=fnOn(u,F);g.fillStyle=F.type==='na'?'#1b1f24':on?(F.type==='radio'?['#c0392b','#1e8449','#2e6fd6'][+F.id.slice(2)]:'#2fa84f'):'#262c33';g.fillRect(b.x,b.y,b.w,b.h);
    g.fillStyle=F.type==='na'?'#4d5560':'#fff';g.font='600 10px sans-serif';g.textAlign='center';g.fillText(F.n,b.x+b.w/2,b.y+b.h/2);g.textAlign='left';});
  if(!grp){g.fillStyle='#8b949e';g.font='600 12px sans-serif';g.fillText(R.grp[R.tab]+': not simulated.',150,196);}
  const K=knobsOf();for(let n=0;n<8;n++){const left=n<4,x=left?10:w-130,y=60+(n%4)*105;g.fillStyle='#1d2228';g.fillRect(x,y,120,95);const p=K[n];
    if(p){const v=u.v[p.id],f=(v-p.min)/(p.max-p.min);g.fillStyle='#c9d1d9';g.font='600 11px sans-serif';g.textAlign='center';g.fillText(p.n,x+60,y+14);g.strokeStyle='#33404c';g.lineWidth=6;g.beginPath();g.arc(x+60,y+52,24,Math.PI*.75,Math.PI*2.25);g.stroke();
      g.strokeStyle='#1fb5ad';g.beginPath();g.arc(x+60,y+52,24,Math.PI*.75,Math.PI*(.75+1.5*f));g.stroke();g.fillStyle='#fff';g.font='700 13px sans-serif';g.fillText(Math.round(v)+(p.un==='fr'?' fr':' %'),x+60,y+84);}}
  g.textAlign='left';g.fillStyle='#8b949e';g.font='600 11px sans-serif';
  const HINT={'Matte Process':'Matte Density: look at Combined Matte · Screen Capture (empty set) → Screen Correct','Clean Up':'Clean Up removes wrinkles and marks of the screen — use little',Veil:'Veil removes the white haze (look at Fill Out / Program)',
    'Flare 1':'Flare Level = how much green spill is removed from the presenter','Ambiance 1':'Adds the colour of the background to the presenter',Color:'Brightness, contrast and saturation of this layer',Layer:'On the 12 HD the layer comes from the media pool (not simulated)',
    'Matte Inputs':'G MATTE / H MATTE connectors on the rear (cable them on the Videohub)',Window:'Turn Window on, then dial the edges in (a rough garbage matte)',System:'Backing colour · Monitor Cascade (MON OUT → MON IN of the next unit)',Inputs:'Delays the camera to match a late background',Outputs:'PGM FILL / PGM MATTE for a linear key in the ATEM: Fill Lin Mix Cor on'};
  g.fillText(HINT[R.grp[R.tab]]||'',150,232);if(R.msg){g.fillStyle='#ffcf5a';g.font='700 13px sans-serif';g.fillText(R.msg,150,262);}
  g.fillStyle='#fff';g.font='700 12px sans-serif';g.fillText('MONITOR OUTPUT',150,288);MONS.forEach((m,i)=>{const b=cell(TL.mon,i);g.fillStyle=u.mon===i?'#1f8a85':'#262c33';g.fillRect(b.x,b.y,b.w,b.h);g.fillStyle='#fff';g.font='600 12px sans-serif';g.fillText(m,b.x+10,b.y+b.h/2);});
  for(let k=0;k<8;k++){const x=150+k*62,y=h-34;g.fillStyle=k===R.unit?'#2e6fd6':k<3?'#1e8449':'#2a2f35';g.fillRect(x,y,56,24);g.fillStyle='#fff';g.font='700 11px sans-serif';g.fillText(String(k+1),x+24,y+12);}
  g.fillStyle='#c9d1d9';g.font='600 11px sans-serif';g.fillText('Preset: '+(u.preset?'Quick '+u.preset+(u.dirty?' *':''):'Ultimatte Defaults')+'   ·   Ultimatte 12 HD '+(R.unit+1)+'   ·   Backing: ',150,h-50);g.fillStyle=`rgb(${u.backing.map(Math.round)})`;g.fillRect(575,h-58,16,16);
  root.querySelectorAll('.um-sr').forEach(e=>{const k=e.dataset.k;e.classList.toggle('blue',k==='unit'+R.unit);e.classList.toggle('amber',k==='alt'&&R.alt);});
  root.querySelectorAll('.um-un').forEach(e=>{const i=+e.dataset.un;e.setAttribute('fill',i<3?'#36d36e':'#555');});}
function drawMon(){const c=document.getElementById('um-mon');if(!c)return;const u=U[R.unit];c.getContext('2d').drawImage(u.monCv,0,0,c.width,c.height);const l=document.getElementById('um-monl');if(l)l.textContent=`Ultimatte ${R.unit+1} · MON OUT: ${MONS[u.mon]}`;}
function flash(t){R.msg=t;clearTimeout(R.mt);R.mt=setTimeout(()=>{R.msg='';},2500);}
/* ---------- interaction ---------- */
function setVal(n,d,reset){const u=U[R.unit],p=knobsOf()[n];if(!p)return;u.v[p.id]=reset?p.def:Math.max(p.min,Math.min(p.max,u.v[p.id]+d*(p.max-p.min)/(p.un==='fr'?14:100)));if(p.un==='fr')u.v[p.id]=Math.round(u.v[p.id]);u.dirty=true;}
const snap=u=>JSON.parse(JSON.stringify({v:u.v,f:u.f,backing:u.backing,ch:u.ch}));
function loadQuick(u,n){Object.assign(u,JSON.parse(JSON.stringify(u.quick[n])));u.preset=n;u.dirty=false;}
function srPress(k){const u=U[R.unit];
  if(k.startsWith('unit')){const i=+k.slice(4);if(i<3)R.unit=i;else flash('Unit '+(i+1)+': no Ultimatte here');return;}
  if(k==='alt'){R.alt=!R.alt;return;}if(k==='fileclear'){autoKey(u);if(R.alt){u.v=defV();u.f=defF();R.alt=false;}return;}
  const m=/^ql(\d)$/.exec(k);if(m){const n=+m[1];if(R.alt){u.quick[n]=snap(u);R.alt=false;u.preset=n;u.dirty=false;flash('Quick preset '+n+' saved');}else if(u.quick[n]){loadQuick(u,n);flash('Quick preset '+n+' loaded');}else flash('Quick preset '+n+' is empty (ALT + QUICK LOAD saves it)');}}
function fnPress(u,F){const reset=ids=>ids.forEach(id=>u.v[id]=ALLK.find(k=>k.id===id).def);u.dirty=true;
  if(F.type==='na')return flash(F.n+': not simulated');
  if(F.type==='radio'){u.ch=+F.id.slice(2);autoKey(u);return;}
  if(F.type==='toggle'){if(F.id==='scor'&&!u.plate){flash('Screen Capture first (with the set empty)');return;}if(F.id==='gmin'&&hubOutFor('u'+u.n+'gm')<0)flash('G MATTE IN has nothing cabled (patch it on the Videohub)');if(F.id==='hmin'&&hubOutFor('u'+u.n+'hm')<0)flash('H MATTE IN has nothing cabled (patch it on the Videohub)');
    u.f[F.id]=!u.f[F.id];return;}
  ({mreset:()=>reset(['dens','gloss','rd','bd','shl','sht']),cureset:()=>reset(['cu','cud','cul','cus']),vreset:()=>reset(['vm','vr','vg','vb']),fcreset:()=>reset(['fwl','fbl','fcon','fsat']),bcreset:()=>reset(['bwl','bbl','bcon','bsat']),
    scap:()=>{if(!u.okF)return flash('No camera on CAMERA FG');u.plate=px(u.fg);flash('Screen captured — now bring the presenter back and press Screen Correct');}})[F.id]?.();}
function touch(x,y){const u=U[R.unit];if(y<40){const i=Math.floor((x-150)/84);if(i>=0&&i<TABS.length)R.tab=TABS[i];return;}if(y>=48&&y<=68&&x>=375&&x<=460){autoKey(u);return;}
  const G=MENUS[R.tab],gn=Object.keys(G);let j=hit(TL.grp,gn.length,x,y);if(j>=0){if(G[gn[j]])R.grp[R.tab]=gn[j];else{R.grp[R.tab]=gn[j];flash(gn[j]+': not simulated');}return;}
  const grp=G[R.grp[R.tab]];j=grp?hit(TL.fn,grp.f.length,x,y):-1;if(j>=0){fnPress(u,grp.f[j]);return;}
  j=hit(TL.mon,6,x,y);if(j>=0){u.mon=j;return;}if(y>=466){const k=Math.floor((x-150)/62);if(k>=0&&k<3)R.unit=k;}}
function hdPress(i,k){const u=U[i];if(u.lock&&k!=='lock')return;
  if(/^p\d$/.test(k)){const n=+k[1];if(u.quick[n])loadQuick(u,n);else{R.unit=i;flash('Preset '+n+' empty (save it from the Smart Remote: ALT + QUICK LOAD)');}return;}
  if(k==='menu'){u.menu=u.menu?null:{p:0};return;}if(k==='set'&&u.menu){if(u.menu.p===0)autoKey(u);return;}}
function build(){if(root.dataset.built)return;root.dataset.built='1';
  root.innerHTML=`<div class="pwr-hd"><div><h2>Chroma keying — Ultimatte</h2><div class="kind">3 × Ultimatte 12 HD (one per chroma camera, IP .61 / .62 / .63) · Ultimatte Smart Remote 4</div>
    <p><b>FILE CLEAR</b> = Auto Key · the 8 knobs = the 8 controls on the screen · tabs MATTE / FOREGROUND / BACKGROUND · <b>MONITOR OUTPUT</b> = what the monitor shows (Combined Matte to judge the key) · hover anything.</p></div>
    <div class="pwr-btns"><button id="um-patch">Patch mode</button><button id="um-load">Load a chroma video…</button><input type="file" id="um-file" accept="video/*" hidden><button id="um-guidebtn">How to use</button><button id="um-rack">Video rack</button></div></div>
    <button class="close" id="um-close" aria-label="Close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
    <div class="um-body" id="um-wrap"><div class="um-row"><button class="ar-flip um-flip" data-flip title="Turn the Ultimattes round (front ↔ rear)">⟲<span>turn round</span></button><div class="um-units" id="um-units"></div><button class="ar-flip um-flip" data-flip title="Turn the Ultimattes round (front ↔ rear)">⟲<span>turn round</span></button></div>
      <div class="um-row2"><div class="um-srw"><div class="vh-lab">SMART REMOTE 4 <span>— controls the Ultimattes over Ethernet (rack network switch) · its HDMI OUT copies the touch screen to a monitor</span></div><div class="um-srf">${sr4()}</div></div><div class="um-monw"><div class="vh-lab" id="um-monl"></div><canvas id="um-mon" width="640" height="360"></canvas>
        <p class="um-note">Hover a cable to see where it goes · the whole signal path is in <b>How to use</b>.</p></div></div><svg class="vh-cables" id="um-cables"></svg></div>
    <div class="mx-src mx-guide" id="um-guide"><div class="mx-srchd"><b>How to key with the Ultimatte</b> <button id="um-guideclose" aria-label="Close">✕</button></div><ol class="mx-steps">
      <li>As on Inhar's sheet, for each unit n (1-3): <b>CAM n → Videohub IN n → OUT 14+n → CAMERA FG</b> · <b>ATEM OUT 2+n (BKG n = Ext n) → BACKGROUND</b> · <b>PGM OUT → Videohub IN 14+n → OUT 5+n → ATEM IN 5+n</b> (Ult 1-3 on ATEM 6-8).</li>
      <li>Your own footage: <b>Load a chroma video…</b> (a clip shot on green or blue). It replaces the picture of the chroma cameras (CAM 1-3 while the multicam pack is not loaded), so it goes Videohub → Ultimatte like a real camera. For a blue screen: SETTINGS › Blue, then Auto Key.</li>
      <li><b>FILE CLEAR</b> (or ⟲ auto key on the screen): the Ultimatte samples the green and makes the key.</li>
      <li><b>MONITOR OUTPUT › Combined Matte</b>: the presenter must be solid <b>black</b>, the green <b>white</b>. Raise <b>Matte Density</b> until no grey is left inside the presenter.</li>
      <li><b>Clean Up</b> removes the wrinkles of the cyc (little by little), <b>Shadow Level</b> keeps the floor shadow on the background, <b>Black Gloss</b> removes green reflections in dark areas.</li>
      <li><b>FOREGROUND › Flare Level</b>: how much green spill is removed from the edges of the presenter.</li>
      <li><b>ALT + QUICK LOAD n</b> saves the look; <b>QUICK LOAD n</b> (or 1 / 2 / 3 on the unit) recalls it. Shift+click a knob = its default.</li>
      <li><b>UNITS 1 / 2</b> on the remote choose which Ultimatte you are adjusting: each one keeps its own settings.</li>
      <li>On the screen: a <b>main menu</b> tab, then a <b>GROUP</b> (the 8 knobs change), then the <b>FUNCTIONS</b> (on / off and actions). Grey = not simulated.</li>
      <li>Wrinkled screen and a fixed camera: MATTE › Matte Process › <b>Screen Capture</b> with the set empty, presenter back, <b>Screen Correct</b>.</li>
      <li>Something outside the green (lights, the edge of the cyc): MATTE IN › Window › <b>Window</b> on and dial the edges in.</li>
      <li>On air: the keyed pictures are on ATEM IN 6, 7, 8 (Ult 1, 2, 3) — cut to them on the ATEM. The background of each one is chosen on the ATEM: AUX outputs 3, 4, 5.</li>
      <li>On air, option 2 (background chosen in the ATEM): <b>PGM FILL</b> (IN 13) + <b>PGM MATTE</b> (IN 14) → ATEM <b>KEY 2</b>, luma, fill IN 13, key IN 14, <b>Pre Mult ON</b>, <b>Invert ON</b> (the matte is black on the presenter). Choose the background on the ATEM, select KEY 2 and AUTO / ON. If the switcher does a linear mix (Pre Mult OFF): SETTINGS › Outputs › <b>Fill Lin Mix Cor</b>.</li></ol></div>
    <div class="mx-plugmenu" id="um-plugmenu"></div><div class="pwr-tip" id="um-tip"></div>`;
  document.getElementById('um-close').onclick=()=>window.closeUltimatte();
  root.querySelectorAll('[data-flip]').forEach(b=>b.onclick=flipUnits);
  /* patch mode (admin, like the video rack): click a BNC of an Ultimatte → which Videohub port is it cabled to */
  const pm=document.getElementById('um-plugmenu');
  document.getElementById('um-patch').onclick=e=>{const on=!root.classList.contains('patch');if(on&&!confirm('Patch mode (admin): you can re-cable the Ultimattes to the Videohub. Changes are saved in this browser. Continue?'))return;
    root.classList.toggle('patch',on);e.currentTarget.classList.toggle('on',on);e.currentTarget.textContent=on?'Exit patch mode':'Patch mode';pm.classList.remove('on');if(on&&side==='front')flipUnits();if(on)flash('Patch mode: click a BNC on an Ultimatte rear');};
  root.addEventListener('click',e=>{if(!root.classList.contains('patch')){return;}if(pm.contains(e.target))return;const g=e.target.closest('.um-s');if(!g){pm.classList.remove('on');return;}
    const [,j,k]=/^u(\d):(\w+)$/.exec(g.dataset.s)||[];const IN={fg:'fg',bg:'bg',gm:'gm',hm:'hm',moni:'mi'},OUT={pgm:'',fill:'f',matte:'m',mono:'mo',fgl:'l'};
    if(!(k in IN)&&!(k in OUT)){pm.innerHTML=`<div class="mx-srchd"><b>${k==='eth'?'ETHERNET':'REF'}</b></div><p class="mx-snote">${k==='eth'?'Network cable to the rack switch — not a Videohub signal.':'Reference (sync) — not a Videohub signal.'}</p>`;}
    else{const st=VH.state(),n=+j+1,isIn=k in IN,sig=isIn?'u'+n+IN[k]:'ult'+n+OUT[k],arr=isIn?st.cabOut:st.cabIn,cur=arr.indexOf(sig),lab=g.querySelector('title')?.textContent||k;
      const name={fg:'CAMERA FG',bg:'BACKGROUND',gm:'G MATTE IN',hm:'H MATTE IN',moni:'MON IN',pgm:'PGM OUT',fill:'PGM FILL',matte:'PGM MATTE',mono:'MON OUT',fgl:'CAMERA FG LOOP'}[k];
      pm.innerHTML=`<div class="mx-srchd"><b>Ultimatte ${n} · ${name}</b> — ${isIn?'it comes from a Videohub SDI OUT: which one?':'it goes to a Videohub SDI IN: which one?'}</div>`+
        `<button data-p="-1" class="${cur<0?'on':''}">— not cabled —</button>`+arr.map((x,q)=>`<button data-p="${q}" class="${q===cur?'on':''}">Videohub ${isIn?'OUT':'IN'} ${q+1} <i>${x==='none'?'free':(isIn?'now → ':'now ← ')+(isIn?VH.outputLabel(q):VH.inputLabel(q))}</i></button>`).join('')+
        `<p class="mx-snote">${isIn?'Then choose on the Videohub front panel what that OUT carries (DEST = the OUT, SRC = the input).':'Whatever was plugged into that Videohub IN is unplugged.'}</p>`;
      pm.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{const q=+b.dataset.p;arr.forEach((x,o)=>{if(x===sig)arr[o]='none';});if(q>=0)arr[q]=sig;VH.save();pm.classList.remove('on');
        flash(q<0?name+' unplugged':`Ultimatte ${n} ${name} ↔ Videohub ${isIn?'OUT':'IN'} ${q+1}`);});}
    pm.style.left=Math.min(e.clientX,innerWidth-310)+'px';pm.classList.add('on');pm.style.top=Math.max(10,Math.min(e.clientY-40,innerHeight-pm.offsetHeight-10))+'px';});
  const fi=document.getElementById('um-file');document.getElementById('um-load').onclick=()=>fi.click();
  fi.onchange=()=>{const f=fi.files[0];if(!f)return;if(CV.v){CV.v.pause();URL.revokeObjectURL(CV.v.src);}const v=document.createElement('video');v.src=URL.createObjectURL(f);v.loop=true;v.muted=true;v.playsInline=true;v.play().catch(()=>{});CV.v=v;CV.name=f.name;
    document.getElementById('um-load').textContent='Chroma video: '+f.name.slice(0,22);flash('The chroma cameras now play '+f.name+' — press FILE CLEAR (Auto Key)');fi.value='';};document.getElementById('um-rack').onclick=()=>{window.closeUltimatte();window.openVideohub&&openVideohub();};
  const gd=document.getElementById('um-guide');document.getElementById('um-guidebtn').onclick=()=>gd.classList.toggle('on');document.getElementById('um-guideclose').onclick=()=>gd.classList.remove('on');
  root.addEventListener('pointerdown',e=>{const k=e.target.closest('.um-k');if(k){e.preventDefault();if(k.dataset.u!=null)hdPress(+k.dataset.u,k.dataset.k);else srPress(k.dataset.k);
      if(k.dataset.k==='lock'){const u=U[+k.dataset.u],t0=performance.now(),tm=setInterval(()=>{const t=performance.now()-t0;if(!u.lock&&t>=1000){u.lock=true;clearInterval(tm);}else if(u.lock&&t>=2000){u.lock=false;clearInterval(tm);}},50);addEventListener('pointerup',()=>clearInterval(tm),{once:true});}return;}
    const kn=e.target.closest('.um-srk');if(kn){e.preventDefault();const n=+kn.dataset.n;if(e.shiftKey){setVal(n,0,true);return;}let y0=e.clientY;const mv=ev=>{const d=y0-ev.clientY;if(Math.abs(d)>=3){setVal(n,Math.sign(d));y0=ev.clientY;}};const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);};addEventListener('pointermove',mv);addEventListener('pointerup',up);return;}
    const hk=e.target.closest('.um-knob');if(hk){const u=U[+hk.dataset.u];if(u.menu)u.menu.p=(u.menu.p+1)%3;return;}
    if(e.target.id==='um-touch'){const r=e.target.getBoundingClientRect();touch((e.clientX-r.left)/r.width*800,(e.clientY-r.top)/r.height*500);}});
  root.addEventListener('wheel',e=>{const kn=e.target.closest('.um-srk');if(!kn)return;e.preventDefault();setVal(+kn.dataset.n,e.deltaY<0?1:-1);},{passive:false});
  const tip=document.getElementById('um-tip');root.addEventListener('mousemove',e=>{const t=e.target.closest('[data-tip]');if(!t){tip.classList.remove('on');return;}tip.innerHTML=`<span>${t.dataset.tip}</span>`;tip.style.left=e.clientX+'px';tip.style.top=e.clientY+'px';tip.classList.add('on');});}
let side='front',flipping=false;
function renderUnits(){const el=document.getElementById('um-units');if(!el)return;el.innerHTML=U.map((u,i)=>`<div class="um-unit"><div class="vh-lab">ULTIMATTE 12 HD · ${i+1} <span>— CAM ${i+1} · ${side==='front'?'front':'rear (seen from behind)'}</span></div>${side==='front'?`<div class="um-hdw">${hdFront(i)}</div>`:hdRear(i)}</div>`).join('');
  root.classList.toggle('rear',side==='rear');fit();ropes&&ropes.refresh();}
function flipUnits(){if(flipping)return;flipping=true;const el=document.getElementById('um-units');el.style.transition='transform .2s ease-in';el.style.transform='rotateX(90deg)';
  setTimeout(()=>{side=side==='front'?'rear':'front';renderUnits();el.style.transition='none';el.style.transform='rotateX(-90deg)';setTimeout(()=>{el.style.transition='transform .2s ease-out';el.style.transform='rotateX(0)';setTimeout(()=>{flipping=false;ropes&&ropes.refresh();},230);},20);},200);}
let last=0,running=false;function loop(now){requestAnimationFrame(loop);if(!root.classList.contains('on'))return;if(now-last<60)return;last=now;U.forEach(u=>process(u));if(side==='front')U.forEach((u,i)=>drawHdLcd(i));drawTouch();drawMon();}
/* the remote takes all the room left: as wide as the row allows (minus the monitor) and as tall as the window allows */
function fit(){const sw=root.querySelector('.um-srw'),row=root.querySelector('.um-row2'),body=document.getElementById('um-wrap');if(!sw||!row||!root.classList.contains('on'))return;
  const r0=root.querySelector('.um-row').getBoundingClientRect(),n=U.length,uw=Math.min((r0.width-2*70-(n-1)*10)/n,(body.clientHeight*.3-20)*4.75);   // one row: every unit as wide as the row allows
  root.querySelectorAll('.um-unit').forEach(u=>u.style.width=uw+'px');
  const mon=root.querySelector('.um-monw'),lab=sw.querySelector('.vh-lab'),r=row.getBoundingClientRect(),bottom=body.getBoundingClientRect().bottom-12;
  const avH=bottom-r.top;mon.style.width=Math.min(r.width*.26,(avH-18-40)*16/9)+'px';   // monitor: as big as the height allows
  const availW=r.width-mon.getBoundingClientRect().width-14,availH=bottom-r.top-(lab?lab.getBoundingClientRect().height+4:0);sw.style.width=Math.max(320,Math.min(availW,availH*1000/406))+'px';}
addEventListener('resize',fit);
window.openUltimatte=()=>{build();root.classList.add('on');renderUnits();requestAnimationFrame(fit);if(!ropes&&window.ROPES){ropes=ROPES({wrap:()=>document.getElementById('um-wrap'),svg:()=>document.getElementById('um-cables'),list:cableList,active:()=>root.classList.contains('on')&&side==='rear'&&!flipping,sig:()=>side+(window.VH?JSON.stringify([VH.state().cabIn,VH.state().cabOut]):'')});}ropes&&ropes.start();if(window.VH&&!document.getElementById('vh')?.dataset.built){openVideohub();closeVideohub();}if(!running){running=true;requestAnimationFrame(loop);}};
/* for the tutorials (tut-um.js): live state + the same actions as the controls */
window.ULT={U,R,MENUS,TABS,MONS,TL,knobsOf,srPress,touch,setVal,fnPress,autoKey,defV,defF};
window.closeUltimatte=()=>{root.classList.remove('on');document.getElementById('um-tip')?.classList.remove('on');};
})();
