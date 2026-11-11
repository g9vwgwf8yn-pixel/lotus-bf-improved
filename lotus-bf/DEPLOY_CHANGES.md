# LoTUS-BF 修改說明（2026-11-11）

## 已修改
- 移除首頁「快速查詢」及「使用說明」。
- 術語搜尋改為輸入後顯示最多 40 筆即時建議（約 250 毫秒防抖）。後端 `/terms?search=...&limit=40` 會快取資料庫術語清單。
- 腦圖 NIfTI 載入成功後，強制更新三視圖；切換查詢時先清除舊圖，避免顯示上一筆查詢的影像。
- Journal 名稱可點擊：若資料列包含有效 DOI 則連至 doi.org；否則連至期刊名稱搜尋結果。

## 部署
1. 將這份 ZIP 中 `lotus-bf/` 的更新檔案上傳覆蓋 GitHub repository 的 `lotus-bf/` 內對應檔案。
2. 保留 Render 原 Web Service、Root Directory `lotus-bf`、Docker runtime 及 DB_URL 環境變數。
3. Commit 後等待 Render 自動部署，然後開啟網站測試。

## 測試
- 搜尋 `memo` 應顯示 memory 等術語建議；點擊建議應加入查詢。
- 將 `memory` 換成 `emotion`，右側影像應先清除再重新載入。
- 使用 `memory AND attention`，確認研究列表與腦圖都重新查詢。
- 點擊研究 Journal 名稱，應開啟 DOI 或期刊搜尋。

## 限制
- 尚未在 Render 的實際資料庫驗證，無法保證部署後沒有其他 SQL/schema 問題。
- 首次術語搜尋需要掃描資料庫以建立快取，可能較慢；若發生 HTTP 500，請提供 Render Logs 的第一個完整例外訊息。
- 本地環境未成功完成 Vite build（npm 依賴未安裝完整）；Python 語法編譯已通過。
