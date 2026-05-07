<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useApsStore } from '@/stores/aps'
import { usePagination } from '@/composables/usePagination'
import { recordStatusTag } from '@/utils/statusTags'

const apsStore = useApsStore()
const showDialog = ref(false)
const form = ref({ machineId: '', plannedDate: '', plannedWeightKg: 1200 })
const submitting = ref(false)

const rawFoilRecords = computed(() => apsStore.productionRecords.filter((r) => r.process === '生箔'))
const { page: recPage, paged: recPaged, total: recTotal } = usePagination(() => rawFoilRecords.value)

function openDialog() {
  const machine = apsStore.rawFoilMachines[0]
  form.value = { machineId: machine?.machineId ?? '', plannedDate: new Date().toISOString().slice(0, 10), plannedWeightKg: 1200 }
  showDialog.value = true
}

async function handleConfirm() {
  if (!form.value.machineId) { ElMessage.warning('请选择机台'); return }
  submitting.value = true
  try {
    await apsStore.confirmRawFoilProduction(form.value.machineId, form.value.plannedDate, form.value.plannedWeightKg)
    ElMessage.success('生产记录已创建，母卷已入生箔库')
    showDialog.value = false
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <span class="text-sm text-[#86909C]">确认生箔生产 → 创建生产记录 → INSERT 生箔库 (RAW_FOIL)</span>
      <el-button type="primary" size="small" @click="openDialog">确认生产入库</el-button>
    </div>

    <el-card shadow="never">
      <template #header><span class="text-sm font-medium">生箔生产记录</span></template>
      <el-empty v-if="rawFoilRecords.length === 0" description="暂无生箔生产记录" />
      <template v-else>
        <el-table :data="recPaged" border stripe size="default">
          <el-table-column prop="recordId" label="记录号" min-width="140" />
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
          <el-pagination v-model:current-page="recPage" :page-size="10" :total="recTotal" layout="total, prev, pager, next" small />
        </div>
      </template>
    </el-card>

    <el-dialog v-model="showDialog" title="确认生箔生产入库" width="480px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="机台">
          <el-select v-model="form.machineId" style="width:100%">
            <el-option v-for="m in apsStore.rawFoilMachines" :key="m.machineId" :label="`${m.machineId} (${m.maxWidth}mm)`" :value="m.machineId" />
          </el-select>
        </el-form-item>
        <el-form-item label="生产日期">
          <el-date-picker v-model="form.plannedDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
        <el-form-item label="产量 (kg)">
          <el-input-number v-model="form.plannedWeightKg" :min="100" :step="100" style="width:100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleConfirm">确认入库</el-button>
      </template>
    </el-dialog>
  </div>
</template>
