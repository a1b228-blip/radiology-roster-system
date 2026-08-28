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

/**
 * 匯出排班規範、勞基法、變形工時與營運計畫 Excel 設定檔
 */
export function exportRulesToExcel(rules) {
  const header = ['條款編號', '規範分類', '排班規範與營運計畫名稱', '依據法規/院規', '權重 (%)', '違反時系統動作', '是否啟用 (是/否)']
  const rows = [header]

  rules.forEach(r => {
    rows.push([
      r.id,
      r.category,
      r.name,
      r.lawRef,
      r.weight,
      r.action,
      r.enabled ? '是' : '否'
    ])
  })

  const wb = XLSX.utils.book_new()
  const sheet = XLSX.utils.aoa_to_sheet(rows)
  sheet['!cols'] = [
    { wch: 10 }, { wch: 18 }, { wch: 40 }, { wch: 22 }, { wch: 12 }, { wch: 35 }, { wch: 12 }
  ]
  XLSX.utils.book_append_sheet(wb, sheet, '排班規範與權重設定')
  XLSX.writeFile(wb, '佳里奇美醫院_放射科排班規範與權重設定檔.xlsx')
}

/**
 * 由 Excel 檔案解析匯入排班規範與權重
 */
export function importRulesFromExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const jsonRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

        // 跳過標頭 Row 0
        const parsedRules = []
        for (let i = 1; i < jsonRows.length; i++) {
          const row = jsonRows[i]
          if (!row || row.length < 3) continue

          const weightVal = parseInt(row[4], 10)
          parsedRules.push({
            id: String(row[0] || `R${String(i).padStart(2, '0')}`),
            category: String(row[1] || '科內營運計畫'),
            name: String(row[2] || ''),
            lawRef: String(row[3] || '院規'),
            weight: isNaN(weightVal) ? 100 : weightVal,
            action: String(row[5] || (weightVal === 100 ? '⛔ 硬性強制作業不可違反 (系統禁止選班)' : '⚠️ 警示提示')),
            enabled: String(row[6]).trim() !== '否'
          })
        }
        resolve(parsedRules)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = (error) => reject(error)
    reader.readAsArrayBuffer(file)
  })
}

