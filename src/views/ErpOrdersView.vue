<script setup lang="ts">
import { computed } from 'vue'
import { useApsStore } from '@/stores/aps'
import { usePagination } from '@/composables/usePagination'

const apsStore = useApsStore()
const unconverted = computed(() => {
  const converted = new Set(apsStore.productionOrders.map((po) => po.rawOrder.orderId))
  return apsStore.rawOrders.filter((r) => !converted.has(r.orderId))
})
const { page: erpPage, paged: erpPaged, total: erpTotal } = usePagination(() => apsStore.rawOrders)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <span class="text-sm text-[#86909C]">共 {{ apsStore.rawOrders.length }} 条原始散单，{{ unconverted.length }} 条待转换</span>
      <el-button type="primary" size="small" :disabled="unconverted.length === 0" @click="apsStore.convertOrders(unconverted.map(r => r.orderId))">一键转换全部</el-button>
    </div>
    <el-card shadow="never">
      <el-table :data="erpPaged" border stripe size="default">
        <el-table-column prop="orderId" label="订单号" min-width="110" />
        <el-table-column prop="customerCode" label="客户" min-width="90" />
        <el-table-column prop="productCode" label="物料编码" min-width="120" />
        <el-table-column prop="productName" label="物料名称" min-width="180" />
        <el-table-column label="厚度 (μm)" min-width="90" align="right">
          <template #default="{ row }"><span style="font-family:Consolas,monospace">{{ row.thickness }}</span></template>
        </el-table-column>
        <el-table-column label="宽度 (mm)" min-width="90" align="right">
          <template #default="{ row }"><span style="font-family:Consolas,monospace">{{ row.width }}</span></template>
        </el-table-column>
        <el-table-column label="需求量 (kg)" min-width="100" align="right">
          <template #default="{ row }"><span style="font-family:Consolas,monospace">{{ row.orderWeightKg }}</span></template>
        </el-table-column>
        <el-table-column prop="deliveryDate" label="交货日" min-width="110" />
        <el-table-column label="状态" min-width="90" fixed="right">
          <template #default="{ row }">
            <el-tag effect="light" :type="apsStore.productionOrders.some((po) => po.rawOrder.orderId === row.orderId) ? 'success' : 'info'" size="small">
              {{ apsStore.productionOrders.some((po) => po.rawOrder.orderId === row.orderId) ? '已转换' : '待转换' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
      <div class="flex justify-end mt-3">
        <el-pagination v-model:current-page="erpPage" :page-size="10" :total="erpTotal" layout="total, prev, pager, next" small />
      </div>
    </el-card>
  </div>
</template>
