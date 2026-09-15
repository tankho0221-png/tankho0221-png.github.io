# 上線與更新

## GitHub 網站

目標儲存庫： https://github.com/tankho0221-png/tankho0221-png.github.io

本儲存庫已有寫作評語網站。本遊戲原始碼放在 `_teaching-system/`，部署時產出到 `/online-teaching-system/`；原首頁不改動。

1. 修改 `_teaching-system/` 內的程式。
2. 提交至 main 後，原有 Pages 流程會先建置及測試新遊戲，再一併發布兩套網站。
3. 到 Actions 查看 Deploy Jekyll 流程是否成功。
4. 成功後打開 https://tankho0221-png.github.io/online-teaching-system/ 。

每次 push / pull request 自動檢查。獨立使用此套件時，套件內 pages.yml 可手動發布至另一個專用儲存庫；不要在現有儲存庫啟用第二個會覆蓋首頁的 Pages 流程。

## Google 正式遊戲

1. 在原試算表選「擴充功能 → Apps Script」，或打開原 Apps Script 編輯專案。
2. 備份原 Code.gs、index.html 和部署版本。
3. 執行本機建置，或下載 GitHub Actions 的 apps-script-deployment 成品。
4. 以 dist/apps-script/Code.gs 和 index.html 分別更新 Google 同名檔案；保留其他有用途的原檔。
5. 專案設定 → 指令碼屬性：填寫 SPREADSHEET_ID（原試算表網址 /d/ 與 /edit 中間部分），以及至少 8 字元的 TEACHER_PASSWORD，以及 PUBLIC_ORIGIN=https://tankho0221-png.github.io。不要把密碼放到 GitHub。
6. 執行 setupSystem_，授權讀寫原試算表。它只新增缺少的資料表，不清空原資料。
7. 部署 → 管理部署 → 編輯原 Web App → 選擇新版本 → 部署。沿用部署以保留原 /exec 網址；依學校政策選擇存取範圍。
8. 以非老師帳戶或無痕視窗測試開啟、加入房間、提交答案、老師揭曉、查看試算表。
9. 成功後，把 config/public.json 的 liveVersion 改為實際版本，再發布 Pages。

## 進一步縮小 Google 首次載入

預設 Google 部署內嵌圖片，避免首次上線依賴尚未發布的 GitHub 圖片。確認 Pages 正常後，可把 assetBaseUrl 設為實際的 `https://tankho0221-png.github.io/online-teaching-system/assets/`，重新建置並更新 Google index.html。圖片將分開快取，HTML 顯著縮小。請先檢查該網址下 art-00.webp 到 art-12.webp 全部能打開。

## 回復舊版

Google 管理部署選回舊版本；GitHub 回復原提交，再發布網站。GitHub 回復不會回復試算表資料，試算表備份應另行管理。

## 資料原則

GitHub 只放程式及示範題。學生名單、成績、密碼、服務帳戶金鑰、.clasp.json 及授權憑證均不應上載。舊版完整備份保留在本機套件，不放公開儲存庫。

## GitHub 正式遊戲連接

新版 play.html 在 GitHub Pages 執行；Code.gs 已包含 Google 通訊頁，不需額外手動建立 bridge.html。必須使用 dist/apps-script/Code.gs 成品，不可只貼 apps-script/Code.gs 原始檔。未部署新版時，play.html 會顯示連接失敗，絕不靜默轉成示範模式。

來源限制是額外防護，不是學生登入。Google 帳戶／瀏覽器可能限制跨網站框架；必須以真實學生裝置測試。
