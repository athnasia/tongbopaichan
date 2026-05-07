export type Strength = '高' | '中' | '普'
export type Urgency = '急1' | '急2' | '常规' | '配'
export type ReviewStatus = 'PENDING' | 'APPROVED'
export type QualityGrade = 'A' | 'B' | 'C'
export type SlittingPlanStatus = 'DRAFT' | 'RELEASED' | 'COMPLETED'

export interface RawErpOrder {
  orderId: string
  productCode: string
  customerCode: string
  productName: string
  thickness: number
  width: number
  orderWeightKg: number
  deliveryDate: string
}

export interface ProductionOrder {
  productionOrderId: string
  rawOrder: RawErpOrder
  // 扁平化提取，方便前端直滤和排产计算
  thickness: number
  width: number
  strength: Strength
  urgency: Urgency
  // 吨位防超卖与排产进度控制
  targetWeightKg: number        // 总需求量 = rawOrder.orderWeightKg
  fulfilledKg: number           // 已正式下发(RELEASED)的重量
  lockedWeightKg: number        // 在草稿(DRAFT)计划中预占的重量，撤销草稿即释放
  // shortageKg (computed) = targetWeightKg - fulfilledKg - lockedWeightKg
  deliveryDate: string
  isStrictQty: boolean
  manualMachinePref: string | null
  notes: string
  reviewStatus: ReviewStatus
  status: 'APPROVED' | 'SCHEDULING' | 'COMPLETED' // 订单生命周期
  featureCode: string
  featureCodeVersionId: string
}

export interface FeatureCodeConfig {
  strengthMap: Record<Strength, string>
  urgencyMap: Record<Urgency, string>
  thicknessLength?: number
  widthLength?: number
  totalLength?: number
}

export type FeatureCodeVersionStatus = 'DRAFT' | 'SUBMITTED'

export interface FeatureCodeVersion {
  versionId: string
  enabled: boolean
  notes: string
  status: FeatureCodeVersionStatus
  createdBy: string
  createdAt: string
  totalLength: number
  thicknessLength: number
  widthLength: number
  strengthMap: Record<Strength, string>
  urgencyMap: Record<Urgency, string>
}

export interface SchedulingRuleConfig {
  minTrimMargin: number
  maxWasteTolerance: number
  minRawFoilBatchKg: number
  crossPeriodWarningDays: number
  narrowRollReturnThresholdMm: number
}

export interface MachineCapability {
  machineId: string
  factory: string
  system: string
  supportedThicknesses: number[]
  capableStrengths: Strength[]
  maxWidth: number
  minWidth: number
  standardRollLength: number
}

// ── 物理隔离三大库存 ──────────────────────────────────────

/** 生箔库：烘烤前工序产出 */
export interface RawFoilInventory {
  rollId: string
  machineId: string
  thickness: number
  width: number
  weightKg: number
  status: 'AVAILABLE' | 'CONSUMED'
  createdAt: string
}

/** 熟箔库/半成品库：分切沙盒唯一合法母卷来源 */
export interface TreatedFoilInventory {
  rollId: string
  sourceRawId?: string
  sourceTreatedId?: string
  isSlitReturn: boolean
  thickness: number
  width: number
  strength: string
  weightKg: number
  lockedWeightKg: number
  status: 'AVAILABLE' | 'CONSUMED'
  location: string
}

/** 成品库：分切后待发货 */
export interface FinishedProductInventory {
  rollId: string
  sourceTreatedId: string
  slittingPlanId: string
  orderId: string
  thickness: number
  width: number
  weightKg: number
  qualityGrade: QualityGrade
  status: 'IN_STOCK' | 'PACKAGED' | 'SHIPPED'
}

export interface ProductAttributeMapping {
  productCode: string
  productName: string
  thickness: number
  defaultStrength: Strength
  isHighPrecision: boolean
}

export interface SlittingPlan {
  planId: string
  targetRollId: string
  machineId?: string
  plannedDate: string
  combinedOrders: {
    orderId: string
    width: number
    weightKg: number
  }[]
  totalWidthUsed: number
  trimWasteWidth: number
  returnWidth: number
  efficiency: number
  isCrossPeriod: boolean
  planStatus: SlittingPlanStatus
  createdBy: string
  createdAt: string
}
