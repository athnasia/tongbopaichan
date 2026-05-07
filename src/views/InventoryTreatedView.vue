<script setup lang="ts">
import { ref, computed } from 'vue'
import { useApsStore } from '@/stores/aps'
import { usePagination } from '@/composables/usePagination'

const apsStore = useApsStore()
const statusFilter = ref<'ALL' | 'AVAILABLE' | 'CONSUMED'>('AVAILABLE')
const typeFilter = ref<'ALL' | 'NORMAL' | 'SLIT_RETURN'>('ALL')

const filtered = computed(() => {
  let inv = apsStore.treatedFoilInventory
  if (statusFilter.value !== 'ALL') inv = inv.filter((i) => i.status === statusFilter.value)
  if (typeFilter.value === 'NORMAL') inv = inv.filter((i) => !i.isSlitReturn)
  if (typeFilter.value === 'SLIT_RETURN') inv = inv.filter((i) => i.isSlitReturn)
  return inv
})

const availKg = computed(() =>
  apsStore.treatedFoilInventory.filter((i) => i.status === 'AVAILABLE').reduce((s, i) => s + i.weightKg - i.lockedWeightKg, 0),
)
const lockedKg = computed(() =>
  apsStore.treatedFoilInventory.reduce((s, i) => s + i.lockedWeightKg, 0),
)
const slitReturnCount = computed(() =>
  apsStore.treatedFoilInventory.filter((i) => i.isSlitReturn && i.status === 'AVAILABLE').length,
)

const { page, paged, total } = usePagination(() => filtered.value)
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-3 gap-4">
      <el-card shadow="never" class="text-center">
        <p class="text-xs text-[#86909C]">可调配量</p>
        <p class="mt-1 text-2xl font-bold text-[#00B42A]">{{ availKg.toLocaleString() }}</p>
        <p class="text-xs text-[#86909C] mt-0.5">kg（总重 - 草稿锁）</p>
      </el-card>
      <el-card shadow="never" class="text-center">
        <p class="text-xs text-[#86909C]">草稿锁量</p>
        <p class="mt-1 text-2xl font-bold text-[#E6A23C]">{{ lockedKg.toLocaleString() }}</p>
        <p class="text-xs text-[#86909C] mt-0.5">kg（DRAFT 计划占用）</p>
      </el-card>
      <el-card shadow="never" class="text-center">
        <p class="text-xs text-[#86909C]">分切余卷</p>
        <p class="mt-1 text-2xl font-bold text-[#165DFF]">{{ slitReturnCount }}</p>
        <p class="text-xs text-[#86909C] mt-0.5">卷窄卷循环库</p>
      </el-card>
    </div>

    <el-card shadow="never">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium">熟箔库台账</span>
          <div class="flex gap-2">
            <el-radio-group v-model="typeFilter" size="small">
              <el-radio-button value="ALL">全部</el-radio-button>
              <el-radio-button value="NORMAL">正常熟箔</el-radio-button>
              <el-radio-button value="SLIT_RETURN">分切余卷</el-radio-button>
            </el-radio-group>
            <el-radio-group v-model="statusFilter" size="small">
              <el-radio-button value="ALL">全部状态</el-radio-button>
              <el-radio-button value="AVAILABLE">可用</el-radio-button>
              <el-radio-button value="CONSUMED">已消耗</el-radio-button>
            </el-radio-group>
          </div>
        </div>
      </template>
      <el-empty v-if="filtered.length === 0" description="暂无记录" />
      <template v-else>
        <el-table :data="paged" border stripe size="default">
          <el-table-column prop="rollId" label="卷号" min-width="110" />
          <el-table-column label="类型" min-width="90">
            <template #default="{ row }">
              <el-tag effect="light" :type="row.isSlitReturn ? 'info' : 'success'" size="small">
                {{ row.isSlitReturn ? '余卷' : '正常' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="sourceRawId" label="溯源生箔" min-width="100" />
          <el-table-column label="厚度(μm)" min-width="90" align="right">
            <template #default="{ row }"><span style="font-family:Consolas,monospace">{{ row.thickness }}</span></template>
          </el-table-column>
          <el-table-column label="宽度(mm)" min-width="90" align="right">
            <template #default="{ row }"><span style="font-family:Consolas,monospace">{{ row.width }}</span></template>
          </el-table-column>
          <el-table-column prop="strength" label="强度" min-width="70" />
          <el-table-column label="总重(kg)" min-width="90" align="right">
            <template #default="{ row }"><span style="font-family:Consolas,monospace">{{ row.weightKg }}</span></template>
          </el-table-column>
          <el-table-column label="草稿锁(kg)" min-width="100" align="right">
            <template #default="{ row }">
              <span style="font-family:Consolas,monospace" :class="row.lockedWeightKg > 0 ? 'text-[#E6A23C] font-semibold' : 'text-[#86909C]'">{{ row.lockedWeightKg }}</span>
            </template>
          </el-table-column>
          <el-table-column label="可用(kg)" min-width="90" align="right">
            <template #default="{ row }">
              <span style="font-family:Consolas,monospace" class="text-[#00B42A] font-semibold">{{ row.weightKg - row.lockedWeightKg }}</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" min-width="90">
            <template #default="{ row }">
              <el-tag effect="light" :type="row.status === 'AVAILABLE' ? 'success' : 'info'" size="small">
                {{ row.status === 'AVAILABLE' ? '可用' : '已消耗' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="location" label="库位" min-width="120" />
        </el-table>
        <div class="flex justify-end mt-3">
          <el-pagination v-model:current-page="page" :page-size="10" :total="total" layout="total, prev, pager, next" small />
        </div>
      </template>
    </el-card>
  </div>
</template>
