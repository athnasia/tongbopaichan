import type { AggregatedBakingPlan, AggregatedRawFoilPlan } from '@/types/demo'

export interface AggregatedPlanSeed {
  aggregatedRawFoilPlans: AggregatedRawFoilPlan[]
  aggregatedBakingPlans: AggregatedBakingPlan[]
}

const aggregatedRawFoilPlansSeed: AggregatedRawFoilPlan[] = [
  {
    planId: 'RFPLAN-001',
    spec: '高/6μm/600mm',
    thickness: 6,
    width: 600,
    strength: '高',
    totalWeightKg: 4000,
    linkedOrderIds: ['PO-001', 'PO-002'],
    weekStart: '2026-05-11',
    weekEnd: '2026-05-17',
    status: 'COMPLETED',
    createdAt: '2026-05-11T08:00:00.000Z',
  },
  {
    planId: 'RFPLAN-002',
    spec: '高/6μm/400mm',
    thickness: 6,
    width: 400,
    strength: '高',
    totalWeightKg: 1000,
    linkedOrderIds: ['PO-003'],
    weekStart: '2026-05-11',
    weekEnd: '2026-05-17',
    status: 'DRAFT',
    createdAt: '2026-05-11T08:00:00.000Z',
  },
  {
    planId: 'RFPLAN-003',
    spec: '中/8μm/520mm',
    thickness: 8,
    width: 520,
    strength: '中',
    totalWeightKg: 1600,
    linkedOrderIds: ['PO-004'],
    weekStart: '2026-05-11',
    weekEnd: '2026-05-17',
    status: 'DRAFT',
    createdAt: '2026-05-11T08:00:00.000Z',
  },
  {
    planId: 'RFPLAN-004',
    spec: '普/10μm/680mm',
    thickness: 10,
    width: 680,
    strength: '普',
    totalWeightKg: 2400,
    linkedOrderIds: ['PO-005'],
    weekStart: '2026-05-11',
    weekEnd: '2026-05-17',
    status: 'DRAFT',
    createdAt: '2026-05-11T08:00:00.000Z',
  },
]

const aggregatedBakingPlansSeed: AggregatedBakingPlan[] = [
  {
    bakingPlanId: 'BKPLAN-001',
    sourceFoilPlanId: 'RFPLAN-001',
    spec: '高/6μm/600mm',
    thickness: 6,
    width: 600,
    strength: '高',
    totalWeightKg: 3880,
    linkedOrderIds: ['PO-001', 'PO-002'],
    status: 'PENDING',
    createdAt: '2026-05-12T09:00:00.000Z',
  },
]

export function createAggregatedPlanSeed(): AggregatedPlanSeed {
  return {
    aggregatedRawFoilPlans: structuredClone(aggregatedRawFoilPlansSeed),
    aggregatedBakingPlans: structuredClone(aggregatedBakingPlansSeed),
  }
}
