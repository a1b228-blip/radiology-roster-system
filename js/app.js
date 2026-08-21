/**
 * 放射診斷科排班系統 核心邏輯與 UI 控制器 (app.js)
 */

// 預設放射師主檔
const defaultStaffList = [
  { id: 'R1', name: '王組長', level: '組長', canNight: false, canSat: true, ct: true, mri: true, angio: true, mammo: false, note: '組長；行政與督導；支援高階攝影' },
  { id: 'R2', name: '陳資深', level: '資深', canNight: true,  canSat: true, ct: true, mri: true, angio: true, mammo: false, note: '主力；具 Angio On-Call 與 CT/MRI 執照' },
  { id: 'R3', name: '林資深', level: '資深', canNight: true,  canSat: true, ct: true, mri: true, angio: false, mammo: true, note: '主力；負責 MRI 房與 CT 房指導' },
  { id: 'R4', name: '張放射師', level: '常規', canNight: true, canSat: true, ct: true, mri: false, angio: false, mammo: false, note: '常規；負責 CT 房與一般 DR 房' },
  { id: 'R5', name: '李放射師', level: '常規', canNight: true, canSat: true, ct: false, mri: true, angio: false, mammo: true, note: '常規；負責 MRI 房與乳房攝影' },
  { id: 'R6', name: '趙放射師', level: '常規', canNight: true, canSat: true, ct: false, mri: false, angio: false, mammo: false, note: '一般 DR 房與門診發片窗口' },
  { id: 'R7', name: '新人甲', level: '新進', canNight: false, canSat: true, ct: false, mri: false, angio: false, mammo: false, note: '新人第一年；僅上門診 DR 白班' }
];

// 班別定義
const shiftDefs = {
  'D_CT':    { name: 'CT白班', time: '08:00-17:00', room: 'CT房' },
  'D_MRI':   { name: 'MRI白班', time: '08:00-17:00', room: 'MRI房' },
  'D_ANGIO': { name: 'Angio白班', time: '08:30-17:30', room: '血管攝影房' },
  'D_DR':    { name: 'DR白班', time: '08:00-17:00', room: '一般X光房' },
  'E_NIGHT': { name: '急診小夜', time: '16:00-24:00', room: '急診小夜' },
  'G_NIGHT': { name: '急診大夜', time: '00:00-08:00', room: '急診大夜' },
  'CALL':    { name: '24h OnCall', time: '08:00-08:00', room: 'On-Call' },
  'SAT_D':   { name: '週六白班', time: '08:00-12:30', room: '週六門診' },
  'OFF':     { name: '休假/例假', time: '-', room: '-' }
};

// 狀態容器
let appState = {
  year: 2026,
  month: 9,
  staff: [...defaultStaffList],
  roster: {}, // key: dateStr (YYYY-MM-DD), value: { staffId: shiftCode }
  manualEdits: {}, // key: "dateStr_staffId", value: true
  currentView: 'staff' // 'staff' | 'room'
};

// 初始化頁面
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initSlider();
  renderStaffTable();
  
  // 預設生成本月班表
  generateRoster();
});

// 頁籤導覽
function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      document.getElementById(targetId).classList.add('active');
    });
  });
}

// 字級拉霸控制
function initSlider() {
  const fontSlider = document.getElementById('fontSlider');
  const fontValue = document.getElementById('fontValue');
  
  fontSlider.addEventListener('input', (e) => {
    const val = e.target.value;
    fontValue.textContent = `${val}x`;
    document.documentElement.style.setProperty('--font-scale', val);
  });
  
  const toggleEditBg = document.getElementById('toggleEditBg');
  if (toggleEditBg) {
    toggleEditBg.addEventListener('change', (e) => {
      if (e.target.checked) {
        document.body.classList.add('show-edited-bg');
      } else {
        document.body.classList.remove('show-edited-bg');
      }
    });
  }
}

// 渲染放射師列表 (Tab 1)
function renderStaffTable() {
  const tbody = document.querySelector('#staffTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  appState.staff.forEach((s, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${s.id}</td>
      <td><strong>${s.name}</strong></td>
      <td><span class="badge">${s.level}</span></td>
      <td>${s.canNight ? '✅' : '❌'}</td>
      <td>${s.ct ? '✅' : '❌'}</td>
      <td>${s.mri ? '✅' : '❌'}</td>
      <td>${s.angio ? '✅' : '❌'}</td>
      <td style="text-align: left; font-size: 0.85rem; color: #94a3b8;">${s.note}</td>
    `;
    tbody.appendChild(tr);
  });
}

// 核心自動排班演算法
function generateRoster() {
  const daysInMonth = new Date(appState.year, appState.month, 0).getDate();
  appState.roster = {};
  appState.manualEdits = {};
  
  // 記錄夜班歷史以實作 11h Rest Gap
  let lastShift = {}; // staffId -> shiftCode of previous day

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${appState.year}-${String(appState.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateObj = new Date(appState.year, appState.month - 1, day);
    const dayOfWeek = dateObj.getDay(); // 0: Sun, 6: Sat
    
    appState.roster[dateStr] = {};
    
    if (dayOfWeek === 0) {
      // 週日全為 OFF
      appState.staff.forEach(s => {
        appState.roster[dateStr][s.id] = 'OFF';
      });
      continue;
    }

    if (dayOfWeek === 6) {
      // 週六門診班分派
      let available = appState.staff.filter(s => s.canSat);
      available.forEach((s, i) => {
        if (i < 4) {
          appState.roster[dateStr][s.id] = 'SAT_D';
        } else {
          appState.roster[dateStr][s.id] = 'OFF';
        }
      });
      continue;
    }

    // 平日班別分配邏輯 (單日輪調模式)
    let assigned = {};
    let nightEligible = appState.staff.filter(s => s.canNight && lastShift[s.id] !== 'G_NIGHT');
    
    // 1. 先排大夜班 G_NIGHT
    let gNightStaff = nightEligible[(day % nightEligible.length)];
    assigned[gNightStaff.id] = 'G_NIGHT';

    // 2. 再排小夜班 E_NIGHT
    let eNightEligible = nightEligible.filter(s => s.id !== gNightStaff.id);
    let eNightStaff = eNightEligible[((day + 1) % eNightEligible.length)];
    assigned[eNightStaff.id] = 'E_NIGHT';

    // 3. 確保 CT 房與 MRI 房至少有一位資深 (Senior / Group Leader)
    let seniorsAvailable = appState.staff.filter(s => (s.level === '資深' || s.level === '組長') && !assigned[s.id]);
    
    // 指派 CT 資深
    let ctSenior = seniorsAvailable.find(s => s.ct) || seniorsAvailable[0];
    if (ctSenior) assigned[ctSenior.id] = 'D_CT';
    
    // 指派 MRI 資深
    let mriSenior = seniorsAvailable.find(s => s.mri && s.id !== ctSenior?.id) || seniorsAvailable[1];
    if (mriSenior) assigned[mriSenior.id] = 'D_MRI';

    // 4. 其餘人員分配 Angio / DR / OFF
    appState.staff.forEach(s => {
      if (assigned[s.id]) {
        appState.roster[dateStr][s.id] = assigned[s.id];
        return;
      }

      // 檢查 Rest Gap 11h: 前日若為 G_NIGHT，今日硬性 OFF
      if (lastShift[s.id] === 'G_NIGHT') {
        appState.roster[dateStr][s.id] = 'OFF';
        return;
      }

      if (s.angio && !Object.values(assigned).includes('D_ANGIO')) {
        assigned[s.id] = 'D_ANGIO';
        appState.roster[dateStr][s.id] = 'D_ANGIO';
      } else {
        appState.roster[dateStr][s.id] = 'D_DR';
      }
    });

    // 更新前日記錄
    appState.staff.forEach(s => {
      lastShift[s.id] = appState.roster[dateStr][s.id];
    });
  }

  renderRosterGrid();
}

// 渲染班表主網格 (Tab 6)
function renderRosterGrid() {
  const container = document.getElementById('rosterGridContainer');
  if (!container) return;

  const daysInMonth = new Date(appState.year, appState.month, 0).getDate();
  
  let html = `<table class="roster-table"><thead><tr>`;
  
  if (appState.currentView === 'staff') {
    // 放射師個人視角
    html += `<th>放射師</th>`;
    for (let d = 1; d <= daysInMonth; d++) {
      html += `<th>${d}日</th>`;
    }
    html += `</tr></thead><tbody>`;

    appState.staff.forEach(s => {
      html += `<tr><td><strong>${s.name}</strong><br><small style="color:#94a3b8;">${s.level}</small></td>`;
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${appState.year}-${String(appState.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const shiftCode = appState.roster[dateStr]?.[s.id] || 'OFF';
        const isEdited = appState.manualEdits[`${dateStr}_${s.id}`];
        
        html += `<td class="${isEdited ? 'edited-cell' : ''}" onclick="onCellClick('${dateStr}', '${s.id}', '${shiftCode}')">
          ${shiftDefs[shiftCode]?.name || shiftCode}
        </td>`;
      }
      html += `</tr>`;
    });
  } else {
    // 機台檢查室視角
    const rooms = [
      { id: 'D_CT', name: 'CT房' },
      { id: 'D_MRI', name: 'MRI房' },
      { id: 'D_ANGIO', name: 'Angio房' },
      { id: 'D_DR', name: '一般DR房' },
      { id: 'E_NIGHT', name: '急診小夜' },
      { id: 'G_NIGHT', name: '急診大夜' }
    ];

    html += `<th>機台/檢查室</th>`;
    for (let d = 1; d <= daysInMonth; d++) {
      html += `<th>${d}日</th>`;
    }
    html += `</tr></thead><tbody>`;

    rooms.forEach(room => {
      html += `<tr><td><strong>${room.name}</strong></td>`;
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${appState.year}-${String(appState.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        // 尋找當天值該班別的人員
        const assignedStaff = appState.staff.filter(s => appState.roster[dateStr]?.[s.id] === room.id);
        const names = assignedStaff.map(s => s.name).join(', ') || '-';
        
        html += `<td>${names}</td>`;
      }
      html += `</tr>`;
    });
  }

  html += `</tbody></table>`;
  container.innerHTML = html;
}

// 視角切換
function setRosterView(viewMode) {
  appState.currentView = viewMode;
  document.getElementById('btnViewStaff').classList.toggle('active', viewMode === 'staff');
  document.getElementById('btnViewRoom').classList.toggle('active', viewMode === 'room');
  renderRosterGrid();
}

// 單元格點擊手動修改班別 (黃底高亮)
function onCellClick(dateStr, staffId, currentShift) {
  const staff = appState.staff.find(s => s.id === staffId);
  const optionsStr = Object.keys(shiftDefs).map(k => `${k}: ${shiftDefs[k].name}`).join('\n');
  const input = prompt(`修改 [${dateStr}] ${staff.name} 的班別:\n\n${optionsStr}`, currentShift);
  
  if (input !== null && shiftDefs[input.trim().toUpperCase()]) {
    const newShift = input.trim().toUpperCase();
    appState.roster[dateStr][staffId] = newShift;
    appState.manualEdits[`${dateStr}_${staffId}`] = true;
    renderRosterGrid();
  }
}

// 原生 Excel (.xlsx) 一鍵匯出
function exportToExcel() {
  if (typeof XLSX === 'undefined') {
    alert('SheetJS 庫加載中，請稍後再試！');
    return;
  }

  const daysInMonth = new Date(appState.year, appState.month, 0).getDate();
  const data = [];
  
  // 標題列
  const header = ['代號', '姓名', '資歷等級'];
  for (let d = 1; d <= daysInMonth; d++) {
    header.push(`${d}日`);
  }
  data.push(header);

  // 資料列
  appState.staff.forEach(s => {
    const row = [s.id, s.name, s.level];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${appState.year}-${String(appState.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const shiftCode = appState.roster[dateStr]?.[s.id] || 'OFF';
      row.push(shiftDefs[shiftCode]?.name || shiftCode);
    }
    data.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${appState.year}年${appState.month}月排班表`);

  XLSX.writeFile(wb, `放射診斷科排班表_${appState.year}_${appState.month}.xlsx`);
}
