/* ATEM tutorials (Vision → ATEM only): ATEM 1 M/E Advanced Panel 10 + Constellation. Engine: tutorial.js. */
(function(){
const A=()=>window.ATEMR&&ATEMR.api,PN=()=>window.APANEL,W=TUT.W;
/* 'sel@9' = the select / program / preview key that selects input 9 (whatever the panel's button mapping is) */
const res=k=>{const m=/^(sel|pgm|pvw)@(\d+)$/.exec(k);if(!m||!PN())return k;for(let i=0;i<10;i++)if(PN().src(i,false)===+m[2])return m[1]+i;return m[1]+(+m[2]-1);};
const key=k=>(k=res(k),document.querySelectorAll(`#cr .ap-k[data-k="${k}"],#cr .ap-knob[data-k="${k}"]`));
/* a known starting point for every lesson */
function reset(){const a=A(),P=PN()&&PN().P;if(!a||!P)return;const S=a.S;
  S.T=null;a.pgm(1);a.pvw(2);a.trans('mix');[1,2,3,4].forEach(n=>{S['key'+n].on=false;S['key'+n].a=0;});['dsk1','dsk2'].forEach(k=>{S[k].on=false;S[k].a=0;S[k].tie=false;});S.ftb.on=false;S.ftb.a=0;
  a.next({bkgd:true,k1:false,k2:false,k3:false,k4:false});a.setOut(2,9);a.setOut(3,10);a.setOut(4,12);a.setOut(9,'pgm');Object.assign(P,{menu:'home',shift:false,key:1,keySel:'fill',aux:0,homeTab:0});PN().draw();}
/* ---------- generated signals (simulator only) ----------
 * When a lesson needs a signal that is not there (e.g. vMix not running → nothing on IN 19/20), the tutorial generates a
 * sample one in its place and the card says so. The real signal always wins when it exists. */
function lowerThird(c,w,h,key){const x=w*.07,y=h*.72,bw=w*.52,bh=h*.15;
  if(key){c.fillStyle='#000';c.fillRect(0,0,w,h);c.fillStyle='#fff';c.fillRect(x,y,bw,bh);c.fillRect(x,y+bh,bw*.62,h*.06);return;}
  c.fillStyle='#000';c.fillRect(0,0,w,h);c.fillStyle='#173d7a';c.fillRect(x,y,bw,bh);c.fillStyle='#f39c12';c.fillRect(x,y,w*.012,bh);
  c.fillStyle='#e9eef6';c.fillRect(x,y+bh,bw*.62,h*.06);
  c.fillStyle='#fff';c.font=`700 ${Math.round(h*.065)}px system-ui,sans-serif`;c.textBaseline='middle';c.fillText('Ane Etxeberria',x+w*.03,y+bh*.5);
  c.fillStyle='#173d7a';c.font=`600 ${Math.round(h*.036)}px system-ui,sans-serif`;c.fillText('Presenter · Tartanga TV',x+w*.03,y+bh+h*.03);}
const L=[
 {id:'usk',title:'Upstream key on the M/E: picture in picture',intro:'An M/E (mix/effect) is the background (program / preview) plus up to 4 <b>upstream keys</b> on top of it. A key can be a DVE (a box: picture in picture), a LUMA key or a CHROMA key. Upstream keys go <b>with</b> the background: they can be part of the next transition.',
  setup:()=>{A().setKey(1,{type:'luma',fill:3,size:.35,x:.58,y:-.55});},
  steps:[
  {t:'Open the key settings: press <b>KEYERS</b> (system control, top left).',hl:['sys_KEYERS'],check:()=>PN().P.menu==='keyers',demo:[{k:'sys_KEYERS'}]},
  {t:'The LCD shows KEY 1. Turn <b>knob 2</b> (TYPE) until it says <b>DVE</b>.',hl:['knob1'],check:()=>A().key(1).type==='dve',demo:[{knob:1,d:-1}]},
  {t:'The select row (white keys) now chooses the <b>fill</b> of the key: press <b>Cam 2</b>.',hl:['sel@2'],check:()=>A().key(1).fill===2,demo:[{k:'sel@2'}]},
  {t:'Put the key on air straight away: press <b>ON</b> above KEY 1. Look at the programme: Cam 2 in a box over Cam 1.',hl:['on1'],check:()=>A().S.key1.on,demo:[{k:'on1'}]},
  {t:'Now take it off <b>with a transition</b>: in NEXT TRANSITION press <b>KEY 1</b> (only KEY 1 lit, BKGD off)…',hl:['k1'],check:()=>A().S.next.k1&&!A().S.next.bkgd,demo:[{k:'k1'}]},
  {t:'…and press <b>AUTO</b>: only the key fades out, the background (Cam 1) stays.',hl:['auto'],check:()=>!A().S.key1.on,demo:[{k:'auto'}]},
  {t:'Put BKGD back in NEXT TRANSITION (press <b>BKGD</b>) so CUT / AUTO change the background again.',hl:['bkgd'],check:()=>A().S.next.bkgd,demo:[{k:'bkgd'}]}]},
 {id:'chroma',title:'Chroma key in the M/E (without the Ultimatte)',intro:'The ATEM has its own chroma keyer in each upstream key. Here: Cam 3 (the presenter on green) over the background on program. The Ultimatte does it better (it is a dedicated keyer), but this is the quick way.',
  setup:()=>{A().setKey(1,{type:'dve',fill:2});A().pgm(9);},
  steps:[
  {t:'Press <b>KEYERS</b>.',hl:['sys_KEYERS'],check:()=>PN().P.menu==='keyers',demo:[{k:'sys_KEYERS'}]},
  {t:'Turn <b>knob 2</b> (TYPE) to <b>CHROMA</b>.',hl:['knob1'],check:()=>A().key(1).type==='chroma',demo:[{knob:1,d:-1}]},
  {t:'Choose the fill: <b>Cam 3</b> (select row).',hl:['sel@3'],check:()=>A().key(1).fill===3,demo:[{k:'sel@3'}]},
  {t:'Press <b>ON</b> (KEY 1): the green is removed and the presenter stands on the background (Ext 1, on program).',hl:['on1'],check:()=>A().S.key1.on,demo:[{k:'on1'}]},
  {t:'Change the background under the key: on PROGRAM press <b>Ext 2</b>.',hl:['pgm@10'],check:()=>A().S.pgm===10,demo:[{k:'pgm@10'}]},
  {t:'Turn the key off: <b>ON</b> again.',hl:['on1'],check:()=>!A().S.key1.on,demo:[{k:'on1'}]}]},
 {id:'dsk',title:'Downstream key (DSK): the graphics from vMix',intro:'The 2 DSKs come <b>after</b> the M/E: whatever is on program, the DSK stays on top (logos, lower thirds). Here DSK 1 = <b>fill IN 19 + key IN 20</b> = the vMix External output (in class, vMix has to be running with <b>External</b> on).',sig:[['vfill',(c,w,h)=>lowerThird(c,w,h,false)],['vkey',(c,w,h)=>lowerThird(c,w,h,true)]],sigNote:'vMix is not sending anything, so the tutorial puts a sample lower third on IN 19 (fill) / IN 20 (key). Open vMix with External on and its own graphics are used instead.',
  steps:[
  {t:'Press <b>DSK 1 CUT</b>: the graphics go on air at once.',hl:['dcut1'],check:()=>A().S.dsk1.on,demo:[{k:'dcut1'}]},
  {t:'Change the camera with <b>CUT</b> (preview Cam 2 is ready): the DSK stays on top.',hl:['cut'],check:()=>A().S.pgm===2,demo:[{k:'cut'}]},
  {t:'Make the DSK follow the next transition: press <b>DSK 1 TIE</b>…',hl:['tie1'],check:()=>A().S.dsk1.tie,demo:[{k:'tie1'}]},
  {t:'…and <b>AUTO</b>: the camera changes and the graphics go off together.',hl:['auto'],check:()=>!A().S.dsk1.on,demo:[{k:'auto'}]},
  {t:'<b>DSK 1 AUTO</b> fades them in on its own (at the DSK rate). Try it.',hl:['dauto1'],check:()=>A().S.dsk1.on,demo:[{k:'dauto1'}]},
  {t:'And <b>DSK 1 AUTO</b> again to fade them out.',hl:['dauto1'],check:()=>!A().S.dsk1.on,demo:[{k:'dauto1'}]}]},
 {id:'ftb',title:'Fade to black (FTB)',intro:'FTB is the last stage of the switcher: it fades the whole programme (keys and DSKs included) to black — the end of the show.',
  steps:[
  {t:'Press <b>FTB</b>: the programme fades to black (the key blinks while black).',hl:['ftb'],check:()=>A().S.ftb.on,demo:[{k:'ftb'}]},
  {t:'Press <b>FTB</b> again to come back.',hl:['ftb'],check:()=>!A().S.ftb.on,demo:[{k:'ftb'}]}]},
 {id:'aux',title:'Outputs (AUX): what each SDI OUT carries',intro:'The ATEM has 12 SDI outputs and each one can carry any source. On Inhar\'s sheet: OUT 1 = PGM, 2 = AUX, <b>OUT 3, 4, 5 = the backgrounds (BKG 1-3) of the 3 Ultimattes</b>, 9 vectorscope, 10 → its own IN 11, 11 = audio de-embedder, 12 = control-room TV. Changing OUT 3 changes the background of Ultimatte 1.',
  steps:[
  {t:'Press <b>AUX</b> (system control).',hl:['sys_AUX'],check:()=>PN().P.menu==='aux',demo:[{k:'sys_AUX'}]},
  {t:'Turn <b>knob 1</b> to <b>SDI Out 3</b> (BKG 1 → Ultimatte 1).',hl:['knob0'],check:()=>PN().P.aux===2,demo:[{knob:0,d:1,n:2}]},
  {t:'With the select row choose <b>Ext 2</b>. Look at <b>Ult 1</b> on the multiview: the presenter is now in the warm studio.',hl:['sel@10'],check:()=>A().st().outs[2]===10,demo:[{k:'sel@10'}]},
  {t:'Put the news set back: <b>Ext 1</b>.',hl:['sel@9'],check:()=>A().st().outs[2]===9,demo:[{k:'sel@9'}]}]},
 {id:'loop',title:'Re-entry: the multiview back into the ATEM (and why not on air)',intro:'Internal sources (program, preview, clean feed, colours, bars, media players…) can be chosen on any bus or output <b>without a cable</b>. The multiview is the exception: to use it as a source it has to leave the ATEM and come back in — the sheet\'s <b>OUT 10 → IN 11</b> cable. But careful: the multiview shows the programme, so putting it on air makes a <b>tunnel</b> (the multiview inside itself, like a camera pointed at its own monitor).',
  outro:'So the multiview is <b>not for program</b>. To record or stream it you don\'t even need the loop: on Inhar\'s sheet MV 1 already reaches the Videohub on its own (<b>IN 19</b>). Route <b>Videohub OUT 18 (HyperDeck) ← IN 19</b> to record it, or OUT 10 (vMix streaming) to stream it.',
  steps:[
  {t:'Press <b>AUX</b>.',hl:['sys_AUX'],check:()=>PN().P.menu==='aux',demo:[{k:'sys_AUX'}]},
  {t:'<b>Knob 1</b> → <b>SDI Out 10</b> (the output cabled back to IN 11).',hl:['knob0'],check:()=>PN().P.aux===9,demo:[{knob:0,d:-1,n:3}]},
  {t:'<b>Knob 2</b> (internal sources) → <b>Multiview 1</b>. Now IN 11 ("Loop") carries the multiview.',hl:['knob1'],check:()=>A().st().outs[9]==='mv1',demo:[{knob:1,d:1,n:3}]},
  {t:'IN 11 is on the second page of buttons: press <b>SHIFT</b>…',hl:['shift2'],check:()=>PN().P.shift,demo:[{k:'shift2'}]},
  {t:'…and <b>button 1</b> on PREVIEW (= IN 11). Only on <b>preview</b>, never on air: look at the preview window of the multiview — the multiview inside itself, smaller and smaller (the tunnel).',hl:['pvw0'],check:()=>A().S.pvw===11,demo:[{k:'pvw0'}]},
  {t:'That is why it does not go to program. Take it out of preview: <b>SHIFT</b> off…',hl:['shift2'],check:()=>!PN().P.shift,demo:[{k:'shift2'}]},
  {t:'…and <b>Cam 2</b> on PREVIEW.',hl:['pvw@2'],check:()=>A().S.pvw===2,demo:[{k:'pvw@2'}]}]}];
/* ---------- engine ---------- */

async function act(a){const P=PN();if(!P)return;if(a.k){key(a.k).forEach(e=>e.classList.add('down'));P.press(res(a.k));await W(260);key(a.k).forEach(e=>e.classList.remove('down'));}
  else if(a.knob!=null){for(let i=0;i<(a.n||1);i++){P.knob(a.knob,a.d);await W(220);}}}
TUT.add({id:'atem',name:'ATEM',ov:'cr',when:()=>document.getElementById('cr').classList.contains('f-atem'),key,act,reset,redraw:()=>PN()&&PN().draw(),lessons:L});
})();
