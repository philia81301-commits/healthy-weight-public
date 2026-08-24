# 交接檔（handoff.md）

> 任何 Agent、任何電腦接手前**必讀**；收工時**必更新**。本檔只放交接必需的精簡資訊，詳細脈絡放 Obsidian（L3）。

## ⏯️ 目前做到哪
**網站已上線並完成一輪 UI 迭代**：<https://philia81301-commits.github.io/healthy-weight-public/>
本輪：F 能量斜紋底圖（右上淡出、濃度 0.12）、首頁嵌入 4 頁簡報圖（寬版 1240px 容器、
點頁進章節、附 PPTX 下載）、自評工具改同寬橫幅＋黃色立體「開始測」按鈕、
頁首「總覽」黃色立體按鈕、站名放大 26px、移除工具集連結（民眾動線單純化）。
已上架工具集首頁與 QR 總表（另一 session 已收工補記）。
七章內容：①–④已審定；⑤⑥⑦待審（⑤5-5、⑦7-3/7-4 已依審稿修訂）。

## 🚦 目前狀態
- 全站骨幹訊息六條與各章狀態見 `content/index.md`（紅燈條件、切點、三腳凳等跨章口徑都鎖在那裡）
- 簡報：spec 在 `slides/spec.yaml`，底圖在 `slides/images/`（deck-p* 原圖、page_0N 裁切版）；
  文字用「jf open 粉圓 2.1」疊在 PPTX 層，改字直接開 PPTX；裁切帶 p1(80,80) p2(100,60) p3(130,30) p4(30,130)
- **簡報改版後**要重跑 `slides/export/` 頁圖輸出（python win32com `Slide.Export`）再 build，首頁嵌圖才會同步
- **PDF 先不轉**（轉法：python win32com SaveAs 32；PowerShell COM 會 TYPE_E_CANTLOADLIBRARY）
- 待醫師提供：⑦7-4 本院掛號資訊（連結／時段）

## ➡️ 下一步
1. 醫師審⑤⑥⑦；⑦7-2 流程四步需依院內實況校準；草稿章節上線頁面帶「審訂中」標示，
   審定後把 md 的「> 狀態」改為已審定並重跑 `node tools/build-site.js` → commit push
2. 內容改動後的建站流程：改 content/*.md → build → docs/ 一起 commit（docs 是產出物，勿手改）
3. 簡報最終版確認後轉 PDF（python win32com SaveAs 32）

## ⚠️ 注意事項
- **兩台電腦都放 `C:\projects\healthy-weight-public\`，開工前 `git pull`、收工後 `git push`；不要放進 OneDrive／雲端硬碟**
- 藥物章（⑥）停在民眾層級：不列劑量、不寫副作用處置，一律導流「須經醫師評估」——治療細節在姊妹專案 obesity-education-clinic
- 270 份問卷數據只引比例、去識別，原始檔不進 repo（本 repo 是**公開**的）
- 自評工具不收任何資料——與篩檢工具的模式刻意不同，不要「補上」資料回傳

## 🕐 最後更新
- 時間：2026-08-24（傍晚，第二次收工：網站上線＋UI 迭代）
- 更新者：Claude Code（Fable 5）@ DESKTOP-LVSV9Q5
- Git push：✅ 已推（philia81301-commits/healthy-weight-public）
