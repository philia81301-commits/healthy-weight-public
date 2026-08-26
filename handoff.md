# 交接檔（handoff.md）

> 任何 Agent、任何電腦接手前**必讀**；收工時**必更新**。本檔只放交接必需的精簡資訊，詳細脈絡放 Obsidian（L3）。

## ⏯️ 目前做到哪
**網站已上線，七章內容全數審定**：<https://philia81301-commits.github.io/healthy-weight-public/>

2026-08-26 本日完成：
1. **⑤⑥⑦章審定通過**——三章 `> 狀態` 已改已審定、審稿追蹤表結案、`content/index.md`
   狀態表全綠；網站「審訂中」橫幅已消失（`isDraft` 靠 `> 狀態：**草稿**` 判定）。
2. **七章各加五題闖關小遊戲**——答對才出下一題、答錯抖動不扣分、答對附一行解說，
   集滿五星得稱號；題庫在 `tools/build-site.js` 的 `QUIZ` 常數。
3. **七隻吉祥物貼圖**（Pollinations 免費生圖，不吃 Canva 額度），通關獎牌用 CSS 金牌框
   包吉祥物（AI 生的徽章圖品質不穩，不採用）。

先前輪次：F 能量斜紋底圖、首頁嵌 4 頁簡報圖（寬版 1240px）、自評工具寬版橫幅、
頁首「總覽」黃色立體按鈕、站名 26px；工具集首頁與 QR 總表已上架。

## 🚦 目前狀態
- 全站骨幹訊息六條與各章狀態見 `content/index.md`（紅燈條件、切點、三腳凳等跨章口徑都鎖在那裡）
- 簡報：spec 在 `slides/spec.yaml`，底圖在 `slides/images/`（deck-p* 原圖、page_0N 裁切版）；
  文字用「jf open 粉圓 2.1」疊在 PPTX 層，改字直接開 PPTX；裁切帶 p1(80,80) p2(100,60) p3(130,30) p4(30,130)
- **簡報改版後**要重跑 `slides/export/` 頁圖輸出（python win32com `Slide.Export`）再 build，首頁嵌圖才會同步
- **PDF 先不轉**（轉法：python win32com SaveAs 32；PowerShell COM 會 TYPE_E_CANTLOADLIBRARY）
- 待醫師提供：⑦7-4 本院掛號資訊（連結／時段）——**不影響七章審定狀態**
- **小遊戲題庫與內容綁定**：改任何一章的數值或口徑（切點、分鐘數、次數、掛號科別），
  要同步檢查 `tools/build-site.js` 的 `QUIZ`，否則題目會跟內文打架
- 遊戲圖檔放 `design/assets-quiz/`（`<slug>-mascot.png`），build 複製到 `docs/assets/quiz/`；
  缺圖會自動退回 emoji 不會壞版。通關記錄存 localStorage（key 前綴 `hw-quiz-`）

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
