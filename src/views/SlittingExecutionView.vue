<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useApsStore } from '@/stores/aps'
import { usePagination } from '@/composables/usePagination'
import { slittingOrderStatusTag } from '@/utils/statusTags'

const apsStore = useApsStore()
const showDialog = ref(false)
const currentDispatchId = ref('')
const execForm = ref({ actualWeightKg: 1000, yieldRate: 0.95 })
const submitting = ref(false)

const pendingOrders = computed(() => apsStore.slittingOrders.filter((o) => o.status !== '已执行'))
const executionRecords = computed(() => apsStore.productionRecords.filter((r) => r.process === '分切'))
const { page: pendingPage, paged: pendingPaged, total: pendingTotal } = usePagination(() => pendingOrders.value)
const { page: execPage, paged: execPaged, total: execTotal } = usePagination(() => executionRecords.value)

function openExecute(dispatchId: string) {
  currentDispatchId.value = dispatchId
  execForm.value = { actualWeightKg: 1000, yieldRate: 0.95 }
  showDialog.value = true
}

async function handleExecute() {
  submitting.value = true
  try {
    await apsStore.executeSlitting(currentDispatchId.value, {
      actualWeightKg: execForm.value.actualWeightKg,
      yieldRate: execForm.value.yieldRate,
    })
    ElMessage.success('执行完成：已反填计划，检查生箔库是否有新窄卷回库')
    showDialog.value = false
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- <el-card shadow="never">
      <template #header><span class="text-sm font-medium">待执行分切指令单</span></template>
      <el-empty v-if="pendingOrders.length === 0" description="暂无待执行指令单" />
      <template v-else>
        <el-table :data="pendingPaged" border stripe size="default">
          <el-table-column prop="dispatchId" label="指令号" min-width="130" />
          <el-table-column prop="planId" label="来源计划" min-width="120" />
          <el-table-column prop="machineId" label="机台" min-width="90" />
          <el-table-column prop="plannedDate" label="计划日期" min-width="110" />
          <el-table-column prop="shift" label="班次" min-width="80" />
          <el-table-column label="订单" min-width="200">
            <template #default="{ row }">
              <div class="flex flex-wrap gap-1">
                <el-tag v-for="id in row.orderIds" :key="id" effect="light" type="info" size="small">{{ id }}</el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="状态" min-width="90">
            <template #default="{ row }">
              <el-tag effect="light" :type="slittingOrderStatusTag(row.status)" size="small">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" fixed="right" min-width="110">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="openExecute(row.dispatchId)">执行指令</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="flex justify-end mt-3">
          <el-pagination v-model:current-page="pendingPage" :page-size="10" :total="pendingTotal" layout="total, prev, pager, next" small />
        </div>
      </template>
    </el-card> -->

    <el-card shadow="never">
      <template #header><span class="text-sm font-medium">分切生产记录流水</span></template>
      <el-empty v-if="executionRecords.length === 0" description="暂无分切生产记录" />
      <template v-else>
        <el-table :data="execPaged" border stripe size="default">
          <el-table-column prop="recordId" label="记录号" min-width="140" />
          <el-table-column prop="sourceId" label="来源计划" min-width="120" />
          <el-table-column prop="machineId" label="机台" min-width="90" />
          <el-table-column prop="plannedDate" label="日期" min-width="110" />
          <el-table-column label="实绩 (kg)" min-width="100" align="right">
            <template #default="{ row }"><span style="font-family:Consolas,monospace">{{ row.actualWeightKg }}</span></template>
          </el-table-column>
          <el-table-column label="成材率" min-width="90" align="right">
            <template #default="{ row }"><span style="font-family:Consolas,monospace">{{ Math.round(row.yieldRate * 100) }}%</span></template>
          </el-table-column>
        </el-table>
        <div class="flex justify-end mt-3">
          <el-pagination v-model:current-page="execPage" :page-size="10" :total="execTotal" layout="total, prev, pager, next" small />
        </div>
      </template>
    </el-card>

    <el-dialog v-model="showDialog" title="录入分切执行数据" width="420px">
      <el-form :model="execForm" label-width="90px">
        <el-form-item label="实际产量 (kg)">
          <el-input-number v-model="execForm.actualWeightKg" :min="100" :step="100" style="width:100%" />
        </el-form-item>
        <el-form-item label="成材率">
          <el-input-number v-model="execForm.yieldRate" :min="0.5" :max="1" :step="0.01" :precision="2" style="width:100%" />
        </el-form-item>
        <el-alert type="info" :closable="false" class="mt-2">
          执行完成后：余宽 ≥ 阈值 → 窄卷回库 (SLIT_RETURN)；余宽 &lt; 阈值 → 废料库
        </el-alert>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleExecute">确认执行</el-button>
      </template>
    </el-dialog>
  </div>
</template>
