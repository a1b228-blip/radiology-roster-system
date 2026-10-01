/**
 * Excel 匯出模組 (exporter.js) - 採用 SheetJS (xlsx)
 * 每個職類一張工作表（A4 橫印），欄位：員工編號、姓名、全月日期的班別代號、當月統計
 * 另附「班別對照」工作表。內容與「正式排班與結果」頁一致（共用 rosterView.js）
 */
import * as XLSX from 'xlsx'
import { getStaffDayCode, getStaffMonthStats, getRosterStaff, groupStaffByRole, getDisplayShiftDef } from './rosterView.js'
import { EDU_LEAVE_CODE, EDU_LEAVE_DEF } from './education.js'
import { getShiftInterval, getShiftHours } from './shiftTime.js'

const STAT_HEADERS = ['出勤天數', '工時', '小夜', '大夜', '六日出勤', '特休天數']

export function exportRosterToExcel({ year, month, staffList, roster = {}, slotsByDate = {}, leaves = [], shiftDefs = {} }) {
  const daysInMonth = new Date(year, month, 0).getDate()
  const rocYear = year - 1911
  const wb = XLSX.utils.book_new()
  const monthStr = String(month).padStart(2, '0')
  const dateOf = (day) => `${year}-${monthStr}-${String(day).padStart(2, '0')}`

  // 表頭 (員號, 姓名, 8/1(五), 8/2(六)..., 統計欄)
  const dateHeader = ['員工編號', '員工姓名']
  for (let day = 1; day <= daysInMonth; day++) {
    const weekZh = ['日', '一', '二', '三', '四', '五', '六'][new Date(year, month - 1, day).getDay()]
    dateHeader.push(`${month}/${day}(${weekZh})`)
  }
  dateHeader.push(...STAT_HEADERS)

  const visibleStaff = getRosterStaff({ staffList, year, month, slotsByDate, roster, leaves })
  const usedCodes = new Set()

  groupStaffByRole(visibleStaff).forEach(({ role, staff }) => {
    const rows = [[`佳里奇美醫院 放射診斷科 民國 ${rocYear} 年 ${month} 月份 ${role}排班表`], [], dateHeader]

    staff.forEach(s => {
      const row = [s.id, s.status && s.status !== '在職' ? `${s.name}（${s.status}）` : s.name]
      for (let day = 1; day <= daysInMonth; day++) {
        const code = getStaffDayCode({ dateStr: dateOf(day), staffId: s.id, slotsByDate, roster, leaves })
        if (code !== 'OFF') usedCodes.add(code)
        row.push(code)
      }
      const st = getStaffMonthStats({ staffId: s.id, year, month, slotsByDate, roster, leaves, shiftDefs })
      row.push(st.workDays, st.hours, st.evening, st.night, st.weekend, st.annualLeave)
      rows.push(row)
    })

    const sheet = XLSX.utils.aoa_to_sheet(rows)
    sheet['!cols'] = [
      { wch: 10 }, // 員工編號
      { wch: 12 }, // 員工姓名
      ...Array.from({ length: daysInMonth }, () => ({ wch: 6.5 })),
      ...STAT_HEADERS.map(() => ({ wch: 8 }))
    ]
    // A4 橫印 (Landscape)
    sheet['!pageSetup'] = { orientation: 'landscape', paperSize: 9, fitToWidth: 1, fitToHeight: 0 }
    XLSX.utils.book_append_sheet(wb, sheet, role)
  })

  // 班別對照表：列出班別設定的所有班別，以及班表上出現但已不在設定中的代號
  const legendRows = [['班別代號', '班別名稱', '適用職類', '上班時間', '下班時間', '工時']]
  const legendCodes = [...Object.keys(shiftDefs), ...[...usedCodes].filter(c => !shiftDefs[c] && c !== EDU_LEAVE_CODE)]
  legendCodes.forEach(code => {
    const def = getDisplayShiftDef(code, shiftDefs)
    if (!def) {
      legendRows.push([code, '（已不在班別設定中）', '', '', '', ''])
      return
    }
    const timed = !!getShiftInterval(def)
    legendRows.push([code, def.name, def.targetRole || '通用', timed ? def.start : '', timed ? def.end : '', timed ? getShiftHours(def) : ''])
  })
  legendRows.push([EDU_LEAVE_CODE, '年假上課（上課時數＋特休補足，比照公假算上班）', '放射師', EDU_LEAVE_DEF.start, EDU_LEAVE_DEF.end, getShiftHours(EDU_LEAVE_DEF)])
  legendRows.push(['OFF', '休假', '通用', '', '', ''])
  const legendSheet = XLSX.utils.aoa_to_sheet(legendRows)
  legendSheet['!cols'] = [{ wch: 12 }, { wch: 46 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 8 }]
  XLSX.utils.book_append_sheet(wb, legendSheet, '班別對照')

  XLSX.writeFile(wb, `佳里奇美醫院_放射診斷科_民國${rocYear}年${month}月_同仁月排班總表.xlsx`)
}
