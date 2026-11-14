// COSMIC CAT: juego, mundo, enemigos, combate, progreso y vuelo escritos en C++.
// Compilar a WebAssembly: clang++ --target=wasm32 -O2 -nostdlib ...
// Los efectos visuales y la interfaz los dibuja Canvas 2D de JavaScript.
extern "C" {
struct Enemy {float x,y,hp,maxhp;int type,alive;};
struct Pickup {float x,y;int type,alive;};
struct Hero {float x,y,hp,energy,stamina,jetpack;};
static Enemy enemies[84];static Pickup pickups[32];static Hero hero;
static int planet=0,level=1,diff=1,enemyCount=0,pickupCount=0,kills=0,phase=0,stars=0,parts=0;
static int completed[8]={0,0,0,0,0,0,0,0};
static int upgrades[6]={1,1,1,1,1,1};
static int tick=0,elapsed=0,ammoTime=0,invul=0,attackCooldown=0,shotCooldown=0,jetTick=0,dir=1,gameOver=0;
static unsigned int rng=123456789u;
static float aimX=460.f,aimY=1300.f;
static unsigned int nextR(){rng=rng*1664525u+1013904223u;return rng;}
static float absf(float a){return a<0?-a:a;}
static float cap(float a,float lo,float hi){return a<lo?lo:(a>hi?hi:a);}
static float dist2(float a,float b,float c,float d){float dx=a-c,dy=b-d;return dx*dx+dy*dy;}
static int gas(){return planet>=4;}
static bool blocked(float x,float y,float radius);
static void enemySpawn(int idx,int type){Enemy &e=enemies[idx];e.x=350+float(nextR()%15140);e.y=140+float(nextR()%4930);for(int tries=0;tries<60 && blocked(e.x,e.y,type?35.f:24.f);tries++){e.x=350+float(nextR()%15140);e.y=140+float(nextR()%4930);}e.type=type;e.alive=1;int bonus=planet*20 + diff*100;
 e.maxhp=type==1?100+bonus:type==2?200+bonus:10+diff*25+planet*3;e.hp=e.maxhp;}
int enemy_total(){return enemyCount;}
int pickup_total(){return pickupCount;}
int world_w(){return 16000;}
int world_h(){return 5200;}
int current_planet(){return planet;}
int current_level(){return level;}
int current_diff(){return diff;}
int total_kills(){return kills;}
int target_kills(){return diff==0?30:diff==1?50:80;}
int get_phase(){return phase;}// 0 enemigos, 1 élite/jefe, 2 completado, 3 falta pieza
int get_over(){return gameOver;}// 1 muerte
int get_stars(){return stars;}
int get_parts(){return parts;}
int get_completed(int p){return p>=0&&p<8?completed[p]:0;}
int get_upgrade(int i){return i>=0&&i<6?upgrades[i]:1;}
int get_elapsed(){return elapsed;}
float hero_x(){return hero.x;}
float hero_y(){return hero.y;}
float hero_hp(){return hero.hp;}
float hero_max_hp(){return 80+(upgrades[1]-1)*15;}
float hero_energy(){return hero.energy;}
float hero_max_energy(){return 20+(upgrades[2]-1)*4;}
float hero_stamina(){return hero.stamina;}
float hero_jetpack(){return hero.jetpack;}
int hero_dir(){return dir;}
float hero_aim_x(){return aimX;}
float hero_aim_y(){return aimY;}
void set_aim(float x,float y){aimX=cap(x,0,16000);aimY=cap(y,0,5200);if(absf(aimX-hero.x)>2)dir=aimX>hero.x?1:-1;}
int enemy_alive(int i){return i>=0&&i<enemyCount?enemies[i].alive:0;}
float enemy_x(int i){return i>=0&&i<enemyCount?enemies[i].x:0;}
float enemy_y(int i){return i>=0&&i<enemyCount?enemies[i].y:0;}
float enemy_hp(int i){return i>=0&&i<enemyCount?enemies[i].hp:0;}
float enemy_max_hp(int i){return i>=0&&i<enemyCount?enemies[i].maxhp:1;}
int enemy_type(int i){return i>=0&&i<enemyCount?enemies[i].type:0;}
int pickup_alive(int i){return i>=0&&i<pickupCount?pickups[i].alive:0;}
float pickup_x(int i){return i>=0&&i<pickupCount?pickups[i].x:0;}
float pickup_y(int i){return i>=0&&i<pickupCount?pickups[i].y:0;}
int pickup_type(int i){return i>=0&&i<pickupCount?pickups[i].type:0;}// 0 botiquin,1 bateria,2 pieza
int get_terrain(int col,int row){unsigned int n=(unsigned int)(col*73856093u)^(unsigned int)(row*19349663u)^(unsigned int)((planet+1)*83492791u);n^=n>>13;n*=1274126177u;n^=n>>16;return int(n%11);}
// Obstáculos físicos que coinciden con las ruinas y piedras que dibuja WebGL.
static unsigned int rockHash(int x,int z,int seed){unsigned int a=(unsigned int)(x*92837111u) ^ (unsigned int)(z*689287499u) ^ (unsigned int)((seed+1)*283923481u);a^=a>>16;a*=2246822519u;a^=a>>13;return a;}
static bool blocked(float x,float y,float radius){
  // Las ruinas están en x=(i*14+5)*75, y=(i%4*6+2)*75.
  for(int i=int(x/(14.f*75.f))-2;i<=int(x/(14.f*75.f))+2;i++){
    int rem=i%4;float ox=(i*14.f+5.f)*75.f,oy=(rem*6.f+2.f)*75.f;
    float hw=1.6f*75.f+radius,hd=1.5f*75.f+radius;
    if(x>ox-hw&&x<ox+hw&&y>oy-hd&&y<oy+hd)return true;
  }
  // Rocas puntiagudas que aparecen cuando la textura procedural supera .96.
  int cx=int(x/150.f),cy=int(y/150.f);
  for(int i=cx-2;i<=cx+2;i++)for(int j=cy-2;j<=cy+2;j++){
    float v=float(rockHash(i,j,planet))/4294967295.f;
    if(v>.96f && dist2(x,y,i*150.f,j*150.f)<(radius+25.f)*(radius+25.f))return true;
  }
  return false;
}
static void moveWithCollisions(float &x,float &y,float dx,float dy,float radius){
 float nx=cap(x+dx,28,15972),ny=cap(y+dy,28,5172);
 if(!blocked(nx,y,radius))x=nx;
 if(!blocked(x,ny,radius))y=ny;
}
// La pieza del cohete aparece en un nivel elegido al azar por planeta y en
// una posición aleatoria del mapa. Se guarda el nivel asignado por planeta.
static int pieceLevel[8]={-1,-1,-1,-1,-1,-1,-1,-1};
static int pieceX[8]={0,0,0,0,0,0,0,0};
static int pieceY[8]={0,0,0,0,0,0,0,0};
void set_campaign(int p,int l,int d){planet=p<0?0:p>7?7:p;level=l<1?1:l>10?10:l;diff=d<0?0:d>2?2:d;}
void add_pickup(int type,float x,float y){if(pickupCount>=32)return;Pickup &p=pickups[pickupCount++];p.x=x;p.y=y;for(int tries=0;tries<80&&blocked(p.x,p.y,35.f);tries++){p.x=cap(p.x+175.f,50.f,15950.f);p.y=cap(p.y+127.f,50.f,5150.f);}p.type=type;p.alive=1;}
void start_level(int p,int l,int d){set_campaign(p,l,d);rng=12345u+planet*111199u+level*7981u+diff*9001u;enemyCount=target_kills();pickupCount=0;kills=0;phase=0;gameOver=0;tick=0;ammoTime=0;jetTick=0;invul=0;attackCooldown=0;shotCooldown=0;
 hero.x=210;hero.y=1300;hero.hp=hero_max_hp();hero.energy=hero_max_energy();hero.stamina=10+(upgrades[4]-1)*3;hero.jetpack=50;if(blocked(hero.x,hero.y,26.f))moveWithCollisions(hero.x,hero.y,0.f,120.f,26.f);aimX=hero.x+250;aimY=hero.y;
 for(int i=0;i<enemyCount;i++)enemySpawn(i,0);
 int meds=diff==0?1:diff==1?3:10;for(int i=0;i<meds;i++)add_pickup(0,500+nextR()%15100,150+nextR()%4950);
 if(gas())for(int i=0;i<6;i++)add_pickup(1,700+i*2240,250+nextR()%4660);
 if(!(parts&(1<<planet))){ // Pieza única por planeta en un nivel aleatorio del 1 al 10.
  if(pieceLevel[planet]<1){
   nextR();pieceLevel[planet]=1+int(nextR()%10u);
   pieceX[planet]=350+int(nextR()%15140u);pieceY[planet]=140+int(nextR()%4930u);
  }
  if(level==pieceLevel[planet])add_pickup(2,float(pieceX[planet]),float(pieceY[planet]));
 }
}
int upgrade_stat(int i){if(i<0||i>=6||upgrades[i]>=10||stars<=0)return 0;upgrades[i]++;stars--;return 1;}
void restore_meta(int s,int part,int c0,int c1,int c2,int c3,int c4,int c5,int c6,int c7,int a,int b,int c,int d,int e,int f,int sec){stars=s<0?0:s;parts=part;int cc[8]={c0,c1,c2,c3,c4,c5,c6,c7};for(int i=0;i<8;i++)completed[i]=cc[i];int uu[6]={a,b,c,d,e,f};for(int i=0;i<6;i++)upgrades[i]=uu[i]<1?1:uu[i]>10?10:uu[i];elapsed=sec<0?0:sec;}
void restore_position(float x,float y,float hp,float energy,float stamina,float jet){hero.x=cap(x,35,15965);hero.y=cap(y,35,5165);hero.hp=cap(hp,1,hero_max_hp());hero.energy=cap(energy,0,hero_max_energy());hero.stamina=cap(stamina,0,10+(upgrades[4]-1)*3);hero.jetpack=cap(jet,0,50);aimX=hero.x+250;aimY=hero.y;}
// El nivel requiere derrotar a todos los enemigos y poseer la pieza única del planeta.
static void checkVictory(){
 if(phase!=3)return;
 if((parts&(1<<planet))==0)return;
 phase=2;
 if(completed[planet]<level)completed[planet]=level;
}
void hurt_enemy(int i,float dmg){Enemy &e=enemies[i];if(!e.alive)return;e.hp-=dmg;if(e.hp<=0){e.hp=0;e.alive=0;if(e.type==0){kills++;if(kills>=target_kills()){if(level==5||level==10){phase=1;enemyCount=target_kills()+1;enemySpawn(enemyCount-1,level==5?1:2);enemies[enemyCount-1].x=hero.x+250<15700?hero.x+250:hero.x-250;enemies[enemyCount-1].y=hero.y+80<5150?hero.y+80:hero.y-80;}else{phase=3;checkVictory();}}}else{stars+=e.type==1?1:2;phase=3;checkVictory();}}}
// Entrada por frame ~60 FPS. bits: 1 izq, 2 der, 4 arriba, 8 abajo,16 correr,32 cola,64 disparar,128 mochila.
void step(int mask){if(gameOver||phase==2)return;tick++;if(tick%60==0){elapsed++;ammoTime++;if(gas()&&(mask&128)&&hero.jetpack>0)hero.jetpack=cap(hero.jetpack-1,0,50);if(ammoTime>=60){hero.energy=hero_max_energy();ammoTime=0;}}if(invul>0)invul--;if(attackCooldown>0)attackCooldown--;if(shotCooldown>0)shotCooldown--;
 float speed=(mask&16)&&hero.stamina>0?5.5f:3.1f+(upgrades[3]-1)*.24f;
 float dx=(mask&2?1:0)-(mask&1?1:0),dy=(mask&8?1:0)-(mask&4?1:0);
 if(dx!=0||dy!=0){if(dx)dir=dx>0?1:-1;if(dx&&dy)speed*=.7071f;moveWithCollisions(hero.x,hero.y,dx*speed,dy*speed,25.f);}
 if(mask&16&&((dx!=0)||(dy!=0))){if(tick%60==0)hero.stamina=cap(hero.stamina-1,0,10+(upgrades[4]-1)*3);}else if(tick%90==0)hero.stamina=cap(hero.stamina+1,0,10+(upgrades[4]-1)*3);
 if((mask&32)&&attackCooldown==0){attackCooldown=27;for(int i=0;i<enemyCount;i++)if(enemies[i].alive&&dist2(hero.x,hero.y,enemies[i].x,enemies[i].y)<125*125){float ax=aimX-hero.x,ay=aimY-hero.y,ex=enemies[i].x-hero.x,ey=enemies[i].y-hero.y;if(ax*ax+ay*ay<1||ax*ex+ay*ey>0)hurt_enemy(i,7+(upgrades[0]-1)*2);}}
 if((mask&64)&&shotCooldown==0&&hero.energy>=4){shotCooldown=16;hero.energy-=4;float ax=aimX-hero.x,ay=aimY-hero.y,ray2=ax*ax+ay*ay;
  if(ray2>0.001f){float best=9000000.f;int chosen=-1;for(int i=0;i<enemyCount;i++)if(enemies[i].alive){
     float ex=enemies[i].x-hero.x,ey=enemies[i].y-hero.y;
     float u=(ex*ax+ey*ay)/ray2;
     if(u<0.f||u>1.12f)continue;
     float qx=ex-u*ax,qy=ey-u*ay,perp=qx*qx+qy*qy;
     if(perp<60.f*60.f&&u<best){best=u;chosen=i;}}
   if(chosen>=0)hurt_enemy(chosen,5+(upgrades[5]-1)*2);
  }}
 for(int i=0;i<enemyCount;i++){Enemy &en=enemies[i];if(!en.alive)continue;float vx=hero.x-en.x,vy=hero.y-en.y;float adx=absf(vx),ady=absf(vy);if(adx<450&&ady<330){moveWithCollisions(en.x,en.y,vx>0?.56f:-.56f,vy>0?.48f:-.48f,en.type?35.f:24.f);}if(adx<29&&ady<28&&invul==0){int baseDamage=en.type==2?20:en.type==1?15:5;hero.hp-=baseDamage*(1<<diff);invul=42;if(hero.hp<=0){hero.hp=0;gameOver=1;}}}
 for(int i=0;i<pickupCount;i++){Pickup &p=pickups[i];if(!p.alive||dist2(hero.x,hero.y,p.x,p.y)>65*65)continue;p.alive=0;if(p.type==0)hero.hp=hero_max_hp();else if(p.type==1)hero.jetpack=cap(hero.jetpack+20,0,50);else if(p.type==2){parts|=1<<planet;checkVictory();}}
}
}
