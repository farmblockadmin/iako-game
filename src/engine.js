/* =================================================================
   ENGINE · renderer, khí quyển, mây thể tích, tia nắng, bloom, grading
   ================================================================= */
let renderer,scene,camera,sun,hemi,amb,houseLamp,fireLight;
const GL={shC:new THREE.Vector3()};          // render targets & passes
const SKYU={uTop:{value:new THREE.Color()},uHor:{value:new THREE.Color()},uSunC:{value:new THREE.Color()},uSD:{value:new THREE.Vector3(1,.1,0)},uSK:{value:1},uNight:{value:0},uPC:{value:0},uTime:{value:0}};
const ATM={hour:6,cover:.85,dens:1,cb:24,ct:52,fogA:.05,fogB:.2,fogY:-10,haze:.00042,mist:new THREE.Color('#E9ECEA'),hazeC:new THREE.Color('#9FB3C6'),exposure:1,sat:1.14,warm:0,vig:.35,shadowK:.55,rays:.55,bloom:.55,tilt:0,tiltY:.5,flash:0};
const DPR_MAX=Math.min(window.devicePixelRatio||1,1.5);let DPR=Math.min(DPR_MAX,LOW?1:1.25);
function setDPR(d){DPR=d;if(!renderer)return;renderer.setPixelRatio(DPR);resizeEngine()}
let W=innerWidth,Hh=innerHeight;

function initEngine(cv){
  try{renderer=new THREE.WebGLRenderer({canvas:cv,antialias:false,powerPreference:'high-performance',stencil:false})}catch(e){return false}
  if(!renderer.getContext())return false;
  renderer.setPixelRatio(DPR);renderer.setSize(W,Hh,false);
  renderer.outputColorSpace=THREE.LinearSRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.autoClear=true;
  scene=new THREE.Scene();scene.background=null;
  camera=new THREE.PerspectiveCamera(40,W/Hh,.25,4200);
  hemi=new THREE.HemisphereLight('#FFF4DE','#6B5A3A',.55);scene.add(hemi);
  amb=new THREE.AmbientLight('#ffffff',.18);scene.add(amb);
  sun=new THREE.DirectionalLight('#FFE2B0',2.2);sun.castShadow=true;
  const sm=LOW?1024:2048;sun.shadow.mapSize.set(sm,sm);
  const sc=sun.shadow.camera;sc.left=-46;sc.right=46;sc.top=40;sc.bottom=-40;sc.near=1;sc.far=320;
  sun.shadow.bias=-.0005;sun.shadow.normalBias=.04;scene.add(sun);scene.add(sun.target);
  houseLamp=new THREE.PointLight('#FFC98A',0,9,2);scene.add(houseLamp);
  fireLight=new THREE.PointLight('#FF8A3D',0,14,2);scene.add(fireLight);
  GL.isGL2=renderer.capabilities.isWebGL2;
  buildTargets();buildSky();buildPasses();initEnv();
  return true;
}

/* ---------------- render targets ---------------- */
function rtOpts(extra){return Object.assign({minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,format:THREE.RGBAFormat,type:GL.half,depthBuffer:false,stencilBuffer:false},extra||{})}
function buildTargets(){
  const ext=renderer.extensions;
  GL.half=(GL.isGL2&&ext.get('EXT_color_buffer_float'))||ext.get('EXT_color_buffer_half_float')?THREE.HalfFloatType:THREE.UnsignedByteType;
  const w=Math.floor(W*DPR),h=Math.floor(Hh*DPR);
  GL.scene=new THREE.WebGLRenderTarget(w,h,rtOpts({depthBuffer:true}));
  GL.scene.depthTexture=new THREE.DepthTexture(w,h);GL.scene.depthTexture.type=THREE.UnsignedIntType;
  GL.cs=.5;
  GL.cloud=new THREE.WebGLRenderTarget(Math.ceil(w*GL.cs),Math.ceil(h*GL.cs),rtOpts());
  GL.comp=new THREE.WebGLRenderTarget(w,h,rtOpts());
  GL.raysA=new THREE.WebGLRenderTarget(Math.ceil(w/3),Math.ceil(h/3),rtOpts());
  GL.raysB=GL.raysA.clone();
}
function resizeEngine(){
  W=innerWidth;Hh=innerHeight;renderer.setSize(W,Hh,false);camera.aspect=W/Hh;camera.updateProjectionMatrix();
  const w=Math.floor(W*DPR),h=Math.floor(Hh*DPR);
  GL.scene.setSize(w,h);GL.cloud.setSize(Math.ceil(w*GL.cs),Math.ceil(h*GL.cs));GL.comp.setSize(w,h);GL.raysA.setSize(Math.ceil(w/3),Math.ceil(h/3));GL.raysB.setSize(Math.ceil(w/3),Math.ceil(h/3));
  if(GL.bloom)GL.bloom.setSize(w,h);
}

/* ---------------- noise textures cho mây ---------------- */
function makeNoise3D(N){
  const data=new Uint8Array(N*N*N*4);
  const P=(n)=>{const g=new Float32Array(n*n*n*3);for(let i=0;i<g.length;i++)g[i]=rnd();return g};
  const worley=(x,y,z,c,pts)=>{ // toạ độ 0..1, c ô mỗi chiều, tuần hoàn
    const fx=x*c,fy=y*c,fz=z*c,ix=Math.floor(fx),iy=Math.floor(fy),iz=Math.floor(fz);let m=9;
    for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)for(let d=-1;d<=1;d++){
      const cx=ix+a,cy=iy+b,cz=iz+d,wx=((cx%c)+c)%c,wy=((cy%c)+c)%c,wz=((cz%c)+c)%c,k=((wz*c+wy)*c+wx)*3;
      const px=cx+pts[k],py=cy+pts[k+1],pz=cz+pts[k+2];const dd=(px-fx)**2+(py-fy)**2+(pz-fz)**2;if(dd<m)m=dd}
    return Math.sqrt(m);
  };
  const vt=(x,y,z,c,g)=>{ // value noise tuần hoàn
    const fx=x*c,fy=y*c,fz=z*c,ix=Math.floor(fx),iy=Math.floor(fy),iz=Math.floor(fz),tx=fx-ix,ty=fy-iy,tz=fz-iz;
    const u=tx*tx*(3-2*tx),v=ty*ty*(3-2*ty),w=tz*tz*(3-2*tz);
    const G=(a,b,d)=>{const wx=((a%c)+c)%c,wy=((b%c)+c)%c,wz=((d%c)+c)%c;return g[((wz*c+wy)*c+wx)*3]};
    const l=(a,b,t)=>a+(b-a)*t;
    return l(l(l(G(ix,iy,iz),G(ix+1,iy,iz),u),l(G(ix,iy+1,iz),G(ix+1,iy+1,iz),u),v),l(l(G(ix,iy,iz+1),G(ix+1,iy,iz+1),u),l(G(ix,iy+1,iz+1),G(ix+1,iy+1,iz+1),u),v),w);
  };
  const p4=P(4),p8=P(8),p16=P(16),p3=P(3),g4=P(4),g8=P(8),g16=P(16),g32=P(32);
  for(let z=0;z<N;z++)for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    const X=x/N,Y=y/N,Z=z/N;
    const vf=vt(X,Y,Z,4,g4)*.5+vt(X,Y,Z,8,g8)*.27+vt(X,Y,Z,16,g16)*.15+vt(X,Y,Z,32,g32)*.08;
    const w1=1-worley(X,Y,Z,3,p3),w2=1-worley(X,Y,Z,8,p8),w3=1-worley(X,Y,Z,16,p16);
    const wf=w1*.62+w2*.26+w3*.12;
    const pw=clamp(vf*.55+wf*.65-.12,0,1); // perlin-worley
    const det=clamp((1-worley(X,Y,Z,4,p4))*.55+w2*.3+w3*.15,0,1);
    const k=((z*N+y)*N+x)*4;data[k]=pw*255;data[k+1]=det*255;data[k+2]=vf*255;data[k+3]=255;
  }
  const t=new THREE.Data3DTexture(data,N,N,N);t.format=THREE.RGBAFormat;t.type=THREE.UnsignedByteType;
  t.minFilter=t.magFilter=THREE.LinearFilter;t.wrapS=t.wrapT=t.wrapR=THREE.RepeatWrapping;t.unpackAlignment=1;t.needsUpdate=true;return t;
}
function makeWeather(N){
  const d=new Uint8Array(N*N*4);const g=new Float32Array(16*16*3),g2=new Float32Array(32*32*3);for(let i=0;i<g.length;i++)g[i]=rnd();for(let i=0;i<g2.length;i++)g2[i]=rnd();
  const vt=(x,y,c,G)=>{const fx=x*c,fy=y*c,ix=Math.floor(fx),iy=Math.floor(fy),tx=fx-ix,ty=fy-iy,u=tx*tx*(3-2*tx),v=ty*ty*(3-2*ty);
    const q=(a,b)=>G[((((b%c)+c)%c)*c+(((a%c)+c)%c))*3];return lerp(lerp(q(ix,iy),q(ix+1,iy),u),lerp(q(ix,iy+1),q(ix+1,iy+1),u),v)};
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){const X=x/N,Y=y/N;
    const a=vt(X,Y,4,g)*.5+vt(X,Y,8,g)*.25+vt(X,Y,16,g)*.15+vt(X,Y,32,g2)*.1;
    const b=vt(X+.37,Y+.11,8,g2)*.6+vt(X,Y,16,g2)*.4;
    const k=(y*N+x)*4;d[k]=clamp((a-.22)*1.75,0,1)*255;d[k+1]=b*255;d[k+2]=a*255;d[k+3]=255}
  const t=new THREE.DataTexture(d,N,N,THREE.RGBAFormat);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.minFilter=t.magFilter=THREE.LinearFilter;t.needsUpdate=true;return t;
}

/* ---------------- bầu trời ---------------- */
let skyMesh,starPts;
function buildSky(){
  skyMesh=new THREE.Mesh(new THREE.SphereGeometry(3000,48,24),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,depthTest:false,uniforms:SKYU,
    vertexShader:'varying vec3 vD;void main(){vD=position;vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position=p.xyww;}',
    fragmentShader:`uniform vec3 uTop,uHor,uSunC,uSD;uniform float uSK,uNight,uPC,uTime;varying vec3 vD;
      float hs(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float vns(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hs(i),hs(i+vec2(1,0)),f.x),mix(hs(i+vec2(0,1)),hs(i+vec2(1,1)),f.x),f.y);}
      float fbs(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*vns(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}
      void main(){vec3 d=normalize(vD);float h=d.y;
        vec3 c=mix(uHor,uTop,pow(smoothstep(-.02,.55,h),.42));
        c=mix(c,uHor*.82,smoothstep(.0,-.25,h));
        float s=max(dot(d,normalize(uSD)),0.);
        float hz=exp(-abs(h)*7.);
        c+=uSunC*(pow(s,6.)*.32*hz+pow(s,40.)*.35+pow(s,350.)*1.6)*uSK;
        c+=uSunC*smoothstep(.9994,.99975,s)*28.*uSK*(1.-uNight);
        if(uPC>0.&&h>0.){vec2 q=d.xz/(h+.06)*1.6+vec2(uTime*.004,0.);float n=fbs(q)+.25*fbs(q*3.1+5.);
          float cl=smoothstep(.62,.95,n+uPC*.25-.1)*smoothstep(0.,.12,h)*uPC;
          float lit=fbs(q+uSD.xz*.35);vec3 cc=mix(uHor*.95+uTop*.15,uSunC*.9+uHor*.5,clamp(.4+.6*(n-lit)*3.,0.,1.))*(1.-uNight*.8);
          cc+=uSunC*pow(s,8.)*.6;c=mix(c,cc,cl*.85);}
        gl_FragColor=vec4(c,1.);}`}));
  skyMesh.renderOrder=-10;skyMesh.frustumCulled=false;scene.add(skyMesh);
  const sp=[];for(let i=0;i<1600;i++){const a=rnd()*6.283,e=.04+Math.pow(rnd(),.7)*1.5,R=2800;sp.push(Math.cos(a)*Math.cos(e)*R,Math.sin(e)*R,Math.sin(a)*Math.cos(e)*R)}
  const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.Float32BufferAttribute(sp,3));
  starPts=new THREE.Points(sg,new THREE.PointsMaterial({color:'#FFFFFF',size:1.6,sizeAttenuation:false,transparent:true,opacity:0,depthWrite:false,fog:false}));starPts.renderOrder=-9;starPts.frustumCulled=false;scene.add(starPts);
}

/* ---------------- môi trường phản chiếu (PMREM từ bầu trời) ---------------- */
let pmrem=null,envRT=null,envScene=null,envGround=null,envKey='';
function initEnv(){
  pmrem=new THREE.PMREMGenerator(renderer);envScene=new THREE.Scene();
  const sk=new THREE.Mesh(new THREE.SphereGeometry(400,32,16),skyMesh.material);envScene.add(sk);
  envGround=new THREE.Mesh(new THREE.CircleGeometry(390,24),new THREE.MeshBasicMaterial({color:'#333'}));envGround.rotation.x=-Math.PI/2;envGround.position.y=-6;envScene.add(envGround);
  scene.environmentIntensity=.55;
}
function updEnv(h,lt){
  if(!pmrem)return;const key=(Math.round(h*10)/10)+'|'+Math.round(ATM.cover*10);if(key===envKey)return;envKey=key;
  envGround.material.color.copy(lt.hg).multiplyScalar(lt.hi*1.4).add(_A.copy(lt.sun).multiplyScalar(lt.si*.18*LT.day)).multiply(_B.setRGB(.32,.36,.18));
  const old=envRT;envRT=pmrem.fromScene(envScene,0,.5,1000);scene.environment=envRT.texture;if(old)old.dispose();
}

/* ---------------- các pass hậu kỳ ---------------- */
const FSV='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
function fsq(mat){const m=new THREE.Mesh(new THREE.PlaneGeometry(2,2),mat);m.frustumCulled=false;const s=new THREE.Scene();s.add(m);return {scene:s,mat}}
const ocam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
function buildPasses(){
  GL.noise=GL.isGL2?makeNoise3D(LOW?40:56):null;
  GL.weather=makeWeather(256);
  const common={tDepth:{value:GL.scene.depthTexture},uInvProj:{value:new THREE.Matrix4()},uCamW:{value:new THREE.Matrix4()},uCam:{value:new THREE.Vector3()},
    uSD:{value:new THREE.Vector3()},uSunC:{value:new THREE.Color()},uTop:{value:new THREE.Color()},uHor:{value:new THREE.Color()},uTime:{value:0},
    uCb:{value:24},uCt:{value:50},uCover:{value:.8},uDens:{value:1},tW:{value:GL.weather},uWind:{value:new THREE.Vector2(6,2.5)},uNight:{value:0}};
  GL.common=common;
  const CLOUD_FN=`
    #define NN ${LOW?'40.':'56.'}
    float remap(float v,float a,float b,float c,float d){return c+(v-a)/(b-a)*(d-c);}
    vec4 tS(sampler2D t,vec2 uv){vec2 p=uv*256.+.5;vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return texture2D(t,(i+f-.5)/256.);}
      float cover(vec2 xz){vec2 w=(xz+uWind*uTime)*.0011;float c=tS(tW,w).r*.7+tS(tW,w*2.3+.31).r*.3;return c;}
    float cdens(vec3 p,bool hi){
      float hf=(p.y-uCb)/(uCt-uCb);if(hf<0.||hf>1.)return 0.;
      float cv=cover(p.xz);
      float cov=clamp(cv*.65+uCover*1.15-.42,0.,1.);if(cov<=0.)return 0.;
      float prof=smoothstep(0.,.18,hf)*smoothstep(1.,.62-cov*.25,hf);
      ${GL.noise?'vec3 nq=(p*.0042+vec3(uTime*.0012,0.,uTime*.0006))*NN+.5;vec3 ni=floor(nq),nf=fract(nq);nf=nf*nf*(3.-2.*nf);vec4 n=texture(tN,(ni+nf-.5)/NN);float base=n.r;':'float base=texture2D(tW,p.xz*.004+p.y*.01).g;'}
      float d=clamp(remap(base*prof,1.-cov*.92+hf*.42,1.,0.,1.),0.,1.);
      if(d<=0.)return 0.;
      ${GL.noise?'if(hi){float det=texture(tN,p*.019+vec3(0.,uTime*.006,uTime*.004)).g;d=clamp(remap(d,det*.42*(1.-hf*.35),1.,0.,1.),0.,1.);}':''}
      return d*uDens;}`;
  // ---- mây thể tích ----
  GL.cloudPass=fsq(new THREE.ShaderMaterial({uniforms:Object.assign({tN:{value:GL.noise},uSteps:{value:48},uRes:{value:new THREE.Vector2()}},common),depthTest:false,depthWrite:false,
    vertexShader:FSV,
    fragmentShader:`${GL.noise?'precision highp sampler3D;uniform sampler3D tN;':''}
      uniform sampler2D tDepth,tW;uniform mat4 uInvProj,uCamW;uniform vec3 uCam,uSD,uSunC,uTop,uHor;uniform float uTime,uCb,uCt,uCover,uDens,uSteps,uNight;uniform vec2 uWind,uRes;varying vec2 vUv;
      ${CLOUD_FN}
      float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
      float hg(float c,float g){float g2=g*g;return (1.-g2)/(12.566*pow(1.+g2-2.*g*c,1.5));}
      void main(){
        vec2 hp=.5/uRes;
        float dz=max(max(texture2D(tDepth,vUv+vec2(-hp.x,-hp.y)).x,texture2D(tDepth,vUv+vec2(hp.x,-hp.y)).x),max(texture2D(tDepth,vUv+vec2(-hp.x,hp.y)).x,texture2D(tDepth,vUv+vec2(hp.x,hp.y)).x));
        vec4 v=uInvProj*vec4(vUv*2.-1.,dz*2.-1.,1.);vec3 vp=v.xyz/v.w;
        vec3 rd=normalize((uCamW*vec4(vp,0.)).xyz);float sceneT=dz>.99999?1e6:length(vp);
        vec3 ro=uCam;
        if(abs(rd.y)<1e-4)rd.y=1e-4;
        float t0=(uCb-ro.y)/rd.y,t1=(uCt-ro.y)/rd.y;if(t0>t1){float q=t0;t0=t1;t1=q;}
        t0=max(t0,0.);t1=min(min(t1,sceneT),2600.);
        if(t1<=t0||uCover<.005){gl_FragColor=vec4(0.);return;}
        float steps=uSteps;float len=t1-t0;float dt=len/steps;dt=max(dt,1.2);
        float t=t0+dt*hash(gl_FragCoord.xy+fract(uTime*7.1)*61.);
        float T=1.;vec3 col=vec3(0.);
        float cs=dot(rd,uSD);float ph=.75+hg(cs,.7)*7.+hg(cs,-.25)*1.5;
        vec3 sunL=uSunC*(1.-uNight*.85);
        for(int i=0;i<64;i++){
          if(float(i)>=steps||t>t1||T<.015)break;
          vec3 p=ro+rd*t;
          float d=cdens(p,true);
          if(d>.003){
            float l=cdens(p+uSD*5.,false)*.9+cdens(p+uSD*14.,false)*1.1+cdens(p+uSD*34.,false)*1.4;
            float lt=exp(-l*1.4)*.85+exp(-l*.3)*.15;
            float pw=1.-exp(-d*3.);
            float hf=clamp((p.y-uCb)/(uCt-uCb),0.,1.);
            vec3 ambC=mix(uHor*.35+uTop*.15,uTop*.45+uHor*.3,hf);
            vec3 S=sunL*lt*ph*(.3+.7*pw)*1.6+ambC*(.45+.55*hf);
            float sig=d*.32;float a=exp(-sig*dt);
            col+=T*S*(1.-a);T*=a;
          }
          t+=dt*(d>.003?1.:1.35);
        }
        float fade=1.-exp(-t0*.00055);
        col=mix(col,uHor*(1.-T),fade*.55);
        gl_FragColor=vec4(col,1.-T);}`}));
  // ---- tổng hợp khí quyển (sương thung lũng + mù xa + bóng mây) ----
  GL.atmPass=fsq(new THREE.ShaderMaterial({uniforms:Object.assign({tScene:{value:GL.scene.texture},tCloud:{value:GL.cloud.texture},
      uFogA:{value:.06},uFogB:{value:.11},uFogY:{value:-4},uHaze:{value:.00042},uMist:{value:new THREE.Color()},uHazeC:{value:new THREE.Color()},uShadow:{value:.55}},common),depthTest:false,depthWrite:false,
    vertexShader:FSV,
    fragmentShader:`uniform sampler2D tScene,tCloud,tDepth,tW;uniform mat4 uInvProj,uCamW;uniform vec3 uCam,uSD,uSunC,uTop,uHor,uMist,uHazeC;
      uniform float uTime,uCb,uCt,uCover,uDens,uFogA,uFogB,uFogY,uHaze,uShadow,uNight;uniform vec2 uWind;varying vec2 vUv;
      float remap(float v,float a,float b,float c,float d){return c+(v-a)/(b-a)*(d-c);}
      vec4 tS(sampler2D t,vec2 uv){vec2 p=uv*256.+.5;vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return texture2D(t,(i+f-.5)/256.);}
      float cover(vec2 xz){vec2 w=(xz+uWind*uTime)*.0011;float c=tS(tW,w).r*.7+tS(tW,w*2.3+.31).r*.3;return c;}
      void main(){
        vec3 col=texture2D(tScene,vUv).rgb;float dz=texture2D(tDepth,vUv).x;
        if(dz<.99999){
          vec4 v=uInvProj*vec4(vUv*2.-1.,dz*2.-1.,1.);vec3 vp=v.xyz/v.w;vec3 rd=normalize((uCamW*vec4(vp,0.)).xyz);float t=length(vp);
          vec3 p=uCam+rd*t;
          // bóng mây
          if(uCover>.01&&uSD.y>.02){vec2 q=p.xz+uSD.xz/uSD.y*((uCb+uCt)*.5-p.y);float cv=clamp(cover(q)*.65+uCover*1.15-.42,0.,1.);col*=1.-uShadow*smoothstep(.0,.55,cv)*(1.-uNight)*smoothstep(uCb+8.,uCb-6.,p.y);}
          // sương thung lũng (mật độ giảm theo độ cao)
          float ry=abs(rd.y)<1e-3?1e-3:rd.y;
          float h0=uCam.y-uFogY;
          float fa=uFogA/uFogB*exp(-h0*uFogB)*(1.-exp(-t*ry*uFogB))/ry;
          float wisp=texture2D(tW,(p.xz+uWind*uTime*.6)*.004).g;
          fa*=.55+.9*wisp;
          float fm=1.-exp(-max(fa,0.));
          // mù xa + tán xạ phía mặt trời
          float hz=1.-exp(-t*uHaze);
          float sa=pow(max(dot(rd,uSD),0.),6.);
          vec3 hc=mix(uHazeC,uHazeC*.6+uSunC*.5,sa*.8);
          col=mix(col,hc,hz*.92);
          vec3 mc=mix(uMist,uMist*.75+uSunC*.3,sa);
          col=mix(col,mc,fm);
        }
        vec4 cl=texture2D(tCloud,vUv);
        if(dz<.99999){vec4 v2=uInvProj*vec4(vUv*2.-1.,dz*2.-1.,1.);vec3 vp2=v2.xyz/v2.w;vec3 rd2=normalize((uCamW*vec4(vp2,0.)).xyz);float ry2=abs(rd2.y)<1e-4?1e-4:rd2.y;
          float ta=(uCb-uCam.y)/ry2,tb=(uCt-uCam.y)/ry2;float te=max(min(ta,tb),0.);if(uCam.y>uCb&&uCam.y<uCt)te=0.;
          cl*=smoothstep(te-2.,te+6.,length(vp2));}
        col=col*(1.-cl.a)+cl.rgb;
        gl_FragColor=vec4(col,1.);}`}));
  // ---- tia nắng: mặt nạ sáng + kéo về phía mặt trời ----
  GL.rayMask=fsq(new THREE.ShaderMaterial({uniforms:{tC:{value:GL.comp.texture},tDepth:{value:GL.scene.depthTexture},uSun:{value:new THREE.Vector2(.5,.5)},uAsp:{value:1},uK:{value:1}},depthTest:false,depthWrite:false,vertexShader:FSV,
    fragmentShader:`uniform sampler2D tC,tDepth;uniform vec2 uSun;uniform float uAsp,uK;varying vec2 vUv;
      void main(){vec3 c=texture2D(tC,vUv).rgb;float dz=texture2D(tDepth,vUv).x;float l=dot(c,vec3(.3,.59,.11));
        vec2 d=vUv-uSun;d.x*=uAsp;float fall=exp(-dot(d,d)*3.2);
        float m=step(.99999,dz)*smoothstep(.55,2.4,l)*fall*uK;
        gl_FragColor=vec4(c*m,1.);}`}));
  GL.rayBlur=fsq(new THREE.ShaderMaterial({uniforms:{tM:{value:null},uSun:{value:new THREE.Vector2(.5,.5)},uLen:{value:1}},depthTest:false,depthWrite:false,vertexShader:FSV,
    fragmentShader:`uniform sampler2D tM;uniform vec2 uSun;uniform float uLen;varying vec2 vUv;
      void main(){vec2 d=(uSun-vUv)*uLen/40.;vec2 p=vUv;vec3 s=vec3(0.);float w=1.,ws=0.;
        for(int i=0;i<40;i++){s+=texture2D(tM,p).rgb*w;ws+=w;w*=.965;p+=d;}
        gl_FragColor=vec4(s/ws*1.8,1.);}`}));
  // ---- bloom ----
  try{GL.bloom=new UnrealBloomPass(new THREE.Vector2(W*DPR,Hh*DPR),.6,.55,.82);}catch(e){GL.bloom=null}
  // ---- hoàn thiện: tone map, grading, tilt-shift nhẹ, vignette, hạt phim, FXAA ----
  GL.final=fsq(new THREE.ShaderMaterial({uniforms:{tC:{value:GL.comp.texture},tR:{value:GL.raysB.texture},uRes:{value:new THREE.Vector2()},uExp:{value:1},uSat:{value:1},uWarm:{value:0},uVig:{value:.35},uRays:{value:.5},uTime:{value:0},uTilt:{value:0},uTiltY:{value:.5},uFlash:{value:0}},depthTest:false,depthWrite:false,vertexShader:FSV,
    fragmentShader:`uniform sampler2D tC,tR;uniform vec2 uRes;uniform float uExp,uSat,uWarm,uVig,uRays,uTime,uTilt,uTiltY,uFlash;varying vec2 vUv;
      vec3 aces(vec3 x){const float a=2.51,b=.03,c=2.43,d=.59,e=.14;return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.,1.);}
      vec3 tm(vec3 c){return aces(c*uExp);}
      float lum(vec3 c){return dot(c,vec3(.299,.587,.114));}
      void main(){
        vec2 px=1./uRes;
        // tilt-shift: làm mờ theo dải dọc
        float tb=uTilt*smoothstep(.12,.42,abs(vUv.y-uTiltY));
        vec3 c;
        if(tb>.01){vec3 s=vec3(0.);float n=0.;for(int i=-3;i<=3;i++)for(int j=-3;j<=3;j++){vec2 o=vec2(float(i),float(j))*px*tb*2.2;s+=texture2D(tC,vUv+o).rgb;n+=1.;}c=tm(s/n);}
        else{
          // FXAA rút gọn
          vec3 rgbM=tm(texture2D(tC,vUv).rgb);
          vec3 rgbNW=tm(texture2D(tC,vUv+vec2(-1.,-1.)*px).rgb),rgbNE=tm(texture2D(tC,vUv+vec2(1.,-1.)*px).rgb),rgbSW=tm(texture2D(tC,vUv+vec2(-1.,1.)*px).rgb),rgbSE=tm(texture2D(tC,vUv+vec2(1.,1.)*px).rgb);
          float lNW=lum(rgbNW),lNE=lum(rgbNE),lSW=lum(rgbSW),lSE=lum(rgbSE),lM=lum(rgbM);
          float lMin=min(lM,min(min(lNW,lNE),min(lSW,lSE))),lMax=max(lM,max(max(lNW,lNE),max(lSW,lSE)));
          vec2 dir=vec2(-((lNW+lNE)-(lSW+lSE)),((lNW+lSW)-(lNE+lSE)));
          float red=max((lNW+lNE+lSW+lSE)*.03125,.0078125);float rcp=1./(min(abs(dir.x),abs(dir.y))+red);
          dir=clamp(dir*rcp,-8.,8.)*px;
          vec3 A=.5*(tm(texture2D(tC,vUv+dir*(1./3.-.5)).rgb)+tm(texture2D(tC,vUv+dir*(2./3.-.5)).rgb));
          vec3 B=A*.5+.25*(tm(texture2D(tC,vUv+dir*-.5).rgb)+tm(texture2D(tC,vUv+dir*.5).rgb));
          float lB=lum(B);c=(lB<lMin||lB>lMax)?A:B;
        }
        c+=aces(texture2D(tR,vUv).rgb*uRays*uExp)*.9;
        // grading
        float L=lum(c);c=mix(vec3(L),c,uSat);
        c=mix(c,c*vec3(1.06,1.0,.9),uWarm);
        c=pow(c,vec3(.98,1.,1.03));
        c=c*.96+.02*smoothstep(.0,.3,1.-L)*vec3(.02,.05,.08)*0.;
        vec2 q=vUv-.5;float vg=1.-dot(q,q)*uVig*1.8;c*=clamp(vg,0.,1.);
        c+=(fract(sin(dot(vUv*uRes+uTime*91.,vec2(12.9898,78.233)))*43758.5453)-.5)*.012;
        c=mix(c,vec3(1.),uFlash);
        c=pow(clamp(c,0.,1.),vec3(1./2.2));
        c=mix(c,c*c*(3.-2.*c),.22);
        gl_FragColor=vec4(c,1.);}`}));
}

/* ---------------- ánh sáng theo giờ ---------------- */
const TK2=[ // giờ, trời đỉnh, chân trời, nắng, cường độ, hemi trên, hemi dưới, hemi cường độ, mù xa, sương
 [0,'#060A16','#162036','#8DA6D9',.4,'#3A4C7E','#15171D',.36,'#1A2236','#20283A'],
 [4.8,'#0B1226','#2A2E48','#8FA6D8',.22,'#36446E','#191B22',.28,'#2B3048','#2E3448'],
 [5.6,'#24345C','#C98A72','#FF8C5A',.7,'#8E8AA8','#3E3430',.34,'#9C8A92','#C8B6B0'],
 [6.3,'#3A5E9C','#F3CDA6','#FFB774',2.0,'#F5D2B4','#5B4A3A',.42,'#C3C3CA','#EEE9E6'],
 [7.5,'#4479C2','#E2DCD2','#FFD8A6',2.4,'#FFE7CC','#6B5A3A',.5,'#B4C2CE','#EEEEEA'],
 [11,'#3F78C2','#BCD3E6','#FFF3DE',2.7,'#FFF6E6','#6B5A3A',.58,'#A9BED0','#E6ECEF'],
 [15.5,'#4479C0','#CCD8E2','#FFE6BE',2.4,'#FFEBD0','#6B5A3A',.55,'#B5C2CC','#E9EAE6'],
 [17.4,'#5A6FA6','#F0B57E','#FF9A54',1.75,'#F7C9A0','#5B4434',.46,'#D2A886','#EBD0B8'],
 [18.4,'#2F3B6E','#D27A5C','#F06E4A',.65,'#9A87A8','#3A3036',.36,'#8E6A6E','#B39A9E'],
 [19.3,'#141D3A','#3A3554','#8DA6D9',.42,'#4A5A88','#1B1D24',.36,'#2A2C44','#2E3248'],
 [24,'#060A16','#162036','#8DA6D9',.4,'#3A4C7E','#15171D',.36,'#1A2236','#20283A']];
const _A=new THREE.Color(),_B=new THREE.Color();
const LT={night:0,day:1,golden:0};
function sunDirAt(h){const ang=(h-6)/12*Math.PI;const e=Math.sin(ang);
  if(e<-.05){const a2=(h<12?h+24:h)-24; return new THREE.Vector3(-.35,.62,-.3).normalize();}
  return new THREE.Vector3(Math.cos(ang),Math.max(e*.92,.012)+.0,.42*Math.sin(ang)+.32).normalize();}
function lightAt(h){
  let i=0;while(i<TK2.length-2&&TK2[i+1][0]<=h)i++;const a=TK2[i],b=TK2[i+1],t=sstep(0,1,(h-a[0])/(b[0]-a[0]||1));
  const L=(k)=>_A.set(a[k]).lerp(_B.set(b[k]),t).clone();
  return {top:L(1),hor:L(2),sun:L(3),si:lerp(a[4],b[4],t),hs:L(5),hg:L(6),hi:lerp(a[7],b[7],t),haze:L(8),mist:L(9)};
}
function applyLight(){
  const h=((ATM.hour%24)+24)%24,lt=lightAt(h);
  const ang=(h-6)/12*Math.PI,se=Math.sin(ang);
  LT.day=sstep(-.05,.22,se);LT.night=1-sstep(-.22,.08,se);LT.golden=1-sstep(0,1.2,Math.min(Math.abs(h-6.2),Math.abs(h-17.8)));
  U.uNight.value=LT.night;
  const sd=sunDirAt(h);
  // nắng: khi đêm, dùng ánh trăng
  const moon=LT.night;
  sun.color.copy(lt.sun);sun.intensity=lt.si*Math.PI*(1-ATM.cover*.35*(1-moon));
  const tgt=GL.shC;const shR=ATM.shR||46,sc=sun.shadow.camera;
  if(Math.abs(sc.right-shR)>1e-4){sc.left=sc.bottom=-shR;sc.right=sc.top=shR;sc.far=shR*6+120;sc.updateProjectionMatrix()}
  const tx=2*shR/sun.shadow.mapSize.x;sun.shadow.normalBias=tx*3;sun.shadow.bias=-tx*.05;
  sun.position.copy(tgt).addScaledVector(sd,shR*3+60);sun.target.position.copy(tgt);
  GU2.uSunW.value.copy(sd);GU2.uDay.value=LT.day;
  hemi.color.copy(lt.hs);hemi.groundColor.copy(lt.hg);hemi.intensity=lt.hi*Math.PI*(1+ATM.cover*.25);
  SKYU.uTop.value.copy(lt.top);SKYU.uHor.value.copy(lt.hor);SKYU.uSunC.value.copy(lt.sun).multiplyScalar(1.15);
  const sdSky=sunDirAt(h);if(se<-.05){sdSky.set(Math.cos(ang),Math.sin(ang),.42*Math.sin(ang)+.32).normalize()}
  SKYU.uSD.value.copy(sdSky);SKYU.uPC.value=ATM.pc||0;SKYU.uTime.value=U.uTime.value;SKYU.uSK.value=(1-LT.night)*(1-ATM.cover*.25);SKYU.uNight.value=LT.night;
  const C=GL.common;C.uSD.value.copy(sdSky.y>0?sdSky:sd);C.uSunC.value.copy(lt.sun).multiplyScalar(lt.si*.75+.25);C.uTop.value.copy(lt.top);C.uHor.value.copy(lt.hor);
  C.uNight.value=LT.night;
  GL.atmPass.mat.uniforms.uMist.value.copy(lt.mist).lerp(ATM.mist,.0);GL.atmPass.mat.uniforms.uHazeC.value.copy(lt.haze);
  starPts.material.opacity=LT.night*.9*(1-ATM.cover*.6);
  updEnv(h,lt);
  MAT.win&&(MAT.win.emissiveIntensity=LT.night*1.6);houseLamp.intensity=LT.night*1.4;
  if(typeof LEDS!=='undefined')LEDS.forEach(l=>{if(!l.g)return;const on=l.k==='rec'?(Math.sin(U.uTime.value*3+l.ph)>0?1:0):l.k==='hub'?(Math.sin(U.uTime.value*4)>.3?1:.15):1;l.g.visible=LT.night>.25||l.k==='hub';l.g.material.opacity=on*(l.k==='lamp'?LT.night:.35+LT.night*.65)});
  if(typeof villageGlow!=='undefined'&&villageGlow)villageGlow.material.opacity=LT.night;
  DGLOW.forEach((m,i)=>m.material.opacity=LT.night*(.5+.2*Math.sin(U.uTime.value*1.7+i*1.3)));
  if(typeof flies!=='undefined'&&flies){flies.visible=LT.night>.4;flies.material.uniforms.uOn.value=LT.night}
  return {sd:sdSky,lt};
}

/* ---------------- khung hình ---------------- */
const _v=new THREE.Vector3();
function renderFrame(t){
  const C=GL.common;
  camera.updateMatrixWorld();
  skyMesh.position.copy(camera.position);starPts.position.copy(camera.position);
  // 1. cảnh
  renderer.setRenderTarget(GL.scene);renderer.setClearColor(0x000000,1);renderer.clear();renderer.render(scene,camera);
  // 2. mây
  C.uInvProj.value.copy(camera.projectionMatrixInverse);C.uCamW.value.copy(camera.matrixWorld);C.uCam.value.copy(camera.position);
  C.uTime.value=t;C.uCover.value=ATM.cover;C.uDens.value=ATM.dens;C.uCb.value=ATM.cb;C.uCt.value=ATM.ct;
  GL.cloudPass.mat.uniforms.uRes.value.set(GL.cloud.width,GL.cloud.height);
  if(ATM.cover>.005){renderer.setRenderTarget(GL.cloud);renderer.setClearColor(0x000000,0);renderer.clear();renderer.render(GL.cloudPass.scene,ocam);}
  else{renderer.setRenderTarget(GL.cloud);renderer.setClearColor(0x000000,0);renderer.clear();}
  // 3. khí quyển
  const au=GL.atmPass.mat.uniforms;au.uFogA.value=ATM.fogA;au.uFogB.value=ATM.fogB;au.uFogY.value=ATM.fogY;au.uHaze.value=ATM.haze;au.uShadow.value=ATM.shadowK;
  renderer.setRenderTarget(GL.comp);renderer.render(GL.atmPass.scene,ocam);
  // 4. tia nắng
  _v.copy(camera.position).addScaledVector(C.uSD.value,1000).project(camera);
  const sx=_v.x*.5+.5,sy=_v.y*.5+.5,front=_v.z<1&&C.uSD.value.dot(camera.getWorldDirection(new THREE.Vector3()))>0;
  const rk=front?ATM.rays*(1-LT.night)*clamp(1.6-Math.hypot(sx-.5,sy-.5),0,1):0;
  if(rk>.01){
    const m=GL.rayMask.mat.uniforms;m.uSun.value.set(sx,sy);m.uAsp.value=W/Hh;m.uK.value=1;
    renderer.setRenderTarget(GL.raysA);renderer.render(GL.rayMask.scene,ocam);
    const b=GL.rayBlur.mat.uniforms;b.uSun.value.set(sx,sy);b.tM.value=GL.raysA.texture;b.uLen.value=.9;
    renderer.setRenderTarget(GL.raysB);renderer.render(GL.rayBlur.scene,ocam);
  }else{renderer.setRenderTarget(GL.raysB);renderer.setClearColor(0,1);renderer.clear()}
  // 5. bloom
  if(GL.bloom&&ATM.bloom>.01){GL.bloom.strength=ATM.bloom;GL.bloom.render(renderer,null,GL.comp,0,false)}
  // 6. hoàn thiện
  const f=GL.final.mat.uniforms;f.uRes.value.set(W*DPR,Hh*DPR);f.uExp.value=ATM.exposure;f.uSat.value=ATM.sat;f.uWarm.value=ATM.warm;f.uVig.value=ATM.vig;f.uRays.value=rk;f.uTime.value=t;f.uTilt.value=ATM.tilt;f.uTiltY.value=ATM.tiltY;f.uFlash.value=ATM.flash;
  renderer.setRenderTarget(null);renderer.render(GL.final.scene,ocam);
}
