<template>
  <div class="tab-panel">
    <div class="card">
      <div class="card-title">
        <Clock :size="20" />
        <span>放射診斷科 班別代碼與出勤時間規格定義</span>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>班別代號</th>
              <th>班別名稱</th>
              <th>出勤時間</th>
              <th>對應檢查室 / 區域</th>
              <th>需具備資深帶導</th>
              <th>所需專業資格</th>
              <th>說明與工時備註</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(info, code) in shifts" :key="code">
              <td><span class="badge" :style="{ backgroundColor: info.color, color: 'white' }">{{ code }}</span></td>
              <td><strong>{{ info.name }}</strong></td>
              <td>{{ info.time }}</td>
              <td>{{ info.room }}</td>
              <td>{{ info.needsSenior ? '✅ 需資深/組長' : '一般可' }}</td>
              <td><span class="badge badge-primary">{{ info.modKey ? info.modKey.toUpperCase() : '無特殊' }}</span></td>
              <td style="text-align: left; font-size: 0.85rem; color: #64748b;">
                {{ getShiftNote(code) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Clock } from 'lucide-vue-next'
import { SHIFT_DEFS } from '../core/types.js'

const shifts = SHIFT_DEFS

function getShiftNote(code) {
  const notes = {
    'D_CT': 'CT 電腦斷層檢查室，包含對比劑注射與高階攝影，需 1 位資深帶導。',
    'D_MRI': 'MRI 核磁共振檢查室，需具備 MRI 證照，需 1 位資深帶導。',
    'D_ANGIO': '血管攝影與介入性放射治療 (IR)，配合導管室，具備 Angio 資格。',
    'D_DR': '一般門診與住院 X 光攝影房，每房配置 1–2 人。',
    'E_NIGHT': '急診小夜班 (16:00–24:00)，負責晚間急診及緊急 CT 檢查。',
    'G_NIGHT': '急診大夜班 (00:00–08:00)，24h 急診大夜，享 11h Rest Gap 自動順延。',
    'CALL': '血管攝影 24h 緊急 On-Call 待命班。',
    'SAT_D': '週六門診半日班 (08:00–12:30)。',
    'OFF': '休息日或個人請假。'
  }
  return notes[code] || ''
}
</script>
