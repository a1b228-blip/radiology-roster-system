export const ROLES = ['放射師', '護理人员', '書記']

export const DEFAULT_STAFF = [
  // 1. 🩻 放射師 (19位)
  { id: '940356', name: '廖雪貞', role: '放射師', level: '資深', canNight: true,  canSat: true,  xray: true, ct: true,  cct: true,  mri: true,  angio: true,  mammo: true,  bmd: true,  us: false, status: '在職' },
  { id: '100414', name: '林千鐘', role: '放射師', level: '資深', canNight: true,  canSat: true,  xray: true, ct: true,  cct: true,  mri: true,  angio: true,  mammo: false, bmd: false, us: true,  status: '在職' },
  { id: 'A105W2', name: '張鼎晨', role: '放射師', level: '常規', canNight: false, canSat: true,  xray: true, ct: true,  cct: true,  mri: false, angio: true,  mammo: false, bmd: false, us: true,  status: '在職' },
  { id: '970733', name: '林子翔', role: '放射師', level: '資深', canNight: true,  canSat: true,  xray: true, ct: true,  cct: true,  mri: true,  angio: true,  mammo: false, bmd: false, us: false, status: '在職' },
  { id: '991239', name: '張宇晞', role: '放射師', level: '資深', canNight: true,  canSat: true,  xray: true, ct: true,  cct: true,  mri: true,  angio: true,  mammo: false, bmd: false, us: false, status: '在職' },
  { id: 'A00534', name: '江瑞益', role: '放射師', level: '主管', canNight: false, canSat: true,  xray: true, ct: true,  cct: true,  mri: true,  angio: true,  mammo: false, bmd: false, us: false, status: '在職' },
  { id: '9309AQ', name: '吳玟娟', role: '放射師', level: '資深', canNight: true,  canSat: true,  xray: true, ct: true,  cct: true,  mri: true,  angio: false, mammo: false, bmd: false, us: false, status: '在職' },
  { id: 'A204W1', name: '邢乃驊', role: '放射師', level: '常規', canNight: true,  canSat: true,  xray: true, ct: true,  cct: false, mri: false, angio: false, mammo: false, bmd: false, us: false, status: '在職' },
  { id: 'A507W7', name: '黃毓珊', role: '放射師', level: '常規', canNight: true,  canSat: true,  xray: true, ct: true,  cct: false, mri: false, angio: false, mammo: false, bmd: false, us: false, status: '在職' },
  { id: '100412', name: '陳韋志', role: '放射師', level: '資深', canNight: true,  canSat: true,  xray: true, ct: true,  cct: false, mri: false, angio: false, mammo: false, bmd: false, us: false, status: '在職' },
  { id: 'A302W5', name: '李明致', role: '放射師', level: '常規', canNight: true,  canSat: true,  xray: true, ct: true,  cct: false, mri: false, angio: false, mammo: false, bmd: false, us: false, status: '在職' },
  { id: 'A401W6', name: '黃詩茹', role: '放射師', level: '常規', canNight: true,  canSat: true,  xray: true, ct: false, cct: false, mri: false, angio: false, mammo: false, bmd: false, us: false, status: '在職' },
  { id: 'A502W9', name: '王俊傑', role: '放射師', level: '新進', canNight: true,  canSat: true,  xray: true, ct: false, cct: false, mri: false, angio: false, mammo: false, bmd: false, us: false, status: '在職' },
  { id: 'A509W1', name: '陳思涵', role: '放射師', level: '新進', canNight: true,  canSat: true,  xray: true, ct: false, cct: false, mri: false, angio: false, mammo: false, bmd: false, us: false, status: '在職' },
  { id: 'A601W2', name: '林家豪', role: '放射師', level: '新進', canNight: true,  canSat: true,  xray: true, ct: false, cct: false, mri: false, angio: false, mammo: false, bmd: false, us: false, status: '在職' },
  { id: 'A603W4', name: '張雅晴', role: '放射師', level: '新進', canNight: true,  canSat: true,  xray: true, ct: false, cct: false, mri: false, angio: false, mammo: false, bmd: false, us: false, status: '在職' },
  { id: 'A605W6', name: '許哲銘', role: '放射師', level: '新進', canNight: true,  canSat: true,  xray: true, ct: false, cct: false, mri: false, angio: false, mammo: false, bmd: false, us: false, status: '在職' },
  { id: 'A608W8', name: '鄭怡婷', role: '放射師', level: '新進', canNight: true,  canSat: true,  xray: true, ct: false, cct: false, mri: false, angio: false, mammo: false, bmd: false, us: false, status: '在職' },
  { id: 'A610W0', name: '蔡宗翰', role: '放射師', level: '新進', canNight: true,  canSat: true,  xray: true, ct: false, cct: false, mri: false, angio: false, mammo: false, bmd: false, us: false, status: '在職' },

  // 2. 🩺 護理人員 (2位)
  { id: '960410', name: '護理師A', role: '護理人員', level: '資深', canNight: false, canSat: false, xray: false, ct: false, cct: false, mri: false, angio: false, mammo: false, bmd: false, us: false, status: '在職' },
  { id: '980211', name: '護理師B', role: '護理人員', level: '常規', canNight: false, canSat: false, xray: false, ct: false, cct: false, mri: false, angio: false, mammo: false, bmd: false, us: false, status: '在職' },

  // 3. 📝 書記 (5位)
  { id: '910101', name: '書記A', role: '書記', level: '資深', canNight: false, canSat: false, xray: false, ct: false, cct: false, mri: false, angio: false, mammo: false, bmd: false, us: false, status: '在職' },
  { id: '920202', name: '書記B', role: '書記', level: '常規', canNight: false, canSat: false, xray: false, ct: false, cct: false, mri: false, angio: false, mammo: false, bmd: false, us: false, status: '在職' },
  { id: '930303', name: '書記C', role: '書記', level: '常規', canNight: false, canSat: false, xray: false, ct: false, cct: false, mri: false, angio: false, mammo: false, bmd: false, us: false, status: '在職' },
  { id: '940404', name: '書記D', role: '書記', level: '新進', canNight: false, canSat: false, xray: false, ct: false, cct: false, mri: false, angio: false, mammo: false, bmd: false, us: false, status: '在職' },
  { id: '950505', name: '書記E', role: '書記', level: '新進', canNight: false, canSat: false, xray: false, ct: false, cct: false, mri: false, angio: false, mammo: false, bmd: false, us: false, status: '在職' }
]

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

export const SHIFT_DEFS = {
  // ===== 1. 🩻 放射師班別 (首序) =====
  "D": { "name": "一般日班", "time": "08:00 - 16:30", "room": "一般攝影房", "color": "#475569", "needsSenior": false, "targetRole": "放射師", "modKey": "xray", "applicableDays": "1,2,3,4,5" },
  "E": { "name": "一般小夜班", "time": "16:00 - 00:30", "room": "急診X光房", "color": "#d97706", "needsSenior": false, "targetRole": "放射師", "modKey": "xray", "applicableDays": "0,1,2,3,4,5,6" },
  "N": { "name": "大夜班", "time": "00:00 - 08:30", "room": "急診大夜房", "color": "#dc2626", "needsSenior": false, "targetRole": "放射師", "modKey": "xray", "applicableDays": "0,1,2,3,4,5,6" },
  "d(US)": { "name": "US白班", "time": "08:00 - 16:30", "room": "超音波檢查室", "color": "#0284c7", "needsSenior": false, "targetRole": "放射師", "modKey": "us", "applicableDays": "1,2,3,4,5" },
  "d1": { "name": "US半天班", "time": "08:00 - 12:00", "room": "超音波半日房", "color": "#0f766e", "needsSenior": false, "targetRole": "放射師", "modKey": "us", "applicableDays": "1,2,3,4,5" },
  "T": { "name": "CT", "time": "08:00 - 16:30", "room": "CT檢查室", "color": "#4f46e5", "needsSenior": true, "targetRole": "放射師", "modKey": "ct", "applicableDays": "1,2,3,4,5" },
  "D_CCT": { "name": "心臟CT", "time": "08:00 - 16:30", "room": "心臟CT檢查室", "color": "#e11d48", "needsSenior": true, "targetRole": "放射師", "modKey": "cct", "applicableDays": "1,2,3,4,5" },
  "C9": { "name": "特殊支援CT", "time": "09:00 - 17:30", "room": "特殊攝影房", "color": "#059669", "needsSenior": true, "targetRole": "放射師", "modKey": "angio", "applicableDays": "1,2,3,4,5" },
  "d(m)": { "name": "MRI白班", "time": "08:00 - 16:30", "room": "MRI檢查室", "color": "#7c3aed", "needsSenior": true, "targetRole": "放射師", "modKey": "mri", "applicableDays": "1,2,3,4,5" },
  "e(m)": { "name": "MRI晚班", "time": "13:00 - 21:30", "room": "MRI晚班房", "color": "#9333ea", "needsSenior": false, "targetRole": "放射師", "modKey": "mri", "applicableDays": "1,2,3,4,5" },
  "C8": { "name": "MAMMO", "time": "08:30 - 17:00", "room": "乳房攝影室", "color": "#db2777", "needsSenior": false, "targetRole": "放射師", "modKey": "mammo", "applicableDays": "1,2,3,4,5" },
  "C2(m)": { "name": "C2 假日Mammo班", "time": "08:30 - 12:30", "room": "Mammo假日房", "color": "#c026d3", "needsSenior": false, "targetRole": "放射師", "modKey": "mammo", "applicableDays": "6" },
  "C2": { "name": "C2支援班", "time": "08:30 - 12:30", "room": "C2支援房", "color": "#16a34a", "needsSenior": false, "targetRole": "放射師", "modKey": "angio", "applicableDays": "1,2,3,4,5" },
  "M": { "name": "骨密牙科", "time": "08:30 - 17:00", "room": "骨密牙科攝影室", "color": "#ea580c", "needsSenior": false, "targetRole": "放射師", "modKey": "bmd", "applicableDays": "1,2,3,4,5" },
  "CALL": { "name": "24h OnCall", "time": "08:00 - 08:00", "room": "On-Call待命", "color": "#2563eb", "needsSenior": false, "targetRole": "放射師", "modKey": "angio", "applicableDays": "0,1,2,3,4,5,6" },
  "SAT_D": { "name": "週六門診", "time": "08:00 - 12:30", "room": "週六門診房", "color": "#0891b2", "needsSenior": false, "targetRole": "放射師", "modKey": null, "applicableDays": "6" },

  // ===== 2. 🩺 護理人員班別 (次序 - 預設空白，不自動預設開班) =====
  "96": { "name": "96白班", "time": "09:00 - 18:00", "room": "96護理房", "color": "#be123c", "needsSenior": false, "targetRole": "護理人員", "modKey": null, "applicableDays": "" },
  "CO（n）": { "name": "護理常規日班", "time": "08:00 - 16:30", "room": "護理處置室", "color": "#e11d48", "needsSenior": false, "targetRole": "護理人員", "modKey": null, "applicableDays": "" },
  "D1(n)": { "name": "護理半天班", "time": "08:00 - 12:00", "room": "護理半日房", "color": "#f43f5e", "needsSenior": false, "targetRole": "護理人員", "modKey": null, "applicableDays": "" },
  "e(n)": { "name": "護理常規晚班", "time": "13:00 - 21:30", "room": "護理晚班房", "color": "#b45309", "needsSenior": false, "targetRole": "護理人員", "modKey": null, "applicableDays": "" },
  "CALL_NURSE": { "name": "護理OnCall", "time": "08:00 - 08:00", "room": "護理待命", "color": "#9f1239", "needsSenior": false, "targetRole": "護理人員", "modKey": null, "applicableDays": "" },


  // ===== 3. 📝 書記班別 (三序) =====
  "83（行）": { "name": "櫃檯行政日班", "time": "08:00 - 17:00", "room": "登記櫃檯", "color": "#475569", "needsSenior": false, "targetRole": "書記", "modKey": null, "applicableDays": "1,2,3,4,5" },
  "C2(行)": { "name": "櫃檯行政半日班", "time": "08:30 - 12:30", "room": "櫃檯半日房", "color": "#334155", "needsSenior": false, "targetRole": "書記", "modKey": null, "applicableDays": "6" },
  "CO（行）": { "name": "櫃檯行政日班", "time": "08:00 - 17:00", "room": "登記櫃檯", "color": "#1e293b", "needsSenior": false, "targetRole": "書記", "modKey": null, "applicableDays": "1,2,3,4,5" },
  "D1（行）": { "name": "櫃檯行政半日班", "time": "08:00 - 12:00", "room": "櫃檯半日房", "color": "#64748b", "needsSenior": false, "targetRole": "書記", "modKey": null, "applicableDays": "1,2,3,4,5" },
  "e（行）": { "name": "櫃檯行政晚班", "time": "13:00 - 21:00", "room": "櫃檯晚班房", "color": "#4b5563", "needsSenior": false, "targetRole": "書記", "modKey": null, "applicableDays": "1,2,3,4,5" },

  // ===== 4. 🏖️ 通用假別 (末序) =====
  "V": { "name": "特休", "time": "-", "room": "特休", "color": "#0284c7", "needsSenior": false, "targetRole": null, "modKey": null, "applicableDays": "1,2,3,4,5" },
  "公": { "name": "公假", "time": "-", "room": "公假", "color": "#059669", "needsSenior": false, "targetRole": null, "modKey": null, "applicableDays": "1,2,3,4,5" },
  "OFF": { "name": "休假/例假", "time": "-", "room": "-", "color": "#94a3b8", "needsSenior": false, "targetRole": null, "modKey": null, "applicableDays": "0,1,2,3,4,5,6" }
}

export const ROOM_DEFS = [
  { id: 'CT', name: 'CT 電腦斷層房', primaryShift: 'T' },
  { id: 'CCT', name: '心臟 CT 室', primaryShift: 'D_CCT' },
  { id: 'MRI', name: 'MRI 核磁共振房', primaryShift: 'd(m)' },
  { id: 'ANGIO', name: '特殊攝影房', primaryShift: 'C9' },
  { id: 'BMD', name: '牙科骨密室', primaryShift: 'M' },
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
export const DEFAULT_SPECIALTY_TARGETS = {
  '940356': { us: 8, mammo: 4, mri: 4 }, // 廖雪貞
  '100414': { us: 8 },                   // 林千鐘
  'A105W2': { us: 8 },                   // 張鼎晨
  '970733': { mri: 6, angio: 4 },        // 林子翔
  '991239': { mri: 6, angio: 4 },        // 張宇晞
  'A00534': { mri: 6 }                    // 江瑞益
}


