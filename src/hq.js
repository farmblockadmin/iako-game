/* =================================================================
   HQ · nhà điều hành mái pin mặt trời, nhà bơm, hồ lót bạt HDPE, tưới béc
   (mô phỏng theo ảnh flycam thực tế; kích thước tính bằng mét)
   ================================================================= */
const DS=.16; // tỷ lệ thiết bị (mô hình cũ -> thật)

/* ---------- vật liệu ---------- */
let HQT=null;
function hqTex(){if(HQT)return HQT;HQT={iron:ptx('iron'),conc:ptx('conc')};return HQT}
function pbrMat(t,o){ // vật liệu dùng bộ texture đóng gói, uv theo mét
  const m=new THREE.MeshStandardMaterial(Object.assign({map:t.c,normalMap:t.n,roughness:1,metalness:0},o||{}));
  m.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <roughnessmap_fragment>','float roughnessFactor=roughness*texture2D(map,vMapUv).a;')
    .replace('#include <normal_fragment_maps>','vec3 mapN=texture2D(normalMap,vNormalMapUv).xyz*2.-1.;mapN.z=sqrt(max(1.-dot(mapN.xy,mapN.xy),0.));mapN.xy*=normalScale;normal=normalize(tbn*mapN);')
    .replace('#include <aomap_fragment>','#include <aomap_fragment>\nreflectedLight.indirectDiffuse*=mix(1.,texture2D(normalMap,vNormalMapUv).b,.7);')};
  return m;
}
function solarMat(){
  const m=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.14,metalness:.35});
  m.onBeforeCompile=sh=>{
    sh.vertexShader=sh.vertexShader.replace('#include <uv_pars_vertex>','#include <uv_pars_vertex>\nvarying vec2 vSu;').replace('#include <uv_vertex>','#include <uv_vertex>\nvSu=uv;');
    sh.fragmentShader='varying vec2 vSu;\n'+sh.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );',`
      vec2 mu=fract(vSu),cu=fract(vSu*vec2(6.,10.));
      float fr=1.-step(.018,mu.x)*step(mu.x,.982)*step(.012,mu.y)*step(mu.y,.988);
      float bus=1.-smoothstep(.0,.04,abs(cu.x-.5)-.46)*0.+ (1.-step(.035,cu.x)*step(cu.x,.965))*.0;
      float grid=max(1.-step(.03,cu.x)*step(cu.x,.97),1.-step(.03,cu.y)*step(cu.y,.97));
      vec3 cell=vec3(.012,.018,.04)*(.85+.3*fract(sin(dot(floor(vSu*vec2(6.,10.)),vec2(12.9,78.2)))*43758.5));
      vec3 c=mix(cell,vec3(.18,.2,.24),grid*.55);c=mix(c,vec3(.55,.57,.6),fr);
      float sRough=mix(.08,.45,fr);
      vec4 diffuseColor=vec4(c,1.);`).replace('#include <roughnessmap_fragment>','float roughnessFactor=sRough;').replace('#include <metalnessmap_fragment>','float metalnessFactor=mix(.1,.9,fr);');
  };
  return m;
}
const mb=(w,h,d,m,x,y,z,ry)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);if(ry)o.rotation.y=ry;o.castShadow=o.receiveShadow=true;return o};
function uvScale(g,s){const uv=g.attributes.uv,p=g.attributes.position,n=g.attributes.normal;for(let i=0;i<uv.count;i++){const ax=Math.abs(n.getX(i)),ay=Math.abs(n.getY(i));
  const u=ax>.5?p.getZ(i):p.getX(i),v=ay>.5?p.getZ(i):p.getY(i);uv.setXY(i,u*s,v*s)}return g}

/* ---------- nhà điều hành: nhà xưởng thép, mái pin mặt trời ---------- */
function mkShed(d){
  const T=hqTex();
  const iron=pbrMat(T.iron,{color:'#57504A',normalScale:new THREE.Vector2(1.2,1.2)});
  const ironIn=pbrMat(T.iron,{color:'#2A2622',side:THREE.BackSide});
  const conc=pbrMat(T.conc,{color:'#B9B4AA'});
  const steel=new THREE.MeshStandardMaterial({color:'#6E7378',roughness:.45,metalness:.7});
  const g=new THREE.Group(),m=new THREE.Group();
  const L=20,D=10,hF=4.6,hB=3.5;
  const pad=new THREE.Mesh(uvScale(new THREE.BoxGeometry(L+4,.25,D+5),.35),conc);pad.position.set(0,.02,1.5);pad.receiveShadow=true;m.add(pad);
  // cột
  for(let i=0;i<=5;i++){const x=-L/2+i*L/5;m.add(mb(.2,hF,.2,steel,x,hF/2,D/2));m.add(mb(.2,hB,.2,steel,x,hB/2,-D/2))}
  // kèo
  const slope=Math.atan2(hF-hB,D),rl=Math.hypot(D,hF-hB);
  for(let i=0;i<=5;i++){const b=mb(.16,.32,rl+.6,steel,-L/2+i*L/5,(hF+hB)/2+.1,0);b.rotation.x=slope;m.add(b)}
  // tường tôn: sau + hai hông (để hở mặt trước)
  const wall=(w,h,x,y,z,ry)=>{const gg=uvScale(new THREE.PlaneGeometry(w,h),.5);const a=new THREE.Mesh(gg,iron);a.position.set(x,y,z);a.rotation.y=ry;a.castShadow=a.receiveShadow=true;m.add(a);
    const b=new THREE.Mesh(gg,ironIn);b.position.copy(a.position);b.rotation.y=ry;b.receiveShadow=true;m.add(b)};
  wall(L,hB,0,hB/2,-D/2-.05,Math.PI);
  for(const s of[-1,1]){const sg=new THREE.BufferGeometry();const x=s*(L/2+.05);
    const P=[x,0,-D/2, x,0,D/2, x,hF-.15,D/2, x,hB,-D/2];sg.setAttribute('position',new THREE.Float32BufferAttribute(P,3));sg.setIndex(s>0?[0,1,2,0,2,3]:[0,2,1,0,3,2]);
    sg.setAttribute('uv',new THREE.Float32BufferAttribute([-D/2*.5,0,D/2*.5,0,D/2*.5,(hF-.15)*.5,-D/2*.5,hB*.5],2));sg.computeVertexNormals();
    const a=new THREE.Mesh(sg,iron);a.castShadow=a.receiveShadow=true;m.add(a);const b=new THREE.Mesh(sg,ironIn);m.add(b)}
  // mái: tôn dưới + pin mặt trời trên
  const roofG=new THREE.PlaneGeometry(L+.8,rl+.6);roofG.rotateX(-Math.PI/2);
  const under=new THREE.Mesh(roofG,new THREE.MeshStandardMaterial({color:'#4A4C4E',roughness:.6,metalness:.4,side:THREE.DoubleSide}));
  under.position.set(0,(hF+hB)/2+.28,0);under.rotation.x=slope;under.castShadow=under.receiveShadow=true;m.add(under);
  const pg=new THREE.PlaneGeometry(L,rl);pg.rotateX(-Math.PI/2);const uv=pg.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*10,uv.getY(i)*5);
  const pv=new THREE.Mesh(pg,solarMat());pv.position.set(0,(hF+hB)/2+.36,0);pv.rotation.x=slope;pv.castShadow=pv.receiveShadow=true;m.add(pv);
  // bên trong: bồn nước, kệ, bao phân, bàn điều khiển
  const tank=new THREE.Mesh(new THREE.CylinderGeometry(.75,.75,1.6,20),new THREE.MeshStandardMaterial({color:'#2F6FA8',roughness:.35}));tank.position.set(-7.6,.95,-3);tank.castShadow=tank.receiveShadow=true;m.add(tank);
  const tank2=tank.clone();tank2.position.x=-5.8;m.add(tank2);
  const bagM=new THREE.MeshStandardMaterial({color:'#D9D2C0',roughness:.9});
  for(let i=0;i<9;i++)m.add(mb(.9,.32,.55,bagM,3+(i%3)*.95,.3+Math.floor(i/3)*.33,-3.6+(i%2)*.1,(i%3-1)*.05));
  const desk=mb(2.2,.08,.8,new THREE.MeshStandardMaterial({color:'#8A6E4E',roughness:.7}),-1.5,.85,-3.8);m.add(desk);
  const scr=mb(.9,.55,.04,new THREE.MeshBasicMaterial({color:'#9FD87A'}),-1.5,1.25,-4.1);m.add(scr);winMeshes.push(scr);
  // đèn
  const bulb=new THREE.Mesh(new THREE.SphereGeometry(.12,8,8),new THREE.MeshBasicMaterial({color:'#FFE3A8'}));bulb.position.set(0,hF-.4,D/2-1);m.add(bulb);LEDS.push({m:bulb,k:'lamp',ph:0});
  m.scale.setScalar(M2U);g.add(m);
  g.rotation.y=Math.PI/2+.06;
  const lp=new THREE.Vector3(0,(hF-.6)*M2U,(D/2-1)*M2U).applyAxisAngle(new THREE.Vector3(0,1,0),g.rotation.y);
  houseLamp.position.set(d.x+lp.x,d.y+lp.y,d.z+lp.z);houseLamp.distance=2.2;
  return g;
}
function mkHouse(d){return mkShed(d)}

/* ---------- nhà bơm cạnh hồ ---------- */
function buildPumpHouse(){
  const T=hqTex();const g=new THREE.Group();const m=new THREE.Group();
  const wallM=pbrMat(T.iron,{color:'#6A4A38'}),roofM=pbrMat(T.iron,{color:'#5B3A2C'});
  const W=5,Dp=4,h=2.5;
  const body=new THREE.Mesh(uvScale(new THREE.BoxGeometry(W,h,Dp),.5),wallM);body.position.y=h/2;body.castShadow=body.receiveShadow=true;m.add(body);
  const rg=uvScale(new THREE.BoxGeometry(W+.5,.08,Dp+.6),.5);const roof=new THREE.Mesh(rg,roofM);roof.position.y=h+.25;roof.rotation.z=.1;roof.castShadow=roof.receiveShadow=true;m.add(roof);
  const door=mb(1,2,.05,new THREE.MeshStandardMaterial({color:'#3E2C22',roughness:.6}),1,1,Dp/2+.03);m.add(door);
  const pipe=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,4,8),new THREE.MeshStandardMaterial({color:'#2B2B2B',roughness:.5}));pipe.rotation.z=Math.PI/2;pipe.position.set(W/2+2,.2,.6);m.add(pipe);
  m.scale.setScalar(M2U);g.add(m);
  const x=PC[0]-POND.w/2-.42,z=PC[1]-POND.h/2+.1;g.position.set(x,H(x,z),z);g.rotation.y=.04;scene.add(g);
}

/* ---------- hồ trữ nước lót bạt HDPE ---------- */
let pondRef=null,pondFlat=null;
const POND_SH={
  name:'PondWater',
  uniforms:{color:{value:null},tDiffuse:{value:null},textureMatrix:{value:null},uTime:{value:0},uSD:{value:new THREE.Vector3()},uSC:{value:new THREE.Color()},uSky:{value:new THREE.Color()},uDeep:{value:new THREE.Color('#3A4C2A')},uRain:{value:0}},
  vertexShader:`uniform mat4 textureMatrix;varying vec4 vUv;varying vec3 vW;void main(){vUv=textureMatrix*vec4(position,1.);vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`uniform sampler2D tDiffuse;uniform float uTime,uRain;uniform vec3 uSD,uSC,uSky,uDeep;varying vec4 vUv;varying vec3 vW;
    float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
    float wav(vec2 p){float t=uTime;return n(p*34.+vec2(t*.9,t*.5))*.5+n(p*71.-vec2(t*1.3,-t*.7))*.3+n(p*150.+vec2(-t*2.,t*1.6))*.2;}
    void main(){vec2 p=vW.xz;float e=.002;float a=wav(p),bx=wav(p+vec2(e,0.)),bz=wav(p+vec2(0.,e));
      vec3 N=normalize(vec3((a-bx)*.9*(1.+uRain*3.),1.,(a-bz)*.9*(1.+uRain*3.)));
      vec3 V=normalize(cameraPosition-vW);
      vec2 uv=vUv.xy/vUv.w+N.xz*.035;
      vec3 refl=texture2D(tDiffuse,uv).rgb;
      float fr=.02+.98*pow(1.-max(dot(N,V),0.),5.);fr=mix(.06,.95,fr);
      vec3 deep=uDeep*(.55+.45*clamp(uSD.y*2.,0.,1.))*(.9+.2*n(p*6.));
      vec3 col=mix(deep,refl*vec3(.8,.9,.78),fr);
      vec3 Hh=normalize(uSD+V);col+=uSC*pow(max(dot(N,Hh),0.),420.)*6.*step(0.,uSD.y);
      gl_FragColor=vec4(col,1.);}`
};
function buildWater(){
  // suối
  waterMat=mkWaterMat();
  [[CR1,.13],[CR2,.1]].forEach(([L,w])=>{
    const bank=new THREE.Mesh(ribbon(L,w+.1,.012),new THREE.MeshStandardMaterial({color:'#5C4A36',roughness:1}));bank.receiveShadow=true;scene.add(bank);
    const m=new THREE.Mesh(ribbon(L,w,.03),waterMat);m.receiveShadow=true;scene.add(m)});
  // hồ
  const pw=POND.w/2,ph=POND.h/2,bk=.16;
  let yr=1e9;for(let i=-1;i<=1;i+=.1)for(const s of[-1,1]){yr=Math.min(yr,H(PC[0]+i*(pw+bk),PC[1]+s*(ph+bk)),H(PC[0]+s*(pw+bk),PC[1]+i*(ph+bk)))}
  const yW=yr-.085;
  const ring=(hx,hz,yf)=>{const pts=[];const per=96;for(let k=0;k<per;k++){const t=k/per*4;let x,z;const s=Math.floor(t),f=t-s;
      if(s===0){x=-hx+2*hx*f;z=-hz}else if(s===1){x=hx;z=-hz+2*hz*f}else if(s===2){x=hx-2*hx*f;z=hz}else{x=-hx;z=hz-2*hz*f}
      pts.push([PC[0]+x,yf(PC[0]+x,PC[1]+z),PC[1]+z])}return pts};
  const R=[ring(pw+bk+.014,ph+bk+.014,(x,z)=>H(x,z)+.004),ring(pw+bk-.004,ph+bk-.004,(x,z)=>H(x,z)-.004),ring(pw+.01,ph+.01,()=>yW-.006),ring(pw-.12,ph-.1,()=>yW-.2)];
  const P=[],I=[],UV=[];R.forEach((r,ri)=>r.forEach(q=>{P.push(...q);UV.push(ri,0)}));const n=R[0].length;
  for(let ri=0;ri<R.length-1;ri++)for(let k=0;k<n;k++){const a=ri*n+k,b=ri*n+(k+1)%n,c=a+n,d=b+n;I.push(a,c,b,b,c,d)}
  const c0=P.length/3;P.push(PC[0],yW-.21,PC[1]);UV.push(3,0);for(let k=0;k<n;k++)I.push((R.length-1)*n+k,c0,(R.length-1)*n+(k+1)%n);
  const lg=new THREE.BufferGeometry();lg.setAttribute('position',new THREE.Float32BufferAttribute(P,3));lg.setAttribute('uv',new THREE.Float32BufferAttribute(UV,2));lg.setIndex(I);lg.computeVertexNormals();
  const nrm=lg.attributes.normal;for(let i=0;i<nrm.count;i++)if(nrm.getY(i)<0)nrm.setXYZ(i,-nrm.getX(i),-nrm.getY(i),-nrm.getZ(i));
  const liner=new THREE.MeshStandardMaterial({color:'#0D0F10',roughness:.34,metalness:0});
  liner.onBeforeCompile=sh=>{sh.vertexShader='varying vec3 vW2;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvW2=(modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader='varying vec3 vW2;\n'+NOISE_GLSL+sh.fragmentShader.replace('#include <normal_fragment_maps>',`
      vec2 q=vW2.xz*vec2(38.,9.)+vec2(vW2.y*30.,0.);float w1=vn(q),w2=vn(q+vec2(.05,0.)),w3=vn(q+vec2(0.,.05));
      vec2 q2=vW2.xz*90.;float k1=vn(q2),k2=vn(q2+vec2(.05,0.)),k3=vn(q2+vec2(0.,.05));
      vec3 pw=vec3((w1-w2)*6.+(k1-k2)*1.5,0.,(w1-w3)*6.+(k1-k3)*1.5);
      normal=normalize(normal+(viewMatrix*vec4(pw,0.)).xyz);`).replace('vec4 diffuseColor = vec4( diffuse, opacity );','vec4 diffuseColor=vec4(diffuse*(1.+.6*smoothstep(.0,.006,vW2.y-('+(yW).toFixed(4)+'))*0.),opacity);');};
  const lm=new THREE.Mesh(lg,liner);lm.receiveShadow=true;lm.castShadow=false;scene.add(lm);
  // mặt nước phản chiếu
  const wg=new THREE.PlaneGeometry(2*pw+.06,2*ph+.06);
  pondRef=new Reflector(wg,{textureWidth:LOW?256:640,textureHeight:LOW?256:640,multisample:0,clipBias:.0005,shader:POND_SH});
  pondRef.rotation.x=-Math.PI/2;pondRef.position.set(PC[0],yW,PC[1]);scene.add(pondRef);
  const PU=pondRef.material.uniforms;PU.uTime=U.uTime;PU.uRain=U.uRainV;
  pondFlat=new THREE.Mesh(wg,new THREE.MeshStandardMaterial({color:'#16261A',roughness:.08,metalness:.1}));pondFlat.rotation.x=-Math.PI/2;pondFlat.position.copy(pondRef.position);scene.add(pondFlat);
  pondWater=pondRef;pondWater.userData.y0=yW;
  buildPumpHouse();
}
function updPond(cam,lt,sd){
  if(!pondRef)return;const d=cam.position.distanceTo(pondRef.position);const near=d<(LOW?10:22);
  pondRef.visible=near;pondFlat.visible=!near;
  const PU=pondRef.material.uniforms;PU.uSD.value.copy(sd);PU.uSC.value.copy(lt.sun).multiplyScalar(lt.si);
}

/* ---------- tưới béc xoay quanh cảnh cận ---------- */
function buildSprinklers(cx,cz,n){
  // béc trên ống đứng 1,8 m, bán kính phun ~9 m, bố trí lưới 12 m dọc hàng
  const pos=[],ap=[];const per=LOW?380:900;
  const heads=[];for(let i=-n;i<=n;i++)for(let j=-1;j<=1;j++){const x=cx+i*12*M2U,z=Math.round((cz+j*12*M2U)/SR)*SR+SR;heads.push([x,H(x,z),z])}
  const riserM=new THREE.MeshStandardMaterial({color:'#2A2A2A',roughness:.5});
  heads.forEach(h=>{const r=new THREE.Mesh(new THREE.CylinderGeometry(.012*M2U*2,.012*M2U*2,1.8*M2U,6),riserM);r.position.set(h[0],h[1]+.9*M2U,h[2]);r.castShadow=true;scene.add(r);
    const hd=new THREE.Mesh(new THREE.CylinderGeometry(.03*M2U,.04*M2U,.08*M2U,8),new THREE.MeshStandardMaterial({color:'#C9A227',roughness:.4,metalness:.3}));hd.position.set(h[0],h[1]+1.83*M2U,h[2]);scene.add(hd);
    for(let k=0;k<per;k++){pos.push(h[0],h[1]+1.85*M2U,h[2]);ap.push(rnd(),rnd()*6.283,.85+rnd()*.3,rnd())}});
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('aP',new THREE.Float32BufferAttribute(ap,4));
  const m=sprayMat();
  const p=new THREE.Points(g,m);p.frustumCulled=false;p.visible=false;p.renderOrder=5;scene.add(p);IRR.push(p);
}

function sprayMat(){return new THREE.ShaderMaterial({uniforms:{uTime:U.uTime,uOn:{value:0},uPx:{value:innerHeight*DPR*.00085},uSC:{value:new THREE.Color()},uSD:{value:new THREE.Vector3()}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:`uniform float uTime,uOn,uPx;uniform vec3 uSD;attribute vec4 aP;varying float vA,vF,vT;
      void main(){float life=1.6;float t=fract(uTime/life*aP.z+aP.x);float te=uTime-t*life/aP.z;
        float hd=fract(sin(dot(position.xz,vec2(91.7,33.1)))*437.5)*6.283;
        bool main=aP.w<.72;float om=.55;
        float a=hd+te*om+(aP.y-3.14)*.035*(.3+t)+(main?0.:3.14);
        float rng=main?${(9.5*M2U).toFixed(4)}:${(4.5*M2U).toFixed(4)};
        float R=rng*t*(.82+.18*fract(aP.w*7.3));float up=(main?${(3.4*M2U).toFixed(4)}:${(1.6*M2U).toFixed(4)})*(4.*t*(1.-t))*(.85+.15*fract(aP.w*3.1))-${(.5*M2U).toFixed(4)}*t*t;
        vec3 p=position+vec3(cos(a)*R,up,sin(a)*R);
        vA=uOn*smoothstep(0.,.04,t)*(1.-smoothstep(.75,1.,t));vT=t;
        vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=max(1.,uPx*(1.+t*t*5.)/-mv.z);
        vec3 V=normalize(-mv.xyz);vF=pow(max(dot(normalize((viewMatrix*vec4(uSD,0.)).xyz),-V),0.),5.);}`,
    fragmentShader:`uniform vec3 uSC;varying float vA,vF,vT;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;
      float k=mix(1.,.35,smoothstep(.4,1.,vT));gl_FragColor=vec4((vec3(.55,.66,.74)*.6+uSC*(.12+vF*2.2))*vA*smoothstep(.5,.0,d)*k,1.);}`})}
