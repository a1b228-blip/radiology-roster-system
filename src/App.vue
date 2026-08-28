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
        v-model:complianceRules="complianceRules"
      />

      <TabShiftDefs 
        v-if="activeTab === 'shifts'" 
        v-model:shiftDefs="shiftDefs"
      />



      <TabLeaveEvents 
        v-if="activeTab === 'leave'"
        :staff="staff"
        v-model:leaves="leaves"
      />

      <TabManualLocks 
        v-if="activeTab === 'manual'"
        :staff="staff"
        :slotsByDate="slotsByDate"
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
        :leaves="leaves"
        :warnings="warnings"
        :manualEdits="manualEdits"
        @generate="handleGenerate"
        @cell-edit="handleCellEdit"
        @export-excel="handleExportExcel"
      />


    </main>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
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


import { DEFAULT_STAFF, SHIFT_DEFS, DEFAULT_COMPLIANCE_RULES, DEFAULT_SPECIALTY_TARGETS } from './core/types.js'


import { solveRoster } from './core/solver.js'
import { exportRosterToExcel } from './core/exporter.js'
import { loadState, saveState, exportBackupJSON, importBackupJSON } from './core/storage.js'
import { generateDefaultSlots } from './core/biddingEngine.js'

// 核心響應式狀態 (全可由主管在 UI 直接修改)
const year = ref(loadState('year', 2026))
const month = ref(loadState('month', 9))
const holidays = ref(loadState('holidays', ['2026-09-28']))
const staff = ref(loadState('staff', DEFAULT_STAFF))
const shiftDefs = ref(loadState('shiftDefs', SHIFT_DEFS))
const constraints = ref(loadState('constraints', {
  enableRestGap: true,
  restGapHours: 11,
  enableSeniorPairing: true,
  maxNightShiftsPerMonth: 6
}))
const leaves = ref(loadState('leaves', []))
const locks = ref(loadState('locks', []))
const roster = ref(loadState('roster', {}))
const warnings = ref(loadState('warnings', []))
const manualEdits = ref(loadState('manualEdits', {}))

// 全月需求班別 Slot 矩陣
const slotsByDate = ref(loadState('slotsByDate', null) || generateDefaultSlots(year.value, month.value, holidays.value, shiftDefs.value))

const fontScale = ref(1.0)
const showEditHighlight = ref(true)
const activeTab = ref('bidding') // 預設開啟同仁自主選班 Tab

const specialtyTargets = ref(loadState('specialtyTargets', null) || DEFAULT_SPECIALTY_TARGETS)
const complianceRules = ref(loadState('complianceRules', null) || DEFAULT_COMPLIANCE_RULES)


// 監聽並持久化儲存
watch([year, month, holidays, staff, shiftDefs, constraints, leaves, locks, roster, warnings, manualEdits, slotsByDate, specialtyTargets, complianceRules], () => {
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
  saveState('complianceRules', complianceRules.value)
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


watch(locks, () => {
  syncLocksToSlots()
}, { deep: true, immediate: true })

watch([year, month, holidays], () => {
  // 年月或假日改變時重置需求 Slot 矩陣，並連動人工指定班別
  slotsByDate.value = generateDefaultSlots(year.value, month.value, holidays.value, shiftDefs.value)
  syncLocksToSlots()
})


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

// 匯出 Excel (無條件直出全科 26 位同仁月排班總表)
function handleExportExcel() {
  exportRosterToExcel({
    year: year.value,
    month: month.value,
    staffList: staff.value,
    roster: roster.value,
    slotsByDate: slotsByDate.value
  })
}


// 下載 JSON 備份
function handleBackupJSON() {
  exportBackupJSON({
    year: year.value,
    month: month.value,
    holidays: holidays.value,
    staff: staff.value,
    shiftDefs: shiftDefs.value,
    constraints: constraints.value,
    leaves: leaves.value,
    locks: locks.value,
    roster: roster.value,
    slotsByDate: slotsByDate.value,
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
    if (data.holidays) holidays.value = data.holidays
    if (data.staff) staff.value = data.staff
    if (data.shiftDefs) shiftDefs.value = data.shiftDefs
    if (data.constraints) constraints.value = data.constraints
    if (data.leaves) leaves.value = data.leaves
    if (data.locks) locks.value = data.locks
    if (data.roster) roster.value = data.roster
    if (data.slotsByDate) slotsByDate.value = data.slotsByDate
    if (data.manualEdits) manualEdits.value = data.manualEdits
  })
}

onMounted(() => {
  if (!slotsByDate.value) {
    slotsByDate.value = generateDefaultSlots(year.value, month.value, holidays.value, shiftDefs.value)
  }

  // 自動平滑修復：將同仁名冊中舊有的「組長」層級自動更新為「主管」
  if (Array.isArray(staff.value)) {
    let hasChanged = false
    staff.value.forEach(s => {
      if (s.level === '組長') {
        s.level = '主管'
        hasChanged = true
      }
    })
    if (hasChanged) saveState('staff', staff.value)
  }
})
</script>



