/**
 * 放射診斷科「管理者發布需求 Slot ➜ 專長人員自主選班 ➜ 規則即時驗證」引擎
 * 班別代號與時間完全連動《放射科每日班別人力需求與專長門檻設定表.xlsx》
 */

import { SHIFT_DEFS } from './types.js'
import { MIN_REST_HOURS } from './shiftTime.js'
import { checkNextDayShift, checkConsecutiveWorkDays, checkNightRuns } from './deptRules.js'
import { EDU_LEAVE_CODE, EDU_LEAVE_DEF, isAnnualLeaveClass, getEduDate } from './education.js'

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
 * 班別的開班條件摘要（代號 ➜ 開班星期｜專長門檻｜資深帶導）
 * 用來判斷班別設定改了之後，哪些班別的班格需要重新同步
 */
export function getOpeningSignature(shiftDefs) {
  const signature = {}
  Object.entries(shiftDefs || {}).forEach(([code, def]) => {
    signature[code] = `${def.applicableDays ?? ''}|${def.modKey || ''}|${def.needsSenior ? 1 : 0}`
  })
  return signature
}

/**
 * 班別設定變更後，把指定班別的班格同步成最新的開班條件，不動已選班的人：
 * - 依設定該開而還沒開的班格 ➜ 補上
 * - 依設定不該開、且沒有人選的自動班格 ➜ 移除（有人選的保留；主管手動加開的班格不動）
 * - 仍該開的班格 ➜ 更新專長門檻與資深帶導條件
 */
export function syncSlotsWithShiftDefs(slotsByDate, year, month, holidays, shiftDefs, changedCodes) {
  const defaults = generateDefaultSlots(year, month, holidays, shiftDefs)
  const codes = new Set(changedCodes)
  const isManualSlot = (slot) => /_\d{13}$/.test(String(slot.id))
  const result = {}
  let added = 0
  let removed = 0
  let keptAssigned = 0

  Object.keys(defaults).forEach(dateStr => {
    const defaultByCode = {}
    defaults[dateStr].forEach(s => { defaultByCode[s.shiftCode] = s })

    const daySlots = []
    ;((slotsByDate && slotsByDate[dateStr]) || []).forEach(slot => {
      if (!codes.has(slot.shiftCode) || isManualSlot(slot)) {
        daySlots.push(slot)
        return
      }
      const def = defaultByCode[slot.shiftCode]
      if (def) {
        daySlots.push({ ...slot, requiredSkill: def.requiredSkill, minLevel: def.minLevel })
      } else if ((slot.assignedStaffIds || []).length > 0) {
        daySlots.push(slot)
        keptAssigned++
      } else {
        removed++
      }
    })

    defaults[dateStr].forEach(def => {
      if (codes.has(def.shiftCode) && !daySlots.some(s => s.shiftCode === def.shiftCode)) {
        daySlots.push(def)
        added++
      }
    })

    result[dateStr] = daySlots
  })

  return { slots: result, added, removed, keptAssigned }
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
  customShiftDefs = SHIFT_DEFS,
  deptRules
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
  // 年假上課當天比照公假算上班 8 小時，不可再選其他班（登記年假上課本身的檢查不受此限）
  if (slot.shiftCode !== EDU_LEAVE_CODE && leaves.some(l => l.staffId === staff.id && isAnnualLeaveClass(l) && getEduDate(l) === dateStr)) {
    return { valid: false, error: `同仁 ${staff.name} 在 ${dateStr} 已登記年假上課（算上班 8 小時），無法選班`, eduLeave: true }
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

  if (shiftDef?.nightType && !staff.canNight) {
    return { valid: false, error: `${staff.name} 設定為「不可上夜班/新進人員」，無法選擇急診大小夜班` }
  }

  // 6. 接班與科內排班基準檢查（規則見 deptRules.js 與 docs/勞基法排班規則草案.md）
  //    時間一律取自班別設定；特休等沒有出勤時間的假別不參與休息間隔，但仍算上班日
  if (constraints.enableRestGap !== false) {
    const prevDate = getPrevDateStr(dateStr)
    const nextDate = getNextDateStr(dateStr)
    const defsToUse = customShiftDefs || SHIFT_DEFS
    const getDef = (code) => (code === EDU_LEAVE_CODE ? EDU_LEAVE_DEF : defsToUse[code] || SHIFT_DEFS[code])
    const targetDef = getDef(slot.shiftCode)

    // 同仁已排的班別：日期 ➜ 班別代號清單 (掃描 slotsByDate + leaves)
    const myShiftsByDate = {}
    const addShift = (dStr, code) => {
      if (!dStr || !code) return
      if (!myShiftsByDate[dStr]) myShiftsByDate[dStr] = []
      myShiftsByDate[dStr].push(code)
    }
    Object.entries(slotsByDate || {}).forEach(([dStr, slots]) => {
      (slots || []).forEach(s => {
        if (Array.isArray(s.assignedStaffIds) && s.assignedStaffIds.includes(staff.id)) addShift(dStr, s.shiftCode)
      })
    })
    if (Array.isArray(leaves)) {
      leaves.forEach(l => {
        if (l.staffId !== staff.id) return
        if (l.shiftCode) addShift(l.date || l.start, l.shiftCode)
        // 年假上課：比照公假 08:00–16:30 算上班，納入休息間隔與連續上班天數
        else if (isAnnualLeaveClass(l)) addShift(getEduDate(l), EDU_LEAVE_CODE)
      })
    }

    const blocked = (title, earlierCode, earlierDate, laterCode, laterDate, problem, extra) => ({
      valid: false,
      error: `⛔ ${title}：同仁【${staff.name}】${earlierDate} [${getShiftName(earlierCode, defsToUse)}] ➜ ${laterDate} [${getShiftName(laterCode, defsToUse)}]，${problem.detail}！`,
      ...extra
    })
    const pairTitle = (problem) => (problem.byDeptRule ? '禁止選填（科內規定）' : `違法禁止選填（勞基法第 34 條休息滿 ${MIN_REST_HOURS}h）`)

    // A. 前一日已排班別 ➜ 今日欲選班別
    for (const pCode of myShiftsByDate[prevDate] || []) {
      const problem = checkNextDayShift(getDef(pCode), targetDef, deptRules)
      if (problem) {
        return blocked(pairTitle(problem), pCode, prevDate, slot.shiftCode, dateStr, problem, { restGap: { direction: 'prev', otherCode: pCode, ...problem } })
      }
    }

    // B. 今日欲選班別 ➜ 後一日已排班別
    for (const nCode of myShiftsByDate[nextDate] || []) {
      const problem = checkNextDayShift(targetDef, getDef(nCode), deptRules)
      if (problem) {
        return blocked(pairTitle(problem), slot.shiftCode, dateStr, nCode, nextDate, problem, { restGap: { direction: 'next', otherCode: nCode, ...problem } })
      }
    }

    // C. 連續上班天數（特休、公假都算上班）
    const consecutive = checkConsecutiveWorkDays(Object.keys(myShiftsByDate), dateStr, deptRules)
    if (consecutive) {
      return { valid: false, error: `⛔ 禁止選填（科內規定）：同仁【${staff.name}】${consecutive.detail}！`, deptRule: consecutive }
    }

    // D. 小夜／大夜每月輪數與每輪連續天數
    if (targetDef?.nightType) {
      const sameTypeDates = Object.keys(myShiftsByDate).filter(d => myShiftsByDate[d].some(code => getDef(code)?.nightType === targetDef.nightType))
      const nightRun = checkNightRuns(sameTypeDates, dateStr, targetDef.nightType, deptRules)
      if (nightRun) {
        return { valid: false, error: `⛔ 禁止選填（科內規定）：同仁【${staff.name}】${nightRun.detail}！`, deptRule: nightRun }
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
export function autoFillUnfilledSlots({ slotsByDate, staffList, leaves, constraints, customShiftDefs = SHIFT_DEFS, deptRules, adjacentSlots = {} }) {
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
              slotsByDate: { ...adjacentSlots, ...updatedSlots },
              staffList,
              leaves,
              constraints,
              customShiftDefs,
              deptRules
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
