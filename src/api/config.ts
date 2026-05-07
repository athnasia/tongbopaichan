import type { FeatureCodeConfig, FeatureCodeVersion, MachineCapability, SchedulingRuleConfig } from '@/types/aps'
import http from './http'

export const configApi = {
  getRules: () => http.get<SchedulingRuleConfig>('/api/config/rules'),
  updateRules: (rules: SchedulingRuleConfig) => http.put<SchedulingRuleConfig>('/api/config/rules', rules),
  getMachines: () => http.get<MachineCapability[]>('/api/config/machines'),
  createMachine: (machine: MachineCapability) => http.post<MachineCapability>('/api/config/machines', machine),
  updateMachine: (machine: MachineCapability) => http.put<MachineCapability>(`/api/config/machines/${machine.machineId}`, machine),
  deleteMachine: (machineId: string) => http.delete(`/api/config/machines/${machineId}`),
  getFeatureCodeConfig: () => http.get<FeatureCodeConfig>('/api/config/feature-code'),
  updateFeatureCodeConfig: (config: FeatureCodeConfig) => http.put<FeatureCodeConfig>('/api/config/feature-code', config),
  getFeatureCodeVersions: () => http.get<FeatureCodeVersion[]>('/api/config/feature-code-versions'),
  createFeatureCodeVersion: (data: Partial<FeatureCodeVersion>) => http.post<FeatureCodeVersion>('/api/config/feature-code-versions', data),
  updateFeatureCodeVersion: (id: string, data: Partial<FeatureCodeVersion>) => http.put<FeatureCodeVersion>(`/api/config/feature-code-versions/${id}`, data),
  submitFeatureCodeVersion: (id: string) => http.post<FeatureCodeVersion>(`/api/config/feature-code-versions/${id}/submit`),
  enableFeatureCodeVersion: (id: string) => http.post<FeatureCodeVersion>(`/api/config/feature-code-versions/${id}/enable`),
  resetDemo: () => http.post('/api/config/reset-demo'),
}
