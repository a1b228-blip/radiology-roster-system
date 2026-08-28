<template>
  <div class="tab-panel">
    <!-- 人員主檔與專長資格表 -->
    <div class="card card-glass">
      <div class="card-title" style="justify-content: space-between; flex-wrap: wrap; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <Users :size="20" />
          <span style="font-weight: 700; font-size: 1.1rem; color: #0d5c53;">放射科人員檔案</span>


        </div>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button class="btn btn-outline" style="font-size: 0.8rem;" @click="resetToExcelDefaults">
            <RotateCcw :size="14" />
            <span>重置為 Excel 預設名冊</span>
          </button>
          <button class="btn btn-secondary" style="font-size: 0.8rem;" @click="addStaff">
            <UserPlus :size="14" />
            <span>新增同仁檔案</span>
          </button>
          <!-- 💾 儲存設定按鈕 -->
          <button class="btn btn-primary" style="font-size: 0.85rem; font-weight: 700; background: #0d5c53; border-color: #0d5c53;" @click="saveSettings">
            <Save :size="15" />
            <span>儲存設定</span>
          </button>
        </div>
      </div>

      <!-- 職類快速過濾按鈕列 -->
      <div class="role-filter-bar" style="display: flex; gap: 8px; margin: 12px 0 4px 0;">
        <button 
          v-for="r in roleFilters" 
          :key="r.key"
          class="role-filter-btn"
          :class="{ active: currentRoleFilter === r.key }"
          @click="currentRoleFilter = r.key"
        >
          {{ r.label }} ({{ getRoleCount(r.key) }})
        </button>
      </div>

      <div class="table-container" style="margin-top: 0.8rem;">
        <table class="data-table">
          <thead>
            <tr>
              <th>員號</th>
              <th>姓名</th>
              <th>職類群組</th>
              <th>資歷層級</th>
              <th>在職狀態</th>
              <template v-if="showNightAndSatCols">
                <th>可排夜班</th>
                <th>可值週六</th>
              </template>
              <template v-if="showMachineSkills">
                <th style="background: #f1f5f9; color: #334155;">第一專長 (X光)</th>
                <th style="background: #f1f5f9; color: #334155;">第一專長 (CT)</th>
                <th style="background: #e0f2fe; color: #0369a1;">第二專長 (心臟CT)</th>
                <th style="background: #e0f2fe; color: #0369a1;">第二專長 (MRI)</th>
                <th style="background: #e0f2fe; color: #0369a1;">第二專長 (特殊攝影)</th>
                <th style="background: #e0f2fe; color: #0369a1;">第二專長 (乳房攝影)</th>
                <th style="background: #e0f2fe; color: #0369a1;">第二專長 (骨密牙科)</th>
                <th style="background: #e0f2fe; color: #0369a1;">第二專長 (超音波)</th>
              </template>

              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(s) in filteredStaff" :key="s.id" :class="{ 'is-leave-row': s.status !== '在職' }">
              <td><input v-model="s.id" @change="emitUpdate" style="width: 70px; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px;" /></td>
              <td><input v-model="s.name" @change="emitUpdate" style="width: 90px; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: 700;" /></td>
              <td>
                <select v-model="s.role" @change="handleRoleChange(s)" style="padding: 0.2rem; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: 600;">
                  <option value="放射師">放射師</option>
                  <option value="護理人員">護理人員</option>
                  <option value="書記">書記</option>
                </select>
              </td>
              <td>
                <select v-model="s.level" @change="emitUpdate" style="padding: 0.2rem; border: 1px solid #cbd5e1; border-radius: 4px;">
                  <option value="主管">主管</option>
                  <option value="資深">資深</option>
                  <option value="常規">常規</option>
                  <option value="新進">新進</option>
                </select>

              </td>
              <td>
                <select v-model="s.status" @change="emitUpdate" style="padding: 0.2rem; border: 1px solid #cbd5e1; border-radius: 4px;">
                  <option value="在職">在職</option>
                  <option value="停用/留停">停用/留停</option>
                </select>
              </td>

              <template v-if="showNightAndSatCols">
                <td><input type="checkbox" v-model="s.canNight" @change="emitUpdate" :disabled="s.role !== '放射師'" /></td>
                <td><input type="checkbox" v-model="s.canSat" @change="emitUpdate" :disabled="s.role !== '放射師'" /></td>
              </template>

              <template v-if="showMachineSkills">
                <td><input type="checkbox" v-model="s.xray" @change="emitUpdate" title="一般 X 光" :disabled="s.role !== '放射師'" /></td>
                <td><input type="checkbox" v-model="s.ct" @change="emitUpdate" title="CT 資格" :disabled="s.role !== '放射師'" /></td>
                <td><input type="checkbox" v-model="s.cct" @change="emitUpdate" title="心臟 CT" :disabled="s.role !== '放射師'" /></td>
                <td><input type="checkbox" v-model="s.mri" @change="emitUpdate" title="MRI 資格" :disabled="s.role !== '放射師'" /></td>
                <td><input type="checkbox" v-model="s.angio" @change="emitUpdate" title="特殊攝影" :disabled="s.role !== '放射師'" /></td>
                <td><input type="checkbox" v-model="s.mammo" @change="emitUpdate" title="乳房攝影" :disabled="s.role !== '放射師'" /></td>
                <td><input type="checkbox" v-model="s.bmd" @change="emitUpdate" title="牙科骨密" :disabled="s.role !== '放射師'" /></td>
                <td><input type="checkbox" v-model="s.us" @change="emitUpdate" title="超音波" :disabled="s.role !== '放射師'" /></td>
              </template>

              <td>
                <button class="btn btn-danger" style="padding: 0.2rem 0.4rem; font-size: 0.75rem;" @click="removeStaff(s.id)">刪除</button>
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
import { Users, UserPlus, RotateCcw, Save } from 'lucide-vue-next'
import { DEFAULT_STAFF } from '../core/types.js'
import { saveState } from '../core/storage.js'

const props = defineProps({
  staff: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:staff'])

const staffList = ref([...props.staff])
const currentRoleFilter = ref('ALL')

const roleFilters = [
  { key: 'ALL', label: '全部同仁' },
  { key: '放射師', label: '🩻 放射師' },
  { key: '護理人員', label: '🩺 護理人員' },
  { key: '書記', label: '📝 書記' }
]

const showNightAndSatCols = computed(() => {
  return currentRoleFilter.value === 'ALL' || currentRoleFilter.value === '放射師'
})

const showMachineSkills = computed(() => {
  return currentRoleFilter.value === 'ALL' || currentRoleFilter.value === '放射師'
})

const filteredStaff = computed(() => {
  if (currentRoleFilter.value === 'ALL') return staffList.value
  return staffList.value.filter(s => s.role === currentRoleFilter.value)
})

function getRoleCount(roleKey) {
  if (roleKey === 'ALL') return staffList.value.length
  return staffList.value.filter(s => s.role === roleKey).length
}

function handleRoleChange(s) {
  if (s.role !== '放射師') {
    s.canNight = false
    s.canSat = false
    s.xray = false
    s.ct = false
    s.cct = false
    s.mri = false
    s.angio = false
    s.mammo = false
    s.bmd = false
    s.us = false
  }
  emitUpdate()
}

watch(() => props.staff, (newVal) => {
  staffList.value = [...newVal]
}, { deep: true })

function emitUpdate() {
  emit('update:staff', staffList.value)
  saveState('staff', staffList.value) // 固化寫入 LocalStorage
}

function saveSettings() {
  emitUpdate()
  alert('✅ 【1. 放射科人員檔案】設定已成功儲存並永久固定！切換頁面絕不跑掉。')
}



function addStaff() {
  const newId = `ST_${staffList.value.length + 1}`
  const defaultRole = currentRoleFilter.value !== 'ALL' ? currentRoleFilter.value : '放射師'
  staffList.value.push({
    id: newId,
    name: '新同仁',
    role: defaultRole,
    level: '常規',
    status: '在職',
    canNight: defaultRole === '放射師',
    canSat: defaultRole === '放射師',
    xray: defaultRole === '放射師',
    ct: false,
    cct: false,
    mri: false,
    angio: false,
    mammo: false,
    bmd: false,
    us: false
  })
  emitUpdate()
}

function removeStaff(staffId) {
  const targetIdx = staffList.value.findIndex(s => s.id === staffId)
  if (targetIdx !== -1 && confirm(`確定刪除同仁員號 ${staffList.value[targetIdx].id} (${staffList.value[targetIdx].name})？`)) {
    staffList.value.splice(targetIdx, 1)
    emitUpdate()
  }
}

function resetToExcelDefaults() {
  if (confirm('確定要將人員名冊重置為 Excel 原始 26 位同仁檔案嗎？')) {
    staffList.value = JSON.parse(JSON.stringify(DEFAULT_STAFF))
    emitUpdate()
    alert('✅ 已成功重置人員主檔並同步全域！')
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

.is-leave-row {
  background-color: #f1f5f9;
  opacity: 0.7;
}
</style>
