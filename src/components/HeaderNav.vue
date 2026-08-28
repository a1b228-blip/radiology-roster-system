<template>
  <header class="app-header">
    <div class="brand">
      <div class="brand-icon">
        <Activity :size="24" />
      </div>
      <div>
        <h1 class="brand-title">佳里奇美醫院 放射科排班系統 V2.0</h1>
        <div class="brand-subtitle">自主選班 2.0 • 管理者開班格子 • 跨職類隔離 • 雙向即時驗證 • 100% 離線</div>
      </div>
    </div>

    <div class="header-actions no-print">
      <!-- 字級縮放拉霸 -->
      <div class="slider-group">
        <Type :size="16" />
        <span>字級: {{ fontScale }}x</span>
        <input 
          type="range" 
          min="1.0" 
          max="1.75" 
          step="0.1" 
          :value="fontScale" 
          @input="$emit('update:fontScale', parseFloat($event.target.value))"
        />
      </div>

      <!-- 標示手動修改 Toggle -->
      <label class="btn btn-secondary" style="font-size: 0.85rem; cursor: pointer;">
        <input 
          type="checkbox" 
          :checked="showEditHighlight" 
          @change="$emit('update:showEditHighlight', $event.target.checked)"
          style="margin-right: 4px;"
        />
        <span>標示手動修改</span>
      </label>



      <!-- 💾 一鍵儲存 / 下載系統設定檔 -->
      <button 
        class="btn btn-primary" 
        style="background: #0d5c53; border-color: #0d5c53; font-weight: 700;" 
        @click="$emit('backup-json')"
        title="將全科名冊、班別定義、請假與選班結果打包下載為 JSON 備份檔"
      >
        <Download :size="16" />
        <span>💾 下載系統設定檔</span>
      </button>

      <!-- 📥 一鍵匯入 / 還原系統設定檔 -->
      <label 
        class="btn btn-primary" 
        style="background: #0284c7; border-color: #0284c7; font-weight: 700; cursor: pointer;"
        title="選取 JSON 備份檔，一鍵還原系統全域設定與排班狀態"
      >
        <Upload :size="16" />
        <span>📥 一鍵還原設定檔</span>
        <input type="file" accept=".json" style="display: none;" @change="$emit('load-backup', $event)" />
      </label>
    </div>
  </header>
</template>

<script setup>
import { Activity, Type, Printer, FileSpreadsheet, Download, Upload } from 'lucide-vue-next'

defineProps({
  fontScale: { type: Number, default: 1.0 },
  showEditHighlight: { type: Boolean, default: true }
})

defineEmits(['update:fontScale', 'update:showEditHighlight', 'print', 'export-excel', 'backup-json', 'load-backup'])
</script>
