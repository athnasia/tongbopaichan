import type {
  FinishedProductInventory,
  RawFoilInventory,
  TreatedFoilInventory,
} from '@/types/aps'

export interface InventorySeed {
  rawFoilInventory: RawFoilInventory[]
  treatedFoilInventory: TreatedFoilInventory[]
  finishedProductInventory: FinishedProductInventory[]
}

// RF-004 已领料 (CONSUMED) 进入烘烤，其余可用于烘烤排产拖拽池
const rawFoilSeed: RawFoilInventory[] = [
  { rollId: 'RF-001', machineId: 'A7', thickness: 6,  width: 1380, weightKg: 2000, status: 'AVAILABLE', createdAt: '2026-04-28' },
  { rollId: 'RF-002', machineId: 'A8', thickness: 8,  width: 1380, weightKg: 1600, status: 'AVAILABLE', createdAt: '2026-04-29' },
  { rollId: 'RF-003', machineId: 'A9', thickness: 10, width: 1450, weightKg: 3600, status: 'AVAILABLE', createdAt: '2026-04-30' },
  { rollId: 'RF-004', machineId: 'A7', thickness: 12, width: 1450, weightKg: 1500, status: 'CONSUMED',  createdAt: '2026-04-25' },
  { rollId: 'RF-005', machineId: 'A9', thickness: 15, width: 1450, weightKg: 1800, status: 'AVAILABLE', createdAt: '2026-05-01' },
  { rollId: 'RF-006', machineId: 'A8', thickness: 8,  width: 1380, weightKg: 1400, status: 'AVAILABLE', createdAt: '2026-05-03' },
]

// TR-001: SP-001 已完工消耗 1500kg，剩余 500kg；TR-007: RF-004 烘烤完成产出的熟箔
const treatedFoilSeed: TreatedFoilInventory[] = [
  {
    rollId: 'TR-001', sourceRawId: 'RF-PREV-1', isSlitReturn: false,
    thickness: 6, width: 1380, strength: '高', weightKg: 500, lockedWeightKg: 0,
    status: 'AVAILABLE', location: '分切备料区',
  },
  {
    rollId: 'TR-002', sourceTreatedId: 'TR-PREV-1', isSlitReturn: true,
    thickness: 6, width: 620, strength: '高', weightKg: 800, lockedWeightKg: 0,
    status: 'AVAILABLE', location: '窄卷暂存区',
  },
  {
    rollId: 'TR-003', sourceTreatedId: 'TR-PREV-2', isSlitReturn: true,
    thickness: 6, width: 190, strength: '高', weightKg: 320, lockedWeightKg: 0,
    status: 'AVAILABLE', location: '窄卷循环区',
  },
  {
    rollId: 'TR-004', sourceRawId: 'RF-PREV-2', isSlitReturn: false,
    thickness: 8, width: 1380, strength: '中', weightKg: 1600, lockedWeightKg: 0,
    status: 'AVAILABLE', location: '处理线下线区',
  },
  {
    rollId: 'TR-005', sourceRawId: 'RF-PREV-3', isSlitReturn: false,
    thickness: 8, width: 900, strength: '中', weightKg: 1200, lockedWeightKg: 0,
    status: 'AVAILABLE', location: '生箔库-B',
  },
  {
    rollId: 'TR-006', sourceRawId: 'RF-PREV-4', isSlitReturn: false,
    thickness: 15, width: 1450, strength: '中', weightKg: 1800, lockedWeightKg: 0,
    status: 'AVAILABLE', location: '生箔库-C',
  },
  // SP-001 完工后的余宽回库（returnWidth=170mm > 阈值150mm → 窄卷回库）
  {
    rollId: 'TR-SR-001', sourceTreatedId: 'TR-001', isSlitReturn: true,
    thickness: 6, width: 170, strength: '高', weightKg: 130, lockedWeightKg: 0,
    status: 'AVAILABLE', location: '窄卷循环区',
  },
  // RF-004 烘烤完成产出的熟箔
  {
    rollId: 'TR-007', sourceRawId: 'RF-004', isSlitReturn: false,
    thickness: 12, width: 1450, strength: '高', weightKg: 1450, lockedWeightKg: 0,
    status: 'AVAILABLE', location: '处理线下线区',
  },
]

// SP-001 完工产出（PO-001 / PO-002 各一卷成品，发运执行进度报表有数据）
const finishedProductSeed: FinishedProductInventory[] = [
  {
    rollId: 'FP-001',
    sourceTreatedId: 'TR-001',
    slittingPlanId: 'SP-001',
    orderId: 'PO-001',
    thickness: 6,
    width: 600,
    weightKg: 970,
    qualityGrade: 'A',
    status: 'IN_STOCK',
  },
  {
    rollId: 'FP-002',
    sourceTreatedId: 'TR-001',
    slittingPlanId: 'SP-001',
    orderId: 'PO-002',
    thickness: 6,
    width: 600,
    weightKg: 485,
    qualityGrade: 'A',
    status: 'PACKAGED',
  },
]

export function createInventorySeed(): InventorySeed {
  return {
    rawFoilInventory: structuredClone(rawFoilSeed),
    treatedFoilInventory: structuredClone(treatedFoilSeed),
    finishedProductInventory: structuredClone(finishedProductSeed),
  }
}
