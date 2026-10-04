/* vMix-style training simulator (HD edition) — main window, inputs, Preview/Output, transitions, T-Bar,
 * overlays 1-8, input categories, Input Settings (General · Colour Key · Position), Title Editor, audio mixer.
 * Layout, labels and colours follow the official vMix 29 manual (docs/vmix-spec.md); everything is drawn by us.
 * Not affiliated with vMix / StudioCoast. Rendering: one WebGL compositor (keys, transitions, overlays). */
(function(){
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const root=document.getElementById('vx');
const W=960,H=540;                       // render resolution (16:9)
const CAT=[{n:'All',c:'#293038'},{n:'RED',c:'#8B0000'},{n:'GREEN',c:'#006400'},{n:'ORANGE',c:'#FF8C00'},{n:'PURPLE',c:'#800080'},{n:'AQUA',c:'#0087FF'},{n:'BLUE',c:'#191970'}];
const FX=['Fade','Merge','Wipe','Slide','Zoom','Fly','VerticalWipe','VerticalSlide','CrossZoom'];
const V={inputs:[],next:1,pv:null,pgm:null,cat:0,search:'',trans:[{fx:'Fade',ms:1000},{fx:'Merge',ms:1000},{fx:'Wipe',ms:1000},{fx:'Zoom',ms:1000}],
  T:null,tbar:0,tbarDir:1,ov:Array.from({length:8},()=>({inp:null,a:0,target:0})),ftb:false,mixer:false,basic:false,lock:false,
  rec:false,recT0:0,stream:false,streamT0:0,ext:false,alpha:'None',fps:0,rt:0};
let A=null;   // audio

/* ---------- inputs ---------- */
function mkCanvas(w=W,h=H){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function addInput(o){const inp=Object.assign({id:V.next,num:V.inputs.length+1,name:'Input',type:'colour',cat:0,el:null,dirty:true,audio:false,vol:.8,mute:false,solo:false,afv:true,bus:{M:true,A:false,B:false},
  key:{on:false,col:[0,1,0],tol:[.35,.35,.35],chroma:0,filter:false,filt:.6,luma:0},pos:{zoom:1,px:0,py:0,cx1:0,cx2:1,cy1:0,cy2:1},loop:true,collapsed:false},o);V.next++;
  V.inputs.push(inp);renumber();if(!V.pv&&V.pgm!==inp)V.pv=inp;if(!V.pgm){V.pgm=inp;V.pv=null;}attachAudio(inp);draw();return inp;}
function renumber(){V.inputs.forEach((x,i)=>x.num=i+1);}
function colourInput(name,hex){const c=mkCanvas(16,9),g=c.getContext('2d');g.fillStyle=hex;g.fillRect(0,0,16,9);return addInput({type:'colour',name,el:c,hex});}
function barsInput(){const c=mkCanvas(),g=c.getContext('2d');const cols=['#c0c0c0','#c0c000','#00c0c0','#00c000','#c000c0','#c00000','#0000c0'];
  cols.forEach((k,i)=>{g.fillStyle=k;g.fillRect(i*W/7,0,W/7+1,H*.67);});['#0000c0','#111','#c000c0','#111','#00c0c0','#111','#c0c0c0'].forEach((k,i)=>{g.fillStyle=k;g.fillRect(i*W/7,H*.67,W/7+1,H*.08);});
  ['#00214c','#fff','#32006a','#131313','#090909','#131313','#1d1d1d'].forEach((k,i)=>{g.fillStyle=k;g.fillRect(i*W/7,H*.75,W/7+1,H*.25);});
  return addInput({type:'colour',name:'Colour Bars',el:c});}
const TITLES={classic:{n:'Lower Third — Classic Blue',f:['Headline','Description']},news:{n:'Lower Third — News Red',f:['Name','Role']},bug:{n:'Corner Bug — LIVE',f:['Text']}};
function titleInput(t='classic',vals){const def=TITLES[t];const inp=addInput({type:'title',tpl:t,name:def.n,el:mkCanvas(),fields:Object.fromEntries(def.f.map((k,i)=>[k,(vals||[])[i]||({Headline:'Ane Etxeberria',Description:'Presenter · TV Studio Tartanga',Name:'Mikel Arana',Role:'Guest · Sound engineer',Text:'LIVE'}[k])])),anim:1});drawTitle(inp);return inp;}
function drawTitle(inp){const g=inp.el.getContext('2d'),f=inp.fields,a=inp.anim??1,e=1-Math.pow(1-a,3);g.clearRect(0,0,W,H);g.save();
  if(inp.tpl==='bug'){g.globalAlpha=e;g.fillStyle='#d01c1c';g.fillRect(W-150,30,110,34);g.fillStyle='#fff';g.font='bold 20px Segoe UI, sans-serif';g.textBaseline='middle';g.fillText('● '+f.Text,W-138,48);}
  else{const x=60-(1-e)*420,y=H-150,red=inp.tpl==='news';g.globalAlpha=Math.min(1,e*1.4);
    g.fillStyle=red?'#b3121b':'#0b3d91';g.fillRect(x,y,520,52);g.fillStyle=red?'#1d1d1d':'#1e88e5';g.fillRect(x,y+52,520,34);g.fillStyle='#fff';g.textBaseline='middle';
    g.font='bold 28px Segoe UI, sans-serif';g.fillText(f[red?'Name':'Headline'],x+18,y+27);g.font='19px Segoe UI, sans-serif';g.fillText(f[red?'Role':'Description'],x+18,y+70);}
  g.restore();inp.dirty=true;}
function videoInput(file,name){const v=document.createElement('video');v.src=URL.createObjectURL(file);v.loop=true;v.playsInline=true;v.crossOrigin='anonymous';v.preload='auto';
  const inp=addInput({type:'video',name:name||file.name.replace(/\.[^.]+$/,''),el:v,audio:true,file:file.name});v.addEventListener('loadeddata',()=>{inp.dirty=true;draw();},{once:true});return inp;}
function imageInput(file){const im=new Image();const inp=addInput({type:'image',name:file.name.replace(/\.[^.]+$/,''),el:im});im.onload=()=>{inp.dirty=true;draw();};im.src=URL.createObjectURL(file);return inp;}
async function cameraInput(deviceId,label){try{const st=await navigator.mediaDevices.getUserMedia({video:deviceId?{deviceId:{exact:deviceId}}:true,audio:true});
  const v=document.createElement('video');v.srcObject=st;v.muted=true;v.playsInline=true;await v.play();return addInput({type:'camera',name:label||st.getVideoTracks()[0]?.label||'Camera',el:v,stream:st,audio:true});}
  catch(e){alertBox('Camera','Could not open the camera: '+(e.message||e));}}
/* the multicam pack: CAM1-8 files already start together → play them together, loop together */
const PACK={t0:null,len:211};
function packSync(){if(PACK.t0==null)return;const t=((performance.now()-PACK.t0)/1000)%PACK.len;
  V.inputs.forEach(x=>{if(x.pack&&x.el.readyState>=2){if(x.el.paused)x.el.play().catch(()=>{});if(Math.abs(x.el.currentTime-t)>.12)x.el.currentTime=t;}});}
function removeInput(inp){if(V.lock)return;if(inp.stream)inp.stream.getTracks().forEach(t=>t.stop());if(inp.type==='video'){inp.el.pause();}
  V.inputs=V.inputs.filter(x=>x!==inp);V.ov.forEach(o=>{if(o.inp===inp){o.inp=null;o.a=o.target=0;}});if(V.pv===inp)V.pv=null;if(V.pgm===inp)V.pgm=null;renumber();draw();}

/* ---------- WebGL compositor ---------- */
const gc=mkCanvas();const gl=gc.getContext('webgl',{premultipliedAlpha:true,alpha:true,preserveDrawingBuffer:true});
const VS=`attribute vec2 p;uniform vec4 r;uniform vec4 cr;varying vec2 uv;void main(){uv=vec2(mix(cr.x,cr.z,p.x),mix(cr.y,cr.w,p.y));vec2 q=r.xy+p*r.zw;gl_Position=vec4(q.x*2.-1.,1.-q.y*2.,0.,1.);}`;
const FS=`precision mediump float;varying vec2 uv;uniform sampler2D t;uniform float op;uniform float key;uniform vec3 kc;uniform vec3 tol;uniform float chroma;uniform float filt;uniform float keyOnly;
vec2 cbcr(vec3 c){return vec2(-.169*c.r-.331*c.g+.5*c.b,.5*c.r-.419*c.g-.081*c.b);}
void main(){vec4 c=texture2D(t,uv);float a=c.a;vec3 rgb=a>0.?c.rgb/a:c.rgb;
 if(key>.5){vec3 d=abs(rgb-kc)/max(tol,vec3(.002));float m=max(d.r,max(d.g,d.b));float ak=smoothstep(1.,1.35,m);
  if(chroma>0.){float dc=distance(cbcr(rgb),cbcr(kc));float th=mix(.02,.32,chroma);ak=min(max(ak,0.),smoothstep(th,th+.07,dc))+ (1.-step(.001,chroma))*ak;}
  a*=ak;if(filt>0.){int dom=kc.g>=kc.r&&kc.g>=kc.b?1:(kc.b>=kc.r?2:0);if(dom==1)rgb.g=mix(rgb.g,min(rgb.g,max(rgb.r,rgb.b)),filt);else if(dom==2)rgb.b=mix(rgb.b,min(rgb.b,max(rgb.r,rgb.g)),filt);}}
 a*=op;if(keyOnly>.5){gl_FragColor=vec4(vec3(a),1.);return;}gl_FragColor=vec4(rgb*a,a);}`;
function sh(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))console.error(gl.getShaderInfoLog(s));return s;}
const prog=gl.createProgram();gl.attachShader(prog,sh(gl.VERTEX_SHADER,VS));gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(prog);gl.useProgram(prog);
const U=n=>gl.getUniformLocation(prog,n);const u={r:U('r'),cr:U('cr'),t:U('t'),op:U('op'),key:U('key'),kc:U('kc'),tol:U('tol'),chroma:U('chroma'),filt:U('filt'),keyOnly:U('keyOnly')};
const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,1,0,0,1,1,1]),gl.STATIC_DRAW);
const pl=gl.getAttribLocation(prog,'p');gl.enableVertexAttribArray(pl);gl.vertexAttribPointer(pl,2,gl.FLOAT,false,0,0);
gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
function tex(inp){if(!inp.tex){inp.tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,inp.tex);['TEXTURE_WRAP_S','TEXTURE_WRAP_T'].forEach(k=>gl.texParameteri(gl.TEXTURE_2D,gl[k],gl.CLAMP_TO_EDGE));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);inp.dirty=true;}
  gl.bindTexture(gl.TEXTURE_2D,inp.tex);const el=inp.el,live=inp.type==='video'||inp.type==='camera';
  if((live&&el.readyState>=2)||inp.dirty){try{gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,el);inp.dirty=false;inp.ready=true;}catch(e){}}return inp.ready;}
/* one layer: input + geometry (x,y,w,h in 0..1 of the frame) + opacity */
function layer(inp,o={}){if(!inp||!tex(inp))return;const p=inp.pos,z=p.zoom*(o.s??1);let w=z,h=z,x=(1-w)/2+p.px/2+(o.dx||0),y=(1-h)/2+p.py/2+(o.dy||0);
  gl.uniform4f(u.r,x+p.cx1*w,y+p.cy1*h,w*(p.cx2-p.cx1),h*(p.cy2-p.cy1));gl.uniform4f(u.cr,p.cx1,p.cy1,p.cx2,p.cy2);
  const k=inp.key;gl.uniform1f(u.key,k.on?1:0);gl.uniform3fv(u.kc,k.col);gl.uniform3fv(u.tol,k.tol);gl.uniform1f(u.chroma,k.chroma);gl.uniform1f(u.filt,k.filter?k.filt:0);
  gl.uniform1f(u.op,o.op??1);gl.uniform1f(u.keyOnly,o.keyOnly?1:0);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);}
function wipeScissor(f,vert){gl.enable(gl.SCISSOR_TEST);if(vert)gl.scissor(0,Math.round(H*(1-f)),W,Math.round(H*f)+1);else gl.scissor(0,0,Math.round(W*f),H);}
/* scene: base input (or a transition between two) + overlays */
function scene(out,{a,b,p,fx,ovs,keyOnly,transparent}){gl.viewport(0,0,W,H);gl.disable(gl.SCISSOR_TEST);gl.clearColor(0,0,0,transparent?0:1);gl.clear(gl.COLOR_BUFFER_BIT);
  if(b&&p>0){const e=p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;
    switch(fx){case 'Wipe':layer(a,{keyOnly});wipeScissor(p);layer(b,{keyOnly});gl.disable(gl.SCISSOR_TEST);break;
      case 'VerticalWipe':layer(a,{keyOnly});wipeScissor(p,true);layer(b,{keyOnly});gl.disable(gl.SCISSOR_TEST);break;
      case 'Slide':layer(a,{dx:-e,keyOnly});layer(b,{dx:1-e,keyOnly});break;case 'VerticalSlide':layer(a,{dy:-e,keyOnly});layer(b,{dy:1-e,keyOnly});break;
      case 'Fly':layer(a,{keyOnly});layer(b,{dy:1-e,keyOnly});break;
      case 'Zoom':layer(a,{op:1-e*.6,keyOnly});layer(b,{s:Math.max(.01,e),op:e,keyOnly});break;
      case 'CrossZoom':layer(a,{s:1+e*1.5,op:1-e,keyOnly});layer(b,{s:2.5-1.5*e,op:e,keyOnly});break;
      default:layer(a,{keyOnly});layer(b,{op:e,keyOnly});}}
  else layer(a,{keyOnly});
  (ovs||[]).forEach(o=>{if(o.inp&&o.a>0){if(o.inp.type==='title'){o.inp.anim=o.a;drawTitle(o.inp);layer(o.inp,{keyOnly});}else layer(o.inp,{op:o.a,keyOnly});}});
  const g=out.getContext('2d');g.clearRect(0,0,out.width,out.height);g.drawImage(gc,0,0,out.width,out.height);}

/* ---------- audio ---------- */
function ensureAudio(){if(A){A.ctx.resume();return;}const ctx=new (window.AudioContext||window.webkitAudioContext)();
  A={ctx,master:ctx.createGain(),an:[ctx.createAnalyser(),ctx.createAnalyser()],sp:ctx.createChannelSplitter(2),hp:ctx.createGain(),dest:ctx.createMediaStreamDestination()};
  A.master.connect(A.sp);A.sp.connect(A.an[0],0);A.sp.connect(A.an[1],1);A.master.connect(A.hp);A.hp.connect(ctx.destination);A.master.connect(A.dest);A.an.forEach(a=>a.fftSize=512);
  V.inputs.forEach(attachAudio);}
function attachAudio(inp){if(!A||!inp.audio||inp.g)return;try{const s=inp.type==='camera'?A.ctx.createMediaStreamSource(inp.stream):A.ctx.createMediaElementSource(inp.el);
  inp.g=A.ctx.createGain();inp.an=A.ctx.createAnalyser();inp.an.fftSize=512;s.connect(inp.g);inp.g.connect(inp.an);inp.g.connect(A.master);if(inp.type==='video')inp.el.muted=false;}catch(e){}}
function audioActive(inp){if(inp.mute)return false;if(!inp.afv)return true;return V.pgm===inp||V.ov.some(o=>o.inp===inp&&o.target>0);}
function applyAudio(){if(!A)return;const t=A.ctx.currentTime;V.inputs.forEach(x=>{if(x.g)x.g.gain.setTargetAtTime(audioActive(x)?x.vol*x.vol*(x.bus.M?1:0):0,t,.05);});A.master.gain.setTargetAtTime(V.masterVol??.8,t,.05);}
const fbuf=new Float32Array(512);const lvl=an=>{if(!an)return 0;an.getFloatTimeDomainData(fbuf);let m=0;for(const v of fbuf)m=Math.max(m,Math.abs(v));return m;};

/* ---------- transitions ---------- */
function cut(){if(!V.pv||V.lockT)return;const o=V.pgm;V.pgm=V.pv;V.pv=o;V.T=null;V.tbar=0;playOnTransition(V.pgm);commitPreviewOverlays();applyAudio();draw();}
function doTrans(fx,ms){if(!V.pv||V.T)return;V.T={fx,ms,t0:performance.now(),a:V.pgm,b:V.pv};playOnTransition(V.pv);}
function playOnTransition(inp){if(inp&&inp.type==='video'&&!inp.pack)inp.el.play().catch(()=>{});}
function finishTrans(){const T=V.T;V.pgm=T.b;V.pv=T.a;V.T=null;commitPreviewOverlays();applyAudio();draw();}
function commitPreviewOverlays(){V.ov.forEach(o=>{if(o.pend){o.inp=o.pend;o.target=1;o.pend=null;}});}
function toggleOverlay(n,inp){const o=V.ov[n];if(o.inp===inp&&o.target>0){o.target=0;}else{o.inp=inp;o.target=1;if(inp.type==='title')o.a=0;}applyAudio();draw();}

/* ---------- UI build ---------- */
const ICON={cog:'<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.6 7.6 0 0 0-1.7-1L15 3h-4l-.4 2.7a7.6 7.6 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.6 7.6 0 0 0 1.7 1L11 21h4l.4-2.7a7.6 7.6 0 0 0 1.7-1l2.5 1 2-3.5zM13 15.5A3.5 3.5 0 1 1 13 8.5a3.5 3.5 0 0 1 0 7z"/></svg>',
  mon:'<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="12" rx="1"/><path d="M8 20h8M12 16v4"/></svg>',
  wave:'<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><rect x="3" y="10" width="3" height="10"/><rect x="8" y="5" width="3" height="15"/><rect x="13" y="12" width="3" height="8"/><rect x="18" y="7" width="3" height="13"/></svg>',
  safe:'<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14"/><rect x="7" y="8" width="10" height="8"/></svg>',
  spk:'<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8a5 5 0 0 1 0 8" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
  lock:'<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="9"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  cam:'<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  menu:'<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
  bars:'<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><rect x="4" y="12" width="4" height="8"/><rect x="10" y="7" width="4" height="13"/><rect x="16" y="3" width="4" height="17"/></svg>',
  grid:'<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8"/><rect x="3" y="13" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/></svg>',
  search:'<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="10" cy="10" r="6"/><path d="M15 15l6 6"/></svg>'};
function build(){if(root.dataset.built)return;root.dataset.built='1';
  root.innerHTML=`<div class="vx-top"><span class="vx-lbl">Preset</span><button data-a="new">New</button><button data-a="open">Open ▾</button><button data-a="save">Save</button><button data-a="saveas">Save As ▾</button><button data-a="last">Last</button>
      <span class="vx-sp"></span><button data-a="fullscreen">Fullscreen ▾</button><span class="vx-sp"></span>
      <button data-a="pause">Pause Inputs</button><button data-a="basic">Basic</button><button data-a="settings">Settings ▾</button><button data-a="help">?</button><button class="vx-exit" data-a="exit" title="Leave the simulator">✕</button></div>
    <div class="vx-main">
      <div class="vx-view vx-pv"><div class="vx-vt"><span class="vx-n"></span><span class="vx-vn"></span><span class="vx-vi">${ICON.wave}${ICON.safe}<span data-a="cogpv">${ICON.cog}</span></span></div><div class="vx-scr"><canvas class="vx-cpv" width="${W}" height="${H}"></canvas></div><div class="vx-tp" data-v="pv"></div></div>
      <div class="vx-mid">
        <button class="vx-tb" data-a="quickplay">Quick Play</button><button class="vx-tb" data-a="cut">Cut</button>
        ${V.trans.map((t,i)=>`<div class="vx-tr"><button class="vx-tb" data-a="tr${i}">${t.fx}</button><button class="vx-dd" data-a="trm${i}">▾</button></div>`).join('')}
        <button class="vx-tb" data-a="ftb">FTB</button>
        <div class="vx-ovg">${[1,2,3,4,5,6,7,8].map(n=>`<button data-a="ovc${n-1}">${n}</button>`).join('')}</div>
        <div class="vx-tbar"><div class="vx-tbt"></div><div class="vx-tbh"></div></div>
      </div>
      <div class="vx-view vx-pg"><div class="vx-vt"><span class="vx-n"></span><span class="vx-vn"></span><span class="vx-vi"><span data-a="cogpg">${ICON.cog}</span></span></div><div class="vx-scr"><canvas class="vx-cpg" width="${W}" height="${H}"></canvas></div><div class="vx-tp" data-v="pg"></div></div>
    </div>
    <div class="vx-cats">${CAT.map((c,i)=>`<button class="vx-cat" data-a="cat" data-cat="${i}" style="background:${c.c}" title="${c.n}">${i===0?'':''}</button>`).join('')}<button class="vx-cat vx-srch" data-a="search">${ICON.search}</button><span class="vx-sp"></span><button class="vx-amt" data-a="mixer">${ICON.spk} Audio Mixer</button></div>
    <div class="vx-sepl"></div>
    <div class="vx-low"><div class="vx-ins"></div><div class="vx-mix"></div></div>
    <div class="vx-bot"><button class="vx-add" data-a="add">Add Input ▴</button>
      <span class="vx-bg"><button class="vx-c" data-a="recset">${ICON.cog}</button><button data-a="rec">Record</button></span>
      <span class="vx-bg"><button class="vx-c" data-a="extset">${ICON.cog}</button><button data-a="ext">External</button></span>
      <span class="vx-bg"><button class="vx-c" data-a="strset">${ICON.cog}</button><button data-a="stream">Stream ▴</button></span>
      <span class="vx-bg"><button class="vx-c" data-a="mcset">${ICON.cog}</button><button data-a="multicorder">MultiCorder</button></span>
      <span class="vx-bg"><button class="vx-c" data-a="plset">${ICON.cog}</button><button data-a="playlist">PlayList</button></span>
      <button data-a="overlay">Overlay</button><span class="vx-sp"></span>
      <button class="vx-ic" data-a="menu">${ICON.menu}</button><button class="vx-ic" data-a="stats">${ICON.bars}</button><button class="vx-ic" data-a="multiview" title="MultiView (second screen)">${ICON.grid}</button><button class="vx-ic" data-a="snap" title="Snapshot">${ICON.cam}</button><button class="vx-ic" data-a="lock" title="Lock">${ICON.lock}</button></div>
    <div class="vx-st"><span class="vx-fmt">1080p25</span><span class="vx-ex">EX</span><span class="vx-stx"></span><span class="vx-sp"></span><span class="vx-note">Training simulator · not affiliated with vMix</span></div>
    <div class="vx-pop" id="vx-pop"></div><div class="vx-modal" id="vx-modal"></div><div class="vx-tip" id="vx-tip"></div>`;
  wire();}
function wire(){
  root.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b||!root.contains(b))return;act(b.dataset.a,b,e);});
  root.addEventListener('contextmenu',e=>{const ov=e.target.closest('[data-ovin]'),cat=e.target.closest('.vx-cat[data-cat]'),th=e.target.closest('.vx-th'),title=e.target.closest('.vx-it');
    if(ov){e.preventDefault();const [id,n]=ov.dataset.ovin.split(':');const inp=byId(+id),o=V.ov[+n];o.pend=o.pend===inp?null:inp;draw();}
    else if(cat){e.preventDefault();catDialog();}
    else if(th){e.preventDefault();const inp=byId(+th.closest('.vx-box').dataset.id);ctxMenu(inp,e);}
    else if(title){e.preventDefault();const inp=byId(+title.closest('.vx-box').dataset.id);inp.collapsed=!inp.collapsed;draw();}});
  root.addEventListener('dblclick',e=>{const bx=e.target.closest('.vx-th,.vx-it');if(bx){const inp=byId(+bx.closest('.vx-box').dataset.id);inputSettings(inp);}});
  // drag a thumbnail onto a category button
  root.addEventListener('dragstart',e=>{const th=e.target.closest('.vx-th');if(th)e.dataTransfer.setData('text/vx',th.closest('.vx-box').dataset.id);});
  root.addEventListener('dragover',e=>{if(e.target.closest('.vx-cat[data-cat],.vx-box'))e.preventDefault();});
  root.addEventListener('drop',e=>{const id=e.dataTransfer.getData('text/vx');if(!id)return;const inp=byId(+id),c=e.target.closest('.vx-cat[data-cat]'),bx=e.target.closest('.vx-box');
    if(c){inp.cat=+c.dataset.cat;}else if(bx&&+bx.dataset.id!==inp.id){const to=byId(+bx.dataset.id);V.inputs.splice(V.inputs.indexOf(inp),1);V.inputs.splice(V.inputs.indexOf(to),0,inp);renumber();}draw();});
  // T-Bar
  const tb=$('.vx-tbar',root);tb.addEventListener('pointerdown',e=>{if(!V.pv)return;tb.setPointerCapture(e.pointerId);const r=tb.getBoundingClientRect();
    const mv=ev=>{const pos=Math.min(1,Math.max(0,(ev.clientY-r.top)/r.height));const p=V.tbarDir>0?pos:1-pos;V.tbar=p;
      if(!V.T||!V.T.manual)V.T={fx:V.trans[0].fx,manual:true,a:V.pgm,b:V.pv};V.T.p=p;if(p>=.999){finishTrans();V.tbarDir*=-1;V.tbar=0;}};
    mv(e);const up=()=>{tb.removeEventListener('pointermove',mv);tb.removeEventListener('pointerup',up);};tb.addEventListener('pointermove',mv);tb.addEventListener('pointerup',up);});
  // tooltips (simulator help, outside the vMix look)
  root.addEventListener('mousemove',e=>{const t=e.target.closest('[data-tip]'),tip=$('#vx-tip');if(!t){tip.classList.remove('on');return;}tip.textContent=t.dataset.tip;tip.style.left=e.clientX+'px';tip.style.top=e.clientY+'px';tip.classList.add('on');});
  document.addEventListener('pointerdown',e=>{const p=$('#vx-pop');if(p.classList.contains('on')&&!p.contains(e.target)&&!e.target.closest('[data-a^="trm"],[data-a="add"]'))p.classList.remove('on');});
  addEventListener('keydown',e=>{if(!root.classList.contains('on')||e.target.closest('input,textarea,select'))return;
    if(e.key==='Escape'){if($('#vx-modal').classList.contains('on'))closeModal();else window.closeVmix();}});}
const byId=id=>V.inputs.find(x=>x.id===id);
function act(a,b,e){
  if(a==='exit')return window.closeVmix();
  if(a==='cut')return cut();
  if(a==='quickplay')return doTrans('Fade',500);
  if(/^tr\d$/.test(a)){const t=V.trans[+a[2]];return doTrans(t.fx,t.ms);}
  if(/^trm\d$/.test(a))return transMenu(+a[3],b);
  if(a==='ftb'){V.ftb=!V.ftb;return draw();}
  if(/^ovc\d$/.test(a)){if(V.pv)toggleOverlay(+a[3],V.pv);return;}
  if(a==='cat'){V.cat=+b.dataset.cat;return draw();}
  if(a==='search'){const q=prompt('Search inputs by title:',V.search||'');V.search=(q||'').trim();V.cat=0;return draw();}
  if(a==='mixer'){V.mixer=!V.mixer;return draw();}
  if(a==='add')return addInputDialog();
  if(a==='basic'){V.basic=!V.basic;return draw();}
  if(a==='lock'){V.lock=!V.lock;return draw();}
  if(a==='cogpv'&&V.pv)return inputSettings(V.pv);if(a==='cogpg'&&V.pgm)return inputSettings(V.pgm);
  const id=+(b.closest('.vx-box')?.dataset.id||0),inp=id&&byId(id);
  if(inp){if(a==='ib-close')return confirmBox('Close input','Close "'+inp.name+'"?',()=>removeInput(inp));
    if(a==='ib-cut'){V.pv=inp;return cut();}if(a==='ib-go'){V.pv=inp;return doTrans('Fade',500);}
    if(a.startsWith('ib-ov'))return toggleOverlay(+a.slice(5),inp);
    if(a==='ib-audio'){inp.mute=!inp.mute;applyAudio();return draw();}if(a==='ib-cog')return inputSettings(inp);if(a==='ib-mon')return bigPreview(inp);
    if(a==='ib-loop'){inp.loop=!inp.loop;if(inp.el)inp.el.loop=inp.loop;return draw();}
    if(a==='ib-th'){V.pv=inp;return draw();}}
  if(a.startsWith('tp-')){const v=a.slice(3,5)==='pv'?V.pv:V.pgm,op=a.slice(6);if(!v||v.type!=='video')return;if(op==='play')v.el.paused?v.el.play():v.el.pause();if(op==='restart'){v.el.currentTime=0;}return draw();}
  if(a==='mx-master'){V.masterMute=!V.masterMute;if(A)A.master.gain.value=V.masterMute?0:.8;return draw();}
  notYet(b.textContent.trim()||a);}
function notYet(name){alertBox(name,'This part is not simulated yet. It will come in the next versions of the simulator.');}

/* ---------- rendering of the UI ---------- */
function draw(){if(!root.dataset.built)return;
  const vt=(sel,inp,col)=>{const el=$(sel,root);$('.vx-n',el).textContent=inp?inp.num:'';$('.vx-vn',el).textContent=inp?inp.name:'Blank';el.style.background=col;};
  vt('.vx-pv .vx-vt',V.pv,'#FF8C00');vt('.vx-pg .vx-vt',V.pgm,'#006400');
  ['pv','pg'].forEach(k=>{const inp=k==='pv'?V.pv:V.pgm,tp=$(`.vx-tp[data-v="${k}"]`,root);
    tp.innerHTML=inp&&inp.type==='video'?`<button data-a="tp-${k}-restart" title="Restart">⏮</button><button data-a="tp-${k}-play">${inp.el.paused?'▶':'❚❚'}</button><div class="vx-pos"><div class="vx-posf"></div></div><span class="vx-tc"></span>`:'';});
  // centre column
  V.trans.forEach((t,i)=>{$(`[data-a="tr${i}"]`,root).textContent=t.fx;});
  $('[data-a="ftb"]',root).classList.toggle('on',V.ftb);
  V.ov.forEach((o,n)=>{const b=$(`[data-a="ovc${n}"]`,root);b.classList.toggle('on',o.target>0);b.classList.toggle('pend',!!o.pend);});
  // categories
  $$('.vx-cat[data-cat]',root).forEach(b=>{const i=+b.dataset.cat;b.classList.toggle('sel',V.cat===i);b.textContent=V.catLabels?.[i]||'';b.title=(V.catLabels?.[i]||CAT[i].n)+(i===0?' — view all inputs':'')+' · right-click to edit categories';});
  $('.vx-sepl',root).style.background=CAT[V.cat].c==='#293038'?'#3a434d':CAT[V.cat].c;
  $('[data-a="mixer"]',root).classList.toggle('on',V.mixer);root.classList.toggle('mixer',V.mixer);root.classList.toggle('basic',V.basic);
  // inputs
  const box=$('.vx-ins',root);const list=V.inputs.filter(x=>(V.cat===0||x.cat===V.cat)&&(!V.search||x.name.toLowerCase().includes(V.search.toLowerCase())));
  box.innerHTML=list.map(x=>{const st=V.pgm===x?'#006400':V.pv===x?'#FF8C00':'#293038';
    return `<div class="vx-box${x.collapsed?' col':''}" data-id="${x.id}"><div class="vx-it" style="background:${st}"><span class="vx-n">${x.num}</span><span class="vx-in">${x.name}</span><button data-a="ib-close" title="Close">✕</button></div>
      <div class="vx-th" draggable="true" data-a="ib-th"><canvas width="192" height="108"></canvas>${x.audio?'<div class="vx-im"><i></i><i></i></div>':''}</div>
      <div class="vx-ib"><span>${[1,2,3,4].map(n=>`<button class="vx-o${V.ov[n-1].inp===x&&V.ov[n-1].target>0?' on':''}${V.ov[n-1].pend===x?' pend':''}" data-a="ib-ov${n-1}" data-ovin="${x.id}:${n-1}">${n}</button>`).join('')}<button data-a="ib-go">GO</button><button data-a="ib-cut">Cut</button>${x.type==='video'?`<button class="${x.loop?'on':''}" data-a="ib-loop">Loop</button>`:'<button disabled></button>'}</span>
      <span>${[5,6,7,8].map(n=>`<button class="vx-o${V.ov[n-1].inp===x&&V.ov[n-1].target>0?' on':''}${V.ov[n-1].pend===x?' pend':''}" data-a="ib-ov${n-1}" data-ovin="${x.id}:${n-1}">${n}</button>`).join('')}<button class="vx-au${x.audio&&!x.mute?' on':''}" data-a="ib-audio">Audio</button><button data-a="ib-mon">${ICON.mon}</button><button data-a="ib-cog" style="color:${x.cat?CAT[x.cat].c:'#ddd'}">${ICON.cog}</button></span></div></div>`;}).join('')||`<div class="vx-empty">No inputs${V.cat?' in this category':''}. Use <b>Add Input</b> (bottom left).</div>`;
  // mixer
  const mx=$('.vx-mix',root);if(V.mixer){const ain=V.inputs.filter(x=>x.audio);
    mx.innerHTML=`<div class="vx-mxb"><div class="vx-mxl">OUTPUTS</div><div class="vx-strip"><div class="vx-sth" style="background:#006400">Master</div><button data-a="mx-master" class="${V.masterMute?'':'on'}">${ICON.spk}</button><input type="range" class="vx-fd" orient="vertical" min="0" max="100" value="${(V.masterVol??.8)*100}" data-mv="master"><div class="vx-mm" data-meter="master"><i></i><i></i></div></div></div>
      <div class="vx-mxb"><div class="vx-mxl">INPUTS</div>${ain.map(x=>`<div class="vx-strip" data-id="${x.id}"><div class="vx-sth">${x.name}</div><button class="vx-afv${x.afv?' on':''}" data-mx="afv" title="Audio follow video (automatically mix audio)">⇄</button><button class="${x.mute?'':'on'}" data-mx="mute">${ICON.spk}</button>
        <input type="range" class="vx-fd" orient="vertical" min="0" max="100" value="${x.vol*100}" data-mv="${x.id}"><div class="vx-mm" data-meter="${x.id}"><i></i><i></i></div><div class="vx-bus">${['M','A','B'].map(k=>`<button class="${x.bus[k]?'on':''}" data-mx="bus${k}">${k}</button>`).join('')}</div></div>`).join('')||'<div class="vx-empty">No inputs with audio.</div>'}</div>`;
    $$('[data-mv]',mx).forEach(r=>r.oninput=()=>{const v=r.value/100;if(r.dataset.mv==='master')V.masterVol=v;else byId(+r.dataset.mv).vol=v;applyAudio();});
    $$('[data-mx]',mx).forEach(b=>b.onclick=()=>{const x=byId(+b.closest('.vx-strip').dataset.id),k=b.dataset.mx;if(k==='afv')x.afv=!x.afv;else if(k==='mute')x.mute=!x.mute;else{const bb=k.slice(3);x.bus[bb]=!x.bus[bb];}applyAudio();draw();});}
  // bottom bar
  $('[data-a="rec"]',root).classList.toggle('live',V.rec);$('[data-a="stream"]',root).classList.toggle('live',V.stream);$('[data-a="ext"]',root).classList.toggle('live',V.ext);
  $('[data-a="lock"]',root).classList.toggle('lock',V.lock);$('[data-a="basic"]',root).textContent=V.basic?'Advanced':'Basic';
  $('[data-a="multicorder"]',root).dataset.tip='MultiCorder is not available in the HD edition (4K / Pro / Max only).';
  applyAudio();}

/* ---------- main loop ---------- */
let last=performance.now(),acc=0,frames=0;
function loop(now){requestAnimationFrame(loop);if(!root.classList.contains('on'))return;const t0=performance.now();
  packSync();
  if(V.T&&!V.T.manual){const p=Math.min(1,(now-V.T.t0)/V.T.ms);V.T.p=p;if(p>=1)finishTrans();}
  V.ov.forEach(o=>{const sp=1/30;o.a+=Math.sign(o.target-o.a)*Math.min(Math.abs(o.target-o.a),sp);if(o.a===0&&o.target===0&&o.inp&&!o.pend){}});
  const T=V.T;const cpg=$('.vx-cpg',root),cpv=$('.vx-cpv',root);
  scene(cpg,{a:T?T.a:V.pgm,b:T?T.b:null,p:T?T.p||0:0,fx:T?T.fx:null,ovs:V.ov});
  scene(cpv,{a:V.pv,ovs:V.ov.map(o=>o.pend?{inp:o.pend,a:1}:{inp:null,a:0})});
  if(V.extWin&&!V.extWin.closed)renderExternal();
  if(V.mvWin&&!V.mvWin.closed)renderMultiview();
  // thumbnails (live) + meters
  $$('.vx-box',root).forEach(bx=>{const inp=byId(+bx.dataset.id),c=$('canvas',bx);if(!inp||!c||!inp.ready&&inp.type!=='title')return;const g=c.getContext('2d');
    g.fillStyle='#000';g.fillRect(0,0,192,108);try{if(inp.type==='title'){inp.anim=1;drawTitle(inp);}g.drawImage(inp.el,0,0,192,108);}catch(_){}
    const m=$('.vx-im',bx);if(m&&inp.an){const v=lvl(inp.an);m.children[0].style.height=m.children[1].style.height=Math.min(100,v*130)+'%';}});
  if(V.mixer&&A){$$('[data-meter]',root).forEach(m=>{const k=m.dataset.meter;let l=0,r=0;if(k==='master'){l=lvl(A.an[0]);r=lvl(A.an[1]);}else{const x=byId(+k);l=r=x&&x.an?lvl(x.an):0;}
    m.children[0].style.height=Math.min(100,l*120)+'%';m.children[1].style.height=Math.min(100,r*120)+'%';});}
  // transport position
  ['pv','pg'].forEach(k=>{const inp=k==='pv'?V.pv:V.pgm,tp=$(`.vx-tp[data-v="${k}"]`,root);if(inp&&inp.type==='video'&&tp.firstChild){const d=inp.el.duration||0,c=inp.el.currentTime||0;
    $('.vx-posf',tp).style.width=(d?c/d*100:0)+'%';$('.vx-tc',tp).textContent=fmt(c)+' / '+fmt(d);}});
  // T-bar handle
  const h=$('.vx-tbh',root);if(h){const p=V.T?V.T.p||0:0;const pos=V.tbarDir>0?p:1-p;h.style.top=`calc(${pos*100}% - 6px)`;}
  // status bar
  frames++;acc+=now-last;last=now;V.rt=performance.now()-t0;if(acc>500){V.fps=Math.round(frames*1000/acc);frames=0;acc=0;
    $('.vx-stx',root).textContent=`FPS: ${V.fps}   Render Time: ${V.rt.toFixed(0)} ms   GPU Mem: 3 %   CPU vMix: ${Math.min(99,4+V.inputs.length*2)} %   Total: ${Math.min(99,9+V.inputs.length*2)} %`+
      (V.rec?`   ● REC ${fmt((now-V.recT0)/1000)}`:'')+(V.stream?`   ● STREAM ${fmt((now-V.streamT0)/1000)}`:'');}}
const fmt=s=>{s=Math.max(0,s||0);const m=Math.floor(s/60),x=Math.floor(s%60);return String(m).padStart(2,'0')+':'+String(x).padStart(2,'0');};

/* ---------- popups & dialogs ---------- */
function pop(html,anchor){const p=$('#vx-pop');p.innerHTML=html;const r=anchor.getBoundingClientRect(),rr=root.getBoundingClientRect();p.style.left=Math.min(r.left-rr.left,rr.width-240)+'px';p.style.top=(r.bottom-rr.top+2)+'px';p.classList.add('on');return p;}
function transMenu(i,b){const t=V.trans[i];const p=pop(`<div class="vx-ph">Transition ${i+1}${i===0?' · also used by the T-Bar':''}</div>${FX.map(f=>`<button class="${t.fx===f?'on':''}" data-fx="${f}">${f}</button>`).join('')}<div class="vx-pdur">Duration <input type="number" min="0" max="10000" step="100" value="${t.ms}"> ms</div>`,b);
  $$('[data-fx]',p).forEach(x=>x.onclick=()=>{t.fx=x.dataset.fx;p.classList.remove('on');draw();});$('input',p).onchange=e=>{t.ms=Math.max(0,+e.target.value||0);};}
function modal(title,body,{w=560,ok='OK',onOk,cancel=true}={}){const m=$('#vx-modal');m.innerHTML=`<div class="vx-win" style="width:min(${w}px,96vw)"><div class="vx-wt">${title}<button data-x>✕</button></div><div class="vx-wb">${body}</div><div class="vx-wf">${cancel?'<button data-x>Cancel</button>':''}${ok?`<button class="vx-ok">${ok}</button>`:''}</div></div>`;
  m.classList.add('on');$$('[data-x]',m).forEach(b=>b.onclick=closeModal);if(ok)$('.vx-ok',m).onclick=()=>{if(onOk&&onOk(m)===false)return;closeModal();};return m;}
function closeModal(){$('#vx-modal').classList.remove('on');$('#vx-modal').innerHTML='';V.editing=null;}
function alertBox(t,msg){modal(t,`<p>${msg}</p>`,{w:420,cancel:false});}
function confirmBox(t,msg,fn){modal(t,`<p>${msg}</p>`,{w:380,onOk:()=>{fn();}});}
function bigPreview(inp){const m=modal('Input '+inp.num+' — '+inp.name,`<canvas class="vx-big" width="${W}" height="${H}"></canvas><p class="vx-hint">Click the image to close.</p>`,{w:820,ok:null,cancel:false});
  const c=$('.vx-big',m);c.onclick=closeModal;const tick=()=>{if(!m.classList.contains('on')||!m.contains(c))return;scene(c,{a:inp});requestAnimationFrame(tick);};tick();}
function ctxMenu(inp,e){const items=inp.type==='title'?[['Title Editor',()=>titleEditor(inp)],['TransitionIn',()=>toggleOverlay(0,inp)],['TransitionOut',()=>{V.ov.forEach(o=>{if(o.inp===inp)o.target=0;});draw();}]]
    :inp.type==='video'?[['Restart',()=>{inp.el.currentTime=0;}],['Play / Pause',()=>{inp.el.paused?inp.el.play():inp.el.pause();}]]:[['Input Settings',()=>inputSettings(inp)]];
  const p=pop(items.map((x,i)=>`<button data-i="${i}">${x[0]}</button>`).join(''),{getBoundingClientRect:()=>({left:e.clientX,bottom:e.clientY})});$$('[data-i]',p).forEach(b=>b.onclick=()=>{p.classList.remove('on');items[+b.dataset.i][1]();draw();});}

/* Add Input — the real list of types; the ones not simulated are disabled */
const TYPES=[['Video',1],['DVD',0],['List',0],['Camera',1],['NDI / Desktop Capture',0],['Stream / SRT',0],['Instant Replay',0,'Not available in the HD edition.'],['Image Sequence / Stinger',0],['Video Delay',0],['Image',1],['Photos',0],['PowerPoint',0],['Colour',1],['Audio',0],['Audio Input',0],['Title / XAML',1],['Flash / RTMP',0],['Virtual Set',0],['Web Browser',0],['Video Call',0]];
function addInputDialog(){const m=modal('Input Select',`<div class="vx-is"><div class="vx-isl">${TYPES.map(([n,ok,why],i)=>`<button data-t="${i}" ${ok?'':'class="na"'} title="${ok?'':(why||'Not simulated yet')}">${n}</button>`).join('')}</div><div class="vx-isr"><div class="vx-ish"></div><div class="vx-isp"></div></div></div>`,{w:860,onOk:()=>V.addOk&&V.addOk()});
  const sel=i=>{const [n,ok,why]=TYPES[i];$$('.vx-isl button',m).forEach(b=>b.classList.toggle('on',+b.dataset.t===i));const ph=$('.vx-isp',m),hd=$('.vx-ish',m);V.addOk=null;
    if(!ok){hd.textContent=n;ph.innerHTML=`<p class="vx-hint">${why||'This input type is not simulated yet.'}</p>`;return;}
    if(n==='Video'){hd.textContent='Select the Video file(s) to open.';ph.innerHTML=`<label class="vx-browse">Browse… <input type="file" accept="video/*" multiple hidden></label><div class="vx-files"></div>
        <div class="vx-packbox"><b>Multicam pack (8 cameras, already in sync)</b><br><a href="https://apps.cinemafilmak.com/tvstudio/tvstudio-multicam-pack.zip">Download pack</a> (107 MB) · unzip it · then <b>Browse…</b> and select CAM1.mp4 … CAM8.mp4 together. They start together and loop together.</div>`;
      let files=[];$('input',ph).onchange=e=>{files=[...e.target.files];$('.vx-files',ph).textContent=files.map(f=>f.name).join(' · ');};
      V.addOk=()=>{if(!files.length)return;const isPack=files.every(f=>/^CAM\d\.mp4$/i.test(f.name));files.sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true})).forEach(f=>{const x=videoInput(f,isPack?f.name.replace(/\.mp4$/i,'').replace('CAM','Camera '):null);if(isPack){x.pack=true;x.el.loop=true;}});
        if(isPack){PACK.t0=performance.now();V.inputs.filter(x=>x.pack).forEach(x=>{x.el.currentTime=0;x.el.play().catch(()=>{});});}};}
    else if(n==='Image'){hd.textContent='Select the Image file to open (PNG with transparency supported).';ph.innerHTML=`<label class="vx-browse">Browse… <input type="file" accept="image/*" hidden></label><div class="vx-files"></div>`;
      let f=null;$('input',ph).onchange=e=>{f=e.target.files[0];$('.vx-files',ph).textContent=f?f.name:'';};V.addOk=()=>f&&imageInput(f);}
    else if(n==='Colour'){hd.textContent='Select a colour.';ph.innerHTML=`<label>Colour <input type="color" value="#0b3d91"></label><label><input type="checkbox" class="vx-bars"> Colour Bars</label>`;
      V.addOk=()=>{$('.vx-bars',ph).checked?barsInput():colourInput('Colour',$('input[type=color]',ph).value);};}
    else if(n==='Camera'){hd.textContent='Select the Camera (capture device).';ph.innerHTML=`<label>Camera <select class="vx-dev"><option value="">Default camera</option></select></label><p class="vx-hint">Your webcam (or a capture card) works as a camera input. The browser asks for permission.</p>`;
      navigator.mediaDevices?.enumerateDevices().then(ds=>{ds.filter(d=>d.kind==='videoinput').forEach(d=>{const o=document.createElement('option');o.value=d.deviceId;o.textContent=d.label||'Camera';$('.vx-dev',ph).appendChild(o);});});
      V.addOk=()=>{const s=$('.vx-dev',ph);cameraInput(s.value,s.value?s.selectedOptions[0].textContent:null);};}
    else if(n==='Title / XAML'){hd.textContent='Select a title template.';ph.innerHTML=`<div class="vx-gal">${Object.entries(TITLES).map(([k,t])=>`<button data-tpl="${k}"><span class="vx-gt">GT</span>${t.n}</button>`).join('')}</div>`;
      let tp='classic';$$('[data-tpl]',ph).forEach(b=>b.onclick=()=>{tp=b.dataset.tpl;$$('[data-tpl]',ph).forEach(x=>x.classList.toggle('on',x===b));});$('[data-tpl]',ph).classList.add('on');V.addOk=()=>titleInput(tp);}};
  $$('.vx-isl button',m).forEach(b=>b.onclick=()=>sel(+b.dataset.t));sel(0);}

/* Input Settings — General · Colour Key / Chroma Key · Position (the others listed, not simulated) */
function inputSettings(inp){const k=inp.key,p=inp.pos,hex=c=>'#'+c.map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('');
  const tabs=['General','Colour Adjust','Colour Key / Chroma Key','Colour Correction','Effects','Position','Layers / MultiView','Triggers','Tally Lights','PTZ','Advanced','Copy From'];
  const m=modal('Input: '+inp.name,`<div class="vx-iset"><div class="vx-isl">${tabs.map((t,i)=>`<button data-tab="${i}" class="${[0,2,5].includes(i)?'':'na'}">${t}</button>`).join('')}</div><div class="vx-isr"><div class="vx-isp"></div><canvas class="vx-isprev" width="${W}" height="${H}"></canvas><p class="vx-hint vx-pick"></p></div></div>`,{w:880,ok:'OK',cancel:false});
  const ph=$('.vx-isp',m),pv=$('.vx-isprev',m);V.editing=inp;
  const sl=(lbl,val,min,max,step,fn,cls='')=>{const id='s'+Math.random().toString(36).slice(2);setTimeout(()=>{const r=$('#'+id,m);if(r)r.oninput=()=>{fn(+r.value);};},0);return `<label class="vx-sl ${cls}">${lbl}<input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${val}"></label>`;};
  const show=i=>{$$('[data-tab]',m).forEach(b=>b.classList.toggle('on',+b.dataset.tab===i));$('.vx-pick',m).textContent='';
    if(i===0){ph.innerHTML=`<label>Name <input class="vx-name" value="${inp.name}"></label><label>Category <select class="vx-catsel">${CAT.map((c,j)=>`<option value="${j}" ${inp.cat===j?'selected':''}>${j?(V.catLabels?.[j]||c.n):'None'}</option>`).join('')}</select></label>
        <label>GO Action <select disabled><option>QuickPlay</option></select></label><label><input type="checkbox" class="vx-afvc" ${inp.afv?'checked':''}> Automatically mix audio</label>`;
      $('.vx-name',ph).oninput=e=>{inp.name=e.target.value;draw();};$('.vx-catsel',ph).onchange=e=>{inp.cat=+e.target.value;draw();};$('.vx-afvc',ph).onchange=e=>{inp.afv=e.target.checked;applyAudio();};}
    else if(i===2){ph.innerHTML=`<div class="vx-kr"><label><input type="checkbox" class="vx-kon" ${k.on?'checked':''}> Colour Key</label><span class="vx-kc" style="background:${hex(k.col)}"></span><button class="vx-pk" data-tip="Auto Colour Key: then click on the image below to pick the key colour">💧</button><label class="vx-kcp">▦<input type="color" value="${hex(k.col)}"></label></div>
        <div class="vx-kbox"><div>${sl('Chroma Key',k.chroma,0,1,.01,v=>k.chroma=v)}<label><input type="checkbox" class="vx-kf" ${k.filter?'checked':''}> Chroma Key Filter</label>${sl('',k.filt,0,1,.01,v=>k.filt=v)}
          <div class="vx-kp">Auto Chroma Key Presets <button data-pre="1">1</button><button data-pre="2">2</button><button data-pre="3">3</button><button data-pre="r">Reset</button></div></div>
          <div>${sl('<span style="color:#e53935">Red</span>',k.tol[0],0,1,.01,v=>k.tol[0]=v)}${sl('<span style="color:#43a047">Green</span>',k.tol[1],0,1,.01,v=>k.tol[1]=v)}${sl('<span style="color:#1e88e5">Blue</span>',k.tol[2],0,1,.01,v=>k.tol[2]=v)}</div></div>`;
      $('.vx-kon',ph).onchange=e=>{k.on=e.target.checked;};$('.vx-kf',ph).onchange=e=>{k.filter=e.target.checked;};
      $('input[type=color]',ph).oninput=e=>{const h=e.target.value;k.col=[1,3,5].map(j=>parseInt(h.slice(j,j+2),16)/255);$('.vx-kc',ph).style.background=h;};
      $('.vx-pk',ph).onclick=()=>{V.picking=true;$('.vx-pick',m).textContent='Click on the image to pick the key colour.';};
      $$('[data-pre]',ph).forEach(b=>b.onclick=()=>{const pr={1:[.25,.25,.25,.4,.5],2:[.35,.35,.35,.6,.6],3:[.45,.45,.45,.8,.75],r:[.35,.35,.35,0,.6]}[b.dataset.pre];k.tol=pr.slice(0,3);k.chroma=pr[3];k.filt=pr[4];k.on=true;k.filter=b.dataset.pre!=='r';show(2);});}
    else if(i===5){ph.innerHTML=`<div class="vx-kbox"><div>${sl('Zoom',p.zoom,.1,3,.01,v=>p.zoom=v)}${sl('Pan X',p.px,-2,2,.01,v=>p.px=v)}${sl('Pan Y',p.py,-2,2,.01,v=>p.py=v)}<button data-pos="reset">Reset</button></div>
        <div>${sl('Crop X1',p.cx1,0,1,.01,v=>p.cx1=Math.min(v,p.cx2-.01))}${sl('Crop X2',p.cx2,0,1,.01,v=>p.cx2=Math.max(v,p.cx1+.01))}${sl('Crop Y1',p.cy1,0,1,.01,v=>p.cy1=Math.min(v,p.cy2-.01))}${sl('Crop Y2',p.cy2,0,1,.01,v=>p.cy2=Math.max(v,p.cy1+.01))}</div></div>`;
      $('[data-pos]',ph).onclick=()=>{Object.assign(p,{zoom:1,px:0,py:0,cx1:0,cx2:1,cy1:0,cy2:1});show(5);};}
    else ph.innerHTML=`<p class="vx-hint">${tabs[i]} — not simulated yet.</p>`;};
  $$('[data-tab]',m).forEach(b=>b.onclick=()=>show(+b.dataset.tab));show(inp.key.on?2:0);
  pv.onclick=e=>{if(!V.picking||!inp.el)return;const r=pv.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;const c=mkCanvas(W,H),g=c.getContext('2d');try{g.drawImage(inp.el,0,0,W,H);const d=g.getImageData(Math.floor(x*W),Math.floor(y*H),1,1).data;k.col=[d[0]/255,d[1]/255,d[2]/255];k.on=true;}catch(_){}V.picking=false;show(2);};
  const chk=mkCanvas(W,H),cg=chk.getContext('2d');for(let y=0;y<H;y+=24)for(let x=0;x<W;x+=24){cg.fillStyle=((x+y)/24)%2?'#555':'#777';cg.fillRect(x,y,24,24);}
  const tick=()=>{if(!m.classList.contains('on')||!m.contains(pv))return;scene(pv,{a:inp,transparent:true});const g=pv.getContext('2d');g.globalCompositeOperation='destination-over';g.drawImage(chk,0,0);g.globalCompositeOperation='source-over';requestAnimationFrame(tick);};tick();}
function titleEditor(inp){modal('Title Editor — '+inp.name,`<div class="vx-te">${Object.keys(inp.fields).map(k=>`<label>${k}<input data-f="${k}" value="${inp.fields[k]}"></label>`).join('')}<label class="vx-live"><input type="checkbox" checked disabled> Live (updates as you type)</label></div>`,{w:480,cancel:false});
  $$('[data-f]',$('#vx-modal')).forEach(i=>i.oninput=()=>{inp.fields[i.dataset.f]=i.value;drawTitle(inp);});}
function catDialog(){const L=V.catLabels||(V.catLabels=CAT.map(()=>''));modal('Input Categories',`<div class="vx-cd">${CAT.slice(1).map((c,i)=>`<label><span style="background:${c.c}"></span><input data-c="${i+1}" value="${L[i+1]}" placeholder="${c.n}"></label>`).join('')}</div><p class="vx-hint">Type a label for each category. Drag an input's thumbnail onto a category button to move it there.</p>`,{w:420,onOk:m=>{$$('[data-c]',m).forEach(x=>L[+x.dataset.c]=x.value.trim());draw();}});}

/* ---------- External (Fill + Key) and MultiView windows: second screens ---------- */
function renderExternal(){}
function renderMultiview(){}

/* ---------- open / close ---------- */
function seed(){if(V.inputs.length)return;barsInput();colourInput('Colour','#0b3d91');titleInput('classic');titleInput('news');V.pgm=V.inputs[0];V.pv=V.inputs[1];}
window.openVmix=()=>{build();ensureAudio();seed();root.classList.add('on');draw();};
window.closeVmix=()=>{root.classList.remove('on');closeModal();$('#vx-pop')?.classList.remove('on');};
requestAnimationFrame(loop);
})();
