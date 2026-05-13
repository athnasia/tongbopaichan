import type { SlittingPlan } from '@/types/aps'
import type { GanttTask, SlittingDispatchOrder } from '@/types/demo'

export interface SlittingSeed {
  slittingPlans: SlittingPlan[]
  slittingPlanTasks: GanttTask[]
  slittingOrders: SlittingDispatchOrder[]
}

// SP-001: COMPLETED（已完工，DO-001 已执行，PO-001/002 部分履行）
// SP-002: RELEASED（已下发，本周可见，DO-002 已下发待执行）
// SP-003: DRAFT（草稿，本周可拖拽排程）
const slittingPlansSeed: SlittingPlan[] = [
  {
    planId: 'SP-001',
    targetRollId: 'TR-001',
    machineId: 'SL01',
    plannedDate: '2026-05-02',
    combinedOrders: [
      { orderId: 'PO-001', width: 600, weightKg: 1000 },
      { orderId: 'PO-002', width: 600, weightKg: 500 },
    ],
    totalWidthUsed: 1200,
    trimWasteWidth: 10,
    returnWidth: 170,   // 1380-1200-10=170 > 阈值150，产出 TR-SR-001
    efficiency: 0.87,
    isCrossPeriod: false,
    planStatus: 'COMPLETED',
    createdBy: '系统自动',
    createdAt: '2026-05-01T08:00:00.000Z',
  },
  {
    planId: 'SP-002',
    targetRollId: 'TR-004',
    machineId: 'SL02',
    plannedDate: '2026-05-07',
    combinedOrders: [{ orderId: 'PO-004', width: 520, weightKg: 800 }],
    totalWidthUsed: 520,
    trimWasteWidth: 10,
    returnWidth: 850,   // 1380-520-10=850 > 阈值，分切后产出余卷
    efficiency: 0.38,
    isCrossPeriod: false,
    planStatus: 'RELEASED',
    createdBy: '系统自动',
    createdAt: '2026-05-05T10:22:00.000Z',
  },
  {
    planId: 'SP-003',
    targetRollId: 'TR-002',
    machineId: 'SL03',
    plannedDate: '2026-05-09',
    combinedOrders: [{ orderId: 'PO-003', width: 400, weightKg: 800 }],
    totalWidthUsed: 400,
    trimWasteWidth: 10,
    returnWidth: 210,   // 620-400-10=210 > 阈值150
    efficiency: 0.65,
    isCrossPeriod: false,
    planStatus: 'DRAFT',
    createdBy: '张杰',
    createdAt: '2026-05-05T14:05:00.000Z',
  },
]

const slittingPlanTasksSeed: GanttTask[] = [
  {
    id: 'SL01',
    text: 'SL01 分切系统',
    start_date: '2026-05-01',
    duration: 10,
    progress: 0.65,
    open: true,
  },
  {
    id: 'SL01-1',
    text: 'SP-001 急单拼刀（已完工）',
    start_date: '2026-05-02',
    duration: 1,
    progress: 1,
    parent: 'SL01',
    color: '#1d4ed8',
  },
  {
    id: 'SL02',
    text: 'SL02 分切系统',
    start_date: '2026-05-01',
    duration: 10,
    progress: 0.4,
    open: true,
  },
  {
    id: 'SL02-1',
    text: 'SP-002 中强订单（已下发）',
    start_date: '2026-05-07',
    duration: 1,
    progress: 0.5,
    parent: 'SL02',
    color: '#0f766e',
  },
  {
    id: 'SL03',
    text: 'SL03 分切系统',
    start_date: '2026-05-01',
    duration: 10,
    progress: 0.15,
    open: true,
  },
  {
    id: 'SL03-1',
    text: 'SP-003 窄卷消化（草稿）',
    start_date: '2026-05-09',
    duration: 1,
    progress: 0,
    parent: 'SL03',
    color: '#c2410c',
  },
]

// DO-003 的 orderIds 修正为与 SP-003 combinedOrders 对齐（PO-003）
const slittingOrdersSeed: SlittingDispatchOrder[] = [
  {
    dispatchId: 'DO-001',
    planId: 'SP-001',
    machineId: 'SL01',
    plannedDate: '2026-05-02',
    shift: '白班',
    status: '已执行',           // SP-001 已完工，指令已执行
    orderIds: ['PO-001', 'PO-002'],
    operator: '张杰',
  },
  {
    dispatchId: 'DO-002',
    planId: 'SP-002',
    machineId: 'SL02',
    plannedDate: '2026-05-07',
    shift: '白班',
    status: '已下发',           // SP-002 已释放，待执行
    orderIds: ['PO-004'],
    operator: '李航',
  },
  {
    dispatchId: 'DO-003',
    planId: 'SP-003',
    machineId: 'SL03',
    plannedDate: '2026-05-09',
    shift: '白班',
    status: '待下发',
    orderIds: ['PO-003'],       // 修正：与 SP-003 combinedOrders 对齐
    operator: '陈曦',
  },
]

export function createSlittingSeed(): SlittingSeed {
  return {
    slittingPlans: structuredClone(slittingPlansSeed),
    slittingPlanTasks: structuredClone(slittingPlanTasksSeed),
    slittingOrders: structuredClone(slittingOrdersSeed),
  }
}
