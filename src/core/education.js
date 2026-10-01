/**
 * 放射師 20 小時上課工時 (education.js)
 * 規則（2026-10-01 使用者確認，見 docs/V2排班規則.md 第五章）：
 * - 只有放射師適用；每人每年（1/1–12/31）20 小時，用完不能再登記
 * - 上班時間內上課：原本的班照算，不另加工時，只扣額度
 * - 年假上課：當天比照公假 08:00–16:30 算上班 8 小時（上課時數＋特休補足）；
 *   上課超過 8 小時一律以 8 小時計
 */

// 每人每年上課工時額度（小時）
export const EDU_YEARLY_QUOTA_HOURS = 20

// 年假上課當天計為幾小時
export const EDU_LEAVE_DAY_HOURS = 8

// 上課方式
export const EDU_MODE_ON_DUTY = 'onDuty'            // 上班時間內上課
export const EDU_MODE_ANNUAL_LEAVE = 'annualLeave'  // 年假上課
export const EDU_MODE_LABELS = {
  [EDU_MODE_ON_DUTY]: '上班時間內上課',
  [EDU_MODE_ANNUAL_LEAVE]: '年假上課'
}

// 年假上課在排班規則檢查中視為一個班別：比照公假 08:00–16:30、工時 8 小時
export const EDU_LEAVE_CODE = '年假上課'
export const EDU_LEAVE_DEF = {
  name: '年假上課',
  start: '08:00',
  end: '16:30',
  restEnd: '',
  breakMinutes: 30,
  nightType: '',
  time: '08:00 - 16:30',
  targetRole: null,
  color: '#0369a1'
}

/** 是否為上課紀錄 */
export function isEduRecord(record) {
  return !!record && record.type === 'rad_edu'
}

/** 上課方式；舊紀錄沒有這個欄位，一律視為上班時間內上課（不影響排班） */
export function getEduMode(record) {
  return record?.mode === EDU_MODE_ANNUAL_LEAVE ? EDU_MODE_ANNUAL_LEAVE : EDU_MODE_ON_DUTY
}

/** 是否為「年假上課」紀錄（當天算上班，會連動排班規則） */
export function isAnnualLeaveClass(record) {
  return isEduRecord(record) && getEduMode(record) === EDU_MODE_ANNUAL_LEAVE
}

export function getEduDate(record) {
  return record?.date || record?.start || ''
}

/** 實際上課時數（下課時間減上課時間）；時間不完整或下課早於上課回傳 0 */
export function getClassHours(record) {
  const parse = (t) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || ''))
    return m ? Number(m[1]) + Number(m[2]) / 60 : null
  }
  const start = parse(record?.startTime)
  const end = parse(record?.endTime)
  if (start === null || end === null || end <= start) return 0
  return Math.round((end - start) * 100) / 100
}

/** 計入 20 小時額度的時數；年假上課超過 8 小時以 8 小時計 */
export function getQuotaHours(record) {
  const hours = getClassHours(record)
  return isAnnualLeaveClass(record) ? Math.min(hours, EDU_LEAVE_DAY_HOURS) : hours
}

/** 年假上課當天需用特休補足的時數（上班時間內上課為 0） */
export function getAnnualLeaveTopUpHours(record) {
  if (!isAnnualLeaveClass(record)) return 0
  return Math.round((EDU_LEAVE_DAY_HOURS - getQuotaHours(record)) * 100) / 100
}

/** 某位同仁某一年度已使用的額度時數 */
export function getYearlyUsedHours(records, staffId, year) {
  const total = (records || [])
    .filter(r => isEduRecord(r) && r.staffId === staffId && getEduDate(r).slice(0, 4) === String(year))
    .reduce((sum, r) => sum + getQuotaHours(r), 0)
  return Math.round(total * 100) / 100
}
