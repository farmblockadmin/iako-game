// Đo FPS bằng GPU thật của máy (mở cửa sổ Chrome, tự lái, so sánh tắt/bật Lớp dữ liệu).
// cd dev && CHROME="đường dẫn chrome.exe" node ../tools/fps.js   (cần server 8777 đang chạy; Q=lq để ép chất lượng thấp)
const {chromium}=require('playwright');
(async()=>{
  const [W,H]=(process.env.SIZE||'1600x900').split('x').map(Number);const SEC=+(process.env.SEC||20);
  const b=await chromium.launch({headless:false,executablePath:process.env.CHROME||undefined,args:['--ignore-gpu-blocklist','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--disable-background-timer-throttling','--disable-features=CalculateNativeWinOcclusion','--disable-gpu-vsync']});
  const p=await b.newPage({viewport:{width:W,height:H},deviceScaleFactor:1});
  const errs=[];p.on('response',r=>{if(r.status()>=400)errs.push(r.status()+' '+r.url())});p.on('pageerror',e=>errs.push('PAGEERR '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,300))});
  await p.goto((process.env.BASE||'http://127.0.0.1:8777/')+'page.html'+(process.env.Q?'?'+process.env.Q:''));
  const gpu=await p.evaluate(()=>{const g=document.createElement('canvas').getContext('webgl2');const e=g&&g.getExtension('WEBGL_debug_renderer_info');return e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):'?'});
  console.log('GPU',gpu,'· khung nhìn',W+'x'+H);
  await p.waitForSelector('#bstart:not([disabled])',{timeout:240000});
  await p.waitForTimeout(8000);// chờ nạp xong người, model
  await p.keyboard.press('Space');await p.waitForTimeout(800);await p.click('#bstart');await p.waitForTimeout(3000);
  const measure=S=>p.evaluate(sec=>new Promise(res=>{const a=[];let l=performance.now();const t0=l;const f=n=>{a.push(n-l);l=n;if(n-t0<sec*1000)requestAnimationFrame(f);else{a.sort((x,y)=>x-y);const avg=a.reduce((s,x)=>s+x,0)/a.length;const c=document.querySelector('#gl');res({fps:+(1000/avg).toFixed(1),p95ms:+a[Math.floor(a.length*.95)].toFixed(1),canvas:c.width+'x'+c.height,st:document.body.dataset.st})}};requestAnimationFrame(f)}),S);
  await p.keyboard.down('w');
  await p.waitForTimeout(6000);// để DPR thích ứng ổn định
  console.log('Tắt Lớp dữ liệu',JSON.stringify(await measure(SEC)));
  await p.keyboard.up('w');await p.keyboard.press('t');await p.keyboard.down('w');
  await p.waitForTimeout(6000);
  console.log('Bật Lớp dữ liệu',JSON.stringify(await measure(SEC)));
  await p.keyboard.up('w');
  console.log(errs.slice(0,15).join('\n'));await b.close();
})();
