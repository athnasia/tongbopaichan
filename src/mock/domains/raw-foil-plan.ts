import type { GanttTask } from '@/types/demo'

export interface RawFoilPlanSeed {
  rawFoilPlanTasks: GanttTask[]
}

const rawFoilPlanTasksSeed: GanttTask[] = [
  {
    id: 'RF-A7',
    text: 'RF-A7 生箔机台',
    start_date: '2026-05-01',
    duration: 14,
    progress: 0.45,
    open: true,
  },
  {
    id: 'RF-A7-1',
    text: 'DG-6-H 缺口 2000kg',
    start_date: '2026-05-01',
    duration: 3,
    progress: 0.7,
    parent: 'RF-A7',
    color: '#2563eb',
  },
  {
    id: 'RF-A8',
    text: 'RF-A8 生箔机台',
    start_date: '2026-05-02',
    duration: 14,
    progress: 0.3,
    open: true,
  },
  {
    id: 'RF-A8-1',
    text: 'DG-8-M 缺口 800kg',
    start_date: '2026-05-03',
    duration: 2,
    progress: 0.55,
    parent: 'RF-A8',
    color: '#0f766e',
  },
  {
    id: 'RF-A8-2',
    text: 'DG-12-H 缺口 800kg',
    start_date: '2026-05-08',
    duration: 2,
    progress: 0.15,
    parent: 'RF-A8',
    color: '#7c3aed',
  },
  {
    id: 'RF-A9',
    text: 'RF-A9 生箔机台',
    start_date: '2026-05-01',
    duration: 14,
    progress: 0.2,
    open: true,
  },
  {
    id: 'RF-A9-1',
    text: 'DG-10-P 缺口 2400kg',
    start_date: '2026-05-06',
    duration: 4,
    progress: 0.12,
    parent: 'RF-A9',
    color: '#ea580c',
  },
]

export function createRawFoilPlanSeed(): RawFoilPlanSeed {
  return {
    rawFoilPlanTasks: structuredClone(rawFoilPlanTasksSeed),
  }
}
