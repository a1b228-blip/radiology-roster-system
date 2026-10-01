<template>
  <div :class="{ 'show-edited-bg': showEditHighlight }">
    <!-- Header Controls -->
    <HeaderNav 
      v-model:fontScale="fontScale"
      v-model:showEditHighlight="showEditHighlight"
      @generate="handleGenerate"
      @print="handlePrint"
      @export-excel="handleExportExcel"
      @backup-json="handleBackupJSON"
      @load-backup="handleLoadBackup"
    />

    <main class="app-container">
      <!-- 6 大 Tab 頁籤導覽 (去數字前綴，純標題極簡展現) -->
      <nav class="tabs-nav no-print">
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'setup' }"
          @click="activeTab = 'setup'"
        >
          <Calendar :size="16" />
          <span>放射科人員檔案</span>
        </button>

        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'specialty' }"
          @click="activeTab = 'specialty'"
        >
          <Award :size="16" />
          <span>放射師第二專長設定</span>
        </button>

        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'rules' }"
          @click="activeTab = 'rules'"
        >
          <ShieldCheck :size="16" />
          <span>排班規範與權重設定</span>
        </button>

        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'shifts' }"
          @click="activeTab = 'shifts'"
        >
          <Clock :size="16" />
          <span>班別與時間段設定</span>
        </button>



        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'leave' }"
          @click="activeTab = 'leave'"
        >
          <UserMinus :size="16" />
          <span>20小時上課工時紀錄</span>
        </button>

        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'manual' }"
          @click="activeTab = 'manual'"
        >
          <Lock :size="16" />
          <span>人工指定班別</span>
        </button>

        <button 
          class="tab-btn highlight-tab" 
          :class="{ active: activeTab === 'bidding' }"
          @click="activeTab = 'bidding'"
        >
          <UserCheck :size="16" />
          <span>🙋‍♂️ 同仁自主選班</span>
        </button>

        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'result' }"
          @click="activeTab = 'result'"
        >
          <Zap :size="16" />
          <span>正式排班與結果</span>
        </button>
      </nav>


      <!-- 頁籤內容面板 -->
      <TabSetup 
        v-if="activeTab === 'setup'"
        v-model:staff="staff"
      />

      <TabSpecialtyTargets
        v-if="activeTab === 'specialty'"
        :staff="staff"
        v-model:specialtyTargets="specialtyTargets"
      />

      <TabRulesAndWeights
        v-if="activeTab === 'rules'"
        v-model:deptRules="deptRules"
      />

      <TabShiftDefs 
        v-if="activeTab === 'shifts'" 
        v-model:shiftDefs="shiftDefs"
        :deptRules="deptRules"
        v-model:holidays="holidays"
        v-model:holidayNames="holidayNames"
        @rename-code="handleRenameShiftCode"
      />



      <TabLeaveEvents 
        v-if="activeTab === 'leave'"
        :staff="staff"
        :slotsArchive="slotsArchive"
        :shiftDefs="shiftDefs"
        :deptRules="deptRules"
        :constraints="constraints"
        v-model:leaves="leaves"
      />

      <TabManualLocks 
        v-if="activeTab === 'manual'"
        :staff="staff"
        :slotsByDate="slotsByDate"
        :shiftDefs="shiftDefs"
        :deptRules="deptRules"
        :slotsArchive="slotsArchive"
        :leaves="leaves"
        v-model:locks="locks"
      />

      <TabShiftBidding
        v-if="activeTab === 'bidding'"
        v-model:year="year"
        v-model:month="month"
        :staffList="staff"
        v-model:slotsByDate="slotsByDate"
        :shiftDefs="shiftDefs"
        :holidays="holidays"
        :leaves="leaves"
        :constraints="constraints"
        :deptRules="deptRules"
        :adjacentSlots="adjacentSlots"
        :specialtyTargets="specialtyTargets"
        @apply-to-roster="handleApplyBiddingToRoster"
      />


      <TabScheduleResult 
        v-if="activeTab === 'result'"
        :year="year"
        :month="month"
        :staff="staff"
        :roster="roster"
        :slotsByDate="slotsByDate"
        :shiftDefs="shiftDefs"
        :leaves="leaves"
        :auditIssues="auditIssues"
        :manualEdits="manualEdits"
        @generate="handleGenerate"
        @cell-edit="handleCellEdit"
        @export-excel="handleExportExcel"
      />


    </main>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Calendar, Clock, UserMinus, Lock, Zap, UserCheck, Award, ShieldCheck } from 'lucide-vue-next'

import HeaderNav from './components/HeaderNav.vue'
import TabSetup from './components/TabSetup.vue'
import TabSpecialtyTargets from './components/TabSpecialtyTargets.vue'
import TabRulesAndWeights from './components/TabRulesAndWeights.vue'
import TabShiftDefs from './components/TabShiftDefs.vue'
import TabLeaveEvents from './components/TabLeaveEvents.vue'
import TabManualLocks from './components/TabManualLocks.vue'
import TabShiftBidding from './components/TabShiftBidding.vue'
import TabScheduleResult from './components/TabScheduleResult.vue'


import { DEFAULT_STAFF, SHIFT_DEFS, DEFAULT_SPECIALTY_TARGETS, STAFF_DATA_VERSION, SPECIALTY_TARGETS_VERSION, sortStaffBySpecialty } from './core/types.js'


import { solveRoster } from './core/solver.js'
import { exportRosterToExcel } from './core/exporter.js'
import { loadState, saveState, exportBackupJSON, importBackupJSON } from './core/storage.js'
import { generateDefaultSlots, getOpeningSignature, syncSlotsWithShiftDefs, auditMonthSchedule } from './core/biddingEngine.js'
import { normalizeShiftDefs, getShiftInterval } from './core/shiftTime.js'
import { normalizeDeptRules } from './core/deptRules.js'

// 核心響應式狀態 (全可由主管在 UI 直接修改)
const year = ref(loadState('year', 2026))
const month = ref(loadState('month', 9))
const holidays = ref(loadState('holidays', ['2026-09-28']))
// 國定假日名稱（日期 ➜ 名稱），只用於顯示
const holidayNames = ref(loadState('holidayNames', {}))
// 人員主檔版本檢查：LocalStorage 內的名冊版本不是最新版時，改載入最新預設名冊與第二專長目標
// （舊資料先另存一份備份，避免手動修改過的內容直接遺失）
const savedStaffVersion = loadState('staffDataVersion', null)
const isStaffDataCurrent = savedStaffVersion === STAFF_DATA_VERSION
if (!isStaffDataCurrent) {
  const oldStaff = loadState('staff', null)
  if (oldStaff) {
    saveState(`staffBackup_${savedStaffVersion || 'legacy'}`, {
      staff: oldStaff,
      specialtyTargets: loadState('specialtyTargets', null)
    })
  }
  saveState('staff', DEFAULT_STAFF)
  saveState('specialtyTargets', DEFAULT_SPECIALTY_TARGETS)
  saveState('staffDataVersion', STAFF_DATA_VERSION)
}
// 第二專長目標天數版本檢查：版本不同時只重置目標天數（舊值另存備份），不動人員資料
const savedTargetsVersion = loadState('specialtyTargetsVersion', null)
if (savedTargetsVersion !== SPECIALTY_TARGETS_VERSION) {
  const oldTargets = loadState('specialtyTargets', null)
  if (oldTargets) saveState(`specialtyTargetsBackup_${savedTargetsVersion || 'legacy'}`, oldTargets)
  saveState('specialtyTargets', DEFAULT_SPECIALTY_TARGETS)
  saveState('specialtyTargetsVersion', SPECIALTY_TARGETS_VERSION)
}

// 載入時依第二專長重新排序（只調整順序，保留使用者勾選的專長設定）
const staff = ref(sortStaffBySpecialty(loadState('staff', JSON.parse(JSON.stringify(DEFAULT_STAFF)))))
saveState('staff', staff.value)
// 班別定義：舊版只存時間文字的資料，載入時自動補齊 start / end / restEnd 欄位（不更動使用者原本的設定值）
const shiftDefs = ref(normalizeShiftDefs(loadState('shiftDefs', SHIFT_DEFS), { legacy: true }))
// 一次性更新：公假比照日班 08:00–16:30 算上班（2026-10-01 使用者確認）。只在公假尚未設定時間時補上，之後不再覆寫
if (loadState('shiftDefsPatch', null) !== 'publicLeaveAsDayShift_20261001') {
  if (shiftDefs.value['公'] && !getShiftInterval(shiftDefs.value['公'])) {
    shiftDefs.value['公'] = { ...shiftDefs.value['公'], start: SHIFT_DEFS['公'].start, end: SHIFT_DEFS['公'].end, breakMinutes: SHIFT_DEFS['公'].breakMinutes, time: SHIFT_DEFS['公'].time }
    saveState('shiftDefs', shiftDefs.value)
  }
  saveState('shiftDefsPatch', 'publicLeaveAsDayShift_20261001')
}
// 科內排班基準（可調整，但不會比法規寬鬆）
const deptRules = ref(normalizeDeptRules(loadState('deptRules', null)))
const constraints = ref(loadState('constraints', {
  enableRestGap: true,
  restGapHours: 11,
  maxNightShiftsPerMonth: 6
}))
const leaves = ref(loadState('leaves', []))
const locks = ref(loadState('locks', []))
const roster = ref(loadState('roster', {}))
const warnings = ref(loadState('warnings', []))
const manualEdits = ref(loadState('manualEdits', {}))

// 全月需求班別 Slot 矩陣
const slotsByDate = ref(loadState('slotsByDate', null) || generateDefaultSlots(year.value, month.value, holidays.value, shiftDefs.value))

// 各月份班表存檔（'YYYY-MM' ➜ 該月 Slot 矩陣）：切換月份不再清空，並供跨月規則檢查使用
const monthKey = (y, m) => `${y}-${String(m).padStart(2, '0')}`
const slotsArchive = ref(loadState('slotsArchive', {}))

// 目前月份的班表隨時同步進存檔
watch(slotsByDate, (newSlots) => {
  if (!newSlots) return
  slotsArchive.value = { ...slotsArchive.value, [monthKey(year.value, month.value)]: newSlots }
}, { deep: true, immediate: true })

// 上個月與下個月的班表：讓連續上班天數、夜班連續天數、班間休息能跨月檢查
const adjacentSlots = computed(() => {
  const prev = new Date(year.value, month.value - 2, 1)
  const next = new Date(year.value, month.value, 1)
  return {
    ...(slotsArchive.value[monthKey(prev.getFullYear(), prev.getMonth() + 1)] || {}),
    ...(slotsArchive.value[monthKey(next.getFullYear(), next.getMonth() + 1)] || {})
  }
})

// 全月合規總檢查：規則、班別時間或人員資料一改就重新檢查當月所有已排的班
const auditIssues = computed(() => auditMonthSchedule({
  slotsByDate: slotsByDate.value || {},
  adjacentSlots: adjacentSlots.value,
  staffList: staff.value,
  leaves: leaves.value,
  constraints: constraints.value,
  customShiftDefs: shiftDefs.value,
  deptRules: deptRules.value
}))

const fontScale = ref(1.0)
const showEditHighlight = ref(true)
const activeTab = ref('bidding') // 預設開啟同仁自主選班 Tab

const specialtyTargets = ref(loadState('specialtyTargets', null) || DEFAULT_SPECIALTY_TARGETS)


// 監聽並持久化儲存
watch([year, month, holidays, staff, shiftDefs, constraints, leaves, locks, roster, warnings, manualEdits, slotsByDate, specialtyTargets, deptRules, slotsArchive, holidayNames], () => {
  saveState('year', year.value)
  saveState('month', month.value)
  saveState('holidays', holidays.value)
  saveState('staff', staff.value)
  saveState('shiftDefs', shiftDefs.value)
  saveState('constraints', constraints.value)
  saveState('leaves', leaves.value)
  saveState('locks', locks.value)
  saveState('roster', roster.value)
  saveState('warnings', warnings.value)
  saveState('manualEdits', manualEdits.value)
  saveState('slotsByDate', slotsByDate.value)
  saveState('specialtyTargets', specialtyTargets.value)
  saveState('holidayNames', holidayNames.value)
  saveState('deptRules', deptRules.value)
  saveState('slotsArchive', slotsArchive.value)
}, { deep: true })



// 自動同步【第四項 人工指定班別】至【第五項 同仁自主選班 Slot 矩陣】
function syncLocksToSlots() {
  if (!slotsByDate.value || !Array.isArray(locks.value)) return

  const updatedSlots = JSON.parse(JSON.stringify(slotsByDate.value))
  let changed = false

  locks.value.forEach(lock => {
    const { date, staffId, shiftCode } = lock
    if (!date || !staffId || !shiftCode) return

    // 格式化日期 key
    let dateStr = date
    if (!date.includes('-')) {
      dateStr = `${year.value}-${String(month.value).padStart(2, '0')}-${String(date).padStart(2, '0')}`
    }

    const daySlots = updatedSlots[dateStr]
    if (!daySlots) return

    // 單純尋找當天已開設的對應班別 Slot
    const targetSlot = daySlots.find(s => s.shiftCode === shiftCode)

    if (targetSlot) {
      // 單純將同仁帶入已開班的名單中
      if (!targetSlot.assignedStaffIds.includes(staffId)) {
        targetSlot.assignedStaffIds.push(staffId)
        changed = true
      }
    }
    // 若當天尚未開設該班別，完全不自動加開格子，純粹保持原樣
  })

  if (changed) {
    slotsByDate.value = updatedSlots
  }
}


// 刪除人工指定時，把該同仁從對應的班格退掉（當月或其他月份的存檔）
function unassignRemovedLocks(newLocks, oldLocks) {
  const keyOf = (l) => `${l.date}|${l.staffId}|${l.shiftCode}`
  const remaining = new Set((newLocks || []).map(keyOf))
  const removed = (oldLocks || []).filter(l => l.date && !remaining.has(keyOf(l)))
  if (removed.length === 0) return

  const currentKey = monthKey(year.value, month.value)
  const unassign = (monthSlots, lock) => {
    const slot = (monthSlots?.[lock.date] || []).find(s => s.shiftCode === lock.shiftCode && s.assignedStaffIds.includes(lock.staffId))
    if (slot) slot.assignedStaffIds = slot.assignedStaffIds.filter(id => id !== lock.staffId)
    return !!slot
  }

  const updatedSlots = JSON.parse(JSON.stringify(slotsByDate.value || {}))
  const updatedArchive = JSON.parse(JSON.stringify(slotsArchive.value || {}))
  let currentChanged = false
  let archiveChanged = false
  removed.forEach(lock => {
    const key = String(lock.date).slice(0, 7)
    if (key === currentKey) currentChanged = unassign(updatedSlots, lock) || currentChanged
    else archiveChanged = unassign(updatedArchive[key], lock) || archiveChanged
  })
  if (archiveChanged) slotsArchive.value = updatedArchive
  if (currentChanged) slotsByDate.value = updatedSlots
}

watch(locks, (newLocks, oldLocks) => {
  unassignRemovedLocks(newLocks, oldLocks)
  syncLocksToSlots()
}, { immediate: true })

// 各月份班格產生時所依據的開班條件：班別設定改了之後，用來找出哪些班別的班格要同步
const slotSignatures = ref(loadState('slotSignatures', {}))

function markSlotsSynced() {
  slotSignatures.value = { ...slotSignatures.value, [monthKey(year.value, month.value)]: getOpeningSignature(shiftDefs.value) }
  saveState('slotSignatures', slotSignatures.value)
}

// 讓目前月份的班格跟上「班別與時間段設定」的開班條件（只動有變更的班別，不動已選班的人）
function syncSlotsToShiftDefs() {
  if (!slotsByDate.value) return
  const current = getOpeningSignature(shiftDefs.value)
  const previous = slotSignatures.value[monthKey(year.value, month.value)]
  const existingCodes = Object.values(slotsByDate.value).flatMap(daySlots => (daySlots || []).map(s => s.shiftCode))
  // 沒有紀錄代表這個月的班格是舊版產生的，全部班別都核對一次
  const changedCodes = previous
    ? [...new Set([...Object.keys(current), ...Object.keys(previous)])].filter(code => current[code] !== previous[code])
    : [...new Set([...Object.keys(current), ...existingCodes])]

  if (changedCodes.length > 0) {
    const synced = syncSlotsWithShiftDefs(slotsByDate.value, year.value, month.value, holidays.value, shiftDefs.value, changedCodes)
    if (JSON.stringify(synced.slots) !== JSON.stringify(slotsByDate.value)) slotsByDate.value = synced.slots
    syncLocksToSlots()
  }
  markSlotsSynced()
}

watch([year, month], () => {
  // 切換年月：該月已有存檔就載回，沒有才依開班預設產生新的 Slot 矩陣
  const saved = slotsArchive.value[monthKey(year.value, month.value)]
  if (saved) {
    slotsByDate.value = JSON.parse(JSON.stringify(saved))
    syncSlotsToShiftDefs()
  } else {
    slotsByDate.value = generateDefaultSlots(year.value, month.value, holidays.value, shiftDefs.value)
    markSlotsSynced()
  }
  syncLocksToSlots()
})

watch(holidays, (newHolidays, oldHolidays) => {
  // 國定假日有增減時，只同步那幾天的班格（已有人選的班保留），不重置整個月
  const before = new Set(oldHolidays || [])
  const after = new Set(newHolidays || [])
  const prefix = monthKey(year.value, month.value)
  const changedDates = [...new Set([...before, ...after])].filter(d => before.has(d) !== after.has(d) && d.startsWith(prefix))
  if (changedDates.length === 0 || !slotsByDate.value) return
  const allCodes = [...new Set([...Object.keys(shiftDefs.value), ...Object.values(slotsByDate.value).flatMap(daySlots => (daySlots || []).map(s => s.shiftCode))])]
  slotsByDate.value = syncSlotsWithShiftDefs(slotsByDate.value, year.value, month.value, newHolidays, shiftDefs.value, allCodes, changedDates).slots
  syncLocksToSlots()
})

// 班別設定的開班條件一改，目前月份的班格立即同步
watch(shiftDefs, () => {
  syncSlotsToShiftDefs()
}, { deep: true })

syncSlotsToShiftDefs()


watch(fontScale, (newVal) => {
  document.documentElement.style.setProperty('--font-scale', newVal)
})

// 執行一鍵自動排班
function handleGenerate() {
  const result = solveRoster({
    year: year.value,
    month: month.value,
    staffList: staff.value,
    shiftDefs: shiftDefs.value,
    constraints: constraints.value,
    leaves: leaves.value,
    locks: locks.value,
    holidays: holidays.value
  })

  roster.value = result.roster
  warnings.value = result.warnings
  manualEdits.value = {} // 重置手動修改標示
  activeTab.value = 'result' // 自動切換至結果 Tab
}

// 接收自主選班發布結果
function handleApplyBiddingToRoster(newRoster) {
  roster.value = newRoster
  warnings.value = []
  manualEdits.value = {}
  activeTab.value = 'result'
}

// 班別代號改名時，已開班格子、人工指定與班表內的舊代號一併更新，避免對不到班別定義
function handleRenameShiftCode({ oldCode, newCode }) {
  if (!oldCode || !newCode || oldCode === newCode) return

  const updatedSlots = JSON.parse(JSON.stringify(slotsByDate.value || {}))
  Object.values(updatedSlots).forEach(daySlots => {
    (daySlots || []).forEach(slot => {
      if (slot.shiftCode === oldCode) slot.shiftCode = newCode
    })
  })
  slotsByDate.value = updatedSlots

  const updatedArchive = JSON.parse(JSON.stringify(slotsArchive.value || {}))
  Object.values(updatedArchive).forEach(monthSlots => {
    Object.values(monthSlots || {}).forEach(daySlots => {
      (daySlots || []).forEach(slot => {
        if (slot.shiftCode === oldCode) slot.shiftCode = newCode
      })
    })
  })
  slotsArchive.value = updatedArchive

  locks.value = locks.value.map(l => (l.shiftCode === oldCode ? { ...l, shiftCode: newCode } : l))

  const updatedRoster = JSON.parse(JSON.stringify(roster.value || {}))
  Object.values(updatedRoster).forEach(dayRoster => {
    Object.keys(dayRoster || {}).forEach(staffId => {
      if (dayRoster[staffId] === oldCode) dayRoster[staffId] = newCode
    })
  })
  roster.value = updatedRoster
}

// 單元格手動修改編輯
function handleCellEdit({ dateStr, staffId, newText }) {
  if (!roster.value[dateStr]) roster.value[dateStr] = {}
  roster.value[dateStr][staffId] = newText
  manualEdits.value[`${dateStr}_${staffId}`] = true
}

// 列印
function handlePrint() {
  window.print()
}

// 匯出 Excel (無條件直出全科同仁月排班總表)
function handleExportExcel() {
  exportRosterToExcel({
    year: year.value,
    month: month.value,
    staffList: staff.value,
    roster: roster.value,
    slotsByDate: slotsByDate.value,
    leaves: leaves.value,
    shiftDefs: shiftDefs.value
  })
}


// 下載 JSON 備份
function handleBackupJSON() {
  exportBackupJSON({
    year: year.value,
    month: month.value,
    holidays: holidays.value,
    holidayNames: holidayNames.value,
    staff: staff.value,
    shiftDefs: shiftDefs.value,
    constraints: constraints.value,
    deptRules: deptRules.value,
    specialtyTargets: specialtyTargets.value,
    slotSignatures: slotSignatures.value,
    leaves: leaves.value,
    locks: locks.value,
    roster: roster.value,
    slotsByDate: slotsByDate.value,
    slotsArchive: slotsArchive.value,
    manualEdits: manualEdits.value
  })
}

// 讀取 JSON 備份
function handleLoadBackup(event) {
  const file = event.target.files[0]
  if (!file) return
  importBackupJSON(file, (data) => {
    if (data.year) year.value = data.year
    if (data.month) month.value = data.month
    if (data.holidayNames) holidayNames.value = data.holidayNames
    if (data.holidays) holidays.value = data.holidays
    if (data.staff) staff.value = data.staff
    if (data.shiftDefs) shiftDefs.value = normalizeShiftDefs(data.shiftDefs, { legacy: true })
    if (data.constraints) constraints.value = data.constraints
    if (data.deptRules) deptRules.value = normalizeDeptRules(data.deptRules)
    if (data.specialtyTargets) specialtyTargets.value = data.specialtyTargets
    if (data.slotSignatures) {
      slotSignatures.value = data.slotSignatures
      saveState('slotSignatures', data.slotSignatures)
    }
    if (data.leaves) leaves.value = data.leaves
    if (data.locks) locks.value = data.locks
    if (data.roster) roster.value = data.roster
    if (data.slotsArchive) slotsArchive.value = data.slotsArchive
    if (data.slotsByDate) slotsByDate.value = data.slotsByDate
    if (data.manualEdits) manualEdits.value = data.manualEdits
  })
}

onMounted(() => {
  if (!slotsByDate.value) {
    slotsByDate.value = generateDefaultSlots(year.value, month.value, holidays.value, shiftDefs.value)
  }
})
</script>



