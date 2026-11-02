/* =================================================================
   GAME · lái xe WASD qua 5 trạm của vườn Ia Ko 1
   ================================================================= */
const REDUCED=matchMedia('(prefers-reduced-motion:reduce)').matches;
const SHOT=/[?&]shot/.test(location.search);
const ld=$('#ld');
if(SHOT){const st=document.createElement('style');st.textContent='*{transition:none!important;animation:none!important}';document.head.appendChild(st)}
function hideLoader(){if(ld&&!ld.classList.contains('out')){ld.classList.add('out');setTimeout(()=>ld.style.display='none',1300)}}
const W2=uv=>{const w=toW(uv);return[w[0],H(w[0],w[1]),w[1]]};
const HQ=W2([312,398]),PONDW=W2([360,440]);
function gH(x,z){return(x>FB.x0&&x<FB.x0+FB.w&&z>FB.z0&&z<FB.z0+FB.h)?fldAt(x,z,2):TH(x,z)}
const body=document.body;
function setSt(s){body.dataset.st=s;G.st=s}

/* ---------- trạng thái trò chơi ---------- */
const G={st:'intro',introT:0,view:null,hour:6.1,visited:[],next:0,stopT:0,rigW:0,rigK:null,rigT:0,titleT:0,titleK:null,playT:0,pauseA:0,pf:0,pfT:0,endT:0,free:false};
const ST=[
 {k:'gate',n:'Cổng vào',tag:'Trạm 1/5 · Cổng vào',h:'Chào mừng đến <em>Ia Ko 1</em>',sub:'Vườn cà phê xen cau Farmblock ở Gia Lai. Lái theo vạch vàng để đi hết 5 trạm.',f:[['22 ha','diện tích'],['8','khu canh tác'],['35','thiết bị theo thiết kế']],hour:7.0},
 {k:'over',n:'Toàn vườn',tag:'Trạm 2/5 · Toàn vườn',h:'8 khu, <em>một bản đồ</em>',sub:'Mỗi khu có mã riêng và được theo dõi tới từng hàng cây. Bấm nút tròn để bay lên xem toàn cảnh.',f:[['A–H','8 khu'],['3 × 1,5 m','hàng × cây']],hour:7.8},
 {k:'rows',n:'Hàng cà phê',tag:'Trạm 3/5 · Hàng cà phê',h:'Cà phê xen cau, <em>tưới tận gốc</em>',sub:'Robusta hàng cách hàng 3 m, cau làm đai chắn gió. Béc tưới đặt sát gốc từng cây, nước đi đúng chỗ rễ cần.',f:[['4','nông dân'],['12 m','lưới béc tưới']],hour:8.7},
 {k:'hq',n:'Trung tâm vườn',tag:'Trạm 4/5 · Trung tâm vườn',h:'Nhà điều hành <em>& hồ trữ nước</em>',sub:'Mái pin mặt trời, hồ lót HDPE có hàng rào an toàn, đội giám sát và kỹ sư trực tại vườn.',f:[['2','giám sát'],['4','kỹ sư']],hour:10.0},
 {k:'dev',n:'Trạm IoT',tag:'Trạm 5/5 · Trạm IoT',h:'Dữ liệu chảy về <em>trạm IoT trung tâm</em>',sub:'22 vị trí camera, đang lắp dần. 9 điểm đo đất theo thiết kế, 2 điểm đo nước và trạm thời tiết gửi số liệu về trung tâm.',f:[['22','vị trí camera'],['9','điểm đo đất'],['2','điểm đo nước']],hour:19.6},
 {k:'end',n:'Cổng ra',tag:'Ra về',h:'',sub:'',f:[],hour:19.8}
];
const STP=[];// vị trí trạm

/* ---------- bàn phím ---------- */
const KEY={};
const KMAP={KeyW:'f',ArrowUp:'f',KeyS:'b',ArrowDown:'b',KeyA:'l',ArrowLeft:'l',KeyD:'r',ArrowRight:'r',Space:'h'};
addEventListener('keydown',e=>{
  if(e.code==='Escape'){e.preventDefault();if(G.st==='play')pauseGame();else if(G.st==='pause')resumeGame();return}
  if(G.st==='intro'){endIntro();return}
  const k=KMAP[e.code];if(k){if(e.target.closest&&e.target.closest('a,button')&&k==='h')e.target.blur();e.preventDefault();KEY[k]=true;if(G.view&&k!=='h')setView(null);if(G.st==='start'&&CAR.ready&&(k==='f'))startGame()}
  if(e.code==='KeyT'&&(G.st==='play'||G.st==='start')){e.preventDefault();setData(!DATA.on);return}
  if(e.code==='Enter'&&G.st==='start'&&CAR.ready){e.preventDefault();startGame()}
});
addEventListener('keyup',e=>{const k=KMAP[e.code];if(k)KEY[k]=false});
addEventListener('blur',()=>{for(const k in KEY)KEY[k]=false;if(G.st==='play'&&!SHOT)pauseGame()});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&G.st==='play'&&!SHOT)pauseGame()});

/* ---------- kéo chuột ---------- */
const drag={on:false,x:0,y:0,vx:0,vy:0,az:0,el:0,tAz:0,tEl:0,yaw:0,pitch:0,tYaw:0,tPitch:0,idle:9};
const cv=$('#gl');
cv.addEventListener('pointerdown',e=>{drag.on=true;drag.x=e.clientX;drag.y=e.clientY;drag.vx=drag.vy=0;cv.classList.add('drag');cv.setPointerCapture(e.pointerId)});
addEventListener('pointermove',e=>{if(!drag.on)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;drag.vx=dx;drag.vy=dy;applyDrag(dx,dy)});
const endDrag=()=>{drag.on=false;cv.classList.remove('drag')};addEventListener('pointerup',endDrag);addEventListener('pointercancel',endDrag);
function applyDrag(dx,dy){drag.idle=0;dx=clamp(dx,-40,40);dy=clamp(dy,-40,40);if(G.st==='pause'){drag.tYaw-=dx*.0028;drag.tPitch=clamp(drag.tPitch-dy*.0022,-1.1,.9)}else{drag.tAz=clamp(drag.tAz-dx*.0024,-2.6,2.6);drag.tEl=clamp(drag.tEl+dy*.0013,-.15,.45)}}
// trang tạm dừng: ảnh tĩnh, parallax nhẹ theo chuột
const pph=$('#pph');addEventListener('pointermove',e=>{if(G.st!=='pause'||!pph)return;const x=e.clientX/innerWidth-.5,y=e.clientY/innerHeight-.5;pph.style.transform=`translate3d(${(-x*28).toFixed(1)}px,${(-y*18).toFixed(1)}px,0) scale(1.04)`});
/* ---------- màn chào mừng ---------- */
$('#welcome').addEventListener('click',()=>endIntro());
function endIntro(){if(G.st!=='intro')return;setSt('start');G.introT=99;camS.first=false}
/* ---------- xem các góc vườn ---------- */
const VBTN=$$('#views [data-v]');VBTN.forEach(b=>b.addEventListener('click',()=>{setView(G.view===b.dataset.v?null:b.dataset.v);b.blur()}));
$('#bdata').addEventListener('click',e=>{setData(!DATA.on);e.currentTarget.blur()});
$('#vback').addEventListener('click',e=>{setView(null);e.currentTarget.blur()});
const hot=$('#hot');let hotK=null;hot.addEventListener('click',()=>{if(hotK)setView(hotK);hot.blur()});
function setView(k){if(k&&G.st!=='play')return;G.view=k;if(k){G.rigK=k;G.rigT=0;showTitle(null)}body.classList.toggle('viewing',!!k);VBTN.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===k)))}

/* ---------- nút ---------- */
const bstart=$('#bstart');
bstart.addEventListener('click',()=>{if(CAR.ready)startGame()});
$('#bpause').addEventListener('click',()=>{G.st==='pause'?resumeGame():G.st==='play'&&pauseGame()});
$('#bresume').addEventListener('click',resumeGame);
$('#brestart').addEventListener('click',()=>{resetGame();startGame()});
$('#bagain').addEventListener('click',()=>{G.free=true;setSt('play');showTitle(null)});
function startGame(){if(document.activeElement)document.activeElement.blur();setSt('play');G.playT=0;showTitle(null);if(!G.visited.length)setTimeout(()=>{if(G.st==='play'&&!G.visited.length)showTitle(-1)},700)}
function pauseGame(){setSt('pause');for(const k in KEY)KEY[k]=false;if(pph){pph.style.animation='none';void pph.offsetWidth;pph.style.animation=''}}
function resumeGame(){setSt('play');G.pfT=0}
function resetGame(){G.visited=[];G.next=0;G.hour=6.1;G.free=false;G.rigW=0;setView(null);placeCar(STOP.hero);HUDS.forEach(h=>h.classList.remove('ok'))}

/* ---------- tiêu đề ---------- */
const ttl=$('#ttl'),ttlin=$('#ttlin');
function showTitle(i){
  if(i===null){ttl.classList.remove('on');G.titleK=null;return}
  let h;
  if(i==='start')h=`<svg class="mk"><use href="#mk"/></svg><span class="tag">Farmblock · Gia Lai</span><h1>Ia Ko 1</h1><div class="rule"></div><span class="loc">GIA LAI · 22 HA</span><p class="sub">Lái xe qua vườn cà phê xen cau, ghé 5 trạm từ cổng vào tới trạm IoT trung tâm.</p>`;
  else if(i===-1)h=`<span class="tag">Bắt đầu</span><h2>Đi theo <em>vạch vàng</em></h2><p class="sub">Vạch vàng dẫn tới trạm kế tiếp. Ở mỗi trạm, bấm nút tròn để xem cận cảnh.</p>`;
  else{const s=ST[i];h=`<span class="tag">${s.tag}</span><h2>${s.h}</h2><p class="sub">${s.sub}</p>`}
  ttlin.innerHTML=h;ttl.classList.remove('on');void ttl.offsetWidth;ttl.classList.add('on');G.titleK=i;G.titleT=0;
}

/* ---------- vạch vàng dẫn đường + cột mốc ---------- */
let GUIDE=null,BEACON=null;
function buildGuide(){
  const P=[],S=[],E=[],I=[];const o={p:new THREE.Vector3(),f:new THREE.Vector3(),r:new THREE.Vector3()};let k=0;const w=.05;
  for(let s=0;s<=RT.L+1e-6;s+=.035,k++){routeAt(s,o);for(const sd of[-1,1]){const x=o.p.x+o.r.x*w*sd,z=o.p.z+o.r.z*w*sd;P.push(x,gH(x,z)+.018,z);S.push(s);E.push(sd)}
    if(k>0){const a=(k-1)*2;I.push(a,a+1,a+2,a+1,a+3,a+2)}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('aS',new THREE.Float32BufferAttribute(S,1));g.setAttribute('aE',new THREE.Float32BufferAttribute(E,1));g.setIndex(I);
  const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4,side:THREE.DoubleSide,
    uniforms:{uTime:U.uTime,uS0:{value:0},uS1:{value:0},uOn:{value:0},uNight:{value:0}},
    vertexShader:`attribute float aS,aE;varying float vS,vE;void main(){vS=aS;vE=aE;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform float uTime,uS0,uS1,uOn,uNight;varying float vS,vE;void main(){
      if(vS<uS0-.02||vS>uS1)discard;
      float fadeA=smoothstep(uS0-.02,uS0+.35,vS),fadeB=1.-smoothstep(uS1-.25,uS1,vS);
      float ch=fract((vS-abs(vE)*.035)*7.-uTime*1.6);float arrow=smoothstep(.0,.08,ch)*(1.-smoothstep(.38,.5,ch));
      float edge=1.-smoothstep(.75,1.,abs(vE));
      float a=(.1+.32*arrow)*edge*fadeA*fadeB*uOn;
      vec3 c=mix(vec3(1.,.83,.28),vec3(1.,.9,.5),arrow);
      gl_FragColor=vec4(c*(1.+uNight*.6),a);}`});
  GUIDE=new THREE.Mesh(g,m);GUIDE.renderOrder=6;GUIDE.frustumCulled=false;scene.add(GUIDE);
  // cột mốc trạm kế tiếp
  const bg=new THREE.CylinderGeometry(.05,.05,1,20,1,true);bg.translate(0,.5,0);
  const bm=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,uniforms:{uTime:U.uTime,uOn:{value:0}},
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform float uTime,uOn;varying vec2 vUv;void main(){float a=pow(1.-vUv.y,1.6)*(.55+.45*sin(vUv.y*24.-uTime*4.))*.28+pow(1.-vUv.y,8.)*.3;gl_FragColor=vec4(vec3(1.,.85,.4)*a*uOn,1.);}`});
  BEACON=new THREE.Mesh(bg,bm);BEACON.scale.set(1,1.4,1);BEACON.renderOrder=7;scene.add(BEACON);BEACON.userData.t=0;
}
function updGuide(dt,sCar,sGoal,on){
  if(!GUIDE)return;const u=GUIDE.material.uniforms;u.uOn.value=lerp(u.uOn.value,on,1-Math.pow(.02,dt));u.uS0.value=sCar+.06;u.uS1.value=sGoal;u.uNight.value=LT.night;
  const bu=BEACON.material.uniforms;bu.uOn.value=u.uOn.value;
  const o=routeAt(sGoal,_g1);BEACON.position.copy(o.p);BEACON.userData.t+=dt;
  if(on>.5&&BEACON.userData.t>1.3){BEACON.userData.t=0;ripple(o.p.x,o.p.y+.02,o.p.z,'#FFD86A',.18,1.8,false)}
}
const _g1={p:new THREE.Vector3(),f:new THREE.Vector3(),r:new THREE.Vector3(),yaw:0},_g2={p:new THREE.Vector3(),f:new THREE.Vector3(),r:new THREE.Vector3(),yaw:0};

/* ---------- xe: vật lý đơn giản ---------- */
const PH={x:0,z:0,yaw:0,v:0,steer:0,s:0,bump:0,surf:'road',hitT:0};
function placeCar(s){const o=routeAt(s);PH.x=o.p.x;PH.z=o.p.z;PH.yaw=o.yaw;PH.v=0;PH.steer=0;PH.s=s;camS.yaw=o.yaw;camS.first=true}
function surfaceAt(x,z){
  if(x>FB.x0&&x<FB.x0+FB.w&&z>FB.z0&&z<FB.z0+FB.h&&inPoly(x,z,OUT)){if(fldAt(x,z,0)<RW)return'road';const zi=zoneAt(x,z);return zi>=0&&zi<8?'crop':'lawn'}
  return dRoute(x,z)<RW*1.2?'road':'lawn';
}
const VMAX={road:.8,lawn:.5,crop:.2};
function nearestRouteS(x,z,s0){let b=s0,bd=1e9;const i0=Math.max(0,Math.floor(s0/RT.step)-60),i1=Math.min(RT.n-1,Math.floor(s0/RT.step)+60);
  for(let i=i0;i<=i1;i++){const d=(RT.x[i]-x)**2+(RT.z[i]-z)**2;if(d<bd){bd=d;b=i*RT.step}}
  if(bd>.6){for(let i=0;i<RT.n;i+=2){const d=(RT.x[i]-x)**2+(RT.z[i]-z)**2;if(d<bd){bd=d;b=i*RT.step}}}return b}
function stepCar(dt){
  const ctrl=G.st==='play'&&G.rigW<.5;
  const f=ctrl&&KEY.f,b=ctrl&&KEY.b,l=ctrl&&KEY.l,r=ctrl&&KEY.r,h=ctrl&&KEY.h;
  PH.surf=surfaceAt(PH.x,PH.z);const vmax=VMAX[PH.surf];
  let v=PH.v;
  if(f){if(v<-.02)v+=2.0*dt;else v+=.62*Math.max(0,1-(v/vmax)**2)*dt}
  else if(b){if(v>.02)v-=1.8*dt;else v-=.45*Math.max(0,1-(v/-.32)**2)*dt}
  else{const drag=(PH.surf==='crop'?.9:.32)*dt;v=Math.abs(v)<drag?0:v-Math.sign(v)*drag}
  if(h){const k=2.6*dt;v=Math.abs(v)<k?0:v-Math.sign(v)*k}
  if(v>vmax)v=Math.max(vmax,v-1.4*dt);
  PH.v=v;
  const sIn=(l?1:0)-(r?1:0);const smax=.62/(1+Math.abs(v)*1.6);
  PH.steer=lerp(PH.steer,sIn*smax,1-Math.pow(sIn?.004:.0005,dt));
  PH.yaw+=v*Math.tan(PH.steer)/.28*dt;
  PH.x+=Math.sin(PH.yaw)*v*dt;PH.z+=Math.cos(PH.yaw)*v*dt;
  // va chạm
  const fx=Math.sin(PH.yaw),fz=Math.cos(PH.yaw);let hit=0;
  for(const off of[-.15,0,.15]){let cx=PH.x+fx*off,cz=PH.z+fz*off;const cr=.08;
    for(const c of COLS){const dx=cx-c.x,dz=cz-c.z,d2=dx*dx+dz*dz,R=c.r+cr;if(d2<R*R){const d=Math.sqrt(d2)||1e-4,push=R-d;PH.x+=dx/d*push;PH.z+=dz/d*push;cx+=dx/d*push;cz+=dz/d*push;hit=1}}
    for(const q of RECTS){const dx=cx-q.cx,dz=cz-q.cz;const lx=dx*q.c+dz*q.s,lz=-dx*q.s+dz*q.c;const px=clamp(lx,-q.hx,q.hx),pz=clamp(lz,-q.hz,q.hz);let ex=lx-px,ez=lz-pz,d=Math.hypot(ex,ez);
      if(d<cr){if(d<1e-5){const ax=q.hx-Math.abs(lx),az=q.hz-Math.abs(lz);if(ax<az){ex=Math.sign(lx);ez=0;d=-ax}else{ex=0;ez=Math.sign(lz);d=-az}}else{ex/=d;ez/=d}
        const push=cr-d;const wx=ex*q.c-ez*q.s,wz=ex*q.s+ez*q.c;PH.x+=wx*push;PH.z+=wz*push;cx+=wx*push;cz+=wz*push;hit=1}}}
  if(hit){PH.v*=Math.pow(.02,dt);if(PH.hitT<=0&&Math.abs(v)>.3){PH.hitT=.6}}PH.hitT-=dt;
  // chỉ cho xe chạy trong lòng tuyến đường
  PH.s=nearestRouteS(PH.x,PH.z,PH.s);{const o=routeAt(PH.s,_g2);const dx=PH.x-o.p.x,dz=PH.z-o.p.z;const lat=dx*o.r.x+dz*o.r.z,lon=dx*o.f.x+dz*o.f.z;const LW=.12;
    if(Math.abs(lat)>LW){const ex=lat-Math.sign(lat)*LW;PH.x-=o.r.x*ex;PH.z-=o.r.z*ex;PH.v*=Math.pow(.25,dt);
      const fy=Math.atan2(o.f.x,o.f.z),back=Math.cos(PH.yaw-fy)<0?Math.PI:0;PH.yaw+=wrapA(fy+back-PH.yaw)*(1-Math.pow(.05,dt))}
    if((PH.s<.02&&lon<0)||(PH.s>RT.L-.02&&lon>0)){PH.x-=o.f.x*lon;PH.z-=o.f.z*lon;PH.v=0}}
}
const _X1=new THREE.Vector3(1,0,0);const _cs2={p:new THREE.Vector3(),f:new THREE.Vector3(),r:new THREE.Vector3(),yaw:0};
function poseCar(dt,lt){
  if(!CAR.g)return _cs2;const c=_cs2;const fx=Math.sin(PH.yaw),fz=Math.cos(PH.yaw);
  c.p.set(PH.x,gH(PH.x,PH.z),PH.z);c.f.set(fx,0,fz);c.r.set(-fz,0,fx);c.yaw=PH.yaw;
  const hl=.135,hw=.07;const hf=gH(PH.x+fx*hl,PH.z+fz*hl),hb=gH(PH.x-fx*hl,PH.z-fz*hl),hr=gH(PH.x-fz*hw,PH.z+fx*hw),hL=gH(PH.x+fz*hw,PH.z-fx*hw);
  const sp=Math.abs(PH.v);const rough=PH.surf==='crop'?.004:PH.surf==='lawn'?.0018:.0007;PH.bump+=sp*dt*40;
  const bump=(Math.sin(PH.bump*1.7)*.6+Math.sin(PH.bump*3.9+1.3)*.4)*rough*Math.min(1,sp*4);
  CAR.g.position.set(PH.x,(hf+hb+hr+hL)/4+bump,PH.z);
  const lat=PH.v*PH.v*Math.tan(PH.steer)/.28;// gia tốc ngang
  CAR.g.rotation.order='YXZ';CAR.g.rotation.set(-Math.atan2(hf-hb,2*hl)+bump*3,PH.yaw,Math.atan2(hr-hL,2*hw)-clamp(lat*.06,-.06,.06));
  // bánh xe: giới hạn góc quay mỗi khung để tránh nhấp nháy răng cưa
  const dSpin=clamp(PH.v*dt/(.4*M2U),-.2,.2);CAR.spin+=dSpin;CAR.steer=PH.steer*1.4;
  CAR.wheels.forEach(w=>{w.rotation.z=-CAR.spin});CAR.front.forEach(w=>{w.rotation.y=CAR.steer});
  if(CAR.wg)CAR.wg.forEach(w=>{const ax=w.ax||_X1;if(w.a0===undefined)w.a0=Math.atan2(-ax.z,ax.x);w.sp.quaternion.setFromAxisAngle(ax,CAR.spin);w.st.rotation.y=-w.a0+(w.front?CAR.steer:0)});
  const lamp=clamp(LT.night*1.4,0,1);CAR.lights.forEach(L=>{L.intensity=lamp*1.1*Math.PI});CAR.glows.forEach(g=>{g.material.opacity=lamp;g.visible=lamp>.02});
  const brake=(KEY.b&&PH.v>.02)||KEY.h?1:0;CAR.tail.forEach(g=>{g.material.opacity=Math.min(1,.2+lamp*.6+brake*.8)});
  updDust(dt,c,PH.surf==='road'||PH.surf==='lawn'?sp:sp*.5,lt);
  return c;
}

/* ---------- camera ---------- */
const camS={yaw:0,p:new THREE.Vector3(),t:new THREE.Vector3(),fov:42,first:true};
const CP=new THREE.Vector3(),CT=new THREE.Vector3(),_rgo={p:new THREE.Vector3(),t:new THREE.Vector3()},_rs={p:new THREE.Vector3(),f:new THREE.Vector3(),r:new THREE.Vector3(),yaw:0};
function wrapA(a){while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a}
function chaseCam(c,dt){
  // yaw camera bám theo hướng xe (khi lùi vẫn giữ phía sau)
  const k=1-Math.pow(.06,dt);camS.yaw+=wrapA(c.yaw-camS.yaw)*k;
  const az=camS.yaw+drag.az,sp=Math.abs(PH.v);const dist=1.0+sp*.18,up=.3+drag.el*.9;
  const fx=Math.sin(az),fz=Math.cos(az);
  CP.set(c.p.x-fx*dist,c.p.y+up,c.p.z-fz*dist);CT.set(c.p.x+fx*1.25,c.p.y+.1,c.p.z+fz*1.25);
}
const ENV0={fov:42,cover:0,pc:.55,fogA:.012,fogY:-3,tilt:0,rays:.3,bloom:.45,sh:4};
const ENVR={gate:{fov:38,sh:5,rays:.2},over:{fov:40,cover:.18,pc:.35,fogA:.008,fogY:-5,tilt:.3,sh:46},rows:{fov:34,sh:3,fogY:-6},hq:{fov:44,tilt:.25,sh:8},dev:{fov:42,cover:.12,sh:14,bloom:.6},end:{fov:38,sh:5}};
const ENV={...ENV0};

/* ---------- nhãn ---------- */
const pinBox=$('#pins');
const HUBL=(()=>{const b=document.createElement('div');b.className='hub';b.innerHTML='<span class="tag">Farmblock IoT</span><b>Trạm IoT trung tâm</b><small>Thiết kế cho 35 thiết bị trong vườn</small>';pinBox.appendChild(b);return{el:b,v:new THREE.Vector3()}})();
const ZPINS=ZD.slice(0,8).map((z,i)=>{const w=toW(z.lab);const b=document.createElement('div');b.className='zp';b.innerHTML=`<b>${z.id}</b><small>Khu</small>`;pinBox.appendChild(b);return{el:b,v:new THREE.Vector3(w[0],H(w[0],w[1])+1.6,w[1])}});
const HQPINS=[['Nhà điều hành',HQ,.62],['Hồ trữ nước',PONDW,.12],['Trạm thời tiết',W2([300,462]),.66]].map(a=>{const b=document.createElement('div');b.className='hp';b.textContent=a[0];pinBox.appendChild(b);return{el:b,v:new THREE.Vector3(a[1][0],a[1][1]+a[2],a[1][2])}});
let RPINS=[];
function buildRolePins(){RPINS=PEOPLE.map(P=>{const b=document.createElement('div');b.className='hp rp';b.textContent=P.role;pinBox.appendChild(b);return{el:b,v:new THREE.Vector3(P.x,gH(P.x,P.z)+2.15*M2U,P.z),P}})}
const _p=new THREE.Vector3(),_f=new THREE.Vector3();
function placePin(o,show){_p.copy(o.v).project(camera);if(show>.02&&_p.z<1&&Math.abs(_p.x)<1.05&&Math.abs(_p.y)<1.05){o.el.style.transform=`translate3d(${((_p.x*.5+.5)*W).toFixed(1)}px,${((-_p.y*.5+.5)*Hh).toFixed(1)}px,0) translate(-50%,-100%)`;o.el.style.opacity=show}else o.el.style.opacity=0}

/* ---------- HUD ---------- */
let HUD=null;const HUDS=[];
function buildHud(){
  const el=$('#hud');if(!el)return;
  const pts=a=>a.map(p=>p[0]+','+p[1]).join(' ');
  const rp=[];for(let i=0;i<RT.n;i+=6)rp.push([(RT.x[i]*SC+500).toFixed(1),(RT.z[i]*SC+370).toFixed(1)]);
  const st=ST.slice(0,5).map((s,j)=>{const o=routeAt(STOP[s.k]);return`<g transform="translate(${(o.p.x*SC+500).toFixed(1)},${(o.p.z*SC+370).toFixed(1)})"><circle r="17"/><text y="6">${j+1}</text></g>`}).join('');
  el.querySelector('svg').innerHTML=`<polygon class="o" points="${pts(OUT_UV)}"/>${ZD.slice(0,8).map(z=>`<polygon class="z" points="${pts(z.poly)}"/>`).join('')}<rect class="pd" x="${360-24.5}" y="${440-14}" width="49" height="28" rx="4"/>
    <polyline class="r" points="${pts(rp)}"/><g class="st">${st}</g><g id="hcar"><circle r="14" class="cc"/><path d="M0,-27 L10,-8 L-10,-8Z" class="ca"/></g>`;
  $$('.st g',el).forEach(g=>HUDS.push(g));
  HUD={el,car:el.querySelector('#hcar'),spd:$('#hspd'),st:$('#hst'),clk:$('#hclk')};
}
function updHud(){
  if(!HUD)return;
  HUD.car.setAttribute('transform',`translate(${(PH.x*SC+500).toFixed(1)},${(PH.z*SC+370).toFixed(1)}) rotate(${(180-PH.yaw*180/Math.PI).toFixed(1)})`);
  HUD.spd.textContent=Math.round(Math.abs(PH.v)*11.6*3.6);
  HUD.st.textContent=Math.min(5,G.visited.length)+'/5 trạm';
  const h=((G.hour%24)+24)%24,hh=Math.floor(h),mm=Math.floor((h-hh)*60/5)*5;HUD.clk.textContent=String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0');
}
const garr=$('#garr'),gsm=$('#gsm'),gtx=$('#gtx'),hint=$('#hint');
function updGoal(c){
  const i=G.next;
  if(G.free||i>=ST.length){gsm.textContent='Tự do khám phá';gtx.textContent='Lái quanh vườn, Esc để tạm dừng';garr.style.transform='rotate(0deg)';return}
  const s=ST[i],sg=STOP[s.k];const rem=Math.max(0,(sg-PH.s))*11.6;
  const lab=i<5?`Trạm ${i+1} · ${s.n}`:'Cổng ra · kết thúc chuyến';if(gtx.textContent!==lab)gtx.textContent=lab;
  gsm.textContent=rem>15?`Tiếp theo · còn ${rem>=1000?fmt(rem/1000,1)+' km':Math.round(rem/10)*10+' m'}`:'Đã tới nơi';
  const ah=routeAt(Math.min(sg,PH.s+.9),_g1);const dx=ah.p.x-PH.x,dz=ah.p.z-PH.z;
  const fx=Math.sin(camS.yaw),fz=Math.cos(camS.yaw);const a=Math.atan2(dx*(-fz)+dz*fx,dx*fx+dz*fz);
  garr.style.transform=`rotate(${(a*180/Math.PI).toFixed(0)}deg)`;
}

/* ---------- trạm ---------- */
function updStations(dt){
  if(G.st!=='play')return;
  const i=G.next;if(G.free||i>=ST.length)return;
  const s=ST[i],o=STP[i];const d=Math.hypot(PH.x-o.x,PH.z-o.z);
  if(d<(s.k==='over'?.75:.6)&&Math.abs(PH.s-STOP[s.k])<1.2){
    if(s.k==='end'){setSt('end');G.endT=0;showTitle(null);return}
    G.visited.push(s.k);G.next++;HUDS[i]&&HUDS[i].classList.add('ok');showTitle(i);
  }
}
function updRig(dt){
  // camera trình diễn chỉ bật khi người dùng bấm nút (nút tròn ở trạm hoặc thanh góc nhìn)
  const want=G.view&&G.st==='play'?1:0;if(!want&&G.rigW<.002)G.rigK=null;
  G.rigW=lerp(G.rigW,want,1-Math.pow(want?.25:.02,dt));if(G.rigW<.002)G.rigW=0;
  if(want)G.rigT+=dt;return G.rigW;
}

/* ---------- hoạt cảnh nhỏ ---------- */
function animLife(dt,t){
  DEV.forEach(d=>{if(d.k!=='cam'||!d.head)return;d.head.rotation.y=d.pan0+Math.sin(t*.18+d.idx*1.7)*.75});
  if(typeof anemo!=='undefined'&&anemo)anemo.rotation.y-=dt*2;
  const bOn=LT.day>.3;
  BIRDS.forEach(b=>{const u=b.userData;b.visible=bOn;if(!bOn)return;const a=t*(u.f?.11:-.09)+(u.f?2:0);const R=u.f?11:8;const cx=u.f?-4:6,cz=u.f?-3:5;
    const fx=Math.cos(a),fz=Math.sin(a);const tx=-fz*(u.f?1:-1),tz=fx*(u.f?1:-1);
    b.position.set(cx+fx*R+(tx*u.dz+(-tz)*u.dx)*.18,3+u.f*.8+u.dy*.2+Math.sin(t*.7+u.o)*.08,cz+fz*R+(tz*u.dz+tx*u.dx)*.18);b.scale.setScalar(.13);
    b.rotation.y=Math.atan2(tx,tz);const fl=Math.sin(t*11+u.ph)*.7;u.L.rotation.z=fl;u.R.rotation.z=-fl});
  for(let i=FX.length-1;i>=0;i--)if(!FX[i](dt))FX.splice(i,1);
}

/* ---------- tự hạ/tăng độ phân giải theo tốc độ khung hình ---------- */
const AQ={t0:0,n:0,acc:0,lastNow:0,cool:0};
function adaptQ(now){if(!AQ.lastNow){AQ.lastNow=now;return}const ms=now-AQ.lastNow;AQ.lastNow=now;if(ms>250)return;AQ.acc+=ms;AQ.n++;
  if(AQ.acc<1500)return;const avg=AQ.acc/AQ.n;AQ.acc=0;AQ.n=0;if(AQ.cool>0){AQ.cool--;return}
  let d=DPR;if(avg>22&&DPR>.6)d=Math.max(.6,DPR-(avg>34?.25:.12));else if(avg<13.5&&DPR<DPR_MAX)d=Math.min(DPR_MAX,DPR+.1);
  if(Math.abs(d-DPR)>.01){setDPR(d);AQ.cool=1}}
/* ---------- vòng lặp ---------- */
let last=performance.now(),firstFrames=0;
const shade=$('#lshade');
const _rig={p:new THREE.Vector3(),t:new THREE.Vector3()},_ia=new THREE.Vector3(),_ib=new THREE.Vector3();
function frame(now){
  const dt=SHOT?.05:Math.min(.05,(now-last)/1000);last=now;
  U.uTime.value+=dt;const t=U.uTime.value;
  const playing=G.st==='play',paused=G.st==='pause';
  if(!paused){
    stepCar(playing?dt:0);updStations(dt);
    if(playing)G.playT+=dt;
    if(G.titleK!==null){G.titleT+=dt;const lim=G.titleK==='start'?1e9:G.titleK===-1?5:9;if(G.titleT>lim&&G.rigW<.5)showTitle(null)}
    if(G.st==='start'&&G.titleK!=='start')showTitle('start');
  }
  // giờ trong ngày theo tiến trình
  const tgt=G.st==='intro'?6.15:G.st==='start'?6.25:G.next<ST.length?(G.next===0?6.4:ST[G.next-1].hour):19.8;
  if(!paused){const rate=Math.abs(tgt-G.hour)>3?1.1:.18;G.hour+=clamp(tgt-G.hour,-rate*dt,rate*dt)}
  const c=poseCar(paused?0:dt,LT.lt||{sun:new THREE.Color(1,1,1),si:1,hs:new THREE.Color(1,1,1),hi:1});
  // camera
  if(!paused){
    if(!drag.on){drag.idle+=dt;if(drag.idle>1.5&&(Math.abs(PH.v)>.05||G.st!=='play')){const dk=1-Math.pow(.35,dt);drag.tAz*=1-dk;drag.tEl*=1-dk}}
    {const k=1-Math.pow(.004,dt);drag.az+=(drag.tAz-drag.az)*k;drag.el+=(drag.tEl-drag.el)*k}
    drag.idle=drag.on?0:drag.idle;
    chaseCam(c,dt);
    if(G.st==='start'||G.st==='intro'){const sw=Math.sin(t*.15)*.12;const fx=Math.sin(camS.yaw+drag.az+sw),fz=Math.cos(camS.yaw+drag.az+sw);CP.set(c.p.x-fx*1.15,c.p.y+.3+drag.el*.9,c.p.z-fz*1.15);CT.set(c.p.x+fx*2.4,c.p.y+.22,c.p.z+fz*2.4)}
    if(G.st==='intro'){// bay từ trên cao xuống sau xe
      G.introT+=dt;const k=sstep(0,1,clamp((G.introT-.6)/8.4,0,1)),e=k*k*(3-2*k);
      _ia.set(-1+15,17,4+21);_ib.set(-1,0,4);_ia.lerp(CP,e);_ia.y+=Math.sin(Math.PI*e)*3.5*(1-e);_ib.lerp(CT,sstep(.15,1,e));CP.copy(_ia);CT.copy(_ib);
      if(G.introT>9.4)endIntro()}
    const rw=updRig(dt);
    if(G.st==='end'){G.endT+=dt;const a=G.endT*.12+.9;const dd=1.05+Math.min(G.endT*.08,.5);CP.set(c.p.x+Math.sin(PH.yaw+a)*dd,c.p.y+.13+Math.min(G.endT*.02,.2),c.p.z+Math.cos(PH.yaw+a)*dd);CT.set(c.p.x,c.p.y+.08,c.p.z)}
    let ek=null;
    if(rw>0&&G.rigK){const ro=routeAt(STOP[G.rigK],_rs);rig(G.rigK,ro,clamp(G.rigT/14,0,1),_rig);const e=rw*rw*(3-2*rw);CP.lerp(_rig.p,e);CT.lerp(_rig.t,e);ek=G.rigK;
      if(G.rigK==='over'){const lift=Math.sin(Math.PI*e)*2.5*(1-e);CP.y+=lift}}
    // tham số khí quyển
    const R=G.st==='intro'?{fogA:.004,fov:44,sh:30,rays:.5}:ek?ENVR[ek]:null,rk=G.st==='intro'?1:ek?rw:0;for(const key in ENV0){const tv=R&&R[key]!==undefined?lerp(ENV0[key],R[key],rk):ENV0[key];ENV[key]=camS.first?tv:lerp(ENV[key],tv,1-Math.pow(.05,dt))}
    if(camS.first||G.st==='intro'){camS.p.copy(CP);camS.t.copy(CT);camS.first=false}else{const k=1-Math.pow(.0009,dt);camS.p.lerp(CP,k);camS.t.lerp(CT,k)}
    camera.position.copy(camS.p);
    const g0=gH(camera.position.x,camera.position.z);if(camera.position.y<g0+.05)camera.position.y=g0+.05;
    camera.lookAt(camS.t);if(SHOT&&G.camo){camera.position.fromArray(G.camo[0]);camera.lookAt(new THREE.Vector3().fromArray(G.camo[1]))}camera.fov=ENV.fov;const hA=camera.position.y-g0;camera.near=clamp(hA*.1,.005,.25);camera.far=hA<3?1700:2600;camera.updateProjectionMatrix();camera.updateMatrixWorld();
    {const fw=_f.subVectors(camS.t,camera.position);fw.y=0;const L=fw.length()||1;fw.multiplyScalar(Math.min(L,ENV.sh*.75)/L);GL.shC.copy(camera.position).add(fw);GL.shC.y=gH(GL.shC.x,GL.shC.z)}
    GU2.uCamP.value.copy(camera.position);GU2.uFocus.value.copy(GL.shC);GU2.uShR.value=ENV.sh;
    updVeg(camera,Hh*DPR);updGrass(camera);
    ATM.hour=G.hour;ATM.cover=ENV.cover;ATM.dens=1;ATM.cb=72;ATM.ct=104;ATM.fogA=ENV.fogA+LT.night*.012;ATM.fogY=ENV.fogY;ATM.tilt=ENV.tilt;ATM.rays=ENV.rays*(1-LT.night);ATM.bloom=ENV.bloom+LT.night*.15;ATM.shR=ENV.sh;ATM.pc=ENV.pc;
    GU.uDry.value=.06;U.uRainV.value=0;GL.focus=camS.t;
    const lit=applyLight();LT.lt=lit.lt;updPond(camera,lit.lt,sunDirAt(((G.hour%24)+24)%24));
    ATM.exposure=1.0+LT.night*.25;ATM.warm=LT.golden*.35;
    // thế giới sống
    updPeople(dt,PH.x,PH.z,G.rigW>.1);
    const nearHQ=Math.hypot(PH.x-STP[3].x,PH.z-STP[3].z);
    const strOn=G.visited.includes('dev')||ek==='dev'?1:clamp(1.2-(nearHQ-1.5)/3,0,1)*.7;STREAMS&&(STREAMS.cur=lerp(STREAMS.cur||0,strOn,1-Math.pow(.2,dt)));updStreams(dt,STREAMS?STREAMS.cur:0);
    updSprinklers(dt,PH.x,PH.z,1);
    IRR.forEach(p=>{const on=LT.day*(G.hour<17?1:0)*(ek==='over'?1-rw:1);p.visible=on>.02;const u=p.material.uniforms;u.uOn.value=on;u.uSC.value.copy(lit.lt.sun).multiplyScalar(lit.lt.si);u.uSD.value.copy(lit.sd)});
    updGates(LT.night);LAMPS.forEach(s=>{s.visible=LT.night>.1;s.material.opacity=LT.night});
    animLife(dt,t);
    // vạch dẫn đường
    const gi=G.next;const sg=!G.free&&gi<ST.length?STOP[ST[gi].k]:PH.s;updGuide(dt,PH.s,sg,playing&&!G.free&&gi<ST.length&&G.rigW<.3?1:0);
    // nhãn
    const tq=G.titleK===null?1:0;ZPINS.forEach(o=>placePin(o,ek==='over'?rw*tq:0));
    const hqS=(ek==='hq'||ek==='dev'?rw:clamp(1-(nearHQ-1.2)/1.2,0,1)*(playing?.9:0))*tq;HQPINS.forEach(o=>placePin(o,hqS));
    RPINS.forEach(o=>{const d=Math.hypot(PH.x-o.v.x,PH.z-o.v.z);placePin(o,playing&&!ek?clamp(1-(d-.9)/.5,0,1):0)});
    // nút tròn cận cảnh tại trạm gần nhất
    {let bk=null,bd=2.2;if(playing&&!G.view)ST.slice(0,5).forEach((st,i)=>{const d=Math.hypot(PH.x-STP[i].x,PH.z-STP[i].z);if(d<bd){bd=d;bk=st.k}});
      hotK=bk;if(bk){const o=STP[ST.findIndex(q=>q.k===bk)];_p.set(o.x,gH(o.x,o.z)+.42,o.z).project(camera);const on=_p.z<1&&Math.abs(_p.x)<.95&&Math.abs(_p.y)<.9;
        hot.classList.toggle('on',on);if(on)hot.style.transform=`translate3d(${((_p.x*.5+.5)*W).toFixed(1)}px,${((-_p.y*.5+.5)*Hh).toFixed(1)}px,0)`}else hot.classList.remove('on')}
    // nhãn trạm IoT trung tâm trên cột sáng
    if(HUBL&&STREAMS){HUBL.v.copy(STREAMS.hub);HUBL.v.y+=1.6;placePin(HUBL,clamp((STREAMS.cur-.25)*2.5,0,1)*(G.st==='end'?0:1))}
    updData(dt,t,ek,rw);
    updHud();updGoal(c);
    hint.style.opacity=playing&&G.playT<14&&!G.visited.length?1:0;
    if(!G.noR)renderFrame(t);
  }else{
    // tạm dừng: ảnh tĩnh (CSS), không vẽ WebGL để máy nghỉ
    [ZPINS,HQPINS,RPINS,[HUBL],DATA.cpins,DATA.zpins,DATA.spins].forEach(a=>a.forEach(o=>o.el.style.opacity=0));hot.classList.remove('on');
  }
  if(shade)shade.style.opacity=0;
  if(!SHOT&&!paused)adaptQ(now);
  firstFrames++;if(firstFrames===4)hideLoader();
  if(!SHOT)requestAnimationFrame(frame);
}
function boot(){
  if(!initEngine(cv)){document.documentElement.classList.add('nogl');hideLoader();return}
  buildRoute();flattenGates();buildGround();setStops();STOP.end=RT.cross[RT.cross.length-1]+.5;buildWater();placeVeg();buildDevices();buildLedGlows();buildWorld();buildFlies();buildBirds();
  buildOuterRoads();buildCar();buildHud();buildGuide();buildData();loadSensors();buildGates();buildStoneGates();buildFlags();buildBigFlags();buildPondFence();buildStreams();buildSprinklerGrid();
  ST.forEach(s=>{const o=routeAt(STOP[s.k]);STP.push({x:o.p.x,z:o.p.z})});
  placeCar(STOP.hero);setSt(SHOT?'start':'intro');
  Promise.all(['mxanim','pick1','pick2','farmerB','workers','talk','businessman','gracy','cctv','pump','lamp','hat'].map(n=>loadM(n).catch(e=>console.warn('model',n,e)))).then(()=>{try{placePeople();buildRolePins();upgradeCams();buildHQGarden()}catch(e){console.warn('people',e)}});
  const ready=()=>{if(CAR.ready){bstart.disabled=false;bstart.innerHTML='Bắt đầu lái <span class="kbd" style="background:rgba(17,38,21,.12)">W</span>'}else setTimeout(ready,300)};ready();
  addEventListener('resize',()=>resizeEngine());
  if(SHOT){window.__eval=s=>eval(s);window.__shot=(s,n)=>{for(let k=0;k<(n||30);k++)frame(performance.now());return 1};
    window.__drive=(keys,sec)=>{for(const k in KEY)KEY[k]=false;(keys||'').split('').forEach(k=>KEY[k]=true);const n=Math.round(sec/.05);for(let i=0;i<n;i++){G.noR=i<n-1;frame(performance.now())}G.noR=false;for(const k in KEY)KEY[k]=false;return [PH.x,PH.z,PH.v,PH.s,G.visited.join(',')]};
    window.__auto=(sec,stopAt)=>{const n=Math.round(sec/.05);for(let i=0;i<n;i++){for(const k in KEY)KEY[k]=false;const a=routeAt(PH.s+.3,_g1);const dx=a.p.x-PH.x,dz=a.p.z-PH.z;const fx=Math.sin(PH.yaw),fz=Math.cos(PH.yaw);const ang=Math.atan2(dx*(-fz)+dz*fx,dx*fx+dz*fz);
      if(ang>.06)KEY.r=true;else if(ang<-.06)KEY.l=true;KEY.f=true;if(stopAt&&G.visited.length>=stopAt){KEY.f=false;KEY.h=true}G.noR=i<n-1;frame(performance.now())}G.noR=false;for(const k in KEY)KEY[k]=false;return [PH.x.toFixed(2),PH.z.toFixed(2),PH.v.toFixed(2),PH.s.toFixed(2),G.visited.join(','),G.st]};
    window.__ready=true;return}
  requestAnimationFrame(frame);
}
boot();
