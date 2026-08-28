<template>
  <div class="tab-panel">
    <div class="card card-glass">
      <div class="card-title" style="justify-content: space-between; flex-wrap: wrap; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <Award :size="20" />
          <span style="font-weight: 700; font-size: 1.1rem; color: #0d5c53;">放射師第二專長月需求天數設定</span>
        </div>

        <button class="btn btn-primary" style="font-size: 0.85rem; font-weight: 700; background: #0d5c53; border-color: #0d5c53;" @click="saveSettings">
          <Save :size="15" />
          <span>儲存設定</span>
        </button>
      </div>

      <p style="font-size: 0.85rem; color: #64748b; margin-top: 0.4rem; margin-bottom: 1rem;">
        本頁面自動僅列出具有<b>第二專長 (MRI、乳房攝影、特殊攝影、超音波、骨密牙科、心臟 CT)</b> 之放射師。主管可在此設定同仁每月需上滿的專長天數，系統將在「同仁自主選班」中提示並引導同仁優先選滿。
      </p>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 100px; text-align: center;">員號</th>
              <th style="width: 120px; text-align: center;">放射師姓名</th>
              <th style="width: 100px; text-align: center;">資歷層級</th>
              <th>具備之第二專長儀器</th>
              <th>當月第二專長最低指定天數 (天/月)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in qualifiedStaff" :key="s.id">
              <td style="text-align: center; font-weight: 700; font-family: monospace; color: #475569;">{{ s.id }}</td>
              <td style="text-align: center; font-weight: 800; color: #0f172a;">{{ s.name }}</td>
              <td style="text-align: center;">
                <span class="badge" style="background: #f1f5f9; color: #334155; font-size: 0.8rem;">{{ s.level }}</span>
              </td>
              <td>
                <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                  <span v-if="s.cct" class="skill-tag-secondary">心臟 CT</span>
                  <span v-if="s.mri" class="skill-tag-secondary">MRI</span>
                  <span v-if="s.angio" class="skill-tag-secondary">特殊攝影</span>
                  <span v-if="s.mammo" class="skill-tag-secondary">乳房攝影</span>
                  <span v-if="s.bmd" class="skill-tag-secondary">骨密牙科</span>
                  <span v-if="s.us" class="skill-tag-secondary">超音波</span>
                </div>
              </td>
              <td>
                <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
                  <div v-for="sk in getStaffSecondarySkills(s)" :key="sk.key" style="display: flex; align-items: center; gap: 4px;">
                    <span style="font-size: 0.82rem; font-weight: 700; color: #0369a1;">{{ sk.name }}：</span>
                    <input 
                      type="number" 
                      min="0" 
                      max="31" 
                      v-model.number="getTargetRef(s.id)[sk.key]" 
                      style="width: 60px; padding: 3px 6px; text-align: center; border: 1px solid #38bdf8; border-radius: 6px; font-weight: 700; color: #0c4a6e;" 
                    />
                    <span style="font-size: 0.8rem; color: #64748b;">天/月</span>
                  </div>
                </div>
              </td>
            </tr>
            <tr v-if="qualifiedStaff.length === 0">
              <td colspan="5" style="text-align: center; color: #94a3b8; padding: 2rem;">目前尚無具備第二專長之放射師人員。</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Award, Save } from 'lucide-vue-next'
import { saveState } from '../core/storage.js'

const props = defineProps({
  staff: { type: Array, default: () => [] },
  specialtyTargets: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['update:specialtyTargets'])

const localTargets = ref(JSON.parse(JSON.stringify(props.specialtyTargets || {})))

// 只列出具備「第二專長」的放射師
const qualifiedStaff = computed(() => {
  return props.staff.filter(s => {
    if (s.role !== '放射師' || s.status !== '在職') return false
    return !!(s.mri || s.mammo || s.angio || s.us || s.bmd || s.cct)
  })
})

const secondarySkillMap = [
  { key: 'cct', name: '心臟 CT' },
  { key: 'mri', name: 'MRI 磁振造影' },
  { key: 'angio', name: '特殊攝影' },
  { key: 'mammo', name: '乳房攝影' },
  { key: 'bmd', name: '骨密牙科' },
  { key: 'us', name: '超音波' }
]

function getStaffSecondarySkills(s) {
  return secondarySkillMap.filter(sk => !!s[sk.key])
}

function getTargetRef(staffId) {
  if (!localTargets.value[staffId]) {
    localTargets.value[staffId] = { us: 0, mri: 0, angio: 0, mammo: 0, bmd: 0, cct: 0 }
  }
  return localTargets.value[staffId]
}

watch(() => props.specialtyTargets, (newVal) => {
  localTargets.value = JSON.parse(JSON.stringify(newVal || {}))
}, { deep: true })

function saveSettings() {
  emit('update:specialtyTargets', localTargets.value)
  saveState('specialtyTargets', localTargets.value)
  alert('✅ 【放射師第二專長月需求設定】已成功儲存！已 100% 同步至「同仁自主選班」作為優先選填目標。')
}
</script>

<style scoped>
.skill-tag-secondary {
  background: #e0f2fe;
  color: #0369a1;
  border: 1px solid #7dd3fc;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}
</style>
