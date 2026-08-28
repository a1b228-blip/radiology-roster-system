<template>
  <div class="tab-panel">
    <div class="card card-glass">
      <div class="card-title" style="justify-content: space-between; flex-wrap: wrap; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <ShieldCheck :size="22" />
          <span style="font-weight: 800; font-size: 1.15rem; color: #0d5c53;">排班合規、營運計畫與權重規範設定</span>
        </div>

        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <!-- 📥 下載 Excel 設定檔 -->
          <button class="btn btn-outline" style="font-size: 0.85rem;" @click="handleExportRulesExcel">
            <Download :size="15" />
            <span>📥 下載 Excel 設定檔</span>
          </button>

          <!-- 📤 上傳 Excel 同步排班規範 -->
          <label class="btn btn-outline" style="font-size: 0.85rem; cursor: pointer; background: #f0fdf4; border-color: #86efac; color: #166534;">
            <Upload :size="15" />
            <span>📤 上傳 Excel 同步排班規範</span>
            <input type="file" accept=".xlsx, .xls" @change="handleImportRulesExcel" style="display: none;" />
          </label>

          <!-- 💾 儲存設定 -->
          <button class="btn btn-primary" style="font-size: 0.85rem; font-weight: 700; background: #0d5c53; border-color: #0d5c53;" @click="saveSettings">
            <Save :size="15" />
            <span>儲存設定</span>
          </button>
        </div>
      </div>

      <p style="font-size: 0.85rem; color: #64748b; margin-top: 0.4rem; margin-bottom: 1.2rem;">
        主管可在此自由設置<b>勞基法剛性條款、醫療業四週變形工時與放射科營運計畫</b>。權重設置為 <b>100%</b> 時屬硬性紅線（同仁自主選班觸犯時<b>系統將全自動跳出警示並禁止選填</b>）。您亦可在 Excel 表格中更新後隨時匯入同步！
      </p>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 80px; text-align: center;">編號</th>
              <th style="width: 140px; text-align: center;">規範分類</th>
              <th>排班規範與營運計畫名稱</th>
              <th style="width: 160px;">依據法規 / 院規</th>
              <th style="width: 110px; text-align: center;">權重 (%)</th>
              <th>觸犯時系統處理動作</th>
              <th style="width: 90px; text-align: center;">啟用狀態</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in localRules" :key="r.id" :class="{ 'is-disabled-row': !r.enabled }">
              <td style="text-align: center; font-weight: 800; font-family: monospace; color: #475569;">{{ r.id }}</td>
              <td style="text-align: center;">
                <span 
                  class="badge" 
                  :style="{ 
                    backgroundColor: getCategoryColor(r.category),
                    color: 'white',
                    fontWeight: '700',
                    fontSize: '11px' 
                  }"
                >
                  {{ r.category }}
                </span>
              </td>
              <td style="font-weight: 700; color: #0f172a;">
                <input v-model="r.name" style="width: 100%; border: 1px solid #cbd5e1; border-radius: 4px; padding: 3px 6px;" />
              </td>
              <td style="font-size: 0.82rem; color: #64748b;">
                <input v-model="r.lawRef" style="width: 100%; border: 1px solid #cbd5e1; border-radius: 4px; padding: 3px 6px;" />
              </td>
              <td style="text-align: center;">
                <input 
                  type="number" 
                  min="1" 
                  max="100" 
                  v-model.number="r.weight" 
                  style="width: 65px; text-align: center; font-weight: 800; border-radius: 4px; border: 1px solid #cbd5e1; padding: 3px;"
                  :style="{ color: r.weight === 100 ? '#dc2626' : '#d97706' }"
                />
              </td>
              <td style="font-size: 0.8rem;">
                <span v-if="r.weight === 100" style="color: #dc2626; font-weight: 800;">⛔ 硬性強制作業不可違反 (系統禁止選班)</span>
                <span v-else-if="r.weight >= 90" style="color: #ea580c; font-weight: 700;">⚠️ 營運保底提示與人力調配引導</span>
                <span v-else style="color: #ca8a04; font-weight: 600;">💡 黃色溫馨提示提醒</span>
              </td>
              <td style="text-align: center;">
                <input type="checkbox" v-model="r.enabled" style="transform: scale(1.2); cursor: pointer;" />
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
import { ShieldCheck, Download, Upload, Save } from 'lucide-vue-next'
import { saveState } from '../core/storage.js'
import { exportRulesToExcel, importRulesFromExcel } from '../core/exporter.js'

const props = defineProps({
  complianceRules: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:complianceRules'])

const localRules = ref(JSON.parse(JSON.stringify(props.complianceRules || [])))

watch(() => props.complianceRules, (newVal) => {
  localRules.value = JSON.parse(JSON.stringify(newVal || []))
}, { deep: true })

function getCategoryColor(cat) {
  if (cat === '勞基法剛性規範') return '#dc2626'
  if (cat === '四週變形工時') return '#e11d48'
  if (cat === '科內營運計畫') return '#0d5c53'
  if (cat === '院內健康關懷') return '#d97706'
  return '#64748b'
}

function saveSettings() {
  emit('update:complianceRules', localRules.value)
  saveState('complianceRules', localRules.value)
  alert('✅ 【排班合規、營運計畫與權重規範設定】已成功儲存！已 100% 自動連動全系統合規與選班警示檢核。')
}

function handleExportRulesExcel() {
  exportRulesToExcel(localRules.value)
}

async function handleImportRulesExcel(e) {
  const file = e.target.files[0]
  if (!file) return

  try {
    const importedRules = await importRulesFromExcel(file)
    if (importedRules && importedRules.length > 0) {
      localRules.value = importedRules
      emit('update:complianceRules', importedRules)
      saveState('complianceRules', importedRules)
      alert(`✅ 成功匯入並同步 ${importedRules.length} 條 Excel 排班規範與權重設定！`)
    } else {
      alert('⚠️ 未能從 Excel 中解析出有效之排班規範，請檢查檔案格式。')
    }
  } catch (err) {
    alert('❌ 匯入 Excel 失敗：' + err.message)
  }
}
</script>

<style scoped>
.is-disabled-row {
  opacity: 0.5;
  background: #f8fafc;
}
</style>
