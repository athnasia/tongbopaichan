import Mock from 'mockjs'
import { db } from '@/mock/db'
import { generateFeatureCode } from '@/utils/featureCode'
import type { FeatureCodeConfig, ProductionOrder, Strength } from '@/types/aps'

type Opts = { url: string; type: string; body: string }
const ok = (data: unknown) => ({ code: 200, data, message: 'ok' })

function versionConfig(state: ReturnType<typeof db.get>, versionId: string): FeatureCodeConfig {
  const version = state.featureCodeVersions.find((v) => v.versionId === versionId)
  if (version) {
    return {
      strengthMap: version.strengthMap,
      urgencyMap: version.urgencyMap,
      thicknessLength: version.thicknessLength,
      widthLength: version.widthLength,
      totalLength: version.totalLength,
    }
  }
  return state.featureCodeConfig
}

export function registerOrderHandlers() {
  Mock.mock(/\/api\/erp-orders$/, 'get', () => ok(db.get().rawOrders))

  Mock.mock(/\/api\/production-orders$/, 'get', () => ok(db.get().productionOrders))

  Mock.mock(/\/api\/production-orders$/, 'post', (opts: Opts) => {
    const { orderIds } = JSON.parse(opts.body) as { orderIds: string[] }
    const state = db.get()
    const activeVersionId = state.featureCodeVersions.find((v) => v.enabled)?.versionId ?? ''
    const cfg = versionConfig(state, activeVersionId)
    const newOrders: ProductionOrder[] = []
    for (const orderId of orderIds) {
      const rawOrder = state.rawOrders.find((r) => r.orderId === orderId)
      if (!rawOrder) continue
      if (state.productionOrders.some((po) => po.rawOrder.orderId === orderId)) continue
      const mapping = state.attrMappings.find((m) => m.productCode === rawOrder.productCode)
      const nextNum = state.productionOrders.length + newOrders.length + 1
      const id = `PO-${String(nextNum).padStart(3, '0')}`
      const strength = mapping?.defaultStrength ?? ('普' as Strength)
      const urgency = '常规' as const
      newOrders.push({
        productionOrderId: id,
        rawOrder,
        thickness: rawOrder.thickness,
        width: rawOrder.width,
        strength,
        urgency,
        targetWeightKg: rawOrder.orderWeightKg,
        fulfilledKg: 0,
        lockedWeightKg: 0,
        deliveryDate: rawOrder.deliveryDate,
        isStrictQty: false,
        manualMachinePref: null,
        notes: '',
        reviewStatus: 'PENDING',
        status: 'APPROVED',
        featureCode: generateFeatureCode(rawOrder.thickness, rawOrder.width, strength, urgency, cfg),
        featureCodeVersionId: activeVersionId,
      })
    }
    const productionOrders = [...state.productionOrders, ...newOrders]
    db.patch({ productionOrders })
    return ok(productionOrders)
  })

  Mock.mock(/\/api\/production-orders\/[^/]+$/, 'put', (opts: Opts) => {
    const m = opts.url.match(/\/api\/production-orders\/([^/?]+)$/)
    const id = m?.[1]
    const patch = JSON.parse(opts.body) as Partial<Pick<ProductionOrder, 'urgency' | 'notes'>>
    const state = db.get()
    const productionOrders = state.productionOrders.map((po) => {
      if (po.productionOrderId !== id || po.reviewStatus !== 'PENDING') return po
      const updated = { ...po, ...patch }
      const cfg = versionConfig(state, po.featureCodeVersionId)
      updated.featureCode = generateFeatureCode(updated.rawOrder.thickness, updated.rawOrder.width, updated.strength, updated.urgency, cfg)
      return updated
    })
    db.patch({ productionOrders })
    return ok(productionOrders.find((po) => po.productionOrderId === id))
  })

  Mock.mock(/\/api\/production-orders\/[^/]+\/approve$/, 'post', (opts: Opts) => {
    const m = opts.url.match(/\/api\/production-orders\/([^/]+)\/approve$/)
    const id = m?.[1]
    return ok(approveOrderById(id ?? ''))
  })

  Mock.mock(/\/api\/production-orders\/[^/]+\/revoke$/, 'post', (opts: Opts) => {
    const m = opts.url.match(/\/api\/production-orders\/([^/]+)\/revoke$/)
    const id = m?.[1]
    const productionOrders = db.get().productionOrders.map((po) =>
      po.productionOrderId === id ? { ...po, reviewStatus: 'PENDING' as const } : po,
    )
    db.patch({ productionOrders })
    return ok(db.get().productionOrders)
  })

  Mock.mock(/\/api\/production-orders\/batch-approve$/, 'post', (opts: Opts) => {
    const { ids } = JSON.parse(opts.body) as { ids: string[] }
    ids.forEach((id) => approveOrderById(id))
    return ok(db.get().productionOrders)
  })
}

function approveOrderById(id: string) {
  const state = db.get()
  const po = state.productionOrders.find((p) => p.productionOrderId === id)
  if (!po || po.reviewStatus !== 'PENDING') return state.productionOrders
  const productionOrders = state.productionOrders.map((p) =>
    p.productionOrderId === id ? { ...p, reviewStatus: 'APPROVED' as const, status: 'APPROVED' as const } : p,
  )
  db.patch({ productionOrders })
  return productionOrders
}
