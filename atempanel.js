/* Blackmagic ATEM 1 M/E Advanced Panel 10 — docs/atem-panel10-spec.md. It drives the same Constellation as the rack
 * (window.ATEMR.api): PROGRAM / PREVIEW rows (SHIFT = 11-20), CUT, AUTO, T-bar, MIX/DIP/WIPE/DVE, KEY ON, DSK TIE/CUT/AUTO,
 * FTB, LCD HOME (rates on the knobs) and AUX (output routing with the select row). Not affiliated with Blackmagic Design. */
(function(){
const VW=1000,VH=967,X=f=>f*VW,Y=f=>f*VH;
const P={shift:false,menu:'home',aux:0,next:{bkgd:true,k1:false,k2:false,k3:false,k4:false},me:1,prev:false,msg:'',mt:0};
const A=()=>window.ATEMR&&ATEMR.api;
const SYS=[['HOME','SETTINGS','KEYERS','◁','▷'],['MIX','WIPE','DVE','STINGER','DIP'],['FTB','MEDIA|PLAYERS','BORDER','COLOR',''],['MACRO','SUPER|SOURCE','CAMERA|CONTROL','AUDIO','AUX']];
const key=(id,cx,cy,w,h,l,cls,tip)=>{const ls=String(l).split('|');return `<g class="ap-k ${cls}" data-k="${id}" data-tip="${tip}"><rect x="${cx-w/2}" y="${cy-h/2}" width="${w}" height="${h}" rx="3"/>`+ls.map((t,i)=>`<text x="${cx}" y="${cy+2.6-(ls.length-1)*3.4+i*6.8}" class="ap-kt">${t}</text>`).join('')+'</g>';};
/* the empty palm rest and logo area are cropped off so the controls can be drawn bigger */
const VB=[X(.025),Y(.045),X(.94),Y(.68)],pc=(v,o,l)=>((v-o)/l*100).toFixed(2)+'%';
function svg(){let s=`<svg viewBox="${VB.join(' ')}" class="cr-svg" id="ap-svg"><rect x="${VB[0]}" y="${VB[1]}" width="${VB[2]}" height="${VB[3]}" rx="16" class="cr-chassis"/><rect x="${VB[0]}" y="${VB[1]}" width="${VB[2]}" height="${Y(.33)-VB[1]}" rx="16" class="cr-top"/>`;
  [.400,.466,.532,.599].forEach((x,i)=>s+=`<rect x="${X(x)-16}" y="${Y(.061)}" width="32" height="${Y(.015)}" rx="7" class="cr-soft ap-k" data-k="soft${i}" data-tip="Soft button: acts on the tab / option written above it on the LCD."/>`);
  s+=`<rect x="${X(.366)}" y="${Y(.091)}" width="${X(.267)}" height="${Y(.145)}" rx="5" class="cr-lcdb"/>`;
  [.404,.468,.531,.596].forEach((x,i)=>s+=`<g class="ap-knob" data-k="knob${i}" data-tip="Soft knob: changes the value written above it on the LCD (on HOME: AUTO / DSK 1 / DSK 2 / FTB rate). Drag up/down or scroll. Shift+click = back to 1:00 (simulator shortcut)."><circle cx="${X(x)}" cy="${Y(.271)}" r="16" class="cc-wk"/><line class="cc-wp" x1="${X(x)}" y1="${Y(.271)-14}" x2="${X(x)}" y2="${Y(.271)-7}"/></g>`);
  SYS.forEach((row,r)=>row.forEach((l,c)=>{const id='sys_'+(l||'blank').replace('|',' ');s+=key(id,X(.121+c*.0475+r*.003),Y([.113,.147,.182,.215][r]),37,23,l,'ap-s',l?`${l.replace('|',' ')}: opens its menu on the LCD.`:'No documented function.');}));
  [['1','2','3'],['4','5','6'],['7','8','9'],['ENTER','0','RESET']].forEach((row,r)=>row.forEach((l,c)=>s+=key('kp'+l,X(.688+c*.048-r*.002),Y([.113,.147,.182,.215][r]),37,23,l,'ap-s','Keypad: type values (durations, IP addresses). Not simulated.')));
  s+=`<g data-tip="Joystick (3 axes): positions keys / DVE, wipe centre, PTZ cameras. Not simulated."><circle cx="${X(.888)}" cy="${Y(.165)}" r="${X(.0455)}" class="ap-joyb"/><circle cx="${X(.888)}" cy="${Y(.165)}" r="${X(.0345)}" class="cc-wk"/><circle cx="${X(.888)}" cy="${Y(.165)}" r="${X(.02)}" class="ap-cap"/></g>`;
  const cx=n=>X(.0686+n*.0393);
  for(let n=0;n<10;n++){s+=key('sel'+n,cx(n),Y(.379),36,38,'','ap-w ap-sel',"SELECT row: picks the source for the AUX output chosen on the LCD (press AUX first).");
    s+=key('pgm'+n,cx(n),Y(.546),36,38,'','ap-w ap-pgm','PROGRAM row: cuts this source straight to air (hot-switch).');s+=key('pvw'+n,cx(n),Y(.628),36,38,'','ap-w ap-pvw','PREVIEW row: chooses the next source; CUT / AUTO / T-bar take it to air.');}
  s+=`<rect x="${X(.051)}" y="${Y(.419)}" width="${X(.391)}" height="${Y(.088)}" rx="3" class="ap-strip"/><rect x="${X(.051)}" y="${Y(.667)}" width="${X(.391)}" height="${Y(.04)}" rx="3" class="ap-strip"/>`;
  for(let n=0;n<10;n++){s+=`<text x="${cx(n)}" y="${Y(.447)}" class="ap-nm" data-nm="sel${n}"></text><text x="${cx(n)}" y="${Y(.491)}" class="ap-nm" data-nm="pgm${n}"></text><text x="${cx(n)}" y="${Y(.693)}" class="ap-nm" data-nm="pvw${n}"></text>`;if(n)s+=`<line x1="${cx(n)-X(.0196)}" y1="${Y(.423)}" x2="${cx(n)-X(.0196)}" y2="${Y(.503)}" class="ap-div"/><line x1="${cx(n)-X(.0196)}" y1="${Y(.67)}" x2="${cx(n)-X(.0196)}" y2="${Y(.704)}" class="ap-div"/>`;}
  s+=`<text x="${X(.051)}" y="${Y(.585)}" class="ap-lab">PROGRAM</text><text x="${X(.051)}" y="${Y(.664)}" class="ap-lab">PREVIEW</text>`;
  s+=key('shift1',X(.487),Y(.379),38,38,'SHIFT','ap-w','SHIFT: the rows show sources 11-20.')+key('shift2',X(.487),Y(.546),38,38,'SHIFT','ap-w','SHIFT: the rows show sources 11-20.')+key('prevtrans',X(.487),Y(.628),38,38,'PREV|TRANS','ap-w','PREV TRANS: rehearse the transition on the preview output with the T-bar.');
  [['macro','MACRO','MACRO: turns the select row into macro buttons (not simulated).'],['on1','ON','ON: upstream key 1 on / off air.'],['on2','ON','ON: upstream key 2.'],['on3','ON','ON: upstream key 3.'],['on4','ON','ON: upstream key 4.']].forEach(([id,l,t],i)=>s+=key(id,X([.550,.590,.629,.668,.708][i]),Y(.379),37,38,l,'ap-w',t));
  [['bkgd','BKGD'],['k1','KEY 1'],['k2','KEY 2'],['k3','KEY 3'],['k4','KEY 4']].forEach(([id,l],i)=>s+=key(id,X([.550,.590,.629,.668,.708][i]),Y(.420),37,38,l,'ap-w','NEXT TRANSITION: what the next CUT / AUTO changes (background and/or keys).'));
  ['M/E 1','M/E 2','M/E 3','M/E 4'].forEach((l,i)=>s+=key('me'+(i+1),X([.811,.851,.890,.930][i]),Y(.379),37,38,l,'ap-w','M/E: which mix-effects bus this panel controls (the Constellation HD here has 2).'));
  [['tdip','DIP',.550,.545],['tdve','DVE',.590,.545],['tsting','STING',.629,.545],['tmix','MIX',.550,.585],['twipe','WIPE',.590,.585],['arm','ARM',.629,.585]].forEach(([id,l,x,y])=>s+=key(id,X(x),Y(y),37,38,l,'ap-w',id==='arm'?'ARM: disabled in the real firmware.':'Transition type for AUTO and the T-bar.'));
  s+=key('cut',X(.550),Y(.687),37,38,'CUT','ap-w','CUT: preview and programme swap instantly.')+key('auto',X(.628),Y(.687),37,38,'AUTO','ap-w','AUTO: runs the selected transition at the AUTO RATE (red while it runs).');
  s+=`<rect x="${X(.663)}" y="${Y(.525)}" width="${X(.064)}" height="${Y(.181)}" rx="5" class="ap-tbf"/><rect x="${X(.704)}" y="${Y(.535)}" width="6" height="${Y(.161)}" rx="3" class="ap-slot"/>`;
  for(let i=0;i<16;i++)s+=`<rect x="${X(.675)}" y="${Y(.535)+i*Y(.161)/16+2}" width="8" height="${Y(.161)/16-4}" rx="1" class="ap-tled" data-tl="${i}"/>`;
  s+=`<g id="ap-tbar" data-tip="T-bar: drag it to make the transition by hand (all the way = done; the next move starts another one)."><rect x="${X(.663)}" y="0" width="${X(.1)}" height="${Y(.036)}" rx="6" class="ap-tbh"/><rect x="${X(.705)}" y="${Y(.012)}" width="${X(.012)}" height="${Y(.06)}" rx="3" class="ap-tbh2"/></g>`;
  [['tie1','DSK 1|TIE',.812,.546],['tie2','DSK 2|TIE',.851,.546],['dcut1','DSK 1|CUT',.812,.646],['dcut2','DSK 2|CUT',.851,.646],['dauto1','DSK 1|AUTO',.812,.686],['dauto2','DSK 2|AUTO',.851,.686]].forEach(([id,l,x,y])=>s+=key(id,X(x),Y(y),37,38,l,'ap-w',{t:'DSK TIE: the downstream key goes on/off together with the next transition.',c:'DSK CUT: downstream key on / off instantly.',a:'DSK AUTO: downstream key mixes on / off at the DSK RATE.'}[id[1]==='i'?'t':id[1]==='c'?'c':'a']+' DSK 1 = vMix graphics (fill IN 9 + key IN 10).'));
  s+=`<rect x="${X(.903)}" y="${Y(.66)}" width="4" height="${Y(.05)}" class="ap-guard"/><rect x="${X(.955)-4}" y="${Y(.66)}" width="4" height="${Y(.05)}" class="ap-guard"/>`+key('ftb',X(.928),Y(.685),36,38,'FTB','ap-w','FTB: fade the whole programme to black (blinks red); press again to come back.');
  return s+`</svg><canvas class="ap-lcd" width="400" height="216" style="left:${pc(X(.369),VB[0],VB[2])};top:${pc(Y(.094),VB[1],VB[3])};width:${pc(X(.261),0,VB[2])};height:${pc(Y(.139),0,VB[3])}"></canvas>`;}
/* ---------- state → panel ---------- */
const OUTS=12,INT=['pgm','pvw','clean1','bars','black','mp1','mp2'];
function setK(id,cls,on){const g=document.querySelector(`#ap-svg .ap-k[data-k="${id}"]`);if(g)g.classList.toggle(cls,!!on);}
function draw(){const a=A();if(!a)return;const S=a.S,st=a.st(),off=P.shift?10:0,now=performance.now();
  for(let n=0;n<10;n++){const v=n+1+off;setK('pgm'+n,'red',S.pgm===v||(S.T&&S.pvw===v));setK('pvw'+n,'green',st.mode==='pp'&&S.pvw===v&&!S.T);setK('sel'+n,'white',P.menu==='aux'&&st.outs[P.aux]===v);
    const nm=(id,t,col)=>{const e=document.querySelector(`#ap-svg [data-nm="${id}"]`);if(e){e.textContent=t;e.setAttribute('class','ap-nm'+(col?' '+col:''));}};
    nm('sel'+n,P.menu==='aux'?'Cam '+v:'');nm('pgm'+n,'Cam '+v,S.pgm===v?'red':'');nm('pvw'+n,'Cam '+v,S.pvw===v?'green':'');}
  setK('shift1','amber',P.shift);setK('shift2','amber',P.shift);setK('prevtrans','amber',P.prev);
  ['mix','dip','wipe','dve'].forEach(t=>setK('t'+t,S.T?'red':'amber',S.trans===t));if(!S.T)['mix','dip','wipe','dve'].forEach(t=>setK('t'+t,'red',false));
  setK('auto','red',!!S.T);Object.keys(P.next).forEach(k=>setK(k,'amber',P.next[k]));[1,2,3,4].forEach(n=>setK('on'+n,'red',S['key'+n].on));setK('me1','amber',true);
  setK('tie1','amber',S.dsk1.tie);setK('tie2','amber',S.dsk2.tie);setK('dcut1','red',S.dsk1.on);setK('dcut2','red',S.dsk2.on);setK('dauto1','red',S.dsk1.a>0&&S.dsk1.a<1);setK('dauto2','red',S.dsk2.a>0&&S.dsk2.a<1);
  setK('ftb','red',S.ftb.on&&Math.floor(now/400)%2===0);
  document.querySelectorAll('#ap-svg .ap-s').forEach(g=>g.classList.toggle('amber',g.dataset.k==='sys_'+{home:'HOME',aux:'AUX',mix:'MIX',dip:'DIP',wipe:'WIPE',dve:'DVE',ftb:'FTB'}[P.menu]));
  const p=S.T?S.T.p:0;document.querySelectorAll('#ap-svg [data-tl]').forEach(e=>e.classList.toggle('on',+e.dataset.tl<Math.round(p*16)));
  const tb=document.getElementById('ap-tbar');if(tb)tb.setAttribute('transform',`translate(0 ${Y(.535)+P.tbv*Y(.145)})`);
  lcd(a,S,st);}
const fr=f=>{const s=Math.floor(f/25),r=f%25;return s+':'+String(r).padStart(2,'0');};
function lcd(a,S,st){const c=document.querySelector('.ap-lcd');if(!c)return;const g=c.getContext('2d'),w=400,h=216;g.fillStyle='#0b0e13';g.fillRect(0,0,w,h);g.textAlign='center';g.textBaseline='alphabetic';
  const tabs=(t,sel)=>t.forEach((l,i)=>{g.fillStyle=i===sel?'#fff':'#8b949e';g.font='700 12px sans-serif';g.fillText(l,50+i*100,18);if(i===sel){g.fillStyle='#ff9a2e';g.fillRect(20+i*100,23,60,2);}});
  const bottom=v=>v.forEach(([l,val],i)=>{if(!l)return;g.fillStyle='#fff';g.font='700 15px sans-serif';g.fillText(val,50+i*100,h-26);g.fillStyle='#8b949e';g.font='600 10px sans-serif';g.fillText(l,50+i*100,h-10);});
  if(P.menu==='home'){tabs(['HOME','NETWORK','ABOUT'],0);g.font='600 11px sans-serif';g.fillStyle='#8b949e';g.fillText('M/E 1 PREVIEW',w*.27,62);g.fillText('M/E 1 PROGRAM',w*.73,62);
    g.font='700 22px sans-serif';g.fillStyle='#fff';g.fillText(a.srcLabel(S.pvw),w*.27,95);g.fillStyle='#ff453a';g.fillText(a.srcLabel(S.pgm),w*.73,95);
    if(P.msg){g.fillStyle='#ffcf5a';g.font='600 11px sans-serif';g.fillText(P.msg,w/2,135);}
    bottom([['AUTO RATE',fr(st.rate)],['DSK 1 RATE',fr(st.dskRate)],['DSK 2 RATE',fr(st.dskRate)],['FTB RATE',fr(st.ftbRate)]]);}
  else if(P.menu==='aux'){tabs(['AUX','',''],0);g.font='600 12px sans-serif';g.fillStyle='#8b949e';g.fillText('Destination',w*.27,62);g.fillText('Source',w*.73,62);g.font='700 22px sans-serif';g.fillStyle='#fff';
    g.fillText('SDI Out '+(P.aux+1),w*.27,95);g.fillText(a.srcLabel(st.outs[P.aux]),w*.73,95);g.font='600 11px sans-serif';g.fillStyle='#ffcf5a';g.fillText(P.msg||'Knob 1 = output · select row = source · knob 2 = internal sources',w/2,135);
    bottom([['OUTPUT','Out '+(P.aux+1)],['INTERNAL',a.srcLabel(st.outs[P.aux]).slice(0,10)],['',''],['','']]);}
  else if(['mix','dip','wipe','dve'].includes(P.menu)){tabs([P.menu.toUpperCase(),'',''],0);g.font='700 20px sans-serif';g.fillStyle='#fff';g.fillText(P.menu.toUpperCase()+' transition',w/2,90);
    g.font='600 11px sans-serif';g.fillStyle='#8b949e';g.fillText('one rate for every type in this simulator',w/2,118);bottom([['RATE',fr(st.rate)],['','' ],['',''],['','']]);}
  else if(P.menu==='ftb'){tabs(['FTB','',''],0);g.font='700 20px sans-serif';g.fillStyle='#fff';g.fillText('Fade to black',w/2,90);bottom([['RATE',fr(st.ftbRate)],['AFV','off'],['',''],['','']]);}
  else{tabs([P.menu.toUpperCase(),'',''],0);g.font='600 14px sans-serif';g.fillStyle='#8b949e';g.fillText('This menu is not simulated yet',w/2,100);}}
/* ---------- interaction ---------- */
function msg(t){P.msg=t;clearTimeout(P.mt);P.mt=setTimeout(()=>{P.msg='';draw();},2500);}
function press(k){const a=A();if(!a)return;const off=P.shift?10:0;
  let m;if((m=/^pgm(\d)$/.exec(k)))a.pgm(+m[1]+1+off);else if((m=/^pvw(\d)$/.exec(k)))a.pvw(+m[1]+1+off);
  else if((m=/^sel(\d)$/.exec(k))){if(P.menu==='aux'){a.setOut(P.aux,+m[1]+1+off);}else msg('Press AUX first to route an output with the select row');}
  else if(k==='shift1'||k==='shift2')P.shift=!P.shift;else if(k==='cut')a.cut();else if(k==='auto')a.auto();
  else if(/^t(mix|dip|wipe|dve)$/.test(k)){a.trans(k.slice(1));P.menu=k.slice(1);}else if(k==='tsting')msg('STING needs a stinger clip in a media player — not simulated');else if(k==='arm')msg('ARM: disabled in the firmware');
  else if((m=/^on(\d)$/.exec(k))){a.keyOn(+m[1]);if(+m[1]>0)msg('Upstream key '+m[1]+': no fill / key set up here');}
  else if(k==='bkgd'||/^k\d$/.test(k))P.next[k]=!P.next[k];
  else if((m=/^tie(\d)$/.exec(k)))a.dskTie(+m[1]);else if((m=/^dcut(\d)$/.exec(k)))a.dskCut(+m[1]);else if((m=/^dauto(\d)$/.exec(k)))a.dskAuto(+m[1]);
  else if(k==='ftb')a.ftb();else if(k==='prevtrans'){P.prev=!P.prev;msg('PREV TRANS: rehearse on preview (not simulated)');}
  else if(/^me\d$/.test(k)){if(k!=='me1')msg(k==='me2'?'M/E 2: not used in this simulator':'This switcher has only 2 M/Es');}
  else if(k==='macro')msg('Macros: not simulated');
  else if(k.startsWith('sys_')){const n=k.slice(4);const map={HOME:'home',AUX:'aux',MIX:'mix',DIP:'dip',WIPE:'wipe',DVE:'dve',FTB:'ftb'};if(map[n])P.menu=map[n];else if(n==='CAMERA CONTROL')msg('Use the camera control panel (CCU) on the right');else if(n!=='blank'&&n!=='◁'&&n!=='▷'){P.menu=n.toLowerCase();}}
  else if(k.startsWith('kp'))msg('Keypad: not simulated');else if(k.startsWith('soft'))msg('');}
function knob(i,d){const a=A();if(!a)return;const st=a.st();
  if(P.menu==='home'){const key=['rate','dskRate','dskRate','ftbRate'][i];a.setRate(key,st[key]+d);}
  else if(P.menu==='aux'){if(i===0)P.aux=(P.aux+d+OUTS)%OUTS;else if(i===1){const cur=st.outs[P.aux],j=INT.indexOf(cur);a.setOut(P.aux,INT[(j+d+INT.length)%INT.length]);}}
  else if(['mix','dip','wipe','dve'].includes(P.menu)&&i===0)a.setRate('rate',st.rate+d);else if(P.menu==='ftb'&&i===0)a.setRate('ftbRate',st.ftbRate+d);}
P.tbv=0;
function mount(el){el.innerHTML=`<div class="cr-wrap ap-wrap">${svg()}</div>`;const s=el.querySelector('#ap-svg');
  s.addEventListener('pointerdown',e=>{const k=e.target.closest('.ap-k');if(k){e.preventDefault();k.classList.add('down');const up=()=>{k.classList.remove('down');removeEventListener('pointerup',up);};addEventListener('pointerup',up);press(k.dataset.k);draw();return;}
    const kn=e.target.closest('.ap-knob'),tb=e.target.closest('#ap-tbar');if(!kn&&!tb)return;e.preventDefault();
    if(kn&&e.shiftKey){const a=A(),i=+kn.dataset.k.slice(4);if(a&&P.menu==='home')a.setRate(['rate','dskRate','dskRate','ftbRate'][i],25);else if(a&&i===0&&['mix','dip','wipe','dve'].includes(P.menu))a.setRate('rate',25);else if(a&&i===0&&P.menu==='ftb')a.setRate('ftbRate',25);msg('Reset to 1:00');draw();return;}   /* simulator shortcut */
    let y0=e.clientY,acc=0;const r=s.getBoundingClientRect(),scale=VB[3]/r.height;
    const mv=ev=>{if(tb){P.tbv=Math.max(0,Math.min(1,P.tbv+(ev.clientY-y0)*scale/Y(.145)));y0=ev.clientY;A()&&A().tbar(P.tbv);draw();return;}acc+=y0-ev.clientY;y0=ev.clientY;while(Math.abs(acc)>=6){const d=Math.sign(acc);acc-=d*6;knob(+kn.dataset.k.slice(4),d);}draw();};
    const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);};addEventListener('pointermove',mv);addEventListener('pointerup',up);});
  s.addEventListener('wheel',e=>{const kn=e.target.closest('.ap-knob');if(!kn)return;e.preventDefault();knob(+kn.dataset.k.slice(4),e.deltaY<0?1:-1);draw();},{passive:false});
  draw();}
window.APANEL={mount,draw};
})();
