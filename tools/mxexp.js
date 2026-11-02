// minimal GLB writer for one FBX character (+ extra clips)
window.exportChar=async(base,extra,opts)=>{
  const THREE=window.THREE;const o=await loadF(base);const clips=[];
  const rn=(c,n)=>{c.name=n;return c};
  clips.push(rn(o.animations[0],base.split('_').slice(1).join('_')));
  for(const e of extra){const x=await loadF(e);clips.push(rn(x.animations[0],e.split('_').slice(1).join('_')))}
  await new Promise(r=>setTimeout(r,2500));
  o.updateMatrixWorld(true);
  const nodes=[],nmap=new Map();
  (function walk(n){if(opts.noMesh&&n.isMesh)return;if(!(n.isBone||n.isMesh||n===o||n.children.some(c=>c.isBone||c.isMesh)))return;const i=nodes.length;nodes.push(n);nmap.set(n,i);n.children.forEach(walk)})(o);
  const bufs=[];let blen=0;const bviews=[],accs=[];
  const pushBuf=(u8,target)=>{const pad=(4-blen%4)%4;if(pad){bufs.push(new Uint8Array(pad));blen+=pad}bviews.push(Object.assign({buffer:0,byteOffset:blen,byteLength:u8.byteLength},target?{target}:{}));bufs.push(u8);blen+=u8.byteLength;return bviews.length-1};
  const acc=(arr,type,ct,target,mm)=>{const bv=pushBuf(new Uint8Array(arr.buffer,arr.byteOffset,arr.byteLength),target);const n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[type];const a={bufferView:bv,componentType:ct,count:arr.length/n,type};
    if(mm){const mn=new Array(n).fill(Infinity),mx=new Array(n).fill(-Infinity);for(let i=0;i<arr.length;i++){const k=i%n;mn[k]=Math.min(mn[k],arr[i]);mx[k]=Math.max(mx[k],arr[i])}a.min=mn;a.max=mx}accs.push(a);return accs.length-1};
  const images=[],textures=[];
  const img=async(t,mime,max)=>{const im=t.image;const s=Math.min(1,max/Math.max(im.width,im.height));const c=document.createElement('canvas');c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);const x=c.getContext('2d');x.drawImage(im,0,0,c.width,c.height);
    const b=await new Promise(r=>c.toBlob(r,mime,.86));const u8=new Uint8Array(await b.arrayBuffer());images.push({bufferView:pushBuf(u8),mimeType:mime});textures.push({source:images.length-1});return textures.length-1};
  const meshes=[],materials=[],skins=[];let gm=null;
  for(const n of nodes){if(!n.isSkinnedMesh||opts.noMesh)continue;const g=n.geometry,A=g.attributes;
    const m=n.material;const mat={name:m.name,pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:0,roughnessFactor:.85}};
    if(m.map)mat.pbrMetallicRoughness.baseColorTexture={index:await img(m.map,'image/jpeg',opts.tex||1024)};
    if(m.normalMap&&opts.normal)mat.normalTexture={index:await img(m.normalMap,'image/png',opts.ntex||512)};
    materials.push(mat);
    const prim={attributes:{POSITION:acc(new Float32Array(A.position.array),'VEC3',5126,34962,true),NORMAL:acc(new Float32Array(A.normal.array),'VEC3',5126,34962),TEXCOORD_0:acc(new Float32Array(A.uv.array).map((v,i)=>i%2?1-v:v),'VEC2',5126,34962)},material:materials.length-1};
    const si=A.skinIndex.array,sw=A.skinWeight.array,J=new Uint16Array(si.length),Wt=new Float32Array(sw.length);
    for(let i=0;i<si.length;i+=4){let s=0;for(let k=0;k<4;k++){J[i+k]=si[i+k];Wt[i+k]=sw[i+k];s+=sw[i+k]}if(s>0)for(let k=0;k<4;k++)Wt[i+k]/=s;else Wt[i]=1}
    prim.attributes.JOINTS_0=acc(J,'VEC4',5123,34962);prim.attributes.WEIGHTS_0=acc(Wt,'VEC4',5126,34962);
    if(g.index)prim.indices=acc(new Uint32Array(g.index.array),'SCALAR',5125,34963);
    meshes.push({name:n.name,primitives:[prim]});
    const sk=n.skeleton,ibm=new Float32Array(sk.bones.length*16),M=new THREE.Matrix4();
    sk.bones.forEach((b,i)=>{M.multiplyMatrices(sk.boneInverses[i],n.bindMatrix);ibm.set(M.elements,i*16)});
    skins.push({joints:sk.bones.map(b=>nmap.get(b)),inverseBindMatrices:acc(ibm,'MAT4',5126)});
    n.__mesh=meshes.length-1;n.__skin=skins.length-1}
  const gnodes=nodes.map(n=>{const r={name:n.name};const q=n.quaternion;if(n.position.lengthSq())r.translation=n.position.toArray();if(q.w!==1)r.rotation=[q.x,q.y,q.z,q.w];if(n.scale.x!==1||n.scale.y!==1||n.scale.z!==1)r.scale=n.scale.toArray();
    const ch=n.children.map(c=>nmap.get(c)).filter(x=>x!==undefined);if(ch.length)r.children=ch;if(n.__mesh!==undefined){r.mesh=n.__mesh;r.skin=n.__skin;delete r.translation;delete r.rotation;delete r.scale}return r});
  const byName=new Map(nodes.map((n,i)=>[n.name,i]));
  const animations=clips.map(cl=>{const ch=[],sm=[];cl.tracks.forEach(t=>{const dot=t.name.lastIndexOf('.');const bn=t.name.slice(0,dot),pr=t.name.slice(dot+1);const ni=byName.get(bn);if(ni===undefined)return;
      const path={quaternion:'rotation',position:'translation',scale:'scale'}[pr];if(!path)return;if(path==='scale')return;if(path==='translation'&&!/Hips/.test(bn))return;
      const ti=acc(new Float32Array(t.times),'SCALAR',5126,null,true),vi=acc(new Float32Array(t.values),path==='rotation'?'VEC4':'VEC3',5126);sm.push({input:ti,output:vi,interpolation:'LINEAR'});ch.push({sampler:sm.length-1,target:{node:ni,path}})});
    return{name:cl.name,channels:ch,samplers:sm}});
  const gltf={asset:{version:'2.0',generator:'fb-mx'},scene:0,scenes:[{nodes:[0]}],nodes:gnodes,meshes,materials,skins,animations,accessors:accs,bufferViews:bviews,images,textures,samplers:[{magFilter:9729,minFilter:9987}],buffers:[{byteLength:0}]};
  textures.forEach(t=>t.sampler=0);
  const pad=(4-blen%4)%4;if(pad){bufs.push(new Uint8Array(pad));blen+=pad}gltf.buffers[0].byteLength=blen;
  let js=new TextEncoder().encode(JSON.stringify(gltf));const jp=(4-js.length%4)%4;const js2=new Uint8Array(js.length+jp);js2.set(js);js2.fill(32,js.length);
  const total=12+8+js2.length+8+blen,out=new Uint8Array(total),dv=new DataView(out.buffer);
  dv.setUint32(0,0x46546C67,true);dv.setUint32(4,2,true);dv.setUint32(8,total,true);dv.setUint32(12,js2.length,true);dv.setUint32(16,0x4E4F534A,true);out.set(js2,20);
  let p=20+js2.length;dv.setUint32(p,blen,true);dv.setUint32(p+4,0x004E4942,true);p+=8;for(const b of bufs){out.set(b,p);p+=b.byteLength}
  let s='';for(let i=0;i<out.length;i+=32768)s+=String.fromCharCode.apply(null,out.subarray(i,i+32768));return btoa(s)};
