<template>
  <div class="tab-panel">
    <div class="card card-glass">
      <div class="card-title" style="justify-content: space-between; flex-wrap: wrap; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <UserMinus :size="20" />
          <span style="font-weight: 700; font-size: 1.1rem; color: #0d5c53;">20小時繼續教育訓練紀錄</span>

        </div>
        <!-- 💾 儲存設定按鈕 -->
        <button class="btn btn-primary" style="font-size: 0.85rem; font-weight: 700; background: #0d5c53; border-color: #0d5c53;" @click="saveSettings">
          <Save :size="15" />
          <span>儲存設定</span>
        </button>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.8rem; margin-bottom: 1rem; margin-top: 0.8rem;">
        <!-- 同仁姓名 (連動放射師) -->
        <div>
          <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.3rem;">同仁姓名 (放射師專屬)</label>
          <select v-model="newLeave.staffId" style="width: 100%; padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 6px; font-weight: 600;">
            <option v-for="s in radiographers" :key="s.id" :value="s.id">
              {{ s.id }} {{ s.name }} ({{ s.level }})
            </option>
          </select>
        </div>

        <!-- 上課日期 -->
        <div>
          <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.3rem;">上課日期</label>
          <input type="date" v-model="newLeave.date" style="width: 100%; padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 6px;" />
        </div>

        <!-- 上課時間 -->
        <div>
          <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.3rem;">上課時間</label>
          <input type="time" v-model="newLeave.startTime" style="width: 100%; padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 6px;" />
        </div>

        <!-- 下課時間 -->
        <div>
          <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.3rem;">下課時間</label>
          <input type="time" v-model="newLeave.endTime" style="width: 100%; padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 6px;" />
        </div>

        <!-- 上課名稱 -->
        <div style="grid-column: span 2;">
          <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.3rem;">上課名稱</label>
          <input type="text" v-model="newLeave.courseName" placeholder="例如: 20小時輻射防護繼續教育訓練" style="width: 100%; padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 6px;" />
        </div>
      </div>

      <button class="btn btn-secondary" @click="addLeave">新增上課紀錄</button>
    </div>

    <!-- 20小時繼續教育上課紀錄清單 -->
    <div class="card card-glass" style="margin-top: 1rem;">
      <div class="card-title">
        <ListCheck :size="20" />
        <span>20小時繼續教育上課紀錄清單</span>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>放射師員號</th>
              <th>姓名</th>
              <th>上課日期</th>
              <th>上課時間</th>
              <th>下課時間</th>
              <th>單次工時</th>
              <th>上課名稱</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(l, idx) in normalizedLeaves" :key="idx">
              <td>{{ l.staffId }}</td>
              <td><strong>{{ getStaffName(l.staffId) }}</strong></td>
              <td>{{ l.date }}</td>
              <td><span class="badge badge-info">{{ l.startTime }}</span></td>
              <td><span class="badge badge-info">{{ l.endTime }}</span></td>
              <td><strong style="color: #0284c7;">{{ calculateRecordHours(l.startTime, l.endTime) }} h</strong></td>
              <td><span class="badge badge-warning">{{ l.courseName }}</span></td>
              <td>
                <button class="btn btn-danger" style="padding: 0.2rem 0.4rem; font-size: 0.75rem;" @click="removeLeave(idx)">刪除</button>
              </td>
            </tr>
            <tr v-if="normalizedLeaves.length === 0">
              <td colspan="8" style="color: #94a3b8; padding: 1.5rem;">尚無 20 小時繼續教育上課紀錄。</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 📊 放射師 20 小時繼續教育時數累計統計表 (使用者要求加總統計) -->
    <div class="card card-glass" style="margin-top: 1rem;">
      <div class="card-title" style="justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <BarChart2 :size="20" />
          <span style="font-weight: 700; font-size: 1.1rem; color: #0d5c53;">📊 放射師 20 小時繼續教育累積時數加總統計表</span>
        </div>
        <span style="font-size: 0.85rem; color: #64748b;">每位放射師納入工時上限 20 小時</span>

      </div>

      <div class="table-container" style="margin-top: 0.8rem;">
        <table class="data-table">
          <thead>
            <tr>
              <th>員號</th>
              <th>放射師姓名</th>
              <th>資歷層級</th>
              <th>上課總次數</th>
              <th>累計總上課時數 (小時)</th>
              <th>20 小時達成進度</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="st in staffHoursStats" :key="st.id">
              <td>{{ st.id }}</td>
              <td><strong>{{ st.name }}</strong></td>
              <td>{{ st.level }}</td>
              <td><span class="badge" style="background: #f1f5f9; color: #334155;">{{ st.courseCount }} 次</span></td>
              <td>
                <strong style="font-size: 1.05rem; color: #0d5c53;">{{ st.totalHours }} 小時</strong>
              </td>
              <td>
                <div class="progress-bar-container">
                  <div 
                    class="progress-bar-fill" 
                    :style="{ width: Math.min((st.totalHours / 20) * 100, 100) + '%' }"
                    :class="{ 'is-completed': st.totalHours >= 20 }"
                  ></div>
                  <span class="progress-text">
                    {{ st.totalHours >= 20 ? '✅ 已達標 (' + st.totalHours + '/20h)' : st.totalHours + ' / 20h (尚缺 ' + (20 - st.totalHours).toFixed(1) + 'h)' }}
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { UserMinus, ListCheck, Save, BarChart2 } from 'lucide-vue-next'

const props = defineProps({
  staff: { type: Array, default: () => [] },
  leaves: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:leaves'])

// 僅過濾與連動「放射師」
const radiographers = computed(() => {
  return props.staff.filter(s => s.role === '放射師' && s.status === '在職')
})

const newLeave = ref({
  staffId: radiographers.value[0]?.id || props.staff[0]?.id || '',
  date: new Date().toISOString().slice(0, 10),
  startTime: '08:00',
  endTime: '09:00',
  courseName: '20小時輻射防護繼續教育訓練'
})

// 格式標準化與平滑相容
const normalizedLeaves = computed(() => {
  return props.leaves.map(l => ({
    staffId: l.staffId,
    date: l.date || l.start || new Date().toISOString().slice(0, 10),
    startTime: l.startTime || '08:00',
    endTime: l.endTime || '09:00',
    courseName: l.courseName || l.note || '20小時繼續教育訓練'
  }))
})

// 單次上課時數計算 (小時)
function calculateRecordHours(startTime, endTime) {
  if (!startTime || !endTime) return 1.0
  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)
  const diffMinutes = (endH * 60 + endM) - (startH * 60 + startM)
  const hours = diffMinutes / 60
  return hours > 0 ? parseFloat(hours.toFixed(1)) : 1.0
}

function getStaffName(id) {
  const s = props.staff.find(x => x.id === id)
  return s ? s.name : id
}

// 📊 放射師 20 小時繼續教育時數累計統計計算
const staffHoursStats = computed(() => {
  return radiographers.value.map(s => {
    const myRecords = normalizedLeaves.value.filter(l => l.staffId === s.id)
    let totalH = 0
    myRecords.forEach(l => {
      totalH += calculateRecordHours(l.startTime, l.endTime)
    })
    return {
      id: s.id,
      name: s.name,
      level: s.level,
      courseCount: myRecords.length,
      totalHours: parseFloat(totalH.toFixed(1))
    }
  })
})

function addLeave() {
  if (!newLeave.value.date) {
    alert('請選擇上課日期')
    return
  }
  if (!newLeave.value.courseName) {
    alert('請輸入上課名稱')
    return
  }

  const record = {
    staffId: newLeave.value.staffId,
    date: newLeave.value.date,
    start: newLeave.value.date,
    end: newLeave.value.date,
    startTime: newLeave.value.startTime,
    endTime: newLeave.value.endTime,
    courseName: newLeave.value.courseName,
    note: newLeave.value.courseName,
    type: 'rad_edu'
  }

  const updated = [...props.leaves, record]
  emit('update:leaves', updated)
  const hours = calculateRecordHours(newLeave.value.startTime, newLeave.value.endTime)
  alert(`✅ 已新增 [${getStaffName(newLeave.value.staffId)}] 的上課紀錄：${newLeave.value.courseName} (${hours} 小時)`)
}

function removeLeave(idx) {
  if (confirm('確定刪除此筆上課紀錄嗎？')) {
    const updated = [...props.leaves]
    updated.splice(idx, 1)
    emit('update:leaves', updated)
  }
}

function saveSettings() {
  emit('update:leaves', props.leaves)
  alert('✅ 【3. 20小時上課工時紀錄與時數統計】已成功儲存並同步至系統全域！')
}
</script>

<style scoped>
.badge-info {
  background-color: #e0f2fe;
  color: #0369a1;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}
.badge-warning {
  background-color: #fef3c7;
  color: #b45309;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}

/* 進度條樣式 */
.progress-bar-container {
  position: relative;
  width: 100%;
  max-width: 220px;
  height: 20px;
  background-color: #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #38bdf8, #0284c7);
  transition: width 0.3s ease;
}

.progress-bar-fill.is-completed {
  background: linear-gradient(90deg, #34d399, #059669);
}

.progress-text {
  position: absolute;
  width: 100%;
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  color: #0f172a;
  text-shadow: 0 0 2px rgba(255,255,255,0.8);
}
</style>
