<script setup lang="ts">
import { useApsStore } from '@/stores/aps'
import { usePagination } from '@/composables/usePagination'
import { slittingOrderStatusTag } from '@/utils/statusTags'

const apsStore = useApsStore()
const { page: ordPage, paged: ordPaged, total: ordTotal } = usePagination(() => apsStore.slittingOrders)
</script>

<template>
  <div class="space-y-4">
    <el-alert type="info" :closable="false">
      执行分切指令请前往 <strong>执行记录</strong> 页面操作（录入实绩 → 窄卷回库 / 废料）。
    </el-alert>
    <el-card shadow="never">
      <template #header><span class="text-sm font-medium">分切指令单</span></template>
      <el-empty v-if="apsStore.slittingOrders.length === 0" description="暂无指令单 — 请先在分切计划页面下发" />
      <template v-else>
        <el-table :data="ordPaged" border stripe size="default">
          <el-table-column prop="dispatchId" label="指令号" min-width="140" />
          <el-table-column prop="planId" label="来源计划" min-width="130" />
          <el-table-column prop="machineId" label="机台" min-width="90" />
          <el-table-column prop="plannedDate" label="日期" min-width="110" />
          <el-table-column prop="shift" label="班次" min-width="80" />
          <el-table-column label="订单" min-width="200">
            <template #default="{ row }">
              <div class="flex flex-wrap gap-1">
                <el-tag v-for="id in row.orderIds" :key="id" effect="light" type="info" size="small">{{ id }}</el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="operator" label="计划员" min-width="90" />
          <el-table-column label="状态" min-width="90">
            <template #default="{ row }">
              <el-tag effect="light" :type="slittingOrderStatusTag(row.status)" size="small">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
        <div class="flex justify-end mt-3">
          <el-pagination v-model:current-page="ordPage" :page-size="10" :total="ordTotal" layout="total, prev, pager, next" small />
        </div>
      </template>
    </el-card>
  </div>
</template>
