<template>
  <div class="tab-panel">
    <!-- 控制與標頭區 -->
    <div class="card card-glass no-print">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h2 style="font-size: 1.3rem; font-weight: 800; color: #0d5c53; margin-bottom: 0.2rem;">
            📅 民國 {{ year - 1911 }} 年 {{ month }} 月 放射科同仁月排班結果總表
          </h2>
          <p style="font-size: 0.85rem; color: #64748b;">
            本表已 100% 自動即時連動「5. 同仁自主選班」與人工指定班別，班別一律採用<b>班別代碼</b>精準呈現。
          </p>
        </div>

        <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
          <button class="btn btn-primary" style="padding: 0.55rem 1.2rem; font-size: 0.9rem; background: #0d5c53; border-color: #0d5c53; font-weight: 700;" @click="$emit('export-excel')">
            <FileSpreadsheet :size="18" />
            <span>📊 匯出 Excel 排班總表</span>
          </button>
        </div>

      </div>
    </div>

    <!-- 系統合規提示區 (若有) -->
    <div v-if="warnings.length > 0" class="card no-print" style="background: #fffbebf5; border-color: #fde68a;">
      <div style="display: flex; align-items: center; gap: 0.5rem; color: #b45309; font-weight: 700; margin-bottom: 0.4rem;">
        <AlertTriangle :size="18" />
        <span>排班合規與人力預警提示 (共 {{ warnings.length }} 則)</span>
      </div>
      <ul style="padding-left: 1.2rem; font-size: 0.85rem; color: #92400e;">
        <li v-for="(w, idx) in warnings" :key="idx">{{ w }}</li>
      </ul>
    </div>

    <!-- 📋 6. 正式排班結果總表 (符合使用者對欄位、日期與代碼之嚴格規範) -->
    <div class="card card-glass" style="padding: 1rem;">
      <div class="table-container">
        <table class="data-table roster-table">
          <thead>
            <tr>
              <!-- 第一項：員工編號 -->
              <th style="min-width: 90px; text-align: center; background: #0d5c53; color: white;">員工編號</th>
              <!-- 第二項：員工姓名 -->
              <th style="min-width: 100px; text-align: center; background: #0d5c53; color: white;">員工姓名</th>
              <th style="min-width: 70px; text-align: center; background: #0d5c53; color: white;">職類</th>
              
              <!-- 橫排第一排：當月日期 1, 2, 3, 4, 5... -->
              <th 
                v-for="day in daysInMonth" 
                :key="day" 
                style="min-width: 42px; text-align: center; background: #f1f5f9; color: #0f172a;"
                :class="{ 'is-weekend-th': isWeekendDay(day) }"
              >
                <div style="font-size: 1rem; font-weight: 800;">{{ day }}</div>
                <div style="font-size: 0.7rem; font-weight: 600; color: #64748b;">{{ getWeekdayZh(day) }}</div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in filteredStaffList" :key="s.id">
              <!-- 第一項內容：員工編號 -->
              <td style="text-align: center; font-weight: 700; font-family: monospace; color: #475569;">{{ s.id }}</td>
              
              <!-- 第二項內容：員工姓名 -->
              <td style="text-align: center; font-weight: 800; color: #0f172a;">{{ s.name }}</td>
              
              <td style="text-align: center; font-size: 0.8rem; color: #64748b;">{{ s.role }}</td>
              
              <!-- 當月 1 ~ 31 號之排班結果 (一律只顯示班別代碼 Code) -->
              <td 
                v-for="day in daysInMonth" 
                :key="day"
                class="code-cell"
                :class="{ 
                  'is-weekend-td': isWeekendDay(day),
                  'cell-edited': isEdited(getDateStr(day), s.id) 
                }"
              >
                <span 
                  class="shift-code-badge"
                  :style="{ backgroundColor: getShiftBadgeColor(getStaffShiftCode(getDateStr(day), s.id)) }"
                  :title="s.name + ' ' + getDateStr(day) + '：' + getShiftFullName(getStaffShiftCode(getDateStr(day), s.id))"
                >
                  {{ getStaffShiftCode(getDateStr(day), s.id) }}
                </span>
              </td>
            </tr>
            <tr v-if="filteredStaffList.length === 0">
              <td :colspan="daysInMonth + 3" style="text-align: center; color: #94a3b8; padding: 2rem;">尚無符合該職類之同仁資料。</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { FileSpreadsheet, User, LayoutGrid, AlertTriangle } from 'lucide-vue-next'
import { SHIFT_DEFS } from '../core/types.js'

const props = defineProps({
  year: { type: Number, default: 2026 },
  month: { type: Number, default: 9 },
  staff: { type: Array, default: () => [] },
  roster: { type: Object, default: () => ({}) },
  slotsByDate: { type: Object, default: () => ({}) },
  leaves: { type: Array, default: () => [] },
  warnings: { type: Array, default: () => [] },
  manualEdits: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['generate', 'cell-edit', 'export-excel'])


const currentRoleFilter = ref('ALL')

const roleFilters = [
  { key: 'ALL', label: '全部同仁 (26)' },
  { key: '放射師', label: '🩻 放射師 (19)' },
  { key: '護理人員', label: '🩺 護理人員 (2)' },
  { key: '書記', label: '📝 書記 (5)' }
]

const filteredStaffList = computed(() => props.staff)


const daysInMonth = computed(() => new Date(props.year, props.month, 0).getDate())

function getDateStr(day) {
  const m = String(props.month).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${props.year}-${m}-${d}`
}

function getWeekdayZh(day) {
  const d = new Date(props.year, props.month - 1, day)
  return ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
}

function isWeekendDay(day) {
  const d = new Date(props.year, props.month - 1, day).getDay()
  return d === 0 || d === 6
}

// 核心連動：僅連動【5. 同仁自主選班】(含同仁預排之特休 V 與公假 公)，20h 上課紀錄獨立不混入
function getStaffShiftCode(dateStr, staffId) {
  // 1. 優先檢索自主選班 Slots 中該同仁被選入的班別 (含同仁預排之特休 V 與公假 公)
  if (props.slotsByDate && props.slotsByDate[dateStr]) {
    const daySlots = props.slotsByDate[dateStr]
    const foundSlot = daySlots.find(s => s.assignedStaffIds && s.assignedStaffIds.includes(staffId))
    if (foundSlot) {
      return foundSlot.shiftCode
    }
  }

  // 2. 若自主選班尚未選取，讀取一鍵排班算法產出之 roster
  if (props.roster && props.roster[dateStr] && props.roster[dateStr][staffId]) {
    return props.roster[dateStr][staffId]
  }

  return 'OFF'
}



function getShiftBadgeColor(code) {
  if (!code || code === 'OFF') return '#94a3b8'
  return SHIFT_DEFS[code]?.color || '#0284c7'
}

function getShiftFullName(code) {
  if (!code || code === 'OFF') return '休假 / OFF'
  const info = SHIFT_DEFS[code]
  return info ? `${code} (${info.name})` : code
}

function isEdited(dateStr, staffId) {
  return !!props.manualEdits[`${dateStr}_${staffId}`]
}
</script>

<style scoped>
.roster-table {
  border-collapse: collapse;
  width: 100%;
}

.roster-table th, .roster-table td {
  border: 1px solid #cbd5e1;
  padding: 6px 4px;
}

.is-weekend-th {
  background: #f1f5f9;
  color: #e11d48 !important;
}

.is-weekend-td {
  background: #f8fafc;
}

.code-cell {
  text-align: center;
  vertical-align: middle;
}

.shift-code-badge {
  display: inline-block;
  color: white;
  font-size: 11px;
  font-weight: 800;
  padding: 3px 6px;
  border-radius: 4px;
  min-width: 28px;
  text-align: center;
  box-shadow: 0 1px 2px rgba(0,0,0,0.15);
}

.cell-edited {
  background-color: #fef08a !important;
}
</style>
