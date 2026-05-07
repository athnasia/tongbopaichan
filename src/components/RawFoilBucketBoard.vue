<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import draggable from 'vuedraggable'
import { useApsStore } from '@/stores/aps'
import { useConfigStore } from '@/stores/useConfigStore'
import { useRawFoilPlanState } from '@/composables/useRawFoilPlanState'
import type { DemandShortageRow } from '@/types/demo'

const apsStore = useApsStore()
const configStore = useConfigStore()
const { rawFoilSlots, removeSlot } = useRawFoilPlanState()

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

// ── Raw foil machines ──
const rfMachines = computed(() =>
  configStore.machineList.filter((m) => m.machineId.startsWith('RF-')),
)

// ── Extended type for grid/pool ──
interface GridDemand extends DemandShortageRow {
  _slotId?: string
  _plannedKg?: number
}

const unscheduledPool = ref<GridDemand[]>([])
const gridMap = ref<Record<string, Record<string, GridDemand[]>>>({})

function buildState() {
  const datesArr = dates.value
  const machines = rfMachines.value

  const newGrid: Record<string, Record<string, GridDemand[]>> = {}
  for (const m of machines) {
    newGrid[m.machineId] = {}
    for (const d of datesArr) newGrid[m.machineId][d] = []
  }

  const slottedOrderIds = new Set(Object.values(rawFoilSlots).map((s) => s.productionOrderId))

  // Grid: slot-based entries
  for (const [slotId, slot] of Object.entries(rawFoilSlots)) {
    const demand = apsStore.demandShortages.find((d) => d.productionOrderId === slot.productionOrderId)
    if (!demand) continue
    if (newGrid[slot.machineId]?.[slot.date] !== undefined) {
      newGrid[slot.machineId][slot.date].push({
        ...demand,
        _slotId: slotId,
        _plannedKg: slot.plannedWeightKg,
      })
    }
  }

  // Pool: demands with shortageKg > 0 not yet slotted
  const newPool: GridDemand[] = apsStore.demandShortages
    .filter((d) => d.shortageKg > 0 && !slottedOrderIds.has(d.productionOrderId))
    .map((d) => ({ ...d }))

  gridMap.value = newGrid
  unscheduledPool.value = newPool
}

watch(
  [() => apsStore.demandShortages, rfMachines, dates, rawFoilSlots],
  buildState,
  { deep: true, immediate: true },
)

onMounted(() => configStore.init())

// ── Helpers ──
function cellTotal(machineId: string, date: string): number {
  return (gridMap.value[machineId]?.[date] ?? []).reduce((s, d) => s + (d._plannedKg ?? d.shortageKg), 0)
}

// ── Quantity dialog ──
const showQtyDialog = ref(false)
const qtyDemand = ref<GridDemand | null>(null)
const qtyCell = ref<{ machineId: string; date: string } | null>(null)
const qtyInput = ref(0)

function onCellChange(evt: any, machineId: string, date: string) {
  if (!evt.added) return
  const demand = evt.added.element as GridDemand

  // Slot card moved cell-to-cell: update location only
  if (demand._slotId) {
    rawFoilSlots[demand._slotId].machineId = machineId
    rawFoilSlots[demand._slotId].date = date
    return
  }

  // Pool card dropped: open qty dialog
  qtyDemand.value = demand
  qtyCell.value = { machineId, date }
  qtyInput.value = demand.shortageKg
  showQtyDialog.value = true
}

function confirmQty() {
  const demand = qtyDemand.value!
  const { machineId, date } = qtyCell.value!
  const slotId = `${demand.productionOrderId}_${Date.now()}`
  rawFoilSlots[slotId] = {
    slotId,
    productionOrderId: demand.productionOrderId,
    machineId,
    date,
    plannedWeightKg: Math.max(1, Math.round(qtyInput.value)),
    thickness: demand.thickness,
    width: demand.width,
    strength: demand.strength,
  }
  showQtyDialog.value = false
}

function cancelQty() {
  const demand = qtyDemand.value!
  const { machineId, date } = qtyCell.value!
  const cellArr = gridMap.value[machineId]?.[date]
  if (cellArr) {
    const idx = cellArr.findIndex((d) => d.productionOrderId === demand.productionOrderId && !d._slotId)
    if (idx !== -1) cellArr.splice(idx, 1)
  }
  if (!unscheduledPool.value.find((d) => d.productionOrderId === demand.productionOrderId)) {
    unscheduledPool.value.unshift({ ...demand })
  }
  showQtyDialog.value = false
}

function onPoolChange(evt: any) {
  if (!evt.added) return
  const demand = evt.added.element as GridDemand
  if (demand._slotId) removeSlot(demand._slotId)
}

function returnToPool(demand: GridDemand) {
  if (demand._slotId) removeSlot(demand._slotId)
}

// ── Detail dialog ──
const showDetailDialog = ref(false)
const detailDemand = ref<GridDemand | null>(null)
const detailMachineId = ref('')
const detailDate = ref('')

function openDetail(demand: GridDemand, machineId: string, date: string) {
  detailDemand.value = demand
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
        生箔排产工作台
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
           LEFT — Demand shortage pool
      ════════════════════════════════════ -->
      <div class="flex w-52 shrink-0 flex-col overflow-hidden rounded-xl border border-[#E5E6EB] bg-white shadow-sm">
        <div class="shrink-0 border-b border-[#E5E6EB] bg-[#F7F8FA] px-3 py-2.5">
          <div class="text-sm font-semibold text-[#1D2129]">排产需求池</div>
          <div class="mt-0.5 text-xs text-[#86909C]">{{ unscheduledPool.length }} 条缺口待排</div>
        </div>

        <div class="flex-1 overflow-y-auto p-2">
          <draggable
            v-model="unscheduledPool"
            group="rawfoil-demands"
            item-key="productionOrderId"
            ghost-class="opacity-30"
            @change="onPoolChange"
          >
            <template #item="{ element: d }">
              <div
                class="mb-2 cursor-grab select-none rounded-lg border border-[#E5E6EB] bg-white p-2.5 shadow-sm transition-shadow hover:border-[#A0CFFF] hover:shadow-md active:cursor-grabbing"
              >
                <div class="flex items-start justify-between gap-1">
                  <span class="text-[11px] font-bold text-[#165DFF]">{{ d.productionOrderId }}</span>
                  <span class="shrink-0 font-mono text-[10px] text-[#F53F3F] font-semibold">{{ d.shortageKg }}kg</span>
                </div>
                <div class="mt-0.5 font-mono text-[10px] text-[#4E5969]">
                  {{ d.thickness }}μm / {{ d.width }}mm / {{ d.strength }}
                </div>
                <div class="mt-1 flex items-center gap-1">
                  <span class="rounded-sm bg-[#FFF3E0] px-1 py-0.5 text-[10px] text-[#FF7D00]">{{ d.urgency }}</span>
                </div>
              </div>
            </template>
          </draggable>

          <div v-if="unscheduledPool.length === 0" class="mt-8 text-center text-xs text-[#C9CDD4]">
            所有缺口已排程 ✓
          </div>
        </div>
      </div>

      <!-- ════════════════════════════════════
           RIGHT — Machine × Date bucket grid
      ════════════════════════════════════ -->
      <div class="min-w-0 flex-1 overflow-auto rounded-xl border border-[#E5E6EB] bg-white shadow-sm">
        <div v-if="rfMachines.length === 0" class="flex h-full items-center justify-center text-sm text-[#C9CDD4]">
          正在加载机台配置…
        </div>

        <table v-else class="border-collapse" style="min-width: max-content; width: 100%">
          <!-- Date header -->
          <thead>
            <tr>
              <th class="sticky left-0 z-20 w-[72px] border-b border-r border-[#E5E6EB] bg-[#F7F8FA] px-2 py-2 text-left text-xs font-semibold text-[#4E5969]">
                机台
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
            <tr v-for="m in rfMachines" :key="m.machineId">
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
                <!-- Weight badge -->
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
                    group="rawfoil-demands"
                    item-key="productionOrderId"
                    ghost-class="opacity-30"
                    class="min-h-[112px]"
                    @change="onCellChange($event, m.machineId, d)"
                  >
                    <template #item="{ element: demand }">
                      <div
                        class="group relative mb-1 cursor-grab select-none rounded-md border border-[#D9E1F0] bg-white p-1.5 text-[11px] transition-shadow hover:border-[#A0CFFF] hover:shadow-md active:cursor-grabbing"
                        @dblclick="openDetail(demand, m.machineId, d)"
                      >
                        <!-- Cancel button -->
                        <button
                          class="absolute right-1 top-1 z-10 hidden h-4 w-4 items-center justify-center rounded-full bg-[#F53F3F] text-[9px] leading-none text-white group-hover:flex"
                          title="取消排程"
                          @click.stop="returnToPool(demand)"
                        >×</button>

                        <div class="pr-5 font-bold text-[#165DFF]">{{ demand.productionOrderId }}</div>
                        <div class="mt-0.5 font-mono text-[10px] text-[#86909C]">
                          {{ demand.thickness }}μm / {{ demand.width }}mm / {{ demand.strength }}
                        </div>
                        <div class="mt-0.5 font-mono text-[10px] text-[#165DFF] font-semibold">
                          {{ demand._plannedKg ?? demand.shortageKg }}kg
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
      title="填写生产计划量"
      width="360px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
      destroy-on-close
    >
      <template v-if="qtyDemand">
        <div class="mb-4 rounded-lg bg-[#F7F8FA] p-3 text-sm text-[#4E5969]">
          <div class="flex justify-between">
            <span>生产单号</span>
            <span class="font-bold text-[#165DFF]">{{ qtyDemand.productionOrderId }}</span>
          </div>
          <div class="mt-1 flex justify-between">
            <span>规格</span>
            <span class="font-mono">{{ qtyDemand.thickness }}μm / {{ qtyDemand.width }}mm / {{ qtyDemand.strength }}</span>
          </div>
          <div class="mt-1 flex justify-between">
            <span>缺口量</span>
            <span class="font-mono font-semibold text-[#F53F3F]">{{ qtyDemand.shortageKg }} kg</span>
          </div>
          <div class="mt-1 flex justify-between">
            <span>排入机台</span>
            <span>{{ qtyCell?.machineId }}</span>
          </div>
          <div class="mt-1 flex justify-between">
            <span>排入日期</span>
            <span>{{ qtyCell?.date }}</span>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <span class="shrink-0 text-sm text-[#4E5969]">计划生产量 (kg)</span>
          <el-input-number
            v-model="qtyInput"
            :min="1"
            :precision="0"
            :step="100"
            controls-position="right"
            style="flex: 1"
          />
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
      :title="`需求详情 — ${detailDemand?.productionOrderId}`"
      width="420px"
      destroy-on-close
    >
      <template v-if="detailDemand">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="生产单号" :span="2">
            <span class="font-bold text-[#165DFF]">{{ detailDemand.productionOrderId }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="机台">{{ detailMachineId }}</el-descriptions-item>
          <el-descriptions-item label="计划日期">{{ detailDate }}</el-descriptions-item>
          <el-descriptions-item label="厚度">{{ detailDemand.thickness }} μm</el-descriptions-item>
          <el-descriptions-item label="宽度">{{ detailDemand.width }} mm</el-descriptions-item>
          <el-descriptions-item label="强度">{{ detailDemand.strength }}</el-descriptions-item>
          <el-descriptions-item label="紧急度">{{ detailDemand.urgency }}</el-descriptions-item>
          <el-descriptions-item label="目标量">
            <span class="font-mono">{{ detailDemand.targetWeightKg }} kg</span>
          </el-descriptions-item>
          <el-descriptions-item label="缺口量">
            <span class="font-mono font-semibold text-[#F53F3F]">{{ detailDemand.shortageKg }} kg</span>
          </el-descriptions-item>
          <el-descriptions-item label="本次计划量" :span="2">
            <span class="font-mono font-semibold text-[#165DFF]">{{ detailDemand._plannedKg ?? detailDemand.shortageKg }} kg</span>
          </el-descriptions-item>
        </el-descriptions>
      </template>
    </el-dialog>

  </div>
</template>
