"""Ghép src/* thành index.html (bản publish) + dev/page.html (bản chạy local với vendor/)."""
import os,shutil
B=os.path.dirname(os.path.abspath(__file__))+'/'
wm=open(B+'src/wm.svg',encoding='utf-8').read().replace('focusable="false"','aria-hidden="true" focusable="false"')
js='\n'.join(open(B+'src/'+f+'.js',encoding='utf-8').read() for f in ['farm','veg','hq','drive','people','data','engine','game'])
page=open(B+'src/page.html',encoding='utf-8').read().replace('{{WM}}',wm).replace('{{JS}}',js)
open(B+'index.html','w',encoding='utf-8').write(page)
dev='<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>'+page+'</body></html>'
dev=dev.replace('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js','./three.module.js').replace('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/','./jsm/')
os.makedirs(B+'dev',exist_ok=True);open(B+'dev/page.html','w',encoding='utf-8').write(dev)
for d in ['assets','img']:
    p=B+'dev/'+d
    if not os.path.exists(p):
        try: os.symlink(B+d,p)
        except OSError: shutil.copytree(B+d,p)
if not os.path.exists(B+'dev/three.module.js'):
    shutil.copy(B+'vendor/three.module.js',B+'dev/three.module.js');shutil.copytree(B+'vendor/jsm',B+'dev/jsm')
print('index.html',len(page))
