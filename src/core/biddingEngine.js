/**
 * 放射診斷科「管理者發布需求 Slot ➜ 專長人員自主選班 ➜ 規則即時驗證」引擎
 * 班別代號與時間完全連動《放射科每日班別人力需求與專長門檻設定表.xlsx》
 */

import { SHIFT_DEFS } from './types.js'
import { MIN_REST_HOURS, getShiftInterval } from './shiftTime.js'
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

      // 國定假日只開有勾選「國定假日開班」的班別；其餘日子依開班星期
      const shouldAdd = isHoliday ? def.openOnHoliday === true : appDays.includes(dayOfWeek)

      if (shouldAdd) {
        daySlots.push({
          id: `${dateStr}_${code}`,
          dateStr,
          shiftCode: code,
          capacity: Math.max(parseInt(def.capacity, 10) || 1, 1),
          requiredSkill: def.modKey || null,
          assignedStaffIds: []
        })
      }
    })

    slotsByDate[dateStr] = daySlots
  }


  return slotsByDate
}

/**
 * 班別的開班條件摘要（代號 ➜ 開班星期｜專長門檻｜每班名額｜國定假日開班）
 * 用來判斷班別設定改了之後，哪些班別的班格需要重新同步
 */
export function getOpeningSignature(shiftDefs) {
  const signature = {}
  Object.entries(shiftDefs || {}).forEach(([code, def]) => {
    signature[code] = `${def.applicableDays ?? ''}|${def.modKey || ''}|${parseInt(def.capacity, 10) || 1}|${def.openOnHoliday ? 1 : 0}`
  })
  return signature
}

/**
 * 班別設定變更後，把指定班別的班格同步成最新的開班條件，不動已選班的人：
 * - 依設定該開而還沒開的班格 ➜ 補上
 * - 依設定不該開、且沒有人選的自動班格 ➜ 移除（有人選的保留；主管手動加開的班格不動）
 * - 仍該開的班格 ➜ 更新專長門檻與名額
 * onlyDates 有給時只同步那些日期（例如國定假日有變動的日子），其餘日期原樣保留
 */
export function syncSlotsWithShiftDefs(slotsByDate, year, month, holidays, shiftDefs, changedCodes, onlyDates = null) {
  const defaults = generateDefaultSlots(year, month, holidays, shiftDefs)
  const codes = new Set(changedCodes)
  const codeOrder = Object.keys(shiftDefs || {})
  const isManualSlot = (slot) => /_\d{13}$/.test(String(slot.id))
  const result = {}
  let added = 0
  let removed = 0
  let keptAssigned = 0

  Object.keys(defaults).forEach(dateStr => {
    if (onlyDates && !onlyDates.includes(dateStr)) {
      result[dateStr] = (slotsByDate && slotsByDate[dateStr]) || defaults[dateStr]
      return
    }
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
        daySlots.push({ ...slot, requiredSkill: def.requiredSkill, capacity: def.capacity })
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

    // 維持班別設定的排列順序（補上的班格不會跑到最後面）
    const orderOf = (slot) => {
      const idx = codeOrder.indexOf(slot.shiftCode)
      return idx === -1 ? codeOrder.length : idx
    }
    result[dateStr] = daySlots.map((slot, idx) => ({ slot, idx })).sort((a, b) => orderOf(a.slot) - orderOf(b.slot) || a.idx - b.idx).map(({ slot }) => slot)
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

  // 0-1. 在職狀態：停用／留停的同仁不可排班
  if (staff.status && staff.status !== '在職') {
    return { valid: false, error: `${staff.name} 目前為「${staff.status}」，不可排班`, inactive: true }
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
    return { valid: false, error: `${staff.name} 設定為「不可上夜班」，無法選擇小夜班或大夜班` }
  }

  // 5-1. 六日資格：人員檔案未勾「可值六日」的放射師不可排週六、週日的出勤班別（假別不受限）
  //      資料欄位沿用 canSat，避免更動已儲存的人員資料
  const targetDate = parseStandardDate(dateStr)
  if (targetDate && [0, 6].includes(targetDate.getDay()) && staff.role === '放射師' && staff.canSat === false && getShiftInterval(shiftDef)) {
    return { valid: false, error: `${staff.name} 未開放六日班（人員檔案未勾選「可值六日」）`, noWeekend: true }
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

export function addSlotToDate(slotsByDate, dateStr, { shiftCode, capacity = 1, requiredSkill = null }) {
  const updatedSlots = JSON.parse(JSON.stringify(slotsByDate))
  if (!updatedSlots[dateStr]) updatedSlots[dateStr] = []

  const newId = `${dateStr}_${shiftCode}_${Date.now()}`
  updatedSlots[dateStr].push({
    id: newId,
    dateStr,
    shiftCode,
    capacity: parseInt(capacity, 10) || 1,
    requiredSkill,
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

export function updateSlotInDate(slotsByDate, dateStr, slotId, { capacity, requiredSkill }) {
  const updatedSlots = JSON.parse(JSON.stringify(slotsByDate))
  if (updatedSlots[dateStr]) {
    const slot = updatedSlots[dateStr].find(s => s.id === slotId)
    if (slot) {
      if (capacity !== undefined) slot.capacity = parseInt(capacity, 10) || 1
      if (requiredSkill !== undefined) slot.requiredSkill = requiredSkill
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

/**
 * 全月合規總檢查：把當月每一筆已排的班，用目前的人員資料、班別設定與排班規則重新驗證一次
 * 用途：規則、班別時間或人員資料改過之後，找出先前已排但現在不合規的班
 * 回傳 [{ staffId, staffName, dateStr, shiftCode, category, message }]
 */
export function auditMonthSchedule({ slotsByDate, adjacentSlots = {}, staffList, leaves = [], constraints = {}, customShiftDefs = SHIFT_DEFS, deptRules }) {
  const issues = []
  const seen = new Set()
  const allSlots = { ...adjacentSlots, ...(slotsByDate || {}) }
  const push = (issue) => {
    const key = `${issue.staffId}|${issue.message}`
    if (seen.has(key)) return
    seen.add(key)
    issues.push(issue)
  }

  Object.keys(slotsByDate || {}).sort().forEach(dateStr => {
    (slotsByDate[dateStr] || []).forEach(slot => {
      const assigned = Array.isArray(slot.assignedStaffIds) ? slot.assignedStaffIds : []
      if (assigned.length === 0) return
      const shiftName = getShiftName(slot.shiftCode, customShiftDefs)

      if (!customShiftDefs[slot.shiftCode]) {
        push({ staffId: '', staffName: '', dateStr, shiftCode: slot.shiftCode, category: '資格／設定', message: `${dateStr} [${slot.shiftCode}] 這個班別已不在班別設定中，但仍有 ${assigned.length} 人排班` })
      }
      if (assigned.length > slot.capacity) {
        push({ staffId: '', staffName: '', dateStr, shiftCode: slot.shiftCode, category: '資格／設定', message: `${dateStr} [${shiftName}] 超過名額：已排 ${assigned.length} 人，名額 ${slot.capacity} 人` })
      }

      assigned.forEach(staffId => {
        const staff = staffList.find(s => s.id === staffId)
        if (!staff) {
          push({ staffId, staffName: staffId, dateStr, shiftCode: slot.shiftCode, category: '資格／設定', message: `${dateStr} [${shiftName}] 排了員工編號 ${staffId}，但人員檔案中找不到這個人` })
          return
        }
        // 當作這位同仁還沒選這個班，重新驗證一次（名額另外檢查，這裡不重複計算）
        const testSlot = { ...slot, capacity: Infinity, assignedStaffIds: assigned.filter(id => id !== staffId) }
        const testSlots = { ...allSlots, [dateStr]: (allSlots[dateStr] || []).map(s => (s.id === slot.id ? testSlot : s)) }
        const val = validateBidding({ staff, slot: testSlot, dateStr, slotsByDate: testSlots, staffList, leaves, constraints, customShiftDefs, deptRules })
        if (!val.valid) {
          const byDeptRule = !!val.deptRule || !!val.restGap?.byDeptRule
          const category = val.restGap && !byDeptRule ? '勞基法' : byDeptRule ? '科內規定' : '資格／設定'
          const message = String(val.error || '').replace(/^⛔\s*/, '').replace(/^(違法)?禁止選填（[^）]*）：/, '').replace(/！$/, '')
          push({ staffId, staffName: staff.name, dateStr, shiftCode: slot.shiftCode, category, message: val.restGap || val.deptRule ? message : `${dateStr} [${shiftName}] ${staff.name}：${message}` })
        }
      })
    })
  })

  return issues
}
