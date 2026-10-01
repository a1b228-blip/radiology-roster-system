/**
 * 班別時間單一來源 (shiftTime.js)
 * 全系統的上下班時間、工時、班間休息間隔一律由這裡計算，
 * 讓「班別與時間設定」改的時間能一致連動到選班驗證、工時統計與預檢標示。
 *
 * 班別定義的時間欄位：
 *   start   上班時間 "HH:MM"（假別留空）
 *   end     下班時間 "HH:MM"（早於或等於上班時間代表跨日）
 *   restEnd 休息起算時間 "HH:MM"（科內規定用，留空＝以實際下班時間起算）
 *   breakMinutes 班內休息分鐘數（不計入工時；不影響班間休息間隔）
 *   capacity 每班名額（自動開班時每個班格可選幾人）
 *   openOnHoliday 國定假日是否照常開班
 *   nightType 夜班類別：'evening' 小夜班、'night' 大夜班、'' 非夜班（科內夜班規則用）
 *   time    顯示用文字 "08:00 - 16:30"，由 start/end 自動產生
 */

// 勞基法第 34 條：輪班換班至少休息 11 小時
export const MIN_REST_HOURS = 11

// 舊版程式把這些日間班別的下班時間一律至少算到 16:30（半天班隔天不可接大夜）
const LEGACY_DAY_SHIFT_CODES = ['D', 'SAT_D', 'T', 'D_CCT', 'd(US)', 'd(m)', 'C9', 'C8', 'M', 'd1', 'C2', 'C2(m)', '83（行）', 'CO（n）']
const LEGACY_DAY_SHIFT_REST_END = '16:30'
const LEGACY_NIGHT_TYPES = { E: 'evening', N: 'night' }
// 舊版寫死在程式裡的每班名額與國定假日開班班別
const LEGACY_CAPACITY = { D: 3, T: 2, 'd(m)': 2, 'CO（n）': 2, '83（行）': 2, V: 2 }
const LEGACY_OPEN_ON_HOLIDAY = ['E', 'N']

/** 將 "8:00"、"08：00"、"0800" 等寫法轉成小時數，無法辨識回傳 null */
export function parseClock(str) {
  if (str === null || str === undefined) return null
  const s = String(str).trim().replace(/：/g, ':')
  let m = /^(\d{1,2}):(\d{2})$/.exec(s)
  if (!m) m = /^(\d{2})(\d{2})$/.exec(s)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 24 || min > 59 || (h === 24 && min > 0)) return null
  return h + min / 60
}

/** 小時數轉回 "HH:MM"（超過 24 小時自動折回當日時刻） */
export function formatClock(hours) {
  if (hours === null || hours === undefined || isNaN(hours)) return ''
  const totalMin = Math.round(hours * 60) % (24 * 60)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** 由上下班時間產生顯示文字，未設定時間回傳 "-" */
export function formatTimeRange(start, end) {
  const s = parseClock(start)
  const e = parseClock(end)
  if (s === null || e === null) return '-'
  return `${formatClock(s)} - ${formatClock(e)}`
}

// 把 "08:00 - 16:30"、"08:00～16:30" 這類文字拆成上下班時間
function splitTimeText(timeStr) {
  if (!timeStr) return null
  const parts = String(timeStr).split(/\s*[-–—~～至]\s*/).filter(p => p !== '')
  if (parts.length !== 2) return null
  const s = parseClock(parts[0])
  const e = parseClock(parts[1])
  if (s === null || e === null) return null
  return { start: formatClock(s), end: formatClock(e) }
}

/**
 * 取得班別的時間區間（以當日 00:00 為 0，跨日班別下班時間會超過 24）
 * 沒有出勤時間的班別（特休、公假、休假）回傳 null，不參與休息間隔與工時計算
 */
export function getShiftInterval(def) {
  if (!def) return null
  let startStr = def.start
  let endStr = def.end
  if (startStr === undefined && endStr === undefined) {
    const parsed = splitTimeText(def.time)
    if (!parsed) return null
    startStr = parsed.start
    endStr = parsed.end
  }
  const startHour = parseClock(startStr)
  let endHour = parseClock(endStr)
  if (startHour === null || endHour === null) return null

  const crossesMidnight = endHour <= startHour
  if (crossesMidnight) endHour += 24

  // 休息起算時間只會往後延，不會比實際下班時間早
  let restEndHour = endHour
  let r = parseClock(def.restEnd)
  if (r !== null) {
    if (r <= startHour) r += 24
    restEndHour = Math.max(endHour, r)
  }

  return { startHour, endHour, restEndHour, crossesMidnight }
}

/** 班別在班時數（上班到下班，含班內休息）；無出勤時間回傳 0 */
export function getShiftSpanHours(def) {
  const iv = getShiftInterval(def)
  return iv ? iv.endHour - iv.startHour : 0
}

/**
 * 班內休息的預設分鐘數（班別沒有自行設定時使用）
 * 在班 9 小時以上休息 60 分鐘、超過 4 小時休息 30 分鐘、半天班不休息
 */
export function defaultBreakMinutes(spanHours) {
  if (spanHours >= 24) return 0 // OnCall 待命不套用
  if (spanHours >= 9) return 60
  if (spanHours > 4) return 30
  return 0
}

/** 班內休息分鐘數；未設定時依在班時數套用預設值 */
export function getBreakMinutes(def) {
  const span = getShiftSpanHours(def)
  if (!span) return 0
  const n = Number(def.breakMinutes)
  if (def.breakMinutes === '' || def.breakMinutes === null || def.breakMinutes === undefined || isNaN(n) || n < 0) {
    return defaultBreakMinutes(span)
  }
  return Math.min(n, span * 60)
}

/** 班別實際工時（小時）＝在班時數扣除班內休息；無出勤時間回傳 0 */
export function getShiftHours(def) {
  return getShiftSpanHours(def) - getBreakMinutes(def) / 60
}

/**
 * 前一日上 prevDef、隔日上 nextDef 的班間休息時數
 * 任一方沒有出勤時間（假別）回傳 null，代表不需檢查
 */
export function getRestGap(prevDef, nextDef) {
  const prev = getShiftInterval(prevDef)
  const next = getShiftInterval(nextDef)
  if (!prev || !next) return null
  const actualGap = 24 + next.startHour - prev.endHour
  const gap = 24 + next.startHour - prev.restEndHour
  return {
    gap,
    actualGap,
    // 實際間隔足夠，但依科內規定的休息起算時間不足
    byDeptRule: gap < MIN_REST_HOURS && actualGap >= MIN_REST_HOURS,
    ok: gap >= MIN_REST_HOURS
  }
}

/**
 * 補齊單一班別的時間欄位（start / end / restEnd），並讓顯示文字 time 與之同步
 * legacy = true 時用於轉換舊版只存文字的資料，會沿用舊程式「日間班別至少算到 16:30 下班」的行為
 */
export function normalizeShiftDef(code, def, { legacy = false } = {}) {
  const result = { ...def }
  const hasFields = def.start !== undefined || def.end !== undefined

  if (!hasFields) {
    const parsed = splitTimeText(def.time)
    result.start = parsed ? parsed.start : ''
    result.end = parsed ? parsed.end : ''
  } else {
    const s = parseClock(def.start)
    const e = parseClock(def.end)
    result.start = s === null ? '' : formatClock(s)
    result.end = e === null ? '' : formatClock(e)
  }

  const restParsed = parseClock(def.restEnd)
  result.restEnd = restParsed === null ? '' : formatClock(restParsed)

  if (legacy && !hasFields && def.restEnd === undefined) {
    const iv = getShiftInterval({ start: result.start, end: result.end })
    if (iv) {
      const wasDayShift = LEGACY_DAY_SHIFT_CODES.includes(code) || (iv.startHour >= 7 && iv.startHour <= 10 && iv.endHour < 24)
      if (wasDayShift && iv.endHour < parseClock(LEGACY_DAY_SHIFT_REST_END)) {
        result.restEnd = LEGACY_DAY_SHIFT_REST_END
      }
    }
  }

  result.breakMinutes = getBreakMinutes(result)
  // 舊資料沒有夜班類別時，依原本寫死的代號補上（E＝小夜、N＝大夜）
  if (def.nightType === undefined) result.nightType = LEGACY_NIGHT_TYPES[code] || ''
  // 舊資料沒有名額與國定假日開班欄位時，沿用原本寫死的值
  const capacity = parseInt(def.capacity, 10)
  result.capacity = capacity >= 1 ? capacity : (LEGACY_CAPACITY[code] || 1)
  if (def.openOnHoliday === undefined) result.openOnHoliday = LEGACY_OPEN_ON_HOLIDAY.includes(code)
  // 資深帶導已停用（2026-10-01 使用者指示刪除）
  delete result.needsSenior
  result.time = formatTimeRange(result.start, result.end)
  return result
}

/** 補齊整份班別定義的時間欄位 */
export function normalizeShiftDefs(defs, options = {}) {
  const result = {}
  Object.entries(defs || {}).forEach(([code, def]) => {
    result[code] = normalizeShiftDef(code, def, options)
  })
  return result
}
