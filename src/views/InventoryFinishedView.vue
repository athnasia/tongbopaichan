<script setup lang="ts">
import { ref, computed } from 'vue'
import { useApsStore } from '@/stores/aps'
import { usePagination } from '@/composables/usePagination'

const apsStore = useApsStore()
const statusFilter = ref<'ALL' | 'IN_STOCK' | 'PACKAGED' | 'SHIPPED'>('ALL')

const filtered = computed(() => {
  const inv = apsStore.finishedProductInventory
  if (statusFilter.value === 'ALL') return inv
  return inv.filter((i) => i.status === statusFilter.value)
})

const inStockKg = computed(() =>
  apsStore.finishedProductInventory.filter((i) => i.status === 'IN_STOCK').reduce((s, i) => s + i.weightKg, 0),
)
const shippedKg = computed(() =>
  apsStore.finishedProductInventory.filter((i) => i.status === 'SHIPPED').reduce((s, i) => s + i.weightKg, 0),
)
const totalKg = computed(() =>
  apsStore.finishedProductInventory.reduce((s, i) => s + i.weightKg, 0),
)

const { page, paged, total } = usePagination(() => filtered.value)

const gradeType = (grade: string) =>
  grade === 'A' ? 'success' : grade === 'B' ? 'warning' : 'danger'

const statusLabel: Record<string, string> = { IN_STOCK: '在库', PACKAGED: '已装箱', SHIPPED: '已发货' }
const statusTagType: Record<string, string> = { IN_STOCK: 'success', PACKAGED: 'warning', SHIPPED: 'info' }
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-3 gap-4">
      <el-card shadow="never" class="text-center">
        <p class="text-xs text-[#86909C]">在库成品</p>
        <p class="mt-1 text-2xl font-bold text-[#00B42A]">{{ inStockKg.toLocaleString() }}</p>
        <p class="text-xs text-[#86909C] mt-0.5">kg 待发货</p>
      </el-card>
      <el-card shadow="never" class="text-center">
        <p class="text-xs text-[#86909C]">已发货</p>
        <p class="mt-1 text-2xl font-bold text-[#86909C]">{{ shippedKg.toLocaleString() }}</p>
        <p class="text-xs text-[#86909C] mt-0.5">kg 出库完成</p>
      </el-card>
      <el-card shadow="never" class="text-center">
        <p class="text-xs text-[#86909C]">成品总计</p>
        <p class="mt-1 text-2xl font-bold text-[#1D2129]">{{ totalKg.toLocaleString() }}</p>
        <p class="text-xs text-[#86909C] mt-0.5">kg 分切产出</p>
      </el-card>
    </div>

    <el-card shadow="never">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium">成品库台账</span>
          <el-radio-group v-model="statusFilter" size="small">
            <el-radio-button value="ALL">全部</el-radio-button>
            <el-radio-button value="IN_STOCK">在库</el-radio-button>
            <el-radio-button value="PACKAGED">已装箱</el-radio-button>
            <el-radio-button value="SHIPPED">已发货</el-radio-button>
          </el-radio-group>
        </div>
      </template>
      <el-empty v-if="filtered.length === 0" description="暂无成品记录 — 请先在分切执行中完成分切" />
      <template v-else>
        <el-table :data="paged" border stripe size="default">
          <el-table-column prop="rollId" label="成品卷号" min-width="110" />
          <el-table-column prop="orderId" label="生产单号" min-width="110" />
          <el-table-column prop="sourceTreatedId" label="溯源熟箔" min-width="100" />
          <el-table-column prop="slittingPlanId" label="分切计划" min-width="100" />
          <el-table-column label="厚度(μm)" min-width="90" align="right">
            <template #default="{ row }"><span style="font-family:Consolas,monospace">{{ row.thickness }}</span></template>
          </el-table-column>
          <el-table-column label="宽度(mm)" min-width="90" align="right">
            <template #default="{ row }"><span style="font-family:Consolas,monospace">{{ row.width }}</span></template>
          </el-table-column>
          <el-table-column label="净重(kg)" min-width="90" align="right">
            <template #default="{ row }"><span style="font-family:Consolas,monospace">{{ row.weightKg }}</span></template>
          </el-table-column>
          <el-table-column label="质量等级" min-width="90">
            <template #default="{ row }">
              <el-tag effect="light" :type="gradeType(row.qualityGrade)" size="small">{{ row.qualityGrade }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" min-width="90">
            <template #default="{ row }">
              <el-tag effect="light" :type="statusTagType[row.status]" size="small">{{ statusLabel[row.status] }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
        <div class="flex justify-end mt-3">
          <el-pagination v-model:current-page="page" :page-size="10" :total="total" layout="total, prev, pager, next" small />
        </div>
      </template>
    </el-card>
  </div>
</template>
