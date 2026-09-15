# Online Teaching System｜出師北伐

香港中二、中三文言學習遊戲。三國風格美術、個人研習、紙筆投影課堂、即時房間和教師軍報。

## 3.0 的改變

- 整套前端、Google 後端、13 張 WebP 美術與測試納入版本管理。
- HTML、CSS、遊戲程式、第三方 QR 程式及示範題庫分開維護。
- GitHub Pages 提供完整正式遊戲 play.html 及獨立試玩 demo.html；正式操作經受來源限制的 Google 通訊頁存取試算表。
- 網頁圖片獨立載入，遊戲 CSS／JS 使用內容版本檔名，方便瀏覽器快取。
- 自動測試及建置流程；每次檢查產出可直接貼入 Google 的部署檔案。
- 不再把個人試算表 ID 寫死在程式中。

## 先了解上線範圍

**GitHub 管理整套原始碼並提供遊戲介面與圖片；Google Apps Script 只處理正式資料讀寫和計分，Google Sheets 保存資料。**

GitHub Pages 不執行 Google Apps Script。正式遊戲透過 Google 隱藏通訊頁及 postMessage 傳送請求，驗證來源網址、通道及回應視窗；教師權限仍由後端驗證。現有正式網址目前仍是舊版；把 GitHub 原始碼更新，不會自動改寫 Google 部署。請依 [部署指南](docs/DEPLOYMENT.md) 完成兩邊更新。

## 本機使用（Node.js 22 或更新版本）

```sh
node scripts/build.cjs
node scripts/test.cjs
node scripts/serve.cjs
```

打開 `http://127.0.0.1:8872`。不需要安裝套件。測試使用模擬試算表，不會寫入學生資料。

## 專案地圖

| 資料夾 | 用途 |
|---|---|
| src | 入口、遊戲版面、樣式與遊戲邏輯 |
| apps-script | Google 後端及設定 |
| public/assets | 13 張壓縮美術 |
| data | 10 題示範題庫 |
| config/public.json | 正式課堂網址、版本說明、可選圖片網址 |
| scripts | 建置、測試、預覽 |
| tests | 計分、權限、房間、網上入口與建置測試 |
| dist | 自動產出：pages 和 apps-script；不納入 Git |

## 課堂設計

無 iPad：老師投影→每人先寫→小組比較→同時亮答案→補證據。依「判斷、證據、解釋」給分，讓願意修訂的學生也有進步。

有裝置：學生可在正式 Google 遊戲加入房間，或課後個人研習。不要把試玩頁當作正式交功課入口。

## 已知限制

- iPad 尺寸版面已做模擬檢查，真實 Safari 及全班同時連線仍須現場驗收。
- Google Sheets 並非大型即時遊戲資料庫；現有房間上限 60 人，不代表已驗證 60 人負載。
- 正式遊戲的本機進度只在瀏覽器工作階段暫存；錯題重溫未做跨裝置同步。
- 學生以班別學號識別，尚無正式學生帳戶驗證；適合形成性評估。
- `src/app.js` 保留既有遊戲流程；後續可再分拆為獨立功能模組。

下一階段方向見 [ROADMAP](docs/ROADMAP.md)。授權範圍見 [NOTICE](NOTICE.md)。

## 老師快速加題

教師督學 → 貼上新題目 → 預覽 → 確認加入。可一次複製 Google Sheets 的 7 至 9 欄，最多 100 題。詳見 [加題與資料安全](docs/加題與資料安全.md)。

程式碼採 MIT 開源授權；正式學生資料不包含在儲存庫內。
