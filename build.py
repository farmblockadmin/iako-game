"""Ghép src/* thành index.html (bản publish) + dev/page.html (bản chạy local với vendor/)."""
import os,shutil
B=os.path.dirname(os.path.abspath(__file__))+'/'
wm=open(B+'src/wm.svg',encoding='utf-8').read().replace('focusable="false"','aria-hidden="true" focusable="false"')
js='\n'.join(open(B+'src/'+f+'.js',encoding='utf-8').read() for f in ['farm','veg','hq','drive','people','data','engine','game'])
page=open(B+'src/page.html',encoding='utf-8').read().replace('{{WM}}',wm).replace('{{JS}}',js)
open(B+'index.html','w',encoding='utf-8').write(page)
FAV='<link rel="icon" href="img/favicon.svg" type="image/svg+xml"><link rel="icon" href="img/favicon-48.png" type="image/png" sizes="48x48"><link rel="apple-touch-icon" href="img/apple-touch-icon.png">'
dev='<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+FAV+'</head><body>'+page+'</body></html>'
dev=dev.replace('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js','./three.module.js').replace('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/','./jsm/')
os.makedirs(B+'dev',exist_ok=True);open(B+'dev/page.html','w',encoding='utf-8').write(dev)
for d in ['assets','img']:
    p=B+'dev/'+d
    if not os.path.exists(p):
        try: os.symlink(B+d,p)
        except OSError: shutil.copytree(B+d,p)
if not os.path.exists(B+'dev/three.module.js'):
    shutil.copy(B+'vendor/three.module.js',B+'dev/three.module.js');shutil.copytree(B+'vendor/jsm',B+'dev/jsm')
URL='https://farmblockadmin.github.io/vuon-ia-ko/'
TT='Lái xe qua vườn Ia Ko – Game 3D của Farmblock';DS='Lái xe qua vườn cà phê xen cau Farmblock Ia Ko 1 ở Gia Lai. Mở trên máy tính để trải nghiệm 3D.'
og=f'<meta property="og:type" content="website"><meta property="og:site_name" content="Farmblock"><meta property="og:locale" content="vi_VN"><meta property="og:url" content="{URL}"><meta property="og:title" content="{TT}"><meta property="og:description" content="{DS}"><meta property="og:image" content="{URL}img/og.jpg"><meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Xe bán tải chạy về cổng vườn cà phê Ia Ko của Farmblock"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="{URL}img/og.jpg">'
site='<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+og+FAV+'</head><body>'+page+'</body></html>'
os.makedirs(B+'site',exist_ok=True);open(B+'site/index.html','w',encoding='utf-8').write(site);open(B+'site/.nojekyll','w').close()
for d in ['assets','img']: shutil.copytree(B+d,B+'site/'+d,dirs_exist_ok=True)
print('index.html',len(page))
