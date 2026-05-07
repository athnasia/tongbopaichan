import Mock from 'mockjs'
import { db } from '@/mock/db'
import type { TreatedFoilInventory } from '@/types/aps'
import type { ProductionRecord } from '@/types/demo'

type Opts = { url: string; type: string; body: string }
const ok = (data: unknown) => ({ code: 200, data, message: 'ok' })

export function registerBakingHandlers() {
  Mock.mock(/\/api\/baking-plans$/, 'get', () => ok(db.get().bakingPlanTasks))

  Mock.mock(/\/api\/baking-plans\/reserve$/, 'post', (opts: Opts) => {
    const { rollIds } = JSON.parse(opts.body) as { rollIds: string[] }
    const state = db.get()

    // Mark raw foil rolls as CONSUMED and create baking records + treated foil placeholders
    const rawFoilInventory = state.rawFoilInventory.map((inv) =>
      rollIds.includes(inv.rollId) && inv.status === 'AVAILABLE'
        ? { ...inv, status: 'CONSUMED' as const }
        : inv,
    )

    const newRecords: ProductionRecord[] = []
    const newTreated: TreatedFoilInventory[] = []

    for (const rollId of rollIds) {
      const rawRoll = state.rawFoilInventory.find((r) => r.rollId === rollId)
      if (!rawRoll || rawRoll.status !== 'AVAILABLE') continue

      newRecords.push({
        recordId: `BKR-${Date.now()}-${newRecords.length}`,
        process: '烘烤',
        sourceId: rollId,
        machineId: 'BK-L1',
        plannedDate: new Date().toISOString().slice(0, 10),
        actualWeightKg: 0,
        yieldRate: 0,
        status: 'WAITING',
      })

      // Pre-create TreatedFoilInventory entry (will be activated on complete)
      newTreated.push({
        rollId: `TR-${Date.now()}-${newTreated.length}`,
        sourceRawId: rollId,
        isSlitReturn: false,
        thickness: rawRoll.thickness,
        width: rawRoll.width,
        strength: '普', // will be updated when quality confirmed
        weightKg: rawRoll.weightKg,
        lockedWeightKg: 0,
        status: 'CONSUMED', // not available yet, pending baking completion
        location: '烘烤中',
      })
    }

    db.patch({
      rawFoilInventory,
      productionRecords: [...state.productionRecords, ...newRecords],
      treatedFoilInventory: [...state.treatedFoilInventory, ...newTreated],
    })
    return ok({ records: newRecords })
  })

  Mock.mock(/\/api\/baking-records$/, 'get', () =>
    ok(db.get().productionRecords.filter((r) => r.process === '烘烤')),
  )

  Mock.mock(/\/api\/baking-records\/[^/]+\/complete$/, 'post', (opts: Opts) => {
    const m = opts.url.match(/\/api\/baking-records\/([^/]+)\/complete$/)
    const recordId = m?.[1]
    const state = db.get()

    const record = state.productionRecords.find((r) => r.recordId === recordId)
    if (!record) return ok(null)

    // Activate the treated foil created from this raw roll
    const treatedFoilInventory = state.treatedFoilInventory.map((inv) =>
      inv.sourceRawId === record.sourceId && inv.status === 'CONSUMED' && inv.location === '烘烤中'
        ? { ...inv, status: 'AVAILABLE' as const, location: '处理线下线区' }
        : inv,
    )

    const productionRecords = state.productionRecords.map((r) =>
      r.recordId === recordId
        ? { ...r, status: 'DONE' as const, actualWeightKg: state.rawFoilInventory.find((i) => i.rollId === record.sourceId)?.weightKg ?? 0, yieldRate: 0.98 }
        : r,
    )

    const bakingPlanTasks = state.bakingPlanTasks.map((t) =>
      t.parent ? { ...t, progress: 1 } : t,
    )

    db.patch({ treatedFoilInventory, productionRecords, bakingPlanTasks })
    return ok({ activated: treatedFoilInventory.find((i) => i.sourceRawId === record.sourceId) })
  })
}
