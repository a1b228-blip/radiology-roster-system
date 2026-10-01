import { normalizeShiftDefs } from './shiftTime.js'

export const ROLES = ['放射師', '護理人員', '書記']

// 人員主檔資料版本：修改 DEFAULT_STAFF 時請一併更新，瀏覽器會自動改載入新名冊
export const STAFF_DATA_VERSION = 'v2_28staff_20260930'

export const DEFAULT_STAFF = [
  // 1. 🩻 放射師 (21位，含組長；總技師吳秀蒂為主管不列入排班)
  //    依第二專長排序：乳房攝影 ➔ 超音波 ➔ MRI ➔ 心臟CT ➔ 其他（見 sortStaffBySpecialty）
  { id: '9207H8', name: '廖雪真', title: '放射師', role: '放射師', canNight: true, canSat: true, xray: true, ct: true, cct: true, mri: false, angio: false, mammo: true, bmd: true, us: true, status: '在職', note: '原 940356 廖雪貞更新' },
  { id: '970140', name: '穆佳琪', title: '放射師', role: '放射師', canNight: true, canSat: true, xray: true, ct: true, cct: false, mri: false, angio: false, mammo: true, bmd: true, us: true, status: '在職', note: '' },
  { id: 'B204W1', name: '賴妍德', title: '放射師', role: '放射師', canNight: true, canSat: true, xray: true, ct: true, cct: false, mri: false, angio: false, mammo: true, bmd: true, us: false, status: '在職', note: '' },
  { id: 'B508W3', name: '李婉鈴', title: '放射師', role: '放射師', canNight: true, canSat: true, xray: true, ct: true, cct: false, mri: false, angio: false, mammo: true, bmd: true, us: false, status: '在職', note: '' },
  { id: '961137', name: '吳志鴻', title: '放射師', role: '放射師', canNight: true, canSat: true, xray: true, ct: true, cct: false, mri: false, angio: true, mammo: false, bmd: true, us: true, status: '在職', note: '' },
  { id: 'A105W2', name: '張鼎晨', title: '組長', role: '放射師', canNight: false, canSat: false, xray: true, ct: true, cct: false, mri: false, angio: true, mammo: false, bmd: true, us: true, status: '在職', note: '' },
  { id: 'B310Y1', name: '羅翊任', title: '放射師', role: '放射師', canNight: true, canSat: true, xray: true, ct: true, cct: false, mri: false, angio: false, mammo: false, bmd: true, us: true, status: '在職', note: '' },
  { id: 'A00534', name: '江瑞益', title: '放射師', role: '放射師', canNight: false, canSat: true, xray: true, ct: true, cct: false, mri: true, angio: true, mammo: false, bmd: true, us: false, status: '在職', note: '' },
  { id: '970733', name: '林子翔', title: '放射師', role: '放射師', canNight: true, canSat: true, xray: true, ct: true, cct: false, mri: true, angio: true, mammo: false, bmd: true, us: false, status: '在職', note: '' },
  { id: '991239', name: '張宇晞', title: '放射師', role: '放射師', canNight: true, canSat: true, xray: true, ct: true, cct: false, mri: true, angio: true, mammo: false, bmd: true, us: false, status: '在職', note: '' },
  { id: '9309AQ', name: '吳玟娟', title: '放射師', role: '放射師', canNight: true, canSat: true, xray: true, ct: true, cct: false, mri: true, angio: false, mammo: false, bmd: true, us: false, status: '在職', note: '' },
  { id: 'A309W2', name: '黃景旻', title: '放射師', role: '放射師', canNight: true, canSat: true, xray: true, ct: true, cct: true, mri: false, angio: false, mammo: false, bmd: true, us: false, status: '在職', note: '' },
  { id: 'A607Y1', name: '羅云玎', title: '放射師', role: '放射師', canNight: true, canSat: true, xray: true, ct: true, cct: true, mri: false, angio: false, mammo: false, bmd: true, us: false, status: '在職', note: '' },
  { id: 'A204W1', name: '邢乃驊', title: '放射師', role: '放射師', canNight: true, canSat: true, xray: true, ct: true, cct: false, mri: false, angio: false, mammo: false, bmd: true, us: false, status: '在職', note: '' },
  { id: 'A507W7', name: '黃毓珊', title: '放射師', role: '放射師', canNight: true, canSat: true, xray: true, ct: true, cct: false, mri: false, angio: false, mammo: false, bmd: true, us: false, status: '在職', note: '' },
  { id: 'B306W5', name: '林家豪', title: '放射師', role: '放射師', canNight: true, canSat: true, xray: true, ct: true, cct: false, mri: false, angio: false, mammo: false, bmd: true, us: false, status: '在職', note: '原 A601W2 更新' },
  { id: 'B406W4', name: '吳詠俽', title: '放射師', role: '放射師', canNight: true, canSat: true, xray: true, ct: true, cct: false, mri: false, angio: false, mammo: false, bmd: true, us: false, status: '在職', note: '' },
  { id: 'B503W7', name: '連倛妡', title: '放射師', role: '放射師', canNight: true, canSat: true, xray: true, ct: false, cct: false, mri: false, angio: false, mammo: false, bmd: false, us: false, status: '在職', note: '' },
  { id: 'B506W6', name: '郭姿妙', title: '放射師', role: '放射師', canNight: true, canSat: true, xray: true, ct: true, cct: false, mri: false, angio: false, mammo: false, bmd: true, us: false, status: '在職', note: '' },
  { id: 'A609W9', name: '楊恒宜', title: '放射師', role: '放射師', canNight: true, canSat: true, xray: true, ct: true, cct: false, mri: false, angio: false, mammo: false, bmd: true, us: false, status: '停用/留停', note: 'SharePoint 帳號待確認工號' },
  { id: 'A106W6', name: '邱怡庭', title: '放射師', role: '放射師', canNight: true, canSat: true, xray: true, ct: true, cct: false, mri: false, angio: false, mammo: false, bmd: true, us: false, status: '停用/留停', note: 'SharePoint 帳號待確認工號' },

  // 2. 🩺 護理人員 (2位)
  { id: '980898', name: '莊美惠', title: '護理人員', role: '護理人員', canNight: false, canSat: false, xray: false, ct: false, cct: false, mri: false, angio: false, mammo: false, bmd: false, us: false, status: '在職', note: '' },
  { id: '9306R9', name: '陳雅妃', title: '護理人員', role: '護理人員', canNight: false, canSat: false, xray: false, ct: false, cct: false, mri: false, angio: false, mammo: false, bmd: false, us: false, status: '在職', note: '' },

  // 3. 📝 書記 (5位)
  { id: '890944', name: '陳淑貞', title: '書記', role: '書記', canNight: false, canSat: false, xray: false, ct: false, cct: false, mri: false, angio: false, mammo: false, bmd: false, us: false, status: '在職', note: '' },
  { id: '880889', name: '周麗香', title: '書記', role: '書記', canNight: false, canSat: false, xray: false, ct: false, cct: false, mri: false, angio: false, mammo: false, bmd: false, us: false, status: '在職', note: '' },
  { id: 'A612W3', name: '黃郁涵', title: '書記', role: '書記', canNight: false, canSat: false, xray: false, ct: false, cct: false, mri: false, angio: false, mammo: false, bmd: false, us: false, status: '在職', note: '' },
  { id: 'B503Y2', name: '陳雅芬', title: '書記', role: '書記', canNight: false, canSat: false, xray: false, ct: false, cct: false, mri: false, angio: false, mammo: false, bmd: false, us: false, status: '在職', note: '' },
  { id: 'B507W9', name: '許淑閔', title: '書記', role: '書記', canNight: false, canSat: false, xray: false, ct: false, cct: false, mri: false, angio: false, mammo: false, bmd: false, us: false, status: '在職', note: '' }
]

// 放射師依第二專長優先順序排序：乳房攝影 ➔ 超音波 ➔ MRI ➔ 心臟CT ➔ 其他
// 同一群組維持原本相對順序；護理人員、書記排在放射師之後且順序不變
export function sortStaffBySpecialty(staffList) {
  if (!Array.isArray(staffList)) return staffList
  const specialtyGroup = (s) => {
    if (s.mammo) return 1
    if (s.us) return 2
    if (s.mri) return 3
    if (s.cct) return 4
    return 5
  }
  const radiographers = staffList
    .map((s, idx) => ({ s, idx }))
    .filter(({ s }) => s.role === '放射師')
    .sort((a, b) => specialtyGroup(a.s) - specialtyGroup(b.s) || a.idx - b.idx)
    .map(({ s }) => s)
  const others = staffList.filter(s => s.role !== '放射師')
  return [...radiographers, ...others]
}

// 適用星期下拉選項對照表
export const APPLICABLE_DAYS_OPTIONS = [
  { value: '', label: '🚫 不預設自動開班 (由主管手動開設)' },
  { value: '1,2,3,4,5', label: '週一至週五 (平日)' },
  { value: '0,1,2,3,4,5,6', label: '全週 (週一至週日)' },
  { value: '6', label: '僅週六' },
  { value: '0', label: '僅週日' },
  { value: '0,6', label: '週末 (週六與週日)' },
  { value: '1,2,3,4,5,6', label: '週一至週六' }
]

// 班別定義：2026-10-01 依使用者於網頁端更正後的設定寫入（共 26 種）
// 班別時間以 time 填寫，系統會自動拆成 start / end 欄位（見 shiftTime.js）
// restEnd＝休息起算時間（科內規定）：半天班視同 16:30 下班，隔天不可接大夜班
// breakMinutes＝班內休息分鐘數，不計入工時
// nightType＝夜班類別（evening 小夜、night 大夜），科內夜班規則依此判斷
// 公假比照日班 08:00–16:30、工時 8 小時，算上班並受所有排班規則限制（2026-10-01 使用者確認）
const RAW_SHIFT_DEFS = {
  // ===== 1. 🩻 放射師班別 =====
  "D": { "name": "一般日班", "time": "08:00 - 16:30", "breakMinutes": 30, "room": "一般X光", "color": "#475569", "needsSenior": false, "targetRole": "放射師", "modKey": "xray", "applicableDays": "1,2,3,4,5" },
  "E": { "name": "一般小夜班", "nightType": "evening", "time": "16:00 - 00:30", "breakMinutes": 30, "room": "急診X光", "color": "#d97706", "needsSenior": false, "targetRole": "放射師", "modKey": "xray", "applicableDays": "0,1,2,3,4,5,6" },
  "N": { "name": "大夜班", "nightType": "night", "time": "00:00 - 08:30", "breakMinutes": 30, "room": "急診X光", "color": "#dc2626", "needsSenior": false, "targetRole": "放射師", "modKey": "xray", "applicableDays": "0,1,2,3,4,5,6" },
  "d(US)": { "name": "US白班", "time": "08:00 - 16:30", "breakMinutes": 30, "room": "超音波檢查室", "color": "#0284c7", "needsSenior": false, "targetRole": "放射師", "modKey": "us", "applicableDays": "1,2,3,4,5" },
  "d1": { "name": "US半天班", "time": "08:00 - 12:00", "restEnd": "16:30", "breakMinutes": 0, "room": "超音波檢查室", "color": "#0f766e", "needsSenior": false, "targetRole": "放射師", "modKey": "us", "applicableDays": "6" },
  "T": { "name": "CT", "time": "08:00 - 16:30", "breakMinutes": 30, "room": "CT檢查室", "color": "#4f46e5", "needsSenior": true, "targetRole": "放射師", "modKey": "ct", "applicableDays": "1,2,3,4,5" },
  "M": { "name": "心臟CT", "time": "08:30 - 17:00", "breakMinutes": 30, "room": "CT/骨密/牙科", "color": "#e11d48", "needsSenior": true, "targetRole": "放射師", "modKey": "cct", "applicableDays": "1,2,3,4,5" },
  "C9": { "name": "特殊支援CT", "time": "09:00 - 17:30", "breakMinutes": 30, "room": "特殊攝影房", "color": "#059669", "needsSenior": true, "targetRole": "放射師", "modKey": "angio", "applicableDays": "" },
  "d(m)": { "name": "MRI白班", "time": "08:00 - 16:30", "breakMinutes": 30, "room": "MRI檢查室", "color": "#7c3aed", "needsSenior": true, "targetRole": "放射師", "modKey": "mri", "applicableDays": "0,1,2,3,4,5,6" },
  "e(m)": { "name": "MRI晚班", "time": "13:00 - 21:30", "breakMinutes": 30, "room": "MRI檢查室", "color": "#9333ea", "needsSenior": false, "targetRole": "放射師", "modKey": "mri", "applicableDays": "1,2,3,4,5" },
  "C8": { "name": "MAMMO", "time": "08:30 - 17:00", "breakMinutes": 30, "room": "乳房攝影室", "color": "#db2777", "needsSenior": false, "targetRole": "放射師", "modKey": "mammo", "applicableDays": "1,2,3,4,5" },
  "C2(m)": { "name": "C2 假日Mammo班", "time": "08:30 - 12:30", "restEnd": "16:30", "breakMinutes": 0, "room": "乳房攝影室", "color": "#c026d3", "needsSenior": false, "targetRole": "放射師", "modKey": "mammo", "applicableDays": "6" },
  "C2": { "name": "C2支援班", "time": "08:30 - 12:30", "restEnd": "16:30", "breakMinutes": 0, "room": "C2支援", "color": "#16a34a", "needsSenior": false, "targetRole": "放射師", "modKey": "angio", "applicableDays": "6" },
  "M1": { "name": "骨密牙科", "time": "08:30 - 17:00", "breakMinutes": 30, "room": "骨密牙科攝影室", "color": "#ea580c", "needsSenior": false, "targetRole": "放射師", "modKey": "bmd", "applicableDays": "" },

  // ===== 2. 🩺 護理人員班別 =====
  "96": { "name": "96白班", "time": "09:00 - 18:00", "breakMinutes": 60, "room": "護理", "color": "#be123c", "needsSenior": false, "targetRole": "護理人員", "modKey": null, "applicableDays": "1,2,3,4,5" },
  "CO（n）": { "name": "護理常規日班", "time": "08:00 - 17:00", "breakMinutes": 60, "room": "護理", "color": "#e11d48", "needsSenior": false, "targetRole": "護理人員", "modKey": null, "applicableDays": "" },
  "D1(n)": { "name": "護理半天班", "time": "08:00 - 12:00", "restEnd": "16:30", "breakMinutes": 0, "room": "護理", "color": "#f43f5e", "needsSenior": false, "targetRole": "護理人員", "modKey": null, "applicableDays": "6" },
  "e(n)": { "name": "護理常規晚班", "time": "13:00 - 21:30", "breakMinutes": 30, "room": "護理", "color": "#b45309", "needsSenior": false, "targetRole": "護理人員", "modKey": null, "applicableDays": "1,2,3,4,5" },

  // ===== 3. 📝 書記班別 =====
  "83（行）": { "name": "櫃檯行政日班", "time": "08:00 - 17:00", "breakMinutes": 60, "room": "登記櫃檯", "color": "#475569", "needsSenior": false, "targetRole": "書記", "modKey": null, "applicableDays": "1,2,3,4,5" },
  "C2(行)": { "name": "櫃檯行政半日班", "time": "08:30 - 12:30", "restEnd": "16:30", "breakMinutes": 0, "room": "登記櫃檯", "color": "#334155", "needsSenior": false, "targetRole": "書記", "modKey": null, "applicableDays": "6" },
  "CO（行）": { "name": "櫃檯行政日班", "time": "08:00 - 17:00", "breakMinutes": 60, "room": "登記櫃檯", "color": "#1e293b", "needsSenior": false, "targetRole": "書記", "modKey": null, "applicableDays": "1,2,3,4,5" },
  "D1（行）": { "name": "櫃檯行政半日班", "time": "08:00 - 12:00", "restEnd": "16:30", "breakMinutes": 0, "room": "登記櫃檯", "color": "#64748b", "needsSenior": false, "targetRole": "書記", "modKey": null, "applicableDays": "6" },
  "e（行）": { "name": "櫃檯行政晚班", "time": "13:00 - 21:30", "breakMinutes": 30, "room": "登記櫃檯", "color": "#4b5563", "needsSenior": false, "targetRole": "書記", "modKey": null, "applicableDays": "" },

  // ===== 4. 🏖️ 通用假別 =====
  "V": { "name": "特休", "time": "-", "room": "特休", "color": "#0284c7", "needsSenior": false, "targetRole": null, "modKey": null, "applicableDays": "1,2,3,4,5" },
  "公": { "name": "公假", "time": "08:00 - 16:30", "breakMinutes": 30, "room": "公假", "color": "#059669", "needsSenior": false, "targetRole": null, "modKey": null, "applicableDays": "1,2,3,4,5" },
  "OFF": { "name": "休假/例假", "time": "-", "room": "-", "color": "#94a3b8", "needsSenior": false, "targetRole": null, "modKey": null, "applicableDays": "0,1,2,3,4,5,6" }
}

export const SHIFT_DEFS = normalizeShiftDefs(RAW_SHIFT_DEFS)

export const ROOM_DEFS = [
  { id: 'CT', name: 'CT 電腦斷層房', primaryShift: 'T' },
  { id: 'CCT', name: '心臟 CT 室', primaryShift: 'M' },
  { id: 'MRI', name: 'MRI 核磁共振房', primaryShift: 'd(m)' },
  { id: 'ANGIO', name: '特殊攝影房', primaryShift: 'C9' },
  { id: 'BMD', name: '牙科骨密室', primaryShift: 'M1' },
  { id: 'US', name: '超音波檢查室', primaryShift: 'd(US)' },
  { id: 'DR', name: 'DR 一般X光房', primaryShift: 'D' },
  { id: 'NURSE', name: '護理處置室', primaryShift: 'CO（n）' },
  { id: 'CLERK', name: '登記櫃檯', primaryShift: '83（行）' },
  { id: 'ER_NIGHT', name: '急診夜班房', primaryShift: 'E' },
  { id: 'ER_DEEP', name: '急診大夜房', primaryShift: 'N' }
]

export const LEAVE_TYPES = [
  { id: 'full', name: '全日請假 (08:00–17:00)' },
  { id: 'am', name: '上午請假 (08:00–12:00)' },
  { id: 'pm', name: '下午請假 (13:00–17:00)' },
  { id: 'rad_edu', name: '輻射防護繼續教育訓練' }
]

// 預設排班合規、勞基法、四週變形工時與科內營運計畫條款
export const DEFAULT_COMPLIANCE_RULES = [
  { id: 'R01', category: '勞基法剛性規範', name: '輪班換班休息時間不足 11 小時阻擋', lawRef: '勞基法第 34 條', weight: 100, enabled: true, action: '⛔ 硬性強制作業不可違反 (系統禁止選班)' },
  { id: 'R02', category: '四週變形工時', name: '雙週內連續上班超過 12 天阻擋', lawRef: '勞基法第 30 條之 1', weight: 100, enabled: true, action: '⛔ 硬性強制作業不可違反 (系統禁止選班)' },
  { id: 'R03', category: '四週變形工時', name: '四週休假總天數少於 8 天阻擋', lawRef: '勞基法第 30 條之 1', weight: 100, enabled: true, action: '⛔ 硬性強制作業不可違反 (系統禁止選班)' },
  { id: 'R04', category: '勞基法剛性規範', name: '每日工作時數上限超過 12 小時阻擋', lawRef: '勞基法第 32 條', weight: 100, enabled: true, action: '⛔ 硬性強制作業不可違反 (系統禁止選班)' },
  { id: 'R05', category: '勞基法剛性規範', name: '妊娠/母性保護同仁禁止夜間工作阻擋', lawRef: '勞基法第 49 條', weight: 100, enabled: true, action: '⛔ 硬性強制作業不可違反 (系統禁止選班)' },
  { id: 'R06', category: '科內營運計畫', name: '診間與特殊機台房每日最低營運人力保底', lawRef: '放射科營運計畫書', weight: 90, enabled: true, action: '⚠️ 營運保底提示與人力調配引導' },
  { id: 'R07', category: '科內營運計畫', name: '第二專長放射師當月最低需求天數達標', lawRef: '科內人力培育計畫', weight: 90, enabled: true, action: '⚠️ 專長優先推薦與目標達成引導' },
  { id: 'R08', category: '科內營運計畫', name: '高階攝影房 (CT/MRI) 主管資深帶導門檻', lawRef: '品質控管規範', weight: 90, enabled: true, action: '⚠️ 專業帶導警示與人次檢核' },
  { id: 'R09', category: '院內健康關懷', name: '連續上班超過 6 天疲勞預警', lawRef: '健康促進計畫', weight: 80, enabled: true, action: '💡 黃色溫馨防過勞提示' },
  { id: 'R10', category: '院內健康關懷', name: '單月急診夜班上限 (預設 6 天) 關懷提示', lawRef: '夜班關懷條例', weight: 80, enabled: true, action: '💡 排班負擔關懷提醒' },
  { id: 'R11', category: '個人化排班', name: '同仁自主選班與預期休假意願滿足率', lawRef: '同仁滿意度關懷', weight: 50, enabled: true, action: '💡 彈性意願滿足' },
  { id: 'R12', category: '勞基法剛性規範', name: '日班/晚班/小夜班隔天禁止接大夜班 N (不足 11h 阻擋)', lawRef: '勞基法第 34 條', weight: 100, enabled: true, action: '⛔ 硬性強制作業不可違反 (系統禁止選班)' },
  { id: 'R13', category: '勞基法剛性規範', name: 'MRI 晚班 e(m) 隔天禁止接 08:00 日班 (10.5h 不足阻擋)', lawRef: '勞基法第 34 條', weight: 100, enabled: true, action: '⛔ 硬性強制作業不可違反 (系統禁止選班)' },
  { id: 'R14', category: '勞基法剛性規範', name: '一般小夜班 E 隔天禁止接指定班別 (00:30 下班不足 11h 阻擋)', lawRef: '勞基法第 34 條', weight: 100, enabled: true, action: '⛔ 硬性強制作業不可違反 (系統禁止選班)' }
]

// 預設第二專長月指定天數
// 2026-09-30 使用者指示全部歸零，待路線圖 S1-6 重新設定
export const DEFAULT_SPECIALTY_TARGETS = {}

// 第二專長目標天數資料版本：變更時瀏覽器會改載入 DEFAULT_SPECIALTY_TARGETS（不影響人員專長勾選）
export const SPECIALTY_TARGETS_VERSION = 'targets_reset_20260930'


