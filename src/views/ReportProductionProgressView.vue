<script setup lang="ts">
import { ref, computed } from 'vue'
import { useApsStore } from '@/stores/aps'

const apsStore = useApsStore()

const searchId = ref('')

interface ProductionRow {
  recordId: string
  process: string
  sourceId: string
  machineId: string
  plannedDate: string
  actualWeightKg: number
  yieldRate: number
  status: string
}

const rows = computed((): ProductionRow[] => {
  const q = searchId.value.trim().toLowerCase()
  return apsStore.productionRecords
    .filter((r) =>
      !q ||
      r.recordId.toLowerCase().includes(q) ||
      r.sourceId.toLowerCase().includes(q) ||
      r.machineId.toLowerCase().includes(q),
    )
    .map((r) => ({
      recordId: r.recordId,
      process: r.process,
      sourceId: r.sourceId,
      machineId: r.machineId,
      plannedDate: r.plannedDate,
      actualWeightKg: r.actualWeightKg,
      yieldRate: r.yieldRate,
      status: r.status,
    }))
})

const selectedRow = ref<ProductionRow | null>(null)
const showDialog = ref(false)

function openDetail(row: ProductionRow) {
  selectedRow.value = row
  showDialog.value = true
}

function getNodes(row: ProductionRow) {
  const isRaw = row.process === '生箔'
  const isBaking = row.process === '烘烤'
  const isSlitting = row.process === '分切'

  const slitPlan = isSlitting ? apsStore.slittingPlans.find((p) => p.planId === row.sourceId) : null
  const slitOrder = slitPlan ? apsStore.slittingOrders.find((o) => o.planId === slitPlan.planId) : null

  if (isRaw) {
    return [
      { label: '计划制定', time: row.plannedDate, status: '已排产', operator: '计划员', done: true },
      { label: '开始生产', time: row.plannedDate, status: '执行中', operator: row.machineId, done: row.status === 'DONE' || row.status === 'WAITING' },
      { label: '完工入库', time: row.status === 'DONE' ? `${row.actualWeightKg}kg` : '—', status: row.status === 'DONE' ? `成材率${Math.round(row.yieldRate * 100)}%` : '待完工', operator: row.machineId, done: row.status === 'DONE' },
    ]
  }
  if (isBaking) {
    return [
      { label: '烘烤预约', time: row.plannedDate, status: '已预约', operator: '计划员', done: true },
      { label: '进炉烘烤', time: row.plannedDate, status: '执行中', operator: row.machineId, done: row.status === 'DONE' || row.status === 'WAITING' },
      { label: '出炉入熟箔库', time: row.status === 'DONE' ? `${row.actualWeightKg}kg` : '—', status: row.status === 'DONE' ? `成材率${Math.round(row.yieldRate * 100)}%` : '待出炉', operator: row.machineId, done: row.status === 'DONE' },
    ]
  }
  // 分切
  return [
    { label: '计划排产', time: slitPlan?.plannedDate ?? row.plannedDate, status: slitPlan ? slitPlan.planStatus : '—', operator: '计划员', done: !!slitPlan },
    { label: '指令下发', time: slitOrder?.shift ?? '—', status: slitOrder ? slitOrder.status : '未下发', operator: slitOrder?.operator ?? '—', done: !!slitOrder },
    { label: '上机分切', time: row.plannedDate, status: '执行中', operator: row.machineId, done: row.status === 'DONE' || row.status === 'WAITING' },
    { label: '分切完工', time: row.status === 'DONE' ? `${row.actualWeightKg}kg` : '—', status: row.status === 'DONE' ? `成材率${Math.round(row.yieldRate * 100)}%` : '待完工', operator: slitOrder?.operator ?? row.machineId, done: row.status === 'DONE' },
  ]
}

function processTag(p: string) {
  if (p === '生箔') return 'primary'
  if (p === '烘烤') return 'warning'
  if (p === '分切') return 'success'
  return 'info'
}
function statusTag(s: string) {
  if (s === 'DONE') return 'success'
  return 'warning'
}
</script>

<template>
  <div class="space-y-4">
    <div class="rounded-xl border border-[#E5E6EB] bg-white shadow-sm">
      <div class="border-b border-[#E5E6EB] bg-[#F7F8FA] px-4 py-3">
        <span class="text-sm font-semibold text-[#1D2129]">生产执行进度</span>
      </div>
      <div class="p-4">
        <div class="mb-4 flex items-center gap-3">
          <el-input
            v-model="searchId"
            placeholder="搜索记录号 / 来源单号 / 机台"
            clearable
            style="max-width: 320px"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <span class="text-xs text-[#86909C]">共 {{ rows.length }} 条</span>
        </div>

        <el-table :data="rows" border stripe size="default">
          <el-table-column label="记录号" prop="recordId" min-width="150" />
          <el-table-column label="工序" min-width="80">
            <template #default="{ row }">
              <el-tag effect="light" :type="processTag(row.process)" size="small">{{ row.process }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="来源单号" prop="sourceId" min-width="150" />
          <el-table-column label="机台" prop="machineId" min-width="90" />
          <el-table-column label="计划日期" prop="plannedDate" min-width="110" />
          <el-table-column label="实绩(kg)" min-width="95" align="right">
            <template #default="{ row }">
              <span style="font-family:Consolas,monospace">{{ row.actualWeightKg }}</span>
            </template>
          </el-table-column>
          <el-table-column label="成材率" min-width="85" align="right">
            <template #default="{ row }">
              <span style="font-family:Consolas,monospace">{{ Math.round(row.yieldRate * 100) }}%</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" min-width="80">
            <template #default="{ row }">
              <el-tag effect="light" :type="statusTag(row.status)" size="small">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" fixed="right" min-width="80" align="center">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="openDetail(row)">详情</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <el-dialog
      v-model="showDialog"
      :title="`生产进度 — ${selectedRow?.recordId}`"
      width="640px"
      destroy-on-close
    >
      <template v-if="selectedRow">
        <div class="mb-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-[#86909C]">
          <span>工序：<b class="text-[#1D2129]">{{ selectedRow.process }}</b></span>
          <span>来源：<b class="text-[#1D2129]">{{ selectedRow.sourceId }}</b></span>
          <span>机台：<b class="text-[#1D2129]">{{ selectedRow.machineId }}</b></span>
          <span>实绩：<b class="text-[#1D2129]">{{ selectedRow.actualWeightKg }}kg</b></span>
        </div>

        <el-steps
          :active="getNodes(selectedRow).filter(n => n.done).length"
          align-center
          finish-status="success"
          class="mb-6"
        >
          <el-step
            v-for="(node, i) in getNodes(selectedRow)"
            :key="i"
            :title="node.label"
            :status="node.done ? 'success' : (getNodes(selectedRow).filter(n => n.done).length === i ? 'process' : 'wait')"
          />
        </el-steps>

        <el-table :data="getNodes(selectedRow)" border size="small">
          <el-table-column label="节点" prop="label" min-width="100" />
          <el-table-column label="执行时间/信息" prop="time" min-width="130" />
          <el-table-column label="执行状态" prop="status" min-width="130">
            <template #default="{ row }">
              <el-tag effect="light" :type="row.done ? 'success' : 'info'" size="small">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="执行人" prop="operator" min-width="100" />
        </el-table>
      </template>
    </el-dialog>
  </div>
</template>
