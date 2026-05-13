import Mock from 'mockjs'
import { db } from '@/mock/db'
import type { FinishedProductInventory, SlittingPlan, TreatedFoilInventory } from '@/types/aps'
import type { ProductionRecord, ScrapRecord, SlittingDispatchOrder } from '@/types/demo'

type Opts = { url: string; type: string; body: string }
const ok = (data: unknown) => ({ code: 200, data, message: 'ok' })

export function registerSlittingHandlers() {
  Mock.mock(/\/api\/slitting-plans$/, 'get', () => ok(db.get().slittingPlans))

  Mock.mock(/\/api\/slitting-plans\/generate$/, 'post', () => {
    const state = db.get()
    const rules = state.rules
    const trimMargin = rules?.minTrimMargin ?? 5
    const newPlans: SlittingPlan[] = []

    const availRolls = state.treatedFoilInventory.filter(
      (inv) => inv.status === 'AVAILABLE' && inv.weightKg - inv.lockedWeightKg > 0,
    )

    for (const roll of availRolls) {
      const matchingOrders = state.productionOrders.filter(
        (po) =>
          po.reviewStatus === 'APPROVED' &&
          po.thickness === roll.thickness &&
          po.targetWeightKg - po.fulfilledKg - po.lockedWeightKg > 0,
      )
      if (matchingOrders.length === 0) continue

      const combinedOrders = matchingOrders.map((po) => ({
        orderId: po.productionOrderId,
        width: po.width,
        weightKg: Math.min(po.targetWeightKg - po.fulfilledKg - po.lockedWeightKg, roll.weightKg - roll.lockedWeightKg),
      }))
      const totalWidthUsed = combinedOrders.reduce((s, o) => s + o.width, 0)
      const trimWasteWidth = Math.max(0, roll.width - totalWidthUsed - trimMargin)
      const returnWidth = Math.max(0, roll.width - totalWidthUsed - trimWasteWidth)
      const efficiency = totalWidthUsed / roll.width

      const isCrossPeriod = matchingOrders.some(
        (po) => Math.abs(new Date(po.deliveryDate).getTime() - Date.now()) / 86400000 > (rules?.crossPeriodWarningDays ?? 7),
      )

      if (state.slittingPlans.some((p) => p.targetRollId === roll.rollId && p.planStatus === 'DRAFT')) continue

      newPlans.push({
        planId: `SP-${Date.now()}-${newPlans.length}`,
        targetRollId: roll.rollId,
        plannedDate: new Date().toISOString().slice(0, 10),
        combinedOrders,
        totalWidthUsed,
        trimWasteWidth,
        returnWidth,
        efficiency,
        isCrossPeriod,
        planStatus: 'DRAFT',
        createdBy: '系统自动',
        createdAt: new Date().toISOString(),
      })
    }

    const slittingPlans = [...state.slittingPlans, ...newPlans]

    const machineIds = [...new Set(slittingPlans.map((p) => p.machineId ?? 'SL01'))]
    const slittingPlanTasks = machineIds.flatMap((mid) => {
      const machinePlans = slittingPlans.filter((p) => (p.machineId ?? 'SL01') === mid)
      return [
        { id: mid, text: `${mid} 分切机台`, start_date: machinePlans[0].plannedDate, duration: 1, progress: 0, open: true },
        ...machinePlans.map((p) => ({
          id: p.planId,
          text: `${p.planId} 拼刀(${p.combinedOrders.length}单)`,
          start_date: p.plannedDate,
          duration: 1,
          parent: mid,
          progress: p.planStatus === 'COMPLETED' ? 1 : 0,
        })),
      ]
    })

    db.patch({ slittingPlans, slittingPlanTasks })
    return ok(slittingPlans)
  })

  Mock.mock(/\/api\/slitting-plans\/[^/]+\/release$/, 'post', (opts: Opts) => {
    const m = opts.url.match(/\/api\/slitting-plans\/([^/]+)\/release$/)
    const planId = m?.[1]
    const state = db.get()
    const plan = state.slittingPlans.find((p) => p.planId === planId)
    if (!plan) return ok(null)

    const slittingPlans = state.slittingPlans.map((p) =>
      p.planId === planId ? { ...p, planStatus: 'RELEASED' as const } : p,
    )

    // Move lockedWeightKg → fulfilledKg for each order in the plan
    let productionOrders = state.productionOrders.map((po) => {
      const combo = plan.combinedOrders.find((c) => c.orderId === po.productionOrderId)
      if (!combo) return po
      const newFulfilled = po.fulfilledKg + combo.weightKg
      const newLocked = Math.max(0, po.lockedWeightKg - combo.weightKg)
      const completed = newFulfilled >= po.targetWeightKg
      return {
        ...po,
        fulfilledKg: newFulfilled,
        lockedWeightKg: newLocked,
        status: completed ? ('COMPLETED' as const) : ('SCHEDULING' as const),
      }
    })

    // Consume from TreatedFoilInventory
    const totalWeight = plan.combinedOrders.reduce((s, c) => s + c.weightKg, 0)
    let treatedFoilInventory = state.treatedFoilInventory.map((inv) => {
      if (inv.rollId !== plan.targetRollId) return inv
      const newLocked = Math.max(0, inv.lockedWeightKg - totalWeight)
      const newWeight = Math.max(0, inv.weightKg - totalWeight)
      return {
        ...inv,
        weightKg: newWeight,
        lockedWeightKg: newLocked,
        status: newWeight <= 0 ? ('CONSUMED' as const) : inv.status,
      }
    })

    const dispatchId = `DO-${Date.now()}`
    const newOrder: SlittingDispatchOrder = {
      dispatchId,
      planId: planId!,
      machineId: plan.machineId ?? 'SL01',
      plannedDate: plan.plannedDate,
      shift: '白班',
      status: '待下发',
      orderIds: plan.combinedOrders.map((o) => o.orderId),
      operator: '计划员A',
    }

    db.patch({ slittingPlans, slittingOrders: [...state.slittingOrders, newOrder], productionOrders, treatedFoilInventory })
    return ok({ plan: slittingPlans.find((p) => p.planId === planId), order: newOrder })
  })

  Mock.mock(/\/api\/slitting-plans\/[^/]+$/, 'patch', (opts: Opts) => {
    const planId = opts.url.match(/\/slitting-plans\/([^/]+)$/)?.[1]
    const patch = JSON.parse(opts.body) as { machineId?: string; plannedDate?: string }
    const state = db.get()
    const idx = state.slittingPlans.findIndex((p) => p.planId === planId)
    if (idx === -1) return { code: 404, data: null, message: '计划不存在' }
    state.slittingPlans[idx] = { ...state.slittingPlans[idx], ...patch }
    db.patch({ slittingPlans: state.slittingPlans })
    return ok(state.slittingPlans[idx])
  })

  Mock.mock(/\/api\/slitting-orders$/, 'get', () => ok(db.get().slittingOrders))

  Mock.mock(/\/api\/slitting-orders\/[^/]+\/execute$/, 'post', (opts: Opts) => {
    const m = opts.url.match(/\/api\/slitting-orders\/([^/]+)\/execute$/)
    const dispatchId = m?.[1]
    const { actualWeightKg, yieldRate } = JSON.parse(opts.body) as { actualWeightKg: number; yieldRate: number }
    const state = db.get()
    const rules = state.rules
    const threshold = rules?.narrowRollReturnThresholdMm ?? 150

    const dispatchOrder = state.slittingOrders.find((o) => o.dispatchId === dispatchId)
    if (!dispatchOrder) return ok(null)

    const plan = state.slittingPlans.find((p) => p.planId === dispatchOrder.planId)
    if (!plan) return ok(null)

    const motherRoll = state.treatedFoilInventory.find((inv) => inv.rollId === plan.targetRollId)

    const record: ProductionRecord = {
      recordId: `SLR-${Date.now()}`,
      process: '分切',
      sourceId: plan.planId,
      machineId: plan.machineId ?? 'SL01',
      plannedDate: plan.plannedDate,
      actualWeightKg,
      yieldRate,
      status: 'DONE',
    }

    const slittingPlans = state.slittingPlans.map((p) =>
      p.planId === plan.planId ? { ...p, planStatus: 'COMPLETED' as const } : p,
    )
    const slittingOrders = state.slittingOrders.map((o) =>
      o.dispatchId === dispatchId ? { ...o, status: '已执行' as const } : o,
    )

    // Create FinishedProductInventory for each combined order
    const newFinished: FinishedProductInventory[] = plan.combinedOrders.map((c, i) => ({
      rollId: `FP-${Date.now()}-${i}`,
      sourceTreatedId: plan.targetRollId,
      slittingPlanId: plan.planId,
      orderId: c.orderId,
      thickness: motherRoll?.thickness ?? 6,
      width: c.width,
      weightKg: Math.round(c.weightKg * yieldRate),
      qualityGrade: 'A',
      status: 'IN_STOCK',
    }))
    const finishedProductInventory = [...state.finishedProductInventory, ...newFinished]

    // Handle narrow roll return
    let treatedFoilInventory = state.treatedFoilInventory
    let scrapRecords = state.scrapRecords

    if (plan.returnWidth >= threshold) {
      const narrowRoll: TreatedFoilInventory = {
        rollId: `TR-SR-${Date.now()}`,
        sourceTreatedId: plan.targetRollId,
        isSlitReturn: true,
        thickness: motherRoll?.thickness ?? 6,
        width: plan.returnWidth,
        strength: motherRoll?.strength ?? '普',
        weightKg: Math.round(actualWeightKg * (plan.returnWidth / (motherRoll?.width ?? 1380))),
        lockedWeightKg: 0,
        status: 'AVAILABLE',
        location: '窄卷循环区',
      }
      treatedFoilInventory = [...state.treatedFoilInventory, narrowRoll]
    } else if (plan.returnWidth > 0) {
      const scrap: ScrapRecord = {
        scrapId: `SC-${Date.now()}`,
        process: '分切',
        machineId: plan.machineId ?? 'SL01',
        weightKg: Math.round(actualWeightKg * (plan.returnWidth / (motherRoll?.width ?? 1380))),
        reason: `余宽${plan.returnWidth}mm < 阈值${threshold}mm`,
        grade: 'C',
        createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      }
      scrapRecords = [...scrapRecords, scrap]
    }

    db.patch({
      slittingPlans,
      slittingOrders,
      productionRecords: [...state.productionRecords, record],
      treatedFoilInventory,
      finishedProductInventory,
      scrapRecords,
    })
    return ok({ record, returnWidth: plan.returnWidth, isNarrowRoll: plan.returnWidth >= threshold })
  })

  Mock.mock(/\/api\/production-records$/, 'get', () => ok(db.get().productionRecords))

  Mock.mock(/\/api\/scrap-records$/, 'get', () => ok(db.get().scrapRecords))

  Mock.mock(/\/api\/slitting-plan-tasks$/, 'get', () => ok(db.get().slittingPlanTasks))

  Mock.mock(/\/api\/slitting-plans\/manual$/, 'post', (opts: Opts) => {
    const { targetRollId, orderIds, plannedDate, createdBy } = JSON.parse(opts.body) as {
      targetRollId: string
      orderIds: string[]
      plannedDate: string
      createdBy: string
    }
    const state = db.get()

    // Guard: no existing DRAFT for this roll
    if (state.slittingPlans.some((p) => p.targetRollId === targetRollId && p.planStatus === 'DRAFT')) {
      return { code: 400, data: null, message: '该母卷已有草稿分切计划' }
    }

    const roll = state.treatedFoilInventory.find((i) => i.rollId === targetRollId)
    if (!roll) return { code: 400, data: null, message: '母卷不存在' }

    const orders = orderIds
      .map((id) => state.productionOrders.find((p) => p.productionOrderId === id))
      .filter((o): o is NonNullable<typeof o> => !!o)

    const availableKg = roll.weightKg - roll.lockedWeightKg
    const totalWidth = orders.reduce((s, o) => s + o.width, 0)
    const trimMargin = state.rules?.minTrimMargin ?? 5
    const returnWidth = Math.max(0, roll.width - totalWidth - trimMargin)

    const combinedOrders = orders.map((order) => {
      const shortage = order.targetWeightKg - order.fulfilledKg - order.lockedWeightKg
      const proportional = totalWidth > 0 ? availableKg * (order.width / totalWidth) : 0
      const lockKg = Math.round(Math.min(shortage, proportional))
      return { orderId: order.productionOrderId, width: order.width, weightKg: lockKg }
    })

    const totalLockKg = combinedOrders.reduce((s, c) => s + c.weightKg, 0)
    const efficiency = roll.width > 0 ? totalWidth / roll.width : 0
    const isCrossPeriod = orders.some(
      (o) => Math.abs(new Date(o.deliveryDate).getTime() - Date.now()) / 86400000 > (state.rules?.crossPeriodWarningDays ?? 7),
    )

    const newPlan: SlittingPlan = {
      planId: `SP-M-${Date.now()}`,
      targetRollId,
      plannedDate,
      combinedOrders,
      totalWidthUsed: totalWidth,
      trimWasteWidth: trimMargin,
      returnWidth,
      efficiency,
      isCrossPeriod,
      planStatus: 'DRAFT',
      createdBy: createdBy || '计划员',
      createdAt: new Date().toISOString(),
    }

    const updatedOrders = state.productionOrders.map((po) => {
      const combo = combinedOrders.find((c) => c.orderId === po.productionOrderId)
      if (!combo) return po
      return { ...po, lockedWeightKg: po.lockedWeightKg + combo.weightKg, status: 'SCHEDULING' as const }
    })

    const updatedInventory = state.treatedFoilInventory.map((inv) =>
      inv.rollId === targetRollId ? { ...inv, lockedWeightKg: inv.lockedWeightKg + totalLockKg } : inv,
    )

    db.patch({
      slittingPlans: [...state.slittingPlans, newPlan],
      productionOrders: updatedOrders,
      treatedFoilInventory: updatedInventory,
    })
    return ok(newPlan)
  })
}
