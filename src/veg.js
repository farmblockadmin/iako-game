/* =================================================================
   VEG · tỷ lệ thật (1 đơn vị ≈ 11,6 m): mặt đất PBR, cà phê, cau, cỏ
   ================================================================= */
const M2U=1/11.6, SR=3*M2U, SA=1.5*M2U, PM=.045;
const ASSET='assets/';

/* ---------- trường dữ liệu mặt đất (khoảng cách đường, chiều cao, khu) ---------- */
const FB={x0:BOX.x0,z0:BOX.z0,w:BOX.x1-BOX.x0,h:BOX.z1-BOX.z0};
const FNX=LOW?336:480,FNZ=Math.round(FNX*FB.h/FB.w);
let FLD,ZID,FLDa,ZIDa;
function bakeField(){
  const n=FNX*FNZ,f=new Float32Array(n*4),zz=new Uint8Array(n);
  const bb=ZP.map(P=>{let a=1e9,b=1e9,c=-1e9,d=-1e9;P.forEach(q=>{a=Math.min(a,q[0]);b=Math.min(b,q[1]);c=Math.max(c,q[0]);d=Math.max(d,q[1])});return[a,b,c,d]});
  for(let j=0;j<FNZ;j++)for(let i=0;i<FNX;i++){
    const x=FB.x0+(i+.5)/FNX*FB.w,z=FB.z0+(j+.5)/FNZ*FB.h,k=j*FNX+i;
    let dm=9;
    for(let q=0;q<ZP.length;q++){const b=bb[q];const bx=Math.max(b[0]-x,0,x-b[2]),bz=Math.max(b[1]-z,0,z-b[3]);if(bx*bx+bz*bz>dm*dm)continue;const d=dPoly(x,z,ZP[q]);if(d<dm)dm=d}
    const inn=inPoly(x,z,OUT),dout=dPoly(x,z,OUT);
    f[k*4]=dm;f[k*4+1]=inn?dout:-dout;f[k*4+2]=inn?H(x,z):Math.max(TH(x,z),LAKE+.5);f[k*4+3]=fbm2(x*1.25+7.3,z*1.25+2.1);
    const zi=zoneAt(x,z);zz[k]=zi>=0?zi:15;
  }
  FLDa=f;ZIDa=zz;
  const h=new Uint16Array(n*4);for(let i=0;i<n*4;i++)h[i]=THREE.DataUtils.toHalfFloat(f[i]);
  FLD=new THREE.DataTexture(h,FNX,FNZ,THREE.RGBAFormat,THREE.HalfFloatType);FLD.magFilter=FLD.minFilter=THREE.LinearFilter;FLD.needsUpdate=true;
  ZID=new THREE.DataTexture(zz,FNX,FNZ,THREE.RedFormat,THREE.UnsignedByteType);ZID.magFilter=ZID.minFilter=THREE.NearestFilter;ZID.needsUpdate=true;
}
function fldAt(x,z,c){ // bilinear giống GPU
  const fx=(x-FB.x0)/FB.w*FNX-.5,fz=(z-FB.z0)/FB.h*FNZ-.5;const i=clamp(Math.floor(fx),0,FNX-2),j=clamp(Math.floor(fz),0,FNZ-2);
  const tx=clamp(fx-i,0,1),tz=clamp(fz-j,0,1),A=FLDa,k=(j*FNX+i)*4+c,k2=k+FNX*4;
  return lerp(lerp(A[k],A[k+4],tx),lerp(A[k2],A[k2+4],tx),tz);
}
const GU2={uFld:{value:null},uZid:{value:null},uFB:{value:new THREE.Vector4(FB.x0,FB.z0,FB.w,FB.h)},uAng:{value:ZD.map(z=>z.ang)},uRW:{value:RW},uPM:{value:PM},
  uCamP:{value:new THREE.Vector3()},uVegR:{value:0},uShR:{value:40},uFocus:{value:new THREE.Vector3()},uSunW:{value:new THREE.Vector3(0,1,0)},
  uPond:{value:new THREE.Vector4()},uDay:{value:1}};
const PULSE_GLSL=`
float Pi_(float x,float hw){float k=floor(x+.5);return k*2.*hw+clamp(x-k,-hw,hw);}
float pulseF(float x,float hw,float w){w=max(w,.003);return clamp((Pi_(x+w*.5,hw)-Pi_(x-w*.5,hw))/w,0.,1.);}
`;
const GND_GLSL=`
uniform sampler2D uFld,uZid;uniform vec4 uFB;uniform float uAng[10];uniform float uRW,uPM;
#define SR ${SR.toFixed(6)}
#define SA ${SA.toFixed(6)}
struct Gnd{float zid,dRoad,dOut,has,u,v,fu,fv,gp,hy;vec2 dr,pr;};
Gnd gnd(vec2 p){Gnd g;vec2 q=(p-uFB.xy)/uFB.zw;vec4 F=texture2D(uFld,q);g.zid=floor(texture2D(uZid,q).r*255.+.5);g.dRoad=F.r;g.dOut=F.g;g.gp=F.a;g.hy=F.b;
  float a=g.zid<9.5?uAng[int(g.zid)]:0.;g.dr=vec2(cos(a),sin(a));g.pr=vec2(-g.dr.y,g.dr.x);
  g.u=dot(p,g.dr)/SA;g.v=dot(p,g.pr)/SR;g.fu=fract(g.u)-.5;g.fv=fract(g.v)-.5;
  g.has=(g.zid<7.5?1.:0.)*step(uRW+uPM,g.dRoad);return g;}
`+PULSE_GLSL;

/* ---------- texture PBR (màu+nhám, pháp tuyến+AO) ---------- */
const TXL=new THREE.TextureLoader();
function ptx(name){const c=TXL.load(ASSET+'tex/'+name+'_c.webp'),n=TXL.load(ASSET+'tex/'+name+'_n.webp');
  [c,n].forEach(t=>{t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8});c.colorSpace=THREE.SRGBColorSpace;return{c,n}}

/* ---------- mặt đất ---------- */
let ground;
function buildGround(){
  bakeField();GU2.uFld.value=FLD;GU2.uZid.value=ZID;
  const pd=POND;GU2.uPond.value.set(PC[0],PC[1],pd.w/2+.16,pd.h/2+.16);
  const step=LOW?.3:.2;
  const nx=Math.ceil((BOX.x1-BOX.x0)/step),nz=Math.ceil((BOX.z1-BOX.z0)/step),N=(nx+1)*(nz+1);
  const pos=new Float32Array(N*3),inn=new Float32Array(N);
  for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){const k=j*(nx+1)+i,x=BOX.x0+i*step,z=BOX.z0+j*step;const isIn=inPoly(x,z,OUT);
    pos[k*3]=x;pos[k*3+1]=isIn?H(x,z):Math.max(TH(x,z),LAKE+.5);pos[k*3+2]=z;inn[k]=isIn?1:0}
  const idx=[];for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;idx.push(a,c,b,b,c,d)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('aIn',new THREE.BufferAttribute(inn,1));g.setIndex(idx);g.computeVertexNormals();
  const T={soil:ptx('soil'),road:ptx('road'),grass:ptx('grass'),mulch:ptx('mulch'),dry:ptx('dry')};
  const m=new THREE.MeshStandardMaterial({roughness:.95,metalness:0});
  m.onBeforeCompile=sh=>{
    Object.assign(sh.uniforms,U,GU2);sh.uniforms.uDry=GU.uDry;
    for(const k in T){sh.uniforms['t_'+k+'C']={value:T[k].c};sh.uniforms['t_'+k+'N']={value:T[k].n}}
    sh.vertexShader='attribute float aIn;varying float vIn;varying vec3 vW;varying vec3 vNw;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvIn=aIn;vW=(modelMatrix*vec4(transformed,1.)).xyz;vNw=normal;');
    sh.fragmentShader=`uniform sampler2D t_soilC,t_soilN,t_roadC,t_roadN,t_grassC,t_grassN,t_mulchC,t_mulchN,t_dryC,t_dryN;
      uniform vec3 uCamP,uFocus,uSunW;uniform float uVegR,uShR,uDry,uRainV,uTime,uDay;uniform vec4 uPond;varying float vIn;varying vec3 vW,vNw;\n`+NOISE_GLSL+GND_GLSL+DATA_GLSL+`
      float hd2(vec2 q){return fract(52.9829189*fract(dot(q,vec2(.06711056,.00583715))));}
      vec4 smp(sampler2D t,vec2 uv,float b){return mix(texture2D(t,uv),texture2D(t,uv*.29+vec2(.37,.71)),b);}
      `+sh.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );',`
      vec2 p=vW.xz;
      {float eb=min(min(p.x-uFB.x,uFB.x+uFB.z-p.x),min(p.y-uFB.y,uFB.y+uFB.w-p.y));float hd=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));if(hd>smoothstep(.3,4.,eb))discard;}
      {vec2 dq=abs(p-uPond.xy)-uPond.zw;if(max(dq.x,dq.y)<0.)discard;}
      Gnd g=gnd(p);
      ${DEM?'if(g.dOut<-1.4+hd2(gl_FragCoord.xy)*1.)discard;':''}
      float camD=distance(uCamP,vW);
      vec2 fwp=fwidth(p)*11.6;float pxm=max(fwp.x,fwp.y);
      float n1=fbm(p*.55),n2=vn(p*4.7),n3=vn(p*17.),n4=fbm(p*2.3+7.);
      float detail=1.-smoothstep(.1,.45,pxm);
      float isC=g.zid<7.5?1.:0.,isBare=abs(g.zid-8.)<.5?1.:0.,isHQ=abs(g.zid-9.)<.5?1.:0.;
      float eN=((vn(p*5.)-.5)*.05+(vn(p*23.)-.5)*.014)*detail;
      float road=1.-smoothstep(uRW-.008-pxm*.004,uRW+.008+pxm*.004,g.dRoad+eN);
      float wv=fwidth(g.v),wu=fwidth(g.u);
      // hàng & bồn (m)
      float dpm=length(vec2(g.fu*1.5,g.fv*3.));
      float strip=g.has*pulseF(g.v-.5,.2+.05*(n2-.5),wv);
      float bR=.44+(n3-.5)*.07;
      float basin=g.has*(1.-smoothstep(bR-.05,bR+.02,dpm))*detail;
      float rim=g.has*smoothstep(bR-.02,bR+.03,dpm)*(1.-smoothstep(bR+.05,bR+.2,dpm))*detail;
      float gp=.55+.45*smoothstep(.36,.6,g.gp+.08*(n2-.5));
      float inter=isC*(1.-road)*(1.-strip);
      float wS=0.,wR=road,wG=0.,wM=0.,wD=0.;
      wM=basin*(1.-road)*.8;
      wS=(strip*(1.-basin)+basin*.2+inter*(1.-gp))*(1.-road)*isC;
      wG=inter*gp;
      float bareG=smoothstep(.5,.7,g.gp)*.65;
      wD=isBare*(1.-road)*(1.-bareG);wG+=isBare*(1.-road)*bareG;
      float lawn=(1.-isC-isBare)*(1.-road);
      float lp=smoothstep(.66,.8,g.gp)*(1.-isHQ*.6);
      wG+=lawn*(1.-lp);wS+=lawn*lp;
      // cỏ ven đường
      float verge=road*smoothstep(uRW-.05,uRW,g.dRoad+eN*2.);
      float mid=road*(1.-smoothstep(.012,.03,abs(g.dRoad-uRW*.0)+eN))*0.;
      float cstrip=road*(1.-smoothstep(uRW*.1,uRW*.2,g.dRoad+eN*.5));wG+=cstrip*.8;wR-=cstrip*.8;
      float vg=road*smoothstep(uRW*.86,uRW*.98,g.dRoad+eN);wG+=vg*.7;wR-=vg*.7;
      float ws=wS+wR+wG+wM+wD+1e-4;wS/=ws;wR/=ws;wG/=ws;wM/=ws;wD/=ws;
      float b=smoothstep(.3,.7,n1);
      vec3 col=vec3(0.);vec2 nt=vec2(0.);float ao=0.,rgh=0.;
      vec2 uvS=p*4.46,uvR=p*3.9,uvG=p*5.8,uvM=p*7.7;
      if(wS>.002){vec4 c=smp(t_soilC,uvS,b),nn=smp(t_soilN,uvS,b);col+=c.rgb*wS;rgh+=c.a*wS;nt+=(nn.xy*2.-1.)*wS;ao+=nn.b*wS;}
      if(wR>.002){vec4 c=smp(t_roadC,uvR,b),nn=smp(t_roadN,uvR,b);
        float trk=smoothstep(.032,.01,abs(g.dRoad-uRW*.4)+eN*.6);
        c.rgb*=1.-trk*.18;c.a=mix(c.a,c.a*.8,trk);nn.xy=mix(nn.xy,vec2(.5),trk*.5);
        col+=c.rgb*wR;rgh+=c.a*wR;nt+=(nn.xy*2.-1.)*wR;ao+=nn.b*wR;}
      if(wG>.002){vec4 c=smp(t_grassC,uvG,b),nn=smp(t_grassN,uvG,b);
        float gl=dot(c.rgb,vec3(.3,.6,.1));c.rgb=mix(c.rgb,gl*vec3(.55,1.,.36),.75)*mix(.62,.92,n2)*(.72+.5*smoothstep(.2,.8,n1));
        c.rgb=mix(c.rgb,c.rgb*vec3(1.25,1.05,.55)+vec3(.02,.015,0.),uDry*1.6);
        col+=c.rgb*wG;rgh+=c.a*wG;nt+=(nn.xy*2.-1.)*wG;ao+=nn.b*wG;}
      if(wM>.002){vec4 c=smp(t_mulchC,uvM,b),nn=smp(t_mulchN,uvM,b);c.rgb*=vec3(.8,.72,.6);col+=c.rgb*wM;rgh+=c.a*wM;nt+=(nn.xy*2.-1.)*wM;ao+=nn.b*wM;}
      if(wD>.002){vec4 c=smp(t_dryC,uvS,b),nn=smp(t_dryN,uvS,b);col+=c.rgb*wD;rgh+=c.a*wD;nt+=(nn.xy*2.-1.)*wD;ao+=nn.b*wD;}
      col*=.82+.36*n1;
      // đất trong bồn ẩm, mép bồn sáng
      col*=1.-basin*.28;col*=1.+rim*.12;
      // ống tưới nhỏ chạy dọc hàng, nối các béc sát gốc
      {float pv=abs(g.fv)*SR;float fw=fwidth(pv)*1.2+1e-5;float pipe=(1.-smoothstep(.0011,.0011+fw,pv))*g.has*(1.-road)*(1.-smoothstep(1.5,3.5,camD));col=mix(col,vec3(.018,.02,.02),pipe*.85);}
      // mùa khô
      col=mix(col,col*vec3(1.12,1.04,.92)+vec3(.012,.008,0.),uDry*(wS+wR+wD));
      col*=1.-uRainV*.3;
      // tán cây ở xa (thay cây 3D)
      float cw=uVegR>0.?smoothstep(uVegR*.8,uVegR,camD):1.;
      float hv=.19,hu=.38;
      float cov=g.has*pulseF(g.v-.5,hv,wv)*pulseF(g.u-.5,hu,wu);
      vec3 sd=normalize(uSunW);vec2 off=sd.xz/max(sd.y,.12)*.06;off*=min(1.,.25/max(length(off),.001));
      float scov=g.has*pulseF(g.v-.5+dot(off,g.pr)/SR,hv*1.15,wv+.05)*pulseF(g.u-.5+dot(off,g.dr)/SA,hu*1.1,wu+.05);
      float fsw=smoothstep(uShR*.75,uShR,distance(p,uFocus.xz));
      col*=1.-scov*.55*fsw*uDay*(1.-cov*cw);
      vec3 can=mix(vec3(.03,.07,.018),vec3(.06,.12,.03),n3)*(1.+.25*n1);
      col=mix(col,can,cov*cw);
      float gRough=clamp(mix(rgh,.8,cov*cw)-uRainV*.3,.3,1.);
      float gAO=mix(1.,ao,.65);
      // pháp tuyến
      vec3 Nw=normalize(vNw);
      vec2 rad=normalize(g.fu*SA*g.dr+g.fv*SR*g.pr+1e-5);
      float wall=g.has*smoothstep(bR-.2,bR-.06,dpm)*(1.-smoothstep(bR-.02,bR+.02,dpm))*detail;
      vec2 bn=-rad*wall*.55+rad*rim*.25;
      vec3 Np=normalize(Nw+vec3(nt.x+bn.x,0.,nt.y+bn.y)*(1.-cov*cw)*mix(1.,.35,smoothstep(.2,1.5,pxm)));
      col=dataTint(col,vW,1.);
      vec4 diffuseColor=vec4(col*gAO,1.);`).replace('#include <normal_fragment_maps>','normal=normalize((viewMatrix*vec4(Np,0.)).xyz);')
      .replace('#include <roughnessmap_fragment>','float roughnessFactor=gRough;');
  };
  ground=new THREE.Mesh(g,m);ground.receiveShadow=true;ground.name='ground';scene.add(ground);
}

/* ---------- bố trí cây theo lưới thật ---------- */
let COF=null,ARE=null,NCOF=0,NARE=0;
function layoutPlants(){
  const cf=[],ar=[];
  for(let zi=0;zi<NZ;zi++){
    const P=ZP[zi],a=ZD[zi].ang,dr=[Math.cos(a),Math.sin(a)],pr=[-dr[1],dr[0]];
    let u0=1e9,u1=-1e9,v0=1e9,v1=-1e9;P.forEach(q=>{const u=(q[0]*dr[0]+q[1]*dr[1])/SA,v=(q[0]*pr[0]+q[1]*pr[1])/SR;u0=Math.min(u0,u);u1=Math.max(u1,u);v0=Math.min(v0,v);v1=Math.max(v1,v)});
    for(let k=Math.floor(v0);k<=Math.ceil(v1);k++)for(let j=Math.floor(u0);j<=Math.ceil(u1);j++){
      const u=(j+.5)*SA,v=(k+.5)*SR,x=u*dr[0]+v*pr[0],z=u*dr[1]+v*pr[1];
      if(!inPoly(x,z,P)||fldAt(x,z,0)<RW+PM+.004)continue;
      const jx=(rnd()-.5)*.004,jz=(rnd()-.5)*.004;
      cf.push(x+jx,H(x+jx,z+jz),z+jz,rnd());
      if(k%2===0&&((j+(k%4===0?0:3))%6+6)%6===1){const v2=(k+1)*SR,x2=u*dr[0]+v2*pr[0],z2=u*dr[1]+v2*pr[1];
        if(inPoly(x2,z2,P)&&fldAt(x2,z2,0)>RW+PM+.03)ar.push(x2,H(x2,z2),z2,rnd())}
    }
  }
  COF=new Float32Array(cf);ARE=new Float32Array(ar);NCOF=cf.length/4;NARE=ar.length/4;
  STATS.coffee=NCOF;STATS.palm=NARE;
}

/* ---------- hình học: tiện ích ---------- */
function srng(s){let a=s*9301+49297;return()=>{a=(a*16807)%2147483647;return(a-1)/2147483646}}
class GB{ // bộ gom hình học (position, normal, color, uv)
  constructor(){this.p=[];this.n=[];this.c=[];this.u=[];this.i=[];this.v=0}
  add(P,N,C,UV,I){const o=this.v;for(let k=0;k<P.length;k++){this.p.push(P[k][0],P[k][1],P[k][2]);this.n.push(N?N[k][0]:0,N?N[k][1]:1,N?N[k][2]:0);this.c.push(C[k][0],C[k][1],C[k][2]);this.u.push(UV?UV[k][0]:0,UV?UV[k][1]:0)}
    I.forEach(q=>this.i.push(q+o));this.v+=P.length}
  geo(computeN){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(this.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(this.n,3));
    g.setAttribute('color',new THREE.Float32BufferAttribute(this.c,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(this.u,2));g.setIndex(this.i);if(computeN)g.computeVertexNormals();return g}
}
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
// ống (thân/cành) theo đường cong
function tube(gb,pts,r0,r1,sides,col,colTop){
  const n=pts.length;const P=[],N=[],C=[],I=[];let prevT=null;
  for(let i=0;i<n;i++){const t=i/(n-1);const a=pts[Math.max(0,i-1)],b=pts[Math.min(n-1,i+1)];const T=b.clone().sub(a).normalize();
    let ref=Math.abs(T.y)<.95?V3(0,1,0):V3(1,0,0);const X=new THREE.Vector3().crossVectors(T,ref).normalize(),Y=new THREE.Vector3().crossVectors(X,T);
    const r=lerp(r0,r1,t);const cc=colTop?mixc(col,colTop,t):col;
    for(let s=0;s<sides;s++){const an=s/sides*Math.PI*2;const d=X.clone().multiplyScalar(Math.cos(an)).addScaledVector(Y,Math.sin(an));P.push([pts[i].x+d.x*r,pts[i].y+d.y*r,pts[i].z+d.z*r]);N.push([d.x,d.y,d.z]);C.push(cc)}}
  for(let i=0;i<n-1;i++)for(let s=0;s<sides;s++){const a=i*sides+s,b=i*sides+(s+1)%sides,c=a+sides,d=b+sides;I.push(a,c,b,b,c,d)}
  gb.add(P,N,C,null,I);
}
// lá: gốc tại o, trục lá D, pháp tuyến mặt trên Up
function leaf(gb,o,D,Up,L,Wd,col,seg,fold,droop,wave,ph){
  D=D.clone().normalize();const S=new THREE.Vector3().crossVectors(D,Up).normalize();const Nn=new THREE.Vector3().crossVectors(S,D).normalize();
  const P=[],C=[],UV=[],I=[];
  for(let i=0;i<=seg;i++){const t=i/seg;const w=Wd*Math.pow(Math.sin(Math.PI*Math.pow(t,.78)),.62)*(1-.12*t)+(i===0?Wd*.05:0);
    const base=o.clone().addScaledVector(D,t*L).addScaledVector(Nn,-droop*t*t*L);
    const wv=Math.sin(t*9.+ph)*wave*w;
    P.push(base.clone().addScaledVector(S,w).addScaledVector(Nn,fold*w+wv).toArray());
    P.push(base.toArray());
    P.push(base.clone().addScaledVector(S,-w).addScaledVector(Nn,fold*w-wv).toArray());
    const cc=col;C.push(cc,mixc(cc,[cc[0]*1.25,cc[1]*1.2,cc[2]*.9],.5),cc);UV.push([t,1],[t,0],[t,-1]);
    if(i<seg){const a=i*3;I.push(a,a+3,a+1,a+1,a+3,a+4,a+1,a+4,a+2,a+2,a+4,a+5)}}
  // pháp tuyến: tính sau theo mặt
  gb.add(P,null,C,UV,I);
}

/* ---------- cây cà phê vối (Robusta) non ~1,1 m ---------- */
function coffeePlant(seed,lod){
  const r=srng(seed),gb=new GB();
  const Hs=.92+r()*.28;
  const DK=lin('#163212'),MD=lin('#23491A'),YG=lin('#5A8A2A'),BR=lin('#6E7A30'),BARK=lin('#5E4C38');
  // thân
  const stem=[];for(let i=0;i<=6;i++){const t=i/6;stem.push(V3(Math.sin(t*2.1+seed)*.025*t,t*Hs,Math.cos(t*1.7+seed)*.02*t))}
  if(lod<2)tube(gb,stem,.014,.005,lod===0?5:3,BARK,lin('#5B6B2E'));
  const stemAt=y=>{const t=clamp(y/Hs,0,1);return V3(Math.sin(t*2.1+seed)*.025*t,y,Math.cos(t*1.7+seed)*.02*t)};
  const tiers=[];for(let y=.17;y<Hs-.05;y+=.074+r()*.012)tiers.push(y);
  tiers.forEach((y,ti)=>{
    const yaw0=ti*Math.PI/2+(r()-.5)*.5;
    for(let s=0;s<2;s++){
      const a=yaw0+s*Math.PI+(r()-.5)*.3,dir=V3(Math.cos(a),0,Math.sin(a));
      const rel=(y-.17)/(Hs-.2);const Lb=.07+.42*Math.pow(1-rel,1.1)*(.85+r()*.3);
      const o=stemAt(y);const lift=.18+.15*r(),sag=.55+.4*r();
      const bp=l=>o.clone().addScaledVector(dir,l).add(V3(0,lift*l-sag*l*l,0));
      if(lod===0){const pts=[];for(let i=0;i<=4;i++)pts.push(bp(i/4*Lb));tube(gb,pts,.0045,.002,3,BARK,lin('#4D6A25'))}
      const step=lod===0?.052:.09;let ni=0;
      for(let l=.035;l<Lb+.01;l+=step,ni++){
        const p=bp(Math.min(l,Lb));const tan=bp(Math.min(l+.01,Lb+.01)).sub(bp(Math.max(l-.01,0))).normalize();
        const age=1-l/Math.max(Lb,.05);const young=l>Lb-.06;
        const L=(lod===0?1:1.22)*(.12+.1*age+.04*r())*(young?.6:1);const Wd=L*(.4+.06*r());
        const col0=young?mixc(YG,BR,r()*.5):mixc(DK,MD,r()*.8);
        const ao=.55+.45*clamp(l/.35,0,1)*(.65+.35*rel);const col=col0.map(v=>v*ao*(.92+.16*r()));
        for(const sd of[-1,1]){
          const side=new THREE.Vector3().crossVectors(tan,V3(0,1,0)).normalize().multiplyScalar(sd);
          const beta=(lod===0?.95:1.05)+(r()-.5)*.35;
          const D=tan.clone().multiplyScalar(Math.cos(beta)).addScaledVector(side,Math.sin(beta)).add(V3(0,-.22-.35*r(),0)).normalize();
          const Up=V3((r()-.5)*.3,1,(r()-.5)*.3).normalize();
          leaf(gb,p,D,Up,L,Wd/2,col,lod===0?5:2,.16+.1*r(),.3+.3*r(),lod===0?.22:0,r()*6);
        }
      }
    }
  });
  // ngọn: lá non dựng
  const top=stemAt(Hs);
  for(let k=0;k<(lod===0?3:2);k++){const a=k*2.1+r(),D=V3(Math.cos(a)*.5,1,Math.sin(a)*.5).normalize();
    leaf(gb,top.clone().add(V3(0,-.03*k,0)),D,V3(Math.cos(a),.2,Math.sin(a)).negate().normalize(),.09+.04*r(),.022,mixc(YG,BR,.3),lod===0?3:2,.25,.1,0,0)}
  const g=gb.geo(true);
  return g;
}
function coffeeBlob(seed){
  const g=new THREE.IcosahedronGeometry(.5,1);const p=g.attributes.position;const nr=new Float32Array(p.count*3),c=[];
  const DK=lin('#1E3F15'),MD=lin('#3B6A22');
  for(let i=0;i<p.count;i++){let x=p.getX(i),y=p.getY(i),z=p.getZ(i);const hs=Math.sin(x*127.1+y*311.7+z*74.7+seed)*43758.5453;const k=.84+.32*(hs-Math.floor(hs));
    const nx=x,ny=y,nz=z;x*=k*1.18;z*=k*1.18;y=y*k*.95+.56;if(y<.2)y=.2+(y-.2)*.3;p.setXYZ(i,x,y,z);
    const l=Math.hypot(nx,ny*1.2,nz)||1;nr[i*3]=nx/l;nr[i*3+1]=ny*1.2/l;nr[i*3+2]=nz/l;
    const t=clamp((y-.2)/.9,0,1);c.push(...mixc(DK,MD,t*.8+.2*(ny/.5*.5+.5)))}
  g.setAttribute('normal',new THREE.BufferAttribute(nr,3));g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));
  g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(p.count*2),2));
  return g;
}

/* ---------- cau (Areca catechu) non ~4–5 m ---------- */
function arecaPlant(seed,lod){
  const r=srng(seed),gb=new GB();
  const Ht=3.4+r()*1.4,lean=V3((r()-.5)*.12,1,(r()-.5)*.12).normalize();
  const TR=lin('#7E7C72'),TRt=lin('#6F7A5E'),CS=lin('#4E7E2A'),F0=lin('#1F4416'),F1=lin('#38661F'),FY=lin('#7A8436');
  const tp=t=>V3(lean.x*t*Ht+Math.sin(t*2.+seed)*.05*t,t*Ht,lean.z*t*Ht+Math.cos(t*1.6+seed)*.04*t);
  const tr=[];const ns=lod===0?16:lod===1?4:2;for(let i=0;i<=ns;i++)tr.push(tp(i/ns));
  tube(gb,tr,lod===2?.1:.085,.065,lod===0?8:lod===1?5:3,TR,TRt);
  const top=tp(1);const cs=[top,top.clone().add(V3(0,.42,0)),top.clone().add(V3(0,.82,0))];
  tube(gb,cs,.078,.06,lod===0?8:lod===1?5:3,CS,lin('#6E9E35'));
  const crown=top.clone().add(V3(0,.82,0));
  const NF=lod===2?5:9;
  for(let f=0;f<NF;f++){
    const a=f*2.39996+r()*.3,h=V3(Math.cos(a),0,Math.sin(a));
    const age=f/(NF-1);const pitch=lerp(1.2,-.05,age)+(r()-.5)*.2;const Lf=lerp(1.9,2.5,r())*(age<.15?.7:1);
    const curv=lerp(.25,.55,age);
    const fp=s=>crown.clone().addScaledVector(h,Math.cos(pitch)*s*Lf).add(V3(0,Math.sin(pitch)*s*Lf-curv*s*s*Lf,0));
    const fcol=(age>.85?mixc(F1,FY,.5):mixc(F0,F1,.3+.4*r())).map(v=>v*(lod===2?.7:1));
    // cuống & sống lá
    if(lod<2){const pts=[];for(let i=0;i<=6;i++)pts.push(fp(i/6));tube(gb,pts,.02,.006,3,lin('#6E8F38'),fcol)}
    const nl=lod===0?30:lod===1?9:0;
    if(lod===2){ // dải chữ V thô
      const P=[],C=[],I=[],UV=[];const seg=3;
      for(let i=0;i<=seg;i++){const s=.12+i/seg*.88;const c=fp(s);const tan=fp(Math.min(s+.02,1)).sub(fp(s-.02)).normalize();const sd=new THREE.Vector3().crossVectors(tan,V3(0,1,0)).normalize();
        const w=.45*Math.sin(Math.PI*Math.min(1,s*1.1))+.05;P.push(c.clone().addScaledVector(sd,w).add(V3(0,-w*.6,0)).toArray(),c.toArray(),c.clone().addScaledVector(sd,-w).add(V3(0,-w*.6,0)).toArray());C.push(fcol,fcol,fcol);UV.push([s,1],[s,0],[s,1]);
        if(i<seg){const o=i*3;I.push(o,o+3,o+1,o+1,o+3,o+4,o+1,o+4,o+2,o+2,o+4,o+5)}}
      gb.add(P,null,C,UV,I);continue}
    for(let i=0;i<nl;i++){const s=.14+(i+.5)/nl*.84;const c=fp(s);const tan=fp(Math.min(s+.02,1)).sub(fp(s-.02)).normalize();
      for(const sd of[-1,1]){const side=new THREE.Vector3().crossVectors(tan,V3(0,1,0)).normalize().multiplyScalar(sd);
        const ll=(.26+.5*Math.sin(Math.PI*Math.min(1,s*1.05)))*(lod===0?1:1.12);
        const D=tan.clone().multiplyScalar(.6).addScaledVector(side,.75).add(V3(0,-.7-.5*s-r()*.25,0)).normalize();
        const lc=fcol.map(v=>v*(.85+.3*r()));
        leaf(gb,c,D,V3(0,1,0).addScaledVector(side,-.4).normalize(),ll,lod===0?.03:.045,lc,lod===0?3:2,.2,.2,0,0)}}
  }
  return gb.geo(true);
}

/* ---------- cây bóng mát / cây rừng (tán nhiều cụm) ---------- */
function treePlant(seed,lod){
  const r=srng(seed),gb=new GB();
  const Ht=10+r()*7,crownR=4+r()*2.4,crownY=Ht*.6,bole=Ht*.4;
  const BK=lin('#4E4034'),G0=lin('#1B3812'),G1=lin('#3E6A22'),G2=lin('#5C7F2C');
  const lean=V3((r()-.5)*.3,1,(r()-.5)*.3).normalize();
  const tp=t=>V3(lean.x*t*bole+Math.sin(t*3+seed)*.15*t,t*bole,lean.z*t*bole+Math.cos(t*2+seed)*.15*t);
  const tr=[];for(let i=0;i<=(lod===0?6:2);i++)tr.push(tp(i/(lod===0?6:2)));tube(gb,tr,.32,.2,lod===0?7:4,BK,lin('#5A4A3C'));
  const top=tp(1);const nl=lod===0?4:lod===1?3:0;
  const tips=[];
  for(let k=0;k<4;k++){const a=k*1.7+r(),d=V3(Math.cos(a)*.7,1,Math.sin(a)*.7).normalize();const L=crownY-bole+crownR*.4;
    const end=top.clone().addScaledVector(d,L);tips.push(end);if(k<nl)tube(gb,[top,top.clone().addScaledVector(d,L*.5).add(V3(0,.3,0)),end],.18,.06,lod===0?5:3,BK,BK)}
  const NC=lod===0?28:lod===1?12:5,det=lod===0?1:0;
  for(let c=0;c<NC;c++){
    const u=r()*6.283,v=r();const rr=crownR*(.45+.55*Math.sqrt(r()));
    const cy=crownY+(v-.35)*crownR*1.05;const fl=1-Math.pow(Math.abs(v-.4)*1.4,2)*.5;
    const cc=V3(Math.cos(u)*rr*fl+top.x,cy+(lod===2?crownR*.15:0),Math.sin(u)*rr*fl+top.z);
    const rad=(lod===0?1.75:lod===1?2.3:3.4)*(.75+.5*r())*(c===0?1.3:1);
    const g=new THREE.IcosahedronGeometry(rad,det);const p=g.attributes.position;
    const P=[],N=[],C=[],I=[];
    const cl=mixc(G0,r()<.3?G2:G1,.35+.45*r());
    for(let i=0;i<p.count;i++){let x=p.getX(i),y=p.getY(i),z=p.getZ(i);const l=Math.hypot(x,y,z);
      const hs=Math.sin(x*12.9+y*78.2+z*37.7+seed+c)*43758.5;const k=1+(hs-Math.floor(hs)-.5)*.5;
      x*=k;y*=k*.85;z*=k;if(y<-rad*.35)y=-rad*.35+(y+rad*.35)*.3;
      const wp=V3(cc.x+x,cc.y+y,cc.z+z);P.push(wp.toArray());N.push([x/l,y/l,z/l]);
      const shade=clamp(.5+.5*(y/rad)+.25*((Math.hypot(wp.x-top.x,wp.z-top.z))/crownR-.5),0,1);
      C.push(cl.map(q=>q*(.45+.75*shade)))}
    for(let i=0;i<p.count;i+=3)I.push(i,i+1,i+2);
    gb.add(P,N,C,null,I);
  }
  return gb.geo(false);
}

/* ---------- vật liệu thực vật (instancing tự viết + bóng đổ) ---------- */
const VEG_VH=`attribute vec4 iA;attribute vec4 iB;uniform float uTime,uWind,uHt,uSw,uFl;uniform vec2 uWD;
varying float vSeed,vFade,vMode;varying vec3 vLp;varying vec2 vUv2;
vec3 rotY(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z);}
`;
const VEG_VN=`vec3 objectNormal=rotY(vec3(normal),iB.x);
#ifdef USE_TANGENT
vec3 objectTangent=vec3(tangent.xyz);
#endif`;
const VEG_VP=`vec3 lp=position;vLp=lp;vSeed=iB.y;vFade=iB.z;vMode=iB.w;vUv2=uv;
float hn=clamp(lp.y/uHt,0.,1.);
float ph=uTime*(1.2+uWind*1.4)+iA.x*37.+iA.z*23.;
float gust=.55+.45*sin(uTime*.7-dot(iA.xz,uWD)*9.);
vec3 sw=vec3(uWD.x,0.,uWD.y)*(uWind*gust*(.65+.35*sin(ph)))*hn*hn*uSw*uHt+vec3(sin(ph*1.3),0.,cos(ph*1.1))*uWind*.15*hn*uSw*uHt;
float fl=uv.x*uFl*(.25+uWind*(.6+gust))*sin(uTime*(6.+iB.y*3.)+lp.x*41.+lp.z*37.+lp.y*23.);
vec3 transformed=rotY(lp+sw+vec3(0.,fl,0.)+vec3(sin(uTime*5.3+lp.y*30.),0.,cos(uTime*4.7+lp.x*30.))*fl*.5,iB.x)*iA.w+iA.xyz;`;
function vegMat(o){
  const m=new THREE.MeshStandardMaterial({vertexColors:true,roughness:o.rough||.45,metalness:0,side:THREE.DoubleSide});
  const VU={uHt:{value:o.ht},uSw:{value:o.sw},uFl:{value:o.fl},uTrans:{value:o.trans},uGloss:{value:o.gloss||0},uRing:{value:o.ring||0},uNz:{value:o.nz||0}};
  m.onBeforeCompile=sh=>{
    Object.assign(sh.uniforms,U,VU);
    sh.vertexShader=VEG_VH+sh.vertexShader.replace('#include <beginnormal_vertex>',VEG_VN).replace('#include <begin_vertex>',VEG_VP);
    sh.fragmentShader='uniform float uTrans,uGloss,uTime,uRing,uNz;varying float vSeed,vFade,vMode;varying vec3 vLp;varying vec2 vUv2;\n'+NOISE_GLSL+sh.fragmentShader
     .replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
      {float ign=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));if(vMode<.5){if(ign>vFade)discard;}else{if(ign<vFade)discard;}}`)
     .replace('#include <color_fragment>',`#include <color_fragment>
      float sv=fract(vSeed*13.7);diffuseColor.rgb*=mix(vec3(.84,.9,.8),vec3(1.1,1.06,1.08),sv);
      float vt=vUv2.x,vs=vUv2.y;
      float isLeaf=step(.001,vt);
      float mr=smoothstep(.07,.0,abs(vs))*(1.-vt*.6)*isLeaf;
      float lv=abs(fract(vt*7.-abs(vs)*1.3)-.5);float vein=(1.-smoothstep(.02,.06,lv))*smoothstep(.95,.3,abs(vs))*isLeaf*uGloss;
      diffuseColor.rgb*=1.+mr*.45*uGloss+vein*.12;
      diffuseColor.rgb*=mix(1.,.82,smoothstep(.55,1.,abs(vs))*isLeaf*uGloss);
      diffuseColor.rgb*=1.-(1.-isLeaf)*uRing*(1.-smoothstep(.04,.12,abs(fract(vLp.y*6.5)-.5)))*.35;
      if(!gl_FrontFacing){float l=dot(diffuseColor.rgb,vec3(.3,.6,.1));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(l)*vec3(1.05,1.25,.8),.4)*1.3;}`)
     .replace('#include <roughnessmap_fragment>','float roughnessFactor=gl_FrontFacing?roughness:min(1.,roughness+.3);')
     .replace('#include <normal_fragment_maps>',`if(uNz>0.){vec3 q=vLp*uNz;float a1=vn(q.xy+q.z*1.7),a2=vn(q.yz*1.1+3.1),a3=vn(q.zx*.9+7.3),b1=vn(q.xz*2.3+q.y);
        normal=normalize(normal+(vec3(a1,a2,a3)-.5)*1.6);diffuseColor.rgb*=.55+.8*smoothstep(.15,.85,b1*.6+a1*.4);}`)
     .replace('#include <lights_fragment_begin>',`#include <lights_fragment_begin>
      #if NUM_DIR_LIGHTS>0
      {float bl=max(-dot(geometryNormal,directLight.direction),0.);float fw=pow(max(dot(-geometryViewDir,directLight.direction),0.),4.);
       reflectedLight.directDiffuse+=directLight.color*diffuseColor.rgb*vec3(1.,1.18,.5)*uTrans*max(isLeaf,step(.001,uNz))*(bl*.55+fw*(.35+bl));}
      #endif`);
  };
  const d=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});
  d.onBeforeCompile=sh=>{Object.assign(sh.uniforms,U,VU);sh.vertexShader=VEG_VH+sh.vertexShader.replace('#include <begin_vertex>',VEG_VP)};
  return{m,d};
}
class VegLayer{
  constructor(geo,mats,cap,shadow){
    const ig=new THREE.InstancedBufferGeometry();ig.index=geo.index;for(const k in geo.attributes)ig.setAttribute(k,geo.attributes[k]);
    this.a=new Float32Array(cap*4);this.b=new Float32Array(cap*4);
    this.A=new THREE.InstancedBufferAttribute(this.a,4);this.A.setUsage(THREE.DynamicDrawUsage);
    this.B=new THREE.InstancedBufferAttribute(this.b,4);this.B.setUsage(THREE.DynamicDrawUsage);
    ig.setAttribute('iA',this.A);ig.setAttribute('iB',this.B);ig.instanceCount=0;this.g=ig;
    this.mesh=new THREE.Mesh(ig,mats.m);this.mesh.frustumCulled=false;this.mesh.customDepthMaterial=mats.d;this.mesh.castShadow=!!shadow;this.mesh.receiveShadow=true;
    this.n=0;this.cap=cap;scene.add(this.mesh);
  }
  push(x,y,z,s,rot,seed,fade,mode){if(this.n>=this.cap)return;const k=this.n*4;const a=this.a,b=this.b;a[k]=x;a[k+1]=y;a[k+2]=z;a[k+3]=s;b[k]=rot;b[k+1]=seed;b[k+2]=fade;b[k+3]=mode;this.n++}
  commit(){const n=this.n;this.g.instanceCount=n;this.mesh.visible=n>0;
    for(const A of[this.A,this.B]){A.clearUpdateRanges();A.addUpdateRange(0,Math.max(4,n*4));A.needsUpdate=true}}
}


/* ---------- dựng toàn bộ thực vật ---------- */
const VEG={layers:[],on:true};
function placeVeg(){
  DEV.forEach(d=>{const w=toW(d.uv);d.x=w[0];d.z=w[1];d.y=H(d.x,d.z);d.zone=zoneAt(d.x,d.z)});
  layoutPlants();
  const cap=LOW?{c0:90,c1:1600,c2:16000,a0:24,a1:500,a2:5000}:{c0:320,c1:7000,c2:52000,a0:70,a1:1400,a2:9000};
  const cm=vegMat({ht:1.1,sw:.06,fl:.012,trans:.4,rough:.48,gloss:1});
  const cmB=vegMat({ht:1.1,sw:.05,fl:0,trans:.35,rough:.6,gloss:0});
  const am=vegMat({ht:5.,sw:.05,fl:.05,trans:.42,rough:.5,gloss:.6,ring:1});
  VEG.c0=[new VegLayer(coffeePlant(11,0),cm,cap.c0,true),new VegLayer(coffeePlant(29,0),cm,cap.c0,true)];
  VEG.c1=[new VegLayer(coffeePlant(11,1),cm,cap.c1,true),new VegLayer(coffeePlant(29,1),cm,cap.c1,true)];
  VEG.c2=[new VegLayer(coffeeBlob(5),cmB,cap.c2,false)];
  VEG.a0=[new VegLayer(arecaPlant(3,0),am,cap.a0,true),new VegLayer(arecaPlant(8,0),am,cap.a0,true)];
  VEG.a1=[new VegLayer(arecaPlant(3,1),am,cap.a1,true),new VegLayer(arecaPlant(8,1),am,cap.a1,true)];
  VEG.a2=[new VegLayer(arecaPlant(3,2),am,cap.a2,false)];
  buildBorderTrees();buildGrass();
}
/* cây viền & rải trong cỏ (giữ hình khối cũ, tỷ lệ thật hơn) */
let treeMeshes=[],TREES=null,NTREE=0;
function buildBorderTrees(){
  const okTree=(x,z,cl)=>inPoly(x,z,OUT)&&dLine(x,z,CR1)>.5&&dLine(x,z,CR2)>.4&&!inPond(x,z,.6)&&fldAt(x,z,0)>RW+.25&&dRoute(x,z)>.45;
  const trees=[];
  const notCrop=(x,z)=>{const zi=zoneAt(x,z);return zi<0||zi>=8};
  const st=LOW?1.1:.8;
  for(let i=0;i<OUT.length;i++){const a=OUT[i],b=OUT[(i+1)%OUT.length];const L=Math.hypot(b[0]-a[0],b[1]-a[1]);let nx=-(b[1]-a[1])/L,nz=(b[0]-a[0])/L;
    const mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2;if(!inPoly(mx+nx*.5,mz+nz*.5,OUT)){nx=-nx;nz=-nz}
    for(let t=0;t<L;t+=st*(.7+rnd()*.6)){const o=.25+rnd()*.35;const x=a[0]+(b[0]-a[0])*t/L+nx*o,z=a[1]+(b[1]-a[1])*t/L+nz*o;
      if(okTree(x,z)&&notCrop(x,z))trees.push({x,z,y:H(x,z),s:.32+rnd()*.4,r:rnd()*6.28})}}
  for(let i=0;i<(LOW?500:1000);i++){const x=BOX.x0+rnd()*(BOX.x1-BOX.x0),z=BOX.z0+rnd()*(BOX.z1-BOX.z0);
    if(!notCrop(x,z)||!okTree(x,z)||zoneAt(x,z)===9)continue;if(rnd()<.55)trees.push({x,z,y:H(x,z),s:.3+rnd()*.42,r:rnd()*6.28})}
  const f0=FOR[0],f1=FOR[1],fl=Math.hypot(f1[0]-f0[0],f1[1]-f0[1]);
  for(let t=0;t<fl;t+=.45){const s=(rnd()-.5)*1.3,x=f0[0]+(f1[0]-f0[0])*t/fl+s*.95,z=f0[1]+(f1[1]-f0[1])*t/fl-s*.3;trees.push({x,z,y:H(x,z),s:.38+rnd()*.4,r:rnd()*6.28})}
  TREES=new Float32Array(trees.length*4);trees.forEach((o,i)=>{TREES[i*4]=o.x;TREES[i*4+1]=o.y-.01;TREES[i*4+2]=o.z;TREES[i*4+3]=rnd()});NTREE=trees.length;
  const tmM=vegMat({ht:14,sw:.02,fl:0,trans:.3,rough:.7,gloss:0,nz:3.2});
  const n=NTREE;VEG.t0=[new VegLayer(treePlant(4,0),tmM,Math.min(n,LOW?40:120),true),new VegLayer(treePlant(9,0),tmM,Math.min(n,LOW?40:120),true)];
  VEG.t1=[new VegLayer(treePlant(4,1),tmM,n,true),new VegLayer(treePlant(9,1),tmM,n,true)];
  VEG.t2=[new VegLayer(treePlant(4,2),tmM,n,false)];
  STATS.tree=trees.length;
}

/* ---------- chọn LOD mỗi khung ---------- */
const _fr=new THREE.Frustum(),_pm=new THREE.Matrix4();
function updVeg(cam,canvasH){
  if(!VEG.c0)return;
  _pm.multiplyMatrices(cam.projectionMatrix,cam.matrixWorldInverse);_fr.setFromProjectionMatrix(_pm);
  const pl=_fr.planes;const K=canvasH/(2*Math.tan(cam.fov*Math.PI/360));
  const q=LOW?1.6:1;
  const hC=1.1*M2U*K,hA=5*M2U*K;
  const c0=hC/(150*q),c1=hC/(18*q),c2=hC/(2.4*q),a0=hA/(230*q),a1=hA/(28*q),a2=hA/(2.2*q);
  GU2.uVegR.value=c2;
  const cx=cam.position.x,cy=cam.position.y,cz=cam.position.z;
  const all=[...VEG.c0,...VEG.c1,...VEG.c2,...VEG.a0,...VEG.a1,...VEG.a2,...(VEG.t0||[]),...(VEG.t1||[]),...(VEG.t2||[])];all.forEach(l=>l.n=0);
  const inF=(x,y,z,r)=>{for(let i=0;i<6;i++){const p=pl[i];if(p.normal.x*x+p.normal.y*y+p.normal.z*z+p.constant<-r)return false}return true};
  const sel=(arr,N,d0,d1,d2,L0,L1,L2,ht,sBase)=>{
    const b0=d0*.05,b1=d1*.05,d22=d2*d2;
    for(let i=0;i<N;i++){const k=i*4,x=arr[k],y=arr[k+1],z=arr[k+2];const dx=x-cx,dy=y-cy,dz=z-cz;const dd=dx*dx+dy*dy+dz*dz;if(dd>d22)continue;
      const d=Math.sqrt(dd);if(!inF(x,y+ht*.5,z,ht*.6+(d<d1?.6:0)))continue;
      const sd=arr[k+3],rot=sd*6.283,s=sBase*(.86+.28*fract(sd*7.31)),v=sd<.5?0:1;
      if(d<d0-b0){L0[v].push(x,y,z,s,rot,sd,1,0)}
      else if(d<d0+b0){const f=(d0+b0-d)/(2*b0);L0[v].push(x,y,z,s,rot,sd,f,0);L1[v].push(x,y,z,s,rot,sd,f,1)}
      else if(d<d1-b1){L1[v].push(x,y,z,s,rot,sd,1,0)}
      else if(d<d1+b1){const f=(d1+b1-d)/(2*b1);L1[v].push(x,y,z,s,rot,sd,f,0);L2[0].push(x,y,z,s,rot,sd,f,1)}
      else{const sh=clamp((d2-d)/(d2*.15),0,1);L2[0].push(x,y,z,s*(.35+.65*sh),rot,sd,1,0)}
    }};
  const fract=v=>v-Math.floor(v);
  sel(COF,NCOF,c0,c1,c2,VEG.c0,VEG.c1,VEG.c2,.1,M2U);
  sel(ARE,NARE,a0,a1,a2,VEG.a0,VEG.a1,VEG.a2,.45,M2U);
  if(VEG.t0){const hT=13*M2U*K,t0=hT/(260*q),t1=hT/(34*q),t2=1e4;sel(TREES,NTREE,t0,t1,t2,VEG.t0,VEG.t1,VEG.t2,1.2,M2U*.9)}
  all.forEach(l=>l.commit());
}

/* ---------- cỏ quanh camera (toroidal, che bởi trường mặt đất) ---------- */
function tuftGeo(nb,seg,seed){
  const r=srng(seed),P=[],N=[],C=[],UV=[],I=[];let v=0;
  for(let b=0;b<nb;b++){
    const a=r()*6.283,lean=.2+r()*.6,ox=(r()-.5)*.16,oz=(r()-.5)*.16,h=.45+r()*.55,w=.007+r()*.006,curl=(r()-.5)*.8;
    const q=r(),bc=q<.08?[1.9,1.35,.7]:q<.3?[1.35,1.2,.75]:[.85+r()*.3,.9+r()*.25,.8+r()*.3];
    const dx=Math.cos(a),dz=Math.sin(a),sx=-dz,sz=dx;
    for(let i=0;i<=seg;i++){const t=i/seg,y=h*t,bend=lean*t*t*h;const cx=ox+dx*bend+sx*curl*t*t*.1,cz=oz+dz*bend+sz*curl*t*t*.1;const ww=w*(1-t*.92);
      const nx=-dx*.6,ny=1,nz=-dz*.6;
      if(i<seg){P.push([cx+sx*ww,y,cz+sz*ww],[cx-sx*ww,y,cz-sz*ww]);N.push([nx+sx*.4,ny,nz+sz*.4],[nx-sx*.4,ny,nz-sz*.4]);UV.push([t,1],[t,-1]);C.push(bc,bc)}
      else{P.push([cx,y,cz]);N.push([nx,ny,nz]);UV.push([1,0]);C.push(bc)}}
    for(let i=0;i<seg;i++){const o=v+i*2;if(i<seg-1)I.push(o,o+1,o+2,o+1,o+3,o+2);else I.push(o,o+1,o+2)}
    v+=seg*2+1;
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P.flat(),3));g.setAttribute('normal',new THREE.Float32BufferAttribute(N.flat(),3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(UV.flat(),2));g.setAttribute('color',new THREE.Float32BufferAttribute(C.flat(),3));g.setIndex(I);return g;
}
const GRU={uGC:{value:new THREE.Vector3()},uGCam:{value:new THREE.Vector3()}};
const GRASS_VH=`attribute vec4 iG;uniform vec3 uGC,uGCam;uniform float uGS,uGR,uTime,uWind,uDry;uniform vec2 uWD;
varying float vT,vS,vTip,vM;varying vec3 vGW;
`;
const GRASS_VP=`
vec2 l0=iG.xy*uGS;vec2 wp=l0+uGS*floor((uGC.xz-l0)/uGS+.5);
Gnd g=gnd(wp);
float isC=g.zid<7.5?1.:0.,isBare=abs(g.zid-8.)<.5?1.:0.,isHQ=abs(g.zid-9.)<.5?1.:0.;
float road=1.-smoothstep(uRW-.01,uRW+.01,g.dRoad);
float strip=g.has*step(abs(g.fv),.205);
float dpm=length(vec2(g.fu*1.5,g.fv*3.));
float gp=smoothstep(.4,.62,g.gp);
float m=isC*(1.-road)*((1.-strip)*(.25+.75*gp)+strip*.12*step(.5,dpm));
m+=isBare*(1.-road)*smoothstep(.5,.7,g.gp)*.6;
m+=(1.-isC-isBare)*(1.-road)*(1.-smoothstep(.66,.8,g.gp)*(1.-isHQ*.6));
m+=road*((1.-smoothstep(uRW*.1,uRW*.2,g.dRoad))*.7+smoothstep(uRW*.86,uRW*.98,g.dRoad)*.9);
{float eb=min(min(wp.x-uFB.x,uFB.x+uFB.z-wp.x),min(wp.y-uFB.y,uFB.y+uFB.w-wp.y));m*=smoothstep(1.,4.,eb);}
float hs=fract(iG.z*7.13);
float dc=distance(vec3(wp.x,g.hy,wp.y),uGCam);
float fade=1.-smoothstep(uGR*.6,uGR,dc);
float keep=step(hs,m)*fade;
float tall=mix(.7,1.25,fract(iG.z*3.71))*(isC*(1.-road)*(1.-strip)>.5?1.15:.75)*(road>.5?.6:1.)*(1.-uDry*.3);
float sc=keep*tall*${(0.36/11.6).toFixed(5)};
float a=iG.z*6.283;float ca=cos(a),sa=sin(a);
vec3 lp=position;vec3 rp=vec3(ca*lp.x+sa*lp.z,lp.y,-sa*lp.x+ca*lp.z);
float tip=uv.x;
float wave=vn(wp*3.2-uWD*uTime*1.6)*1.2+vn(wp*9.-uWD*uTime*3.)*.4;
vec3 wdir=vec3(uWD.x,0.,uWD.y);
vec3 bendv=(wdir*(uWind*(.35+wave)+.05*sin(uTime*3.+iG.z*40.))+vec3(sin(uTime*2.1+iG.w*9.),0.,cos(uTime*1.7+iG.z*9.))*.04)*tip*tip;
vec3 transformed=vec3(wp.x,g.hy-.0015,wp.y)+(rp+bendv*lp.y*1.6)*sc;
transformed.y-=dot(bendv.xz,bendv.xz)*tip*tip*sc*.4;
vT=tip;vS=fract(iG.z*13.1);vTip=uv.y;vM=isC;vGW=transformed;
`;
let GRASS=null;
function buildGrass(){
  const geo=tuftGeo(LOW?6:9,3,7);const N=LOW?22000:60000;
  const ig=new THREE.InstancedBufferGeometry();ig.index=geo.index;for(const k in geo.attributes)ig.setAttribute(k,geo.attributes[k]);
  const a=new Float32Array(N*4);const r=srng(99);for(let i=0;i<N;i++){a[i*4]=r();a[i*4+1]=r();a[i*4+2]=r();a[i*4+3]=r()}
  ig.setAttribute('iG',new THREE.InstancedBufferAttribute(a,4));ig.instanceCount=N;
  const GS={uGS:{value:LOW?1.5:2.0},uGR:{value:LOW?.7:.95}};
  const m=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8,side:THREE.DoubleSide,envMapIntensity:.35});
  m.onBeforeCompile=sh=>{
    Object.assign(sh.uniforms,U,GU2,GRU,GS);sh.uniforms.uDry=GU.uDry;
    sh.vertexShader=GRASS_VH+NOISE_GLSL+GND_GLSL+sh.vertexShader.replace('#include <beginnormal_vertex>',`float ga=iG.z*6.283;vec3 objectNormal=normalize(mix(vec3(cos(ga)*normal.x+sin(ga)*normal.z,normal.y,-sin(ga)*normal.x+cos(ga)*normal.z),vec3(0.,1.,0.),.5));`).replace('#include <begin_vertex>',GRASS_VP);
    sh.fragmentShader='uniform float uDry;varying float vT,vS,vTip,vM;varying vec3 vGW;\n'+NOISE_GLSL+sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec3 gb=mix(vec3(.008,.022,.005),vec3(.014,.03,.006),vS);
      vec3 gt=mix(vec3(.025,.085,.01),vec3(.055,.11,.014),vS*vS);
      gt=mix(gt,vec3(.3,.26,.11),uDry*1.5);
      float pn=vn(vGW.xz*6.)*.6+vn(vGW.xz*40.)*.4;
      diffuseColor.rgb=mix(gb,gt,smoothstep(0.,.9,vT))*vColor*(.75+.5*pn);
      diffuseColor.rgb*=.45+.55*smoothstep(0.,.5,vT);`)
     .replace('#include <roughnessmap_fragment>','float roughnessFactor=.7+.25*(1.-vT);')
     .replace('#include <lights_physical_fragment>','#include <lights_physical_fragment>\nmaterial.specularColor*=.3;')
     .replace('#include <lights_fragment_begin>',`#include <lights_fragment_begin>
      #if NUM_DIR_LIGHTS>0
      {float bl=max(-dot(geometryNormal,directLight.direction),0.);float fw=pow(max(dot(-geometryViewDir,directLight.direction),0.),3.);
       reflectedLight.directDiffuse+=directLight.color*diffuseColor.rgb*vec3(.9,1.15,.4)*(bl*.35+fw*.45)*vT;}
      #endif`);
  };
  GRASS=new THREE.Mesh(ig,m);GRASS.frustumCulled=false;GRASS.receiveShadow=true;GRASS.castShadow=false;scene.add(GRASS);GRASS.userData.GS=GS;
}
function updGrass(cam){
  if(!GRASS)return;
  const g0=gH(cam.position.x,cam.position.z),hA=cam.position.y-g0;
  const on=hA<(LOW?1.2:2.2);GRASS.visible=on;if(!on)return;
  _f.set(0,0,-1).applyQuaternion(cam.quaternion);_f.y=0;_f.normalize();
  const R=GRASS.userData.GS.uGR.value;
  GRU.uGC.value.set(cam.position.x+_f.x*R*.5,0,cam.position.z+_f.z*R*.5);GRU.uGCam.value.copy(cam.position);
}

/* cây rừng ngoài vườn: một lớp tĩnh LOD thấp */
function staticTrees(list,mul){
  if(!list.length)return;const tmM=vegMat({ht:14,sw:.015,fl:0,trans:.25,rough:.75,gloss:0,nz:2.4});
  const h=[list.filter((_,i)=>i%2===0),list.filter((_,i)=>i%2===1)];
  h.forEach((arr,k)=>{const L=new VegLayer(treePlant(k?9:4,2),tmM,arr.length,false);arr.forEach(o=>L.push(o.x,o.y-.05,o.z,o.s*mul*M2U,o.r,fract1(o.x*1.37+o.z*.73),1,0));L.commit()});
}
const fract1=v=>v-Math.floor(v);
