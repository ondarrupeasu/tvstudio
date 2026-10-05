/* Blackmagic HyperDeck Studio HD Pro — rack recorder / player (docs/hyperdeck-spec.md).
 * REC really records what arrives on the selected input (MediaRecorder) as clips on "SSD 1"; PLAY / SKIP / REW / F FWD,
 * loop (PLAY again), search dial (JOG / STL / SCR), INPUT = SDI ↔ HDMI, MENU (record input, network), REM.
 * Cabling (Inhar's sheet): SDI IN ← Videohub OUT 18 "SSD Recorder input" (PGM); SDI OUT A / B = fill / key → ATEM IN 13 / 14. Not affiliated with Blackmagic Design. */
(function(){
const PW=1080,PH=100,X=f=>f*PW,Y=f=>f*PH,CW=480,CH=270;
const H={spk:true,input:'sdi',state:'stop',clips:[],cur:-1,loop:false,speed:1,dial:'jog',rem:false,rec:null,recT0:0,menu:null,ip:[192,168,11,20],msg:'',rewT:null};
const mk=(w=CW,h=CH)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const inCv=mk(),outCv=mk(),vid=document.createElement('video');vid.playsInline=true;vid.muted=true;
/* what arrives on the inputs */
function inputFrame(g,w,h){g.fillStyle='#000';g.fillRect(0,0,w,h);
  if(H.input!=='sdi')return false;const o=window.VH?VH.state().cabOut.indexOf('hdk'):-1;if(o>=0)return VH.frame(o,g,w,h)!==false;   // SDI IN ← Videohub OUT 18 "SSD Recorder input" (Inhar's sheet: PGM)
  if(!window.ATEMR)return false;g.drawImage(ATEMR.program(),0,0,w,h);return true;}
/* SDI OUT A/B: input passthrough while recording / stopped, the clip while playing */
function outFrame(g,w,h){if(H.state!=='stop'&&H.state!=='rec'&&vid.readyState>=2){g.drawImage(vid,0,0,w,h);return true;}return inputFrame(g,w,h);}
window.VH_SOURCES=window.VH_SOURCES||{};VH_SOURCES.hdk=(g,w,h)=>outFrame(g,w,h);
const tc=s=>{s=Math.max(0,s);const f=Math.floor((s%1)*25);s=Math.floor(s);return [Math.floor(s/3600),Math.floor(s/60)%60,s%60,f].map(v=>String(v).padStart(2,'0')).join(':');};
/* ---------- transport ---------- */
function record(){if(H.state==='rec')return;if(!inputFrame(inCv.getContext('2d'),CW,CH)){H.msg='No input signal';return;}stopPlay();
  const st=inCv.captureStream(25),au=window.M32&&M32.stream();if(au)au.getAudioTracks().forEach(t=>st.addTrack(t));   // programme sound embedded in the SDI (Midas → ATEM)
  const type=MediaRecorder.isTypeSupported('video/mp4')?'video/mp4':'video/webm',r=new MediaRecorder(st,{mimeType:type,videoBitsPerSecond:4e6}),chunks=[];H.withAudio=!!au;
  r.ondataavailable=e=>e.data.size&&chunks.push(e.data);
  r.onstop=()=>{const b=new Blob(chunks,{type}),n=H.clips.length+1;H.clips.push({name:'HyperDeck_'+String(n).padStart(4,'0'),url:URL.createObjectURL(b),dur:(performance.now()-H.recT0)/1000,ext:type.includes('mp4')?'mp4':'webm',audio:H.withAudio});H.cur=H.clips.length-1;draw();list();};
  r.start(500);H.rec=r;H.recT0=performance.now();H.state='rec';H.pump=setInterval(()=>inputFrame(inCv.getContext('2d'),CW,CH),40);}   // 25 fps, also when the tab is in the background
function stopRec(){clearInterval(H.pump);if(H.rec){H.rec.stop();H.rec=null;}}
function stopPlay(){clearInterval(H.rewT);H.rewT=null;vid.pause();}
function load(i){if(i<0||i>=H.clips.length)return false;if(H.cur!==i||!vid.src){H.cur=i;vid.src=H.clips[i].url;}return true;}
function play(){if(H.state==='rec')return;if(!H.clips.length){H.msg='No clips on the disk';return;}
  if(H.state==='play'&&H.speed===1){H.loop=!H.loop;vid.loop=H.loop;H.msg=H.loop?'Loop clip':'Loop off';return;}   // PLAY again = loop
  stopPlay();load(H.cur<0?0:H.cur);H.speed=1;vid.playbackRate=1;vid.muted=!H.spk;vid.play().catch(()=>{});H.state='play';}
function stop(){if(H.state==='rec'){stopRec();H.state='stop';return;}stopPlay();H.state='stop';H.speed=1;}
function skip(d){if(H.state==='rec'||!H.clips.length)return;
  if(d<0&&vid.currentTime>.5){vid.currentTime=0;return;}const i=Math.max(0,Math.min(H.clips.length-1,(H.cur<0?0:H.cur)+d));load(i);vid.currentTime=0;if(H.state==='play')vid.play().catch(()=>{});}
function wind(d){if(H.state==='rec'||!H.clips.length)return;load(H.cur<0?0:H.cur);stopPlay();
  H.speed=H.state==='ff'&&d>0||H.state==='rew'&&d<0?Math.min(16,H.speed*2):2;H.state=d>0?'ff':'rew';
  if(d>0){vid.playbackRate=H.speed;vid.play().catch(()=>{});}else H.rewT=setInterval(()=>{vid.currentTime=Math.max(0,vid.currentTime-H.speed*.08);if(vid.currentTime<=0)stop();},80);}
function dial(d){if(H.menu){menuSpin(d);return;}if(!H.clips.length||H.state==='rec')return;load(H.cur<0?0:H.cur);
  if(H.dial==='jog'){stopPlay();H.state='jog';vid.currentTime=Math.max(0,vid.currentTime+d/25);}
  else{const k=H.dial==='stl'?1:4;stopPlay();vid.currentTime=Math.max(0,Math.min(vid.duration||1e9,vid.currentTime+d*.5*k));H.state=H.dial==='stl'?'shuttle':'scroll';}}
/* ---------- menu ---------- */
const MENU=[['Record','Input'],['Setup','Network IP']];
function menuSpin(d){const m=H.menu;if(m.edit!=null){H.ip[m.edit]=(H.ip[m.edit]+d+256)%256;return;}m.i=(m.i+d+MENU.length)%MENU.length;}
function menuSet(){const m=H.menu;if(!m)return;if(m.edit!=null){m.edit=m.edit<3?m.edit+1:null;return;}if(m.i===0)H.input=H.input==='sdi'?'hdmi':'sdi';else m.edit=0;}
/* ---------- drawing ---------- */
const key=(id,fx,fy,w,h,l,cls,tip,lab)=>`<g class="hd-k ${cls}" data-k="${id}" data-tip="${tip}"><rect x="${X(fx)-w/2}" y="${Y(fy)-h/2}" width="${w}" height="${h}" rx="2.5"/>${l?`<text x="${X(fx)}" y="${Y(fy)+2.2}" class="hd-kt">${l}</text>`:''}${lab?`<text x="${X(fx)}" y="${Y(fy)+h/2+6.5}" class="hd-lab">${lab}</text>`:''}</g>`;
function front(){let s=`<svg viewBox="0 0 ${PW} ${PH}" class="vh-svg" id="hd-fsvg"><rect x="1" y="1" width="${PW-2}" height="${PH-2}" rx="7" class="at-face"/>`;
  [0.0275,0.9725].forEach(c=>[0.17,0.83].forEach(y=>s+=`<rect x="${X(c)-9}" y="${Y(y)-4.5}" width="18" height="9" rx="4.5" class="vh-hole"/>`));
  s+=key('spk',0.080,0.23,17,13,'🔈','hd-s','Speaker on / off: listen to the clip you play back (its sound = the programme sound recorded from the audio desk).');
  s+=key('rem',0.080,0.43,17,13,'REM','hd-s','REM: remote control on / off (needed for the ATEM or software to drive the deck).');
  s+=`<g data-tip="Headphone jack (1/4&quot;)."><circle cx="${X(0.079)}" cy="${Y(0.71)}" r="7.5" class="at-xlr"/><circle cx="${X(0.079)}" cy="${Y(0.71)}" r="3.2" class="vh-bnc3"/></g><rect x="${X(0.094)}" y="${Y(0.25)}" width="2.2" height="${Y(0.17)}" rx="1" class="hd-grill"/>`;
  [['ssd1',0.104,0.285,'SSD 1 (2.5&quot; drive bay) — the simulated clips are recorded here. The bezel lights red when recording and green when playing.'],['ssd2',0.306,0.488,'SSD 2 bay — empty.']].forEach(([id,a,b,t])=>s+=`<g class="hd-bay" data-k="${id}" data-tip="${t}"><rect x="${X(a)}" y="${Y(0.21)}" width="${X(b-a)}" height="${Y(0.58)}" rx="5" class="hd-bez"/><rect x="${X(a)+6}" y="${Y(0.32)}" width="${X(b-a)-12}" height="${Y(0.36)}" rx="2" class="hd-slot"/>${id==='ssd1'?`<rect x="${X(a)+10}" y="${Y(0.37)}" width="${X(b-a)-20}" height="${Y(0.26)}" rx="1.5" class="hd-disk"/>`:''}</g>`);
  [0.295,0.497].forEach((x,i)=>s+=`<g data-tip="SD ${i+1} card slot — empty. Its LED: green = checking, red = recording."><circle cx="${X(x)}" cy="${Y(0.19)}" r="1.8" class="hd-led"/><rect x="${X(x)-1.6}" y="${Y(0.28)}" width="3.2" height="${Y(0.5)}" rx="1" class="hd-slot"/></g>`);
  const T=[['skipb',0.525,0.32,'|◀','SKIP','SKIP back: once = start of the clip, twice = previous clip.'],['rec',0.5625,0.32,'●','REC','REC: record what arrives on the selected input.'],['skipf',0.600,0.32,'▶|','SKIP','SKIP forward: next clip.'],['input',0.637,0.32,'','INPUT','INPUT: switch the record input SDI ↔ HDMI.'],
    ['rew',0.525,0.67,'◀◀','REW','REW: rewind (press again = faster).'],['play',0.5625,0.67,'▶','PLAY','PLAY: play the clip. Press PLAY again while playing = loop.'],['ff',0.600,0.67,'▶▶','F FWD','F FWD: fast forward (press again = faster).'],['stop',0.637,0.67,'■','STOP','STOP: stop recording / playback (blue = ready).']];
  T.forEach(([id,x,y,l,lab,t])=>s+=key(id,x,y,28,22,l,'hd-t',t,lab));
  [['search',0.27,'SEARCH','SEARCH: cycles the dial mode JOG → STL → SCR.'],['menu',0.49,'MENU','MENU: settings (MENU again = back).'],['set',0.72,'SET','SET: select / confirm in the menu.']].forEach(([id,y,l,t])=>s+=key(id,0.674,y,28,12,l,'hd-s',t));
  s+=`<rect x="${X(0.708)}" y="${Y(0.16)}" width="${X(0.093)}" height="${Y(0.68)}" rx="2" class="vh-lcdb"/>`;
  [['stl',0.27,'STL','STL: shuttle — the dial winds faster the more you turn it.'],['jog',0.49,'JOG','JOG: the dial moves frame by frame.'],['scr',0.72,'SCR','SCR: scroll — the dial moves quickly through the clip.']].forEach(([id,y,l,t])=>s+=key(id,0.823,y,17,12,l,'hd-s',t));
  s+=`<g class="vh-knob hd-dial" data-tip="Search dial: in JOG / STL / SCR mode it moves through the clip; in the menu it scrolls. Drag up/down or scroll."><circle cx="${X(0.875)}" cy="${Y(0.49)}" r="${X(0.035)}" class="hd-ring"/><circle cx="${X(0.875)}" cy="${Y(0.49)}" r="${X(0.024)}" class="vh-kn"/><circle cx="${X(0.875)+X(0.012)}" cy="${Y(0.49)-X(0.012)}" r="3" class="hd-dimple"/></g>`;
  [0.42,0.49,0.58].forEach(y=>s+=`<rect x="${X(0.928)-3.5}" y="${Y(y)-3.5}" width="7" height="7" rx="1.8" class="vh-bmd"/>`);
  return s+'</svg>';}
function bnc(cx,cy,r=11){return `<circle cx="${cx}" cy="${cy}" r="${r}" class="vh-bnc"/><circle cx="${cx}" cy="${cy}" r="${r*.62}" class="vh-bnc2"/><circle cx="${cx}" cy="${cy}" r="${r*.18}" class="vh-bnc3"/>`;}
function rear(){let s=`<svg viewBox="0 0 ${PW} ${PH+6}" class="vh-svg" id="hd-rsvg"><rect x="1" y="1" width="${PW-2}" height="${PH-2}" rx="7" class="at-face"/>`;
  [0.024,0.976].forEach(c=>[0.17,0.83].forEach(y=>s+=`<rect x="${X(c)-9}" y="${Y(y)-4.5}" width="18" height="9" rx="4.5" class="vh-hole"/>`));
  const T=(x,y,t)=>`<text x="${X(x)}" y="${Y(y)}" class="vh-rt">${t}</text>`;
  s+=`<g data-tip="IEC power inlet (100-240 V AC). No power switch."><rect x="${X(0.065)}" y="${Y(0.18)}" width="${X(0.05)}" height="${Y(0.64)}" rx="3" class="vh-iec2"/></g>`;
  s+=`<g data-tip="12-15 V DC input (4-pin XLR) — backup / battery power."><circle cx="${X(0.145)}" cy="${Y(0.5)}" r="13" class="at-xlr"/><circle cx="${X(0.145)}" cy="${Y(0.5)}" r="9" class="at-xlr2"/>${T(0.145,0.9,'12-15V ⎓ 10A')}</g>`;
  [['REMOTE IN',0.204],['REMOTE OUT',0.283]].forEach(([l,x])=>s+=`<g data-tip="${l}: RS-422 deck control (Sony protocol); OUT chains more decks."><rect x="${X(x)-20}" y="${Y(0.28)-8}" width="40" height="16" rx="5" class="vh-rj"/>${T(x,0.47,l)}</g>`);
  s+=`<g data-tip="ETHERNET: HyperDeck Setup, ATEM control and the network (IP on the tape: 192.168.11.20)."><rect x="${X(0.204)-11}" y="${Y(0.64)-9}" width="22" height="18" rx="2" class="vh-rj"/>${T(0.204,0.9,'ETHERNET')}</g>`;
  s+=`<g data-tip="EXT DISK (USB-C): record to an external drive."><rect x="${X(0.245)-6}" y="${Y(0.75)-3}" width="12" height="6" rx="3" class="vh-rj"/>${T(0.245,0.9,'EXT DISK')}</g>`;
  s+=`<g data-tip="MONITOR OUT: 3G-SDI with overlays (timecode, codec, meters)." class="hd-sock" data-s="mon">${bnc(X(0.282),Y(0.64))}${T(0.282,0.9,'MONITOR OUT')}</g>`;
  s+=`<g data-tip="REF OUT: reference generator output.">${bnc(X(0.34),Y(0.3))}${T(0.34,0.5,'REF OUT')}</g><g data-tip="REF IN: reference input.">${bnc(X(0.34),Y(0.64))}${T(0.34,0.9,'REF IN')}</g>`;
  s+=`<g data-tip="TIMECODE IN (XLR)."><circle cx="${X(0.395)}" cy="${Y(0.52)}" r="13" class="at-xlr"/><circle cx="${X(0.395)}" cy="${Y(0.52)}" r="9" class="at-xlr2"/>${T(0.395,0.9,'TIMECODE IN')}</g>`;
  s+=`<g data-tip="TIMECODE OUT (XLR)."><circle cx="${X(0.452)}" cy="${Y(0.52)}" r="13" class="at-xlr"/><circle cx="${X(0.452)}" cy="${Y(0.52)}" r="9" class="at-xlr2"/>${T(0.452,0.9,'TIMECODE OUT')}</g>`;
  [['HDMI OUT',0.35],['HDMI IN',0.71]].forEach(([l,y])=>s+=`<g data-tip="${l}."><rect x="${X(0.512)-12}" y="${Y(y)-5}" width="24" height="10" rx="2" class="vh-rj"/><text x="${X(0.512)}" y="${Y(y)+12}" class="vh-rt">${l}</text></g>`);
  s+=`<g class="hd-sock" data-s="outA">${bnc(X(0.564),Y(0.3))}<text x="${X(0.564)-12}" y="${Y(0.3)-12}" class="vh-rn">A</text></g><g class="hd-sock" data-s="outB">${bnc(X(0.601),Y(0.3))}<text x="${X(0.601)-12}" y="${Y(0.3)-12}" class="vh-rn">B</text></g>`;
  s+=`<path d="M${X(0.548)} ${Y(0.48)}v2H${X(0.617)}v-2" class="vh-brk"/>${T(0.5825,0.53,'SDI OUT')}`;
  s+=`<g class="hd-sock" data-s="in">${bnc(X(0.564),Y(0.66))}${T(0.564,0.9,'SDI IN')}</g><g class="hd-sock" data-s="loop">${bnc(X(0.601),Y(0.66))}${T(0.601,0.9,'SDI LOOP OUT')}</g>`;
  return s+'</svg>';}
function setK(id,cls,on){const g=document.querySelector(`#hd-fsvg [data-k="${id}"]`);if(g)g.classList.toggle(cls,!!on);}
function drawLcd(){const cv=document.getElementById('hd-lcd');if(!cv)return;const c=cv.getContext('2d'),w=320,h=240;c.textAlign='left';c.textBaseline='alphabetic';
  if(H.menu){const m=H.menu;c.fillStyle='#e9edf1';c.fillRect(0,0,w,h);c.fillStyle='#2b6fd6';c.fillRect(0,0,w,30);c.fillStyle='#fff';c.font='700 16px sans-serif';c.fillText('Settings >',10,21);
    MENU.forEach(([pg,it],i)=>{const y=44+i*46;if(m.i===i){c.fillStyle='#2b6fd6';c.fillRect(4,y,w-8,40);}c.fillStyle=m.i===i?'#fff':'#333';c.font='600 13px sans-serif';c.fillText(pg,12,y+15);c.font='700 17px sans-serif';c.fillText(it,12,y+34);
      c.textAlign='right';c.fillStyle=m.i===i?'#fff':'#2b6fd6';c.fillText(i===0?H.input.toUpperCase():H.ip.map((o,k)=>m.edit===k?'['+o+']':o).join('.'),w-12,y+34);c.textAlign='left';});return;}
  c.fillStyle='#000';c.fillRect(0,0,w,h);
  const live=H.state==='rec'||H.state==='stop'&&!vid.src||H.state==='stop';const ok=live?inputFrame(c,w-24,(w-24)*9/16):(c.drawImage(vid,0,0,w-24,(w-24)*9/16),true);
  if(H.state==='stop'&&!ok){c.fillStyle='#888';c.font='600 16px sans-serif';c.fillText('No input',110,110);}
  c.fillStyle='rgba(0,0,0,.7)';c.fillRect(0,0,w,26);c.font='700 14px sans-serif';
  const icon={rec:['●','#ff3b30'],play:[H.loop?'▶ ⟲':'▶','#fff'],ff:['▶▶ '+H.speed+'×','#fff'],rew:['◀◀ '+H.speed+'×','#fff'],jog:['JOG','#fff'],shuttle:['STL','#fff'],scroll:['SCR','#fff'],stop:['■','#4aa3ff']}[H.state]||['■','#4aa3ff'];
  c.fillStyle=icon[1];c.fillText(icon[0],8,18);c.fillStyle='#fff';c.textAlign='center';c.fillText(H.msg||('1080i50 · '+H.input.toUpperCase()),w/2,18);c.textAlign='right';c.fillText('SSD 1',w-6,18);c.textAlign='left';
  const t=H.state==='rec'?(performance.now()-H.recT0)/1000:vid.src?vid.currentTime:0;c.fillStyle='rgba(0,0,0,.6)';c.fillRect(0,h-48,w,48);c.fillStyle=H.state==='rec'?'#ff6b60':'#fff';c.font='700 30px monospace';c.fillText(tc(t),10,h-14);
  c.font='600 12px sans-serif';c.fillStyle='#bbb';c.textAlign='right';c.fillText(H.state==='rec'?'recording…':H.cur>=0&&H.clips[H.cur]?H.clips[H.cur].name:'no clips',w-6,h-32);c.textAlign='left';
  c.fillStyle='#222';c.fillRect(w-20,30,6,h-84);c.fillRect(w-11,30,6,h-84);}
function draw(){setK('rec','on',H.state==='rec');setK('play','on',H.state==='play'||H.state==='rec');setK('stop','on',H.state==='stop');setK('rem','on',H.rem);setK('spk','on',H.spk);
  ['stl','jog','scr'].forEach(k=>setK(k,'on',H.dial===k));setK('menu','on',!!H.menu);setK('input','on',false);
  setK('ssd1','rec',H.state==='rec');setK('ssd1','play',['play','ff','rew','jog','shuttle','scroll'].includes(H.state));drawLcd();}
function list(){const el=document.getElementById('hd-clips');if(!el)return;el.innerHTML=H.clips.length?'<b>Clips on SSD 1:</b> '+H.clips.map((c,i)=>`<a href="${c.url}" download="${c.name}.${c.ext}" class="${i===H.cur?'on':''}">${c.name} (${c.dur.toFixed(1)} s${c.audio?' · with sound':' · no sound'}) ⬇</a>`).join(''):'<b>Clips on SSD 1:</b> none yet — press REC on the HyperDeck.';}
function press(id){H.msg='';
  if(id==='menu'){H.menu=H.menu?null:{i:0,edit:null};return;}if(id==='set'){menuSet();return;}
  if(H.menu&&(id==='skipb'||id==='skipf')){menuSpin(id==='skipf'?1:-1);return;}
  if(id==='rec')record();else if(id==='stop')stop();else if(id==='play')play();else if(id==='skipb')skip(-1);else if(id==='skipf')skip(1);
  else if(id==='ff')wind(1);else if(id==='rew')wind(-1);else if(id==='input'&&H.state!=='rec')H.input=H.input==='sdi'?'hdmi':'sdi';
  else if(id==='rem')H.rem=!H.rem;else if(id==='search')H.dial={jog:'stl',stl:'scr',scr:'jog'}[H.dial];else if(['stl','jog','scr'].includes(id))H.dial=id;
  else if(id==='spk'){H.spk=!H.spk;vid.muted=!H.spk;H.msg='Speaker '+(H.spk?'on':'off');}}
vid.addEventListener('ended',()=>{if(!H.loop){H.state='stop';draw();}});
function mount(){const f=document.getElementById('hd-front'),r=document.getElementById('hd-rear');if(!f||f.dataset.built)return;f.dataset.built='1';
  f.className='vh-front';f.innerHTML=front()+'<canvas id="hd-lcd" width="320" height="240"></canvas><div class="hd-clips" id="hd-clips"></div>';r.className='vh-rear';r.innerHTML=rear();
  const fs=document.getElementById('hd-fsvg');
  fs.addEventListener('pointerdown',e=>{const k=e.target.closest('.hd-k');if(!k)return;e.preventDefault();k.classList.add('down');const up=()=>{k.classList.remove('down');removeEventListener('pointerup',up);};addEventListener('pointerup',up);press(k.dataset.k);draw();});
  const kn=fs.querySelector('.hd-dial');let y0=null,acc=0;
  kn.addEventListener('pointerdown',e=>{e.preventDefault();y0=e.clientY;acc=0;try{kn.setPointerCapture(e.pointerId);}catch(_){}});
  kn.addEventListener('pointermove',e=>{if(y0==null)return;acc+=(y0-e.clientY);y0=e.clientY;while(Math.abs(acc)>=6){const d=Math.sign(acc);acc-=d*6;dial(d);}draw();});
  kn.addEventListener('pointerup',()=>{y0=null;});kn.addEventListener('wheel',e=>{e.preventDefault();dial(e.deltaY>0?-1:1);draw();},{passive:false});
  const root=document.getElementById('vh'),tip=document.getElementById('vh-tip');
  root.addEventListener('mousemove',e=>{const s=e.target.closest('.hd-sock');if(!s)return;const k=s.dataset.s;
    const t={in:['SDI IN','From Videohub OUT 18 "SSD Recorder input" — the programme (Inhar\'s sheet).'],loop:['SDI LOOP OUT','A copy of the SDI input.'],outA:['SDI OUT A','Plays the clip (or passes the input through while recording / stopped). Cabling not known yet.'],outB:['SDI OUT B','Same as A (key signal only with ProRes 4444 clips).'],mon:['MONITOR OUT','3G-SDI with overlays for a monitor.']}[k];
    tip.innerHTML=`<b>${t[0]}</b><span>${t[1]}</span>`;tip.style.left=e.clientX+'px';tip.style.top=e.clientY+'px';tip.classList.add('on');e.stopPropagation();},true);
  list();draw();}
let last=0;
const shown=()=>document.getElementById('vh')?.classList.contains('on')||document.getElementById('cr')?.classList.contains('on');
function loop(now){requestAnimationFrame(loop);if(!shown()&&H.state!=='rec')return;if(now-last<40)return;last=now;
  if(shown()){drawLcd();if(H.state==='play'||H.state==='rec')setK('ssd1','rec',H.state==='rec');}}
requestAnimationFrame(loop);
window.HDR={mount};
})();
