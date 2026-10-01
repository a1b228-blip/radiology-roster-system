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

    <!-- 全月合規總檢查：用目前的人員資料、班別設定與排班規則，重新檢查當月每一筆已排的班 -->
    <div class="card no-print audit-card" :class="auditIssues.length ? 'has-issues' : 'is-clean'">
      <div class="audit-title">
        <AlertTriangle v-if="auditIssues.length" :size="18" />
        <span v-if="auditIssues.length">全月合規總檢查：發現 {{ auditIssues.length }} 項不符合（表格中以紅框標示）</span>
        <span v-else>✅ 全月合規總檢查：{{ year }} 年 {{ month }} 月已排的班全部符合目前的規則</span>
      </div>
      <p class="audit-hint">規則、班別時間或人員資料修改後會自動重新檢查。這裡只列出問題，不會自動退班，請主管到「同仁自主選班」調整。</p>
      <ul v-if="auditIssues.length" class="audit-list">
        <li v-for="(issue, idx) in auditIssues" :key="idx">
          <span class="audit-tag" :class="'tag-' + issue.category">{{ issue.category }}</span>
          {{ issue.message }}
        </li>
      </ul>
    </div>

    <!-- 職類篩選 -->
    <div class="no-print" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 0.6rem;">
      <button
        v-for="r in roleFilters"
        :key="r.key"
        class="role-filter-btn"
        :class="{ active: currentRoleFilter === r.key }"
        @click="currentRoleFilter = r.key"
      >
        {{ r.label }}
      </button>
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
              <th v-for="h in ['出勤天數', '工時', '小夜', '大夜', '六日出勤', '特休天數']" :key="h" class="stat-th">{{ h }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in filteredStaffList" :key="s.id">
              <!-- 第一項內容：員工編號 -->
              <td style="text-align: center; font-weight: 700; font-family: monospace; color: #475569;">{{ s.id }}</td>
              
              <!-- 第二項內容：員工姓名 -->
              <td style="text-align: center; font-weight: 800; color: #0f172a;">
                {{ s.name }}
                <div v-if="s.status && s.status !== '在職'" style="font-size: 0.7rem; color: #dc2626; font-weight: 700;">{{ s.status }}</div>
              </td>
              
              <td style="text-align: center; font-size: 0.8rem; color: #64748b;">{{ s.role }}</td>
              
              <!-- 當月 1 ~ 31 號之排班結果 (一律只顯示班別代碼 Code) -->
              <td 
                v-for="day in daysInMonth" 
                :key="day"
                class="code-cell"
                :class="{ 
                  'is-weekend-td': isWeekendDay(day),
                  'cell-edited': isEdited(getDateStr(day), s.id),
                  'cell-issue': issueCellKeys.has(getDateStr(day) + '|' + s.id)
                }"
                :title="issueCellKeys.has(getDateStr(day) + '|' + s.id) ? '這一天的班不符合目前的規則，詳見上方全月合規總檢查' : ''"
              >
                <span 
                  class="shift-code-badge"
                  :style="{ backgroundColor: getShiftBadgeColor(getStaffShiftCode(getDateStr(day), s.id)) }"
                  :title="s.name + ' ' + getDateStr(day) + '：' + getShiftFullName(getStaffShiftCode(getDateStr(day), s.id))"
                >
                  {{ getStaffShiftCode(getDateStr(day), s.id) }}
                </span>
              </td>
              <td v-for="(v, i) in statValues(s.id)" :key="'st' + i" class="stat-td">{{ v }}</td>
            </tr>
            <tr v-if="filteredStaffList.length === 0">
 <td :colspan="daysInMonth + 9" style="text-align: center; color: #94a3b8; padding: 2rem;">尚無符合該職類之同仁資料。</td>
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
import { getStaffDayCode, getStaffMonthStats, getRosterStaff, groupStaffByRole, getDisplayShiftDef } from '../core/rosterView.js'

const props = defineProps({
  year: { type: Number, default: 2026 },
  month: { type: Number, default: 9 },
  staff: { type: Array, default: () => [] },
  roster: { type: Object, default: () => ({}) },
  slotsByDate: { type: Object, default: () => ({}) },
  shiftDefs: { type: Object, default: () => ({}) },
  leaves: { type: Array, default: () => [] },
  auditIssues: { type: Array, default: () => [] },
  manualEdits: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['generate', 'cell-edit', 'export-excel'])


const currentRoleFilter = ref('ALL')

// 要列出的人員：在職全部列出；停用／留停只有當月仍有排班才列出
const rosterStaff = computed(() => getRosterStaff({ staffList: props.staff, year: props.year, month: props.month, slotsByDate: props.slotsByDate, roster: props.roster, leaves: props.leaves }))

// 職類篩選按鈕（人數依實際名冊計算）
const roleFilters = computed(() => [
  { key: 'ALL', label: `全部同仁 (${rosterStaff.value.length})` },
  ...groupStaffByRole(rosterStaff.value).map(g => ({ key: g.role, label: `${g.role} (${g.staff.length})` }))
])

const filteredStaffList = computed(() => {
  if (currentRoleFilter.value === 'ALL') return rosterStaff.value
  return rosterStaff.value.filter(s => s.role === currentRoleFilter.value)
})

// 有合規問題的格子（日期|員工編號）
const issueCellKeys = computed(() => new Set(props.auditIssues.filter(i => i.staffId).map(i => `${i.dateStr}|${i.staffId}`)))

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

// 班表顯示的代號：與 Excel 匯出共用同一套邏輯（已選班 ➜ 年假上課 ➜ 舊版排班結果 ➜ OFF）
function getStaffShiftCode(dateStr, staffId) {
  return getStaffDayCode({ dateStr, staffId, slotsByDate: props.slotsByDate, roster: props.roster, leaves: props.leaves })
}

function getStats(staffId) {
  return getStaffMonthStats({ staffId, year: props.year, month: props.month, slotsByDate: props.slotsByDate, roster: props.roster, leaves: props.leaves, shiftDefs: props.shiftDefs })
}

// 班別定義：主管自訂設定優先，內建定義補齊
function getShiftDef(code) {
  return getDisplayShiftDef(code, props.shiftDefs) || SHIFT_DEFS[code]
}

function statValues(staffId) {
  const st = getStats(staffId)
  return [st.workDays, st.hours, st.evening, st.night, st.weekend, st.annualLeave]
}

function getShiftBadgeColor(code) {
  if (!code || code === 'OFF') return '#94a3b8'
  return getShiftDef(code)?.color || '#0284c7'
}

function getShiftFullName(code) {
  if (!code || code === 'OFF') return '休假 / OFF'
  const info = getShiftDef(code)
  return info ? `${code} (${info.name})` : code
}

function isEdited(dateStr, staffId) {
  return !!props.manualEdits[`${dateStr}_${staffId}`]
}
</script>

<style scoped>
.role-filter-btn { border: 1px solid #cbd5e1; background: white; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; color: #475569; cursor: pointer; }
.role-filter-btn:hover { background: #f1f5f9; }
.role-filter-btn.active { background: #0d5c53; color: white; border-color: #0d5c53; }
.stat-th { min-width: 52px; text-align: center; background: #0d5c53; color: white; font-size: 0.75rem; }
.stat-td { text-align: center; font-weight: 700; color: #0d5c53; background: #f8fafc; }

.audit-card.has-issues { background: #fef2f2; border-color: #fca5a5; }
.audit-card.is-clean { background: #f0fdf4; border-color: #86efac; }
.audit-title { display: flex; align-items: center; gap: 0.5rem; font-weight: 700; }
.audit-card.has-issues .audit-title { color: #991b1b; }
.audit-card.is-clean .audit-title { color: #166534; }
.audit-hint { font-size: 0.8rem; color: #64748b; margin: 0.3rem 0 0 0; }
.audit-list { padding-left: 1.2rem; margin: 0.6rem 0 0 0; font-size: 0.85rem; color: #7f1d1d; line-height: 1.7; max-height: 260px; overflow-y: auto; }
.audit-tag { display: inline-block; padding: 0 6px; margin-right: 6px; border-radius: 4px; font-size: 0.72rem; font-weight: 700; background: #e2e8f0; color: #334155; }
.audit-tag.tag-勞基法 { background: #dc2626; color: white; }
.audit-tag.tag-科內規定 { background: #d97706; color: white; }
.cell-issue { outline: 2px solid #dc2626; outline-offset: -2px; }

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
