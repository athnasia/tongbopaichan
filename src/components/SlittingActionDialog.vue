<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ProductionOrder, TreatedFoilInventory } from '@/types/aps'
import { useSlittingStore } from '@/stores/useSlittingStore'
import { useConfigStore } from '@/stores/useConfigStore'

const props = defineProps<{
  modelValue: boolean
  mode: 'pull' | 'push'
  sourceItem: ProductionOrder | TreatedFoilInventory
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'confirm', payload: { roll: TreatedFoilInventory; orders: ProductionOrder[] }[]): void
}>()

const slittingStore = useSlittingStore()
const configStore = useConfigStore()

const isPull = computed(() => props.mode === 'pull')
const trimMargin = computed(() => configStore.ruleConfig?.minTrimMargin ?? 10)

const srcThickness = computed(() => (props.sourceItem as any).thickness as number)
const srcStrength = computed(() => (props.sourceItem as any).strength as string)

const srcOrder = computed(() => (isPull.value ? (props.sourceItem as ProductionOrder) : null))
const srcRoll = computed(() => (!isPull.value ? (props.sourceItem as TreatedFoilInventory) : null))

function shortageKg(o: ProductionOrder) {
  return Math.max(0, o.targetWeightKg - o.fulfilledKg - o.lockedWeightKg)
}
function availKg(r: TreatedFoilInventory) {
  return r.weightKg - r.lockedWeightKg
}

// Internal filtering — hard constraint: thickness + strength must match
const candidateList = computed(() => {
  if (isPull.value) {
    return slittingStore.availableRolls.filter(
      (r) => r.thickness === srcThickness.value && r.strength === srcStrength.value,
    )
  }
  return slittingStore.pendingOrders.filter(
    (o) => o.thickness === srcThickness.value && o.strength === srcStrength.value,
  )
})

// Selection
const selectedRollsLocal = ref<TreatedFoilInventory[]>([])
const selectedOrderIds = ref<string[]>([])
const maxOrders = 4

const selectedRolls = computed<TreatedFoilInventory[]>(() => selectedRollsLocal.value)

// Pull mode tonnage progress
const selectedTotalKg = computed(() =>
  selectedRolls.value.reduce((s, r) => s + availKg(r), 0),
)
const orderShortageFull = computed(() =>
  srcOrder.value ? shortageKg(srcOrder.value) : 0,
)
const tonnagePercent = computed(() =>
  orderShortageFull.value > 0
    ? Math.min(100, (selectedTotalKg.value / orderShortageFull.value) * 100)
    : 0,
)

const selectedOrders = computed<ProductionOrder[]>(() =>
  selectedOrderIds.value
    .map((id) => (candidateList.value as ProductionOrder[]).find((o) => o.productionOrderId === id))
    .filter((o): o is ProductionOrder => !!o),
)

// Formula: roll.width - Σ(orders.width) - trimMargin
function rollReturn(roll: TreatedFoilInventory, orderList: ProductionOrder[]) {
  return roll.width - orderList.reduce((s, o) => s + o.width, 0) - trimMargin.value
}

const pushRollReturn = computed(() => {
  if (!srcRoll.value) return 0
  return rollReturn(srcRoll.value, selectedOrders.value)
})

const canConfirm = computed(() => {
  if (isPull.value) {
    return selectedRolls.value.length > 0 && srcOrder.value !== null
  }
  return selectedOrders.value.length > 0 && pushRollReturn.value >= 0
})

function handleRollSelectionChange(rows: TreatedFoilInventory[]) {
  selectedRollsLocal.value = rows
}

function toggleOrder(orderId: string) {
  const idx = selectedOrderIds.value.indexOf(orderId)
  if (idx !== -1) {
    selectedOrderIds.value.splice(idx, 1)
  } else if (selectedOrderIds.value.length < maxOrders) {
    selectedOrderIds.value.push(orderId)
  }
}

watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      selectedRollsLocal.value = []
      selectedOrderIds.value = []
    }
  },
)

function handleConfirm() {
  if (isPull.value && srcOrder.value) {
    emit(
      'confirm',
      selectedRolls.value.map((roll) => ({
        roll,
        orders: [srcOrder.value!],
      })),
    )
  } else if (!isPull.value && srcRoll.value) {
    emit('confirm', [{ roll: srcRoll.value, orders: selectedOrders.value }])
  }
  emit('update:modelValue', false)
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    :title="isPull ? '订单配卷 — 选择母卷' : '库存配单 — 选择订单'"
    width="760px"
    destroy-on-close
    :close-on-click-modal="false"
  >
    <!-- Top: 摘要区 -->
    <div class="mb-4 rounded-lg border border-[#E5E6EB] bg-[#F2F3F5] px-4 py-3 text-sm">
      <template v-if="isPull && srcOrder">
        <div class="flex flex-wrap items-center gap-2">
          <el-tag effect="light" type="primary" size="small">订单驱动</el-tag>
          <span class="font-mono font-semibold text-[#1D2129]">{{ srcOrder.productionOrderId }}</span>
          <span class="text-[#86909C]">|</span>
          <span class="font-mono">{{ srcOrder.thickness }}μm / {{ srcOrder.width }}mm / {{ srcOrder.strength }}</span>
          <span class="text-[#86909C]">|</span>
          <span class="text-[#86909C]">紧急度：</span><span>{{ srcOrder.urgency }}</span>
          <span class="text-[#86909C]">|</span>
          <span class="text-[#86909C]">缺口：</span>
          <span class="font-mono font-semibold text-[#F53F3F]">{{ shortageKg(srcOrder).toFixed(1) }} kg</span>
        </div>
      </template>
      <template v-else-if="!isPull && srcRoll">
        <div class="flex flex-wrap items-center gap-2">
          <el-tag effect="light" type="success" size="small">库存驱动</el-tag>
          <span class="font-mono font-semibold text-[#1D2129]">{{ srcRoll.rollId }}</span>
          <el-tag effect="light" :type="srcRoll.isSlitReturn ? 'info' : 'success'" size="small">
            {{ srcRoll.isSlitReturn ? '余卷' : '熟箔' }}
          </el-tag>
          <span class="font-mono">{{ srcRoll.thickness }}μm / {{ srcRoll.width }}mm / {{ srcRoll.strength }}</span>
          <span class="text-[#86909C]">|</span>
          <span class="text-[#86909C]">可用：</span>
          <span class="font-mono font-semibold text-[#00B42A]">{{ availKg(srcRoll).toFixed(1) }} kg</span>
        </div>
      </template>
    </div>

    <el-empty
      v-if="candidateList.length === 0"
      description="无匹配候选项 — 厚度/强度不符或无可用量"
      :image-size="60"
    />

    <!-- Pull: 母卷多选表格 (type="selection" 内置全选/逐行勾选) -->
    <el-table
      v-else-if="isPull"
      :data="(candidateList as TreatedFoilInventory[])"
      border
      stripe
      size="default"
      @selection-change="handleRollSelectionChange"
    >
      <el-table-column type="selection" width="50" />
      <el-table-column prop="rollId" label="母卷号" min-width="110" />
      <el-table-column label="类型" min-width="70">
        <template #default="{ row }">
          <el-tag effect="light" :type="row.isSlitReturn ? 'info' : 'success'" size="small">
            {{ row.isSlitReturn ? '余卷' : '熟箔' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="宽度(mm)" min-width="90" align="right">
        <template #default="{ row }">
          <span style="font-family:Consolas,monospace">{{ row.width }}</span>
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
    </el-table>

    <!-- Push: 订单多选表格 (max 4) -->
    <el-table
      v-else
      :data="(candidateList as ProductionOrder[])"
      border
      stripe
      size="default"
      @row-click="(row: ProductionOrder) => toggleOrder(row.productionOrderId)"
    >
      <el-table-column width="50">
        <template #default="{ row }">
          <el-checkbox
            :model-value="selectedOrderIds.includes(row.productionOrderId)"
            :disabled="
              !selectedOrderIds.includes(row.productionOrderId) &&
              selectedOrderIds.length >= maxOrders
            "
            @change="toggleOrder(row.productionOrderId)"
            @click.stop
          />
        </template>
      </el-table-column>
      <el-table-column prop="productionOrderId" label="生产单号" min-width="120" />
      <el-table-column label="宽度(mm)" min-width="90" align="right">
        <template #default="{ row }">
          <span style="font-family:Consolas,monospace">{{ row.width }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="urgency" label="紧急度" min-width="70" />
      <el-table-column label="现需求量(kg)" min-width="90" align="right">
        <template #default="{ row }">
          <span style="font-family:Consolas,monospace" class="text-[#F53F3F]">
            {{ shortageKg(row).toFixed(1) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="deliveryDate" label="交期" min-width="105" />
    </el-table>

    <!-- Bottom: 拼刀试算区 -->
    <div v-if="candidateList.length > 0" class="mt-4">
      <!-- Pull: 吨位进度 + 每个勾选母卷各一行公式 -->
      <template v-if="isPull && srcOrder">
        <!-- Tonnage progress -->
        <div class="mb-3 rounded-lg border border-[#E5E6EB] bg-[#F7F8FA] px-4 py-2.5">
          <div class="mb-1.5 flex items-center justify-between text-sm">
            <span class="text-[#86909C]">已选母卷总可用量</span>
            <span>
              <span
                class="font-mono font-semibold"
                :class="selectedTotalKg >= orderShortageFull ? 'text-[#00B42A]' : 'text-[#165DFF]'"
              >{{ selectedTotalKg.toFixed(1) }} kg</span>
              <span class="text-[#86909C]"> / 缺口 </span>
              <span class="font-mono font-semibold text-[#F53F3F]">{{ orderShortageFull.toFixed(1) }} kg</span>
              <span
                v-if="selectedRolls.length > 0"
                class="ml-2 text-xs text-[#86909C]"
              >（已选 {{ selectedRolls.length }} 卷）</span>
            </span>
          </div>
          <el-progress
            :percentage="tonnagePercent"
            :status="tonnagePercent >= 100 ? 'success' : undefined"
            :stroke-width="6"
            :show-text="false"
          />
          <div
            v-if="selectedTotalKg > orderShortageFull && orderShortageFull > 0"
            class="mt-1.5 text-xs text-[#E6A23C]"
          >
            ⚠ 已选重量超出缺口，实际消耗以缺口量为准（上限 {{ orderShortageFull.toFixed(1) }} kg）
          </div>
        </div>
        <div v-if="selectedRolls.length === 0" class="text-xs text-[#C9CDD4]">请勾选母卷以完成配卷</div>
      </template>

      <!-- Push: 单条公式 -->
      <template v-else-if="!isPull && srcRoll">
        <div v-if="selectedOrders.length === 0" class="text-xs text-[#C9CDD4]">
          请勾选订单以试算余宽（最多 {{ maxOrders }} 个）
        </div>
        <template v-else>
          <div class="mb-2 text-sm font-medium text-[#1D2129]">拼刀试算</div>
          <div
            class="rounded-lg border px-3 py-2 text-sm font-mono"
            :class="
              pushRollReturn >= 0 ? 'border-[#00B42A] bg-[#F0FDF4]' : 'border-[#F53F3F] bg-[#FFF2F0]'
            "
          >
            <span class="font-semibold text-[#165DFF]">{{ srcRoll.width }}</span>
            <span class="text-xs text-[#86909C]">mm({{ srcRoll.rollId }})</span>
            <template v-for="(o, i) in selectedOrders" :key="o.productionOrderId">
              <span class="mx-1 text-[#C9CDD4]">&minus;</span>
              <span
                class="font-semibold"
                :class="i % 2 === 0 ? 'text-[#0E9E6E]' : 'text-[#7BC616]'"
              >{{ o.width }}</span>
              <span class="text-xs text-[#86909C]">({{ o.productionOrderId }})</span>
            </template>
            <span class="mx-1 text-[#C9CDD4]">&minus;</span>
            <span class="font-semibold text-[#86909C]">{{ trimMargin }}</span>
            <span class="text-xs text-[#86909C]">(修边)</span>
            <span class="mx-1 text-[#C9CDD4]">=</span>
            <span
              class="font-semibold"
              :class="pushRollReturn >= 0 ? 'text-[#00B42A]' : 'text-[#F53F3F]'"
            >{{ pushRollReturn }}</span>
            <span
              class="ml-0.5 text-xs"
              :class="pushRollReturn >= 0 ? 'text-[#00B42A]' : 'text-[#F53F3F]'"
            >mm ({{ pushRollReturn >= 0 ? '余料' : '越界!' }})</span>
          </div>
        </template>
      </template>
    </div>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :disabled="!canConfirm" @click="handleConfirm">保存草稿</el-button>
    </template>
  </el-dialog>
</template>
