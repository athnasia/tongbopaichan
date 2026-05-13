<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import BakingBucketBoard from '@/components/BakingBucketBoard.vue'
import { useApsStore } from '@/stores/aps'
import { usePagination } from '@/composables/usePagination'
import type { AggregatedBakingPlan } from '@/types/demo'

const apsStore = useApsStore()

const visibleDates = ref<string[]>([])
function onDatesChanged(dates: string[]) { visibleDates.value = dates }

const completing = ref<string | null>(null)
const showCompleteDialog = ref(false)
const activePlan = ref<AggregatedBakingPlan | null>(null)
const completeForm = ref({ actualWeightKg: 0, yieldRate: 0.98 })

const { page, paged, total } = usePagination(() => apsStore.aggregatedBakingPlans)

function statusType(status: string) {
  if (status === 'COMPLETED') return 'success'
  if (status === 'IN_PROGRESS') return 'warning'
  return 'info'
}

function statusLabel(status: string) {
  if (status === 'COMPLETED') return '已完工'
  if (status === 'IN_PROGRESS') return '烘烤中'
  return '待烘烤'
}

function openComplete(plan: AggregatedBakingPlan) {
  activePlan.value = plan
  completeForm.value = { actualWeightKg: plan.totalWeightKg, yieldRate: 0.98 }
  showCompleteDialog.value = true
}

async function handleComplete() {
  if (!activePlan.value) return
  completing.value = activePlan.value.bakingPlanId
  try {
    await apsStore.completeAggregatedBakingPlan(activePlan.value.bakingPlanId, completeForm.value)
    ElMessage.success('烘烤完工确认成功')
    showCompleteDialog.value = false
  } finally {
    completing.value = null
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 overflow-y-auto">

    <!-- ── Scheduling Board ── -->
    <div style="height: calc(100vh - 300px); min-height: 420px">
      <BakingBucketBoard @dates-changed="onDatesChanged" />
    </div>

    <!-- ── Aggregated Plan Table ── -->
    <div class="rounded-xl border border-[#E5E6EB] bg-white shadow-sm">
      <div class="border-b border-[#E5E6EB] bg-[#F7F8FA] px-4 py-3 flex items-center justify-between">
        <span class="text-sm font-semibold text-[#1D2129]">烘烤计划</span>
        <div class="flex gap-2">
          <el-button size="small" @click="">模型预测</el-button>
        </div>
      </div>

      <div class="p-4">
        <el-empty v-if="apsStore.aggregatedBakingPlans.length === 0" description="暂无烘烤计划，完成生箔计划后自动生成" />
        <template v-else>
          <el-table :data="paged" border stripe size="default">
            <el-table-column label="烘烤计划号" min-width="145">
              <template #default="{ row }">
                <span class="font-bold text-[#165DFF]" style="font-family:Consolas,monospace">{{ row.bakingPlanId }}</span>
              </template>
            </el-table-column>
            <el-table-column label="来源生箔计划" min-width="145">
              <template #default="{ row }">
                <span class="text-[#4E5969]" style="font-family:Consolas,monospace">{{ row.sourceFoilPlanId }}</span>
              </template>
            </el-table-column>
            <el-table-column label="规格" prop="spec" min-width="160" />
            <el-table-column label="重量 (kg)" min-width="110" align="right">
              <template #default="{ row }">
                <span style="font-family:Consolas,monospace" class="font-semibold">{{ row.totalWeightKg.toLocaleString() }}</span>
              </template>
            </el-table-column>
            <el-table-column label="挂载订单" min-width="230">
              <template #default="{ row }">
                <div class="flex flex-wrap gap-1">
                  <el-tag v-for="id in row.linkedOrderIds" :key="id" effect="light" type="info" size="small">{{ id }}</el-tag>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="状态" min-width="90">
              <template #default="{ row }">
                <el-tag effect="light" :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" fixed="right" min-width="110" align="center">
              <template #default="{ row }">
                <el-button
                  v-if="row.status !== 'COMPLETED'"
                  type="primary"
                  link
                  size="small"
                  @click="openComplete(row)"
                >确认完工</el-button>
                <span v-else class="text-[#86909C] text-xs">已完工</span>
              </template>
            </el-table-column>
          </el-table>

          <div class="mt-3 flex justify-end">
            <el-pagination v-model:current-page="page" :page-size="10" :total="total" layout="total, prev, pager, next" small />
          </div>
        </template>
      </div>
    </div>

    <el-dialog v-model="showCompleteDialog" title="确认烘烤完工" width="440px" destroy-on-close>
      <div class="mb-4 text-sm text-[#4E5969]">
        <span class="font-medium text-[#1D2129]">{{ activePlan?.bakingPlanId }}</span>
        · {{ activePlan?.spec }} · 计划量 {{ activePlan?.totalWeightKg }} kg
      </div>
      <el-form :model="completeForm" label-width="100px">
        <el-form-item label="实际产量 (kg)">
          <el-input-number v-model="completeForm.actualWeightKg" :min="1" :step="100" style="width:100%" />
        </el-form-item>
        <el-form-item label="成材率">
          <el-input-number v-model="completeForm.yieldRate" :min="0.5" :max="1" :step="0.01" :precision="2" style="width:100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCompleteDialog = false">取消</el-button>
        <el-button type="primary" :loading="completing !== null" @click="handleComplete">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>