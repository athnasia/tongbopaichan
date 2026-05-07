import type { ProductionRecord } from '@/types/demo'

export interface ExecutionSeed {
  productionRecords: ProductionRecord[]
}

const productionRecordsSeed: ProductionRecord[] = [
  // ── 生箔生产记录（sourceId = machineId，与 raw-foil handler 保持一致）──
  {
    recordId: 'RFR-001',
    process: '生箔',
    sourceId: 'RF-A7',
    machineId: 'RF-A7',
    plannedDate: '2026-04-28',
    actualWeightKg: 2000,
    yieldRate: 0.97,
    status: 'DONE',
  },
  {
    recordId: 'RFR-002',
    process: '生箔',
    sourceId: 'RF-A8',
    machineId: 'RF-A8',
    plannedDate: '2026-04-29',
    actualWeightKg: 1600,
    yieldRate: 0.96,
    status: 'DONE',
  },
  {
    recordId: 'RFR-003',
    process: '生箔',
    sourceId: 'RF-A9',
    machineId: 'RF-A9',
    plannedDate: '2026-04-30',
    actualWeightKg: 3600,
    yieldRate: 0.95,
    status: 'DONE',
  },

  // ── 烘烤生产记录（sourceId = 生箔卷号，与 baking handler 保持一致）──
  {
    recordId: 'BKR-001',
    process: '烘烤',
    sourceId: 'RF-004',       // RF-004 已领料进入烘烤，状态 CONSUMED
    machineId: 'BK-L1',
    plannedDate: '2026-05-02',
    actualWeightKg: 1450,
    yieldRate: 0.97,
    status: 'DONE',
  },
  {
    recordId: 'BKR-002',
    process: '烘烤',
    sourceId: 'RF-HIST-1',    // 历史批次，用于统计报表演示
    machineId: 'BK-L2',
    plannedDate: '2026-04-20',
    actualWeightKg: 1900,
    yieldRate: 0.95,
    status: 'DONE',
  },

  // ── 分切生产记录（sourceId = 分切计划号）──
  {
    recordId: 'SLR-001',
    process: '分切',
    sourceId: 'SP-001',       // SP-001 已完工
    machineId: 'SL-01',
    plannedDate: '2026-05-02',
    actualWeightKg: 1455,
    yieldRate: 0.97,
    status: 'DONE',
  },
]

export function createExecutionSeed(): ExecutionSeed {
  return {
    productionRecords: structuredClone(productionRecordsSeed),
  }
}
