<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    label: string
    value: string
    helper: string
    tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  }>(),
  {
    tone: 'primary',
  },
)

const toneClass = computed(() => {
  const classMap = {
    primary: 'border-sky-200 bg-sky-50',
    success: 'border-emerald-200 bg-emerald-50',
    warning: 'border-amber-200 bg-amber-50',
    danger: 'border-rose-200 bg-rose-50',
    info: 'border-purple-200 bg-purple-50',
  }

  return classMap[props.tone]
})
</script>

<template>
  <div :class="['rounded-2xl border p-5 shadow-sm', toneClass]">
    <p class="text-sm text-slate-500">{{ label }}</p>
    <p class="mt-2 text-2xl font-semibold text-slate-900">{{ value }}</p>
    <p class="mt-2 text-xs leading-5 text-slate-500">{{ helper }}</p>
  </div>
</template>
