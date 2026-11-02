/* =================================================================
   DATA · lớp dữ liệu: con số địa hình thật (DEM) + số cảm biến
   - Cao độ, độ dốc, hướng dốc, đường đồng mức: tính từ lưới cao độ
     AWS Terrain Tiles (SRTM/Copernicus ~30 m) quanh GPS flycam.
   - Số cảm biến: SỐ MINH HOẠ, chờ nối Dashboard iako-01 (DSRC.live).
   ================================================================= */
const DATA_GLSL=`
uniform float uData,uELO,uEHI,uE0,uDR;uniform vec2 uDC;
vec3 dataTint(vec3 c,vec3 w,float lin){
  if(uData<.001)return c;
  float dd=distance(w.xz,uDC);
  float rv=uData*(1.-smoothstep(uDR-3.,uDR,dd));
  float ring=uData*smoothstep(uDR-1.4,uDR,dd)*(1.-smoothstep(uDR,uDR+.12,dd))*(1.-step(250.,uDR));
  if(rv<.001&&ring<.001)return c;
  float e=uE0+(w.y-.04)*11.6;
  float f=e*.5,fw=fwidth(f),d=abs(fract(f+.5)-.5);
  float ln=(1.-smoothstep(fw*.5,fw*1.5+.002,d))*(1.-smoothstep(.25,.7,fw));
  float f2=e*.1,fw2=fwidth(f2),d2=abs(fract(f2+.5)-.5);
  float ln2=(1.-smoothstep(fw2*.6,fw2*2.+.001,d2))*(1.-smoothstep(.15,.5,fw2));
  float t=clamp((e-uELO)/(uEHI-uELO),0.,1.);
  vec3 r=t<.5?mix(vec3(.06,.32,.50),vec3(.38,.74,.40),t*2.):mix(vec3(.38,.74,.40),vec3(1.,.72,.28),t*2.-1.);
  vec3 lc=vec3(.86,1.,.8),lc2=vec3(1.,.92,.6),rc=vec3(.72,1.,.55);
  if(lin>.5){r=pow(r,vec3(2.2));lc=pow(lc,vec3(2.2));lc2=pow(lc2,vec3(2.2));rc=pow(rc,vec3(2.2));}
  float l=dot(c,vec3(.3,.59,.11));
  vec3 o=lin>.5?mix(vec3(l)*.8,r*.34,.72):mix(vec3(l)*.7,r*(.58+.4*l),.75);
  o=mix(o,lc*(lin>.5?.55:.9),ln*.55);o=mix(o,lc2*(lin>.5?.8:1.),ln2*.9);
  c=mix(c,o,rv);
  c+=rc*ring*(lin>.5?.9:1.4);
  return c;}
`;
U.uDR={value:0};U.uDC={value:new THREE.Vector2()};
const E0=DEM?DEM.e0:352;U.uE0.value=E0;
const DSRC={live:null,url:null,// url: JSON từ Dashboard iako-01 khi được cấp (CORS), ví dụ {"SOIL-01":{"m":31.2,"t":25.8,"ec":.62},"WTR-01":{"lv":2.1,"wt":26},"WS-01":{"t":24,"h":70,"w":2.5}}
  note:'Số cảm biến: minh hoạ, chưa nối Dashboard iako-01'};
function setLive(j){DSRC.live=j;const e=$('#dsens');if(e)e.textContent='Số cảm biến: Dashboard iako-01; thẻ chưa có số thật ghi "minh hoạ".'}
function loadSensors(){if(DSRC.url)fetch(DSRC.url).then(r=>r.json()).then(setLive).catch(e=>console.warn('sensors',e))}
const DATA={on:false,k:0,scan:0,elo:0,ehi:0,zones:[],prof:[],flow:null,cpins:[],spins:[],zpins:[],farm:null};
const elevAt=(x,z)=>E0+(DEM?demH(x,z):H(x,z)-.04)*11.6;
const elevRaw=(x,z)=>E0+(DEM?demRaw(x,z):H(x,z)-.04)*11.6;
function gradAt(x,z,e){e=e||.25;return[(elevRaw(x+e,z)-elevRaw(x-e,z))/(2*e*11.6),(elevRaw(x,z+e)-elevRaw(x,z-e))/(2*e*11.6)]}// m/m: [đông, nam]
const COMPASS=['Bắc','Đông Bắc','Đông','Đông Nam','Nam','Tây Nam','Tây','Tây Bắc'];
function dirName(dx,dz){const a=Math.atan2(dx,-dz);return COMPASS[((Math.round(a/(Math.PI/4))%8)+8)%8]}// dx: đông, dz: nam
const fmtE=v=>fmt(v,1)+' m';
function toGPS(x,z){const lat=13.553841-z*11.6/110574,lon=107.979148+x*11.6/(111320*Math.cos(13.5538*Math.PI/180));return[lat,lon]}

function buildData(){
  // ---- thống kê địa hình cả vườn & từng khu ----
  const st=P=>{let mn=1e9,mx=-1e9,sum=0,n=0,gx=0,gz=0,sl=0;let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;P.forEach(p=>{x0=Math.min(x0,p[0]);x1=Math.max(x1,p[0]);z0=Math.min(z0,p[1]);z1=Math.max(z1,p[1])});
    for(let x=x0;x<=x1;x+=.22)for(let z=z0;z<=z1;z+=.22){if(!inPoly(x,z,P))continue;const e=elevRaw(x,z),g=gradAt(x,z,.5);mn=Math.min(mn,e);mx=Math.max(mx,e);sum+=e;n++;gx+=g[0];gz+=g[1];sl+=Math.hypot(g[0],g[1])}
    return n?{mn,mx,avg:sum/n,slope:sl/n*100,dir:dirName(-gx,-gz),n}:null};
  DATA.farm=st(OUT);
  if(DATA.farm){U.uELO.value=DATA.farm.mn-2;U.uEHI.value=DATA.farm.mx+2}
  DATA.zones=ZD.slice(0,8).map((z,i)=>Object.assign({id:z.id,ha:ZHA[i]},st(ZP[i])||{}));
  // ---- mặt cắt dọc tuyến đường ----
  for(let s=0;s<=RT.L;s+=.08){const o=routeAt(s,_dq);DATA.prof.push([s,elevAt(o.p.x,o.p.z)])}
  // ---- nhãn đường đồng mức dọc tuyến (mỗi 2 m) ----
  let pe=null;for(let s=0;s<=RT.L;s+=.03){const o=routeAt(s,_dq);const e=elevAt(o.p.x,o.p.z);if(pe!==null){const a=Math.floor(pe/2),b=Math.floor(e/2);if(a!==b){const lv=Math.max(a,b)*2;const el=document.createElement('div');el.className='cpin';el.innerHTML=`<i></i>${lv} m`;pinBox.appendChild(el);DATA.cpins.push({el,v:new THREE.Vector3(o.p.x,o.p.y+.02,o.p.z),s})}}pe=e}
  // ---- nhãn khu (số địa hình thật) ----
  DATA.zpins=DATA.zones.map((z,i)=>{const w=toW(ZD[i].lab);const el=document.createElement('div');el.className='dzp';
    el.innerHTML=`<b>Khu ${z.id}</b><span>≈ ${fmt(z.ha,1)} ha</span><span>${Math.round(z.mn)}–${Math.round(z.mx)} m</span><span>dốc ${fmt(z.slope,1)}% · ${z.dir}</span>`;
    pinBox.appendChild(el);return{el,v:new THREE.Vector3(w[0],H(w[0],w[1])+.9,w[1])}});
  // ---- nhãn cảm biến (minh hoạ) ----
  DATA.spins=DEV.filter(d=>d.k==='soil'||d.k==='water'||d.k==='weather').map((d,i)=>{const w=toW(d.uv);const el=document.createElement('div');el.className='spin';pinBox.appendChild(el);
    return{el,d,i,v:new THREE.Vector3(w[0],gH(w[0],w[1])+.55,w[1]),x:w[0],z:w[1],ph:hh(i*3.1,i*.7)*6.28}});
  buildFlow();buildDataPanel();
}
const _dq={p:new THREE.Vector3(),f:new THREE.Vector3(),r:new THREE.Vector3(),yaw:0};

/* ---------- dòng chảy mặt: nước mưa chảy theo độ dốc thật ---------- */
function buildFlow(){
  const N=LOW?900:1800,pos=new Float32Array(N*6),al=new Float32Array(N*2);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('aA',new THREE.BufferAttribute(al,1));
  const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uK:{value:0}},
    vertexShader:`attribute float aA;varying float vA;void main(){vA=aA;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform float uK;varying float vA;void main(){gl_FragColor=vec4(vec3(.45,.86,1.)*vA*uK,1.);}`});
  const L=new THREE.LineSegments(g,m);L.frustumCulled=false;L.renderOrder=8;L.visible=false;scene.add(L);
  const P=[];for(let i=0;i<N;i++)P.push({x:0,z:0,a:0,life:0,max:1});
  DATA.flow={L,P,pos,al,N};P.forEach(p=>flowSpawn(p,true));
}
function flowSpawn(p,init){for(let k=0;k<20;k++){const x=lerp(BOX.x0+2,BOX.x1-2,rnd()),z=lerp(BOX.z0+2,BOX.z1-2,rnd());if(inPoly(x,z,OUT)&&!inPond(x,z,.2)){p.x=x;p.z=z;break}}p.a=0;p.max=3+rnd()*5;p.life=init?rnd()*p.max:0}
function updFlow(dt,k){
  const F=DATA.flow;if(!F)return;F.L.visible=k>.01;F.L.material.uniforms.uK.value=k;if(k<.01)return;
  const {P,pos,al}=F;
  for(let i=0;i<P.length;i++){const p=P[i];p.life+=dt;const g=gradAt(p.x,p.z,.18);const s=Math.hypot(g[0],g[1]);
    const sp=.18+Math.min(s*9,.9);let vx=-g[0]/(s||1)*sp,vz=-g[1]/(s||1)*sp;
    p.x+=vx*dt;p.z+=vz*dt;
    if(p.life>p.max||s<.0015||!inPoly(p.x,p.z,OUT)||inPond(p.x,p.z,.05))flowSpawn(p,false);
    const fa=Math.min(1,p.life*2)*Math.min(1,(p.max-p.life)*1.5);const y=gH(p.x,p.z)+.05,o=i*6,tl=.22;
    pos[o]=p.x;pos[o+1]=y;pos[o+2]=p.z;pos[o+3]=p.x-vx*tl;pos[o+4]=y;pos[o+5]=p.z-vz*tl;al[i*2]=fa*.9;al[i*2+1]=0}
  F.L.geometry.attributes.position.needsUpdate=true;F.L.geometry.attributes.aA.needsUpdate=true;
}

/* ---------- bảng số liệu ---------- */
let DP=null;
function buildDataPanel(){
  const el=$('#dpanel');if(!el)return;const f=DATA.farm;
  const pr=DATA.prof,e0=Math.min(...pr.map(p=>p[1]))-1,e1=Math.max(...pr.map(p=>p[1]))+1,W=300,Hh2=64;
  const X=s=>(s/RT.L*W).toFixed(1),Y=e=>(Hh2-(e-e0)/(e1-e0)*Hh2).toFixed(1);
  const path=pr.map((p,i)=>(i?'L':'M')+X(p[0])+','+Y(p[1])).join('');
  const sts=ST.slice(0,5).map((s,j)=>{const ss=STOP[s.k];return`<g transform="translate(${X(ss)},0)"><line y1="0" y2="${Hh2}"/><text y="-4">${j+1}</text></g>`}).join('');
  el.querySelector('.prof').innerHTML=`<svg viewBox="-6 -14 ${W+12} ${Hh2+30}"><path class="pa" d="${path}L${W},${Hh2}L0,${Hh2}Z"/><path class="pl" d="${path}"/><g class="ps">${sts}</g><text class="pe" x="${W}" y="${Hh2+14}" text-anchor="end">${Math.round(e0+1)}–${Math.round(e1-1)} m</text><text class="pe" x="0" y="${Hh2+14}">Mặt cắt dọc tuyến lái</text><circle id="pcar" r="4.5"/></svg>`;
  if(f)$('#dfarm').innerHTML=`Cả vườn: <b>${Math.round(f.mn)}–${Math.round(f.mx)} m</b> · chênh ${Math.round(f.mx-f.mn)} m · dốc TB ${fmt(f.slope,1)}% · thoải về hướng ${f.dir}`;
  DP={el,elev:$('#delev'),slope:$('#dslope'),flow:$('#dflow'),gps:$('#dgps'),car:el.querySelector('#pcar'),X,Y};
}
function updDataPanel(){
  if(!DP||!DATA.on)return;
  const e=elevAt(PH.x,PH.z);DP.elev.textContent=fmt(e,1);
  const fx=Math.sin(PH.yaw),fz=Math.cos(PH.yaw),dd=.35;const sl=(elevAt(PH.x+fx*dd,PH.z+fz*dd)-elevAt(PH.x-fx*dd,PH.z-fz*dd))/(2*dd*11.6)*100;
  DP.slope.textContent=(sl>=0?'+':'−')+fmt(Math.abs(sl),1);DP.slope.parentNode.dataset.up=sl>.3?'1':sl<-.3?'-1':'0';
  const g=gradAt(PH.x,PH.z,.4);DP.flow.textContent=dirName(-g[0],-g[1]);
  const gp=toGPS(PH.x,PH.z);DP.gps.textContent=`${gp[0].toFixed(5)}°B · ${gp[1].toFixed(5)}°Đ`;
  DP.car.setAttribute('cx',DP.X(PH.s));DP.car.setAttribute('cy',DP.Y(e));
}

/* ---------- cảm biến (minh hoạ) ---------- */
function sensorHTML(o,t){const d=o.d,ph=o.ph,w=a=>Math.sin(t*.07+ph*a)*.5+Math.sin(t*.031+ph*a*1.7)*.5;
  const L=DSRC.live&&DSRC.live[d.id];const v=(k,f)=>L?L[k]:f();// có số thật thì không trộn số minh hoạ; trường thiếu thì ẩn dòng
  const row=(n,x,dg,u,u2='')=>x==null?'':`<span>${n} <em>${fmt(x,dg)}${u}</em>${u2}</span>`;
  if(d.k==='soil')return`<b>${d.id}</b>`+row('Ẩm đất',v('m',()=>30+6*Math.sin(ph)+1.2*w(1)),1,'%')+row('Nhiệt đất',v('t',()=>25.2+1.4*Math.cos(ph)+.3*w(2)),1,'°C')+row('EC',v('ec',()=>.55+.18*Math.sin(ph*2)+.03*w(3)),2,'',' mS/cm');
  if(d.k==='water')return`<b>${d.id}</b>`+row('Mực nước',v('lv',()=>2.15+.05*w(1)),2,' m')+row('Nhiệt nước',v('wt',()=>26.1+.3*w(2)),1,'°C');
  return`<b>${d.id}</b>`+row('Không khí',v('t',()=>23+5*Math.sin((G.hour-9)/24*6.283)+.3*w(1)),1,'°C')+row('Độ ẩm',v('h',()=>78-12*Math.sin((G.hour-9)/24*6.283)),0,'%')+row('Gió',v('w',()=>2.4+.6*w(2)),1,' m/s')}

/* ---------- bật / tắt ---------- */
function setData(on){DATA.on=on;body.classList.toggle('data',on);const b=$('#bdata');if(b)b.setAttribute('aria-pressed',String(on));if(on){DATA.scan=0;U.uDC.value.set(PH.x,PH.z)}}
function updData(dt,t,ek,rw){
  DATA.k=lerp(DATA.k,DATA.on?1:0,1-Math.pow(DATA.on?.08:.02,dt));if(DATA.k<.002&&!DATA.on)DATA.k=0;
  U.uData.value=DATA.k;
  if(DATA.on){DATA.scan+=dt;U.uDR.value=Math.pow(DATA.scan,2.2)*9+DATA.scan*3}else U.uDR.value=Math.max(U.uDR.value,300);
  updFlow(dt,DATA.k*sstep(.4,2.2,DATA.scan||0));
  const k=DATA.k,ov=ek==='over'?rw:0,cr=U.uDR.value;
  DATA.cpins.forEach(o=>{const d=Math.hypot(PH.x-o.v.x,PH.z-o.v.z);placePin(o,k*clamp(1-(d-3.5)/1.5,0,1)*(1-ov)*(Math.hypot(o.v.x-U.uDC.value.x,o.v.z-U.uDC.value.y)<cr?1:0))});
  DATA.zpins.forEach(o=>{const d=Math.hypot(camera.position.x-o.v.x,camera.position.z-o.v.z);placePin(o,k*Math.max(ov,clamp(1-(d-9)/4,0,1)*.95)*(Math.hypot(o.v.x-U.uDC.value.x,o.v.z-U.uDC.value.y)<cr?1:0))});
  const live=Math.floor(t*2)!==Math.floor((t-dt)*2);
  DATA.spins.forEach(o=>{const d=Math.hypot(PH.x-o.x,PH.z-o.z);const s=k*clamp(1-(d-4)/2,0,1)*(1-ov);if(s>.02&&(live||!o.el.innerHTML))o.el.innerHTML=sensorHTML(o,t)+(DSRC.live&&DSRC.live[o.d.id]?'':'<small>minh hoạ</small>');placePin(o,s)});
  updDataPanel();
}
