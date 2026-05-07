import { createRouter, createWebHistory } from 'vue-router'
import AppShell from '@/layouts/AppShell.vue'

const router = createRouter({

  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: AppShell,
      redirect: '/dashboard',
      children: [
        { path: 'dashboard', component: () => import('@/views/DashboardView.vue'), meta: { title: '全流程看板' } },
        { path: 'orders/erp', component: () => import('@/views/ErpOrdersView.vue'), meta: { title: 'ERP接口' } },
        { path: 'orders/review', component: () => import('@/views/ProductionReviewView.vue'), meta: { title: '转生产订单' } },
        { path: 'orders/aggregate', component: () => import('@/views/DemandAggregateView.vue'), meta: { title: '生产订单聚合' } },
        { path: 'matching', component: () => import('@/views/MatchingView.vue'), meta: { title: '选配盘' } },
        { path: 'matching-new', component: () => import('@/views/SlittingManualView.vue'), meta: { title: '选配盘-新' } },
        { path: 'raw-foil/plan', component: () => import('@/views/RawFoilPlanView.vue'), meta: { title: '生箔计划' } },
        { path: 'raw-foil/records', component: () => import('@/views/RawFoilRecordsView.vue'), meta: { title: '生箔生产记录' } },
        { path: 'baking/plan', component: () => import('@/views/BakingPlanView.vue'), meta: { title: '烘烤计划' } },
        { path: 'baking/records', component: () => import('@/views/BakingRecordsView.vue'), meta: { title: '烘烤生产记录' } },
        { path: 'inventory/raw-foil', component: () => import('@/views/InventoryRawFoilView.vue'), meta: { title: '生箔库' } },
        { path: 'inventory/treated', component: () => import('@/views/InventoryTreatedView.vue'), meta: { title: '熟箔库' } },
        { path: 'inventory/finished', component: () => import('@/views/InventoryFinishedView.vue'), meta: { title: '成品库' } },
        { path: 'slitting/plan', component: () => import('@/views/SlittingPlanView.vue'), meta: { title: '分切计划' } },
        { path: 'slitting/orders', component: () => import('@/views/SlittingOrdersView.vue'), meta: { title: '分切指令单' } },
        { path: 'slitting/execution', component: () => import('@/views/SlittingExecutionView.vue'), meta: { title: '分切执行记录' } },
        { path: 'scrap', component: () => import('@/views/ScrapView.vue'), meta: { title: '废料库' } },
        { path: 'config/rules', component: () => import('@/views/ConfigRulesView.vue'), meta: { title: '排产规则配置' } },
        { path: 'config/machines', component: () => import('@/views/ConfigMachinesView.vue'), meta: { title: '机台配置' } },
        { path: 'config/feature-code', component: () => import('@/views/ConfigFeatureCodeView.vue'), meta: { title: '特征值规则' } },
        { path: 'reports/order-progress', component: () => import('@/views/ReportOrderProgressView.vue'), meta: { title: '订单执行进度' } },
        { path: 'reports/production-progress', component: () => import('@/views/ReportProductionProgressView.vue'), meta: { title: '生产执行进度' } },
        { path: 'reports/shipment-progress', component: () => import('@/views/ReportShipmentProgressView.vue'), meta: { title: '发运执行进度' } },
      ],
    },
  ],
})

export default router
