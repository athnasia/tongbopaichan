<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useConfigStore } from '@/stores/useConfigStore'
import { generateFeatureCode } from '@/utils/featureCode'
import type { FeatureCodeVersion, Strength, Urgency } from '@/types/aps'

const configStore = useConfigStore()

const strengthKeys: Strength[] = ['高', '中', '普']
const urgencyKeys: Urgency[] = ['急1', '急2', '常规', '配']

// ─── 版本列表 ───────────────────────────────────────────────
const selectedVersionId = ref<string | null>(null)
const saving = ref(false)
const submitting = ref(false)
const enabling = ref(false)

const versions = computed(() => configStore.featureCodeVersions)

const selectedVersion = computed(() =>
  versions.value.find((v) => v.versionId === selectedVersionId.value) ?? null,
)

const isDraft = computed(() => selectedVersion.value?.status === 'DRAFT')

// ─── 编辑表单（右侧） ────────────────────────────────────────
const editForm = reactive({
  notes: '',
  totalLength: 9,
  thicknessLength: 3,
  widthLength: 4,
  strengthMap: { '高': 'A', '中': 'B', '普': 'C' } as Record<Strength, string>,
  urgencyMap: { '急1': '1', '急2': '2', '常规': '0', '配': '3' } as Record<Urgency, string>,
})

watch(selectedVersion, (v) => {
  if (!v) return
  editForm.notes = v.notes
  editForm.totalLength = v.totalLength
  editForm.thicknessLength = v.thicknessLength
  editForm.widthLength = v.widthLength
  Object.assign(editForm.strengthMap, v.strengthMap)
  Object.assign(editForm.urgencyMap, v.urgencyMap)
}, { immediate: true })

// ─── 段位验证 ──────────────────────────────────────────────
const segmentSum = computed(() => editForm.thicknessLength + editForm.widthLength + 1 + 1)
const lengthValid = computed(() => segmentSum.value <= editForm.totalLength)
const lengthError = computed(() =>
  lengthValid.value ? '' : `各段合计 ${segmentSum.value} 位，超出总长度 ${editForm.totalLength} 位`,
)

// ─── 实时预览（基于编辑区或选中版本） ──────────────────────
const previewThickness = ref(7)
const previewWidth = ref(900)
const previewStrength = ref<Strength>('普')
const previewUrgency = ref<Urgency>('常规')

const previewConfig = computed(() => ({
  strengthMap: { ...editForm.strengthMap },
  urgencyMap: { ...editForm.urgencyMap },
  thicknessLength: editForm.thicknessLength,
  widthLength: editForm.widthLength,
  totalLength: editForm.totalLength,
}))

const previewCode = computed(() =>
  generateFeatureCode(previewThickness.value, previewWidth.value, previewStrength.value, previewUrgency.value, previewConfig.value),
)

const previewSegments = computed(() => {
  const code = previewCode.value
  const tLen = editForm.thicknessLength
  const wLen = editForm.widthLength
  return [
    { label: `厚度(${tLen}位)`, value: code.slice(0, tLen), color: '#409EFF', bg: '#EFF7FF' },
    { label: `宽度(${wLen}位)`, value: code.slice(tLen, tLen + wLen), color: '#67C23A', bg: '#F0F9EB' },
    { label: '强度(1位)', value: code.slice(tLen + wLen, tLen + wLen + 1), color: '#E6A23C', bg: '#FDF6EC' },
    { label: '优先级(1位)', value: code.slice(tLen + wLen + 1), color: '#F56C6C', bg: '#FEF0F0' },
  ]
})

// ─── 初始化 ────────────────────────────────────────────────
onMounted(async () => {
  await configStore.init()
  const active = versions.value.find((v) => v.enabled)
  if (active) selectedVersionId.value = active.versionId
})

// ─── 操作 ─────────────────────────────────────────────────
async function handleNewVersion() {
  const v = await configStore.createVersion()
  selectedVersionId.value = v.versionId
  ElMessage.success(`已新增草稿版本 ${v.versionId}`)
}

async function handleSaveDraft() {
  if (!selectedVersion.value || !isDraft.value) return
  if (!lengthValid.value) { ElMessage.error(lengthError.value); return }
  saving.value = true
  try {
    await configStore.updateVersion(selectedVersion.value.versionId, {
      notes: editForm.notes,
      totalLength: editForm.totalLength,
      thicknessLength: editForm.thicknessLength,
      widthLength: editForm.widthLength,
      strengthMap: { ...editForm.strengthMap } as Record<Strength, string>,
      urgencyMap: { ...editForm.urgencyMap } as Record<Urgency, string>,
    })
    ElMessage.success('草稿已保存')
  } finally {
    saving.value = false
  }
}

async function handleSubmit() {
  if (!selectedVersion.value || !isDraft.value) return
  if (!lengthValid.value) { ElMessage.error(lengthError.value); return }
  await handleSaveDraft()
  submitting.value = true
  try {
    await configStore.submitVersion(selectedVersion.value.versionId)
    ElMessage.success('版本已提交，不可再修改')
  } finally {
    submitting.value = false
  }
}

async function handleEnable() {
  if (!selectedVersion.value || selectedVersion.value.status !== 'SUBMITTED') return
  await ElMessageBox.confirm(
    `启用版本 ${selectedVersion.value.versionId} 后，所有新转换订单将使用此规则。确认？`,
    '启用确认',
    { type: 'warning' },
  )
  enabling.value = true
  try {
    await configStore.enableVersion(selectedVersion.value.versionId)
    ElMessage.success(`版本 ${selectedVersion.value.versionId} 已启用`)
  } finally {
    enabling.value = false
  }
}

function formatDate(iso: string) {
  return iso ? new Date(iso).toLocaleDateString('zh-CN') : '—'
}
</script>

<template>
  <div class="flex flex-col gap-4 h-full">
    <!-- 顶部：结构说明 + 实时预览 -->
    <div class="grid grid-cols-2 gap-4">
      <el-card shadow="never">
        <template #header><span class="text-sm font-medium">特征值结构说明</span></template>
        <div class="text-xs text-[#86909C] mb-3">
          特征值为 <strong>{{ editForm.totalLength }}</strong> 位字符串（当前选中版本），各段含义：
        </div>
        <div class="flex items-center gap-0 font-mono text-base font-bold mb-3">
          <span
            v-for="seg in previewSegments"
            :key="seg.label"
            class="px-3 py-1"
            :class="{ 'rounded-l': seg === previewSegments[0], 'rounded-r': seg === previewSegments[previewSegments.length - 1] }"
            :style="{ background: seg.bg, color: seg.color }"
          >{{ 'X'.repeat(seg.value.length || 1) }}</span>
        </div>
        <div class="space-y-1 text-xs">
          <div v-for="seg in previewSegments" :key="seg.label" :style="{ color: seg.color }">
            ■ {{ seg.label }}：
            <template v-if="seg.label.startsWith('厚度')">μm × 10，零补齐至 {{ editForm.thicknessLength }} 位。如 7μm → {{ (70).toString().padStart(editForm.thicknessLength, '0') }}</template>
            <template v-else-if="seg.label.startsWith('宽度')">mm 取整，零补齐至 {{ editForm.widthLength }} 位。如 900mm → {{ (900).toString().padStart(editForm.widthLength, '0') }}</template>
            <template v-else-if="seg.label.startsWith('强度')">见强度映射表</template>
            <template v-else>见优先级映射表</template>
          </div>
        </div>
      </el-card>

      <el-card shadow="never">
        <template #header><span class="text-sm font-medium">实时预览</span></template>
        <div class="flex flex-wrap items-end gap-3 mb-4">
          <el-form-item label="厚度(μm)" class="!mb-0">
            <el-input-number v-model="previewThickness" :min="0.1" :step="0.5" :precision="1" style="width:110px" size="small" />
          </el-form-item>
          <el-form-item label="宽度(mm)" class="!mb-0">
            <el-input-number v-model="previewWidth" :min="1" :step="10" style="width:110px" size="small" />
          </el-form-item>
          <el-form-item label="强度" class="!mb-0">
            <el-select v-model="previewStrength" style="width:80px" size="small">
              <el-option v-for="s in strengthKeys" :key="s" :label="s" :value="s" />
            </el-select>
          </el-form-item>
          <el-form-item label="优先级" class="!mb-0">
            <el-select v-model="previewUrgency" style="width:80px" size="small">
              <el-option v-for="u in urgencyKeys" :key="u" :label="u" :value="u" />
            </el-select>
          </el-form-item>
        </div>
        <div class="flex items-end gap-0 font-mono text-xl font-bold mb-2">
          <div
            v-for="seg in previewSegments"
            :key="seg.label"
            class="flex flex-col items-center px-3 py-1"
            :style="{ color: seg.color, background: seg.bg }"
            :class="{ 'rounded-l': seg === previewSegments[0], 'rounded-r': seg === previewSegments[previewSegments.length - 1] }"
          >
            <span>{{ seg.value }}</span>
            <span class="text-xs font-normal text-[#86909C] mt-0.5">{{ seg.label }}</span>
          </div>
        </div>
        <div class="text-[#86909C] text-xs">完整特征值：<span class="font-mono font-bold text-[#1D2129]">{{ previewCode }}</span></div>
      </el-card>
    </div>

    <!-- 底部：版本列表 + 版本详情 -->
    <div class="flex gap-4 flex-1 min-h-0">
      <!-- 左：版本列表 -->
      <el-card shadow="never" class="w-96 flex-shrink-0 flex flex-col">
        <template #header>
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">特征值版本</span>
            <el-button type="primary" size="small" @click="handleNewVersion">新增版本</el-button>
          </div>
        </template>
        <el-table
          :data="versions"
          size="small"
          :highlight-current-row="true"
          @row-click="(row: FeatureCodeVersion) => selectedVersionId = row.versionId"
          style="cursor:pointer"
        >
          <el-table-column prop="versionId" label="版本ID" width="90" />
          <el-table-column label="启用" width="56" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.enabled" type="success" size="small">启用</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="60" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 'DRAFT' ? 'warning' : 'info'" size="small">
                {{ row.status === 'DRAFT' ? '草稿' : '提交' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="notes" label="备注" show-overflow-tooltip />
          <el-table-column prop="createdBy" label="创建人" width="70" />
          <el-table-column label="创建时间" width="90">
            <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 右：版本详情/编辑 -->
      <el-card shadow="never" class="flex-1 overflow-auto">
        <template #header>
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">
              <template v-if="selectedVersion">
                {{ selectedVersion.versionId }}
                <el-tag v-if="selectedVersion.enabled" type="success" size="small" class="ml-2">当前启用</el-tag>
                <el-tag :type="isDraft ? 'warning' : 'info'" size="small" class="ml-1">
                  {{ isDraft ? '草稿' : '已提交' }}
                </el-tag>
              </template>
              <template v-else>版本详情</template>
            </span>
            <div class="flex gap-2">
              <template v-if="isDraft">
                <el-button size="small" :loading="saving" @click="handleSaveDraft">保存草稿</el-button>
                <el-button type="primary" size="small" :loading="submitting" @click="handleSubmit">提交版本</el-button>
              </template>
              <el-button
                v-if="selectedVersion?.status === 'SUBMITTED' && !selectedVersion.enabled"
                type="success"
                size="small"
                :loading="enabling"
                @click="handleEnable"
              >启用此版本</el-button>
            </div>
          </div>
        </template>

        <el-empty v-if="!selectedVersion" description="请在左侧选择版本" />

        <template v-else>
          <!-- 基本信息 -->
          <div class="grid grid-cols-3 gap-4 mb-4 text-sm text-[#4E5969]">
            <div><span class="text-[#86909C]">创建人：</span>{{ selectedVersion.createdBy }}</div>
            <div><span class="text-[#86909C]">创建时间：</span>{{ formatDate(selectedVersion.createdAt) }}</div>
          </div>

          <el-form label-position="top" size="small">
            <!-- 备注 -->
            <el-form-item label="备注">
              <el-input
                v-model="editForm.notes"
                :disabled="!isDraft"
                placeholder="版本说明（可选）"
                style="max-width:400px"
              />
            </el-form-item>

            <!-- 段位配置 -->
            <div class="text-xs font-medium text-[#1D2129] mb-2 mt-1">段位配置</div>
            <div class="flex items-start gap-6 mb-1">
              <el-form-item label="特征值总长度">
                <el-input-number v-model="editForm.totalLength" :min="2" :max="32" :disabled="!isDraft" style="width:110px" />
              </el-form-item>
              <el-form-item label="厚度段位数">
                <el-input-number v-model="editForm.thicknessLength" :min="1" :max="10" :disabled="!isDraft" style="width:110px" />
              </el-form-item>
              <el-form-item label="宽度段位数">
                <el-input-number v-model="editForm.widthLength" :min="1" :max="10" :disabled="!isDraft" style="width:110px" />
              </el-form-item>
              <el-form-item label="强度段位数">
                <el-input-number :model-value="1" :min="1" :max="1" disabled style="width:90px" />
              </el-form-item>
              <el-form-item label="优先级段位数">
                <el-input-number :model-value="1" :min="1" :max="1" disabled style="width:90px" />
              </el-form-item>
            </div>
            <div class="text-xs mb-4" :class="lengthValid ? 'text-[#86909C]' : 'text-[#F56C6C]'">
              各段合计：{{ editForm.thicknessLength }} + {{ editForm.widthLength }} + 1 + 1 = {{ segmentSum }} 位
              <template v-if="!lengthValid">（超出总长度 {{ editForm.totalLength }} 位，请调整）</template>
            </div>

            <!-- 映射表 -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <div class="text-xs font-medium text-[#1D2129] mb-2">强度映射（每项限 1 个字符）</div>
                <el-table :data="strengthKeys.map(k => ({ key: k }))" border size="small">
                  <el-table-column label="强度值" prop="key" width="80" />
                  <el-table-column label="编码字符">
                    <template #default="{ row }">
                      <el-input
                        v-model="editForm.strengthMap[row.key as Strength]"
                        :maxlength="1"
                        :disabled="!isDraft"
                        style="width:80px"
                        size="small"
                      />
                    </template>
                  </el-table-column>
                </el-table>
              </div>
              <div>
                <div class="text-xs font-medium text-[#1D2129] mb-2">优先级映射（每项限 1 个字符）</div>
                <el-table :data="urgencyKeys.map(k => ({ key: k }))" border size="small">
                  <el-table-column label="优先级值" prop="key" width="80" />
                  <el-table-column label="编码字符">
                    <template #default="{ row }">
                      <el-input
                        v-model="editForm.urgencyMap[row.key as Urgency]"
                        :maxlength="1"
                        :disabled="!isDraft"
                        style="width:80px"
                        size="small"
                      />
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </div>
          </el-form>
        </template>
      </el-card>
    </div>
  </div>
</template>
