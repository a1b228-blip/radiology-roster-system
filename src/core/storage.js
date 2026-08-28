/**
 * 本地儲存與備份管理 (storage.js)
 * 支援佳里奇美醫院 放射科排班系統 V2.0 完整全系統設定檔打包下載與一鍵還原
 */
const STORAGE_PREFIX = 'radRoster_v2_'

export function loadState(key, defaultValue) {
  try {
    const data = localStorage.getItem(STORAGE_PREFIX + key)
    return data ? JSON.parse(data) : defaultValue
  } catch (err) {
    console.warn('LocalStorage 讀取失敗:', err)
    return defaultValue
  }
}

export function saveState(key, value) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
  } catch (err) {
    console.error('LocalStorage 寫入失敗:', err)
  }
}

export function exportBackupJSON(stateData) {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(stateData, null, 2))
  const downloadAnchor = document.createElement('a')
  downloadAnchor.setAttribute("href", dataStr)
  const fileName = `佳里奇美放射科排班系統V2.0_全系統設定備份檔_${stateData.year || 2026}年${stateData.month || 9}月.json`
  downloadAnchor.setAttribute("download", fileName)
  document.body.appendChild(downloadAnchor)
  downloadAnchor.click()
  downloadAnchor.remove()
  alert(`✅ 系統設定檔 [${fileName}] 已成功打包下載！\n包含：人員主檔、班別定義、請假事件、合規規則與全月排班格子狀態。`)
}

export function importBackupJSON(file, callback) {
  if (!confirm(`⚠️ 確定要一鍵還原設定檔 [${file.name}] 嗎？\n還原後現有的同仁名冊、班別時間與排班格子將被完全覆蓋更新！`)) {
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result)
      callback(data)
      alert(`🎉 系統設定檔還原成功！全系統資料與排班狀態已 100% 完成一鍵復原！`)
    } catch (err) {
      alert('❌ 備份檔案讀取失敗，JSON 格式損壞或不相容。')
    }
  }
  reader.readAsText(file)
}
