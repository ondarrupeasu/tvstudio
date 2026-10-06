/* Tutorials (student mode), shared by every simulator. A simulator registers a SET of lessons with TUT.add({...}):
 *   id, name, ov (overlay id, e.g. 'cr'), when() (optional: is this set usable in the current view),
 *   key(k) → elements to highlight for key k, act(a) → performs a demo action (async), reset() → known starting point,
 *   cleanup() (optional, when a lesson ends), lessons:[{id,title,intro,outro,setup,cleanup,sig,sigNote,steps}].
 * A step = {t (text), hl:[keys], check() (ticked when true; no check = the student presses "Next"), demo:[actions]}.
 * Demo actions: {fn:async()=>…} or anything the set's act() understands. "▶ Watch" = the simulator does every step
 * (the control pulses, then it is operated); "✋ Do it" = the student does it ("Show me" plays just that step).
 * sig = signals the lesson needs that may be missing ([[VH_SOURCES kind, generator]]): the real one always wins,
 * the generated one is used only when the real one is absent, and the card says so ("Simulator only"). */
(function(){
const W=ms=>new Promise(r=>setTimeout(r,ms));
const SETS=[];let entered=null,set=null,cur=null,step=0,mode='do',timer=null,playing=false,stopReq=false,sigSaved={},sigUsed=false;
const card=()=>document.getElementById('tut-card'),menuEl=()=>document.getElementById('tut-menu');
/* ---------- generated signals (simulator only) ---------- */
function sigOn(list){sigOff();(list||[]).forEach(([k,gen])=>{const o=window.VH_SOURCES&&VH_SOURCES[k];sigSaved[k]=o;window.VH_SOURCES=window.VH_SOURCES||{};
  VH_SOURCES[k]=(c,w,h)=>{if(o&&o(c,w,h)!==false)return;gen(c,w,h);if(!sigUsed){sigUsed=true;render();}};});}
function sigOff(){for(const k in sigSaved){if(sigSaved[k])VH_SOURCES[k]=sigSaved[k];else delete VH_SOURCES[k];}sigSaved={};sigUsed=false;}
/* ---------- highlight / demo ---------- */
const navKey=k=>k==='nav:prev'?document.querySelectorAll('#simnav .sn-p'):k==='nav:next'?document.querySelectorAll('#simnav .sn-n'):null;
function hl(ids){document.querySelectorAll('.tut-hl').forEach(e=>e.classList.remove('tut-hl'));if(!set)return;(ids||[]).forEach(k=>[...(navKey(k)||set.key(k)||[])].forEach(e=>e&&e.classList.add('tut-hl')));}
async function act(a){if(a.fn)return a.fn();if(a.wait)return W(a.wait);return set.act&&set.act(a);}
async function demo(s){for(const a of s.demo||[]){if(stopReq)return;if(a.hl)hl(a.hl);await act(a);await W(380);}}
const readMs=s=>Math.min(6000,Math.max(1600,(s.t||'').replace(/<[^>]+>/g,'').length*32));
/* ---------- card ---------- */
function render(){const c=card(),s=cur&&cur.steps[step];if(!c)return;if(!cur){c.classList.remove('on');hl([]);return;}c.classList.add('on');
  const done=step>=cur.steps.length,next=!done&&!s.check;
  if(s&&s!==entered){entered=s;try{s.enter&&s.enter();}catch(_){}}   // a step can reset its own bookkeeping when it starts
  c.innerHTML=`<div class="tut-hd"><b>${cur.title}</b><button data-t="x" title="Exit the tutorial">✕</button></div>`+(sigUsed&&cur.sigNote?`<p class="tut-sim">🎓 Simulator only: ${cur.sigNote}</p>`:'')+
    (step===0&&!done&&cur.intro?`<p class="tut-intro">${cur.intro}</p>`:'')+
    (done?`<p class="tut-step">✓ Lesson done. ${mode==='do'?'Well done!':''}</p>${cur.outro?`<p class="tut-intro">${cur.outro}</p>`:''}<div class="tut-btns"><button data-t="again">Again</button><button data-t="menu">Other lessons</button></div>`:
    `<div class="tut-prog">${mode==='watch'?'▶ Watching':'✋ Your turn'} · step ${step+1} / ${cur.steps.length}</div><p class="tut-step">${s.t}</p>
     <div class="tut-btns">${mode==='do'&&s.demo&&s.demo.length?'<button data-t="show">Show me</button>':''}<button data-t="back" ${step?'':'disabled'}>◀</button><button data-t="skip">${next?'Next ▶':'Skip ▶'}</button>${mode==='watch'?'<button data-t="pause">'+(playing?'❚❚ Pause':'▶ Play')+'</button>':''}</div>`);
  hl(done?[]:s.hl);}
function stop(){entered=null;stopReq=true;playing=false;clearInterval(timer);try{cur&&cur.cleanup&&cur.cleanup();set&&set.cleanup&&set.cleanup();}catch(_){}sigOff();cur=null;render();}
function start(st,l,m){build();stop();menuEl()&&menuEl().classList.remove("on");set=st;cur=l;mode=m;step=0;try{st.reset&&st.reset();}catch(e){console.warn(e);}sigOn(l.sig);try{l.setup&&l.setup();}catch(e){console.warn(e);}st.redraw&&st.redraw();stopReq=false;render();
  let tick=0;timer=setInterval(()=>{if(!cur||step>=cur.steps.length)return;const s=cur.steps[step];if(++tick%5===0&&!playing)hl(s.hl);if(playing)return;if(!s.check)return;try{if(s.check()){hl([]);step++;setTimeout(render,450);}}catch(_){}},200);
  if(m==='watch')play();}
async function play(){if(playing)return;playing=true;stopReq=false;render();
  while(cur&&step<cur.steps.length&&!stopReq&&playing){const s=cur.steps[step];render();await W(readMs(s));if(!playing||stopReq)break;await demo(s);await W(900);if(!playing||stopReq)break;if(step<cur.steps.length)step++;}
  playing=false;render();}
/* ---------- menu + one 🎓 button per simulator header ---------- */
const setsFor=ov=>SETS.filter(s=>s.ov===ov&&(!s.when||s.when()));
function menu(ov){const m=menuEl(),ss=setsFor(ov);if(m.classList.contains('on')){m.classList.remove('on');return;}
  m.innerHTML=`<div class="tut-hd"><b>${ss.map(s=>s.name).join(' · ')} tutorials</b><button data-t="close">✕</button></div><p class="tut-intro">Choose a lesson: <b>▶ Watch</b> = the simulator does it, step by step · <b>✋ Do it</b> = you do it (each step is ticked when the equipment gets there; "Show me" if you are stuck). Drag the lesson card by its title if it covers something.</p>`+
  ss.map(s=>(ss.length>1?`<div class="tut-sub">${s.name}</div>`:'')+s.lessons.map((l,i)=>`<div class="tut-l"><span>${i+1}. ${l.title}</span><button data-s="${s.id}" data-w="${i}">▶ Watch</button><button data-s="${s.id}" data-d="${i}">✋ Do it</button></div>`).join('')).join('');m.classList.add('on');}
function build(){if(document.getElementById('tut-card'))return;
  document.body.insertAdjacentHTML('beforeend','<div class="tut-card" id="tut-card"></div><div class="tut-menu" id="tut-menu"></div>');
  menuEl().addEventListener('click',e=>{const t=e.target;if(t.dataset.t==='close'){menuEl().classList.remove('on');return;}
    const i=t.dataset.w??t.dataset.d;if(i==null)return;const st=SETS.find(s=>s.id===t.dataset.s);menuEl().classList.remove('on');start(st,st.lessons[+i],t.dataset.w!=null?'watch':'do');});
  card().addEventListener('pointerdown',e=>{const hd=e.target.closest('.tut-hd');if(!hd||e.target.closest('button'))return;const c=card(),r=c.getBoundingClientRect(),dx=e.clientX-r.left,dy=e.clientY-r.top;
    hd.setPointerCapture(e.pointerId);const mv=ev=>{c.style.left=Math.max(0,Math.min(innerWidth-r.width,ev.clientX-dx))+'px';c.style.top=Math.max(0,Math.min(innerHeight-40,ev.clientY-dy))+'px';c.style.bottom='auto';};
    const up=()=>{hd.removeEventListener('pointermove',mv);hd.removeEventListener('pointerup',up);};hd.addEventListener('pointermove',mv);hd.addEventListener('pointerup',up);});
  card().addEventListener('click',async e=>{const t=e.target.dataset.t;if(!t)return;
    if(t==='x'){stop();return;}
    if(t==='menu'){const ov=set.ov;stop();menu(ov);return;}if(t==='again'){start(set,cur,mode);return;}
    if(t==='skip'){step=Math.min(cur.steps.length,step+1);render();return;}if(t==='back'){step=Math.max(0,step-1);render();return;}
    if(t==='pause'){if(playing){playing=false;render();}else play();return;}
    if(t==='show'){const s=cur.steps[step];e.target.disabled=true;stopReq=false;await demo(s);if(cur&&cur.steps[step]===s&&!s.check){step++;render();}}});}
/* keep each simulator's 🎓 button in its header, visible only when it has lessons for the current view;
   leaving the simulator (or switching to a view without those lessons) ends the lesson */
function sync(){build();
  new Set(SETS.map(s=>s.ov)).forEach(ov=>{const root=document.getElementById(ov),own=SETS.find(s=>s.ov===ov&&s.host),host=own?own.host():root&&root.querySelector('.pwr-hd .pwr-btns');if(!host)return;
    let b=host.querySelector(`.tut-btn[data-ov="${ov}"]`);if(!b){b=document.createElement('button');b.className='tut-btn';b.dataset.ov=ov;b.textContent='🎓 Tutorials';b.title='Student mode: lessons (watch them or do them)';b.onclick=()=>menu(ov);host.prepend(b);}
    b.hidden=!setsFor(ov).length||(own&&!root.classList.contains('on'));});   /* a shared host (vMix: the simulator arrows) shows it only while that simulator is open */
  if(cur&&set){const on=id=>document.getElementById(id)?.classList.contains('on'),here=on(set.ov)&&(!set.when||set.when());
    if(!here&&!(cur.ovs||[]).some(on))stop();}   // a lesson may visit other simulators (cur.ovs), e.g. Lighting → Power → Lighting
  const m=menuEl();if(m&&m.classList.contains('on')&&!SETS.some(s=>document.getElementById(s.ov)?.classList.contains('on')))m.classList.remove('on');}
setInterval(sync,500);
window.TUT={add:s=>{SETS.push(s);},W,go:async(from,to)=>{window[from]&&window[from]();window[to]&&window[to]();await W(500);},sets:SETS,start:(id,i,m)=>{const s=SETS.find(x=>x.id===id);start(s,s.lessons[i],m||'do');},stop,get state(){return{set:set&&set.id,lesson:cur&&cur.id,step,playing};}};
})();
