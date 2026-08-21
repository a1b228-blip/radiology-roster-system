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
      <!-- 6 大 Tab 頁籤導覽 -->
      <nav class="tabs-nav no-print">
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'setup' }"
          @click="activeTab = 'setup'"
        >
          <Calendar :size="16" />
          <span>1. 月份與人員主檔</span>
        </button>

        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'shifts' }"
          @click="activeTab = 'shifts'"
        >
          <Clock :size="16" />
          <span>2. 班別與時間段設定</span>
        </button>

        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'leave' }"
          @click="activeTab = 'leave'"
        >
          <UserMinus :size="16" />
          <span>3. 請假／受訓紀錄</span>
        </button>

        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'constraints' }"
          @click="activeTab = 'constraints'"
        >
          <ShieldCheck :size="16" />
          <span>4. 機台與合規檢核</span>
        </button>

        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'manual' }"
          @click="activeTab = 'manual'"
        >
          <Lock :size="16" />
          <span>5. 人工指定班別</span>
        </button>

        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'result' }"
          @click="activeTab = 'result'"
        >
          <Zap :size="16" />
          <span>6. 一鍵自動排班結果</span>
        </button>
      </nav>

      <!-- 頁籤內容面板 -->
      <TabSetup 
        v-if="activeTab === 'setup'"
        v-model:year="year"
        v-model:month="month"
        v-model:holidays="holidays"
        v-model:staff="staff"
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

      <TabConstraints 
        v-if="activeTab === 'constraints'"
        v-model:constraints="constraints"
      />

      <TabManualLocks 
        v-if="activeTab === 'manual'"
        :staff="staff"
        v-model:locks="locks"
      />

      <TabScheduleResult 
        v-if="activeTab === 'result'"
        :year="year"
        :month="month"
        :staff="staff"
        :roster="roster"
        :warnings="warnings"
        :manualEdits="manualEdits"
        @generate="handleGenerate"
        @cell-edit="handleCellEdit"
      />
    </main>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { Calendar, Clock, UserMinus, ShieldCheck, Lock, Zap } from 'lucide-vue-next'

import HeaderNav from './components/HeaderNav.vue'
import TabSetup from './components/TabSetup.vue'
import TabShiftDefs from './components/TabShiftDefs.vue'
import TabLeaveEvents from './components/TabLeaveEvents.vue'
import TabConstraints from './components/TabConstraints.vue'
import TabManualLocks from './components/TabManualLocks.vue'
import TabScheduleResult from './components/TabScheduleResult.vue'

import { DEFAULT_STAFF, SHIFT_DEFS } from './core/types.js'
import { solveRoster } from './core/solver.js'
import { exportRosterToExcel } from './core/exporter.js'
import { loadState, saveState, exportBackupJSON, importBackupJSON } from './core/storage.js'

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

const fontScale = ref(1.0)
const showEditHighlight = ref(true)
const activeTab = ref('setup')

// 監聽並持久化儲存
watch([year, month, holidays, staff, shiftDefs, constraints, leaves, locks, roster, warnings, manualEdits], () => {
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
}, { deep: true })

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

// 匯出 Excel
function handleExportExcel() {
  if (Object.keys(roster.value).length === 0) {
    alert('請先點擊「一鍵自動產生排班表」產生班表後再匯出。')
    return
  }
  exportRosterToExcel({
    year: year.value,
    month: month.value,
    staffList: staff.value,
    roster: roster.value
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
    if (data.manualEdits) manualEdits.value = data.manualEdits
    alert('備份資料載入完成！主管設定已更新。')
  })
}

onMounted(() => {
  if (Object.keys(roster.value).length === 0) {
    handleGenerate()
  }
})
</script>
