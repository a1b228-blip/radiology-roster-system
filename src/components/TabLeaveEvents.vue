<template>
  <div class="tab-panel">
    <div class="card">
      <div class="card-title">
        <UserMinus :size="20" />
        <span>新增請假 / 輻射防護繼續教育訓練紀錄</span>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.8rem; margin-bottom: 1rem;">
        <div>
          <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.3rem;">放射師</label>
          <select v-model="newLeave.staffId" style="width: 100%; padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 6px;">
            <option v-for="s in staff" :key="s.id" :value="s.id">{{ s.id }} {{ s.name }}</option>
          </select>
        </div>
        <div>
          <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.3rem;">開始日期</label>
          <input type="date" v-model="newLeave.start" style="width: 100%; padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 6px;" />
        </div>
        <div>
          <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.3rem;">結束日期</label>
          <input type="date" v-model="newLeave.end" style="width: 100%; padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 6px;" />
        </div>
        <div>
          <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.3rem;">假別 / 活動模式</label>
          <select v-model="newLeave.type" style="width: 100%; padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 6px;">
            <option v-for="t in LEAVE_TYPES" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
        </div>
        <div>
          <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.3rem;">事由 / 備註</label>
          <input type="text" v-model="newLeave.note" placeholder="例如: 年假、輻防教育訓練" style="width: 100%; padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 6px;" />
        </div>
      </div>

      <button class="btn btn-primary" @click="addLeave">新增請假紀錄</button>
    </div>

    <!-- 請假與訓練紀錄列表 -->
    <div class="card">
      <div class="card-title">
        <ListCheck :size="20" />
        <span>請假與受訓紀錄清單</span>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>放射師員號</th>
              <th>姓名</th>
              <th>開始日期</th>
              <th>結束日期</th>
              <th>假別</th>
              <th>備註</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(l, idx) in leaves" :key="idx">
              <td>{{ l.staffId }}</td>
              <td><strong>{{ getStaffName(l.staffId) }}</strong></td>
              <td>{{ l.start }}</td>
              <td>{{ l.end }}</td>
              <td><span class="badge badge-warning">{{ getLeaveTypeName(l.type) }}</span></td>
              <td>{{ l.note }}</td>
              <td>
                <button class="btn btn-danger" style="padding: 0.2rem 0.4rem; font-size: 0.75rem;" @click="removeLeave(idx)">刪除</button>
              </td>
            </tr>
            <tr v-if="leaves.length === 0">
              <td colspan="7" style="color: #94a3b8; padding: 1.5rem;">尚無請假或受訓紀錄。</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { UserMinus, ListCheck } from 'lucide-vue-next'
import { LEAVE_TYPES } from '../core/types.js'

const props = defineProps({
  staff: { type: Array, default: () => [] },
  leaves: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:leaves'])

const newLeave = ref({
  staffId: props.staff[0]?.id || 'R1',
  start: new Date().toISOString().slice(0, 10),
  end: new Date().toISOString().slice(0, 10),
  type: 'full',
  note: ''
})

function getStaffName(id) {
  const s = props.staff.find(x => x.id === id)
  return s ? s.name : id
}

function getLeaveTypeName(typeId) {
  const t = LEAVE_TYPES.find(x => x.id === typeId)
  return t ? t.name : typeId
}

function addLeave() {
  if (!newLeave.value.start || !newLeave.value.end) {
    alert('請選擇請假起訖日期')
    return
  }
  const updated = [...props.leaves, { ...newLeave.value }]
  emit('update:leaves', updated)
  newLeave.value.note = ''
}

function removeLeave(idx) {
  const updated = [...props.leaves]
  updated.splice(idx, 1)
  emit('update:leaves', updated)
}
</script>
