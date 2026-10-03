/* Lighting desk: Showtec Showmaster 24 MKII, recreated from the studio desk photo + the official manual
 * (docs/showmaster24mkii-spec.md). Drives the studio lights drawn on the plan:
 *   faders 1-12  → chroma LED fixtures (intensity + colour temp), powered by the "LED" breaker;
 *   faders 13-24 → physical-set lamps through Datapak 2 ("Dimmers" breaker + its ELECTRONICS switch).
 * Programming (scenes/chases/pages) is drawn but not simulated yet. Things the manual doesn't state are
 * marked "inferred" in the tooltips. */
(function(){
const NS='http://www.w3.org/2000/svg';
/* ---------- rigging: ceiling bars traced from Alex's sketches (3-oct) ----------
 * Sketch coords → plan coords. Chroma sketch is drawn facing the chroma wall (plan north) → direct.
 * Set sketch is drawn facing the set wall (plan south) → rotated 180°.
 * Fixed rails, grey fixed pipes (set) and movable bars ("M": they slide along the two rails they ride). */
const MAPC=([x,y])=>[12+(x-80)*.486,12+(y-340)*.486], MAPS=([x,y])=>[210-(x-465)*.6,744-(y-250)*.393];
const BARS=[
  ['cV1','c',[435,360],[455,1075]],['cV2','c',[790,380],[825,1110]],['cV3','c',[108,615],[118,1035]],
  ['cH1','c',[380,450],[840,462]],['cH2','c',[380,595],[840,588]],['cH3','c',[400,838],[900,830]],['cH4','c',[100,1068],[840,1105]],['cH0','c',[115,620],[440,615]],
  ['cM1','c',[540,454],[540,592],'x',['cH1','cH2']],['cM2','c',[655,456],[655,590],'x',['cH1','cH2']],
  ['cM3','c',[113,660],[440,662],'y',['cV3','cV1']],['cM4','c',[115,745],[447,795],'y',['cV3','cV1']],
  ['cM5','c',[495,834],[358,1080],'x',['cH3','cH4']],['cM6','c',[575,833],[668,1095],'x',['cH3','cH4']],['cM7','c',[720,832],[733,1099],'x',['cH3','cH4']],
  ['sV1','s',[285,285],[325,1150]],['sV2','s',[683,285],[705,1140]],
  ['sH1','s',[170,290],[760,285]],['sH2','s',[200,445],[745,438]],['sG1','s',[230,560],[715,543],'grey'],['sH3','s',[220,652],[765,640]],
  ['sH4','s',[245,878],[762,875]],['sG2','s',[265,1075],[735,1043],'grey'],
  ['sM1','s',[450,289],[447,442],'x',['sH1','sH2']],
  ['sM2','s',[367,648],[370,877],'x',['sH3','sH4']],['sM3','s',[408,648],[408,877],'x',['sH3','sH4']],['sM4','s',[632,645],[562,877],'x',['sH3','sH4']]
].map(([id,z,a,b,m,ride])=>{const M=z==='c'?MAPC:MAPS;return {id,z,a:M(a),b:M(b),grey:m==='grey',m:m==='grey'?null:m,ride};});
/* cyc lights: three straight fixed grey bars set back from the cyclorama (left side, back wall, right side) */
BARS.push({id:'trayL',z:'c',a:[48,64],b:[48,128],tray:true,grey:true},{id:'trayB',z:'c',a:[64,50],b:[356,50],tray:true,grey:true},{id:'trayR',z:'c',a:[372,64],b:[372,128],tray:true,grey:true});
/* the 8 LED cyc panels ("PANELES CHROMA", faders 1-2): one per side, one per corner, four on the back wall */
const CYC=[['trayL',[48,96]],['trayB',[78,50]],['trayB',[130,50]],['trayB',[185,50]],['trayB',[240,50]],['trayB',[295,50]],['trayB',[342,50]],['trayR',[372,96]]];
const BAR=Object.fromEntries(BARS.map(b=>[b.id,b]));
/* fixtures: channel(s) from the desk tape; default bar + approximate spot (projected onto the bar) */
const FX=[
  ...CYC.map(([bar,at],i)=>({id:'pch'+(i+1),name:`Chroma cyc panel ${i+1}/8 — LED, on the cyc-light bars`,int:2,temp:1,zone:'c',bar,at,type:'cyc',lock:'tray'})),
  {id:'ciz',name:'Backlight left (chroma) — on the cyc-light bar',int:3,temp:4,zone:'c',bar:'trayB',at:[157,50],type:'fresnel',lock:'tray'},
  {id:'cdc',name:'Backlight right (chroma) — on the cyc-light bar',int:5,temp:6,zone:'c',bar:'trayB',at:[267,50],type:'fresnel',lock:'tray'},
  {id:'fiz',name:'Front left (chroma)',int:7,temp:8,zone:'c',bar:'cM5',at:[0,330],type:'fresnel'},
  {id:'fdc',name:'Front right (chroma)',int:9,temp:10,zone:'c',bar:'cM7',at:[0,330],type:'fresnel'},
  {id:'pfr',name:'Front panel left (chroma)',int:12,temp:11,zone:'c',bar:'cH4',at:[150,0],type:'panel'},
  {id:'pfr2',name:'Front panel right (chroma)',int:12,temp:11,zone:'c',bar:'cH4',at:[270,0],type:'panel'},
  {id:'s13',name:'Top light left',int:13,zone:'s',bar:'sH2',at:[290,0],type:'fresnel'},
  {id:'s14',name:'Top panels',int:14,zone:'s',bar:'sM1',at:[0,700],type:'panel'},
  {id:'s15',name:'Top light right',int:15,zone:'s',bar:'sH2',at:[130,0],type:'fresnel'},
  {id:'s16',name:'Backlight left',int:16,zone:'s',bar:'sH1',at:[300,0],type:'fresnel'},
  {id:'s17',name:'Backlight centre',int:17,zone:'s',bar:'sH1',at:[210,0],type:'fresnel'},
  {id:'s18',name:'Backlight right',int:18,zone:'s',bar:'sH1',at:[120,0],type:'fresnel'},
  {id:'s19',name:'“Butanito” high-angle left',int:19,zone:'s',bar:'sM2',at:[0,570],type:'fresnel'},
  {id:'s20',name:'“Butanito” high-angle right',int:20,zone:'s',bar:'sM4',at:[0,570],type:'fresnel'},
  {id:'s21',name:'“Butanito” front left',int:21,zone:'s',bar:'sM3',at:[0,520],type:'fresnel'},
  {id:'s22',name:'“Butanito” front right',int:22,zone:'s',bar:'sM4',at:[0,520],type:'fresnel'},
  {id:'s23',name:'Front 2 kW',int:23,zone:'s',bar:'sH4',at:[210,0],type:'big'},
  {id:'s24',name:'Panel (marked *)',int:24,zone:'s',bar:'sH3',at:[60,0],type:'panel'}
];
const ends=b=>{const v=o=>b.m==='x'?[o,0]:b.m==='y'?[0,o]:[0,0],da=v(b.oa||0),db=v(b.ob||0);return [[b.a[0]+da[0],b.a[1]+da[1]],[b.b[0]+db[0],b.b[1]+db[1]]];};
function proj(b,p){const [A,B]=ends(b),dx=B[0]-A[0],dy=B[1]-A[1];return Math.min(.97,Math.max(.03,((p[0]-A[0])*dx+(p[1]-A[1])*dy)/(dx*dx+dy*dy)));}
const ptOn=(b,t)=>{const [A,B]=ends(b);return [A[0]+(B[0]-A[0])*t,A[1]+(B[1]-A[1])*t];};
const pos=f=>{const [A,B]=ends(BAR[f.bar]);return [A[0]+(B[0]-A[0])*f.t,A[1]+(B[1]-A[1])*f.t];};
function defaults(){BARS.forEach(b=>b.oa=b.ob=0);
  FX.forEach(f=>{const b=BAR[f.bar=f.bar0||f.bar];f.bar0=f.bar;const [A,B]=ends(b);
    const p=f.at[0]===0?[A[0]+(B[0]-A[0])*((f.at[1]-A[1])/(B[1]-A[1])),f.at[1]]:f.at[1]===0?[f.at[0],A[1]+(B[1]-A[1])*((f.at[0]-A[0])/(B[0]-A[0]))]:f.at;
    f.t=proj(b,p);});}
/* range of each end along the slide axis: the extent of the rail that end rides on */
function endRange(b,end){const k=b.m==='x'?0:1,P=end==='a'?b.a:b.b,o=1-k;
  const r=b.ride.map(id=>BAR[id]).sort((r1,r2)=>Math.abs((r1.a[o]+r1.b[o])/2-P[o])-Math.abs((r2.a[o]+r2.b[o])/2-P[o]))[0];
  return [Math.min(r.a[k],r.b[k])+3-P[k],Math.max(r.a[k],r.b[k])-3-P[k]];}
const LKEY='tvs-layout';
function save(){try{localStorage.setItem(LKEY,JSON.stringify(layout()));}catch(e){}}
function layout(){return {bars:Object.fromEntries(BARS.filter(b=>b.m&&(b.oa||b.ob)).map(b=>[b.id,[+b.oa.toFixed(1),+b.ob.toFixed(1)]])),fx:Object.fromEntries(FX.map(f=>[f.id,[f.bar,+f.t.toFixed(3)]])),v:3};}
function load(L){if(!L)return;Object.entries(L.bars||{}).forEach(([id,o])=>{if(BAR[id]){const [x,y]=Array.isArray(o)?o:[o,o];BAR[id].oa=x;BAR[id].ob=y;}});
  Object.entries(L.fx||{}).forEach(([id,[bar,t]])=>{const f=FX.find(x=>x.id===id);if(f&&BAR[bar]&&(!f.lock||(BAR[bar].tray&&L.v===3))){f.bar=bar;f.t=t;}});}
defaults();try{load(JSON.parse(localStorage.getItem(LKEY)));}catch(e){}

const mix=(a,b,t)=>{const p=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));const A=p(a),B=p(b);
  return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join('');};
const LAYERS=[];
function fxLayer(svg,mini){
  const g=document.createElementNS(NS,'g');g.setAttribute('class','fx-layer'+(mini?' mini':''));
  const fid='fxb'+(mini?'m':'p');
  g.innerHTML=`<defs><filter id="${fid}" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="7"/></filter></defs><path class="fx-wash" data-wash="c" d="M12 130 V58 Q12 14 56 14 H364 Q408 14 408 58 V130 Z"/><g class="rig"></g><g class="fxs"></g>`;
  svg.appendChild(g);LAYERS.push({g,mini,fid});drawRig();}
function drawRig(){LAYERS.forEach(({g,mini,fid})=>{
  g.querySelector('.rig').innerHTML=BARS.map(b=>{const [A,B]=ends(b);const l=`x1="${A[0].toFixed(1)}" y1="${A[1].toFixed(1)}" x2="${B[0].toFixed(1)}" y2="${B[1].toFixed(1)}"`;
    return b.m?`<g class="bar mov" data-bar="${b.id}" data-name="Movable bar" data-tip="Drag the middle to slide it along its two rails · drag an end to angle it."><line class="bar-l" ${l}/><line class="bar-hit" ${l}></line>${[['a',A],['b',B]].map(([k,P])=>`<g class="bar-h" data-end="${k}"><circle class="bar-e" cx="${P[0]}" cy="${P[1]}" r="4.2"/><circle class="bar-eh" cx="${P[0]}" cy="${P[1]}" r="10"></circle></g>`).join('')}</g>`
      :`<line class="bar ${b.grey?'grey':'fix'}" ${l} data-name="${b.tray?'Cyc-light bar (fixed)':b.grey?'Fixed grey pipe':'Fixed rail'}" data-tip="${b.tray?'Fixed grey bar set back from the cyclorama: the 8 LED cyc panels + the two chroma backlights hang here.':'Fixed to the ceiling. Lights can hang from it.'}"></line>`;}).join('');
  g.querySelector('.fxs').innerHTML=FX.map(f=>{const [x,y]=pos(f);let core;
    if(f.type==='cyc'){const [A,B]=ends(BAR[f.bar]),a=Math.atan2(B[1]-A[1],B[0]-A[0])*180/Math.PI;core=`<rect class="fx-core" x="${x-9}" y="${y-3.5}" width="18" height="7" rx="1.5" transform="rotate(${a.toFixed(1)} ${x} ${y})"/>`;}
    else if(f.type==='panel')core=`<rect class="fx-core" x="${x-9}" y="${y-5}" width="18" height="10" rx="2"/>`;
    else core=`<circle class="fx-core" cx="${x}" cy="${y}" r="${f.type==='big'?8:6}"/>`;
    const glow=f.type==='cyc'?`<circle class="fx-glow" filter="url(#${fid})" cx="${x}" cy="${y}" r="20"/>`:`<circle class="fx-glow" filter="url(#${fid})" cx="${x}" cy="${y}" r="${f.type==='big'?34:26}"/>`;
    return `<g class="fx${f.fixed?' fixed':''}" data-fx="${f.id}" data-name="${f.name}">${glow}${core}${mini||f.type==='cyc'?'':`<text class="fx-n" x="${x}" y="${y+(f.type==='big'?20:18)}" text-anchor="middle">${f.int}</text>`}</g>`;}).join('');});
  lights();}
/* drag fixtures (snap to the nearest bar) and movable bars (slide along their rails) — plan only */
function initRigDrag(svg,always){
  const pt=e=>{const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const q=p.matrixTransform(svg.getScreenCTM().inverse());return [q.x,q.y];};
  svg.addEventListener('pointerdown',e=>{if(!always&&!document.body.classList.contains('sim'))return;
    const fg=e.target.closest('.fx-layer .fx'),bg=e.target.closest('.fx-layer .bar.mov');
    if(!fg&&!bg)return;e.preventDefault();e.stopPropagation();
    const p0=pt(e);let moved=false;try{svg.setPointerCapture(e.pointerId);}catch(_){}
    const f=fg&&FX.find(x=>x.id===fg.dataset.fx),b=bg&&BAR[bg.dataset.bar],end=bg&&e.target.closest('.bar-h')?.dataset.end,oa0=b?b.oa:0,ob0=b?b.ob:0;
    const mv=ev=>{const p=pt(ev);if(Math.hypot(p[0]-p0[0],p[1]-p0[1])>3)moved=true;if(!moved)return;
      if(f&&!f.fixed){let best=null;BARS.filter(x=>f.lock?x.tray:!x.tray).forEach(x=>{const t=proj(x,p),q=ptOn(x,t),d=Math.hypot(q[0]-p[0],q[1]-p[1]);if(!best||d<best.d)best={x,t,d};});
        f.bar=best.x.id;f.t=best.t;}
      if(b){const k=b.m==='x'?0:1,d=p[k]-p0[k],[la,ha]=endRange(b,'a'),[lb,hb]=endRange(b,'b'),cl=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
        if(end==='a')b.oa=cl(oa0+d,la,ha);else if(end==='b')b.ob=cl(ob0+d,lb,hb);
        else{const dd=cl(d,Math.max(la-oa0,lb-ob0),Math.min(ha-oa0,hb-ob0));b.oa=oa0+dd;b.ob=ob0+dd;}}
      drawRig();};
    const up=()=>{svg.removeEventListener('pointermove',mv);svg.removeEventListener('pointerup',up);svg.removeEventListener('pointercancel',up);
      if(moved)save();else if(f&&!always)window.openDesk();};
    svg.addEventListener('pointermove',mv);svg.addEventListener('pointerup',up);svg.addEventListener('pointercancel',up);},true);
  // a drag must not also open the zone card underneath
  svg.addEventListener('click',e=>{if(e.target.closest('.fx-layer'))e.stopPropagation();},true);}
window.RIG={reset(){FX.forEach(f=>f.bar=f.bar0);defaults();save();drawRig();},
  copy(){const j=JSON.stringify(layout());try{navigator.clipboard.writeText(j).catch(()=>{});}catch(e){}return j;},layout};

/* ---------- desk state ---------- */
const D={power:false,mode:'single',page:1,bo:false,kill:false,pct:true,disp:null,
  f:Array(24).fill(0),mA:0,mB:0,fade:0,speed:0,audio:0,   // fader positions: 0 = bottom, 1 = top (as in the photo)
  flash:new Set(),full:false,dark:false,btnA:false,shift:false};
const out=new Float32Array(24);window.DESK_OUT=out;
const MODES=['chase','double','single'];
function compute(){
  const A=D.mA,B=1-D.mB;   // Master B has a reversed scale: max at the bottom
  for(let i=0;i<24;i++){let v=0;
    if(D.mode==='single')v=D.f[i]*A;
    else if(D.mode==='double')v=i<12?Math.max(D.f[i]*A,D.f[i+12]*B):0;
    else v=i<12?D.f[i]*A:0;                 // chase/scenes: 13-24 are playbacks (no programs recorded)
    if(D.bo)v=0;
    const fl=D.mode==='double'?(D.flash.has(i)||D.flash.has(i+12))&&i<12:D.mode==='single'?D.flash.has(i):D.flash.has(i)&&i<12;
    if(fl||D.full||(D.btnA&&D.mode==='double'&&i<12))v=1;
    if(D.dark||!D.power)v=0;
    out[i]=v;}
}

/* ---------- desk SVG ---------- */
const CX=i=>82+(i%12)*42;
const TOPY0=142,TOPY1=268,BOTY0=410,BOTY1=536;
function seg(x,y){const s={a:[x+3,y,14,3.4],d:[x+3,y+32.6,14,3.4],g:[x+3,y+16.3,14,3.4],f:[x,y+2,3.4,15],b:[x+16.6,y+2,3.4,15],e:[x,y+19,3.4,15],c:[x+16.6,y+19,3.4,15]};
  return Object.entries(s).map(([k,[a,b,w,h]])=>`<rect class="sg" data-s="${k}" x="${a}" y="${b}" width="${w}" height="${h}" rx="1.2"/>`).join('');}
function fader(id,x,y0,y1,name,tip,scale){let s=`<g class="dk-f" data-f="${id}" data-name="${name}" data-tip="${tip}">`;
  for(let k=0;k<=10;k++){const y=y1-(y1-y0)*k/10;s+=`<line x1="${x-14}" y1="${y}" x2="${x-7}" y2="${y}" class="tick"/><line x1="${x+7}" y1="${y}" x2="${x+14}" y2="${y}" class="tick"/>`;}
  if(scale){const [t,m,b]=scale;s+=`<text class="sc" x="${x-17}" y="${y0+3}" text-anchor="end">${t}</text><text class="sc" x="${x-17}" y="${(y0+y1)/2+3}" text-anchor="end">${m}</text><text class="sc" x="${x-17}" y="${y1+3}" text-anchor="end">${b}</text>`;}
  s+=`<rect x="${x-2.5}" y="${y0-4}" width="5" height="${y1-y0+8}" rx="2" fill="#0d0d10"/><g class="cap"><rect x="${x-11}" y="-14" width="22" height="28" rx="3" fill="#d6d5d0" stroke="#8d8c86"/><rect x="${x-11}" y="-1" width="22" height="2" fill="#a9a8a2"/><rect x="${x-7}" y="-9" width="14" height="1.6" fill="#b5b4ae"/><rect x="${x-7}" y="-5.5" width="14" height="1.6" fill="#b5b4ae"/></g>`;
  return s+`<rect class="hit" x="${x-16}" y="${y0-16}" width="32" height="${y1-y0+32}" fill="transparent"/></g>`;}
function btn(id,x,y,name,tip,w=34){return `<g class="dk-b" data-b="${id}" data-name="${name}" data-tip="${tip}"><rect x="${x-w/2}" y="${y-11}" width="${w}" height="22" rx="6" fill="#d9d8d3" stroke="#8f8e88"/><path d="M${x-6} ${y-4}v8M${x} ${y-4}v8M${x+6} ${y-4}v8" stroke="#b3b2ac" stroke-width="1.4"/></g>`;}
const led=(id,x,y,r=4)=>`<circle class="dl" data-l="${id}" cx="${x}" cy="${y}" r="${r}"/>`;
const T=(x,y,t,a='middle',c='lb')=>`<text class="${c}" x="${x}" y="${y}" text-anchor="${a}">${t}</text>`;
const tape=(x,y,w,h,rot=0)=>`<rect class="tape" x="${x}" y="${y}" width="${w}" height="${h}" transform="rotate(${rot} ${x+w/2} ${y+h/2})"/>`;
const hw=(x,y,t,size=9.5,rot=0,a='middle')=>`<text class="hw" x="${x}" y="${y}" font-size="${size}" text-anchor="${a}"${rot?` transform="rotate(${rot} ${x} ${y})"`:''}>${t}</text>`;

const TIP={
  ch:'Channel fader: sets the level of this channel (0 at the bottom, 10 = 100 % = DMX 255 at the top).',
  flash:'Flash: puts this channel at full while held. Not affected by the masters or BLACK OUT (hold time inferred).',
  mA:'Master A: global level of the channels (0 bottom, 10 top). If it is down, nothing lights up. ⬆ the teacher\'s arrow.',
  mB:'Master B — reversed scale: 0 at the TOP, max at the BOTTOM. Controls programs/chases; in DOUBLE PRESET it controls the bottom row.',
  fade:'FADE: fade time for scenes/programs, from instant (MIN, top) to 10 minutes (MAX, bottom). Not simulated yet.',
  speed:'SPEED: chase speed. All the way down = manual step mode with STEP. Not simulated yet.',
  audio:'AUDIO LEVEL: sensitivity of the audio input for music-triggered chases. Not simulated yet.',
  bo:'BLACK OUT: cuts the whole output (toggle, LED on while active) — except flash buttons and FULL-ON.',
  full:'FULL-ON: every channel at full while held (inferred: momentary). Not affected by masters or BLACK OUT.',
  dark:'DARK: temporary black-out of everything while held (inferred: momentary, also kills flashes).',
  mode:'MODE SELECT: cycles CHASE/SCENES → DOUBLE PRESET → 1-24 SINGLE PRESET. Below: REC SPEED (programming).',
  page:'PAGE: chooses memory page 1-4 (LEDs under DELETE). With SHIFT/RECORD: REC/CLEAR.',
  addkill:'ADD/KILL: Add (LED off) = flashes add up; Kill (LED on) = a flash cuts the other scenes. With SHIFT/RECORD: REC/EXIT.',
  record:'RECORD: enters record mode (with a code) and records steps. Held = SHIFT for the functions printed below other buttons. Here: click it once to latch SHIFT (LED on), then click the other button — or hold the R key.',
  insert:'INSERT: inserts a step in Edit mode. SHIFT/RECORD + INSERT = % OR 255: display in percent or DMX value (0-255). Here: click RECORD, then INSERT — or keys R + I.',
  down:'DOWN: lowers the level in Edit mode. Below: BEAT REV — reverses programs on the standard beat.',
  up:'UP: raises the level in Edit mode. Below: CHASE REV — reverses all programs on the SPEED fader.',
  del:'DELETE: deletes the current step in Edit mode. Below: REV ONE — reverses one program.',
  edit:'EDIT: Edit mode (hold EDIT + the program\'s flash). Below: ALL REV — reverses every program.',
  btnA:'Button A ("Master A button"): channels 1-12 to full. Most likely acts in DOUBLE PRESET (inferred).',
  park:'PARK / B: in CHASE/SCENES chooses SINGLE or MIX CHASE; in SINGLE PRESET parks the current output on Master B. Not simulated yet.',
  hold:'HOLD: freezes the current scene (the chase stops on its step). Not simulated yet.',
  step:'STEP: next step when SPEED is all the way down, or in Edit mode. LEDs below: 5MIN / 10MIN speed range. Not simulated yet.',
  audiob:'AUDIO: chases follow the music (audio input / built-in mic). Not simulated yet.',
  blind:'BLIND: hold + a flash takes that channel out of the running chase (manual control). Not simulated yet.',
  home:'HOME: hold + a flash gives the channel back to the chase (cancels BLIND). Not simulated yet.',
  tap:'TAP SYNC: tap twice to set the chase speed. Not simulated yet.',
  disp:'Display: shows the level of the fader you move — in % or 0-255 (DIMMER LED on). Power-on content not documented.'
};
function deskSvg(){let s=`<svg class="dk-svg" viewBox="0 0 1000 690" role="img" aria-label="Showtec Showmaster 24 MKII">`;
  s+=`<rect x="4" y="18" width="992" height="652" rx="46" fill="#26272b" stroke="#111"/><rect x="40" y="48" width="920" height="592" rx="10" fill="#6e7177" stroke="#4a4c51"/>`;
  s+=`<path d="M46 318H592" stroke="#3a3c41" stroke-width="2"/><rect x="600" y="62" width="352" height="566" rx="8" fill="none" stroke="#2f3135" stroke-width="2"/>`;
  // channel strips
  for(let i=0;i<24;i++){const x=CX(i),top=i<12,y0=top?TOPY0:BOTY0,y1=top?TOPY1:BOTY1,by=top?96:338;
    s+=`<rect x="${x-14}" y="${by}" width="28" height="30" rx="4" fill="#2a2b30"/>${T(x,by+11,i+1,'middle','num')}${led('c'+i,x,by+20,3.6)}`;
    if(!top)s+=led('sc'+(i-12),x,380,3.2)+T(x,393,i-11,'middle','sm');
    s+=fader('c'+i,x,y0,y1,`Channel ${i+1}`,TIP.ch);
    s+=btn('fl'+i,x,top?292:560,`Flash ${i+1}`,TIP.flash,30);}
  s+=T(316,402,'SCENES','middle','sm');
  // masking-tape labels (as on the real desk)
  s+=tape(56,54,530,36,-.4)+tape(270,24,190,30,-1);
  s+=hw(365,45,'CHROMA  SET',15,-1);
  [['PANELES CHROMA',0],['CONTRA IZQ',2],['CONTRA DCH',4],['FRONTAL IZQ',6],['FRONTAL DCH',8],['PANELES FRONTALES',10]].forEach(([t,i])=>{s+=hw((CX(i)+CX(i+1))/2,66,t,8.6);s+=`<line x1="${CX(i)-21}" y1="57" x2="${CX(i)-21}" y2="88" class="hwl"/>`;});
  ['TEMP','INTENSIDAD','INTENSIDAD','TEMP','INTENSIDAD','TEMP','INTENSIDAD','TEMP','INTENSIDAD','TEMP','TEMP','INTENSIDAD'].forEach((t,i)=>s+=hw(CX(i),83,t,t==='TEMP'?8:6.6,t==='TEMP'?0:-12));
  s+=tape(52,578,540,50,.3)+tape(232,630,200,36,-.5);
  [['CENITAL','IZQ'],['PANELES','CENITALES','*'],['CENITAL','DCH'],['CONTRA','IZQ'],['CONTRA','CENTRO'],['CONTRA','DCH'],['BUTANITO','PICADO','IZQ'],['BUTANITO','PICADO','DCH'],['BUTANITO','FRONTAL','IZQ'],['BUTANITO','FRONTAL','DCH'],['FRONTAL','2KW'],['PANEL','MARGINADO','*']].forEach((l,i)=>{
    l.forEach((t,k)=>s+=t==='*'?`<text x="${CX(i)}" y="${600+k*12}" text-anchor="middle" fill="#e0242a" font-size="13">*</text>`:hw(CX(i),593+k*11,t,t.length>8?6.4:7.6));
    if(i)s+=`<line x1="${CX(i)-21}" y1="582" x2="${CX(i)-21}" y2="624" class="hwl"/>`;});
  s+=hw(332,656,'SET FÍSICO  ☺',17);
  // control section
  s+=T(776,80,'SHOWMASTER 24 MKII','middle','title');
  [['REC STEP','rs'],['DIMMER','dim'],['SPEED TIME','spt'],['FADE TIME','fdt']].forEach(([t,k],i)=>s+=led(k,628,100+i*14,3.6)+T(637,103.5+i*14,t,'start','sm'));
  s+=`<g data-name="Display" data-tip="${TIP.disp}"><rect x="716" y="94" width="78" height="46" rx="3" fill="#07110b" stroke="#1d2a22"/>${seg(722,99)}${seg(746,99)}${seg(770,99)}</g>`;
  s+=`<ellipse cx="886" cy="118" rx="54" ry="16" fill="none" stroke="#222" stroke-width="2.4"/><text x="886" y="124" text-anchor="middle" font-size="17" font-weight="900" font-style="italic" fill="#1d1e22">Showtec</text>`;
  const row=(y,items)=>items.forEach(([id,x,top,bot,tip])=>{s+=btn(id,x,y,top||bot||id,tip);if(top)s+=T(x,y-15,top,'middle','sm');if(bot)s+=T(x,y+23,bot,'middle','sm');});
  row(182,[['down',628,'DOWN','BEAT REV',TIP.down],['up',698,'UP','CHASE REV',TIP.up],['del',768,'DELETE','REV ONE',TIP.del],['insert',838,'INSERT','% OR 255',TIP.insert],['edit',908,'EDIT','ALL REV',TIP.edit]]);
  [1,2,3,4].forEach(p=>s+=led('pg'+p,750+(p-1)*12,222,3.4)+T(750+(p-1)*12,233,p,'middle','xs'));
  s+=led('addkill',838,222,3.6)+led('record',908,222,3.6);
  row(260,[['dark',628,'DARK','',TIP.dark],['mode',698,'MODE SELECT','REC SPEED',TIP.mode],['page',768,'PAGE','REC/CLEAR',TIP.page],['addkill',838,'ADD/KILL','REC/EXIT',TIP.addkill],['record',908,'RECORD','SHIFT',TIP.record]]);
  [['CHASE','◄  ►  SCENES','chase'],['A  DOUBLE','PRESET  B','double'],['1-24  SINGLE','PRESET  PARK','single']].forEach(([l,r,k],i)=>{const y=304+i*14;s+=T(660,y+3,l,'end','sm')+led('m_'+k,668,y,3.6)+T(677,y+3,r,'start','sm');});
  [['SINGLE CHASE','sch'],['MIX CHASE','mch'],['','pk']].forEach(([t,k],i)=>s+=led(k,790,300+i*13,3.4)+T(799,303+i*13,t,'start','sm'));
  row(352,[['btnA',628,'','',TIP.btnA],['park',698,'','',TIP.park],['hold',768,'HOLD','',TIP.hold],['step',838,'STEP','',TIP.step],['audiob',908,'AUDIO','',TIP.audiob]]);
  s+=led('step',838,326,3.4)+led('audio',908,326,3.4)+led('5m',815,384,3.4)+T(806,387,'5MIN','end','xs')+led('10m',862,384,3.4)+T(871,387,'10MIN','start','xs');
  s+=T(672,420,'MASTER','middle','lb2')+T(770,420,'FADE','middle','lb2')+T(840,420,'SPEED','middle','lb2')+T(910,420,'AUDIO LEVEL','middle','lb2');
  s+=`<path d="M660 440h24v116h-24z" fill="#2a2b30"/><path d="M660 556 L684 440" stroke="#6e7177" stroke-width="4"/>`;
  s+=fader('mA',640,440,556,'Master A',TIP.mA,['10','5','0'])+fader('mB',704,440,556,'Master B',TIP.mB,['0','5','10'])+fader('fade',770,440,556,'Fade',TIP.fade,['MIN','','MAX'])+fader('speed',840,440,556,'Speed',TIP.speed)+fader('audio',910,440,556,'Audio level',TIP.audio,['10','5','0']);
  s+=T(624,566,'A','middle','lb2')+T(722,566,'B','middle','lb2');
  [['blind',640,'BLIND'],['home',704,'HOME'],['tap',770,'TAP SYNC'],['full',840,'FULL-ON'],['bo',910,'BLACK OUT']].forEach(([id,x,t])=>{s+=btn(id,x,592,t,TIP[id]);s+=`<rect x="${x-26}" y="606" width="52" height="${t.includes(' ')?20:14}" rx="2" fill="#151619"/>`+(t.includes(' ')?T(x,615,t.split(' ')[0],'middle','wt')+T(x,623,t.split(' ')[1],'middle','wt'):T(x,616,t,'middle','wt'));});
  s+=led('bo',884,580,3.6);
  for(let i=0;i<24;i++){const top=i<12;s+=`<rect class="strip-hl" data-ch="${i+1}" x="${CX(i)-20}" y="${top?50:328}" width="40" height="${top?256:304}" rx="6"/>`;}
  // teacher's arrows (masking tape notes on the real desk)
  const ar=(x,y,rot,lab='')=>`<g class="dk-arrow"><rect class="tape" x="${x-16}" y="${y-11}" width="32" height="22" transform="rotate(${rot/8} ${x} ${y})"/><text class="hw" x="${x}" y="${y+5}" font-size="14" text-anchor="middle">${lab}</text></g>`;
  s+=ar(608,114,0,'→')+ar(726,226,0,'1→')+ar(613,330,0,'→')+ar(890,307,0,'←')+ar(790,368,0,'↘')+ar(620,438,0,'↑')+ar(740,440,0,'↑');
  return s+'</svg>';}

function rearSvg(){const tip=(n,t,inner)=>`<g data-name="${n}" data-tip="${t}">${inner}</g>`;
  let s=`<svg class="dk-rear" viewBox="0 0 1000 120" role="img" aria-label="Rear panel"><rect x="2" y="6" width="996" height="108" rx="8" fill="#55585e" stroke="#2c2e33"/>`;
  s+=tip('DC input','12-18 V DC, 500 mA min — from a small external power adapter (the desk does not need the breaker board).',`<rect x="22" y="44" width="110" height="34" fill="none" stroke="#e8e8e8"/>${T(77,58,'DC Input:','middle','wt')}${T(77,71,'12-18VDC, 500mA Min','middle','wt')}`);
  s+=`<g class="dk-power" data-name="POWER switch" data-tip="Switches the desk on and off. Click it!"><rect x="150" y="38" width="40" height="40" rx="3" fill="#111"/><rect class="pw-r1" x="155" y="43" width="15" height="30" rx="2"/><rect class="pw-r2" x="170" y="43" width="15" height="30" rx="2"/>${T(162,62,'I','middle','wt')}${T(178,62,'O','middle','wt')}${T(170,96,'POWER','middle','wt')}</g>`;
  s+=tip('DC IN (plugged)','Power plug from the adapter.',`<circle cx="226" cy="58" r="15" fill="#111" stroke="#888"/><circle cx="226" cy="58" r="6" fill="#333"/><path d="M226 73 C 220 100, 160 110, 120 116" stroke="#111" stroke-width="3" fill="none"/>${T(250,96,'DC IN','middle','wt')}`);
  [['THRU',300],['OUT',350],['IN',400]].forEach(([t,x])=>s+=tip('MIDI '+t,'MIDI connection (to trigger the desk from a computer/keyboard). Not used in the studio.',`<circle cx="${x}" cy="58" r="17" fill="#1a1a1c" stroke="#999"/>${[0,1,2,3,4].map(k=>`<circle cx="${x+10*Math.cos(Math.PI*(0.15+k*0.175))}" cy="${58-10*Math.sin(Math.PI*(0.15+k*0.175))}" r="1.8" fill="#888"/>`).join('')}${T(x,92,t,'middle','wt')}`));
  s+=T(350,104,'MIDI','middle','wt');
  s+=tip('DMX OUT (plugged)','DMX512 output, XLR 3-pin (1 = ground, 2 = Data−, 3 = Data+). This cable carries the 24 channels to the LED lights and the Datapak dimmers.',`<circle cx="470" cy="58" r="20" fill="#151517" stroke="#bbb" stroke-width="2"/><circle cx="470" cy="58" r="13" fill="#2a2a2e"/><path d="M470 78 C 470 100, 440 108, 420 118" stroke="#111" stroke-width="7" fill="none"/>${T(508,92,'DMX OUT','middle','wt')}${T(540,52,'1=Ground','start','xsw')}${T(540,62,'2=Data−','start','xsw')}${T(540,72,'3=Data+','start','xsw')}`);
  s+=tip('AUDIO','Line audio input (RCA, 0.1-1 Vpp) for music-driven chases.',`<circle cx="640" cy="56" r="11" fill="#c22" stroke="#ddd"/><circle cx="640" cy="56" r="4" fill="#111"/>${T(640,92,'AUDIO','middle','wt')}`);
  s+=tip('REMOTE','1/4" stereo jack: remote FULL-ON and BLACK OUT.',`<circle cx="700" cy="56" r="11" fill="#b89a52" stroke="#ddd"/><circle cx="700" cy="56" r="5" fill="#111"/>${T(700,92,'REMOTE','middle','wt')}`);
  s+=`<rect x="740" y="34" width="92" height="56" fill="none" stroke="#e8e8e8"/>${T(786,47,'Audio: Line IN 0.1-1Vp-p','middle','xsw')}${T(786,59,'Remote: 1/4" stereo jack','middle','xsw')}${T(786,71,'Full on · Black out · GND','middle','xsw')}`;
  s+=T(870,64,'CE  ♻','middle','wt')+`<rect x="905" y="40" width="80" height="40" fill="#f2f2ee"/>${T(945,56,'Series Number','middle','xsb')}${T(945,70,'…0830 1122','middle','xsb')}`;
  return s+'</svg>';}

function miniStudio(){return `<svg class="dk-studio" viewBox="-6 -24 432 784" role="img" aria-label="Studio lights"><rect x="0" y="0" width="420" height="750" rx="16" fill="#141519" stroke="#26272f" stroke-width="1.5"/>
  <text x="2" y="-8" class="ms-h">STUDIO · lights</text></svg>`;}
/* ---------- render ---------- */
const root=document.getElementById('dsk'),tip=document.getElementById('dsk-tip');
let svg,rear;
const DIG={'0':'abcdef','1':'bc','2':'abged','3':'abgcd','4':'fgbc','5':'afgcd','6':'afgedc','7':'abc','8':'abcdefg','9':'abcdfg','-':'g',' ':''};
function render(){compute();
  if(svg){const on=D.power;
    svg.classList.toggle('off',!on);
    svg.querySelectorAll('.dk-f').forEach(g=>{const id=g.dataset.f,t=id[0]==='c'&&id!=='c'?D.f[+id.slice(1)]:D[id];const y0=+g.querySelector('.hit').getAttribute('y')+16,y1=y0+(+g.querySelector('.hit').getAttribute('height'))-32;
      g.querySelector('.cap').setAttribute('transform',`translate(0,${y1-(y1-y0)*t})`);});
    const L=(k,v)=>{const e=svg.querySelector(`[data-l="${k}"]`);if(e){e.style.opacity=on&&v?(typeof v==='number'?0.25+0.75*v:1):'';e.classList.toggle('lit',!!(on&&v));}};
    for(let i=0;i<24;i++)L('c'+i,out[i]>0.01?out[i]:0);
    for(let i=0;i<12;i++)L('sc'+i,0);
    MODES.forEach(m=>L('m_'+m,D.mode===m));[1,2,3,4].forEach(p=>L('pg'+p,D.page===p));
    L('dim',true);L('bo',D.bo);L('addkill',D.kill);L('record',D.shift);L('sch',D.mode==='chase');
    const txt=!on?'   ':D.disp===null?'  0':String(Math.round(D.disp*(D.pct?100:255))).padStart(3,' ');
    svg.querySelectorAll('.sg').forEach((r,i)=>{const d=txt[Math.floor(i/7)];r.classList.toggle('lit',DIG[d].includes(r.dataset.s));});
    rear.classList.toggle('on',on);}
  lights();diag();document.dispatchEvent(new Event('desk-change'));}
function lights(){const P=window.PWR||{};const chroma=P.rcd&&P.led,set=P.rcd&&P.dim&&P.dpE1;
  const lv={};FX.forEach(f=>{const l=(f.zone==='c'?chroma:set)?out[f.int-1]:0,t=f.temp?out[f.temp-1]:0;
    const col=f.zone==='c'?mix('#ffb066','#dce8ff',t):mix('#ff7a1e','#ffd8a0',l);lv[f.id]=l;
    document.querySelectorAll(`.fx[data-fx="${f.id}"]`).forEach(g=>{g.style.setProperty('--l',l.toFixed(3));g.style.setProperty('--c',col);g.classList.toggle('lit',l>0.01);});});
  const cw=Math.max(...FX.filter(f=>f.type==='cyc').map(f=>lv[f.id]));
  document.querySelectorAll('[data-wash="c"]').forEach(r=>r.style.opacity=(cw*0.55).toFixed(3));
}
function diag(){const el=document.getElementById('dsk-diag');if(!el)return;const P=window.PWR||{};
  const it=(ok,t)=>`<span class="pw-chip ${ok?'ok':'bad'}"><i></i>${t}</span>`;
  el.innerHTML=it(D.power,'Desk POWER (rear)')+it(D.mA>0.02,'Master A up')+it(!D.bo,'BLACK OUT off')+it(D.mode==='single','Mode 1-24 SINGLE')+
    it(P.rcd&&P.led,'Chroma power · RCD + “LED”')+it(P.rcd&&P.dim&&P.dpE1,'Set power · “Dimmers” + Datapak 2 ELECTRONICS');}

/* ---------- interaction ---------- */
function ptT(e,g){const hit=g.querySelector('.hit'),y0=+hit.getAttribute('y')+16,y1=y0+(+hit.getAttribute('height'))-32;
  const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const q=p.matrixTransform(svg.getScreenCTM().inverse());return Math.min(1,Math.max(0,(y1-q.y)/(y1-y0)));}
function setF(id,t){if(id[0]==='c'&&/^c\d+$/.test(id)){D.f[+id.slice(1)]=t;D.disp=t;}else{D[id]=t;if(id==='mA')D.disp=t;if(id==='mB')D.disp=1-t;}render();}
function press(id,down){
  if(id.startsWith('fl')){const i=+id.slice(2);down?D.flash.add(i):D.flash.delete(i);return render();}
  if(id==='full'){D.full=down;return render();}
  if(id==='dark'){D.dark=down;return render();}
  if(id==='btnA'){D.btnA=down;return render();}
  if(id==='record'){if(down&&D.power){D.shift=!D.shift;D.shiftKey=false;}return render();}
  if(!down||!D.power)return;
  if(id==='bo')D.bo=!D.bo;
  else if(id==='mode')D.mode=MODES[(MODES.indexOf(D.mode)+1)%3];
  else if(id==='page'&&!D.shift)D.page=D.page%4+1;
  else if(id==='addkill'&&!D.shift)D.kill=!D.kill;
  else if(id==='insert'&&D.shift)D.pct=!D.pct;
  if(D.shift&&!D.shiftKey)D.shift=false;
  render();}
/* keyboard: hold R = SHIFT (RECORD), I = INSERT — so SHIFT + INSERT (% or 255) works without two mouse buttons */
addEventListener('keydown',e=>{if(!root.classList.contains('on')||e.metaKey||e.ctrlKey||e.altKey||e.repeat)return;const k=e.key.toLowerCase();
  if(k==='r'&&D.power){D.shift=D.shiftKey=true;render();}else if(k==='i')press('insert',true);});
addEventListener('keyup',e=>{if(e.key.toLowerCase()==='r'&&D.shiftKey){D.shift=D.shiftKey=false;render();}});
function build(){if(root.dataset.built)return;root.dataset.built='1';
  document.getElementById('dsk-front').innerHTML=deskSvg();document.getElementById('dsk-back').innerHTML=rearSvg();
  document.getElementById('dsk-mini').innerHTML=miniStudio();const ms=document.querySelector('.dk-studio');
  ['croma','decorado'].forEach(k=>{const z=document.querySelector(`svg.plan .zone[data-k="${k}"] .art`);if(z)ms.insertBefore(z.cloneNode(true),ms.querySelector('.ms-h'));});
  fxLayer(ms,true);initRigDrag(ms,true);
  svg=root.querySelector('.dk-svg');rear=root.querySelector('.dk-rear');
  svg.addEventListener('pointerdown',e=>{const f=e.target.closest('.dk-f');
    if(f){e.preventDefault();f.setPointerCapture(e.pointerId);setF(f.dataset.f,ptT(e,f));
      const mv=ev=>setF(f.dataset.f,ptT(ev,f)),up=()=>{f.removeEventListener('pointermove',mv);f.removeEventListener('pointerup',up);f.removeEventListener('pointercancel',up);};
      f.addEventListener('pointermove',mv);f.addEventListener('pointerup',up);f.addEventListener('pointercancel',up);return;}
    const b=e.target.closest('.dk-b');if(!b)return;e.preventDefault();b.setPointerCapture(e.pointerId);b.classList.add('down');press(b.dataset.b,true);
    const up=()=>{b.classList.remove('down');press(b.dataset.b,false);b.removeEventListener('pointerup',up);b.removeEventListener('pointercancel',up);};
    b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);});
  rear.querySelector('.dk-power').addEventListener('click',()=>{D.power=!D.power;if(!D.power){D.flash.clear();D.full=D.dark=D.btnA=D.shift=false;}render();});
  let hlKey='';
  const hl=(chs,fxs)=>{const k=chs.join()+'|'+fxs.join();if(k===hlKey)return;hlKey=k;
    root.querySelectorAll('.strip-hl.on,.fx.hl').forEach(x=>x.classList.remove('on','hl'));
    chs.forEach(c=>root.querySelector(`.strip-hl[data-ch="${c}"]`)?.classList.add('on'));
    fxs.forEach(id=>root.querySelectorAll(`.fx[data-fx="${id}"]`).forEach(x=>x.classList.add('hl')));};
  const barName=id=>{const b=BAR[id];return b.tray?'a fixed cyc-light bar':b.m?'a movable bar':b.grey?'a fixed grey pipe':'a fixed rail';};
  root.addEventListener('mousemove',e=>{const m=e.target.closest('[data-name]');if(!m||!root.contains(m)){tip.classList.remove('on');hl([],[]);return;}
    let tipTxt=m.dataset.tip||'';
    if(m.matches('.fx')){const f=FX.find(x=>x.id===m.dataset.fx),pct=v=>Math.round(v*100)+' %';
      tipTxt=`Fader ${f.int} = intensity (now ${pct(out[f.int-1])})`+(f.temp?` · fader ${f.temp} = colour temperature`:'')+
        `<br>${f.zone==='c'?'LED · powered by the “LED” breaker':'Dimmed by Datapak 2 · “Dimmers” breaker'} · hangs on ${barName(f.bar)}`+(f.fixed?'':f.lock?' — drag to slide it along the cyc-light bars':' — drag to move it');
      hl([f.int,f.temp].filter(Boolean),[f.id]);}
    else{const id=m.dataset.f||m.dataset.b||'',ch=/^c\d+$/.test(id)?+id.slice(1)+1:/^fl\d+$/.test(id)?+id.slice(2)+1:0;
      if(ch){const fx=FX.filter(f=>f.int===ch||f.temp===ch);hl([ch],fx.map(f=>f.id));
        if(fx.length)tipTxt+=`<br><b style="display:inline">Controls:</b> ${fx.map(f=>f.name+(f.temp===ch?' (colour temp)':' (intensity)')).join(', ')}`;}
      else hl([],[]);}
    tip.innerHTML=`<b>${m.dataset.name}</b>${tipTxt?`<span>${tipTxt}</span>`:''}`;tip.style.left=e.clientX+'px';tip.style.top=e.clientY+'px';tip.classList.add('on');});
  root.addEventListener('mouseleave',()=>{tip.classList.remove('on');hl([],[]);});
  document.getElementById('dk-arrows').addEventListener('click',e=>{const on=svg.classList.toggle('noarrows');e.currentTarget.textContent=on?'Show teacher\'s arrows':'Hide teacher\'s arrows';});
  document.getElementById('dk-power').addEventListener('click',()=>window.openPower());
  document.getElementById('dk-close').addEventListener('click',()=>window.closeDesk());
  document.getElementById('dk-reset').addEventListener('click',()=>window.RIG.reset());
  document.getElementById('dk-copy').addEventListener('click',e=>{window.RIG.copy();const b=e.currentTarget;b.textContent='Copied ✓';setTimeout(()=>b.textContent='Copy positions',1600);});
  render();}
document.addEventListener('power-change',()=>{lights();diag();});
/* fit the desk (rear + front) to the free space: as big as the window allows */
function fit(){if(!root.classList.contains('on')||matchMedia('(max-width:900px)').matches)return;
  const main=root.querySelector('.dsk-main'),body=root.querySelector('.dsk-body'),cs=getComputedStyle(body);
  const h=body.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom)-6,w=main.clientWidth;
  const W=Math.floor(Math.min(w,h*1000/810));['dsk-back','dsk-front'].forEach(id=>document.getElementById(id).style.width=W+'px');}
addEventListener('resize',fit);
window.openDesk=()=>{build();root.classList.add('on');render();fit();};
window.closeDesk=()=>{root.classList.remove('on');tip.classList.remove('on');};
})();
