/* Ultimatte tutorials: Ultimatte 12 HD unit 1 (camera 1) driven from the Smart Remote 4. Engine: tutorial.js.
 * Each lesson spoils one thing of unit 1 for the student to fix; unit 1 is put back as it was when the lesson ends.
 * The remote's touchscreen is a canvas: its buttons are highlighted with boxes drawn over it ("zones"). */
(function(){
const W=TUT.W,X=()=>window.ULT,u1=()=>X().U[0];
let snap=null;
function reset(){const x=X();if(!x)return;const u=u1();snap=JSON.stringify({v:u.v,f:u.f,ch:u.ch,backing:u.backing,mon:u.mon,quick:u.quick,preset:u.preset});
  u.v=x.defV();u.f=x.defF();u.ch=1;u.quick={};u.preset=0;u.mon=0;u.lock=false;u.menu=null;
  Object.assign(x.R,{unit:0,tab:'MATTE',alt:false,grp:Object.fromEntries(x.TABS.map(t=>[t,Object.keys(x.MENUS[t])[0]]))});}
function cleanup(){if(!snap)return;const s=JSON.parse(snap),u=u1();Object.assign(u,s);snap=null;}
/* touchscreen geometry (800×500 canvas units) */
const cellOf=(L,j)=>({x:L.x+(j%L.per)*L.dx,y:L.y+Math.floor(j/L.per)*L.dy,w:L.w,h:L.h});
function rectOf(k){const x=X(),[kind,a,b]=k.split(/[:/]/);
  if(kind==='tab'){const i=x.TABS.indexOf(a);return{x:150+i*84,y:2,w:80,h:36};}
  if(kind==='auto')return{x:375,y:48,w:85,h:20};
  if(kind==='grp')return cellOf(x.TL.grp,Object.keys(x.MENUS[a]).indexOf(b));
  if(kind==='fn'){const g=x.MENUS[a][b];return cellOf(x.TL.fn,g.f.findIndex(f=>f.id===k.split('/')[2]));}
  if(kind==='mon')return cellOf(x.TL.mon,+a);
  if(kind==='uunit')return{x:150+(+a)*62,y:466,w:60,h:32};}
function zone(k){const c=document.getElementById('um-touch'),r=c&&c.getBoundingClientRect(),q=rectOf(k);if(!r||!q)return[];
  let z=document.querySelector(`.tut-zone[data-z="${CSS.escape(k)}"]`);if(!z){z=document.createElement('div');z.className='tut-zone';z.dataset.z=k;document.body.appendChild(z);}
  const sx=r.width/800,sy=r.height/500;Object.assign(z.style,{left:r.left+q.x*sx+'px',top:r.top+q.y*sy+'px',width:q.w*sx+'px',height:q.h*sy+'px'});return[z];}
const key=k=>/^(tab|auto|grp|fn|mon|uunit):?/.test(k)?zone(k):k.startsWith('sr:')?document.querySelectorAll(`#um-sr .um-sr[data-k="${k.slice(3)}"]`):
  k.startsWith('k:')?document.querySelectorAll(`#um-sr .um-srk[data-n="${k.slice(2)}"]`):k==='mon'?document.querySelectorAll('#um-mon'):[];
const centre=k=>{const q=rectOf(k);return[q.x+q.w/2,q.y+q.h/2];};
async function act(a){const x=X();
  if(a.touch){x.touch(...centre(a.touch));await W(250);}
  else if(a.sr){key('sr:'+a.sr).forEach(e=>e.classList.add('down'));x.srPress(a.sr);await W(220);key('sr:'+a.sr).forEach(e=>e.classList.remove('down'));}
  else if(a.knob!=null){for(let i=0;i<(a.n||1);i++){x.setVal(a.knob,a.d);await W(a.ms||40);}}}
const v=()=>u1().v,f=()=>u1().f;
const look='Watch the <b>monitor</b> (MON OUT of the selected unit, top right).';
const L=[
 {id:'power',title:'Switching on: where the power comes from',intro:'The Ultimatte 12 units have <b>no power switch</b>: they run when the video-rack power strip is on. The <b>Smart Remote 4</b> on the desk talks to them over the network (Ethernet switch). (Still to be confirmed with the school — in the simulator they are always on.)',
  steps:[{t:'If the remote shows a unit OFFLINE, the unit has no power or no network: check the rack power strip and the network cable. Press <b>Next</b>.'}]},
 {id:'look',title:'Select a unit and look at the key (monitor outputs, Auto Key)',intro:'The Smart Remote 4 controls the 3 Ultimattes (one per chroma camera). First choose <b>which unit</b> you are adjusting, then <b>what you watch</b>: the composite (Program), the camera (Foreground), the background, or the <b>matte</b> — the black-and-white mask that decides what is transparent.',
  setup:()=>{X().R.unit=1;u1().backing=[90,120,90];},
  steps:[
  {t:'Press <b>UNIT 1</b> on the remote (left column): unit 1 = camera 1.',hl:['sr:unit0'],check:()=>X().R.unit===0,demo:[{sr:'unit0'}]},
  {t:'On the touchscreen choose the monitor output <b>Combined Matte</b>. White = background shows through, black = presenter kept; <b>grey = a problem</b> (half transparent).',hl:['mon:3'],check:()=>u1().mon===3,demo:[{touch:'mon:3'}]},
  {t:'The backing colour sample is wrong (the matte is grey everywhere). Touch <b>⟲ auto key</b> (or the FILE CLEAR / AUTO KEY button): the unit samples the green again.',hl:['auto','sr:fileclear'],check:()=>u1().backing[0]!==90||u1().backing[1]!==120,demo:[{touch:'auto'}]},
  {t:'Back to <b>Program</b>: the presenter on the background. '+look,hl:['mon:0'],check:()=>u1().mon===0,demo:[{touch:'mon:0'}]}]},
 {id:'cleanup',title:'Clean Up: a whiter background in the matte',intro:'Wrinkles in the green, shadows on the floor and uneven light leave the background <b>grey</b> in the matte (the background picture looks dirty). <b>Clean Up</b> pushes those greys to white. The monitor is showing the Combined Matte.',
  setup:()=>{u1().mon=3;X().R.tab='FOREGROUND';},
  steps:[
  {t:'Touch the <b>MATTE</b> tab.',hl:['tab:MATTE'],check:()=>X().R.tab==='MATTE',demo:[{touch:'tab:MATTE'}]},
  {t:'Touch the <b>Clean Up</b> group: the 4 knobs of the remote now control Clean Up.',hl:['grp:MATTE/Clean Up'],check:()=>X().R.grp.MATTE==='Clean Up',demo:[{touch:'grp:MATTE/Clean Up'}]},
  {t:'Turn <b>knob 1</b> (Clean Up Level) up to about <b>25</b>: the greys of the background become white. Too much and the edges of the presenter (hair) get eaten.',hl:['k:0'],check:()=>v().cu>=15&&v().cu<=45,demo:[{knob:0,d:1,n:25}]},
  {t:'Look at <b>Program</b> to see the result.',hl:['mon:0'],check:()=>u1().mon===0,demo:[{touch:'mon:0'}]}]},
 {id:'density',title:'Matte Density: a see-through presenter',intro:'Now the opposite problem: parts of the <b>presenter</b> are transparent (you can see the background through the jacket). <b>Matte Density</b> makes the foreground solid. The monitor shows Program.',
  setup:()=>{v().dens=-100;X().R.grp.MATTE='Clean Up';},
  steps:[
  {t:'Watch the Combined Matte: choose <b>Combined Matte</b>. The presenter is grey (should be black).',hl:['mon:3'],check:()=>u1().mon===3,demo:[{touch:'mon:3'}]},
  {t:'In the MATTE tab touch <b>Matte Process</b>.',hl:['grp:MATTE/Matte Process'],check:()=>X().R.grp.MATTE==='Matte Process'&&X().R.tab==='MATTE',demo:[{touch:'tab:MATTE'},{touch:'grp:MATTE/Matte Process'}]},
  {t:'Turn <b>knob 1</b> (Matte Density) up until the presenter is solid black in the matte (about <b>0</b>).',hl:['k:0'],check:()=>v().dens>=-10&&v().dens<=60,demo:[{knob:0,d:1,n:25}]},
  {t:'Back to <b>Program</b>.',hl:['mon:0'],check:()=>u1().mon===0,demo:[{touch:'mon:0'}]}]},
 {id:'spill',title:'Green spill on the presenter (Flare)',intro:'Green light bouncing from the screen tints the edges and hair of the presenter (<b>spill</b>). The Ultimatte removes it with <b>Flare</b> (foreground suppression). It has been switched off: look at the green edges on Program.',
  setup:()=>{v().flare=0;X().R.grp.FOREGROUND='Color';},
  steps:[
  {t:'Touch the <b>FOREGROUND</b> tab.',hl:['tab:FOREGROUND'],check:()=>X().R.tab==='FOREGROUND',demo:[{touch:'tab:FOREGROUND'}]},
  {t:'Touch the <b>Flare 1</b> group.',hl:['grp:FOREGROUND/Flare 1'],check:()=>X().R.grp.FOREGROUND==='Flare 1',demo:[{touch:'grp:FOREGROUND/Flare 1'}]},
  {t:'Turn <b>knob 1</b> (Flare Level) up to about <b>100</b>: the green on the edges disappears.',hl:['k:0'],check:()=>v().flare>=80,demo:[{knob:0,d:1,n:50}]}]},
 {id:'backing',title:'Wrong backing colour (green / blue screen)',intro:'The unit is set for a <b>blue</b> screen but the studio is <b>green</b>: nothing is keyed. The backing colour is chosen in SETTINGS.',
  setup:()=>{u1().ch=2;},
  steps:[
  {t:'Touch the <b>SETTINGS</b> tab.',hl:['tab:SETTINGS'],check:()=>X().R.tab==='SETTINGS',demo:[{touch:'tab:SETTINGS'}]},
  {t:'In <b>System</b>, touch <b>Green</b>. The unit samples the green again and the key comes back.',hl:['fn:SETTINGS/System/bk1'],check:()=>u1().ch===1,demo:[{touch:'grp:SETTINGS/System'},{touch:'fn:SETTINGS/System/bk1'}]}]},
 {id:'window',title:'Window: hide what is outside the green',intro:'The green screen does not fill the frame: lights, the floor edge or the studio walls appear at the sides. A <b>window</b> (garbage matte) crops them out so only the background is seen there.',
  steps:[
  {t:'Touch the <b>MATTE IN</b> tab.',hl:['tab:MATTE IN'],check:()=>X().R.tab==='MATTE IN',demo:[{touch:'tab:MATTE IN'}]},
  {t:'Touch the <b>Window</b> group.',hl:['grp:MATTE IN/Window'],check:()=>X().R.grp['MATTE IN']==='Window',demo:[{touch:'grp:MATTE IN/Window'}]},
  {t:'Switch the window on: touch <b>Window</b> (function button).',hl:['fn:MATTE IN/Window/win'],check:()=>f().win,demo:[{touch:'fn:MATTE IN/Window/win'}]},
  {t:'Turn <b>knob 3</b> (Window Left) and <b>knob 4</b> (Window Right) to crop the sides. Everything outside the window shows the background.',hl:['k:2','k:3'],check:()=>v().wl>5&&v().wr>5,demo:[{knob:2,d:1,n:12},{knob:3,d:1,n:12}]},
  {t:'Switch it off again (<b>Window</b>) — the studio here does not need it.',hl:['fn:MATTE IN/Window/win'],check:()=>!f().win,demo:[{touch:'fn:MATTE IN/Window/win'}]}]},
 {id:'presets',title:'Quick presets: save and recall a key',intro:'Once a key is good, save it: <b>ALT + QUICK LOAD n</b> stores every setting of the unit; <b>QUICK LOAD n</b> brings it back (e.g. one preset per programme or set).',
  steps:[
  {t:'Press <b>ALT</b>…',hl:['sr:alt'],check:()=>X().R.alt,demo:[{sr:'alt'}]},
  {t:'…and <b>QUICK LOAD 1</b>: preset 1 saved.',hl:['sr:ql1'],check:()=>!!u1().quick[1],demo:[{sr:'ql1'}]},
  {t:'Spoil the key: in MATTE › Matte Process turn <b>knob 1</b> (Matte Density) well down (below −50).',hl:['k:0'],check:()=>v().dens<-50,demo:[{touch:'tab:MATTE'},{touch:'grp:MATTE/Matte Process'},{knob:0,d:-1,n:25}]},
  {t:'Press <b>QUICK LOAD 1</b>: the saved key is back.',hl:['sr:ql1'],check:()=>v().dens>-10,demo:[{sr:'ql1'}]}]}];
TUT.add({id:'um',name:'Ultimatte',ov:'um',key,act,reset,cleanup,lessons:L});
})();
