# 交接檔（handoff.md）

> 任何 Agent、任何電腦接手前**必讀**；收工時**必更新**。本檔只放交接必需的精簡資訊，詳細脈絡放 Obsidian（L3）。

## ⏯️ 目前做到哪

**網站已上線，七章內容全數審定**：<https://philia81301-commits.github.io/healthy-weight-public/>

2026-11-25 參考 TMASO 疾病認知網站（藥廠贊助的單頁導流頁）改版，四項全部醫師審定並上線：

1. **自評工具改版**（`5577bbc`、列印修正 `b348ebb`）——兩步驟＋進度條；「醫師告知過的疾病」計入紅燈
   （新增睡眠呼吸中止症、曾心肌梗塞或中風，醫師同意）；「最近的情況」五項只印結果卡、不影響燈號；
   腰高比 ≥0.5 只標示不影響燈號；結果卡可列印／存 PDF，只印一頁
2. **①1-4 效益階梯**（`c352d8e`）——5%／10%／15%，15% 為 DiRECT 糖尿病緩解（原研究以公斤計，限制寫在醫師備註）；心衰竭不放
3. **①1-2 共病風險倍數卡**（`0d5670e`）——4 張：糖尿病 5.2、睡眠呼吸中止 5.1、高血壓 2.0、心衰竭 1.6 倍，
   對照 Haase 2021 補充資料 Table S3（BMI 30–34.9 對 18.5–24.9）。醫師改定原則：只放 4 張、癌症不給倍數
4. **首頁開場情境短片**（`a596419`）——「天天走路，體重還是不動？」6 秒直式無聲循環，點了進第④章；
   插圖 gpt-image-2 high，字卡由 `tools/build_intro_video.py` 疊上

醫師決定**不做**：浮動掛號按鈕、⑦7-4 本院掛號資訊。

## 🚦 目前狀態

- **建站流程**：改 `content/*.md` 或 `tools/build-site.js` → `node tools/build-site.js` → `docs/` 一起 commit（docs 是產出物，勿手改）
- **章節內元件**：md 裡單獨一行寫 `[[效益階梯]]`、`[[共病倍數卡]]`，build 換成 `STAIRS_HTML`／`RISK_HTML`（資料在 `STAIRS`／`RISKS`）
- **開場短片**：改字或換圖 → `python tools/build_intro_video.py`（`--preview` 先看 4 個時間點）→ 再 build；build 會把 mp4＋封面複製到 `docs/assets/intro/`
- **小遊戲題庫**在 `tools/build-site.js` 的 `QUIZ`；圖檔 `design/assets-quiz/` → `docs/assets/quiz/`，缺圖自動退回 emoji。通關記錄 localStorage 前綴 `hw-quiz-`
- **`.inline.svg` 機制**：md 引用 `../design/*.inline.svg` 時直接把 SVG 內容寫進頁面（②2-2 腰圍標示圖靠這個疊在照片上）
- **腰圍標示圖座標**（照片 1024×1024）：肋骨下緣 y=452、骨盆上緣 y=620、中間點 y=536。改圖務必重新對位
- 簡報：spec 在 `slides/spec.yaml`；改版後要重跑 `slides/export/` 頁圖輸出（python win32com `Slide.Export`）再 build

## ➡️ 下一步

1. **章節頁改成分頁式版型**（醫師 2026-08-28 指示）——比照 HP-clinic／pneumonia-clinic 衛教單張的 hero＋分頁膠囊版型，
   參考 `C:\projects\HP-clinic\src\leaflet.template.html`；要整合既有目錄、錨點、回頂端，以及今天新增的兩個章節元件
2. **4 頁簡報 PDF**（階段四）——轉法 python win32com SaveAs 32（PowerShell COM 會 TYPE_E_CANTLOADLIBRARY）
3. **診間印表機實印自評結果卡**——目前只用 Edge headless 印 PDF 驗證過

## 🎯 內容與出題守則（醫師審稿換來的，改內容或改題必看）

1. **跨章固定句不得各章各寫**：含糖飲料一律寫「**一杯全糖手搖飲的熱量，快走一小時都消耗不完**」；
   用藥一律用**減量框架**（可能減少用藥、由醫師評估、**不要自己停藥**），不與藥物做效果比較
2. **新增數字一律查原始文獻**：PubMed 核對 PMID；摘要沒有的要讀原表（倍數卡就是在補充資料 Table S3 才找到）。PMID 與研究限制寫醫師備註，網頁只放出處小字
3. **①1-2 數字原則**：倍數卡只放 4 張，癌症只講「風險升高有關」、不給倍數
4. 選項要同構；干擾項不能也成立；問法用民眾語言
5. DPP 對照數據（58% vs metformin 31%）留醫師講解層，民眾版不出現

## ⚠️ 注意事項

- **醫師備註行首必須是 `- **醫師備註**：`**，括號寫在冒號後；寫成 `- **醫師備註（…）**` 會剝不掉、上站
- **列印 CSS 每條都帶 `body:has(#slip:not([hidden]))` 前綴**（全站共用 CSS，拿掉會讓章節頁印成空白）；要藏元素用 display:none，不要用 visibility（權重會輸給 :has 規則，醫師實印整張空白）
- **數字動畫不要預先歸零**：平常顯示正確值，捲到才起跳，`beforeprint` 換回正確值（初版列印印出 1.0）
- 驗證列印：Edge headless `--print-to-pdf`（加自動填表腳本）→ pymupdf 轉圖檢查
- 兩台電腦都放 `C:\projects\healthy-weight-public\`，開工前 `git pull`、收工後 `git push`；不要放進雲端硬碟
- 藥物章停在民眾層級；270 份問卷只引比例；自評工具不收任何資料（本 repo 公開）
- 中文內容檔只用 Edit 工具或 Python（utf-8）改，不要用 PowerShell `-replace`
- GitHub Pages 有約 10 分鐘瀏覽器快取，改版後看不到新版是正常的，Ctrl+Shift+R 強制重整（手機上影片在介紹文字下方）

## 🕐 最後更新

- 時間：2026-11-25（TMASO 參考改版四項上線）
- 更新者：Claude Code（Opus 5.5）@ X108521
- Git push：✅ 已推（四項上線 `5577bbc`→`a596419`，收工 `29c131f`＋本次回填 commit）
- L3 Obsidian：✅ 已寫（`2ndBrain/healthy-weight-public/專案工作流程.md`：上次做到哪、11-25 決策、6 條踩坑、更動表）
- 前一筆：2026-08-28 @ X108521 · ✅ 已推（遊戲尺寸全站統一）
