/**
 * 班表檢視共用邏輯 (rosterView.js)
 * 「正式排班與結果」頁與 Excel 匯出共用，確保畫面和匯出的內容一致
 */
import { getShiftInterval, getShiftHours } from './shiftTime.js'
import { EDU_LEAVE_CODE, EDU_LEAVE_DEF, EDU_LEAVE_DAY_HOURS, isAnnualLeaveClass, getEduDate } from './education.js'
import { ROLES } from './types.js'

/** 班別定義；年假上課不在班別設定裡，另外提供 */
export function getDisplayShiftDef(code, shiftDefs) {
  if (code === EDU_LEAVE_CODE) return EDU_LEAVE_DEF
  return (shiftDefs && shiftDefs[code]) || null
}

/**
 * 某位同仁某一天在班表上顯示的代號
 * 優先順序：已選／已指定的班 ➜ 年假上課 ➜ 舊版排班結果 ➜ OFF
 */
export function getStaffDayCode({ dateStr, staffId, slotsByDate, roster, leaves }) {
  const slot = ((slotsByDate && slotsByDate[dateStr]) || []).find(s => Array.isArray(s.assignedStaffIds) && s.assignedStaffIds.includes(staffId))
  if (slot) return slot.shiftCode
  if ((leaves || []).some(l => l.staffId === staffId && isAnnualLeaveClass(l) && getEduDate(l) === dateStr)) return EDU_LEAVE_CODE
  if (roster && roster[dateStr] && roster[dateStr][staffId]) return roster[dateStr][staffId]
  return 'OFF'
}

function monthDates(year, month) {
  const days = new Date(year, month, 0).getDate()
  return Array.from({ length: days }, (_, i) => `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`)
}

/** 某位同仁當月統計：出勤天數、工時、小夜、大夜、六日出勤、特休天數 */
export function getStaffMonthStats({ staffId, year, month, slotsByDate, roster, leaves, shiftDefs }) {
  const stats = { workDays: 0, hours: 0, evening: 0, night: 0, weekend: 0, annualLeave: 0 }
  monthDates(year, month).forEach(dateStr => {
    const code = getStaffDayCode({ dateStr, staffId, slotsByDate, roster, leaves })
    if (code === 'OFF') return
    const def = getDisplayShiftDef(code, shiftDefs)
    if (code === EDU_LEAVE_CODE) {
      stats.workDays++
      stats.hours += EDU_LEAVE_DAY_HOURS
    } else if (def && getShiftInterval(def)) {
      stats.workDays++
      stats.hours += getShiftHours(def)
      if (def.nightType === 'evening') stats.evening++
      if (def.nightType === 'night') stats.night++
    } else if (code === 'V') {
      stats.annualLeave++
      return
    } else {
      return
    }
    const [y, m, d] = dateStr.split('-').map(Number)
    if ([0, 6].includes(new Date(y, m - 1, d).getDay())) stats.weekend++
  })
  stats.hours = Math.round(stats.hours * 10) / 10
  return stats
}

/**
 * 班表要列出的人員：在職的全部列出；停用／留停的只有當月仍有排班才列出（方便主管發現並處理）
 */
export function getRosterStaff({ staffList, year, month, slotsByDate, roster, leaves }) {
  const dates = monthDates(year, month)
  return (staffList || []).filter(s => {
    if (!s.status || s.status === '在職') return true
    return dates.some(dateStr => getStaffDayCode({ dateStr, staffId: s.id, slotsByDate, roster, leaves }) !== 'OFF')
  })
}

/** 依職類分組（依 ROLES 順序，沒有人的職類不列） */
export function groupStaffByRole(staffList) {
  const roles = [...ROLES, ...new Set((staffList || []).map(s => s.role).filter(r => !ROLES.includes(r)))]
  return roles.map(role => ({ role, staff: staffList.filter(s => s.role === role) })).filter(g => g.staff.length > 0)
}
