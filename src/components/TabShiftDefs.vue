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
              <th>出勤時間段</th>
              <th>開班預設適用星期</th>
              <th>對應檢查室 / 區域</th>

              <th>需要資深帶導</th>
              <th>專業資格要求</th>
              <th>標籤顏色</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="info in filteredShiftsList" :key="info.codeKey">
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
                <input v-model="info.time" @change="emitChange" style="width: 120px; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px;" />
              </td>
              <td>
                <select v-model="info.applicableDays" @change="emitChange" style="padding: 0.2rem 0.4rem; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: 600; background: #f8fafc; color: #0284c7;">
                  <option v-for="opt in APPLICABLE_DAYS_OPTIONS" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
              </td>

              <td>
                <input v-model="info.room" @change="emitChange" style="width: 120px; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px;" />
              </td>
              <td>
                <input type="checkbox" v-model="info.needsSenior" @change="emitChange" />
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
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Clock, Plus, RotateCcw, Save } from 'lucide-vue-next'
import { SHIFT_DEFS, APPLICABLE_DAYS_OPTIONS } from '../core/types.js'

import { saveState } from '../core/storage.js'

const props = defineProps({
  shiftDefs: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['update:shiftDefs'])

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

const filteredShiftsList = computed(() => {
  const list = Object.values(shifts.value)

  list.sort((a, b) => {
    const pA = rolePriority[a.targetRole] || 4
    const pB = rolePriority[b.targetRole] || 4
    return pA - pB
  })

  if (currentRoleFilter.value === 'ALL') return list
  if (currentRoleFilter.value === 'COMMON') return list.filter(info => !info.targetRole)
  return list.filter(info => info.targetRole === currentRoleFilter.value)
})

function getRoleShiftCount(roleKey) {
  if (roleKey === 'ALL') return Object.keys(shifts.value).length
  if (roleKey === 'COMMON') return Object.values(shifts.value).filter(s => !s.targetRole).length
  return Object.values(shifts.value).filter(s => s.targetRole === roleKey).length
}

function updateCode(oldCode, newCode) {
  if (!newCode || oldCode === newCode) return
  if (shifts.value[newCode]) {
    alert('班別代號已被使用，請輸入獨立代號。')
    return
  }
  const item = shifts.value[oldCode]
  delete shifts.value[oldCode]
  item.originalCode = newCode
  shifts.value[newCode] = item
  emitChange()
}

function emitChange() {
  const cleanObj = {}
  Object.values(shifts.value).forEach(v => {
    const { codeKey, originalCode, ...rest } = v
    cleanObj[codeKey] = rest
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
    time: '08:00 - 16:30',
    room: '檢查室',
    color: '#0d5c53',
    needsSenior: false,
    targetRole: defaultRole,
    modKey: null
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
