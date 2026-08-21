<template>
  <header class="app-header">
    <div class="brand">
      <div class="brand-icon">
        <Activity :size="24" />
      </div>
      <div>
        <h1 class="brand-title">放射診斷科一鍵排班系統 v1.0</h1>
        <div class="brand-subtitle">100% 離線運作 • 機台資格搭檔 • 勞基法 11h 休息檢核 • 原生 Excel 匯出</div>
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

      <!-- 列印按鈕 -->
      <button class="btn btn-outline" @click="$emit('print')">
        <Printer :size="16" />
        <span>列印班表</span>
      </button>

      <!-- 匯出 Excel 按鈕 -->
      <button class="btn btn-primary" @click="$emit('export-excel')">
        <FileSpreadsheet :size="16" />
        <span>匯出 Excel</span>
      </button>

      <!-- 備份資料按鈕 -->
      <button class="btn btn-secondary" @click="$emit('backup-json')">
        <Download :size="16" />
        <span>下載備份</span>
      </button>

      <!-- 載入備份按鈕 -->
      <label class="btn btn-secondary" style="cursor: pointer;">
        <Upload :size="16" />
        <span>載入備份</span>
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
