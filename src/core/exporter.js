/**
 * Excel 匯出模組 (exporter.js) - 採用 SheetJS (xlsx)
 * A4 橫印最適規格：包含標題「佳里奇美醫院 放射診斷科 民國 115 年 8 月份 同仁月排班總表」
 * 欄位：員工編號、員工姓名、全月日期 (8/1(五) ~ 8/31(日)) 與班別代碼
 */
import * as XLSX from 'xlsx'

export function exportRosterToExcel({ year, month, staffList, roster = {}, slotsByDate = {} }) {
  const daysInMonth = new Date(year, month, 0).getDate()
  const rocYear = year - 1911
  const wb = XLSX.utils.book_new()

  // 第一列：大標題 (適合 A4 列印頂部標題)
  const titleRow = [`佳里奇美醫院 放射診斷科 民國 ${rocYear} 年 ${month} 月份 同仁月排班總表`]

  // 第三列：表頭 (員號, 姓名, 8/1(五), 8/2(六)...)
  const dateHeader = ['員工編號', '員工姓名']
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day)
    const weekZh = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
    dateHeader.push(`${month}/${day}(${weekZh})`)
  }

  const rows = [titleRow, [], dateHeader]

  // 同仁資料列
  staffList.forEach(s => {
    const row = [s.id, s.name]
    
    for (let day = 1; day <= daysInMonth; day++) {
      const monthStr = String(month).padStart(2, '0')
      const dayStr = String(day).padStart(2, '0')
      const dateStr = `${year}-${monthStr}-${dayStr}`
      
      let shiftCode = 'OFF'

      // 1. 優先檢索自主選班 Slots
      if (slotsByDate && slotsByDate[dateStr]) {
        const daySlots = slotsByDate[dateStr]
        const foundSlot = daySlots.find(slot => slot.assignedStaffIds && slot.assignedStaffIds.includes(s.id))
        if (foundSlot) {
          shiftCode = foundSlot.shiftCode
        }
      }

      // 2. 若自主選班無，檢索 roster
      if (shiftCode === 'OFF' && roster && roster[dateStr] && roster[dateStr][s.id]) {
        shiftCode = roster[dateStr][s.id]
      }

      row.push(shiftCode)
    }
    rows.push(row)
  })

  const sheet = XLSX.utils.aoa_to_sheet(rows)

  // 欄寬精細調整：使 1~31 天完美收納於 A4 橫向一頁寬度內
  sheet['!cols'] = [
    { wch: 10 }, // 員工編號
    { wch: 10 }, // 員工姓名
    ...Array.from({ length: daysInMonth }, () => ({ wch: 5.5 })) // 8/1(五) ~ 8/31(日)
  ]

  // A4 橫印 (Landscape) 列印設定
  sheet['!pageSetup'] = {
    orientation: 'landscape',
    paperSize: 9, // A4
    fitToWidth: 1,
    fitToHeight: 0
  }

  const sheetName = `民國${rocYear}年${month}月排班總表`
  XLSX.utils.book_append_sheet(wb, sheet, sheetName)

  const fileName = `佳里奇美醫院_放射診斷科_民國${rocYear}年${month}月_同仁月排班總表.xlsx`
  XLSX.writeFile(wb, fileName)
}
