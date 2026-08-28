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

      <!-- 同仁選班視角工具 -->
      <div class="user-selector-group" v-if="currentMode === 'bidding'">
        <label class="section-title"><User :size="18" /> 切換【{{ activeRosterRole }}】同仁：</label>
        <select v-model="selectedStaffId" class="input-select staff-select">
          <option v-for="s in filteredStaffByRole" :key="s.id" :value="s.id">
            {{ s.name }} ({{ s.level }}) - {{ getStaffSkillsBadge(s) }}
          </option>
        </select>
      </div>

    </header>


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

    <!-- 🙋‍♂️ 方案一：同仁自主選班單日詳細抽屜 (Bidding Detail Drawer Modal) -->
    <div class="modal-overlay" v-if="biddingDrawerModal.show" @click.self="biddingDrawerModal.show = false" style="z-index: 10000;">
      <div class="modal-content card-glass modal-bidding-drawer">
        <div class="drawer-header">
          <h3>🙋‍♂️ 同仁自主選班 - {{ biddingDrawerModal.dateStr }} ({{ getDayOfWeekText(biddingDrawerModal.dateStr) }})</h3>
          <span class="drawer-subtitle">為同仁【{{ currentStaff?.name }}】點擊即可快速勾選或退選班別：</span>
        </div>

        <!-- 抽屜內部即時警告 Banner -->
        <div v-if="drawerErrorMsg" class="drawer-error-banner" style="background: #fef2f2; border: 2px solid #f87171; color: #991b1b; padding: 10px 14px; border-radius: 8px; font-weight: 700; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between;">
          <span>{{ drawerErrorMsg }}</span>
          <button @click="drawerErrorMsg = ''" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #991b1b;">×</button>
        </div>

        <div class="drawer-slots-grid">
          <div 
            v-for="slot in biddingDrawerModal.slots" 
            :key="slot.id"
            class="drawer-slot-card"
            :class="getSlotCardClass(slot)"
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

            <div class="drawer-slot-details">
              <div class="detail-item" v-if="getShiftTime(slot.shiftCode)">
                <Clock :size="14" /> <span>出勤時間：{{ getShiftTime(slot.shiftCode) }}</span>
              </div>
              <div class="detail-item" v-if="slot.requiredSkill">
                <ShieldAlert :size="14" /> <span>門檻要求：{{ getSkillName(slot.requiredSkill) }}</span>
                <span v-if="hasSecondarySkill(currentStaff, slot.requiredSkill)" style="margin-left: 6px;">
                  <template v-if="getSkillTargetStatus(selectedStaffId, slot.requiredSkill)">
                    <span v-if="!getSkillTargetStatus(selectedStaffId, slot.requiredSkill).isMet" style="background: #fff7ed; color: #c2410c; font-weight: 800; padding: 2px 6px; border-radius: 4px; font-size: 11px; border: 1px solid #ffedd5;">
                      🔥 當月目標專長 (已選 {{ getSkillTargetStatus(selectedStaffId, slot.requiredSkill).count }}/{{ getSkillTargetStatus(selectedStaffId, slot.requiredSkill).target }}天，尚缺 {{ getSkillTargetStatus(selectedStaffId, slot.requiredSkill).remain }} 天請優先預選)
                    </span>
                    <span v-else style="background: #f0fdf4; color: #15803d; font-weight: 800; padding: 2px 6px; border-radius: 4px; font-size: 11px; border: 1px solid #bbf7d0;">
                      ✅ 專長天數已達標 ({{ getSkillTargetStatus(selectedStaffId, slot.requiredSkill).count }}/{{ getSkillTargetStatus(selectedStaffId, slot.requiredSkill).target }}天)
                    </span>
                  </template>
                  <template v-else>
                    <span style="background: #dcfce7; color: #15803d; font-weight: 700; padding: 2px 6px; border-radius: 4px; font-size: 11px; border: 1px solid #86efac;">
                      🌟 您的第二專長 (優先推薦預選)
                    </span>
                  </template>
                </span>
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
              <span v-else-if="slot.assignedStaffIds.length >= slot.capacity" class="hint-btn full-btn">已額滿</span>
              <span v-else class="hint-btn pick-btn">+ 點擊選班</span>
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

          <!-- ===== 🙋‍♂️ 方案一：同仁自主選班模式下的【極簡膠囊視圖】 ===== -->
          <div class="pills-bidding-view" v-if="currentMode === 'bidding'">
            <div class="pills-flex-container">
              <div 
                v-for="slot in getFilteredSlotsByRole(daySlots)" 
                :key="slot.id"
                class="pill-badge"
                :style="{ borderLeftColor: getShiftColor(slot.shiftCode) }"
                :class="{ 
                  'is-me-pill': slot.assignedStaffIds.includes(selectedStaffId),
                  'is-full-pill': slot.assignedStaffIds.length >= slot.capacity && !slot.assignedStaffIds.includes(selectedStaffId)
                }"
                @click.stop="handleSlotClick(slot, dateStr)"
                :title="getShiftName(slot.shiftCode) + ' (點擊選班)'"
              >
                <span class="pill-code">{{ slot.shiftCode }}</span>
                <span class="pill-ratio">{{ slot.assignedStaffIds.length }}/{{ slot.capacity }}</span>
                <span class="me-dot" v-if="slot.assignedStaffIds.includes(selectedStaffId)">✓</span>
              </div>
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
import { 
  validateBidding, 
  autoFillUnfilledSlots, 
  convertSlotsToRoster, 
  generateDefaultSlots,
  addSlotToDate,
  removeSlotFromDate,
  updateSlotInDate 
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
  
  if (SHIFT_DEFS['V']) res['V'] = SHIFT_DEFS['V']
  if (SHIFT_DEFS['公']) res['公'] = SHIFT_DEFS['公']

  Object.entries(SHIFT_DEFS).forEach(([code, def]) => {
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

const firstDayOffset = computed(() => {
  const dateStr = `${props.year}-${String(props.month).padStart(2, '0')}-01`
  return new Date(dateStr).getDay()
})

// 依據 activeRosterRole 過濾日曆顯示的 Slots (特休 V 與公假 公屬通用假別，全程展示)
function getFilteredSlotsByRole(daySlots) {
  if (!daySlots) return []
  return daySlots.filter(slot => {
    if (slot.shiftCode === 'V' || slot.shiftCode === '公') return true 
    const targetRole = SHIFT_DEFS[slot.shiftCode]?.targetRole
    if (!targetRole) return true
    return targetRole === activeRosterRole.value
  })
}

const myStats = computed(() => {
  if (!currentStaff.value) return { totalDays: 0, totalHours: 0, nightCount: 0, satCount: 0 }

  let days = 0
  let hours = 0
  let nights = 0
  let sats = 0

  Object.values(props.slotsByDate).forEach(daySlots => {
    daySlots.forEach(slot => {
      if (slot.assignedStaffIds.includes(selectedStaffId.value)) {
        days++
        hours += (SHIFT_DEFS[slot.shiftCode]?.time === '08:00–12:30' ? 4.5 : 8)
        if (slot.shiftCode === 'E' || slot.shiftCode === 'N') nights++
        if (slot.shiftCode === 'SAT_D') sats++
      }
    })
  })

  return { totalDays: days, totalHours: hours, nightCount: nights, satCount: sats }
})

function getStaffSkillsBadge(s) {
  const sk = []
  if (s.xray) sk.push('X-Ray')
  if (s.ct) sk.push('CT')
  if (s.cct) sk.push('心臟CT')
  if (s.mri) sk.push('MRI')
  if (s.angio) sk.push('特殊')
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
  const def = SHIFT_DEFS[shiftCode]
  if (!def) return shiftCode
  return `${shiftCode} (${def.name})`
}

function getShiftTime(shiftCode) {
  return SHIFT_DEFS[shiftCode]?.time || ''
}

function getShiftColor(shiftCode) {
  return SHIFT_DEFS[shiftCode]?.color || '#64748b'
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
  const secondaryKeys = ['mri', 'mammo', 'angio', 'us', 'bmd', 'cct']
  if (!secondaryKeys.includes(skillKey)) return false
  return !!staff[skillKey]
}

function getSkillTargetStatus(staffId, skillKey) {
  if (!staffId || !skillKey || !props.specialtyTargets || !props.specialtyTargets[staffId]) return null
  const target = props.specialtyTargets[staffId][skillKey]
  if (!target || target <= 0) return null

  let count = 0
  if (props.slotsByDate) {
    Object.values(props.slotsByDate).forEach(daySlots => {
      if (Array.isArray(daySlots)) {
        daySlots.forEach(slot => {
          if (slot.assignedStaffIds && slot.assignedStaffIds.includes(staffId)) {
            if (slot.requiredSkill === skillKey) {
              count++
            }
          }
        })
      }
    })
  }

  const remain = Math.max(0, target - count)
  return {
    target,
    count,
    remain,
    isMet: count >= target
  }
}

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
  if (!currentStaff.value) return

  const isMe = slot.assignedStaffIds.includes(selectedStaffId.value)

  if (isMe) {
    drawerErrorMsg.value = ''
    slot.assignedStaffIds = slot.assignedStaffIds.filter(id => id !== selectedStaffId.value)
    emit('update:slotsByDate', JSON.parse(JSON.stringify(props.slotsByDate)))
  } else {
    drawerErrorMsg.value = ''
    const val = validateBidding({
      staff: currentStaff.value,
      slot,
      dateStr,
      slotsByDate: props.slotsByDate,
      staffList: props.staffList,
      leaves: props.leaves,
      constraints: props.constraints,
      customShiftDefs: props.shiftDefs
    })

    if (!val.valid) {
      drawerErrorMsg.value = val.error
      errorModal.value = { show: true, msg: val.error }
      alert(val.error)
      return
    }

    if (val.warnings && val.warnings.length > 0) {
      alert(val.warnings.join('\n'))
    }

    slot.assignedStaffIds.push(selectedStaffId.value)
    emit('update:slotsByDate', JSON.parse(JSON.stringify(props.slotsByDate)))
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
    staffList: props.staffList,
    leaves: props.leaves,
    constraints: props.constraints
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
  min-height: 165px;
  height: 165px;
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
</style>
