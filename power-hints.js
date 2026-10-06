/* Simulator help: when a simulator is open and its equipment is switched off (the most common reason "nothing
 * works" in class), a bubble points at the switch that is missing. It disappears as soon as it is switched on,
 * and is not shown while a tutorial lesson is running (the lesson guides instead). */
(function(){
const on=id=>document.getElementById(id)?.classList.contains('on');
const q=s=>document.querySelector(s);
const RULES=[
  {ov:'mx',off:()=>window.M32&&M32.G&&!M32.G.power,at:()=>q('#mx .mx-power'),t:'The console is <b>off</b>: switch it on here (POWER, rear panel).'},
  {ov:'dsk',off:()=>window.DESK&&!DESK.D.power,at:()=>q('#dsk .dk-power'),t:'The desk is <b>off</b>: POWER here (rear panel).'},
  {ov:'dsk',off:()=>window.DESK&&DESK.D.power&&window.PWR&&!(PWR.rcd&&(PWR.led||PWR.dim)),at:()=>q('#simnav .sn-p'),t:'No mains for the lights: switch on the breakers in <b>◀ Power</b> (RCD, LED, Dimmers).'},
  {ov:'ob',off:()=>window.M32&&M32.G&&!M32.G.power,at:()=>q('#simnav .sn-p'),t:'No sound in the rack: the <b>Midas is off</b> (◀ Midas → POWER).'},
  {ov:'ob',off:()=>window.AR&&AR.dev.jvc&&!AR.dev.jvc.st.power,at:()=>q('#ob .ar-b[data-d="jvc"][data-b="power"]'),t:'The amplifier is <b>off</b>: JVC POWER (no sound in the speakers).'}];
let el=null;
function bubble(){if(!el){el=document.createElement('div');el.className='pw-hint';document.body.appendChild(el);}return el;}
function tick(){const busy=window.TUT&&(TUT.state.lesson||document.getElementById('tut-menu')?.classList.contains('on'));
  const r=!busy&&RULES.find(x=>on(x.ov)&&(()=>{try{return x.off();}catch(_){return false;}})());
  const t=r&&r.at(),b=t&&t.getBoundingClientRect();
  if(!r||!b||!b.width){if(el)el.classList.remove('on');return;}
  const e=bubble();if(e.dataset.k!==r.t){e.innerHTML=`<small>Simulator help</small>${r.t}`;e.dataset.k=r.t;}e.classList.add('on');
  const w=e.offsetWidth,h=e.offsetHeight,below=b.top<h+24;
  e.classList.toggle('below',below);e.style.left=Math.max(8,Math.min(innerWidth-w-8,b.left+b.width/2-w/2))+'px';e.style.top=(below?b.bottom+12:b.top-h-12)+'px';
  e.style.setProperty('--ax',(b.left+b.width/2-parseFloat(e.style.left))+'px');}
setInterval(tick,600);
})();
