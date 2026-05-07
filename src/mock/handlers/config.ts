import Mock from 'mockjs'
import { db } from '@/mock/db'
import type { FeatureCodeConfig, FeatureCodeVersion, MachineCapability, SchedulingRuleConfig } from '@/types/aps'

type Opts = { url: string; type: string; body: string }
const ok = (data: unknown) => ({ code: 200, data, message: 'ok' })

export function registerConfigHandlers() {
  Mock.mock(/\/api\/config\/rules$/, 'get', () => ok(db.get().rules))

  Mock.mock(/\/api\/config\/rules$/, 'put', (opts: Opts) => {
    const rules = JSON.parse(opts.body) as SchedulingRuleConfig
    db.patch({ rules })
    return ok(rules)
  })

  Mock.mock(/\/api\/config\/machines$/, 'get', () => ok(db.get().machines))

  Mock.mock(/\/api\/config\/machines$/, 'post', (opts: Opts) => {
    const machine = JSON.parse(opts.body) as MachineCapability
    const machines = [...db.get().machines, machine]
    db.patch({ machines })
    return ok(machine)
  })

  Mock.mock(/\/api\/config\/machines\/[^/?]+$/, 'put', (opts: Opts) => {
    const machine = JSON.parse(opts.body) as MachineCapability
    const machines = db.get().machines.map((m) =>
      m.machineId === machine.machineId ? machine : m,
    )
    db.patch({ machines })
    return ok(machine)
  })

  Mock.mock(/\/api\/config\/machines\/[^/?]+$/, 'delete', (opts: Opts) => {
    const m = opts.url.match(/\/api\/config\/machines\/([^/?]+)$/)
    const id = m?.[1]
    const machines = db.get().machines.filter((mc) => mc.machineId !== id)
    db.patch({ machines })
    return ok(null)
  })

  Mock.mock(/\/api\/config\/feature-code$/, 'get', () => ok(db.get().featureCodeConfig))

  Mock.mock(/\/api\/config\/feature-code$/, 'put', (opts: Opts) => {
    const featureCodeConfig = JSON.parse(opts.body) as FeatureCodeConfig
    db.patch({ featureCodeConfig })
    return ok(featureCodeConfig)
  })

  Mock.mock(/\/api\/config\/feature-code-versions$/, 'get', () => ok(db.get().featureCodeVersions))

  Mock.mock(/\/api\/config\/feature-code-versions$/, 'post', (opts: Opts) => {
    const state = db.get()
    const base = JSON.parse(opts.body) as Partial<FeatureCodeVersion>
    const nextNum = state.featureCodeVersions.length + 1
    const versionId = `FCC-${String(nextNum).padStart(3, '0')}`
    const activeVersion = state.featureCodeVersions.find((v) => v.enabled)
    const newVersion: FeatureCodeVersion = {
      versionId,
      enabled: false,
      notes: base.notes ?? '',
      status: 'DRAFT',
      createdBy: '管理员',
      createdAt: new Date().toISOString(),
      totalLength: activeVersion?.totalLength ?? 9,
      thicknessLength: activeVersion?.thicknessLength ?? 3,
      widthLength: activeVersion?.widthLength ?? 4,
      strengthMap: activeVersion ? { ...activeVersion.strengthMap } : { '高': 'A', '中': 'B', '普': 'C' },
      urgencyMap: activeVersion ? { ...activeVersion.urgencyMap } : { '急1': '1', '急2': '2', '常规': '0', '配': '3' },
    }
    const featureCodeVersions = [...state.featureCodeVersions, newVersion]
    db.patch({ featureCodeVersions })
    return ok(newVersion)
  })

  Mock.mock(/\/api\/config\/feature-code-versions\/[^/]+\/submit$/, 'post', (opts: Opts) => {
    const m = opts.url.match(/\/api\/config\/feature-code-versions\/([^/]+)\/submit$/)
    const id = m?.[1]
    const featureCodeVersions = db.get().featureCodeVersions.map((v) =>
      v.versionId === id && v.status === 'DRAFT' ? { ...v, status: 'SUBMITTED' as const } : v,
    )
    db.patch({ featureCodeVersions })
    return ok(featureCodeVersions.find((v) => v.versionId === id))
  })

  Mock.mock(/\/api\/config\/feature-code-versions\/[^/]+\/enable$/, 'post', (opts: Opts) => {
    const m = opts.url.match(/\/api\/config\/feature-code-versions\/([^/]+)\/enable$/)
    const id = m?.[1]
    const state = db.get()
    const target = state.featureCodeVersions.find((v) => v.versionId === id)
    if (!target || target.status !== 'SUBMITTED') return ok(null)
    const featureCodeVersions = state.featureCodeVersions.map((v) => ({
      ...v,
      enabled: v.versionId === id,
    }))
    const featureCodeConfig: FeatureCodeConfig = {
      strengthMap: { ...target.strengthMap },
      urgencyMap: { ...target.urgencyMap },
      thicknessLength: target.thicknessLength,
      widthLength: target.widthLength,
      totalLength: target.totalLength,
    }
    db.patch({ featureCodeVersions, featureCodeConfig })
    return ok(featureCodeVersions.find((v) => v.versionId === id))
  })

  Mock.mock(/\/api\/config\/feature-code-versions\/[^/]+$/, 'put', (opts: Opts) => {
    const m = opts.url.match(/\/api\/config\/feature-code-versions\/([^/?]+)$/)
    const id = m?.[1]
    const patch = JSON.parse(opts.body) as Partial<FeatureCodeVersion>
    const featureCodeVersions = db.get().featureCodeVersions.map((v) =>
      v.versionId === id && v.status === 'DRAFT' ? { ...v, ...patch } : v,
    )
    db.patch({ featureCodeVersions })
    return ok(featureCodeVersions.find((v) => v.versionId === id))
  })

  Mock.mock(/\/api\/config\/reset-demo$/, 'post', () => {
    db.reset()
    return ok(db.get())
  })
}
