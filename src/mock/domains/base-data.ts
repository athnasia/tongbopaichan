import type { FeatureCodeConfig, FeatureCodeVersion, MachineCapability, SchedulingRuleConfig } from '@/types/aps'

export interface BaseDataSeed {
  machines: MachineCapability[]
  rules: SchedulingRuleConfig
  featureCodeConfig: FeatureCodeConfig
  featureCodeVersions: FeatureCodeVersion[]
}

const machinesSeed: MachineCapability[] = [
  {
    machineId: 'A7',
    factory: 'A厂',
    system: '生箔',
    supportedThicknesses: [6, 8, 12],
    capableStrengths: ['高', '中'],
    maxWidth: 1380,
    minWidth: 300,
    standardRollLength: 6000,
  },
  {
    machineId: 'A8',
    factory: 'A厂',
    system: '生箔',
    supportedThicknesses: [8, 10, 12, 15],
    capableStrengths: ['高', '中', '普'],
    maxWidth: 1450,
    minWidth: 300,
    standardRollLength: 6200,
  },
  {
    machineId: 'A9',
    factory: 'A厂',
    system: '生箔',
    supportedThicknesses: [6, 10, 15],
    capableStrengths: ['高', '中', '普'],
    maxWidth: 1380,
    minWidth: 250,
    standardRollLength: 5800,
  },
  {
    machineId: 'L1',
    factory: 'A厂',
    system: '烘烤',
    supportedThicknesses: [6, 8, 10, 12],
    capableStrengths: ['高', '中', '普'],
    maxWidth: 1450,
    minWidth: 300,
    standardRollLength: 6000,
  },
  {
    machineId: 'L2',
    factory: 'A厂',
    system: '烘烤',
    supportedThicknesses: [6, 8, 10, 12, 15],
    capableStrengths: ['高', '中', '普'],
    maxWidth: 1450,
    minWidth: 300,
    standardRollLength: 6000,
  },
  {
    machineId: 'SL01',
    factory: 'A厂',
    system: '分切',
    supportedThicknesses: [6, 8, 10, 12],
    capableStrengths: ['高', '中', '普'],
    maxWidth: 1380,
    minWidth: 120,
    standardRollLength: 4500,
  },
  {
    machineId: 'SL02',
    factory: 'A厂',
    system: '分切',
    supportedThicknesses: [6, 8, 10, 12, 15],
    capableStrengths: ['高', '中', '普'],
    maxWidth: 1450,
    minWidth: 120,
    standardRollLength: 4500,
  },
  {
    machineId: 'SL03',
    factory: 'A厂',
    system: '分切',
    supportedThicknesses: [6, 8, 10],
    capableStrengths: ['高', '中', '普'],
    maxWidth: 900,
    minWidth: 100,
    standardRollLength: 4200,
  },
]

const rulesSeed: SchedulingRuleConfig = {
  minTrimMargin: 10,
  maxWasteTolerance: 120,
  minRawFoilBatchKg: 1000,
  crossPeriodWarningDays: 7,
  narrowRollReturnThresholdMm: 150,
}

const featureCodeConfigSeed: FeatureCodeConfig = {
  strengthMap: { '高': 'A', '中': 'B', '普': 'C' },
  urgencyMap: { '急1': '1', '急2': '2', '常规': '0', '配': '3' },
  thicknessLength: 3,
  widthLength: 4,
  totalLength: 9,
}

const featureCodeVersionsSeed: FeatureCodeVersion[] = [
  {
    versionId: 'FCC-001',
    enabled: true,
    notes: '初始版本',
    status: 'SUBMITTED',
    createdBy: '管理员',
    createdAt: '2025-01-01T00:00:00.000Z',
    totalLength: 9,
    thicknessLength: 3,
    widthLength: 4,
    strengthMap: { '高': 'A', '中': 'B', '普': 'C' },
    urgencyMap: { '急1': '1', '急2': '2', '常规': '0', '配': '3' },
  },
]

export function createBaseDataSeed(): BaseDataSeed {
  return {
    machines: structuredClone(machinesSeed),
    rules: structuredClone(rulesSeed),
    featureCodeConfig: structuredClone(featureCodeConfigSeed),
    featureCodeVersions: structuredClone(featureCodeVersionsSeed),
  }
}
