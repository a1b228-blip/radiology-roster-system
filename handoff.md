# 交接檔（handoff.md）

> 任何 Agent、任何電腦接手前**必讀**；收工時**必更新**。本檔只放交接必需的精簡資訊，詳細脈絡放 Obsidian（若有 L3）。

## ⏯️ 目前做到哪
完成 RDQ 需求訪談（已確認規格卡 `rdq/RDQ-spec-radiology-roster-20260821.md`），並完成開發計畫 `implementation_plan.md` 規劃。

## 🚦 目前狀態
已確認需求規格與系統架構（100% 離線單頁 Web 應用、雙視角切換、黃底編輯標示、即時違規檢核、Excel 匯出）。

## ➡️ 下一步
1. 依據 implementation_plan.md 開始編寫 `index.html`、`css/style.css` 與 `js/app.js`。
2. 驗證核心自動排班演算法 (資深搭檔檢核、Rest Gap 11h、公平性分配)。
3. 測試手動編輯、黃底高亮顯示與原生 Excel (.xlsx) 匯出。

## ⚠️ 注意事項
- 放射診斷科涉及高階機台 (CT, MRI, Angio) 執照資格，演算法需包含資深資淺搭檔檢核機制。
- 急診與 24 小時 On-Call 班別需符合勞基法 11 小時休息間隔限制。

## 🕐 最後更新
- 時間：2026-08-21 14:04
- 更新者：Antigravity Agent @ mac
- Git push：✅ 已同步 RDQ 規格卡

