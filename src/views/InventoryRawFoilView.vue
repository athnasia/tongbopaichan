<script setup lang="ts">
import { ref, computed } from 'vue'
import { useApsStore } from '@/stores/aps'
import { usePagination } from '@/composables/usePagination'

const apsStore = useApsStore()
const statusFilter = ref<'ALL' | 'AVAILABLE' | 'CONSUMED'>('ALL')

const filtered = computed(() => {
  const inv = apsStore.rawFoilInventory
  if (statusFilter.value === 'ALL') return inv
  return inv.filter((i) => i.status === statusFilter.value)
})

const availCount = computed(() => apsStore.rawFoilInventory.filter((i) => i.status === 'AVAILABLE').length)
const availKg = computed(() => apsStore.rawFoilInventory.filter((i) => i.status === 'AVAILABLE').reduce((s, i) => s + i.weightKg, 0))
const bakingCount = computed(() => apsStore.rawFoilInventory.filter((i) => i.status === 'CONSUMED').length)

const { page, paged, total } = usePagination(() => filtered.value)
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-3 gap-4">
      <el-card shadow="never" class="text-center">
        <p class="text-xs text-[#86909C]">在库卷数</p>
        <p class="mt-1 text-2xl font-bold text-[#165DFF]">{{ availCount }}</p>
        <p class="text-xs text-[#86909C] mt-0.5">{{ availKg.toLocaleString() }} kg</p>
      </el-card>
      <el-card shadow="never" class="text-center">
        <p class="text-xs text-[#86909C]">烘烤中</p>
        <p class="mt-1 text-2xl font-bold text-[#FF7D00]">{{ bakingCount }}</p>
        <p class="text-xs text-[#86909C] mt-0.5">已领料进入烘烤</p>
      </el-card>
      <el-card shadow="never" class="text-center">
        <p class="text-xs text-[#86909C]">合计入库</p>
        <p class="mt-1 text-2xl font-bold text-[#1D2129]">{{ apsStore.rawFoilInventory.length }}</p>
        <p class="text-xs text-[#86909C] mt-0.5">全部状态卷数</p>
      </el-card>
    </div>

    <el-card shadow="never">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium">生箔库台账</span>
          <el-radio-group v-model="statusFilter" size="small">
            <el-radio-button value="ALL">全部</el-radio-button>
            <el-radio-button value="AVAILABLE">在库</el-radio-button>
            <el-radio-button value="CONSUMED">烘烤中</el-radio-button>
          </el-radio-group>
        </div>
      </template>
      <el-empty v-if="filtered.length === 0" description="暂无记录" />
      <template v-else>
        <el-table :data="paged" border stripe size="default">
          <el-table-column prop="rollId" label="卷号" min-width="110" />
          <el-table-column prop="machineId" label="系统" min-width="100" />
          <el-table-column label="厚度(μm)" min-width="90" align="right">
            <template #default="{ row }"><span style="font-family:Consolas,monospace">{{ row.thickness }}</span></template>
          </el-table-column>
          <el-table-column label="宽度(mm)" min-width="90" align="right">
            <template #default="{ row }"><span style="font-family:Consolas,monospace">{{ row.width }}</span></template>
          </el-table-column>
          <el-table-column label="净重(kg)" min-width="90" align="right">
            <template #default="{ row }"><span style="font-family:Consolas,monospace">{{ row.weightKg }}</span></template>
          </el-table-column>
          <el-table-column label="状态" min-width="100">
            <template #default="{ row }">
              <el-tag v-if="row.status === 'AVAILABLE'" effect="light" type="success" size="small">在库</el-tag>
              <el-tag v-else effect="light" type="warning" size="small">烘烤中</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="入库日期" min-width="110" />
        </el-table>
        <div class="flex justify-end mt-3">
          <el-pagination v-model:current-page="page" :page-size="10" :total="total" layout="total, prev, pager, next" small />
        </div>
      </template>
    </el-card>
  </div>
</template>
