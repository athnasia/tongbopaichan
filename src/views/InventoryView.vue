<script setup lang="ts">
import { ref, computed } from 'vue'
import { useApsStore } from '@/stores/aps'
import SummaryMetricCard from '@/components/SummaryMetricCard.vue'
import { usePagination } from '@/composables/usePagination'

const apsStore = useApsStore()
const activeTab = ref('treated')

const treatedAvail = computed(() => apsStore.treatedFoilInventory.filter((i) => i.status === 'AVAILABLE'))
const rawFoilAvail = computed(() => apsStore.rawFoilInventory.filter((i) => i.status === 'AVAILABLE'))

const { page: trPage, paged: trPaged, total: trTotal } = usePagination(() => treatedAvail.value)
const { page: rfPage, paged: rfPaged, total: rfTotal } = usePagination(() => rawFoilAvail.value)
</script>

<template>
  <div class="space-y-6">
    <section class="grid gap-4 xl:grid-cols-3">
      <SummaryMetricCard v-for="b in apsStore.inventoryBuckets" :key="b.label"
        :label="b.label" :value="`${b.totalWeightKg.toLocaleString()} kg`"
        :helper="`${b.count} 卷库存`"
        :tone="b.label.includes('成品') ? 'success' : 'primary'" />
    </section>

    <el-card shadow="never">
      <template #header><span class="text-sm font-medium">库存台账</span></template>
      <el-tabs v-model="activeTab">
        <el-tab-pane label="熟箔库（分切来源）" name="treated">
          <el-empty v-if="treatedAvail.length === 0" description="暂无可用熟箔库存" />
          <template v-else>
            <el-table :data="trPaged" border stripe size="default">
              <el-table-column prop="rollId" label="卷号" min-width="120" />
              <el-table-column label="类型" min-width="80">
                <template #default="{ row }">
                  <el-tag effect="light" :type="row.isSlitReturn ? 'info' : 'success'" size="small">{{ row.isSlitReturn ? '分切余卷' : '正常熟箔' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="厚度(μm)" min-width="90" align="right"><template #default="{ row }"><span style="font-family:Consolas,monospace">{{ row.thickness }}</span></template></el-table-column>
              <el-table-column label="宽度(mm)" min-width="90" align="right"><template #default="{ row }"><span style="font-family:Consolas,monospace">{{ row.width }}</span></template></el-table-column>
              <el-table-column label="总重(kg)" min-width="90" align="right"><template #default="{ row }"><span style="font-family:Consolas,monospace">{{ row.weightKg }}</span></template></el-table-column>
              <el-table-column label="草稿锁(kg)" min-width="100" align="right">
                <template #default="{ row }">
                  <span style="font-family:Consolas,monospace" :class="row.lockedWeightKg > 0 ? 'text-[#E6A23C]' : 'text-[#86909C]'">{{ row.lockedWeightKg }}</span>
                </template>
              </el-table-column>
              <el-table-column label="可用(kg)" min-width="90" align="right">
                <template #default="{ row }">
                  <span style="font-family:Consolas,monospace" class="text-[#00B42A] font-semibold">{{ row.weightKg - row.lockedWeightKg }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="location" label="库位" min-width="120" />
            </el-table>
            <div class="flex justify-end mt-3">
              <el-pagination v-model:current-page="trPage" :page-size="10" :total="trTotal" layout="total, prev, pager, next" small />
            </div>
          </template>
        </el-tab-pane>

        <el-tab-pane label="生箔库（烘烤来源）" name="raw">
          <el-empty v-if="rawFoilAvail.length === 0" description="暂无可用生箔库存" />
          <template v-else>
            <el-table :data="rfPaged" border stripe size="default">
              <el-table-column prop="rollId" label="卷号" min-width="120" />
              <el-table-column prop="machineId" label="生产机台" min-width="100" />
              <el-table-column label="厚度(μm)" min-width="90" align="right"><template #default="{ row }"><span style="font-family:Consolas,monospace">{{ row.thickness }}</span></template></el-table-column>
              <el-table-column label="宽度(mm)" min-width="90" align="right"><template #default="{ row }"><span style="font-family:Consolas,monospace">{{ row.width }}</span></template></el-table-column>
              <el-table-column label="重量(kg)" min-width="90" align="right"><template #default="{ row }"><span style="font-family:Consolas,monospace">{{ row.weightKg }}</span></template></el-table-column>
              <el-table-column prop="createdAt" label="入库日" min-width="100" />
            </el-table>
            <div class="flex justify-end mt-3">
              <el-pagination v-model:current-page="rfPage" :page-size="10" :total="rfTotal" layout="total, prev, pager, next" small />
            </div>
          </template>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>
