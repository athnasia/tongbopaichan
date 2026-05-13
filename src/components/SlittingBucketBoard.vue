<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import draggable from 'vuedraggable'
import { useApsStore } from '@/stores/aps'
import { useConfigStore } from '@/stores/useConfigStore'
import { useSchedulingState } from '@/composables/useSchedulingState'
import type { ScheduledSlot } from '@/composables/useSchedulingState'
import type { SlittingPlan } from '@/types/aps'

const apsStore = useApsStore()
const configStore = useConfigStore()
const { scheduledQtyRecord, remainingQtyRecord, scheduledSlots, removeSlot } = useSchedulingState()

const emit = defineEmits<{
  (e: 'dates-changed', v: string[]): void
}>()

// ── Week navigation ──
const startDate = ref(new Date().toISOString().slice(0, 10))

function prevWeek() {
  const d = new Date(startDate.value + 'T00:00:00')
  d.setDate(d.getDate() - 7)
  startDate.value = d.toISOString().slice(0, 10)
}
function nextWeek() {
  const d = new Date(startDate.value + 'T00:00:00')
  d.setDate(d.getDate() + 7)
  startDate.value = d.toISOString().slice(0, 10)
}
function goToday() {
  startDate.value = new Date().toISOString().slice(0, 10)
}

const todayStr = new Date().toISOString().slice(0, 10)

const dates = computed<string[]>(() => {
  const result: string[] = []
  const base = new Date(startDate.value + 'T00:00:00')
  for (let i = 0; i < 7; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    result.push(d.toISOString().slice(0, 10))
  }
  return result
})

watch(dates, (v) => emit('dates-changed', v), { immediate: true })

// ── Machines ──
const slMachines = computed(() =>
  configStore.machineList.filter((m) => m.system === '分切'),
)

// ── Extended type for local state ──
// _slotId links a grid card back to its entry in scheduledSlots.
// _originalPlanId is the real plan ID (slotId = 'SP-002_<ts>', originalPlanId = 'SP-002').
interface GridPlan extends SlittingPlan {
  _scheduledKg?: number
  _remainingKg?: number
  _originalPlanId?: string
  _slotId?: string
}

// ── Local drag state ──
const unscheduledPool = ref<GridPlan[]>([])
const gridMap = ref<Record<string, Record<string, GridPlan[]>>>({})

function buildState() {
  const datesArr = dates.value
  const dateWindow = new Set(datesArr)
  const machines = slMachines.value

  const newGrid: Record<string, Record<string, GridPlan[]>> = {}
  for (const m of machines) {
    newGrid[m.machineId] = {}
    for (const d of datesArr) newGrid[m.machineId][d] = []
  }

  const newPool: GridPlan[] = []
  // Track which plan IDs have at least one slot (to exclude from pool).
  const scheduledPlanIds = new Set<string>()

  // ── Slot-based DRAFT entries in grid ──
  // Each call to confirmQty creates a slot; the grid is driven by slots,
  // not by apsStore.slittingPlans, so the same plan can appear in multiple cells.
  for (const [slotId, slot] of Object.entries(scheduledSlots)) {
    const plan = apsStore.slittingPlans.find((p) => p.planId === slot.originalPlanId)
    if (!plan || plan.planStatus === 'COMPLETED') continue
    scheduledPlanIds.add(slot.originalPlanId)
    if (newGrid[slot.machineId]?.[slot.date] !== undefined) {
      newGrid[slot.machineId][slot.date].push({
        ...plan,
        planId: slotId,
        _originalPlanId: slot.originalPlanId,
        _scheduledKg: slot.scheduledKg,
        _slotId: slotId,
      })
    }
  }

  // ── Store-based RELEASED plans in grid (not slot-driven) ──
  for (const plan of apsStore.slittingPlans) {
    if (plan.planStatus !== 'RELEASED') continue
    const mid = plan.machineId
    const pd = plan.plannedDate
    if (mid && pd && newGrid[mid] && dateWindow.has(pd)) {
      newGrid[mid][pd].push({ ...plan })
    }
  }

  // ── Pool: DRAFT plans with no slots, plus remainder entries ──
  for (const plan of apsStore.slittingPlans) {
    if (plan.planStatus !== 'DRAFT') continue
    if (scheduledPlanIds.has(plan.planId)) {
      // Already in grid; show remainder entry if qty remains
      const remainingKg = remainingQtyRecord[plan.planId]
      if (remainingKg > 0) {
        newPool.push({
          ...plan,
          planId: `${plan.planId}_rem`,
          _originalPlanId: plan.planId,
          _remainingKg: remainingKg,
        })
      }
    } else {
      newPool.push({ ...plan })
    }
  }

  gridMap.value = newGrid
  unscheduledPool.value = newPool
}

// Watch all reactive sources that affect the grid/pool layout.
watch(
  [() => apsStore.slittingPlans, slMachines, dates, scheduledSlots, scheduledQtyRecord, remainingQtyRecord],
  buildState,
  { deep: true, immediate: true },
)

onMounted(() => configStore.init())

// ── Helpers ──
function planWeight(plan: SlittingPlan) {
  return plan.combinedOrders.reduce((s, o) => s + o.weightKg, 0)
}

function cardWeight(plan: GridPlan) {
  return plan._scheduledKg ?? planWeight(plan)
}

function poolDisplayWeight(plan: GridPlan) {
  return plan._remainingKg ?? planWeight(plan)
}

function displayPlanId(plan: GridPlan) {
  return plan._originalPlanId ?? plan.planId
}

function cellTotal(machineId: string, date: string): number {
  return (gridMap.value[machineId]?.[date] ?? []).reduce((s, p) => s + cardWeight(p), 0)
}

function completedWeight(planId: string) {
  return apsStore.productionRecords
    .filter((r) => r.sourceId === planId && r.process === '分切')
    .reduce((s, r) => s + r.actualWeightKg, 0)
}

// ── Drag permission ──
function checkMove(evt: any): boolean {
  return (evt.draggedContext.element as SlittingPlan).planStatus !== 'RELEASED'
}

// ── Quantity dialog ──
const showQtyDialog = ref(false)
const qtyPlan = ref<GridPlan | null>(null)
const qtyCell = ref<{ machineId: string; date: string } | null>(null)
const qtyInput = ref(0)

function onCellChange(evt: any, machineId: string, date: string) {
  if (!evt.added) return
  const plan = evt.added.element as GridPlan

  // Slot card moved from one cell to another: just update location, no dialog.
  if (plan._slotId) {
    scheduledSlots[plan._slotId].machineId = machineId
    scheduledSlots[plan._slotId].date = date
    return
  }

  // Pool card (fresh plan or remainder) dropped into cell: open qty dialog.
  qtyPlan.value = plan
  qtyCell.value = { machineId, date }
  qtyInput.value = plan._remainingKg ?? planWeight(plan)
  showQtyDialog.value = true
}

function confirmQty() {
  const plan = qtyPlan.value!
  const { machineId, date } = qtyCell.value!
  const effectivePlanId = plan._originalPlanId ?? plan.planId
  const total = planWeight(plan)
  const maxAllowed = plan._remainingKg ?? total
  const scheduled = Math.max(1, Math.min(Math.round(qtyInput.value), maxAllowed))

  // Each drop creates an independent slot — the same plan can occupy multiple cells.
  const slotId: string = `${effectivePlanId}_${Date.now()}`
  const slot: ScheduledSlot = { slotId, originalPlanId: effectivePlanId, machineId, date, scheduledKg: scheduled, fullPlanWeight: total }
  scheduledSlots[slotId] = slot

  // Accumulate total across all slots for this plan, then derive remaining.
  const newTotal = Object.values(scheduledSlots)
    .filter((s) => s.originalPlanId === effectivePlanId)
    .reduce((sum, s) => sum + s.scheduledKg, 0)
  scheduledQtyRecord[effectivePlanId] = newTotal
  const remaining = total - newTotal
  if (remaining > 0) {
    remainingQtyRecord[effectivePlanId] = remaining
  } else {
    delete remainingQtyRecord[effectivePlanId]
  }

  showQtyDialog.value = false
}

function cancelQty() {
  const plan = qtyPlan.value!
  const { machineId, date } = qtyCell.value!

  // Remove the card that draggable placed in the cell.
  const cellArr = gridMap.value[machineId]?.[date]
  if (cellArr) {
    const idx = cellArr.findIndex((p) => p.planId === plan.planId)
    if (idx !== -1) cellArr.splice(idx, 1)
  }

  if (plan._originalPlanId) {
    // Remainder card: rebuild pool so the remainder entry reappears.
    buildState()
  } else {
    // Fresh plan card: put it back in pool manually.
    if (!unscheduledPool.value.find((p) => p.planId === plan.planId)) {
      unscheduledPool.value.unshift({ ...plan })
    }
  }

  showQtyDialog.value = false
}

// ── Pool drop (slot card dragged from cell back to pool) ──
function onPoolChange(evt: any) {
  if (!evt.added) return
  const plan = evt.added.element as GridPlan

  if (plan._slotId) {
    // Slot card dragged from grid → pool: remove that slot and recompute totals.
    removeSlot(plan._slotId)
    return
  }
  // Pool-to-pool reorder (fresh plan or remainder): no state change needed.
}

// ── Cancel scheduled via × button → remove slot ──
function returnToPool(plan: GridPlan, _machineId: string, _date: string) {
  if (plan._slotId) removeSlot(plan._slotId)
  // buildState is triggered reactively via scheduledSlots watch.
}

// ── Detail dialog ──
const showDetailDialog = ref(false)
const detailPlan = ref<GridPlan | null>(null)
const detailMachineId = ref('')
const detailDate = ref('')

function openDetail(plan: GridPlan, machineId: string, date: string) {
  detailPlan.value = plan
  detailMachineId.value = machineId
  detailDate.value = date
  showDetailDialog.value = true
}

// ── Date helpers ──
function fmtDate(s: string) {
  const d = new Date(s + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()}`
}
function fmtDay(s: string) {
  return ['日', '一', '二', '三', '四', '五', '六'][new Date(s + 'T00:00:00').getDay()]
}
function isWeekend(s: string) {
  const d = new Date(s + 'T00:00:00').getDay()
  return d === 0 || d === 6
}
function fmtWeekRange() {
  return `${fmtDate(dates.value[0])} — ${fmtDate(dates.value[dates.value.length - 1])}`
}
</script>

<template>
  <div class="flex h-full flex-col gap-3">

    <!-- ── Week navigation bar ── -->
    <div class="flex shrink-0 items-center justify-between rounded-xl border border-[#E5E6EB] bg-white px-4 py-2.5 shadow-sm">
      <span class="text-sm font-semibold text-[#1D2129]">
        分切排产工作台
        <span class="ml-2 font-normal text-[#86909C]">{{ fmtWeekRange() }}</span>
      </span>
      <div class="flex items-center gap-2">
        <el-button size="small" @click="goToday">今日</el-button>
        <el-button-group>
          <el-button size="small" @click="prevWeek">‹ 上周</el-button>
          <el-button size="small" @click="nextWeek">下周 ›</el-button>
        </el-button-group>
        <el-date-picker
          v-model="startDate"
          type="date"
          value-format="YYYY-MM-DD"
          :clearable="false"
          placeholder="选择起始日期"
          size="small"
          style="width: 140px"
        />
      </div>
    </div>

    <!-- ── Pool + Grid ── -->
    <div class="flex min-h-0 flex-1 gap-3">

      <!-- ════════════════════════════════════
           LEFT — Unscheduled pool
      ════════════════════════════════════ -->
      <div class="flex w-52 shrink-0 flex-col overflow-hidden rounded-xl border border-[#E5E6EB] bg-white shadow-sm">
        <div class="shrink-0 border-b border-[#E5E6EB] bg-[#F7F8FA] px-3 py-2.5">
          <div class="text-sm font-semibold text-[#1D2129]">待排程任务</div>
          <div class="mt-0.5 text-xs text-[#86909C]">{{ unscheduledPool.length }} 条待分配</div>
        </div>

        <div class="flex-1 overflow-y-auto p-2">
          <draggable
            v-model="unscheduledPool"
            group="scheduling-plans"
            item-key="planId"
            :move="checkMove"
            ghost-class="opacity-30"
            @change="onPoolChange"
          >
            <template #item="{ element: p }">
              <div
                class="mb-2 select-none rounded-lg border p-2.5 shadow-sm transition-shadow hover:shadow-md"
                :class="p._originalPlanId
                  ? 'cursor-grab border-dashed border-[#FF7D00] bg-[#FFF7E8] active:cursor-grabbing'
                  : 'cursor-grab border-[#E5E6EB] bg-white hover:border-[#A0CFFF] active:cursor-grabbing'"
              >
                <div class="flex items-start justify-between gap-1">
                  <span class="text-[11px] font-bold text-[#165DFF]">{{ displayPlanId(p) }}</span>
                  <span
                    class="shrink-0 font-mono text-[10px]"
                    :class="p._originalPlanId ? 'text-[#FF7D00]' : 'text-[#86909C]'"
                  >{{ poolDisplayWeight(p) }}kg</span>
                </div>
                <div v-if="p._originalPlanId" class="mt-0.5 text-[9px] text-[#FF7D00]">
                  剩余 / 已排 {{ scheduledQtyRecord[p._originalPlanId] ?? 0 }}kg
                </div>
                <div class="mt-0.5 text-[10px] text-[#4E5969]">{{ p.targetRollId }}</div>
                <div class="mt-1.5 flex flex-wrap gap-1">
                  <span
                    v-for="o in p.combinedOrders"
                    :key="o.orderId"
                    class="rounded-sm bg-[#E8F3FF] px-1 py-0.5 text-[10px] text-[#165DFF]"
                  >{{ o.width }}mm</span>
                </div>
              </div>
            </template>
          </draggable>

          <div v-if="unscheduledPool.length === 0" class="mt-8 text-center text-xs text-[#C9CDD4]">
            所有任务已排程 
          </div>
        </div>
      </div>

      <!-- ════════════════════════════════════
           RIGHT — Machine × Date bucket grid
      ════════════════════════════════════ -->
      <div class="min-w-0 flex-1 overflow-auto rounded-xl border border-[#E5E6EB] bg-white shadow-sm">
        <div v-if="slMachines.length === 0" class="flex h-full items-center justify-center text-sm text-[#C9CDD4]">
          正在加载机台配置…
        </div>

        <table v-else class="border-collapse" style="min-width: max-content; width: 100%">
          <!-- Date header -->
          <thead>
            <tr>
              <th class="sticky left-0 z-20 w-[72px] border-b border-r border-[#E5E6EB] bg-[#F7F8FA] px-2 py-2 text-left text-xs font-semibold text-[#4E5969]">
                系统
              </th>
              <th
                v-for="d in dates"
                :key="d"
                class="w-[160px] border-b border-r border-[#E5E6EB] px-2 py-2 text-center"
                :class="{
                  'bg-[#EBF3FF]':  d === todayStr,
                  'bg-[#FAFAFA]':  isWeekend(d) && d !== todayStr,
                  'bg-[#F7F8FA]': !isWeekend(d) && d !== todayStr,
                }"
              >
                <div class="text-xs font-semibold" :class="d === todayStr ? 'text-[#165DFF]' : 'text-[#1D2129]'">
                  {{ fmtDate(d) }}
                  <span v-if="d === todayStr" class="ml-1 inline-block rounded-sm bg-[#165DFF] px-1 py-px text-[9px] text-white">今</span>
                </div>
                <div
                  class="text-[10px] font-normal"
                  :class="{
                    'text-[#4080FF]': d === todayStr,
                    'text-[#F53F3F]': isWeekend(d) && d !== todayStr,
                    'text-[#86909C]': !isWeekend(d) && d !== todayStr,
                  }"
                >
                  周{{ fmtDay(d) }}
                </div>
              </th>
            </tr>
          </thead>

          <!-- Machine rows -->
          <tbody>
            <tr v-for="m in slMachines" :key="m.machineId">
              <td class="sticky left-0 z-10 border-b border-r border-[#E5E6EB] bg-[#F7F8FA] px-2 py-2 align-middle">
                <span class="text-[11px] font-bold text-[#1D2129]">{{ m.machineId }}</span>
              </td>

              <td
                v-for="d in dates"
                :key="d"
                class="border-b border-r border-[#E5E6EB] p-1.5 align-top"
                :class="{
                  'bg-[#FAFCFF]': d === todayStr,
                  'bg-[#FAFAFA]': isWeekend(d) && d !== todayStr,
                }"
              >
                <!-- Weight badge in its own header row — never overlaps card buttons -->
                <div class="mb-1 flex h-4 shrink-0 items-center justify-end">
                  <span
                    v-if="cellTotal(m.machineId, d) > 0"
                    class="rounded bg-[#F0F1F5] px-1.5 py-px font-mono text-[10px] text-[#4E5969]"
                  >{{ cellTotal(m.machineId, d) }}kg</span>
                </div>

                <!-- Drop zone -->
                <div class="relative min-h-[112px]">
                  <div
                    v-if="(gridMap[m.machineId]?.[d] ?? []).length === 0"
                    class="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg border border-dashed border-[#D1D5DB] text-[10px] text-[#C9CDD4]"
                  >
                    拖入排程
                  </div>

                  <draggable
                    v-model="gridMap[m.machineId][d]"
                    group="scheduling-plans"
                    item-key="planId"
                    :move="checkMove"
                    ghost-class="opacity-30"
                    class="min-h-[112px]"
                    @change="onCellChange($event, m.machineId, d)"
                  >
                    <template #item="{ element: plan }">
                      <div
                        class="group relative mb-1 select-none rounded-md border p-1.5 text-[11px] transition-shadow"
                        :class="
                          plan.planStatus === 'RELEASED'
                            ? 'cursor-not-allowed border-[#B7EB8F] bg-[#F6FFED]'
                            : 'cursor-grab border-[#D9E1F0] bg-white hover:border-[#A0CFFF] hover:shadow-md active:cursor-grabbing'
                        "
                        @dblclick="openDetail(plan, m.machineId, d)"
                      >
                        <!-- Cancel button: top-right of card, shown on hover -->
                        <button
                          v-if="plan.planStatus === 'DRAFT'"
                          class="absolute right-1 top-1 z-10 hidden h-4 w-4 items-center justify-center rounded-full bg-[#F53F3F] text-[9px] leading-none text-white group-hover:flex"
                          title="取消排程"
                          @click.stop="returnToPool(plan, m.machineId, d)"
                        >×</button>

                        <div class="flex items-center justify-between gap-1 pr-5">
                          <span
                            class="truncate font-bold"
                            :class="plan.planStatus === 'RELEASED' ? 'text-[#389E0D]' : 'text-[#165DFF]'"
                          >{{ displayPlanId(plan) }}</span>
                          <span
                            v-if="plan.planStatus === 'RELEASED'"
                            class="shrink-0 rounded-sm bg-[#D9F7BE] px-1 py-px text-[9px] text-[#389E0D]"
                          >锁定</span>
                        </div>
                        <div class="mt-0.5 truncate text-[10px] text-[#86909C]">
                          {{ plan.targetRollId }}
                        </div>
                        <div
                          class="mt-0.5 font-mono text-[10px]"
                          :class="plan._scheduledKg ? 'text-[#FF7D00]' : 'text-[#4E5969]'"
                        >
                          {{ cardWeight(plan) }}kg
                          <span v-if="plan._scheduledKg && plan._scheduledKg < planWeight(plan)" class="text-[#C9CDD4]">/ {{ planWeight(plan) }}kg</span>
                        </div>
                      </div>
                    </template>
                  </draggable>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── Quantity input dialog ── -->
    <el-dialog
      v-model="showQtyDialog"
      title="填写排产量"
      width="360px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
      destroy-on-close
    >
      <template v-if="qtyPlan">
        <div class="mb-4 rounded-lg bg-[#F7F8FA] p-3 text-sm text-[#4E5969]">
          <div class="flex justify-between">
            <span>计划号</span>
            <span class="font-bold text-[#165DFF]">{{ displayPlanId(qtyPlan) }}</span>
          </div>
          <div class="mt-1 flex justify-between">
            <span>母卷</span>
            <span>{{ qtyPlan.targetRollId }}</span>
          </div>
          <div class="mt-1 flex justify-between">
            <span>订单总量</span>
            <span class="font-mono font-semibold text-[#1D2129]">{{ planWeight(qtyPlan) }} kg</span>
          </div>
          <div v-if="qtyPlan._remainingKg !== undefined" class="mt-1 flex justify-between">
            <span class="text-[#FF7D00]">剩余待排</span>
            <span class="font-mono font-semibold text-[#FF7D00]">{{ qtyPlan._remainingKg }} kg</span>
          </div>
          <div class="mt-1 flex justify-between">
            <span>排入日期</span>
            <span>{{ qtyCell?.date }}</span>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <span class="shrink-0 text-sm text-[#4E5969]">本次排产量 (kg)</span>
          <el-input-number
            v-model="qtyInput"
            :min="1"
            :max="qtyPlan._remainingKg ?? planWeight(qtyPlan)"
            :precision="0"
            :step="100"
            controls-position="right"
            style="flex: 1"
          />
        </div>
        <div v-if="qtyInput < (qtyPlan._remainingKg ?? planWeight(qtyPlan))" class="mt-2 text-xs text-[#FF7D00]">
          剩余 {{ (qtyPlan._remainingKg ?? planWeight(qtyPlan)) - qtyInput }} kg 将保留在待排程队列中
        </div>
      </template>
      <template #footer>
        <el-button @click="cancelQty">取消</el-button>
        <el-button type="primary" @click="confirmQty">确认排入</el-button>
      </template>
    </el-dialog>

    <!-- ── Detail dialog ── -->
    <el-dialog
      v-model="showDetailDialog"
      :title="`计划详情 — ${detailPlan ? displayPlanId(detailPlan) : ''}`"
      width="480px"
      destroy-on-close
    >
      <template v-if="detailPlan">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="计划号" :span="2">
            <span class="font-bold text-[#165DFF]">{{ displayPlanId(detailPlan) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="机台">{{ detailMachineId }}</el-descriptions-item>
          <el-descriptions-item label="计划员">{{ detailPlan.createdBy }}</el-descriptions-item>
          <el-descriptions-item label="计划日期">{{ detailDate }}</el-descriptions-item>
          <el-descriptions-item label="母卷号">{{ detailPlan.targetRollId }}</el-descriptions-item>
          <el-descriptions-item label="今日排产量">
            <span class="font-mono font-semibold text-[#165DFF]">{{ cardWeight(detailPlan) }} kg</span>
          </el-descriptions-item>
          <el-descriptions-item label="计划总量">
            <span class="font-mono">{{ planWeight(detailPlan) }} kg</span>
          </el-descriptions-item>
          <el-descriptions-item label="已生产量">
            <span class="font-mono" :class="completedWeight(displayPlanId(detailPlan)) > 0 ? 'text-[#00B42A] font-semibold' : 'text-[#86909C]'">
              {{ completedWeight(displayPlanId(detailPlan)) }} kg
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="未完成量">
            <span class="font-mono text-[#F53F3F]">
              {{ planWeight(detailPlan) - completedWeight(displayPlanId(detailPlan)) }} kg
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="出材率">
            <span class="font-mono">{{ Math.round(detailPlan.efficiency * 100) }}%</span>
          </el-descriptions-item>
          <el-descriptions-item label="废边宽">
            <span class="font-mono">{{ detailPlan.trimWasteWidth }} mm</span>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag effect="light" :type="detailPlan.planStatus === 'RELEASED' ? 'success' : 'info'" size="small">
              {{ detailPlan.planStatus }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <div class="mt-4">
          <div class="mb-2 text-xs font-semibold text-[#4E5969]">计划订单明细</div>
          <el-table :data="detailPlan.combinedOrders" border size="small">
            <el-table-column prop="orderId" label="订单号" />
            <el-table-column prop="width" label="宽度 (mm)" align="right">
              <template #default="{ row }"><span class="font-mono">{{ row.width }}</span></template>
            </el-table-column>
            <el-table-column prop="weightKg" label="订单量 (kg)" align="right">
              <template #default="{ row }"><span class="font-mono">{{ row.weightKg }}</span></template>
            </el-table-column>
          </el-table>
        </div>
      </template>
    </el-dialog>

  </div>
</template>
