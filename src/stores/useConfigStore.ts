import { defineStore } from 'pinia'
import { configApi } from '@/api/config'
import type { FeatureCodeConfig, FeatureCodeVersion, MachineCapability, SchedulingRuleConfig } from '@/types/aps'

export const useConfigStore = defineStore('config-base', {
  state: () => ({
    ruleConfig: null as SchedulingRuleConfig | null,
    machineList: [] as MachineCapability[],
    featureCodeConfig: null as FeatureCodeConfig | null,
    featureCodeVersions: [] as FeatureCodeVersion[],
    loading: false,
  }),
  actions: {
    async init() {
      this.loading = true
      try {
        const [rulesR, machinesR, fccR, versionsR] = await Promise.all([
          configApi.getRules(),
          configApi.getMachines(),
          configApi.getFeatureCodeConfig(),
          configApi.getFeatureCodeVersions(),
        ])
        this.ruleConfig = rulesR.data as SchedulingRuleConfig
        this.machineList = machinesR.data as MachineCapability[]
        this.featureCodeConfig = fccR.data as FeatureCodeConfig
        this.featureCodeVersions = versionsR.data as FeatureCodeVersion[]
      } finally {
        this.loading = false
      }
    },
    async updateRule(patch: Partial<SchedulingRuleConfig>) {
      const current = this.ruleConfig ?? ({} as SchedulingRuleConfig)
      const updated = { ...current, ...patch }
      const res = await configApi.updateRules(updated as SchedulingRuleConfig)
      this.ruleConfig = res.data as SchedulingRuleConfig
    },
    async addMachine(m: MachineCapability) {
      await configApi.createMachine(m)
      const res = await configApi.getMachines()
      this.machineList = res.data as MachineCapability[]
    },
    async editMachine(m: MachineCapability) {
      await configApi.updateMachine(m)
      const res = await configApi.getMachines()
      this.machineList = res.data as MachineCapability[]
    },
    async deleteMachine(machineId: string) {
      await configApi.deleteMachine(machineId)
      this.machineList = this.machineList.filter((mc) => mc.machineId !== machineId)
    },
    async updateFeatureCodeConfig(config: FeatureCodeConfig) {
      const res = await configApi.updateFeatureCodeConfig(config)
      this.featureCodeConfig = res.data as FeatureCodeConfig
    },
    async createVersion() {
      const res = await configApi.createFeatureCodeVersion({})
      const newVersion = res.data as FeatureCodeVersion
      this.featureCodeVersions = [...this.featureCodeVersions, newVersion]
      return newVersion
    },
    async updateVersion(id: string, patch: Partial<FeatureCodeVersion>) {
      const res = await configApi.updateFeatureCodeVersion(id, patch)
      const updated = res.data as FeatureCodeVersion
      this.featureCodeVersions = this.featureCodeVersions.map((v) => v.versionId === id ? updated : v)
      return updated
    },
    async submitVersion(id: string) {
      const res = await configApi.submitFeatureCodeVersion(id)
      const updated = res.data as FeatureCodeVersion
      this.featureCodeVersions = this.featureCodeVersions.map((v) => v.versionId === id ? updated : v)
      return updated
    },
    async enableVersion(id: string) {
      const res = await configApi.enableFeatureCodeVersion(id)
      const updated = res.data as FeatureCodeVersion
      this.featureCodeVersions = this.featureCodeVersions.map((v) => ({
        ...v,
        enabled: v.versionId === id,
      }))
      const target = this.featureCodeVersions.find((v) => v.versionId === id)
      if (target) {
        this.featureCodeConfig = {
          strengthMap: { ...target.strengthMap },
          urgencyMap: { ...target.urgencyMap },
          thicknessLength: target.thicknessLength,
          widthLength: target.widthLength,
          totalLength: target.totalLength,
        }
      }
      return updated
    },
  },
})
