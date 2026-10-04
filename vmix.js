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
  rec:false,recT0:0,stream:false,streamT0:0,ext:false,alpha:'None',fps:0,rt:0,
  ovset:Array.from({length:8},()=>({type:'Fullscreen',fx:'Fade',ms:500,dur:0,zoom:.45,px:.55,py:-.55})),
  stingers:[{inp:null,cut:600,dur:1200},{inp:null,cut:600,dur:1200}]};   // Stinger 1-2 (Overlay Settings › Number)   // Overlay Settings per channel
let A=null;   // audio

/* ---------- inputs ---------- */
function mkCanvas(w=W,h=H){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function addInput(o){const inp=Object.assign({id:V.next,num:V.inputs.length+1,name:'Input',type:'colour',cat:0,el:null,dirty:true,audio:false,vol:.8,mute:false,solo:false,afv:true,bus:{M:true,A:false,B:false},
  key:{on:false,col:[0,1,0],tol:[.35,.35,.35],chroma:0,filter:false,filt:.6,luma:0},pos:{zoom:1,px:0,py:0,cx1:0,cx2:1,cy1:0,cy2:1},
  ca:{bs:0,ws:0,r:1,g:1,b:1,alpha:1,sat:1},cc:{lift:[0,0,0],gamma:[0,0,0],gain:[0,0,0],hue:0,sat:1},layers:[],loop:true,collapsed:false},o);V.next++;
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
function packSync(){}   // no hidden corrections (Alex): the pack files only START together, like playing them in vMix
function removeInput(inp){if(V.lock)return;if(inp.stream)inp.stream.getTracks().forEach(t=>t.stop());if(inp.type==='video'){inp.el.pause();}
  V.inputs=V.inputs.filter(x=>x!==inp);V.ov.forEach(o=>{if(o.inp===inp){o.inp=null;o.a=o.target=0;}});if(V.pv===inp)V.pv=null;if(V.pgm===inp)V.pgm=null;renumber();draw();}

/* ---------- WebGL compositor ---------- */
const gc=mkCanvas();const gl=gc.getContext('webgl',{premultipliedAlpha:true,alpha:true,preserveDrawingBuffer:true});
const VS=`attribute vec2 p;uniform vec4 r;uniform vec4 cr;varying vec2 uv;void main(){uv=vec2(mix(cr.x,cr.z,p.x),mix(cr.y,cr.w,p.y));vec2 q=r.xy+p*r.zw;gl_Position=vec4(q.x*2.-1.,1.-q.y*2.,0.,1.);}`;
const FS=`precision mediump float;varying vec2 uv;uniform sampler2D t;uniform float op;uniform float key;uniform vec3 kc;uniform vec3 tol;uniform float chroma;uniform float filt;uniform float keyOnly;
uniform vec4 ca;uniform vec3 cs;uniform vec3 lift;uniform vec3 gam;uniform vec3 gain;uniform vec2 hs;
vec2 cbcr(vec3 c){return vec2(-.169*c.r-.331*c.g+.5*c.b,.5*c.r-.419*c.g-.081*c.b);}
void main(){vec4 c=texture2D(t,uv);float a=c.a;vec3 rgb=a>0.?c.rgb/a:c.rgb;
 if(key>.5){vec3 d=abs(rgb-kc)/max(tol,vec3(.002));float m=max(d.r,max(d.g,d.b));float ak=smoothstep(1.,1.35,m);
  if(chroma>0.){float dc=distance(cbcr(rgb),cbcr(kc));float th=mix(.02,.32,chroma);ak=min(max(ak,0.),smoothstep(th,th+.07,dc))+ (1.-step(.001,chroma))*ak;}
  a*=ak;if(filt>0.){int dom=kc.g>=kc.r&&kc.g>=kc.b?1:(kc.b>=kc.r?2:0);if(dom==1)rgb.g=mix(rgb.g,min(rgb.g,max(rgb.r,rgb.b)),filt);else if(dom==2)rgb.b=mix(rgb.b,min(rgb.b,max(rgb.r,rgb.g)),filt);}}
 rgb*=ca.rgb;rgb=clamp((rgb-cs.x)/max(.05,1.-cs.x-cs.y),0.,1.);
 rgb=(gain+1.)*(rgb+lift*(1.-rgb));rgb=pow(max(rgb,0.),1./max(vec3(.05),gam+1.));
 float y=dot(rgb,vec3(.299,.587,.114));vec3 iq=vec3(dot(rgb,vec3(.596,-.274,-.322)),dot(rgb,vec3(.211,-.523,.312)),0.);float ch=cos(hs.x),sn=sin(hs.x);
 vec2 r2=vec2(iq.x*ch-iq.y*sn,iq.x*sn+iq.y*ch)*hs.y*cs.z;rgb=clamp(vec3(y+.956*r2.x+.621*r2.y,y-.272*r2.x-.647*r2.y,y-1.106*r2.x+1.703*r2.y),0.,1.);
 a*=ca.a*op;if(keyOnly>.5){gl_FragColor=vec4(vec3(a),1.);return;}gl_FragColor=vec4(rgb*a,a);}`;
function sh(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))console.error(gl.getShaderInfoLog(s));return s;}
const prog=gl.createProgram();gl.attachShader(prog,sh(gl.VERTEX_SHADER,VS));gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(prog);gl.useProgram(prog);
const U=n=>gl.getUniformLocation(prog,n);const u={r:U('r'),cr:U('cr'),t:U('t'),op:U('op'),key:U('key'),kc:U('kc'),tol:U('tol'),chroma:U('chroma'),filt:U('filt'),keyOnly:U('keyOnly'),ca:U('ca'),cs:U('cs'),lift:U('lift'),gam:U('gam'),gain:U('gain'),hs:U('hs')};
const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,1,0,0,1,1,1]),gl.STATIC_DRAW);
const pl=gl.getAttribLocation(prog,'p');gl.enableVertexAttribArray(pl);gl.vertexAttribPointer(pl,2,gl.FLOAT,false,0,0);
gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
function tex(inp){if(!inp.tex){inp.tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,inp.tex);['TEXTURE_WRAP_S','TEXTURE_WRAP_T'].forEach(k=>gl.texParameteri(gl.TEXTURE_2D,gl[k],gl.CLAMP_TO_EDGE));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);inp.dirty=true;}
  gl.bindTexture(gl.TEXTURE_2D,inp.tex);const el=inp.el,live=inp.type==='video'||inp.type==='camera';
  if((live&&el.readyState>=2)||inp.dirty){try{gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,el);inp.dirty=false;inp.ready=true;}catch(e){}}return inp.ready;}
/* one layer: input + geometry (x,y,w,h in 0..1 of the frame) + opacity */
function layer(inp,o={}){if(!inp||!tex(inp))return;const p=o.pos||inp.pos,z=p.zoom*(o.s??1);let w=z,h=z,x=(1-w)/2+p.px/2+(o.dx||0),y=(1-h)/2+p.py/2+(o.dy||0);
  gl.uniform4f(u.r,x+p.cx1*w,y+p.cy1*h,w*(p.cx2-p.cx1),h*(p.cy2-p.cy1));gl.uniform4f(u.cr,p.cx1,p.cy1,p.cx2,p.cy2);
  const k=inp.key;gl.uniform1f(u.key,k.on?1:0);gl.uniform3fv(u.kc,k.col);gl.uniform3fv(u.tol,k.tol);gl.uniform1f(u.chroma,k.chroma);gl.uniform1f(u.filt,k.filter?k.filt:0);
  const A=inp.ca,C=inp.cc;gl.uniform4f(u.ca,A.r,A.g,A.b,A.alpha);gl.uniform3f(u.cs,A.bs,A.ws,A.sat);gl.uniform3fv(u.lift,C.lift);gl.uniform3fv(u.gam,C.gamma);gl.uniform3fv(u.gain,C.gain);gl.uniform2f(u.hs,C.hue*Math.PI/180,C.sat);
  gl.uniform1f(u.op,o.op??1);gl.uniform1f(u.keyOnly,o.keyOnly?1:0);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  if((o.depth||0)<2)(inp.layers||[]).forEach(L=>{const li=L.on&&byId(L.id);if(li&&li!==inp)layer(li,{op:o.op,dx:o.dx,dy:o.dy,keyOnly:o.keyOnly,depth:(o.depth||0)+1,pos:{zoom:L.zoom*(o.s??1),px:L.px,py:L.py,cx1:0,cx2:1,cy1:0,cy2:1}});});}
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
      default:if(/^Stinger \d$/.test(fx)){const st=V.stingers[+fx.slice(8)-1],t=p*st.dur;layer(t<st.cut?a:b,{keyOnly});   // the cut happens behind the animation
          if(st.inp){stingerFrame(st.inp,t);layer(st.inp,{keyOnly});}}else{layer(a,{keyOnly});layer(b,{op:e,keyOnly});}}}
  else layer(a,{keyOnly});
  (ovs||[]).forEach((o,n)=>{if(!o.inp||o.a<=0)return;const S=V.ovset[n],a=o.a,pos=S.type==='Picture In Picture'?{zoom:S.zoom,px:S.px,py:S.py,cx1:0,cx2:1,cy1:0,cy2:1}:null,
      g={Fade:{op:a},Cut:{op:1},Zoom:{s:Math.max(.01,a)},Fly:{dy:1-a},Slide:{dx:a-1}}[S.fx]||{op:a};
    if(o.inp.type==='title'){o.inp.anim=a;drawTitle(o.inp);layer(o.inp,{pos,keyOnly});}else layer(o.inp,{...g,pos,keyOnly});});
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
function doTrans(fx,ms){if(!V.pv||V.T)return;const sn=/^Stinger (\d)$/.exec(fx);if(sn){const st=V.stingers[+sn[1]-1];if(!st.inp)return alertBox(fx,'No Stinger Input set: Overlay Settings › Number › '+fx+'.');ms=st.dur;stingerStart(st.inp);}
  V.T={fx,ms,t0:performance.now(),a:V.pgm,b:V.pv};playOnTransition(V.pv);}
/* Stinger inputs: built-in animated wipe (with alpha), a video with alpha (WebM) or a PNG image sequence */
function stingerStart(inp){if(inp.sv){inp.sv.currentTime=0;inp.sv.play().catch(()=>{});}inp.t0=performance.now();}
function stingerFrame(inp,t){const g=inp.el.getContext('2d');g.clearRect(0,0,W,H);
  if(inp.sv){if(inp.sv.readyState>=2)g.drawImage(inp.sv,0,0,W,H);}
  else if(inp.frames){const f=inp.frames[Math.min(inp.frames.length-1,Math.floor(t/40))];if(f&&f.complete)g.drawImage(f,0,0,W,H);}
  else{const d=1200,k=Math.min(1,t/d),cols=['#0b3d91','#1e88e5','#FF8C00','#ffffff'];   // built-in: four bands sweep in, cover the frame at ~50 %, sweep out
    cols.forEach((c,i)=>{const s=Math.min(1,Math.max(0,(k-i*.05)/.4)),o=Math.min(1,Math.max(0,(k-.55-i*.05)/.3)),x0=(-1.3+s*1.3+o*1.45)*W+i*30;g.fillStyle=c;g.save();g.translate(x0,0);g.transform(1,0,-.35,1,0,0);g.fillRect(0,0,W*1.2,H);g.restore();});
    if(k>.28&&k<.72){g.fillStyle='#fff';g.font='800 64px Segoe UI, sans-serif';g.textAlign='center';g.textBaseline='middle';g.globalAlpha=1-Math.abs(k-.5)/.22;g.fillText('TV STUDIO',W/2,H/2);g.globalAlpha=1;}}
  inp.dirty=true;}
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
  if(a==='rec')return toggleRec();if(a==='recset')return recDialog();
  if(a==='stream')return toggleStream();if(a==='strset')return streamDialog(false);
  if(a==='ext'){V.ext=!V.ext;if(V.ext)openExtWin();else if(V.extWin&&!V.extWin.closed)V.extWin.close();return draw();}if(a==='extset')return extDialog();
  if(a==='multiview')return openMvWin('MultiView');if(a==='fullscreen')return fullscreenMenu(b);if(a==='snap')return snapshot();
  if(a==='overlay')return overlayDialog();if(a==='settings')return outputsDialog();
  if(a==='save')return savePreset(false);if(a==='saveas')return savePreset(true);if(a==='open')return openPreset();
  if(a==='last'){let d=null;try{d=JSON.parse(localStorage.getItem('vx-last'));}catch(_){}return d?loadPreset(d):alertBox('Last','No preset saved yet on this computer.');}
  if(a==='new')return confirmBox('New preset','Close every input and start an empty production?',()=>{clearAll();V.preset=null;draw();});
  if(a==='multicorder'||a==='mcset')return alertBox('MultiCorder','MultiCorder is not available in the HD edition (4K / Pro / Max only).');
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
  $('[data-a="rec"]',root).classList.toggle('live',V.rec);$('[data-a="stream"]',root).classList.toggle('live',!!V.stream);$('[data-a="stream"]',root).textContent=V.stream==='connecting'?'Connecting…':'Stream ▴';$('[data-a="ftb"]',root).dataset.tip='Fade To Black: fades Record, Stream, External and Fullscreen to black. The Output viewer stays visible so you can prepare the next shot.';$('[data-a="ext"]',root).classList.toggle('live',V.ext);
  $('[data-a="lock"]',root).classList.toggle('lock',V.lock);$('[data-a="basic"]',root).textContent=V.basic?'Advanced':'Basic';
  $('[data-a="multicorder"]',root).dataset.tip='MultiCorder is not available in the HD edition (4K / Pro / Max only).';
  applyAudio();}

/* ---------- main loop ---------- */
let last=performance.now(),acc=0,frames=0;
function loop(now){requestAnimationFrame(loop);if(!root.classList.contains('on'))return;const t0=performance.now();
  packSync();V.inputs.forEach(x=>{if(x.type==='vset')renderVset(x);});
  if(V.T&&!V.T.manual){const p=Math.min(1,(now-V.T.t0)/V.T.ms);V.T.p=p;if(p>=1)finishTrans();}
  V.ov.forEach((o,n)=>{const S=V.ovset[n],sp=S.fx==='Cut'||!S.ms?1:Math.min(1,(now-(V.lastNow||now)+1)/S.ms);o.a+=Math.sign(o.target-o.a)*Math.min(Math.abs(o.target-o.a),sp);
    if(o.target>0&&o.a>=1&&S.dur>0){o.t1=o.t1||now;if(now-o.t1>S.dur){o.target=0;o.t1=0;draw();}}else if(o.target===0)o.t1=0;});V.lastNow=now;   // effect duration + auto close (Duration)
  const T=V.T;const cpg=$('.vx-cpg',root),cpv=$('.vx-cpv',root);
  scene(cpg,{a:T?T.a:V.pgm,b:T?T.b:null,p:T?T.p||0:0,fx:T?T.fx:null,ovs:V.ov});
  scene(cpv,{a:V.pv,ovs:V.ov.map(o=>o.pend?{inp:o.pend,a:1}:{inp:null,a:0})});
  renderOut(cpg);
  if(V.ext&&V.extWin&&!V.extWin.closed)renderExternal();
  if(V.mvWin&&!V.mvWin.closed)renderMultiview();
  if(V.fsWin&&!V.fsWin.closed){if(V.fsSrc==='MultiView'){V.mvWin=V.fsWin;}else renderFullscreen();}
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
function transMenu(i,b){const t=V.trans[i];const p=pop(`<div class="vx-ph">Transition ${i+1}${i===0?' · also used by the T-Bar':''}</div>${[...FX,'Stinger 1','Stinger 2'].map(f=>`<button class="${t.fx===f?'on':''}" data-fx="${f}">${f}</button>`).join('')}<div class="vx-pdur">Duration <input type="number" min="0" max="10000" step="100" value="${t.ms}"> ms</div>`,b);
  $$('[data-fx]',p).forEach(x=>x.onclick=()=>{t.fx=x.dataset.fx;p.classList.remove('on');draw();});$('input',p).onchange=e=>{t.ms=Math.max(0,+e.target.value||0);};}
function modal(title,body,{w=560,ok='OK',onOk,cancel=true}={}){const m=$('#vx-modal');m.innerHTML=`<div class="vx-win" style="width:min(${w}px,96vw)"><div class="vx-wt">${title}<button data-x>✕</button></div><div class="vx-wb">${body}</div><div class="vx-wf">${cancel?'<button data-x>Cancel</button>':''}${ok?`<button class="vx-ok">${ok}</button>`:''}</div></div>`;
  m.classList.add('on');$$('[data-x]',m).forEach(b=>b.onclick=closeModal);if(ok)$('.vx-ok',m).onclick=()=>{if(onOk&&onOk(m)===false)return;closeModal();};return m;}
function closeModal(){$('#vx-modal').classList.remove('on');$('#vx-modal').innerHTML='';V.editing=null;}
function alertBox(t,msg){modal(t,`<p>${msg}</p>`,{w:420,cancel:false});}
function confirmBox(t,msg,fn){modal(t,`<p>${msg}</p>`,{w:380,onOk:()=>{fn();}});}
function bigPreview(inp){const m=modal('Input '+inp.num+' — '+inp.name,`<canvas class="vx-big" width="${W}" height="${H}"></canvas><p class="vx-hint">Click the image to close.</p>`,{w:820,ok:null,cancel:false});
  const c=$('.vx-big',m);c.onclick=closeModal;const tick=()=>{if(!m.classList.contains('on')||!m.contains(c))return;scene(c,{a:inp});requestAnimationFrame(tick);};tick();}
function ctxMenu(inp,e){const items=inp.type==='vset'?[...inp.vs.zooms.map((z,i)=>['Camera: '+z.name,()=>vsShot(inp,i)]),['Input Settings (Setup)',()=>inputSettings(inp)]]:inp.type==='title'?[['Title Editor',()=>titleEditor(inp)],['TransitionIn',()=>toggleOverlay(0,inp)],['TransitionOut',()=>{V.ov.forEach(o=>{if(o.inp===inp)o.target=0;});draw();}]]
    :inp.type==='video'?[['Restart',()=>{inp.el.currentTime=0;}],['Play / Pause',()=>{inp.el.paused?inp.el.play():inp.el.pause();}]]:[['Input Settings',()=>inputSettings(inp)]];
  const p=pop(items.map((x,i)=>`<button data-i="${i}">${x[0]}</button>`).join(''),{getBoundingClientRect:()=>({left:e.clientX,bottom:e.clientY})});$$('[data-i]',p).forEach(b=>b.onclick=()=>{p.classList.remove('on');items[+b.dataset.i][1]();draw();});}

/* Add Input — the real list of types; the ones not simulated are disabled */
const TYPES=[['Video',1],['DVD',0],['List',0],['Camera',1],['NDI / Desktop Capture',0],['Stream / SRT',0],['Instant Replay',0,'Not available in the HD edition.'],['Image Sequence / Stinger',1],['Video Delay',0],['Image',1],['Photos',0],['PowerPoint',0],['Colour',1],['Audio',0],['Audio Input',0],['Title / XAML',1],['Flash / RTMP',0],['Virtual Set',1],['Web Browser',0],['Video Call',0]];
function addInputDialog(){const m=modal('Input Select',`<div class="vx-is"><div class="vx-isl">${TYPES.map(([n,ok,why],i)=>`<button data-t="${i}" ${ok?'':'class="na"'} title="${ok?'':(why||'Not simulated yet')}">${n}</button>`).join('')}</div><div class="vx-isr"><div class="vx-ish"></div><div class="vx-isp"></div></div></div>`,{w:860,onOk:()=>V.addOk&&V.addOk()});
  const sel=i=>{const [n,ok,why]=TYPES[i];$$('.vx-isl button',m).forEach(b=>b.classList.toggle('on',+b.dataset.t===i));const ph=$('.vx-isp',m),hd=$('.vx-ish',m);V.addOk=null;
    if(!ok){hd.textContent=n;ph.innerHTML=`<p class="vx-hint">${why||'This input type is not simulated yet.'}</p>`;return;}
    if(n==='Image Sequence / Stinger'){hd.textContent='Stinger — an animation with transparency';ph.innerHTML=`<div class="vx-vsl"><label><input type="radio" name="st" value="builtin" checked> <b>Built-in stinger</b> (animated wipe, 1.2 s, covers the screen at 0.6 s)</label>
        <label><input type="radio" name="st" value="file"> Browse… a video with alpha (WebM VP8/VP9) or a PNG image sequence (select all the frames) <input type="file" class="vx-stf" accept="video/webm,video/*,image/png" multiple hidden></label><div class="vx-files"></div></div>
        <p class="vx-hint">Then: <b>Overlay</b> (bottom bar) › Number › <b>Stinger 1</b> › Stinger Input, and choose Stinger 1 in the ▾ menu of a transition button.</p>`;
      let fl=null;const fi=$('.vx-stf',ph);$$('input[name=st]',ph).forEach(r=>r.onchange=()=>{if(r.value==='file')fi.click();});fi.onchange=()=>{fl=[...fi.files];$('.vx-files',ph).textContent=fl.length+' file(s)';};
      V.addOk=()=>{let inp;if($('input[name=st]:checked',ph).value==='builtin'||!fl||!fl.length)inp=addInput({type:'stinger',name:'Stinger (built-in)',el:mkCanvas()});
        else if(fl[0].type.startsWith('video')){const v=document.createElement('video');v.src=URL.createObjectURL(fl[0]);v.muted=true;v.playsInline=true;inp=addInput({type:'stinger',name:fl[0].name.replace(/\.[^.]+$/,''),el:mkCanvas(),sv:v,file:fl[0].name});v.onloadedmetadata=()=>{const st=V.stingers.find(x=>x.inp===inp);if(st){st.dur=Math.round(v.duration*1000);st.cut=Math.round(st.dur/2);}};}
        else{const fr=fl.sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true})).map(f=>{const im=new Image();im.src=URL.createObjectURL(f);return im;});inp=addInput({type:'stinger',name:'Image Sequence',el:mkCanvas(),frames:fr});}
        stingerFrame(inp,600);const free=V.stingers.find(x=>!x.inp);if(free){free.inp=inp;if(inp.frames){free.dur=inp.frames.length*40;free.cut=Math.round(free.dur/2);}}};return;}
    if(n==='Virtual Set'){hd.textContent='Virtual Set — choose a set';ph.innerHTML=`<div class="vx-vsl"><label><input type="radio" name="vs" value="demo" checked> <b>Demo Studio</b> — example exported by SetFrameR (2 screens + presenter)</label>
        <label><input type="radio" name="vs" value="browse"> Browse… a set folder (exported by <b>SetFrameR</b> or any vMix virtual set: config.xml + PNG files) <input type="file" class="vx-vsdir" webkitdirectory multiple hidden></label><div class="vx-files"></div></div>
        <p class="vx-hint">Then, in the input's settings: <b>Setup</b> = which input goes in each layer (the presenter camera needs its <b>Chroma Key</b> on) and <b>Camera</b> = the shots (Full, Medium, Close Up) with speed F / M / S / C.</p>`;
      let files=null;const dir=$('.vx-vsdir',ph);$$('input[name=vs]',ph).forEach(r=>r.onchange=()=>{if(r.value==='browse')dir.click();});
      dir.onchange=()=>{files=[...dir.files];const c=files.find(f=>f.name==='config.xml');$('.vx-files',ph).textContent=c?(c.webkitRelativePath.split('/')[0]+' — '+files.length+' files'):'No config.xml in that folder';};
      V.addOk=async()=>{try{if($('input[name=vs]:checked',ph).value==='demo'){await loadVset('Demo Studio',f=>fetch('vsets/DemoStudio/'+f).then(r=>{if(!r.ok)throw Error(f);return r.blob();})).then(x=>x.vsrc='demo');}
          else{if(!files)return;const by=Object.fromEntries(files.map(f=>[f.name,f]));if(!by['config.xml'])return alertBox('Virtual Set','That folder has no config.xml.');
            await loadVset(files[0].webkitRelativePath.split('/')[0]||'Virtual Set',f=>{if(!by[f])throw Error('Missing '+f);return Promise.resolve(by[f]);});}}catch(e){alertBox('Virtual Set','Could not load the set: '+(e.message||e));}};return;}
    if(n==='Video'){hd.textContent='Select the Video file(s) to open.';ph.innerHTML=`<label class="vx-browse">Browse… <input type="file" accept="video/*" multiple hidden></label><div class="vx-files"></div>
        <div class="vx-packbox"><b>Multicam pack (8 cameras, already in sync)</b><br><a href="https://apps.cinemafilmak.com/tvstudio/tvstudio-multicam-pack.zip">Download pack</a> (107 MB) · unzip it · then <b>Browse…</b> and select CAM1.mp4 … CAM8.mp4 together. They start together and loop together.</div>`;
      let files=[];$('input',ph).onchange=e=>{files=[...e.target.files];$('.vx-files',ph).textContent=files.map(f=>f.name).join(' · ');};
      V.addOk=()=>{if(!files.length)return;const isPack=files.every(f=>/^CAM\d\.mp4$/i.test(f.name));files.sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true})).forEach(f=>{const x=videoInput(f,isPack?f.name.replace(/\.mp4$/i,'').replace('CAM','Camera '):null);if(isPack){x.pack=true;x.el.loop=true;}});
        if(isPack){PACK.t0=performance.now();V.inputs.filter(x=>x.pack).forEach(x=>{x.el.currentTime=0;x.el.play().catch(()=>{});});}};}
    else if(n==='Image'){hd.textContent='Select the Image file to open (PNG with transparency supported).';ph.innerHTML=`<label class="vx-browse">Browse… <input type="file" accept="image/*" hidden></label><div class="vx-files"></div>`;
      let f=null;$('input',ph).onchange=e=>{f=e.target.files[0];$('.vx-files',ph).textContent=f?f.name:'';};V.addOk=()=>f&&imageInput(f);}
    else if(n==='Colour'){hd.textContent='Select a colour.';ph.innerHTML=`<label>Colour <input type="color" value="#0b3d91"></label><label><input type="radio" name="ck" value="c" checked> Colour</label><label><input type="radio" name="ck" value="bars"> Colour Bars</label><label><input type="radio" name="ck" value="blank"> Blank (transparent)</label>`;
      V.addOk=()=>{const k=$('input[name=ck]:checked',ph).value;k==='bars'?barsInput():k==='blank'?colourInput('Blank','rgba(0,0,0,0)'):colourInput('Colour',$('input[type=color]',ph).value);};}
    else if(n==='Camera'){hd.textContent='Select the Camera (capture device).';ph.innerHTML=`<label>Camera <select class="vx-dev"><option value="">Default camera</option></select></label><p class="vx-hint">Your webcam (or a capture card) works as a camera input. The browser asks for permission.</p>`;
      navigator.mediaDevices?.enumerateDevices().then(ds=>{ds.filter(d=>d.kind==='videoinput').forEach(d=>{const o=document.createElement('option');o.value=d.deviceId;o.textContent=d.label||'Camera';$('.vx-dev',ph).appendChild(o);});});
      V.addOk=()=>{const s=$('.vx-dev',ph);cameraInput(s.value,s.value?s.selectedOptions[0].textContent:null);};}
    else if(n==='Title / XAML'){hd.textContent='Select a title template.';ph.innerHTML=`<div class="vx-gal">${Object.entries(TITLES).map(([k,t])=>`<button data-tpl="${k}"><span class="vx-gt">GT</span>${t.n}</button>`).join('')}</div>`;
      let tp='classic';$$('[data-tpl]',ph).forEach(b=>b.onclick=()=>{tp=b.dataset.tpl;$$('[data-tpl]',ph).forEach(x=>x.classList.toggle('on',x===b));});$('[data-tpl]',ph).classList.add('on');V.addOk=()=>titleInput(tp);}};
  $$('.vx-isl button',m).forEach(b=>b.onclick=()=>sel(+b.dataset.t));sel(0);}

/* Input Settings — General · Colour Key / Chroma Key · Position (the others listed, not simulated) */
function inputSettings(inp){const k=inp.key,p=inp.pos,hex=c=>'#'+c.map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('');
  const tabs=['General','Colour Adjust','Colour Key / Chroma Key','Colour Correction','Effects','Position','Layers / MultiView','Triggers','Tally Lights','PTZ','Advanced','Copy From'];
  const m=modal('Input: '+inp.name,`<div class="vx-iset"><div class="vx-isl">${tabs.map((t,i)=>`<button data-tab="${i}" class="${[0,1,2,3,5,6].includes(i)?'':'na'}">${t}</button>`).join('')}</div><div class="vx-isr"><div class="vx-isp"></div><canvas class="vx-isprev" width="${W}" height="${H}"></canvas><p class="vx-hint vx-pick"></p></div></div>`,{w:880,ok:'OK',cancel:false});
  const ph=$('.vx-isp',m),pv=$('.vx-isprev',m);V.editing=inp;
  const sl=(lbl,val,min,max,step,fn,cls='')=>{const id='s'+Math.random().toString(36).slice(2);setTimeout(()=>{const r=$('#'+id,m);if(r)r.oninput=()=>{fn(+r.value);};},0);return `<label class="vx-sl ${cls}">${lbl}<input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${val}"></label>`;};
  const show=i=>{$$('[data-tab]',m).forEach(b=>b.classList.toggle('on',+b.dataset.tab===i));$('.vx-pick',m).textContent='';
    if(i===0){ph.innerHTML=`<label>Name <input class="vx-name" value="${inp.name}"></label><label>Category <select class="vx-catsel">${CAT.map((c,j)=>`<option value="${j}" ${inp.cat===j?'selected':''}>${j?(V.catLabels?.[j]||c.n):'None'}</option>`).join('')}</select></label>
        <label>GO Action <select disabled><option>QuickPlay</option></select></label><label><input type="checkbox" class="vx-afvc" ${inp.afv?'checked':''}> Automatically mix audio</label>
        ${['video','image','missing'].includes(inp.type)?`<label>Source <span>${inp.file||'—'}</span> <button class="vx-chg">Change…</button></label>`:''}`;
      $('.vx-chg',ph)?.addEventListener('click',()=>changeSource(inp,()=>show(0)));
      if(inp.type==='vset'){const S=inp.vs,opts=id=>`<option value="">(blank)</option>`+V.inputs.filter(x=>x!==inp&&x.type!=='vset').map(x=>`<option value="${x.id}" ${x.id===id?'selected':''}>${x.num} ${x.name}${x.key.on?' (keyed)':''}</option>`).join('');
        ph.insertAdjacentHTML('beforeend',`<div class="vx-vs"><div class="vx-vst">Camera</div><div class="vx-shots">${S.zooms.map((z,i)=>`<button data-shot="${i}" class="${S.shot===i?'on':''}">${z.name}</button>`).join('')}</div>
          <div class="vx-speed">${['F','M','S','C'].map(k=>`<button data-sp="${k}" class="${S.speed===k?'on':''}" title="${{F:'Fast',M:'Medium',S:'Slow',C:'Cut'}[k]}">${k}</button>`).join('')}<span>${S.speed==='C'?'cut':'00:0'+VS_SPEED[S.speed]/1000}</span></div>
          <div class="vx-vst">Setup</div>${S.layers.filter(L=>L.dynamic).map(L=>`<label>${L.name} <select data-ly="${L.name}">${opts(L.input)}</select></label>`).join('')}
          <p class="vx-hint">Talent = the presenter camera with its <b>Chroma Key</b> on (Colour Key tab). Screens = any input (a video, a title, another camera…).</p></div>`);
        $$('[data-shot]',ph).forEach(b=>b.onclick=()=>{vsShot(inp,+b.dataset.shot);show(0);});$$('[data-sp]',ph).forEach(b=>b.onclick=()=>{S.speed=b.dataset.sp;show(0);});
        $$('[data-ly]',ph).forEach(sel=>sel.onchange=()=>{S.layers.find(L=>L.name===sel.dataset.ly).input=+sel.value||null;});}
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
    else if(i===1){const A=inp.ca;ph.innerHTML=`<div class="vx-kbox"><div>${sl('Black Stretch',A.bs,0,.4,.005,v=>A.bs=v)}${sl('White Stretch',A.ws,0,.4,.005,v=>A.ws=v)}${sl('Saturation',A.sat,0,2,.01,v=>A.sat=v)}${sl('Alpha',A.alpha,0,1,.01,v=>A.alpha=v)}</div>
        <div>${sl('<span style="color:#e53935">Red</span>',A.r,0,2,.01,v=>A.r=v)}${sl('<span style="color:#43a047">Green</span>',A.g,0,2,.01,v=>A.g=v)}${sl('<span style="color:#1e88e5">Blue</span>',A.b,0,2,.01,v=>A.b=v)}<button data-ca="reset">Reset</button></div></div>`;
      $('[data-ca]',ph).onclick=()=>{Object.assign(A,{bs:0,ws:0,r:1,g:1,b:1,alpha:1,sat:1});show(1);};}
    else if(i===3){const C=inp.cc;C.w=C.w||{lift:[0,0,0],gamma:[0,0,0],gain:[0,0,0]};
      ph.innerHTML=`<div class="vx-ccw">${['lift','gamma','gain'].map(k=>`<div class="vx-wheel"><b>${k[0].toUpperCase()+k.slice(1)}</b><div class="vx-wd" data-w="${k}"><span></span></div>${sl('',C.w[k][2],-1,1,.01,v=>{C.w[k][2]=v;applyW(k);},'vx-wl')}</div>`).join('')}</div>
        <div class="vx-kbox"><div>${sl('Hue',C.hue,-180,180,1,v=>C.hue=v)}</div><div>${sl('Saturation',C.sat,0,2,.01,v=>C.sat=v)}</div></div><button data-cc="reset">Reset</button>
        <p class="vx-hint">Lift = shadows · Gamma = mid-tones · Gain = highlights. Drag the dot towards a colour to tint, the slider under each wheel for brightness.</p>`;
      const K={lift:.25,gamma:.6,gain:.6};
      const applyW=k=>{const [x,y,l]=C.w[k],d=Math.min(1,Math.hypot(x,y)),t=Math.atan2(-y,x);C[k]=[0,-2*Math.PI/3,2*Math.PI/3].map(o=>(Math.cos(t+o)*d+l)*K[k]);};
      $$('.vx-wd',ph).forEach(el=>{const k=el.dataset.w,dot=el.firstChild,place=()=>{dot.style.left=(50+C.w[k][0]*45)+'%';dot.style.top=(50+C.w[k][1]*45)+'%';};place();
        el.onpointerdown=e=>{const mv=ev=>{const r=el.getBoundingClientRect();let x=((ev.clientX-r.left)/r.width-.5)/.45,y=((ev.clientY-r.top)/r.height-.5)/.45;const d=Math.hypot(x,y);if(d>1){x/=d;y/=d;}C.w[k][0]=x;C.w[k][1]=y;applyW(k);place();};
          mv(e);const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);};addEventListener('pointermove',mv);addEventListener('pointerup',up);};
        el.ondblclick=()=>{C.w[k]=[0,0,C.w[k][2]];applyW(k);place();};});
      $('[data-cc]',ph).onclick=()=>{Object.assign(C,{lift:[0,0,0],gamma:[0,0,0],gain:[0,0,0],hue:0,sat:1,w:{lift:[0,0,0],gamma:[0,0,0],gain:[0,0,0]}});show(3);};}
    else if(i===6){const L=inp.layers,opts=id=>`<option value="">(none)</option>`+V.inputs.filter(x=>x!==inp).map(x=>`<option value="${x.id}" ${x.id===id?'selected':''}>${x.num} ${x.name}</option>`).join('');
      while(L.length<4)L.push({on:false,id:null,zoom:.33,px:[-.6,.6,-.6,.6][L.length],py:[-.6,-.6,.6,.6][L.length]});
      ph.innerHTML=`<p class="vx-hint">Up to 10 layers in vMix (4 here): each one shows another input on top of this one — e.g. two cameras side by side for an interview, or a picture-in-picture.</p><div class="vx-lays">${L.map((l,j)=>`<div class="vx-lay" data-l="${j}"><label><input type="checkbox" class="ly-on" ${l.on?'checked':''}> Layer ${j+1}</label><select class="ly-in">${opts(l.id)}</select>
        ${sl('Zoom',l.zoom,.05,1,.01,v=>l.zoom=v)}${sl('Pan X',l.px,-2,2,.01,v=>l.px=v)}${sl('Pan Y',l.py,-2,2,.01,v=>l.py=v)}</div>`).join('')}</div>`;
      $$('.vx-lay',ph).forEach(d=>{const l=L[+d.dataset.l];$('.ly-on',d).onchange=e=>{l.on=e.target.checked;};$('.ly-in',d).onchange=e=>{l.id=+e.target.value||null;if(l.id)l.on=true;show(6);};});}
    else ph.innerHTML=`<p class="vx-hint">${tabs[i]} — not simulated yet.</p>`;};
  $$('[data-tab]',m).forEach(b=>b.onclick=()=>show(+b.dataset.tab));show(inp.key.on?2:0);
  pv.onclick=e=>{if(!V.picking||!inp.el)return;const r=pv.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;const c=mkCanvas(W,H),g=c.getContext('2d');try{g.drawImage(inp.el,0,0,W,H);const d=g.getImageData(Math.floor(x*W),Math.floor(y*H),1,1).data;k.col=[d[0]/255,d[1]/255,d[2]/255];k.on=true;}catch(_){}V.picking=false;show(2);};
  const chk=mkCanvas(W,H),cg=chk.getContext('2d');for(let y=0;y<H;y+=24)for(let x=0;x<W;x+=24){cg.fillStyle=((x+y)/24)%2?'#555':'#777';cg.fillRect(x,y,24,24);}
  const tick=()=>{if(!m.classList.contains('on')||!m.contains(pv))return;scene(pv,{a:inp,transparent:true});const g=pv.getContext('2d');g.globalCompositeOperation='destination-over';g.drawImage(chk,0,0);g.globalCompositeOperation='source-over';requestAnimationFrame(tick);};tick();}
/* Overlay Settings: Number, Type (Fullscreen / Picture In Picture with pan and zoom), Effect, Effect Duration, Duration */
function overlayDialog(n=0){if(n>=8)return stingerDialog(n-8);const S=V.ovset[n],FXO=['Cut','Fade','Zoom','Fly','Slide'];
  const m=modal('Overlay Settings',`<div class="vx-ovs"><label>Number <select class="ov-n">${V.ovset.map((_,i)=>`<option value="${i}" ${i===n?'selected':''}>Overlay ${i+1}</option>`).join('')}<option value="8">Stinger 1</option><option value="9">Stinger 2</option></select></label>
    <label>Type <select class="ov-t">${['Fullscreen','Picture In Picture'].map(t=>`<option ${S.type===t?'selected':''}>${t}</option>`).join('')}</select></label>
    <label>Effect <select class="ov-fx">${FXO.map(t=>`<option ${S.fx===t?'selected':''}>${t}</option>`).join('')}</select></label>
    <label>Effect Duration (ms) <input type="number" class="ov-ms" min="0" max="5000" step="100" value="${S.ms}"></label>
    <label>Duration (ms, 0 = stays until you turn it off) <input type="number" class="ov-dur" min="0" max="600000" step="500" value="${S.dur}"></label>
    <div class="ov-pip" ${S.type==='Fullscreen'?'hidden':''}><div class="ov-frame"><div class="ov-box"></div></div>
      <label class="vx-sl">Zoom<input type="range" class="ov-z" min=".1" max="1" step=".01" value="${S.zoom}"></label><label class="vx-sl">Pan X<input type="range" class="ov-x" min="-1" max="1" step=".01" value="${S.px}"></label><label class="vx-sl">Pan Y<input type="range" class="ov-y" min="-1" max="1" step=".01" value="${S.py}"></label></div></div>
    <p class="vx-hint">Each overlay channel (1-8) has its own effect and, as Picture In Picture, its own size and position — e.g. Overlay 2 = a camera in the top-right corner.</p>`,{w:460,cancel:false});
  const box=$('.ov-box',m),upd=()=>{const w=S.zoom*100,x=(1-S.zoom)/2+S.px/2,y=(1-S.zoom)/2+S.py/2;box.style.cssText=`width:${w}%;height:${w}%;left:${x*100}%;top:${y*100}%`;};upd();
  $('.ov-n',m).onchange=e=>overlayDialog(+e.target.value);$('.ov-t',m).onchange=e=>{S.type=e.target.value;$('.ov-pip',m).hidden=S.type==='Fullscreen';};
  $('.ov-fx',m).onchange=e=>S.fx=e.target.value;$('.ov-ms',m).oninput=e=>S.ms=Math.max(0,+e.target.value||0);$('.ov-dur',m).oninput=e=>S.dur=Math.max(0,+e.target.value||0);
  [['ov-z','zoom'],['ov-x','px'],['ov-y','py']].forEach(([c,k])=>$('.'+c,m).oninput=e=>{S[k]=+e.target.value;upd();});}
function stingerDialog(k){const st=V.stingers[k],cands=V.inputs.filter(x=>x.type==='stinger'||x.type==='video');
  const m=modal('Overlay Settings',`<div class="vx-ovs"><label>Number <select class="ov-n">${V.ovset.map((_,i)=>`<option value="${i}">Overlay ${i+1}</option>`).join('')}${[0,1].map(i=>`<option value="${8+i}" ${i===k?'selected':''}>Stinger ${i+1}</option>`).join('')}</select></label>
    <label>Stinger Input <select class="st-in"><option value="">(none)</option>${cands.map(x=>`<option value="${x.id}" ${st.inp===x?'selected':''}>${x.num} ${x.name}</option>`).join('')}</select></label>
    <label>Effect <select disabled><option>Cut</option></select></label><label>Duration (ms) <input type="number" class="st-d" min="200" max="10000" step="100" value="${st.dur}"></label>
    <label>Stinger Cut Point (ms) <input type="number" class="st-c" min="0" max="10000" step="50" value="${st.cut}"></label></div>
    <p class="vx-hint">A stinger is an animation that covers the screen: at the <b>Cut Point</b> (when it hides everything) vMix cuts Preview to Output behind it. Add it with <i>Add Input › Image Sequence / Stinger</i>, set it here, then choose <b>Stinger ${k+1}</b> in the ▾ menu of a transition button.</p>`,{w:460,cancel:false});
  $('.ov-n',m).onchange=e=>overlayDialog(+e.target.value);$('.st-in',m).onchange=e=>{st.inp=byId(+e.target.value)||null;};$('.st-d',m).oninput=e=>{st.dur=Math.max(200,+e.target.value||1200);};$('.st-c',m).oninput=e=>{st.cut=Math.max(0,+e.target.value||0);};}
function titleEditor(inp){modal('Title Editor — '+inp.name,`<div class="vx-te">${Object.keys(inp.fields).map(k=>`<label>${k}<input data-f="${k}" value="${inp.fields[k]}"></label>`).join('')}<label class="vx-live"><input type="checkbox" checked disabled> Live (updates as you type)</label></div>`,{w:480,cancel:false});
  $$('[data-f]',$('#vx-modal')).forEach(i=>i.oninput=()=>{inp.fields[i.dataset.f]=i.value;drawTitle(inp);});}
function catDialog(){const L=V.catLabels||(V.catLabels=CAT.map(()=>''));modal('Input Categories',`<div class="vx-cd">${CAT.slice(1).map((c,i)=>`<label><span style="background:${c.c}"></span><input data-c="${i+1}" value="${L[i+1]}" placeholder="${c.n}"></label>`).join('')}</div><p class="vx-hint">Type a label for each category. Drag an input's thumbnail onto a category button to move it there.</p>`,{w:420,onOk:m=>{$$('[data-c]',m).forEach(x=>L[+x.dataset.c]=x.value.trim());draw();}});}

/* ---------- External (Fill + Key) and MultiView windows: second screens ---------- */
/* program feed (what Record / Stream / Fullscreen get): Output + FTB */
const outCv=mkCanvas();let ftbA=0;
function renderOut(src){const g=outCv.getContext('2d');g.drawImage(src,0,0,W,H);ftbA+=((V.ftb?1:0)-ftbA)*.12;if(ftbA>.002){g.fillStyle=`rgba(0,0,0,${ftbA})`;g.fillRect(0,0,W,H);}}
/* External output (DeckLink): SDI 1 = Fill, SDI 2 = Key (only with Alpha Channel Straight / Premultiplied) */
const EXT={device:'DeckLink Duo 2',port:'SDI',alpha:'None',fmt:'1080p25',src:'Output',on:false};
function extScene(c,keyOnly){const T=V.T,src=EXT.src;   // Settings › Outputs: what Output 1 (→ External) carries
  if(src==='Preview')return scene(c,{a:V.pv,ovs:V.ov.map(o=>o.pend?{inp:o.pend,a:1}:{inp:null,a:0}),keyOnly,transparent:!keyOnly});
  const m=/^Input (\d+)$/.exec(src);if(m)return scene(c,{a:V.inputs[+m[1]-1],keyOnly,transparent:!keyOnly});
  scene(c,{a:T?T.a:V.pgm,b:T?T.b:null,p:T?T.p||0:0,fx:T?T.fx:null,ovs:V.ov,keyOnly,transparent:!keyOnly});}
function drawFill(f){extScene(f,false);const g=f.getContext('2d');g.globalCompositeOperation='destination-over';g.fillStyle='#000';g.fillRect(0,0,f.width,f.height);g.globalCompositeOperation='source-over';
  if(ftbA>.002){g.fillStyle=`rgba(0,0,0,${ftbA})`;g.fillRect(0,0,f.width,f.height);}}
function drawKey(k){if(EXT.alpha!=='None'){gl.blendFunc(gl.ONE,gl.ONE);extScene(k,true);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);}else{const kg=k.getContext('2d');kg.fillStyle='#000';kg.fillRect(0,0,k.width,k.height);}}
function renderExternal(){const w=V.extWin,d=w.document;const f=d.getElementById('fill'),k=d.getElementById('key');if(!f)return;drawFill(f);drawKey(k);}
/* the DeckLink SDI outputs are cabled to the Videohub (IN 9 = fill, IN 10 = key): only while External is ON */
const hubF=mkCanvas(W/2,H/2),hubK=mkCanvas(W/2,H/2);window.VH_SOURCES=window.VH_SOURCES||{};
VH_SOURCES.vfill=(c,w,h)=>{if(!V.ext)return false;drawFill(hubF);c.drawImage(hubF,0,0,w,h);};
VH_SOURCES.vkey=(c,w,h)=>{if(!V.ext)return false;drawKey(hubK);c.drawImage(hubK,0,0,w,h);};
function openExtWin(){const w=window.open('','vx_external','width=980,height=330');if(!w)return alertBox('External','Allow pop-up windows for this site to see the external output.');V.extWin=w;
  w.document.title='External Output — '+EXT.device;w.document.body.style.cssText='margin:0;background:#0A0F14;color:#ddd;font:12px Segoe UI,Tahoma,sans-serif';
  w.document.body.innerHTML=`<div style="padding:6px 10px">${EXT.device} · ${EXT.fmt} · Alpha Channel: <b>${EXT.alpha}</b>${EXT.alpha==='None'?' — no key signal (set Straight or Premultiplied in External Output settings)':''}</div>
    <div style="display:flex;gap:10px;padding:0 10px 10px"><figure style="margin:0;flex:1"><canvas id="fill" width="${W/2}" height="${H/2}" style="width:100%;background:#000"></canvas><figcaption>SDI 1 (A) — <b>Fill</b> → ATEM input (fill)</figcaption></figure>
    <figure style="margin:0;flex:1"><canvas id="key" width="${W/2}" height="${H/2}" style="width:100%;background:#000"></canvas><figcaption>SDI 2 (B) — <b>Key</b> → ATEM input (key)</figcaption></figure></div>`;}
/* MultiView (second screen): Preview / Output + 8 Inputs */
function renderMultiview(){const d=V.mvWin.document,c=d.getElementById('mv');if(!c)return;const g=c.getContext('2d'),cw=c.width,ch=c.height;g.fillStyle='#000';g.fillRect(0,0,cw,ch);
  const big=(src,x,label,col)=>{g.drawImage(src,x,0,cw/2-2,ch/2-2);g.strokeStyle=col;g.lineWidth=4;g.strokeRect(x+2,2,cw/2-6,ch/2-6);g.fillStyle='rgba(0,0,0,.6)';g.fillRect(x,ch/2-26,cw/2-2,24);g.fillStyle='#fff';g.font='bold 15px Segoe UI, sans-serif';g.fillText(label,x+8,ch/2-9);};
  big($('.vx-cpv',root),0,'Preview'+(V.pv?' — '+V.pv.name:''),'#FF8C00');big($('.vx-cpg',root),cw/2+2,'Output'+(V.pgm?' — '+V.pgm.name:''),'#006400');
  const tw=cw/4,th=ch/4;V.inputs.slice(0,8).forEach((x,i)=>{const X=(i%4)*tw,Y=ch/2+Math.floor(i/4)*th;try{if(x.ready||x.type==='title')g.drawImage(x.el,X+1,Y+1,tw-2,th-2);}catch(_){}
    const col=V.pgm===x?'#006400':V.pv===x?'#FF8C00':null;if(col){g.strokeStyle=col;g.lineWidth=4;g.strokeRect(X+2,Y+2,tw-4,th-4);}
    g.fillStyle='rgba(0,0,0,.6)';g.fillRect(X,Y+th-20,tw,20);g.fillStyle='#fff';g.font='12px Segoe UI, sans-serif';g.fillText(x.num+'  '+x.name,X+6,Y+th-6);});}
function openMvWin(src='MultiView'){const w=window.open('','vx_mv_'+src,'width=1024,height=600');if(!w)return alertBox(src,'Allow pop-up windows for this site to open the second screen.');
  w.document.title=(src==='MultiView'?'MultiView':'Fullscreen — '+src)+' (drag it to a second monitor · double-click = full screen)';w.document.body.style.cssText='margin:0;background:#000;overflow:hidden';
  w.document.body.innerHTML=`<canvas id="mv" width="${W*2}" height="${H*2}" style="width:100vw;height:100vh;object-fit:contain;display:block"></canvas>`;
  w.document.body.ondblclick=()=>{w.document.fullscreenElement?w.document.exitFullscreen():w.document.documentElement.requestFullscreen().catch(()=>{});};
  if(src==='MultiView')V.mvWin=w;else{V.fsWin=w;V.fsSrc=src;}}
function renderFullscreen(){const c=V.fsWin.document.getElementById('mv');if(!c)return;const g=c.getContext('2d'),src=V.fsSrc==='Preview'?$('.vx-cpv',root):outCv;
  if(V.fsSrc==='MultiView')return;g.drawImage(src,0,0,c.width,c.height);}
/* Record (real file, in the browser) and Stream (simulated — nothing is sent) */
const REC={fmt:'MP4',vb:8,ab:192};
function toggleRec(){if(V.rec){V.recorder.stop();return;}const st=outCv.captureStream(25);if(A)A.dest.stream.getAudioTracks().forEach(t=>st.addTrack(t));
  const mp4=REC.fmt==='MP4'&&MediaRecorder.isTypeSupported('video/mp4');const type=mp4?'video/mp4':'video/webm';
  const r=new MediaRecorder(st,{mimeType:type,videoBitsPerSecond:REC.vb*1e6,audioBitsPerSecond:REC.ab*1000});const chunks=[];r.ondataavailable=e=>e.data.size&&chunks.push(e.data);
  r.onstop=()=>{V.rec=false;draw();const b=new Blob(chunks,{type});const a=document.createElement('a');const d=new Date();a.href=URL.createObjectURL(b);a.download=`capture - ${d.toISOString().slice(0,19).replace(/[T:]/g,'-')}.${mp4?'mp4':'webm'}`;a.click();};
  r.start(1000);V.recorder=r;V.rec=true;V.recT0=performance.now();draw();}
const STR={dest:'YouTube',url:'rtmp://a.rtmp.youtube.com/live2',key:'',quality:'720p 2.5mbps'};
function toggleStream(){if(V.stream){V.stream=false;draw();return;}if(!STR.key&&STR.dest!=='—')return streamDialog(true);V.stream='connecting';V.streamT0=performance.now();draw();setTimeout(()=>{if(V.stream){V.stream=true;draw();}},1600);}
function recDialog(){const m=modal('Recording Setup',`<label>Format <select class="rf"><option ${REC.fmt==='MP4'?'selected':''}>MP4</option><option ${REC.fmt==='WebM'?'selected':''}>WebM</option><option disabled>vMix AVI (not in the browser)</option><option disabled>AVI</option><option disabled>FFMPEG</option></select></label>
  <label>Bit Rate <input class="rb" type="number" min="1" max="50" value="${REC.vb}"> Mbps <span class="vx-hint">(25 recommended for HD)</span></label><label>Audio Bit Rate <select class="ra">${[128,160,192].map(v=>`<option ${REC.ab===v?'selected':''}>${v}</option>`).join('')}</select> kbps</label>
  <p class="vx-hint">The recording is real: when you press Record again, the file is saved to your Downloads folder. It records the Output (with Fade To Black) and the Master audio.</p>`,{w:460,onOk:m=>{REC.fmt=$('.rf',m).value;REC.vb=+$('.rb',m).value||8;REC.ab=+$('.ra',m).value;}});}
function streamDialog(startAfter){modal('Streaming',`<div class="vx-dests">${[1,2,3,4,5].map(n=>`<button class="${n===1?'on':''}" ${n>1?'disabled':''}>${n}</button>`).join('')}</div>
  <label>Destination <select class="sd">${['YouTube','Facebook','Twitch','Custom RTMP Server'].map(d=>`<option ${STR.dest===d?'selected':''}>${d}</option>`).join('')}</select></label>
  <label>URL <input class="su" size="38" value="${STR.url}"></label><label>Stream Key <input class="sk" type="password" size="30" value="${STR.key}" placeholder="xxxx-xxxx-xxxx-xxxx"></label>
  <label>Quality <select class="sq">${['360p 1.5mbps','720p 2.5mbps','720p 4mbps','1080p 6mbps'].map(q=>`<option ${STR.quality===q?'selected':''}>${q}</option>`).join('')}</select></label><label>Application <select disabled><option>FFMPEG</option></select></label>
  <p class="vx-hint">Simulator: nothing is actually sent to the internet. Type any key to practise the steps. (Real YouTube URL: rtmp://a.rtmp.youtube.com/live2 + your stream key from YouTube Studio.)</p>`,{w:520,ok:startAfter?'Start':'Save and Close',onOk:m=>{STR.dest=$('.sd',m).value;STR.url=$('.su',m).value;STR.key=$('.sk',m).value;STR.quality=$('.sq',m).value;if(startAfter&&STR.key)toggleStream();}});
  const sd=$('#vx-modal .sd');sd.onchange=()=>{const u={'YouTube':'rtmp://a.rtmp.youtube.com/live2','Facebook':'rtmps://live-api-s.facebook.com:443/rtmp/','Twitch':'rtmp://live.twitch.tv/app','Custom RTMP Server':'rtmp://'}[sd.value];$('#vx-modal .su').value=u;};}
function outputsDialog(){const srcs=['Output','Preview',...V.inputs.map(x=>'Input '+x.num)];
  modal('Settings — Outputs / NDI / SRT',`<table class="vx-otab"><tr><th></th><th>Source</th><th>External</th><th>NDI</th><th>SRT</th></tr>
    <tr><td><b>Output 1</b></td><td><select class="o1">${srcs.map(x=>`<option ${EXT.src===x?'selected':''}>${x}${x.startsWith('Input ')?' — '+V.inputs[+x.slice(6)-1].name:''}</option>`).join('')}</select></td><td><input type="checkbox" class="oe" ${V.ext?'checked':''}></td><td><input type="checkbox" disabled></td><td><input type="checkbox" disabled></td></tr>
    ${[2,3,4].map(n=>`<tr class="na"><td>Output ${n}</td><td><select disabled><option>Output</option></select></td><td><input type="checkbox" disabled></td><td><input type="checkbox" disabled></td><td><input type="checkbox" disabled></td></tr>`).join('')}</table>
    <p class="vx-hint"><b>External</b> = the DeckLink card of the vMix PC (HD edition: 1 external output). With <b>Alpha Channel</b> set to Straight or Premultiplied in <i>External Output</i>, it sends <b>Fill on SDI 1</b> and <b>Key on SDI 2</b>. In Tartanga these go into the <b>Videohub IN 9 / IN 10</b> and from there to the <b>ATEM</b>, where DSK 1 keys them over the programme.</p>
    <button class="vx-toext">External Output settings…</button>`,{w:600,onOk:m=>{EXT.src=$('.o1',m).value.split(' — ')[0];const on=$('.oe',m).checked;if(on!==V.ext){V.ext=on;if(on)openExtWin();else if(V.extWin&&!V.extWin.closed)V.extWin.close();}draw();}});
  $('.vx-toext',$('#vx-modal')).onclick=()=>extDialog();}
function extDialog(){modal('Settings — External Output',`<label><input type="radio" disabled> vMix Video / Streaming</label><label><input type="radio" checked> External Renderer</label>
  <label>Frame Rate <select disabled><option>25</option></select></label><label>Output Size <select disabled><option>1920x1080</option></select></label>
  <label>Device <select class="ed"><option>DeckLink Duo 2</option><option>DeckLink 8K Pro</option><option>UltraStudio HD Mini</option></select></label><label>Port <select><option>SDI</option></select></label>
  <label>Source <span>${EXT.src} (Settings › Outputs)</span></label>
  <label>Alpha Channel <select class="ea">${['None','Straight','Premultiplied'].map(a=>`<option ${EXT.alpha===a?'selected':''}>${a}</option>`).join('')}</select></label>
  <p class="vx-hint">With <b>Straight</b> or <b>Premultiplied</b>, the card sends <b>Fill on SDI 1</b> and <b>Key on SDI 2</b>. In the ATEM, both go into the keyer (Linear / Pre-multiplied). For titles alone, put a transparent input (Add Input → Colour → Blank) on the Output and the titles as overlays.</p>`,
  {w:560,onOk:m=>{EXT.device=$('.ed',m).value;EXT.alpha=$('.ea',m).value;if(V.extWin&&!V.extWin.closed)openExtWin();}});}
function fullscreenMenu(b){const p=pop(['Output','Preview','MultiView'].map(s=>`<button data-fs="${s}">${s}</button>`).join('')+'<div class="vx-ph">Opens a window: drag it to the second monitor, double-click = full screen.</div>',b);$$('[data-fs]',p).forEach(x=>x.onclick=()=>{p.classList.remove('on');openMvWin(x.dataset.fs);});}
function snapshot(){const a=document.createElement('a');a.href=outCv.toDataURL('image/png');a.download='snapshot.png';a.click();}

/* ---------- open / close ---------- */
/* ---------- Virtual Sets (vMix Virtual Set spec 1.0 — what SetFrameR exports) ----------
 * config.xml = layers bottom→top (static image or dynamic slot with a 16-bit UV map) + <zoom> camera shots.
 * UV map: u = R/65536, v = G/65536 (v from the top), coverage = A/65535 — decoded here at 16 bits (no library). */
async function png16(buf){const d=new DataView(buf),u8=new Uint8Array(buf);let p=8,w=0,h=0,bd=8,ct=6;const idat=[];
  while(p<u8.length){const len=d.getUint32(p),type=String.fromCharCode(...u8.subarray(p+4,p+8));if(type==='IHDR'){w=d.getUint32(p+8);h=d.getUint32(p+12);bd=u8[p+16];ct=u8[p+17];}else if(type==='IDAT')idat.push(u8.subarray(p+8,p+8+len));else if(type==='IEND')break;p+=12+len;}
  const raw=new Uint8Array(await new Response(new Blob(idat).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());
  const ch={6:4,2:3,4:2,0:1}[ct],bpp=ch*bd/8,stride=w*bpp,out=new Uint8Array(h*stride);
  for(let y=0;y<h;y++){const f=raw[y*(stride+1)],src=raw.subarray(y*(stride+1)+1,(y+1)*(stride+1)),o=y*stride;
    for(let x=0;x<stride;x++){const a=x>=bpp?out[o+x-bpp]:0,b=y?out[o-stride+x]:0,c=x>=bpp&&y?out[o-stride+x-bpp]:0;let v=src[x];
      if(f===1)v+=a;else if(f===2)v+=b;else if(f===3)v+=(a+b)>>1;else if(f===4){const pp=a+b-c,pa=Math.abs(pp-a),pb=Math.abs(pp-b),pc=Math.abs(pp-c);v+=pa<=pb&&pa<=pc?a:pb<=pc?b:c;}out[o+x]=v&255;}}
  return {w,h,bd,ch,data:out};}
const VSV=`attribute vec2 p;varying vec2 st;void main(){st=p;gl_Position=vec4(p.x*2.-1.,1.-p.y*2.,0.,1.);}`;
const VSF=`precision highp float;varying vec2 st;uniform sampler2D uv;uniform sampler2D cv;uniform sampler2D src;uniform float mode;
void main(){if(mode<.5){gl_FragColor=texture2D(src,st);return;}float cov=texture2D(cv,st).a;if(cov<=0.){discard;}vec4 m=floor(texture2D(uv,st)*255.+.5);
 vec2 q=vec2(m.r*256.+m.g,m.b*256.+m.a)/65536.;gl_FragColor=texture2D(src,q)*cov;}`;
let vsProg=null,vsU=null;
function vsInit(){if(vsProg)return;vsProg=gl.createProgram();gl.attachShader(vsProg,sh(gl.VERTEX_SHADER,VSV));gl.attachShader(vsProg,sh(gl.FRAGMENT_SHADER,VSF));gl.linkProgram(vsProg);
  vsU={uv:gl.getUniformLocation(vsProg,'uv'),cv:gl.getUniformLocation(vsProg,'cv'),src:gl.getUniformLocation(vsProg,'src'),mode:gl.getUniformLocation(vsProg,'mode'),p:gl.getAttribLocation(vsProg,'p')};}
function mkTex(filter){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);['TEXTURE_WRAP_S','TEXTURE_WRAP_T'].forEach(k=>gl.texParameteri(gl.TEXTURE_2D,gl[k],gl.CLAMP_TO_EDGE));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,filter);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,filter);return t;}
/* UV map → two RGBA8 textures: u and v at full 16 bits (hi/lo bytes, nearest sampling) + coverage (alpha) */
function uvTexture(img){const {w,h,data,bd,ch}=img,n=w*h,t=new Uint8Array(n*4),c=new Uint8Array(n*4),rd=bd===16?(i,k)=>(data[(i*ch+k)*2]<<8)|data[(i*ch+k)*2+1]:(i,k)=>data[i*ch+k]*257;
  for(let i=0;i<n;i++){const u=rd(i,0),v=rd(i,1);t[i*4]=u>>8;t[i*4+1]=u&255;t[i*4+2]=v>>8;t[i*4+3]=v&255;c[i*4+3]=ch===4?rd(i,3)>>8:255;}
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);const tx=mkTex(gl.NEAREST);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,t);
  const cx=mkTex(gl.LINEAR);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,c);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);return {tx,cx};}
async function loadVset(name,get){vsInit();const xml=new DOMParser().parseFromString(await (await get('config.xml')).text(),'text/xml');
  const layers=[];for(const el of xml.querySelectorAll('input')){const dyn=el.getAttribute('dynamic')==='true',L={name:el.getAttribute('name'),dynamic:dyn,input:null};
    if(dyn){const uvf=el.getAttribute('uvmap');if(!uvf)continue;L.uv=uvTexture(await png16(await (await get(uvf)).arrayBuffer()));L.tex=mkTex(gl.LINEAR);L.cv=mkCanvas();}
    else{const blob=await get(el.textContent.trim());const im=new Image();await new Promise((ok,ko)=>{im.onload=ok;im.onerror=()=>ko(Error('Cannot read '+el.textContent.trim()));im.src=URL.createObjectURL(blob);});L.tex=mkTex(gl.LINEAR);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im);}
    layers.push(L);}
  const zooms=[...xml.querySelectorAll('zoom')].map(z=>({name:z.getAttribute('name'),x:+z.getAttribute('x')||0,y:+z.getAttribute('y')||0,zoom:+z.getAttribute('zoom')||1}));if(!zooms.length)zooms.push({name:'Full',x:0,y:0,zoom:1});
  const inp=addInput({type:'vset',name,el:mkCanvas(),vs:{layers,zooms,shot:0,z:zooms[0].zoom,x:0,y:0,from:null,t0:0,ms:0,speed:'M'}});return inp;}
function renderVset(inp){const S=inp.vs;
  S.layers.forEach(L=>{if(!L.dynamic)return;const src=L.input&&byId(L.input);L.live=!!src&&src!==inp&&src.type!=='vset';if(!L.live)return;
    scene(L.cv,{a:src,transparent:true});gl.bindTexture(gl.TEXTURE_2D,L.tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,L.cv);});   // the live input with its own chroma key
  gl.useProgram(vsProg);gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.enableVertexAttribArray(vsU.p);gl.vertexAttribPointer(vsU.p,2,gl.FLOAT,false,0,0);gl.viewport(0,0,W,H);gl.disable(gl.SCISSOR_TEST);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
  gl.uniform1i(vsU.src,0);gl.uniform1i(vsU.uv,1);gl.uniform1i(vsU.cv,2);
  S.layers.forEach(L=>{if(L.dynamic&&!L.live)return;gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,L.tex);if(L.dynamic){gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,L.uv.tx);gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,L.uv.cx);}gl.uniform1f(vsU.mode,L.dynamic?1:0);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);});
  gl.activeTexture(gl.TEXTURE0);gl.useProgram(prog);gl.vertexAttribPointer(pl,2,gl.FLOAT,false,0,0);
  if(S.from){const k=S.ms?Math.min(1,(performance.now()-S.t0)/S.ms):1,e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2,to=S.zooms[S.shot];S.z=S.from.z+(to.zoom-S.from.z)*e;S.x=S.from.x+(to.x-S.from.x)*e;S.y=S.from.y+(to.y-S.from.y)*e;if(k>=1)S.from=null;}
  const g=inp.el.getContext('2d'),cw=W/S.z,chh=H/S.z,sx=(W-cw)/2+S.x*W/4,sy=(H-chh)/2+S.y*H/4;g.clearRect(0,0,W,H);g.drawImage(gc,Math.max(0,Math.min(W-cw,sx)),Math.max(0,Math.min(H-chh,sy)),cw,chh,0,0,W,H);inp.dirty=true;inp.ready=true;}
const VS_SPEED={F:1000,M:2000,S:4000,C:0};
function vsShot(inp,i){const S=inp.vs;S.from={z:S.z,x:S.x,y:S.y};S.shot=i;S.t0=performance.now();S.ms=VS_SPEED[S.speed];draw();}
/* ---------- Presets: New · Open · Save · Save As · Last (a whole production in one file) ---------- */
const KEEP=['type','name','cat','key','pos','ca','cc','layers','hex','tpl','fields','loop','vol','mute','afv','bus','file','pack','id'];
function presetData(){return {app:'tvstudio-vmix',v:1,name:V.preset||'Preset',inputs:V.inputs.map(x=>{const o={};KEEP.forEach(k=>{if(x[k]!==undefined)o[k]=JSON.parse(JSON.stringify(x[k]));});if(x.type==='colour'&&!x.hex)o.bars=true;if(x.type==='camera')o.label=x.name;if(x.type==='vset')o.vs={src:x.vsrc||null,shot:x.vs.shot,speed:x.vs.speed,layers:x.vs.layers.map(L=>({name:L.name,input:L.input}))};return o;}),
  pv:V.pv?.id,pgm:V.pgm?.id,trans:V.trans,ovset:V.ovset,stingers:V.stingers.map(x=>({id:x.inp?.id||null,cut:x.cut,dur:x.dur})),ov:V.ov.map(o=>({id:o.inp?.id||null,on:o.target>0})),catLabels:V.catLabels||null};}
function clearAll(){[...V.inputs].forEach(x=>{V.lock=false;removeInput(x);});V.ov.forEach(o=>{o.inp=null;o.a=o.target=0;o.pend=null;});V.pv=V.pgm=null;}
/* video / image / camera can't be stored in a file: they come back as a placeholder — Input Settings > General > Change… */
/* General › Change…: another file for the same input, keeping all its settings */
function changeSource(inp,done){const i=document.createElement('input');i.type='file';i.accept='video/*,image/*';i.onchange=()=>{const f=i.files[0];if(!f)return;
  if(inp.type==='video')inp.el.pause();if(f.type.startsWith('video')){const v=document.createElement('video');v.src=URL.createObjectURL(f);v.loop=inp.loop;v.playsInline=true;v.preload='auto';inp.el=v;inp.type='video';inp.audio=true;
    v.addEventListener('loadeddata',()=>{inp.dirty=true;draw();},{once:true});if(inp.g){try{inp.g.disconnect();}catch(_){}inp.g=null;}attachAudio(inp);}else{const im=new Image();im.onload=()=>{inp.dirty=true;draw();};im.src=URL.createObjectURL(f);inp.el=im;inp.type='image';}
  inp.file=f.name;inp.ready=false;inp.dirty=true;draw();done&&done();};i.click();}
function missingInput(o){const c=mkCanvas(),g=c.getContext('2d');g.fillStyle='#202428';g.fillRect(0,0,W,H);g.fillStyle='#ffb02e';g.font='bold 34px Segoe UI, sans-serif';g.textAlign='center';
  g.fillText(o.type==='camera'?'Camera not connected':'Missing file',W/2,H/2-20);g.fillStyle='#ccc';g.font='22px Segoe UI, sans-serif';g.fillText(o.file||o.label||o.name,W/2,H/2+22);g.fillText('Input Settings › General › Change…',W/2,H/2+60);
  return addInput({type:'missing',was:o.type,name:o.name,el:c,file:o.file});}
function loadPreset(d){if(!d||d.app!=='tvstudio-vmix')return alertBox('Open','That file is not a preset of this simulator.');clearAll();const map={};
  d.inputs.forEach(o=>{let x;if(o.type==='title')x=titleInput(o.tpl,TITLES[o.tpl].f.map(k=>o.fields?.[k]));else if(o.type==='colour')x=o.bars?barsInput():colourInput(o.name,o.hex||'#000');else if(o.type==='stinger'&&!o.file&&o.name==='Stinger (built-in)'){x=addInput({type:'stinger',name:o.name,el:mkCanvas()});stingerFrame(x,600);}else x=missingInput(o);
    ['name','cat','key','pos','ca','cc','layers','loop','vol','mute','afv','bus'].forEach(k=>{if(o[k]!==undefined)x[k]=o[k];});if(x.type==='title')drawTitle(x);map[o.id]=x;});
  V.inputs.forEach(x=>(x.layers||[]).forEach(L=>{L.id=L.id&&map[L.id]?map[L.id].id:null;}));
  d.inputs.filter(o=>o.type==='vset'&&o.vs&&o.vs.src==='demo').forEach(async o=>{const ph=map[o.id];const x=await loadVset(o.name,f=>fetch('vsets/DemoStudio/'+f).then(r=>r.blob()));x.vsrc='demo';   // the built-in set comes back by itself
    x.vs.speed=o.vs.speed;x.vs.shot=o.vs.shot;x.vs.z=x.vs.zooms[o.vs.shot]?.zoom||1;o.vs.layers.forEach(l=>{const L=x.vs.layers.find(k=>k.name===l.name);if(L)L.input=l.input&&map[l.input]?map[l.input].id:null;});
    V.inputs=V.inputs.filter(i=>i!==x);V.inputs.splice(V.inputs.indexOf(ph),1,x);if(V.pgm===ph)V.pgm=x;if(V.pv===ph)V.pv=x;renumber();draw();});
  V.pgm=map[d.pgm]||V.inputs[0]||null;V.pv=map[d.pv]||null;if(d.trans)V.trans=d.trans;if(d.ovset)V.ovset=d.ovset;if(d.catLabels)V.catLabels=d.catLabels;if(d.stingers)d.stingers.forEach((x,i)=>{V.stingers[i]={inp:x.id&&map[x.id]&&map[x.id].type==='stinger'?map[x.id]:null,cut:x.cut,dur:x.dur};});
  (d.ov||[]).forEach((o,n)=>{if(o.on&&map[o.id]){V.ov[n].inp=map[o.id];V.ov[n].target=V.ov[n].a=1;}});V.preset=d.name;applyAudio();draw();}
function savePreset(as){let name=V.preset||'Preset';if(as||!V.preset){const n=prompt('Save preset as:',name);if(!n)return;name=n.trim()||name;}V.preset=name;const d=presetData();
  try{localStorage.setItem('vx-last',JSON.stringify(d));}catch(_){}const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(d,null,1)],{type:'application/json'}));a.download=name.replace(/[^\w\- ]+/g,'_')+'.vmixsim.json';a.click();draw();}
function openPreset(){const i=document.createElement('input');i.type='file';i.accept='.json,application/json';i.onchange=async()=>{try{loadPreset(JSON.parse(await i.files[0].text()));}catch(_){alertBox('Open','Could not read that file.');}};i.click();}
function seed(){if(V.inputs.length)return;barsInput();colourInput('Colour','#0b3d91');titleInput('classic');titleInput('news');V.pgm=V.inputs[0];V.pv=V.inputs[1];}
window.openVmix=()=>{build();ensureAudio();seed();root.classList.add('on');draw();};
window.closeVmix=()=>{root.classList.remove('on');closeModal();$('#vx-pop')?.classList.remove('on');};
requestAnimationFrame(loop);
})();
