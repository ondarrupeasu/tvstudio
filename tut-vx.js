/* vMix tutorials (vMix HD as on the control-room PC). Engine: tutorial.js.
 * Uses the default inputs of a new production: 1 Colour Bars, 2 Colour, 3 and 4 = lower-third titles. */
(function(){
const W=TUT.W,X=()=>window.VMIX,V=()=>X().V;
const byNum=n=>V().inputs.find(i=>i.num===n),title=()=>V().inputs.find(i=>i.type==='title'),num=i=>i&&i.num;
function reset(){const v=V();if(!v.inputs.length)return;v.T=null;v.ftb=false;v.ov.forEach(o=>{o.target=0;o.a=0;o.inp=null;o.pend=false;});
  v.pgm=byNum(1)||v.inputs[0];v.pv=null;document.getElementById('vx-modal')?.classList.remove('on');document.getElementById('vx-pop')?.classList.remove('on');X().draw();}
/* keys: 'in:N' = thumbnail of input N, 'ov:N:c' = overlay button c of input N, 'm:sel' = something in the open dialog, else a [data-a] control */
const key=k=>{const m=/^in:(\d+)$/.exec(k),o=/^ov:(\d+):(\d)$/.exec(k);
  if(m){const i=byNum(+m[1]);return i?document.querySelectorAll(`#vx .vx-box[data-id="${i.id}"] .vx-th`):[];}
  if(o){const i=byNum(+o[1]);return i?document.querySelectorAll(`#vx .vx-box[data-id="${i.id}"] [data-a="ib-ov${o[2]}"]`):[];}
  if(k.startsWith('m:'))return document.querySelectorAll('#vx-modal '+(k==='m:ok'?'.vx-ok':k.slice(2)));
  return document.querySelectorAll(`#vx [data-a="${k}"]`);};
async function act(a){const x=X();
  if(a.a){key(a.a).forEach(e=>e.classList.add('down'));x.act(a.a);await W(240);key(a.a).forEach(e=>e.classList.remove('down'));}
  else if(a.pv){V().pv=byNum(a.pv);x.draw();await W(200);}
  else if(a.ov){const [n,c]=a.ov;x.toggleOverlay(c,byNum(n));x.draw();await W(200);}}
const L=[
 {id:'pvpgm',title:'Preview, Output and transitions',intro:'vMix works like a vision mixer: the left screen is the <b>Preview</b> (next shot, orange), the right one the <b>Output</b> (on air, green). The inputs are the tiles at the bottom: click one to put it in Preview.',
  steps:[
  {t:'Click the picture of <b>input 2</b> (Colour): it goes to Preview.',hl:['in:2'],check:()=>num(V().pv)===2,demo:[{pv:2}]},
  {t:'Press <b>Cut</b> (centre column): Preview and Output swap instantly.',hl:['cut'],check:()=>num(V().pgm)===2,demo:[{a:'cut'}]},
  {t:'Look: after a Cut the previous shot (input 1, Colour Bars) is now in Preview. Press the first transition button (<b>Fade</b>): a 1-second dissolve. The ▾ next to it changes the effect and duration.',hl:['tr0'],check:()=>num(V().pgm)===1&&!V().T,demo:[{a:'tr0'},{wait:1200}]},
  {t:'<b>Quick Play</b> = a fast fade (0.5 s) of whatever is in Preview. Try it.',hl:['quickplay'],check:()=>num(V().pgm)===2&&!V().T,demo:[{a:'quickplay'},{wait:700}]}]},
 {id:'overlay',title:'A lower third as an overlay',intro:'Titles do not replace the picture: they go <b>on top</b> of it in one of the 4 <b>overlay</b> channels. Each input tile has buttons 1-4: they put that input in overlay channel 1-4 (on air at once, with its own transition).',
  steps:[
  {t:'On the tile of <b>input 3</b> (Lower Third) press <b>1</b>: the title appears over the Output.',hl:['ov:3:0'],check:()=>V().ov[0].target>0&&num(V().ov[0].inp)===3,demo:[{ov:[3,0]}]},
  {t:'Change the picture under it (click input 2, then <b>Cut</b>): the overlay stays on top.',hl:['in:2','cut'],check:()=>num(V().pgm)===2&&V().ov[0].target>0,demo:[{pv:2},{a:'cut'}]},
  {t:'Press <b>1</b> on input 3 again to take the title off.',hl:['ov:3:0'],check:()=>!(V().ov[0].target>0),demo:[{ov:[3,0]}]}]},
 {id:'title',title:'Edit the text of a title',intro:'The text of a title input is changed in the <b>Title Editor</b>: <b>right-click</b> the picture of the title input → Title Editor. It updates live, even on air.',
  steps:[
  {t:'Right-click the picture of <b>input 3</b> and choose <b>Title Editor</b>.',hl:['in:3'],check:()=>!!document.querySelector('#vx-modal.on .vx-te'),demo:[{fn:async()=>{X().titleEditor(byNum(3));await W(300);}}]},
  {t:'Write a name in the first field (e.g. your own name).',hl:['m:.vx-te input'],check:()=>{const i=byNum(3),f=Object.keys(i.fields)[0];return !!i.fields[f]&&i.fields[f]!==i._tut0;},
   enter:()=>{const i=byNum(3);i._tut0=i.fields[Object.keys(i.fields)[0]];},
   demo:[{fn:async()=>{const e=document.querySelector('#vx-modal .vx-te input');if(!e)return;e.value=e.value==='Jon Agirre'?'Miren Lasa':'Jon Agirre';e.dispatchEvent(new Event('input',{bubbles:true}));await W(300);}}]},
  {t:'Close the editor (✕ or Esc). Put input 3 on overlay 1 to see the new text on air (and take it off again).',hl:['ov:3:0'],check:()=>!document.querySelector('#vx-modal.on'),demo:[{fn:async()=>{document.querySelector('#vx-modal [data-x]')?.click();await W(200);}}]}]},
 {id:'ext',title:'Graphics to the ATEM: External output with fill + key',intro:'In the control room vMix sends its graphics to the ATEM through the DeckLink card: <b>fill</b> (the picture) → ATEM <b>IN 19</b>, <b>key</b> (the transparency, black/white) → <b>IN 20</b>; the ATEM puts them on air with its DSK. Two things are needed: the output must carry <b>only the graphic</b>, and the <b>alpha channel</b> must be on.',
  steps:[
  {t:'Open <b>Settings</b> (bottom bar) → Outputs.',hl:['settings'],check:()=>!!document.querySelector('#vx-modal.on .o1'),demo:[{a:'settings'}]},
  {t:'In <b>Output 1</b> choose <b>Input 3</b> (the lower third), tick <b>External</b> and press <b>OK</b>.',hl:['m:.o1','m:.oe','m:ok'],check:()=>X().EXT.src==='Input '+num(title())&&V().ext,
   demo:[{fn:async()=>{X().EXT.src='Input '+num(title());V().ext=true;document.getElementById('vx-modal')?.classList.remove('on');X().draw();await W(300);}}]},
  {t:'Now the alpha: the <b>▾</b> next to <b>External</b> → <b>Alpha Channel: Straight</b> → OK. Without it the key would be all black (nothing keyed in the ATEM).',hl:['extset'],check:()=>X().EXT.alpha!=='None',
   demo:[{fn:async()=>{X().EXT.alpha='Straight';document.getElementById('vx-modal')?.classList.remove('on');X().draw();await W(300);}}]},
  {t:'Done: the lower third now reaches ATEM IN 19 / 20. Go to <b>Vision → ATEM only → Tutorials → Downstream key</b> to put it on air. Press <b>Next</b>.',hl:['ext']}]},
 {id:'stream',title:'Streaming',intro:'vMix streams the <b>Output</b> to a platform (YouTube, Twitch…) with a <b>stream key</b> given by that platform. In class use a test key — never publish the school\'s real key.',
  steps:[
  {t:'Press <b>Stream</b>: the first time it asks for the destination and the stream key.',hl:['stream'],check:()=>!!document.querySelector('#vx-modal.on .sk')||V().stream,demo:[{a:'stream'}]},
  {t:'Write any test key and press <b>Start</b>. The button shows "Connecting…" and then goes red: on air.',hl:['m:.sk','m:ok'],check:()=>V().stream===true,
   demo:[{fn:async()=>{const k=document.querySelector('#vx-modal .sk');if(k){k.value='test-key-1234';k.dispatchEvent(new Event('input',{bubbles:true}));}document.querySelector('#vx-modal .vx-ok')?.click();await W(1900);}}]},
  {t:'Stop the stream: <b>Stream</b> again.',hl:['stream'],check:()=>!V().stream,demo:[{a:'stream'}]}]}];
TUT.add({id:'vx',name:'vMix',ov:'vx',host:()=>document.getElementById('simnav'),key,act,reset,redraw:()=>X().draw(),lessons:L});
})();
