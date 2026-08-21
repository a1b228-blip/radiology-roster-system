<template>
  <div class="tab-panel">
    <div class="card">
      <div class="card-title">
        <Lock :size="20" />
        <span>人工指定單日班別 / 班別鎖定 (Manual Lock)</span>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.8rem; margin-bottom: 1rem;">
        <div>
          <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.3rem;">日期</label>
          <input type="date" v-model="newLock.date" style="width: 100%; padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 6px;" />
        </div>
        <div>
          <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.3rem;">放射師</label>
          <select v-model="newLock.staffId" style="width: 100%; padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 6px;">
            <option v-for="s in staff" :key="s.id" :value="s.id">{{ s.id }} {{ s.name }}</option>
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
          <input type="text" v-model="newLock.note" placeholder="例如: 科內協調、訓練支援" style="width: 100%; padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 6px;" />
        </div>
      </div>

      <button class="btn btn-primary" @click="addLock">新增指定班別</button>
    </div>

    <!-- 鎖定清單 -->
    <div class="card">
      <div class="card-title">
        <ListCheck :size="20" />
        <span>人工指定班別清單</span>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>日期</th>
              <th>放射師員號</th>
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
import { Lock, ListCheck } from 'lucide-vue-next'
import { SHIFT_DEFS } from '../core/types.js'

const props = defineProps({
  staff: { type: Array, default: () => [] },
  locks: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:locks'])

const newLock = ref({
  date: new Date().toISOString().slice(0, 10),
  staffId: props.staff[0]?.id || 'R1',
  shiftCode: 'D_CT',
  note: ''
})

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
  newLock.value.note = ''
}

function removeLock(idx) {
  const updated = [...props.locks]
  updated.splice(idx, 1)
  emit('update:locks', updated)
}
</script>
