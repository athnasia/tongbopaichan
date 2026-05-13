<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { navigationItems } from '@/config/navigation'

const route = useRoute()
const baseDataItems = computed(
  () => navigationItems.find((item) => item.path === '/base-data')?.children ?? [],
)
</script>

<template>
  <div class="space-y-4">
    <!-- 子模块 Tab 导航 -->
    <div class="flex items-center gap-2 border-b border-[#E5E6EB] bg-white px-4">
      <RouterLink
        v-for="item in baseDataItems"
        :key="item.path"
        :to="item.path"
        class="relative flex items-center gap-1.5 px-4 py-3 text-sm transition-colors"
        :class="
          route.path === item.path
            ? 'font-medium text-[#165DFF] after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-[#165DFF] after:content-[\'\']'
            : 'text-[#86909C] hover:text-[#1D2129]'
        "
      >
        {{ item.title }}
      </RouterLink>
    </div>

    <RouterView />
  </div>
</template>
