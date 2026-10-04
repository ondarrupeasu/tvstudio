/* Control room — vision: monitor wall (ATEM MULTIVIEW 1) on top, the ATEM 1 M/E Advanced Panel and the
 * Camera Control Panel on the desk below. Both panels drive the same Constellation that sits in the video rack. */
(function(){
const root=document.getElementById('cr');if(!root)return;
function build(){if(root.dataset.built)return;root.dataset.built='1';
  root.innerHTML=`<div class="pwr-hd"><div><h2>Control room — vision</h2><div class="kind">Multiview · ATEM 1 M/E Advanced Panel 10 · ATEM Camera Control Panel</div>
    <p><b>ATEM panel:</b> PREVIEW row = next shot (green) · CUT / AUTO / T-bar = on air (red) · <b>CCU:</b> joystick = iris, wheels = colour, △▽ = gain, shutter, ND · hover anything.</p></div>
    <div class="pwr-btns"><button id="cr-guidebtn">How to use</button><button id="cr-mvpop">Multiview on a 2nd screen ↗</button><button id="cr-rack">Video rack</button></div></div>
  <button class="close" id="cr-close" aria-label="Close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
  <div class="cr-body"><div class="cr-wall"><canvas id="cr-mv" width="960" height="540"></canvas></div><div class="cr-desk"><div id="cr-atem"></div><div id="cr-ccu"></div></div></div>
  <div class="mx-src mx-guide" id="cr-guide"><div class="mx-srchd"><b>How to use the vision desk</b> <button id="cr-guideclose" aria-label="Close">✕</button></div><ol class="mx-steps">
    <li>The <b>monitor</b> on top is the ATEM multiview: <b style="color:#36d36e">preview</b> (next shot) and <b style="color:#ff453a">programme</b> (on air) big, and inputs 1-8 below with green / red tally.</li>
    <li><b>ATEM panel</b> (left): press a key on the <b>PREVIEW</b> row to choose the next shot, then <b>CUT</b> (instant), <b>AUTO</b> (transition at the AUTO RATE) or drag the <b>T-bar</b>. The <b>PROGRAM</b> row cuts straight to air. <b>SHIFT</b> = sources 11-20.</li>
    <li>Transition type: <b>MIX</b>, <b>DIP</b>, <b>WIPE</b>, <b>DVE</b>. The four knobs under the screen set the AUTO, DSK and FTB rates (on HOME).</li>
    <li>Graphics from vMix: <b>DSK 1 CUT</b> or <b>DSK 1 AUTO</b> puts them on air (vMix must have <b>External</b> on). <b>TIE</b> makes them follow the next transition. <b>FTB</b> = fade to black.</li>
    <li><b>AUX</b> (system control) + select row: choose what each SDI output of the ATEM carries.</li>
    <li><b>Camera control (CCU)</b> (right): one strip per camera. <b>Joystick</b> up / down = iris (exposure); scroll on it = master black. <b>MASTER GAIN</b>, <b>SHUTTER</b> and <b>ND</b> △▽ also change the exposure. <b>W/B</b> then SHUTTER △▽ = colour temperature (the studio light is 5600 K). The <b>WHITE</b> wheels change the highlights of each colour, the <b>BLACK</b> wheels the shadows (with BLACK/FLARE: the mid-tones).</li>
    <li>The camera number turns <b>red</b> when that camera is on air. <b>CALL</b> flashes its tally, <b>BARS</b> (hold 3 s) sends colour bars, <b>PREVIEW</b> sends the camera to the preview aux. Scene files 1-5 store / recall a look.</li></ol></div>
  <div class="pwr-tip" id="cr-tip"></div>`;
  document.getElementById('cr-close').onclick=()=>window.closeControlRoom();
  const gd=document.getElementById('cr-guide');document.getElementById('cr-guidebtn').onclick=()=>gd.classList.toggle('on');document.getElementById('cr-guideclose').onclick=()=>gd.classList.remove('on');
  document.getElementById('cr-rack').onclick=()=>{window.closeControlRoom();window.openVideohub&&openVideohub();};
  document.getElementById('cr-mvpop').onclick=()=>document.getElementById('vh-mvbtn')?.click();
  window.openVideohub&&!document.getElementById('vh')?.dataset.built&&(openVideohub(),closeVideohub());   // the switcher lives in the rack: make sure it is built
  window.APANEL&&APANEL.mount(document.getElementById('cr-atem'));window.CCUP&&CCUP.mount(document.getElementById('cr-ccu'));
  const tip=document.getElementById('cr-tip');
  root.addEventListener('mousemove',e=>{const t=e.target.closest('[data-tip]');if(!t){tip.classList.remove('on');return;}const k=t.closest('.ap-k,.cc-b');
    const name=k?[...k.querySelectorAll('text')].map(x=>x.textContent).join(' ').trim():'';tip.innerHTML=(name?`<b>${name}</b>`:'')+`<span>${t.dataset.tip}</span>`;tip.style.left=e.clientX+'px';tip.style.top=e.clientY+'px';tip.classList.add('on');});
  root.addEventListener('mouseleave',()=>tip.classList.remove('on'));}
let last=0,running=false;function loop(now){requestAnimationFrame(loop);if(!root.classList.contains('on'))return;if(now-last<80)return;last=now;
  const a=window.ATEMR&&ATEMR.api;if(a){const c=document.getElementById('cr-mv');if(c)c.getContext('2d').drawImage(a.multiview(),0,0);}window.APANEL&&APANEL.draw();window.CCUP&&CCUP.draw();}
window.openControlRoom=()=>{build();root.classList.add('on');if(!running){running=true;requestAnimationFrame(loop);}};
window.closeControlRoom=()=>{root.classList.remove('on');document.getElementById('cr-tip')?.classList.remove('on');};
})();
