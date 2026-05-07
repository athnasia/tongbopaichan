<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { flatNavigationItems, navigationItems } from '@/config/navigation'
import { useApsStore } from '@/stores/aps'
import { configApi } from '@/api/config'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const apsStore = useApsStore()

const currentNav = computed(() => flatNavigationItems.find((i) => '/' + route.path.split('/').slice(1).join('/') === i.path || route.path === i.path) ?? flatNavigationItems[0])
const parentNav = computed(() => {
  for (const item of navigationItems) {
    if (item.children?.some((c) => c.path === route.path || route.path.startsWith(c.path))) return item
  }
  return null
})

const sidebarMetrics = computed(() => {
  const shortageKg = apsStore.demandShortages.reduce((s, i) => s + i.shortageKg, 0)
  // return [
  //   { label: '订单池', value: `${apsStore.rawOrders.length}` },
  //   { label: '库存卷', value: `${apsStore.treatedFoilInventory.filter(i => i.status === 'AVAILABLE').length}` },
  //   { label: '分切计划', value: `${apsStore.slittingPlans.length}` },
  //   { label: '缺口', value: shortageKg > 0 ? `${shortageKg.toLocaleString()} kg` : '—', warn: shortageKg > 0 },
  // ]
})

async function handleReset() {
  try {
    await configApi.resetDemo()
    await apsStore.init()
    ElMessage.success('场景已重置')
    router.push('/dashboard')
  } catch {
    ElMessage.error('重置失败')
  }
}

onMounted(async () => {
  await apsStore.init()
})
</script>

<template>
  <div class="flex min-h-screen bg-[#F2F3F5]">
    <aside class="hidden w-[220px] shrink-0 flex-col bg-[#001529] text-white lg:flex">
      <button class="flex cursor-pointer items-center gap-3 border-b border-white/10 px-5 py-4 text-left hover:bg-white/5" @click="router.push('/dashboard')">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-[#165DFF]">
          <span class="text-xs font-bold text-white">APS</span>
        </div>
        <div>
          <p class="text-[10px] text-white/40 uppercase tracking-widest">Smart Factory</p>
          <p class="text-sm font-semibold text-white leading-tight">铜箔排产系统</p>
        </div>
      </button>

      <!-- <div class="grid grid-cols-2 border-b border-white/10 text-xs">
        <div v-for="m in sidebarMetrics" :key="m.label" class="border-r border-b border-white/[0.07] px-4 py-3 last:border-r-0 [&:nth-child(3)]:border-b-0 [&:nth-child(4)]:border-b-0">
          <p class="text-white/35">{{ m.label }}</p>
          <p class="mt-0.5 text-sm font-semibold" :class="(m as any).warn ? 'text-[#FF7D00]' : 'text-white'">{{ m.value }}</p>
        </div>
      </div> -->

      <nav class="flex-1 overflow-y-auto px-2 py-2">
        <el-menu :default-active="route.path" router class="aps-side-menu" background-color="transparent" text-color="rgba(255,255,255,0.6)" active-text-color="#ffffff">
          <template v-for="item in navigationItems" :key="item.path">
            <el-sub-menu v-if="item.children?.length" :index="item.path">
              <template #title><span class="text-sm font-medium">{{ item.title }}</span></template>
              <el-menu-item v-for="child in item.children" :key="child.path" :index="child.path">
                <span class="text-sm">{{ child.title }}</span>
              </el-menu-item>
            </el-sub-menu>
            <el-menu-item v-else :index="item.path">
              <span class="text-sm">{{ item.title }}</span>
            </el-menu-item>
          </template>
        </el-menu>
      </nav>

      <div class="border-t border-white/10 px-4 py-3">
        <div class="flex items-center gap-2 text-xs">
          <span class="h-1.5 w-1.5 rounded-full bg-[#00B42A]" />
          <span class="text-white/40">Mock API 已就绪</span>
          <span class="ml-auto text-white/20">DEMO</span>
        </div>
      </div>
    </aside>

    <div class="flex min-h-screen min-w-0 flex-1 flex-col">
      <header class="border-b border-[#E5E6EB] bg-white px-6 py-0">
        <div class="flex h-14 items-center justify-between">
          <div class="flex items-center gap-2 text-sm">
            <template v-if="parentNav">
              <span class="text-[#86909C]">{{ parentNav.title }}</span>
              <span class="text-[#C9CDD4]">/</span>
            </template>
            <span class="font-medium text-[#1D2129]">{{ currentNav.title }}</span>
          </div>
          <el-button type="primary" plain size="small" @click="handleReset">重置场景</el-button>
        </div>
      </header>
      <main class="flex-1 overflow-y-auto p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>
