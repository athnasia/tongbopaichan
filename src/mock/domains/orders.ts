import type {
  ProductAttributeMapping,
  ProductionOrder,
  RawErpOrder,
  ReviewStatus,
  Strength,
  Urgency,
} from '@/types/aps'
import { generateFeatureCode } from '@/utils/featureCode'
import { createBaseDataSeed } from '@/mock/domains/base-data'

export interface OrderDomainSeed {
  attrMappings: ProductAttributeMapping[]
  rawOrders: RawErpOrder[]
  productionOrders: ProductionOrder[]
}

interface ProductionOrderDraft {
  productionOrderId: string
  rawOrderIndex: number
  strength: Strength
  urgency: Urgency
  isStrictQty: boolean
  manualMachinePref: string | null
  notes: string
  reviewStatus: ReviewStatus
}

const attrMappingsSeed: ProductAttributeMapping[] = [
  {
    productCode: 'CUF-06-H',
    productName: '高强铜箔 6μm',
    thickness: 6,
    defaultStrength: '高',
    isHighPrecision: true,
  },
  {
    productCode: 'CUF-08-M',
    productName: '中强铜箔 8μm',
    thickness: 8,
    defaultStrength: '中',
    isHighPrecision: false,
  },
  {
    productCode: 'CUF-10-P',
    productName: '普通铜箔 10μm',
    thickness: 10,
    defaultStrength: '普',
    isHighPrecision: false,
  },
  {
    productCode: 'CUF-12-H',
    productName: '高精高强铜箔 12μm',
    thickness: 12,
    defaultStrength: '高',
    isHighPrecision: true,
  },
  {
    productCode: 'CUF-15-M',
    productName: '中强铜箔 15μm',
    thickness: 15,
    defaultStrength: '中',
    isHighPrecision: false,
  },
]

const rawOrdersSeed: RawErpOrder[] = [
  {
    orderId: 'SO-1001',
    productCode: 'CUF-06-H',
    customerCode: 'ATL',
    productName: '高强铜箔 6μm 电池箔',
    thickness: 6,
    width: 600,
    orderWeightKg: 2000,
    deliveryDate: '2026-05-03',
  },
  {
    orderId: 'SO-1002',
    productCode: 'CUF-06-H',
    customerCode: 'CATL',
    productName: '高强铜箔 6μm 动力电池',
    thickness: 6,
    width: 600,
    orderWeightKg: 2000,
    deliveryDate: '2026-05-05',
  },
  {
    orderId: 'SO-1003',
    productCode: 'CUF-06-H',
    customerCode: 'EVE',
    productName: '高强铜箔 6μm 小卷规格',
    thickness: 6,
    width: 400,
    orderWeightKg: 1000,
    deliveryDate: '2026-05-10',
  },
  {
    orderId: 'SO-1004',
    productCode: 'CUF-08-M',
    customerCode: 'BYD',
    productName: '中强铜箔 8μm 常规单',
    thickness: 8,
    width: 520,
    orderWeightKg: 1600,
    deliveryDate: '2026-05-08',
  },
  {
    orderId: 'SO-1005',
    productCode: 'CUF-10-P',
    customerCode: 'SUNWODA',
    productName: '普通铜箔 10μm 宽幅单',
    thickness: 10,
    width: 680,
    orderWeightKg: 2400,
    deliveryDate: '2026-05-13',
  },
  {
    orderId: 'SO-1006',
    productCode: 'CUF-12-H',
    customerCode: 'CALB',
    productName: '高精高强铜箔 12μm 试制单',
    thickness: 12,
    width: 300,
    orderWeightKg: 800,
    deliveryDate: '2026-05-18',
  },
  {
    orderId: 'SO-1007',
    productCode: 'CUF-06-H',
    customerCode: 'GANFENG',
    productName: '高强铜箔 6μm 宽幅单',
    thickness: 6,
    width: 700,
    orderWeightKg: 1800,
    deliveryDate: '2026-05-20',
  },
  {
    orderId: 'SO-1008',
    productCode: 'CUF-08-M',
    customerCode: 'BAIC',
    productName: '中强铜箔 8μm 储能单',
    thickness: 8,
    width: 480,
    orderWeightKg: 1200,
    deliveryDate: '2026-05-25',
  },
  {
    orderId: 'SO-1009',
    productCode: 'CUF-15-M',
    customerCode: 'LISHEN',
    productName: '中强铜箔 15μm 宽幅单',
    thickness: 15,
    width: 560,
    orderWeightKg: 2000,
    deliveryDate: '2026-05-30',
  },
]

const productionOrderDrafts: ProductionOrderDraft[] = [
  {
    productionOrderId: 'PO-001',
    rawOrderIndex: 0,
    strength: '高',
    urgency: '急1',
    isStrictQty: true,
    manualMachinePref: 'A7',
    notes: '高精客户，优先窄卷命中。',
    reviewStatus: 'APPROVED',
  },
  {
    productionOrderId: 'PO-002',
    rawOrderIndex: 1,
    strength: '高',
    urgency: '常规',
    isStrictQty: true,
    manualMachinePref: null,
    notes: '可与同厚度订单拼刀。',
    reviewStatus: 'APPROVED',
  },
  {
    productionOrderId: 'PO-003',
    rawOrderIndex: 2,
    strength: '高',
    urgency: '常规',
    isStrictQty: true,
    manualMachinePref: null,
    notes: '适合作为窄卷循环消化对象。',
    reviewStatus: 'APPROVED',
  },
  {
    productionOrderId: 'PO-004',
    rawOrderIndex: 3,
    strength: '中',
    urgency: '急2',
    isStrictQty: false,
    manualMachinePref: 'A8',
    notes: '允许部分满足后进入生箔池。',
    reviewStatus: 'APPROVED',
  },
  {
    productionOrderId: 'PO-005',
    rawOrderIndex: 4,
    strength: '普',
    urgency: '常规',
    isStrictQty: false,
    manualMachinePref: 'A9',
    notes: '标准母卷优先，等待生箔排产。',
    reviewStatus: 'APPROVED',
  },
  {
    productionOrderId: 'PO-006',
    rawOrderIndex: 5,
    strength: '高',
    urgency: '急2',
    isStrictQty: true,
    manualMachinePref: null,
    notes: '高精订单，烘烤后再进入分切。',
    reviewStatus: 'PENDING',
  },
]

export function createOrderDomainSeed(): OrderDomainSeed {
  const attrMappings = structuredClone(attrMappingsSeed)
  const rawOrders = structuredClone(rawOrdersSeed)
  const { featureCodeConfig, featureCodeVersions } = createBaseDataSeed()
  const activeVersionId = featureCodeVersions.find((v) => v.enabled)?.versionId ?? ''
  // SP-001 (COMPLETED) 已释放：PO-001 履行 1000kg，PO-002 履行 500kg
  const fulfilledOverrides: Record<string, number> = {
    'PO-001': 1000,
    'PO-002': 500,
  }

  const productionOrders: ProductionOrder[] = productionOrderDrafts.map((draft) => {
    const rawOrder = rawOrders[draft.rawOrderIndex]
    const fulfilledKg = fulfilledOverrides[draft.productionOrderId] ?? 0
    const completed = fulfilledKg >= rawOrder.orderWeightKg
    return {
      productionOrderId: draft.productionOrderId,
      rawOrder,
      thickness: rawOrder.thickness,
      width: rawOrder.width,
      strength: draft.strength,
      urgency: draft.urgency,
      targetWeightKg: rawOrder.orderWeightKg,
      fulfilledKg,
      lockedWeightKg: 0,
      deliveryDate: rawOrder.deliveryDate,
      isStrictQty: draft.isStrictQty,
      manualMachinePref: draft.manualMachinePref,
      notes: draft.notes,
      reviewStatus: draft.reviewStatus,
      status: completed ? ('COMPLETED' as const) : ('APPROVED' as const),
      featureCode: generateFeatureCode(rawOrder.thickness, rawOrder.width, draft.strength, draft.urgency, featureCodeConfig),
      featureCodeVersionId: activeVersionId,
    }
  })

  return {
    attrMappings,
    rawOrders,
    productionOrders,
  }
}
