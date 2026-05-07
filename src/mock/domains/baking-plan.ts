import type { GanttTask } from '@/types/demo'

export interface BakingPlanSeed {
  bakingPlanTasks: GanttTask[]
}

const bakingPlanTasksSeed: GanttTask[] = [
  {
    id: 'BK-L1',
    text: 'BK-L1 烘烤线',
    start_date: '2026-05-02',
    duration: 12,
    progress: 0.5,
    open: true,
  },
  {
    id: 'BK-L1-1',
    text: 'ROLL-004 烘烤处理',
    start_date: '2026-05-03',
    duration: 2,
    progress: 0.9,
    parent: 'BK-L1',
    color: '#0891b2',
  },
  {
    id: 'BK-L2',
    text: 'BK-L2 烘烤线',
    start_date: '2026-05-02',
    duration: 12,
    progress: 0.25,
    open: true,
  },
  {
    id: 'BK-L2-1',
    text: 'ROLL-005 高精试制',
    start_date: '2026-05-07',
    duration: 2,
    progress: 0.2,
    parent: 'BK-L2',
    color: '#be123c',
  },
]

export function createBakingPlanSeed(): BakingPlanSeed {
  return {
    bakingPlanTasks: structuredClone(bakingPlanTasksSeed),
  }
}
