import type {
  FeatureCodeConfig,
  FeatureCodeVersion,
  FinishedProductInventory,
  MachineCapability,
  ProductAttributeMapping,
  ProductionOrder,
  RawErpOrder,
  RawFoilInventory,
  SchedulingRuleConfig,
  SlittingPlan,
  TreatedFoilInventory,
} from './aps'

export interface GanttTask {
  id: string
  text: string
  start_date: string
  duration: number
  progress: number
  parent?: string
  open?: boolean
  color?: string
}

export interface SlittingDispatchOrder {
  dispatchId: string
  planId: string
  machineId: string
  plannedDate: string
  shift: '白班' | '夜班'
  status: '待下发' | '已下发' | '已执行'
  orderIds: string[]
  operator: string
}

export interface ProductionRecord {
  recordId: string
  process: '生箔' | '烘烤' | '分切'
  sourceId: string
  machineId: string
  plannedDate: string
  actualWeightKg: number
  yieldRate: number
  status: 'WAITING' | 'DONE'
}

export interface ScrapRecord {
  scrapId: string
  process: '分切' | '烘烤'
  machineId: string
  weightKg: number
  reason: string
  grade: 'A' | 'B' | 'C'
  createdAt: string
}

export interface DashboardMetric {
  label: string
  value: string
  helper: string
  tone: 'primary' | 'success' | 'warning' | 'danger'
}

export interface ProcessNodeSummary {
  key: string
  title: string
  route: string
  count: number
  status: string
  detail: string
}

export interface CapacityPoint {
  category: string
  value: number
}

export interface InventoryBucket {
  label: string
  count: number
  totalWeightKg: number
}

export interface DemandShortageRow {
  groupKey: string           // '{thickness}-{strength}' 分组键
  productionOrderId: string
  width: number
  urgency: string
  targetWeightKg: number
  fulfilledKg: number
  lockedWeightKg: number
  shortageKg: number
  thickness: number
  strength: string
}

export interface ApsSeedState {
  // 订单链
  rawOrders: RawErpOrder[]
  attrMappings: ProductAttributeMapping[]
  productionOrders: ProductionOrder[]

  // 配置
  machines: MachineCapability[]
  rules: SchedulingRuleConfig | null
  featureCodeConfig: FeatureCodeConfig
  featureCodeVersions: FeatureCodeVersion[]

  // 物理隔离三大库存
  rawFoilInventory: RawFoilInventory[]
  treatedFoilInventory: TreatedFoilInventory[]
  finishedProductInventory: FinishedProductInventory[]

  // 分切
  slittingPlans: SlittingPlan[]
  slittingOrders: SlittingDispatchOrder[]

  // 甘特图
  rawFoilPlanTasks: GanttTask[]
  bakingPlanTasks: GanttTask[]
  slittingPlanTasks: GanttTask[]

  // 实绩
  productionRecords: ProductionRecord[]
  scrapRecords: ScrapRecord[]
}
