import Mock from 'mockjs'
import { db } from '@/mock/db'

type Opts = { url: string; type: string; body: string }
const ok = (data: unknown) => ({ code: 200, data, message: 'ok' })

export function registerMatchingHandlers() {
  Mock.mock(/\/api\/matching\/run$/, 'post', () => {
    const state = db.get()
    const maxWaste = state.rules?.maxWasteTolerance ?? 100
    let productionOrders = structuredClone(state.productionOrders)
    let treatedFoilInventory = structuredClone(state.treatedFoilInventory)

    const pendingOrders = productionOrders.filter(
      (po) => po.reviewStatus === 'APPROVED' && po.targetWeightKg - po.fulfilledKg - po.lockedWeightKg > 0,
    )

    for (const order of pendingOrders) {
      const shortage = order.targetWeightKg - order.fulfilledKg - order.lockedWeightKg
      if (shortage <= 0) continue

      const avail = treatedFoilInventory.filter(
        (inv) => inv.status === 'AVAILABLE' && inv.weightKg - inv.lockedWeightKg > 0 && inv.thickness === order.thickness,
      )

      let best = avail.find((inv) => inv.isSlitReturn && inv.width >= order.width)
      if (!best) best = avail.find((inv) => inv.width === order.width)
      if (!best) best = avail.find((inv) => inv.width > order.width && inv.width - order.width <= maxWaste)
      if (!best) best = avail[0]
      if (!best) continue

      const available = best.weightKg - best.lockedWeightKg
      const fulfillable = Math.min(shortage, available)

      const roll = treatedFoilInventory.find((i) => i.rollId === best!.rollId)!
      roll.lockedWeightKg += fulfillable

      const po = productionOrders.find((p) => p.productionOrderId === order.productionOrderId)!
      po.lockedWeightKg += fulfillable
      po.status = 'SCHEDULING'
    }

    db.patch({ productionOrders, treatedFoilInventory })
    return ok({ productionOrders, treatedFoilInventory })
  })

  Mock.mock(/\/api\/matching\/reset$/, 'post', () => {
    const state = db.get()
    const productionOrders = state.productionOrders.map((po) => ({
      ...po,
      lockedWeightKg: 0,
      status: po.fulfilledKg > 0 ? ('SCHEDULING' as const) : ('APPROVED' as const),
    }))
    const treatedFoilInventory = state.treatedFoilInventory.map((inv) => ({ ...inv, lockedWeightKg: 0 }))
    db.patch({ productionOrders, treatedFoilInventory })
    return ok({ productionOrders, treatedFoilInventory })
  })

  Mock.mock(/\/api\/matching\/manual$/, 'post', (opts: Opts) => {
    const { orderId, rollId } = JSON.parse(opts.body) as { orderId: string; rollId: string }
    const state = db.get()
    const order = state.productionOrders.find((p) => p.productionOrderId === orderId)
    const inv = state.treatedFoilInventory.find((i) => i.rollId === rollId)
    const shortage = order ? order.targetWeightKg - order.fulfilledKg - order.lockedWeightKg : 0
    const avail = inv ? inv.weightKg - inv.lockedWeightKg : 0
    if (!order || !inv || shortage <= 0 || avail <= 0) return ok(null)

    const fulfillable = Math.min(shortage, avail)
    const productionOrders = state.productionOrders.map((p) =>
      p.productionOrderId === orderId
        ? { ...p, lockedWeightKg: p.lockedWeightKg + fulfillable, status: 'SCHEDULING' as const }
        : p,
    )
    const treatedFoilInventory = state.treatedFoilInventory.map((i) =>
      i.rollId === rollId ? { ...i, lockedWeightKg: i.lockedWeightKg + fulfillable } : i,
    )
    db.patch({ productionOrders, treatedFoilInventory })
    return ok({ productionOrders, treatedFoilInventory })
  })

  Mock.mock(/\/api\/matching\/push-to-raw-foil$/, 'post', () => {
    const state = db.get()
    const toAdd = []
    for (const po of state.productionOrders) {
      if (po.reviewStatus !== 'APPROVED') continue
      const shortageKg = po.targetWeightKg - po.fulfilledKg - po.lockedWeightKg
      if (shortageKg <= 0 || po.urgency === '配') continue
      const taskId = `RF-SHORTAGE-${po.productionOrderId}`
      if (state.rawFoilPlanTasks.some((t) => t.id === taskId)) continue
      const machine = state.machines.find(
        (m) => m.system === '生箔' && m.supportedThicknesses.includes(po.thickness),
      )
      const parent = po.manualMachinePref ?? machine?.machineId ?? 'A7'
      toAdd.push({
        id: taskId,
        text: `${po.productionOrderId} 缺 ${shortageKg}kg (${po.thickness}μm)`,
        start_date: new Date().toISOString().slice(0, 10),
        duration: Math.ceil(shortageKg / 500),
        progress: 0,
        parent,
        color: '#F53F3F',
      })
    }
    const rawFoilPlanTasks = [...state.rawFoilPlanTasks, ...toAdd]
    db.patch({ rawFoilPlanTasks })
    return ok({ added: toAdd.length, rawFoilPlanTasks })
  })
}
