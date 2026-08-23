# 交接檔（handoff.md）

> 任何 Agent、任何電腦接手前**必讀**；收工時**必更新**。本檔只放交接必需的精簡資訊，詳細脈絡放 Obsidian（L3）。

## ⏯️ 目前做到哪
專案初始化完成（L1＋L2＋L3），RDQ 規格卡 confirmed（revisions 2：加入七章架構＋4 頁簡報 PDF）。
**第①章草稿已寫完**（`content/01-體重與健康風險.md`），待醫師審稿。

## 🚦 目前狀態
- 骨架與 repo 都在，第①章是草稿（審稿追蹤表在章末）
- 使用者 2026-08-24 追加：專案最後要產出 **4 頁簡報 PDF**（已寫進規格卡與 agents.md 階段三）

## ➡️ 下一步
1. **等醫師審第①章**，依審稿意見修訂
2. 逐章往下（②自評 → ③正確減重模式 → ④吃 → ⑤動 → ⑥藥物概覽 → ⑦何時就醫）
3. 內容審定後：移植病人版視覺與 build-site.js，做 BMI/腰圍自評小工具（純前端）
4. 最後：4 頁簡報 PDF（建議路徑：HTML 排版 → Edge headless 印成 PDF，免依賴 Office）

## ⚠️ 注意事項
- **兩台電腦都放 `C:\projects\healthy-weight-public\`，開工前 `git pull`、收工後 `git push`；不要放進 OneDrive／雲端硬碟**
- 藥物章（⑥）停在民眾層級：不列劑量、不寫副作用處置，一律導流「須經醫師評估」——治療細節在姊妹專案 obesity-education-clinic
- 270 份問卷數據只引比例、去識別，原始檔不進 repo（本 repo 是**公開**的）
- 自評工具不收任何資料——與篩檢工具的模式刻意不同，不要「補上」資料回傳

## 🕐 最後更新
- 時間：2026-08-24
- 更新者：Claude Code（Fable 5）@ DESKTOP-LVSV9Q5
- Git push：✅ 已推（philia81301-commits/healthy-weight-public）
