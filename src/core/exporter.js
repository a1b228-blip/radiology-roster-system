/**
 * Excel 匯出模組 (exporter.js) - 採用 SheetJS (xlsx)
 */
import * as XLSX from 'xlsx'
import { SHIFT_DEFS, ROOM_DEFS } from './types.js'

export function exportRosterToExcel({ year, month, staffList, roster }) {
  const daysInMonth = new Date(year, month, 0).getDate()

  // 1. 人員班表 Sheet 構建
  const staffHeader = ['員號', '放射師姓名', '職級', ...Array.from({ length: daysInMonth }, (_, i) => `${i + 1}日`)]
  const staffRows = [staffHeader]

  staffList.forEach(s => {
    const row = [s.id, s.name, s.level]
    for (let day = 1; day <= daysInMonth; day++) {
      const monthStr = String(month).padStart(2, '0')
      const dayStr = String(day).padStart(2, '0')
      const dateStr = `${year}-${monthStr}-${dayStr}`
      const shiftCode = roster[dateStr]?.[s.id] || 'OFF'
      const shiftInfo = SHIFT_DEFS[shiftCode]
      row.push(shiftInfo ? shiftInfo.name : shiftCode)
    }
    staffRows.push(row)
  })

  const staffSheet = XLSX.utils.aoa_to_sheet(staffRows)

  // 2. 機台檢查室 Sheet 構建
  const roomHeader = ['檢查室代號', '檢查室名稱', ...Array.from({ length: daysInMonth }, (_, i) => `${i + 1}日`)]
  const roomRows = [roomHeader]

  ROOM_DEFS.forEach(room => {
    const row = [room.id, room.name]
    for (let day = 1; day <= daysInMonth; day++) {
      const monthStr = String(month).padStart(2, '0')
      const dayStr = String(day).padStart(2, '0')
      const dateStr = `${year}-${monthStr}-${dayStr}`
      const dayRoster = roster[dateStr] || {}
      
      // 找出該天指派到該檢查室的放射師
      const assignedStaff = Object.entries(dayRoster)
        .filter(([_, code]) => code === room.primaryShift)
        .map(([id, _]) => {
          const st = staffList.find(s => s.id === id)
          return st ? st.name : id
        })

      row.push(assignedStaff.length > 0 ? assignedStaff.join(', ') : '-')
    }
    roomRows.push(row)
  })

  const roomSheet = XLSX.utils.aoa_to_sheet(roomRows)

  // 3. 建立活頁簿與寫入檔案
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, staffSheet, '放射師個人班表')
  XLSX.utils.book_append_sheet(wb, roomSheet, '機台檢查室班表')

  const fileName = `奇美放射診斷科班表_${year}年${month}月.xlsx`
  XLSX.writeFile(wb, fileName)
}
