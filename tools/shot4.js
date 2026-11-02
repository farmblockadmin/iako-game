const {chromium}=require('playwright');
(async()=>{
  const [W,H]=(process.env.SIZE||'1280x720').split('x').map(Number);const tag=process.env.TAG||'g';
  const acts=JSON.parse(process.argv[2]||'[]');
  const b=await chromium.launch({executablePath:process.env.CHROME||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const p=await b.newPage({viewport:{width:W,height:H},deviceScaleFactor:1});
  const errs=[];p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errs.push(m.text().slice(0,300))});p.on('pageerror',e=>errs.push('PAGEERR '+e.message));p.on('requestfailed',r=>{const u=r.url();if(u.startsWith('http://127'))errs.push('FAIL '+u)});
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1'))return r.continue();return r.abort()});
  await p.goto(''+(process.env.BASE||'http://127.0.0.1:8777/')+'page.html?shot'+(process.env.Q||'&hq'));
  await p.waitForFunction(()=>window.__ready,null,{timeout:240000}).catch(()=>errs.push('TIMEOUT'));
  await p.waitForFunction(()=>window.__eval('CAR.ready&&PEOPLE.length>0'),null,{timeout:180000}).catch(()=>errs.push('NOCAR/PEOPLE'));
  await p.waitForTimeout(1500);
  for(const a of acts){
    if(a[0]==='eval')console.log('EVAL',a[1].slice(0,60),JSON.stringify(await p.evaluate(e=>window.__eval(e),a[1])));
    else if(a[0]==='drive')console.log('DRIVE',JSON.stringify(await p.evaluate(([k,s])=>window.__drive(k,s),[a[1],a[2]])));
    else if(a[0]==='auto')console.log('AUTO',JSON.stringify(await p.evaluate(([s,k])=>window.__auto(s,k),[a[1],a[2]||0])));
    else if(a[0]==='wait')await p.waitForTimeout(a[1]);
    else if(a[0]==='fr')await p.evaluate(n=>window.__eval('(()=>{for(let i=0;i<'+n+';i++){G.noR=i<'+(n-1)+';frame(performance.now())}G.noR=false;return 1})()'),a[1]);
    else if(a[0]==='frames')await p.evaluate(n=>window.__shot(0,n),a[1]);
    else if(a[0]==='shot'){await p.evaluate(()=>window.__shot(0,2));await p.waitForTimeout(700);await p.screenshot({path:`${process.env.OUT||"."}/${tag}-${a[1]}.jpg`,type:'jpeg',quality:80,timeout:300000})}
  }
  console.log(errs.slice(0,15).join('\n'));await b.close();
})();
