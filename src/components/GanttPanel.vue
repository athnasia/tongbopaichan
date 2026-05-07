<script setup lang="ts">
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css'
import { gantt } from 'dhtmlx-gantt'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { GanttTask } from '@/types/demo'

const props = defineProps<{
  title: string
  subtitle?: string
  tasks: GanttTask[]
}>()

const ganttRef = { value: null as HTMLDivElement | null }
const selectedTask = ref<GanttTask | null>(null)
const showDetail = ref(false)
let clickEventId: string | undefined

function loadData() {
  gantt.clearAll()
  gantt.parse({ data: props.tasks.map((t) => ({ ...t })), links: [] })
}

onMounted(() => {
  if (!ganttRef.value) return
  gantt.config.readonly = true
  gantt.config.date_format = '%Y-%m-%d'
  gantt.config.scale_height = 54
  gantt.config.row_height = 38
  gantt.config.columns = [
    { name: 'text', label: '任务 / 机台', tree: true, width: 240 },
    { name: 'start_date', label: '开始日期', align: 'center', width: 110 },
    { name: 'duration', label: '工期(天)', align: 'center', width: 90 },
  ]
  gantt.init(ganttRef.value)
  loadData()
  clickEventId = gantt.attachEvent('onTaskClick', (id: string) => {
    const task = props.tasks.find((t) => t.id === id)
    if (task) { selectedTask.value = task; showDetail.value = true }
    return true
  })
})

watch(() => props.tasks, loadData)

onBeforeUnmount(() => {
  if (clickEventId) gantt.detachEvent(clickEventId)
  gantt.clearAll()
})
</script>

<template>
  <el-card shadow="never">
    <template #header>
      <div>
        <p class="text-base font-semibold text-slate-900">{{ title }}</p>
        <p v-if="subtitle" class="mt-1 text-sm text-slate-500">{{ subtitle }}</p>
      </div>
    </template>
    <p class="mb-2 text-xs text-[#86909C]">点击任务条 / 行查看详情</p>
    <div class="gantt-shell">
      <div :ref="(el) => { ganttRef.value = el as HTMLDivElement }" class="h-[360px] w-full bg-white" />
    </div>
  </el-card>

  <el-dialog v-model="showDetail" title="任务详情" width="400px" destroy-on-close>
    <el-descriptions v-if="selectedTask" :column="1" border size="small">
      <el-descriptions-item label="任务 ID">{{ selectedTask.id }}</el-descriptions-item>
      <el-descriptions-item label="任务名称">{{ selectedTask.text }}</el-descriptions-item>
      <el-descriptions-item label="开始日期">{{ selectedTask.start_date }}</el-descriptions-item>
      <el-descriptions-item label="工期 (天)">{{ selectedTask.duration }}</el-descriptions-item>
      <el-descriptions-item label="完成进度">{{ Math.round(selectedTask.progress * 100) }}%</el-descriptions-item>
      <el-descriptions-item v-if="selectedTask.parent" label="所属机台">{{ selectedTask.parent }}</el-descriptions-item>
    </el-descriptions>
  </el-dialog>
</template>
