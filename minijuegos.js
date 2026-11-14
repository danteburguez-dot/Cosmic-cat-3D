'use strict';
// MINIJUEGOS — Modo Oleada y Modo Supervivencia.
// Archivo dedicado: no modifica el juego principal. Reutiliza el renderizador 3D,
// el audio y la entrada del juego base (mismo scope global de scripts clásicos).

// ---------- Perfil independiente por modo ----------
function miniProfile(){let p=null;try{p=JSON.parse(localStorage.getItem('cosmic_mini_v1')||'null')}catch(_){}if(!p)p={oleada:{nivel:1,estrellas:0},supervivencia:{nivel:1}};if(!p.oleada)p.oleada={nivel:1,estrellas:0};if(!p.supervivencia)p.supervivencia={nivel:1};return p;}
function saveMiniProfile(p){try{localStorage.setItem('cosmic_mini_v1',JSON.stringify(p))}catch(_){}}

// ---------- Estado del minijuego ----------
const M_GUN=[1,0,0,0,0,0,0]; // mejoras temporales del minijuego
let miniState=null;

function miniWorldSize(){return {w:3600,h:900};} // pasillo 3D: 3600 x 900

function openMini(){
  const p=miniProfile();
  dialog('🕹️ '+t('mini')+'S','<p>'+t('miniQ')+'</p><div class="buttonGrid"><button id="miniOleada">🌊 '+t('waveTitle')+'<br><small>'+t('miniInfo')+p.oleada.nivel+'/16 · ⭐ '+p.oleada.estrellas+'</small></button><button id="miniSup">♾️ '+t('survTitle')+'<br><small>'+t('miniInfo')+p.supervivencia.nivel+'/8 · '+t('aguantar')+'</small></button></div><button id="miniClose" style="width:100%">'+t('volver')+'</button>');
  $('miniOleada').onclick=()=>openMiniTower();
  $('miniSup').onclick=()=>startMiniSurvival(p.supervivencia.nivel);
  $('miniClose').onclick=closeDialog;
}


// ---------- TORRE estilo torneo (Mortal Kombat) ----------
function openMiniTower(){
  const p=miniProfile();const actual=p.oleada.nivel;
  let rows='';
  for(let i=16;i>=1;i--){
    const lock=i>actual;
    const planeta=Math.floor((i-1)/2);
    rows+='<div class="towerFloor '+(i===actual?'actual':'')+(lock?' locked':'')+'" data-floor="'+i+'"><span class="towerNum">'+i+'</span><span class="towerPlanet">'+names[planeta]+'</span>'+(lock?'<small>🔒</small>':'<small>▶</small>')+'</div>';
  }
  dialog('🌊 '+t('waveTitle'),' <div class="towerBox">'+rows+'</div><p class="info">'+t('towerInfo')+'</p>');
  document.querySelectorAll('.towerFloor').forEach(el=>el.onclick=()=>{
    const n=Number(el.dataset.floor);if(n>actual)return;
    closeDialog();startMiniWave(n);
  });
}


// ---------- Arranque del modo oleada ----------
function startMiniWave(nivel){
  const planeta=Math.floor((nivel-1)/2);
  M_GUN[0]=1;for(let i=1;i<7;i++)M_GUN[i]=0;
  miniState={
    modo:'oleada',nivel,planeta,oleada:1,oleadasTotales:5,titulo:'🌊 '+t('oleadaWord')+' '+nivel+' · '+names[planeta].toUpperCase(),
    hp:100,maxHp:100,escudo:0,
    colaDmg:7,metDmg:5,vel:3.2,
    enemyHpMul:1+(nivel-1)*.25,supDmg:1,supVel:1,
    world:{w:3600,h:900},
    hero:{x:400,y:450,dir:1},
    enemies:[],spores:[],pickups:[],
    kills:0,oleada:1,oleadaKills:5+nivel,
    lastStep:performance.now(),cool:0,shotCool:0,invul:0,
    estrellasGanadas:0
  };
  spawnMiniWave();
  beginMini(miniState.titulo+' · '+t('oleadaWord')+' 1/5');
}


function spawnMiniWave(){
  const st=miniState;
  st.enemies=[];
  const n=5+st.nivel+st.oleada*2;
  for(let i=0;i<n;i++){
    const type=(i%7===3)?3:0; // escupidores entre los enemigos
    spawnMiniEnemy(type);
  }
}

function spawnMiniEnemy(type){
  const st=miniState,W=st.world;
  let x,y,tries=0;
  do{x=300+Math.random()*(W.w-600);y=80+Math.random()*(W.h-160);tries++;}
  while(Math.hypot(x-st.hero.x,y-st.hero.y)<420&&tries<30);
  st.enemies.push({x,y,type,hp:(type===3?14:10)*st.enemyHpMul,max:(type===3?14:10)*st.enemyHpMul,cool:60+Math.floor(Math.random()*80)});
}

// ---------- Arranque del modo supervivencia ----------
function startMiniSurvival(nivel){
  const planeta=Math.min(7,nivel-1);
  M_GUN[0]=1;for(let i=1;i<7;i++)M_GUN[i]=0;
  miniState={
    modo:'supervivencia',nivel,planeta,titulo:'♾️ '+t('survTitle')+' '+nivel+' · '+names[planeta].toUpperCase(),
    hp:100,maxHp:100,escudo:0,
    colaDmg:7,metDmg:5,vel:3.2,
    enemyHpMul:1+(nivel-1)*.3,supDmg:1,supVel:1,
    world:{w:3600,h:900},
    hero:{x:1800,y:450,dir:1},
    enemies:[],spores:[],pickups:[],
    seg:0,spawnTimer:0,spawnEvery:150,
    xp:0,xpNext:8,xpNivel:1,
    kills:0,cool:0,shotCool:0,invul:0,
    jefeSalido:false,eliteSalido:false,supDmg:1,supVel:1
  };
  beginMini(miniState.titulo+' · '+t('aguantar'));
}


function beginMini(titulo){
  show('mini');
  $('miniTitle').textContent=titulo;
  if(!window.__miniRenderer)__miniRenderer=new CosmicRenderer3D($('miniCanvas'),$('miniFx'));
  miniState.running=true;
  miniLoop(performance.now());
}

// ---------- Bucle del minijuego ----------
function miniLoop(time){
  if(!miniState||!miniState.running)return;
  requestAnimationFrame(miniLoop);
  if(miniState.paused)return;
  const dt=Math.min(.08,(time-miniState.lastStep)/1000);
  miniState.lastStep=time;
  const st=miniState;
  // movimiento del gato
  const mask=inputMask();
  let dx=(mask&2?1:0)-(mask&1?1:0),dy=(mask&8?1:0)-(mask&4?1:0);
  const W=st.world;
  if(dx||dy){
    const v=st.vel/Math.hypot(dx,dy);
    st.hero.x=Math.max(60,Math.min(W.w-60,st.hero.x+dx*v));
    st.hero.y=Math.max(60,Math.min(W.h-60,st.hero.y+dy*v));
    if(dx)st.hero.dir=dx>0?1:-1;
  }
  // enemigos van DIRECTO al gato
  for(const e of st.enemies){
    const ddx=st.hero.x-e.x,ddy=st.hero.y-e.y,d=Math.hypot(ddx,ddy)||1;
    const sp=(e.type===2?1.4:2.1)*st.supVel;
    e.x+=ddx/d*sp;e.y+=ddy/d*sp;
    if(st.invul===0&&d<40){damageMini((e.type===2?20:e.type===1?15:e.type===3?7:5)*st.supDmg);e.x-=ddx/d*50;e.y-=ddy/d*50;}
    if(e.cool>0)e.cool--;
    else if(e.type===3&&d<800){e.cool=170;const ux=ddx/d*3,uy=ddy/d*3;st.spores.push({x:e.x,y:e.y,vx:ux,vy:uy,life:300});if(audioCtx)sporeSpit();}
  }
  // esporas
  for(const s of st.spores){s.x+=s.vx;s.y+=s.vy;s.life--;if(s.life<=0){s.dead=true;continue}if(Math.hypot(s.x-st.hero.x,s.y-st.hero.y)<34&&st.invul===0){damageMini(7*st.supDmg);s.dead=true;}}
  st.spores=st.spores.filter(s=>!s.dead);
  // ataques del gato
  if(st.cool>0)st.cool--;
  if((mask&32)&&st.cool===0){st.cool=27;for(const e of st.enemies){if(Math.hypot(e.x-st.hero.x,e.y-st.hero.y)<80){e.hp-=st.colaDmg;if(e.hp<=0){e.dead=true;miniKill(e);}}}}
  if(st.shotCool>0)st.shotCool--;
  if((mask&64)&&st.shotCool===0){st.shotCool=16;let best=null,bd=1e9;for(const e of st.enemies){const d=Math.hypot(e.x-st.hero.x,e.y-st.hero.y);if(d<bd){bd=d;best=e;}}if(best){best.hp-=st.metDmg;if(best.hp<=0){best.dead=true;miniKill(best);}if(audioCtx)catShot();}}
  st.enemies=st.enemies.filter(e=>!e.dead);
  if(st.invul>0)st.invul--;
  // lógica por modo
  if(st.modo==='oleada')miniOleadaTick();else miniSupTick(dt);
  miniDraw(time/1000);
}

function miniKill(e){
  const st=miniState;st.kills++;st.waveKills=(st.waveKills||0)+1;
  if(st.modo==='supervivencia'){st.xp++;if(st.xp>=st.xpNext){st.xp=0;st.xpNext=Math.round(st.xpNext*1.4);st.xpNivel++;miniUpgradePanel();}}
  if(audioCtx)catStep();
}

function damageMini(d){
  const st=miniState;
  const shield=Math.min(st.escudo||0,d);st.escudo=(st.escudo||0)-shield;
  st.hp-=(d-shield);
  st.invul=30;
  if(st.hp<=0){st.hp=0;miniOver();}
}

// ---------- Fin de oleada: panel de mejora + estrellas ----------
function miniOleadaTick(){
  const st=miniState;
  if(st.enemies.length===0){
    st.oleada++;
    st.estrellasGanadas+=2;
    const p=miniProfile();p.oleada.estrellas+=2;saveMiniProfile(p);
    st.running=false;
    if(st.oleada>5){
      p.oleada.nivel=Math.min(16,st.nivel+1);saveMiniProfile(p);
      dialog('⭐ '+t('nivelSuperado'),' <p>'+t('miniInfo')+p.oleada.nivel+'/16 · ⭐ '+p.oleada.estrellas+'</p><div class="buttonGrid"><button id="miniNext">'+t('sigNivel')+'</button><button id="miniLobby2">'+t('volver')+'</button></div>');
      $('miniNext').onclick=()=>{closeDialog();startMiniWave(st.nivel+1);};
      $('miniLobby2').onclick=()=>{closeDialog();show('lobby');};
    }else{
      dialog('🔥 '+t('oleadaWord')+' '+(st.oleada-1)+' · +2 ⭐','<p>'+t('upgradeQ')+'</p><div class="buttonGrid">'+miniUpgradeButtons()+'</div>');
      wireMiniUpgrades(()=>startMiniWave(st.nivel));
    }
  }
}


function miniUpgradeButtons(){
  return '<button id="muHp">❤️ +20 VIDA</button><button id="muTail">🌀 +2 DAÑO COLA</button><button id="muMet">☄️ +2 DAÑO METEORITO</button><button id="muVel">➤ +0.3 VELOCIDAD</button>';
}
function wireMiniUpgrades(continuar){
  const st=miniState;
  $('muHp').onclick=()=>{st.maxHp+=20;st.hp=st.maxHp;closeDialog();continuar();};
  $('muTail').onclick=()=>{st.colaDmg+=2;closeDialog();continuar();};
  $('muMet').onclick=()=>{st.metDmg+=2;closeDialog();continuar();};
  $('muVel').onclick=()=>{st.vel+=.3;closeDialog();continuar();};
}

// ---------- Supervivencia: 20 min, escalado, élite y jefe ----------
function miniSupTick(dt){
  const st=miniState;
  st.seg+=dt;
  const min=Math.floor(st.seg/60);
  $('miniTimer').textContent=String(Math.floor((1200-st.seg)/60)).padStart(2,'0')+':'+String(Math.floor((1200-st.seg)%60)).padStart(2,'0');
  $('miniXp').style.width=Math.min(100,st.xp/st.xpNext*100)+'%';
  $('miniWave').textContent='XP Nv '+st.xpNivel+' · Muertes '+st.kills;
  // aparición progresiva: cada spawnEvery ticks... aparece más seguido con el tiempo
  st.spawnTimer--;
  if(st.spawnTimer<=0){
    st.spawnTimer=st.spawnEvery;
    spawnMiniEnemy(st.seg>600&&Math.random()<.25?3:0);
  }
  st.spawnEvery=Math.max(40,150-Math.floor(st.seg/30)*3);
  // escalado cada 5 minutos: +40%
  const fase=Math.floor(min/5);
  st.supDmg=1+fase*.4;st.supVel=1+fase*.4;
  // élite a los 10 min
  if(min>=10&&!st.eliteSalido){st.eliteSalido=true;st.enemies.push({x:st.hero.x+300,y:st.hero.y,type:1,hp:120*st.enemyHpMul,max:120*st.enemyHpMul,cool:0});}
  // jefe a los 20 min
  if(st.seg>=1200&&!st.jefeSalido){st.jefeSalido=true;st.enemies.push({x:st.hero.x+350,y:st.hero.y,type:2,hp:300*st.enemyHpMul,max:300*st.enemyHpMul,cool:0});
    $('miniTitle').textContent='👑 ¡EL JEFE HA LLEGADO! Eliminalo para ganar';
  }
  // jefe muerto → nivel superado
  if(st.jefeSalido&&st.enemies.length===0){
    st.running=false;
    const p=miniProfile();p.supervivencia.nivel=Math.min(8,st.nivel+1);saveMiniProfile(p);
    dialog('👑 NIVEL '+st.nivel+' SUPERADO','<p>Derrotaste al jefe. Avanzás al nivel '+p.supervivencia.nivel+'.</p><div class="buttonGrid"><button id="miniNext2">SIGUIENTE NIVEL</button><button id="miniLobby3">VOLVER</button></div>');
    $('miniNext2').onclick=()=>{closeDialog();startMiniSurvival(p.supervivencia.nivel);};
    $('miniLobby3').onclick=()=>{closeDialog();show('lobby');};
  }
}

function miniOver(){
  const st=miniState;st.running=false;
  dialog('💀 '+t('miniOver'),' <p>'+t('miniInfo')+st.nivel+' · '+t('muertes')+': '+st.kills+'</p><div class="buttonGrid"><button id="miniRetry">'+t('reintentar')+'</button><button id="miniExit2">'+t('volver')+'</button></div>');
  $('miniRetry').onclick=()=>{closeDialog();st.modo==='oleada'?startMiniWave(st.nivel):startMiniSurvival(st.nivel);};
  $('miniExit2').onclick=()=>{closeDialog();show('lobby');};
}


function miniUpgradePanel(){
  const st=miniState;st.paused=true;
  dialog('⬆️ '+t('xpNivel')+' '+st.xpNivel,'<p>'+t('upgradeQ')+'</p><div class="buttonGrid">'+miniUpgradeButtons()+'</div>');
  wireMiniUpgrades(()=>{st.paused=false;st.lastStep=performance.now();});
}

on('miniBtn',openMini);

// ---------- Dibujo 3D del minijuego (pasillo + personajes) ----------
function miniDraw(now){
  const st=miniState,r=window.__miniRenderer;
  const gl=r.gl;const hx=st.hero.x/75,hz=st.hero.y/75;
  const ratio=r.canvas.width/r.canvas.height;
  r.proj=CosmicRenderer3D.perspective(Math.PI/3,ratio,.2,150);
  const dist=9+(ratio<1?4:0);
  r.cpos=[hx,dist,hz+dist*.5];r.target=[hx,0,hz];r.view=CosmicRenderer3D.lookAt(r.cpos,r.target);
  const fog=['#333842','#564538','#425d56','#6a4c44','#6c6470','#7e7078','#536d84','#364d75'][st.planeta];
  gl.clearColor(...CosmicRenderer3D.rgb(fog),1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(r.program);
  gl.uniform3fv(r.uFog,CosmicRenderer3D.rgb(fog));gl.uniformMatrix4fv(r.uView,false,new Float32Array(r.view));gl.uniformMatrix4fv(r.uProj,false,new Float32Array(r.proj));
  // piso del pasillo con columnas de pared a los costados
  const W=st.world,cx=Math.floor(hx/3),cz=Math.floor(hz/3);
  for(let i=cx-6;i<=cx+6;i++)for(let j=cz-3;j<=cz+3;j++){
    const x=i*3,z=j*3;
    if(x<0||x>W.w||z<0||z>W.h)continue;
    r.draw('cube',x,-.75,z,1.4,.15,1.4,r.colors[st.planeta][0]);
  }
  for(let j=cz-3;j<=cz+3;j++){const z=j*3;r.draw('cube',0,-.2,z,.8,1.6,1.2,'#3d4a55');r.draw('cube',W.w,-.2,z,.8,1.6,1.2,'#3d4a55');}
  // personajes
  for(const e of st.enemies){const ox=e.x/75,oz=e.y/75;if(Math.abs(ox-hx)<24&&Math.abs(oz-hz)<16)r.alien(ox,oz,e.type,now,0,1,Math.hypot(ox-hx,oz-hz),Math.atan2(hx-ox,hz-oz));}
  for(const sp of st.spores){const ox=sp.x/75,oz=sp.y/75;r.draw('sphere',ox,.5,oz,.15,.15,.15,'#8fbf4d');}
  r.cat(hx,hz,st.hero.dir,st.planeta,now,'#d8d9e1',100,0,st.hero.x+300,st.hero.y,0,0);
}
