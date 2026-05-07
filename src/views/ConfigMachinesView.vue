<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useConfigStore } from '@/stores/useConfigStore'
import { usePagination } from '@/composables/usePagination'
import type { MachineCapability, Strength } from '@/types/aps'

const configStore = useConfigStore()
const showDialog = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const copySourceId = ref('')
const showImportDialog = ref(false)
const importFileName = ref('')

// ── Tree ─────────────────────────────────────────────────────
type NodeType = 'root' | 'factory' | 'system' | 'machine'
interface TreeNode {
  id: string
  label: string
  nodeType: NodeType
  factory?: string
  system?: string
  machineId?: string
  children?: TreeNode[]
}

const selectedNode = ref<{ type: NodeType; factory?: string; system?: string; machineId?: string }>({ type: 'root' })

const treeData = computed<TreeNode[]>(() => {
  const fMap = new Map<string, Map<string, MachineCapability[]>>()
  for (const m of configStore.machineList) {
    const f = m.factory ?? '默认厂'
    const s = m.system ?? '未分类'
    if (!fMap.has(f)) fMap.set(f, new Map())
    const sMap = fMap.get(f)!
    if (!sMap.has(s)) sMap.set(s, [])
    sMap.get(s)!.push(m)
  }
  return [...fMap.entries()].map(([factory, sMap]) => ({
    id: `f:${factory}`,
    label: factory,
    nodeType: 'factory' as const,
    factory,
    children: [...sMap.entries()].map(([system, machines]) => ({
      id: `s:${factory}:${system}`,
      label: system,
      nodeType: 'system' as const,
      factory,
      system,
      children: machines.map((m) => ({
        id: `m:${m.machineId}`,
        label: m.machineId,
        nodeType: 'machine' as const,
        factory,
        system,
        machineId: m.machineId,
      })),
    })),
  }))
})

const defaultExpandedKeys = computed(() => treeData.value.map((n) => n.id))

function handleNodeClick(node: TreeNode) {
  machinePage.value = 1
  const { nodeType, factory, system, machineId } = node
  selectedNode.value = { type: nodeType, factory, system, machineId }
}

const selectedLabel = computed(() => {
  const n = selectedNode.value
  if (n.type === 'root') return '全部机台'
  if (n.type === 'factory') return n.factory!
  if (n.type === 'system') return `${n.factory} / ${n.system}`
  return n.machineId!
})

// ── Filter + Pagination ──────────────────────────────────────
const filteredMachines = computed(() => {
  const { type, factory, system, machineId } = selectedNode.value
  if (type === 'root') return configStore.machineList
  if (type === 'factory') return configStore.machineList.filter((m) => (m.factory ?? '默认厂') === factory)
  if (type === 'system') return configStore.machineList.filter((m) => (m.factory ?? '默认厂') === factory && (m.system ?? '未分类') === system)
  return configStore.machineList.filter((m) => m.machineId === machineId)
})

const { page: machinePage, paged: machinePaged, total: machineTotal } = usePagination(() => filteredMachines.value)

// ── Form ─────────────────────────────────────────────────────
const allThicknesses = [6, 8, 10, 12, 15, 18]
const allStrengths: Strength[] = ['高', '中', '普']
const allSystems = ['生箔', '烘烤', '分切']

const defaultForm = (): MachineCapability => ({
  machineId: '',
  factory: selectedNode.value.factory ?? 'A厂',
  system: selectedNode.value.system ?? '生箔',
  supportedThicknesses: [],
  capableStrengths: [],
  maxWidth: 1380,
  minWidth: 300,
  standardRollLength: 6000,
})
const form = reactive<MachineCapability>(defaultForm())

onMounted(() => configStore.init())

function openAdd() {
  Object.assign(form, defaultForm())
  copySourceId.value = ''
  isEdit.value = false
  showDialog.value = true
}

function handleCopySource(machineId: string) {
  const src = configStore.machineList.find((m) => m.machineId === machineId)
  if (!src) return
  Object.assign(form, {
    ...src,
    machineId: '',
    supportedThicknesses: [...src.supportedThicknesses],
    capableStrengths: [...src.capableStrengths],
  })
}

function openEdit(m: MachineCapability) {
  Object.assign(form, { ...m, supportedThicknesses: [...m.supportedThicknesses], capableStrengths: [...m.capableStrengths] })
  isEdit.value = true
  showDialog.value = true
}

async function handleDelete(machineId: string) {
  await configStore.deleteMachine(machineId)
  ElMessage.success('机台已删除')
}

async function handleSave() {
  if (!form.machineId) { ElMessage.warning('请填写机台编号'); return }
  submitting.value = true
  try {
    if (isEdit.value) await configStore.editMachine({ ...form })
    else await configStore.addMachine({ ...form })
    ElMessage.success(isEdit.value ? '机台已更新' : '机台已添加')
    showDialog.value = false
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="flex gap-4">
    <!-- Left: structure tree -->
    <el-card shadow="never" class="w-52 shrink-0 self-start">
      <template #header><span class="text-sm font-medium">机台结构</span></template>
      <el-tree
        :data="treeData"
        :default-expanded-keys="defaultExpandedKeys"
        node-key="id"
        :props="{ label: 'label', children: 'children' }"
        highlight-current
        @node-click="handleNodeClick"
      >
        <template #default="{ data }">
          <span
            :class="{
              'font-semibold text-[#1D2129]': data.nodeType === 'factory',
              'font-medium text-[#4E5969]': data.nodeType === 'system',
              'text-[#86909C]': data.nodeType === 'machine',
            }"
            class="text-sm"
          >{{ data.label }}</span>
        </template>
      </el-tree>
    </el-card>

    <!-- Right: table + actions -->
    <div class="flex-1 min-w-0 space-y-3">
      <div class="flex items-center justify-between">
        <span class="text-sm text-[#86909C]">{{ selectedLabel }} — 共 {{ filteredMachines.length }} 台</span>
        <div class="flex gap-2">
          <el-button size="small" @click="showImportDialog = true">Excel 导入</el-button>
          <el-button type="primary" size="small" @click="openAdd">新增机台</el-button>
        </div>
      </div>
      <el-card shadow="never">
        <el-table :data="machinePaged" border stripe size="default">
          <el-table-column prop="factory" label="厂区" min-width="80" />
          <el-table-column prop="system" label="所属工序" min-width="80" />
          <el-table-column prop="machineId" label="系统编号" min-width="110" />
          <el-table-column label="支持厚度 (μm)" min-width="180">
            <template #default="{ row }">
              <div class="flex flex-wrap gap-1">
                <el-tag v-for="t in row.supportedThicknesses" :key="t" effect="plain" type="info" size="small">{{ t }}</el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="支持强度" min-width="130">
            <template #default="{ row }">
              <div class="flex flex-wrap gap-1">
                <el-tag v-for="s in row.capableStrengths" :key="s" effect="light" type="primary" size="small">{{ s }}</el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="幅宽 (mm)" min-width="100" align="right">
            <template #default="{ row }"><span style="font-family:Consolas,monospace">{{ row.maxWidth }}</span></template>
          </el-table-column>
          <el-table-column label="标准米数 (m)" min-width="110" align="right">
            <template #default="{ row }"><span style="font-family:Consolas,monospace">{{ row.standardRollLength }}</span></template>
          </el-table-column>
          <el-table-column label="操作" fixed="right" min-width="120">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="openEdit(row)">编辑</el-button>
              <el-popconfirm title="确认删除该机台？" @confirm="handleDelete(row.machineId)">
                <template #reference><el-button type="danger" link size="small">删除</el-button></template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>
        <div class="flex justify-end mt-3">
          <el-pagination v-model:current-page="machinePage" :page-size="10" :total="machineTotal" layout="total, prev, pager, next" small />
        </div>
      </el-card>
    </div>
  </div>

  <el-dialog v-model="showDialog" :title="isEdit ? '编辑机台' : '新增机台'" width="520px">
    <el-form :model="form" label-width="110px">
      <el-form-item v-if="!isEdit" label="复制自">
        <el-select
          v-model="copySourceId"
          clearable
          placeholder="可选 — 从已有机台复制参数"
          style="width:100%"
          @change="handleCopySource"
        >
          <el-option
            v-for="m in configStore.machineList"
            :key="m.machineId"
            :label="`${m.machineId}（${m.factory} / ${m.system}）`"
            :value="m.machineId"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="厂区">
        <el-input v-model="form.factory" placeholder="如 A厂、B厂" />
      </el-form-item>
      <el-form-item label="所属工序">
        <el-select v-model="form.system" style="width:100%">
          <el-option v-for="s in allSystems" :key="s" :label="s" :value="s" />
        </el-select>
      </el-form-item>
      <el-form-item label="系统编号">
        <el-input v-model="form.machineId" :disabled="isEdit" />
      </el-form-item>
      <el-form-item label="标准幅宽 (mm)"><el-input-number v-model="form.maxWidth" :min="100" :max="2000" style="width:100%" /></el-form-item>
      <el-form-item label="最小幅宽 (mm)"><el-input-number v-model="form.minWidth" :min="50" :max="1000" style="width:100%" /></el-form-item>
      <el-form-item label="标准米数 (m)"><el-input-number v-model="form.standardRollLength" :min="1000" :step="500" style="width:100%" /></el-form-item>
      <el-form-item label="支持厚度">
        <el-checkbox-group v-model="form.supportedThicknesses">
          <el-checkbox v-for="t in allThicknesses" :key="t" :value="t">{{ t }}</el-checkbox>
        </el-checkbox-group>
      </el-form-item>
      <el-form-item label="支持强度">
        <el-checkbox-group v-model="form.capableStrengths">
          <el-checkbox v-for="s in allStrengths" :key="s" :value="s">{{ s }}</el-checkbox>
        </el-checkbox-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="showDialog = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="showImportDialog" title="Excel 导入机台" width="480px" @close="importFileName = ''">
    <div class="space-y-3">
      <el-upload
        drag
        accept=".xlsx,.xls"
        :auto-upload="false"
        :limit="1"
        :show-file-list="false"
        :on-change="(file: any) => { importFileName = file.name }"
      >
        <div class="py-6 text-center">
          <p class="text-[#1D2129] font-medium">拖拽文件到此处，或点击选择</p>
          <p class="text-xs text-[#86909C] mt-1">仅支持 .xlsx / .xls 格式</p>
        </div>
      </el-upload>
      <div v-if="importFileName" class="text-sm text-[#00B42A] px-1">已选择：{{ importFileName }}</div>
      <el-alert type="info" :closable="false" title="导入功能开发中，当前仅支持文件选择预览" />
    </div>
    <template #footer>
      <el-button @click="showImportDialog = false">关闭</el-button>
      <el-button type="primary" disabled>导入（开发中）</el-button>
    </template>
  </el-dialog>
</template>
