'use strict';
// MINIJUEGOS — Modo Oleada y Modo Supervivencia.
// Archivo dedicado: no modifica el juego principal. Reutiliza el renderizador 3D,
// el audio y la entrada del juego base (mismo scope global de scripts clásicos).

// ---------- Perfil independiente por modo ----------
function miniProfile(){let p=null;try{p=JSON.parse(localStorage.getItem('cosmic_mini_v1')||'null')}catch(_){}if(!p)p={oleada:{nivel:1,estrellas:0},supervivencia:{nivel:1}};if(!p.oleada)p.oleada={nivel:1,estrellas:0};if(!p.supervivencia)p.supervivencia={nivel:1};return p;}
function saveMiniProfile(p){try{localStorage.setItem('cosmic_mini_v1',JSON.stringify(p))}catch(_){}}

const M_GUN=[1,0,0,0,0,0,0];
let miniState=null;
let miniRenderer=null;
let miniEnemyId=0;

function openMini(){
  const p=miniProfile();
  dialog('🕹️ '+t('mini')+'S','<p>'+t('miniQ')+'</p><div class="buttonGrid"><button id="miniOleada">🌊 '+t('waveTitle')+'<br><small>'+t('miniInfo')+p.oleada.nivel+'/16 · ⭐ '+p.oleada.estrellas+'</small></button><button id="miniSup">♾️ '+t('survTitle')+'<br><small>'+t('miniInfo')+p.supervivencia.nivel+'/8 · '+t('aguantar')+'</small></button></div><button id="miniClose" style="width:100%">'+t('volver')+'</button>');
  $('miniOleada').onclick=()=>openMiniTower();
  $('miniSup').onclick=()=>startMiniSurvival(p.supervivencia.nivel);
  $('miniClose').onclick=closeDialog;
}

// ---------- TORRE estilo torneo ----------
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

// ---------- Arranques ----------
function startMiniWave(nivel){
  const planeta=Math.floor((nivel-1)/2);
  M_GUN[0]=1;for(let i=1;i<7;i++)M_GUN[i]=0;
  const total=5+nivel*2+(1)*2;
  miniState={
    modo:'oleada',nivel,planeta,oleada:1,oleadasTotales:5,titulo:'🌊 '+t('oleadaWord')+' '+nivel+' · '+names[planeta].toUpperCase(),
    hp:100,maxHp:100,escudo:20,maxEscudo:20,escudoT:0,
    colaDmg:7,metDmg:5,vel:3.2,
    enemyHpMul:1+(nivel-1)*.25,supDmg:1,supVel:1,
    world:{w:2400,h:2400},
    hero:{x:1200,y:1200,dir:1},
    enemies:[],spores:[],
    kills:0,oleada:1,
    pend:total,pending:total,spawnTimer:20,spawnEvery:90,
    xp:0,xpNext:8,xpNivel:1,
    lastStep:performance.now(),cool:0,shotCool:0,invul:0,regT:0,
    estrellasGanadas:0
  };
  beginMini(miniState.titulo+' · '+t('oleadaWord')+' 1/5');
}

function startMiniSurvival(nivel){
  const planeta=Math.min(7,nivel-1);
  M_GUN[0]=1;for(let i=1;i<7;i++)M_GUN[i]=0;
  miniState={
    modo:'supervivencia',nivel,planeta,titulo:'♾️ '+t('survTitle')+' '+nivel+' · '+names[planeta].toUpperCase(),
    hp:100,maxHp:100,escudo:20,maxEscudo:20,escudoT:0,
    colaDmg:7,metDmg:5,vel:3.2,
    enemyHpMul:1+(nivel-1)*.3,supDmg:1,supVel:1,
    world:{w:2400,h:2400},
    hero:{x:1200,y:1200,dir:1},
    enemies:[],spores:[],
    seg:0,spawnTimer:0,spawnEvery:150,
    xp:0,xpNext:8,xpNivel:1,
    lastStep:performance.now(),cool:0,shotCool:0,invul:0,regT:0,
    jefeSalido:false,eliteSalido:false,supDmg:1,supVel:1
  };
  beginMini(miniState.titulo+' · '+t('aguantar'));
}

function spawnMiniEnemy(type){
  const st=miniState,W=st.world;
  let x,y,tries=0;
  do{x=120+Math.random()*(W.w-240);y=120+Math.random()*(W.h-240);tries++;}
  while(Math.hypot(x-st.hero.x,y-st.hero.y)<420&&tries<30);
  st.enemies.push({id:miniEnemyId++,x,y,type,hp:(type===3?14:10)*st.enemyHpMul,max:(type===3?14:10)*st.enemyHpMul,cool:60+Math.floor(Math.random()*80)});
}

function beginMini(titulo){
  show('mini');
  miniRenderer=new CosmicRenderer3D($('miniCanvas'),$('miniFx'));
  miniState.titulo=titulo;
  $('miniTitle').textContent=titulo;
  miniState.running=true;
  miniState.lastStep=performance.now();
  requestAnimationFrame(miniLoop);
}

// ---------- Bucle ----------
function miniLoop(time){
  if(!miniState||!miniState.running)return;
  requestAnimationFrame(miniLoop);
  if(miniState.paused)return;
  const st=miniState;
  const dt=Math.min(.08,(time-st.lastStep)/1000);
  st.lastStep=time;
  const now=time/1000;
  const mask=inputMask();
  const W=st.world;
  // movimiento del gato
  let dx=(mask&2?1:0)-(mask&1?1:0),dy=(mask&8?1:0)-(mask&4?1:0);
  if(dx||dy){
    const v=st.vel/Math.hypot(dx,dy);
    st.hero.x=Math.max(60,Math.min(W.w-60,st.hero.x+dx*v));
    st.hero.y=Math.max(60,Math.min(W.h-60,st.hero.y+dy*v));
    if(dx)st.hero.dir=dx>0?1:-1;
  }
  // regeneración del traje: 1/s tras 3 s sin daño
  if(st.escudo<st.maxEscudo&&time-st.escudoT>3000&&time-st.regT>1000){st.escudo=Math.min(st.maxEscudo,st.escudo+1);st.regT=time;}
  // enemigos van DIRECTO al gato
  for(const e of st.enemies){
    const ddx=st.hero.x-e.x,ddy=st.hero.y-e.y,d=Math.hypot(ddx,ddy)||1;
    const sp=(e.type===2?1.4:2.1)*st.supVel;
    e.x+=ddx/d*sp;e.y+=ddy/d*sp;
    if(st.invul===0&&d<40){damageMini((e.type===2?20:e.type===1?15:e.type===3?7:5)*st.supDmg);e.x-=ddx/d*50;e.y-=ddy/d*50;}
    if(e.cool>0)e.cool--;
    else if(e.type===3&&d<800){e.cool=170;st.spores.push({x:e.x,y:e.y,vx:ddx/d*3,vy:ddy/d*3,life:300});if(audioCtx)sporeSpit();}
  }
  for(const sp of st.spores){sp.x+=sp.vx;sp.y+=sp.vy;sp.life--;if(sp.life<=0){sp.dead=true;continue}if(Math.hypot(sp.x-st.hero.x,sp.y-st.hero.y)<34&&st.invul===0){damageMini(7*st.supDmg);sp.dead=true;}}
  st.spores=st.spores.filter(s=>!s.dead);
  // ataques del gato
  if(st.cool>0)st.cool--;
  if((mask&32)&&st.cool===0){st.cool=27;for(const e of st.enemies){if(Math.hypot(e.x-st.hero.x,e.y-st.hero.y)<80){e.hp-=st.colaDmg;if(e.hp<=0){e.dead=true;miniKill(e);}}}}
  if(st.shotCool>0)st.shotCool--;
  if((mask&64)&&st.shotCool===0){st.shotCool=16;let best=null,bd=1e9;for(const e of st.enemies){const d=Math.hypot(e.x-st.hero.x,e.y-st.hero.y);if(d<bd){bd=d;best=e;}}if(best){best.hp-=st.metDmg;if(best.hp<=0){best.dead=true;miniKill(best);}if(audioCtx)catShot();}}
  st.enemies=st.enemies.filter(e=>!e.dead);
  if(st.invul>0)st.invul--;
  // lógica por modo
  if(st.modo==='oleada'){
    // aparición progresiva y creciente dentro de la oleada
    if(st.pending>0){st.spawnTimer--;if(st.spawnTimer<=0){spawnMiniEnemy(Math.random()<.15?3:0);st.pending--;st.spawnTimer=Math.max(30,st.spawnEvery-st.kills*2);}}
    miniOleadaTick();
  }else miniSupTick(dt);
  updateMiniHud();
  miniDraw(now);
}

function miniKill(e){
  const st=miniState;st.kills++;
  if(st.modo==='supervivencia'){st.xp++;if(st.xp>=st.xpNext){st.xp=0;st.xpNext=Math.round(st.xpNext*1.4);st.xpNivel++;miniUpgradePanel();}}
  if(audioCtx)catStep();
}

function damageMini(d){
  const st=miniState;
  const shield=Math.min(st.escudo||0,d);st.escudo=(st.escudo||0)-shield;
  st.hp-=(d-shield);
  st.escudoT=performance.now();
  st.invul=30;
  if(st.hp<=0){st.hp=0;miniOver();}
}

// ---------- HUD del minijuego (igual estética que el modo historia) ----------
function updateMiniHud(){
  const st=miniState;
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
  set('mLifeVal',Math.max(0,Math.ceil(st.hp))+'/'+st.maxHp);
  const lb=document.getElementById('mLifeBar');if(lb)lb.style.width=Math.max(0,Math.min(100,st.hp/st.maxHp*100))+'%';
  set('mSuitVal',Math.ceil(st.escudo)+'/'+st.maxEscudo);
  const sb=document.getElementById('mSuitBar');if(sb)sb.style.width=Math.max(0,Math.min(100,st.escudo/st.maxEscudo*100))+'%';
  set('miniKills',t('aliens')+' '+st.kills+'/'+(st.modo==='oleada'?st.oleadaKills*st.oleada:st.kills));
  if(st.modo==='supervivencia'){
    const rest=Math.max(0,1200-st.seg);
    set('miniTimer',String(Math.floor(rest/60)).padStart(2,'0')+':'+String(Math.floor(rest%60)).padStart(2,'0'));
    const xp=document.getElementById('miniXp');if(xp)xp.style.width=Math.min(100,st.xp/st.xpNext*100)+'%';
    set('miniWave',t('xpNivel')+' '+st.xpNivel+' · '+t('muertes')+' '+st.kills);
    set('miniObj',st.jefeSalido?t('jefeLlego'):t('aguantar'));
  }else{
    set('miniTimer',t('oleadaWord')+' '+st.oleada+'/'+st.oleadasTotales);
    set('miniWave',t('enemiesWord')+' '+(st.pending+st.enemies.length));
    set('miniObj',t('oleadaWord')+' '+st.oleada+'/'+st.oleadasTotales+' · '+t('enemiesWord')+' '+(st.pending+st.enemies.length));
  }
  drawMiniMap();
}

function drawMiniMap(){
  const st=miniState,c=$('miniMap'),g=c.getContext('2d');
  const w=c.width,h=c.height;
  g.clearRect(0,0,w,h);
  g.fillStyle='#172534';g.fillRect(0,0,w,h);
  const mp=(x,y)=>[x/st.world.w*w,y/st.world.h*h];
  for(const e of st.enemies){const [px,py]=mp(e.x,e.y);g.fillStyle=e.type===2?'#dd8f94':e.type===1?'#b9a1df':e.type===3?'#c9d96a':'#90b6a5';g.fillRect(px-1.5,py-1.5,e.type?4:2,e.type?4:2);}
  const [hx,hy]=mp(st.hero.x,st.hero.y);
  g.fillStyle='#ffe2aa';g.beginPath();g.arc(hx,hy,4,0,Math.PI*2);g.fill();
}

// ---------- Fin de oleada: panel de mejora + estrellas ----------
function miniOleadaTick(){
  const st=miniState;
  if(st.pending===0&&st.enemies.length===0){
    st.oleada++;
    st.estrellasGanadas+=2;
    const p=miniProfile();p.oleada.estrellas+=2;saveMiniProfile(p);
    st.running=false;
    if(st.oleada>st.oleadasTotales){
      p.oleada.nivel=Math.min(16,st.nivel+1);saveMiniProfile(p);
      dialog('⭐ '+t('nivelSuperado'),' <p>'+t('miniInfo')+p.oleada.nivel+'/16 · ⭐ '+p.oleada.estrellas+'</p><div class="buttonGrid"><button id="miniNext">'+t('sigNivel')+'</button><button id="miniLobby2">'+t('volver')+'</button></div>');
      $('miniNext').onclick=()=>{closeDialog();startMiniWave(st.nivel+1);};
      $('miniLobby2').onclick=()=>{closeDialog();show('lobby');};
    }else{
      const total=5+st.nivel*2+(st.oleada)*2;
      st.pending=total;st.spawnTimer=20;st.spawnEvery=Math.max(60,90-st.nivel*3);
      dialog('🔥 '+t('oleadaWord')+' '+(st.oleada-1)+' · +2 ⭐','<p>'+t('upgradeQ')+'</p><div class="buttonGrid">'+miniUpgradeButtons()+'</div>');
      wireMiniUpgrades(()=>{st.running=true;st.lastStep=performance.now();requestAnimationFrame(miniLoop);});
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

// ---------- Supervivencia ----------
function miniSupTick(dt){
  const st=miniState;
  st.seg+=dt;
  const min=Math.floor(st.seg/60);
  st.spawnTimer--;
  if(st.spawnTimer<=0){
    st.spawnTimer=st.spawnEvery;
    spawnMiniEnemy(st.seg>600&&Math.random()<.25?3:0);
  }
  st.spawnEvery=Math.max(40,150-Math.floor(st.seg/30)*3);
  const fase=Math.floor(min/5);
  st.supDmg=1+fase*.4;st.supVel=1+fase*.4;
  if(min>=10&&!st.eliteSalido){st.eliteSalido=true;st.enemies.push({id:miniEnemyId++,x:st.hero.x+300,y:st.hero.y,type:1,hp:120*st.enemyHpMul,max:120*st.enemyHpMul,cool:0});}
  if(st.seg>=1200&&!st.jefeSalido){
    st.jefeSalido=true;
    st.enemies.push({id:miniEnemyId++,x:st.hero.x+350,y:st.hero.y,type:2,hp:300*st.enemyHpMul,max:300*st.enemyHpMul,cool:0});
    const tt=document.getElementById('miniTitle');if(tt)tt.textContent=t('jefeLlego');
  }
  if(st.jefeSalido&&st.enemies.length===0){
    st.running=false;
    const p=miniProfile();p.supervivencia.nivel=Math.min(8,st.nivel+1);saveMiniProfile(p);
    dialog('👑 '+t('nivelSuperado'),'<p>'+t('sigNivel')+': '+p.supervivencia.nivel+'/8</p><div class="buttonGrid"><button id="miniNext2">'+t('sigNivel')+'</button><button id="miniLobby3">'+t('volver')+'</button></div>');
    $('miniNext2').onclick=()=>{closeDialog();startMiniSurvival(p.supervivencia.nivel);};
    $('miniLobby3').onclick=()=>{closeDialog();show('lobby');};
  }
}

function miniUpgradePanel(){
  const st=miniState;st.paused=true;
  dialog('⬆️ '+t('xpNivel')+' '+st.xpNivel,'<p>'+t('upgradeQ')+'</p><div class="buttonGrid">'+miniUpgradeButtons()+'</div>');
  wireMiniUpgrades(()=>{st.paused=false;st.lastStep=performance.now();});
}

function miniOver(){
  const st=miniState;st.running=false;
  dialog('💀 '+t('miniOver'),' <p>'+t('miniInfo')+st.nivel+' · '+t('muertes')+': '+st.kills+'</p><div class="buttonGrid"><button id="miniRetry">'+t('reintentar')+'</button><button id="miniExit2">'+t('volver')+'</button></div>');
  $('miniRetry').onclick=()=>{closeDialog();st.modo==='oleada'?startMiniWave(st.nivel):startMiniSurvival(st.nivel);};
  $('miniExit2').onclick=()=>{closeDialog();show('lobby');};
}

on('miniBtn',openMini);

// ---------- Dibujo 3D: mundo procedural igual al modo historia ----------
function miniDraw(now){
  const st=miniState,r=miniRenderer;
  const gl=r.gl;const hx=st.hero.x/75,hz=st.hero.y/75;
  const ratio=r.canvas.width/r.canvas.height;
  r.proj=CosmicRenderer3D.perspective(Math.PI/3,ratio,.2,150);
  const dist=15.5+(ratio<1?6:0);
  r.cpos=[hx,dist,hz+dist*.69];r.target=[hx,0,hz-1];r.view=CosmicRenderer3D.lookAt(r.cpos,r.target);
  const fog=['#333842','#564538','#425d56','#6a4c44','#6c6470','#7e7078','#536d84','#364d75'][st.planeta];
  gl.clearColor(...CosmicRenderer3D.rgb(fog),1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(r.program);
  gl.uniform3fv(r.uFog,CosmicRenderer3D.rgb(fog));gl.uniformMatrix4fv(r.uView,false,new Float32Array(r.view));gl.uniformMatrix4fv(r.uProj,false,new Float32Array(r.proj));
  r.world(hx,hz,st.planeta,now);
  // Animación de personajes: ciclo de pasos por distancia real, igual que el modo historia
  const dt=r.previousRenderTime?Math.min(.08,Math.max(0,now-r.previousRenderTime)):0;
  r.previousRenderTime=now;
  if(r.heroLastPos){const travel=Math.hypot(hx-r.heroLastPos.x,hz-r.heroLastPos.z);const walking=travel>.004&&travel<3;
   r.heroAnim+=walking?travel*10:0;
   r.heroMovement=Math.max(0,Math.min(1,(r.heroMovement||0)+(walking?dt*12:-dt*10)));
  }else r.heroMovement=0;
  r.heroLastPos={x:hx,z:hz};
  const alive=new Set();
  for(const e of st.enemies){const ox=e.x/75,oz=e.y/75;alive.add(e.id);
   let em=r.enemyMotion.get(e.id);if(!em){em={x:ox,z:oz,phase:e.id*.83,speed:0,heading:Math.atan2(hx-ox,hz-oz)};r.enemyMotion.set(e.id,em);}
   const ddx=ox-em.x,ddz=oz-em.z,travel=Math.hypot(ddx,ddz),moving=travel>.0005&&travel<3;
   em.phase+=moving?travel*(e.type===2?6:e.type===1?8:11):0;
   em.speed=Math.max(0,Math.min(1,em.speed+(moving?dt*10:-dt*8)));
   if(moving)em.heading=CosmicRenderer3D.angleLerp(em.heading,Math.atan2(ddx,ddz),Math.min(1,dt*10+0.18));
   em.x=ox;em.z=oz;
   if(Math.abs(ox-hx)<26&&Math.abs(oz-hz)<18)r.alien(ox,oz,e.type,now,em.phase,em.speed,Math.hypot(ox-hx,oz-hz),em.heading);
  }
  if(r.enemyMotion.size>140)for(const id of r.enemyMotion.keys())if(!alive.has(id))r.enemyMotion.delete(id);
  for(const sp of st.spores){const ox=sp.x/75,oz=sp.y/75;r.draw('sphere',ox,.5,oz,.15,.15,.15,'#8fbf4d');}
  r.cat(hx,hz,st.hero.dir,st.planeta,now,'#d8d9e1',100,0,st.hero.x+300,st.hero.y,r.heroAnim,r.heroMovement||0);
  // barras de vida encima de los enemigos (capa 2D)
  const g=r.og,sw=r.overlay.width/innerWidth,sh=r.overlay.height/innerHeight;
  g.setTransform(sw,0,0,sh,0,0);g.clearRect(0,0,innerWidth,innerHeight);
  for(const e of st.enemies){
    const ox=e.x/75,oz=e.y/75;
    if(Math.abs(ox-hx)>26||Math.abs(oz-hz)>18)continue;
    const pos=r.project(ox,e.type?2.2:1.1,oz);if(!pos)continue;
    const bw=e.type===2?82:e.type===1?70:50;
    g.fillStyle='#152330d9';g.fillRect(pos[0]-bw/2,pos[1]-15,bw,7);
    g.fillStyle=e.type===1||e.type===2?'#e7a4b1':e.type===3?'#b9cf5a':'#93ba9e';
    g.fillRect(pos[0]-bw/2,pos[1]-15,bw*Math.max(0,e.hp/e.max),7);
  }
}
