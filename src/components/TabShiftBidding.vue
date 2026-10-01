<template>
  <div class="bidding-container panel">
    <!-- 頂部視角切換與模式控制 -->
    <header class="bidding-header card-glass">
      <!-- 📅 民國/西元年月份選擇器 -->
      <div class="month-selector-card" style="display: flex; align-items: center; gap: 8px; background: #e0f2fe; padding: 6px 14px; border-radius: 8px; border: 1px solid #7dd3fc;">
        <span style="font-weight: 700; color: #0369a1; font-size: 0.95rem; display: flex; align-items: center; gap: 4px;">
          <Calendar :size="18" /> 📅 當前排班月份：
        </span>
        <select :value="year" @change="emit('update:year', Number($event.target.value))" style="padding: 4px 8px; border-radius: 6px; border: 1px solid #38bdf8; font-weight: 700; color: #0c4a6e;">
          <option :value="2026">民國 115 年 (2026年)</option>
          <option :value="2027">民國 116 年 (2027年)</option>
          <option :value="2028">民國 117 年 (2028年)</option>
        </select>
        <select :value="month" @change="emit('update:month', Number($event.target.value))" style="padding: 4px 8px; border-radius: 6px; border: 1px solid #38bdf8; font-weight: 700; color: #0c4a6e;">
          <option v-for="m in 12" :key="m" :value="m">{{ m }} 月</option>
        </select>
      </div>

      <div class="mode-switch-group">
        <span class="mode-label font-bold">當前操作模式：</span>
        <div class="toggle-btn-group">
          <button 
            class="mode-btn"
            :class="{ active: currentMode === 'bidding' }"
            @click="currentMode = 'bidding'"
          >
            <UserCheck :size="16" /> 🙋‍♂️ 同仁自主選班模式
          </button>

          <button 
            class="mode-btn admin-mode"
            :class="{ active: currentMode === 'admin' }"
            @click="currentMode = 'admin'"
          >
            <Sliders :size="16" /> 👑 管理者排班格子設定模式
          </button>
        </div>
      </div>

      <!-- 跨職類班表頁籤切換 (Role Sub-tabs) -->
      <div class="roster-role-tabs">
        <button 
          v-for="r in roleRosterTabs" 
          :key="r.key"
          class="role-tab-btn"
          :class="{ active: activeRosterRole === r.key }"
          @click="activeRosterRole = r.key"
        >
          {{ r.icon }} {{ r.label }}
        </button>
      </div>

    </header>

    <!-- 🧑‍⚕️ 個人選班工作台：切換同仁 + 本月統計 + 第二專長進度 + 篩選 -->
    <section class="workbench card-glass" v-if="currentMode === 'bidding'">
      <div class="wb-top">
        <div class="wb-staff">
          <label class="wb-label"><User :size="16" /> 切換【{{ activeRosterRole }}】同仁：</label>
          <select v-model="selectedStaffId" class="input-select staff-select">
            <option v-for="s in filteredStaffByRole" :key="s.id" :value="s.id">
              {{ s.name }} - {{ getStaffSkillsBadge(s) }}
            </option>
          </select>
        </div>
        <div class="wb-stats">
          <div class="wb-stat"><span class="wb-stat-val">{{ myStats.totalDays }}</span><span class="wb-stat-label">本月已選班數</span></div>
          <div class="wb-stat"><span class="wb-stat-val">{{ myStats.totalHours }}</span><span class="wb-stat-label">預估工時 (h)</span></div>
          <div class="wb-stat"><span class="wb-stat-val">{{ myStats.nightCount }}</span><span class="wb-stat-label">夜班 (E/N)</span></div>
          <div class="wb-stat"><span class="wb-stat-val">{{ myStats.weekendCount }}</span><span class="wb-stat-label">週末班</span></div>
        </div>
      </div>

      <!-- 🎯 第二專長進度條 -->
      <div class="wb-progress" v-if="activeRosterRole === '放射師' && specialtyProgress.length">
        <div class="wb-section-title">🎯 【{{ currentStaff?.name }}】本月第二專長目標天數進度</div>
        <div class="progress-list">
          <div v-for="item in specialtyProgress" :key="item.key" class="progress-row" :class="getProgressClass(item)">
            <span class="progress-name">{{ item.name }}</span>
            <div class="progress-track"><div class="progress-fill" :style="{ width: getProgressPercent(item) + '%' }"></div></div>
            <span class="progress-text">{{ getProgressText(item) }}</span>
          </div>
        </div>
        <div
          v-for="item in unmetSpecialties"
          :key="'unmet_' + item.key"
          class="specialty-progress-item is-short"
        >⚠️ 【{{ item.name }}】本月基本應上滿 {{ item.target }} 天，目前已選 {{ item.count }} 天（尚差 {{ item.remain }} 天未上滿，請優先選填！）</div>
      </div>

      <!-- 🔎 日曆班別篩選 -->
      <div class="wb-filters">
        <span class="wb-section-title">篩選日曆班別：</span>
        <button
          v-for="f in visibleFilterOptions"
          :key="f.key"
          class="filter-chip"
          :class="{ active: bidFilter === f.key }"
          @click="bidFilter = f.key"
        >{{ f.label }}</button>
        <span class="legend">
          <span class="legend-item legend-me">✓ 本人已選</span>
          <span class="legend-item legend-priority">🔥 專長未達標</span>
          <span class="legend-item legend-skill">🌟 我的專長</span>
          <span class="legend-item legend-blocked">⛔ 勞基法阻擋</span>
          <span class="legend-item legend-full">額滿／無資格</span>
        </span>
      </div>
    </section>

    <!-- 🔒 勞基法接班防呆規範（可展開說明） -->
    <details class="rules-legend card-glass">
      <summary>
        <ShieldAlert :size="16" />
        <strong>勞基法接班防呆（系統自動阻擋）</strong>
        <span class="rule-chip">兩班之間休息須滿 11 小時</span>
        <span class="rule-chip">連續上班最多 {{ deptRulesView.maxConsecutiveWorkDays }} 天</span>
        <span class="rule-chip">小夜／大夜每月各最多 {{ deptRulesView.eveningMaxRunsPerMonth }}／{{ deptRulesView.nightMaxRunsPerMonth }} 輪</span>
        <span class="rule-chip">大夜隔天須休假</span>
        <span class="rule-chip">半天班隔天禁大夜</span>
        <span class="rule-chip">公假比照日班算上班</span>
        <span class="rules-toggle-hint">點擊展開完整說明</span>
      </summary>
      <div class="rules-detail">
        <div>• <strong>休息滿 11 小時</strong>：前一班下班到下一班上班未滿 11 小時即阻擋。時間直接取自「班別與時間段設定」，改了時間這裡的判定會跟著變。</div>
        <div>• <strong>以目前預設時間為例</strong>：日班／晚班／小夜班 ➜ 隔天不可接大夜班 N；MRI 晚班 e(m)（21:30 下班）➜ 隔天不可接 08:00 日班；一般小夜班 E（00:30 下班）➜ 隔天不可接 11:30 前上班的班別。</div>
        <div>• <strong>科內規定・連續上班</strong>：最多連續 {{ deptRulesView.maxConsecutiveWorkDays }} 天，特休、公假都算上班。</div>
        <div>• <strong>科內規定・夜班</strong>：小夜班每月最多 {{ deptRulesView.eveningMaxRunsPerMonth }} 輪、每輪最多連續 {{ deptRulesView.eveningMaxRunLength }} 天；大夜班每月最多 {{ deptRulesView.nightMaxRunsPerMonth }} 輪、每輪最多連續 {{ deptRulesView.nightMaxRunLength }} 天。連續排的夜班算同一輪。</div>
        <div v-if="deptRulesView.restDayAfterNight">• <strong>科內規定・大夜後休假</strong>：大夜班隔天必須休假，再隔一天才能接白班（中午前上班的班別，含公假）。</div>
        <div>• <strong>科內規定・半天班</strong>：半天班視同 16:30 下班起算休息，隔天一樣不可接大夜班（可在班別設定的「休息起算時間」調整）。</div>
        <div>• 公假比照日班 08:00–16:30 算上班，受以上所有規則限制；特休沒有出勤時間，不受休息間隔限制，但算入連續上班天數。科內標準可在「排班規範與權重設定」調整。完整對照請看「班別與時間段設定」下方的「接班檢核預覽」；日曆與選班明細會直接標示阻擋原因。</div>
      </div>
    </details>

    <!-- 管理者控制欄 (已依照指令刪除快捷按鈕與智慧填補按鈕) -->
    <div class="admin-toolbar card-glass">
      <div class="toolbar-info">
        <span class="info-title">🛠️ 民國 {{ year - 1911 }} 年 {{ month }} 月 【{{ activeRosterRole }}】自主選班日曆：</span>
        <span class="info-desc" v-if="currentMode === 'admin'">
          目前正進行開班微調！系統已自動依據「第 2 項班別與時間設定」的預設條件完成全月開班。
        </span>
        <span class="info-desc" v-else>
          系統已全自動依據「第 2 項班別與時間設定」之開班預設條件載入！點擊日期即可選班。
        </span>
      </div>
      <div class="toolbar-actions">
        <button class="btn btn-outline" style="font-size: 0.82rem; font-weight: 700;" @click="handleResetDefaultSlots">
          <RotateCcw :size="15" /> 🔄 依第 2 項條件重新開班發布
        </button>
      </div>
    </div>


    <!-- 驗證警示/失敗訊息 Modal (z-index 999999 絕對最頂層，超越所有抽屜 Modal) -->
    <div class="modal-overlay modal-overlay-warning" v-if="errorModal.show" @click.self="errorModal.show = false" style="z-index: 999999 !important;">
      <div class="modal-content card-glass modal-warning" style="border: 2px solid #ef4444; background: #fff5f5;">
        <h3 style="color: #dc2626; font-size: 1.25rem; font-weight: 800;">⛔ 無法選擇此班別</h3>
        <p class="error-msg" style="color: #991b1b; font-weight: 700; margin: 12px 0; line-height: 1.5;">{{ errorModal.msg }}</p>
        <button class="btn btn-primary modal-btn" style="background: #dc2626; border-color: #dc2626; font-weight: 700; width: 100%;" @click="errorModal.show = false">知道了 (確認並關閉)</button>
      </div>
    </div>

    <!-- 選班結果即時提示 (不打斷操作) -->
    <div class="bid-toast" :class="'toast-' + toast.type" v-if="toast.show">{{ toast.msg }}</div>

    <!-- 🙋‍♂️ 同仁自主選班單日詳細抽屜 (Bidding Detail Drawer Modal) -->
    <div class="modal-overlay" v-if="biddingDrawerModal.show" @click.self="biddingDrawerModal.show = false" style="z-index: 10000;">
      <div class="modal-content card-glass modal-bidding-drawer">
        <div class="drawer-header">
          <h3>🙋‍♂️ 同仁自主選班 - {{ biddingDrawerModal.dateStr }} ({{ getDayOfWeekText(biddingDrawerModal.dateStr) }})</h3>
          <span class="drawer-subtitle">為同仁【{{ currentStaff?.name }}】點擊即可快速勾選或退選班別（已依對你的重要性排序，並預先標示不能選的原因）：</span>
        </div>

        <!-- 今日狀態 -->
        <div class="drawer-myday is-picked" v-if="myDayMap[biddingDrawerModal.dateStr]?.slot">
          ✅ 你今天已選：<strong>{{ getShiftName(myDayMap[biddingDrawerModal.dateStr].slot.shiftCode) }}</strong>
          （{{ getShiftTime(myDayMap[biddingDrawerModal.dateStr].slot.shiftCode) }}）　若要改選，請先點擊該班退選。
        </div>
        <div class="drawer-myday is-leave" v-else-if="myDayMap[biddingDrawerModal.dateStr]?.leave">
          🏖️ 你今天有請假紀錄，當日無法選班。
        </div>

        <!-- 🎯 抽屜頂部：第二專長目標天數進度 -->
        <div class="drawer-progress" v-if="activeRosterRole === '放射師' && specialtyProgress.length">
          <span
            v-for="item in specialtyProgress"
            :key="item.key"
            class="progress-chip"
            :class="getProgressClass(item)"
          >{{ item.name }}：{{ getProgressText(item) }}</span>
        </div>
        <div
          v-for="item in unmetSpecialties"
          :key="'drawer_unmet_' + item.key"
          class="specialty-progress-item is-short"
          style="margin-bottom: 6px;"
        >⚠️ 【{{ item.name }}】本月基本應上滿 {{ item.target }} 天，目前已選 {{ item.count }} 天（尚差 {{ item.remain }} 天未上滿，請優先選填！）</div>

        <!-- 抽屜內部即時警告 Banner -->
        <div v-if="drawerErrorMsg" class="drawer-error-banner" style="background: #fef2f2; border: 2px solid #f87171; color: #991b1b; padding: 10px 14px; border-radius: 8px; font-weight: 700; margin: 10px 0 14px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <span>{{ drawerErrorMsg }}</span>
          <button @click="drawerErrorMsg = ''" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #991b1b;">×</button>
        </div>

        <div class="drawer-group" v-for="group in drawerSlotGroups" :key="group.key">
          <div class="drawer-group-title" :class="'group-' + group.key">{{ group.label }}（{{ group.slots.length }}）</div>
          <div class="drawer-slots-grid">
            <div 
              v-for="slot in group.slots" 
              :key="slot.id"
              class="drawer-slot-card"
              :class="[getSlotCardClass(slot), 'status-' + (slotStatusMap[slot.id]?.kind || 'available')]"
              @click="toggleSlotBidding(slot, biddingDrawerModal.dateStr)"
            >
              <div class="drawer-slot-top">
                <span class="shift-name-lg" :style="{ backgroundColor: getShiftColor(slot.shiftCode) }">
                  {{ getShiftName(slot.shiftCode) }}
                </span>
                <span class="slot-count-lg">
                  需求 {{ slot.capacity }} 人 (已選 {{ slot.assignedStaffIds.length }}/{{ slot.capacity }})
                </span>
              </div>

              <!-- 預先驗證結果：可選原因或阻擋原因 -->
              <div
                class="status-reason"
                :class="'reason-' + slotStatusMap[slot.id].kind"
                v-if="slotStatusMap[slot.id]?.label"
                :title="slotStatusMap[slot.id].error || ''"
              >{{ slotStatusMap[slot.id].label }}</div>

              <div class="drawer-slot-details">
                <div class="detail-item" v-if="getShiftTime(slot.shiftCode)">
                  <Clock :size="14" /> <span>出勤時間：{{ getShiftTime(slot.shiftCode) }}</span>
                </div>
                <div class="detail-item" v-if="getSlotSkill(slot)">
                  <ShieldAlert :size="14" /> <span>門檻要求：{{ getSkillName(getSlotSkill(slot)) }}</span>
                </div>
              </div>

              <!-- 已選人員名單 -->
              <div class="assigned-names-lg">
                <span 
                  v-for="stId in slot.assignedStaffIds" 
                  :key="stId"
                  class="name-pill-lg"
                  :class="{ 'is-me': stId === selectedStaffId }"
                >
                  {{ getStaffName(stId) }}
                </span>
              </div>

              <div class="action-hint-lg">
                <span v-if="slot.assignedStaffIds.includes(selectedStaffId)" class="hint-btn me-btn">✅ 已選取 (點擊退選)</span>
                <span v-else-if="slotStatusMap[slot.id]?.group >= 4" class="hint-btn full-btn">無法選擇（點擊看完整原因）</span>
                <span v-else class="hint-btn pick-btn">+ 點擊選班</span>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-actions" style="margin-top: 1rem;">
          <button class="btn btn-primary" @click="biddingDrawerModal.show = false">完成選班</button>
        </div>
      </div>
    </div>

    <!-- 管理者新增/編輯 Slot Modal -->
    <div class="modal-overlay" v-if="slotModal.show" @click.self="slotModal.show = false">
      <div class="modal-content card-glass modal-admin-slot">
        <h3>👑 管理者設定【{{ activeRosterRole }}】班別格子 ({{ slotModal.dateStr }})</h3>
        
        <div class="form-group">
          <label>選擇班別：</label>
          <select v-model="slotModal.shiftCode" class="input-select">
            <option 
              v-for="(def, code) in availableShiftsForModal" 
              :key="code" 
              :value="code"
            >
              【{{ code }}】 {{ def.name }} ({{ def.time }})
            </option>
          </select>
        </div>

        <div class="form-group">
          <label>需求人數 / 名額：</label>
          <input type="number" min="1" max="10" v-model.number="slotModal.capacity" class="input-number" />
        </div>

        <div class="form-group" v-if="activeRosterRole === '放射師'">
          <label>專長門檻限制：</label>
          <select v-model="slotModal.requiredSkill" class="input-select">
            <option :value="null">無限制 (一般放射師)</option>
            <option value="xray">需具備 一般 X 光 資格</option>
            <option value="ct">需具備 CT 電腦斷層證照</option>
            <option value="cct">需具備 心臟 CT 資格</option>
            <option value="mri">需具備 MRI 核磁共振證照</option>
            <option value="angio">需具備 特殊攝影 資格</option>
            <option value="mammo">需具備 乳房攝影 資格</option>
            <option value="bmd">需具備 牙科骨密 資格</option>
            <option value="us">需具備 超音波 資格</option>
          </select>
        </div>

        <div class="form-group-checkbox" v-if="activeRosterRole === '放射師'">
          <label>
            <input type="checkbox" v-model="slotModal.requireSeniorPairing" />
            搭檔限制：班內至少需含 1 位資深/主管人員
          </label>
        </div>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="slotModal.show = false">取消</button>
          <button class="btn btn-primary" @click="saveAdminSlot">儲存設定</button>
        </div>
      </div>
    </div>

    <!-- 月曆選班 / 開班格子矩陣 -->
    <div class="bidding-grid-container">
      <div class="grid-header-days">
        <div class="day-col-header" v-for="d in 7" :key="d">
          {{ ['日', '一', '二', '三', '四', '五', '六'][d - 1] }}
        </div>
      </div>

      <div class="calendar-cells-grid">
        <!-- 前置空白天 -->
        <div 
          class="calendar-day-cell blank-cell" 
          v-for="b in firstDayOffset" 
          :key="'blank_' + b"
        ></div>

        <!-- 每日單元格 -->
        <div 
          class="calendar-day-cell"
          v-for="(daySlots, dateStr) in slotsByDate"
          :key="dateStr"
          :class="{ 'is-weekend': isWeekend(dateStr), 'is-holiday': isHoliday(dateStr), 'compact-bidding-cell': currentMode === 'bidding' }"
          @click="handleDayCellClick(dateStr, daySlots)"
        >
          <div class="date-header">
            <span class="day-number">{{ getDayNumber(dateStr) }}</span>
            <span class="holiday-tag" v-if="isHoliday(dateStr)">國定休假</span>

            <!-- 管理者加班/開班按鈕 -->
            <button 
              v-if="currentMode === 'admin'"
              class="add-slot-btn"
              title="管理者新增班別 Slot"
              @click.stop="openAddSlotModal(dateStr)"
            >
              <Plus :size="14" /> 開班
            </button>
          </div>

          <!-- ===== 🙋‍♂️ 同仁自主選班模式：今日狀態置頂 + 依重要性排序的膠囊 ===== -->
          <div class="pills-bidding-view" v-if="currentMode === 'bidding'">
            <div
              class="my-day-badge is-picked"
              v-if="myDayMap[dateStr]?.slot"
              :style="{ borderLeftColor: getShiftColor(myDayMap[dateStr].slot.shiftCode) }"
              :title="getShiftName(myDayMap[dateStr].slot.shiftCode) + '（' + getShiftTime(myDayMap[dateStr].slot.shiftCode) + '）'"
            >
              <span class="my-day-label">✅ 今日已選</span>
              <span class="my-day-shift">{{ getShiftName(myDayMap[dateStr].slot.shiftCode) }}</span>
              <span class="my-day-time">{{ getShiftTime(myDayMap[dateStr].slot.shiftCode) }}</span>
            </div>
            <div class="my-day-badge is-leave" v-else-if="myDayMap[dateStr]?.leave">
              <span class="my-day-label">🏖️ 當日請假</span>
            </div>

            <div class="pills-flex-container">
              <div 
                v-for="slot in getCellSlots(daySlots)" 
                :key="slot.id"
                class="pill-badge"
                :style="{ borderLeftColor: getShiftColor(slot.shiftCode) }"
                :class="getPillClass(slot)"
                @click.stop="handleSlotClick(slot, dateStr)"
                :title="getPillTitle(slot)"
              >
                <span class="pill-mark" v-if="getPillMark(slot)">{{ getPillMark(slot) }}</span>
                <span class="pill-code">{{ slot.shiftCode }}</span>
                <span class="pill-ratio">{{ slot.assignedStaffIds.length }}/{{ slot.capacity }}</span>
                <span class="me-dot" v-if="slot.assignedStaffIds.includes(selectedStaffId)">✓</span>
              </div>
              <span class="pill-empty" v-if="!getCellSlots(daySlots).length">無符合篩選的班別</span>
            </div>

            <div class="expand-drawer-hint">
              <span>🔍 點擊展開明細 (共 {{ getFilteredSlotsByRole(daySlots).length }} 班)</span>
            </div>
          </div>

          <!-- ===== 👑 班別管理者排班模式下的【完整展開大卡片視圖】 (保持原樣不變) ===== -->
          <div class="slots-list" v-else>
            <div 
              v-for="slot in getFilteredSlotsByRole(daySlots)" 
              :key="slot.id"
              class="slot-card"
              :class="getSlotCardClass(slot)"
              @click.stop="handleSlotClick(slot, dateStr)"
            >
              <div class="slot-top">
                <span class="shift-name" :style="{ backgroundColor: getShiftColor(slot.shiftCode) }">
                  {{ getShiftName(slot.shiftCode) }}
                </span>

                <div class="slot-top-right">
                  <span class="slot-count">
                    {{ slot.assignedStaffIds.length }}/{{ slot.capacity }} 人
                  </span>

                  <!-- 管理者刪班別按鈕 -->
                  <button 
                    v-if="currentMode === 'admin'" 
                    class="btn-icon-delete"
                    title="刪除此開班格子"
                    @click.stop="handleDeleteSlot(dateStr, slot.id)"
                  >
                    <Trash2 :size="12" />
                  </button>
                </div>
              </div>

              <!-- 專長限制門檻標籤 -->
              <div class="slot-meta" v-if="slot.requiredSkill">
                <span class="skill-req">
                  門檻: {{ getSkillName(slot.requiredSkill) }}
                </span>
              </div>

              <!-- 已選人員名單 -->
              <div class="assigned-names">
                <span 
                  v-for="stId in slot.assignedStaffIds" 
                  :key="stId"
                  class="name-pill"
                  :class="{ 'is-me': currentMode === 'bidding' && stId === selectedStaffId }"
                >
                  {{ getStaffName(stId) }}
                  <span 
                    v-if="currentMode === 'admin'" 
                    class="remove-staff-x"
                    title="管理者移除人員"
                    @click.stop="removeStaffFromSlot(slot, stId)"
                  >×</span>
                </span>
              </div>

              <div class="action-hint admin-hint">
                <span>✏️ 點擊修改容量/條件</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { User, UserCheck, Sliders, Sparkles, CheckCircle, Plus, Trash2, RotateCcw, Calendar, Clock, ShieldAlert } from 'lucide-vue-next'
import { SHIFT_DEFS } from '../core/types.js'
import { getShiftHours as calcShiftHours, MIN_REST_HOURS } from '../core/shiftTime.js'
import { normalizeDeptRules } from '../core/deptRules.js'
import { 
  validateBidding, 
  autoFillUnfilledSlots, 
  convertSlotsToRoster, 
  generateDefaultSlots,
  addSlotToDate,
  removeSlotFromDate,
  updateSlotInDate,
  getPrevDateStr,
  getNextDateStr
} from '../core/biddingEngine.js'

const props = defineProps({
  year: { type: Number, required: true },
  month: { type: Number, required: true },
  staffList: { type: Array, required: true },
  slotsByDate: { type: Object, required: true },
  shiftDefs: { type: Object, default: () => ({}) },
  holidays: { type: Array, default: () => [] },
  leaves: { type: Array, default: () => [] },
  constraints: { type: Object, default: () => ({}) },
  deptRules: { type: Object, default: () => ({}) },
  adjacentSlots: { type: Object, default: () => ({}) },
  specialtyTargets: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['update:slotsByDate', 'apply-to-roster', 'update:year', 'update:month'])



// 當前模式：'bidding' (同仁選班) 或 'admin' (管理者設定開班 Slot)
const currentMode = ref('bidding')

// 班表職類分頁切換
const activeRosterRole = ref('放射師')

const roleRosterTabs = [
  { key: '放射師', label: '放射師班表', icon: '🩻' },
  { key: '護理人員', label: '護理班表', icon: '🩺' },
  { key: '書記', label: '書記班表', icon: '📝' }
]

// 依據 activeRosterRole 過濾可選的人員清單
const filteredStaffByRole = computed(() => {
  const list = props.staffList.filter(s => s.role === activeRosterRole.value && s.status === '在職')
  return list.length ? list : props.staffList.filter(s => s.status === '在職')
})

const selectedStaffId = ref(filteredStaffByRole.value[0]?.id || props.staffList[0]?.id)

watch(activeRosterRole, (newRole) => {
  const firstStaff = props.staffList.find(s => s.role === newRole && s.status === '在職')
  if (firstStaff) selectedStaffId.value = firstStaff.id
})

const errorModal = ref({ show: false, msg: '' })
const drawerErrorMsg = ref('')

// 選班結果即時提示（取代瀏覽器原生 alert，不打斷操作）
const toast = ref({ show: false, msg: '', type: 'success' })
let toastTimer = null
function showToast(msg, type = 'success') {
  toast.value = { show: true, msg, type }
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value.show = false }, 3200)
}

// 日曆班別篩選
const bidFilter = ref('all')
const bidFilterOptions = [
  { key: 'all', label: '📋 顯示全部班別' },
  { key: 'skill', label: '🌟 優先顯示我的第二專長班', radiographerOnly: true },
  { key: 'available', label: '✅ 只顯示我可選的班別' }
]
const visibleFilterOptions = computed(() => {
  return bidFilterOptions.filter(f => !f.radiographerOnly || activeRosterRole.value === '放射師')
})
watch(activeRosterRole, (role) => {
  if (role !== '放射師' && bidFilter.value === 'skill') bidFilter.value = 'all'
})

// 🙋‍♂️ 方案一：同仁自主選班單日詳細抽屜 Modal
const biddingDrawerModal = ref({
  show: false,
  dateStr: '',
  slots: []
})

// 管理者 Slot Modal 狀態
const slotModal = ref({
  show: false,
  isEdit: false,
  dateStr: '',
  slotId: '',
  shiftCode: 'D_CT',
  capacity: 2,
  requiredSkill: 'ct',
  requireSeniorPairing: true
})

// Modal 可選的班別下拉選單 (優先置頂特休 V 與公假 公)
const availableShiftsForModal = computed(() => {
  const res = {}
  
  const defs = mergedDefs.value
  if (defs['V']) res['V'] = defs['V']
  if (defs['公']) res['公'] = defs['公']

  Object.entries(defs).forEach(([code, def]) => {
    if (code !== 'V' && code !== '公') {
      if (!def.targetRole || def.targetRole === activeRosterRole.value) {
        res[code] = def
      }
    }
  })
  return res
})

const currentStaff = computed(() => {
  return props.staffList.find(s => s.id === selectedStaffId.value)
})

// 驗證用班表：當月加上前後月，讓連續上班、夜班連續天數與班間休息能跨月檢查
const validationSlots = computed(() => ({ ...props.adjacentSlots, ...props.slotsByDate }))

// 科內排班基準（顯示用）
const deptRulesView = computed(() => normalizeDeptRules(props.deptRules))

// 班別定義：主管自訂設定優先，內建定義補齊
const mergedDefs = computed(() => ({ ...SHIFT_DEFS, ...(props.shiftDefs || {}) }))

const firstDayOffset = computed(() => {
  const dateStr = `${props.year}-${String(props.month).padStart(2, '0')}-01`
  return new Date(dateStr).getDay()
})

// 依據 activeRosterRole 過濾日曆顯示的 Slots (特休 V 與公假 公屬通用假別，全程展示)
function getFilteredSlotsByRole(daySlots) {
  if (!daySlots) return []
  return daySlots.filter(slot => {
    if (slot.shiftCode === 'V' || slot.shiftCode === '公') return true 
    const targetRole = mergedDefs.value[slot.shiftCode]?.targetRole
    if (!targetRole) return true
    return targetRole === activeRosterRole.value
  })
}

// 依班別時段估算工時（OnCall 待命與假別不計）
function getShiftHours(shiftCode) {
  if (shiftCode === 'CALL' || shiftCode === 'CALL_NURSE') return 0
  return calcShiftHours(mergedDefs.value[shiftCode])
}

const myStats = computed(() => {
  if (!currentStaff.value) return { totalDays: 0, totalHours: 0, nightCount: 0, weekendCount: 0 }

  let days = 0
  let hours = 0
  let nights = 0
  let weekends = 0

  Object.entries(props.slotsByDate || {}).forEach(([dateStr, daySlots]) => {
    (daySlots || []).forEach(slot => {
      if (slot.assignedStaffIds.includes(selectedStaffId.value)) {
        days++
        hours += getShiftHours(slot.shiftCode)
        if (mergedDefs.value[slot.shiftCode]?.nightType) nights++
        if (isWeekend(dateStr)) weekends++
      }
    })
  })

  return { totalDays: days, totalHours: Math.round(hours * 10) / 10, nightCount: nights, weekendCount: weekends }
})

// 同仁每天的狀態：已選班別 / 請假
const myDayMap = computed(() => {
  const map = {}
  const staffId = selectedStaffId.value
  Object.entries(props.slotsByDate || {}).forEach(([dateStr, daySlots]) => {
    const slot = (daySlots || []).find(s => Array.isArray(s.assignedStaffIds) && s.assignedStaffIds.includes(staffId))
    const leave = (props.leaves || []).some(l => l.staffId === staffId && (l.date === dateStr || l.start === dateStr) && ['full', 'am', 'pm'].includes(l.type))
    map[dateStr] = { slot: slot || null, leave }
  })
  return map
})

function getStaffSkillsBadge(s) {
  const sk = []
  if (s.xray) sk.push('X光')
  if (s.ct) sk.push('CT')
  if (s.mammo) sk.push('乳攝')
  if (s.us) sk.push('超音波')
  if (s.mri) sk.push('MRI')
  if (s.cct) sk.push('心臟CT')
  if (s.angio) sk.push('特殊')
  if (s.bmd) sk.push('骨密')
  return sk.length ? sk.join('/') : s.role
}

function isWeekend(dateStr) {
  const d = new Date(dateStr).getDay()
  return d === 0 || d === 6
}

function isHoliday(dateStr) {
  return props.holidays.includes(dateStr)
}

function getDayNumber(dateStr) {
  return parseInt(dateStr.split('-')[2], 10)
}

function getDayOfWeekText(dateStr) {
  if (!dateStr) return ''
  const days = ['日', '一', '二', '三', '四', '五', '六']
  return '週' + days[new Date(dateStr).getDay()]
}

function getShiftName(shiftCode) {
  const def = mergedDefs.value[shiftCode]
  if (!def) return shiftCode
  return `${shiftCode} (${def.name})`
}

function getShiftTime(shiftCode) {
  return mergedDefs.value[shiftCode]?.time || ''
}

function getShiftColor(shiftCode) {
  return mergedDefs.value[shiftCode]?.color || '#64748b'
}

function getSkillName(sk) {
  if (sk === 'xray') return '一般 X 光'
  if (sk === 'ct') return 'CT 證照'
  if (sk === 'cct') return '心臟 CT'
  if (sk === 'mri') return 'MRI 證照'
  if (sk === 'angio') return '特殊攝影'
  if (sk === 'mammo') return '乳房攝影'
  if (sk === 'bmd') return '牙科骨密'
  if (sk === 'us') return '超音波'
  return sk
}

function hasSecondarySkill(staff, skillKey) {
  if (!staff || !skillKey) return false
  const secondaryKeys = ['mri', 'mammo', 'angio', 'us', 'bmd', 'cct', 'ct']
  if (!secondaryKeys.includes(skillKey)) return false
  return !!staff[skillKey]
}

// 第二專長顯示順序（對齊人員排序優先順序）
const SECONDARY_SKILL_ORDER = [
  { key: 'mammo', name: '乳房攝影' },
  { key: 'us', name: '超音波' },
  { key: 'mri', name: 'MRI' },
  { key: 'cct', name: '心臟CT' },
  { key: 'ct', name: 'CT' },
  { key: 'angio', name: '特殊攝影' },
  { key: 'bmd', name: '骨密牙科' }
]

// 統計同仁當月已選取的某專長班別天數（比對格子專長門檻或班別對應專長）
function countSkillSlots(staffId, skillKey) {
  let count = 0
  Object.values(props.slotsByDate || {}).forEach(daySlots => {
    if (!Array.isArray(daySlots)) return
    daySlots.forEach(slot => {
      if (!Array.isArray(slot.assignedStaffIds) || !slot.assignedStaffIds.includes(staffId)) return
      const shiftModKey = props.shiftDefs?.[slot.shiftCode]?.modKey
      if (slot.requiredSkill === skillKey || shiftModKey === skillKey) count++
    })
  })
  return count
}

// 目前所選放射師的第二專長目標進度（只列人員檔案有勾選的專長）
const specialtyProgress = computed(() => {
  const staff = currentStaff.value
  if (!staff || staff.role !== '放射師') return []
  const targets = props.specialtyTargets?.[staff.id] || {}
  return SECONDARY_SKILL_ORDER
    .filter(sk => !!staff[sk.key])
    .map(sk => {
      const target = Number(targets[sk.key]) || 0
      const count = countSkillSlots(staff.id, sk.key)
      return { ...sk, target, count, remain: Math.max(0, target - count), isMet: count >= target }
    })
})

function getSkillTargetStatus(staffId, skillKey) {
  if (!staffId || !skillKey || !props.specialtyTargets || !props.specialtyTargets[staffId]) return null
  // 人員檔案已取消勾選的專長不計目標，避免幽靈提醒
  const staff = props.staffList.find(s => s.id === staffId)
  if (!staff || !staff[skillKey]) return null
  const target = Number(props.specialtyTargets[staffId][skillKey]) || 0
  if (target <= 0) return null

  const count = countSkillSlots(staffId, skillKey)

  const remain = Math.max(0, target - count)
  return {
    target,
    count,
    remain,
    isMet: count >= target
  }
}

const unmetSpecialties = computed(() => specialtyProgress.value.filter(item => item.target > 0 && !item.isMet))

function getProgressClass(item) {
  if (item.target <= 0) return 'is-info'
  return item.isMet ? 'is-met' : 'is-short'
}

function getProgressPercent(item) {
  if (item.target <= 0) return 0
  return Math.min(100, Math.round((item.count / item.target) * 100))
}

function getProgressText(item) {
  if (item.target <= 0) return `已選 ${item.count} 天（未設門檻）`
  if (item.isMet) return `✅ 已達標 ${item.count} / ${item.target} 天`
  return `已選 ${item.count} / ${item.target} 天・尚差 ${item.remain} 天`
}

// 班別的專長門檻：格子自訂門檻優先，否則用班別對應專長
function getSlotSkill(slot) {
  return slot.requiredSkill || mergedDefs.value[slot.shiftCode]?.modKey || null
}

// ===== 勞基法與資格事前預檢（用 validateBidding 判斷，只用於顯示，不放寬任何規則） =====
function buildBlockStatus(val) {
  const msg = String(val.error || '')
  if (val.restGap) {
    const { direction, otherCode, byDeptRule, type, label } = val.restGap
    const where = direction === 'prev' ? `前日 ${otherCode} 班` : `隔日已排 ${otherCode} 班`
    const title = byDeptRule ? '科內規定阻擋' : '勞基法阻擋'
    const suffix = type === 'rest' ? `（未滿 ${MIN_REST_HOURS}h）` : ''
    return { kind: 'law', group: 4, label: `⛔ ${title}：${where}，${label}${suffix}` }
  }
  if (val.deptRule) {
    return { kind: 'law', group: 4, label: `⛔ 科內規定阻擋：${val.deptRule.label}` }
  }
  if (msg.includes('請假')) return { kind: 'leave', group: 4, label: '🏖️ 當日有請假紀錄' }
  if (msg.includes('同一天不可重複')) return { kind: 'day-taken', group: 4, label: '📌 今日已選其他班（一天一班）' }
  if (msg.includes('名額已滿')) return { kind: 'full', group: 5, label: '⚪ 名額已滿' }
  if (msg.includes('職類不符')) return { kind: 'no-skill', group: 5, label: '⚪ 非本職類班別' }
  if (msg.includes('夜班')) return { kind: 'no-skill', group: 5, label: '⚪ 未開放上夜班' }
  if (msg.includes('缺')) return { kind: 'no-skill', group: 5, label: `⚪ 無資格：${msg.replace(/^缺\s*/, '缺 ')}` }
  return { kind: 'blocked', group: 4, label: `⛔ ${msg}` }
}

function evaluateSlot(staff, slot, dateStr) {
  const skill = getSlotSkill(slot)
  const isSecondary = hasSecondarySkill(staff, skill)
  if (slot.assignedStaffIds.includes(staff.id)) {
    return { kind: 'mine', group: 0, label: '✅ 本人已選', isSecondary }
  }
  const val = validateBidding({
    staff,
    slot,
    dateStr,
    slotsByDate: validationSlots.value,
    staffList: props.staffList,
    leaves: props.leaves,
    constraints: props.constraints,
    customShiftDefs: props.shiftDefs,
    deptRules: props.deptRules
  })
  if (!val.valid) return { ...buildBlockStatus(val), isSecondary, error: val.error }
  const target = isSecondary ? getSkillTargetStatus(staff.id, skill) : null
  if (target && !target.isMet) {
    return { kind: 'priority', group: 1, label: `🔥 ${getSkillName(skill)} 未達標：已選 ${target.count}/${target.target} 天，尚差 ${target.remain} 天`, isSecondary }
  }
  if (isSecondary) return { kind: 'skill', group: 2, label: `🌟 我的第二專長班（${getSkillName(skill)}）`, isSecondary }
  return { kind: 'available', group: 3, label: '', isSecondary }
}

// 目前同仁對每個班別格子的狀態（slot.id → 狀態）
const slotStatusMap = computed(() => {
  const map = {}
  const staff = currentStaff.value
  if (!staff || currentMode.value !== 'bidding') return map
  Object.entries(props.slotsByDate || {}).forEach(([dateStr, daySlots]) => {
    getFilteredSlotsByRole(daySlots).forEach(slot => {
      map[slot.id] = evaluateSlot(staff, slot, dateStr)
    })
  })
  return map
})

function getSlotGroup(slot) {
  return slotStatusMap.value[slot.id]?.group ?? 3
}

function sortSlotsForMe(list) {
  return list
    .map((slot, idx) => ({ slot, idx }))
    .sort((a, b) => getSlotGroup(a.slot) - getSlotGroup(b.slot) || a.idx - b.idx)
    .map(x => x.slot)
}

// 日曆格子要顯示的膠囊：依職類 → 篩選器 → 重要性排序
function getCellSlots(daySlots) {
  let list = getFilteredSlotsByRole(daySlots)
  if (bidFilter.value === 'skill') {
    list = list.filter(slot => {
      const st = slotStatusMap.value[slot.id]
      return st && (st.kind === 'mine' || st.isSecondary)
    })
  } else if (bidFilter.value === 'available') {
    list = list.filter(slot => getSlotGroup(slot) <= 3)
  }
  return sortSlotsForMe(list)
}

function getPillClass(slot) {
  const st = slotStatusMap.value[slot.id]
  const kind = st?.kind
  return {
    'is-me-pill': kind === 'mine',
    'is-priority-pill': kind === 'priority',
    'is-skill-pill': kind === 'skill',
    'is-blocked-pill': st?.group === 4,
    'is-full-pill': st?.group === 5
  }
}

function getPillMark(slot) {
  const kind = slotStatusMap.value[slot.id]?.kind
  if (kind === 'priority') return '🔥'
  if (kind === 'skill') return '🌟'
  if (kind === 'law') return '⛔'
  return ''
}

function getPillTitle(slot) {
  const st = slotStatusMap.value[slot.id]
  const lines = [`${getShiftName(slot.shiftCode)}｜${getShiftTime(slot.shiftCode)}`]
  if (st?.label) lines.push(st.label)
  if (st?.error && st.error !== st.label) lines.push(st.error)
  lines.push(st?.kind === 'mine' ? '點擊退選' : (st?.group >= 4 ? '無法選擇' : '點擊選班'))
  return lines.join('\n')
}

// 單日抽屜：依重要性分組
const DRAWER_GROUPS = [
  { key: 'mine', group: 0, label: '✅ 本人已選' },
  { key: 'priority', group: 1, label: '🔥 第二專長未達標・優先推薦' },
  { key: 'skill', group: 2, label: '🌟 我的第二專長班' },
  { key: 'available', group: 3, label: '🟢 一般可選班別' },
  { key: 'blocked', group: 4, label: '⛔ 勞基法/接班規範衝突・當日已選或請假' },
  { key: 'unavailable', group: 5, label: '⚪ 已額滿 / 無該專長資格' }
]

const drawerSlotGroups = computed(() => {
  const dateStr = biddingDrawerModal.value.dateStr
  if (!dateStr) return []
  const slots = getFilteredSlotsByRole(props.slotsByDate?.[dateStr] || [])
  return DRAWER_GROUPS
    .map(g => ({ ...g, slots: slots.filter(slot => getSlotGroup(slot) === g.group) }))
    .filter(g => g.slots.length > 0)
})

function getStaffName(stId) {


  return props.staffList.find(s => s.id === stId)?.name || stId
}

function getSlotCardClass(slot) {
  if (currentMode.value === 'admin') {
    return { 'is-admin-card': true }
  }

  const isMe = slot.assignedStaffIds.includes(selectedStaffId.value)
  const isFull = slot.assignedStaffIds.length >= slot.capacity

  return {
    'selected-by-me': isMe,
    'is-full': isFull && !isMe,
    'is-available': !isFull && !isMe
  }
}

// 點擊日期單元格 (同仁模式下打開詳細選班抽屜)
function handleDayCellClick(dateStr, daySlots) {
  if (currentMode.value === 'bidding') {
    const filtered = getFilteredSlotsByRole(daySlots)
    drawerErrorMsg.value = ''
    biddingDrawerModal.value = {
      show: true,
      dateStr,
      slots: filtered
    }
  }
}

// 點擊 Slot 卡片/膠囊處理
function handleSlotClick(slot, dateStr) {
  if (currentMode.value === 'admin') {
    slotModal.value = {
      show: true,
      isEdit: true,
      dateStr,
      slotId: slot.id,
      shiftCode: slot.shiftCode,
      capacity: slot.capacity,
      requiredSkill: slot.requiredSkill,
      requireSeniorPairing: slot.minLevel === 'SeniorPairing'
    }
  } else {
    toggleSlotBidding(slot, dateStr)
  }
}

function toggleSlotBidding(slot, dateStr) {
  const staff = currentStaff.value
  if (!staff) return

  // 一律以最新的 slotsByDate 為準，避免抽屜內殘留舊資料
  const current = (props.slotsByDate?.[dateStr] || []).find(s => s.id === slot.id) || slot
  const isMe = current.assignedStaffIds.includes(staff.id)
  drawerErrorMsg.value = ''
  let warningMsg = ''

  if (!isMe) {
    const val = validateBidding({
      staff,
      slot: current,
      dateStr,
      slotsByDate: validationSlots.value,
      staffList: props.staffList,
      leaves: props.leaves,
      constraints: props.constraints,
      customShiftDefs: props.shiftDefs,
      deptRules: props.deptRules
    })

    if (!val.valid) {
      // 抽屜開著時用內嵌橫幅，否則用警示視窗（不再重複跳原生 alert）
      if (biddingDrawerModal.value.show) {
        drawerErrorMsg.value = val.error
      } else {
        errorModal.value = { show: true, msg: val.error }
      }
      return
    }

    if (val.warnings && val.warnings.length > 0) {
      warningMsg = val.warnings.join('；')
    }
  }

  const updated = JSON.parse(JSON.stringify(props.slotsByDate))
  const target = (updated[dateStr] || []).find(s => s.id === slot.id)
  if (!target) return
  target.assignedStaffIds = isMe
    ? target.assignedStaffIds.filter(id => id !== staff.id)
    : [...target.assignedStaffIds, staff.id]
  emit('update:slotsByDate', updated)

  if (isMe) {
    showToast(`↩️ 已退選 ${dateStr} ${getShiftName(slot.shiftCode)}`, 'info')
  } else if (warningMsg) {
    showToast(`✅ 已選取 ${dateStr} ${getShiftName(slot.shiftCode)}（${warningMsg}）`, 'warning')
  } else {
    showToast(`✅ 已選取 ${dateStr} ${getShiftName(slot.shiftCode)}`, 'success')
  }
}

// 管理者開啟新增 Slot 彈窗
function openAddSlotModal(dateStr) {
  const defaultShift = Object.keys(availableShiftsForModal.value)[0] || 'D_CT'
  slotModal.value = {
    show: true,
    isEdit: false,
    dateStr,
    slotId: '',
    shiftCode: defaultShift,
    capacity: 1,
    requiredSkill: null,
    requireSeniorPairing: false
  }
}

function saveAdminSlot() {
  const { isEdit, dateStr, slotId, shiftCode, capacity, requiredSkill, requireSeniorPairing } = slotModal.value
  const minLevel = requireSeniorPairing ? 'SeniorPairing' : null

  if (isEdit) {
    const updated = updateSlotInDate(props.slotsByDate, dateStr, slotId, {
      capacity,
      requiredSkill,
      minLevel
    })
    emit('update:slotsByDate', updated)
  } else {
    const updated = addSlotToDate(props.slotsByDate, dateStr, {
      shiftCode,
      capacity,
      requiredSkill,
      minLevel
    })
    emit('update:slotsByDate', updated)
  }

  slotModal.value.show = false
}

function handleDeleteSlot(dateStr, slotId) {
  if (confirm('確定要刪除此開班格子嗎？')) {
    const updated = removeSlotFromDate(props.slotsByDate, dateStr, slotId)
    emit('update:slotsByDate', updated)
  }
}

function removeStaffFromSlot(slot, stId) {
  slot.assignedStaffIds = slot.assignedStaffIds.filter(id => id !== stId)
}

function handleBatchAddLeaveSlots() {
  let updated = JSON.parse(JSON.stringify(props.slotsByDate))
  let countAdded = 0

  Object.keys(updated).forEach(dateStr => {
    const dayOfWeek = new Date(dateStr).getDay()
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const daySlots = updated[dateStr] || []
      const hasV = daySlots.some(s => s.shiftCode === 'V')
      const hasOffi = daySlots.some(s => s.shiftCode === '公')

      if (!hasV) {
        updated = addSlotToDate(updated, dateStr, { shiftCode: 'V', capacity: 2, requiredSkill: null, minLevel: null })
        countAdded++
      }
      if (!hasOffi) {
        updated = addSlotToDate(updated, dateStr, { shiftCode: '公', capacity: 1, requiredSkill: null, minLevel: null })
        countAdded++
      }
    }
  })

  emit('update:slotsByDate', updated)
  alert(`✅ 已為當月所有工作日批量發布「特休 (V)」與「公假 (公)」預假選班格子！`)
}

function handleResetDefaultSlots() {
  if (confirm(`確定要依照「第 2 項班別與時間設定」之開班預設條件，重新發布【民國 ${props.year - 1911} 年 ${props.month} 月】全月班別嗎？`)) {
    const defSlots = generateDefaultSlots(props.year, props.month, props.holidays, props.shiftDefs)
    emit('update:slotsByDate', defSlots)
    alert(`✅ 已成功為【民國 ${props.year - 1911} 年 ${props.month} 月】全自動開班發布完成！`)
  }
}


function handleAutoFill() {
  const filledSlots = autoFillUnfilledSlots({
    slotsByDate: props.slotsByDate,
    adjacentSlots: props.adjacentSlots,
    staffList: props.staffList,
    leaves: props.leaves,
    constraints: props.constraints,
    customShiftDefs: props.shiftDefs,
    deptRules: props.deptRules
  })
  emit('update:slotsByDate', filledSlots)
  alert(`【${activeRosterRole.value}】智慧填補完成！已自動將符合資格之同仁排入缺額班別中。`)
}

function handleApplyToRoster() {
  const roster = convertSlotsToRoster(props.slotsByDate, props.staffList)
  emit('apply-to-roster', roster)
  alert(`已成功將【${activeRosterRole.value}】與全科選班結果發布至正式排班表！`)
}
</script>

<style scoped>
.bidding-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.bidding-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  gap: 16px;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.mode-switch-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toggle-btn-group {
  display: flex;
  background: #e2e8f0;
  padding: 4px;
  border-radius: 8px;
  gap: 4px;
}

.mode-btn {
  border: none;
  background: transparent;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.mode-btn.active {
  background: white;
  color: #0d5c53;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.mode-btn.admin-mode.active {
  background: #7c3aed;
  color: white;
}

/* Roster Role Sub-tabs */
.roster-role-tabs {
  display: flex;
  gap: 6px;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 8px;
}

.role-tab-btn {
  border: none;
  background: transparent;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s ease;
}

.role-tab-btn.active {
  background: #0d5c53;
  color: white;
}

.specialty-progress-panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.specialty-progress-title {
  font-weight: 800;
  font-size: 0.9rem;
  color: #0d5c53;
}

.specialty-progress-item {
  font-size: 0.85rem;
  font-weight: 700;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid transparent;
}

.specialty-progress-item.is-short {
  background: #fff7ed;
  color: #c2410c;
  border-color: #fdba74;
}

.specialty-progress-item.is-met {
  background: #f0fdf4;
  color: #15803d;
  border-color: #86efac;
}

.specialty-progress-item.is-info {
  background: #f0f9ff;
  color: #0369a1;
  border-color: #bae6fd;
}

.user-selector-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.staff-select {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  font-size: 13px;
}

.summary-stats-box {
  display: flex;
  gap: 14px;
  background: #0f172a;
  color: white;
  padding: 6px 14px;
  border-radius: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 10px;
  color: #94a3b8;
}

.stat-val {
  font-weight: 700;
  font-size: 13px;
  color: #38bdf8;
}

.stat-val.highlight {
  color: #f43f5e;
}

.admin-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #eff6ff;
  border-radius: 10px;
  border: 1px solid #bfdbfe;
}

.toolbar-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-title {
  font-weight: 700;
  color: #1e3a8a;
}

.info-desc {
  font-size: 13px;
  color: #2563eb;
}

.toolbar-actions {
  display: flex;
  gap: 10px;
}

.bidding-grid-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.grid-header-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  text-align: center;
  font-weight: 700;
  color: #475569;
  background: #f1f5f9;
  padding: 8px 0;
  border-radius: 8px;
}

.calendar-cells-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
}

.calendar-day-cell {
  background: white;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  padding: 8px;
  min-height: 180px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  cursor: pointer;
}

.calendar-day-cell.compact-bidding-cell {
  min-height: 190px;
  height: 190px;
  overflow: hidden;
}

.calendar-day-cell.compact-bidding-cell:hover {
  border-color: #0284c7;
  box-shadow: 0 4px 12px rgba(2, 132, 199, 0.15);
}

.calendar-day-cell.is-weekend {
  background: #f8fafc;
}

.calendar-day-cell.is-holiday {
  background: #fff1f2;
}

.date-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 4px;
}

.day-number {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.holiday-tag {
  font-size: 10px;
  background: #ffe4e6;
  color: #e11d48;
  padding: 1px 4px;
  border-radius: 4px;
}

.add-slot-btn {
  display: flex;
  align-items: center;
  gap: 2px;
  background: #7c3aed;
  color: white;
  border: none;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.add-slot-btn:hover {
  background: #6d28d9;
}

/* ===== 🙋‍♂️ 方案一：極簡膠囊標籤樣式 ===== */
.pills-bidding-view {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
}

.pills-flex-container {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-height: 110px;
  overflow-y: auto;

  /* 隱藏原生捲軸 */
  scrollbar-width: thin;
}

.pill-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #f1f5f9;
  border-left: 3px solid #64748b;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 700;
  color: #334155;
  cursor: pointer;
  transition: all 0.15s ease;
}

.pill-badge:hover {
  transform: scale(1.04);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.pill-badge.is-me-pill {
  background: #10b981;
  color: white;
  border-left-color: #047857 !important;
}

.pill-badge.is-full-pill {
  opacity: 0.55;
  background: #e2e8f0;
}

.pill-code {
  font-weight: 700;
}

.pill-ratio {
  font-size: 10px;
  opacity: 0.85;
}

.me-dot {
  font-size: 10px;
  font-weight: 900;
}

.expand-drawer-hint {
  font-size: 10px;
  color: #0284c7;
  text-align: center;
  font-weight: 600;
  padding-top: 2px;
}

/* ===== 管理者 Slot 卡片樣式 (保持原樣) ===== */
.slots-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.slot-card {
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.slot-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
}

.slot-card.is-admin-card {
  border-style: dashed;
  border-color: #7c3aed;
  background: #faf5ff;
}

.slot-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.shift-name {
  color: white;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 5px;
  border-radius: 4px;
}

.slot-top-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.slot-count {
  font-size: 10px;
  font-weight: 600;
  color: #64748b;
}

.btn-icon-delete {
  background: transparent;
  border: none;
  color: #ef4444;
  cursor: pointer;
  padding: 2px;
  display: flex;
}

.slot-meta {
  font-size: 10px;
  color: #d97706;
  margin-bottom: 4px;
}

.assigned-names {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 4px;
}

.name-pill {
  font-size: 10px;
  background: #e2e8f0;
  color: #334155;
  padding: 1px 5px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 2px;
}

.remove-staff-x {
  color: #ef4444;
  font-weight: 700;
  cursor: pointer;
  padding: 0 2px;
}

.action-hint {
  font-size: 10px;
  text-align: right;
  font-weight: 600;
}

.admin-hint {
  color: #7c3aed;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 24px;
  border-radius: 12px;
  max-width: 440px;
  width: 90%;
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2);
}

.modal-bidding-drawer {
  max-width: 680px;
  max-height: 85vh;
  overflow-y: auto;
}

.drawer-header {
  margin-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 10px;
}

.drawer-header h3 {
  font-size: 18px;
  color: #0f172a;
  margin-bottom: 4px;
}

.drawer-subtitle {
  font-size: 13px;
  color: #64748b;
}

.drawer-slots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
}

.drawer-slot-card {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 12px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.drawer-slot-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0,0,0,0.1);
}

.drawer-slot-card.selected-by-me {
  border: 2px solid #10b981;
  background: #ecfdf5;
}

.drawer-slot-card.is-full {
  background: #f8fafc;
  opacity: 0.75;
}

.drawer-slot-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.shift-name-lg {
  color: white;
  font-size: 13px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 6px;
}

.slot-count-lg {
  font-size: 12px;
  font-weight: 600;
  color: #475569;
}

.drawer-slot-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #475569;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.assigned-names-lg {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.name-pill-lg {
  font-size: 11px;
  background: #e2e8f0;
  color: #334155;
  padding: 2px 8px;
  border-radius: 6px;
  font-weight: 600;
}

.name-pill-lg.is-me {
  background: #10b981;
  color: white;
}

.action-hint-lg {
  margin-top: 4px;
  text-align: right;
}

.hint-btn {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
}

.me-btn {
  background: #10b981;
  color: white;
}

.full-btn {
  background: #94a3b8;
  color: white;
}

.pick-btn {
  background: #0284c7;
  color: white;
}

.modal-admin-slot {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
}

.form-group label {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.input-select, .input-number {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  font-size: 14px;
}

.form-group-checkbox {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #334155;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
}
/* ===== 🧑‍⚕️ 個人選班工作台 ===== */
.workbench {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.wb-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.wb-staff {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.wb-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 700;
  color: #0f172a;
}

.wb-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(84px, 1fr));
  gap: 8px;
}

.wb-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 10px;
  border-radius: 8px;
  background: #f0fdfa;
  border: 1px solid #99f6e4;
}

.wb-stat-val {
  font-size: 1.35rem;
  font-weight: 800;
  color: #0d5c53;
  line-height: 1.2;
}

.wb-stat-label {
  font-size: 0.75rem;
  color: #475569;
  font-weight: 600;
  white-space: nowrap;
}

.wb-section-title {
  font-weight: 800;
  font-size: 0.88rem;
  color: #0d5c53;
}

.wb-progress {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 6px 18px;
}

.progress-row {
  display: grid;
  grid-template-columns: 76px 1fr auto;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
}

.progress-name {
  font-weight: 700;
  color: #0f172a;
}

.progress-track {
  height: 10px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 999px;
  background: #f97316;
  transition: width 0.3s ease;
}

.progress-row.is-met .progress-fill { background: #16a34a; }
.progress-row.is-info .progress-track { background: #e0f2fe; }

.progress-text {
  font-weight: 700;
  white-space: nowrap;
}

.progress-row.is-short .progress-text { color: #c2410c; }
.progress-row.is-met .progress-text { color: #15803d; }
.progress-row.is-info .progress-text { color: #0369a1; }

.wb-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px dashed #e2e8f0;
}

.filter-chip {
  border: 1px solid #cbd5e1;
  background: white;
  color: #334155;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.filter-chip:hover { background: #f1f5f9; }

.filter-chip.active {
  background: #0d5c53;
  border-color: #0d5c53;
  color: white;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-left: auto;
}

.legend-item {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  border-left: 3px solid transparent;
}

.legend-me { background: #10b981; color: white; }
.legend-priority { background: #fff7ed; color: #c2410c; border-left-color: #f97316; }
.legend-skill { background: #fefce8; color: #a16207; border-left-color: #eab308; }
.legend-blocked { background: #fef2f2; color: #b91c1c; border-left-color: #ef4444; }
.legend-full { background: #e2e8f0; color: #64748b; }

/* ===== 🔒 勞基法規範（可展開） ===== */
.rules-legend {
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  padding: 8px 14px;
}

.rules-legend summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: #c2410c;
  font-size: 0.85rem;
  list-style: none;
}

.rules-legend summary::-webkit-details-marker { display: none; }

.rule-chip {
  background: white;
  border: 1px solid #fdba74;
  color: #9a3412;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
}

.rules-toggle-hint {
  margin-left: auto;
  font-size: 0.75rem;
  color: #ea580c;
  font-weight: 600;
}

.rules-legend[open] .rules-toggle-hint { visibility: hidden; }

.rules-detail {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 8px;
  font-size: 0.82rem;
  color: #9a3412;
}

/* ===== 日曆格子：今日狀態與膠囊狀態 ===== */
.my-day-badge {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 4px 6px;
  border-radius: 6px;
  border-left: 4px solid #10b981;
  margin-bottom: 4px;
}

.my-day-badge.is-picked {
  background: #ecfdf5;
  border-top: 1px solid #a7f3d0;
  border-right: 1px solid #a7f3d0;
  border-bottom: 1px solid #a7f3d0;
}

.my-day-badge.is-leave {
  background: #eff6ff;
  border-left-color: #3b82f6;
}

.my-day-label {
  font-size: 10px;
  font-weight: 800;
  color: #047857;
}

.my-day-badge.is-leave .my-day-label { color: #1d4ed8; }

.my-day-shift {
  font-size: 11px;
  font-weight: 800;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.my-day-time {
  font-size: 10px;
  color: #475569;
}

.pill-badge.is-priority-pill {
  background: #fff7ed;
  color: #c2410c;
  box-shadow: inset 0 0 0 1px #fb923c;
}

.pill-badge.is-skill-pill {
  background: #fefce8;
  color: #a16207;
  box-shadow: inset 0 0 0 1px #facc15;
}

.pill-badge.is-blocked-pill {
  background: #fef2f2;
  color: #b91c1c;
  opacity: 0.75;
  text-decoration: line-through;
  text-decoration-color: rgba(185, 28, 28, 0.5);
}

.pill-mark {
  font-size: 10px;
}

.pill-empty {
  font-size: 10px;
  color: #94a3b8;
}

/* ===== 抽屜：今日狀態、進度與分組 ===== */
.drawer-myday {
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 10px;
}

.drawer-myday.is-picked { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
.drawer-myday.is-leave { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }

.drawer-progress {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.progress-chip {
  font-size: 0.78rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid transparent;
}

.progress-chip.is-short { background: #fff7ed; color: #c2410c; border-color: #fdba74; }
.progress-chip.is-met { background: #f0fdf4; color: #15803d; border-color: #86efac; }
.progress-chip.is-info { background: #f0f9ff; color: #0369a1; border-color: #bae6fd; }

.drawer-group {
  margin-top: 12px;
}

.drawer-group-title {
  font-size: 0.85rem;
  font-weight: 800;
  margin-bottom: 6px;
  color: #334155;
}

.drawer-group-title.group-mine { color: #047857; }
.drawer-group-title.group-priority { color: #c2410c; }
.drawer-group-title.group-skill { color: #a16207; }
.drawer-group-title.group-available { color: #0d5c53; }
.drawer-group-title.group-blocked { color: #b91c1c; }
.drawer-group-title.group-unavailable { color: #64748b; }

.drawer-slot-card.status-priority { border: 2px solid #fb923c; background: #fffbf5; }
.drawer-slot-card.status-skill { border: 2px solid #facc15; background: #fffef5; }
.drawer-slot-card.status-law,
.drawer-slot-card.status-leave,
.drawer-slot-card.status-day-taken,
.drawer-slot-card.status-blocked { background: #fef2f2; border-color: #fecaca; opacity: 0.85; }
.drawer-slot-card.status-full,
.drawer-slot-card.status-no-skill { background: #f8fafc; opacity: 0.6; }

.status-reason {
  font-size: 0.8rem;
  font-weight: 800;
  padding: 4px 8px;
  border-radius: 6px;
}

.status-reason.reason-mine { background: #d1fae5; color: #065f46; }
.status-reason.reason-priority { background: #ffedd5; color: #c2410c; }
.status-reason.reason-skill { background: #fef9c3; color: #a16207; }
.status-reason.reason-law,
.status-reason.reason-blocked { background: #fee2e2; color: #b91c1c; }
.status-reason.reason-leave,
.status-reason.reason-day-taken { background: #fef3c7; color: #92400e; }
.status-reason.reason-full,
.status-reason.reason-no-skill { background: #e2e8f0; color: #475569; }

/* ===== 選班結果提示 ===== */
.bid-toast {
  position: fixed;
  left: 50%;
  bottom: 28px;
  transform: translateX(-50%);
  z-index: 1000000;
  max-width: min(92vw, 640px);
  padding: 10px 18px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.9rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.18);
}

.toast-success { background: #065f46; color: white; }
.toast-info { background: #334155; color: white; }
.toast-warning { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }

@media (max-width: 720px) {
  .wb-stats { grid-template-columns: repeat(2, 1fr); width: 100%; }
  .legend { margin-left: 0; }
  .progress-row { grid-template-columns: 64px 1fr; }
  .progress-text { grid-column: 1 / -1; }
}
</style>
