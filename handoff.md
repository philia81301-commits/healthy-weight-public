# 交接檔（handoff.md）

> 任何 Agent、任何電腦接手前**必讀**；收工時**必更新**。本檔只放交接必需的精簡資訊，詳細脈絡放 Obsidian（L3）。

## ⏯️ 目前做到哪
**七章＋總覽 index 全部起草完成**。①–④已審定（2026-08-24）；⑤（5-5 已依審稿改用病人版
S1-E3 四類動作、刪游泳）⑥（含 6-3 瘦瘦針專節）⑦待審。
**4 頁簡報 PPTX 已產出**：`slides/健康體重管理-4頁簡報.pptx`。

## 🚦 目前狀態
- 全站骨幹訊息六條與各章狀態見 `content/index.md`（紅燈條件、切點、三腳凳等跨章口徑都鎖在那裡）
- 簡報：spec 在 `slides/spec.yaml`，底圖在 `slides/images/`（deck-p* 原圖、page_0N 裁切版）；
  文字用「jf open 粉圓 2.1」疊在 PPTX 層，改字直接開 PPTX；裁切帶 p1(80,80) p2(100,60) p3(130,30) p4(30,130)
- **PDF 先不轉**（轉法：python win32com SaveAs 32；PowerShell COM 會 TYPE_E_CANTLOADLIBRARY）
- 待醫師提供：⑦7-4 本院掛號資訊（連結／時段）

## ➡️ 下一步
1. 醫師審⑤⑥⑦（⑤只需複審 5-5 與紅旗句位置）
2. 內容全數審定後進階段二：移植病人版視覺與 build-site.js 建站；做 BMI/腰圍自評小工具
   （邏輯規格＝②2-1 分級表＋2-4 燈號表；純前端不收資料）
3. 簡報最終版確認後轉 PDF

## ⚠️ 注意事項
- **兩台電腦都放 `C:\projects\healthy-weight-public\`，開工前 `git pull`、收工後 `git push`；不要放進 OneDrive／雲端硬碟**
- 藥物章（⑥）停在民眾層級：不列劑量、不寫副作用處置，一律導流「須經醫師評估」——治療細節在姊妹專案 obesity-education-clinic
- 270 份問卷數據只引比例、去識別，原始檔不進 repo（本 repo 是**公開**的）
- 自評工具不收任何資料——與篩檢工具的模式刻意不同，不要「補上」資料回傳

## 🕐 最後更新
- 時間：2026-08-24
- 更新者：Claude Code（Fable 5）@ DESKTOP-LVSV9Q5
- Git push：✅ 已推（philia81301-commits/healthy-weight-public）
