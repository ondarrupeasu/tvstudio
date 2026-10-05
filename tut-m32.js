/* Midas M32R tutorials. Engine: tutorial.js. The sound comes from the console's own sample sources (rear sockets):
 * IN 1 presenter (lavalier, condenser → needs +48 V), IN 2 guest (lavalier), IN 3 music (playback), IN 4 room mic
 * (ambience), IN 5 1 kHz tone. Each lesson puts channels 1-5 + MAIN into a known state; levels are read straight from
 * the console's meters (pre = after the preamp, post = after the fader). */
(function(){
const W=TUT.W,M=()=>window.M32;
const SRCS={in1:'pres',in2:'guest',in3:'music',in4:'amb',in5:'tone'};
const ready=()=>M().G.power&&!M().booting();
function reset(){const m=M();if(!m||!m.G)return;openMixer();
  Object.assign(m.G,{inL:'i1',busL:'dca',flip:false,page:'home',tab:'home',dim:false});Object.values(m.S).forEach(s=>s.solo=false);
  for(let i=1;i<=5;i++){const id='in'+i,p=m.P[id];Object.assign(p,{gain:0,p48:false,pol:false,lc:false,lcf:80,gate:false,gthr:-60,comp:false,cthr:-20,ratio:3,eq:true,band:'low',pan:0,st:true});
    Object.values(p.b).forEach(b=>b.g=0);Object.assign(m.S[id],{fader:0,mute:false});if(m.SRC[id]!==SRCS[id])m.source(id,SRCS[id]);}
  m.S.main.fader=0;m.S.main.mute=false;m.G.sel='in1';m.apply();}
/* a ready-made channel: what lesson 1 teaches */
function voice(id,g=28){const p=M().P[id];p.p48=true;p.gain=g;M().S[id].fader=.75;}
const on=()=>{M().power(true);};
/* keys: 'k:gain' = knob, 'f:a0' = fader of slot a0, 'f:m' = main fader, 'power' = rear power switch, else a [data-b] key */
const key=k=>k==='power'?document.querySelectorAll('#mx .mx-power'):k.startsWith('k:')?document.querySelectorAll(`#mx .mx-k[data-k="${k.slice(2)}"]`):
  k.startsWith('f:')?document.querySelectorAll(`#mx .mx-f[data-slot="${k.slice(2)}"]`):document.querySelectorAll(`#mx [data-b="${k}"]`);
async function act(a){const m=M();
  if(a.power!=null){m.power(a.power);await W(1700);}
  else if(a.b){key(a.b).forEach(e=>e.classList.add('down'));m.press(a.b);await W(220);key(a.b).forEach(e=>e.classList.remove('down'));}
  else if(a.knob){for(let i=0;i<(a.n||1);i++){m.knob(a.knob,a.d);await W(a.ms||40);}}
  else if(a.fader){const s=m.S[a.fader],v0=s.fader;for(let i=1;i<=16;i++){m.fader(a.fader,v0+(a.to-v0)*i/16);await W(50);}}}
/* peak with a short memory (speech has pauses): the loudest level of the last ~1.5 s */
const mem={};function pk(id,w='pre'){const k=id+w,v=M().peak(id,w),t=performance.now(),o=mem[k];if(!o||v>=o.v||t-o.t>1500)mem[k]={v,t};return mem[k].v;}
const fd=id=>M().S[id].fader,near0=id=>fd(id)>.7&&fd(id)<.8;   // fader at about 0 dB (0.75 = 0 dB)
const goodPre=id=>{const v=pk(id);return v>-22&&v<-4;};
const L=[
 {id:'first',title:'From silence to sound: power, +48 V, gain, fader, main',intro:'The path of a microphone through the desk: <b>preamp (GAIN)</b> → channel processing → <b>channel fader</b> → <b>MAIN LR fader</b> → speakers / programme. Everything is at zero now. Channel 1 = the presenter\'s lavalier (a <b>condenser</b> mic: it needs phantom power).',
  setup:()=>{M().G.sel='in3';},
  steps:[
  {t:'Switch the console on: the <b>POWER</b> switch on the rear panel (it boots in a second).',hl:['power'],check:ready,demo:[{power:true}]},
  {t:'Select channel 1 (PRESENTER): press its <b>SEL</b> key. The channel strip (top left) now edits channel 1.',hl:['sel:a0'],check:()=>M().G.sel==='in1',demo:[{b:'sel:a0'}]},
  {t:'A condenser mic needs <b>+48 V</b> (phantom power): press <b>48V</b> in the channel strip. Without it there is no signal at all.',hl:['p48'],check:()=>M().P.in1.p48,demo:[{b:'p48'}]},
  {t:'Turn up <b>GAIN</b> until the channel meter peaks at about <b>−12 dB</b> (yellow at the loudest words, never red). Gain is set first, with the faders down.',hl:['k:gain'],check:()=>goodPre('in1'),demo:[{knob:'gain',d:2,n:28,ms:30}]},
  {t:'Raise channel 1\'s <b>fader</b> to <b>0 dB</b> (the thick line, about ¾ of the way up).',hl:['f:a0'],check:()=>near0('in1'),demo:[{fader:'in1',to:.75}]},
  {t:'Nothing in the speakers yet: the <b>MAIN LR</b> fader (far right) is down. Raise it to <b>0 dB</b> too.',hl:['f:m'],check:()=>near0('main'),demo:[{fader:'main',to:.75}]},
  {t:'Now you hear the presenter. The <b>MONITOR</b> knob only changes the control-room speakers, not what goes on air (the MAIN LR level is what goes to the ATEM / recording). Press <b>Next</b>.',hl:['k:mon']}]},
 {id:'mix',title:'A small mix: music under the voice, MUTE and SOLO',intro:'Channel 1 (presenter) is ready. Now the music (channel 3) under the voice, a guest (channel 2) to prepare without the audience hearing it, and the MUTE / SOLO keys.',
  setup:()=>{on();voice('in1');M().P.in3.gain=4;M().S.main.fader=.75;},
  steps:[
  {t:'Raise channel 3 (MUSIC) to about <b>−10 dB</b> (halfway): under the voice, not on top of it.',hl:['f:a2'],check:()=>fd('in3')>.42&&fd('in3')<.65,demo:[{fader:'in3',to:.5}]},
  {t:'<b>MUTE</b> channel 3: it goes silent but the fader stays where it was (ready to come back).',hl:['mute:a2'],check:()=>M().S.in3.mute,demo:[{b:'mute:a2'}]},
  {t:'Unmute it (<b>MUTE</b> again).',hl:['mute:a2'],check:()=>!M().S.in3.mute,demo:[{b:'mute:a2'}]},
  {t:'Prepare the guest without putting it on air: <b>SOLO</b> channel 2. The control-room speakers now play only the soloed channel; the programme (MAIN LR) does not change.',hl:['solo:a1'],check:()=>M().S.in2.solo,demo:[{b:'solo:a1'}]},
  {t:'Select channel 2 (<b>SEL</b>) and switch on its <b>48V</b>.',hl:['sel:a1','p48'],check:()=>M().G.sel==='in2'&&M().P.in2.p48,demo:[{b:'sel:a1'},{b:'p48'}]},
  {t:'Set its <b>GAIN</b> (peaks about −12 dB), listening in solo.',hl:['k:gain'],check:()=>goodPre('in2'),demo:[{knob:'gain',d:2,n:28,ms:30}]},
  {t:'Clear the solo (<b>CLEAR SOLO</b>) and bring the guest in: channel 2 fader to <b>0 dB</b>.',hl:['clrsolo','f:a1'],check:()=>!M().S.in2.solo&&near0('in2'),demo:[{b:'clrsolo'},{fader:'in2',to:.75}]}]},
 {id:'voice',title:'Clean up a voice: low cut, EQ and compressor',intro:'Channel 1 (presenter) is on air. Three classic steps for speech: <b>LOW CUT</b> (removes rumble and handling noise below ~100 Hz), <b>EQ</b> (a little presence around 3 kHz) and the <b>COMPRESSOR</b> (evens out loud and quiet words).',
  setup:()=>{on();voice('in1');M().S.main.fader=.75;},
  steps:[
  {t:'Press <b>LOW CUT</b> in the channel strip…',hl:['lc'],check:()=>M().P.in1.lc,demo:[{b:'lc'}]},
  {t:'…and turn its <b>frequency</b> knob up to about <b>100 Hz</b> (voices have nothing useful below that).',hl:['k:lcf'],check:()=>M().P.in1.lcf>=95&&M().P.in1.lcf<=160,demo:[{knob:'lcf',d:1,n:8}]},
  {t:'EQ: choose the <b>HI MID</b> band.',hl:['band:himid'],check:()=>M().P.in1.band==='himid',demo:[{b:'band:himid'}]},
  {t:'Turn its <b>GAIN</b> (EQ section) up about <b>+3 dB</b>: the voice gets clearer (presence). More than +6 dB sounds harsh.',hl:['k:eqg'],check:()=>{const g=M().P.in1.b.himid.g;return g>=2&&g<=5;},demo:[{knob:'eqg',d:1,n:12}]},
  {t:'Press <b>COMP</b> (dynamics) to switch the compressor on.',hl:['comp'],check:()=>M().P.in1.comp,demo:[{b:'comp'}]},
  {t:'Lower its <b>THRESHOLD</b> to about <b>−30 dB</b>: the loudest words are now pulled down (watch the gain-reduction meter next to the knob).',hl:['k:cthr'],check:()=>M().P.in1.cthr<=-28,demo:[{knob:'cthr',d:-2,n:10}]}]},
 {id:'gate',title:'Noise gate on a room mic',intro:'Channel 4 is a room mic: when nobody speaks it only picks up <b>noise</b> (air conditioning, the audience…). A <b>gate</b> closes the channel when the level is below its <b>threshold</b>.',
  setup:()=>{on();const p=M().P.in4;p.gain=12;M().S.in4.fader=.75;M().S.main.fader=.75;M().G.sel='in1';},
  steps:[
  {t:'Listen: a constant hiss. Select channel 4 (<b>SEL</b>).',hl:['sel:a3'],check:()=>M().G.sel==='in4',demo:[{b:'sel:a3'}]},
  {t:'Press <b>GATE</b> to switch the gate on.',hl:['gate'],check:()=>M().P.in4.gate,demo:[{b:'gate'}]},
  {t:'Raise its <b>THRESHOLD</b> just above the noise level: the channel closes (the hiss stops). Too high and it would also cut the quiet words.',hl:['k:gthr'],check:()=>{const p=M().P.in4;return p.gate&&p.gthr>pk('in4')+1&&p.gthr<pk('in4')+20;},
   demo:[{fn:async()=>{const m=M(),t=Math.min(0,pk('in4')+5);while(m.P.in4.gthr<t){m.knob('gthr',2);await W(30);}}}]}]},
 {id:'tone',title:'Line-up tone and levels',intro:'Before a show the desk sends a <b>1 kHz tone</b> at a known level so every device after it (ATEM, recorder, streaming) can be checked. Channel 5 = the tone generator.',
  setup:()=>{on();M().S.main.fader=.75;},
  steps:[
  {t:'Raise channel 5 (TONE 1k) fader to <b>0 dB</b>.',hl:['f:a4'],check:()=>near0('in5'),demo:[{fader:'in5',to:.75}]},
  {t:'Look at the MAIN meters (right): the tone sits at a steady level. On the ATEM, the audio of the programme should read the same level — that is what line-up is for. Press <b>Next</b>.'},
  {t:'Tone off: <b>MUTE</b> channel 5 (never leave tone in the mix!).',hl:['mute:a4'],check:()=>M().S.in5.mute,demo:[{b:'mute:a4'}]}]}];
TUT.add({id:'m32',name:'Midas M32R',ov:'mx',key,act,reset,redraw:()=>M().apply(),lessons:L});
})();
