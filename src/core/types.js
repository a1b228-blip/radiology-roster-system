/**
 * 放射診斷科排班系統 核心型態與預設設定 (types.js)
 */

// 預設放射師主檔
export const DEFAULT_STAFF = [
  { id: 'R1', name: '王組長', level: '組長', canNight: false, canSat: true, ct: true, mri: true, angio: true, mammo: false, note: '組長；行政與督導；高階攝影臨床指導' },
  { id: 'R2', name: '陳資深', level: '資深', canNight: true,  canSat: true, ct: true, mri: true, angio: true, mammo: false, note: '主力；具 24h Angio On-Call 與 CT/MRI 執照' },
  { id: 'R3', name: '林資深', level: '資深', canNight: true,  canSat: true, ct: true, mri: true, angio: false, mammo: true, note: '主力；負責 MRI 房與 CT 房臨床帶導' },
  { id: 'R4', name: '張放射師', level: '常規', canNight: true, canSat: true, ct: true, mri: false, angio: false, mammo: false, note: '常規；負責 CT 房與一般 DR 門診房' },
  { id: 'R5', name: '李放射師', level: '常規', canNight: true, canSat: true, ct: false, mri: true, angio: false, mammo: true, note: '常規；負責 MRI 房與乳房攝影' },
  { id: 'R6', name: '趙放射師', level: '常規', canNight: true, canSat: true, ct: false, mri: false, angio: false, mammo: false, note: '常規；一般 DR 房與門診急診發片' },
  { id: 'R7', name: '新人甲', level: '新進', canNight: false, canSat: true, ct: false, mri: false, angio: false, mammo: false, note: '新人第一年；僅上門診 DR 白班' }
]

// 班別定義與時間段
export const SHIFT_DEFS = {
  'D_CT':    { name: 'CT白班', time: '08:00–17:00', room: 'CT檢查室', color: '#0284c7', needsSenior: true, modKey: 'ct' },
  'D_MRI':   { name: 'MRI白班', time: '08:00–17:00', room: 'MRI檢查室', color: '#7c3aed', needsSenior: true, modKey: 'mri' },
  'D_ANGIO': { name: 'Angio白班', time: '08:30–17:30', room: '血管攝影房', color: '#059669', needsSenior: false, modKey: 'angio' },
  'D_DR':    { name: 'DR白班', time: '08:00–17:00', room: '一般X光房', color: '#475569', needsSenior: false, modKey: null },
  'E_NIGHT': { name: '急診小夜', time: '16:00–24:00', room: '急診室(夜)', color: '#d97706', needsSenior: false, modKey: null },
  'G_NIGHT': { name: '急診大夜', time: '00:00–08:00', room: '急診室(深夜)', color: '#dc2626', needsSenior: false, modKey: null },
  'CALL':    { name: '24h OnCall', time: '08:00–08:00', room: 'On-Call待命', color: '#2563eb', needsSenior: false, modKey: 'angio' },
  'SAT_D':   { name: '週六門診', time: '08:00–12:30', room: '週六門診房', color: '#0891b2', needsSenior: false, modKey: null },
  'OFF':     { name: '休假/例假', time: '-', room: '-', color: '#94a3b8', needsSenior: false, modKey: null }
}

// 檢查室 / 房間清單 (用於機台視角渲染)
export const ROOM_DEFS = [
  { id: 'CT', name: 'CT 電腦斷層房', primaryShift: 'D_CT' },
  { id: 'MRI', name: 'MRI 核磁共振房', primaryShift: 'D_MRI' },
  { id: 'ANGIO', name: 'Angio 血管攝影房', primaryShift: 'D_ANGIO' },
  { id: 'DR', name: 'DR 一般X光房', primaryShift: 'D_DR' },
  { id: 'ER_NIGHT', name: '急診夜班房', primaryShift: 'E_NIGHT' },
  { id: 'ER_DEEP', name: '急診大夜房', primaryShift: 'G_NIGHT' }
]

// 假別定義
export const LEAVE_TYPES = [
  { id: 'full', name: '全日請假 (08:00–17:00)' },
  { id: 'am', name: '上午請假 (08:00–12:00)' },
  { id: 'pm', name: '下午請假 (13:00–17:00)' },
  { id: 'rad_edu', name: '輻射防護繼續教育訓練' }
]
