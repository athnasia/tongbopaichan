<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useApsStore } from '@/stores/aps'
import { useConfigStore } from '@/stores/useConfigStore'
import { usePagination } from '@/composables/usePagination'
import { generateFeatureCode } from '@/utils/featureCode'
import type { ProductionOrder, Urgency } from '@/types/aps'

const apsStore = useApsStore()
const configStore = useConfigStore()

const editingId = ref<string | null>(null)
const editForm = ref<{ urgency: Urgency; notes: string }>({ urgency: '常规', notes: '' })

const urgencyOptions: Urgency[] = ['急1', '急2', '常规', '配']

// ─── Filters ─────────────────────────────────────────────
const pendingFilter = reactive({ orderId: '', spec: '', urgency: '', deliveryDate: '' })
const approvedFilter = reactive({ orderId: '', spec: '', urgency: '', deliveryDate: '' })

function filterOrders(orders: ProductionOrder[], f: typeof pendingFilter) {
  const lo = (s: string) => s.toLowerCase()
  const has = (hay: string, needle: string) => !needle || lo(hay).includes(lo(needle))
  return orders.filter((po) => {
    const spec = `${po.rawOrder.thickness}μm/${po.rawOrder.width}mm`
    const orderIds = `${po.productionOrderId} ${po.rawOrder.orderId}`
    return (
      has(orderIds, f.orderId) &&
      has(spec, f.spec) &&
      has(po.urgency, f.urgency) &&
      has(po.rawOrder.deliveryDate, f.deliveryDate)
    )
  })
}

const allPending = computed(() => apsStore.productionOrders.filter((po) => po.reviewStatus === 'PENDING'))
const allApproved = computed(() => apsStore.productionOrders.filter((po) => po.reviewStatus === 'APPROVED'))

const pendingFiltered = computed(() => filterOrders(allPending.value, pendingFilter))
const approvedFiltered = computed(() => filterOrders(allApproved.value, approvedFilter))

const { page: pendingPage, paged: pendingPaged, total: pendingTotal } = usePagination(() => pendingFiltered.value)
const { page: approvedPage, paged: approvedPaged, total: approvedTotal } = usePagination(() => approvedFiltered.value)

watch(() => [pendingFilter.orderId, pendingFilter.spec, pendingFilter.urgency, pendingFilter.deliveryDate], () => { pendingPage.value = 1 })
watch(() => [approvedFilter.orderId, approvedFilter.spec, approvedFilter.urgency, approvedFilter.deliveryDate], () => { approvedPage.value = 1 })

// ─── Feature code live preview when editing ───────────────
const editPreviewCode = computed(() => {
  if (!editingId.value) return null
  const po = allPending.value.find((p) => p.productionOrderId === editingId.value)
  if (!po) return null
  const version = configStore.featureCodeVersions.find((v) => v.versionId === po.featureCodeVersionId)
  if (!version) return null
  const cfg = { strengthMap: version.strengthMap, urgencyMap: version.urgencyMap, thicknessLength: version.thicknessLength, widthLength: version.widthLength, totalLength: version.totalLength }
  return generateFeatureCode(po.rawOrder.thickness, po.rawOrder.width, po.strength, editForm.value.urgency, cfg)
})

// ─── Actions ─────────────────────────────────────────────
function startEdit(po: ProductionOrder) {
  editingId.value = po.productionOrderId
  editForm.value = { urgency: po.urgency, notes: po.notes }
}

async function saveEdit(id: string) {
  await apsStore.updateOrder(id, editForm.value)
  editingId.value = null
  ElMessage.success('已保存')
}

async function handleApprove(id: string) {
  await apsStore.approveOrder(id)
  ElMessage.success('审核通过')
}

async function handleRevoke(id: string) {
  await ElMessageBox.confirm('确认撤回该订单审核？', '撤回确认', { type: 'warning' })
  await apsStore.revokeOrder(id)
  ElMessage.success('已撤回')
}

async function handleBatchApprove() {
  const ids = allPending.value.map((po) => po.productionOrderId)
  if (ids.length === 0) return
  await apsStore.batchApprove(ids)
  ElMessage.success(`已批量审核 ${ids.length} 条`)
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- 顶栏 -->
    <div class="flex items-center justify-between">
      <span class="text-sm text-[#86909C]">
        待审核 {{ allPending.length }} 条
        <template v-if="pendingFiltered.length !== allPending.length">（筛选 {{ pendingFiltered.length }} 条）</template>
        &nbsp;/&nbsp;已审核 {{ allApproved.length }} 条
        <template v-if="approvedFiltered.length !== allApproved.length">（筛选 {{ approvedFiltered.length }} 条）</template>
      </span>
      <el-button type="primary" size="small" :disabled="allPending.length === 0" @click="handleBatchApprove">批量审核全部待审核</el-button>
    </div>

    <!-- 左右布局 -->
    <div class="flex gap-4 items-start">

      <!-- 左：待审核 -->
      <el-card shadow="never" class="flex-1 min-w-0">
        <template #header><span class="text-sm font-medium">待审核订单</span></template>

        <!-- 搜索栏 -->
        <div class="flex flex-wrap gap-2 mb-3">
          <el-input v-model="pendingFilter.orderId" placeholder="订单号" clearable size="small" style="width:130px" />
          <el-input v-model="pendingFilter.spec" placeholder="规格" clearable size="small" style="width:120px" />
          <el-select v-model="pendingFilter.urgency" placeholder="紧急度" clearable size="small" style="width:100px">
            <el-option v-for="u in urgencyOptions" :key="u" :label="u" :value="u" />
          </el-select>
          <el-input v-model="pendingFilter.deliveryDate" placeholder="交货期" clearable size="small" style="width:120px" />
        </div>

        <el-empty v-if="allPending.length === 0" description="暂无待审核订单" />
        <template v-else>
          <el-table :data="pendingPaged" border stripe size="small" style="width:100%">
            <el-table-column prop="productionOrderId" label="生产单号" min-width="90" fixed />
            <el-table-column label="原始订单" min-width="90">
              <template #default="{ row }"><span class="text-[#86909C]">{{ row.rawOrder.orderId }}</span></template>
            </el-table-column>
            <el-table-column label="产品编码" min-width="95">
              <template #default="{ row }"><span style="font-family:Consolas,monospace">{{ row.rawOrder.productCode }}</span></template>
            </el-table-column>
            <el-table-column label="产品名称" min-width="120" show-overflow-tooltip>
              <template #default="{ row }">{{ row.rawOrder.productName }}</template>
            </el-table-column>
            <el-table-column label="客户" min-width="90" show-overflow-tooltip>
              <template #default="{ row }">{{ row.rawOrder.customerCode }}</template>
            </el-table-column>
            <el-table-column label="规格" min-width="120">
              <template #default="{ row }"><span style="font-family:Consolas,monospace">{{ row.rawOrder.thickness }}μm/{{ row.rawOrder.width }}mm</span></template>
            </el-table-column>
            <el-table-column label="强度" min-width="60" align="center">
              <template #default="{ row }">{{ row.strength }}</template>
            </el-table-column>
            <el-table-column label="紧急度" min-width="100">
              <template #default="{ row }">
                <el-select v-if="editingId === row.productionOrderId" v-model="editForm.urgency" size="small" style="width:80px">
                  <el-option v-for="u in urgencyOptions" :key="u" :label="u" :value="u" />
                </el-select>
                <el-tag v-else :type="row.urgency === '急1' ? 'danger' : row.urgency === '急2' ? 'warning' : row.urgency === '配' ? 'info' : ''" size="small">{{ row.urgency }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="备注" min-width="140">
              <template #default="{ row }">
                <el-input v-if="editingId === row.productionOrderId" v-model="editForm.notes" size="small" />
                <span v-else class="text-[#86909C] text-xs">{{ row.notes || '—' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="特征值" min-width="105">
              <template #default="{ row }">
                <span
                  style="font-family:Consolas,monospace"
                  :class="editingId === row.productionOrderId ? 'text-[#E6A23C]' : 'text-[#409EFF]'"
                >
                  {{ editingId === row.productionOrderId ? (editPreviewCode ?? row.featureCode) : row.featureCode }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="交货日" min-width="90">
              <template #default="{ row }">{{ row.rawOrder.deliveryDate }}</template>
            </el-table-column>
            <el-table-column label="操作" fixed="right" min-width="130">
              <template #default="{ row }">
                <template v-if="editingId === row.productionOrderId">
                  <el-button type="primary" link size="small" @click="saveEdit(row.productionOrderId)">保存</el-button>
                  <el-button link size="small" @click="editingId = null">取消</el-button>
                </template>
                <template v-else>
                  <el-button type="primary" link size="small" @click="startEdit(row)">编辑</el-button>
                  <el-button type="success" link size="small" @click="handleApprove(row.productionOrderId)">通过</el-button>
                </template>
              </template>
            </el-table-column>
          </el-table>
          <div class="flex justify-end mt-3">
            <el-pagination v-model:current-page="pendingPage" :page-size="10" :total="pendingTotal" layout="total, prev, pager, next" small />
          </div>
        </template>
      </el-card>

      <!-- 右：已审核 -->
      <el-card shadow="never" class="flex-1 min-w-0">
        <template #header><span class="text-sm font-medium">已审核订单</span></template>

        <!-- 搜索栏 -->
        <div class="flex flex-wrap gap-2 mb-3">
          <el-input v-model="approvedFilter.orderId" placeholder="订单号" clearable size="small" style="width:130px" />
          <el-input v-model="approvedFilter.spec" placeholder="规格" clearable size="small" style="width:120px" />
          <el-select v-model="approvedFilter.urgency" placeholder="紧急度" clearable size="small" style="width:100px">
            <el-option v-for="u in urgencyOptions" :key="u" :label="u" :value="u" />
          </el-select>
          <el-input v-model="approvedFilter.deliveryDate" placeholder="交货期" clearable size="small" style="width:120px" />
        </div>

        <el-empty v-if="allApproved.length === 0" description="暂无已审核订单" />
        <template v-else>
          <el-table :data="approvedPaged" border stripe size="small" style="width:100%">
            <el-table-column prop="productionOrderId" label="生产单号" min-width="90" fixed />
            <el-table-column label="原始订单" min-width="90">
              <template #default="{ row }"><span class="text-[#86909C]">{{ row.rawOrder.orderId }}</span></template>
            </el-table-column>
            <el-table-column label="产品编码" min-width="95">
              <template #default="{ row }"><span style="font-family:Consolas,monospace">{{ row.rawOrder.productCode }}</span></template>
            </el-table-column>
            <el-table-column label="产品名称" min-width="120" show-overflow-tooltip>
              <template #default="{ row }">{{ row.rawOrder.productName }}</template>
            </el-table-column>
            <el-table-column label="客户" min-width="90" show-overflow-tooltip>
              <template #default="{ row }">{{ row.rawOrder.customerCode }}</template>
            </el-table-column>
            <el-table-column label="规格" min-width="120">
              <template #default="{ row }"><span style="font-family:Consolas,monospace">{{ row.rawOrder.thickness }}μm/{{ row.rawOrder.width }}mm</span></template>
            </el-table-column>
            <el-table-column label="强度" min-width="60" align="center">
              <template #default="{ row }">{{ row.strength }}</template>
            </el-table-column>
            <el-table-column label="紧急度" min-width="75" align="center">
              <template #default="{ row }">
                <el-tag :type="row.urgency === '急1' ? 'danger' : row.urgency === '急2' ? 'warning' : row.urgency === '配' ? 'info' : ''" size="small">{{ row.urgency }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="特征值" min-width="105">
              <template #default="{ row }">
                <span v-if="row.featureCode" style="font-family:Consolas,monospace" class="text-[#409EFF]">{{ row.featureCode }}</span>
                <span v-else class="text-[#86909C]">—</span>
              </template>
            </el-table-column>
            <el-table-column label="需求量(kg)" min-width="90" align="right">
              <template #default="{ row }"><span style="font-family:Consolas,monospace">{{ row.rawOrder.orderWeightKg }}</span></template>
            </el-table-column>
            <el-table-column label="交货日" min-width="90">
              <template #default="{ row }">{{ row.rawOrder.deliveryDate }}</template>
            </el-table-column>
            <el-table-column label="操作" fixed="right" min-width="70">
              <template #default="{ row }">
                <el-popconfirm title="确认撤回审核？" @confirm="handleRevoke(row.productionOrderId)">
                  <template #reference><el-button type="danger" link size="small">撤回</el-button></template>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>
          <div class="flex justify-end mt-3">
            <el-pagination v-model:current-page="approvedPage" :page-size="10" :total="approvedTotal" layout="total, prev, pager, next" small />
          </div>
        </template>
      </el-card>

    </div>
  </div>
</template>
