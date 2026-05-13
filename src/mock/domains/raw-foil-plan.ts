import type { GanttTask } from '@/types/demo'

export interface RawFoilPlanSeed {
  rawFoilPlanTasks: GanttTask[]
}

const rawFoilPlanTasksSeed: GanttTask[] = [
  {
    id: 'A7',
    text: 'A7 生箔系统',
    start_date: '2026-05-01',
    duration: 14,
    progress: 0.45,
    open: true,
  },
  {
    id: 'A7-1',
    text: 'DG-6-H 缺口 2000kg',
    start_date: '2026-05-01',
    duration: 3,
    progress: 0.7,
    parent: 'A7',
    color: '#2563eb',
  },
  {
    id: 'A8',
    text: 'A8 生箔系统',
    start_date: '2026-05-02',
    duration: 14,
    progress: 0.3,
    open: true,
  },
  {
    id: 'A8-1',
    text: 'DG-8-M 缺口 800kg',
    start_date: '2026-05-03',
    duration: 2,
    progress: 0.55,
    parent: 'A8',
    color: '#0f766e',
  },
  {
    id: 'A8-2',
    text: 'DG-12-H 缺口 800kg',
    start_date: '2026-05-08',
    duration: 2,
    progress: 0.15,
    parent: 'A8',
    color: '#7c3aed',
  },
  {
    id: 'A9',
    text: 'A9 生箔系统',
    start_date: '2026-05-01',
    duration: 14,
    progress: 0.2,
    open: true,
  },
  {
    id: 'A9-1',
    text: 'DG-10-P 缺口 2400kg',
    start_date: '2026-05-06',
    duration: 4,
    progress: 0.12,
    parent: 'A9',
    color: '#ea580c',
  },
]

export function createRawFoilPlanSeed(): RawFoilPlanSeed {
  return {
    rawFoilPlanTasks: structuredClone(rawFoilPlanTasksSeed),
  }
}
