const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const p=await b.newPage();
p.on('console',m=>{if(m.type()==='error')console.log('ERR',m.text().slice(0,200))});p.on('pageerror',e=>console.log('PE',e.message));
await p.goto(''+(process.env.BASE||'http://127.0.0.1:8777/')+'mx.html');await p.waitForFunction(()=>window.__ok,null,{timeout:60000});
for(const [name,base,extra] of [['mxanim','mx_man_dig',['mx_man_pick','mx_man_plant','mx_man_pull','mx_girl_plant','mx_girl_pickg','mx_girl_pull']]]){
 const b64=await p.evaluate(([a,e])=>exportChar(a,e,{noMesh:true}),[base,extra]);fs.writeFileSync((process.env.OUT||'.')+'/'+name+'.glb',Buffer.from(b64,'base64'));console.log(name,b64.length*3/4|0)}
await b.close()})();
