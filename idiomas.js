'use strict';
// IDIOMAS — español, English, 日本語, 中文, Русский.
// Archivo dedicado: traduce la interfaz estática (inicio, lobby, HUD, controles)
// y el sistema de minijuegos. Sin tocar game.js.
const LANG_LIST = [['es','Español'],['en','English'],['ja','日本語'],['zh','中文'],['ru','Русский']];
let currentLang = localStorage.getItem('cosmic_lang') || 'es';
const I18N = {
es: {
begin:'COMENZAR',resume:'RETOMAR PARTIDA',clearSaves:'BORRAR PARTIDAS',download:'DESCARGAR',lang:'IDIOMA',langQ:'Elegí tu idioma:',
kicker:'UNA AVENTURA ENTRE LAS ESTRELLAS',heroTitle:'EL ESPACIO<br>TE <span>ESPERA.</span>',intro:'Explorá los ocho planetas, derrotá a los perros alienígenas, reuní piezas para tu cohete y personalizá el traje de tu gato astronauta.',footer:'8 PLANETAS · 80 NIVELES · 3D',mission01:'MISIÓN 01 · MÁS ALLÁ DE LA ÓRBITA',
centerTag:'CENTRO DE MANDO',solarTitle:'SISTEMA SOLAR',solarSub:'Seleccioná un planeta para acercarte y ver sus 10 niveles.',upgrades:'MEJORAS 🔰',appearance:'APARIENCIA ♻',saves:'GUARDAR / RETORNAR',mission:'MISIÓN 🛰️',mini:'MINIJUEGO',explore:'EXPLORAR',
campTitle:'TU CAMPAÑA',campPlanet:'Planeta desbloqueado',campLevel:'Nivel disponible',campDiff:'Dificultad recomendada',campRocket:'Cohete',statTitle:'ESTADÍSTICAS DEL GATO',statLife:'Vida inicial',statTail:'Daño cola',statInt:'Inteligencia',statStam:'Resistencia',statSuit:'Traje',partsTitle:'PIEZAS DEL COHETE',partsLabel:'Componentes reunidos',controlsTitle:'CONTROLES',controlsText:'WASD / flechas: moverse · Shift: correr · Mouse: apuntar hasta 250 px · Clic izquierdo: cola · Clic derecho: meteorito · Esc: pausa. En móvil, usá los controles táctiles.',captain:'CAPITÁN COSMO',explorer:'Explorador espacial',
life:'VIDA',intel:'INTELIGENCIA',stam:'RESISTENCIA',suit:'TRAJE',backpack:'MOCHILA',aliens:'ALIENS',pause:'PAUSA',mapLabel:'MUNDO 3D · EXPLORACIÓN LIBRE · COLA (J) · METEORITO (ESPACIO)',
run:'CORRER',tail:'COLA',shot:'METEORITO',jet:'COHETE',
waveTitle:'MODO OLEADA',survTitle:'SUPERVIVENCIA',towerInfo:'Cada 2 niveles cambia el planeta. 5 oleadas por nivel y +2 ⭐ por oleada. Mejoras temporales.',upgradeQ:'Elegí una mejora temporal:',upHp:'❤️ +20 VIDA',upTail:'🌀 +2 DAÑO COLA',upMet:'☄️ +2 DAÑO METEORITO',upVel:'➤ +0.3 VELOCIDAD',oleadaWord:'OLEADA',nivelSuperado:'NIVEL SUPERADO',aguantar:'SOBREVIVÍ 20 MIN',jefeLlego:'👑 ¡EL JEFE HA LLEGADO! Eliminalo para ganar',miniOver:'TE QUEDASTE SIN VIDA',reintentar:'REINTENTAR',volver:'VOLVER',sigNivel:'SIGUIENTE NIVEL',xpNivel:'XP Nv',muertes:'Muertes',miniQ:'Elegí el modo de juego. Las mejoras ganadas aquí solo valen para los minijuegos.',miniInfo:'Nivel '},
en: {
begin:'START',resume:'RESUME GAME',clearSaves:'DELETE SAVES',download:'DOWNLOAD',lang:'LANGUAGE',langQ:'Choose your language:',
kicker:'AN ADVENTURE AMONG THE STARS',heroTitle:'SPACE<br>AWAITS <span>YOU.</span>',intro:'Explore the eight planets, defeat the alien dogs, collect rocket parts and customize your astronaut cat suit.',footer:'8 PLANETS · 80 LEVELS · 3D',mission01:'MISSION 01 · BEYOND THE ORBIT',
centerTag:'MISSION CONTROL',solarTitle:'SOLAR SYSTEM',solarSub:'Pick a planet to approach it and see its 10 levels.',upgrades:'UPGRADES 🔰',appearance:'LOOKS ♻',saves:'SAVE / LOAD',mission:'MISSION 🛰️',mini:'MINIGAME',explore:'EXPLORE',
campTitle:'YOUR CAMPAIGN',campPlanet:'Unlocked planet',campLevel:'Level available',campDiff:'Recommended difficulty',campRocket:'Rocket',statTitle:'CAT STATS',statLife:'Initial life',statTail:'Tail damage',statInt:'Intelligence',statStam:'Stamina',statSuit:'Suit',partsTitle:'ROCKET PARTS',partsLabel:'Parts collected',controlsTitle:'CONTROLS',controlsText:'WASD / arrows: move · Shift: run · Mouse: aim up to 250 px · Left click: tail · Right click: meteor · Esc: pause. On mobile use the touch controls.',captain:'CAPTAIN COSMO',explorer:'Space explorer',
life:'LIFE',intel:'INTEL',stam:'STAMINA',suit:'SUIT',backpack:'PACK',aliens:'ALIENS',pause:'PAUSE',mapLabel:'3D WORLD · FREE ROAMING · TAIL (J) · METEOR (SPACE)',
run:'RUN',tail:'TAIL',shot:'METEOR',jet:'ROCKET',
waveTitle:'WAVE MODE',survTitle:'SURVIVAL',towerInfo:'Every 2 levels the planet changes. 5 waves per level and +2 ⭐ per wave. Temporary upgrades.',upgradeQ:'Pick a temporary upgrade:',upHp:'❤️ +20 LIFE',upTail:'🌀 +2 TAIL DAMAGE',upMet:'☄️ +2 METEOR DAMAGE',upVel:'➤ +0.3 SPEED',oleadaWord:'WAVE',nivelSuperado:'LEVEL CLEARED',aguantar:'SURVIVE 20 MIN',jefeLlego:'👑 THE BOSS IS HERE! Beat it to win',miniOver:'YOU RAN OUT OF LIFE',reintentar:'RETRY',volver:'BACK',sigNivel:'NEXT LEVEL',xpNivel:'XP Lv',muertes:'Kills',miniQ:'Pick a game mode. Upgrades earned here only apply to the minigames.',miniInfo:'Level '},
ja: {
begin:'スタート',resume:'ゲームを続ける',clearSaves:'セーブ削除',download:'ダウンロード',lang:'言語',langQ:'言語を選ぼう：',
kicker:'星たちの間の冒険',heroTitle:'宇宙が<br>きみを<span>待っている。</span>',intro:'8つの惑星を探索し、エイリアン犬を倒し、ロケットのパーツを集めて、猫宇宙飛行士のスーツをカスタマイズしよう。',footer:'8 惑星 · 80 レベル · 3D',mission01:'ミッション 01 · 軌道の向こうへ',
centerTag:'ミッションコントロール',solarTitle:'太陽系',solarSub:'惑星を選んで接近し、10のレベルを見よう。',upgrades:'アップグレード 🔰',appearance:'見た目 ♻',saves:'セーブ / ロード',mission:'ミッション 🛰️',mini:'ミニゲーム',explore:'探索',
campTitle:'キャンペーン',campPlanet:'解放された惑星',campLevel:'利用可能レベル',campDiff:'おすすめ難易度',campRocket:'ロケット',statTitle:'猫のステータス',statLife:'初期ライフ',statTail:'しっぽダメージ',statInt:'知性',statStam:'スタミナ',statSuit:'スーツ',partsTitle:'ロケットパーツ',partsLabel:'集めたパーツ',controlsTitle:'操作',controlsText:'WASD / 矢印キー：移動 · Shift：走る · マウス：250pxまで狙う · 左クリック：しっぽ · 右クリック：隕石 · Esc：ポーズ。スマホはタッチ操作。',captain:'コスモ船長',explorer:'宇宙探検家',
life:'ライフ',intel:'知性',stam:'スタミナ',suit:'スーツ',backpack:'バックパック',aliens:'エイリアン',pause:'ポーズ',mapLabel:'3Dワールド · 自由探索 · しっぽ (J) · 隕石 (スペース)',
run:'走る',tail:'しっぽ',shot:'隕石',jet:'ロケット',
waveTitle:'ウェーブモード',survTitle:'サバイバル',towerInfo:'2レベルごとに惑星が変わる。レベルごとに5ウェーブ、ウェーブごとに+2⭐。強化は一時的。',upgradeQ:'一時的な強化を選ぼう：',upHp:'❤️ ライフ+20',upTail:'🌀 しっぽダメージ+2',upMet:'☄️ 隕石ダメージ+2',upVel:'➤ 速さ+0.3',oleadaWord:'ウェーブ',nivelSuperado:'レベルクリア',aguantar:'20分生き延びろ',jefeLlego:'👑 ボス登場！倒してクリア',miniOver:'ライフが尽きた',reintentar:'リトライ',volver:'戻る',sigNivel:'次のレベル',xpNivel:'XP Lv',muertes:'倒した数',miniQ:'モードを選ぼう。ここで得た強化はミニゲーム限定。',miniInfo:'レベル '},
zh: {
begin:'开始',resume:'继续游戏',clearSaves:'删除存档',download:'下载',lang:'语言',langQ:'选择你的语言：',
kicker:'星辰之间的冒险',heroTitle:'太空<br>正<span>等着你。</span>',intro:'探索八大行星，击败外星狗，收集火箭部件，并定制你的太空猫宇航服。',footer:'8 大行星 · 80 个关卡 · 3D',mission01:'任务 01 · 越过轨道',
centerTag:'指挥中心',solarTitle:'太阳系',solarSub:'选择一个行星靠近它，查看它的 10 个关卡。',upgrades:'升级 🔰',appearance:'外观 ♻',saves:'保存 / 读取',mission:'任务 🛰️',mini:'小游戏',explore:'探索',
campTitle:'你的战役',campPlanet:'已解锁行星',campLevel:'可用关卡',campDiff:'推荐难度',campRocket:'火箭',statTitle:'猫咪统计',statLife:'初始生命',statTail:'尾巴伤害',statInt:'智力',statStam:'耐力',statSuit:'宇航服',partsTitle:'火箭部件',partsLabel:'已收集部件',controlsTitle:'操作',controlsText:'WASD / 方向键：移动 · Shift：奔跑 · 鼠标：瞄准至 250 px · 左键：尾巴 · 右键：陨石 · Esc：暂停。手机上请使用触控按钮。',captain:'宇宙上尉',explorer:'太空探险家',
life:'生命',intel:'智力',stam:'耐力',suit:'宇航服',backpack:'背包',aliens:'外星人',pause:'暂停',mapLabel:'3D 世界 · 自由探索 · 尾巴 (J) · 陨石 (空格)',
run:'奔跑',tail:'尾巴',shot:'陨石',jet:'火箭',
waveTitle:'波次模式',survTitle:'生存模式',towerInfo:'每 2 关换一个行星。每关 5 波，每波 +2⭐。强化是临时的。',upgradeQ:'选择一个临时强化：',upHp:'❤️ 生命+20',upTail:'🌀 尾巴伤害+2',upMet:'☄️ 陨石伤害+2',upVel:'➤ 速度+0.3',oleadaWord:'波',nivelSuperado:'关卡通过',aguantar:'生存 20 分钟',jefeLlego:'👑 首领来了！击败它即可获胜',miniOver:'生命耗尽',reintentar:'重试',volver:'返回',sigNivel:'下一关',xpNivel:'经验 级',muertes:'击杀',miniQ:'选择游戏模式。这里获得的强化只在小游戏中生效。',miniInfo:'等级 '},
ru: {
begin:'НАЧАТЬ',resume:'ПРОДОЛЖИТЬ ИГРУ',clearSaves:'УДАЛИТЬ СОХРАНЕНИЯ',download:'СКАЧАТЬ',lang:'ЯЗЫК',langQ:'Выбери свой язык:',
kicker:'ПРИКЛЮЧЕНИЕ СРЕДИ ЗВЁЗД',heroTitle:'КОСМОС<br>ЖДЁТ <span>ТЕБЯ.</span>',intro:'Исследуй восемь планет, победи собак-пришельцев, собери детали ракеты и настрой костюм своего кота-астронавта.',footer:'8 ПЛАНЕТ · 80 УРОВНЕЙ · 3D',mission01:'МИССИЯ 01 · ЗА ОРБИТОЙ',
centerTag:'ЦЕНТР УПРАВЛЕНИЯ',solarTitle:'СОЛНЕЧНАЯ СИСТЕМА',solarSub:'Выбери планету, чтобы приблизиться и увидеть её 10 уровней.',upgrades:'УЛУЧШЕНИЯ 🔰',appearance:'ВИД ♻',saves:'СОХРАНИТЬ / ЗАГРУЗИТЬ',mission:'МИССИЯ 🛰️',mini:'МИНИ-ИГРА',explore:'ИССЛЕДОВАТЬ',
campTitle:'ТВОЯ КАМПАНИЯ',campPlanet:'Открытая планета',campLevel:'Доступный уровень',campDiff:'Рекомендуемая сложность',campRocket:'Ракета',statTitle:'СТАТИСТИКА КОТА',statLife:'Начальная жизнь',statTail:'Урон хвоста',statInt:'Интеллект',statStam:'Выносливость',statSuit:'Костюм',partsTitle:'ДЕТАЛИ РАКЕТЫ',partsLabel:'Собрано деталей',controlsTitle:'УПРАВЛЕНИЕ',controlsText:'WASD / стрелки: движение · Shift: бег · Мышь: прицел до 250 px · ЛКМ: хвост · ПКМ: метеор · Esc: пауза. На телефоне — сенсорные кнопки.',captain:'КАПИТАН КОСМО',explorer:'Космоисследователь',
life:'ЖИЗНЬ',intel:'ИНТЕЛЛЕКТ',stam:'ВЫНОСЛИВОСТЬ',suit:'КОСТЮМ',backpack:'РЮКЗАК',aliens:'ПРИШЕЛЬЦЫ',pause:'ПАУЗА',mapLabel:'3D-МИР · СВОБОДНОЕ ИССЛЕДОВАНИЕ · ХВОСТ (J) · МЕТЕОР (ПРОБЕЛ)',
run:'БЕГ',tail:'ХВОСТ',shot:'МЕТЕОР',jet:'РАКЕТА',
waveTitle:'РЕЖИМ ВОЛН',survTitle:'ВЫЖИВАНИЕ',towerInfo:'Каждые 2 уровня меняется планета. 5 волн на уровень и +2 ⭐ за волну. Улучшения временные.',upgradeQ:'Выбери временное улучшение:',upHp:'❤️ +20 ЖИЗНЬ',upTail:'🌀 +2 УРОН ХВОСТА',upMet:'☄️ +2 УРОН МЕТЕОРА',upVel:'➤ +0.3 СКОРОСТЬ',oleadaWord:'ВОЛНА',nivelSuperado:'УРОВЕНЬ ПРОЙДЕН',aguantar:'ВЫЖИВИ 20 МИН',jefeLlego:'👑 БОСС ПРИШЁЛ! Победите его',miniOver:'ЖИЗНЬ ЗАКОНЧИЛАСЬ',reintentar:'ПОВТОРИТЬ',volver:'НАЗАД',sigNivel:'СЛЕДУЮЩИЙ УРОВЕНЬ',xpNivel:'XP Ур',muertes:'Убийств',miniQ:'Выбери режим. Улучшения здесь работают только в мини-играх.',miniInfo:'Уровень '}
};
function t(k){const L=I18N[currentLang]||{};return L[k]!==undefined?L[k]:(I18N.en[k]!==undefined?I18N.en[k]:k);}
function applyLang(){
 const set=(id,v)=>{const el=document.getElementById(id);if(el)el.innerHTML=v;};
 set('langBtn','🌐 '+currentLang.toUpperCase());set('langBtnLobby','🌐 '+currentLang.toUpperCase());
 set('begin','🚀 '+t('begin'));set('resumeSaved','↩ '+t('resume'));set('clearSaves','🗑 '+t('clearSaves'));set('downloadGame','⬇ '+t('download'));
 set('kicker',t('kicker'));set('introCopy',t('intro'));set('landingFooter',t('footer'));set('landingBottom',t('mission01'));
 set('heroTitle',t('heroTitle'));
 set('smallTag',t('centerTag'));set('solarTitle',t('solarTitle'));set('solarSub',t('solarSub'));
 set('upgradesBtn',t('upgrades'));set('appearanceBtn',t('appearance'));set('savesBtn',t('saves'));set('missionBtn',t('mission'));set('miniBtn','🕹️ '+t('mini'));set('exploreCurrent','🪐 '+t('explore')+' '+names[Math.min(7,completedIndex())].toUpperCase());
 const h3t=[t('campTitle'),t('statTitle'),t('partsTitle'),t('controlsTitle')];
 document.querySelectorAll('.dashboardSide article h3').forEach((el,i)=>{if(h3t[i])el.textContent=h3t[i]});
 const rt=[t('campPlanet'),t('campLevel'),t('campDiff'),t('campRocket'),t('partsLabel')];
 document.querySelectorAll('.dashboardSide .sideRow').forEach((el,i)=>{if(rt[i]&&el.firstChild)el.firstChild.nodeValue=rt[i]+' '});
 const stl=[t('statLife'),t('statTail'),t('statInt'),t('statStam'),t('statSuit')];
 document.querySelectorAll('.statCards>div').forEach((el,i)=>{if(stl[i]&&el.firstChild)el.firstChild.nodeValue=stl[i]+' '});
 set('controlsText',t('controlsText'));
 const sfb=document.querySelector('.solarFooter b');if(sfb)sfb.textContent=t('captain');
 const sfp=document.querySelector('.solarFooter p');if(sfp)sfp.textContent=t('explorer');
 const sp=document.querySelectorAll('#hud .hudStatTop span');const spv=[t('life'),t('intel'),t('stam'),t('backpack'),t('suit')];
 sp.forEach((el,i)=>{if(spv[i])el.textContent=spv[i]});
 set('pauseBtn','⏸ '+t('pause'));set('mapLabel',t('mapLabel'));
 document.querySelectorAll('[data-key]').forEach(b=>{const v={run:t('run'),tail:t('tail'),shot:t('shot'),jet:t('jet')}[b.dataset.key];if(v)b.textContent=v});
 const mt=document.getElementById('miniTitle');if(mt&&miniState&&miniState.titulo)mt.innerHTML=miniState.titulo;
 document.documentElement.lang=currentLang;
}
function completedIndex(){const c=names.map((_,i)=>ex('get_completed',i));const f=c.findIndex(v=>v<10);return f===-1?7:f;}
function openLangDialog(){
 let grid='<div class="buttonGrid">';
 for(const [code,label] of LANG_LIST){grid+='<button data-lang="'+code+'" class="'+(currentLang===code?'selected':'')+'">'+label+'</button>';}
 grid+='</div>';
 dialog('🌐 '+t('lang'),'<p class="controlQuestion">'+t('langQ')+'</p>'+grid);
 document.querySelectorAll('[data-lang]').forEach(b=>b.onclick=()=>{currentLang=b.dataset.lang;try{localStorage.setItem('cosmic_lang',currentLang)}catch(_){}applyLang();openLangDialog();});
}
on('langBtn',openLangDialog);on('langBtnLobby',openLangDialog);
setInterval(()=>{if(screen==='lobby')applyLang();},2000);
applyLang();
