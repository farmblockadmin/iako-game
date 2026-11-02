const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const p=await b.newPage();
p.on('console',m=>{if(m.type()==='error')console.log('ERR',m.text().slice(0,200))});p.on('pageerror',e=>console.log('PE',e.message));
await p.goto(''+(process.env.BASE||'http://127.0.0.1:8777/')+''+(process.env.PG||'mx.html'));await p.waitForFunction(()=>window.__ok,null,{timeout:60000});
const out=await p.evaluate(process.argv[2]);console.log(typeof out==='string'?out:JSON.stringify(out));await b.close()})();
