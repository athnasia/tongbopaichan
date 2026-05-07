import Mock from 'mockjs'
import { db } from '@/mock/db'
import type { RawFoilInventory, TreatedFoilInventory } from '@/types/aps'

type Opts = { url: string; type: string; body: string }
const ok = (data: unknown) => ({ code: 200, data, message: 'ok' })

export function registerInventoryHandlers() {
  Mock.mock(/\/api\/inventory\/raw-foil$/, 'get', () => ok(db.get().rawFoilInventory))

  Mock.mock(/\/api\/inventory\/treated$/, 'get', () => ok(db.get().treatedFoilInventory))

  Mock.mock(/\/api\/inventory\/finished$/, 'get', () => ok(db.get().finishedProductInventory))

  Mock.mock(/\/api\/inventory\/treated$/, 'post', (opts: Opts) => {
    const item = JSON.parse(opts.body) as TreatedFoilInventory
    const treatedFoilInventory = [...db.get().treatedFoilInventory, item]
    db.patch({ treatedFoilInventory })
    return ok(item)
  })

  Mock.mock(/\/api\/inventory\/treated\/[^/?]+$/, 'put', (opts: Opts) => {
    const m = opts.url.match(/\/api\/inventory\/treated\/([^/?]+)$/)
    const rollId = m?.[1]
    const patch = JSON.parse(opts.body) as Partial<TreatedFoilInventory>
    const treatedFoilInventory = db.get().treatedFoilInventory.map((inv) =>
      inv.rollId === rollId ? { ...inv, ...patch } : inv,
    )
    db.patch({ treatedFoilInventory })
    return ok(treatedFoilInventory.find((i) => i.rollId === rollId))
  })

  Mock.mock(/\/api\/inventory\/raw-foil\/[^/?]+$/, 'put', (opts: Opts) => {
    const m = opts.url.match(/\/api\/inventory\/raw-foil\/([^/?]+)$/)
    const rollId = m?.[1]
    const patch = JSON.parse(opts.body) as Partial<RawFoilInventory>
    const rawFoilInventory = db.get().rawFoilInventory.map((inv) =>
      inv.rollId === rollId ? { ...inv, ...patch } : inv,
    )
    db.patch({ rawFoilInventory })
    return ok(rawFoilInventory.find((i) => i.rollId === rollId))
  })
}
