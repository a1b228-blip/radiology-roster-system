<template>
  <div class="tab-panel">
    <!-- 控制面板 -->
    <div class="card no-print">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h2 style="font-size: 1.25rem; font-weight: 700; color: #0d5c53; margin-bottom: 0.2rem;">
            {{ year }} 年 {{ month }} 月 放射診斷科排班結果
          </h2>
          <p style="font-size: 0.85rem; color: #64748b;">
            點擊「一鍵自動產生排班表」執行自動演算；產生後表格每個單元格皆可直接點擊修改。
          </p>
        </div>

        <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
          <!-- 雙視角切換 -->
          <div style="display: flex; background: #e2e8f0; padding: 0.2rem; border-radius: 8px;">
            <button 
              class="btn" 
              :class="currentView === 'staff' ? 'btn-primary' : 'btn-secondary'"
              style="padding: 0.35rem 0.75rem; font-size: 0.85rem;"
              @click="currentView = 'staff'"
            >
              <User :size="15" />
              <span>放射師個人視角</span>
            </button>
            <button 
              class="btn" 
              :class="currentView === 'room' ? 'btn-primary' : 'btn-secondary'"
              style="padding: 0.35rem 0.75rem; font-size: 0.85rem;"
              @click="currentView = 'room'"
            >
              <LayoutGrid :size="15" />
              <span>機台檢查室視角</span>
            </button>
          </div>

          <button class="btn btn-primary" style="padding: 0.55rem 1.2rem; font-size: 0.95rem;" @click="$emit('generate')">
            <Zap :size="18" />
            <span>一鍵自動產生排班表</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 系統警告/提示區 -->
    <div v-if="warnings.length > 0" class="card no-print" style="background: #fffbebf5; border-color: #fde68a;">
      <div style="display: flex; align-items: center; gap: 0.5rem; color: #b45309; font-weight: 700; margin-bottom: 0.4rem;">
        <AlertTriangle :size="18" />
        <span>排班邏輯與合規預警提示 (共 {{ warnings.length }} 則)</span>
      </div>
      <ul style="padding-left: 1.2rem; font-size: 0.85rem; color: #92400e;">
        <li v-for="(w, idx) in warnings" :key="idx">{{ w }}</li>
      </ul>
    </div>

    <!-- KPI 統計數據卡片 -->
    <div class="card no-print" v-if="Object.keys(roster).length > 0">
      <div class="card-title">
        <BarChart3 :size="18" />
        <span>科內當月工作指標與公平性統計 (KPI Summary)</span>
      </div>
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">排班天數</div>
          <div class="kpi-value">{{ daysInMonth }} 天</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">放射師總人數</div>
          <div class="kpi-value">{{ staff.length }} 人</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">急診夜班總人次</div>
          <div class="kpi-value" style="color: #dc2626;">{{ totalNightShifts }} 次</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">CT/MRI 高階攝影人次</div>
          <div class="kpi-value" style="color: #0284c7;">{{ totalHighTechShifts }} 次</div>
        </div>
      </div>
    </div>

    <!-- 班表主表格區 -->
    <div class="card" v-if="Object.keys(roster).length > 0">
      <!-- 視角一：放射師個人視角 -->
      <div v-if="currentView === 'staff'" class="table-container">
        <table class="data-table roster-table">
          <thead>
            <tr>
              <th style="min-width: 110px;">放射師</th>
              <th v-for="day in daysInMonth" :key="day" style="min-width: 45px;">
                <div>{{ day }}</div>
                <div style="font-size: 0.75rem; font-weight: 400; color: #64748b;">{{ getWeekdayZh(day) }}</div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in staff" :key="s.id">
              <td>
                <div>{{ s.name }}</div>
                <div style="font-size: 0.7rem; color: #64748b; font-weight: 400;">{{ s.id }} ({{ s.level }})</div>
              </td>
              <td 
                v-for="day in daysInMonth" 
                :key="day"
                class="cell-editable"
                :class="{ 'cell-edited': isEdited(getDateStr(day), s.id) }"
                contenteditable="true"
                @blur="onCellBlur($event, getDateStr(day), s.id)"
              >
                {{ getShiftDisplayName(roster[getDateStr(day)]?.[s.id]) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 視角二：機台檢查室視角 -->
      <div v-else class="table-container">
        <table class="data-table roster-table">
          <thead>
            <tr>
              <th style="min-width: 130px;">機台檢查室</th>
              <th v-for="day in daysInMonth" :key="day" style="min-width: 60px;">
                <div>{{ day }}日</div>
                <div style="font-size: 0.75rem; font-weight: 400; color: #64748b;">{{ getWeekdayZh(day) }}</div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="room in ROOM_DEFS" :key="room.id">
              <td style="font-weight: 700;">{{ room.name }}</td>
              <td v-for="day in daysInMonth" :key="day" style="font-size: 0.8rem; white-space: pre-line;">
                {{ getRoomAssignedStaff(getDateStr(day), room.primaryShift) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Zap, User, LayoutGrid, AlertTriangle, BarChart3 } from 'lucide-vue-next'
import { SHIFT_DEFS, ROOM_DEFS } from '../core/types.js'

const props = defineProps({
  year: { type: Number, default: 2026 },
  month: { type: Number, default: 9 },
  staff: { type: Array, default: () => [] },
  roster: { type: Object, default: () => ({}) },
  warnings: { type: Array, default: () => [] },
  manualEdits: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['generate', 'cell-edit'])

const currentView = ref('staff') // 'staff' | 'room'

const daysInMonth = computed(() => new Date(props.year, props.month, 0).getDate())

const totalNightShifts = computed(() => {
  let count = 0
  Object.values(props.roster).forEach(dayObj => {
    Object.values(dayObj).forEach(code => {
      if (code === 'E_NIGHT' || code === 'G_NIGHT') count++
    })
  })
  return count
})

const totalHighTechShifts = computed(() => {
  let count = 0
  Object.values(props.roster).forEach(dayObj => {
    Object.values(dayObj).forEach(code => {
      if (code === 'D_CT' || code === 'D_MRI') count++
    })
  })
  return count
})

function getDateStr(day) {
  const m = String(props.month).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${props.year}-${m}-${d}`
}

function getWeekdayZh(day) {
  const d = new Date(props.year, props.month - 1, day)
  return ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
}

function getShiftDisplayName(code) {
  if (!code) return 'OFF'
  const info = SHIFT_DEFS[code]
  return info ? info.name : code
}

function isEdited(dateStr, staffId) {
  return !!props.manualEdits[`${dateStr}_${staffId}`]
}

function onCellBlur(event, dateStr, staffId) {
  const newText = event.target.innerText.trim()
  emit('cell-edit', { dateStr, staffId, newText })
}

function getRoomAssignedStaff(dateStr, primaryShift) {
  const dayRoster = props.roster[dateStr] || {}
  const assigned = Object.entries(dayRoster)
    .filter(([_, code]) => code === primaryShift)
    .map(([id, _]) => {
      const s = props.staff.find(x => x.id === id)
      return s ? s.name : id
    })
  return assigned.length > 0 ? assigned.join('\n') : '-'
}
</script>
