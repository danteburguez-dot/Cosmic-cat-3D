'use strict';
// Interfaz y dibujo: JavaScript/Canvas. Las reglas, mapa lógico, IA,
// combate, objetos, progreso y movimiento se ejecutan en C++ (WebAssembly).
const $=id=>document.getElementById(id);
const names=['Mercurio','Venus','Tierra','Marte','Júpiter','Saturno','Urano','Neptuno'];
// Colores reconocibles de cada planeta para el mapa del sistema solar.
const colors=['#aaa39a','#d6a65d','#4f89a5','#b85b45','#c99258','#d0b37f','#72c4d2','#31599b'];
const ground=['#59535b','#695b49','#526c5e','#805747','#69584c','#7b7373','#577b85','#47516d'];
const highlights=['#92877e','#ad956d','#88a88e','#bf8b70','#a29a87','#b2a598','#8bb7c0','#8893b3'];
const gasPlanet=p=>p>=4;
let engine=null,screen='start',playing=false,paused=false, currentP=0,currentL=1,currentD=1;
let deferredInstallPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;});
window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;});
let suitColor='#d8d9e1', suitBrightness=100, cameraX=0,cameraY=0, touchInput=new Set(),keys=new Set(),frameCount=0,progressTimer=null,lastFrame=0,gameTime=0, prevPhase=-1, lastErr='';
let lastInput=0, sprites={}, shownPartsMask=0, pieceModalPlanet=-1, pieceCloseTimer=null;
const canvas=$('gameCanvas');
let mouseActive=false,mouseScreen={x:0,y:0},mouseButtons={left:false,right:false};
function getAimPoint(){
 if(!renderer||!mouseActive||screen!=='play')return null;
 const heroScreen=renderer.project(ex('hero_x')/75,1,ex('hero_y')/75);
 if(!heroScreen)return null;
 const dx=mouseScreen.x-heroScreen[0],dy=mouseScreen.y-heroScreen[1],len=Math.hypot(dx,dy),scale=len>250?250/len:1;
 const sx=heroScreen[0]+dx*scale,sy=heroScreen[1]+dy*scale;
 const world=renderer.screenToGround(sx,sy);
 if(!world)return null;
 return {sx,sy,x:world.x*75,y:world.z*75,hx:heroScreen[0],hy:heroScreen[1]};
}
function aimEngine(){
 const aim=getAimPoint();
 if(aim){ex('set_aim',aim.x,aim.y);renderer.aimOverlay=aim;}
 else if(renderer)renderer.aimOverlay=null;
}
canvas.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'){mouseActive=true;mouseScreen={x:e.clientX,y:e.clientY};}});
canvas.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||screen!=='play')return;e.preventDefault();mouseActive=true;mouseScreen={x:e.clientX,y:e.clientY};if(e.button===0)mouseButtons.left=true;if(e.button===2)mouseButtons.right=true;});
window.addEventListener('pointerup',e=>{if(e.pointerType==='mouse'){if(e.button===0)mouseButtons.left=false;if(e.button===2)mouseButtons.right=false;}});
canvas.addEventListener('contextmenu',e=>e.preventDefault());

let renderer=null,shownShot=0,shownTail=0,previousEnergy=20,attackShot=0,attackTail=0,lastSporeFired=0;
const mini=$('miniMap'),mctx=mini.getContext('2d');

// Sonido procedural: el juego sigue funcionando sin descargar archivos externos.
// El contexto se crea únicamente después de una interacción del usuario, como
// exigen Chrome, Edge y los navegadores móviles.
let audioCtx=null,audioMaster=null,audioNoise=null;
let audioHeroX=0,audioHeroY=0,audioHeroStepAt=0;
const audioEnemyX=[],audioEnemyY=[],audioEnemyStepAt=[];
const specialEnemyAt=[],specialEnemyNext=[];
function initAudio(){
  if(audioCtx){if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});return;}
  const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
  try{
    audioCtx=new C();audioMaster=audioCtx.createGain();audioMaster.gain.value=.22;audioMaster.connect(audioCtx.destination);
    audioNoise=audioCtx.createBuffer(1,audioCtx.sampleRate*.25,audioCtx.sampleRate);
    const data=audioNoise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,2);
  }catch(_){audioCtx=null;}
}
function soundTone(freq,duration,type='sine',volume=.12,slide=0){
  if(!audioCtx||!audioMaster)return;const now=audioCtx.currentTime;
  const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,now);
  if(slide)osc.frequency.exponentialRampToValueAtTime(Math.max(35,freq+slide),now+duration);
  gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(volume,now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
  osc.connect(gain);gain.connect(audioMaster);osc.start(now);osc.stop(now+duration+.02);
}
function soundNoise(duration=.08,volume=.1,filter=900){
  if(!audioCtx||!audioNoise||!audioMaster)return;const now=audioCtx.currentTime;
  const src=audioCtx.createBufferSource(),gain=audioCtx.createGain(),low=audioCtx.createBiquadFilter();src.buffer=audioNoise;low.type='lowpass';low.frequency.value=filter;
  gain.gain.setValueAtTime(volume,now);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);src.connect(low);low.connect(gain);gain.connect(audioMaster);src.start(now);src.stop(now+duration+.01);
}
function catStep(){soundTone(145,.055,'triangle',.07,45);soundNoise(.035,.025,700);}
function catTailAttack(){soundTone(270,.12,'sawtooth',.12,470);soundNoise(.07,.08,1800);}
function catShot(){soundTone(720,.16,'square',.1,-470);soundNoise(.09,.055,2400);}
function enemyStep(type){const f=type===2?68:type===1?105:160;soundTone(f,.12,'triangle',type===2?.13:.075, type===2?-18:-35);soundNoise(.05,type===2?.09:.04,500);}
function enemyAttack(type){const f=type===2?52:type===1?115:190;soundTone(f,.28,'sawtooth',type===2?.17:.1,-f*.55);soundNoise(type===2?.22:.12,type===2?.14:.075, type===2?380:700);}
function specialSound(planet,attack,type){
  const base=type===2?55:90,tones=[[base,base*1.5],[base*1.3,base*.7]][attack];
  soundTone(tones[0],.22,attack?'square':'sawtooth',type===2?.16:.1,attack?-tones[0]*.65:tones[1]);
  soundTone(tones[1],.18,'triangle',.08,planet%2?tones[0]:-tones[1]);soundNoise(.12,type===2?.12:.07,260+planet*100);
}
// Cada élite/jefe alterna únicamente entre dos ataques especiales (0 y 1).
// La pareja cambia según el planeta y se representa también visualmente.
function specialGameplay(){
  if(!audioCtx||!renderer)return;const now=performance.now()/1000,hx=ex('hero_x')/75,hz=ex('hero_y')/75;
  for(let i=0;i<ex('enemy_total');i++){
    if(!ex('enemy_alive',i))continue;const type=ex('enemy_type',i);if(type===0)continue;
    const x=ex('enemy_x',i)/75,z=ex('enemy_y',i)/75,near=Math.hypot(x-hx,z-hz)<(type===2?8.5:7);
    if(!near||now-(specialEnemyAt[i]||0)<(type===2?3.8:3.1))continue;
    const attack=specialEnemyNext[i]===1?1:0;specialEnemyNext[i]=attack^1;specialEnemyAt[i]=now;
    renderer.emitSpecial(x,z,hx,hz,currentP,attack,type,now);specialSound(currentP,attack,type);
  }
}
function sporeSpit(){soundTone(95,.12,'square',.09,-45);soundNoise(.08,.06,300);}
function soundGameplay(mask,wasHp,oldEnemies){
  if(!audioCtx)return;const now=performance.now()/1000,hx=ex('hero_x'),hy=ex('hero_y');
  const moving=(mask&15)!==0;
  if(moving&&(Math.abs(hx-audioHeroX)+Math.abs(hy-audioHeroY)>0.2)&&now-audioHeroStepAt>(mask&16?.22:.34)){audioHeroStepAt=now;catStep();}
  audioHeroX=hx;audioHeroY=hy;
  const hp=ex('hero_hp');
  if(hp<wasHp){let nearest=0,best=1e12;for(let i=0;i<ex('enemy_total');i++)if(ex('enemy_alive',i)){const dx=ex('enemy_x',i)-hx,dy=ex('enemy_y',i)-hy,d=dx*dx+dy*dy;if(d<best){best=d;nearest=ex('enemy_type',i);}}enemyAttack(nearest);}
  for(let i=0;i<ex('enemy_total');i++){
    if(!ex('enemy_alive',i)){audioEnemyX[i]=audioEnemyY[i]=undefined;continue;}
    const x=ex('enemy_x',i),y=ex('enemy_y',i),type=ex('enemy_type',i),moved=oldEnemies[i]&&(Math.abs(x-oldEnemies[i][0])+Math.abs(y-oldEnemies[i][1])>.08);
    if(moved&&now-(audioEnemyStepAt[i]||0)>(type===2?.48:type===1?.34:.27)){audioEnemyStepAt[i]=now;enemyStep(type);}
    audioEnemyX[i]=x;audioEnemyY[i]=y;
  }
}
window.addEventListener('pointerdown',initAudio,{passive:true});window.addEventListener('keydown',initAudio,{passive:true});
function crash(err){const msg=String(err&&err.stack||err);lastErr=msg;console.error(err);$('error').hidden=false;$('error').textContent='COSMIC CAT — Error de ejecución\n'+msg+'\n\nSi ocurre al iniciar un nivel, enviá una captura de este mensaje.';}
window.addEventListener('error',e=>crash(e.error||e.message));
window.addEventListener('unhandledrejection',e=>crash(e.reason));
function show(id){document.querySelectorAll('.screen').forEach(el=>el.classList.toggle('active',el.id===id));screen=id;}
function on(id,fn){const el=$(id);if(el)el.addEventListener('click',fn)}
function ex(n,...args){if(!engine||typeof engine[n]!=='function')throw new Error('Función C++ no cargada: '+n);return engine[n](...args)}
function loadedEngine(){if(engine)return;const raw=atob(CPP_ENGINE_BASE64);const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));const result=new WebAssembly.Module(bytes);engine=new WebAssembly.Instance(result,{}).exports;}
// La pantalla de carga permanece visible durante 30 segundos reales como mínimo.
// Solo reproduce el video transparente de Nyan Cat; no hay botón para saltarla.
function openLoading(callback,label='Cargando nivel 3D...'){
  clearInterval(progressTimer);
  show('load');
  const progressBar=$('progress'),message=$('loadingText'),nyan=$('nyan');
  progressBar.style.width='0%';
  message.textContent=label+' 0%';
  try {nyan.pause();nyan.currentTime=0;nyan.play().catch(()=>{});}catch(e){}
  const started=performance.now();
  const minDuration=30000;
  let completed=false;
  progressTimer=setInterval(()=>{
    if(completed)return;
    const elapsed=performance.now()-started;
    const fraction=Math.min(1,elapsed/minDuration);
    const percent=Math.min(100,Math.floor(fraction*100));
    progressBar.style.width=percent+'%';
    message.textContent=label+' '+percent+'%';
    if(elapsed<minDuration)return;
    completed=true;
    clearInterval(progressTimer);progressTimer=null;
    progressBar.style.width='100%';
    message.textContent=label+' 100%';
    nyan.pause();
    try{callback()}catch(err){crash(err);show('lobby')}
  },100);
}
function startIntro(){show('intro');const v=$('introVideo');v.currentTime=0;v.play().catch(()=>finishIntro());}
function chooseControls(){if(window.CosmicControlMode){setControlMode(window.CosmicControlMode);startIntro();return;}dialog('¿DÓNDE VAS A JUGAR?','<p class="controlQuestion">Elegí el dispositivo para adaptar los controles.</p><div class="buttonGrid"><button id="controlPC">🖥️ COMPUTADORA</button><button id="controlPhone">📱 TELÉFONO</button></div>');
  $('controlPC').onclick=()=>{setControlMode('pc');closeDialog();startIntro();};
  $('controlPhone').onclick=()=>chooseMovementOnly();
}
function chooseMovementOnly(after){
  const go=()=>{after?after():startIntro()};
  dialog('¿CÓMO QUERÉS MOVERTE?','<p class="controlQuestion">Elegí tu forma preferida de movimiento.</p><div class="buttonGrid"><button id="mArrows">⬅️ FLECHITAS</button><button id="mStick">🕹️ JOYSTICK</button></div>');
  $('mArrows').onclick=()=>{setControlMode('arrows');closeDialog();go()};
  $('mStick').onclick=()=>{setControlMode('joystick');closeDialog();go()};
}
let controlMode='pc';
function setControlMode(mode){
  controlMode=mode;
  const touch=$('touch');if(!touch)return;
  touch.classList.toggle('joystickMode',mode==='joystick');touch.classList.toggle('phoneMode',mode!=='pc');
}
// En teléfono (flechitas o joystick) el gato mira hacia donde camina:
// la mira se apunta a la dirección de movimiento mientras avanza.
function touchAim(mask){
  if(controlMode==='pc'||!engine)return;
  if(renderer)renderer.aimOverlay=null;
  const dx=(mask&2?1:0)-(mask&1?1:0),dy=(mask&8?1:0)-(mask&4?1:0);
  if(dx||dy)ex('set_aim',ex('hero_x')+dx*320,ex('hero_y')+dy*320);
}
function finishIntro(){const v=$('introVideo');v.pause();openLoading(()=>{loadedEngine();renderLobby();show('lobby')},'Preparando el sistema solar');}
on('begin',chooseControls);on('skipIntro',finishIntro);$('introVideo').addEventListener('ended',finishIntro);on('resumeSaved',()=>{if(window.CosmicAsPhone&&window.CosmicAsPhone!=='pc'){window.CosmicAsPhone==='arrows'?setControlMode('arrows'):setControlMode('joystick');loadSlots(true);}else loadSlots(true)});
on('downloadGame',()=>{
  const here=(path,name)=>{const anchor=document.createElement('a');anchor.href=path;anchor.download=name;document.body.appendChild(anchor);anchor.click();anchor.remove();};
  dialog('DESCARGAR COSMIC CAT','<p>Elegí la versión para tu dispositivo:</p><div class="buttonGrid"><button id="dlWin"><svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" style="vertical-align:-2px;margin-right:6px"><path d="M3 5.5 10.5 4.4v7.1H3V5.5Zm0 6.9h7.5v7.2L3 18.5v-6.1Zm8.3-8.2L21 3v8.5h-9.7V4.2Zm0 7.3H21V21l-9.7-1.4v-8.1Z"/></svg><span>WINDOWS (.exe)</span></button><button id="dlApk"><svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" style="vertical-align:-2px;margin-right:6px"><path d="M7.2 2A5.2 5.2 0 0 0 2 7.2c0 1 .3 2 .8 2.9A5.3 5.3 0 0 0 5 16.9a5.3 5.3 0 0 0 8.5 2.3 5.2 5.2 0 0 0 5.6-3 5.3 5.3 0 0 0 2.9-4.7c0-4-3.2-7.2-7.2-7.2h-.1A5.2 5.2 0 0 0 7.2 2Z"/></svg><span>ANDROID (.apk)</span></button></div><p class="info">Windows descarga un RAR con el ejecutable portable. Android descarga un RAR con el APK: descomprimilo e instalalo permitiendo aplicaciones de origen desconocido.</p>');
  $('dlWin').onclick=()=>{here('windows-max.rar','COSMIC-CAT-Windows.rar');};
  $('dlApk').onclick=()=>{here('android-max.rar','COSMIC-CAT-Android.rar');};
});
on('clearSaves',()=>{
  let html='<p>Elegí qué casilla querés borrar. Las demás partidas se conservarán.</p><div class="buttonGrid">';
  for(let i=1;i<=4;i++){let save=null;try{save=JSON.parse(localStorage.getItem('cosmic_cpp_save_'+i)||'null')}catch(_){}const detail=save?`${names[save.planet]||'Partida'} · Nivel ${save.level||1}`:'VACÍA';html+=`<button data-clear-slot="${i}" ${save?'':'disabled'}>🗑 CASILLA ${i}<br><small>${detail}</small></button>`;}
  html+='</div><button id="cancelClear">CANCELAR</button>';dialog('BORRAR UNA PARTIDA',html);
  document.querySelectorAll('[data-clear-slot]').forEach(button=>button.onclick=()=>{const slot=button.dataset.clearSlot;if(!confirm(`¿Borrar la partida de la casilla ${slot}?`))return;localStorage.removeItem('cosmic_cpp_save_'+slot);dialog('PARTIDA BORRADA',`<p>Se borró únicamente la partida de la casilla ${slot}.</p><button id="closeClear">ACEPTAR</button>`);$('closeClear').onclick=closeDialog;});
  $('cancelClear').onclick=closeDialog;
});
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
function renderLobby(){
 if(!engine)loadedEngine();
 const positions=[[50,16],[78,29],[87,47],[76,76],[50,87],[24,76],[13,47],[22,29]];
  $('planets').innerHTML=names.map((n,p)=>{const unlocked=p===0||ex('get_completed',p-1)>=10;const q=positions[p];return `<button class="orbitPlanet ${unlocked?'':'locked'}" style="left:${q[0]}%;top:${q[1]}%" data-planet="${p}" ${unlocked?'':'disabled'} title="${n}"><span class="planetOrb planet-${p} ${p===5?'saturn':''}" style="--pc:${colors[p]}"></span><span>${n.toUpperCase()}</span>${!unlocked?'<i>🔒</i>':''}</button>`}).join('');
 document.querySelectorAll('[data-planet]').forEach(b=>b.onclick=()=>chooseLevel(+b.dataset.planet));
 const complete=names.map((_,i)=>ex('get_completed',i)),unlocked=Math.min(7,complete.findIndex(v=>v<10)===-1?7:complete.findIndex(v=>v<10));
 const count=bitCount(ex('get_parts'));
 let medal='';try{const m=JSON.parse(localStorage.getItem('cosmic_mission_v1')||'null');if(m&&m.stars)medal=` · 🛰️ misión ${'★'.repeat(m.stars)}`}catch(_){}
 $('lobbyStatus').textContent=`⭐ ${ex('get_stars')} estrellas · 🚀 ${count}/8 piezas${medal}`; $('lobbyStars').textContent=`⭐ ${ex('get_stars')} estrellas`;
 $('campaignPlanet').textContent=names[unlocked];$('campaignLevel').textContent=`${Math.min(10,complete[unlocked]+1)} / 10`;
 $('campaignRocket').textContent=count===8?'Piezas completas':'Sin ensamblar';$('partsProgress').textContent=count+' de 8';$('partsBar').style.width=count/8*100+'%';
 $('statInitialLife').textContent=80+(ex('get_upgrade',1)-1)*15;$('statTail').textContent=7+(ex('get_upgrade',0)-1)*2;
 $('statEnergy').textContent=20+(ex('get_upgrade',2)-1)*4;$('statStamina').textContent=10+(ex('get_upgrade',4)-1)*3;$('statSuit').textContent=20+(ex('get_upgrade',6)-1)*5;
  $('exploreCurrent').textContent='🪐 EXPLORAR '+names[unlocked].toUpperCase();$('exploreCurrent').onclick=()=>chooseLevel(unlocked);
   requestAnimationFrame(animateLobbySystem);
 }
let lobbyOrbitFrame=0;
function animateLobbySystem(){
  if(screen!=='lobby')return;
  const map=$('planets');if(!map)return;
  const now=performance.now(),speed=[.00022,.00017,.00014,.000116,.000096,.000082,.000068,.000058];
  const radius=[.16,.27,.37,.47,.59,.70,.82,.94],phase=[-Math.PI/2,-.35,.5,1.18,1.9,2.55,3.2,3.85];
  map.querySelectorAll('[data-planet]').forEach(button=>{const p=Number(button.dataset.planet),a=phase[p]+now*speed[p];button.style.left=(50+Math.cos(a)*radius[p]*46)+'%';button.style.top=(50+Math.sin(a)*radius[p]*38)+'%';});
  lobbyOrbitFrame=requestAnimationFrame(animateLobbySystem);
}
function bitCount(n){let c=0;while(n){c+=n&1;n>>=1}return c}

const ROCKET_PARTS=[
 {name:'Motor principal',purpose:'Genera el empuje principal del cohete para despegar y salir de la atmósfera.',image:'assets/piece-cat-1.jpg',icon:'🚀'},
 {name:'Cabina de mando',purpose:'Permite controlar la dirección del cohete y protege al piloto durante el viaje.',image:'assets/piece-cat-2.jpg',icon:'🪟'},
 {name:'Ala estabilizadora izquierda',purpose:'Ayuda a estabilizar el cohete durante las maniobras de ascenso.',image:'assets/piece-cat-3.jpg',icon:'🪽'},
 {name:'Ala estabilizadora derecha',purpose:'Mantiene el equilibrio lateral del cohete y mejora la trayectoria.',image:'assets/piece-cat-4.jpg',icon:'🪽'},
 {name:'Sistema de navegación',purpose:'Calcula la ruta entre planetas y permite fijar el destino del viaje.',image:'assets/piece-cat-5.jpg',icon:'🧭'},
 {name:'Tanque de combustible',purpose:'Almacena la energía necesaria para impulsar el cohete durante la misión.',image:'assets/piece-cat-6.jpg',icon:'⛽'},
 {name:'Módulo de energía',purpose:'Alimenta los sistemas eléctricos y activa los equipos de abordo.',image:'assets/piece-cat-7.jpg',icon:'🔋'},
 {name:'Boquilla de despegue',purpose:'Concentra el empuje del motor para conseguir un lanzamiento más potente.',image:'assets/piece-cat-8.jpg',icon:'⚙️'}
];
function showPiecePanel(planetIdx){
  paused=true; pieceModalPlanet=planetIdx;
  const part=ROCKET_PARTS[planetIdx]||ROCKET_PARTS[0];
  const html=`<div class="piecePanel" style="--piecebg:url('${part.image}')">
    <div class="pieceBackdrop"></div>
    <div class="pieceGlow">${part.icon}</div>
    <div class="pieceInfo">
      <p class="pieceTag">PIEZA DE COHETE ENCONTRADA</p>
      <h3>${part.name}</h3>
      <p><b>¿Para qué sirve?</b></p>
      <p>${part.purpose}</p>
      <p class="pieceHint">La pieza queda guardada para el ensamblaje final del cohete.</p>
    </div>
  </div>`;
  dialog('🚀 NUEVA PIEZA OBTENIDA',html);
  $('closeModal').hidden=true;
  if(pieceCloseTimer) clearTimeout(pieceCloseTimer);
  pieceCloseTimer=setTimeout(()=>{$('closeModal').hidden=false;},5000);
  $('closeModal').onclick=()=>{ if($('closeModal').hidden) return; closePiecePanel(); };
}
function closePiecePanel(){
  closeDialog();
  if(pieceCloseTimer) clearTimeout(pieceCloseTimer);
  setTimeout(()=>showContinuePanel(),120);
}
function showContinuePanel(){
  const finished=ex('get_phase')===2;
  dialog('¿QUIERES SEGUIR?',`<p>Ya guardaste la pieza del cohete de <b>${names[pieceModalPlanet]}</b>.</p>${finished?'<p>¡Todos los enemigos derrotados! Ya podés avanzar.</p>':'<p>Para desbloquear el siguiente nivel todavía tenés que derrotar a todos los enemigos.</p>'}<div class="buttonGrid"><button id="continueYes">SÍ</button><button id="continueNo">NO</button><button id="continueNext" class="primary" ${finished?'':'disabled'}>SIGUIENTE NIVEL</button></div>`);
  $('continueYes').onclick=()=>{ closeDialog(); if(ex('get_phase')===2){paused=true;levelWon();}else paused=false; };
  $('continueNo').onclick=()=>{ closeDialog(); paused=false; playing=false; renderLobby(); show('lobby'); };
  $('continueNext').onclick=()=>{ if(ex('get_phase')!==2)return; closeDialog(); paused=false; playing=false; let p=currentP,l=currentL+1;if(l>10){l=1;p=Math.min(7,p+1)} openLoading(()=>beginLevel(p,l,currentD),'Cargando siguiente nivel'); };
}
function detectNewPart(){
  const parts=ex('get_parts');
  const newly = parts & ~shownPartsMask;
  if(newly){
    for(let i=0;i<8;i++) if(newly & (1<<i)){ shownPartsMask |= (1<<i); showPiecePanel(i); break; }
  }
}
function dialog(title,html){$('modal').classList.remove('upgradeModal','appearanceModal','levelSelectModal');$('modalTitle').textContent=title;$('modalContent').innerHTML=html;$('modal').hidden=false;}
function closeDialog(){$('modal').hidden=true;$('modal').classList.remove('upgradeModal','appearanceModal','levelSelectModal');$('closeModal').hidden=false;}
on('closeModal',closeDialog);
function chooseLevel(p){
  currentP=p;
  const unlocked=ex('get_completed',p);
  const icons=['☿','♀','🌎','♂','♃','♄','♅','♆'];
  const description=['Superficie rocosa y cráteres','Volcanes y nubes densas','Bosques y bases espaciales','Desiertos y cañones','Atmósfera de tormentas','Anillos y plataformas flotantes','Nubes heladas y corrientes','Tormentas eléctricas'][p];
  const levelCells=Array.from({length:10},(_,j)=>{
    const i=j+1,ok=i<=unlocked+1;
    return `<button type="button" class="levelTile${ok?'':' levelLocked'}" data-level="${i}" ${ok?'':'disabled'} aria-label="Nivel ${i}${i===5?', élite':i===10?', jefe':''}${ok?'':', bloqueado'}">
      <span class="levelNumber">${i}</span><small>${i===5?'ÉLITE':i===10?'JEFE':'NIVEL'}</small>${i===5?'<img src="assets/elite-black.png" alt="" class="levelSpecial">':i===10?'<img src="assets/boss-pink.png" alt="" class="levelSpecial">':''}
    </button>`;
  }).join('');
  const difficulties=[
    ['FÁCIL','🟡','60 enemigos','1 botiquín'],
    ['NORMAL','🟠','80 enemigos','3 botiquines'],
    ['DIFÍCIL','🔴','110 enemigos','10 botiquines']
  ].map(([name,icon,enemies,medkits],i)=>`<button type="button" class="difficultyTile" data-diff="${i}"><strong>${name} ${icon}</strong><small>${enemies} · ${medkits}</small></button>`).join('');
  const html=`<div class="levelPicker">
    <header class="levelPickerHead"><span>EXPLORACIÓN PLANETARIA</span><h3>${names[p].toUpperCase()}</h3></header>
    <div class="levelPickerMain">
      <div class="planetVisual" style="--planet-color:${colors[p]}">
        <div class="planetIllustration"><span class="planetRing"></span><span class="planetGlobe ${p===5?'ringed':''}" aria-label="${names[p]}"></span></div>
        <div class="planetVisualLabel">PLANETA ${p+1} · 10 NIVELES</div>
      </div>
      <div class="levelPickerRight"><h4>SELECCIONA UN NIVEL</h4>
        <div class="levelTileGrid">${levelCells}</div>
        <div class="levelSectionDivider"></div>
        <h4>ELIGE LA DIFICULTAD</h4>
        <div class="difficultyGrid">${difficulties}</div>
        <div class="levelPickerFoot"><p id="selectionText">${description}</p><button class="primary" id="enterLevel">▶ JUGAR NIVEL 1</button></div>
      </div>
    </div>
  </div>`;
  dialog('',html);
  $('modal').classList.add('levelSelectModal');
  currentL=Math.min(10,unlocked+1);currentD=1;
  const update=()=>{
    document.querySelectorAll('#modal .levelTile').forEach(b=>{const selected=+b.dataset.level===currentL;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});
    document.querySelectorAll('#modal .difficultyTile').forEach(b=>{const selected=+b.dataset.diff===currentD;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});
    $('selectionText').textContent=`${description}. Nivel ${currentL} · ${[60,80,110][currentD]} enemigos · ${[1,3,10][currentD]} botiquines.`;
    $('enterLevel').textContent=`▶ JUGAR NIVEL ${currentL}`;
  };
  document.querySelectorAll('#modal [data-level]').forEach(b=>b.onclick=()=>{currentL=Number(b.dataset.level);update()});
  document.querySelectorAll('#modal [data-diff]').forEach(b=>b.onclick=()=>{currentD=Number(b.dataset.diff);update()});
  $('enterLevel').onclick=()=>{closeDialog();openLoading(()=>beginLevel(currentP,currentL,currentD),'Preparando mapa de '+names[currentP]);};
  update();
}
function beginLevel(p,l,d){loadedEngine();initAudio();ex('start_level',p,l,d);currentP=p;currentL=l;currentD=d;cameraX=0;cameraY=0;prevPhase=0;frameCount=0;playing=true;paused=false;keys.clear();touchInput.clear();shownPartsMask=ex('get_parts');mouseButtons.left=false;mouseButtons.right=false;mouseActive=false;audioHeroX=ex('hero_x');audioHeroY=ex('hero_y');audioHeroStepAt=0;audioEnemyX.length=0;audioEnemyY.length=0;audioEnemyStepAt.length=0;specialEnemyAt.length=0;specialEnemyNext.length=0;$('closeModal').hidden=false;show('play');if(!renderer)renderer=new CosmicRenderer3D(canvas,$('fxCanvas'));renderer.heroLastPos=null;renderer.heroAnim=0;renderer.heroMovement=0;renderer.enemyMotion.clear();renderer.previousRenderTime=0;resizeCanvas();draw();updateHUD();lastFrame=performance.now();requestAnimationFrame(loop);}
function positionMiniMap(){const hudH=$('hud').getBoundingClientRect().height;const top=Math.ceil(hudH+41);$('play').style.setProperty('--minimap-map-top',top+'px');$('play').style.setProperty('--minimap-hint-top',(top-25)+'px')}
function resizeCanvas(){if(renderer)renderer.resize();positionMiniMap();}
window.addEventListener('resize',()=>{if(screen==='play'){resizeCanvas();draw()}});
function inputMask(){let m=0;const has=(...n)=>n.some(v=>keys.has(v)||touchInput.has(v));if(has('a','arrowleft','left'))m|=1;if(has('d','arrowright','right'))m|=2;if(has('w','arrowup','up'))m|=4;if(has('s','arrowdown','down'))m|=8;if(has('shift','run'))m|=16;if(mouseButtons.left||has('j','tail'))m|=32;if(mouseButtons.right||has(' ','shot'))m|=64;if(has('k','jet'))m|=128;return m;}
window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();keys.add(k);if(k==='escape'&&screen==='play'&&!$('modal').hidden){closeDialog();paused=false;}else if(k==='escape'&&screen==='play')pauseGame();});window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{keys.clear();touchInput.clear();mouseButtons.left=false;mouseButtons.right=false;});
document.querySelectorAll('[data-key]').forEach(b=>{const val=b.dataset.key;b.addEventListener('pointerdown',e=>{e.preventDefault();touchInput.add(val);try{b.setPointerCapture(e.pointerId)}catch(_){}});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>touchInput.delete(val))});
const joystick=$('joystick'),joystickKnob=$('joystickKnob');let joystickPointer=null;
function updateJoystick(e){if(joystickPointer===null)return;const r=joystick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,max=r.width*.36;let dx=e.clientX-cx,dy=e.clientY-cy;const len=Math.hypot(dx,dy),scale=len>max?max/len:1;dx*=scale;dy*=scale;joystickKnob.style.transform=`translate(${dx}px,${dy}px)`;for(const k of ['left','right','up','down'])touchInput.delete(k);if(Math.abs(dx)>max*.25)touchInput.add(dx<0?'left':'right');if(Math.abs(dy)>max*.25)touchInput.add(dy<0?'up':'down');}
function releaseJoystick(){joystickPointer=null;joystickKnob.style.transform='translate(0,0)';for(const k of ['left','right','up','down'])touchInput.delete(k);}
if(joystick){joystick.addEventListener('pointerdown',e=>{e.preventDefault();joystickPointer=e.pointerId;try{joystick.setPointerCapture(e.pointerId)}catch(_){ }updateJoystick(e)});joystick.addEventListener('pointermove',updateJoystick);for(const ev of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(ev,releaseJoystick);}
function loop(time){if(!playing||screen!=='play')return;requestAnimationFrame(loop);if(paused)return;const dt=Math.min(.08,(time-lastFrame)/1000);lastFrame=time;let iterations=Math.min(4,Math.round(dt*60));aimEngine();const mask=inputMask(),oldEnergy=ex('hero_energy'),oldHp=ex('hero_hp'),oldEnemies=[];for(let i=0;i<ex('enemy_total');i++)oldEnemies[i]=[ex('enemy_x',i),ex('enemy_y',i)];touchAim(mask);for(let i=0;i<iterations;i++)ex('step',mask);visualAttacks(mask,oldEnergy);soundGameplay(mask,oldHp,oldEnemies);const sporeFired=ex('proj_fired');if(sporeFired!==lastSporeFired){lastSporeFired=sporeFired;if(audioCtx)sporeSpit();}specialGameplay();detectNewPart();frameCount++;if(frameCount%8===0){updateHUD();if(ex('get_phase')!==prevPhase){prevPhase=ex('get_phase');if(prevPhase===2){paused=true;setTimeout(()=>{if(screen==='play'&&$('modal').hidden)levelWon()},200)}}if(ex('get_over')){paused=true;loseGame();}}draw();}
function updateHUD(){const hp=Math.ceil(ex('hero_hp')),maxHp=ex('hero_max_hp'),en=Math.ceil(ex('hero_energy')),maxEn=ex('hero_max_energy'),st=Math.ceil(ex('hero_stamina')),maxSt=10+(ex('get_upgrade',4)-1)*3,jp=Math.ceil(ex('hero_jetpack')),su=Math.ceil(ex('hero_suit')),maxSu=ex('hero_max_suit');$('hudPlanet').textContent=`${names[currentP].toUpperCase()} · NIVEL ${currentL}`;$('hudLifeValue').textContent=`${hp}/${maxHp}`;$('hudEnergyValue').textContent=`${en}/${maxEn}`;$('hudRunValue').textContent=`${st}/${maxSt}`;$('hudLifeBar').style.width=`${Math.max(0,Math.min(100,hp/maxHp*100))}%`;$('hudEnergyBar').style.width=`${Math.max(0,Math.min(100,en/maxEn*100))}%`;$('hudRunBar').style.width=`${Math.max(0,Math.min(100,st/maxSt*100))}%`;$('hudJetWrap').hidden=!gasPlanet(currentP);$('jetBtn').style.display=gasPlanet(currentP)?'':'none';$('hudJetValue').textContent=`${jp}/50`;$('hudJetBar').style.width=`${Math.max(0,Math.min(100,jp/50*100))}%`;$('hudSuitValue').textContent=`${su}/${maxSu}`;$('hudSuitBar').style.width=`${Math.max(0,Math.min(100,su/maxSu*100))}%`;$('hudEnemy').textContent=`ALIENS ${ex('total_kills')}/${ex('target_kills')}`;$('levelObjective').textContent=(ex('get_phase')===3?'TODOS DERROTADOS · FALTA PIEZA':(ex('get_parts')&(1<<currentP))?'PIEZA ✓ · DERROTÁ ENEMIGOS':'BUSCÁ PIEZA + DERROTÁ ENEMIGOS');const sec=ex('get_elapsed');$('hudTime').textContent=`${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`}
function draw(){
 if(!engine||screen!=='play')return;
 if(!renderer)renderer=new CosmicRenderer3D(canvas,$('fxCanvas'));
 const hero={x:ex('hero_x'),y:ex('hero_y'),dir:ex('hero_dir'),aimX:ex('hero_aim_x'),aimY:ex('hero_aim_y')};
 const enemies=[]; for(let i=0;i<ex('enemy_total');i++)if(ex('enemy_alive',i))enemies.push({id:i,x:ex('enemy_x',i),y:ex('enemy_y',i),type:ex('enemy_type',i),hp:ex('enemy_hp',i),max:ex('enemy_max_hp',i)});
 const spores=[];for(let i=0;i<ex('proj_total');i++)if(ex('proj_alive',i))spores.push({x:ex('proj_x',i),y:ex('proj_y',i)});
 const pickups=[];for(let i=0;i<ex('pickup_total');i++)if(ex('pickup_alive',i))pickups.push({x:ex('pickup_x',i),y:ex('pickup_y',i),type:ex('pickup_type',i)});
 let now=performance.now()/1000;renderer.render(hero,enemies,pickups,spores,currentP,now,suitColor,suitBrightness,{tail:Math.max(0,1-(now-attackTail)/.35)});
 if(frameCount%7===0)drawMini();
}
function drawMini(){
 const w=mini.width,h=mini.height;
 mctx.clearRect(0,0,w,h);
 mctx.fillStyle='#172534';mctx.fillRect(0,0,w,h);
 // Cada punto indica su posición dentro del mundo de 8.000 × 2.600.
 const mapPoint=(x,y)=>[x/ex('world_w')*w,y/ex('world_h')*h];
 let ordinaryAlive=0;
 for(let i=0;i<ex('enemy_total');i++)if(ex('enemy_alive',i)){
   const [px,py]=mapPoint(ex('enemy_x',i),ex('enemy_y',i));
   const type=ex('enemy_type',i);
   if(type===0)ordinaryAlive++;
   mctx.fillStyle=type===2?'#dd8f94':type===1?'#b9a1df':type===3?'#c9d96a':'#90b6a5';
   mctx.fillRect(px-1,py-1,type?4:2,type?4:2);
 }
 let hasPiece=false;
 const reveal=ordinaryAlive<=5 || (ex('get_phase')===2 && (currentL===5||currentL===10));
 for(let i=0;i<ex('pickup_total');i++)if(ex('pickup_alive',i)){
   const type=ex('pickup_type',i);
   if(type===2){hasPiece=true;if(!reveal)continue;}
   const [px,py]=mapPoint(ex('pickup_x',i),ex('pickup_y',i));
   if(type===2){
     // Cohete amarillo con pulso luminoso: pieza revelada en el radar.
     const pulse=3+Math.sin(performance.now()/260)*1.3;
     mctx.strokeStyle='#fff1ad';mctx.lineWidth=1.5;
     mctx.beginPath();mctx.arc(px,py,pulse+3,0,Math.PI*2);mctx.stroke();
     mctx.fillStyle='#ffd16a';mctx.beginPath();mctx.arc(px,py,3.1,0,Math.PI*2);mctx.fill();
   }else{
     mctx.fillStyle=type===0?'#e3c4c4':'#81cbd7';
     mctx.fillRect(px-1.5,py-1.5,3,3);
   }
 }
 const [hx,hy]=mapPoint(ex('hero_x'),ex('hero_y'));
 mctx.fillStyle='#ffe2aa';mctx.beginPath();mctx.arc(hx,hy,4,0,Math.PI*2);mctx.fill();
 const hint=$('miniMapHint');
 if(hasPiece){
   hint.textContent=reveal?'🚀 PIEZA REVELADA EN EL RADAR':`🔒 PIEZA OCULTA · ${ordinaryAlive} ALIENS`;
   hint.classList.toggle('revealed',reveal);
 }else{
   hint.textContent='🚀 PIEZA RECOGIDA';hint.classList.remove('revealed');
 }
}
function visualAttacks(mask,wasEnergy){
  const now=performance.now()/1000,x=ex('hero_x')/75,z=ex('hero_y')/75;
  if((mask&32)&&now-shownTail>.44){shownTail=now;attackTail=now;catTailAttack();renderer?.emitTail(x,z,now)}
  const energy=ex('hero_energy');if((mask&64)&&energy<wasEnergy&&now-shownShot>.16){shownShot=now;catShot();const tx=ex('hero_aim_x')/75,tz=ex('hero_aim_y')/75;renderer?.emitShot(x,z,tx,tz,now);}

}
function pauseGame(){if(screen!=='play')return;paused=true;dialog('⏸ JUEGO EN PAUSA','<div class="buttonGrid"><button id="unpause">▶ REANUDAR</button><button id="exit">🚪 SALIR</button><button id="save">💾 GUARDAR</button><button id="loadSave">🔄 RETORNAR</button></div><p class="info">Tu progreso se guarda en este navegador.</p>');$('unpause').onclick=()=>{closeDialog();paused=false;lastFrame=performance.now()};$('exit').onclick=()=>askExit();$('save').onclick=()=>saveSlots();$('loadSave').onclick=()=>loadSlots(false);}
on('pauseBtn',pauseGame);
function askExit(){dialog('¿Seguro que quieres salir?','<div class="buttonGrid"><button id="confirmExit">SÍ, SALIR</button><button id="cancelExit">CANCELAR</button></div>');$('confirmExit').onclick=()=>{closeDialog();playing=false;paused=false;renderLobby();show('lobby')};$('cancelExit').onclick=pauseGame;}
function levelWon(){dialog('⭐ ¡NIVEL SUPERADO!',`<p>Completaste <b>${names[currentP]} · Nivel ${currentL}</b>.</p><p>Enemigos derrotados: ${ex('total_kills')}. Estrellas azules equivalentes: ${ex('get_stars')}. Piezas de cohete: ${bitCount(ex('get_parts'))}/8.</p><div class="buttonGrid"><button id="backLobby">LOBBY</button><button id="nextLevel">SIGUIENTE NIVEL</button></div>`);$('backLobby').onclick=()=>{closeDialog();playing=false;renderLobby();show('lobby')};$('nextLevel').onclick=()=>{closeDialog();playing=false;let p=currentP,l=currentL+1;if(l>10){l=1;p=Math.min(7,p+1)}openLoading(()=>beginLevel(p,l,currentD),'Cargando siguiente nivel')};}
function loseGame(){dialog('💔 TE QUEDASTE SIN VIDA','<p>Podés volver a intentar este nivel o retornar al lobby.</p><div class="buttonGrid"><button id="retry">REINTENTAR</button><button id="backLobby">LOBBY</button></div>');$('retry').onclick=()=>{closeDialog();playing=false;openLoading(()=>beginLevel(currentP,currentL,currentD),'Reiniciando nivel')};$('backLobby').onclick=()=>{closeDialog();playing=false;renderLobby();show('lobby')}}
function getSave(){return {planet:currentP,level:currentL,diff:currentD,x:ex('hero_x'),y:ex('hero_y'),hp:ex('hero_hp'),energy:ex('hero_energy'),stamina:ex('hero_stamina'),jet:ex('hero_jetpack'),suit:ex('hero_suit'),stars:ex('get_stars'),parts:ex('get_parts'),complete:names.map((_,i)=>ex('get_completed',i)),upgrades:Array.from({length:7},(_,i)=>ex('get_upgrade',i)),elapsed:ex('get_elapsed'),color:suitColor,brightness:suitBrightness,saved:new Date().toLocaleString('es-PY')}}
function saveSlots(){let content='<p>Elegí una de las cuatro casillas para guardar tu progreso.</p><div class="buttonGrid">';for(let i=1;i<=4;i++){let x=JSON.parse(localStorage.getItem('cosmic_cpp_save_'+i)||'null');content+=`<button data-slot="${i}">💾 CASILLA ${i}<br><small>${x?names[x.planet]+' · Nivel '+x.level:'VACÍA'}</small></button>`;}content+='</div>';dialog('GUARDAR PARTIDA',content);document.querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>{localStorage.setItem('cosmic_cpp_save_'+b.dataset.slot,JSON.stringify(getSave()));dialog('PARTIDA GUARDADA',`<p>Se guardó en la casilla ${b.dataset.slot}.</p><button id="backPause">CONTINUAR</button>`);$('backPause').onclick=()=>{closeDialog();if(screen==='play'){paused=false;lastFrame=performance.now()}}})}
function loadSlots(fromStart){if(!engine)loadedEngine();let content='<p>Elegí la partida que querés continuar.</p><div class="buttonGrid">';for(let i=1;i<=4;i++){const x=JSON.parse(localStorage.getItem('cosmic_cpp_save_'+i)||'null');content+=`<button data-load="${i}" ${x?'':'disabled'}>CASILLA ${i}<br><small>${x?names[x.planet]+' · Nivel '+x.level+' · '+x.saved:'VACÍA'}</small></button>`;}content+='</div>';dialog('RETORNAR A UNA PARTIDA',content);document.querySelectorAll('[data-load]').forEach(b=>b.onclick=()=>{const x=JSON.parse(localStorage.getItem('cosmic_cpp_save_'+b.dataset.load));if(!x)return;closeDialog();playing=false;openLoading(()=>{const co=x.complete||Array(8).fill(0),up=Array.from({length:7},(_,i)=>x.upgrades&&x.upgrades[i]!==undefined?x.upgrades[i]:1);ex('restore_meta',x.stars,x.parts,...co,...up,x.elapsed);suitColor=x.color||suitColor;suitBrightness=x.brightness||100;beginLevel(x.planet,x.level,x.diff);ex('restore_position',x.x,x.y,x.hp,x.energy,x.stamina,x.jet,x.suit!==undefined?x.suit:ex('hero_max_suit'));updateHUD()},'Recuperando partida guardada')})}
on('savesBtn',()=>loadSlots(false));
const UPGRADE_NAMES=['Fuerza','Vida','Inteligencia','Velocidad','Resistencia','Daño meteoritos','Traje'];
const UPGRADE_ICONS=['⚔️','💚','🧠','➤','▣','☄️','🛡️'];
function openUpgrades(){
  const available=ex('get_stars');
  const yellowEarned=names.filter((_,i)=>ex('get_completed',i)>=10).length;
  const rows=UPGRADE_NAMES.map((name,i)=>{
    const lv=ex('get_upgrade',i), max=lv>=10;
    const percentage=(lv/10)*100;
    return `<div class="upgradeItem">
      <span class="upgradeIcon" aria-hidden="true">${UPGRADE_ICONS[i]}</span>
      <div class="upgradeDetails">
        <div class="upgradeName">${name}</div>
        <div class="upgradeMeta"><span>Nivel ${lv}/10</span><span>${max?'MÁXIMO':'Costo: ★ 1'}</span></div>
        <div class="upgradeTrack" role="progressbar" aria-label="${name}" aria-valuemin="1" aria-valuemax="10" aria-valuenow="${lv}"><div style="width:${percentage}%"></div></div>
      </div>
      <button class="upgradePlus" data-up="${i}" aria-label="Mejorar ${name}" title="${max?'Nivel máximo':available<1?'Necesitás una estrella':'Mejorar por una estrella'}" ${max||available<1?'disabled':''}>+</button>
    </div>`;
  }).join('');
  dialog('MEJORAS DEL ASTRONAUTA 🔰',`<div class="upgradesPanel">${rows}<footer class="upgradeFooter"><span>Máximo nivel: <b>10</b></span><span>✦ <b>${available}</b> azules equivalentes · <b>★ ${yellowEarned}</b> amarillas ganadas</span></footer></div>`);
  $('modal').classList.add('upgradeModal');
  document.querySelectorAll('.upgradePlus[data-up]').forEach(button=>button.onclick=()=>{
    const old=ex('get_upgrade',+button.dataset.up);
    const result=ex('upgrade_stat',+button.dataset.up);
    if(result && ex('get_upgrade',+button.dataset.up)>old){
      openUpgrades();
      if(screen==='lobby')renderLobby();
    }
  });
}
on('upgradesBtn',openUpgrades);
const COSMIC_PALETTE=['#ea4b62','#3888e9','#f4cc4d','#4eba78','#ee8b49','#9863cf','#ea6bb2','#60c5d8','#35b6a9','#e1e6ed','#38435a','#c8a451'];
const CAT_APPEARANCE_KEY='cosmic_cat_appearance_v2';
let suitBlur=0,suitContrast=100;
try{const savedAppearance=JSON.parse(localStorage.getItem(CAT_APPEARANCE_KEY)||'null');if(savedAppearance){suitColor=savedAppearance.color||suitColor;suitBrightness=savedAppearance.brightness??100;suitBlur=savedAppearance.blur??0;suitContrast=savedAppearance.contrast??100;}}catch(_){}
function openAppearance(){
 const initial={color:suitColor,brightness:suitBrightness,blur:suitBlur,contrast:suitContrast};
 const draft={...initial};
 $('modal').classList.remove('upgradeModal');$('modal').classList.add('appearanceModal');
 dialog('APARIENCIA ♻',`<div class="appearanceBody">
 <div class="appearancePreview"><div id="previewAvatar" class="appearanceAvatar">${CAT_PREVIEW_SVG}</div><div class="appearancePreviewCaption">VISTA PREVIA · GATO ASTRONAUTA</div></div>
 <div class="appearanceSettings"><h3>COLORES PRIMARIOS Y SECUNDARIOS</h3>
 <div class="appearancePalette">${COSMIC_PALETTE.map(c=>`<button data-suit="${c}" type="button" class="appearanceSwatch" style="background:${c}" aria-label="Traje color ${c}"></button>`).join('')}</div>
 <h3>CARRUSEL DE COLORES PERSONALIZADO</h3>
 <input id="suitHue" class="hueCarousel" type="range" min="0" max="360" value="120" step="1" aria-label="Elegir tono del traje" />
 <p class="appearanceSub">Deslizá para recorrer los tonos.</p><div class="appearanceControls"><h3>AJUSTES DEL TRAJE</h3>
 <label for="suitBlur">Difuminar <output id="suitBlurNum">${draft.blur} px</output></label><input id="suitBlur" type="range" min="0" max="8" step=".5" value="${draft.blur}" />
 <label for="suitContrast">Nitidez / contraste <output id="suitContrastNum">${draft.contrast}%</output></label><input id="suitContrast" type="range" min="70" max="160" step="1" value="${draft.contrast}" />
 <label for="suitLight">Más claro / más oscuro <output id="suitLightNum">${draft.brightness}%</output></label><input id="suitLight" type="range" min="50" max="150" step="1" value="${draft.brightness}" />
 </div><div class="appearanceButtons"><button type="button" id="resetAppearance">RESTABLECER</button><button type="button" class="primary" id="saveAppearance">GUARDAR APARIENCIA</button></div></div></div>`);
 $('modal').classList.add('appearanceModal');
 $('modalTitle').textContent='APARIENCIA ♻';
 const preview=$('previewAvatar');
 const refresh=()=>{
   preview.style.setProperty('--preview-suit',draft.color);
   preview.style.filter=`blur(${draft.blur}px) contrast(${draft.contrast}%) brightness(${draft.brightness}%)`;
   $('suitBlurNum').textContent=draft.blur+' px';$('suitContrastNum').textContent=draft.contrast+'%';$('suitLightNum').textContent=draft.brightness+'%';
   document.querySelectorAll('[data-suit]').forEach(b=>b.classList.toggle('selected',b.dataset.suit.toLowerCase()===draft.color.toLowerCase()));
 };
 document.querySelectorAll('[data-suit]').forEach(b=>b.addEventListener('click',()=>{draft.color=b.dataset.suit;refresh()}));
 $('suitHue').addEventListener('input',e=>{draft.color=hslToHex(Number(e.target.value),85,60);refresh()});
 $('suitBlur').addEventListener('input',e=>{draft.blur=Number(e.target.value);refresh()});
 $('suitContrast').addEventListener('input',e=>{draft.contrast=Number(e.target.value);refresh()});
 $('suitLight').addEventListener('input',e=>{draft.brightness=Number(e.target.value);refresh()});
 $('resetAppearance').addEventListener('click',()=>{Object.assign(draft,{color:'#d8d9e1',brightness:100,blur:0,contrast:100});$('suitBlur').value=0;$('suitContrast').value=100;$('suitLight').value=100;refresh()});
 $('saveAppearance').addEventListener('click',()=>{suitColor=draft.color;suitBrightness=draft.brightness;suitBlur=draft.blur;suitContrast=draft.contrast;try{localStorage.setItem(CAT_APPEARANCE_KEY,JSON.stringify(draft))}catch(e){console.warn('No se guardó la preferencia',e)}closeDialog();});
 $('closeModal').onclick=closeDialog;
 refresh();
}
function hslToHex(h,s,l){s/=100;l/=100;const a=s*Math.min(l,1-l);const f=n=>{const k=(n+h/30)%12;const c=l-a*Math.max(-1,Math.min(k-3,9-k,1));return Math.round(255*c).toString(16).padStart(2,'0')};return '#'+f(0)+f(8)+f(4)}
const CAT_PREVIEW_SVG="<svg viewBox=\"0 0 260 330\" role=\"img\" aria-label=\"Vista previa del gato astronauta\"><g stroke=\"#172b4e\" stroke-width=\"8\" stroke-linejoin=\"round\" stroke-linecap=\"round\"><path d=\"M89 230 Q48 245 52 277 Q61 293 82 270\" fill=\"none\" stroke=\"#b8b9c7\"/><path d=\"M92 191 L163 191 Q193 213 181 281 L78 281 Q67 221 92 191\" fill=\"var(--preview-suit)\"/><path d=\"M84 278 L116 278 115 301 Q93 319 79 296Z\" fill=\"#eef0ee\"/><path d=\"M147 278 L177 278 179 301 Q163 319 145 296Z\" fill=\"#eef0ee\"/><rect x=\"68\" y=\"216\" width=\"23\" height=\"55\" rx=\"11\" fill=\"#a5b4bd\"/><rect x=\"178\" y=\"216\" width=\"23\" height=\"55\" rx=\"11\" fill=\"#a5b4bd\"/><path d=\"M69 73 L79 19 115 54 151 53 190 20 196 79 Q220 115 204 165 Q185 199 130 201 Q75 198 57 160 Q41 120 69 73Z\" fill=\"#efeee8\"/><path d=\"M79 40 L85 72 104 65Z M169 64 L186 41 187 79Z\" stroke=\"#b7a5aa\" fill=\"#d9abb8\"/><ellipse cx=\"99\" cy=\"127\" rx=\"11\" ry=\"15\" fill=\"#172b4e\" stroke=\"none\"/><ellipse cx=\"163\" cy=\"127\" rx=\"11\" ry=\"15\" fill=\"#172b4e\" stroke=\"none\"/><path d=\"M121 151 L140 151 130 163Z\" fill=\"#db939e\" stroke=\"none\"/><path d=\"M130 164 Q117 180 110 166 M130 164 Q140 180 151 166\" fill=\"none\" stroke-width=\"4\"/><ellipse cx=\"131\" cy=\"220\" rx=\"18\" ry=\"19\" fill=\"#b0d4d4\"/><circle cx=\"131\" cy=\"220\" r=\"8\" fill=\"#386d9a\" stroke=\"none\"/></g></svg>";
on('appearanceBtn',openAppearance);
// ===== DISEÑADOR DE MISIÓN ESPACIAL =====
// Basado en los recursos oficiales del reto "Space Mission Design Game" de
// NASA Space Apps 2026: segmentos de misión (lanzado, espacio, tierra, usuario),
// niveles de madurez CML 1-4 de JPL, Δv de órbitas estilo GMAT y el flujo
// objetivo→instrumento del juego de telescopios de NASA/Webb.
const MISSION_OBJECTIVES=[
 {id:'earth',name:'Vigilar la Tierra',icon:'🌍',need:500},
 {id:'space',name:'Observar el universo',icon:'🌌',need:300},
 {id:'sun',name:'Estudiar el Sol',icon:'☀️',need:400},
 {id:'mars',name:'Explorar Marte',icon:'🔴',need:900}];
const MISSION_ORBITS=[
 {id:'leo',name:'Órbita baja (LEO)',dv:'9,4 km/s',comm:0,cost:0},
 {id:'polar',name:'LEO polar',dv:'9,7 km/s',comm:100,cost:10},
 {id:'geo',name:'Geoestacionaria (GEO)',dv:'11,9 km/s',comm:200,cost:30},
 {id:'inter',name:'Interplanetaria',dv:'14,5 km/s',comm:300,cost:50}];
const MISSION_VEHICLES=[
 {id:'small',name:'Lanzador pequeño',cap:1500,cost:55},
 {id:'medium',name:'Lanzador mediano',cap:4000,cost:110},
 {id:'heavy',name:'Lanzador superpesado',cap:12000,cost:190}];
const MISSION_INSTRUMENTS=[
 {id:'cam',name:'Cámara multiespectral',mass:120,power:350,cost:18,comm:0},
 {id:'spect',name:'Espectrómetro',mass:260,power:650,cost:40,comm:0},
 {id:'radar',name:'Radar de imágenes',mass:480,power:1100,cost:65,comm:0},
 {id:'ir',name:'Telescopio infrarrojo',mass:380,power:820,cost:85,comm:0},
 {id:'ka',name:'Antena de alta velocidad',mass:90,power:220,cost:25,comm:400},
 {id:'laser',name:'Comunicación láser',mass:60,power:180,cost:20,comm:600}];
const MISSION_PANEL={mass:70,power:500,cost:12};
const MISSION_BUDGET=200;
let missionState=null;
function missionTotals(st){
 let mass=500,power=150,cost=40,comm=300;
 MISSION_INSTRUMENTS.forEach(i=>{if(st.instruments.has(i.id)){mass+=i.mass;power+=i.power;cost+=i.cost;comm+=i.comm}});
 const p=Math.min(5,st.panels);mass+=p*MISSION_PANEL.mass;power+=p*MISSION_PANEL.power;cost+=p*MISSION_PANEL.cost;
 const orb=MISSION_ORBITS.find(o=>o.id===st.orbit),veh=MISSION_VEHICLES.find(v=>v.id===st.vehicle);
 if(veh)cost+=veh.cost;if(orb)cost+=orb.cost;
 return {mass,power,cost,comm,orb,veh,panels:p};
}
function missionBar(label,val,max,unit){
 if(!max)return `<div class="missionBar"><span>${label}</span><div class="missionTrack"><i style="width:0%"></i></div><b>—</b></div>`;
 const p=Math.min(100,val/max*100),ok=val<=max;
 const color=ok?(val<=max*.85?'#7dc98a':'#e0b45a'):'#e2666b';
 return `<div class="missionBar"><span>${label}</span><div class="missionTrack"><i style="width:${p}%;background:${color}"></i></div><b>${val} / ${max} ${unit}</b></div>`;
}
function missionSteps(st){
 const names=['Objetivo','Órbita+Lanzador','Instrumentos','Revisión','Lanzamiento'];
 return `<div class="missionSteps">`+names.map((n,i)=>`<span class="${st.step>i?'done':''}">CML${i+1} · ${n}</span>`).join('')+`</div>`;
}
function missionMatch(st){
 const ins=st.instruments;
 if(st.obj==='earth'&&ins.has('radar'))return 'NISAR · radar NASA–ISRO';
 if(st.obj==='earth'&&st.orbit==='polar'&&ins.has('cam'))return 'Landsat';
 if(st.obj==='space'&&ins.has('ir'))return st.orbit==='geo'?'Telescopio Webb':'SPHEREx';
 if(st.obj==='mars')return 'Mars Reconnaissance Orbiter';
 if(st.obj==='sun')return 'Parker Solar Probe';
 if(st.obj==='earth'&&ins.has('spect'))return 'Sentinel / Landsat';
 return 'CubeSat de demostración (NASA CSLI)';
}
function renderMissionDialog(){
 const st=missionState;const t=missionTotals(st);
 const obj=MISSION_OBJECTIVES.find(o=>o.id===st.obj);
 const need=(obj?obj.need:0)+(t.orb?t.orb.comm:0);
 const capMax=t.veh?t.veh.cap:0;
 const gen=t.panels*MISSION_PANEL.power;
 const problems=[];
 if(st.step>=3){
  if(t.veh&&t.mass>t.veh.cap)problems.push(`Masa ${t.mass} kg supera la capacidad ${t.veh.cap} kg del lanzador.`);
  if(t.power>gen)problems.push('Potencia insuficiente: agregá paneles solares.');
  if(t.comm<need)problems.push(`Comunicaciones insuficientes: necesitás ${need} y tenés ${t.comm}.`);
 }
 if(t.cost>MISSION_BUDGET)problems.push(`Presupuesto excedido: $${t.cost}M de $${MISSION_BUDGET}M.`);
 let body=missionSteps(st);
 if(st.step===1){
  body+=`<p class="controlQuestion">CML1 · Elegí el objetivo científico (segmento de usuario).</p><div class="missionGrid">`+
   MISSION_OBJECTIVES.map(o=>`<button data-mobj="${o.id}" class="${st.obj===o.id?'selected':''}">${o.icon} ${o.name}<br><small>Comunicación mínima: ${o.need}</small></button>`).join('')+`</div>
   <div class="missionCard"><b>¿Cómo se diseña una misión?</b><p>Según NASA, toda misión avanza por CML de idea a diseño final y se apoya en 4 segmentos: lanzamiento, espacio, tierra y usuario. Vamos a recorrerlos.</p></div>`;
 }else if(st.step===2){
  body+=`<p class="controlQuestion">CML2 · Órbita (Δv) y segmento de lanzamiento.</p><div class="missionGrid">`+
   MISSION_ORBITS.map(o=>`<button data-morbit="${o.id}" class="${st.orbit===o.id?'selected':''}">🛰️ ${o.name}<br><small>Δv ${o.dv} · Com +${o.comm} · $${o.cost}M</small></button>`).join('')+
   MISSION_VEHICLES.map(v=>`<button data-mveh="${v.id}" class="${st.veh&&st.veh.id===v.id?'selected':''}">🚀 ${v.name}<br><small>Capacidad ${v.cap} kg · $${v.cost}M</small></button>`).join('')+`</div>`+
   missionBar('Masa',t.mass,capMax,'kg')+missionBar('Presupuesto',t.cost,MISSION_BUDGET,'M$')+
   `<div class="missionCard"><button id="mNext" class="primary" style="width:100%">CONTINUAR ▶</button></div>`;
 }else if(st.step===3){
  body+=`<p class="controlQuestion">CML3-4 · Instrumentos (segmento espacial) y energía.</p>
  <div class="missionGrid">`+MISSION_INSTRUMENTS.map(i=>`<button data-mins="${i.id}" class="${st.instruments.has(i.id)?'selected':''}">${i.name}<br><small>${i.mass} kg · ${i.power} W · $${i.cost}M${i.comm?' · Com +'+i.comm:''}</small></button>`).join('')+`</div>
  <div class="missionCard"><b>Paneles solares:</b> <button id="mPanelMinus">−</button> <b>${t.panels}</b> <button id="mPanelPlus">+</button> <small>(500 W y 70 kg cada uno)</small></div>`+
  missionBar('Masa',t.mass,capMax,'kg')+missionBar('Potencia',t.power,gen,'W')+
  `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
   <button id="mBack">◀ ATRÁS</button><button id="mNext" class="primary">REVISAR ▶</button></div>`;
 }else if(st.step===4){
  body+=`<p class="controlQuestion">Revisión de ingeniería (punto de diseño).</p>`+
  missionBar('Masa',t.mass,capMax,'kg')+missionBar('Potencia',t.power,gen,'W')+missionBar('Comunicaciones',t.comm,need,'')+missionBar('Presupuesto',t.cost,MISSION_BUDGET,'M$');
  if(problems.length)body+=`<div class="missionIssues">`+problems.map(p=>'⚠️ '+p).join('<br>')+`</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><button id="mBack">◀ ATRÁS</button><button id="mFix">AJUSTAR 🔧</button></div>`;
  else body+=`<div class="missionResult"><b>✅ Diseño viable</b><br><small>Segmentos: lanzamiento ✓ espacio ✓ tierra ✓ usuario ✓</small></div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px"><button id="mBack">◀ ATRÁS</button><button id="mLaunch" class="primary">🚀 LANZAR</button></div>`;
 }else{
  const ok3=t.veh&&t.mass<=capMax&&t.power<=gen&&t.comm>=need&&t.cost<=MISSION_BUDGET;
  const ok2=t.veh&&t.mass<=capMax&&t.comm>=need;
  const stars=ok3?3:(ok2?2:1);
  const match=missionMatch(st);
  body+=`<div class="missionResult"><div class="missionStars">${'★'.repeat(stars)}${'☆'.repeat(3-stars)}</div>
  <b>¡Misión lanzada!</b><p>Tu diseño se parece a la misión real: <b>${match}</b></p>
  <small>Potencia ${t.power} W · Masa ${t.mass} kg · Costo $${t.cost}M · Δv ${t.orb?t.orb.dv:'—'}</small>
  <p><small>CML5 · Operaciones: el segmento de tierra recibe tus datos y el segmento de usuario los analiza. ¡Misión completa!</small></p></div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><button id="mAgain">🔁 DISEÑAR OTRA</button><button id="mSave" class="primary">🏅 GUARDAR MEDALLA</button></div>`;
 }
 dialog('🛰️ MISIÓN ESPACIAL · DISEÑO Y SIMULACIÓN',body);
 document.querySelectorAll('[data-mobj]').forEach(b=>b.onclick=()=>{st.obj=b.dataset.mobj;st.step=2;renderMissionDialog();});
 document.querySelectorAll('[data-morbit]').forEach(b=>b.onclick=()=>{st.orbit=b.dataset.morbit;renderMissionDialog();});
 document.querySelectorAll('[data-mveh]').forEach(b=>b.onclick=()=>{st.vehicle=b.dataset.mveh;renderMissionDialog();});
 document.querySelectorAll('[data-mins]').forEach(b=>b.onclick=()=>{const id=b.dataset.mins;st.instruments.has(id)?st.instruments.delete(id):st.instruments.add(id);renderMissionDialog();});
 if($('mPanelMinus'))$('mPanelMinus').onclick=()=>{st.panels=Math.max(1,st.panels-1);renderMissionDialog();};
 if($('mPanelPlus'))$('mPanelPlus').onclick=()=>{st.panels=Math.min(5,st.panels+1);renderMissionDialog();};
 if($('mBack'))$('mBack').onclick=()=>{st.step=Math.max(1,st.step-1);renderMissionDialog();};
 if($('mNext'))$('mNext').onclick=()=>{if(st.step===1&&!st.obj)return;st.step++;renderMissionDialog();};
 if($('mFix'))$('mFix').onclick=()=>{st.step=3;renderMissionDialog();};
 if($('mLaunch'))$('mLaunch').onclick=()=>{st.step=5;renderMissionDialog();};
 if($('mAgain'))$('mAgain').onclick=openMissionDesigner;
 if($('mSave'))$('mSave').onclick=()=>{try{localStorage.setItem('cosmic_mission_v1',JSON.stringify({stars:3,match:missionMatch(st)}))}catch(_){}closeDialog();renderLobby();};
}
function openMissionDesigner(){missionState={step:1,obj:null,orbit:null,vehicle:null,panels:2,instruments:new Set()};renderMissionDialog();}
on('missionBtn',openMissionDesigner);
// Para evitar pantallas negras la aplicación siempre muestra un mensaje de error.
try{loadedEngine();renderLobby();show('start')}catch(e){crash(e)}
