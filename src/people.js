/* =================================================================
   PEOPLE · đội ngũ tại vườn, thiết bị tải từ Sketchfab, cổng chào,
   hàng rào hồ, cây quanh nhà điều hành, luồng dữ liệu về IoT trung tâm,
   hệ thống béc tưới toàn vườn
   ================================================================= */
const MLD=new GLTFLoader();MLD.setMeshoptDecoder(MeshoptDecoder);
const MODELS={};
function loadM(name){return fetch(ASSET+'m/'+name+'.json').then(r=>r.json()).then(j=>new Promise((res,rej)=>{const bs=atob(j.glb),u=new Uint8Array(bs.length);for(let i=0;i<bs.length;i++)u[i]=bs.charCodeAt(i);MLD.parse(u.buffer,'',g=>{MODELS[name]=g;res(g)},rej)}))}
function fitModel(obj,hM,axis,skip){ // chuẩn hoá: chiều cao (hoặc cạnh dài) hM mét, chân chạm đất, tâm xz = 0
  obj.updateMatrixWorld(true);let bb=new THREE.Box3();if(skip){obj.traverse(m=>{if(m.isMesh&&m.visible&&!skip.test(m.name))bb.expandByObject(m,true)})}else bb.setFromObject(obj);const sz=bb.getSize(V(0,0,0)),c=bb.getCenter(V(0,0,0));
  const ref=axis==='long'?Math.max(sz.x,sz.y,sz.z):sz.y;const k=hM*M2U/ref;
  const w=new THREE.Group();obj.position.set(-c.x,-bb.min.y,-c.z);w.add(obj);const h=new THREE.Group();h.add(w);h.scale.setScalar(k);return h;
}
function shadowAll(o){o.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;m.frustumCulled=false}})}

/* ---------- đội ngũ ---------- */
const PEOPLE=[];const MIXERS=[];
// khoá chuyển động gốc (hông) theo phương ngang để người không trôi rồi giật về chỗ cũ khi lặp
const _locked=new WeakSet();
function lockRoot(clip){if(!clip||_locked.has(clip))return clip;_locked.add(clip);
  const pos=clip.tracks.filter(t=>/\.position$/.test(t.name));if(!pos.length)return clip;
  const rng=t=>{let a=1e9,b=-1e9,c=1e9,d=-1e9;for(let i=0;i<t.values.length;i+=3){a=Math.min(a,t.values[i]);b=Math.max(b,t.values[i]);c=Math.min(c,t.values[i+2]);d=Math.max(d,t.values[i+2])}return Math.max(b-a,d-c)};
  pos.forEach(t=>{const nm=t.name.toLowerCase();if(/hips|pelvis|root|bip001$|bip01/.test(nm)||rng(t)>0){}});
  const sorted=pos.map(t=>[t,rng(t)]).sort((a,b)=>b[1]-a[1]);const top=sorted[0];
  sorted.forEach(([t,r])=>{if(r<top[1]*.6&&!/hips|pelvis/i.test(t.name))return;if(r<1e-6)return;const v=t.values,x0=v[0],z0=v[2];for(let i=0;i<v.length;i+=3){v[i]=x0;v[i+2]=z0}});
  return clip}
function tintClone(root,tints){root.traverse(m=>{if(!m.isMesh)return;const arr=Array.isArray(m.material)?m.material:[m.material];
  const out=arr.map((mt,i)=>{const t=tints&&(tints[mt.name]||tints['*']);if(!t)return mt;const c=mt.clone();c.color.multiply(new THREE.Color(t));return c});m.material=Array.isArray(m.material)?out:out[0]})}
const _rt=new Map();
function retarget(clipName,root,key){ // gắn động tác Mixamo vào khung xương mixamorig của model khác
  const src=MODELS.mxanim;if(!src)return null;const sc=src.animations.find(a=>a.name===clipName);if(!sc)return null;
  const bones={};root.traverse(b=>{if(b.isBone){const k=b.name.replace(/^mixamorig:?/,'').replace(/_\d+$/,'');if(!bones[k])bones[k]=b}});
  const th=bones.Hips;if(!th)return null;const ck=clipName+'|'+key;if(_rt.has(ck))return _rt.get(ck);
  let sh=null;src.scene.traverse(b=>{if(/Hips$/.test(b.name))sh=b});const ratio=sh&&sh.position.y?th.position.y/sh.position.y:1;
  const tr=[];sc.tracks.forEach(t=>{const dot=t.name.lastIndexOf('.');const bn=t.name.slice(0,dot).replace(/^mixamorig:?/,'');const b=bones[bn];if(!b)return;const nt=t.clone();nt.name=b.name+t.name.slice(dot);
    if(/position$/.test(nt.name)){const v=nt.values;for(let i=0;i<v.length;i+=3){v[i]=th.position.x;v[i+1]*=ratio;v[i+2]=th.position.z}}tr.push(nt)});
  const c=new THREE.AnimationClip(clipName,sc.duration,tr);_rt.set(ck,c);return c}
function addPerson(name,o){
  const g=MODELS[name];if(!g)return null;
  const clone=SkeletonUtils.clone(g.scene);tintClone(clone,o.tint);shadowAll(clone);
  if(o.anim===null)o.anim=undefined;
  if(o.hideName)clone.traverse(m=>{if(m.isMesh&&o.hideName.test(m.name))m.visible=false});
  if(o.hideMat)clone.traverse(m=>{if(m.isMesh&&o.hideMat.test(m.material.name))m.visible=false});
  const holder=fitModel(clone,o.h||1.7,null,o.hideName||o.hideMat?/^$/:null);holder.position.set(o.x,gH(o.x,o.z),o.z);holder.rotation.y=o.yaw||0;scene.add(holder);
  let mixer=null;const rc=o.clip?retarget(o.clip,clone,name):null;if(rc||(g.animations&&g.animations.length)){mixer=new THREE.AnimationMixer(clone);const clip=rc||lockRoot(g.animations.find(a=>o.anim&&a.name===o.anim)||g.animations[0]);const act=mixer.clipAction(clip);act.play();act.time=o.still!==undefined?clip.duration*o.still:Math.random()*clip.duration;act.timeScale=o.ts||1;mixer.update(0);if(o.still!==undefined){act.paused=true}else MIXERS.push(mixer)}
  {holder.updateMatrixWorld(true);const b=new THREE.Box3();clone.traverse(m=>{if(m.isMesh&&m.visible)b.expandByObject(m,true)});if(!b.isEmpty())holder.position.y-=b.min.y-holder.position.y}
  let head=null;clone.traverse(b=>{if(!head&&b.isBone&&/head/i.test(b.name))head=b});
  if(!head&&o.hat){holder.updateMatrixWorld(true);let my=-1e9;const v=new THREE.Vector3();clone.traverse(b=>{if(b.isBone&&!/hat|brow|eye/i.test(b.name)){b.getWorldPosition(v);if(v.y>my){my=v.y;head=b}}})}
  const P={holder,clone,mixer,head,role:o.role,x:o.x,z:o.z,hat:null};
  if(o.bake){ // tư thế tĩnh: skin bằng CPU một lần (ổn định trên mọi GPU)
    if(mixer){mixer.update(0);MIXERS.splice(MIXERS.indexOf(mixer),1);P.mixer=null}
    holder.updateMatrixWorld(true);const out=[];clone.traverse(m=>{if(m.isSkinnedMesh&&!(o.skipMat&&o.skipMat.test(m.material.name)))out.push(m)});
    P.baked=[];out.forEach(m=>{const bm=bakeSkinned(m);if(bm){scene.add(bm);P.baked.push(bm)}});holder.visible=false;
    if(head){head.updateMatrixWorld(true);P.headW=head.getWorldPosition(new THREE.Vector3())}
  }
  if(o.hat&&MODELS.hat){const h=fitModel(MODELS.hat.scene.clone(),.52,'long');shadowAll(h);scene.add(h);P.hat=h}
  PEOPLE.push(P);addCol(o.x,o.z,.035);return P;
}
function bakeSkinned(m){
  const g=m.geometry,P=g.attributes.position,N=g.attributes.normal,SI=g.attributes.skinIndex,SW=g.attributes.skinWeight;if(!SI)return null;
  m.skeleton.update();const BM=m.skeleton.boneMatrices,n=P.count,pos=new Float32Array(n*3),nor=new Float32Array(n*3);
  const M=new THREE.Matrix4(),T=new THREE.Matrix4(),v=new THREE.Vector3(),w=new THREE.Vector3(),nm=new THREE.Matrix3();const e=M.elements;
  const W=m.matrixWorld;
  for(let i=0;i<n;i++){e.fill(0);for(let k=0;k<4;k++){const wt=SW.getComponent(i,k);if(!wt)continue;const b=SI.getComponent(i,k)*16;for(let q=0;q<16;q++)e[q]+=BM[b+q]*wt}
    T.multiplyMatrices(M,m.bindMatrix).premultiply(m.bindMatrixInverse).premultiply(W);
    v.fromBufferAttribute(P,i).applyMatrix4(T);pos[i*3]=v.x;pos[i*3+1]=v.y;pos[i*3+2]=v.z;
    if(N){nm.getNormalMatrix(T);w.fromBufferAttribute(N,i).applyMatrix3(nm).normalize();nor[i*3]=w.x;nor[i*3+1]=w.y;nor[i*3+2]=w.z}}
  const ng=new THREE.BufferGeometry();ng.setAttribute('position',new THREE.BufferAttribute(pos,3));if(N)ng.setAttribute('normal',new THREE.BufferAttribute(nor,3));
  ['uv','tangent'].forEach(k=>{if(g.attributes[k])ng.setAttribute(k,g.attributes[k])});if(g.index)ng.setIndex(g.index);if(!N)ng.computeVertexNormals();
  const out=new THREE.Mesh(ng,m.material);out.castShadow=true;out.receiveShadow=true;return out;
}
function nearestDev(k,x,z){let b=null,bd=1e9;DEV.forEach(d=>{if(d.k!==k)return;const q=(d.x-x)**2+(d.z-z)**2;if(q<bd){bd=q;b=d}});return b}
function interrowSpot(x,z,side){ // điểm đứng giữa hai hàng cà phê, mặt hướng vào hàng
  const zi=zoneAt(x,z);if(zi<0||zi>=NZ)return null;const a=ZD[zi].ang,dr=[Math.cos(a),Math.sin(a)],pr=[-dr[1],dr[0]];
  const u=(Math.floor((x*dr[0]+z*dr[1])/SA)+.5)*SA,v=Math.round((x*pr[0]+z*pr[1])/SR)*SR;const X=u*dr[0]+v*pr[0],Z=u*dr[1]+v*pr[1];
  if(zoneAt(X,Z)!==zi||fldAt(X,Z,0)<RW+.12)return null;const fd=side>0?pr:[-pr[0],-pr[1]];return{x:X,z:Z,yaw:Math.atan2(fd[0],fd[1])};
}
function placePeople(){
  const rows=routeAt(STOP.rows);
  const faceTo=(x,z,tx,tz)=>Math.atan2(tx-x,tz-z);
  const FM=[['pick1',{clip:'man_pick',h:1.64,ts:.85,role:'Nông dân · hái cà phê'}],['pick2',{clip:'girl_pull',h:1.6,ts:.8,role:'Nông dân · làm cỏ gốc'}],['farmerB',{clip:'man_plant',h:1.7,ts:.8,role:'Nông dân · trồng dặm cây'}],['pick2',{clip:'man_pick',h:1.62,ts:.9,role:'Nông dân · hái cà phê'}],['pick1',{clip:'girl_pickg',h:1.64,ts:.8,role:'Nông dân · nhặt quả rụng'}],['farmerB',{clip:'man_pull',h:1.7,ts:.8,role:'Nông dân · làm cỏ'}],['pick2',{clip:'girl_plant',h:1.6,ts:.8,role:'Nông dân · trồng dặm cây'}],['pick1',{clip:'man_dig',h:1.64,ts:.75,role:'Nông dân · xới bồn gốc'}]];
  const used=[];const far=(x,z)=>used.every(q=>(q[0]-x)**2+(q[1]-z)**2>.25);
  let fi=0;const addF=(sp)=>{if(!sp||!far(sp.x,sp.z)||dRoute(sp.x,sp.z)<.28)return false;const [m,o]=FM[fi%FM.length];fi++;used.push([sp.x,sp.z]);addPerson(m,Object.assign({x:sp.x,z:sp.z,yaw:sp.yaw,ts:.75+rnd()*.4},o));return true};
  // cụm đông quanh trạm 3
  for(let i=0;i<14&&fi<8;i++){const ang=rnd()*6.28,rr=.45+rnd()*1.3;addF(interrowSpot(rows.p.x+Math.cos(ang)*rr,rows.p.z+Math.sin(ang)*rr,rnd()<.5?1:-1))}
  // rải dọc tuyến, nhìn thấy từ xe
  for(let s=STOP.gate+1;s<STOP.hq-1;s+=1.7){const o=routeAt(s);for(const sd of[1,-1]){const d=.55+rnd()*.6;if(addF(interrowSpot(o.p.x+o.r.x*d*sd,o.p.z+o.r.z*d*sd,rnd()<.5?1:-1)))break}}
  // kỹ thuật viên ở cụm camera / cảm biến gần tuyến
  const devs=DEV.filter(d=>(d.k==='cam'||d.k==='soil')&&d.x!==undefined&&dRoute(d.x,d.z)<3.5&&dRoute(d.x,d.z)>.2).sort((a,b)=>dRoute(a.x,a.z)-dRoute(b.x,b.z)).slice(0,9);
  devs.forEach((d,i)=>{const ang=i*2.1,x=d.x+Math.cos(ang)*.055,z=d.z+Math.sin(ang)*.055;addPerson('workers',{x,z,yaw:faceTo(x,z,d.x,d.z),h:1.72,ts:.8+rnd()*.3,role:d.k==='cam'?'Kỹ thuật viên · bảo trì camera':'Kỹ thuật viên · cảm biến đất'})});
  const ws=nearestDev('weather',0,0);if(ws){const x=ws.x+.07,z=ws.z-.02;addPerson('workers',{x,z,yaw:faceTo(x,z,ws.x,ws.z),h:1.72,role:'Kỹ thuật viên · trạm thời tiết'})}
  const ph=POND.h/2;addPerson('gracy',{x:PC[0]+.7,z:PC[1]+ph+.24,yaw:Math.PI,h:1.62,role:'Kỹ sư · kiểm tra nước hồ'});
  // giám sát trước nhà điều hành
  const sx=HQ[0]+.66,sz=HQ[2];
  addPerson('businessman',{x:sx,z:sz-.05,yaw:0,anim:'Rig|cycle_talking',role:'Giám sát · nhà điều hành'});
  addPerson('talk',{x:sx+.02,z:sz+.07,yaw:Math.PI,h:1.74,role:'Giám sát · điều phối đội vườn'});
}
const _hp=new THREE.Vector3();
function updPeople(dt,cx,cz,all){PEOPLE.forEach(P=>{if(P.mixer&&(all||(P.x-cx)**2+(P.z-cz)**2<20))P.mixer.update(dt)});PEOPLE.forEach(P=>{if(P.hat&&P.head){if(P.headW)_hp.copy(P.headW);else P.head.getWorldPosition(_hp);P.hat.position.set(_hp.x,_hp.y-.24*M2U,_hp.z);P.hat.rotation.y=P.holder.rotation.y}})}

/* ---------- va chạm ---------- */
const COLS=[],RECTS=[];
function addCol(x,z,r){COLS.push({x,z,r})}
function addRect(cx,cz,hx,hz,rot){RECTS.push({cx,cz,hx,hz,c:Math.cos(rot||0),s:Math.sin(rot||0)})}

/* ---------- cổng chào lớn ---------- */
function svgToCanvas(svgText,w,h){return new Promise(res=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(im,0,0,w,h);res(c)};im.onerror=()=>res(null);im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svgText)})}
function buildGates(){
  const stone=pbrMat(hqTex().conc,{color:'#B3AB9E'});
  const steel=new THREE.MeshStandardMaterial({color:'#17331C',roughness:.35,metalness:.75});
  const lime=new THREE.MeshStandardMaterial({color:'#B5E383',emissive:'#7EB84A',emissiveIntensity:.0,roughness:.4});
  // biển tên: logo + wordmark thật
  const SW=2048,SH=420;const cv=document.createElement('canvas');cv.width=SW;cv.height=SH;const x=cv.getContext('2d');
  const em=document.createElement('canvas');em.width=SW;em.height=SH;const ex=em.getContext('2d');
  const signT=new THREE.CanvasTexture(cv);signT.colorSpace=THREE.SRGBColorSpace;signT.anisotropy=8;const signE=new THREE.CanvasTexture(em);signE.colorSpace=THREE.SRGBColorSpace;
  const draw=(mark,wm,wmL)=>{x.fillStyle='#112615';x.fillRect(0,0,SW,SH);x.fillStyle='#B5E383';x.fillRect(0,SH-22,SW,22);ex.fillStyle='#000';ex.fillRect(0,0,SW,SH);ex.fillStyle='#7EB84A';ex.fillRect(0,SH-22,SW,22);
    for(const ctx of[x,ex]){if(mark)ctx.drawImage(mark,110,60,290,290);
      if(wm)ctx.drawImage(ctx===x?wm:wmL,470,120,1340,155);else{ctx.fillStyle='#fff';ctx.font='700 170px Archivo, sans-serif';ctx.fillText('FARMBLOCK',470,270)}
      ctx.fillStyle=ctx===x?'#B5E383':'#9ED36A';ctx.font='500 58px Archivo, "Segoe UI", sans-serif';ctx.fillText('Vườn cà phê công nghệ  ·  Ia Ko 1  ·  Gia Lai',476,350)}
    signT.needsUpdate=true;signE.needsUpdate=true};
  draw(null);
  const mk=document.querySelector('#mk'),wmEl=document.querySelector('.top .wm');
  const wmSvg=c=>wmEl.outerHTML.replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" fill="'+c+'" ').replace(/class="[^"]*"/,'');
  Promise.all([mk?svgToCanvas('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 360">'+mk.innerHTML+'</svg>',512,512):null,wmEl?svgToCanvas(wmSvg('#EEF6E6'),1206,140):null,wmEl?svgToCanvas(wmSvg('#FFFFFF'),1206,140):null]).then(([a,b,c])=>draw(a,b,c));
  const signM=new THREE.MeshStandardMaterial({map:signT,emissiveMap:signE,emissive:'#FFFFFF',emissiveIntensity:0,roughness:.45,metalness:.2});
  GATESET.signs.push(signM);GATESET.lime.push(lime);
  // cột totem logo hai bên lối vào
  const totT=new THREE.CanvasTexture((()=>{const c=document.createElement('canvas');c.width=256;c.height=1024;const t=c.getContext('2d');t.fillStyle='#17331C';t.fillRect(0,0,256,1024);t.fillStyle='#B5E383';t.fillRect(0,0,256,10);return c})());
  GATESET.mats={signM,steel,lime,stone};
  RT.cross.forEach((s,gi)=>{const o=routeAt(s);GATESET.groups.push({o,s,gi})});
}
/* cổng đá ong + hàng rào thép (dựng bằng code, texture đá thật RockWall01 ~1024px) */
function boxM(w,h,d,ts){const g=new THREE.BoxGeometry(w,h,d);const uv=g.attributes.uv,n=g.attributes.normal;for(let i=0;i<uv.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i));const su=nx>.5?d:w,sv=ny>.5?d:h;uv.setXY(i,uv.getX(i)*su/ts,uv.getY(i)*sv/ts)}return g}
function buildStoneGates(){
  const {signM,steel,lime}=GATESET.mats;const ST=ptx('stone');const stoneM=pbrMat(ST,{color:'#E2DACF',normalScale:new THREE.Vector2(1.4,1.4)});
  const conc=pbrMat(hqTex().conc,{color:'#CFC8BC'});const lat=ptx('later');const latM=pbrMat(lat,{color:'#E8D6C8'});
  const glass=new THREE.MeshStandardMaterial({color:'#FFF1CF',emissive:'#FFD58A',emissiveIntensity:.2,roughness:.3});GATESET.lamps=GATESET.lamps||[];GATESET.lamps.push(glass);
  const put=(arr,g,x,y,z)=>{const q=g.clone();q.translate(x,y,z);arr.push(q)};
  // hình học chung (mét)
  const S=[],C=[],L=[],F=[],GL=[];
  for(const sd of[-1,1]){const X=sd*4.75;
    put(C,boxM(1.7,.36,1.7,1.2),X,.18,0);put(S,boxM(1.3,3.4,1.3,1.6),X,.36+1.7,0);put(C,boxM(1.62,.22,1.62,1.2),X,3.87,0);
    put(L,boxM(1.42,.12,1.42,1.2),X,3.7,0);// gờ đá ong
    put(C,boxM(.52,.08,.52,1),X,4.02,0);put(GL,new THREE.BoxGeometry(.36,.46,.36),X,4.29,0);put(C,boxM(.56,.1,.56,1),X,4.57,0);
    // tường rào thấp + hàng rào thép
    const x0=sd*5.4,x1=sd*15.6,len=Math.abs(x1-x0),xm=(x0+x1)/2;
    put(C,boxM(len,.14,.62,1.2),xm,.07,0);put(S,boxM(len,.66,.48,1.6),xm,.14+.33,0);put(C,boxM(len+.05,.08,.56,1.2),xm,.84,0);
    for(let i=0;i<=5;i++){const x=x0+sd*i*len/5;put(F,new THREE.BoxGeometry(.09,1.45,.09),x,.88+.72,0)}
    for(const y of[1.05,2.22])put(F,new THREE.BoxGeometry(len,.06,.05),xm,y,0);
    for(let x=0;x<len-.1;x+=.19)put(F,new THREE.BoxGeometry(.028,1.32,.022),x0+sd*(x+.1),.88+.68,0);
    put(C,boxM(.82,.24,.82,1),x1+sd*.25,.12,0);put(S,boxM(.7,1.9,.7,1.6),x1+sd*.25,.24+.95,0);put(C,boxM(.84,.12,.84,1),x1+sd*.25,2.2,0)}
  const mk=(arr,m)=>{const me=new THREE.Mesh(mergeGeometries(arr),m);me.castShadow=me.receiveShadow=true;return me};
  const parts=[[S,stoneM],[C,conc],[L,latM],[F,steel],[GL,glass]];
  // bụi hoa giấy + cây bụi dọc tường
  const bush=new THREE.IcosahedronGeometry(.5,3);{const P=bush.attributes.position;for(let i=0;i<P.count;i++){const v=new THREE.Vector3().fromBufferAttribute(P,i);const k=1+(hh(v.x*7+3,v.z*7+v.y*5)-.5)*.35;P.setXYZ(i,v.x*k,v.y*k*.8,v.z*k)}bush.computeVertexNormals()}
  const bm=swayMat({roughness:.8,vertexColors:false},1.2,.015,0,14);
  GATESET.groups.forEach(({o},gi)=>{const g=new THREE.Group(),w=new THREE.Group();
    parts.forEach(([a,m])=>w.add(mk(a,m)));
    const top=3.98;const span=8.2+1.6;
    const beam=new THREE.Mesh(new THREE.BoxGeometry(span+1.2,.35,.35),steel);beam.position.set(0,top+.95,0);w.add(beam);
    for(const sd of[-1,1]){const post=new THREE.Mesh(new THREE.BoxGeometry(.3,.9,.3),steel);post.position.set(sd*4.75,top+.5,0);w.add(post)}
    const sign=new THREE.Mesh(new THREE.BoxGeometry(9.2,1.9,.22),[steel,steel,steel,steel,signM,signM]);sign.position.set(0,top+2.15,0);w.add(sign);
    const N=44,im=new THREE.InstancedMesh(bush,bm,N);const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),Sc=new THREE.Vector3(),Pp=new THREE.Vector3(),Cc=new THREE.Color();let k=0;
    for(const sd of[-1,1])for(const zs of[-1,1])for(let i=0;i<11;i++){const x=sd*(5.9+i*.92+hh(i,gi+sd)*.3),z=zs*(.95+hh(i*3,sd)*.25),s=.75+hh(i,zs*5+gi)*.55;
      Q.setFromAxisAngle(V(0,1,0),hh(i,sd*7)*6);Sc.set(s*1.2,s,s*1.1);Pp.set(x,s*.38,z);M.compose(Pp,Q,Sc);im.setMatrixAt(k,M);
      const flower=hh(i*1.7,zs+sd*3+gi)<.4;im.setColorAt(k,flower?Cc.set(['#C2307A','#D9468F','#E06AA0'][i%3]):Cc.set(['#2F5A22','#3B6B28','#26501E'][i%3]));k++}
    im.count=k;im.castShadow=im.receiveShadow=true;w.add(im);
    for(const sd of[-1,1]){const up=glowSprite('#FFE3B0',1.6);up.position.set(sd*4.75,1.0,1.2);w.add(up);GATESET.ups.push(up);const lg=glowSprite('#FFD58A',1.3);lg.position.set(sd*4.75,4.29,0);w.add(lg);GATESET.ups.push(lg)}
    w.scale.setScalar(M2U);g.add(w);g.position.copy(o.p);g.position.y-=.004;g.rotation.y=o.yaw;scene.add(g);
    for(const sd of[-1,1])addCol(o.p.x+o.r.x*sd*4.75*M2U,o.p.z+o.r.z*sd*4.75*M2U,.07);
  });
}
const GATESET={signs:[],lime:[],ups:[],groups:[]};
function updGates(night){(GATESET.lamps||[]).forEach(m=>m.emissiveIntensity=.2+night*2.2);GATESET.signs.forEach(m=>m.emissiveIntensity=.15+night*1.3);GATESET.lime.forEach(m=>m.emissiveIntensity=.2+night*1.6);GATESET.ups.forEach(s=>{s.visible=night>.15;s.material.opacity=night})}

/* ---------- hàng rào an toàn quanh hồ ---------- */
function buildPondFence(){
  const pw=POND.w/2+.16+.035,ph=POND.h/2+.16+.035;
  const cv=document.createElement('canvas');cv.width=cv.height=128;const x=cv.getContext('2d');x.clearRect(0,0,128,128);x.strokeStyle='rgba(205,212,208,1)';x.lineWidth=5;
  for(let i=-128;i<=256;i+=32){x.beginPath();x.moveTo(i,0);x.lineTo(i+128,128);x.stroke();x.beginPath();x.moveTo(i,128);x.lineTo(i+128,0);x.stroke()}
  const tx=new THREE.CanvasTexture(cv);tx.wrapS=tx.wrapT=THREE.RepeatWrapping;tx.anisotropy=4;
  const mesh=new THREE.MeshStandardMaterial({map:tx,alphaTest:.45,transparent:false,side:THREE.DoubleSide,roughness:.4,metalness:.6,color:'#C9D0CC'});
  const post=new THREE.MeshStandardMaterial({color:'#2B3A30',roughness:.45,metalness:.6});
  const Hf=1.25*M2U,sp=2.5*M2U;
  const corners=[[-pw,-ph],[pw,-ph],[pw,ph],[-pw,ph]];
  const pg=new THREE.CylinderGeometry(.03*M2U,.03*M2U,Hf,6),rails=[];
  const posts=[];
  for(let e=0;e<4;e++){const a=corners[e],b=corners[(e+1)%4];const L=Math.hypot(b[0]-a[0],b[1]-a[1]);const n=Math.max(1,Math.round(L/sp));
    for(let i=0;i<n;i++){const t=i/n,x0=PC[0]+lerp(a[0],b[0],t),z0=PC[1]+lerp(a[1],b[1],t);posts.push([x0,z0])}
    // tấm lưới
    const P=[],UV=[],I=[];const segs=n*4;for(let i=0;i<=segs;i++){const t=i/segs,xx=PC[0]+lerp(a[0],b[0],t),zz=PC[1]+lerp(a[1],b[1],t),y=gH(xx,zz);P.push(xx,y+.03*M2U,zz,xx,y+Hf*.96,zz);UV.push(t*L/(0.6*M2U),0,t*L/(0.6*M2U),Hf/(0.6*M2U));if(i<segs){const k=i*2;I.push(k,k+2,k+1,k+1,k+2,k+3)}}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(UV,2));g.setIndex(I);g.computeVertexNormals();
    const me=new THREE.Mesh(g,mesh);me.castShadow=true;me.receiveShadow=true;scene.add(me);
    for(const hy of[Hf,Hf*.5]){const rp=[];for(let i=0;i<=8;i++){const t=i/8,xx=PC[0]+lerp(a[0],b[0],t),zz=PC[1]+lerp(a[1],b[1],t);rp.push(V(xx,gH(xx,zz)+hy,zz))}
      const r=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rp),16,.02*M2U,5),post);r.castShadow=true;scene.add(r)}
  }
  const im=new THREE.InstancedMesh(pg,post,posts.length);const M=new THREE.Matrix4();posts.forEach((p,i)=>{M.makeTranslation(p[0],gH(p[0],p[1])+Hf/2,p[1]);im.setMatrixAt(i,M)});im.castShadow=true;scene.add(im);
  // biển cảnh báo
  const wc=document.createElement('canvas');wc.width=256;wc.height=160;const w=wc.getContext('2d');w.fillStyle='#F2C230';w.fillRect(0,0,256,160);w.fillStyle='#1A1A1A';w.font='700 30px Archivo, sans-serif';w.textAlign='center';w.fillText('HỒ SÂU',128,62);w.font='600 22px Archivo, sans-serif';w.fillText('Không lại gần mép',128,104);w.fillText('Farmblock',128,140);
  const wt=new THREE.CanvasTexture(wc);wt.colorSpace=THREE.SRGBColorSpace;const sg=new THREE.Mesh(new THREE.PlaneGeometry(.7*M2U,.44*M2U),new THREE.MeshStandardMaterial({map:wt,side:THREE.DoubleSide,roughness:.6}));
  sg.position.set(PC[0]+.3,gH(PC[0]+.3,PC[1]+ph)+Hf*.62,PC[1]+ph+.004);scene.add(sg);
  addRect(PC[0],PC[1],pw+.02,ph+.02,0);
}

/* ---------- cây, bụi hoa, đèn quanh nhà điều hành ---------- */
function hqTreeSpots(){ // dùng trong buildBorderTrees
  const out=[];const P=ZP[9];const shedOK=(x,z)=>!(Math.abs(x-HQ_W[0])<.8&&Math.abs(z-HQ_W[1])<1.2);
  const ok=(x,z)=>fldAt(x,z,0)>RW+.14&&!inPond(x,z,.45)&&shedOK(x,z)&&dRoute(x,z)>.42&&!(Math.abs(x-(PC[0]-POND.w/2-.42))<.4&&Math.abs(z-(PC[1]-POND.h/2+.1))<.4);
  for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];const L=Math.hypot(b[0]-a[0],b[1]-a[1]);let nx=-(b[1]-a[1])/L,nz=(b[0]-a[0])/L;const mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2;if(!inPoly(mx+nx*.3,mz+nz*.3,P)){nx=-nx;nz=-nz}
    for(let t=.3;t<L-.2;t+=.62){const x=a[0]+(b[0]-a[0])*t/L+nx*.42,z=a[1]+(b[1]-a[1])*t/L+nz*.42;if(ok(x,z))out.push([x,z])}}
  for(let i=0;i<260;i++){const x=HQ_W[0]+(rnd()-.5)*9,z=HQ_W[1]+1.5+(rnd()-.5)*9;const zi=zoneAt(x,z);if(zi>=0&&zi<8)continue;if(ok(x,z)&&out.every(p=>(p[0]-x)**2+(p[1]-z)**2>.3))out.push([x,z])}
  return out;
}
const HQ_W=toW([312,398]);
function buildHQGarden(){
  // bụi hoa giấy, chuối cảnh, cỏ lá dài quanh nhà và hồ
  const g=new THREE.IcosahedronGeometry(.5,2);const p=g.attributes.position;for(let i=0;i<p.count;i++){const hs=Math.sin(p.getX(i)*127.1+p.getY(i)*311.7+p.getZ(i)*74.7)*43758.5;const k=.8+.4*(hs-Math.floor(hs));p.setXYZ(i,p.getX(i)*k,(p.getY(i)*k+.5)*.8,p.getZ(i)*k)}g.computeVertexNormals();
  const mt=new THREE.MeshStandardMaterial({roughness:.75});const spots=[];
  const shedF=[HQ_W[0]+.55,HQ_W[1]];
  for(let i=0;i<18;i++){const z=shedF[1]-.95+i*.11;if(Math.abs(z-shedF[1])<.18)continue;spots.push([HQ_W[0]+.86+rnd()*.03,z,i%3===2?2:i%2])}
  hqTreeSpots().forEach(q=>{TREES_HQ.push({x:q[0],z:q[1],y:gH(q[0],q[1]),s:.38+rnd()*.32,r:rnd()*6.28});addCol(q[0],q[1],.035)});staticTrees(TREES_HQ,1);
  const cols=['#C2357A','#E8A13A','#3F7A2A','#2E6A26'];const im=new THREE.InstancedMesh(g,mt,spots.length);const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),S=V(1,1,1),C=new THREE.Color();
  spots.forEach((s,i)=>{const sc=(s[2]<2?.9:1.1)*M2U*(.8+rnd()*.4);S.set(sc*1.2,sc,sc*1.2);Q.setFromAxisAngle(V(0,1,0),rnd()*6.28);M.compose(V(s[0],gH(s[0],s[1]),s[1]),Q,S);im.setMatrixAt(i,M);im.setColorAt(i,C.set(cols[s[2]]).multiplyScalar(.85+rnd()*.3))});
  im.castShadow=true;im.receiveShadow=true;scene.add(im);
  // đèn đường dọc đoạn HQ
  if(MODELS.lamp){for(let s=STOP.hq-2.6;s<=STOP.dev+.6;s+=1.4){const o=routeAt(s);const x=o.p.x-o.r.x*.33,z=o.p.z-o.r.z*.33;if(inPond(x,z,.4))continue;
    const l=fitModel(MODELS.lamp.scene.clone(),3.4);shadowAll(l);l.traverse(m=>{if(m.isMesh){m.material=m.material.clone();m.material.color.multiply(new THREE.Color('#D9CDBE'))}});l.position.set(x,gH(x,z),z);l.rotation.y=o.yaw;scene.add(l);addCol(x,z,.025);
    const gl=glowSprite('#FFD9A0',.055);gl.position.set(x,gH(x,z)+3.15*M2U,z);scene.add(gl);LAMPS.push(gl)}}
  // máy bơm cạnh nhà bơm
  if(MODELS.pump){const x=PC[0]-POND.w/2-.2,z=PC[1]-POND.h/2+.22;const pm=fitModel(MODELS.pump.scene.clone(),1.0,'long');shadowAll(pm);pm.position.set(x,gH(x,z),z);pm.rotation.y=Math.PI/2;scene.add(pm)}
  addRect(HQ_W[0],HQ_W[1],.46,.9,0);addRect(PC[0]-POND.w/2-.42,PC[1]-POND.h/2+.1,.24,.2,0);
  const hub=DEV.find(d=>d.k==='iot'),ws=DEV.find(d=>d.k==='weather');if(hub)addCol(hub.x,hub.z,.06);if(ws)addCol(ws.x,ws.z,.06);
}
const LAMPS=[],TREES_HQ=[];

/* ---------- đầu camera thật (Sketchfab) ---------- */
function upgradeCams(){const m=MODELS.cctv;if(!m)return;DEV.forEach(d=>{if(d.k!=='cam'||!d.head)return;
  const keep=d.head.children.filter(c=>c.material===MAT.ledR);d.head.clear();keep.forEach(k=>d.head.add(k));
  const c=fitModel(m.scene.clone(),.42,'long');c.scale.multiplyScalar(1/DS);c.position.set(0,-.05,.06);c.rotation.y=Math.PI/2;shadowAll(c);d.head.add(c)});
  DEV.forEach(d=>{if(d.k==='cam'||d.k==='soil'||d.k==='weather'||d.k==='iot')addCol(d.x,d.z,.022)})}

/* ---------- luồng dữ liệu về trạm IoT trung tâm ---------- */
let STREAMS=null;
function buildStreams(){
  if(!hubTop)return;const H0=hubTop.clone();const P=[],T=[],PH=[],C=[];const heads=[],hT=[],hPH=[],hC=[];const N=40;
  const KC={cam:'#B5E383',soil:'#F2C27A',water:'#7FD3EE',weather:'#F5E4A1'};
  DEV.forEach((d,i)=>{if(!d.top||!KC[d.k])return;const a=d.top,b=H0;const mid=a.clone().add(b).multiplyScalar(.5);mid.y=Math.max(a.y,b.y)+.6+a.distanceTo(b)*.14;const col=new THREE.Color(KC[d.k]);const ph=Math.random();
    const bz=t=>{const u=1-t;return V(u*u*a.x+2*u*t*mid.x+t*t*b.x,u*u*a.y+2*u*t*mid.y+t*t*b.y,u*u*a.z+2*u*t*mid.z+t*t*b.z)};
    for(let k=0;k<N;k++){const p0=bz(k/N),p1=bz((k+1)/N);P.push(p0.x,p0.y,p0.z,p1.x,p1.y,p1.z);T.push(k/N,(k+1)/N);PH.push(ph,ph);C.push(col.r,col.g,col.b,col.r,col.g,col.b)}
    heads.push(a.x,a.y,a.z,mid.x,mid.y,mid.z,b.x,b.y,b.z);hPH.push(ph);hC.push(col.r,col.g,col.b)});
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('aT',new THREE.Float32BufferAttribute(T,1));g.setAttribute('aPh',new THREE.Float32BufferAttribute(PH,1));g.setAttribute('aC',new THREE.Float32BufferAttribute(C,3));
  const U2={uTime:U.uTime,uOn:{value:0}};
  const lm=new THREE.ShaderMaterial({uniforms:U2,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:`attribute float aT,aPh;attribute vec3 aC;varying float vT,vPh;varying vec3 vC;void main(){vT=aT;vPh=aPh;vC=aC;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform float uTime,uOn;varying float vT,vPh;varying vec3 vC;void main(){float h=fract(uTime*.32+vPh);float d=h-vT;float tail=d>0.&&d<.32?pow(1.-d/.32,2.2):0.;float h2=fract(uTime*.32+vPh+.5);float d2=h2-vT;tail+=d2>0.&&d2<.2?pow(1.-d2/.2,2.)*.5:0.;
      float base=.06+.05*sin(vT*60.-uTime*6.);gl_FragColor=vec4(vC*(base+tail*1.8)*uOn,1.);}`});
  const lines=new THREE.LineSegments(g,lm);lines.frustumCulled=false;lines.renderOrder=7;scene.add(lines);
  const n=hPH.length,hp=new Float32Array(n*2*3),hph=new Float32Array(n*2),hc=new Float32Array(n*2*3),hk=new Float32Array(n*2),A=new Float32Array(n*2*3),Bm=new Float32Array(n*2*3),Cc=new Float32Array(n*2*3);
  for(let i=0;i<n;i++)for(let j=0;j<2;j++){const q=i*2+j;for(let c=0;c<3;c++){A[q*3+c]=heads[i*9+c];Bm[q*3+c]=heads[i*9+3+c];Cc[q*3+c]=heads[i*9+6+c];hc[q*3+c]=hC[i*3+c]}hph[q]=hPH[i]+(j?.5:0);hk[q]=j}
  const hg=new THREE.BufferGeometry();hg.setAttribute('position',new THREE.BufferAttribute(hp,3));hg.setAttribute('aA',new THREE.BufferAttribute(A,3));hg.setAttribute('aB',new THREE.BufferAttribute(Bm,3));hg.setAttribute('aCc',new THREE.BufferAttribute(Cc,3));hg.setAttribute('aPh',new THREE.BufferAttribute(hph,1));hg.setAttribute('aCol',new THREE.BufferAttribute(hc,3));hg.setAttribute('aK',new THREE.BufferAttribute(hk,1));
  const pm=new THREE.ShaderMaterial({uniforms:Object.assign({uPx:{value:Hh*DPR*.05}},U2),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:`uniform float uTime,uPx;attribute vec3 aA,aB,aCc,aCol;attribute float aPh,aK;varying vec3 vC;varying float vA;void main(){float t=fract(uTime*.32+aPh);float u=1.-t;vec3 p=u*u*aA+2.*u*t*aB+t*t*aCc;vC=aCol;vA=smoothstep(0.,.05,t)*smoothstep(1.,.92,t)*(aK>.5?.6:1.);vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=uPx*(aK>.5?.6:1.)/-mv.z;}`,
    fragmentShader:`uniform float uOn;varying vec3 vC;varying float vA;void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,.0,d);gl_FragColor=vec4((vC*.7+vec3(.4))*a*a*vA*uOn*1.6,1.);}`});
  const pts=new THREE.Points(hg,pm);pts.frustumCulled=false;pts.renderOrder=8;scene.add(pts);
  // cột sáng + vòng sóng ở trạm trung tâm
  const bm=new THREE.Mesh(new THREE.CylinderGeometry(.03,.09,1,16,1,true),new THREE.ShaderMaterial({uniforms:U2,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform float uTime,uOn;varying vec2 vUv;void main(){float a=(1.-vUv.y)*(.35+.25*sin(vUv.y*30.-uTime*5.));gl_FragColor=vec4(vec3(.5,.95,.85)*a*uOn,1.);}`}));
  bm.scale.set(1,1.5,1);bm.position.set(H0.x,H0.y+.75,H0.z);scene.add(bm);
  STREAMS={lm,pm,U2,hub:H0,ringT:0};
}
function updStreams(dt,on){if(!STREAMS)return;STREAMS.U2.uOn.value=on;STREAMS.ringT+=dt*on;if(STREAMS.ringT>1.4){STREAMS.ringT=0;const h=STREAMS.hub;ripple(h.x,h.y-.05,h.z,'#9FF0D8',.55,1.6,false);ripple(h.x,gH(h.x,h.z)+.01,h.z,'#B5E383',1.2,2.2,false)}}

/* ---------- béc tưới sát gốc: béc nhỏ cắm cạnh từng gốc cà phê, phun thấp ---------- */
let SPRAY=null;
function microSprayMat(){return new THREE.ShaderMaterial({uniforms:{uTime:U.uTime,uOn:{value:0},uPx:{value:innerHeight*.0006},uSC:{value:new THREE.Color()},uSD:{value:new THREE.Vector3()}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  vertexShader:`uniform float uTime,uOn,uPx;attribute vec4 aP;varying float vA,vT;
    void main(){float life=.9;float t=fract(uTime/life*aP.z+aP.x);
      float hd=fract(sin(dot(position.xz,vec2(91.7,33.1)))*437.5)*6.283;
      float a=hd+aP.y;// phun tròn quanh gốc
      float R=${(.55*M2U).toFixed(5)}*t*(.75+.25*fract(aP.w*7.3));float up=${(.22*M2U).toFixed(5)}*(4.*t*(1.-t))*(.7+.3*fract(aP.w*3.1));
      vec3 p=position+vec3(cos(a)*R,up,sin(a)*R);
      vA=uOn*smoothstep(0.,.08,t)*(1.-smoothstep(.7,1.,t));vT=t;
      vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=max(1.,uPx*(1.+t*2.)/-mv.z);}`,
  fragmentShader:`uniform vec3 uSC;varying float vA,vT;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4((vec3(.55,.66,.74)*.55+uSC*.15)*vA*smoothstep(.5,.0,d),1.);}`})}
function buildSprinklerGrid(){
  const NH=LOW?24:48,per=LOW?60:110;
  const pos=new Float32Array(NH*per*3).fill(-50),ap=new Float32Array(NH*per*4);for(let i=0;i<NH*per;i++){ap[i*4]=rnd();ap[i*4+1]=rnd()*6.283;ap[i*4+2]=.8+rnd()*.4;ap[i*4+3]=rnd()}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('aP',new THREE.BufferAttribute(ap,4));
  const p=new THREE.Points(g,microSprayMat());p.frustumCulled=false;p.renderOrder=5;scene.add(p);IRR.push(p);
  // cọc béc nhỏ (chỉ dựng cho các gốc gần xe)
  const sg=new THREE.CylinderGeometry(.012*M2U,.012*M2U,.2*M2U,5);sg.translate(0,.1*M2U,0);const hg=new THREE.CylinderGeometry(.022*M2U,.022*M2U,.03*M2U,8);hg.translate(0,.21*M2U,0);
  const stake=new THREE.InstancedMesh(mergeGeometries([sg,hg]),new THREE.MeshStandardMaterial({color:'#20262A',roughness:.5}),NH);stake.frustumCulled=false;scene.add(stake);
  SPRAY={NH,per,pos,g,t:9,stake,lx:1e9,lz:1e9};
}
function updSprinklers(dt,cx,cz,on){if(!SPRAY||!COF)return;SPRAY.t+=dt;if(SPRAY.t<.5)return;SPRAY.t=0;
  if((SPRAY.lx-cx)**2+(SPRAY.lz-cz)**2<.04)return;SPRAY.lx=cx;SPRAY.lz=cz;
  // các gốc cà phê gần xe nhất
  const best=[];const R2=2.2*2.2;for(let i=0;i<NCOF;i++){const x=COF[i*4],z=COF[i*4+2];const d=(x-cx)**2+(z-cz)**2;if(d<R2)best.push([d,i])}
  best.sort((a,b)=>a[0]-b[0]);const M=new THREE.Matrix4();
  for(let h=0;h<SPRAY.NH;h++){const b=best[h];let x=0,y=-50,z=0;if(b){const i=b[1];x=COF[i*4]+.045;z=COF[i*4+2]+.02;y=gH(x,z)+.01}
    for(let k=0;k<SPRAY.per;k++){const q=(h*SPRAY.per+k)*3;SPRAY.pos[q]=x;SPRAY.pos[q+1]=y+.2*M2U;SPRAY.pos[q+2]=z}
    M.makeTranslation(x,y,z);SPRAY.stake.setMatrixAt(h,M)}
  SPRAY.g.attributes.position.needsUpdate=true;SPRAY.stake.instanceMatrix.needsUpdate=true}

/* ---------- cờ Farmblock phấp phới khắp vườn ---------- */
let FLAGS=null,FLAGTEX=null,FLAGPOLE=null;
function flagMat(tex,FW,amp){const fm=new THREE.MeshStandardMaterial({map:tex,side:THREE.DoubleSide,roughness:.75});
  fm.onBeforeCompile=sh=>{sh.uniforms.uTime=U.uTime;
    sh.vertexShader='uniform float uTime;varying float vDes;\n'+sh.vertexShader
      .replace('#include <beginnormal_vertex>',`float fx=max(position.x-.05,0.)/${FW.toFixed(2)};vec3 ip=vec3(instanceMatrix[3].x,0.,instanceMatrix[3].z);float ph=ip.x*3.1+ip.z*1.7;
        float a1=position.x*${(2.3/amp).toFixed(3)}-uTime*${(5.2/Math.sqrt(amp)).toFixed(3)}+ph,a2=position.x*${(4.6/amp).toFixed(3)}-uTime*${(8.3/Math.sqrt(amp)).toFixed(3)}+ph*1.3+position.y*${(1.5/amp).toFixed(3)};
        float wz=(sin(a1)*.2+sin(a2)*.06)*fx*${amp.toFixed(2)};float dz=(cos(a1)*2.3*.2+cos(a2)*4.6*.06)*fx;
        vec3 objectNormal=normalize(vec3(-dz,0.,1.));
        #ifdef USE_TANGENT
        vec3 objectTangent=vec3(1.,0.,0.);
        #endif`)
      .replace('#include <begin_vertex>',`vec3 transformed=vec3(position.x-fx*fx*${(.08*amp).toFixed(3)},position.y-fx*fx*${(.12*amp).toFixed(3)},position.z+wz);vDes=float(gl_InstanceID%2);`);
    sh.fragmentShader='varying float vDes;\n'+sh.fragmentShader.replace('#include <map_fragment>',`vec2 fu=gl_FrontFacing?vMapUv:vec2(1.-vMapUv.x,vMapUv.y);fu.y=fu.y*.5+(vDes>.5?0.:.5);vec4 sampledDiffuseColor=texture2D(map,fu);diffuseColor*=sampledDiffuseColor;`)};
  return fm}
/* 3 lá cờ ngang cỡ lớn ở hồ nước và nhà điều hành */
function buildBigFlags(){
  if(!FLAGTEX)return;const FW=5.4,FH=3.3,Hp=12;const spots=[];
  const cand=[[PC[0]-POND.w/2-.5,PC[1]+POND.h/2+.45],[PC[0]+POND.w/2+.5,PC[1]-POND.h/2-.4],[HQ_W[0]+1.2,HQ_W[1]-1.05],[HQ_W[0]+1.2,HQ_W[1]+1.05],[PC[0]+POND.w/2+.5,PC[1]+POND.h/2+.45]];
  cand.forEach(q=>{if(spots.length<3&&dRoute(q[0],q[1])>.42&&!inPond(q[0],q[1],.25))spots.push(q)});
  const pg=new THREE.CylinderGeometry(.08,.11,Hp,10);pg.translate(0,Hp/2,0);const bg=new THREE.SphereGeometry(.16,12,8);bg.translate(0,Hp+.08,0);const baseG=new THREE.CylinderGeometry(.42,.5,.4,12);baseG.translate(0,.2,0);
  const poleG=mergeGeometries([pg,bg,baseG]);const fg=new THREE.PlaneGeometry(FW,FH,24,10);fg.translate(FW/2+.1,Hp-.25-FH/2,0);
  const n=spots.length,poles=new THREE.InstancedMesh(poleG,FLAGPOLE,n),flags=new THREE.InstancedMesh(fg,flagMat(FLAGTEX,FW,2.2),n);
  const wd=U.uWD.value,yaw=Math.atan2(-wd.y,wd.x);const M=new THREE.Matrix4(),Q=new THREE.Quaternion().setFromAxisAngle(V(0,1,0),yaw),S=V(M2U,M2U,M2U),P=V(0,0,0);
  spots.forEach((q,i)=>{P.set(q[0],gH(q[0],q[1])-.004,q[1]);M.compose(P,Q,S);poles.setMatrixAt(i,M);flags.setMatrixAt(i,M);addCol(q[0],q[1],.04)});
  poles.castShadow=flags.castShadow=true;flags.receiveShadow=true;poles.frustumCulled=flags.frustumCulled=false;scene.add(poles,flags);
}
function flagAtlas(){
  const W=1024,H=625,cv=document.createElement('canvas');cv.width=W;cv.height=H*2;const x=cv.getContext('2d');
  const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8;
  const draw=(mk,wmW,wmD)=>{
    [[0,'#17331C','#234D2B',wmW,'#B5E383'],[H,'#B5E383','#A4D66F',wmD,'#17331C']].forEach(([y0,bg,bg2,wm,bar])=>{
      x.fillStyle=bg;x.fillRect(0,y0,W,H);
      // hoạ tiết khối kim cương mờ
      x.save();x.globalAlpha=.18;x.fillStyle=bg2;for(let i=-2;i<12;i++)for(let j=-1;j<6;j++){const cx=i*120+(j%2)*60,cy=y0+j*120;x.beginPath();x.moveTo(cx,cy-50);x.lineTo(cx+50,cy);x.lineTo(cx,cy+50);x.lineTo(cx-50,cy);x.fill()}x.restore();
      x.fillStyle=bar;x.fillRect(0,y0+H-46,W,46);
      if(mk)x.drawImage(mk,70,y0+150,290,290);
      if(wm)x.drawImage(wm,400,y0+262,560,65);else{x.fillStyle=y0?'#112615':'#FFFFFF';x.font='700 96px Archivo, sans-serif';x.fillText('FARMBLOCK',400,y0+330)}
    });tex.needsUpdate=true};
  draw(null,null,null);
  const wmEl=document.querySelector('.top .wm');const mkEl=document.querySelector('#mk');
  const wmSvg=c=>wmEl?wmEl.outerHTML.replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" fill="'+c+'" ').replace(/class="[^"]*"/,''):null;
  const mkSvg=mkEl?'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 360">'+mkEl.innerHTML+'</svg>':null;
  Promise.all([mkSvg?svgToCanvas(mkSvg,512,512):null,wmSvg('#FFFFFF')?svgToCanvas(wmSvg('#FFFFFF'),1206,140):null,wmSvg('#112615')?svgToCanvas(wmSvg('#112615'),1206,140):null]).then(([a,b,c])=>draw(a,b,c));
  return tex;
}
function buildFlags(){
  const spots=[];const seen=(x,z)=>spots.some(p=>(p[0]-x)**2+(p[1]-z)**2<.09);
  const gateP=RT.cross.map(c=>routeAt(c));const ok=(x,z)=>!inPond(x,z,.3)&&!(Math.abs(x-HQ_W[0])<.75&&Math.abs(z-HQ_W[1])<1.15)&&!seen(x,z)&&gateP.every(g=>(g.p.x-x)**2+(g.p.z-z)**2>3.2*3.2);
  const o={p:new THREE.Vector3(),f:new THREE.Vector3(),r:new THREE.Vector3(),yaw:0};
  const nearGate=s=>RT.cross.some(c=>Math.abs(s-c)<1.4);
  // dọc tuyến, so le hai bên
  let k=0;for(let s=.6;s<RT.L-.3;s+=1.45,k++){if(nearGate(s))continue;routeAt(s,o);const sd=k%2?1:-1;const x=o.p.x+o.r.x*.36*sd,z=o.p.z+o.r.z*.36*sd;if(ok(x,z))spots.push([x,z])}
  // 4 góc hồ và trước nhà điều hành
  const pw=POND.w/2+.32,ph=POND.h/2+.32;[[-pw,-ph],[pw,-ph],[pw,ph],[-pw,ph]].forEach(q=>{const x=PC[0]+q[0],z=PC[1]+q[1];if(!seen(x,z))spots.push([x,z])});
  for(let i=-2;i<=2;i++){const x=HQ_W[0]+.98,z=HQ_W[1]+i*.32;if(ok(x,z)&&dRoute(x,z)>.26)spots.push([x,z])}
  // ranh giới vườn
  for(let i=0;i<OUT.length;i++){const a=OUT[i],b=OUT[(i+1)%OUT.length];const L=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let t=0;t<L;t+=3.2){const x=a[0]+(b[0]-a[0])*t/L,z=a[1]+(b[1]-a[1])*t/L;if(dRoute(x,z)>.5&&ok(x,z))spots.push([x,z])}}
  const n=spots.length,Hp=6.5,FW=1.8,FH=1.1;
  const pg=new THREE.CylinderGeometry(.045,.06,Hp,8);pg.translate(0,Hp/2,0);const bg=new THREE.SphereGeometry(.09,10,8);bg.translate(0,Hp+.05,0);const baseG=new THREE.CylinderGeometry(.22,.26,.25,10);baseG.translate(0,.12,0);
  const poleG=mergeGeometries([pg,bg,baseG]);
  const poleM=new THREE.MeshStandardMaterial({color:'#9EA59C',roughness:.5,metalness:.35});
  const fg=new THREE.PlaneGeometry(FW,FH,18,8);fg.translate(FW/2+.05,Hp-.15-FH/2,0);
  const tex=flagAtlas();FLAGTEX=tex;
  const fm=flagMat(tex,FW,1);
  function _unused(sh){sh.uniforms.uTime=U.uTime;
    sh.vertexShader='uniform float uTime;varying float vDes;\n'+sh.vertexShader
      .replace('#include <beginnormal_vertex>',`float fx=max(position.x-.05,0.)/${FW.toFixed(2)};vec3 ip=vec3(instanceMatrix[3].x,0.,instanceMatrix[3].z);float ph=ip.x*3.1+ip.z*1.7;
        float a1=position.x*2.3-uTime*5.2+ph,a2=position.x*4.6-uTime*8.3+ph*1.3+position.y*1.5;
        float wz=(sin(a1)*.2+sin(a2)*.06)*fx;float dz=(cos(a1)*2.3*.2+cos(a2)*4.6*.06)*fx;
        vec3 objectNormal=normalize(vec3(-dz,0.,1.));
        #ifdef USE_TANGENT
        vec3 objectTangent=vec3(1.,0.,0.);
        #endif`)
      .replace('#include <begin_vertex>','vec3 transformed=vec3(position.x-fx*fx*.08,position.y-fx*fx*.12,position.z+wz);vDes=float(gl_InstanceID%2);');
    sh.fragmentShader='varying float vDes;\n'+sh.fragmentShader.replace('#include <map_fragment>',`vec2 fu=gl_FrontFacing?vMapUv:vec2(1.-vMapUv.x,vMapUv.y);fu.y=fu.y*.5+(vDes>.5?0.:.5);vec4 sampledDiffuseColor=texture2D(map,fu);diffuseColor*=sampledDiffuseColor;`)};
  const poles=new THREE.InstancedMesh(poleG,poleM,n),flags=new THREE.InstancedMesh(fg,fm,n);FLAGPOLE=poleM;
  const wd=U.uWD.value,yaw=Math.atan2(-wd.y,wd.x);const M=new THREE.Matrix4(),Q=new THREE.Quaternion().setFromAxisAngle(V(0,1,0),yaw),S=V(M2U,M2U,M2U),P=V(0,0,0);
  spots.forEach((q,i)=>{P.set(q[0],gH(q[0],q[1])-.004,q[1]);M.compose(P,Q,S);poles.setMatrixAt(i,M);flags.setMatrixAt(i,M);addCol(q[0],q[1],.02)});
  poles.castShadow=true;flags.castShadow=true;flags.receiveShadow=true;poles.frustumCulled=flags.frustumCulled=false;scene.add(poles,flags);
  FLAGS={poles,flags,n};
}
