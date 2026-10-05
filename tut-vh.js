/* Video rack tutorials: Smart Videohub 20×20 front panel (routing) — Inhar's cabling. Engine: tutorial.js.
 * The routes and locks are put back as they were when the lesson ends. */
(function(){
const W=TUT.W,V=()=>window.VH,st=()=>V().state(),U=()=>V().ui();
let snap=null;
function reset(){const s=st();snap=JSON.stringify({routes:s.routes,locks:s.locks,useTake:s.useTake});s.locks=s.locks.map(()=>false);s.useTake=true;
  Object.assign(U(),{mode:'dest',dest:0,pend:null,menu:null,msg:''});V().save();}
function cleanup(){if(!snap)return;Object.assign(st(),JSON.parse(snap));snap=null;Object.assign(U(),{pend:null,menu:null,msg:''});V().save();}
const key=k=>k.startsWith('in:')?document.querySelectorAll(`#vh .vh-sock[data-s="i${+k.slice(3)-1}"]`):k.startsWith('out:')?document.querySelectorAll(`#vh .vh-sock[data-s="o${+k.slice(4)-1}"]`):
  document.querySelectorAll(`#vh-fsvg .vh-k[data-k="${k}"]`);
async function act(a){if(a.k){key(a.k).forEach(e=>e.classList.add('down'));V().press(a.k);await W(220);key(a.k).forEach(e=>e.classList.remove('down'));}}
const seq=(...ks)=>ks.map(k=>({k}));
const L=[
 {id:'route',title:'Route a source to a destination (DEST → SRC → TAKE)',intro:'The Videohub connects any <b>input</b> (source, IN 1-20) to any <b>output</b> (destination, OUT 1-20). On the front panel: choose the destination, then the source, then confirm with <b>TAKE</b>. Example: the control-room monitor 1 (<b>OUT 19</b>) normally shows the multiview (IN 19); send it <b>camera 2</b> (IN 2) to check that camera full screen.',
  setup:()=>{U().mode='src';},
  steps:[
  {t:'Press <b>DEST</b> (the number keys now choose a destination)…',hl:['dest'],check:()=>U().mode==='dest',demo:seq('dest')},
  {t:'…and <b>19</b> (OUT 19 = MON 1). The LCD shows the destination and what it carries now.',hl:['n19'],check:()=>U().mode==='dest'&&U().dest===18,demo:seq('n19')},
  {t:'Press <b>SRC</b>…',hl:['src'],check:()=>U().mode==='src',demo:seq('src')},
  {t:'…and <b>2</b> (IN 2 = CAM 2). TAKE starts flashing: nothing has changed yet.',hl:['n2'],check:()=>U().pend===1,demo:seq('n2')},
  {t:'Press <b>TAKE</b>: now OUT 19 carries camera 2.',hl:['take'],check:()=>st().routes[18]===1,demo:seq('take')},
  {t:'Put the multiview back on MON 1: <b>SRC</b>, <b>19</b> (IN 19 = MV 1), <b>TAKE</b> (the destination is still OUT 19).',hl:['src','n19','take'],check:()=>st().routes[18]===18,demo:seq('src','n19','take')}]},
 {id:'record',title:'Record something else on the HyperDeck',intro:'The HyperDeck records whatever arrives at Videohub <b>OUT 18</b> — normally IN 9, the ATEM programme. Changing that route changes what gets recorded, without touching any cable. Example: record the <b>multiview</b> (IN 19), useful to review a whole rehearsal.',
  steps:[
  {t:'<b>DEST</b> and <b>18</b> (OUT 18 = SSD recorder input).',hl:['dest','n18'],check:()=>U().mode==='dest'&&U().dest===17,demo:seq('dest','n18')},
  {t:'<b>SRC</b>, <b>19</b> (MV 1) and <b>TAKE</b>. Look at the HyperDeck in Vision: its input now shows the multiview.',hl:['src','n19','take'],check:()=>st().routes[17]===18,demo:seq('src','n19','take')},
  {t:'Back to the programme: <b>SRC</b>, <b>9</b> (IN 9 = ATEM PGM), <b>TAKE</b>.',hl:['src','n9','take'],check:()=>st().routes[17]===8,demo:seq('src','n9','take')}]},
 {id:'clear',title:'Changed your mind? CLEAR before TAKE',intro:'Until you press TAKE nothing changes on the outputs: <b>CLEAR</b> cancels the pending source. This protects the outputs that are on air (OUT 10 = vMix streaming, OUT 1-8 = the ATEM inputs).',
  steps:[
  {t:'<b>DEST</b>, <b>10</b> (OUT 10 = vMix streaming: careful, it is on air!).',hl:['dest','n10'],check:()=>U().mode==='dest'&&U().dest===9,demo:seq('dest','n10')},
  {t:'<b>SRC</b>, <b>5</b> (VTR) — TAKE flashes, but don\'t press it…',hl:['src','n5'],check:()=>U().pend===4,demo:seq('src','n5')},
  {t:'…press <b>CLEAR</b>: the change is cancelled, the stream never saw it.',hl:['clear'],check:()=>U().pend==null&&st().routes[9]!==4,demo:seq('clear')}]},
 {id:'lock',title:'Lock a destination',intro:'A destination can be <b>locked</b> so nobody changes it by mistake (e.g. the recorder or the stream during a show). Hold <b>DEST</b> for 2 seconds with that destination selected.',
  steps:[
  {t:'<b>DEST</b>, <b>18</b> (the HyperDeck input).',hl:['dest','n18'],check:()=>U().mode==='dest'&&U().dest===17,demo:seq('dest','n18')},
  {t:'<b>Hold DEST for 2 seconds</b>: the LCD says "Locked".',hl:['dest'],check:()=>st().locks[17],demo:[{fn:async()=>{key('dest').forEach(e=>e.classList.add('down'));await W(2000);st().locks[17]=true;U().msg='Locked';V().save();key('dest').forEach(e=>e.classList.remove('down'));}}]},
  {t:'Try to change it: <b>SRC</b> and any number — nothing happens.',hl:['src'],check:()=>U().mode==='src',demo:seq('src','n3')},
  {t:'Unlock: <b>DEST</b> and hold <b>DEST</b> 2 seconds again.',hl:['dest'],check:()=>!st().locks[17],demo:[{k:'dest'},{fn:async()=>{key('dest').forEach(e=>e.classList.add('down'));await W(2000);st().locks[17]=false;U().msg='Unlocked';V().save();key('dest').forEach(e=>e.classList.remove('down'));}}]}]}];
TUT.add({id:'vh',name:'Videohub',ov:'vh',key,act,reset,cleanup,lessons:L});
})();
