/**
 * 放射診斷科「管理者發布需求 Slot ➜ 專長人員自主選班 ➜ 規則即時驗證」引擎
 * 班別代號與時間完全連動《放射科每日班別人力需求與專長門檻設定表.xlsx》
 */

import { SHIFT_DEFS } from './types.js'
import { getShiftInterval, getRestGap, formatClock, MIN_REST_HOURS } from './shiftTime.js'

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

  // 6. 勞基法 11 小時班別休息間隔（雙向檢查前一日與後一日）
  //    時間一律取自班別設定（shiftTime.js），假別沒有出勤時間不參與檢查
  if (constraints.enableRestGap !== false) {
    const prevDate = getPrevDateStr(dateStr)
    const nextDate = getNextDateStr(dateStr)
    const defsToUse = customShiftDefs || SHIFT_DEFS
    const getDef = (code) => defsToUse[code] || SHIFT_DEFS[code]

    // 蒐集同仁在指定日期已排的班別 (掃描 slotsByDate + leaves)
    const collectShifts = (dStr) => {
      const codes = []
      if (dStr && slotsByDate && slotsByDate[dStr]) {
        for (const s of slotsByDate[dStr]) {
          if (Array.isArray(s.assignedStaffIds) && s.assignedStaffIds.includes(staff.id)) codes.push(s.shiftCode)
        }
      }
      if (dStr && Array.isArray(leaves)) {
        for (const l of leaves) {
          if (l.staffId === staff.id && (l.date === dStr || l.start === dStr) && l.shiftCode) codes.push(l.shiftCode)
        }
      }
      return codes
    }

    const restGapError = (earlierCode, earlierDate, laterCode, laterDate, rest) => {
      const earlierName = getShiftName(earlierCode, defsToUse)
      const laterName = getShiftName(laterCode, defsToUse)
      const earlierIv = getShiftInterval(getDef(earlierCode))
      const laterIv = getShiftInterval(getDef(laterCode))
      const head = `同仁【${staff.name}】${earlierDate} [${earlierName}] ➜ ${laterDate} [${laterName}]`
      if (rest.byDeptRule) {
        return `⛔ 禁止選填（科內規定）：${head}，[${earlierName}] 依科內規定視同 ${formatClock(earlierIv.restEndHour)} 下班起算休息，至 ${formatClock(laterIv.startHour)} 上班僅 ${rest.gap.toFixed(1)} 小時，未滿 ${MIN_REST_HOURS} 小時！`
      }
      if (rest.gap < 0) {
        return `⛔ 違法禁止選填（勞基法第 34 條休息滿 ${MIN_REST_HOURS}h）：${head}，${formatClock(earlierIv.endHour)} 下班前即須於 ${formatClock(laterIv.startHour)} 上班，兩班時段重疊！`
      }
      return `⛔ 違法禁止選填（勞基法第 34 條休息滿 ${MIN_REST_HOURS}h）：${head}，${formatClock(earlierIv.endHour)} 下班至 ${formatClock(laterIv.startHour)} 上班，兩班間隔僅 ${rest.gap.toFixed(1)} 小時，低於法定 ${MIN_REST_HOURS} 小時限制！`
    }

    // A. 前一日已排班別 ➜ 今日欲選班別
    for (const pCode of collectShifts(prevDate)) {
      const rest = getRestGap(getDef(pCode), getDef(slot.shiftCode))
      if (rest && !rest.ok) {
        return { valid: false, error: restGapError(pCode, prevDate, slot.shiftCode, dateStr, rest), restGap: { direction: 'prev', otherCode: pCode, gap: rest.gap, byDeptRule: rest.byDeptRule } }
      }
    }

    // B. 今日欲選班別 ➜ 後一日已排班別
    for (const nCode of collectShifts(nextDate)) {
      const rest = getRestGap(getDef(slot.shiftCode), getDef(nCode))
      if (rest && !rest.ok) {
        return { valid: false, error: restGapError(slot.shiftCode, dateStr, nCode, nextDate, rest), restGap: { direction: 'next', otherCode: nCode, gap: rest.gap, byDeptRule: rest.byDeptRule } }
      }
    }
  }

  // 7. 資深/資淺搭檔警示
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
export function autoFillUnfilledSlots({ slotsByDate, staffList, leaves, constraints, customShiftDefs = SHIFT_DEFS }) {
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
              constraints,
              customShiftDefs
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
