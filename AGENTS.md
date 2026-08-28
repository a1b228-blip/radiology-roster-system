# 🩻 佳里奇美醫院 放射科排班系統 V2.0 (專案藍圖)

> 本檔為跨 Agent 通用的專案藍圖（AGENTS.md 開放標準）。任何 Agent 的每個 session 都應先讀本檔＋`handoff.md`。
> 💡 **版本雙保存說明**：本目錄為 **放射科排班系統 V2.0**，第一版系統完整保存於 `/Users/jiangruiyi/Documents/antigravity/放射科排班系統v1`，雙版本獨立保存不相衝突。

## 專案簡介 (V2.0 升級版)
本專案為 **「佳里奇美醫院 放射科排班系統 V2.0」**。
在 V1.0 原有基礎上，V2.0 實現了四大核心轉型與升級：
1. **「管理者開班格子 ➔ 同仁自主選班 (Shift Bidding) ➔ 雙向即時驗證」全新模式**。
2. **完整八大機台/處置專長體系**（一般 X 光、CT、心臟 CT、MRI、特殊攝影、乳房攝影、牙科骨密、超音波）。
3. **跨職類 (放射師 / 護理人員 / 書記) 班表隔離與獨立視角過濾**。
4. **Excel 報表按職類獨立 Sheet 分頁匯出**與 100% 離線運作。

## 雙版本保存位置對照
- **V1.0 版本**：[`/Users/jiangruiyi/Documents/antigravity/放射科排班系統v1`](file:///Users/jiangruiyi/Documents/antigravity/%E6%94%BE%E5%B0%84%E7%A7%91%E6%8E%92%E7%8F%AD%E7%B3%BB%E7%B5%B1v1)
- **V2.0 版本**：[`/Users/jiangruiyi/Documents/antigravity/放射診斷科排班系統`](file:///Users/jiangruiyi/Documents/antigravity/%E6%94%BE%E5%B0%84%E8%A8%BA%E6%96%B7%E7%A7%91%E6%8E%92%E7%8F%AD%E7%B3%BB%E7%B5%B1)

## 關鍵路線圖
- [x] **V1.0**：一鍵自動排班算法、機台資格搭檔、Rest Gap 11h 檢核
- [x] **V2.0 階段一**：完成自主選班 2.0 雙向即時驗證引擎 (biddingEngine.js)
- [x] **V2.0 階段二**：實作管理者發布 Slot 矩陣、自訂名額與門檻編輯器
- [x] **V2.0 階段三**：匯入真實 26 位同仁 Excel 主檔與 8 大機台專長矩陣
- [x] **V2.0 階段四**：跨職類 (放射師/護理/書記) 班表隔離與動態專長視圖優化
- [x] **V2.0 階段五**：Excel 多職類獨立 Sheet 匯出與 V2.0 正式定版保存

## 同步層級（本專案初始化至第 3 層級）

| 層級 | 平台 | 位置 | 讀取時機 |
|------|------|------|---------|
| L1 | 本地 | `AGENTS.md` ＋ `handoff.md` | 每個 session |
| L2 | GitHub | `https://github.com/a1b228-blip/radiology-roster-system` (私有) | 指定時 |
| L3 | Obsidian | `第二大腦設定指南/projects/放射診斷科線上預假系統_專案工作流程.md` | 有需要時 |

## 工作約定
- 任何 Agent、任何電腦：**開工先讀 `handoff.md`，收工必更新 `handoff.md`**
- 修改共用檔案前先讀最新內容，避免覆蓋其他 Agent 的變更
- 所有回應與文件使用台灣繁體中文
