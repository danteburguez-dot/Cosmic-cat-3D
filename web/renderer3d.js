'use strict';
// Renderizador WebGL 3D offline: sin librerías ni conexión a Internet.
class CosmicRenderer3D {
 constructor(canvas, overlay){
  this.canvas=canvas; this.overlay=overlay; this.og=overlay.getContext('2d');
  const gl=canvas.getContext('webgl',{antialias:true,alpha:false,depth:true,powerPreference:'high-performance'});
  if(!gl)throw new Error('WebGL no disponible. Activá la aceleración por hardware en tu navegador.');
  this.gl=gl;this.t=0;this.projectiles=[];this.slashes=[];this.specials=[];this.sparkles=[];this.lastShot=0;this.lastTail=0;this.scale=75;this.cpos=[0,16,16];this.target=[0,0,0];this.viewW=24;this.heroAnim=0;this.heroMotion=0;this.heroLastPos=null;this.enemyMotion=new Map();this.animationClock=0;this.previousRenderTime=0;
  const vs=`attribute vec3 aPos;attribute vec3 aNormal;uniform mat4 uProj,uView,uModel;uniform vec3 uColor;varying vec3 vColor;varying float vFog;void main(){vec4 world=uModel*vec4(aPos,1.0);vec3 normal=normalize(mat3(uModel)*aNormal);float light=0.37+0.63*max(dot(normalize(vec3(-0.5,1.0,0.6)),normal),0.0);vColor=uColor*light;vec4 view=uView*world;vFog=clamp((-view.z-12.0)/42.0,0.0,0.70);gl_Position=uProj*view;}`;
  const fs=`precision mediump float;varying vec3 vColor;varying float vFog;uniform vec3 uFog;void main(){gl_FragColor=vec4(mix(vColor,uFog,vFog),1.0);}`;
  const compile=(type,s)=>{const shader=gl.createShader(type);gl.shaderSource(shader,s);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader};
  this.program=gl.createProgram();gl.attachShader(this.program,compile(gl.VERTEX_SHADER,vs));gl.attachShader(this.program,compile(gl.FRAGMENT_SHADER,fs));gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(this.program));gl.useProgram(this.program);
  this.aPos=gl.getAttribLocation(this.program,'aPos');this.aNormal=gl.getAttribLocation(this.program,'aNormal');this.uProj=gl.getUniformLocation(this.program,'uProj');this.uView=gl.getUniformLocation(this.program,'uView');this.uModel=gl.getUniformLocation(this.program,'uModel');this.uColor=gl.getUniformLocation(this.program,'uColor');this.uFog=gl.getUniformLocation(this.program,'uFog');
  this.meshes={sphere:this.mesh(this.sphere(12,9)),cube:this.mesh(this.cube()),cone:this.mesh(this.cone(12)),ring:this.mesh(this.torus(18,6))};
  this.colors=[['#776d66','#988a79','#4f5356','#c28f66'],['#98815e','#c3a56f','#655a4f','#e3aa74'],['#4f856e','#769d79','#57758b','#b8b2a1'],['#a46f59','#d09a70','#675a55','#ca785b'],['#958475','#c4ae91','#6a666c','#cbb598'],['#b3a494','#d5c3a6','#8d8590','#c6b48f'],['#6592a5','#93c8c8','#4c7086','#afdfde'],['#485f8d','#617da9','#354a6d','#83a1d2']];
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE); // Geometría de dos caras: evita invisibilidad en modelos procedurales
  this.resize();
 }
 sphere(slices,stacks){const v=[],n=[],ind=[];for(let j=0;j<=stacks;j++){const a=Math.PI*j/stacks;for(let i=0;i<=slices;i++){const b=2*Math.PI*i/slices,x=Math.sin(a)*Math.cos(b),y=Math.cos(a),z=Math.sin(a)*Math.sin(b);v.push(x,y,z);n.push(x,y,z)}}for(let j=0;j<stacks;j++)for(let i=0;i<slices;i++){let q=j*(slices+1)+i;ind.push(q,q+slices+1,q+1,q+1,q+slices+1,q+slices+2)}return {v,n,ind}}
 cube(){const v=[],n=[],ind=[];let f=[[[1,0,0],[1,-1,-1],[1,1,-1],[1,1,1],[1,-1,1]],[[-1,0,0],[-1,-1,1],[-1,1,1],[-1,1,-1],[-1,-1,-1]],[[0,1,0],[-1,1,-1],[-1,1,1],[1,1,1],[1,1,-1]],[[0,-1,0],[-1,-1,1],[-1,-1,-1],[1,-1,-1],[1,-1,1]],[[0,0,1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],[[0,0,-1],[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1]]];f.forEach(face=>{let k=v.length/3;for(let i=1;i<=4;i++){v.push(...face[i]);n.push(...face[0])}ind.push(k,k+1,k+2,k,k+2,k+3)});return {v,n,ind}}
 cone(s){const v=[],n=[],ind=[];for(let i=0;i<=s;i++){let a=i/s*2*Math.PI,x=Math.cos(a),z=Math.sin(a);v.push(x,-1,z,x*.02,1,z*.02);let l=Math.hypot(x,0.7,z);n.push(x/l,.7/l,z/l,x/l,.7/l,z/l);if(i<s){let p=2*i;ind.push(p,p+2,p+1,p+1,p+2,p+3)}}return {v,n,ind}}
 torus(s,t){const v=[],n=[],ind=[];for(let i=0;i<=s;i++)for(let j=0;j<=t;j++){let a=i/s*Math.PI*2,b=j/t*Math.PI*2,r=1+.12*Math.cos(b);v.push(Math.cos(a)*r,.12*Math.sin(b),Math.sin(a)*r);n.push(Math.cos(a)*Math.cos(b),Math.sin(b),Math.sin(a)*Math.cos(b))}for(let i=0;i<s;i++)for(let j=0;j<t;j++){let q=i*(t+1)+j;ind.push(q,q+t+1,q+1,q+1,q+t+1,q+t+2)}return {v,n,ind}}
 mesh(geo){let gl=this.gl,b=gl.createBuffer(),nb=gl.createBuffer(),idx=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(geo.v),gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,nb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(geo.n),gl.STATIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,idx);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(geo.ind),gl.STATIC_DRAW);return {b,nb,idx,n:geo.ind.length}}
 static mul(a,b){let o=Array(16).fill(0);for(let col=0;col<4;col++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)o[col*4+row]+=a[k*4+row]*b[col*4+k];return o}
 static perspective(fov,aspect,near,far){let f=1/Math.tan(fov/2);return [f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]}
 static lookAt(e,t){let norm=v=>{let l=Math.hypot(...v);return v.map(x=>x/l)},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];let z=norm(e.map((v,i)=>v-t[i])),x=norm(cross([0,1,0],z)),y=cross(z,x);return [x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-x.reduce((a,v,i)=>a+v*e[i],0),-y.reduce((a,v,i)=>a+v*e[i],0),-z.reduce((a,v,i)=>a+v*e[i],0),1]}
 static rgb(hex){const n=parseInt(hex.replace('#',''),16);return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]}
 static angleLerp(a,b,t){let d=((b-a+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;return a+d*t}
 resize(){let scale=Math.min(1.5,window.devicePixelRatio||1),w=Math.max(1,innerWidth),h=Math.max(1,innerHeight);this.canvas.width=Math.round(w*scale);this.canvas.height=Math.round(h*scale);this.overlay.width=this.canvas.width;this.overlay.height=this.canvas.height;this.gl.viewport(0,0,this.canvas.width,this.canvas.height)}
 model(x,y,z,sx,sy,sz,rot=0,tilt=0){let c=Math.cos(rot),s=Math.sin(rot),ct=Math.cos(tilt),st=Math.sin(tilt);return [c*sx,st*s*sx,-ct*s*sx,0,0,ct*sy,st*sy,0,s*sz,-st*c*sz,ct*c*sz,0,x,y,z,1]}
 draw(kind,x,y,z,sx,sy,sz,color,rot=0,tilt=0){let gl=this.gl,m=this.meshes[kind];gl.bindBuffer(gl.ARRAY_BUFFER,m.b);gl.vertexAttribPointer(this.aPos,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(this.aPos);gl.bindBuffer(gl.ARRAY_BUFFER,m.nb);gl.vertexAttribPointer(this.aNormal,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(this.aNormal);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,m.idx);gl.uniformMatrix4fv(this.uModel,false,new Float32Array(this.model(x,y,z,sx,sy,sz,rot,tilt)));gl.uniform3fv(this.uColor,CosmicRenderer3D.rgb(color));gl.drawElements(gl.TRIANGLES,m.n,gl.UNSIGNED_SHORT,0)}
 hash(x,z,seed){let a=((Math.imul(x,92837111)^Math.imul(z,689287499)^Math.imul(seed+1,283923481))>>>0);a^=a>>>16;a=Math.imul(a,2246822519);a^=a>>>13;return (a>>>0)/4294967295}
 solarOrb(x,y,z,r,color,ring){this.draw('sphere',x,y,z,r,r,r,color);if(ring)this.draw('ring',x,y,z,r*1.8,.08,r*1.8,'#c4b69d',.2,.28)}
 groundAt(x,z,p){const v=this.hash(Math.floor(x*2),Math.floor(z*2),p);return (p>=4?.05:0)+v*.12}
 world(px,pz,p,now){const c=this.colors[p],cx=Math.floor(px/2),cz=Math.floor(pz/2),extent=11;for(let i=cx-extent;i<=cx+extent;i++)for(let j=cz-8;j<=cz+8;j++){let x=i*2,z=j*2,h=this.groundAt(x,z,p),v=this.hash(i,j,p),color=c[Math.min(3,Math.floor(v*4))];if(p>=4){if(v<.18){this.draw('cube',x,-.8,z,1,.13,1,c[2]);continue}this.draw('cube',x,-.75+h,z,1.03,.12+v*.13,1.03,color);if(v>.94)this.draw('sphere',x,-.50,z,.87,.2,.66,c[1]);}else{this.draw('cube',x,-.75+h,z,1.01,.2+v*.18,1.01,color);if(v>.96)this.draw('cone',x,-.37,z,.25,.3,.25,c[2]);}
 if(v>.985){let y=p>=4?-.32:-.32;this.draw('sphere',x-.3,y,z-.2,.23,.23,.23,p===2?'#6d9b6b':'#aca9a1')}if(p===2&&v>.978){this.draw('cube',x,-.28,z,.10,.48,.10,'#5a5745');this.draw('cone',x,.10,z,.45,.55,.45,'#376954')}}
 // Ruinas/puestos espaciales modelados en 3D, repetidos a lo largo del mundo.
 for(let i=Math.floor((px-30)/14);i<Math.ceil((px+30)/14);i++){let x=i*14+5,z=(i%4)*6+2;if(Math.abs(x-px)>31||Math.abs(z-pz)>24)continue;this.draw('cube',x,-.35,z,1.6,.46,1.5,p>=4?'#778397':'#65727a');this.draw('cube',x,.18,z,1.2,.24,1.1,'#8e9ba3');this.draw('sphere',x,.52,z,.64,.48,.6,'#96b4c1');this.draw('ring',x,.17,z,1.5,.10,1.4,'#bfd4cd');}
 }
 cat(x,z,dir,p,now,suit,brightness,attack,aimX,aimY,gait=0,move=0){
 // Brazos y piernas alternan solamente cuando el personaje se desplaza.
 // Al detenerse queda una respiración muy suave, no un caminar en el sitio.
 const stride=Math.sin(gait)*move, opposite=Math.sin(gait+Math.PI)*move;
 const stepUp=Math.max(0,stride)*.12,otherUp=Math.max(0,opposite)*.12;
 const hover=p>=4?.55+Math.sin(now*3)*.14:.04+Math.sin(now*1.7)*.018;
 const y=hover+Math.abs(stride)*.045,face=dir===-1?Math.PI:0;
 const ux=(aimX/this.scale-x),uz=(aimY/this.scale-z);
 const yaw=(ux*ux+uz*uz>0.0001)?Math.atan2(ux,uz):0;
 const d=(kind,px,py,pz,sx,sy,sz,color,rot=0,tilt=0)=>{
  let ax=px-x,az=pz-z,ca=Math.cos(yaw),sa=Math.sin(yaw);
  this.draw(kind,x+ax*ca+az*sa,py,z-ax*sa+az*ca,sx,sy,sz,color,rot+yaw,tilt);
 };
 const sc=CosmicRenderer3D.rgb(suit).map(v=>Math.min(1,v*brightness/100));
 const hex='#'+sc.map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('');
 const breath=Math.sin(now*2.2)*.012,bodyLean=move*Math.cos(gait)*.085;
 d('sphere',x,y+.56+breath,z+bodyLean,.38,.46,.27,hex,face,bodyLean);
 d('sphere',x,y+1.36+breath,z+bodyLean*.35,.49,.47,.44,'#eef0e9',0,move*Math.sin(gait)*.045);
 d('cone',x-.28,y+1.82+breath,z,.18,.22,.19,'#f5f4f0');d('cone',x+.28,y+1.82+breath,z,.18,.22,.19,'#f5f4f0');
 d('sphere',x-.16,y+1.41+breath,z+.39,.095,.12,.06,'#292e3c');d('sphere',x+.16,y+1.41+breath,z+.39,.095,.12,.06,'#292e3c');
 d('sphere',x,y+1.24+breath,z+.43,.07,.065,.04,'#ce929a');
 d('ring',x,y+1.38+breath,z,.50,.50,.50,'#b4d8e1',0,.15);
 d('sphere',x,y+.55,z+.275,.16,.18,.10,'#e3bd74');
 // Piernas de astronauta articuladas en dos pasos opuestos.
 d('sphere',x-.24,y+.06+stepUp,z+stride*.25,.17,.23,.19,hex,0,-stride*.30);
 d('sphere',x+.24,y+.06+otherUp,z+opposite*.25,.17,.23,.19,hex,0,-opposite*.30);
 d('sphere',x-.24,y-.09+stepUp,z+.10+stride*.31,.20,.10,.25,'#e6e8e4');
 d('sphere',x+.24,y-.09+otherUp,z+.10+opposite*.31,.20,.10,.25,'#e6e8e4');
 // Brazos se balancean al ritmo contrario a cada pierna.
 d('sphere',x-.49,y+.62+otherUp*.45,z+opposite*.25,.15,.25,.16,hex,0,opposite*.5);
 d('sphere',x+.49,y+.62+stepUp*.45,z+stride*.25,.15,.25,.16,hex,0,stride*.5);
 d('sphere',x-.51,y+.44+otherUp*.45,z+opposite*.3,.16,.11,.17,'#f1f0ee');
 d('sphere',x+.51,y+.44+stepUp*.45,z+stride*.3,.16,.11,.17,'#f1f0ee');
 // Cola visible: oscila en reposo y barre en arco durante un golpe.
 const swing=attack?Math.sin(Math.PI*attack)*2.4:Math.sin(now*2.1)*.20+stride*.16;
 d('sphere',x-.46-Math.cos(swing)*.30,y+.5+Math.sin(swing)*.4,z-.28,.33,.12,.12,'#f2f0ed',swing);
 if(p>=4){
  d('cube',x-.48,y+.72,z-.33,.23,.40,.30,'#697a90');
  d('cube',x-.48,y+.35,z-.37,.22,.22,.28,'#bac4c9');
  d('cone',x-.48,y-.1-Math.sin(now*12)*.06,z-.36,.14,.34,.14,'#8ec2ce',0,Math.PI);
  d('sphere',x-.48,y-.3,z-.36,.17,.25,.16,'#e3aa72');
 }
 }
 alien(x,z,type,now,gait=0,move=0,heroDistance=999,heading=0){
 // Enemigos normales: ahora giran el cuerpo completo hacia su dirección de movimiento.
 // Élite: zancada marcada. Jefe: pisada pesada y brazos que golpean cerca del gato.
 const mul=type===2?1.9:type===1?1.45:1;
 const stride=Math.sin(gait)*move,opp=Math.sin(gait+Math.PI)*move;
 const heavy=type===2?.09:type===1?.06:.035;
 const bob=Math.abs(stride)*heavy+Math.sin(now*(type===2?1.7:2.7)+x)*.022;
 const base=type===2?'#a65a67':type===1?'#a478af':'#5f9b76';
 const eye=type===2?'#ffba6a':type===1?'#ffc2e0':'#ffcf93';
 const ca=Math.cos(heading),sa=Math.sin(heading);
 const d=(kind,px,py,pz,sx,sy,sz,color,rot=0,tilt=0)=>{
  let ax=px-x,az=pz-z;
  this.draw(kind,x+ax*ca+az*sa,py,z-ax*sa+az*ca,sx,sy,sz,color,rot+heading,tilt);
 };
 d('sphere',x,.30*mul+bob,z,.49*mul,.27*mul,.44*mul,base);
 d('sphere',x,.48*mul+bob,z+.25*mul,.33*mul,.28*mul,.32*mul,base);
 d('sphere',x-.17*mul,.56*mul+bob,z+.5*mul,.09*mul,.09*mul,.06*mul,eye);
 d('sphere',x+.17*mul,.56*mul+bob,z+.5*mul,.09*mul,.09*mul,.06*mul,eye);
 d('sphere',x,.37*mul+bob,z+.57*mul,.15*mul,.12*mul,.11*mul,'#30433a');
 for(let side of [-1,1]){
  for(let front of [-1,1]){
   const step=(side===front?stride:opp),lift=Math.max(0,step)*.15*mul;
   d('sphere',x+side*.37*mul,.15*mul+bob+lift,z+front*.32*mul+step*.20*mul,.14*mul,.17*mul,.15*mul,type===2?'#874855':type===1?'#7e5d91':'#486c5b',0,step*.4);
   d('sphere',x+side*.39*mul,.06*mul+bob+lift,z+front*.34*mul+step*.25*mul,.17*mul,.07*mul,.18*mul,'#49625c');
  }
  const wiggle=Math.sin(now*(type===2?2.5:4.2)+side)*.25+stride*.18;
  d('cone',x+side*.24*mul+wiggle*.08*mul,.95*mul+bob,z+.2*mul+wiggle*.1*mul,.12*mul,.28*mul,.12*mul,type===2?'#d2a0ae':'#779b85',0,wiggle);
  d('sphere',x+side*.25*mul+wiggle*.12*mul,1.20*mul+bob,z+.2*mul+wiggle*.14*mul,.085*mul,.085*mul,.085*mul,eye);
 }
 const tailWag=Math.sin(now*(type===2?2:4)+x)*.20+stride*.10;
 d('sphere',x+tailWag*.4*mul,.38*mul+bob,z-.49*mul,.15*mul,.14*mul,.31*mul,base,tailWag);
 if(type>0){
  for(let side of [-1,1]){
   d('cone',x+side*.33*mul,.96*mul+bob,z-.13*mul,.14*mul,.26*mul,.14*mul,'#d8a5d0');
   const swipe=heroDistance<3.5*mul?Math.sin(now*(type===2?3.1:4.2)+side)*.42:Math.sin(now*1.8+side)*.08;
   d('sphere',x+side*(.57+Math.abs(swipe)*.10)*mul,.43*mul+bob,z+(.22+swipe)*mul,.22*mul,.19*mul,.24*mul,type===2?'#b25d6c':'#9a76ac',0,swipe);
   d('cone',x+side*.62*mul,.26*mul+bob,z+(.45+swipe)*mul,.11*mul,.18*mul,.12*mul,'#dfbbce');
  }
 }
 }
 pickup(x,z,type,now){let y=.35+Math.sin(now*2+x)*.14;const color=type===0?'#e7eee6':type===1?'#8bd6d8':'#dab776';this.draw(type===2?'cone':'cube',x,y,z,.24,.3,.2,color,now*.6);this.draw('ring',x,.01,z,.38,.06,.38,color,now*.5)}
  emitTail(x,z,now){this.slashes.push({x,z,born:now})} emitShot(x,z,tx,tz,now){this.projectiles.push({x,z,tx,tz,born:now})} emitHit(x,z,now){this.sparkles.push({x,z,born:now})}
  emitSpecial(x,z,tx,tz,planet,attack,type,now){this.specials.push({x,z,tx,tz,planet,attack,type,born:now})}
 project(x,y,z){const v=[x,y,z,1],m=CosmicRenderer3D.mul(this.proj,this.view),o=[0,0,0,0];for(let i=0;i<4;i++)for(let j=0;j<4;j++)o[i]+=m[j*4+i]*v[j];if(o[3]<=.01)return null;return [(o[0]/o[3]*.5+.5)*innerWidth,(-o[1]/o[3]*.5+.5)*innerHeight]}
 screenToGround(px,py){
  // Rayo desde el pixel real de pantalla hasta el plano del terreno y=0.
  if(!this.cpos||!this.target)return null;
  const [ex,ey,ez]=this.cpos,[tx,ty,tz]=this.target;
  let fx=tx-ex,fy=ty-ey,fz=tz-ez,fl=Math.hypot(fx,fy,fz);fx/=fl;fy/=fl;fz/=fl;
  let rx=-fz,ry=0,rz=fx,rl=Math.hypot(rx,rz);rx/=rl;rz/=rl;
  const ux=ry*fz-rz*fy,uy=rz*fx-rx*fz,uz=rx*fy-ry*fx;
  const aspect=this.canvas.width/this.canvas.height,half=Math.tan(Math.PI/6);
  const nx=(px/innerWidth*2-1)*half*aspect,ny=(1-py/innerHeight*2)*half;
  const dx=fx+rx*nx+ux*ny,dy=fy+uy*ny,dz=fz+rz*nx+uz*ny;
  if(dy>=-0.0001)return null;
  const t=-ey/dy;return {x:ex+dx*t,z:ez+dz*t};
 }
 render(hero,enemies,pickups,p,now,suit,brightness,run){const gl=this.gl;this.t=now;const x=hero.x/this.scale,z=hero.y/this.scale;const ratio=this.canvas.width/this.canvas.height;this.proj=CosmicRenderer3D.perspective(Math.PI/3,ratio,.2,150);let dist=15.5+(ratio<1?6:0);this.cpos=[x,dist,z+dist*.69];this.target=[x,0,z-1];this.view=CosmicRenderer3D.lookAt(this.cpos,this.target);gl.viewport(0,0,this.canvas.width,this.canvas.height);let fog=['#333842','#564538','#425d56','#6a4c44','#6c6470','#7e7078','#536d84','#364d75'][p];gl.clearColor(...CosmicRenderer3D.rgb(fog),1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);gl.uniform3fv(this.uFog,CosmicRenderer3D.rgb(fog));gl.uniformMatrix4fv(this.uView,false,new Float32Array(this.view));gl.uniformMatrix4fv(this.uProj,false,new Float32Array(this.proj));this.world(x,z,p,now);
 for(const ob of pickups){let ox=ob.x/this.scale,oz=ob.y/this.scale;if(Math.abs(ox-x)<30&&Math.abs(oz-z)<22)this.pickup(ox,oz,ob.type,now)}
 // El ciclo de pasos depende de desplazamiento real, no solo del reloj.
 const dt=this.previousRenderTime?Math.min(.08,Math.max(0,now-this.previousRenderTime)):0;
 this.previousRenderTime=now;
 if(this.heroLastPos){const travel=Math.hypot(x-this.heroLastPos.x,z-this.heroLastPos.z);const walking=travel>.004&&travel<3;
  this.heroMotion+=(walking?1:0);this.heroAnim+=walking?travel*10:0;
  this.heroMovement=Math.max(0,Math.min(1,(this.heroMovement||0)+(walking?dt*12:-dt*10)));
 }else this.heroMovement=0;
 this.heroLastPos={x,z};
 const aliveIds=new Set();
 for(const e of enemies){let ox=e.x/this.scale,oz=e.y/this.scale,id=e.id;aliveIds.add(id);
  let st=this.enemyMotion.get(id);if(!st){st={x:ox,z:oz,phase:id*.83,speed:0,heading:0};this.enemyMotion.set(id,st)}
  const dx=ox-st.x,dz=oz-st.z,travel=Math.hypot(dx,dz),moving=travel>.0005&&travel<3;
  st.phase+=moving?travel*(e.type===2?6:e.type===1?8:11):0;
  st.speed=Math.max(0,Math.min(1,st.speed+(moving?dt*10:-dt*8)));
  if(moving){
   const desired=Math.atan2(dx,dz);
   st.heading=CosmicRenderer3D.angleLerp(st.heading,desired,Math.min(1,dt*10+0.18));
  }
  st.x=ox;st.z=oz;
  if(Math.abs(ox-x)<30&&Math.abs(oz-z)<22)this.alien(ox,oz,e.type,now,st.phase,st.speed,Math.hypot(ox-x,oz-z),st.heading);
 }
 // Libera el estado de los enemigos eliminados para mantener el rendimiento.
 if(this.enemyMotion.size>95)for(const id of this.enemyMotion.keys())if(!aliveIds.has(id))this.enemyMotion.delete(id);
 this.cat(x,z,hero.dir,p,now,suit,brightness,run.tail,hero.aimX,hero.aimY,this.heroAnim,this.heroMovement||0);
 this.slashes=this.slashes.filter(e=>now-e.born<.38);for(const e of this.slashes){let a=(now-e.born)/.38;this.draw('ring',e.x, .78,e.z, .5+a*1.3,.07,.5+a*1.3,'#c8f3ee',now*8,.3);}
  this.projectiles=this.projectiles.filter(e=>now-e.born<.48);for(const e of this.projectiles){let a=Math.min(1,(now-e.born)/.46),u=e.x+(e.tx-e.x)*a,v=e.z+(e.tz-e.z)*a;this.draw('sphere',u,.8+Math.sin(a*Math.PI)*1.2,v,.21,.21,.21,'#f2a477');this.draw('sphere',u,.8+Math.sin(a*Math.PI)*1.2,v,.10,.1,.10,'#ffe7a9');}
  // Efectos de los dos ataques especiales por planeta. El planeta selecciona
  // una combinación de colores y formas; nunca se generan más de dos variantes.
  const specialColors=['#d8b36a','#7fd5e8','#f08b62','#d984c7','#e5c56b','#9cc4e9','#b5e37d','#a88ee8'];
  this.specials=this.specials.filter(e=>now-e.born<1.15);for(const e of this.specials){const a=Math.min(1,(now-e.born)/1.15),c=specialColors[e.planet],v=(e.planet*2+e.attack)%8;
    if(v===0||v===4){const r=.35+a*(e.type===2?3.8:2.7);this.draw('ring',e.x,.08,e.z,r,.10,r,c,now*2,.25);this.draw('sphere',e.x,.65+Math.sin(a*Math.PI)*1.3,e.z,.16+e.type*.06,.16+e.type*.06,.16+e.type*.06,c);}
    else if(v===2||v===6){for(let k=0;k<3;k++){const q=now*2+k*2.1,u=e.x+Math.cos(q)*a*1.5,w=e.z+Math.sin(q)*a*1.5;this.draw('sphere',u,.55+Math.sin(a*Math.PI),w,.14+e.type*.04,.14+e.type*.04,.14+e.type*.04,c);}}
    else if(v===1||v===5){const u=e.x+(e.tx-e.x)*a,vv=e.z+(e.tz-e.z)*a;this.draw('cone',u,.7+Math.sin(a*Math.PI)*.8,vv,.18+e.type*.06,.34+e.type*.12,.18+e.type*.06,c,Math.atan2(e.tx-e.x,e.tz-e.z),.5);this.draw('ring',e.x,.12,e.z,.45+a*1.8,.06,.45+a*1.8,c,now*3,.18);}
    else{for(let k=-1;k<=1;k+=2){const u=e.x+(e.tx-e.x)*a+k*.45*(1-a),w=e.z+(e.tz-e.z)*a;this.draw('cone',u,.7+Math.sin(a*Math.PI)*.8,w,.16+e.type*.05,.3+e.type*.1,.16+e.type*.05,c,Math.atan2(e.tx-e.x,e.tz-e.z)+k*.35,.5);}}
  }
 this.sparkles=this.sparkles.filter(e=>now-e.born<.45);for(const e of this.sparkles){let a=(now-e.born)/.45;this.draw('ring',e.x,.55,e.z,.15+a*.5,.07,.15+a*.5,'#eebf91')}
 // Etiquetas y barras de vida en una capa 2D transparente encima de la escena 3D.
 const g=this.og,sw=this.overlay.width/innerWidth,sh=this.overlay.height/innerHeight;g.setTransform(sw,0,0,sh,0,0);g.clearRect(0,0,innerWidth,innerHeight);
 for(const e of enemies){if(Math.abs(e.x/this.scale-x)>29||Math.abs(e.y/this.scale-z)>19)continue;let pos=this.project(e.x/this.scale,e.type?2.7:1.3,e.y/this.scale);if(!pos)continue;const bw=e.type?82:50;g.fillStyle='#152330d9';g.fillRect(pos[0]-bw/2,pos[1]-15,bw,7);g.fillStyle=e.type?'#e7a4b1':'#93ba9e';g.fillRect(pos[0]-bw/2,pos[1]-15,bw*Math.max(0,e.hp/e.max),7);if(e.type){g.fillStyle='#fff';g.font='bold 11px system-ui';g.textAlign='center';g.fillText(e.type===2?'👑 JEFE':'ÉLITE',pos[0],pos[1]-20)}}
 if(this.aimOverlay){const a=this.aimOverlay;
  g.beginPath();g.arc(a.hx,a.hy,250,0,2*Math.PI);g.strokeStyle='#9de5d844';g.lineWidth=1.5;g.stroke();
  g.beginPath();g.moveTo(a.sx-12,a.sy);g.lineTo(a.sx-5,a.sy);g.moveTo(a.sx+5,a.sy);g.lineTo(a.sx+12,a.sy);g.moveTo(a.sx,a.sy-12);g.lineTo(a.sx,a.sy-5);g.moveTo(a.sx,a.sy+5);g.lineTo(a.sx,a.sy+12);g.strokeStyle='#e5f4d9';g.lineWidth=2;g.stroke();
  g.beginPath();g.arc(a.sx,a.sy,3,0,Math.PI*2);g.fillStyle='#d7f9de';g.fill();
 }
 }
}
window.CosmicRenderer3D=CosmicRenderer3D;
