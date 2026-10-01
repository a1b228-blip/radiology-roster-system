/**
 * 科內排班基準 (deptRules.js)
 * 兩層規則：法規底線固定不可調；科內標準可調整，但只能比法規嚴格。
 * 規則內容與確認紀錄見 docs/勞基法排班規則草案.md 第六節。
 */
import { getShiftInterval, getRestGap, formatClock, MIN_REST_HOURS } from './shiftTime.js'

// 法規底線：四週變形工時下連續工作日數上限（勞動部醫療保健服務業契約範例）
export const LEGAL_MAX_CONSECUTIVE_WORK_DAYS = 12

// 白班：上班時間早於這個時刻、且不是大夜班的班別
const DAY_SHIFT_START_BEFORE_HOUR = 12

// 科內標準預設值（2026-10-01 使用者確認）
export const DEFAULT_DEPT_RULES = {
  maxConsecutiveWorkDays: 6,   // 連續上班最多幾天（特休、公假都算上班）
  eveningMaxRunsPerMonth: 2,   // 小夜班每月最多幾輪
  eveningMaxRunLength: 6,      // 小夜班每輪最多連續幾天
  nightMaxRunsPerMonth: 2,     // 大夜班每月最多幾輪
  nightMaxRunLength: 6,        // 大夜班每輪最多連續幾天
  restDayAfterNight: true      // 大夜班隔天必須休假，再隔一天才能接白班
}

// 夜班類別顯示名稱（班別定義的 nightType 欄位）
export const NIGHT_TYPE_LABELS = { evening: '小夜班', night: '大夜班' }

/** 補齊缺漏欄位，並確保科內標準不會比法規寬鬆 */
export function normalizeDeptRules(rules) {
  const merged = { ...DEFAULT_DEPT_RULES, ...(rules || {}) }
  const toInt = (value, fallback, min, max) => {
    const n = Math.floor(Number(value))
    if (isNaN(n) || n < min) return fallback
    return Math.min(n, max)
  }
  return {
    maxConsecutiveWorkDays: toInt(merged.maxConsecutiveWorkDays, DEFAULT_DEPT_RULES.maxConsecutiveWorkDays, 1, LEGAL_MAX_CONSECUTIVE_WORK_DAYS),
    eveningMaxRunsPerMonth: toInt(merged.eveningMaxRunsPerMonth, DEFAULT_DEPT_RULES.eveningMaxRunsPerMonth, 0, 31),
    eveningMaxRunLength: toInt(merged.eveningMaxRunLength, DEFAULT_DEPT_RULES.eveningMaxRunLength, 1, LEGAL_MAX_CONSECUTIVE_WORK_DAYS),
    nightMaxRunsPerMonth: toInt(merged.nightMaxRunsPerMonth, DEFAULT_DEPT_RULES.nightMaxRunsPerMonth, 0, 31),
    nightMaxRunLength: toInt(merged.nightMaxRunLength, DEFAULT_DEPT_RULES.nightMaxRunLength, 1, LEGAL_MAX_CONSECUTIVE_WORK_DAYS),
    restDayAfterNight: merged.restDayAfterNight !== false
  }
}

function shiftDate(dateStr, offset) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d + offset)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

/** 是否為白班（有出勤時間、中午前上班、且不是大夜班） */
export function isDayShift(def) {
  const iv = getShiftInterval(def)
  return !!iv && def.nightType !== 'night' && iv.startHour < DAY_SHIFT_START_BEFORE_HOUR
}

/**
 * 前一日上 prevDef、隔日上 nextDef 是否可行
 * 回傳 null 代表可以接；否則回傳 { type, gap?, byDeptRule?, label, detail }
 * 選班驗證與班別設定頁的「接班檢核預覽」共用這個函式，確保兩邊判定一致
 */
export function checkNextDayShift(prevDef, nextDef, deptRules) {
  const rules = normalizeDeptRules(deptRules)

  const rest = getRestGap(prevDef, nextDef)
  if (rest && !rest.ok) {
    const prevIv = getShiftInterval(prevDef)
    const nextIv = getShiftInterval(nextDef)
    if (rest.byDeptRule) {
      return {
        type: 'rest', gap: rest.gap, byDeptRule: true,
        label: `休息僅 ${rest.gap.toFixed(1)}h`,
        detail: `依科內規定視同 ${formatClock(prevIv.restEndHour)} 下班起算休息，至 ${formatClock(nextIv.startHour)} 上班僅 ${rest.gap.toFixed(1)} 小時，未滿 ${MIN_REST_HOURS} 小時`
      }
    }
    if (rest.gap < 0) {
      return {
        type: 'rest', gap: rest.gap, byDeptRule: false,
        label: '兩班時段重疊',
        detail: `${formatClock(prevIv.endHour)} 下班前即須於 ${formatClock(nextIv.startHour)} 上班，兩班時段重疊`
      }
    }
    return {
      type: 'rest', gap: rest.gap, byDeptRule: false,
      label: `休息僅 ${rest.gap.toFixed(1)}h`,
      detail: `${formatClock(prevIv.endHour)} 下班至 ${formatClock(nextIv.startHour)} 上班，兩班間隔僅 ${rest.gap.toFixed(1)} 小時，低於法定 ${MIN_REST_HOURS} 小時限制`
    }
  }

  if (rules.restDayAfterNight && prevDef?.nightType === 'night' && isDayShift(nextDef)) {
    return {
      type: 'afterNight', byDeptRule: true,
      label: '大夜隔天須休假',
      detail: '大夜班結束後隔天必須休假，再隔一天才能接白班'
    }
  }

  return null
}

/**
 * 連續上班天數檢查：加入 dateStr 之後，包含該日的連續上班天數是否超過上限
 * workDates 為同仁已排班的日期集合（特休、公假都算上班）
 */
export function checkConsecutiveWorkDays(workDates, dateStr, deptRules) {
  const rules = normalizeDeptRules(deptRules)
  const dates = new Set(workDates)
  dates.add(dateStr)

  let start = dateStr
  while (dates.has(shiftDate(start, -1))) start = shiftDate(start, -1)
  let end = dateStr
  while (dates.has(shiftDate(end, 1))) end = shiftDate(end, 1)

  const [sy, sm, sd] = start.split('-').map(Number)
  const [ey, em, ed] = end.split('-').map(Number)
  const length = Math.round((new Date(ey, em - 1, ed) - new Date(sy, sm - 1, sd)) / 86400000) + 1

  if (length <= rules.maxConsecutiveWorkDays) return null
  return {
    type: 'consecutive', length, start, end,
    label: `連續上班 ${length} 天`,
    detail: `${start} 至 ${end} 將連續上班 ${length} 天，超過科內上限 ${rules.maxConsecutiveWorkDays} 天（特休、公假都算上班）`
  }
}

/**
 * 夜班輪數檢查：加入 dateStr 之後，該類夜班是否超過「每月幾輪、每輪連續幾天」
 * sameTypeDates 為同仁已排同類夜班（小夜或大夜）的日期集合，可包含前後月
 * 每輪連續天數跨月照算；每月輪數只計有落在 dateStr 當月的輪次
 */
export function checkNightRuns(sameTypeDates, dateStr, nightType, deptRules) {
  const rules = normalizeDeptRules(deptRules)
  const typeName = NIGHT_TYPE_LABELS[nightType]
  if (!typeName) return null
  const maxRuns = nightType === 'night' ? rules.nightMaxRunsPerMonth : rules.eveningMaxRunsPerMonth
  const maxLength = nightType === 'night' ? rules.nightMaxRunLength : rules.eveningMaxRunLength

  const month = dateStr.slice(0, 7)
  const dates = [...new Set([...sameTypeDates, dateStr])].sort()

  // 把連續日期切成一輪一輪
  const runs = []
  dates.forEach(d => {
    const last = runs[runs.length - 1]
    if (last && shiftDate(last[last.length - 1], 1) === d) last.push(d)
    else runs.push([d])
  })

  const currentRun = runs.find(run => run.includes(dateStr))
  if (currentRun.length > maxLength) {
    return {
      type: 'nightRunLength', length: currentRun.length,
      label: `${typeName}連續 ${currentRun.length} 天`,
      detail: `${currentRun[0]} 至 ${currentRun[currentRun.length - 1]} 將連續 ${currentRun.length} 天${typeName}，超過科內上限每輪 ${maxLength} 天`
    }
  }
  const monthRuns = runs.filter(run => run.some(d => d.slice(0, 7) === month))
  if (monthRuns.length > maxRuns) {
    return {
      type: 'nightRunCount', count: monthRuns.length,
      label: `本月${typeName}第 ${monthRuns.length} 輪`,
      detail: `本月${typeName}將成為第 ${monthRuns.length} 輪，超過科內上限每月 ${maxRuns} 輪（連續排的${typeName}算同一輪）`
    }
  }
  return null
}
