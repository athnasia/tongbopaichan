<script setup lang="ts">
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css'
import { gantt } from 'dhtmlx-gantt'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { MachineCapability, SlittingPlan } from '@/types/aps'

// Must be called before the first gantt.init() across the entire app lifetime.
// Placing it at module scope ensures it runs on first import, before any route renders.
gantt.plugins({ grouping: true })

const props = defineProps<{
  plans: SlittingPlan[]
  machines: MachineCapability[]
}>()

const emit = defineEmits<{
  (e: 'update-schedule', payload: {
    planId: string
    newMachineId: string
    newDate: string
  }): void
}>()

const STATUS_COLORS: Record<string, string> = {
  DRAFT:     '#86909C',
  RELEASED:  '#00B42A',
  COMPLETED: '#165DFF',
}

const containerRef = ref<HTMLDivElement | null>(null)
const eventIds: string[] = []

function addEvent(id: string) { eventIds.push(id) }

function buildTasks() {
  return props.plans.map((p) => ({
    id:         p.planId,
    text:       `${p.planId} | ${p.targetRollId}`,
    start_date: p.plannedDate,
    duration:   1,
    machine_id: p.machineId ?? '__unassigned__',
    status:     p.planStatus,
    color:      STATUS_COLORS[p.planStatus] ?? '#86909C',
    progress:   0,
  }))
}

function buildGroups() {
  const slMachines = props.machines
    .filter((m) => m.machineId.startsWith('SL-'))
    .map((m) => ({ key: m.machineId, label: m.machineId }))
  return [...slMachines, { key: '__unassigned__', label: '未分配' }]
}

function loadData() {
  gantt.clearAll()
  gantt.parse({ data: buildTasks(), links: [] })
  gantt.groupBy({
    groups:              buildGroups(),
    relation_property:   'machine_id',
    group_id:            'key',
    group_label:         'label',
    default_group_label: '未分配',
  } as any)
}

onMounted(() => {
  if (!containerRef.value) return

  gantt.config.readonly      = false
  gantt.config.drag_links    = false
  gantt.config.drag_resize   = false
  gantt.config.show_progress = false
  gantt.config.date_format   = '%Y-%m-%d'
  gantt.config.scale_unit    = 'day'
  gantt.config.date_scale    = '%m/%d'
  gantt.config.subscales     = [{ unit: 'week', step: 1, date: '第%W周' }]
  gantt.config.scale_height  = 54
  gantt.config.row_height    = 42

  gantt.config.columns = [
    { name: 'text', label: '机台 / 计划', tree: false, width: 190 },
  ]

  // Hide progress drag handle via template override
  gantt.templates.progress_text = () => ''

  gantt.init(containerRef.value)
  loadData()

  // Block drag on RELEASED tasks
  addEvent(
    gantt.attachEvent('onBeforeDrag' as any, (id: string | number) => {
      const task = gantt.getTask(id)
      return (task as any).status !== 'RELEASED'
    }),
  )

  // Emit after a successful move drag
  addEvent(
    gantt.attachEvent('onAfterTaskDrag', (id: string | number, mode: string) => {
      if (mode !== 'move') return
      const task   = gantt.getTask(id)
      const fmt    = gantt.date.date_to_str('%Y-%m-%d')
      const newDate = fmt((task as any).start_date as Date)
      emit('update-schedule', {
        planId:       String(id),
        newMachineId: String((task as any).machine_id ?? ''),
        newDate,
      })
    }),
  )
})

watch(() => [props.plans, props.machines], loadData, { deep: true })

onBeforeUnmount(() => {
  eventIds.forEach((id) => gantt.detachEvent(id))
  // Restore plain tree mode so other GanttPanel instances are unaffected
  gantt.groupBy(false as any)
  gantt.clearAll()
})
</script>

<template>
  <el-card shadow="never">
    <template #header>
      <div class="flex items-center gap-3">
        <p class="text-base font-semibold text-slate-900">分切月度滚动计划（机台泳道视图）</p>
        <div class="flex items-center gap-2 text-xs text-[#86909C]">
          <span class="inline-block h-3 w-5 rounded-sm bg-[#86909C]" />草稿
          <span class="inline-block h-3 w-5 rounded-sm bg-[#00B42A]" />已下发（锁定）
          <span class="inline-block h-3 w-5 rounded-sm bg-[#165DFF]" />已完成
        </div>
      </div>
    </template>
    <p class="mb-2 text-xs text-[#86909C]">可拖拽 <strong>DRAFT</strong> 方块改变计划日期或所属机台；已下发计划锁定不可移动</p>
    <div
      ref="containerRef"
      class="w-full bg-white"
      style="height: 420px"
    />
  </el-card>
</template>
