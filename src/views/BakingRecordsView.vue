<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useApsStore } from '@/stores/aps'
import { usePagination } from '@/composables/usePagination'
import { recordStatusTag } from '@/utils/statusTags'
import type { RawFoilInventory } from '@/types/aps'

const apsStore = useApsStore()
const selectedRolls = ref<string[]>([])
const submitting = ref(false)

const rawFoilAvail = computed(() =>
  apsStore.rawFoilInventory.filter((inv) => inv.status === 'AVAILABLE'),
)
const bakingRecords = computed(() => apsStore.productionRecords.filter((r) => r.process === '烘烤'))
const { page: rawPage, paged: rawPaged, total: rawTotal } = usePagination(() => rawFoilAvail.value)
const { page: bakingPage, paged: bakingPaged, total: bakingTotal } = usePagination(() => bakingRecords.value)

async function handleReserve() {
  if (selectedRolls.value.length === 0) { ElMessage.warning('请选择要领料的母卷'); return }
  submitting.value = true
  try {
    await apsStore.reserveForBaking(selectedRolls.value)
    ElMessage.success(`已领料 ${selectedRolls.value.length} 卷，进入烘烤流程`)
    selectedRolls.value = []
  } finally {
    submitting.value = false
  }
}

async function handleComplete(recordId: string) {
  await apsStore.completeBaking(recordId)
  ElMessage.success('烘烤完成，熟箔已入熟箔库')
}
</script>

<template>
  <div class="space-y-6">
    <el-card shadow="never">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium">生箔库选料（可用生箔）</span>
          <el-button type="warning" size="small" :disabled="selectedRolls.length === 0" :loading="submitting" @click="handleReserve">
            领料进烘烤 ({{ selectedRolls.length }} 卷)
          </el-button>
        </div>
      </template>
      <el-empty v-if="rawFoilAvail.length === 0" description="暂无可领料的生箔库存" />
      <template v-else>
        <el-table :data="rawPaged" border stripe size="default" @selection-change="(rows: RawFoilInventory[]) => selectedRolls = rows.map(r => r.rollId)">
          <el-table-column type="selection" width="50" />
          <el-table-column prop="rollId" label="卷号" min-width="130" />
          <el-table-column prop="machineId" label="生产机台" min-width="100" />
          <el-table-column label="厚度 (μm)" min-width="90" align="right">
            <template #default="{ row }"><span style="font-family:Consolas,monospace">{{ row.thickness }}</span></template>
          </el-table-column>
          <el-table-column label="宽度 (mm)" min-width="90" align="right">
            <template #default="{ row }"><span style="font-family:Consolas,monospace">{{ row.width }}</span></template>
          </el-table-column>
          <el-table-column label="重量 (kg)" min-width="100" align="right">
            <template #default="{ row }"><span style="font-family:Consolas,monospace">{{ row.weightKg }}</span></template>
          </el-table-column>
          <el-table-column prop="createdAt" label="入库日期" min-width="110" />
        </el-table>
        <div class="flex justify-end mt-3">
          <el-pagination v-model:current-page="rawPage" :page-size="10" :total="rawTotal" layout="total, prev, pager, next" small />
        </div>
      </template>
    </el-card>

    <el-card shadow="never">
      <template #header><span class="text-sm font-medium">烘烤生产记录</span></template>
      <el-empty v-if="bakingRecords.length === 0" description="暂无烘烤记录" />
      <template v-else>
        <el-table :data="bakingPaged" border stripe size="default">
          <el-table-column prop="recordId" label="记录号" min-width="140" />
          <el-table-column prop="sourceId" label="来源母卷" min-width="130" />
          <el-table-column prop="machineId" label="处理线" min-width="100" />
          <el-table-column prop="plannedDate" label="日期" min-width="110" />
          <el-table-column label="状态" min-width="90">
            <template #default="{ row }">
              <el-tag effect="light" :type="recordStatusTag(row.status)" size="small">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" fixed="right" min-width="110">
            <template #default="{ row }">
              <el-button v-if="row.status === 'WAITING'" type="success" link size="small" @click="handleComplete(row.recordId)">完成烘烤</el-button>
              <span v-else class="text-[#86909C] text-xs">已完成</span>
            </template>
          </el-table-column>
        </el-table>
        <div class="flex justify-end mt-3">
          <el-pagination v-model:current-page="bakingPage" :page-size="10" :total="bakingTotal" layout="total, prev, pager, next" small />
        </div>
      </template>
    </el-card>
  </div>
</template>
