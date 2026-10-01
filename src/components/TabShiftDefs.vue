<template>
  <div class="tab-panel">
    <div class="card card-glass">
      <div class="card-title" style="justify-content: space-between; flex-wrap: wrap; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <Clock :size="20" />
          <span style="font-weight: 700; font-size: 1.1rem; color: #0d5c53;">班別與時間段設定</span>
        </div>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button class="btn btn-outline" style="font-size: 0.8rem;" @click="resetToExcelShiftDefs">
            <RotateCcw :size="14" />
            <span>重置為 Excel 班別規格</span>
          </button>
          <button class="btn btn-secondary" style="font-size: 0.8rem;" @click="addShift">
            <Plus :size="14" />
            <span>新增自訂班別</span>
          </button>
          <!-- 💾 儲存設定按鈕 -->
          <button class="btn btn-primary" style="font-size: 0.85rem; font-weight: 700; background: #0d5c53; border-color: #0d5c53;" @click="saveSettings">
            <Save :size="15" />
            <span>儲存設定</span>
          </button>
        </div>
      </div>

      <!-- 職類分流頁籤 (Role Sub-tabs) -->
      <div class="role-filter-bar" style="display: flex; gap: 8px; margin: 14px 0 4px 0;">
        <button 
          v-for="r in roleFilters" 
          :key="r.key"
          class="role-filter-btn"
          :class="{ active: currentRoleFilter === r.key }"
          @click="currentRoleFilter = r.key"
        >
          {{ r.label }} ({{ getRoleShiftCount(r.key) }})
        </button>
      </div>

      <div class="table-container" style="margin-top: 0.8rem;">
        <table class="data-table">
          <thead>
            <tr>
              <th>班別代號</th>
              <th>班別名稱</th>
              <th>適用職類</th>
              <th title="小夜班、大夜班會套用科內夜班規則（每月輪數、每輪連續天數、大夜後休假），並檢查同仁的夜班資格。">夜班類別</th>
              <th>上班時間</th>
              <th>下班時間</th>
              <th title="班內休息時間，不計入工時，也不影響班與班之間的休息間隔檢查。">班內休息<br /><span style="font-weight: 500; font-size: 0.7rem;">(分鐘，不計工時)</span></th>
              <th>實際工時</th>
              <th title="科內規定：休息間隔從這個時間起算。留空＝以實際下班時間起算。">休息起算時間<br /><span style="font-weight: 500; font-size: 0.7rem;">(科內規定，留空＝下班時間)</span></th>
              <th>開班預設適用星期</th>
              <th title="自動開班時，這個班每天開放幾個人選。改了之後目前月份的班格會立即同步。">每班名額</th>
              <th title="勾選後，國定假日照常開這個班；沒勾的班別遇到國定假日不開。">國定假日開班</th>
              <th>對應檢查室 / 區域</th>

              <th>專業資格要求</th>
              <th>標籤顏色</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="info in filteredShiftsList" :key="info.originalCode">
              <td>
                <input v-model="info.codeKey" @change="updateCode(info.originalCode, info.codeKey)" style="width: 80px; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: 700;" />
              </td>
              <td>
                <input v-model="info.name" @change="emitChange" style="width: 130px; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: 600;" />
              </td>
              <td>
                <select v-model="info.targetRole" @change="emitChange" style="padding: 0.2rem; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: 600;">
                  <option :value="null">通用 (無職類限制)</option>
                  <option value="放射師">🩻 放射師</option>
                  <option value="護理人員">🩺 護理人員</option>
                  <option value="書記">📝 書記</option>
                </select>
              </td>
              <td>
                <select v-model="info.nightType" @change="emitChange" style="padding: 0.2rem; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: 600;">
                  <option value="">非夜班</option>
                  <option value="evening">🌆 小夜班</option>
                  <option value="night">🌙 大夜班</option>
                </select>
              </td>
              <td>
                <input type="time" v-model="info.start" @change="emitChange" class="time-input" />
              </td>
              <td style="white-space: nowrap;">
                <input type="time" v-model="info.end" @change="emitChange" class="time-input" />
                <span v-if="getInterval(info)?.crossesMidnight" class="next-day-tag">隔日</span>
              </td>
              <td>
                <input type="number" v-model.number="info.breakMinutes" @change="emitChange" min="0" max="240" step="5" class="break-input" :disabled="!getInterval(info)" />
              </td>
              <td style="white-space: nowrap;">
                <span v-if="getInterval(info)" style="font-weight: 700; color: #0d5c53;">{{ formatHours(info) }} h</span>
                <span v-else-if="info.start || info.end" class="time-warning">⚠️ 時間未填完整</span>
                <span v-else-if="info.targetRole" class="time-warning">⚠️ 未設定時間</span>
                <span v-else style="color: #94a3b8;">不計時</span>
              </td>
              <td>
                <input type="time" v-model="info.restEnd" @change="emitChange" class="time-input" :disabled="!getInterval(info)" />
              </td>
              <td>
                <select v-model="info.applicableDays" @change="emitChange" style="padding: 0.2rem 0.4rem; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: 600; background: #f8fafc; color: #0284c7;">
                  <option v-for="opt in APPLICABLE_DAYS_OPTIONS" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
              </td>

              <td>
                <input type="number" v-model.number="info.capacity" @change="emitChange" min="1" max="30" class="break-input" />
              </td>
              <td>
                <input type="checkbox" v-model="info.openOnHoliday" @change="emitChange" />
              </td>

              <td>
                <input v-model="info.room" @change="emitChange" style="width: 120px; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px;" />
              </td>
              <td>
                <select v-model="info.modKey" @change="emitChange" style="padding: 0.2rem; border: 1px solid #cbd5e1; border-radius: 4px;">
                  <option :value="null">無特殊限制</option>
                  <option value="xray">一般 X 光</option>
                  <option value="ct">CT 資格</option>
                  <option value="cct">心臟 CT</option>
                  <option value="mri">MRI 資格</option>
                  <option value="angio">特殊攝影</option>
                  <option value="mammo">乳房攝影</option>
                  <option value="bmd">牙科骨密</option>
                  <option value="us">超音波</option>
                </select>
              </td>
              <td>
                <input type="color" v-model="info.color" @change="emitChange" style="width: 40px; height: 30px; border: none; cursor: pointer;" />
              </td>
              <td>
                <button class="btn btn-danger" style="padding: 0.2rem 0.4rem; font-size: 0.75rem;" @click="removeShift(info.originalCode)">刪除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 國定假日設定：連動自動開班與選班日曆 -->
    <div class="card card-glass" style="margin-top: 1rem;">
      <div class="card-title" style="flex-wrap: wrap; gap: 10px;">
        <CalendarDays :size="20" />
        <span style="font-weight: 700; font-size: 1.1rem; color: #0d5c53;">國定假日設定</span>
        <span style="font-size: 0.8rem; color: #64748b; font-weight: 500;">國定假日只開有勾選「國定假日開班」的班別；新增或刪除後，該日的班格立即同步（已有人選的班保留）</span>
      </div>

      <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; margin: 0.8rem 0;">
        <input type="date" v-model="newHoliday.date" style="padding: 0.3rem 0.5rem; border: 1px solid #cbd5e1; border-radius: 4px;" />
        <input type="text" v-model="newHoliday.name" placeholder="假日名稱，例如：國慶日" style="padding: 0.3rem 0.5rem; border: 1px solid #cbd5e1; border-radius: 4px; width: 200px;" />
        <button class="btn btn-secondary" style="font-size: 0.8rem;" @click="addHoliday">
          <Plus :size="14" />
          <span>新增國定假日</span>
        </button>
      </div>

      <div class="holiday-list">
        <span v-for="date in sortedHolidays" :key="date" class="holiday-chip">
          <strong>{{ date }}</strong>（{{ getWeekdayZh(date) }}）{{ holidayNames[date] || '' }}
          <button class="holiday-remove" title="刪除" @click="removeHoliday(date)">✕</button>
        </span>
        <span v-if="sortedHolidays.length === 0" style="color: #94a3b8; font-size: 0.85rem;">尚未設定國定假日。</span>
      </div>
    </div>

    <!-- 接班檢核預覽：直接用上方設定的時間即時計算，與同仁選班時的判定完全相同 -->
    <div class="card card-glass" style="margin-top: 1rem;">
      <div class="card-title" style="flex-wrap: wrap; gap: 10px;">
        <ShieldCheck :size="20" />
        <span style="font-weight: 700; font-size: 1.1rem; color: #0d5c53;">接班檢核預覽</span>
        <span style="font-size: 0.8rem; color: #64748b; font-weight: 500;">依上方時間即時計算，同仁選班時的 {{ MIN_REST_HOURS }} 小時休息檢查用的就是這份結果</span>
      </div>

      <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; margin: 0.8rem 0;">
        <label style="font-size: 0.85rem; font-weight: 600;">前一日上：</label>
        <select v-model="previewCode" style="padding: 0.3rem 0.5rem; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: 600;">
          <option v-for="info in timedShiftsList" :key="info.originalCode" :value="info.originalCode">
            {{ info.originalCode }} ({{ info.name }}) {{ info.start }} - {{ info.end }}
          </option>
        </select>
        <span v-if="previewInfo" style="font-size: 0.85rem; color: #475569;">
          休息自 <strong>{{ previewRestStart }}</strong> 起算
          <span v-if="previewUsesDeptRule" class="dept-tag">科內規定</span>
        </span>
      </div>

      <div v-if="previewInfo" class="preview-grid">
        <div
          v-for="row in previewRows"
          :key="row.code"
          class="preview-chip"
          :class="row.ok ? 'ok' : 'blocked'"
          :title="row.title"
        >
          <div class="preview-chip-head">
            <span>{{ row.ok ? '✅' : '⛔' }} {{ row.code }}</span>
            <span>{{ row.gapText }}</span>
          </div>
          <div class="preview-chip-sub">{{ row.name }}｜{{ row.start }} 上班<span v-if="row.byDeptRule">｜科內規定</span></div>
        </div>
      </div>
      <p style="font-size: 0.8rem; color: #64748b; margin-top: 0.6rem;">
        ✅ 隔天可接　⛔ 隔天不可接（休息未滿 {{ MIN_REST_HOURS }} 小時，或違反科內規定）。特休等沒有出勤時間的假別不受休息間隔限制，故不列出。連續上班天數與夜班輪數要看整個月的班表，不在這個預覽範圍內。
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Clock, Plus, RotateCcw, Save, ShieldCheck, CalendarDays } from 'lucide-vue-next'
import { SHIFT_DEFS, APPLICABLE_DAYS_OPTIONS } from '../core/types.js'
import { getShiftInterval, getShiftHours, getBreakMinutes, formatClock, formatTimeRange, MIN_REST_HOURS } from '../core/shiftTime.js'
import { checkNextDayShift } from '../core/deptRules.js'

import { saveState } from '../core/storage.js'

const props = defineProps({
  shiftDefs: { type: Object, default: () => ({}) },
  deptRules: { type: Object, default: () => ({}) },
  holidays: { type: Array, default: () => [] },
  holidayNames: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['update:shiftDefs', 'rename-code', 'update:holidays', 'update:holidayNames'])

// ===== 國定假日設定 =====
const newHoliday = ref({ date: '', name: '' })

const sortedHolidays = computed(() => [...props.holidays].sort())

function getWeekdayZh(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return '週' + ['日', '一', '二', '三', '四', '五', '六'][new Date(y, m - 1, d).getDay()]
}

function addHoliday() {
  const { date, name } = newHoliday.value
  if (!date) {
    alert('請選擇國定假日的日期')
    return
  }
  if (props.holidays.includes(date)) {
    alert(`${date} 已經在國定假日清單中。`)
    return
  }
  emit('update:holidayNames', { ...props.holidayNames, [date]: name.trim() })
  emit('update:holidays', [...props.holidays, date].sort())
  newHoliday.value = { date: '', name: '' }
}

function removeHoliday(date) {
  if (!confirm(`確定將 ${date} 從國定假日清單移除嗎？該日會恢復依開班星期開班。`)) return
  const names = { ...props.holidayNames }
  delete names[date]
  emit('update:holidayNames', names)
  emit('update:holidays', props.holidays.filter(d => d !== date))
}

const shifts = ref({})
const currentRoleFilter = ref('ALL')

const roleFilters = [
  { key: 'ALL', label: '全部班別' },
  { key: '放射師', label: '🩻 放射師班別' },
  { key: '護理人員', label: '🩺 護理班別' },
  { key: '書記', label: '📝 書記班別' },
  { key: 'COMMON', label: '🏖️ 通用與假別' }
]

watch(() => props.shiftDefs, (newVal) => {
  const result = {}
  Object.entries(newVal || {}).forEach(([k, v]) => {
    result[k] = { ...v, codeKey: k, originalCode: k }
  })
  shifts.value = result
}, { immediate: true, deep: true })

const rolePriority = { '放射師': 1, '護理人員': 2, '書記': 3 }

const filteredAllSorted = computed(() => {
  const list = Object.values(shifts.value)

  list.sort((a, b) => {
    const pA = rolePriority[a.targetRole] || 4
    const pB = rolePriority[b.targetRole] || 4
    return pA - pB
  })
  return list
})

const filteredShiftsList = computed(() => {
  const list = filteredAllSorted.value

  if (currentRoleFilter.value === 'ALL') return list
  if (currentRoleFilter.value === 'COMMON') return list.filter(info => !info.targetRole)
  return list.filter(info => info.targetRole === currentRoleFilter.value)
})

function getRoleShiftCount(roleKey) {
  if (roleKey === 'ALL') return Object.keys(shifts.value).length
  if (roleKey === 'COMMON') return Object.values(shifts.value).filter(s => !s.targetRole).length
  return Object.values(shifts.value).filter(s => s.targetRole === roleKey).length
}

function getInterval(info) {
  return getShiftInterval(info)
}

function formatHours(info) {
  return Math.round(getShiftHours(info) * 10) / 10
}

// ===== 接班檢核預覽 =====
const previewCode = ref('D')

const timedShiftsList = computed(() => filteredAllSorted.value.filter(info => getShiftInterval(info)))

const previewInfo = computed(() => {
  const list = timedShiftsList.value
  return list.find(info => info.originalCode === previewCode.value) || list[0] || null
})

const previewRestStart = computed(() => {
  const iv = getShiftInterval(previewInfo.value)
  return iv ? formatClock(iv.restEndHour) : ''
})

const previewUsesDeptRule = computed(() => {
  const iv = getShiftInterval(previewInfo.value)
  return !!iv && iv.restEndHour > iv.endHour
})

const previewRows = computed(() => {
  const prev = previewInfo.value
  if (!prev) return []
  return timedShiftsList.value.map(next => {
    const problem = checkNextDayShift(prev, next, props.deptRules)
    const prevIv = getShiftInterval(prev)
    const nextIv = getShiftInterval(next)
    const actualGap = Math.round((24 + nextIv.startHour - prevIv.endHour) * 10) / 10
    const gapText = problem ? problem.label : `間隔 ${actualGap} h`
    return {
      code: next.originalCode,
      name: next.name,
      start: next.start,
      ok: !problem,
      byDeptRule: !!problem?.byDeptRule,
      gapText,
      title: `前一日 ${prev.originalCode} ➜ 隔日 ${next.originalCode}：${problem ? problem.detail : gapText}`
    }
  })
})

function updateCode(oldCode, newCode) {
  const item = shifts.value[oldCode]
  const trimmed = String(newCode || '').trim()
  if (!trimmed || oldCode === trimmed) {
    item.codeKey = oldCode
    return
  }
  if (shifts.value[trimmed]) {
    alert('班別代號已被使用，請輸入獨立代號。')
    item.codeKey = oldCode
    return
  }
  delete shifts.value[oldCode]
  item.codeKey = trimmed
  item.originalCode = trimmed
  shifts.value[trimmed] = item
  if (previewCode.value === oldCode) previewCode.value = trimmed
  emitChange()
  // 已開班格子、人工指定與班表內的舊代號一併改名
  emit('rename-code', { oldCode, newCode: trimmed })
}

function emitChange() {
  const cleanObj = {}
  Object.values(shifts.value).forEach(v => {
    const { codeKey, originalCode, ...rest } = v
    // 顯示用時間文字一律由上下班時間產生，確保全系統只有一份時間
    rest.start = rest.start || ''
    rest.end = rest.end || ''
    rest.restEnd = getShiftInterval(rest) ? (rest.restEnd || '') : ''
    rest.breakMinutes = getBreakMinutes(rest)
    rest.nightType = rest.nightType || ''
    rest.capacity = Math.max(parseInt(rest.capacity, 10) || 1, 1)
    rest.openOnHoliday = !!rest.openOnHoliday
    delete rest.needsSenior
    rest.time = formatTimeRange(rest.start, rest.end)
    cleanObj[originalCode] = rest
  })
  emit('update:shiftDefs', cleanObj)
  saveState('shiftDefs', cleanObj) // 即時固化儲存至 LocalStorage
}

function saveSettings() {
  emitChange()
  alert('✅ 【2. 班別與時間設定】已成功儲存並永久固定！切換頁面絕不跑掉。')
}


function addShift() {
  const newCode = `C_${Date.now().toString().slice(-4)}`
  const defaultRole = currentRoleFilter.value !== 'ALL' && currentRoleFilter.value !== 'COMMON' ? currentRoleFilter.value : '放射師'
  shifts.value[newCode] = {
    codeKey: newCode,
    originalCode: newCode,
    name: '自訂新班別',
    start: '08:00',
    end: '16:30',
    restEnd: '',
    breakMinutes: 30,
    nightType: '',
    time: '08:00 - 16:30',
    room: '檢查室',
    color: '#0d5c53',
    capacity: 1,
    openOnHoliday: false,
    targetRole: defaultRole,
    modKey: null,
    applicableDays: ''
  }
  emitChange()
}

function removeShift(code) {
  if (confirm(`確定刪除班別代號 [${code}]？`)) {
    delete shifts.value[code]
    emitChange()
  }
}

function resetToExcelShiftDefs() {
  if (confirm('確定要將班別與時間段重置為 Excel 原始 26 種定義嗎？')) {
    const cleanObj = JSON.parse(JSON.stringify(SHIFT_DEFS))
    emit('update:shiftDefs', cleanObj)
    alert('✅ 已重置為 Excel 班別規格並同步全域！')
  }
}
</script>

<style scoped>
.time-input {
  width: 105px;
  text-align: center;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  padding: 0.15rem 0.2rem;
  font-weight: 600;
}

.break-input {
  width: 62px;
  text-align: center;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  padding: 0.15rem 0.2rem;
  font-weight: 600;
}

.break-input:disabled,
.time-input:disabled {
  background: #f1f5f9;
  color: #94a3b8;
}

.holiday-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.holiday-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 6px;
  background: #fef2f2;
  border: 1px solid #fca5a5;
  color: #991b1b;
  font-size: 0.85rem;
}

.holiday-remove {
  border: none;
  background: transparent;
  color: #991b1b;
  cursor: pointer;
  font-weight: 700;
}

.next-day-tag,
.dept-tag {
  display: inline-block;
  margin-left: 4px;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  background: #fef3c7;
  color: #92400e;
}

.time-warning {
  color: #dc2626;
  font-size: 0.75rem;
  font-weight: 700;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 8px;
}

.preview-chip {
  border-radius: 6px;
  padding: 6px 10px;
  border: 1px solid;
  font-size: 0.8rem;
}

.preview-chip.ok {
  background: #f0fdf4;
  border-color: #86efac;
  color: #166534;
}

.preview-chip.blocked {
  background: #fef2f2;
  border-color: #fca5a5;
  color: #991b1b;
}

.preview-chip-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-weight: 700;
}

.preview-chip-sub {
  font-size: 0.72rem;
  opacity: 0.85;
  margin-top: 2px;
}

.role-filter-btn {
  border: 1px solid #cbd5e1;
  background: white;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s ease;
}

.role-filter-btn:hover {
  background: #f1f5f9;
}

.role-filter-btn.active {
  background: #0d5c53;
  color: white;
  border-color: #0d5c53;
}
</style>
