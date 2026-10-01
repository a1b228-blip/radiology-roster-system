<template>
  <div class="tab-panel">
    <div class="card card-glass">
      <div class="card-title" style="justify-content: space-between; flex-wrap: wrap; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <UserMinus :size="20" />
          <span style="font-weight: 700; font-size: 1.1rem; color: #0d5c53;">放射師 20 小時上課工時紀錄</span>
        </div>
        <span style="font-size: 0.8rem; color: #64748b;">每人每年（1/1–12/31）{{ EDU_YEARLY_QUOTA_HOURS }} 小時，用完不能再登記；新增與刪除會立即儲存</span>
      </div>

      <div class="edu-rules">
        <div>• <strong>上班時間內上課</strong>：原本的班照算，不另外加工時，只扣額度。</div>
        <div>• <strong>年假上課</strong>：當天比照公假 08:00–16:30 算上班 {{ EDU_LEAVE_DAY_HOURS }} 小時（上課時數＋特休補足），計入連續上班天數，前後班須間隔 11 小時，當天不可再選班。上課超過 {{ EDU_LEAVE_DAY_HOURS }} 小時一律以 {{ EDU_LEAVE_DAY_HOURS }} 小時計。</div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.8rem; margin-bottom: 1rem; margin-top: 0.8rem;">
        <!-- 同仁姓名 (連動放射師) -->
        <div>
          <label class="edu-label">同仁姓名 (放射師專屬)</label>
          <select v-model="newRecord.staffId" class="edu-field" style="font-weight: 600;">
            <option v-for="s in radiographers" :key="s.id" :value="s.id">
              {{ s.id }} {{ s.name }}
            </option>
          </select>
        </div>

        <!-- 上課方式 -->
        <div>
          <label class="edu-label">上課方式</label>
          <select v-model="newRecord.mode" class="edu-field" style="font-weight: 600;">
            <option :value="EDU_MODE_ON_DUTY">上班時間內上課</option>
            <option :value="EDU_MODE_ANNUAL_LEAVE">年假上課</option>
          </select>
        </div>

        <!-- 上課日期 -->
        <div>
          <label class="edu-label">上課日期</label>
          <input type="date" v-model="newRecord.date" class="edu-field" />
        </div>

        <!-- 上課時間 -->
        <div>
          <label class="edu-label">上課時間</label>
          <input type="time" v-model="newRecord.startTime" class="edu-field" />
        </div>

        <!-- 下課時間 -->
        <div>
          <label class="edu-label">下課時間</label>
          <input type="time" v-model="newRecord.endTime" class="edu-field" />
        </div>

        <!-- 上課名稱 -->
        <div style="grid-column: span 2;">
          <label class="edu-label">上課名稱</label>
          <input type="text" v-model="newRecord.courseName" placeholder="例如: 20小時輻射防護繼續教育訓練" class="edu-field" />
        </div>
      </div>

      <!-- 登記前試算 -->
      <div class="edu-preview" :class="{ 'is-error': !!draftSummary.error }">
        <template v-if="draftSummary.error">⚠️ {{ draftSummary.error }}</template>
        <template v-else>
          本次上課 <strong>{{ draftSummary.classHours }}</strong> 小時，計入額度 <strong>{{ draftSummary.quotaHours }}</strong> 小時
          <span v-if="newRecord.mode === EDU_MODE_ANNUAL_LEAVE">，需用特休補 <strong>{{ draftSummary.topUpHours }}</strong> 小時（當天算上班 {{ EDU_LEAVE_DAY_HOURS }} 小時）</span>
          ｜{{ draftSummary.year }} 年度已用 {{ draftSummary.usedHours }} 小時，登記後剩 <strong>{{ draftSummary.remainAfter }}</strong> 小時
        </template>
      </div>

      <button class="btn btn-secondary" style="margin-top: 0.8rem;" @click="addRecord">新增上課紀錄</button>
    </div>

    <!-- 年度統計 -->
    <div class="card card-glass" style="margin-top: 1rem;">
      <div class="card-title" style="justify-content: space-between; flex-wrap: wrap; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <BarChart2 :size="20" />
          <span style="font-weight: 700; font-size: 1.1rem; color: #0d5c53;">📊 放射師年度上課工時統計</span>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <label style="font-size: 0.85rem; font-weight: 600;">統計年度：</label>
          <select v-model.number="statsYear" style="padding: 0.3rem 0.5rem; border: 1px solid #cbd5e1; border-radius: 6px; font-weight: 700;">
            <option v-for="y in yearOptions" :key="y" :value="y">{{ y }} 年（民國 {{ y - 1911 }} 年）</option>
          </select>
        </div>
      </div>

      <div class="table-container" style="margin-top: 0.8rem;">
        <table class="data-table">
          <thead>
            <tr>
              <th>員號</th>
              <th>放射師姓名</th>
              <th>上課次數</th>
              <th>上班時間內 (小時)</th>
              <th>年假上課 (小時)</th>
              <th>特休補足累計 (小時)</th>
              <th>年度額度使用</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="st in staffHoursStats" :key="st.id">
              <td>{{ st.id }}</td>
              <td><strong>{{ st.name }}</strong></td>
              <td><span class="badge" style="background: #f1f5f9; color: #334155;">{{ st.courseCount }} 次</span></td>
              <td>{{ st.onDutyHours }}</td>
              <td>{{ st.annualLeaveHours }}</td>
              <td>{{ st.topUpHours }}</td>
              <td>
                <div class="progress-bar-container">
                  <div
                    class="progress-bar-fill"
                    :style="{ width: Math.min((st.usedHours / EDU_YEARLY_QUOTA_HOURS) * 100, 100) + '%' }"
                    :class="{ 'is-completed': st.usedHours >= EDU_YEARLY_QUOTA_HOURS }"
                  ></div>
                  <span class="progress-text">
                    {{ st.usedHours >= EDU_YEARLY_QUOTA_HOURS ? '額度已用完 (' + st.usedHours + '/' + EDU_YEARLY_QUOTA_HOURS + 'h)' : '已用 ' + st.usedHours + ' / ' + EDU_YEARLY_QUOTA_HOURS + 'h（剩 ' + st.remainHours + 'h）' }}
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 上課紀錄清單 -->
    <div class="card card-glass" style="margin-top: 1rem;">
      <div class="card-title">
        <ListCheck :size="20" />
        <span>{{ statsYear }} 年度上課紀錄清單</span>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>放射師員號</th>
              <th>姓名</th>
              <th>上課日期</th>
              <th>上課方式</th>
              <th>上課時間</th>
              <th>下課時間</th>
              <th>計入額度</th>
              <th>特休補足</th>
              <th>上課名稱</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in yearRecords" :key="row.index">
              <td>{{ row.record.staffId }}</td>
              <td><strong>{{ getStaffName(row.record.staffId) }}</strong></td>
              <td>{{ row.date }}</td>
              <td>
                <span class="badge" :class="row.isAnnualLeave ? 'badge-warning' : 'badge-info'">{{ row.modeLabel }}</span>
              </td>
              <td><span class="badge badge-info">{{ row.record.startTime }}</span></td>
              <td><span class="badge badge-info">{{ row.record.endTime }}</span></td>
              <td><strong style="color: #0284c7;">{{ row.quotaHours }} h</strong></td>
              <td>{{ row.isAnnualLeave ? row.topUpHours + ' h' : '—' }}</td>
              <td>{{ row.record.courseName || row.record.note }}</td>
              <td>
                <button class="btn btn-danger" style="padding: 0.2rem 0.4rem; font-size: 0.75rem;" @click="removeRecord(row.index)">刪除</button>
              </td>
            </tr>
            <tr v-if="yearRecords.length === 0">
              <td colspan="10" style="color: #94a3b8; padding: 1.5rem;">{{ statsYear }} 年度尚無上課紀錄。</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { UserMinus, ListCheck, BarChart2 } from 'lucide-vue-next'
import { saveState } from '../core/storage.js'
import { validateBidding } from '../core/biddingEngine.js'
import { getShiftInterval } from '../core/shiftTime.js'
import {
  EDU_YEARLY_QUOTA_HOURS, EDU_LEAVE_DAY_HOURS, EDU_MODE_ON_DUTY, EDU_MODE_ANNUAL_LEAVE, EDU_MODE_LABELS, EDU_LEAVE_CODE,
  isEduRecord, isAnnualLeaveClass, getEduMode, getEduDate, getClassHours, getQuotaHours, getAnnualLeaveTopUpHours, getYearlyUsedHours
} from '../core/education.js'

const props = defineProps({
  staff: { type: Array, default: () => [] },
  leaves: { type: Array, default: () => [] },
  slotsArchive: { type: Object, default: () => ({}) },
  shiftDefs: { type: Object, default: () => ({}) },
  deptRules: { type: Object, default: () => ({}) },
  constraints: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['update:leaves'])

const round1 = (n) => Math.round(n * 10) / 10

// 僅過濾與連動「放射師」
const radiographers = computed(() => {
  return props.staff.filter(s => s.role === '放射師' && s.status === '在職')
})

const todayStr = (() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})()

const newRecord = ref({
  staffId: radiographers.value[0]?.id || props.staff[0]?.id || '',
  mode: EDU_MODE_ON_DUTY,
  date: todayStr,
  startTime: '08:00',
  endTime: '09:00',
  courseName: '20小時輻射防護繼續教育訓練'
})

const statsYear = ref(Number(todayStr.slice(0, 4)))

// 年度選單：今年前後一年，加上已有紀錄的年度
const yearOptions = computed(() => {
  const thisYear = Number(todayStr.slice(0, 4))
  const years = new Set([thisYear - 1, thisYear, thisYear + 1])
  props.leaves.filter(isEduRecord).forEach(l => {
    const y = Number(getEduDate(l).slice(0, 4))
    if (y) years.add(y)
  })
  return [...years].sort()
})

function getStaffName(id) {
  const s = props.staff.find(x => x.id === id)
  return s ? s.name : id
}

// 所有月份的班表合併（日期 ➜ 班別格子），用來查當天有沒有排班與套用排班規則
const allSlots = computed(() => Object.assign({}, ...Object.values(props.slotsArchive || {})))

function getAssignedSlot(staffId, dateStr) {
  return (allSlots.value[dateStr] || []).find(s => Array.isArray(s.assignedStaffIds) && s.assignedStaffIds.includes(staffId)) || null
}

// 登記前試算（額度、特休補足、時間是否合理）
const draftSummary = computed(() => {
  const r = { ...newRecord.value, type: 'rad_edu' }
  const classHours = getClassHours(r)
  const year = Number(String(r.date || '').slice(0, 4))
  if (!r.date || !year) return { error: '請選擇上課日期' }
  if (!classHours) return { error: '下課時間必須晚於上課時間' }
  const quotaHours = getQuotaHours(r)
  const usedHours = getYearlyUsedHours(props.leaves, r.staffId, year)
  const remainAfter = round1(EDU_YEARLY_QUOTA_HOURS - usedHours - quotaHours)
  const summary = {
    year,
    classHours: round1(classHours),
    quotaHours: round1(quotaHours),
    topUpHours: round1(getAnnualLeaveTopUpHours(r)),
    usedHours: round1(usedHours),
    remainAfter
  }
  if (remainAfter < 0) {
    summary.error = `${year} 年度額度不足：已用 ${summary.usedHours} 小時，剩 ${round1(EDU_YEARLY_QUOTA_HOURS - usedHours)} 小時，本次需 ${summary.quotaHours} 小時，超過 ${EDU_YEARLY_QUOTA_HOURS} 小時不能再登記`
  }
  return summary
})

// 年度統計
const staffHoursStats = computed(() => {
  return radiographers.value.map(s => {
    const mine = props.leaves.filter(l => isEduRecord(l) && l.staffId === s.id && getEduDate(l).slice(0, 4) === String(statsYear.value))
    const sum = (list, fn) => round1(list.reduce((total, l) => total + fn(l), 0))
    const usedHours = sum(mine, getQuotaHours)
    return {
      id: s.id,
      name: s.name,
      courseCount: mine.length,
      onDutyHours: sum(mine.filter(l => !isAnnualLeaveClass(l)), getQuotaHours),
      annualLeaveHours: sum(mine.filter(isAnnualLeaveClass), getQuotaHours),
      topUpHours: sum(mine, getAnnualLeaveTopUpHours),
      usedHours,
      remainHours: round1(Math.max(EDU_YEARLY_QUOTA_HOURS - usedHours, 0))
    }
  })
})

// 所選年度的紀錄（保留在原陣列中的位置，供刪除使用）
const yearRecords = computed(() => {
  return props.leaves
    .map((record, index) => ({ record, index }))
    .filter(({ record }) => isEduRecord(record) && getEduDate(record).slice(0, 4) === String(statsYear.value))
    .map(({ record, index }) => ({
      record,
      index,
      date: getEduDate(record),
      isAnnualLeave: isAnnualLeaveClass(record),
      modeLabel: EDU_MODE_LABELS[getEduMode(record)],
      quotaHours: round1(getQuotaHours(record)),
      topUpHours: round1(getAnnualLeaveTopUpHours(record))
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
})

function commit(updated) {
  emit('update:leaves', updated)
  saveState('leaves', updated)
}

function addRecord() {
  const r = newRecord.value
  if (!r.courseName) {
    alert('請輸入上課名稱')
    return
  }
  const summary = draftSummary.value
  if (summary.error) {
    alert('⚠️ ' + summary.error)
    return
  }

  const staffObj = props.staff.find(x => x.id === r.staffId)
  const staffName = getStaffName(r.staffId)
  const assigned = getAssignedSlot(r.staffId, r.date)
  const sameDayAnnualLeave = props.leaves.some(l => l.staffId === r.staffId && isAnnualLeaveClass(l) && getEduDate(l) === r.date)

  if (r.mode === EDU_MODE_ANNUAL_LEAVE) {
    if (sameDayAnnualLeave) {
      alert(`⚠️ ${staffName} 在 ${r.date} 已登記過年假上課，同一天只能登記一筆。`)
      return
    }
    if (assigned) {
      alert(`⚠️ ${staffName} 在 ${r.date} 已排 [${assigned.shiftCode}] 班，不能登記為年假上課。\n如果是在上班時間內去上課，請改選「上班時間內上課」；否則請先退掉當天的班。`)
      return
    }
    // 年假上課當天比照公假算上班：套用與選班相同的規則（11 小時休息、連續上班天數、大夜後休假）
    if (staffObj) {
      const val = validateBidding({
        staff: staffObj,
        slot: { id: 'edu', shiftCode: EDU_LEAVE_CODE, capacity: 99, requiredSkill: null, assignedStaffIds: [] },
        dateStr: r.date,
        slotsByDate: allSlots.value,
        staffList: props.staff,
        leaves: props.leaves,
        constraints: props.constraints,
        customShiftDefs: props.shiftDefs,
        deptRules: props.deptRules
      })
      if (!val.valid) {
        alert(val.error)
        return
      }
    }
  } else {
    if (sameDayAnnualLeave) {
      alert(`⚠️ ${staffName} 在 ${r.date} 已登記年假上課，當天不是上班日，不能再登記上班時間內上課。`)
      return
    }
    const def = assigned ? props.shiftDefs[assigned.shiftCode] : null
    const isWorkShift = !!def && !!def.targetRole && !!getShiftInterval(def)
    if (!isWorkShift) {
      const reason = assigned ? `當天排的是 [${assigned.shiftCode}]，不是出勤班別` : '系統裡當天沒有排班'
      if (!confirm(`${staffName} 在 ${r.date} ${reason}。\n\n如果當天其實沒有上班，請按「取消」，改選「年假上課」。\n確定仍要登記為「上班時間內上課」嗎？`)) return
    }
  }

  const record = {
    staffId: r.staffId,
    date: r.date,
    start: r.date,
    end: r.date,
    startTime: r.startTime,
    endTime: r.endTime,
    courseName: r.courseName,
    note: r.courseName,
    mode: r.mode,
    type: 'rad_edu'
  }

  commit([...props.leaves, record])
  statsYear.value = summary.year
  const extra = r.mode === EDU_MODE_ANNUAL_LEAVE ? `，需用特休補 ${summary.topUpHours} 小時` : ''
  alert(`✅ 已新增 [${staffName}] 的${EDU_MODE_LABELS[r.mode]}紀錄：${r.courseName}\n計入額度 ${summary.quotaHours} 小時${extra}；${summary.year} 年度剩 ${summary.remainAfter} 小時。`)
}

function removeRecord(index) {
  if (confirm('確定刪除此筆上課紀錄嗎？')) {
    const updated = [...props.leaves]
    updated.splice(index, 1)
    commit(updated)
  }
}
</script>

<style scoped>
.edu-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 0.3rem;
}

.edu-field {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
}

.edu-rules {
  margin-top: 0.6rem;
  padding: 0.6rem 0.8rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.82rem;
  color: #475569;
  line-height: 1.6;
}

.edu-preview {
  padding: 0.5rem 0.8rem;
  border-radius: 6px;
  background: #f0fdf4;
  border: 1px solid #86efac;
  color: #166534;
  font-size: 0.85rem;
}

.edu-preview.is-error {
  background: #fef2f2;
  border-color: #fca5a5;
  color: #991b1b;
  font-weight: 600;
}

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
  max-width: 260px;
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
