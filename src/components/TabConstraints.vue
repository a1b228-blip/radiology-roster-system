<template>
  <div class="tab-panel">
    <div class="card">
      <div class="card-title">
        <ShieldCheck :size="20" />
        <span>排班硬性限制與合規檢核設定 (主管可自由開啟/關閉與修改參數)</span>
      </div>

      <div style="display: flex; flex-direction: column; gap: 1.2rem;">
        <!-- 1. 11 小時休息間隔 -->
        <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px solid #e2e8f0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <h4 style="font-weight: 700; color: #0d5c53;">1. 勞動基準法 11 小時班別休息間隔 (Rest Gap Constraint)</h4>
            <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer; font-size: 0.9rem; font-weight: 600;">
              <input type="checkbox" v-model="settings.enableRestGap" @change="emitUpdate" />
              <span>啟用 Rest Gap 檢核</span>
            </label>
          </div>
          <div style="display: flex; align-items: center; gap: 1rem; margin-top: 0.5rem;">
            <label style="font-size: 0.85rem; font-weight: 600;">最低法定休息小時數：</label>
            <input type="number" v-model.number="settings.restGapHours" @change="emitUpdate" min="8" max="24" style="width: 80px; padding: 0.3rem; border: 1px solid #cbd5e1; border-radius: 4px;" />
            <span style="font-size: 0.85rem; color: #64748b;">小時 (預設為 11 小時)</span>
          </div>
        </div>

        <!-- 2. 資深資淺搭檔 -->
        <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px solid #e2e8f0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <h4 style="font-weight: 700; color: #0d5c53;">2. 高階機台資深/資淺搭檔限制 (Seniority Pairing Constraint)</h4>
            <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer; font-size: 0.9rem; font-weight: 600;">
              <input type="checkbox" v-model="settings.enableSeniorPairing" @change="emitUpdate" />
              <span>啟用資深搭檔限制</span>
            </label>
          </div>
          <p style="font-size: 0.85rem; color: #475569;">
            啟用後，CT 與 MRI 檢查室將強制指派至少 1 位等級為「組長」或「資深」之放射師帶導。
          </p>
        </div>

        <!-- 3. 夜班月上限 -->
        <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px solid #e2e8f0;">
          <h4 style="font-weight: 700; color: #0d5c53; margin-bottom: 0.5rem;">3. 每人當月夜班上限設定 (Night Shift Ceiling)</h4>
          <div style="display: flex; align-items: center; gap: 1rem;">
            <label style="font-size: 0.85rem; font-weight: 600;">單人每月夜班 (N/GY) 上限：</label>
            <input type="number" v-model.number="settings.maxNightShiftsPerMonth" @change="emitUpdate" min="1" max="15" style="width: 80px; padding: 0.3rem; border: 1px solid #cbd5e1; border-radius: 4px;" />
            <span style="font-size: 0.85rem; color: #64748b;">班 (超過此上限演算法將發出警示並進行平準)</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ShieldCheck } from 'lucide-vue-next'

const props = defineProps({
  constraints: { 
    type: Object, 
    default: () => ({
      enableRestGap: true,
      restGapHours: 11,
      enableSeniorPairing: true,
      maxNightShiftsPerMonth: 6
    }) 
  }
})

const emit = defineEmits(['update:constraints'])

const settings = ref({ ...props.constraints })

watch(() => props.constraints, (newVal) => {
  settings.value = { ...newVal }
}, { deep: true })

function emitUpdate() {
  emit('update:constraints', { ...settings.value })
}
</script>
