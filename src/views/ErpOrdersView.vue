<script setup lang="ts">
import { ref, computed } from 'vue'
import { useApsStore } from '@/stores/aps'
import { usePagination } from '@/composables/usePagination'

const apsStore = useApsStore()

const filterCustomer = ref('')
const filterOrderId = ref('')
const filterDateRange = ref<[string, string] | null>(null)
const filterStatus = ref<'' | '已转换' | '待转换'>('')

const convertedIds = computed(() => new Set(apsStore.productionOrders.map((po) => po.rawOrder.orderId)))

function isConverted(orderId: string) { return convertedIds.value.has(orderId) }

const unconverted = computed(() =>
  apsStore.rawOrders.filter((r) => !convertedIds.value.has(r.orderId)),
)

const filteredOrders = computed(() => {
  return apsStore.rawOrders.filter((r) => {
    if (filterCustomer.value && !r.customerCode.includes(filterCustomer.value)) return false
    if (filterOrderId.value && !r.orderId.includes(filterOrderId.value)) return false
    if (filterDateRange.value) {
      const [start, end] = filterDateRange.value
      if (r.deliveryDate < start || r.deliveryDate > end) return false
    }
    if (filterStatus.value) {
      const converted = isConverted(r.orderId)
      if (filterStatus.value === '已转换' && !converted) return false
      if (filterStatus.value === '待转换' && converted) return false
    }
    return true
  })
})

function resetFilters() {
  filterCustomer.value = ''
  filterOrderId.value = ''
  filterDateRange.value = null
  filterStatus.value = ''
}

const { page: erpPage, paged: erpPaged, total: erpTotal } = usePagination(() => filteredOrders.value)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <span class="text-sm text-[#86909C]">共 {{ apsStore.rawOrders.length }} 条原始散单，{{ unconverted.length }} 条待转换</span>
      <el-button type="primary" size="small" :disabled="unconverted.length === 0" @click="apsStore.convertOrders(unconverted.map(r => r.orderId))">一键转换全部</el-button>
    </div>

    <!-- Filter bar -->
    <el-card shadow="never">
      <div class="flex flex-wrap gap-3 items-center">
        <el-input v-model="filterCustomer" placeholder="客户" clearable size="small" style="width:130px" />
        <el-input v-model="filterOrderId" placeholder="订单号" clearable size="small" style="width:140px" />
        <el-date-picker
          v-model="filterDateRange"
          type="daterange"
          range-separator="~"
          start-placeholder="交货日期起"
          end-placeholder="至"
          value-format="YYYY-MM-DD"
          size="small"
          style="width:230px"
        />
        <el-select v-model="filterStatus" placeholder="状态" clearable size="small" style="width:110px">
          <el-option label="全部" value="" />
          <el-option label="已转换" value="已转换" />
          <el-option label="待转换" value="待转换" />
        </el-select>
        <el-button size="small" @click="resetFilters">重置</el-button>
      </div>
    </el-card>

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
            <el-tag effect="light" :type="isConverted(row.orderId) ? 'success' : 'info'" size="small">
              {{ isConverted(row.orderId) ? '已转换' : '待转换' }}
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
