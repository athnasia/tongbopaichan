<script setup lang="ts">
defineProps<{ value: string | number }>()
</script>

<template>
  <span style="font-family:Consolas,monospace">{{ value }}</span>
</template>
