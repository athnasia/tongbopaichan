import type { ScrapRecord } from '@/types/demo'

export interface ScrapSeed {
  scrapRecords: ScrapRecord[]
}

const scrapRecordsSeed: ScrapRecord[] = [
  {
    scrapId: 'SC-001',
    process: '分切',
    machineId: 'SL-01',
    weightKg: 85,
    reason: '修边废边',
    grade: 'B',
    createdAt: '2026-05-01 16:20',
  },
  {
    scrapId: 'SC-002',
    process: '烘烤',
    machineId: 'BK-L2',
    weightKg: 42,
    reason: '表面处理返工损失',
    grade: 'C',
    createdAt: '2026-05-07 09:10',
  },
]

export function createScrapSeed(): ScrapSeed {
  return {
    scrapRecords: structuredClone(scrapRecordsSeed),
  }
}
