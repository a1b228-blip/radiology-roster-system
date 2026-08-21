<template>
  <div class="tab-panel">
    <div class="card">
      <div class="card-title" style="justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <Clock :size="20" />
          <span>班別代碼與出勤時間規格設定 (主管可自由修改與新增)</span>
        </div>
        <button class="btn btn-outline" style="font-size: 0.8rem;" @click="addShift">
          <Plus :size="14" />
          <span>新增自訂班別</span>
        </button>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>班別代號</th>
              <th>班別名稱</th>
              <th>出勤時間段</th>
              <th>對應檢查室 / 區域</th>
              <th>需要資深帶導</th>
              <th>專業資格要求</th>
              <th>標籤顏色</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(info, code) in shifts" :key="code">
              <td>
                <input v-model="info.codeKey" @change="updateCode(code, info.codeKey)" style="width: 80px; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: 700;" />
              </td>
              <td>
                <input v-model="info.name" style="width: 100px; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: 600;" />
              </td>
              <td>
                <input v-model="info.time" style="width: 110px; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px;" />
              </td>
              <td>
                <input v-model="info.room" style="width: 120px; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px;" />
              </td>
              <td>
                <input type="checkbox" v-model="info.needsSenior" />
              </td>
              <td>
                <select v-model="info.modKey" style="padding: 0.2rem; border: 1px solid #cbd5e1; border-radius: 4px;">
                  <option :value="null">無特殊限制</option>
                  <option value="ct">CT 資格</option>
                  <option value="mri">MRI 資格</option>
                  <option value="angio">Angio 資格</option>
                  <option value="mammo">乳房攝影資格</option>
                </select>
              </td>
              <td>
                <input type="color" v-model="info.color" style="width: 40px; height: 30px; border: none; cursor: pointer;" />
              </td>
              <td>
                <button class="btn btn-danger" style="padding: 0.2rem 0.4rem; font-size: 0.75rem;" @click="removeShift(code)">刪除</button>
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
import { Clock, Plus } from 'lucide-vue-next'

const props = defineProps({
  shiftDefs: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['update:shiftDefs'])

const shifts = ref({})

// 將存入的物體加上 codeKey 屬性以便編輯
watch(() => props.shiftDefs, (newVal) => {
  const result = {}
  Object.entries(newVal).forEach(([k, v]) => {
    result[k] = { ...v, codeKey: k }
  })
  shifts.value = result
}, { immediate: true, deep: true })

function updateCode(oldCode, newCode) {
  if (!newCode || oldCode === newCode) return
  if (shifts.value[newCode]) {
    alert('班別代號已被使用，請輸入獨立代號。')
    return
  }
  const item = shifts.value[oldCode]
  delete shifts.value[oldCode]
  shifts.value[newCode] = item
  emitChange()
}

function emitChange() {
  const cleanObj = {}
  Object.entries(shifts.value).forEach(([k, v]) => {
    const { codeKey, ...rest } = v
    cleanObj[k] = rest
  })
  emit('update:shiftDefs', cleanObj)
}

function addShift() {
  const newCode = `CUSTOM_${Date.now().toString().slice(-4)}`
  shifts.value[newCode] = {
    codeKey: newCode,
    name: '自訂新班別',
    time: '08:00–17:00',
    room: '檢查室',
    color: '#0d5c53',
    needsSenior: false,
    modKey: null
  }
  emitChange()
}

function removeShift(code) {
  if (confirm(`確定刪除班別 ${code}？`)) {
    delete shifts.value[code]
    emitChange()
  }
}
</script>
