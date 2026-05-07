<script setup lang="ts">
import { ref, computed } from 'vue'
import { useApsStore } from '@/stores/aps'
import type { EChartsOption } from 'echarts'
import ChartPanel from '@/components/ChartPanel.vue'
import SummaryMetricCard from '@/components/SummaryMetricCard.vue'

const apsStore = useApsStore()
const trackId = ref('')

const trackedOrder = computed(() => {
  if (!trackId.value.trim()) return null
  const id = trackId.value.trim()
  const erp = apsStore.rawOrders.find((o) => o.orderId === id)
  const po = apsStore.productionOrders.find((o) => o.rawOrder?.orderId === id || o.productionOrderId === id)
  if (!po && !erp) return null
  const slitPlan = apsStore.slittingPlans.find((p) => p.combinedOrders.some((o) => o.orderId === id || o.orderId === po?.productionOrderId))
  const slitOrder = apsStore.slittingOrders.find((o) => o.orderIds?.includes(id) || o.orderIds?.includes(po?.productionOrderId ?? ''))
  const rec = apsStore.productionRecords.find((r) => r.sourceId === slitPlan?.planId)
  const shortageKg = po ? Math.max(0, po.targetWeightKg - po.fulfilledKg - po.lockedWeightKg) : 0

  const nodes: { label: string; status: string; done: boolean }[] = [
    { label: 'ERP散单', status: erp ? '已导入' : '未找到', done: !!erp },
    { label: '打标审核', status: po ? po.reviewStatus : '未转换', done: po?.reviewStatus === 'APPROVED' },
    { label: '需求缺口', status: po ? `缺 ${shortageKg}kg / 锁 ${po.lockedWeightKg}kg` : '待审核', done: !!po && shortageKg === 0 },
    { label: '分切计划', status: slitPlan ? slitPlan.planStatus : '未生成', done: slitPlan?.planStatus === 'COMPLETED' },
    { label: '分切指令', status: slitOrder ? slitOrder.status : '未下发', done: slitOrder?.status === '已执行' },
    { label: '生产记录', status: rec ? `${rec.actualWeightKg}kg / 成材率${Math.round((rec.yieldRate ?? 0) * 100)}%` : '待执行', done: !!rec },
  ]
  return { id, nodes }
})

const flowOption = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 36, right: 16, top: 28, bottom: 28 },
  xAxis: {
    type: 'category',
    data: apsStore.capacityChartData.map((item) => item.category),
    axisTick: { show: false },
  },
  yAxis: { type: 'value', max: 100 },
  series: [{
    type: 'bar',
    data: apsStore.capacityChartData.map((item) => item.value),
    barWidth: 28,
    itemStyle: { color: '#165DFF', borderRadius: [8, 8, 0, 0] },
  }],
}))

const inventoryOption = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'item' },
  legend: { bottom: 0 },
  series: [{
    type: 'pie',
    radius: ['48%', '72%'],
    data: apsStore.inventoryChartData.map((item) => ({ name: item.category, value: item.value })),
    label: { formatter: '{b}\n{d}%' },
  }],
}))
</script>

<template>
  <div class="space-y-6">
    <section class="grid gap-4 xl:grid-cols-4">
      <SummaryMetricCard
        v-for="metric in apsStore.dashboardMetrics"
        :key="metric.label"
        :label="metric.label"
        :value="metric.value"
        :helper="metric.helper"
        :tone="metric.tone"
      />
    </section>

    <el-card shadow="never">
      <template #header><span class="text-sm font-medium">订单追踪</span></template>
      <div class="flex gap-3 items-center">
        <el-input v-model="trackId" placeholder="输入订单号 (如 ORD-001)" style="max-width:260px" clearable />
        <span class="text-xs text-[#86909C]">追踪订单流转节点</span>
      </div>
      <div v-if="trackedOrder" class="mt-4 overflow-x-auto">
        <el-steps :active="trackedOrder.nodes.filter(n => n.done).length" align-center finish-status="success">
          <el-step
            v-for="(node, i) in trackedOrder.nodes"
            :key="i"
            :title="node.label"
            :description="node.status"
            :status="node.done ? 'success' : (trackedOrder.nodes.filter(n => n.done).length === i ? 'process' : 'wait')"
          />
        </el-steps>
      </div>
      <el-empty v-else-if="trackId.trim()" description="未找到该订单" :image-size="60" />
    </el-card>

    <section class="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <ChartPanel title="流程推进热度" :option="flowOption" />
      <ChartPanel title="库存结构" :option="inventoryOption" />
    </section>

    <el-card shadow="never">
      <template #header><span class="text-sm font-medium">APS 主流程节点</span></template>
      <div class="grid gap-4 xl:grid-cols-3">
        <div
          v-for="node in apsStore.processNodes"
          :key="node.key"
          class="rounded-lg border border-[#E5E6EB] bg-white p-5"
        >
          <div class="flex items-start justify-between gap-3">
            <p class="text-lg font-semibold text-[#1D2129]">{{ node.title }}</p>
            <el-tag effect="light" type="primary" size="small">{{ node.count }}</el-tag>
          </div>
          <div class="mt-4 flex items-center justify-between text-sm">
            <span class="text-[#86909C]">当前状态</span>
            <span class="font-medium text-[#1D2129]">{{ node.status }}</span>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>
