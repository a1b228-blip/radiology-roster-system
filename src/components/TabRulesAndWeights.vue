<template>
  <div class="tab-panel">
    <!-- 科內排班基準：實際連動同仁選班驗證 -->
    <div class="card card-glass" style="margin-bottom: 1rem;">
      <div class="card-title" style="flex-wrap: wrap; gap: 10px;">
        <ShieldCheck :size="22" />
        <span style="font-weight: 800; font-size: 1.15rem; color: #0d5c53;">科內排班基準</span>
        <span style="font-size: 0.8rem; color: #64748b; font-weight: 500;">違反時系統直接擋下；修改後立即生效</span>
      </div>
      <p style="font-size: 0.85rem; color: #64748b; margin: 0.4rem 0 0.8rem 0;">
        法規底線固定不可調；科內標準可以調整，但只能比法規嚴格（填得比法規寬鬆時，系統仍以法規為準）。
      </p>
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>規則</th>
              <th style="width: 180px; text-align: center;">法規底線（固定）</th>
              <th style="width: 220px; text-align: center;">科內標準</th>
              <th>說明</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="font-weight: 700;">連續上班天數上限</td>
              <td style="text-align: center;">{{ LEGAL_MAX_CONSECUTIVE_WORK_DAYS }} 天</td>
              <td style="text-align: center;">
                <input type="number" class="dept-input" v-model.number="localDept.maxConsecutiveWorkDays" min="1" :max="LEGAL_MAX_CONSECUTIVE_WORK_DAYS" @change="updateDeptRules" /> 天
              </td>
              <td>特休、公假都算上班；休假（沒排班）才會中斷。</td>
            </tr>
            <tr>
              <td style="font-weight: 700;">小夜班</td>
              <td style="text-align: center;">無規定</td>
              <td style="text-align: center;">
                每月最多 <input type="number" class="dept-input" v-model.number="localDept.eveningMaxRunsPerMonth" min="0" max="31" @change="updateDeptRules" /> 輪，
                每輪最多 <input type="number" class="dept-input" v-model.number="localDept.eveningMaxRunLength" min="1" :max="LEGAL_MAX_CONSECUTIVE_WORK_DAYS" @change="updateDeptRules" /> 天
              </td>
              <td>連續排的小夜班算同一輪。哪些班算小夜，在班別設定的「夜班類別」指定。</td>
            </tr>
            <tr>
              <td style="font-weight: 700;">大夜班</td>
              <td style="text-align: center;">無規定</td>
              <td style="text-align: center;">
                每月最多 <input type="number" class="dept-input" v-model.number="localDept.nightMaxRunsPerMonth" min="0" max="31" @change="updateDeptRules" /> 輪，
                每輪最多 <input type="number" class="dept-input" v-model.number="localDept.nightMaxRunLength" min="1" :max="LEGAL_MAX_CONSECUTIVE_WORK_DAYS" @change="updateDeptRules" /> 天
              </td>
              <td>連續排的大夜班算同一輪。</td>
            </tr>
            <tr>
              <td style="font-weight: 700;">大夜班後休假</td>
              <td style="text-align: center;">間隔 11 小時</td>
              <td style="text-align: center;">
                <label style="cursor: pointer; font-weight: 600;">
                  <input type="checkbox" v-model="localDept.restDayAfterNight" @change="updateDeptRules" /> 隔天必須休假
                </label>
              </td>
              <td>大夜班隔天必須休假，再隔一天才能接白班（中午前上班的班別，含公假）。隔天續上大夜不受限。</td>
            </tr>
            <tr>
              <td style="font-weight: 700;">班與班休息間隔</td>
              <td style="text-align: center;">至少 11 小時</td>
              <td style="text-align: center;">依班別時間自動計算</td>
              <td>半天班隔天不可接大夜等規定，在班別設定的「休息起算時間」調整。</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 系統實際檢查的規則一覽（只列真的有連動的，不可關閉） -->
    <div class="card card-glass">
      <div class="card-title" style="flex-wrap: wrap; gap: 10px;">
        <ShieldCheck :size="22" />
        <span style="font-weight: 800; font-size: 1.15rem; color: #0d5c53;">系統實際檢查的規則一覽</span>
        <span style="font-size: 0.8rem; color: #64748b; font-weight: 500;">同仁選班、人工指定班別、年假上課登記與全月合規總檢查，用的都是這一套</span>
      </div>
      <div class="table-container" style="margin-top: 0.8rem;">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 110px; text-align: center;">類別</th>
              <th>規則</th>
              <th style="width: 220px;">目前標準</th>
              <th style="width: 220px;">在哪裡設定</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, idx) in enforcedRules" :key="idx">
              <td style="text-align: center;"><span class="rule-category" :class="'cat-' + r.category">{{ r.category }}</span></td>
              <td style="font-weight: 600;">{{ r.name }}</td>
              <td>{{ r.standard }}</td>
              <td style="color: #64748b;">{{ r.where }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p style="font-size: 0.8rem; color: #64748b; margin-top: 0.6rem;">
        尚未實作的法規項目：每四週正常工時 160 小時上限、每二週 2 日例假、每四週 8 日休假、妊娠或哺乳期間夜間工作限制。詳見 docs/勞基法排班規則草案.md。
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ShieldCheck } from 'lucide-vue-next'
import { saveState } from '../core/storage.js'
import { MIN_REST_HOURS } from '../core/shiftTime.js'
import { normalizeDeptRules, LEGAL_MAX_CONSECUTIVE_WORK_DAYS } from '../core/deptRules.js'

const props = defineProps({
  deptRules: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['update:deptRules'])

// 科內排班基準：修改後立即套用（normalizeDeptRules 會擋掉比法規寬鬆或不合理的數字）
const localDept = ref(normalizeDeptRules(props.deptRules))

watch(() => props.deptRules, (newVal) => {
  localDept.value = normalizeDeptRules(newVal)
}, { deep: true })

function updateDeptRules() {
  const cleaned = normalizeDeptRules(localDept.value)
  localDept.value = cleaned
  emit('update:deptRules', cleaned)
  saveState('deptRules', cleaned)
}

// 系統實際有在檢查的規則（與 biddingEngine.js、deptRules.js 的檢查項目一一對應）
const enforcedRules = computed(() => {
  const d = localDept.value
  return [
    { category: '勞基法', name: '班與班之間休息至少 11 小時', standard: `${MIN_REST_HOURS} 小時（依班別上下班時間計算）`, where: '班別與時間段設定' },
    { category: '科內規定', name: '半天班等班別視同較晚下班起算休息（例：半天班隔天不可接大夜）', standard: '依各班別的「休息起算時間」', where: '班別與時間段設定' },
    { category: '科內規定', name: '連續上班天數上限（特休、公假、年假上課都算上班）', standard: `最多 ${d.maxConsecutiveWorkDays} 天`, where: '本頁上方' },
    { category: '科內規定', name: '小夜班每月輪數與每輪連續天數', standard: `每月 ${d.eveningMaxRunsPerMonth} 輪，每輪 ${d.eveningMaxRunLength} 天`, where: '本頁上方' },
    { category: '科內規定', name: '大夜班每月輪數與每輪連續天數', standard: `每月 ${d.nightMaxRunsPerMonth} 輪，每輪 ${d.nightMaxRunLength} 天`, where: '本頁上方' },
    { category: '科內規定', name: '大夜班隔天必須休假，再隔一天才能接白班', standard: d.restDayAfterNight ? '啟用' : '未啟用', where: '本頁上方' },
    { category: '資格', name: '職類相符（放射師／護理人員／書記只能排自己職類的班）', standard: '依班別的適用職類', where: '班別與時間段設定' },
    { category: '資格', name: '專長資格（具備該班要求的專長才能排）', standard: '依班別的專業資格要求', where: '人員檔案、班別與時間段設定' },
    { category: '資格', name: '夜班資格（小夜、大夜班須勾選可上夜班）', standard: '依人員檔案', where: '人員檔案、班別的夜班類別' },
    { category: '資格', name: '六日資格（放射師須勾選可值六日才能排週六、週日班）', standard: '依人員檔案', where: '人員檔案' },
    { category: '資格', name: '在職狀態（停用／留停不可排班）', standard: '依人員檔案', where: '人員檔案' },
    { category: '開班', name: '每班名額（額滿不可再排）', standard: '依班別的每班名額', where: '班別與時間段設定' },
    { category: '開班', name: '一人一天只能排一個班；請假或年假上課當天不可排班', standard: '固定', where: '—' },
    { category: '開班', name: '國定假日只開有勾選「國定假日開班」的班別', standard: '依國定假日清單', where: '班別與時間段設定' }
  ]
})
</script>

<style scoped>
.rule-category { display: inline-block; padding: 1px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; background: #e2e8f0; color: #334155; }
.rule-category.cat-勞基法 { background: #dc2626; color: white; }
.rule-category.cat-科內規定 { background: #d97706; color: white; }
.rule-category.cat-資格 { background: #0d5c53; color: white; }

.dept-input {
  width: 56px;
  text-align: center;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  padding: 0.15rem 0.2rem;
  font-weight: 700;
}

</style>
