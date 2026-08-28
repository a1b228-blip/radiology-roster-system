<template>
  <div class="tab-panel">
    <div class="card card-glass">
      <div class="card-title" style="justify-content: space-between; flex-wrap: wrap; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <Lock :size="20" />
          <span style="font-weight: 700; font-size: 1.1rem; color: #0d5c53;">人工指定單日班別 / 班別鎖定設定</span>
        </div>
        <!-- 💾 儲存設定按鈕 -->
        <button class="btn btn-primary" style="font-size: 0.85rem; font-weight: 700; background: #0d5c53; border-color: #0d5c53;" @click="saveSettings">
          <Save :size="15" />
          <span>儲存設定</span>
        </button>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.8rem; margin-bottom: 1rem;">
        <div>
          <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.3rem;">指定日期</label>
          <input type="date" v-model="newLock.date" style="width: 100%; padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 6px;" />
        </div>
        <div>
          <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.3rem;">同仁姓名</label>
          <select v-model="newLock.staffId" style="width: 100%; padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 6px;">
            <option v-for="s in staff" :key="s.id" :value="s.id">[{{ s.role }}] {{ s.id }} {{ s.name }}</option>
          </select>
        </div>
        <div>
          <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.3rem;">指定班別</label>
          <select v-model="newLock.shiftCode" style="width: 100%; padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 6px;">
            <option v-for="(info, code) in SHIFT_DEFS" :key="code" :value="code">{{ code }} ({{ info.name }})</option>
          </select>
        </div>
        <div>
          <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.3rem;">指定事由</label>
          <input type="text" v-model="newLock.note" placeholder="例如: 科內協調、支援帶導" style="width: 100%; padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 6px;" />
        </div>
      </div>

      <button class="btn btn-secondary" @click="addLock">新增指定班別</button>
    </div>

    <!-- 鎖定清單 -->
    <div class="card card-glass" style="margin-top: 1rem;">
      <div class="card-title">
        <ListCheck :size="20" />
        <span>人工指定班別清單</span>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>日期</th>
              <th>員號</th>
              <th>姓名</th>
              <th>指定班別</th>
              <th>事由</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(lk, idx) in locks" :key="idx">
              <td>{{ lk.date }}</td>
              <td>{{ lk.staffId }}</td>
              <td><strong>{{ getStaffName(lk.staffId) }}</strong></td>
              <td><span class="badge badge-primary">{{ lk.shiftCode }}</span></td>
              <td>{{ lk.note }}</td>
              <td>
                <button class="btn btn-danger" style="padding: 0.2rem 0.4rem; font-size: 0.75rem;" @click="removeLock(idx)">刪除</button>
              </td>
            </tr>
            <tr v-if="locks.length === 0">
              <td colspan="6" style="color: #94a3b8; padding: 1.5rem;">尚無人工指定紀錄。</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Lock, ListCheck, Save } from 'lucide-vue-next'
import { SHIFT_DEFS } from '../core/types.js'

const props = defineProps({
  staff: { type: Array, default: () => [] },
  locks: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:locks'])

const newLock = ref({
  date: new Date().toISOString().slice(0, 10),
  staffId: props.staff[0]?.id || 'R1',
  shiftCode: 'D',
  note: ''
})

import { saveState } from '../core/storage.js'

function getStaffName(id) {
  const s = props.staff.find(x => x.id === id)
  return s ? s.name : id
}

function addLock() {
  if (!newLock.value.date) {
    alert('請選擇指定日期')
    return
  }
  const updated = [...props.locks, { ...newLock.value }]
  emit('update:locks', updated)
  saveState('locks', updated)
  alert(`✅ 已成功指定同仁 [${getStaffName(newLock.value.staffId)}] 於 ${newLock.value.date} 出勤 [${newLock.value.shiftCode}] 班別！已同步至選班日曆。`)
  newLock.value.note = ''
}

function removeLock(idx) {
  if (confirm('確定刪除此筆人工指定班別嗎？')) {
    const updated = [...props.locks]
    updated.splice(idx, 1)
    emit('update:locks', updated)
    saveState('locks', updated)
  }
}

function saveSettings() {
  emit('update:locks', props.locks)
  saveState('locks', props.locks)
  alert('✅ 【4. 人工指定班別】設定已成功儲存，並已 100% 自動同步連動至「同仁自主選班」日曆！')
}
</script>

