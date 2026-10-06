/* Audio-rack tutorials (JVC A-X77, TC M350, MDX4600, signal path). Engine: tutorial.js.
 * The rack processes the Midas sound, so each lesson switches the Midas on and gives it something to play — said in
 * the lesson's intro (channels set there: 1 presenter, 3 music, MAIN at 0 dB). */
(function(){
const W=TUT.W,R=()=>window.AR,dev=id=>R().dev[id],st=id=>dev(id).st,M=()=>window.M32;
function midas(o={}){const m=M();if(!m||!m.G)return;m.power(true);const v=m.P.in1;v.p48=true;v.gain=28;m.S.in1.fader=.75;m.S.in1.mute=false;
  if(o.music){m.P.in3.gain=4;m.S.in3.fader=.5;m.S.in3.mute=false;}m.S.main.fader=.75;m.S.main.mute=false;
  if(o.rev){v.sends[1]=v.sends[2]=.75;m.S.bus1.fader=m.S.bus2.fader=.75;m.S.aux1.fader=m.S.aux2.fader=.6;m.S.bus1.mute=m.S.bus2.mute=m.S.aux1.mute=m.S.aux2.mute=false;}
  m.apply();}
const key=k=>{const[t,d,x]=k.split(':');
  if(t==='flip')return document.querySelectorAll('#ob [data-flip]');if(t==='listen')return document.querySelectorAll('#ar-listen');
  if(t==='k')return document.querySelectorAll(`#ob .ar-k[data-d="${d}"][data-k="${x}"]`);if(t==='b')return document.querySelectorAll(`#ob .ar-b[data-d="${d}"][data-b="${x}"]`);return[];};
async function act(a){
  if(a.flip){R().api.flip();await W(600);}
  else if(a.press){const[d,b]=a.press,e=key(`b:${d}:${b}`);e.forEach(x=>x.classList.add('down'));dev(d).press(b);await W(200);dev(d).release&&dev(d).release(b);e.forEach(x=>x.classList.remove('down'));}
  else if(a.set){const[d,k,to]=a.set,s=st(d);if(typeof to==='number'&&typeof s[k]==='number'){const from=s[k];for(let i=1;i<=12;i++){s[k]=from+(to-from)*i/12;dev(d).change&&dev(d).change(k);await W(50);}}
    else{s[k]=to;dev(d).change&&dev(d).change(k);await W(200);}}}
const pw=id=>st(id).power,toggle=id=>({press:[id,'power']});
const L=[
 {id:'switchon',title:'Switch the rack on (and in which order)',intro:'Rule of thumb for any sound system: switch on from the <b>source</b> to the <b>speakers</b> — the <b>amplifier last</b> (and first when switching off), so no thump reaches the speakers. The lesson starts with the rack units off. (The M350 and the Virtualizer have no power switch: they run when their power supply is plugged in.)',
  setup:()=>{['deq','ls','mdx1','mdx2','jvc'].forEach(id=>{if(pw(id))dev(id).press('power');});},
  steps:[
  {t:'The source first: the rack only processes what the <b>Midas</b> sends. If it is off, switch it on (◀ Midas → POWER at the back) — or press "Show me".',check:()=>M()&&M().G&&M().G.power,demo:[{fn:async()=>{M().power(true);await W(1800);}}]},
  {t:'<b>DEQ2496</b> POWER (the room EQ of the control-room speakers).',hl:['b:deq:power'],check:()=>pw('deq'),demo:[toggle('deq')]},
  {t:'<b>LS-280</b> POWER (it splits the programme to the ATEM and the VU meters).',hl:['b:ls:power'],check:()=>pw('ls'),demo:[toggle('ls')]},
  {t:'Both <b>MDX4600</b> POWER (compressors).',hl:['b:mdx1:power','b:mdx2:power'],check:()=>pw('mdx1')&&pw('mdx2'),demo:[toggle('mdx1'),toggle('mdx2')]},
  {t:'And last the amplifier: <b>JVC</b> POWER. Its protection relay keeps the speakers muted for about 3 seconds (PROTECTION LED) and then the sound comes in.',hl:['b:jvc:power'],check:()=>pw('jvc'),demo:[toggle('jvc'),{wait:3000}]}]},
 {id:'path',title:'Front and rear: follow the sound',intro:'The rack is seen from the front (controls) or from the rear (connections). The control-room sound goes: Midas <b>MONITOR</b> out → <b>DEQ2496</b> (room EQ) → <b>JVC A-X77</b> amplifier → speakers. The programme (MAIN, OUT 7/8) goes to the <b>LS-280</b> splitter → ATEM and the VU meters.',
  steps:[
  {t:'Turn the rack round: the <b>⟲</b> arrow next to the rack.',hl:['flip'],check:()=>R().api.side()==='rear',demo:[{flip:true}]},
  {t:'Hover the cable tags to read where each one goes: from the Midas MONITOR into the DEQ2496 inputs, from the DEQ outputs into the JVC AUX input, and the JVC speaker terminals. Press <b>Next</b>.'},
  {t:'Back to the front (<b>⟲</b>).',hl:['flip'],check:()=>R().api.side()==='front',demo:[{flip:true}]}]},
 {id:'jvc',title:'The control-room amplifier (JVC A-X77)',intro:'The JVC drives the speakers: <b>SPEAKERS 1</b> = control room, <b>SPEAKERS 2</b> = studio (cable tagged "PLATÓ"). The lesson switches the Midas on with the presenter and some music so there is sound.',
  setup:()=>{midas({music:true});const s=st('jvc');Object.assign(s,{power:true,mute:false,vol:-4,spk:'1'});['mute','vol','spk'].forEach(k=>dev('jvc').change&&dev('jvc').change(k));},
  steps:[
  {t:'Press <b>MUTING</b>: the speakers go quiet (handy for a phone call in the control room).',hl:['b:jvc:mute'],check:()=>st('jvc').mute,demo:[{press:['jvc','mute']}]},
  {t:'And <b>MUTING</b> again.',hl:['b:jvc:mute'],check:()=>!st('jvc').mute,demo:[{press:['jvc','mute']}]},
  {t:'Turn the <b>VOLUME</b> down to about −30 dB. It only changes what we hear: the programme level (MAIN) stays the same.',hl:['k:jvc:vol'],check:()=>st('jvc').vol<=-25,demo:[{set:['jvc','vol',-30]}]},
  {t:'Back up to about −5 dB.',hl:['k:jvc:vol'],check:()=>st('jvc').vol>=-10,demo:[{set:['jvc','vol',-5]}]},
  {t:'The <b>SPEAKERS</b> selector to <b>1+2</b>: the studio speakers get the sound too (e.g. music for the audience). Use <b>"Listen in"</b> to hear the studio side.',hl:['k:jvc:spk','listen'],check:()=>st('jvc').spk==='1+2',demo:[{set:['jvc','spk','1+2']}]},
  {t:'Back to <b>1</b> (control room only) — never leave the studio speakers on while the microphones are open: feedback!',hl:['k:jvc:spk'],check:()=>st('jvc').spk==='1',demo:[{set:['jvc','spk','1']}]}]},
 {id:'reverb',title:'Reverb on the voice with the TC M350 (aux send / return)',intro:'An effect is used <b>in parallel</b>: the Midas sends a copy of the voice (Mix 1-2) to the M350, and its output comes back on AUX IN 1-2, mixed under the dry voice. The lesson sets that on the Midas: channel 1 sent to Mix 1-2, Mix 1-2 and AUX returns 1-2 up.',
  setup:()=>{midas({rev:true});Object.assign(st('m350'),{type:'Live Stage',decay:4,mix:.5});['type','decay','mix'].forEach(k=>dev('m350').change(k));},
  steps:[
  {t:'On a send/return the effect must give <b>only</b> reverb (the dry voice already comes through the channel): turn the M350 <b>MIX</b> to 100 % (wet).',hl:['k:m350:mix'],check:()=>st('m350').mix>=.95,demo:[{set:['m350','mix',1]}]},
  {t:'Choose the reverb <b>TYPE</b>: <b>Plate</b> (bright, short — good for voices).',hl:['k:m350:type'],check:()=>st('m350').type==='Plate',demo:[{set:['m350','type','Plate']}]},
  {t:'Shorten the <b>DECAY</b> to about <b>1.2 s</b>: speech stays clear. Long decays (4 s, cathedral) blur the words.',hl:['k:m350:decay'],check:()=>st('m350').decay<=1.5,demo:[{set:['m350','decay',1.2]}]},
  {t:'How much reverb is heard is decided on the Midas: the <b>AUX IN 1-2</b> faders (layer AUX IN / USB). Press <b>Next</b>.'}]},
 {id:'comp',title:'A hardware compressor on the presenter (MDX4600 insert)',intro:'Channel 1 of the Midas has the first channel of the <b>MDX4600</b> on its <b>insert</b>: the voice leaves the desk after the preamp, goes through the compressor and comes back. The lesson switches the Midas on with the presenter.',
  setup:()=>{midas();Object.assign(st('mdx1'),{c1inout:true,c1thr:.5,c1ratio:.5,c1out:.5});['c1inout','c1thr','c1ratio','c1out'].forEach(k=>dev('mdx1').change&&dev('mdx1').change(k));},
  steps:[
  {t:'Press <b>IN/OUT</b> of channel 1 (bypass): listen to the voice without the compressor…',hl:['b:mdx1:c1inout'],check:()=>!st('mdx1').c1inout,demo:[{press:['mdx1','c1inout']}]},
  {t:'…and <b>IN/OUT</b> again to put it back in.',hl:['b:mdx1:c1inout'],check:()=>st('mdx1').c1inout,demo:[{press:['mdx1','c1inout']}]},
  {t:'Lower the <b>THRESHOLD</b> to about <b>−30 dB</b>: more of the voice is compressed (watch the red GAIN REDUCTION LEDs).',hl:['k:mdx1:c1thr'],check:()=>st('mdx1').c1thr<=.25,demo:[{set:['mdx1','c1thr',.2]}]},
  {t:'The voice got quieter: give it back with <b>OUTPUT</b> (make-up gain) about <b>+5 dB</b>.',hl:['k:mdx1:c1out'],check:()=>st('mdx1').c1out>=.6,demo:[{set:['mdx1','c1out',.65]}]}]}];
TUT.add({id:'ob',name:'Audio rack',ov:'ob',key,act,lessons:L});
})();
