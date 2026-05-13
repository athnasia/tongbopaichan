<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import SlittingBucketBoard from '@/components/SlittingBucketBoard.vue'
import { useApsStore } from '@/stores/aps'
import { usePagination } from '@/composables/usePagination'
import { useSchedulingState } from '@/composables/useSchedulingState'
import { slittingPlanStatusTag, recordStatusTag } from '@/utils/statusTags'
import type { SlittingPlan } from '@/types/aps'

const apsStore = useApsStore()
const { scheduledQtyRecord, scheduledSlots, removeSlot } = useSchedulingState()

const releasing = ref<string | null>(null)
const selectedPlan = ref<SlittingPlan | null>(null)
const showExecDialog = ref(false)

const visibleDates = ref<string[]>([])
function onDatesChanged(dates: string[]) { visibleDates.value = dates }

// ── Flat row model that unifies slot records and store plans ──
interface TableRow {
  _type: 'slot' | 'plan'
  planId: string        // original plan ID
  machineId: string
  date: string
  scheduledKg: number   // slot: this drop's qty; plan: planWeight
  totalWeight: number   // full plan weight
  slotId?: string       // only for slot rows
  plan?: SlittingPlan   // only for plan rows
}

// Draft slots from the current session, filtered to visible week
const slotRows = computed((): TableRow[] =>
  Object.values(scheduledSlots)
    .filter((s) => visibleDates.value.includes(s.date))
    .map((s) => ({
      _type: 'slot',
      planId: s.originalPlanId,
      machineId: s.machineId,
      date: s.date,
      scheduledKg: s.scheduledKg,
      totalWeight: s.fullPlanWeight,
      slotId: s.slotId,
    })),
)

// Released / Completed plans from store, filtered by plannedDate in visible week.
// Visible across all week navigations (not session-only).
const planRows = computed((): TableRow[] =>
  apsStore.slittingPlans
    .filter(
      (p) =>
        (p.planStatus === 'RELEASED' || p.planStatus === 'COMPLETED') &&
        visibleDates.value.includes(p.plannedDate ?? ''),
    )
    .map((p) => ({
      _type: 'plan',
      planId: p.planId,
      machineId: p.machineId ?? '—',
      date: p.plannedDate ?? '—',
      scheduledKg: planWeight(p),
      totalWeight: planWeight(p),
      plan: p,
    })),
)

const tableRows = computed((): TableRow[] => [...slotRows.value, ...planRows.value])

const { page, paged, total } = usePagination(() => tableRows.value)

function planWeight(plan: SlittingPlan) {
  return plan.combinedOrders.reduce((s, o) => s + o.weightKg, 0)
}
function completedWeight(planId: string) {
  return apsStore.productionRecords
    .filter((r) => r.sourceId === planId && r.process === '分切')
    .reduce((s, r) => s + r.actualWeightKg, 0)
}
function sourcePlan(planId: string) {
  return apsStore.slittingPlans.find((p) => p.planId === planId)
}
function getDispatch(planId: string) {
  return apsStore.slittingOrders.find((o) => o.planId === planId)
}
function execRecords(planId: string) {
  return apsStore.productionRecords.filter((r) => r.sourceId === planId && r.process === '分切')
}
function openExec(plan: SlittingPlan) {
  selectedPlan.value = plan
  showExecDialog.value = true
}
function planTag(status: string) { return slittingPlanStatusTag(status) }

async function handleRelease(planId: string) {
  releasing.value = planId
  try { await apsStore.releasePlan(planId); ElMessage.success('计划已下发') }
  finally { releasing.value = null }
}
</script>

<template>
  <div class="flex flex-col gap-4 overflow-y-auto">

    <!-- ── Scheduling Board ── -->
    <div style="height: calc(100vh - 300px); min-height: 420px">
      <SlittingBucketBoard @dates-changed="onDatesChanged" />
    </div>

    <!-- ── Plan List ── -->
    <div class="rounded-xl border border-[#E5E6EB] bg-white shadow-sm">
      <div class="border-b border-[#E5E6EB] bg-[#F7F8FA] px-4 py-3 flex items-center justify-between">
        <div>
          <span class="text-sm font-semibold text-[#1D2129]">分切计划清单</span>
          <span class="ml-2 text-xs text-[#86909C]">
            {{ visibleDates[0] }} ~ {{ visibleDates[visibleDates.length - 1] }}
            · {{ slotRows.length }} 条草稿排产 · {{ planRows.length }} 条已下发
          </span>
        </div>
        <el-button size="small" @click="">模型预测</el-button>
      </div>

      <div class="p-4">
        <el-empty v-if="tableRows.length === 0" description="当前周期暂无排产记录" />
        <template v-else>
          <el-table :data="paged" border stripe size="default">

            <!-- 状态 -->
            <el-table-column label="状态" min-width="95">
              <template #default="{ row }">
                <el-tag v-if="row._type === 'slot'" effect="light" type="warning" size="small">草稿</el-tag>
                <el-tag v-else effect="light" :type="planTag(row.plan.planStatus)" size="small">
                  {{ row.plan.planStatus }}
                </el-tag>
              </template>
            </el-table-column>

            <!-- 计划号 -->
            <el-table-column label="计划号" min-width="155">
              <template #default="{ row }">
                <span class="font-bold text-[#165DFF]" style="font-family:Consolas,monospace">{{ row.planId }}</span>
              </template>
            </el-table-column>

            <!-- 母卷号 -->
            <el-table-column label="母卷号" min-width="130">
              <template #default="{ row }">
                {{ row._type === 'slot' ? (sourcePlan(row.planId)?.targetRollId ?? '—') : row.plan.targetRollId }}
              </template>
            </el-table-column>

            <!-- 机台 -->
            <el-table-column label="机台" prop="machineId" min-width="85" />

            <!-- 排产日期 -->
            <el-table-column label="排产日期" prop="date" min-width="115" />

            <!-- 拼单组合 -->
            <el-table-column label="拼单组合" min-width="200">
              <template #default="{ row }">
                <div class="flex flex-wrap gap-1">
                  <el-tag
                    v-for="o in (row._type === 'slot' ? sourcePlan(row.planId) : row.plan)?.combinedOrders ?? []"
                    :key="o.orderId"
                    effect="light"
                    type="info"
                    size="small"
                  >{{ o.orderId }}/{{ o.width }}mm</el-tag>
                </div>
              </template>
            </el-table-column>

            <!-- 本次排产量 -->
            <el-table-column label="本次排产(kg)" min-width="115" align="right">
              <template #default="{ row }">
                <span
                  class="font-semibold"
                  :class="row._type === 'slot' ? 'text-[#165DFF]' : 'text-[#4E5969]'"
                  style="font-family:Consolas,monospace"
                >{{ row.scheduledKg }}</span>
              </template>
            </el-table-column>

            <!-- 累计排产量（仅草稿行） -->
            <el-table-column label="累计排产(kg)" min-width="115" align="right">
              <template #default="{ row }">
                <span v-if="row._type === 'slot'" class="text-[#4E5969]" style="font-family:Consolas,monospace">
                  {{ scheduledQtyRecord[row.planId] ?? 0 }}
                </span>
                <span v-else class="text-[#C9CDD4]">—</span>
              </template>
            </el-table-column>

            <!-- 计划总量 -->
            <el-table-column label="计划总量(kg)" min-width="110" align="right">
              <template #default="{ row }">
                <span class="text-[#86909C]" style="font-family:Consolas,monospace">{{ row.totalWeight }}</span>
              </template>
            </el-table-column>

            <!-- 已完成 -->
            <el-table-column label="已完成(kg)" min-width="105" align="right">
              <template #default="{ row }">
                <span
                  style="font-family:Consolas,monospace"
                  :class="completedWeight(row.planId) > 0 ? 'text-[#00B42A] font-semibold' : 'text-[#86909C]'"
                >{{ completedWeight(row.planId) }}</span>
              </template>
            </el-table-column>

            <!-- 操作 -->
            <el-table-column label="操作" fixed="right" min-width="140" align="center">
              <template #default="{ row }">
                <!-- 草稿行：删除 + 下发 -->
                <template v-if="row._type === 'slot'">
                  <el-button type="danger" link size="small" @click="removeSlot(row.slotId)">删除</el-button>
                  <el-button
                    type="primary"
                    link
                    size="small"
                    :loading="releasing === row.planId"
                    @click="handleRelease(row.planId)"
                  >下发</el-button>
                </template>
                <!-- 已下发/完成行：执行记录 -->
                <template v-else>
                  <el-button
                    v-if="row.plan.planStatus === 'RELEASED' || row.plan.planStatus === 'COMPLETED'"
                    type="success"
                    link
                    size="small"
                    @click="openExec(row.plan)"
                  >执行记录</el-button>
                </template>
              </template>
            </el-table-column>

          </el-table>

          <div class="mt-3 flex justify-end">
            <el-pagination
              v-model:current-page="page"
              :page-size="10"
              :total="total"
              layout="total, prev, pager, next"
              small
            />
          </div>
        </template>
      </div>
    </div>

    <!-- ── Exec records dialog ── -->
    <el-dialog
      v-model="showExecDialog"
      :title="`执行记录 — ${selectedPlan?.planId}`"
      width="620px"
      destroy-on-close
    >
      <template v-if="selectedPlan">
        <div class="mb-3 flex flex-wrap gap-2 text-sm">
          <span class="text-[#86909C]">指令单：</span>
          <template v-if="getDispatch(selectedPlan.planId)">
            <el-tag effect="light" size="small">{{ getDispatch(selectedPlan.planId)?.dispatchId }}</el-tag>
            <el-tag
              effect="light"
              :type="getDispatch(selectedPlan.planId)?.status === '已执行' ? 'success' : 'warning'"
              size="small"
            >{{ getDispatch(selectedPlan.planId)?.status }}</el-tag>
            <span class="text-[#86909C]">班次：{{ getDispatch(selectedPlan.planId)?.shift }}</span>
          </template>
          <span v-else class="text-[#86909C]">暂无指令单</span>
        </div>
        <el-empty v-if="execRecords(selectedPlan.planId).length === 0" description="暂无执行记录" :image-size="60" />
        <el-table v-else :data="execRecords(selectedPlan.planId)" border stripe size="small">
          <el-table-column prop="recordId" label="记录号" min-width="150" />
          <el-table-column prop="machineId" label="机台" min-width="90" />
          <el-table-column prop="plannedDate" label="日期" min-width="110" />
          <el-table-column label="实绩 (kg)" min-width="100" align="right">
            <template #default="{ row }"><span style="font-family:Consolas,monospace">{{ row.actualWeightKg }}</span></template>
          </el-table-column>
          <el-table-column label="成材率" min-width="80" align="right">
            <template #default="{ row }"><span style="font-family:Consolas,monospace">{{ Math.round(row.yieldRate * 100) }}%</span></template>
          </el-table-column>
          <el-table-column label="状态" min-width="80">
            <template #default="{ row }">
              <el-tag effect="light" :type="recordStatusTag(row.status)" size="small">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </el-dialog>

  </div>
</template>
