<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import draggable from 'vuedraggable'
import { useApsStore } from '@/stores/aps'
import { useConfigStore } from '@/stores/useConfigStore'
import { useBakingState } from '@/composables/useBakingState'

const apsStore = useApsStore()
const configStore = useConfigStore()
const { bakingSlots, removeSlot } = useBakingState()

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

// ── Baking machines ──
const bkMachines = computed(() =>
  configStore.machineList.filter((m) => m.system === '烘烤'),
)

// ── Aggregated spec group ──
interface AggregatedRoll {
  specKey: string        // '6-600'
  thickness: number
  width: number
  rollIds: string[]
  totalWeightKg: number
  rollCount: number
  _slotId?: string
}

const unscheduledPool = ref<AggregatedRoll[]>([])
const gridMap = ref<Record<string, Record<string, AggregatedRoll[]>>>({})

function buildState() {
  const datesArr = dates.value
  const machines = bkMachines.value

  const newGrid: Record<string, Record<string, AggregatedRoll[]>> = {}
  for (const m of machines) {
    newGrid[m.machineId] = {}
    for (const d of datesArr) newGrid[m.machineId][d] = []
  }

  // Rebuild grid from slot data
  for (const [slotId, slot] of Object.entries(bakingSlots)) {
    if (newGrid[slot.machineId]?.[slot.date] === undefined) continue
    // Reconstruct spec from first roll
    const firstRoll = apsStore.rawFoilInventory.find((r) => slot.rollIds[0] === r.rollId)
    if (!firstRoll) continue
    newGrid[slot.machineId][slot.date].push({
      specKey: `${firstRoll.thickness}-${firstRoll.width}`,
      thickness: firstRoll.thickness,
      width: firstRoll.width,
      rollIds: slot.rollIds,
      totalWeightKg: slot.weightKg,
      rollCount: slot.rollIds.length,
      _slotId: slotId,
    })
  }

  // Pool: aggregate AVAILABLE rolls by spec, skip slotted rolls
  const slottedRollIds = new Set(
    Object.values(bakingSlots).flatMap((s) => s.rollIds),
  )
  const specMap = new Map<string, AggregatedRoll>()

  for (const r of apsStore.rawFoilInventory) {
    if (r.status !== 'AVAILABLE') continue
    if (slottedRollIds.has(r.rollId)) continue
    const specKey = `${r.thickness}-${r.width}`
    if (!specMap.has(specKey)) {
      specMap.set(specKey, {
        specKey,
        thickness: r.thickness,
        width: r.width,
        rollIds: [],
        totalWeightKg: 0,
        rollCount: 0,
      })
    }
    const entry = specMap.get(specKey)!
    entry.rollIds.push(r.rollId)
    entry.totalWeightKg += r.weightKg
    entry.rollCount++
  }

  gridMap.value = newGrid
  unscheduledPool.value = [...specMap.values()]
}

watch(
  [() => apsStore.rawFoilInventory, bkMachines, dates, bakingSlots],
  buildState,
  { deep: true, immediate: true },
)

onMounted(() => configStore.init())

// ── Helpers ──
function cellTotal(machineId: string, date: string): number {
  return (gridMap.value[machineId]?.[date] ?? []).reduce((s, r) => s + r.totalWeightKg, 0)
}

// ── Drag handlers ──
function onCellChange(evt: any, machineId: string, date: string) {
  if (!evt.added) return
  const roll = evt.added.element as AggregatedRoll

  // Slot card moved cell-to-cell: update location only
  if (roll._slotId) {
    bakingSlots[roll._slotId].machineId = machineId
    bakingSlots[roll._slotId].date = date
    return
  }

  // Pool card dropped into cell: create slot with all rolls in this spec group
  const slotId = `${roll.specKey}_${Date.now()}`
  bakingSlots[slotId] = {
    slotId,
    rollIds: roll.rollIds,
    machineId,
    date,
    weightKg: roll.totalWeightKg,
  }
}

function onPoolChange(evt: any) {
  if (!evt.added) return
  const roll = evt.added.element as AggregatedRoll
  if (roll._slotId) removeSlot(roll._slotId)
}

function returnToPool(roll: AggregatedRoll) {
  if (roll._slotId) removeSlot(roll._slotId)
}

// ── Detail dialog ──
const showDetailDialog = ref(false)
const detailRoll = ref<AggregatedRoll | null>(null)
const detailMachineId = ref('')
const detailDate = ref('')

function openDetail(roll: AggregatedRoll, machineId: string, date: string) {
  detailRoll.value = roll
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
        烘烤排产工作台
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
          <div class="text-sm font-semibold text-[#1D2129]">待入炉生箔</div>
          <div class="mt-0.5 text-xs text-[#86909C]">{{ unscheduledPool.length }} 种规格可用</div>
        </div>

        <div class="flex-1 overflow-y-auto p-2">
          <draggable
            v-model="unscheduledPool"
            group="baking-rolls"
            item-key="specKey"
            ghost-class="opacity-30"
            @change="onPoolChange"
          >
            <template #item="{ element: r }">
              <div
                class="mb-2 cursor-grab select-none rounded-lg border border-[#E5E6EB] bg-white p-2.5 shadow-sm transition-shadow hover:border-[#A0CFFF] hover:shadow-md active:cursor-grabbing"
              >
                <div class="flex items-start justify-between gap-1">
                  <span class="font-mono text-[11px] font-bold text-[#165DFF]">
                    {{ r.thickness }}μm / {{ r.width }}mm
                  </span>
                  <span class="shrink-0 font-mono text-[10px] font-semibold text-[#F53F3F]">{{ r.totalWeightKg }}kg</span>
                </div>
                <div class="mt-1 flex items-center gap-1 text-[10px] text-[#86909C]">
                  <span class="rounded-sm bg-[#F0F1F5] px-1 py-0.5">{{ r.rollCount }} 卷</span>
                  <span class="truncate">{{ r.rollIds.join(', ') }}</span>
                </div>
              </div>
            </template>
          </draggable>

          <div v-if="unscheduledPool.length === 0" class="mt-8 text-center text-xs text-[#C9CDD4]">
            所有生箔已排程 ✓
          </div>
        </div>
      </div>

      <!-- ════════════════════════════════════
           RIGHT — Machine × Date bucket grid
      ════════════════════════════════════ -->
      <div class="min-w-0 flex-1 overflow-auto rounded-xl border border-[#E5E6EB] bg-white shadow-sm">
        <div v-if="bkMachines.length === 0" class="flex h-full items-center justify-center text-sm text-[#C9CDD4]">
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
            <tr v-for="m in bkMachines" :key="m.machineId">
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
                    group="baking-rolls"
                    item-key="specKey"
                    ghost-class="opacity-30"
                    class="min-h-[112px]"
                    @change="onCellChange($event, m.machineId, d)"
                  >
                    <template #item="{ element: roll }">
                      <div
                        class="group relative mb-1 cursor-grab select-none rounded-md border border-[#D9E1F0] bg-white p-1.5 text-[11px] transition-shadow hover:border-[#A0CFFF] hover:shadow-md active:cursor-grabbing"
                        @dblclick="openDetail(roll, m.machineId, d)"
                      >
                        <!-- Cancel button -->
                        <button
                          class="absolute right-1 top-1 z-10 hidden h-4 w-4 items-center justify-center rounded-full bg-[#F53F3F] text-[9px] leading-none text-white group-hover:flex"
                          title="取消排程"
                          @click.stop="returnToPool(roll)"
                        >×</button>

                        <div class="pr-5 font-bold font-mono text-[#165DFF]">
                          {{ roll.thickness }}μm/{{ roll.width }}mm
                        </div>
                        <div class="mt-0.5 font-mono text-[10px] text-[#4E5969]">
                          {{ roll.rollCount }} 卷 · {{ roll.totalWeightKg }}kg
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

    <!-- ── Detail dialog ── -->
    <el-dialog
      v-model="showDetailDialog"
      :title="`入炉批次详情 — ${detailRoll?.thickness}μm/${detailRoll?.width}mm`"
      width="420px"
      destroy-on-close
    >
      <template v-if="detailRoll">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="规格" :span="2">
            <span class="font-bold font-mono text-[#165DFF]">
              {{ detailRoll.thickness }}μm / {{ detailRoll.width }}mm
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="入炉系统">{{ detailMachineId }}</el-descriptions-item>
          <el-descriptions-item label="计划入炉日">{{ detailDate }}</el-descriptions-item>
          <el-descriptions-item label="卷数">{{ detailRoll.rollCount }} 卷</el-descriptions-item>
          <el-descriptions-item label="总重量">
            <span class="font-mono font-semibold text-[#165DFF]">{{ detailRoll.totalWeightKg }} kg</span>
          </el-descriptions-item>
          <el-descriptions-item label="卷号列表" :span="2">
            <div class="flex flex-wrap gap-1">
              <el-tag v-for="id in detailRoll.rollIds" :key="id" effect="light" type="info" size="small">{{ id }}</el-tag>
            </div>
          </el-descriptions-item>
        </el-descriptions>
      </template>
    </el-dialog>

  </div>
</template>
