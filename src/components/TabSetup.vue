<template>
  <div class="tab-panel">
    <!-- 排班月份與國定假日 -->
    <div class="card">
      <div class="card-title">
        <Calendar :size="20" />
        <span>1. 排班月份與國定假日設定</span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;">
        <div>
          <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.3rem;">排班年份</label>
          <input type="number" v-model.number="yearVal" @change="emitUpdate" style="width: 100%; padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 6px;" />
        </div>
        <div>
          <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.3rem;">排班月份</label>
          <select v-model.number="monthVal" @change="emitUpdate" style="width: 100%; padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 6px;">
            <option v-for="m in 12" :key="m" :value="m">{{ m }} 月</option>
          </select>
        </div>
        <div style="grid-column: span 2;">
          <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.3rem;">國定假日 / 特殊休診日 (格式：YYYY-MM-DD，逗號分隔)</label>
          <input type="text" v-model="holidaysStr" @change="emitUpdate" placeholder="例如: 2026-09-28, 2026-10-10" style="width: 100%; padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 6px;" />
        </div>
      </div>
    </div>

    <!-- 放射師主檔與機台資格表 -->
    <div class="card">
      <div class="card-title" style="justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <Users :size="20" />
          <span>2. 放射師人員主檔與機台操作資格對照表 (Skill Matrix)</span>
        </div>
        <button class="btn btn-outline" style="font-size: 0.8rem;" @click="addStaff">
          <UserPlus :size="14" />
          <span>新增放射師</span>
        </button>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>員號</th>
              <th>姓名</th>
              <th>資歷等級</th>
              <th>可上夜班</th>
              <th>可值週六</th>
              <th>CT 資格</th>
              <th>MRI 資格</th>
              <th>Angio 資格</th>
              <th>乳房攝影</th>
              <th>備註 / 特殊限制說明</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(s, idx) in staffList" :key="s.id">
              <td><input v-model="s.id" style="width: 60px; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px;" /></td>
              <td><input v-model="s.name" style="width: 90px; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: 700;" /></td>
              <td>
                <select v-model="s.level" style="padding: 0.2rem; border: 1px solid #cbd5e1; border-radius: 4px;">
                  <option value="組長">組長</option>
                  <option value="資深">資深</option>
                  <option value="常規">常規</option>
                  <option value="新進">新進</option>
                </select>
              </td>
              <td><input type="checkbox" v-model="s.canNight" /></td>
              <td><input type="checkbox" v-model="s.canSat" /></td>
              <td><input type="checkbox" v-model="s.ct" /></td>
              <td><input type="checkbox" v-model="s.mri" /></td>
              <td><input type="checkbox" v-model="s.angio" /></td>
              <td><input type="checkbox" v-model="s.mammo" /></td>
              <td><input v-model="s.note" style="width: 100%; border: 1px solid #cbd5e1; border-radius: 4px; padding: 0.2rem;" /></td>
              <td>
                <button class="btn btn-danger" style="padding: 0.2rem 0.4rem; font-size: 0.75rem;" @click="removeStaff(idx)">刪除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Calendar, Users, UserPlus } from 'lucide-vue-next'

const props = defineProps({
  year: { type: Number, default: 2026 },
  month: { type: Number, default: 9 },
  holidays: { type: Array, default: () => [] },
  staff: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:year', 'update:month', 'update:holidays', 'update:staff'])

const yearVal = ref(props.year)
const monthVal = ref(props.month)
const holidaysStr = ref(props.holidays.join(', '))
const staffList = ref([...props.staff])

watch(() => props.staff, (newVal) => {
  staffList.value = [...newVal]
}, { deep: true })

function emitUpdate() {
  emit('update:year', yearVal.value)
  emit('update:month', monthVal.value)
  emit('update:holidays', holidaysStr.value.split(',').map(s => s.trim()).filter(Boolean))
  emit('update:staff', staffList.value)
}

function addStaff() {
  const newId = `R${staffList.value.length + 1}`
  staffList.value.push({
    id: newId,
    name: '新放射師',
    level: '常規',
    canNight: true,
    canSat: true,
    ct: false,
    mri: false,
    angio: false,
    mammo: false,
    note: ''
  })
  emitUpdate()
}

function removeStaff(idx) {
  if (confirm(`確定刪除此放射師員號 ${staffList.value[idx].id}？`)) {
    staffList.value.splice(idx, 1)
    emitUpdate()
  }
}
</script>
