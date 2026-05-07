<script setup lang="ts">
import { computed } from 'vue'
import { useApsStore } from '@/stores/aps'

const apsStore = useApsStore()

const approvedOrders = computed(() =>
  apsStore.productionOrders.filter((po) => po.reviewStatus === 'APPROVED'),
)

// Frontend GroupBy: {thickness}-{strength}
const demandGroups = computed(() => {
  const map = new Map<string, {
    groupKey: string; thickness: number; strength: string
    totalTargetKg: number; totalFulfilledKg: number; totalLockedKg: number
    orders: typeof approvedOrders.value
  }>()
  for (const po of approvedOrders.value) {
    const key = `${po.thickness}-${po.strength}`
    if (!map.has(key)) map.set(key, { groupKey: key, thickness: po.thickness, strength: po.strength, totalTargetKg: 0, totalFulfilledKg: 0, totalLockedKg: 0, orders: [] })
    const g = map.get(key)!
    g.totalTargetKg += po.targetWeightKg
    g.totalFulfilledKg += po.fulfilledKg
    g.totalLockedKg += po.lockedWeightKg
    g.orders.push(po)
  }
  return [...map.values()]
})

function shortageKg(po: (typeof approvedOrders.value)[0]) {
  return Math.max(0, po.targetWeightKg - po.fulfilledKg - po.lockedWeightKg)
}
</script>

<template>
  <div class="space-y-4">
    <div class="text-sm text-[#86909C]">已审核生产订单按厚度 + 强度分组，实时展示吨位进度。缺口 = 需求 - 已下发 - 草稿锁量。</div>
    <el-empty v-if="demandGroups.length === 0" description="暂无已审核订单 — 请先在打标审核台审核订单">
      <el-button type="primary" @click="$router.push('/orders/review')">前往打标审核台</el-button>
    </el-empty>
    <template v-else>
      <el-card v-for="group in demandGroups" :key="group.groupKey" shadow="never" class="mb-4">
        <template #header>
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">{{ group.groupKey }} — {{ group.thickness }}μm / {{ group.strength }}</span>
            <div class="flex gap-2">
              <el-tag effect="light" type="info" size="small">总需求 {{ group.totalTargetKg.toLocaleString() }} kg</el-tag>
              <el-tag effect="light" type="success" size="small">已锁 {{ (group.totalFulfilledKg + group.totalLockedKg).toLocaleString() }} kg</el-tag>
              <el-tag v-if="group.totalTargetKg - group.totalFulfilledKg - group.totalLockedKg > 0" effect="light" type="danger" size="small">
                缺 {{ (group.totalTargetKg - group.totalFulfilledKg - group.totalLockedKg).toLocaleString() }} kg
              </el-tag>
            </div>
          </div>
        </template>
        <el-table :data="group.orders" border stripe size="default">
          <el-table-column prop="productionOrderId" label="生产单号" min-width="110" />
          <el-table-column label="宽度 (mm)" min-width="90" align="right">
            <template #default="{ row }"><span style="font-family:Consolas,monospace">{{ row.width }}</span></template>
          </el-table-column>
          <el-table-column prop="urgency" label="紧急度" min-width="80" />
          <el-table-column label="需求 (kg)" min-width="90" align="right">
            <template #default="{ row }"><span style="font-family:Consolas,monospace">{{ row.targetWeightKg }}</span></template>
          </el-table-column>
          <el-table-column label="已下发 (kg)" min-width="100" align="right">
            <template #default="{ row }">
              <span style="font-family:Consolas,monospace" :class="row.fulfilledKg > 0 ? 'text-[#00B42A] font-semibold' : ''">{{ row.fulfilledKg }}</span>
            </template>
          </el-table-column>
          <el-table-column label="草稿锁量 (kg)" min-width="110" align="right">
            <template #default="{ row }">
              <span style="font-family:Consolas,monospace" :class="row.lockedWeightKg > 0 ? 'text-[#E6A23C] font-semibold' : 'text-[#86909C]'">{{ row.lockedWeightKg }}</span>
            </template>
          </el-table-column>
          <el-table-column label="缺口 (kg)" min-width="90" align="right">
            <template #default="{ row }">
              <span style="font-family:Consolas,monospace" :class="shortageKg(row) > 0 ? 'text-[#F53F3F] font-semibold' : 'text-[#86909C]'">{{ shortageKg(row) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" min-width="90">
            <template #default="{ row }">
              <el-tag v-if="row.status === 'COMPLETED'" effect="light" type="success" size="small">已完成</el-tag>
              <el-tag v-else-if="shortageKg(row) === 0" effect="light" type="success" size="small">完全满足</el-tag>
              <el-tag v-else-if="row.fulfilledKg + row.lockedWeightKg > 0" effect="light" type="warning" size="small">部分满足</el-tag>
              <el-tag v-else effect="light" type="danger" size="small">完全缺料</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </template>
  </div>
</template>
