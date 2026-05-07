<script setup lang="ts">
import * as echarts from 'echarts'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    option: echarts.EChartsOption
    height?: number
  }>(),
  {
    subtitle: '',
    height: 320,
  },
)

const chartRef = ref<HTMLDivElement>()
let chart: echarts.ECharts | undefined

function renderChart() {
  if (!chartRef.value) {
    return
  }

  chart ??= echarts.init(chartRef.value)
  chart.setOption(props.option, true)
}

function resizeChart() {
  chart?.resize()
}

onMounted(() => {
  renderChart()
  window.addEventListener('resize', resizeChart)
})

watch(
  () => props.option,
  () => {
    renderChart()
  },
  { deep: true },
)

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeChart)
  chart?.dispose()
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
    <div ref="chartRef" :style="{ height: `${height}px` }" />
  </el-card>
</template>
