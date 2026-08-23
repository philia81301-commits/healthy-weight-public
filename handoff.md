# 交接檔（handoff.md）

> 任何 Agent、任何電腦接手前**必讀**；收工時**必更新**。本檔只放交接必需的精簡資訊，詳細脈絡放 Obsidian（L3）。

## ⏯️ 目前做到哪
①–④章草稿完成（①②已依醫師第一輪審稿修訂：DPP 改與降血糖藥比較、腰圍插圖 ×2、刪量測頻率）。
**4 頁簡報 PPTX 已產出**（yaml-image-deck plate 模式）：`slides/健康體重管理-4頁簡報.pptx`。

## 🚦 目前狀態
- ①②章：已修訂待複審；③④章：待審（審稿追蹤表在各章末）
- 簡報：spec 在 `slides/spec.yaml`，底圖（gpt-image-2 生成）在 `slides/images/`（deck-p* 為原圖、page_0N 為 16:9 裁切版）；
  文字用「jf open 粉圓 2.1」疊在 PPTX 層，**改字直接開 PPTX 改**；組版腳本邏輯：裁切帶 p1(80,80) p2(100,60) p3(130,30) p4(30,130)
- **PDF 使用者說先不轉**（PowerPoint COM 已驗證可轉：走 python win32com，PowerShell COM 會 TYPE_E_CANTLOADLIBRARY）
- 第②章插圖：寫實照（design/generated/）＋定位示意 SVG（design/），兩張都掛在 2-2

## ➡️ 下一步
1. 醫師審③④章＋複審①②
2. 寫⑤（動）⑥（藥物概覽，守民眾層級紅線）⑦（何時就醫）＋總覽 index
3. 內容審定後：移植病人版視覺與 build-site.js，做 BMI/腰圍自評小工具（純前端）
4. 簡報最終版確認後再轉 PDF（python win32com，SaveAs 格式代碼 32）

## ⚠️ 注意事項
- **兩台電腦都放 `C:\projects\healthy-weight-public\`，開工前 `git pull`、收工後 `git push`；不要放進 OneDrive／雲端硬碟**
- 藥物章（⑥）停在民眾層級：不列劑量、不寫副作用處置，一律導流「須經醫師評估」——治療細節在姊妹專案 obesity-education-clinic
- 270 份問卷數據只引比例、去識別，原始檔不進 repo（本 repo 是**公開**的）
- 自評工具不收任何資料——與篩檢工具的模式刻意不同，不要「補上」資料回傳

## 🕐 最後更新
- 時間：2026-08-24
- 更新者：Claude Code（Fable 5）@ DESKTOP-LVSV9Q5
- Git push：✅ 已推（philia81301-commits/healthy-weight-public）
