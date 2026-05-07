<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import ChartPanel from '@/components/ChartPanel.vue'
import { useApsStore } from '@/stores/aps'
import { usePagination } from '@/composables/usePagination'

const apsStore = useApsStore()
const { page: scrapPage, paged: scrapPaged, total: scrapTotal } = usePagination(() => apsStore.scrapRecords)
const option = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 36, right: 16, top: 28, bottom: 28 },
  xAxis: { type: 'category', data: apsStore.scrapChartData.map((i) => i.category), axisTick: { show: false } },
  yAxis: { type: 'value' },
  series: [{ type: 'bar', data: apsStore.scrapChartData.map((i) => i.value), barWidth: 28, itemStyle: { color: '#FF7D00', borderRadius: [8, 8, 0, 0] } }],
}))
</script>

<template>
  <div class="space-y-6">
    <ChartPanel title="废料率统计（按工序）" :option="option" :height="260" />
    <el-card shadow="never">
      <template #header><span class="text-sm font-medium">废料台账</span></template>
      <el-empty v-if="apsStore.scrapRecords.length === 0" description="暂无废料记录 — 执行分切指令后余宽不足阈值时自动产生" />
      <template v-else>
        <el-table :data="scrapPaged" border stripe size="default">
          <el-table-column prop="scrapId" label="废料号" min-width="140" />
          <el-table-column prop="process" label="来源工序" min-width="100" />
          <el-table-column prop="machineId" label="机台" min-width="100" />
          <el-table-column label="重量(kg)" min-width="100" align="right"><template #default="{ row }"><span style="font-family:Consolas,monospace">{{ row.weightKg }}</span></template></el-table-column>
          <el-table-column prop="grade" label="等级" min-width="70" />
          <el-table-column prop="reason" label="原因" min-width="200" />
          <el-table-column prop="createdAt" label="记录时间" min-width="150" />
        </el-table>
        <div class="flex justify-end mt-3">
          <el-pagination v-model:current-page="scrapPage" :page-size="10" :total="scrapTotal" layout="total, prev, pager, next" small />
        </div>
      </template>
    </el-card>
  </div>
</template>
