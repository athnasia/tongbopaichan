import Mock from 'mockjs'
import { db } from '@/mock/db'
import type { AggregatedBakingPlan, AggregatedRawFoilPlan, ProductionRecord } from '@/types/demo'
import type { Strength } from '@/types/aps'

type Opts = { url: string; type: string; body: string }
const ok = (data: unknown) => ({ code: 200, data, message: 'ok' })

function getWeekBounds(date: Date): { weekStart: string; weekEnd: string } {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    weekStart: monday.toISOString().slice(0, 10),
    weekEnd: sunday.toISOString().slice(0, 10),
  }
}

export function registerAggregatedPlanHandlers() {
  Mock.mock(/\/api\/aggregated-raw-foil-plans$/, 'get', () =>
    ok(db.get().aggregatedRawFoilPlans ?? []),
  )

  Mock.mock(/\/api\/aggregated-raw-foil-plans\/generate$/, 'post', () => {
    const state = db.get()
    const { weekStart, weekEnd } = getWeekBounds(new Date())

    // Group approved orders by spec
    const specMap = new Map<string, {
      thickness: number; width: number; strength: Strength
      totalWeightKg: number; linkedOrderIds: string[]
    }>()

    for (const po of state.productionOrders) {
      if (po.reviewStatus !== 'APPROVED') continue
      const remaining = po.targetWeightKg - po.fulfilledKg - po.lockedWeightKg
      if (remaining <= 0) continue
      const key = `${po.strength}/${po.thickness}μm/${po.width}mm`
      if (!specMap.has(key)) {
        specMap.set(key, { thickness: po.thickness, width: po.width, strength: po.strength, totalWeightKg: 0, linkedOrderIds: [] })
      }
      const entry = specMap.get(key)!
      entry.totalWeightKg += remaining
      entry.linkedOrderIds.push(po.productionOrderId)
    }

    const now = new Date().toISOString()
    const existing = state.aggregatedRawFoilPlans ?? []
    const existingSpecs = new Set(existing.filter(p => p.weekStart === weekStart).map(p => p.spec))

    const newPlans: AggregatedRawFoilPlan[] = []
    let idx = existing.length + 1
    for (const [spec, data] of specMap.entries()) {
      if (existingSpecs.has(spec)) continue
      newPlans.push({
        planId: `RFPLAN-${String(idx++).padStart(3, '0')}`,
        spec,
        thickness: data.thickness,
        width: data.width,
        strength: data.strength,
        totalWeightKg: Math.round(data.totalWeightKg),
        linkedOrderIds: data.linkedOrderIds,
        weekStart,
        weekEnd,
        status: 'DRAFT',
        createdAt: now,
      })
    }

    const aggregatedRawFoilPlans = [...existing, ...newPlans]
    db.patch({ aggregatedRawFoilPlans })
    return ok(aggregatedRawFoilPlans)
  })

  Mock.mock(/\/api\/aggregated-raw-foil-plans\/[^/]+\/complete$/, 'post', (opts: Opts) => {
    const m = opts.url.match(/\/api\/aggregated-raw-foil-plans\/([^/]+)\/complete$/)
    const planId = m?.[1]
    const { actualWeightKg, yieldRate } = JSON.parse(opts.body) as { actualWeightKg: number; yieldRate: number }
    const state = db.get()
    const plans = state.aggregatedRawFoilPlans ?? []
    const plan = plans.find((p) => p.planId === planId)
    if (!plan) return ok(null)

    // Mark plan COMPLETED
    const aggregatedRawFoilPlans = plans.map((p) =>
      p.planId === planId ? { ...p, status: 'COMPLETED' as const } : p,
    )

    // Create production record
    const record: ProductionRecord = {
      recordId: `RFR-${Date.now()}`,
      process: '生箔',
      sourceId: planId!,
      machineId: '',
      plannedDate: new Date().toISOString().slice(0, 10),
      actualWeightKg,
      yieldRate,
      status: 'DONE',
    }

    // Auto-create baking plan
    const existing = state.aggregatedBakingPlans ?? []
    const bakingPlan: AggregatedBakingPlan = {
      bakingPlanId: `BKPLAN-${String(existing.length + 1).padStart(3, '0')}`,
      sourceFoilPlanId: planId!,
      spec: plan.spec,
      thickness: plan.thickness,
      width: plan.width,
      strength: plan.strength,
      totalWeightKg: Math.round(actualWeightKg * yieldRate),
      linkedOrderIds: plan.linkedOrderIds,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    }
    const aggregatedBakingPlans = [...existing, bakingPlan]

    db.patch({
      aggregatedRawFoilPlans,
      aggregatedBakingPlans,
      productionRecords: [...state.productionRecords, record],
    })
    return ok({ plan: aggregatedRawFoilPlans.find((p) => p.planId === planId), bakingPlan, record })
  })

  Mock.mock(/\/api\/aggregated-baking-plans$/, 'get', () =>
    ok(db.get().aggregatedBakingPlans ?? []),
  )

  Mock.mock(/\/api\/aggregated-baking-plans\/[^/]+\/complete$/, 'post', (opts: Opts) => {
    const m = opts.url.match(/\/api\/aggregated-baking-plans\/([^/]+)\/complete$/)
    const bakingPlanId = m?.[1]
    const { actualWeightKg, yieldRate } = JSON.parse(opts.body) as { actualWeightKg: number; yieldRate: number }
    const state = db.get()
    const plans = state.aggregatedBakingPlans ?? []
    const plan = plans.find((p) => p.bakingPlanId === bakingPlanId)
    if (!plan) return ok(null)

    const aggregatedBakingPlans = plans.map((p) =>
      p.bakingPlanId === bakingPlanId ? { ...p, status: 'COMPLETED' as const } : p,
    )

    const record: ProductionRecord = {
      recordId: `BKR-${Date.now()}`,
      process: '烘烤',
      sourceId: bakingPlanId!,
      machineId: '',
      plannedDate: new Date().toISOString().slice(0, 10),
      actualWeightKg,
      yieldRate,
      status: 'DONE',
    }

    db.patch({
      aggregatedBakingPlans,
      productionRecords: [...state.productionRecords, record],
    })
    return ok({ plan: aggregatedBakingPlans.find((p) => p.bakingPlanId === bakingPlanId), record })
  })
}
