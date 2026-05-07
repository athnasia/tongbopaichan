<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { useConfigStore } from '@/stores/useConfigStore'
import { onMounted } from 'vue'
import type { SchedulingRuleConfig } from '@/types/aps'

const configStore = useConfigStore()
const submitting = ref(false)

const form = reactive({
  minTrimMargin: 8,
  maxWasteTolerance: 100,
  minRawFoilBatchKg: 1200,
  crossPeriodWarningDays: 5,
  narrowRollReturnThresholdMm: 130,
})

onMounted(async () => {
  await configStore.init()
  const r = configStore.ruleConfig
  if (r) {
    form.minTrimMargin = r.minTrimMargin
    form.maxWasteTolerance = r.maxWasteTolerance
    form.minRawFoilBatchKg = r.minRawFoilBatchKg
    form.crossPeriodWarningDays = r.crossPeriodWarningDays
    form.narrowRollReturnThresholdMm = r.narrowRollReturnThresholdMm
  }
})

async function handleSave() {
  submitting.value = true
  try {
    await configStore.updateRule(form as SchedulingRuleConfig)
    ElMessage.success('排产规则已保存')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="space-y-6 max-w-xl">
    <el-card shadow="never">
      <template #header><span class="text-sm font-medium">全局排产规则配置</span></template>
      <el-form :model="form" label-width="180px" label-position="left">
        <el-form-item label="最小修边余量 (mm)" :rules="[{ type: 'number', min: 1 }]">
          <el-input-number v-model="form.minTrimMargin" :min="1" :max="50" style="width:200px" />
        </el-form-item>
        <el-form-item label="最大废边容忍 (mm)">
          <el-input-number v-model="form.maxWasteTolerance" :min="0" :max="500" style="width:200px" />
        </el-form-item>
        <el-form-item label="生箔最小起订量 (kg)">
          <el-input-number v-model="form.minRawFoilBatchKg" :min="100" :step="100" style="width:200px" />
        </el-form-item>
        <el-form-item label="跨期预警天数">
          <el-input-number v-model="form.crossPeriodWarningDays" :min="1" :max="60" style="width:200px" />
        </el-form-item>
        <el-form-item label="窄卷回库阈值 (mm)">
          <el-input-number v-model="form.narrowRollReturnThresholdMm" :min="50" :max="500" style="width:200px" />
          <div class="ml-2 text-xs text-[#86909C]">余宽 ≥ 此值 → 窄卷回库 (SLIT_RETURN)</div>
        </el-form-item>
      </el-form>
      <div class="mt-4 flex justify-end">
        <el-button type="primary" :loading="submitting" @click="handleSave">保存规则</el-button>
      </div>
    </el-card>
  </div>
</template>
