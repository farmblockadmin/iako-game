/* =================================================================
   DRIVE · tuyến lái xe qua vườn, chiếc bán tải, bụi đường, đèn pha,
   camera bám xe theo từng trạm dừng
   ================================================================= */
// tuyến đi theo tim đường đất (toạ độ sơ đồ, px)
const ROUTE_PX=[[774,792],[756,676],[744,592],[724,560],[640,558],[549,557],[547,500],[546,432],[500,427],[458,425],[456,468],[400,466],[372,465],[330,462],[318,536],[305,606],[322,632],[334,716]];
const RT={x:null,z:null,n:0,L:0,step:.03,cross:[]};
function buildRoute(){
  const P=ROUTE_PX.map(toW),pts=[P[0]];const R=.42;
  for(let i=1;i<P.length-1;i++){const a=P[i-1],b=P[i],c=P[i+1];const l1=Math.hypot(b[0]-a[0],b[1]-a[1]),l2=Math.hypot(c[0]-b[0],c[1]-b[1]);const r=Math.min(R,l1*.45,l2*.45);
    const p1=[b[0]+(a[0]-b[0])/l1*r,b[1]+(a[1]-b[1])/l1*r],p2=[b[0]+(c[0]-b[0])/l2*r,b[1]+(c[1]-b[1])/l2*r];
    for(let k=0;k<=10;k++){const t=k/10,u=1-t;pts.push([u*u*p1[0]+2*u*t*b[0]+t*t*p2[0],u*u*p1[1]+2*u*t*b[1]+t*t*p2[1]])}}
  pts.push(P[P.length-1]);
  const cum=[0];for(let i=1;i<pts.length;i++)cum.push(cum[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));
  const L=cum[cum.length-1],n=Math.ceil(L/RT.step)+1;RT.x=new Float32Array(n);RT.z=new Float32Array(n);RT.n=n;RT.L=L;
  let j=0;for(let i=0;i<n;i++){const s=Math.min(L,i*RT.step);while(j<cum.length-2&&cum[j+1]<s)j++;const t=(s-cum[j])/((cum[j+1]-cum[j])||1);RT.x[i]=lerp(pts[j][0],pts[j+1][0],t);RT.z[i]=lerp(pts[j][1],pts[j+1][1],t)}
  // điểm cắt ranh vườn -> cổng
  let prev=inPoly(RT.x[0],RT.z[0],OUT);for(let i=1;i<n;i++){const v=inPoly(RT.x[i],RT.z[i],OUT);if(v!==prev){RT.cross.push(i*RT.step);prev=v}}
}
const _cs={p:new THREE.Vector3(),f:new THREE.Vector3(),r:new THREE.Vector3(),yaw:0};
function routeAt(s,o){o=o||{p:new THREE.Vector3(),f:new THREE.Vector3(),r:new THREE.Vector3(),yaw:0};s=clamp(s,0,RT.L);
  const fi=s/RT.step,i=Math.min(RT.n-2,Math.floor(fi)),t=fi-i;const x=lerp(RT.x[i],RT.x[i+1],t),z=lerp(RT.z[i],RT.z[i+1],t);
  const a=Math.max(0,Math.floor((s-.22)/RT.step)),b=Math.min(RT.n-1,Math.ceil((s+.22)/RT.step));let fx=RT.x[b]-RT.x[a],fz=RT.z[b]-RT.z[a];const l=Math.hypot(fx,fz)||1;fx/=l;fz/=l;
  o.p.set(x,gH(x,z),z);o.f.set(fx,0,fz);o.r.set(-fz,0,fx);o.yaw=Math.atan2(fx,fz);return o}
function nearestS(px){const w=toW(px);let b=0,bd=1e9;for(let i=0;i<RT.n;i++){const d=(RT.x[i]-w[0])**2+(RT.z[i]-w[1])**2;if(d<bd){bd=d;b=i}}return b*RT.step}
const STOP={};
function setStops(){STOP.hero=nearestS([757,690]);STOP.gate=RT.cross[0]+.42;STOP.over=nearestS([652,558]);STOP.rows=nearestS([547,499.6]);STOP.hq=nearestS([386,465]);STOP.dev=nearestS([336,462]);STOP.end=nearestS([331,688])}
function dRoute(x,z){let m=1e9;for(let i=0;i<RT.n;i+=4){const d=(RT.x[i]-x)**2+(RT.z[i]-z)**2;if(d<m)m=d}return Math.sqrt(m)}

/* ---------- đường đất ngoài vườn + cổng ---------- */
function buildOuterRoads(){
  const T=ptx('road');T.c.repeat.set(1,1);
  const m=new THREE.MeshStandardMaterial({map:T.c,normalMap:T.n,roughness:1,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});
  m.onBeforeCompile=sh=>{sh.vertexShader='varying float vEg;\n'+sh.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvEg=uv.x;vMapUv=(modelMatrix*vec4(position,1.)).xz*3.9;vNormalMapUv=vMapUv;');
    sh.fragmentShader='varying float vEg;\n'+sh.fragmentShader.replace('#include <roughnessmap_fragment>','float roughnessFactor=texture2D(map,vMapUv).a;')
      .replace('#include <map_fragment>','#include <map_fragment>\nfloat eg=abs(vEg*2.-1.);diffuseColor.rgb*=1.-smoothstep(.55,1.,eg)*.25;diffuseColor.a=1.-smoothstep(.82,1.,eg);')
      .replace('#include <normal_fragment_maps>','vec3 mapN=texture2D(normalMap,vNormalMapUv).xyz*2.-1.;normal=normalize(normal+(viewMatrix*vec4(mapN.x,0.,mapN.y,0.)).xyz*.8);')};
  m.transparent=true;m.depthWrite=true;
  const seg=(s0,s1)=>{const P=[],UV=[],I=[];const o={p:new THREE.Vector3(),f:new THREE.Vector3(),r:new THREE.Vector3()};let k=0;
    for(let s=s0;s<=s1+1e-6;s+=.06,k++){routeAt(s,o);for(const sd of[-1,1]){const x=o.p.x+o.r.x*RW*1.15*sd,z=o.p.z+o.r.z*RW*1.15*sd;P.push(x,gH(x,z)+.012,z);UV.push(sd<0?0:1,s)}
      if(k>0){const a=(k-1)*2;I.push(a,a+1,a+2,a+1,a+3,a+2)}}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(UV,2));g.setIndex(I);g.computeVertexNormals();
    const me=new THREE.Mesh(g,m);me.receiveShadow=true;me.renderOrder=1;scene.add(me)};
  if(RT.cross.length>=2){seg(0,RT.cross[0]+.05);seg(RT.cross[RT.cross.length-1]-.05,RT.L)}
}

/* ---------- chiếc xe ---------- */
const CAR={g:null,body:null,wheels:[],front:[],len:5.37,ready:false,s:0,v:0,lastS:null,spin:0,steer:0,lights:[],glows:[],tail:[]};
function carPlaceholder(){
  const g=new THREE.Group(),m=new THREE.Group();
  const paint=new THREE.MeshPhysicalMaterial({color:'#EDEDEA',roughness:.28,metalness:.45,clearcoat:1,clearcoatRoughness:.08});
  const glass=new THREE.MeshPhysicalMaterial({color:'#0F1418',roughness:.05,metalness:.2,clearcoat:1});
  const dark=new THREE.MeshStandardMaterial({color:'#1A1C1E',roughness:.7});
  const s=new THREE.Shape();[[2.68,.48],[2.66,.98],[1.3,1.12],[.42,1.84],[-.9,1.86],[-1.0,1.16],[-2.72,1.12],[-2.72,.52],[-2.2,.42],[2.2,.42]].forEach((p,i)=>i?s.lineTo(p[0],p[1]):s.moveTo(p[0],p[1]));
  const bg=new THREE.ExtrudeGeometry(s,{depth:1.78,bevelEnabled:true,bevelThickness:.06,bevelSize:.06,bevelSegments:3});bg.translate(0,0,-.89);
  const body=new THREE.Mesh(bg,paint);body.castShadow=body.receiveShadow=true;m.add(body);
  const gs=new THREE.Shape();[[1.22,1.16],[.45,1.78],[-.85,1.8],[-.94,1.2]].forEach((p,i)=>i?gs.lineTo(p[0],p[1]):gs.moveTo(p[0],p[1]));
  const gg=new THREE.ExtrudeGeometry(gs,{depth:1.82,bevelEnabled:false});gg.translate(0,0,-.91);const gl=new THREE.Mesh(gg,glass);gl.scale.set(.98,1,1);m.add(gl);
  const bed=new THREE.Mesh(new THREE.BoxGeometry(1.6,.05,1.62),dark);bed.position.set(-1.86,1.0,0);m.add(bed);
  const bump=new THREE.Mesh(new THREE.BoxGeometry(.2,.32,1.9),dark);bump.position.set(2.72,.56,0);m.add(bump);
  const tw=new THREE.CylinderGeometry(.4,.4,.3,24);tw.rotateX(Math.PI/2);const rimG=new THREE.CylinderGeometry(.26,.26,.31,16);rimG.rotateX(Math.PI/2);
  const tireM=new THREE.MeshStandardMaterial({color:'#151515',roughness:.9}),rimM=new THREE.MeshStandardMaterial({color:'#9CA2A6',roughness:.3,metalness:.9});
  [[1.62,.82],[1.62,-.82],[-1.62,.82],[-1.62,-.82]].forEach(([x,z],i)=>{const w=new THREE.Group();const t=new THREE.Mesh(tw,tireM);t.castShadow=true;w.add(t);const r=new THREE.Mesh(rimG,rimM);w.add(r);
    const sp=new THREE.Mesh(new THREE.BoxGeometry(.5,.06,.32),rimM);w.add(sp);w.position.set(x,.4,z);m.add(w);CAR.wheels.push(w);if(x>0)CAR.front.push(w)});
  m.rotation.y=-Math.PI/2;// trục dài +x -> +z (hướng tiến)
  m.scale.setScalar(M2U);g.add(m);CAR.body=m;
  return g;
}
function carLights(){
  const g=CAR.g;
  for(const sd of[-1,1]){
    const L=new THREE.SpotLight('#FFE9C8',0,3.6,.45,.7,1.6);L.position.set(sd*.66*M2U,.95*M2U,2.55*M2U);L.target.position.set(sd*.4*M2U,0,9*M2U);g.add(L);g.add(L.target);CAR.lights.push(L);
    const s=glowSprite('#FFF1D6',.011);s.position.set(sd*.68*M2U,.92*M2U,2.66*M2U);g.add(s);CAR.glows.push(s);
    const tl=glowSprite('#FF3A2A',.016);tl.position.set(sd*.78*M2U,1.0*M2U,-2.74*M2U);g.add(tl);CAR.tail.push(tl);
  }
}
function buildCar(){
  CAR.g=new THREE.Group();CAR.ph=carPlaceholder();CAR.g.add(CAR.ph);scene.add(CAR.g);carLights();buildDust();
  loadCarModel();
}
function loadCarModel(){
  if(typeof GLTFLoader==='undefined')return;
  const ld=new GLTFLoader();if(typeof MeshoptDecoder!=='undefined')ld.setMeshoptDecoder(MeshoptDecoder);
  fetch(ASSET+'car/ford-ranger.json').then(r=>r.json()).then(j=>{const bs=atob(j.glb),u8=new Uint8Array(bs.length);for(let i=0;i<bs.length;i++)u8[i]=bs.charCodeAt(i);ld.parse(u8.buffer,'',onCar,e=>console.warn('car parse',e))}).catch(e=>console.warn('car load',e));
  function onCar(gl){try{
    const root=gl.scene;root.updateMatrixWorld(true);
    const meshes=[];root.traverse(o=>{if(o.isMesh)meshes.push(o)});
    const bb=new THREE.Box3().setFromObject(root),sz=bb.getSize(V(0,0,0)),c=bb.getCenter(V(0,0,0));
    const v=V(0,0,0),nm=new THREE.Matrix3();
    // tâm 4 bánh từ lốp
    const ty=meshes.find(m=>/tyre/i.test(m.material.name));const cl=[0,1,2,3].map(()=>new THREE.Box3());
    const CP=[[],[],[],[]];if(ty){const p=ty.geometry.attributes.position;for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(ty.matrixWorld);const k=(v.x>c.x?1:0)+(v.z>c.z?2:0);cl[k].expandByPoint(v);if(i%3===0)CP[k].push(v.x,v.y,v.z)}}
    const WC=cl.map(b=>b.isEmpty()?null:b.getCenter(V(0,0,0)));const WR=ty?Math.max(...cl.map(b=>b.isEmpty()?0:(b.max.y-b.min.y)/2)):0;
    // trục bánh thật = hướng phương sai nhỏ nhất của đám đỉnh lốp (bánh trước có thể đang đánh lái sẵn trong model)
    const axisOf=(P,ctr)=>{const C=[0,0,0,0,0,0,0,0,0];const n=P.length/3;for(let i=0;i<n;i++){const d=[P[i*3]-ctr.x,P[i*3+1]-ctr.y,P[i*3+2]-ctr.z];for(let a=0;a<3;a++)for(let b=0;b<3;b++)C[a*3+b]+=d[a]*d[b]/n}
      const tr=C[0]+C[4]+C[8];let x=[1,0,0];for(let it=0;it<60;it++){const y=[0,0,0];for(let a=0;a<3;a++)for(let b=0;b<3;b++)y[a]+=((a===b?tr:0)-C[a*3+b])*x[b];const l=Math.hypot(...y)||1;x=y.map(q=>q/l)}
      const ax=V(x[0],x[1],x[2]);if(ax.x<0)ax.negate();return ax};
    const groups=WC.map((w,k)=>{if(!w)return null;const st=new THREE.Group(),sp=new THREE.Group();st.position.copy(w);st.add(sp);const ax=CP[k].length>30?axisOf(CP[k],w):V(1,0,0);return{st,sp,front:w.z>c.z,ax}});
    const isW=/tyre|rim|disc|chrome/i;
    meshes.forEach(m=>{if(!isW.test(m.material.name)||!WC[0])return;
      const g=m.geometry,P=g.attributes.position,N=g.attributes.normal,UV=g.attributes.uv,I=g.index?g.index.array:null;const nt=I?I.length/3:P.count/3;
      nm.getNormalMatrix(m.matrixWorld);const W=[];for(let i=0;i<P.count;i++)W.push(v.fromBufferAttribute(P,i).applyMatrix4(m.matrixWorld).clone());
      const keep=[],parts=[[],[],[],[]];
      for(let t=0;t<nt;t++){const a=I?I[t*3]:t*3,b=I?I[t*3+1]:t*3+1,cc=I?I[t*3+2]:t*3+2;const cx=(W[a].x+W[b].x+W[cc].x)/3,cy=(W[a].y+W[b].y+W[cc].y)/3,cz=(W[a].z+W[b].z+W[cc].z)/3;
        let hit=-1;for(let k=0;k<4;k++){const w=WC[k];if(!w)continue;if(Math.abs(cx-w.x)<.3*sz.y&&Math.hypot(cy-w.y,cz-w.z)<WR*1.04){hit=k;break}}
        if(hit<0)keep.push(a,b,cc);else parts[hit].push(a,b,cc)}
      parts.forEach((ix,k)=>{if(!ix.length)return;const pos=new Float32Array(ix.length*3),nor=new Float32Array(ix.length*3),uv=UV?new Float32Array(ix.length*2):null;const nv=V(0,0,0);
        ix.forEach((q,j)=>{pos[j*3]=W[q].x-WC[k].x;pos[j*3+1]=W[q].y-WC[k].y;pos[j*3+2]=W[q].z-WC[k].z;if(N){nv.fromBufferAttribute(N,q).applyMatrix3(nm).normalize();nor[j*3]=nv.x;nor[j*3+1]=nv.y;nor[j*3+2]=nv.z}if(uv){uv[j*2]=UV.getX(q);uv[j*2+1]=UV.getY(q)}});
        const ng=new THREE.BufferGeometry();ng.setAttribute('position',new THREE.BufferAttribute(pos,3));if(N)ng.setAttribute('normal',new THREE.BufferAttribute(nor,3));else ng.computeVertexNormals();if(uv)ng.setAttribute('uv',new THREE.BufferAttribute(uv,2));
        const wm=new THREE.Mesh(ng,m.material);wm.castShadow=true;groups[k].sp.add(wm)});
      if(I){g.setIndex(keep)}else{/* không có index: để nguyên */}
    });
    const wrap=new THREE.Group();wrap.add(root);groups.forEach(gp=>gp&&wrap.add(gp.st));wrap.position.set(-c.x,-bb.min.y,-c.z);
    const holder=new THREE.Group();holder.add(wrap);holder.scale.setScalar(CAR.len*M2U/Math.max(sz.x,sz.z));holder.rotation.y=(sz.x>sz.z?-Math.PI/2:0)+(CAR_FLIP?Math.PI:0);
    root.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;const mt=o.material;if(!mt)return;
      if(/tyre/i.test(mt.name)){mt.metalness=0;mt.roughness=.88}
      if(/carpaint|chrome|glass|mirror/i.test(mt.name))mt.envMapIntensity=1.4;
      if(/carpaint/i.test(mt.name)){mt.color.set('#2F8A3E');mt.metalness=.55;mt.roughness=.22;if(mt.isMeshPhysicalMaterial){mt.clearcoat=1;mt.clearcoatRoughness=.06}}});
    CAR.g.remove(CAR.ph);CAR.g.add(holder);CAR.body=holder;CAR.model=root;CAR.wg=groups.filter(Boolean);CAR.ready=true;
    const fz=(bb.max.z-c.z)*holder.scale.x,hy=(bb.max.y-bb.min.y)*holder.scale.x;
    try{roofLogo(holder,bb,hy,fz)}catch(e){console.warn('roof',e)}
    try{carExtras(hy,fz)}catch(e){console.warn('extras',e)}
    CAR.lights.forEach((L,i)=>{L.position.z=fz*.96;L.position.y=hy*.5;L.target.position.z=fz*.96+9*M2U});CAR.glows.forEach(s=>{s.position.z=fz*.99;s.position.y=hy*.52});CAR.tail.forEach(s=>{s.position.z=-fz*.99;s.position.y=hy*.55});
  }catch(e){console.warn('car',e)}}
}
const CAR_FLIP=false;
/* icon Farmblock trên nóc xe */
function roofLogo(holder,bb,hy,fz){
  CAR.g.updateMatrixWorld(true);const rc=new THREE.Raycaster(),meshes=[];CAR.model.traverse(o=>{if(o.isMesh&&!/glass|window/i.test(o.material.name))meshes.push(o)});
  // quét lưới trên nóc, tìm mặt phẳng mái cabin (nhiều điểm trúng nhất ở độ cao lớn), bỏ qua vây ăng-ten
  const hits=[];const d=V(0,-1,0).transformDirection(CAR.g.matrixWorld);
  for(let z=-1.6;z<=1.6;z+=.08)for(let x=-.6;x<=.6;x+=.08){rc.set(CAR.g.localToWorld(V(x*M2U,hy+1,z*M2U)),d);const h=rc.intersectObjects(meshes,false)[0];if(h)hits.push(CAR.g.worldToLocal(h.point.clone()))}
  if(!hits.length)return;const bin=.03*M2U,cnt={};hits.forEach(p=>{const k=Math.round(p.y/bin);cnt[k]=(cnt[k]||0)+1});
  const ks=Object.keys(cnt).map(Number).sort((a,b)=>b-a);let top=ks.find(k=>cnt[k]+(cnt[k-1]||0)>=12);if(top===undefined)top=ks[0];
  const roof=hits.filter(p=>Math.abs(p.y/bin-top)<=1.6);const best=V(0,0,0);roof.forEach(p=>best.add(p));best.multiplyScalar(1/roof.length);best.x=0;best.y=Math.max(...roof.map(p=>p.y));
  const mk=document.querySelector('#mk');if(!mk)return;
  const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="-12 -12 384 384"><path d="M140.967 19.9768C162.647 -1.70319 197.797 -1.70319 219.477 19.9768L340.467 140.967C362.147 162.647 362.147 197.797 340.467 219.477L219.477 340.467C197.797 362.147 162.647 362.147 140.967 340.467L19.9768 219.477C-1.70319 197.797 -1.70319 162.647 19.9768 140.967L140.967 19.9768Z" fill="#F1F7E8" transform="translate(180 180) scale(1.06) translate(-180 -180)"/>'+mk.innerHTML+'</svg>';
  const im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=c.height=512;c.getContext('2d').drawImage(im,0,0,512,512);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;
    const m=new THREE.Mesh(new THREE.PlaneGeometry(.9*M2U,.9*M2U),new THREE.MeshStandardMaterial({map:t,transparent:true,roughness:.35,metalness:.1,polygonOffset:true,polygonOffsetFactor:-4}));
    m.rotation.x=-Math.PI/2;m.position.copy(best);m.position.y+=.004*M2U;CAR.g.add(m);CAR.logo=m};
  im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}

/* phụ kiện xe vườn: đèn nóc, bao cà phê + thùng FarmBlock trên thùng xe, decal cửa, bùn đất đỏ phần dưới */
const CARU={uInv:{value:new THREE.Matrix4()}};
function carExtras(hy,fz){
  CAR.g.updateMatrixWorld(true);const rc=new THREE.Raycaster(),meshes=[];CAR.model.traverse(o=>{if(o.isMesh)meshes.push(o)});
  const m2=M2U,L=(x,y,z)=>CAR.g.localToWorld(V(x*m2,y*m2,z*m2));
  const hitDown=(x,z)=>{rc.set(L(x,4,z),V(0,-1,0).transformDirection(CAR.g.matrixWorld));const h=rc.intersectObjects(meshes,false)[0];return h?CAR.g.worldToLocal(h.point.clone()).y/m2:null};
  const hitSide=(sd,y,z)=>{rc.set(L(sd*2,y,z),V(-sd,0,0).transformDirection(CAR.g.matrixWorld));const h=rc.intersectObjects(meshes,false)[0];return h?CAR.g.worldToLocal(h.point.clone()).x/m2:null};
  // bùn đất đỏ bám phần dưới thân xe
  CAR.model.traverse(o=>{if(!o.isMesh)return;const mt=o.material;if(!mt||!/carpaint|plastic|black|body/i.test(mt.name)||mt._mud)return;mt._mud=1;const prev=mt.onBeforeCompile;
    mt.onBeforeCompile=(sh,r)=>{prev&&prev(sh,r);sh.uniforms.uCarInv=CARU.uInv;
      sh.vertexShader='uniform mat4 uCarInv;varying vec3 vCL;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvCL=(uCarInv*modelMatrix*vec4(transformed,1.)).xyz/'+m2.toFixed(6)+';');
      sh.fragmentShader='varying vec3 vCL;\n'+NOISE_GLSL+sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        float mn=fbm(vCL.xz*3.1+vCL.y*2.3)*.5+vn(vCL.xz*11.+vCL.y*7.)*.25;
        float mud=1.-smoothstep(.42,.86,vCL.y+(mn-.35)*.45);
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.36,.19,.11)*(.75+.5*mn),mud*.82);`).replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.95,1.-smoothstep(.42,.86,vCL.y));')
      .replace('#include <clearcoat_normal_fragment_begin>','#include <clearcoat_normal_fragment_begin>');};mt.needsUpdate=true});
  // đèn nóc
  const roofY=hitDown(0,.15);if(roofY){const bar=new THREE.Group();const bk=new THREE.MeshStandardMaterial({color:'#15181A',roughness:.4,metalness:.6});
    const b=new THREE.Mesh(new THREE.BoxGeometry(1.25,.09,.13),bk);bar.add(b);const lm=new THREE.MeshStandardMaterial({color:'#FFF6DE',emissive:'#FFE7B0',emissiveIntensity:.3,roughness:.2});CAR.barM=lm;
    for(let i=0;i<6;i++){const q=new THREE.Mesh(new THREE.BoxGeometry(.14,.06,.02),lm);q.position.set(-.5+i*.2,0,.07);bar.add(q)}
    for(const sd of[-1,1]){const f=new THREE.Mesh(new THREE.BoxGeometry(.04,.12,.04),bk);f.position.set(sd*.5,-.08,0);bar.add(f)}
    const fy=hitDown(0,.75)||roofY;bar.position.set(0,fy+.14,.75);bar.scale.setScalar(m2);bar.position.multiplyScalar(m2);bar.traverse(o=>{if(o.isMesh)o.castShadow=true});CAR.g.add(bar)}
  // thùng xe: tìm sàn thùng
  const bz=-fz/m2*.55,floor=hitDown(0,bz);if(floor){const cv=document.createElement('canvas');cv.width=cv.height=256;const x=cv.getContext('2d');x.fillStyle='#B9976A';x.fillRect(0,0,256,256);
      for(let i=0;i<256;i+=4){x.fillStyle=`rgba(90,62,30,${.18+.12*Math.sin(i)})`;x.fillRect(i,0,2,256);x.fillRect(0,i,256,1.5)}x.fillStyle='rgba(60,90,40,.85)';x.font='700 40px Archivo,sans-serif';x.fillText('ROBUSTA',40,140);x.font='500 22px Archivo,sans-serif';x.fillText('IA KO 1 · GIA LAI',52,172);
      const tx=new THREE.CanvasTexture(cv);tx.colorSpace=THREE.SRGBColorSpace;const sack=new THREE.MeshStandardMaterial({map:tx,color:'#A3A79C',roughness:.95});
      const sg=new THREE.SphereGeometry(.5,18,12);{const P=sg.attributes.position;for(let i=0;i<P.count;i++){let X=P.getX(i),Y=P.getY(i),Z=P.getZ(i);P.setXYZ(i,X*.7*(1-.12*Y*Y),Y*.34,Z*.42)}sg.computeVertexNormals()}
      const grp=new THREE.Group();[[-.36,0,-.42,.1],[.36,0,-.38,-.15],[-.38,0,.12,.05],[.37,0,.16,-.08],[-.05,.3,-.2,.3],[.1,.3,.25,-.2],[-.3,.3,.3,.15]].forEach(([sx,sy,sz,r],i)=>{const m=new THREE.Mesh(sg,sack);m.position.set(sx,sy+.17,sz);m.rotation.y=r;m.rotation.z=(i%2?.06:-.05);m.castShadow=true;grp.add(m)});
      const cr=new THREE.Mesh(new THREE.BoxGeometry(.55,.42,.42),new THREE.MeshStandardMaterial({color:'#2F6B37',roughness:.6}));cr.position.set(0,.21,.62);cr.castShadow=true;grp.add(cr);
      grp.position.set(0,floor,bz);grp.scale.setScalar(m2);grp.position.multiplyScalar(m2);CAR.g.add(grp)}
  // decal cửa xe
  const mk=document.querySelector('#mk'),wm=document.querySelector('.top .wm');if(mk){const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 300"><g transform="translate(10 30) scale(.66)" fill="#fff">'+mk.innerHTML+'</g><text x="290" y="168" font-family="Archivo,Arial" font-weight="700" font-size="128" fill="#fff" letter-spacing="2">FARMBLOCK</text><text x="296" y="238" font-family="Archivo,Arial" font-weight="500" font-size="52" fill="#D3F0AE">Vườn số Ia Ko 1 · Gia Lai</text></svg>';
    const im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=1200;c.height=300;c.getContext('2d').drawImage(im,0,0,1200,300);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;
      const dm=new THREE.MeshStandardMaterial({map:t,transparent:true,roughness:.3,polygonOffset:true,polygonOffsetFactor:-4,depthWrite:false});
      for(const sd of[-1,1]){const z=.15,y=.98,xs=hitSide(sd,y,z);if(xs===null)continue;const pl=new THREE.Mesh(new THREE.PlaneGeometry(1.5,.375),dm);pl.position.set((xs+sd*.012)*m2,y*m2,z*m2);pl.rotation.y=sd*Math.PI/2;pl.scale.setScalar(m2);CAR.g.add(pl)}};
    im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)}
}
/* bụi đất đỏ sau bánh xe */
let DUST=null;
function buildDust(){
  const N=LOW?260:520,pos=new Float32Array(N*3),age=new Float32Array(N).fill(9),sz=new Float32Array(N);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('aAge',new THREE.BufferAttribute(age,1));g.setAttribute('aS',new THREE.BufferAttribute(sz,1));
  const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uPx:{value:Hh*DPR*.06},uC:{value:new THREE.Color()}},
    vertexShader:`attribute float aAge,aS;uniform float uPx;varying float vA;void main(){float l=aAge/2.6;vA=(1.-smoothstep(.0,1.,l))*smoothstep(0.,.06,l)*step(aAge,2.6);vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=uPx*aS*(.4+l*1.6)/-mv.z;}`,
    fragmentShader:`uniform vec3 uC;varying float vA;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(uC,vA*.22*smoothstep(.5,.1,d));}`});
  DUST={pts:new THREE.Points(g,m),pos,age,sz,vel:new Float32Array(N*3),N,k:0,acc:0};DUST.pts.frustumCulled=false;DUST.pts.renderOrder=6;scene.add(DUST.pts);
}
function updDust(dt,c,speed,lt){
  if(CAR.g)CARU.uInv.value.copy(CAR.g.matrixWorld).invert();if(CAR.barM)CAR.barM.emissiveIntensity=.3+LT.night*3;
  if(!DUST)return;const D=DUST;D.acc+=dt*clamp(speed*260,0,140);
  while(D.acc>1){D.acc-=1;const i=D.k;D.k=(D.k+1)%D.N;const sd=rnd()<.5?-1:1;
    D.pos[i*3]=c.p.x-c.f.x*.2+c.r.x*.07*sd;D.pos[i*3+1]=c.p.y+.01;D.pos[i*3+2]=c.p.z-c.f.z*.2+c.r.z*.07*sd;
    D.vel[i*3]=-c.f.x*.04*(.5+rnd())+(rnd()-.5)*.03;D.vel[i*3+1]=.012+rnd()*.02;D.vel[i*3+2]=-c.f.z*.04*(.5+rnd())+(rnd()-.5)*.03;D.age[i]=0;D.sz[i]=.6+rnd()*.8}
  for(let i=0;i<D.N;i++){if(D.age[i]>2.6)continue;D.age[i]+=dt;const k=Math.pow(.35,dt);D.vel[i*3]*=k;D.vel[i*3+2]*=k;D.vel[i*3+1]*=Math.pow(.6,dt);
    D.pos[i*3]+=D.vel[i*3]*dt+U.uWD.value.x*.004*dt;D.pos[i*3+1]+=D.vel[i*3+1]*dt;D.pos[i*3+2]+=D.vel[i*3+2]*dt+U.uWD.value.y*.004*dt}
  D.pts.geometry.attributes.position.needsUpdate=true;D.pts.geometry.attributes.aAge.needsUpdate=true;D.pts.geometry.attributes.aS.needsUpdate=true;
  D.pts.material.uniforms.uC.value.set('#B7764E').multiply(_cc.copy(lt.sun).multiplyScalar(.35*lt.si).add(_cc2.copy(lt.hs).multiplyScalar(lt.hi*.9)));
}
const _cc=new THREE.Color(),_cc2=new THREE.Color();
const _cq={p:new THREE.Vector3(),f:new THREE.Vector3(),r:new THREE.Vector3(),yaw:0},_cq2={p:new THREE.Vector3(),f:new THREE.Vector3(),r:new THREE.Vector3(),yaw:0};
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const MDIR=new THREE.Vector3(110,0,-420).normalize();
function hubPos(){return hubTop?hubTop.clone():V(-14.3,1,4.7)}
function rig(name,c,hf,o){
  const p=o.p,t=o.t,U3=V(0,1,0);
  if(name==='hero'){const m=c.f.clone().lerp(MDIR,.5).normalize(),pr=V(-m.z,0,m.x);p.copy(c.p).addScaledVector(m,-.98+hf*.18).addScaledVector(pr,-.2).addScaledVector(U3,.075);t.copy(c.p).addScaledVector(m,3).addScaledVector(pr,-.35).addScaledVector(U3,.55)}
  else if(name==='gate'){const a=-1.25+hf*.3;const d=c.f.clone().multiplyScalar(Math.cos(a)).addScaledVector(c.r,Math.sin(a));p.copy(c.p).addScaledVector(d,.95).addScaledVector(U3,.12);t.copy(c.p).addScaledVector(U3,.07).addScaledVector(c.f,-.25)}
  else if(name==='over'){const a=hf*.12-.06,ca=Math.cos(a),sa=Math.sin(a);const ox=21,oz=27;p.set(-1+ox*ca-oz*sa,23,4+ox*sa+oz*ca);t.set(-1,0,4)}
  else if(name==='rows'){const az=Math.round(c.p.z/SR)*SR;const x=c.p.x+1.55-hf*.55;p.set(x,gH(x,az)+.13,az);t.set(c.p.x+.2,c.p.y+.075,az+.17)}
  else if(name==='hq'){p.copy(c.p).addScaledVector(c.f,-.95+hf*.2).addScaledVector(c.r,-.62).addScaledVector(U3,.62);t.copy(c.p).addScaledVector(c.r,1.25).addScaledVector(c.f,1.05).addScaledVector(U3,.05)}
  else if(name==='dev'){const h=hubPos();const k=sstep(0,1,hf);p.copy(c.p).add(V(2.2+k*1.6,.95+k*1.6,3.0+k*2.0));t.copy(c.p).lerp(h,.6);t.y=h.y-.1+k*.1}
  else if(name==='end'){const a=.95-hf*.25;const dd=c.f.clone().multiplyScalar(Math.cos(a)).addScaledVector(c.r,-Math.sin(a));p.copy(c.p).addScaledVector(dd,1.05).addScaledVector(U3,.11);t.copy(c.p).addScaledVector(U3,.08).addScaledVector(c.f,-.35)}
  return o;
}
