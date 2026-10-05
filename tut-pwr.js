/* Power-board + lighting-desk tutorials. Engine: tutorial.js.
 * Power: the control-room breaker board + Datapak 2 (dimmers of the set lights). The switch-on ORDER used here is the
 * logical one (protection first, then loads); Tartanga's exact procedure is still to be confirmed (questions list).
 * Desk: Showtec Showmaster 24 MKII — faders 1-12 = chroma LED fixtures (DMX), 13-24 = set lamps through Datapak 2. */
(function(){
const W=TUT.W,P=()=>window.PWR_API,PS=()=>window.PWR,DK=()=>window.DESK,D=()=>DK().D;
/* ---------- power ---------- */
const pkey=k=>document.querySelectorAll(`#pwr [data-id="${k}"]`);
async function pact(a){if(a.set){const[k,v]=a.set;pkey(k).forEach(e=>e.classList.add('tut-press'));P().set(k,v);await W(500);pkey(k).forEach(e=>e.classList.remove('tut-press'));}}
const PL=[
 {id:'on',title:'Switch the control room and studio on',intro:'Everything starts <b>switched off</b>. Order: first the protection (the <b>RCD</b> / diferencial, which feeds the whole board), then each load: <b>LED</b> (chroma lights), <b>Dimmers</b> (supply of Datapak 2) and the Datapak\'s own <b>ELECTRONICS</b> switch. (Logical order — the school\'s exact procedure is still to be confirmed.) Click a breaker to switch it.',
  setup:()=>{['rcd','dp','dim','led','dpE0','dpE1','dpP0','dpP1'].forEach(k=>P().set(k,false));},
  steps:[
  {t:'Switch on the <b>RCD</b> (diferencial, pink tag "Diferencial"): it feeds the rest of the board.',hl:['rcd'],check:()=>PS().rcd,demo:[{set:['rcd',true]}]},
  {t:'Switch on <b>LED</b>: constant power for the chroma LED fixtures (they are then dimmed by the desk, faders 1-12, over DMX).',hl:['led'],check:()=>PS().led,demo:[{set:['led',true]}]},
  {t:'Switch on <b>Dimmers</b>: three-phase supply to <b>Datapak 2</b>, the dimmer pack of the set lamps (faders 13-24).',hl:['dim'],check:()=>PS().dim,demo:[{set:['dim',true]}]},
  {t:'On Datapak 2 switch on <b>ELECTRONICS</b>: without it the Datapak ignores the desk.',hl:['dpE1'],check:()=>PS().dpE1,demo:[{set:['dpE1',true]}]},
  {t:'Done: the lights are ready for the desk (next simulator: Lighting). Press <b>Next</b>.'}]},
 {id:'off',title:'Switch off at the end of the day',intro:'In reverse order: first the <b>lights at zero on the desk</b>, then the Datapak electronics, the loads, and the RCD last.',
  setup:()=>{['rcd','dim','led','dpE1'].forEach(k=>P().set(k,true));},
  steps:[
  {t:'(On the desk the masters and faders should already be down.) Switch off Datapak 2 <b>ELECTRONICS</b>.',hl:['dpE1'],check:()=>!PS().dpE1,demo:[{set:['dpE1',false]}]},
  {t:'Switch off <b>Dimmers</b> and <b>LED</b>.',hl:['dim','led'],check:()=>!PS().dim&&!PS().led,demo:[{set:['dim',false]},{set:['led',false]}]},
  {t:'Finally the <b>RCD</b>.',hl:['rcd'],check:()=>!PS().rcd,demo:[{set:['rcd',false]}]}]}];
TUT.add({id:'pwr',name:'Power',ov:'pwr',key:pkey,act:pact,lessons:PL});
/* ---------- lighting desk ---------- */
const dkey=k=>k==='power'?document.querySelectorAll('#dsk .dk-power'):k.startsWith('f:')?document.querySelectorAll(`#dsk .dk-f[data-f="${k.slice(2)}"]`):document.querySelectorAll(`#dsk .dk-b[data-b="${k}"]`);
async function dact(a){const d=DK();
  if(a.power!=null){d.power(a.power);await W(300);}
  else if(a.f){const[id,to]=a.f,from=id[0]==='c'&&/^c\d+$/.test(id)?D().f[+id.slice(1)]:D()[id];for(let i=1;i<=14;i++){d.setF(id,from+(to-from)*i/14);await W(45);}}
  else if(a.b){dkey(a.b).forEach(e=>e.classList.add('down'));d.press(a.b,true);await W(a.hold||200);d.press(a.b,false);dkey(a.b).forEach(e=>e.classList.remove('down'));}
  else if(a.mains){['rcd','led','dim','dpE1'].forEach(k=>P()&&P().set(k,true));await W(200);}}
const fv=n=>D().f[n-1];
const mainsOk=()=>PS()&&PS().rcd&&PS().led;
const DL=[
 {id:'first',title:'First light: desk power, Master A and a channel',intro:'The desk only sends levels; the lamps need their power on the breaker board (Power simulator). Channel fader × <b>Master A</b> = the level sent to each light. Look at the little studio plan on the right of the desk.',
  setup:()=>{DK().power(false);for(let i=0;i<24;i++)D().f[i]=0;D().mA=0;D().bo=false;D().mode='single';DK().setF('mA',0);},
  steps:[
  {t:'Mains first: the <b>RCD</b> and <b>LED</b> breakers must be on (Power simulator). If the chips under the desk say they are off, switch them on there — or press "Show me".',check:mainsOk,demo:[{mains:true}]},
  {t:'Switch the desk on: <b>POWER</b> on its rear panel.',hl:['power'],check:()=>D().power,demo:[{power:true}]},
  {t:'Raise <b>MASTER A</b> to the top (full).',hl:['f:mA'],check:()=>D().mA>.9,demo:[{f:['mA',1]}]},
  {t:'Raise channel <b>2</b> (the cyclorama panels): the green screen lights up on the plan.',hl:['f:c1'],check:()=>fv(2)>.6,demo:[{f:['c1',.8]}]},
  {t:'Pull <b>MASTER A</b> halfway: every channel goes down together — the master scales the whole desk.',hl:['f:mA'],check:()=>D().mA>.3&&D().mA<.7,demo:[{f:['mA',.5]}]},
  {t:'Master A back to full.',hl:['f:mA'],check:()=>D().mA>.9,demo:[{f:['mA',1]}]}]},
 {id:'chroma',title:'Lighting the chroma set',intro:'A good key needs an <b>even</b> green screen and a presenter lit <b>separately</b> (so no green spills on them). On this desk each chroma fixture has two faders: <b>intensity</b> and <b>colour temperature</b> (down = warm 3200 K, up = cool daylight). The cameras are at 5600 K, so the temperatures go up.',
  setup:()=>{DK().power(true);for(let i=0;i<24;i++)D().f[i]=0;D().mA=1;D().bo=false;D().mode='single';DK().setF('mA',1);},
  steps:[
  {t:'The screen: channel <b>2</b> (cyc panels, intensity) to about 70 %, and channel <b>1</b> (its temperature) to the top.',hl:['f:c1','f:c0'],check:()=>fv(2)>.55&&fv(1)>.85,demo:[{f:['c1',.7]},{f:['c0',1]}]},
  {t:'The presenter, from the front: channels <b>7</b> (front L) and <b>9</b> (front R) to about 70 %…',hl:['f:c6','f:c8'],check:()=>fv(7)>.55&&fv(9)>.55,demo:[{f:['c6',.7]},{f:['c8',.7]}]},
  {t:'…and their temperatures (<b>8</b> and <b>10</b>) to the top.',hl:['f:c7','f:c9'],check:()=>fv(8)>.85&&fv(10)>.85,demo:[{f:['c7',1]},{f:['c9',1]}]},
  {t:'The <b>backlights</b> (<b>3</b> left, <b>5</b> right) to about 60 %: they draw a light edge around the presenter and kill the green spill on hair and shoulders.',hl:['f:c2','f:c4'],check:()=>fv(3)>.45&&fv(5)>.45,demo:[{f:['c2',.6]},{f:['c4',.6]}]},
  {t:'And their temperatures (<b>4</b> and <b>6</b>) up.',hl:['f:c3','f:c5'],check:()=>fv(4)>.85&&fv(6)>.85,demo:[{f:['c3',1]},{f:['c5',1]}]}]},
 {id:'bo',title:'Blackout and flash',intro:'Two safety / effect keys: <b>BLACK OUT</b> cuts every output at once (the faders stay where they are), and the <b>flash</b> key under each fader sends that channel to full while held.',
  setup:()=>{DK().power(true);D().mA=1;D().bo=false;D().mode='single';DK().setF('mA',1);if(fv(2)<.5)DK().setF('c1',.7);},
  steps:[
  {t:'Press <b>BLACK OUT</b>: everything goes dark (its LED blinks).',hl:['bo'],check:()=>D().bo,demo:[{b:'bo'}]},
  {t:'Press <b>BLACK OUT</b> again: everything comes back at the same levels.',hl:['bo'],check:()=>!D().bo,demo:[{b:'bo'}]},
  {t:'<b>Hold</b> the flash key under channel <b>7</b> (front L): full while held, back when released. Press Next when you have tried it.',hl:['fl6'],demo:[{b:'fl6',hold:1200}]}]},
 {id:'set',title:'The set lights (dimmers 13-24)',intro:'Faders 13-24 drive the lamps of the physical set through <b>Datapak 2</b>. They need the <b>Dimmers</b> breaker and the Datapak\'s <b>ELECTRONICS</b> switch (Power simulator). Incandescent lamps also change colour with the level: warm and orange when dimmed.',
  setup:()=>{DK().power(true);D().mA=1;D().bo=false;D().mode='single';DK().setF('mA',1);for(let i=12;i<24;i++)D().f[i]=0;DK().setF('c12',0);},
  steps:[
  {t:'Check the mains: <b>RCD</b>, <b>Dimmers</b> and Datapak 2 <b>ELECTRONICS</b> on (Power simulator) — or press "Show me".',check:()=>PS().rcd&&PS().dim&&PS().dpE1,demo:[{mains:true}]},
  {t:'Raise channel <b>13</b> slowly to about 30 %: the lamp glows orange (low colour temperature).',hl:['f:c12'],check:()=>fv(13)>.2&&fv(13)<.45,demo:[{f:['c12',.3]}]},
  {t:'Now to full: it gets whiter. That is why dimmed tungsten lamps look warm on camera.',hl:['f:c12'],check:()=>fv(13)>.9,demo:[{f:['c12',1]}]}]}];
TUT.add({id:'dsk',name:'Lighting desk',ov:'dsk',key:dkey,act:dact,lessons:DL});
})();
