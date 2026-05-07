<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useApsStore } from '@/stores/aps'
import { usePagination } from '@/composables/usePagination'

const apsStore = useApsStore()
const matchLoading = ref(false)
const pushLoading = ref(false)
const generateLoading = ref(false)

// Available treated foil for slitting
const availableTreated = computed(() =>
  apsStore.treatedFoilInventory.filter((inv) => inv.status === 'AVAILABLE' && inv.weightKg - inv.lockedWeightKg > 0),
)
const { page: invPage, paged: invPaged, total: invTotal } = usePagination(() => availableTreated.value)

// Orders with shortage
const ordersWithShortage = computed(() =>
  apsStore.productionOrders.filter(
    (po) => po.reviewStatus === 'APPROVED' && po.targetWeightKg - po.fulfilledKg - po.lockedWeightKg > 0,
  ),
)

function shortageKg(po: (typeof apsStore.productionOrders)[0]) {
  return Math.max(0, po.targetWeightKg - po.fulfilledKg - po.lockedWeightKg)
}

async function handleAutoMatch() {
  matchLoading.value = true
  try { await apsStore.runAutoMatch(); ElMessage.success('自动匹配完成') }
  finally { matchLoading.value = false }
}
async function handleReset() { await apsStore.resetMatch(); ElMessage.info('已重置匹配结果') }
async function handlePushToRawFoil() {
  pushLoading.value = true
  try { const n = await apsStore.pushToRawFoil(); ElMessage.success(n > 0 ? `推送 ${n} 条缺口至生箔` : '无新增') }
  finally { pushLoading.value = false }
}
async function handleGenerateSP() {
  generateLoading.value = true
  try { await apsStore.generateSlittingPlans(); ElMessage.success('分切计划已生成') }
  finally { generateLoading.value = false }
}
async function handleManualAssign(orderId: string, rollId: string) {
  await apsStore.manualAssign(orderId, rollId)
  ElMessage.success(`已锁料 ${rollId}`)
}

function statusTag(po: (typeof apsStore.productionOrders)[0]) {
  const s = shortageKg(po)
  if (s === 0) return { type: 'success' as const, label: '完全满足' }
  if (po.fulfilledKg + po.lockedWeightKg === 0) return { type: 'danger' as const, label: '完全缺料' }
  return { type: 'warning' as const, label: '部分满足' }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap gap-2">
      <el-button type="primary" :loading="matchLoading" @click="handleAutoMatch">自动匹配</el-button>
      <el-button @click="handleReset">重置匹配</el-button>
      <el-button type="warning" :loading="pushLoading" @click="handlePushToRawFoil">推送缺口至生箔</el-button>
      <el-button type="success" :loading="generateLoading" @click="handleGenerateSP">生成分切计划</el-button>
    </div>
    <div class="grid gap-4 xl:grid-cols-2">
      <el-card shadow="never">
        <template #header><span class="text-sm font-medium">需求缺口（已审核订单）</span></template>
        <el-empty v-if="ordersWithShortage.length === 0" description="无缺口订单" />
        <el-table v-else :data="ordersWithShortage" border stripe size="default">
          <el-table-column prop="productionOrderId" label="生产单号" min-width="110" />
          <el-table-column label="厚/宽" min-width="110">
            <template #default="{ row }"><span style="font-family:Consolas,monospace">{{ row.thickness }}μm/{{ row.width }}mm</span></template>
          </el-table-column>
          <el-table-column label="现需求量(kg)" min-width="90" align="right">
            <template #default="{ row }"><span style="font-family:Consolas,monospace;color:#F53F3F">{{ shortageKg(row) }}</span></template>
          </el-table-column>
          <el-table-column label="状态" min-width="100">
            <template #default="{ row }"><el-tag effect="light" :type="statusTag(row).type" size="small">{{ statusTag(row).label }}</el-tag></template>
          </el-table-column>
          <el-table-column label="手动锁料" min-width="130" fixed="right">
            <template #default="{ row }">
              <el-select placeholder="选熟箔卷" size="small" style="width:110px" @change="(rid: string) => handleManualAssign(row.productionOrderId, rid)">
                <el-option v-for="inv in availableTreated.filter(i => i.thickness === row.thickness)" :key="inv.rollId" :label="`${inv.rollId}(${inv.width}mm)`" :value="inv.rollId" />
              </el-select>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
      <el-card shadow="never">
        <template #header><span class="text-sm font-medium">可用熟箔库存</span></template>
        <el-empty v-if="availableTreated.length === 0" description="暂无可用熟箔库存" />
        <template v-else>
          <el-table :data="invPaged" border stripe size="default">
            <el-table-column prop="rollId" label="卷号" min-width="120" />
            <el-table-column label="类型" min-width="80">
              <template #default="{ row }">
                <el-tag effect="light" :type="row.isSlitReturn ? 'info' : 'success'" size="small">{{ row.isSlitReturn ? '余卷' : '熟箔' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="厚/宽" min-width="110">
              <template #default="{ row }"><span style="font-family:Consolas,monospace">{{ row.thickness }}μm/{{ row.width }}mm</span></template>
            </el-table-column>
            <el-table-column label="可用(kg)" min-width="90" align="right">
              <template #default="{ row }"><span style="font-family:Consolas,monospace">{{ row.weightKg - row.lockedWeightKg }}</span></template>
            </el-table-column>
            <el-table-column label="草稿锁(kg)" min-width="90" align="right">
              <template #default="{ row }">
                <span style="font-family:Consolas,monospace" :class="row.lockedWeightKg > 0 ? 'text-[#E6A23C]' : 'text-[#86909C]'">{{ row.lockedWeightKg }}</span>
              </template>
            </el-table-column>
          </el-table>
          <div class="flex justify-end mt-3">
            <el-pagination v-model:current-page="invPage" :page-size="10" :total="invTotal" layout="total, prev, pager, next" small />
          </div>
        </template>
      </el-card>
    </div>
  </div>
</template>
