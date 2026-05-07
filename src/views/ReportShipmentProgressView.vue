<script setup lang="ts">
import { ref, computed } from 'vue'
import { useApsStore } from '@/stores/aps'

const apsStore = useApsStore()

const searchId = ref('')

interface ShipmentRow {
  rollId: string
  orderId: string
  slittingPlanId: string
  thickness: number
  width: number
  weightKg: number
  qualityGrade: string
  status: string
}

const rows = computed((): ShipmentRow[] => {
  const q = searchId.value.trim().toLowerCase()
  return apsStore.finishedProductInventory
    .filter((i) =>
      !q ||
      i.rollId.toLowerCase().includes(q) ||
      (i.orderId ?? '').toLowerCase().includes(q) ||
      (i.slittingPlanId ?? '').toLowerCase().includes(q),
    )
    .map((i) => ({
      rollId: i.rollId,
      orderId: i.orderId ?? '—',
      slittingPlanId: i.slittingPlanId ?? '—',
      thickness: i.thickness,
      width: i.width,
      weightKg: i.weightKg,
      qualityGrade: i.qualityGrade,
      status: i.status,
    }))
})

const selectedRow = ref<ShipmentRow | null>(null)
const showDialog = ref(false)

function openDetail(row: ShipmentRow) {
  selectedRow.value = row
  showDialog.value = true
}

function getNodes(row: ShipmentRow) {
  const slitPlan = apsStore.slittingPlans.find((p) => p.planId === row.slittingPlanId)
  const slitOrder = slitPlan ? apsStore.slittingOrders.find((o) => o.planId === slitPlan.planId) : null
  const rec = apsStore.productionRecords.find((r) => r.sourceId === row.slittingPlanId && r.process === '分切')
  const isShipped = row.status === 'SHIPPED'
  const isPacked = row.status === 'PACKAGED' || isShipped

  return [
    {
      label: '分切生产',
      time: rec ? `${rec.actualWeightKg}kg` : '—',
      status: rec ? `成材率${Math.round(rec.yieldRate * 100)}%` : '待生产',
      operator: slitOrder?.operator ?? '—',
      done: !!rec,
    },
    {
      label: '质检入库',
      time: row.qualityGrade ? `品级：${row.qualityGrade}` : '—',
      status: row.status !== 'IN_STOCK' && row.status !== 'PACKAGED' && row.status !== 'SHIPPED' ? '待入库' : '已入库',
      operator: 'QC',
      done: ['IN_STOCK', 'PACKAGED', 'SHIPPED'].includes(row.status),
    },
    {
      label: '打包装箱',
      time: isPacked ? row.rollId : '—',
      status: isPacked ? '已打包' : '待打包',
      operator: isPacked ? '仓库' : '—',
      done: isPacked,
    },
    {
      label: '发运出库',
      time: isShipped ? row.rollId : '—',
      status: isShipped ? '已发运' : '待发运',
      operator: isShipped ? '物流' : '—',
      done: isShipped,
    },
  ]
}

function statusTag(s: string) {
  if (s === 'SHIPPED') return 'success'
  if (s === 'PACKAGED') return 'warning'
  if (s === 'IN_STOCK') return 'primary'
  return 'info'
}
function gradeTag(g: string) {
  if (g === 'A') return 'success'
  if (g === 'B') return 'warning'
  return 'danger'
}
</script>

<template>
  <div class="space-y-4">
    <div class="rounded-xl border border-[#E5E6EB] bg-white shadow-sm">
      <div class="border-b border-[#E5E6EB] bg-[#F7F8FA] px-4 py-3">
        <span class="text-sm font-semibold text-[#1D2129]">发运执行进度</span>
      </div>
      <div class="p-4">
        <div class="mb-4 flex items-center gap-3">
          <el-input
            v-model="searchId"
            placeholder="搜索卷号 / 订单号 / 分切计划号"
            clearable
            style="max-width: 320px"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <span class="text-xs text-[#86909C]">共 {{ rows.length }} 条</span>
        </div>

        <el-table :data="rows" border stripe size="default">
          <el-table-column label="成品卷号" prop="rollId" min-width="150" />
          <el-table-column label="关联订单" prop="orderId" min-width="140" />
          <el-table-column label="分切计划" prop="slittingPlanId" min-width="150" />
          <el-table-column label="规格" min-width="130">
            <template #default="{ row }">{{ row.thickness }}μm / {{ row.width }}mm</template>
          </el-table-column>
          <el-table-column label="重量(kg)" min-width="95" align="right">
            <template #default="{ row }">
              <span style="font-family:Consolas,monospace">{{ row.weightKg }}</span>
            </template>
          </el-table-column>
          <el-table-column label="品级" min-width="75" align="center">
            <template #default="{ row }">
              <el-tag effect="light" :type="gradeTag(row.qualityGrade)" size="small">{{ row.qualityGrade }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" min-width="95">
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
      :title="`发运进度 — ${selectedRow?.rollId}`"
      width="620px"
      destroy-on-close
    >
      <template v-if="selectedRow">
        <div class="mb-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-[#86909C]">
          <span>订单：<b class="text-[#1D2129]">{{ selectedRow.orderId }}</b></span>
          <span>规格：<b class="text-[#1D2129]">{{ selectedRow.thickness }}μm / {{ selectedRow.width }}mm</b></span>
          <span>重量：<b class="text-[#1D2129]">{{ selectedRow.weightKg }}kg</b></span>
          <span>品级：<b class="text-[#1D2129]">{{ selectedRow.qualityGrade }}</b></span>
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
          <el-table-column label="执行信息" prop="time" min-width="130" />
          <el-table-column label="执行状态" prop="status" min-width="110">
            <template #default="{ row }">
              <el-tag effect="light" :type="row.done ? 'success' : 'info'" size="small">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="执行人" prop="operator" min-width="90" />
        </el-table>
      </template>
    </el-dialog>
  </div>
</template>
