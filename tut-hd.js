/* HyperDeck Studio HD Pro tutorials (Vision → ATEM only, above the switcher). Engine: tutorial.js.
 * Inhar's cabling: its SDI IN comes from Videohub OUT 18 (normally the ATEM programme); its SDI outs = fill / key → ATEM IN 13 / 14. */
(function(){
const W=TUT.W,D=()=>window.HDR,H=()=>D().state,A=()=>window.ATEMR&&ATEMR.api,PN=()=>window.APANEL;
let n0=0;
function reset(){const h=H();if(h.state!=='stop'&&h.state!=='rec')D().press('stop');h.menu=null;h.input='sdi';h.loop=false;h.rem=false;n0=h.clips.length;if(PN()){PN().P.shift=false;PN().draw();}}
const key=k=>k.startsWith('ap:')?document.querySelectorAll(`#cr .ap-k[data-k="${k.slice(3)}"]`):k==='lcd'?document.querySelectorAll('#hd-lcd'):document.querySelectorAll(`#hd-fsvg .hd-k[data-k="${k}"]`);
async function act(a){if(a.k){key(a.k).forEach(e=>e.classList.add('down'));D().press(a.k);await W(220);key(a.k).forEach(e=>e.classList.remove('down'));}
  else if(a.ap){key('ap:'+a.ap).forEach(e=>e.classList.add('down'));PN().press(a.ap);await W(220);key('ap:'+a.ap).forEach(e=>e.classList.remove('down'));}}
/* the PROGRAM key that selects ATEM input n (input 11-20 = SHIFT page) */
const pgmKey=n=>{for(let i=0;i<10;i++)if(PN().src(i,PN().P.shift)===n)return 'pgm'+i;return 'pgm'+((n-1)%10);};
const L=[
 {id:'rec',title:'Record the programme and play it back',intro:'The HyperDeck is the recorder of the control room: it records what reaches its SDI input (Videohub OUT 18 = the ATEM programme) onto the SSD as clips. Its LCD shows the input, or the clip when playing.',
  steps:[
  {t:'Press <b>REC</b>: the red light comes on and the timecode runs. Let it record a few seconds (change cameras on the ATEM meanwhile if you like).',hl:['rec'],check:()=>H().state==='rec',demo:[{k:'rec'},{wait:3000}]},
  {t:'Press <b>STOP</b>: the clip is closed and appears in the clip list under the HyperDeck.',hl:['stop'],check:()=>H().state==='stop'&&H().clips.length>n0,demo:[{k:'stop'},{wait:800}]},
  {t:'Press <b>PLAY</b>: the clip plays on the LCD (and on the HyperDeck\'s SDI outputs).',hl:['play'],check:()=>H().state==='play',demo:[{k:'play'}]},
  {t:'<b>SKIP ◀</b> goes back to the start of the clip.',hl:['skipb'],demo:[{k:'skipb'}]},
  {t:'<b>STOP</b>.',hl:['stop'],check:()=>H().state==='stop',demo:[{k:'stop'}]}]},
 {id:'replay',title:'A replay on air (HyperDeck → ATEM IN 13)',intro:'On Inhar\'s sheet the HyperDeck\'s SDI out goes back into the ATEM (<b>IN 13</b>, "fill grabadora SSD"). So a recorded clip can go on air like any camera — a <b>replay</b>. IN 13 is on the second page of the ATEM buttons (SHIFT).',
  steps:[
  {t:'If there is no clip yet: <b>REC</b>, a few seconds, <b>STOP</b> (otherwise press Next).',hl:['rec','stop'],check:()=>H().clips.length>0&&H().state!=='rec',demo:[{k:'rec'},{wait:3000},{k:'stop'},{wait:800}]},
  {t:'Press <b>PLAY</b> on the HyperDeck, and <b>PLAY again</b> = loop (so the clip keeps playing while you cut to it).',hl:['play'],check:()=>H().state==='play'&&H().loop,demo:[{k:'play'},{k:'play'}]},
  {t:'On the ATEM press <b>SHIFT</b> (buttons 11-20)…',hl:['ap:shift1'],check:()=>PN().P.shift,demo:[{ap:'shift1'}]},
  {t:'…and PROGRAM button <b>3</b> = IN 13: the replay is on air.',hl:['ap:pgm2'],check:()=>A().S.pgm===13,demo:[{fn:async()=>{const k=pgmKey(13);key('ap:'+k).forEach(e=>e.classList.add('down'));PN().press(k);await W(220);key('ap:'+k).forEach(e=>e.classList.remove('down'));}}]},
  {t:'Back to the cameras: <b>SHIFT</b> off and PROGRAM <b>Cam 1</b>. Then <b>STOP</b> the HyperDeck.',hl:['ap:shift1','ap:pgm0','stop'],check:()=>A().S.pgm===1&&H().state==='stop',demo:[{ap:'shift1'},{fn:async()=>{PN().press(pgmKey(1));}},{k:'stop'}]}]}];
TUT.add({id:'hd',name:'HyperDeck',ov:'cr',when:()=>document.getElementById('cr').classList.contains('f-atem'),key,act,reset,lessons:L});
})();
