import Mock from 'mockjs'
import { db } from '@/mock/db'
import type { RawFoilInventory } from '@/types/aps'
import type { ProductionRecord } from '@/types/demo'

type Opts = { url: string; type: string; body: string }
const ok = (data: unknown) => ({ code: 200, data, message: 'ok' })

export function registerRawFoilHandlers() {
  Mock.mock(/\/api\/raw-foil-plans$/, 'get', () => ok(db.get().rawFoilPlanTasks))

  Mock.mock(/\/api\/raw-foil-records$/, 'get', () =>
    ok(db.get().productionRecords.filter((r) => r.process === '生箔')),
  )

  Mock.mock(/\/api\/raw-foil-records$/, 'post', (opts: Opts) => {
    const { machineId, plannedDate, plannedWeightKg } = JSON.parse(opts.body) as {
      machineId: string
      plannedDate: string
      plannedWeightKg: number
    }
    const state = db.get()

    const machine = state.machines.find((m) => m.machineId === machineId)
    const width = machine?.maxWidth ?? 1380
    const thickness = machine?.supportedThicknesses[0] ?? 6

    const recordId = `RFR-${Date.now()}`
    const record: ProductionRecord = {
      recordId,
      process: '生箔',
      sourceId: machineId,
      machineId,
      plannedDate,
      actualWeightKg: plannedWeightKg,
      yieldRate: 0.97,
      status: 'DONE',
    }

    const rollId = `RF-${Date.now()}`
    const newRoll: RawFoilInventory = {
      rollId,
      machineId,
      thickness,
      width,
      weightKg: plannedWeightKg,
      status: 'AVAILABLE',
      createdAt: plannedDate,
    }

    const rawFoilPlanTasks = state.rawFoilPlanTasks.map((t) => {
      if (t.parent === machineId) return { ...t, progress: 1 }
      return t
    })

    db.patch({
      productionRecords: [...state.productionRecords, record],
      rawFoilInventory: [...state.rawFoilInventory, newRoll],
      rawFoilPlanTasks,
    })

    return ok({ record, newRoll })
  })
}
