<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import draggable from 'vuedraggable'
import type { MachineCapability, SlittingPlan } from '@/types/aps'
import { useApsStore } from '@/stores/aps'

const props = defineProps<{
  plans: SlittingPlan[]
  machines: MachineCapability[]
}>()

const apsStore = useApsStore()

const todayStr = new Date().toISOString().slice(0, 10)

const dates = computed<string[]>(() => {
  const result: string[] = []
  const base = new Date()
  for (let i = 0; i < 14; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    result.push(d.toISOString().slice(0, 10))
  }
  return result
})

const slMachines = computed(() =>
  props.machines.filter((m) => m.system === '分切'),
)

const unscheduledPool = ref<SlittingPlan[]>([])
const gridMap = ref<Record<string, Record<string, SlittingPlan[]>>>({})

function buildState() {
  const datesArr = dates.value
  const dateWindow = new Set(datesArr)

  const newGrid: Record<string, Record<string, SlittingPlan[]>> = {}
  for (const m of slMachines.value) {
    newGrid[m.machineId] = {}
    for (const d of datesArr) {
      newGrid[m.machineId][d] = []
    }
  }

  const newPool: SlittingPlan[] = []

  for (const plan of props.plans) {
    if (plan.planStatus === 'COMPLETED') continue
    const { machineId: mid, plannedDate: pd } = plan
    if (mid && pd && newGrid[mid] && dateWindow.has(pd)) {
      newGrid[mid][pd].push({ ...plan })
    } else if (plan.planStatus === 'DRAFT') {
      newPool.push({ ...plan })
    }
    // RELEASED plans outside the 14-day window are not rendered
  }

  gridMap.value = newGrid
  unscheduledPool.value = newPool
}

watch(() => props.plans, buildState, { deep: true, immediate: true })
watch(slMachines, buildState)

function planWeight(plan: SlittingPlan) {
  return plan.combinedOrders.reduce((s, o) => s + o.weightKg, 0)
}

function cellTotal(machineId: string, date: string) {
  return (gridMap.value[machineId]?.[date] ?? []).reduce((s, p) => s + planWeight(p), 0)
}

function checkMove(evt: any): boolean {
  return (evt.draggedContext.element as SlittingPlan).planStatus !== 'RELEASED'
}

function onCellChange(evt: any, machineId: string, date: string) {
  if (!evt.added) return
  const plan = evt.added.element as SlittingPlan
  apsStore.updateSlittingPlanSchedule({ planId: plan.planId, newMachineId: machineId, newDate: date })
}

function onPoolChange(evt: any) {
  if (!evt.added) return
  const plan = evt.added.element as SlittingPlan
  // Clear the machine/date assignment so the plan is truly unscheduled
  apsStore.updateSlittingPlanSchedule({ planId: plan.planId, newMachineId: '', newDate: '' })
}

function fmtDate(s: string) {
  const d = new Date(s)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function fmtDay(s: string) {
  return ['日', '一', '二', '三', '四', '五', '六'][new Date(s).getDay()]
}

function isWeekend(s: string) {
  const day = new Date(s).getDay()
  return day === 0 || day === 6
}
</script>

<template>
  <div class="flex h-full min-h-0 gap-3">

    <!-- ── Left: Unscheduled Pool ── -->
    <div class="flex w-52 shrink-0 flex-col overflow-hidden rounded-xl border border-[#E5E6EB] bg-white shadow-sm">
      <div class="border-b border-[#E5E6EB] bg-[#F7F8FA] px-3 py-2.5">
        <div class="text-sm font-semibold text-[#1D2129]">待排程任务</div>
        <div class="mt-0.5 text-xs text-[#86909C]">{{ unscheduledPool.length }} 条待分配</div>
      </div>

      <div class="flex-1 overflow-y-auto p-2">
        <draggable
          v-model="unscheduledPool"
          group="plans"
          item-key="planId"
          :move="checkMove"
          ghost-class="opacity-30"
          @change="onPoolChange"
        >
          <template #item="{ element: p }">
            <div
              class="mb-2 cursor-grab select-none rounded-lg border border-[#E5E6EB] bg-white p-2.5 shadow-sm transition-shadow hover:border-[#A0CFFF] hover:shadow-md active:cursor-grabbing"
            >
              <div class="flex items-start justify-between gap-1">
                <span class="text-[11px] font-bold text-[#165DFF]">{{ p.planId }}</span>
                <span class="shrink-0 font-mono text-[10px] text-[#86909C]">{{ planWeight(p) }}kg</span>
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
          所有任务已排程 ✓
        </div>
      </div>
    </div>

    <!-- ── Right: Machine × Date Grid ── -->
    <div class="min-w-0 flex-1 overflow-auto rounded-xl border border-[#E5E6EB] bg-white shadow-sm">
      <table class="border-collapse" style="min-width: max-content">
        <thead>
          <tr class="bg-[#F7F8FA]">
            <!-- Sticky machine header cell -->
            <th
              class="sticky left-0 z-20 w-[72px] border-b border-r border-[#E5E6EB] bg-[#F7F8FA] px-2 py-2 text-left text-xs font-semibold text-[#4E5969]"
            >
              机台
            </th>
            <!-- Date header cells -->
            <th
              v-for="d in dates"
              :key="d"
              class="w-[148px] border-b border-r border-[#E5E6EB] px-2 py-2 text-center"
              :class="{
                'bg-[#EBF3FF]': d === todayStr,
                'bg-[#FAFAFA]': isWeekend(d) && d !== todayStr,
                'bg-[#F7F8FA]': !isWeekend(d) && d !== todayStr,
              }"
            >
              <div
                class="text-xs font-semibold"
                :class="d === todayStr ? 'text-[#165DFF]' : 'text-[#1D2129]'"
              >
                {{ fmtDate(d) }}
                <span
                  v-if="d === todayStr"
                  class="ml-1 inline-block rounded-sm bg-[#165DFF] px-1 py-px text-[9px] text-white"
                >今</span>
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

        <tbody>
          <tr v-for="m in slMachines" :key="m.machineId">
            <!-- Sticky machine label cell -->
            <td
              class="sticky left-0 z-10 border-b border-r border-[#E5E6EB] bg-[#F7F8FA] px-2 py-0 align-middle"
            >
              <span class="text-[11px] font-bold text-[#1D2129]">{{ m.machineId }}</span>
            </td>

            <!-- Date cells -->
            <td
              v-for="d in dates"
              :key="d"
              class="border-b border-r border-[#E5E6EB] p-1.5 align-top"
              :class="{
                'bg-[#FAFCFF]': d === todayStr,
                'bg-[#FAFAFA]': isWeekend(d) && d !== todayStr,
              }"
            >
              <div class="relative min-h-[108px]">

                <!-- Total weight badge -->
                <div
                  v-if="cellTotal(m.machineId, d) > 0"
                  class="absolute right-0 top-0 z-10 rounded-bl rounded-tr-md bg-[#F0F1F5] px-1.5 py-0.5 font-mono text-[10px] text-[#4E5969]"
                >
                  {{ cellTotal(m.machineId, d) }}kg
                </div>

                <!-- Empty drop-zone hint (pointer-events-none so it never blocks drops) -->
                <div
                  v-if="gridMap[m.machineId]?.[d]?.length === 0"
                  class="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg border border-dashed border-[#D1D5DB] text-[10px] text-[#C9CDD4]"
                >
                  拖入排程
                </div>

                <!-- Draggable drop zone -->
                <draggable
                  v-if="gridMap[m.machineId]"
                  v-model="gridMap[m.machineId][d]"
                  group="plans"
                  item-key="planId"
                  :move="checkMove"
                  ghost-class="opacity-30"
                  class="min-h-[108px]"
                  @change="onCellChange($event, m.machineId, d)"
                >
                  <template #item="{ element: plan }">
                    <div
                      class="mb-1 select-none rounded-md border p-1.5 text-[11px] transition-all"
                      :class="
                        plan.planStatus === 'RELEASED'
                          ? 'cursor-not-allowed border-[#B7EB8F] bg-[#F6FFED]'
                          : 'cursor-grab border-[#D9E1F0] bg-white hover:border-[#A0CFFF] hover:shadow-md active:cursor-grabbing'
                      "
                    >
                      <div class="flex items-center justify-between gap-1">
                        <span
                          class="truncate font-bold"
                          :class="plan.planStatus === 'RELEASED' ? 'text-[#389E0D]' : 'text-[#165DFF]'"
                        >{{ plan.planId }}</span>
                        <span
                          v-if="plan.planStatus === 'RELEASED'"
                          class="shrink-0 rounded-sm bg-[#D9F7BE] px-1 py-px text-[9px] text-[#389E0D]"
                        >锁定</span>
                      </div>
                      <div class="mt-0.5 truncate text-[10px] text-[#86909C]">
                        {{ plan.targetRollId }} · <span class="font-mono">{{ planWeight(plan) }}kg</span>
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
</template>
