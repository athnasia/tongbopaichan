export interface NavigationItem {
  path: string
  title: string
  children?: NavigationItem[]
}

export const navigationItems: NavigationItem[] = [
  { path: '/dashboard', title: '全流程看板' },
  {
    path: '/orders',
    title: '订单管理',
    children: [
      { path: '/orders/erp', title: 'ERP接口' },
      { path: '/orders/review', title: '订单审核' },
      // { path: '/orders/aggregate', title: '订单组合' },
    ],
  },
  {
    path: '/production',
    title: '计划',
    children: [
      // { path: '/matching', title: '选配盘' },
      { path: '/matching-new', title: '选配盘' },
      { path: '/raw-foil/plan', title: '生箔计划' },
      { path: '/raw-foil/records', title: '生箔生产记录' },
      { path: '/baking/plan', title: '烘烤计划' },
      { path: '/baking/records', title: '烘烤生产记录' },
    ],
  },
  {
    path: '/inventory',
    title: '库存管理',
    children: [
      { path: '/inventory/raw-foil', title: '生箔库' },
      { path: '/inventory/treated', title: '熟箔库' },
      { path: '/inventory/finished', title: '成品库' },
    ],
  },
  {
    path: '/slitting',
    title: '分切',
    children: [
      { path: '/slitting/plan', title: '分切计划' },
      { path: '/slitting/orders', title: '分切指令单' },
      { path: '/slitting/execution', title: '执行记录' },
      { path: '/scrap', title: '废料库' },
    ],
  },
  {
    path: '/reports',
    title: '统计报表',
    children: [
      { path: '/reports/order-progress', title: '订单执行进度' },
      { path: '/reports/production-progress', title: '生产执行进度' },
      { path: '/reports/shipment-progress', title: '发运执行进度' },
    ],
  },
  {
    path: '/config',
    title: '系统配置',
    children: [
      { path: '/config/rules', title: '排产规则' },
      { path: '/config/machines', title: '机台配置' },
      { path: '/config/feature-code', title: '特征值规则' },
    ],
  },
]

export function flattenNavigationItems(items: NavigationItem[]): NavigationItem[] {
  return items.flatMap((item) => [item, ...(item.children ? flattenNavigationItems(item.children) : [])])
}

export const flatNavigationItems = flattenNavigationItems(navigationItems)
