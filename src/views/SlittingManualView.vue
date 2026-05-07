<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useSlittingStore } from '@/stores/useSlittingStore'
import SlittingActionDialog from '@/components/SlittingActionDialog.vue'
import type { ProductionOrder, TreatedFoilInventory } from '@/types/aps'

const slittingStore = useSlittingStore()

onMounted(() => slittingStore.loadData())

const activeTab = ref('order-pull')

const dialogVisible = ref(false)
const dialogMode = ref<'pull' | 'push'>('pull')
const dialogItem = ref<ProductionOrder | TreatedFoilInventory | null>(null)

function openDialog(mode: 'pull' | 'push', item: ProductionOrder | TreatedFoilInventory) {
  dialogMode.value = mode
  dialogItem.value = item
  dialogVisible.value = true
}

function handleConfirm(payload: { roll: TreatedFoilInventory; orders: ProductionOrder[] }[]) {
  payload.forEach((p) => slittingStore.saveDraftPlan(p))
  ElMessage.success(`已保存 ${payload.length} 条草稿计划`)
  dialogVisible.value = false
}

function shortageKg(o: ProductionOrder) {
  return Math.max(0, o.targetWeightKg - o.fulfilledKg - o.lockedWeightKg)
}

function availKg(r: TreatedFoilInventory) {
  return r.weightKg - r.lockedWeightKg
}
</script>

<template>
  <div class="space-y-4">
    <el-tabs v-model="activeTab" type="border-card">

      <!-- Tab1: 订单驱动 (正向拉动) -->
      <el-tab-pane label="按订单配卷" name="order-pull">
        <el-empty v-if="slittingStore.pendingOrders.length === 0" description="暂无待配卷的生产订单" />
        <el-table v-else :data="slittingStore.pendingOrders" border stripe size="default">
          <el-table-column prop="productionOrderId" label="生产单号" min-width="120" />
          <el-table-column label="产品编码" min-width="110">
            <template #default="{ row }">
              <span style="font-family:Consolas,monospace">{{ row.rawOrder.productCode }}</span>
            </template>
          </el-table-column>
          <el-table-column label="产品名称" min-width="150">
            <template #default="{ row }">
              <span class="text-sm">{{ row.rawOrder.productName }}</span>
            </template>
          </el-table-column>
          <el-table-column label="客户" min-width="80">
            <template #default="{ row }">{{ row.rawOrder.customerCode }}</template>
          </el-table-column>
          <el-table-column label="规格" min-width="130">
            <template #default="{ row }">
              <span style="font-family:Consolas,monospace">{{ row.thickness }}μm / {{ row.width }}mm / {{ row.strength }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="urgency" label="紧急度" min-width="70" />
          <el-table-column label="总需求(kg)" min-width="100" align="right">
            <template #default="{ row }">
              <span style="font-family:Consolas,monospace">{{ row.targetWeightKg }}</span>
            </template>
          </el-table-column>
          <el-table-column label="已下发(kg)" min-width="100" align="right">
            <template #default="{ row }">
              <span style="font-family:Consolas,monospace" class="text-[#00B42A]">{{ row.fulfilledKg }}</span>
            </template>
          </el-table-column>
          <el-table-column label="草稿锁(kg)" min-width="100" align="right">
            <template #default="{ row }">
              <span
                style="font-family:Consolas,monospace"
                :class="row.lockedWeightKg > 0 ? 'text-[#E6A23C] font-semibold' : 'text-[#C9CDD4]'"
              >{{ row.lockedWeightKg.toFixed(1) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="现需求量(kg)" min-width="90" align="right">
            <template #default="{ row }">
              <span style="font-family:Consolas,monospace" class="font-semibold text-[#F53F3F]">
                {{ shortageKg(row).toFixed(1) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="deliveryDate" label="交期" min-width="105" />
          <el-table-column label="操作" width="90" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="openDialog('pull', row)">配卷</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- Tab2: 库存驱动 (反向推销) -->
      <el-tab-pane label="按库存配单" name="roll-push">
        <el-empty v-if="slittingStore.availableRolls.length === 0" description="暂无可用熟箔母卷" />
        <el-table v-else :data="slittingStore.availableRolls" border stripe size="default">
          <el-table-column prop="rollId" label="卷号" min-width="110" />
          <el-table-column label="类型" min-width="70">
            <template #default="{ row }">
              <el-tag effect="light" :type="row.isSlitReturn ? 'info' : 'success'" size="small">
                {{ row.isSlitReturn ? '余卷' : '熟箔' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="规格" min-width="150">
            <template #default="{ row }">
              <span style="font-family:Consolas,monospace">{{ row.thickness }}μm / {{ row.width }}mm / {{ row.strength }}</span>
            </template>
          </el-table-column>
          <el-table-column label="总重(kg)" min-width="90" align="right">
            <template #default="{ row }">
              <span style="font-family:Consolas,monospace">{{ row.weightKg }}</span>
            </template>
          </el-table-column>
          <el-table-column label="可用(kg)" min-width="90" align="right">
            <template #default="{ row }">
              <span style="font-family:Consolas,monospace" class="font-semibold text-[#00B42A]">
                {{ availKg(row).toFixed(1) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="草稿锁(kg)" min-width="95" align="right">
            <template #default="{ row }">
              <span
                style="font-family:Consolas,monospace"
                :class="row.lockedWeightKg > 0 ? 'text-[#E6A23C]' : 'text-[#C9CDD4]'"
              >{{ row.lockedWeightKg }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="location" label="库位" min-width="95" />
          <el-table-column label="操作" width="90" fixed="right">
            <template #default="{ row }">
              <el-button type="success" size="small" @click="openDialog('push', row)">配单</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

    </el-tabs>

    <SlittingActionDialog
      v-if="dialogItem !== null"
      v-model="dialogVisible"
      :mode="dialogMode"
      :source-item="dialogItem"
      @confirm="handleConfirm"
    />
  </div>
</template>
