<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import RawFoilBucketBoard from '@/components/RawFoilBucketBoard.vue'
import { useApsStore } from '@/stores/aps'
import { usePagination } from '@/composables/usePagination'
import { useRawFoilPlanState } from '@/composables/useRawFoilPlanState'
import { recordStatusTag } from '@/utils/statusTags'

const apsStore = useApsStore()
const { rawFoilSlots, removeSlot } = useRawFoilPlanState()

const releasing = ref<string | null>(null)
const visibleDates = ref<string[]>([])
function onDatesChanged(dates: string[]) { visibleDates.value = dates }

// ── Flat row model ──
interface TableRow {
  _type: 'slot' | 'record'
  id: string              // slotId (slot) or recordId (record)
  productionOrderId: string
  machineId: string
  date: string
  weightKg: number
  thickness: number
  width: number
  strength: string
  status?: string
  yieldRate?: number
  slotId?: string
}

// Draft slots from current session, filtered to visible week
const slotRows = computed((): TableRow[] =>
  Object.values(rawFoilSlots)
    .filter((s) => visibleDates.value.includes(s.date))
    .map((s) => ({
      _type: 'slot',
      id: s.slotId,
      productionOrderId: s.productionOrderId,
      machineId: s.machineId,
      date: s.date,
      weightKg: s.plannedWeightKg,
      thickness: s.thickness,
      width: s.width,
      strength: s.strength,
      slotId: s.slotId,
    })),
)

// Confirmed production records (process = '生箔')
const rawFoilRecords = computed(() =>
  apsStore.productionRecords.filter((r) => r.process === '生箔'),
)

const recordRows = computed((): TableRow[] =>
  rawFoilRecords.value.map((r) => ({
    _type: 'record',
    id: r.recordId,
    productionOrderId: r.sourceId ?? '—',
    machineId: r.machineId,
    date: r.plannedDate,
    weightKg: r.actualWeightKg,
    thickness: 0,
    width: 0,
    strength: '—',
    status: r.status,
    yieldRate: r.yieldRate,
  })),
)

const tableRows = computed((): TableRow[] => [...slotRows.value, ...recordRows.value])
const { page, paged, total } = usePagination(() => tableRows.value)

async function handleRelease(slotId: string) {
  const slot = rawFoilSlots[slotId]
  if (!slot) return
  releasing.value = slotId
  try {
    await apsStore.confirmRawFoilProduction(slot.machineId, slot.date, slot.plannedWeightKg)
    removeSlot(slotId)
    ElMessage.success('生产记录已创建，母卷已入生箔库')
  } finally {
    releasing.value = null
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 overflow-y-auto">

    <!-- ── Scheduling Board ── -->
    <div style="height: calc(100vh - 300px); min-height: 420px">
      <RawFoilBucketBoard @dates-changed="onDatesChanged" />
    </div>

    <!-- ── Plan List ── -->
    <div class="rounded-xl border border-[#E5E6EB] bg-white shadow-sm">
      <div class="border-b border-[#E5E6EB] bg-[#F7F8FA] px-4 py-3">
        <span class="text-sm font-semibold text-[#1D2129]">生箔排产清单</span>
        <span class="ml-2 text-xs text-[#86909C]">
          {{ visibleDates[0] }} ~ {{ visibleDates[visibleDates.length - 1] }}
          · {{ slotRows.length }} 条草稿排产 · {{ rawFoilRecords.length }} 条已确认
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
                <el-tag v-else effect="light" :type="recordStatusTag(row.status)" size="small">{{ row.status }}</el-tag>
              </template>
            </el-table-column>

            <!-- 标识 -->
            <el-table-column label="单号/记录号" min-width="150">
              <template #default="{ row }">
                <span class="font-bold text-[#165DFF]" style="font-family:Consolas,monospace">
                  {{ row._type === 'slot' ? row.productionOrderId : row.id }}
                </span>
              </template>
            </el-table-column>

            <!-- 机台 -->
            <el-table-column label="机台" prop="machineId" min-width="90" />

            <!-- 日期 -->
            <el-table-column label="计划日期" prop="date" min-width="115" />

            <!-- 规格 (slot only) -->
            <el-table-column label="规格" min-width="140">
              <template #default="{ row }">
                <span v-if="row._type === 'slot'" style="font-family:Consolas,monospace">
                  {{ row.thickness }}μm / {{ row.width }}mm / {{ row.strength }}
                </span>
                <span v-else class="text-[#C9CDD4]">—</span>
              </template>
            </el-table-column>

            <!-- 计划量 / 实绩 -->
            <el-table-column label="计划/实绩(kg)" min-width="115" align="right">
              <template #default="{ row }">
                <span
                  class="font-semibold"
                  :class="row._type === 'slot' ? 'text-[#165DFF]' : 'text-[#00B42A]'"
                  style="font-family:Consolas,monospace"
                >{{ row.weightKg }}</span>
              </template>
            </el-table-column>

            <!-- 成材率 (record only) -->
            <el-table-column label="成材率" min-width="80" align="right">
              <template #default="{ row }">
                <span v-if="row._type === 'record'" style="font-family:Consolas,monospace">
                  {{ Math.round((row.yieldRate ?? 0) * 100) }}%
                </span>
                <span v-else class="text-[#C9CDD4]">—</span>
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
                    @click="handleRelease(row.slotId)"
                  >确认生产</el-button>
                </template>
                <!-- 已确认行：跳转记录 -->
                <template v-else>
                  <el-button type="success" link size="small" @click="$router.push('/raw-foil/records')">生产记录</el-button>
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
