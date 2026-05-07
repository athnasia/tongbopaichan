<script setup lang="ts">
import { ref, computed } from 'vue'
import { useApsStore } from '@/stores/aps'

const apsStore = useApsStore()

const searchId = ref('')

interface OrderProgressRow {
  orderId: string
  productionOrderId: string
  customerCode: string
  thickness: number
  width: number
  strength: string
  targetWeightKg: number
  fulfilledKg: number
  reviewStatus: string
  deliveryDate: string
  urgency: string
}

const rows = computed((): OrderProgressRow[] => {
  const q = searchId.value.trim().toLowerCase()
  return apsStore.productionOrders
    .filter((po) =>
      !q ||
      po.productionOrderId.toLowerCase().includes(q) ||
      (po.rawOrder?.orderId ?? '').toLowerCase().includes(q) ||
      (po.rawOrder?.customerCode ?? '').toLowerCase().includes(q),
    )
    .map((po) => ({
      orderId: po.rawOrder?.orderId ?? '—',
      productionOrderId: po.productionOrderId,
      customerCode: po.rawOrder?.customerCode ?? '—',
      thickness: po.thickness,
      width: po.width,
      strength: po.strength,
      targetWeightKg: po.targetWeightKg,
      fulfilledKg: po.fulfilledKg,
      reviewStatus: po.reviewStatus,
      deliveryDate: po.rawOrder?.deliveryDate ?? '—',
      urgency: po.urgency,
    }))
})

const selectedRow = ref<OrderProgressRow | null>(null)
const showDialog = ref(false)

function openDetail(row: OrderProgressRow) {
  selectedRow.value = row
  showDialog.value = true
}

function getNodes(row: OrderProgressRow) {
  const rawOrder = apsStore.rawOrders.find((o) => o.orderId === row.orderId)
  const po = apsStore.productionOrders.find((p) => p.productionOrderId === row.productionOrderId)
  const slitPlan = apsStore.slittingPlans.find((p) =>
    p.combinedOrders.some((o) => o.orderId === row.productionOrderId || o.orderId === row.orderId),
  )
  const slitOrder = apsStore.slittingOrders.find((o) => o.planId === slitPlan?.planId)
  const rec = apsStore.productionRecords.find((r) => r.sourceId === slitPlan?.planId && r.process === '分切')

  return [
    {
      label: 'ERP导入',
      time: rawOrder ? '已导入' : '—',
      status: rawOrder ? '完成' : '待处理',
      operator: 'ERP系统',
      done: !!rawOrder,
    },
    {
      label: '打标审核',
      time: po ? po.reviewStatus : '—',
      status: po?.reviewStatus === 'APPROVED' ? '已审核' : po ? '待审核' : '未转换',
      operator: po?.reviewStatus === 'APPROVED' ? '计划员' : '—',
      done: po?.reviewStatus === 'APPROVED',
    },
    {
      label: '选配锁料',
      time: po?.lockedWeightKg ? `锁 ${po.lockedWeightKg}kg` : '—',
      status: po?.lockedWeightKg ? '已锁料' : '待锁料',
      operator: po?.lockedWeightKg ? '计划员' : '—',
      done: !!po?.lockedWeightKg,
    },
    {
      label: '分切计划',
      time: slitPlan?.plannedDate ?? '—',
      status: slitPlan ? slitPlan.planStatus : '未生成',
      operator: slitPlan ? '计划员' : '—',
      done: !!slitPlan,
    },
    {
      label: '分切指令',
      time: slitOrder ? slitOrder.shift : '—',
      status: slitOrder ? slitOrder.status : '未下发',
      operator: slitOrder?.operator ?? '—',
      done: slitOrder?.status === '已执行',
    },
    {
      label: '生产完成',
      time: rec ? `${rec.actualWeightKg}kg` : '—',
      status: rec ? `成材率 ${Math.round((rec.yieldRate ?? 0) * 100)}%` : '待执行',
      operator: slitOrder?.operator ?? '—',
      done: !!rec,
    },
  ]
}

function reviewTag(status: string) {
  if (status === 'APPROVED') return 'success'
  if (status === 'REJECTED') return 'danger'
  return 'warning'
}
function urgencyTag(urgency: string) {
  if (urgency === '紧急') return 'danger'
  if (urgency === '正常') return ''
  return 'info'
}
</script>

<template>
  <div class="space-y-4">
    <div class="rounded-xl border border-[#E5E6EB] bg-white shadow-sm">
      <div class="border-b border-[#E5E6EB] bg-[#F7F8FA] px-4 py-3">
        <span class="text-sm font-semibold text-[#1D2129]">订单执行进度</span>
      </div>
      <div class="p-4">
        <div class="mb-4 flex items-center gap-3">
          <el-input
            v-model="searchId"
            placeholder="搜索订单号 / 生产订单号 / 客户编码"
            clearable
            style="max-width: 320px"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <span class="text-xs text-[#86909C]">共 {{ rows.length }} 条</span>
        </div>

        <el-table :data="rows" border stripe size="default">
          <el-table-column label="ERP订单号" prop="orderId" min-width="130" />
          <el-table-column label="生产订单号" prop="productionOrderId" min-width="150" />
          <el-table-column label="客户" prop="customerCode" min-width="110" />
          <el-table-column label="规格" min-width="130">
            <template #default="{ row }">
              {{ row.thickness }}μm / {{ row.width }}mm / {{ row.strength }}
            </template>
          </el-table-column>
          <el-table-column label="目标(kg)" prop="targetWeightKg" min-width="95" align="right">
            <template #default="{ row }">
              <span style="font-family:Consolas,monospace">{{ row.targetWeightKg }}</span>
            </template>
          </el-table-column>
          <el-table-column label="已完成(kg)" prop="fulfilledKg" min-width="100" align="right">
            <template #default="{ row }">
              <span
                style="font-family:Consolas,monospace"
                :class="row.fulfilledKg > 0 ? 'text-[#00B42A] font-semibold' : 'text-[#86909C]'"
              >{{ row.fulfilledKg }}</span>
            </template>
          </el-table-column>
          <el-table-column label="审核状态" min-width="95">
            <template #default="{ row }">
              <el-tag effect="light" :type="reviewTag(row.reviewStatus)" size="small">{{ row.reviewStatus }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="紧急度" min-width="80">
            <template #default="{ row }">
              <el-tag effect="light" :type="urgencyTag(row.urgency)" size="small">{{ row.urgency }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="交货日期" prop="deliveryDate" min-width="110" />
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
      :title="`订单进度 — ${selectedRow?.productionOrderId}`"
      width="680px"
      destroy-on-close
    >
      <template v-if="selectedRow">
        <div class="mb-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-[#86909C]">
          <span>客户：<b class="text-[#1D2129]">{{ selectedRow.customerCode }}</b></span>
          <span>规格：<b class="text-[#1D2129]">{{ selectedRow.thickness }}μm / {{ selectedRow.width }}mm / {{ selectedRow.strength }}</b></span>
          <span>目标：<b class="text-[#1D2129]">{{ selectedRow.targetWeightKg }}kg</b></span>
          <span>交货：<b class="text-[#1D2129]">{{ selectedRow.deliveryDate }}</b></span>
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
          <el-table-column label="执行情况" prop="time" min-width="130" />
          <el-table-column label="执行状态" prop="status" min-width="110">
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
