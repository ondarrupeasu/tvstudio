/* CCU tutorials (Vision → CCU only): ATEM Camera Control Panel, strip 1 = Camera 1. Engine: tutorial.js.
 * Each lesson starts from a deliberately wrong camera (the student fixes it); the cameras are put back as they were
 * when the lesson ends. Look at Cam 1 on the multiview. */
(function(){
const W=TUT.W,P=()=>window.CCUP,C=()=>window.CCU&&CCU.cams,c1=()=>C()[1],T0=()=>P().strips[0];
const def=()=>({j:.667,nd:0,gain:0,shutter:50,wb:5600,tint:0,white:[1,1,1],black:[0,0,0],gamma:[0,0,0],ygain:1,mb:0,bars:false,sens:1,coarse:1,detail:0,contrast:1,sat:1,hue:0});
let snap=null;
function reset(){const c=C();snap=JSON.stringify([1,2,3,4,5,6,7,8].map(n=>c[n]));
  P().strips.forEach((t,i)=>Object.assign(t,{page:'home',cam:i+1,rel:true,flare:false,wbMode:false,lock:false,irisLock:false,call:false,store:false,scenes:{},msg:''}));
  for(let n=1;n<=4;n++)Object.assign(c[n],def());low=false;window.ATEMR&&ATEMR.api.setOut(1,'pvw');}
function cleanup(){if(!snap)return;const c=C(),s=JSON.parse(snap);s.forEach((v,i)=>Object.assign(c[i+1],v));snap=null;P().strips.forEach(t=>{t.lock=false;t.wbMode=false;t.flare=false;});P().draw();}
/* 's:k' → the control k of strip s */
const key=k=>{const [s,id]=k.split(':');return id==='joy'?document.querySelectorAll(`#cc-svg .cc-joy[data-s="${s}"]`):document.querySelectorAll(`#cc-svg [data-s="${s}"][data-k="${id}"]`);};
async function act(a){
  if(a.k){const [s,id]=a.k.split(':');key(a.k).forEach(e=>e.classList.add('down'));P().press(+s,id);await W(240);key(a.k).forEach(e=>e.classList.remove('down'));}
  else if(a.turn){const [s,id]=a.turn.split(':');for(let i=0;i<(a.n||1);i++){P().turn(+s,id,a.d);await W(a.ms||60);}}
  else if(a.joy!=null){const c=c1(),j0=c.j;for(let i=1;i<=20;i++){c.j=j0+(a.joy-j0)*i/20;P().draw();await W(60);}}}
const ev=()=>P().exposure(c1()),okExp=()=>ev()>.7&&ev()<1.45;
let low=false;const lowThenOk=()=>{if(ev()<.6)low=true;return low&&okExp();};   // the picture was spoilt first, then put right
const L=[
 {id:'iris',title:'Exposure with the iris (joystick)',intro:'Each strip of the CCU controls one camera — strip 1 = <b>Camera 1</b>. Look at <b>Cam 1</b> on the multiview: it is far too dark. The joystick is the <b>iris</b>: push it forward to open (more light), pull it back to close. The display above it shows the f-number (F2 = open … F16 = closed).',
  setup:()=>{c1().j=.18;},
  steps:[
  {t:'Push the <b>joystick</b> of strip 1 forward (drag it up) until Cam 1 looks right — about <b>F4</b>.',hl:['0:joy'],check:okExp,demo:[{joy:.667}]},
  {t:'Close it completely: pull the joystick all the way back. The display says <b>CLS</b> (closed) — the picture goes black.',hl:['0:joy'],check:()=>c1().j<=.01,demo:[{joy:0}]},
  {t:'Open it again to a good exposure (about F4).',hl:['0:joy'],check:okExp,demo:[{joy:.667}]},
  {t:'<b>AUTO IRIS</b> does it for you (it opens or closes the iris to the right level). Pull the iris down a bit and press AUTO IRIS.',hl:['0:autoiris'],enter:()=>{low=false;},check:lowThenOk,demo:[{joy:.4},{k:'0:autoiris'}]}]},
 {id:'triangle',title:'ND, gain and shutter',intro:'Besides the iris, three more things change the exposure: <b>ND</b> (neutral density filters: less light, same look), <b>MASTER GAIN</b> (electronic amplification: brighter but <b>noisier</b>) and <b>SHUTTER</b> (1/50 is the norm at 25p; faster = darker and choppier motion). Cam 1 is now over-exposed: iris wide open, +12 dB gain.',
  setup:()=>{Object.assign(c1(),{j:1,gain:12});},
  steps:[
  {t:'First take the gain back to <b>0 dB</b>: press <b>MASTER GAIN ▼</b> until the display says 0. Gain = noise: keep it at 0 whenever you can.',hl:['0:mg-'],check:()=>c1().gain===0,demo:[{k:'0:mg-'},{k:'0:mg-'},{k:'0:mg-'},{k:'0:mg-'},{k:'0:mg-'},{k:'0:mg-'}]},
  {t:'Still too bright with the iris wide open (sunny day, big lights…): put in <b>ND</b>. Press <b>ND ▲</b> twice (ND 4 = 2 stops less light).',hl:['0:nd+'],check:()=>c1().nd>=4,demo:[{k:'0:nd+'},{k:'0:nd+'}]},
  {t:'Look at Cam 1: with ND 4 the exposure is right with the iris <b>wide open (F2)</b> — that gives a shallow depth of field (blurred background). Without ND you would have had to close the iris to F8 instead. Fine-tune with the joystick if you want, then press <b>Next</b>.',hl:['0:joy']},
  {t:'Try the <b>SHUTTER</b>: press <b>SHUTTER ▲</b> once (1/60): a bit darker. Fast shutters freeze motion but make it look choppy.',hl:['0:sh+'],check:()=>c1().shutter>50,demo:[{k:'0:sh+'}]},
  {t:'Back to <b>1/50</b> (the norm for 25p, the "180°" shutter): <b>SHUTTER ▼</b>.',hl:['0:sh-'],check:()=>c1().shutter===50,demo:[{k:'0:sh-'}]}]},
 {id:'wb',title:'White balance',outro:'Auto white balance also leaves W/B mode, so SHUTTER ▲▼ control the shutter again.',intro:'The studio lights are <b>5600 K</b> (daylight LED). Camera 1 has been set to <b>3200 K</b> (tungsten), so it adds blue: Cam 1 looks cold. On this panel the <b>W/B</b> button turns the SHUTTER ▲▼ keys into a colour-temperature control (in 100 K steps).',
  setup:()=>{c1().wb=3200;},
  steps:[
  {t:'Press <b>W/B</b> (it lights): the display now shows the colour temperature.',hl:['0:wb'],check:()=>T0().wbMode,demo:[{k:'0:wb'}]},
  {t:'Raise it with <b>SHUTTER ▲</b> (each press +100 K) and watch Cam 1 get warmer. Go up to at least <b>4500 K</b>.',hl:['0:sh+'],check:()=>c1().wb>=4500,demo:[...Array(13)].map(()=>({k:'0:sh+'}))},
  {t:'Faster: <b>hold W/B for 2 seconds</b> = automatic white balance to the studio light (5600 K). In class you point the camera at a white card first.',hl:['0:wb'],check:()=>c1().wb===5600,demo:[{fn:async()=>{await W(1800);c1().wb=5600;T0().wbMode=false;P().draw();}}]}]},
 {id:'colour',title:'Colour: white (gain), black (lift) and gamma',intro:'Fine colour matching between cameras: <b>WHITE R/G/B</b> wheels = the highlights (gain), <b>BLACK R/G/B</b> = the shadows (lift); with <b>BLACK/FLARE</b> lit, the black wheels change the <b>gamma</b> (mid-tones). Cam 1 now has too much red in the highlights and blue in the shadows.',
  setup:()=>{c1().white[0]=1.4;c1().black[2]=.3;},
  steps:[
  {t:'Turn the <b>WHITE R</b> wheel down (drag it down or scroll) until the red cast is gone (back to about 1.00).',hl:['0:wR'],check:()=>Math.abs(c1().white[0]-1)<.05,demo:[{turn:'0:wR',d:-1,n:20}]},
  {t:'Now the shadows: turn <b>BLACK B</b> down until the blue in the dark areas is gone (about 0).',hl:['0:bB'],check:()=>Math.abs(c1().black[2])<.05,demo:[{turn:'0:bB',d:-1,n:15}]},
  {t:'Press <b>BLACK/FLARE</b>: now the black wheels change the <b>gamma</b> (mid-tones) instead.',hl:['0:flare'],check:()=>T0().flare,demo:[{k:'0:flare'}]},
  {t:'Turn <b>BLACK G</b> a little up: the mid-tones go magenta/green. Then press <b>BLACK/FLARE</b> again to go back to black (lift).',hl:['0:bG','0:flare'],check:()=>!T0().flare&&Math.abs(c1().gamma[1])>.05,demo:[{turn:'0:bG',d:1,n:6},{k:'0:flare'}]}]},
 {id:'scenes',title:'Scene files, preview and lock',intro:'A <b>scene</b> stores every setting of the camera (iris, ND, gain, colour…) in a button 1-5, to get back to it at once. Also: clicking the joystick sends the camera to the <b>preview monitor</b> (ATEM OUT 2), and <b>LOCK</b> protects a strip from accidental changes.',
  steps:[
  {t:'Press <b>STORE</b> (it lights)…',hl:['0:store'],check:()=>T0().store,demo:[{k:'0:store'}]},
  {t:'…and <b>scene 1</b>: Camera 1\'s settings are saved there.',hl:['0:sc1'],check:()=>!!T0().scenes[1],demo:[{k:'0:sc1'}]},
  {t:'Spoil the picture: close the iris (pull the joystick back) or add ND.',hl:['0:joy','0:nd+'],enter:()=>{low=false;},check:()=>ev()<.5,demo:[{joy:.2}]},
  {t:'Press <b>scene 1</b>: everything comes back as it was stored.',hl:['0:sc1'],check:lowThenOk,demo:[{k:'0:sc1'}]},
  {t:'<b>Click</b> the joystick (press without moving): Camera 1 goes to the preview monitor (ATEM OUT 2) to check it in detail.',hl:['0:joy'],check:()=>window.ATEMR&&ATEMR.api.st().outs[1]===1,demo:[{k:'0:joyclick'}]},
  {t:'Press <b>LOCK</b>: the strip ignores everything until it is unlocked (useful on air).',hl:['0:lock'],check:()=>T0().lock,demo:[{k:'0:lock'}]},
  {t:'Try to move the joystick — nothing happens. Press <b>LOCK</b> again to unlock.',hl:['0:lock'],check:()=>!T0().lock,demo:[{k:'0:lock'}]}]}];
TUT.add({id:'ccu',name:'CCU',ov:'cr',when:()=>document.getElementById('cr').classList.contains('f-ccu'),key,act,reset,cleanup,redraw:()=>P().draw(),lessons:L});
})();
