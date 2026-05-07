<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import BakingBucketBoard from '@/components/BakingBucketBoard.vue'
import { useApsStore } from '@/stores/aps'
import { usePagination } from '@/composables/usePagination'
import { useBakingState } from '@/composables/useBakingState'

const apsStore = useApsStore()
const { bakingSlots, removeSlot } = useBakingState()

const releasing = ref<string | null>(null)
const visibleDates = ref<string[]>([])
function onDatesChanged(dates: string[]) { visibleDates.value = dates }

// ── Flat row model ──
interface TableRow {
  _type: 'slot' | 'consumed'
  rollId: string
  bakingMachineId: string   // BK-xxx (slot) or '—' (consumed)
  date: string
  weightKg: number
  thickness: number
  width: number
  productionMachineId: string  // RF-xxx (originating machine)
  slotId?: string
}

// Draft slots from current session, filtered to visible week
const slotRows = computed((): TableRow[] =>
  Object.values(bakingSlots)
    .filter((s) => visibleDates.value.includes(s.date))
    .map((s) => {
      const roll = apsStore.rawFoilInventory.find((r) => r.rollId === s.rollId)
      return {
        _type: 'slot',
        rollId: s.rollId,
        bakingMachineId: s.machineId,
        date: s.date,
        weightKg: s.weightKg,
        thickness: roll?.thickness ?? 0,
        width: roll?.width ?? 0,
        productionMachineId: roll?.machineId ?? '—',
        slotId: s.slotId,
      }
    }),
)

// CONSUMED rolls (already reserved for baking)
const consumedRows = computed((): TableRow[] =>
  apsStore.rawFoilInventory
    .filter((r) => r.status === 'CONSUMED')
    .map((r) => ({
      _type: 'consumed',
      rollId: r.rollId,
      bakingMachineId: '—',
      date: r.createdAt,
      weightKg: r.weightKg,
      thickness: r.thickness,
      width: r.width,
      productionMachineId: r.machineId,
    })),
)

const tableRows = computed((): TableRow[] => [...slotRows.value, ...consumedRows.value])
const { page, paged, total } = usePagination(() => tableRows.value)

function completedWeight(rollId: string) {
  return apsStore.productionRecords
    .filter((r) => r.sourceId === rollId && r.process === '烘烤')
    .reduce((s, r) => s + r.actualWeightKg, 0)
}

async function handleRelease(slotId: string, rollId: string) {
  releasing.value = slotId
  try {
    await apsStore.reserveForBaking([rollId])
    removeSlot(slotId)
    ElMessage.success('已下发烘烤领料')
  } finally {
    releasing.value = null
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 overflow-y-auto">

    <!-- ── Scheduling Board ── -->
    <div style="height: calc(100vh - 300px); min-height: 420px">
      <BakingBucketBoard @dates-changed="onDatesChanged" />
    </div>

    <!-- ── Plan List ── -->
    <div class="rounded-xl border border-[#E5E6EB] bg-white shadow-sm">
      <div class="border-b border-[#E5E6EB] bg-[#F7F8FA] px-4 py-3">
        <span class="text-sm font-semibold text-[#1D2129]">烘烤计划清单</span>
        <span class="ml-2 text-xs text-[#86909C]">
          {{ visibleDates[0] }} ~ {{ visibleDates[visibleDates.length - 1] }}
          · {{ slotRows.length }} 条草稿排产 · {{ consumedRows.length }} 条已领料
        </span>
      </div>

      <div class="p-4">
        <el-empty v-if="tableRows.length === 0" description="当前周期暂无排产记录" />
        <template v-else>
          <el-table :data="paged" border stripe size="default">

            <!-- 状态 -->
            <el-table-column label="状态" min-width="90">
              <template #default="{ row }">
                <el-tag v-if="row._type === 'slot'" effect="light" type="warning" size="small">草稿</el-tag>
                <el-tag v-else effect="light" type="success" size="small">已领料</el-tag>
              </template>
            </el-table-column>

            <!-- 生箔卷号 -->
            <el-table-column label="生箔卷号" min-width="120">
              <template #default="{ row }">
                <span class="font-bold text-[#165DFF]" style="font-family:Consolas,monospace">{{ row.rollId }}</span>
              </template>
            </el-table-column>

            <!-- 规格 -->
            <el-table-column label="厚/宽" min-width="120">
              <template #default="{ row }">
                <span style="font-family:Consolas,monospace">{{ row.thickness }}μm / {{ row.width }}mm</span>
              </template>
            </el-table-column>

            <!-- 生产机台 -->
            <el-table-column label="生产机台" prop="productionMachineId" min-width="95" />

            <!-- 烘炉 -->
            <el-table-column label="烘炉" prop="bakingMachineId" min-width="85" />

            <!-- 计划入炉日 -->
            <el-table-column label="计划入炉日" prop="date" min-width="115" />

            <!-- 重量 -->
            <el-table-column label="重量(kg)" min-width="100" align="right">
              <template #default="{ row }">
                <span
                  class="font-semibold"
                  :class="row._type === 'slot' ? 'text-[#165DFF]' : 'text-[#4E5969]'"
                  style="font-family:Consolas,monospace"
                >{{ row.weightKg }}</span>
              </template>
            </el-table-column>

            <!-- 已完成 -->
            <el-table-column label="已完工(kg)" min-width="105" align="right">
              <template #default="{ row }">
                <span
                  style="font-family:Consolas,monospace"
                  :class="completedWeight(row.rollId) > 0 ? 'text-[#00B42A] font-semibold' : 'text-[#86909C]'"
                >{{ completedWeight(row.rollId) }}</span>
              </template>
            </el-table-column>

            <!-- 操作 -->
            <el-table-column label="操作" fixed="right" min-width="130" align="center">
              <template #default="{ row }">
                <!-- 草稿行：删除 + 下发 -->
                <template v-if="row._type === 'slot'">
                  <el-button type="danger" link size="small" @click="removeSlot(row.slotId)">删除</el-button>
                  <el-button
                    type="primary"
                    link
                    size="small"
                    :loading="releasing === row.slotId"
                    @click="handleRelease(row.slotId, row.rollId)"
                  >下发</el-button>
                </template>
                <!-- 已领料行：跳转记录 -->
                <template v-else>
                  <el-button type="success" link size="small" @click="$router.push('/baking/records')">完工记录</el-button>
                </template>
              </template>
            </el-table-column>

          </el-table>

          <div class="mt-3 flex justify-end">
            <el-pagination
              v-model:current-page="page"
              :page-size="10"
              :total="total"
              layout="total, prev, pager, next"
              small
            />
          </div>
        </template>
      </div>
    </div>

  </div>
</template>
