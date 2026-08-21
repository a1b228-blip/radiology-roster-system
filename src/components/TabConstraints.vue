<template>
  <div class="tab-panel">
    <div class="card">
      <div class="card-title">
        <ShieldCheck :size="20" />
        <span>排班硬性限制與勞基法合規檢核設定</span>
      </div>

      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px solid #e2e8f0;">
          <h4 style="font-weight: 700; color: #0d5c53; margin-bottom: 0.4rem;">1. 勞動基準法 11 小時班別休息間隔 (Rest Gap >= 11 Hours)</h4>
          <p style="font-size: 0.85rem; color: #475569;">
            演算法會自動檢查急診小夜班 (E_NIGHT) 與急診大夜班 (G_NIGHT) 下班時間。急診大夜班 (00:00–08:00) 下班後隔日強制排 OFF 休息；急診小夜班 (16:00–24:00) 隔日上班時間需相隔滿 11 小時，若無法滿足將在產生班表時發出預警。
          </p>
        </div>

        <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px solid #e2e8f0;">
          <h4 style="font-weight: 700; color: #0d5c53; margin-bottom: 0.4rem;">2. 高階機台資深/資淺搭檔限制 (Seniority-Junior Pairing Constraint)</h4>
          <p style="font-size: 0.85rem; color: #475569;">
            CT 電腦斷層房與 MRI 核磁共振房涉及造影劑注射、急症識別與高階影像處置，演算法強制規定每日 CT 房與 MRI 房**必須至少指派 1 位等級為「資深」或「組長」之放射師**帶導。
          </p>
        </div>

        <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px solid #e2e8f0;">
          <h4 style="font-weight: 700; color: #0d5c53; margin-bottom: 0.4rem;">3. 機台操作資格對照 (Modality Qualification Check)</h4>
          <p style="font-size: 0.85rem; color: #475569;">
            所有放射師僅能被指派至具備操作資格 (CT / MRI / Angio / Mammo) 的機台檢查室。未具備資格者（如新進人員）將自動排往一般 DR 門診房。
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ShieldCheck } from 'lucide-vue-next'
</script>
