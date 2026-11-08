# FarmBlock · Game lái xe Vườn Iako 1 — bàn giao cho Claude Code

> **Trạng thái: hoàn thiện 09/11/2026.** Tạm dừng ở bản hiện tại, không làm thêm khi chưa được bảo.

> Tài liệu này để mở trong Claude Code và làm tiếp. Đọc hết trước khi sửa code.
> Ngôn ngữ làm việc với chủ dự án: **tiếng Việt, ngắn gọn**. Thuật ngữ tiếng Anh chỉ khi phổ biến.

## 1. Sản phẩm là gì

Web game 3D (three.js r170, một file HTML) giới thiệu **vườn thật Iako 1** của FarmBlock
(22 ha, cà phê Robusta xen cau, xã Ia Ko, Chư Pưh, Gia Lai — mã `iako-01` trên Dashboard).
Người xem lái xe bán tải bằng **WASD** theo vạch vàng qua 5 trạm:

1. Cổng vào · 2. Toàn vườn · 3. Hàng cà phê · 4. Hồ & nhà điều hành · 5. Trạm IoT trung tâm (đêm) → qua cổng ra là kết thúc.

- Bản đang chạy: https://farmblockadmin.github.io/vuon-ia-ko/ (xem §11). Artifact claude.ai cũ đã xoá ngày 02/11/2026.
- Điện thoại: chỉ hiện màn "Mở trên máy tính" (bản mobile đã bỏ).
- Tên hiển thị trong game: **"Ia Ko 1"** (hai chữ); mã `iako-01` giữ nguyên.

## 2. Quy tắc bắt buộc (chủ dự án đã chốt)

- **Không push lên GitHub** trừ khi được bảo.
- **Tưới ở Iako là béc tưới sát gốc dưới đất** (micro sprinkler + ống nhỏ dọc hàng), không có béc xoay cao.
- Các vườn khác (Mang Yang…) là vườn mẫu/chưa làm → chỉ nhắc rất ngắn hoặc không nhắc. Đã bỏ "vườn mẫu" và nút mùa khô/mưa.
- **Không bao giờ hiện tên người thật** lấy từ bản vẽ CAD/sơ đồ lô.
- Số liệu đưa ra ngoài chỉ lấy từ **Dashboard iako-01** hoặc bản chuẩn trong `00_CORE` (Drive). Không có nguồn thì ghi `[Chưa kiểm]`. **Chưa đưa số pH** ra ngoài (đang chờ đội kỹ thuật kiểm).
- Văn bản cho cơ quan nhà nước/khuyến nông/báo chí: chỉ nói vận hành, kỹ thuật, dữ liệu. Không nêu mô hình bán đất, đơn vị phân phối, nhà đầu tư.
- Ngôn ngữ thiết kế FarmBlock: font **Archivo**, xanh đậm `#0C1F10 / #112615 / #17331C`, lime `#B5E383`, kem `#F5E4A1`, logo + wordmark có sẵn trong `page.html` (`#mk`, `.top .wm`).
- **Phải trông cao cấp, đáng tin, không trẻ con (chốt 03/11/2026):** được tự sáng tạo màu nếu đẹp, khớp và hợp lý với dự án; tránh khối màu bão hoà lớn, thanh ngang màu dày, nút to màu chói, nhiều màu nhấn cùng lúc. Không bold tràn lan. Màu đang có trong game không tự sửa, chỉ sửa khi chủ dự án bảo. Trước khi thiết kế gọi skill thiết kế, trước khi giao soát lại ảnh chụp. Chi tiết: `C:\Users\PC\hoc-tap\du-an\chung\chuan-thiet-ke-farmblock.md`.
- Trước khi tải file về máy chủ dự án: nói tên + dung lượng (riêng Sketchfab/Mixamo đã cho phép tải luôn).
- File làm ra cho chủ dự án: lưu vào `D:\Claude` trên máy họ (nếu máy có thư mục đó), đồng thời gửi trong chat.

## 3. Cấu trúc thư mục

```
iako-game/
├─ build.py            # ghép src/* → index.html (publish) + dev/page.html (chạy local)
├─ src/
│  ├─ page.html        # HTML + CSS + UI; có chỗ {{WM}} (wordmark) và {{JS}} (toàn bộ JS)
│  ├─ wm.svg           # wordmark FARMBLOCK
│  ├─ farm.js          # dữ liệu sơ đồ vườn, địa hình (DEM), thế giới xa, làng, rừng, bầu trời
│  ├─ veg.js           # mặt đất trong vườn (shader), cây cà phê/cau/cây viền (instanced + LOD), cỏ
│  ├─ hq.js            # nhà điều hành, hồ HDPE, vật liệu PBR đóng gói (pbrMat, hqTex)
│  ├─ drive.js         # tuyến đường, trạm, xe (Ford Ranger), bánh xe, logo nóc, phụ kiện xe, bụi, camera rig
│  ├─ people.js        # nạp model, người (retarget Mixamo), cổng, cờ, hàng rào hồ, béc tưới, luồng IoT
│  ├─ data.js          # LỚP DỮ LIỆU: đồng mức, dòng chảy, số liệu khu, bảng số liệu, cảm biến
│  ├─ engine.js        # renderer, ánh sáng theo giờ, sương, bloom, DPR thích ứng
│  └─ game.js          # vòng lặp, trạng thái, phím, HUD, trạm, nút góc nhìn, intro, pause
├─ assets/
│  ├─ dem.json         # lưới cao độ thật (xem §6)
│  ├─ m/*.json         # model GLB nén base64 trong JSON (artifact không phục vụ .glb)
│  ├─ car/ford-ranger.json (+ LICENSE)
│  └─ tex/*_c.webp, *_n.webp   # texture đóng gói (xem §7)
├─ img/planet.webp     # ảnh tĩnh trang Tạm dừng (parallax CSS)
├─ img/mgate.webp      # ảnh nền khi máy không có WebGL
├─ vendor/             # three r170 module + các file jsm cần cho chạy local
└─ tools/              # script kiểm tra/chụp ảnh (Playwright) + chuyển đổi Mixamo
```

Thứ tự ghép JS (quan trọng, các file dùng biến toàn cục của nhau):
`farm → veg → hq → drive → people → data → engine → game`.
`farm.js` có **top-level await** (nạp `dem.json`) nên script là `type="module"`.

## 4. Chạy và kiểm tra

```bash
python3 build.py                      # tạo index.html + dev/page.html (dev/ link tới assets, img, vendor)
cd dev && python3 -m http.server 8777 # mở http://127.0.0.1:8777/page.html
```

Chế độ chụp tự động: `page.html?shot` (tắt transition CSS, lộ các hàm `__eval`, `__shot`, `__drive`, `__auto`).

```bash
npm i playwright   # hoặc dùng bản có sẵn
cd dev && OUT=. node ../tools/shot4.js '[["eval","(()=>{G.hour=9;startGame();return 1})()"],["auto",6],["fr",3],["shot","test"]]'
```
Các lệnh trong shot4: `eval` (chạy JS), `auto` (tự lái theo tuyến N giây, tham số 2 = dừng sau K trạm), `drive` (giữ phím), `fr` (chạy N khung, chỉ vẽ khung cuối), `shot` (chụp → `g-<tên>.jpg`), `wait`.
Mẹo: `G.camo=[[x,y,z],[tx,ty,tz]]` ép vị trí camera khi chụp; `showTitle(null)` ẩn tiêu đề; `setData(true)` bật lớp dữ liệu; `setView('over')` góc nhìn.

Kiểm tra trước khi giao: lái hết tuyến bằng `["auto",200,5]` rồi `["auto",60]` → `G.st` phải là `"end"`; không có lỗi `PAGEERR`/shader trong console.

Trên Windows: dùng `python` thay `python3`, đặt biến `CHROME` trỏ tới `chrome.exe` nếu Playwright chưa có trình duyệt riêng (`shot4.js`, `fps.js` đều đọc biến này). `dev/assets` là bản copy (không tạo được symlink), đổi asset thì xoá `dev/` rồi build lại.

Đo FPS bằng GPU thật: `cd dev && node ../tools/fps.js` (mở cửa sổ Chrome, tự lái, in FPS khi tắt/bật Lớp dữ liệu; `Q=lq` ép chất lượng thấp, `SEC`, `SIZE` đổi thời gian đo và khung nhìn).

## 5. Hệ toạ độ & tỷ lệ

- `SC=14`: 1 px sơ đồ = 1/14 đơn vị cảnh; `toW([px,py])` đổi toạ độ sơ đồ (ảnh quy hoạch 1000×760) → cảnh.
- **1 đơn vị cảnh = 11,6 m** (`M2U` = 1/11,6 đổi mét → đơn vị). +x = Đông, +z = Nam.
- Gốc cảnh = điểm GPS ảnh flycam DJI_0071: **13,553841°B 107,979148°Đ** (giả định là tâm vườn, sai số ~±200 m).
- `H(x,z)` cao độ mặt đất trong vườn; `TH(x,z)` thế giới ngoài; `gH(x,z)` dùng cho mọi vật đặt trên đất.
- Vùng mặt đất chi tiết `BOX` = x −34…33, z −27…27. Thế giới xa `WSZ=1300` đơn vị, lưới được giãn (mịn gần vườn, thưa ra xa).

## 6. Địa hình thật (DEM)

- Nguồn: **AWS Terrain Tiles** (định dạng terrarium, cao độ = R·256 + G + B/256 − 32768), gốc SRTM/Copernicus ~30 m. Zoom 13, tile x 6551–6554, y 3783–3786.
- `assets/dem.json`: `{w:860,h:854,cx,cy,mpp:18.577,e0:352,src,dm}`; `dm` = base64 uint16 **đề-xi-mét**, đã làm mượt 3×3.
- `demRaw(x,z)` → cao độ tương đối (đơn vị cảnh); `demH` thêm vùng san phẳng `DFLAT` (hồ, nhà điều hành, 2 cổng — `flattenGates()`).
- Kết quả: vườn 329–357 m, chênh 29 m, dốc trung bình ~8 %, thoải về hướng Nam; núi thật cách ~6 km Bắc/Nam.
- Ngoài vườn trong bán kính ~16–30 đơn vị là **đất trống phủ cỏ** (chủ dự án yêu cầu, không trồng cà phê trước cổng).
- Muốn chính xác hơn: bay drone chụp lưới → WebODM/DJI Terra ra DSM 5–10 cm → thay `dem.json` (giữ định dạng).

## 7. Asset & pipeline

- Model: GLB → `gltfpack -cc -noq` (KHÔNG lượng tử hoá; bản quantized từng làm hỏng chỉnh hình học trên CPU) → base64 vào `{"glb": "..."}`. `loadM(name)` đọc `assets/m/<name>.json`.
- Texture đóng gói: `_c.webp` = RGB màu + **A = roughness**; `_n.webp` = RG normal + **B = AO**. Đọc bằng `ptx(name)`, vật liệu `pbrMat(ptx(...),{...})` (uv theo mét).
- Model đang dùng: `mxanim` (chỉ khung xương + 7 động tác Mixamo), `pick1`, `pick2`, `farmerB` (nông dân), `workers` (kỹ thuật viên), `talk`, `businessman` (giám sát), `gracy` (kỹ sư hồ), `cctv`, `pump`, `lamp`, `hat` (nón lá), xe `car/ford-ranger.json`.
- **Mixamo**: nhân vật Peasant của Mixamo không hợp bối cảnh nên chỉ lấy động tác. `retarget(clip, root)` trong `people.js` ánh xạ theo tên xương `mixamorig*` (bỏ tiền tố/hậu tố số), khoá x/z của Hips, scale y theo chiều cao hông. Clip: `man_dig, man_pick, man_plant, man_pull, girl_plant, girl_pickg, girl_pull`.
  - Thêm động tác: tải FBX (không skin cũng được) vào `dev/mxin/`, sửa danh sách trong `tools/mxconv.js`, chạy `tools/mx.html` + `mxconv.js` → `mxanim.glb` → gltfpack → JSON.
  - API Mixamo (cần đăng nhập Adobe trong trình duyệt): `POST /api/v1/animations/export` với `gms_hash` lấy từ `GET /api/v1/products/<id>?character_id=...` (khoá có gạch ngang: `model-id`, `arm-space`), header `X-Api-Key: mixamo2` + `Authorization: Bearer <localStorage.access_token>`, rồi poll `GET /api/v1/characters/<cid>/monitor`.
- Cổng: dựng bằng code `buildStoneGates()` (trụ đá ong texture `stone` từ RockWall01, mũ bê tông, đèn lồng, tường thấp + rào thép, hoa giấy). Model `gate.json` đã bỏ khỏi gói, hàm cũ `buildRustyGates()` đã xoá.
- Cờ: instanced + shader sóng (`buildFlags` ~148 cờ nhỏ, `buildBigFlags` 3 cờ ngang lớn gần hồ/nhà điều hành).

## 8. Lớp dữ liệu (`data.js`) — yêu cầu của sếp "đưa dữ liệu địa hình thật vào, thể hiện bằng con số"

Bật bằng nút **Lớp dữ liệu** hoặc phím **T** (`setData(bool)`).
- Quét lan từ xe ra (`uDR`), tô màu theo cao độ (`dataTint` trong shader mặt đất `veg.js` và thế giới `farm.js`), đường đồng mức 2 m (đậm) / 0,5 m (nhạt).
- Nhãn đồng mức (`.cpin`) dọc tuyến; thẻ từng khu (`.dzp`): diện tích ≈, cao độ min–max, độ dốc TB, hướng dốc.
- Dòng chảy mặt: 1800 hạt chạy ngược gradient DEM (`buildFlow/updFlow`).
- Bảng `#dpanel`: cao độ tại xe, độ dốc theo hướng xe (cam = lên dốc, xanh = xuống), hướng nước chảy, GPS, **mặt cắt dọc tuyến** có chấm vị trí xe, thống kê cả vườn, nguồn dữ liệu.
- Cảm biến (`.spin`): **SỐ MINH HOẠ** — có nhãn "minh hoạ". Nối dữ liệu thật: đặt `DSRC.url` (đầu `data.js`) trỏ tới JSON dạng `{"SOIL-01":{m,t,ec}, "WTR-01":{lv,wt}, "WS-01":{t,h,w}, ...}` (lấy từ Dashboard iako-01 qua API/CORS hoặc file JSON xuất). Thẻ có số thật tự bỏ nhãn "minh hoạ" và ẩn trường thiếu; thẻ chưa có số vẫn giữ nhãn. Mã thiết bị ở mảng `DEV` đầu `farm.js` (22 CAM, 9 SOIL, 2 WTR, WS-01, IOT-HUB, HQ-01).
- Lưu ý: DEM 30 m nên độ dốc từng khu (6–15 %) có thể cao hơn thực tế.

## 9. Hiệu năng (đã làm)

- DPR thích ứng `adaptQ` (0,6 … `DPR_MAX`≤1,5); trang Tạm dừng không vẽ WebGL (ảnh tĩnh + parallax CSS).
- Cây cà phê/cau: instanced 3 mức LOD theo khoảng cách (`updVeg`); xa hơn vẽ bằng shader mặt đất.
- Người: chỉ cập nhật animation khi gần xe (`updPeople`), cắt theo khoảng cách.
- Chất lượng thấp tự bật khi `hardwareConcurrency ≤ 4` hoặc `?lq` (`LOW`).

## 10. Việc còn mở / gợi ý làm tiếp

Cập nhật 02/11/2026. Đã xong: ghi công (`.credit`), dọn `buildRustyGates`, `addNeighborCoffee`, nhánh `MOB`, màu bao cà phê (`sack` → `#A3A79C`), đổi tên hiển thị thành "Ia Ko 1".

1. **Nối số cảm biến thật** từ Dashboard iako-01: code đã sẵn (`DSRC.url`, §8), còn **thiếu endpoint hoặc file xuất** (dashboard.farmblock.vn cần đăng nhập). Thử bằng số giả thì nhãn "minh hoạ" tự bỏ đúng thẻ; chưa chạy với dữ liệu thật.
2. Kiểm tra trên máy yếu thật (Intel iGPU): chưa làm vì máy hiện tại không có iGPU. Chạy `tools/fps.js` (§4) trên máy đó. Mốc tham khảo RTX 3060, 1600×900, 02/11/2026: 80 FPS tắt Lớp dữ liệu, 70 FPS bật.
3. Nếu sếp muốn địa hình chi tiết hơn: thay `dem.json` bằng DSM drone (§6).
4. Code chết còn sót, chưa xoá: `treeGeo`, `buildClouds`, `buildBase`, `packet`, `buildSprinklers`, `buildLeaves`, `blobTex`, `_unused` (tên chỉ xuất hiện đúng một lần trong `src/*.js`).

## 11. Quy trình phát hành

Sửa xong: `python build.py`, mở bản local cho chủ dự án kiểm tra. Chủ dự án báo ok thì push lên GitHub (§11b), chưa ok thì không push. Không dùng artifact nữa; model vẫn để dạng JSON base64 như cũ.

## 11b. Bản chơi công khai (GitHub Pages)

Mã nguồn ở repo private `farmblockadmin/iako-game`. Trang chơi ở repo public riêng `farmblockadmin/vuon-ia-ko` (https://farmblockadmin.github.io/vuon-ia-ko/), chỉ chứa bản build. Cập nhật: `python build.py`, rồi trong thư mục `site/` (git riêng, đã bỏ qua ở repo mã nguồn) commit và push. Commit public đứng tên `farmblockadmin`, không ghi Claude. Ảnh preview khi gửi link (Telegram, Facebook…) là `img/og.jpg`, thẻ Open Graph nằm trong `build.py`.

## 12. Bản quyền asset

Model Sketchfab đều **CC BY 4.0** (phải ghi công, cho thương mại): Ford Ranger (Asadawut.Kaewma), Rusty Entrance Gate (jimbogies), farmer animation (kyebaker), Pick Fruit (Natasha_Nabilah; AishahNajhanP156397), Low-Poly Construction workers (Jungle Jim), Talking Male Character (LasquetiSpice), Business Man (manoeldarochadeoliveira), Gracy Lee (hong227), Security Camera (andrea.chierchia), Water Motor Pump (topfrank2013), Low-Poly Lamp Post (Memorie), Asian Conical Hat (MushyDay). Texture đất/cỏ: Poly Haven (CC0). Động tác Mixamo: miễn phí bản quyền cho dự án. Dữ liệu cao độ: AWS Terrain Tiles (nguồn mở, ghi nguồn SRTM/Copernicus).
