/**
 * 放射診斷科「管理者發布需求 Slot ➜ 專長人員自主選班 ➜ 規則即時驗證」引擎
 * 班別代號與時間完全連動《放射科每日班別人力需求與專長門檻設定表.xlsx》
 */

import { SHIFT_DEFS } from './types.js'

/**
 * 根據月份與假日，產生預設的全月工作點班別 Slot 矩陣
 */
export function generateDefaultSlots(year, month, holidays = [], customShiftDefs = SHIFT_DEFS) {
  const daysInMonth = new Date(year, month, 0).getDate()
  const slotsByDate = {}

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const dayOfWeek = new Date(year, month - 1, d).getDay()
    const isHoliday = holidays.includes(dateStr)

    const daySlots = []
    const defsToUse = customShiftDefs || SHIFT_DEFS

    Object.entries(defsToUse).forEach(([code, def]) => {
      if (code === 'OFF') return

      // 若未選擇任何星期 (空字串)，直接不自動預設開班，保持空白由主管自己點選開設
      if (def.applicableDays === '' || def.applicableDays === null || def.applicableDays === undefined) {
        return
      }

      const appDaysStr = String(def.applicableDays)
      const appDays = appDaysStr.split(',').filter(x => x !== '').map(Number)

      if (appDays.length === 0) return

      let shouldAdd = false
      if (isHoliday) {
        // 國定假日：預設僅發布夜班與 OnCall 待命班別
        if (['E', 'N', 'CALL', 'CALL_NURSE'].includes(code)) shouldAdd = true
      } else {
        if (appDays.includes(dayOfWeek)) shouldAdd = true
      }


      if (shouldAdd) {
        let cap = 1
        if (['T', 'd(m)', 'CO（n）', '83（行）', 'V'].includes(code)) cap = 2
        if (code === 'D' && (dayOfWeek >= 1 && dayOfWeek <= 5)) cap = 3
        if (code === 'D' && dayOfWeek === 6) cap = 2

        daySlots.push({
          id: `${dateStr}_${code}`,
          dateStr,
          shiftCode: code,
          capacity: cap,
          requiredSkill: def.modKey || null,
          minLevel: def.needsSenior ? 'SeniorPairing' : null,
          assignedStaffIds: []
        })
      }
    })

    slotsByDate[dateStr] = daySlots
  }


  return slotsByDate
}

/**
 * 即時驗證人員選班合法性
 */
export function validateBidding({
  staff,
  slot,
  dateStr,
  slotsByDate,
  staffList,
  leaves = [],
  constraints = {},
  customShiftDefs = SHIFT_DEFS
}) {
  const result = { valid: true, error: null, warnings: [] }

  if (!staff || !slot || !dateStr) return result

  // 0. 特例優先：若同仁是在「退選」自己已選入的班別，100% 無條件允許退選！
  if (Array.isArray(slot.assignedStaffIds) && slot.assignedStaffIds.includes(staff.id)) {
    return result
  }

  // 1. 職類比對檢查 (Role Guard)
  const shiftDef = customShiftDefs[slot.shiftCode] || SHIFT_DEFS[slot.shiftCode]
  if (shiftDef && shiftDef.targetRole && staff.role !== shiftDef.targetRole) {
    return { 
      valid: false, 
      error: `職類不符：${staff.name} 職類為 [${staff.role}]，無法選擇 [${shiftDef.targetRole}] 專屬班別 (${shiftDef.name})` 
    }
  }

  // 2. 檢查名額限制
  if (slot.assignedStaffIds.length >= slot.capacity) {
    return { valid: false, error: `該工作點 (${shiftDef?.name || slot.shiftCode}) 名額已滿 (${slot.capacity}/${slot.capacity})` }
  }

  // 3. 檢查請假紀錄衝突
  const hasLeave = leaves.some(l => l.staffId === staff.id && (l.date === dateStr || l.start === dateStr) && (l.type === 'full' || l.type === 'am' || l.type === 'pm'))
  if (hasLeave) {
    return { valid: false, error: `同仁 ${staff.name} 在 ${dateStr} 有請假紀錄，無法選班` }
  }

  // 4. 檢查同日重複選班
  const daySlots = slotsByDate[dateStr] || []
  const alreadySelected = daySlots.some(s => s.id !== slot.id && Array.isArray(s.assignedStaffIds) && s.assignedStaffIds.includes(staff.id))
  if (alreadySelected) {
    return { valid: false, error: `同仁 ${staff.name} 在 ${dateStr} 已選擇其他班別，同一天不可重複選班` }
  }

  // 5. 專長資格門檻檢查 (Skill Check)
  if (slot.requiredSkill === 'xray' && !staff.xray) return { valid: false, error: `缺 一般X光 證照/資格` }
  if (slot.requiredSkill === 'ct' && !staff.ct) return { valid: false, error: `缺 CT 電腦斷層證照/資格` }
  if (slot.requiredSkill === 'cct' && !staff.cct) return { valid: false, error: `缺 心臟 CT 證照/資格` }
  if (slot.requiredSkill === 'mri' && !staff.mri) return { valid: false, error: `缺 MRI 核磁共振證照/資格` }
  if (slot.requiredSkill === 'angio' && !staff.angio) return { valid: false, error: `缺 特殊攝影 證照/資格` }
  if (slot.requiredSkill === 'bmd' && !staff.bmd) return { valid: false, error: `缺 牙科骨密 證照/資格` }
  if (slot.requiredSkill === 'us' && !staff.us) return { valid: false, error: `缺 超音波 證照/資格` }
  if (slot.requiredSkill === 'mammo' && !staff.mammo) return { valid: false, error: `缺 乳房攝影 證照/資格` }

  if ((slot.shiftCode === 'N' || slot.shiftCode === 'E') && !staff.canNight) {
    return { valid: false, error: `${staff.name} 設定為「不可上夜班/新進人員」，無法選擇急診大小夜班` }
  }

  // 6. 勞基法 11 小時班別休息間隔與 3 大硬性禁止接班規範 (死鎖驗證)
  const prevDate = getPrevDateStr(dateStr)
  const nextDate = getNextDateStr(dateStr)
  const defsToUse = customShiftDefs || SHIFT_DEFS

  function getShiftTimes(dStr, code) {
    if (!dStr || !code) return null
    const dateObj = parseStandardDate(dStr)
    if (!dateObj) return null
    const dateBase = dateObj.getTime()

    const def = defsToUse[code] || SHIFT_DEFS[code]
    const { startHour, endHour } = parseShiftTime(def?.time, code)

    return {
      startMs: dateBase + startHour * 3600 * 1000,
      endMs: dateBase + endHour * 3600 * 1000
    }
  }

  const currentTimes = getShiftTimes(dateStr, slot.shiftCode)

  if (currentTimes) {
    // A. 前一日班間休息檢查 (掃描 slotsByDate + leaves)
    const prevShifts = []
    if (prevDate && slotsByDate && slotsByDate[prevDate]) {
      for (const pSlot of slotsByDate[prevDate]) {
        if (Array.isArray(pSlot.assignedStaffIds) && pSlot.assignedStaffIds.includes(staff.id)) {
          prevShifts.push(pSlot.shiftCode)
        }
      }
    }
    if (prevDate && Array.isArray(leaves)) {
      for (const l of leaves) {
        if (l.staffId === staff.id && (l.date === prevDate || l.start === prevDate) && l.shiftCode) {
          prevShifts.push(l.shiftCode)
        }
      }
    }

    for (const pCode of prevShifts) {
      const prevTimes = getShiftTimes(prevDate, pCode)
      if (prevTimes) {
        const gapHours = (currentTimes.startMs - prevTimes.endMs) / (3600 * 1000)
        const prevShiftName = getShiftName(pCode, defsToUse)
        const targetShiftName = getShiftName(slot.shiftCode, defsToUse)

        // ===== 隱性排班硬規範 1：D, E, d(US), d1, T, C9, d(m), e(m), C8, C2(m), C2, M 隔天禁接大夜班 N =====
        const rule1PrevShifts = ['D', 'E', 'd(US)', 'd1', 'T', 'C9', 'd(m)', 'e(m)', 'C8', 'C2(m)', 'C2', 'M', 'SAT_D', 'D_CCT']
        if (rule1PrevShifts.includes(pCode) && (slot.shiftCode === 'N' || slot.shiftCode === 'G_NIGHT' || slot.shiftCode === 'ER_DEEP')) {
          return {
            valid: false,
            error: `⛔ 違法禁止選填（硬性規範一）：同仁【${staff.name}】於前一日 (${prevDate}) 出勤 [${prevShiftName}]，於 ${dateStr} 禁止選擇 [${targetShiftName}]（大夜班 00:00 上班），兩班間隔僅 ${gapHours.toFixed(1)} 小時，低於法定 11 小時限制！`
          }
        }

        // ===== 隱性排班硬規範 2：e(m) (MRI晚班 21:30下班) 隔天禁接 D, d(US), d1, T, d(m) =====
        const rule2DayShifts = ['D', 'd(US)', 'd1', 'T', 'd(m)', 'D_CCT', 'SAT_D', '83（行）', 'CO（n）']
        if (pCode === 'e(m)' && rule2DayShifts.includes(slot.shiftCode)) {
          return {
            valid: false,
            error: `⛔ 違法禁止選填（硬性規範二）：同仁【${staff.name}】於前一日 (${prevDate}) 出勤 [${prevShiftName}]（21:30 下班），於 ${dateStr} 禁止選擇 08:00 上班之日班 [${targetShiftName}]，兩班間隔僅 ${gapHours.toFixed(1)} 小時，低於法定 11 小時限制！`
          }
        }

        // ===== 隱性排班硬規範 3：E (一般小夜班 00:30下班) 隔天禁排 D, N, d(US), d1, T, C9, d(m), e(m), C8, C2(m), C2, M =====
        const rule3ForbiddenNext = ['D', 'N', 'd(US)', 'd1', 'T', 'C9', 'd(m)', 'e(m)', 'C8', 'C2(m)', 'C2', 'M', 'D_CCT', 'SAT_D']
        if (['E', 'E_NIGHT', 'ER_NIGHT'].includes(pCode) && rule3ForbiddenNext.includes(slot.shiftCode)) {
          return {
            valid: false,
            error: `⛔ 違法禁止選填（硬性規範三）：同仁【${staff.name}】於前一日 (${prevDate}) 出勤 [一般小夜班 (E)]（00:30 下班），於 ${dateStr} 禁止選擇 [${targetShiftName}]，兩班間隔僅 ${gapHours.toFixed(1)} 小時，低於法定 11 小時限制！`
          }
        }

        // 通用 11 小時休息間隔阻擋
        if (constraints.enableRestGap !== false && gapHours < 11.0) {
          return {
            valid: false,
            error: `⛔ 違法禁止選填（勞基法第 34 條休息滿 11h）：同仁【${staff.name}】於前一日 (${prevDate}) 出勤 [${prevShiftName}]，於 ${dateStr} 欲選 [${targetShiftName}]，兩班間隔僅 ${gapHours.toFixed(1)} 小時，低於法定 11 小時限制！`
          }
        }
      }
    }

    // B. 後一日班間休息檢查 (掃描 slotsByDate + leaves)
    const nextShifts = []
    if (nextDate && slotsByDate && slotsByDate[nextDate]) {
      for (const nSlot of slotsByDate[nextDate]) {
        if (Array.isArray(nSlot.assignedStaffIds) && nSlot.assignedStaffIds.includes(staff.id)) {
          nextShifts.push(nSlot.shiftCode)
        }
      }
    }
    if (nextDate && Array.isArray(leaves)) {
      for (const l of leaves) {
        if (l.staffId === staff.id && (l.date === nextDate || l.start === nextDate) && l.shiftCode) {
          nextShifts.push(l.shiftCode)
        }
      }
    }

    for (const nCode of nextShifts) {
      const nextTimes = getShiftTimes(nextDate, nCode)
      if (nextTimes) {
        const gapHours = (nextTimes.startMs - currentTimes.endMs) / (3600 * 1000)
        const nextShiftName = getShiftName(nCode, defsToUse)
        const targetShiftName = getShiftName(slot.shiftCode, defsToUse)

        // 雙向反向規範 1：欲選班別 隔天已知排了大夜班 N
        const rule1PrevShifts = ['D', 'E', 'd(US)', 'd1', 'T', 'C9', 'd(m)', 'e(m)', 'C8', 'C2(m)', 'C2', 'M', 'SAT_D', 'D_CCT']
        if (rule1PrevShifts.includes(slot.shiftCode) && (nCode === 'N' || nCode === 'G_NIGHT' || nCode === 'ER_DEEP')) {
          return {
            valid: false,
            error: `⛔ 違法禁止選填（硬性規範一）：同仁【${staff.name}】在後一日 (${nextDate}) 已排 [${nextShiftName}]，於 ${dateStr} 選 [${targetShiftName}] 將導致兩班間隔僅 ${gapHours.toFixed(1)} 小時，低於法定 11 小時限制！`
          }
        }

        // 雙向反向規範 2：欲選 e(m)，但後一日已有 08:00 日班
        const rule2DayShifts = ['D', 'd(US)', 'd1', 'T', 'd(m)', 'D_CCT', 'SAT_D', '83（行）', 'CO（n）']
        if (slot.shiftCode === 'e(m)' && rule2DayShifts.includes(nCode)) {
          return {
            valid: false,
            error: `⛔ 違法禁止選填（硬性規範二）：同仁【${staff.name}】在後一日 (${nextDate}) 已排 08:00 日班 [${nextShiftName}]，於 ${dateStr} 選 [MRI晚班 (e(m))]（21:30 下班）將導致兩班間隔僅 ${gapHours.toFixed(1)} 小時，低於法定 11 小時限制！`
          }
        }

        // 雙向反向規範 3：欲選 E (小夜班)，但後一日已有指定班別
        const rule3ForbiddenNext = ['D', 'N', 'd(US)', 'd1', 'T', 'C9', 'd(m)', 'e(m)', 'C8', 'C2(m)', 'C2', 'M', 'D_CCT', 'SAT_D']
        if (['E', 'E_NIGHT', 'ER_NIGHT'].includes(slot.shiftCode) && rule3ForbiddenNext.includes(nCode)) {
          return {
            valid: false,
            error: `⛔ 違法禁止選填（硬性規範三）：同仁【${staff.name}】在後一日 (${nextDate}) 已排 [${nextShiftName}]，於 ${dateStr} 選 [一般小夜班 (E)]（00:30 下班）將導致兩班間隔僅 ${gapHours.toFixed(1)} 小時，低於法定 11 小時限制！`
          }
        }

        // 通用 11 小時休息間隔阻擋
        if (constraints.enableRestGap !== false && gapHours < 11.0) {
          return {
            valid: false,
            error: `⛔ 違法禁止選填（勞基法第 34 條休息滿 11h）：同仁【${staff.name}】在後一日 (${nextDate}) 已排 [${nextShiftName}]，於 ${dateStr} 選 [${targetShiftName}] 將導致兩班間隔僅 ${gapHours.toFixed(1)} 小時，低於法定 11 小時限制！`
          }
        }
      }
    }
  }

  // 6. 資深/資淺搭檔警示
  if (constraints.enableSeniorPairing !== false && slot.minLevel === 'SeniorPairing') {
    const isSenior = ['主管', '資深'].includes(staff.level)
    const existingStaffIds = slot.assignedStaffIds.filter(id => id !== staff.id)
    const existingStaffs = staffList.filter(s => existingStaffIds.includes(s.id))
    const hasExistingSenior = existingStaffs.some(s => ['主管', '資深'].includes(s.level))

    if (!isSenior && !hasExistingSenior && existingStaffs.length > 0) {
      result.warnings.push(`提醒：該機台房目前的已選同仁皆非資深/主管等級，請確保最終班表包含資深人員搭檔`)
    }
  }


  return result
}

/**
 * 智慧自動填補缺額 (Auto Fill Unfilled Slots)
 */
export function autoFillUnfilledSlots({ slotsByDate, staffList, leaves, constraints }) {
  const updatedSlots = JSON.parse(JSON.stringify(slotsByDate))

  const staffCounts = {}
  staffList.forEach(s => { staffCounts[s.id] = 0 })

  Object.values(updatedSlots).forEach(daySlots => {
    daySlots.forEach(slot => {
      slot.assignedStaffIds.forEach(id => {
        if (staffCounts[id] !== undefined) staffCounts[id]++
      })
    })
  })

  Object.keys(updatedSlots).sort().forEach(dateStr => {
    const daySlots = updatedSlots[dateStr]

    daySlots.forEach(slot => {
      while (slot.assignedStaffIds.length < slot.capacity) {
        const candidate = staffList
          .filter(staff => {
            const val = validateBidding({
              staff,
              slot,
              dateStr,
              slotsByDate: updatedSlots,
              staffList,
              leaves,
              constraints
            })
            return val.valid
          })
          .sort((a, b) => staffCounts[a.id] - staffCounts[b.id])[0]

        if (candidate) {
          slot.assignedStaffIds.push(candidate.id)
          staffCounts[candidate.id]++
        } else {
          break
        }
      }
    })
  })

  return updatedSlots
}

/**
 * 將 Slot 轉為傳統視角矩陣 roster[dateStr][staffId]
 */
export function convertSlotsToRoster(slotsByDate, staffList) {
  const roster = {}

  Object.keys(slotsByDate).sort().forEach(dateStr => {
    roster[dateStr] = {}
    
    staffList.forEach(s => {
      roster[dateStr][s.id] = 'OFF'
    })

    const daySlots = slotsByDate[dateStr]
    daySlots.forEach(slot => {
      slot.assignedStaffIds.forEach(staffId => {
        roster[dateStr][staffId] = slot.shiftCode
      })
    })
  })

  return roster
}

export function addSlotToDate(slotsByDate, dateStr, { shiftCode, capacity = 1, requiredSkill = null, minLevel = null }) {
  const updatedSlots = JSON.parse(JSON.stringify(slotsByDate))
  if (!updatedSlots[dateStr]) updatedSlots[dateStr] = []

  const newId = `${dateStr}_${shiftCode}_${Date.now()}`
  updatedSlots[dateStr].push({
    id: newId,
    dateStr,
    shiftCode,
    capacity: parseInt(capacity, 10) || 1,
    requiredSkill,
    minLevel,
    assignedStaffIds: []
  })

  return updatedSlots
}

export function removeSlotFromDate(slotsByDate, dateStr, slotId) {
  const updatedSlots = JSON.parse(JSON.stringify(slotsByDate))
  if (updatedSlots[dateStr]) {
    updatedSlots[dateStr] = updatedSlots[dateStr].filter(s => s.id !== slotId)
  }
  return updatedSlots
}

export function updateSlotInDate(slotsByDate, dateStr, slotId, { capacity, requiredSkill, minLevel }) {
  const updatedSlots = JSON.parse(JSON.stringify(slotsByDate))
  if (updatedSlots[dateStr]) {
    const slot = updatedSlots[dateStr].find(s => s.id === slotId)
    if (slot) {
      if (capacity !== undefined) slot.capacity = parseInt(capacity, 10) || 1
      if (requiredSkill !== undefined) slot.requiredSkill = requiredSkill
      if (minLevel !== undefined) slot.minLevel = minLevel
    }
  }
  return updatedSlots
}

export function getPrevDateStr(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  if (isNaN(y) || isNaN(m) || isNaN(d)) return ''
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() - 1)
  const year = dt.getFullYear()
  const month = String(dt.getMonth() + 1).padStart(2, '0')
  const day = String(dt.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getNextDateStr(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  if (isNaN(y) || isNaN(m) || isNaN(d)) return ''
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + 1)
  const year = dt.getFullYear()
  const month = String(dt.getMonth() + 1).padStart(2, '0')
  const day = String(dt.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseStandardDate(dateStr) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-').map(Number)
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null
  return new Date(y, m - 1, d)
}

export function getShiftName(shiftCode, customShiftDefs = SHIFT_DEFS) {
  const def = (customShiftDefs && customShiftDefs[shiftCode]) || SHIFT_DEFS[shiftCode]
  return def ? `${def.name} (${shiftCode})` : shiftCode
}

export function parseShiftTime(timeStr, shiftCode) {
  let startHour = 8.0
  let endHour = 16.5

  if (shiftCode === 'N' || shiftCode === 'G_NIGHT' || shiftCode === 'ER_DEEP') {
    return { startHour: 0.0, endHour: 8.5 }
  }
  if (shiftCode === 'E' || shiftCode === 'E_NIGHT' || shiftCode === 'ER_NIGHT') {
    return { startHour: 16.0, endHour: 24.5 }
  }
  if (shiftCode === 'CALL' || shiftCode === 'CALL_NURSE') {
    return { startHour: 8.0, endHour: 32.0 }
  }

  if (timeStr && timeStr.includes('-')) {
    const parts = timeStr.split('-').map(s => s.trim())
    if (parts.length === 2) {
      const parseH = (hStr) => {
        const [h, m] = hStr.split(':').map(Number)
        return (isNaN(h) ? 8 : h) + ((isNaN(m) ? 0 : m) / 60)
      }
      startHour = parseH(parts[0])
      endHour = parseH(parts[1])
      if (endHour <= startHour && endHour < 12) {
        endHour += 24.0
      }
    }
  }

  // 關鍵修復：所有日白班別 (包含 SAT_D 週六門診、D1 半天班、C2 支援班等)
  // 凡是日間班別接次日大夜班或夜班時，其下班時間基準至少以 16:30 (16.5h) 為準！
  // 確保「8/1 預日班 (含 SAT_D) ➜ 8/2 預大夜班 (00:00 上班)」間隔僅 7.5 小時，100% 精準觸發警示阻擋！
  const isDayShift = ['D', 'SAT_D', 'T', 'D_CCT', 'd(US)', 'd(m)', 'C9', 'C8', 'M', 'd1', 'C2', 'C2(m)', '83（行）', 'CO（n）'].includes(shiftCode) || (startHour >= 7 && startHour <= 10 && endHour < 24)
  if (isDayShift) {
    endHour = Math.max(endHour, 16.5)
  }

  return { startHour, endHour }
}

