const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const LOW=/[?&]lq/.test(location.search)||location.hash==='#lq'||(!/[?&]hq/.test(location.search)&&(navigator.hardwareConcurrency||8)<=4);
const RM=matchMedia('(prefers-reduced-motion:reduce)').matches;
const fmt=(v,d=1)=>(+v).toFixed(d).replace('.',',');
const fmtI=v=>Math.round(v).toLocaleString('vi-VN');
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
let seed=7;const rnd=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646};

/* ---------- dữ liệu sơ đồ ---------- */
const SC=14;
const toW=p=>[(p[0]-500)/SC,(p[1]-370)/SC];
const OUT_UV=[[272,20],[300,28],[392,126],[505,116],[612,126],[708,140],[875,142],[902,140],[930,205],[882,207],[717,236],[694,252],[690,300],[700,432],[762,426],[735,564],[545,562],[455,562],[424,596],[305,616],[182,648],[84,716],[60,600],[50,470],[58,362],[185,316],[205,305],[100,130],[240,122],[262,80]];
const ZD=[
  {id:'A', poly:[[95,372],[185,324],[338,307],[342,378],[285,380],[285,606],[180,640],[95,700],[82,600],[78,470]],lab:[200,470],ang:0},
  {id:'B1',poly:[[330,462],[455,470],[455,556],[420,590],[305,610]],lab:[384,520],ang:.12},
  {id:'B2',poly:[[458,425],[545,428],[547,556],[458,556]],lab:[500,488],ang:0},
  {id:'C1',poly:[[105,135],[240,130],[255,150],[272,215],[335,240],[345,300],[200,304]],lab:[262,246],ang:-.25},
  {id:'C2',poly:[[547,432],[758,428],[730,560],[549,557]],lab:[620,484],ang:0},
  {id:'C3',poly:[[525,335],[688,305],[695,430],[545,430]],lab:[600,380],ang:.05},
  {id:'C4',poly:[[510,120],[705,140],[712,175],[690,250],[685,300],[525,333],[515,240]],lab:[600,215],ang:.05},
  {id:'C5',poly:[[708,150],[874,146],[900,150],[915,200],[880,200],[715,230]],lab:[815,186],ang:Math.PI/2-.1},
  {id:'BARE',poly:[[282,42],[388,130],[505,120],[515,240],[530,420],[458,422],[350,384],[342,240],[300,172]],lab:[420,250],ang:.32},
  {id:'HQ',poly:[[288,382],[343,382],[346,466],[288,466]],lab:[315,400],ang:0}
];
const ZNAME=['Khu A','Khu B1','Khu B2','Khu C1','Khu C2','Khu C3','Khu C4','Khu C5','Khu đất chưa trồng','Khu nhà điều hành'];
const NZ=8; // 8 khu trồng cà phê
const CREEK1=[[78,348],[66,380],[60,420],[62,470],[58,520],[64,570],[60,610],[68,660],[78,708]];
const CREEK2=[[872,150],[893,152],[906,168],[912,190],[918,204]];
const POND={c:[360,440],w:3.5,h:2.0};
const FOREST=[[466,240],[528,418]];
const GATES=[[244,116,-.4],[880,222,2.4],[760,424,.6],[734,572,3.1],[330,632,3.5],[92,722,3.8]];
const DEV=[];
[[205,190],[293,272],[222,345],[135,422],[160,515],[222,582],[355,497],[332,572],[436,562],[485,455],[578,460],[690,460],[608,523],[578,357],[565,405],[652,413],[553,177],[660,175],[638,268],[548,302],[772,182],[893,172]].forEach((p,i)=>DEV.push({k:'cam',uv:p,id:'CAM-'+String(i+1).padStart(2,'0')}));
[[237,270],[232,410],[238,492],[380,562],[527,522],[687,516],[640,358],[572,255],[686,218]].forEach((p,i)=>DEV.push({k:'soil',uv:p,id:'SOIL-'+String(i+1).padStart(2,'0')}));
[[350,436],[372,446]].forEach((p,i)=>DEV.push({k:'water',uv:p,id:'WTR-0'+(i+1)}));
DEV.push({k:'iot',uv:[300,436],id:'IOT-HUB'});
DEV.push({k:'weather',uv:[300,462],id:'WS-01'});
DEV.push({k:'house',uv:[312,398],id:'HQ-01'});
const KCOL={soil:'#D9A15B',water:'#51ADCA',weather:'#F2D35B',cam:'#B5E383',iot:'#7ED8C8',house:'#F5E4A1'};
const KNAME={soil:'Cảm biến đất',water:'Cảm biến nước',weather:'Trạm thời tiết',cam:'Camera quan sát',iot:'Trạm IoT trung tâm',house:'Nhà điều hành'};
const KICON={soil:'i-soil',water:'i-water',weather:'i-weather',cam:'i-cam',iot:'i-iot',house:'i-team'};

const OUT=OUT_UV.map(toW);
const ZP=ZD.map(z=>z.poly.map(toW));

/* ---------- hình học 2D ---------- */
function inPoly(x,z,P){let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const xi=P[i][0],zi=P[i][1],xj=P[j][0],zj=P[j][1];if(((zi>z)!==(zj>z))&&(x<(xj-xi)*(z-zi)/(zj-zi)+xi))c=!c}return c}
function dSeg(px,pz,ax,az,bx,bz){const dx=bx-ax,dz=bz-az,l=dx*dx+dz*dz;let t=l?((px-ax)*dx+(pz-az)*dz)/l:0;t=clamp(t,0,1);const ex=ax+dx*t-px,ez=az+dz*t-pz;return Math.sqrt(ex*ex+ez*ez)}
function dPoly(x,z,P){let m=1e9;for(let i=0,j=P.length-1;i<P.length;j=i++){const d=dSeg(x,z,P[j][0],P[j][1],P[i][0],P[i][1]);if(d<m)m=d}return m}
function dLine(x,z,L){let m=1e9;for(let i=1;i<L.length;i++){const d=dSeg(x,z,L[i-1][0],L[i-1][1],L[i][0],L[i][1]);if(d<m)m=d}return m}
function area(P){let a=0;for(let i=0,j=P.length-1;i<P.length;j=i++)a+=(P[j][0]+P[i][0])*(P[j][1]-P[i][1]);return Math.abs(a/2)}
function centroid(P){let x=0,z=0;P.forEach(p=>{x+=p[0];z+=p[1]});return[x/P.length,z/P.length]}
function zoneAt(x,z){for(let i=0;i<ZP.length;i++)if(inPoly(x,z,ZP[i]))return i;return -1}
const CR1=CREEK1.map(toW),CR2=CREEK2.map(toW),FOR=FOREST.map(toW);
const PC=toW(POND.c);
function inPond(x,z,m){return Math.abs(x-PC[0])<POND.w/2+(m||0)&&Math.abs(z-PC[1])<POND.h/2+(m||0)}
const RW=.2; // nửa bề rộng đường lô (≈2,3 m)

/* ---------- địa hình ---------- */
function hill(x,z){return .45*Math.sin(x*.16+.5)*Math.cos(z*.14-.3)+.3*Math.sin((x-z)*.085+1.2)+.12*Math.sin(x*.5+z*.4)}
/* địa hình thật: lưới cao độ (AWS Terrain Tiles, nguồn SRTM/Copernicus ~30 m) quanh toạ độ flycam 13,5538°B 107,9791°Đ */
const DEM=await fetch('assets/dem.json').then(r=>r.json()).then(j=>{const b=atob(j.dm),a=new Uint16Array(b.length/2);for(let i=0;i<a.length;i++)a[i]=b.charCodeAt(2*i)|b.charCodeAt(2*i+1)<<8;j.a=a;delete j.dm;return j}).catch(e=>{console.warn('dem',e);return null});
function demRaw(x,z){// x: đông, z: nam (đơn vị cảnh) -> độ cao tương đối (đơn vị cảnh)
  const D=DEM,px=clamp(D.cx+x*11.6/D.mpp,0,D.w-1.001),py=clamp(D.cy+z*11.6/D.mpp,0,D.h-1.001);const i=Math.floor(px),j=Math.floor(py),fx=px-i,fz=py-j,a=D.a,w=D.w;
  const v=(a[j*w+i]*(1-fx)+a[j*w+i+1]*fx)*(1-fz)+(a[(j+1)*w+i]*(1-fx)+a[(j+1)*w+i+1]*fx)*fz;return (v/10-D.e0)/11.6}
// san phẳng nhẹ nền hồ và nhà điều hành để công trình không bị chênh
function demH(x,z){let h=demRaw(x,z);for(const f of DFLAT){const d=Math.max(Math.abs(x-f[0])-f[2],Math.abs(z-f[1])-f[3]);const w=1-sstep(0,1.6,d);if(w>0)h=lerp(h,f[4],w)}return h}
const DFLAT=[];if(DEM){const hq=toW([312,398]);DFLAT.push([PC[0],PC[1],POND.w/2+.45,POND.h/2+.45,demRaw(PC[0],PC[1])],[hq[0],hq[1],.7,1.15,demRaw(hq[0],hq[1])])}
function flattenGates(){if(!DEM)return;RT.cross.forEach(c=>{const i=Math.round(c/RT.step),x=RT.x[i],z=RT.z[i];DFLAT.push([x,z,1.5,1.5,demRaw(x,z)])})}
function H(x,z){if(DEM)return demH(x,z)+.04;const d=dPoly(x,z,OUT);return (hill(x,z)+.62)*sstep(0,3,d)*.75+.04}

/* ---------- diện tích ước tính ---------- */
const OUT_A=area(OUT);
const ZHA=ZP.map(P=>area(P)/OUT_A*22);

/* ---------- renderer / cảnh ---------- */
const U={uData:{value:0},uELO:{value:340},uEHI:{value:370},uE0:{value:352},uTime:{value:0},uWind:{value:.15},uWD:{value:new THREE.Vector2(.7,.7)},uStress:{value:0},uRainV:{value:0},uNight:{value:0}};
const BOX={x0:-34,z0:-27,x1:33,z1:27};

const NOISE_GLSL=`
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){return .5*vn(p)+.27*vn(p*2.07+1.3)+.14*vn(p*4.11+3.7);}
`;
function swayMat(opts,hs,amp,stressK,leaf){
  const m=new THREE.MeshStandardMaterial(Object.assign({vertexColors:true,flatShading:false,roughness:.68,metalness:0},opts||{}));
  m.onBeforeCompile=sh=>{
    Object.assign(sh.uniforms,U);sh.uniforms.uHS={value:hs};sh.uniforms.uAmp={value:amp};sh.uniforms.uSK={value:stressK};sh.uniforms.uLeaf={value:leaf||6};
    sh.vertexShader='uniform float uTime,uWind,uHS,uAmp;uniform vec2 uWD;varying vec3 vLp;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 ip=instanceMatrix[3].xyz;
      #else
        vec3 ip=(modelMatrix*vec4(0.,0.,0.,1.)).xyz;
      #endif
      float hh=max(position.y,0.)*uHS;
      float ph=uTime*(.9+uWind*1.1)+ip.x*.43+ip.z*.31;
      float gust=.5+.5*sin(uTime*.55-dot(ip.xz,uWD)*.12);
      float am=uWind*(.35+.65*gust);
      vec3 Wv=vec3(uWD.x,0.,uWD.y)*(am*.5+.14*am*sin(ph))+vec3(sin(ph*1.3),0.,cos(ph*1.1))*(.015+am*.06);
      #ifdef USE_INSTANCING
        vec3 Wl=vec3(dot(instanceMatrix[0].xyz,Wv),dot(instanceMatrix[1].xyz,Wv),dot(instanceMatrix[2].xyz,Wv));
        Wl/=max(dot(instanceMatrix[0].xyz,instanceMatrix[0].xyz),.01);
      #else
        vec3 Wl=Wv;
      #endif
      transformed+=Wl*hh*hh*uAmp;
      transformed.y-=dot(Wl.xz,Wl.xz)*hh*hh*uAmp*.25;
      vLp=position*3.+ip*.37;`);
    sh.fragmentShader='uniform float uStress,uSK,uRainV,uLeaf;varying vec3 vLp;\n'+NOISE_GLSL+sh.fragmentShader.replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>
      float l1=vn(lq.xy+lq.z*1.7),l2=vn(lq.yz*1.13+3.1),l3=vn(lq.zx*.91+7.3);
      normal=normalize(normal+vec3(l1-.5,l2-.5,l3-.5)*1.25);`).replace('#include <color_fragment>',`#include <color_fragment>
      vec3 lq=vLp*uLeaf;
      float lc=.55*vn(lq.xz*1.9+vec2(lq.y*1.3,-lq.y*.8))+.45*vn(lq.xy*1.6+vec2(lq.z*.9,lq.z*1.4)+5.);
      diffuseColor.rgb*=.55+.75*smoothstep(.2,.8,lc);
      diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.35,1.05,.38)+vec3(.04,.025,0.),clamp(uStress*uSK,0.,1.));
      diffuseColor.rgb*=1.-uRainV*.18;`).replace('float roughnessFactor = roughness;','float roughnessFactor = roughness-uRainV*.35;');
  };
  return m;
}

const GU={uDry:{value:0},uSel:{value:-1}};

/* ---------- khối đế (lát cắt đất) + mặt bàn ---------- */
function buildBase(){
  const s=new THREE.Shape();OUT.forEach((p,i)=>i?s.lineTo(p[0],-p[1]):s.moveTo(p[0],-p[1]));
  const g=new THREE.ExtrudeGeometry(s,{depth:3.2,bevelEnabled:false,steps:1});
  g.rotateX(-Math.PI/2);g.translate(0,-3.2,0);
  const side=new THREE.MeshStandardMaterial({roughness:1});
  side.onBeforeCompile=sh=>{
    sh.vertexShader='varying vec3 vW;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvW=(modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader='varying vec3 vW;\n'+NOISE_GLSL+sh.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );',`
      float y=vW.y+vn(vec2(vW.x+vW.z,vW.y)*vec2(1.3,3.))*.25;
      vec3 c=vec3(.38,.24,.15);
      c=mix(c,vec3(.55,.34,.20),smoothstep(-1.1,-1.,y));
      c=mix(c,vec3(.66,.45,.28),smoothstep(-2.3,-2.2,y)*(1.-smoothstep(-1.1,-1.,y)));
      c=mix(c,vec3(.42,.47,.24),smoothstep(-.22,-.12,y));
      c*=.85+.25*vn(vec2(vW.x+vW.z,vW.y)*vec2(4.,9.));
      c=dataTint(c,vW,0.);
      vec4 diffuseColor=vec4(pow(c,vec3(2.2)),1.);`);
  };
  const cap=new THREE.MeshStandardMaterial({color:'#B9A27C',roughness:1});
  const base=new THREE.Mesh(g,[cap,side]);base.receiveShadow=true;base.castShadow=true;scene.add(base);
  floorMat={color:new THREE.Color()};buildWorld();
}
let floorMat;

/* ---------- nước: hồ + suối ---------- */
let waterMat,pondWater;
function mkWaterMat(){
  const m=new THREE.MeshStandardMaterial({color:'#3E9BB8',roughness:.12,metalness:.15,transparent:true,opacity:.9});
  m.onBeforeCompile=sh=>{
    Object.assign(sh.uniforms,U);
    sh.vertexShader='varying vec3 vW;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvW=(modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader='uniform float uTime,uRainV;varying vec3 vW;\n'+NOISE_GLSL+sh.fragmentShader.replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>
      vec2 q=vW.xz*2.2;float t=uTime;
      float a=vn(q+vec2(t*.6,t*.4)),b=vn(q*1.7-vec2(t*.5,-t*.3));
      vec3 pn=vec3(a-.5,0.,b-.5)*(.35+uRainV*.9);
      float rp=sin(length(fract(vW.xz*1.3)-.5)*40.-t*9.)*uRainV*.25;
      normal=normalize(normal+(viewMatrix*vec4(pn.x+rp,0.,pn.z+rp,0.)).xyz);`).replace('#include <color_fragment>',`#include <color_fragment>
      diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.85,.8,.65),uRainV*.5);`);
  };
  return m;
}
function ribbon(L,width,yOff){
  const pts=L.map(p=>new THREE.Vector3(p[0],0,p[1]));
  const cur=new THREE.CatmullRomCurve3(pts);const n=pts.length*10;const P=cur.getSpacedPoints(n);
  const pos=[],idx=[];
  for(let i=0;i<=n;i++){
    const a=P[Math.max(0,i-1)],b=P[Math.min(n,i+1)];const dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1;
    const nx=-dz/l,nz=dx/l;const w=width*(.8+.35*Math.sin(i*.37));
    for(const s of[-1,1]){const x=P[i].x+nx*w*s,z=P[i].z+nz*w*s;pos.push(x,Math.max(H(x,z),H(P[i].x,P[i].z))+yOff,z)}
    if(i<n){const k=i*2;idx.push(k,k+2,k+1,k+1,k+2,k+3)}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();
  // đảm bảo pháp tuyến hướng lên
  const nr=g.attributes.normal;for(let i=0;i<nr.count;i++)if(nr.getY(i)<0)nr.setXYZ(i,-nr.getX(i),-nr.getY(i),-nr.getZ(i));
  return g;
}
/* ---------- tiện ích hình khối ---------- */
function jitter(g,amt,s){const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);const h=Math.sin(x*127.1+y*311.7+z*74.7+s*13.1)*43758.5453;const d=((h-Math.floor(h))-.5)*amt;const l=Math.hypot(x,y,z)||1;p.setXYZ(i,x+x/l*d,y+y/l*d,z+z/l*d)}}
function paint(g,fn){const p=g.attributes.position,c=new Float32Array(p.count*3);for(let i=0;i<p.count;i++){const v=fn(p.getX(i),p.getY(i),p.getZ(i),i);c[i*3]=v[0];c[i*3+1]=v[1];c[i*3+2]=v[2]}g.setAttribute('color',new THREE.BufferAttribute(c,3));return g}
function prep(g){g=g.index?g.toNonIndexed():g;if(g.attributes.uv)g.deleteAttribute('uv');if(g.attributes.uv2)g.deleteAttribute('uv2');return g}
function merge(arr){return mergeGeometries(arr.map(prep))}
const lin=c=>{const k=new THREE.Color(c);return[k.r,k.g,k.b]};
const mixc=(a,b,t)=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];
function glowTex(){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');const g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.25,'rgba(255,255,255,.65)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);const t=new THREE.CanvasTexture(c);return t}
function blobTex(){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');const g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(0,0,0,.62)');g.addColorStop(.55,'rgba(0,0,0,.28)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return new THREE.CanvasTexture(c)}
function discTex(){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');const g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,255,255,.28)');g.addColorStop(.86,'rgba(255,255,255,.12)');g.addColorStop(.94,'rgba(255,255,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,128,128);return new THREE.CanvasTexture(c)}
let GLOW;

/* ---------- cây cà phê / cau / cây rừng ---------- */
function treeGeo(det,s){
  const A=lin('#0E2A0D'),B=lin('#3A6A1E'),parts=[];
  const c1=new THREE.IcosahedronGeometry(1,det);jitter(c1,.32,s);c1.scale(1,.86,1);c1.translate(0,1.75,0);
  const c2=new THREE.IcosahedronGeometry(.7,det);jitter(c2,.3,s+2);c2.translate(.45,2.25,.15);
  const c3=new THREE.IcosahedronGeometry(.62,det);jitter(c3,.3,s+4);c3.translate(-.5,1.45,-.25);
  [c1,c2,c3].forEach(g=>parts.push(paint(g,(x,y)=>mixc(A,B,clamp((y-.9)/2.1,0,1)))));
  const t=new THREE.CylinderGeometry(.07,.12,1.3,6);t.translate(0,.65,0);parts.push(paint(t,()=>lin('#5A4330')));
  return merge(parts);
}

const DV=[];
const STATS={};

/* ---------- công trình & thiết bị ---------- */
const MAT={};
function mats(){
  MAT.white=new THREE.MeshStandardMaterial({color:'#F2F0EA',roughness:.5});
  MAT.metal=new THREE.MeshStandardMaterial({color:'#8E9690',roughness:.45,metalness:.6});
  MAT.dark=new THREE.MeshStandardMaterial({color:'#22292A',roughness:.5,metalness:.2});
  MAT.solar=new THREE.MeshStandardMaterial({color:'#1C2C5A',roughness:.22,metalness:.55,emissive:'#0A1230',emissiveIntensity:.3});
  MAT.conc=new THREE.MeshStandardMaterial({color:'#B8B1A4',roughness:.95});
  MAT.roof=new THREE.MeshStandardMaterial({color:'#4E5B4F',roughness:.7,flatShading:true});
  MAT.green=new THREE.MeshStandardMaterial({color:'#3A8047',roughness:.5});
  MAT.lime=new THREE.MeshStandardMaterial({color:'#B5E383',roughness:.4,emissive:'#7EB84A',emissiveIntensity:.35});
  MAT.sky=new THREE.MeshStandardMaterial({color:'#51ADCA',roughness:.4});
  MAT.yel=new THREE.MeshStandardMaterial({color:'#E9C547',roughness:.5});
  MAT.win=new THREE.MeshStandardMaterial({color:'#2E3B40',roughness:.2,metalness:.3,emissive:'#FFC66B',emissiveIntensity:0});
  MAT.ledR=new THREE.MeshBasicMaterial({color:'#FF3B30'});
  MAT.ledG=new THREE.MeshBasicMaterial({color:'#7DFF6A'});
  MAT.wood=new THREE.MeshStandardMaterial({color:'#7A5A3C',roughness:.9});
}
const box=(w,h,d,m)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.castShadow=o.receiveShadow=true;return o};
const cyl=(r1,r2,h,m,seg)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,seg||8),m);o.castShadow=o.receiveShadow=true;return o};
function glowSprite(color,size){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW,color,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));s.scale.setScalar(size);return s}
function halo(r,color,op){const m=new THREE.Mesh(new THREE.RingGeometry(r*.78,r,40),new THREE.MeshBasicMaterial({color,transparent:true,opacity:op||.5,depthWrite:false,side:THREE.DoubleSide}));m.rotation.x=-Math.PI/2;m.renderOrder=2;return m}
let discMat,covDiscs=[],fovCone;const DGLOW=[];
const LEDS=[];

function mkCam(d){
  const g=new THREE.Group();
  g.add(box(.3,.12,.3,MAT.conc));
  const p=cyl(.035,.05,2.3,MAT.metal,6);p.position.y=1.15;g.add(p);
  const arm=box(.05,.05,.4,MAT.metal);arm.position.set(0,2.18,-.15);g.add(arm);
  const sp=box(.55,.03,.36,MAT.solar);sp.position.set(0,2.32,-.3);sp.rotation.x=-.45;g.add(sp);
  const head=new THREE.Group();head.position.y=1.98;
  const hb=box(.18,.16,.26,MAT.white);hb.position.z=.08;head.add(hb);
  const vis=box(.22,.03,.3,MAT.white);vis.position.set(0,.095,.09);head.add(vis);
  const ln=cyl(.055,.055,.05,MAT.dark,12);ln.rotation.x=Math.PI/2;ln.position.z=.22;head.add(ln);
  const led=new THREE.Mesh(new THREE.SphereGeometry(.022,6,6),MAT.ledR);led.position.set(.06,.05,.22);head.add(led);LEDS.push({m:led,k:'rec',ph:rnd()*6});
  const spk=cyl(.05,.05,.08,MAT.dark,10);spk.position.y=-.14;head.add(spk);
  g.add(head);d.head=head;
  // hướng nhìn ban đầu: về tâm khu
  let tx=0,tz=0;if(d.zone>=0&&d.zone<NZ){const c=centroid(ZP[d.zone]);tx=c[0];tz=c[1]}
  d.pan0=Math.atan2(tx-d.x,tz-d.z)+(rnd()-.5)*.8;head.rotation.y=d.pan0;d.pan=d.pan0;
  const disc=new THREE.Mesh(new THREE.CircleGeometry(3.4,48),discMat);disc.rotation.x=-Math.PI/2;disc.position.set(d.x,d.y+.9,d.z);disc.renderOrder=3;disc.visible=false;scene.add(disc);covDiscs.push(disc);
  return g;
}
function mkSoil(d){
  const g=new THREE.Group();
  const st=cyl(.03,.03,.7,MAT.metal,6);st.position.y=.35;g.add(st);
  const hb=box(.2,.16,.12,MAT.white);hb.position.y=.72;g.add(hb);
  const band=box(.205,.035,.125,MAT.lime);band.position.y=.66;g.add(band);
  const an=cyl(.008,.008,.5,MAT.dark,4);an.position.set(.07,1.02,0);g.add(an);
  const led=new THREE.Mesh(new THREE.SphereGeometry(.02,6,6),MAT.ledG);led.position.set(-.05,.76,.065);g.add(led);LEDS.push({m:led,k:'ok',ph:rnd()*6});
  const h=halo(.62,'#C8893A',.55);h.position.y=.05;g.add(h);d.halo=h;
  return g;
}
function mkWater(d){
  const g=new THREE.Group();
  const b=cyl(.15,.19,.18,MAT.white,12);b.position.y=0;g.add(b);
  const r=cyl(.195,.195,.05,MAT.sky,12);r.position.y=-.03;g.add(r);
  const an=cyl(.01,.01,.45,MAT.dark,4);an.position.y=.3;g.add(an);
  const led=new THREE.Mesh(new THREE.SphereGeometry(.025,6,6),MAT.ledG);led.position.y=.53;g.add(led);LEDS.push({m:led,k:'ok',ph:rnd()*6});
  const h=halo(.45,'#51ADCA',.6);h.position.y=-.06;g.add(h);
  return g;
}
let anemo,vane;
function mkWeather(d){
  const g=new THREE.Group();
  g.add(box(.5,.1,.5,MAT.conc));
  const m=cyl(.04,.055,3.2,MAT.metal,6);m.position.y=1.6;g.add(m);
  const ca=box(.9,.04,.04,MAT.metal);ca.position.y=2.75;g.add(ca);
  anemo=new THREE.Group();anemo.position.set(.42,3.0,0);
  const hub=cyl(.025,.025,.2,MAT.dark,6);anemo.add(hub);
  for(let i=0;i<3;i++){const a=i/3*Math.PI*2;const arm=box(.32,.015,.015,MAT.metal);arm.position.set(Math.cos(a)*.16,.08,Math.sin(a)*.16);arm.rotation.y=-a;anemo.add(arm);
    const cup=new THREE.Mesh(new THREE.SphereGeometry(.06,10,6,0,Math.PI*2,0,Math.PI/2),MAT.white);cup.rotation.z=Math.PI/2;cup.position.set(Math.cos(a)*.32,.08,Math.sin(a)*.32);cup.rotation.y=-a;anemo.add(cup)}
  g.add(anemo);
  vane=new THREE.Group();vane.position.set(-.42,2.95,0);
  const vr=box(.02,.02,.55,MAT.dark);vane.add(vr);const fin=box(.01,.16,.18,MAT.white);fin.position.z=-.25;vane.add(fin);const tip=new THREE.Mesh(new THREE.ConeGeometry(.04,.12,6),MAT.dark);tip.rotation.x=Math.PI/2;tip.position.z=.3;vane.add(tip);
  g.add(vane);
  const rg=cyl(.09,.09,.28,MAT.white,12);rg.position.set(.3,1.4,.15);g.add(rg);
  const sh=box(.26,.32,.26,MAT.white);sh.position.set(0,2.2,.16);g.add(sh);
  const sp=box(.6,.03,.4,MAT.solar);sp.position.set(0,1.8,-.3);sp.rotation.x=-.55;g.add(sp);
  const h=halo(.9,'#E9C547',.55);h.position.y=.06;g.add(h);
  return g;
}
let hubTop;
function mkIot(d){
  const g=new THREE.Group();
  g.add(box(.7,.1,.5,MAT.conc));
  const cab=box(.6,.9,.38,MAT.green);cab.position.y=.55;g.add(cab);
  const scr=box(.34,.2,.01,new THREE.MeshBasicMaterial({color:'#B5E383'}));scr.position.set(0,.72,.195);g.add(scr);
  const m=cyl(.035,.05,3.4,MAT.metal,6);m.position.set(.18,2.1,0);g.add(m);
  const an=cyl(.02,.02,.6,MAT.white,6);an.position.set(.18,4.05,0);g.add(an);
  const top=new THREE.Mesh(new THREE.SphereGeometry(.06,8,8),MAT.ledR);top.position.set(.18,4.38,0);g.add(top);LEDS.push({m:top,k:'hub',ph:0});
  hubTop=new THREE.Vector3(d.x+.18*DS,d.y+4.38*DS,d.z);
  const sp=box(.7,.03,.45,MAT.solar);sp.position.set(-.35,1.25,0);sp.rotation.z=.5;g.add(sp);
  const h=halo(.8,'#7ED8C8',.5);h.position.y=.06;g.add(h);
  return g;
}
let winMeshes=[];
function buildDevices(){
  mats();GLOW=glowTex();
  discMat=new THREE.MeshBasicMaterial({map:discTex(),transparent:true,depthWrite:false,depthTest:false,opacity:.9,color:'#ffffff'});
  DEV.forEach((d,i)=>{
    let g;
    if(d.k==='cam')g=mkCam(d);else if(d.k==='soil')g=mkSoil(d);else if(d.k==='water')g=mkWater(d);else if(d.k==='weather')g=mkWeather(d);else if(d.k==='iot')g=mkIot(d);else g=mkHouse(d);
    let y=d.y;if(d.k==='water')y=pondWater.userData.y0+.004;
    if(d.k!=='house'){g.scale.setScalar(DS);if(d.zone>=0&&d.zone<NZ){const a=ZD[d.zone].ang,c=Math.cos(a),s=Math.sin(a);const u=d.x*c+d.z*s,v=-d.x*s+d.z*c;const v2=Math.round(v/SR)*SR;d.x=u*c-v2*s;d.z=u*s+v2*c;d.y=y=H(d.x,d.z)}}
    g.position.set(d.x,y,d.z);
    scene.add(g);d.obj=g;d.idx=i;
    d.top=new THREE.Vector3(d.x,y+({cam:2.45,soil:1.1,water:.6,weather:3.3,iot:4.4,house:0})[d.k]*DS+(d.k==='house'?.42:0),d.z);
  });
  // vầng sáng mặt đất quanh thiết bị (ban đêm)
  const gg=new THREE.PlaneGeometry(1,1);gg.rotateX(-Math.PI/2);
  DEV.forEach(d=>{if(d.k==='house')return;const m=new THREE.Mesh(gg,new THREE.MeshBasicMaterial({map:GLOW,color:KCOL[d.k],transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));
    const s=d.k==='iot'?1.1:d.k==='cam'?.7:.5;m.scale.set(s,1,s);m.position.set(d.x,(d.k==='water'?pondWater.userData.y0:d.y)+.012,d.z);m.renderOrder=3;scene.add(m);DGLOW.push(m)});
  // nón tầm nhìn camera được chọn
  const cg=new THREE.ConeGeometry(2.2,6,24,1,true);cg.translate(0,-3,0);cg.rotateX(-Math.PI/2);
  fovCone=new THREE.Mesh(cg,new THREE.MeshBasicMaterial({color:'#B5E383',transparent:true,opacity:.13,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));fovCone.visible=false;scene.add(fovCone);
  // cổng ra vào
  const am=new THREE.MeshStandardMaterial({color:'#3FA34D',emissive:'#2C7A36',emissiveIntensity:.35,roughness:.5});
  // cổng thật dựng ở drive.js
}

/* ================= HIỆU ỨNG ================= */
const FX=[];
const RING_G=new THREE.RingGeometry(.86,1,56);
function ripple(x,y,z,color,r,dur,vertical){
  const m=new THREE.Mesh(RING_G,new THREE.MeshBasicMaterial({color,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));
  if(!vertical)m.rotation.x=-Math.PI/2;m.position.set(x,y,z);m.renderOrder=4;scene.add(m);let t=0;
  FX.push(dt=>{t+=dt/dur;const e=1-Math.pow(1-Math.min(t,1),3);m.scale.setScalar(.15+e*r);m.material.opacity=(1-t)*.95;if(t>=1){scene.remove(m);m.material.dispose();return false}return true});
}
const pkPool=[];
function packet(from,to,color,dur,done){
  const sp=glowSprite(color,.38),tr=[glowSprite(color,.26),glowSprite(color,.16)];scene.add(sp);tr.forEach(s=>scene.add(s));
  const c=new THREE.Vector3().addVectors(from,to).multiplyScalar(.5);c.y=Math.max(from.y,to.y)+2.2+from.distanceTo(to)*.12;
  const P=t=>{const u=1-t;return new THREE.Vector3(u*u*from.x+2*u*t*c.x+t*t*to.x,u*u*from.y+2*u*t*c.y+t*t*to.y,u*u*from.z+2*u*t*c.z+t*t*to.z)};
  let t=0;
  FX.push(dt=>{t+=dt/dur;const k=Math.min(t,1);sp.position.copy(P(k));tr[0].position.copy(P(Math.max(0,k-.05)));tr[1].position.copy(P(Math.max(0,k-.1)));
    if(t>=1){[sp,...tr].forEach(s=>{scene.remove(s);s.material.dispose()});done&&done();return false}return true});
}
function beam(p,color){
  const m=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,1,8,1,true),new THREE.MeshBasicMaterial({color,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
  scene.add(m);let t=0;
  FX.push(dt=>{t+=dt/1.6;const h=Math.min(t*2,1)*36;m.scale.set(1,h,1);m.position.set(p.x,p.y+h/2,p.z);m.material.opacity=t<.6?.8:(1-t)/.4*.8;if(t>=1){scene.remove(m);m.geometry.dispose();m.material.dispose();return false}return true});
}

/* ---------- tưới béc xoay (dựng ở hq.js) ---------- */
const IRR=[];

/* ---------- mưa ---------- */
let rain;
function buildClouds(){
  const m=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false});
  for(let i=0;i<16;i++){const g=new THREE.Group();const n=4+Math.floor(rnd()*4);
    for(let k=0;k<n;k++){const s=new THREE.Mesh(new THREE.IcosahedronGeometry(1.6+rnd()*1.8,1),m);s.position.set((rnd()-.5)*6,(rnd()-.5)*.8,(rnd()-.5)*3.5);s.castShadow=true;g.add(s)}
    g.position.set(BOX.x0+rnd()*(BOX.x1-BOX.x0),16+rnd()*4,BOX.z0+rnd()*(BOX.z1-BOX.z0));g.userData.i=i;g.visible=false;scene.add(g);CLOUDS.push(g)}
}
const BIRDS=[];
function buildBirds(){
  const m=new THREE.MeshStandardMaterial({color:'#2A2622',side:THREE.DoubleSide,roughness:1});
  const wg=new THREE.BufferGeometry();wg.setAttribute('position',new THREE.Float32BufferAttribute([0,0,-.12,0,0,.12,.55,0,.05],3));wg.computeVertexNormals();
  for(let f=0;f<2;f++)for(let i=0;i<(LOW?5:8);i++){
    const b=new THREE.Group();const L=new THREE.Mesh(wg,m),R=new THREE.Mesh(wg,m);R.scale.x=-1;b.add(L,R);
    const body=new THREE.Mesh(new THREE.ConeGeometry(.07,.38,4),m);body.rotation.x=Math.PI/2;b.add(body);
    b.userData={f,o:i,L,R,ph:rnd()*6,dx:(rnd()-.5)*2.4,dy:(rnd()-.5)*1.2,dz:-(i%4)*.7-(rnd())*.5};scene.add(b);BIRDS.push(b)}
}
let leaves;const LV=[];
function buildLeaves(){
  const n=LOW?70:160;const g=new THREE.PlaneGeometry(.16,.1);
  leaves=new THREE.InstancedMesh(g,new THREE.MeshStandardMaterial({side:THREE.DoubleSide,roughness:.9}),n);
  const C=new THREE.Color();
  for(let i=0;i<n;i++){LV.push({x:BOX.x0+rnd()*(BOX.x1-BOX.x0),y:rnd()*4,z:BOX.z0+rnd()*(BOX.z1-BOX.z0),r:rnd()*6,s:.6+rnd()*.8});C.set(['#4F7A2A','#7C8F34','#A3792F','#3E6B22'][i%4]);leaves.setColorAt(i,C)}
  leaves.instanceColor.needsUpdate=true;leaves.visible=false;leaves.frustumCulled=false;scene.add(leaves);
}
let flies;
function buildFlies(){
  const n=LOW?400:1100,pos=[],ph=[];
  for(let i=0;i<n;i++){let x,z,k=0;do{x=BOX.x0+rnd()*(BOX.x1-BOX.x0);z=BOX.z0+rnd()*(BOX.z1-BOX.z0);k++}while(!inPoly(x,z,OUT)&&k<20);pos.push(x,H(x,z)+.03+rnd()*.12,z);ph.push(rnd()*30)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('aP',new THREE.Float32BufferAttribute(ph,1));
  const m=new THREE.ShaderMaterial({uniforms:{uTime:U.uTime,uOn:{value:0},uPx:{value:innerHeight*.012}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:`uniform float uTime,uPx,uOn;attribute float aP;varying float vA;void main(){vec3 p=position+vec3(sin(uTime*.4+aP)*.15,sin(uTime*.7+aP*2.)*.04,cos(uTime*.33+aP)*.15);
      vA=uOn*pow(max(0.,sin(uTime*1.3+aP*3.)),6.);vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=uPx/-mv.z;}`,
    fragmentShader:`varying float vA;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(.85,1.,.45,vA*smoothstep(.5,0.,d));}`});
  flies=new THREE.Points(g,m);flies.frustumCulled=false;flies.visible=false;scene.add(flies);
}
/* ánh sáng LED ban đêm */
function buildLedGlows(){LEDS.forEach(l=>{const c=l.k==='rec'?'#FF4A3A':l.k==='lamp'?'#FFD9A0':l.k==='hub'?'#FF5A4A':'#8CFF70';const s=glowSprite(c,l.k==='lamp'?.5:l.k==='hub'?.6:1.5);l.m.add(s);l.g=s})}
// đồi, rẫy cà phê, đất đỏ bazan, rừng, hồ, làng, bầu trời
const hh=(x,y)=>{const s=Math.sin(x*127.1+y*311.7)*43758.5453;return s-Math.floor(s)};
function vnz(x,y){const i=Math.floor(x),j=Math.floor(y),fx=x-i,fy=y-j,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);return lerp(lerp(hh(i,j),hh(i+1,j),u),lerp(hh(i,j+1),hh(i+1,j+1),u),v)}
function fbm2(x,y){return .5*vnz(x,y)+.25*vnz(x*2.03+5.1,y*2.03+1.7)+.125*vnz(x*4.1+9.2,y*4.1+3.3)+.0625*vnz(x*8.3+2,y*8.3+7)}
const WSZ=1300,LAKE=-40;
const PEAK={x:110,z:-420,h:200,r:150};
function ridge(x,z){let s=0,a=.5,f=1,w=1;for(let i=0;i<6;i++){let n=1-Math.abs(vnz(x*f+i*7.3,z*f+i*3.1)*2-1);n*=n;s+=n*a*w;w=Math.min(1,n*1.7);f*=2.03;a*=.5}return s}
function slabD(x,z){if(Math.abs(x)<40&&Math.abs(z)<34&&inPoly(x,z,OUT))return 0;return dPoly(x,z,OUT)}
function massif(x,z){
  const qx=x+(fbm2(x*.004+2,z*.004+7)-.5)*160,qz=z+(fbm2(x*.004+5,z*.004+1)-.5)*160;
  const dx=qx-PEAK.x,dz=(qz-PEAK.z)*1.25,d=Math.sqrt(dx*dx+dz*dz);
  const mask=Math.exp(-d*d/(2*PEAK.r*PEAK.r));
  const r=ridge(qx*.0062+3.3,qz*.0062+1.1);
  const top=Math.exp(-d*d/(2*70*70));
  return PEAK.h*(mask*(.22+1.0*r*mask)+top*.3*(.6+.4*r));
}
function TH(x,z,d){if(DEM){if(d==null)d=slabD(x,z);return demH(x,z)+.04+(vnz(x*.07,z*.07)-.5)*1.2*sstep(6,60,d)}
  if(d==null)d=slabD(x,z);const k=sstep(4,70,d),k2=sstep(150,440,d);
  let h=(fbm2(x*.011+3,z*.011+1)-.42)*20*k+(vnz(x*.07,z*.07)-.5)*1.4*k-sstep(25,260,d)*13;
  h+=(Math.pow(fbm2(x*.0034+3,z*.0034+8),1.4)*80+ridge(x*.0055+1.7,z*.0055+4.2)*130)*k2;
  h+=massif(x,z)*sstep(60,200,d);
  return h}
// loại đất: 0 cà phê · 1 đất đỏ đã cày · 2 cỏ · 3 cây non/hồ tiêu · 4 rừng · 5 sắn/ngô
function landUse(x,z,d){
  const wx=x+(fbm2(x*.008,z*.008)-.5)*70,wz=z+(fbm2(x*.008+9,z*.008+4)-.5)*70;
  const cs=d<160?17:27,cx=Math.floor(wx/cs),cz=Math.floor(wz/cs),fx=wx/cs-cx,fz=wz/cs-cz;
  const edge=Math.min(fx,1-fx,fz,1-fz);const r=hh(cx+.37,cz+.71),r2=hh(cz+.13,cx+.91);
  const mt=sstep(120,300,d);let t;
  if(r2<mt*.9)t=4;else if(r<.4)t=0;else if(r<.47)t=1;else if(r<.62)t=2;else if(r<.7)t=3;else if(r<.88)t=4;else t=5;
  return[t,r2,edge*2];
}
let sky,stars,villageGlow,mist=[],LU;
function buildWorld(){
  // bản đồ sử dụng đất
  const T=LOW?320:640,data=new Uint8Array(T*T*4),col=new Uint8Array(T*T*4);
  const BASE=[[.20,.36,.13],[.60,.31,.18],[.46,.57,.24],[.40,.44,.19],[.12,.25,.09],[.66,.62,.32]];
  for(let j=0;j<T;j++)for(let i=0;i<T;i++){const x=(i+.5)/T*WSZ-WSZ/2,z=(j+.5)/T*WSZ-WSZ/2;const d=(Math.abs(x)<60&&Math.abs(z)<55)?slabD(x,z):Math.hypot(x/33,z/27)*30-24;
    const u=landUse(x,z,d),k=(j*T+i)*4;data[k]=u[0]*40;data[k+1]=u[1]*255;data[k+2]=clamp(u[2],0,1)*255;data[k+3]=255;
    const b=BASE[u[0]],v=.9+hh(i*.37,j*.91)*.0+ (u[1]-.5)*.16;col[k]=clamp(b[0]*v,0,1)*255;col[k+1]=clamp(b[1]*v,0,1)*255;col[k+2]=clamp(b[2]*v,0,1)*255;col[k+3]=255}
  const tN=new THREE.DataTexture(data,T,T,THREE.RGBAFormat);tN.magFilter=tN.minFilter=THREE.NearestFilter;tN.needsUpdate=true;
  const tC=new THREE.DataTexture(col,T,T,THREE.RGBAFormat);tC.magFilter=THREE.LinearFilter;tC.minFilter=THREE.LinearFilter;tC.needsUpdate=true;
  const tL=new THREE.DataTexture(data,T,T,THREE.RGBAFormat);tL.magFilter=tL.minFilter=THREE.LinearFilter;tL.needsUpdate=true;
  LU={data,T};
  // địa hình
  const seg=LOW?200:300;const g=new THREE.PlaneGeometry(WSZ,WSZ,seg,seg);g.rotateX(-Math.PI/2);
  const p=g.attributes.position,ad=new Float32Array(p.count);const wp=u=>{const t=u/(WSZ/2),a=DEM?.12:1;return WSZ/2*(a*t+(1-a)*t*t*t)};for(let i=0;i<p.count;i++){const x=wp(p.getX(i)),z=wp(p.getZ(i));p.setX(i,x);p.setZ(i,z);const d=(Math.abs(x)<60&&Math.abs(z)<55)?slabD(x,z):Math.hypot(x/33,z/27)*30-24;ad[i]=d;const sk=DEM?(1-sstep(0,2.6,d))*.07:0;p.setY(i,TH(x,z,d)-sk)}g.setAttribute('aD',new THREE.BufferAttribute(ad,1));g.computeVertexNormals();
  const m=new THREE.MeshStandardMaterial({roughness:.97,polygonOffset:true,polygonOffsetFactor:2,polygonOffsetUnits:2});
  m.onBeforeCompile=sh=>{
    Object.assign(sh.uniforms,U);sh.uniforms.uLU={value:tN};sh.uniforms.uLL={value:tL};sh.uniforms.uLC={value:tC};sh.uniforms.uDry=GU.uDry;sh.uniforms.uSunW=GU2.uSunW;sh.uniforms.uDay=GU2.uDay;
    sh.vertexShader='attribute float aD;varying float vD;varying vec3 vW;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvW=(modelMatrix*vec4(transformed,1.)).xyz;vD=aD;');
    sh.fragmentShader='uniform sampler2D uLU,uLL,uLC;uniform float uRainV,uDry,uDay;uniform vec3 uSunW;varying vec3 vW;varying float vD;\n'+NOISE_GLSL+PULSE_GLSL+DATA_GLSL+sh.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );',`
      vec2 uv=vW.xz/${WSZ}.+.5;vec4 t=texture2D(uLU,uv);vec4 tl=texture2D(uLL,uv);
      float ty=floor(t.r*255./40.+.5);float ang=t.g*3.1416;vec2 dir=vec2(cos(ang),sin(ang));
      float n=fbm(vW.xz*.09),n2=vn(vW.xz*1.1),row=sin(dot(vW.xz,dir)*3.6);
      float n3=vn(vW.xz*3.7),nl=fbm(vW.xz*.012+t.g*7.);
      float rw=smoothstep(.15,.85,sin(dot(vW.xz,dir)*11.+n2*.8)*.5+.5);
      vec3 soilR=mix(vec3(.44,.25,.16),vec3(.56,.33,.22),n)*(.85+.25*n3)*(.85+.3*fract(t.g*13.7));
      vec3 c;
      if(ty<.5){float cu=dot(vW.xz,dir)/${(1.6/11.6).toFixed(5)},cvv=dot(vW.xz,vec2(-dir.y,dir.x))/${(3/11.6).toFixed(5)};
        float wv=fwidth(cvv),wu=fwidth(cu);float cov=pulseF(cvv-.5,.34+.06*n3,wv)*mix(pulseF(cu-.5,.44,wu),1.,.55);
        vec3 sd=normalize(uSunW);vec2 off=sd.xz/max(sd.y,.12)*.13;off*=min(1.,.4/max(length(off),.001));
        float sc=pulseF(cvv-.5+dot(off,vec2(-dir.y,dir.x))/${(3/11.6).toFixed(5)},.38,wv+.04);
        vec3 can=mix(vec3(.12,.21,.08),vec3(.2,.31,.12),nl)*(.8+.4*n3);c=mix(soilR*.92*(1.-sc*.5*uDay),can,cov);}
      else if(ty<1.5){c=soilR*(.9+.12*sin(dot(vW.xz,dir)*16.));}
      else if(ty<2.5){c=mix(vec3(.30,.36,.16),vec3(.42,.44,.22),nl)*(.85+.3*n3);}
      else if(ty<3.5){c=mix(soilR,mix(vec3(.20,.30,.12),vec3(.28,.36,.15),n3),rw*.6);}
      else if(ty<4.5){c=mix(vec3(.11,.19,.08),vec3(.2,.29,.12),fbm(vW.xz*.08))*(.75+.5*n3);}
      else {c=mix(vec3(.40,.42,.20),vec3(.52,.50,.28),nl)*(.9+.12*sin(dot(vW.xz,dir)*14.));}
      c=mix(c,c*vec3(.92,.98,.9),.3);c*=.82+.36*fract(t.g*31.3);
      float lawn=1.-smoothstep(${DEM?'16.,30.':'9.,18.'},vD);
      c=mix(c,mix(vec3(.28,.38,.15),vec3(.38,.46,.20),n)*(.85+.3*n3),lawn);
      float hedge=smoothstep(.06,.02,tl.b)*(1.-lawn)*step(.35,fract(t.g*7.3));
      c=mix(c,c*.8,hedge*.4);
      float road=smoothstep(.028,.012,tl.b)*(1.-lawn)*step(fract(t.g*7.3),.35);
      c=mix(c,vec3(.66,.42,.28)*(.9+.15*n2),road);
      ${DEM?'':'c=mix(c,vec3(.24,.30,.36),smoothstep(-8.6,-9.4,vW.y)*.6);'}
      {vec3 Nw=normalize(cross(dFdx(vW),dFdy(vW)));if(Nw.y<0.)Nw=-Nw;float slope=1.-Nw.y;
       float mh=smoothstep(10.,55.,vW.y);
       float fb=fbm(vW.xz*.035),fb2=fbm(vW.xz*.21);
       vec3 forest=mix(vec3(.05,.12,.045),vec3(.13,.24,.08),fb)*(.7+.6*fb2);
       vec3 rock=mix(vec3(.30,.28,.25),vec3(.50,.46,.40),fb2);
       vec3 mc=mix(forest,rock,smoothstep(.72,.9,slope+(fb2-.5)*.3)*.85);
       mc=mix(mc,mc*vec3(1.1,1.05,.85),smoothstep(120.,260.,vW.y)*.5);
       c=mix(c,mc,mh);}
      c=mix(c,c*.72,uRainV*.45);c=mix(c,c*vec3(1.15,1.04,.68)+.03,uDry*.35);
      c=dataTint(c,vW,0.);
      vec4 diffuseColor=vec4(pow(c,vec3(2.2)),1.);`);
  };
  m.extensions={derivatives:true};
  const _obc=m.onBeforeCompile;m.onBeforeCompile=sh=>{_obc(sh);sh.fragmentShader=sh.fragmentShader.replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>
      {float mh2=smoothstep(8.,40.,vW.y);if(mh2>0.){vec2 q=vW.xz*.09;float e=.6;
        float h0=fbm(q),hx=fbm(q+vec2(e*.09,0.)),hz=fbm(q+vec2(0.,e*.09));
        vec2 q2=vW.xz*.42;float k0=vn(q2),kx=vn(q2+vec2(.05,0.)),kz=vn(q2+vec2(0.,.05));
        vec3 g=vec3((h0-hx)*14.+(k0-kx)*3.5,0.,(h0-hz)*14.+(k0-kz)*3.5)*mh2;
        normal=normalize(normal+(viewMatrix*vec4(g.x,0.,g.z,0.)).xyz);}}`)};
  const terr=new THREE.Mesh(g,m);terr.receiveShadow=true;scene.add(terr);
  // hồ trong thung lũng
  const lk=new THREE.Mesh(new THREE.PlaneGeometry(WSZ,WSZ),new THREE.MeshStandardMaterial({color:'#4E8FA3',roughness:.15,metalness:.2,transparent:true,opacity:.92}));
  lk.rotation.x=-Math.PI/2;lk.position.y=LAKE;scene.add(lk);
  // rừng & cây bóng mát
  const N=LOW?1500:3000,arr=[];let tries=0;
  while(arr.length<N&&tries<N*12){tries++;const x=(rnd()-.5)*WSZ*.94,z=(rnd()-.5)*WSZ*.94;const d=Math.hypot(x/33,z/27)*30-24;if(d<14)continue;
    const i=Math.floor((x/WSZ+.5)*LU.T),j=Math.floor((z/WSZ+.5)*LU.T),ty=LU.data[(j*LU.T+i)*4]/40,ed=LU.data[(j*LU.T+i)*4+2]/255;
    const pr=ty===4?.98:ty===0?.02:ty===2?.04:ty===3?.015:0;if((ty!==4&&ed<.09)||rnd()>pr)continue;
    const y=TH(x,z);if(y<LAKE+.3||y>34)continue;arr.push({x,z,y,s:.55+rnd()*.6+Math.max(0,d)*.0015,r:rnd()*6.28})}
  staticTrees(arr,1.15);
  // rừng dày gần vườn
  {const fr=[],FS=LOW?3.8:3.0,FX=LOW?130:165,FZ=LOW?115:145;for(let x=-FX;x<=FX;x+=FS)for(let z=-FZ;z<=FZ;z+=FS){const jx=x+(hh(x,z)-.5)*FS*.85,jz=z+(hh(z,x)-.5)*FS*.85;
     const i=Math.floor((jx/WSZ+.5)*LU.T),j=Math.floor((jz/WSZ+.5)*LU.T),k=(j*LU.T+i)*4;if(LU.data[k]/40!==4)continue;
     const d=slabD(jx,jz);if(d<8)continue;const y=TH(jx,jz,d);if(y<LAKE+.3||y>34)continue;fr.push({x:jx,z:jz,y,s:.6+hh(jx*3,jz*3)*.55,r:hh(jx*5,jz*5)*6.28})}
   staticTrees(fr,1.05);STATS.forest=fr.length;}
  // làng
  const walls=[],roofs=[],glow=[];const RC=['#B5452E','#C2623A','#3E7C8C','#8C4A32','#5D6E7A'];
  for(let v=0;v<7;v++){let cx,cz,d,k=0;do{const a=rnd()*6.28,R=40+rnd()*120;cx=Math.cos(a)*R;cz=Math.sin(a)*R*.8;d=Math.hypot(cx/33,cz/27)*30-24;k++}while((d<22||TH(cx,cz)<LAKE+1)&&k<30);
    const n=8+Math.floor(rnd()*9),ra=rnd()*3;
    for(let i=0;i<n;i++){const a=ra+i*.55+rnd()*.3,R=1+i*.6+rnd()*1.1;const x=cx+Math.cos(a)*R,z=cz+Math.sin(a)*R;const y=TH(x,z);if(y<LAKE+.3)continue;const s=(.8+rnd()*.6)*.42;
      walls.push({x,z,y,s,r:a});roofs.push({x,z,y,s,r:a,c:RC[Math.floor(rnd()*RC.length)]});glow.push(x,y+.7*s,z)}}
  const wg=new THREE.BoxGeometry(1.6,1,1.2);wg.translate(0,.5,0);const rg=new THREE.ConeGeometry(1.25,.7,4);rg.rotateY(Math.PI/4);rg.scale(1,1,.78);rg.translate(0,1.33,0);
  const wm=new THREE.InstancedMesh(wg,new THREE.MeshStandardMaterial({color:'#EDE6D6',roughness:.8}),walls.length),rm=new THREE.InstancedMesh(rg,new THREE.MeshStandardMaterial({roughness:.7,flatShading:true}),roofs.length);
  const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),S=new THREE.Vector3(),P=new THREE.Vector3(),C=new THREE.Color();
  walls.forEach((o,i)=>{Q.setFromAxisAngle(new THREE.Vector3(0,1,0),o.r);S.setScalar(o.s);P.set(o.x,o.y-.05,o.z);M.compose(P,Q,S);wm.setMatrixAt(i,M);rm.setMatrixAt(i,M);rm.setColorAt(i,C.set(roofs[i].c))});
  wm.castShadow=rm.castShadow=true;scene.add(wm,rm);
  const gg=new THREE.BufferGeometry();gg.setAttribute('position',new THREE.Float32BufferAttribute(glow,3));
  villageGlow=new THREE.Points(gg,new THREE.PointsMaterial({color:'#FFC870',size:2.2,map:GLOW||glowTex(),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:0}));scene.add(villageGlow);
}