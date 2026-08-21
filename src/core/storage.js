/**
 * 本地儲存與備份管理 (storage.js)
 */
const STORAGE_PREFIX = 'radRoster_v1_'

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
  downloadAnchor.setAttribute("download", `放射診斷科排班備份_${new Date().toISOString().slice(0,10)}.json`)
  document.body.appendChild(downloadAnchor)
  downloadAnchor.click()
  downloadAnchor.remove()
}

export function importBackupJSON(file, callback) {
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result)
      callback(data)
    } catch (err) {
      alert('備份檔案讀取失敗，格式不符。')
    }
  }
  reader.readAsText(file)
}
