/**
 * 放射診斷科排班演算法引擎 (solver.js)
 */
import { SHIFT_DEFS } from './types.js'

export function solveRoster({ year, month, staffList, leaves = [], locks = [], holidays = [] }) {
  const daysInMonth = new Date(year, month, 0).getDate()
  const roster = {}       // key: "YYYY-MM-DD", value: { staffId: shiftCode }
  const warnings = []
  const kpiCounts = {}    // key: staffId, value: { night: 0, ct: 0, mri: 0, sat: 0, totalWork: 0 }

  staffList.forEach(s => {
    kpiCounts[s.id] = { night: 0, ct: 0, mri: 0, sat: 0, totalWork: 0 }
  })

  // 紀錄前一天個人班別，用於檢核勞基法 11h 休息間隔
  let lastShift = {}

  for (let day = 1; day <= daysInMonth; day++) {
    const monthStr = String(month).padStart(2, '0')
    const dayStr = String(day).padStart(2, '0')
    const dateStr = `${year}-${monthStr}-${dayStr}`
    const dateObj = new Date(year, month - 1, day)
    const dayOfWeek = dateObj.getDay() // 0: Sun, 6: Sat
    const isHoliday = holidays.includes(dateStr)

    roster[dateStr] = {}

    // 判斷當日請假人員
    const todayOffStaff = leaves
      .filter(l => l.start <= dateStr && l.end >= dateStr && l.type === 'full')
      .map(l => l.staffId)

    // 週日或國定假日
    if (dayOfWeek === 0 || isHoliday) {
      staffList.forEach(s => {
        roster[dateStr][s.id] = 'OFF'
      })
      lastShift = { ...roster[dateStr] }
      continue
    }

    // 週六班別分派
    if (dayOfWeek === 6) {
      const eligibleSat = staffList.filter(s => s.canSat && !todayOffStaff.includes(s.id))
      // 依歷史週六次數排序（公平性）
      eligibleSat.sort((a, b) => (kpiCounts[a.id].sat - kpiCounts[b.id].sat))

      eligibleSat.forEach((s, idx) => {
        if (idx < 4) { // 指派前 4 位值週六門診班
          roster[dateStr][s.id] = 'SAT_D'
          kpiCounts[s.id].sat++
          kpiCounts[s.id].totalWork++
        } else {
          roster[dateStr][s.id] = 'OFF'
        }
      })

      staffList.filter(s => !eligibleSat.includes(s)).forEach(s => {
        roster[dateStr][s.id] = 'OFF'
      })

      lastShift = { ...roster[dateStr] }
      continue
    }

    // 平日排班邏輯 (Mon-Fri)
    const assigned = {}

    // 檢查硬性鎖定單日班別 (Locks)
    const todayLocks = locks.filter(l => l.date === dateStr)
    todayLocks.forEach(l => {
      assigned[l.staffId] = l.shiftCode
    })

    // 可排夜班候選人 (排除全日請假、非 night 資格者，以及前日大夜班需 Rest Gap 者)
    const nightPool = staffList.filter(s => {
      if (todayOffStaff.includes(s.id)) return false
      if (!s.canNight) return false
      if (lastShift[s.id] === 'G_NIGHT') return false // 勞基法 11h：大夜下班隔日強制休息
      return !assigned[s.id]
    })

    // 依夜班累計次數由低到高排序
    nightPool.sort((a, b) => kpiCounts[a.id].night - kpiCounts[b.id].night)

    // 1. 分派急診大夜班 (G_NIGHT - 00:00–08:00)
    if (!Object.values(assigned).includes('G_NIGHT')) {
      const deepNightStaff = nightPool.find(s => s.level !== '新進')
      if (deepNightStaff) {
        assigned[deepNightStaff.id] = 'G_NIGHT'
        kpiCounts[deepNightStaff.id].night++
        kpiCounts[deepNightStaff.id].totalWork++
      } else {
        warnings.push(`${dateStr}：無法為急診大夜班指派合適放射師（無合格夜班人員）。`)
      }
    }

    // 2. 分派急診小夜班 (E_NIGHT - 16:00–24:00)
    if (!Object.values(assigned).includes('E_NIGHT')) {
      const eveNightStaff = nightPool.find(s => !assigned[s.id])
      if (eveNightStaff) {
        assigned[eveNightStaff.id] = 'E_NIGHT'
        kpiCounts[eveNightStaff.id].night++
        kpiCounts[eveNightStaff.id].totalWork++
      } else {
        warnings.push(`${dateStr}：無法為急診小夜班指派合適放射師。`)
      }
    }

    // 剩餘可用白班人員
    const dayPool = staffList.filter(s => !todayOffStaff.includes(s.id) && !assigned[s.id])

    // 3. 分派 CT 白班 (D_CT - 需 CT 資格，且需與資深搭檔)
    const ctCandidates = dayPool.filter(s => s.ct)
    // 優先選一位資深/主管
    let ctSenior = ctCandidates.find(s => s.level === '主管' || s.level === '資深')
    if (!ctSenior) ctSenior = ctCandidates[0] // 次佳選擇

    if (ctSenior) {
      assigned[ctSenior.id] = 'D_CT'
      kpiCounts[ctSenior.id].ct++
      kpiCounts[ctSenior.id].totalWork++
    } else {
      warnings.push(`${dateStr}：CT 檢查室今日缺乏具 CT 資格之資深放射師。`)
    }

    // 4. 分派 MRI 白班 (D_MRI - 需 MRI 資格，需資深搭檔)
    const mriCandidates = dayPool.filter(s => s.mri && !assigned[s.id])
    let mriSenior = mriCandidates.find(s => s.level === '主管' || s.level === '資深')
    if (!mriSenior) mriSenior = mriCandidates[0]

    if (mriSenior) {
      assigned[mriSenior.id] = 'D_MRI'
      kpiCounts[mriSenior.id].mri++
      kpiCounts[mriSenior.id].totalWork++
    } else {
      warnings.push(`${dateStr}：MRI 檢查室今日無合適指派人員。`)
    }

    // 5. 分派 Angio 白班 (D_ANGIO - 需 Angio 資格)
    const angioCandidates = dayPool.filter(s => s.angio && !assigned[s.id])
    if (angioCandidates.length > 0) {
      const angioStaff = angioCandidates[0]
      assigned[angioStaff.id] = 'D_ANGIO'
      kpiCounts[angioStaff.id].totalWork++
    }

    // 6. 剩餘人員全部分派一般 DR 白班 (D_DR)
    staffList.forEach(s => {
      if (todayOffStaff.includes(s.id)) {
        roster[dateStr][s.id] = 'OFF'
      } else if (assigned[s.id]) {
        roster[dateStr][s.id] = assigned[s.id]
      } else {
        roster[dateStr][s.id] = 'D_DR'
        kpiCounts[s.id].totalWork++
      }
    })

    // 紀錄當日班別以作為次日 11h Rest Gap 參考
    lastShift = { ...roster[dateStr] }
  }

  return {
    roster,
    warnings,
    kpiCounts
  }
}
