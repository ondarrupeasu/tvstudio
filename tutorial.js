/* Tutorials (student mode) for the vision desk: each lesson = steps. "▶ Watch" = the simulator does it (the key it presses
 * pulses, then it is pressed); "✋ Do it" = the student does it — the step is ticked when the switcher reaches the right state
 * ("Show me" plays just that step). Works on the ATEM 1 M/E Advanced Panel 10 + Constellation of the control room (#cr). */
(function(){
const A=()=>window.ATEMR&&ATEMR.api,PN=()=>window.APANEL,W=ms=>new Promise(r=>setTimeout(r,ms));
/* 'sel@9' = the select / program / preview key that selects input 9 (whatever the panel's button mapping is) */
const res=k=>{const m=/^(sel|pgm|pvw)@(\d+)$/.exec(k);if(!m||!PN())return k;for(let i=0;i<10;i++)if(PN().src(i,false)===+m[2])return m[1]+i;return m[1]+(+m[2]-1);};
const key=k=>(k=res(k),document.querySelectorAll(`#cr .ap-k[data-k="${k}"],#cr .ap-knob[data-k="${k}"]`));
/* a known starting point for every lesson */
function reset(){const a=A(),P=PN()&&PN().P;if(!a||!P)return;const S=a.S;
  S.T=null;a.pgm(1);a.pvw(2);a.trans('mix');[1,2,3,4].forEach(n=>{S['key'+n].on=false;S['key'+n].a=0;});['dsk1','dsk2'].forEach(k=>{S[k].on=false;S[k].a=0;S[k].tie=false;});S.ftb.on=false;S.ftb.a=0;
  a.next({bkgd:true,k1:false,k2:false,k3:false,k4:false});a.setOut(2,9);a.setOut(3,10);a.setOut(4,12);a.setOut(9,'pgm');Object.assign(P,{menu:'home',shift:false,key:1,keySel:'fill',aux:0,homeTab:0});PN().draw();}
/* ---------- lessons ---------- */
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
 {id:'dsk',title:'Downstream key (DSK): the graphics from vMix',intro:'The 2 DSKs come <b>after</b> the M/E: whatever is on program, the DSK stays on top (logos, lower thirds). Here DSK 1 = <b>fill IN 19 + key IN 20</b> = the vMix External output (vMix has to be running with <b>External</b> on to see the graphics).',
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
 {id:'loop',title:'Re-entry: an ATEM signal back into the ATEM',intro:'Internal sources (program, preview, clean feed, colours, bars, media players…) can be chosen on any bus or output <b>without a cable</b>. The multiview is the exception: to put it on air it has to leave the ATEM and come back in. That is what the sheet\'s <b>OUT 10 → IN 11</b> cable can do.',
  steps:[
  {t:'Press <b>AUX</b>.',hl:['sys_AUX'],check:()=>PN().P.menu==='aux',demo:[{k:'sys_AUX'}]},
  {t:'<b>Knob 1</b> → <b>SDI Out 10</b>.',hl:['knob0'],check:()=>PN().P.aux===9,demo:[{knob:0,d:-1,n:3}]},
  {t:'<b>Knob 2</b> (internal sources) → <b>Multiview 1</b>.',hl:['knob1'],check:()=>A().st().outs[9]==='mv1',demo:[{knob:1,d:1,n:3}]},
  {t:'IN 11 ("Loop") is on the second page of buttons: press <b>SHIFT</b>…',hl:['shift2'],check:()=>PN().P.shift,demo:[{k:'shift2'}]},
  {t:'…and <b>button 1</b> on PREVIEW (= IN 11).',hl:['pvw0'],check:()=>A().S.pvw===11,demo:[{k:'pvw0'}]},
  {t:'<b>CUT</b>: the multiview is on air (a split screen with every camera).',hl:['cut'],check:()=>A().S.pgm===11,demo:[{k:'cut'}]},
  {t:'Back to Cam 1: <b>SHIFT</b> off and <b>Cam 1</b> on PROGRAM.',hl:['shift2','pgm@1'],check:()=>A().S.pgm===1,demo:[{k:'shift2'},{k:'pgm@1'}]}]}];
/* ---------- engine ---------- */
let cur=null,step=0,mode='do',timer=null,playing=false,stopReq=false;
const card=()=>document.getElementById('tut-card');
function hl(ids){document.querySelectorAll('#cr .tut-hl').forEach(e=>e.classList.remove('tut-hl'));(ids||[]).forEach(k=>key(k).forEach(e=>e.classList.add('tut-hl')));}
async function act(a){const P=PN();if(!P)return;if(a.k){key(a.k).forEach(e=>e.classList.add('down'));P.press(res(a.k));await W(260);key(a.k).forEach(e=>e.classList.remove('down'));}
  else if(a.knob!=null){for(let i=0;i<(a.n||1);i++){P.knob(a.knob,a.d);await W(220);}}}
async function demo(s){for(const a of s.demo){if(stopReq)return;await act(a);await W(380);}}
function render(){const c=card(),s=cur&&cur.steps[step];if(!c)return;if(!cur){c.classList.remove('on');hl([]);return;}c.classList.add('on');
  const done=step>=cur.steps.length;
  c.innerHTML=`<div class="tut-hd"><b>${cur.title}</b><button data-t="x" title="Exit the tutorial">✕</button></div>`+
    (step===0&&!done?`<p class="tut-intro">${cur.intro}</p>`:'')+
    (done?`<p class="tut-step">✓ Lesson done. ${mode==='do'?'Well done!':''}</p><div class="tut-btns"><button data-t="again">Again</button><button data-t="menu">Other lessons</button></div>`:
    `<div class="tut-prog">${mode==='watch'?'▶ Watching':'✋ Your turn'} · step ${step+1} / ${cur.steps.length}</div><p class="tut-step">${s.t}</p>
     <div class="tut-btns">${mode==='do'?'<button data-t="show">Show me</button>':''}<button data-t="back" ${step?'':'disabled'}>◀</button><button data-t="skip">Skip ▶</button>${mode==='watch'?'<button data-t="pause">'+(playing?'❚❚ Pause':'▶ Play')+'</button>':''}</div>`);
  hl(done?[]:s.hl);}
function start(l,m){stopReq=true;clearInterval(timer);cur=l;mode=m;step=0;reset();l.setup&&l.setup();PN()&&PN().draw();stopReq=false;render();
  timer=setInterval(()=>{if(!cur||step>=cur.steps.length||playing)return;const s=cur.steps[step];try{if(s.check()){hl([]);step++;setTimeout(render,450);}}catch(_){}} ,200);
  if(m==='watch')play();}
async function play(){if(playing)return;playing=true;render();while(cur&&step<cur.steps.length&&!stopReq&&playing){const s=cur.steps[step];render();await W(1500);if(!playing||stopReq)break;await demo(s);await W(900);if(!playing||stopReq)break;if(step<cur.steps.length)step++;}playing=false;render();}
function menu(){const m=document.getElementById('tut-menu');m.innerHTML=`<div class="tut-hd"><b>ATEM tutorials</b><button data-t="close">✕</button></div><p class="tut-intro">Choose a lesson: <b>▶ Watch</b> = the simulator does it, step by step · <b>✋ Do it</b> = you do it (each step is ticked when the switcher gets there; "Show me" if you are stuck).</p>`+
  L.map((l,i)=>`<div class="tut-l"><span>${i+1}. ${l.title}</span><button data-w="${i}">▶ Watch</button><button data-d="${i}">✋ Do it</button></div>`).join('');m.classList.toggle('on');}
function build(){if(document.getElementById('tut-card'))return;const cr=document.getElementById('cr');if(!cr||!cr.querySelector('.pwr-btns'))return;
  cr.insertAdjacentHTML('beforeend','<div class="tut-card" id="tut-card"></div><div class="tut-menu" id="tut-menu"></div>');
  const b=document.createElement('button');b.id='tut-btn';b.textContent='🎓 Tutorials';b.title='Student mode: lessons on the ATEM (watch them or do them)';cr.querySelector('.pwr-btns').prepend(b);b.onclick=menu;
  document.getElementById('tut-menu').addEventListener('click',e=>{const t=e.target;if(t.dataset.t==='close'){t.closest('.tut-menu').classList.remove('on');return;}
    const i=t.dataset.w??t.dataset.d;if(i==null)return;document.getElementById('tut-menu').classList.remove('on');start(L[+i],t.dataset.w!=null?'watch':'do');});
  card().addEventListener('click',async e=>{const t=e.target.dataset.t;if(!t)return;
    if(t==='x'){stopReq=true;playing=false;clearInterval(timer);cur=null;render();return;}
    if(t==='menu'){cur=null;render();menu();return;}if(t==='again'){start(cur,mode);return;}
    if(t==='skip'){step=Math.min(cur.steps.length,step+1);render();return;}if(t==='back'){step=Math.max(0,step-1);render();return;}
    if(t==='pause'){if(playing){playing=false;render();}else play();return;}
    if(t==='show'){const s=cur.steps[step];e.target.disabled=true;await demo(s);}});}
const iv=setInterval(()=>{if(document.getElementById('cr')?.dataset.built){build();if(document.getElementById('tut-btn'))clearInterval(iv);}},500);
window.TUTORIAL={lessons:L,start:(i,m)=>start(L[i],m||'do')};
})();
