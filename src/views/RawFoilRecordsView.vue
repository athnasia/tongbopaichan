<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { rawFoilApi } from '@/api/raw-foil'
import { usePagination } from '@/composables/usePagination'
import { recordStatusTag } from '@/utils/statusTags'
import type { ProductionRecord } from '@/types/demo'

const records = ref<ProductionRecord[]>([])

const filterRecordId = ref('')
const filterSourceId = ref('')
const filterMachineId = ref('')
const filterStatus = ref('')

const filteredRecords = computed(() =>
  records.value.filter((r) => {
    if (filterRecordId.value && !r.recordId.includes(filterRecordId.value)) return false
    if (filterSourceId.value && !(r.sourceId ?? '').includes(filterSourceId.value)) return false
    if (filterMachineId.value && !r.machineId.includes(filterMachineId.value)) return false
    if (filterStatus.value && r.status !== filterStatus.value) return false
    return true
  }),
)

function resetFilters() {
  filterRecordId.value = ''
  filterSourceId.value = ''
  filterMachineId.value = ''
  filterStatus.value = ''
}

const { page, paged, total } = usePagination(() => filteredRecords.value)

onMounted(async () => {
  const res = await rawFoilApi.getRecords()
  records.value = res.data as ProductionRecord[]
})
</script>

<template>
  <div class="space-y-4">
    <!-- Filter bar -->
    <el-card shadow="never">
      <div class="flex flex-wrap gap-3 items-center">
        <el-input v-model="filterRecordId" placeholder="记录号" clearable size="small" style="width:150px" />
        <el-input v-model="filterSourceId" placeholder="计划号" clearable size="small" style="width:150px" />
        <el-input v-model="filterMachineId" placeholder="生产单号/机台" clearable size="small" style="width:150px" />
        <el-select v-model="filterStatus" placeholder="状态" clearable size="small" style="width:110px">
          <el-option label="DONE" value="DONE" />
          <el-option label="WAITING" value="WAITING" />
        </el-select>
        <el-button size="small" @click="resetFilters">重置</el-button>
      </div>
    </el-card>

    <el-card shadow="never">
      <template #header><span class="text-sm font-medium">生箔生产记录</span></template>
      <el-empty v-if="filteredRecords.length === 0" description="暂无生箔生产记录" />
      <template v-else>
        <el-table :data="paged" border stripe size="default">
          <el-table-column prop="recordId" label="记录号" min-width="140" />
          <el-table-column prop="sourceId" label="计划号" min-width="130" />
          <el-table-column prop="machineId" label="机台" min-width="100" />
          <el-table-column prop="plannedDate" label="生产日期" min-width="120" />
          <el-table-column label="实绩 (kg)" min-width="100" align="right">
            <template #default="{ row }"><span style="font-family:Consolas,monospace">{{ row.actualWeightKg }}</span></template>
          </el-table-column>
          <el-table-column label="成材率" min-width="90" align="right">
            <template #default="{ row }"><span style="font-family:Consolas,monospace">{{ Math.round(row.yieldRate * 100) }}%</span></template>
          </el-table-column>
          <el-table-column label="状态" min-width="90">
            <template #default="{ row }">
              <el-tag effect="light" :type="recordStatusTag(row.status)" size="small">{{ row.status }}</el-tag>
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
