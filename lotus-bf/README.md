# LoTUS-BF：研究資料查詢介面改良

本專案以課堂提供的 LoTUS-BF 原始碼為基礎，改善前端資訊架構、搜尋流程、快速查詢、響應式排版與使用說明，保留原有術語查詢、研究列表、布林運算與 NIfTI 腦影像功能。

## 改良內容

- 三欄介面重新編排，使用研究工具風格的簡潔配色與明確的功能標題。
- 新增 Memory、Emotion、Memory AND Attention、[0,0,0] 快速查詢。
- 新增使用說明、複製目前查詢連結與行動裝置排版。
- 保留原有查詢結果表格、排序、分頁及影像控制。
- 修正後端資料庫設定：使用環境變數 `DB_URL` 或 `DATABASE_URL`，不把密碼寫入程式碼。
- 使用 Docker 多階段建置前端，並由 Flask 提供同網域的網頁與 API。

## 本機啟動

前端：`npm ci`，接著 `npm run dev`。Vite 會將 `/terms`、`/query`、`/help` 轉送至本機 5000 埠的 Flask。

後端：`pip install -r requirements.txt`，設定 `DB_URL` 後執行 `flask --app 'app:create_app()' run --port 5000`。

正式環境：用 Dockerfile 部署 Web Service，設定 `DB_URL`（**請勿將資料庫密碼提交 GitHub**）。

## Render 部署

1. 將整個 `lotus-bf` 目錄上傳到 GitHub（不要上傳 `node_modules`、`.env`、憑證）。
2. Render → New → Web Service → 連接 GitHub repository。
3. Runtime 選 **Docker**，Dockerfile 位於專案根目錄；若放在子資料夾，設定 Root Directory。
4. Environment 加入 `DB_URL`，填入**與此 LoTUS-BF 後端資料結構相容**的 PostgreSQL 連線字串。
5. 部署後測試 `/`、`/help`、`/terms`、`/query/memory/studies`。

**重要：** 原始後端會查詢 `ns.annotations_json` 等資料表；上一份 Neurosynth API 作業的資料庫未必包含此表。若資料表不相容，需要先準備 LoTUS-BF 所需的資料庫結構。網站外觀能載入，不代表查詢功能已驗證。

## 繳交

繳交公開網站 URL 與完整前端＋後端 ZIP（排除 `node_modules`）。
