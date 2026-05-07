import http from './http'

export const slittingApi = {
  getPlans: () => http.get('/api/slitting-plans'),
  generatePlans: () => http.post('/api/slitting-plans/generate'),
  releasePlan: (planId: string) => http.post(`/api/slitting-plans/${planId}/release`),
  updatePlan: (planId: string, patch: { machineId?: string; plannedDate?: string }) =>
    http.patch(`/api/slitting-plans/${planId}`, patch),
  createManualPlan: (payload: { targetRollId: string; orderIds: string[]; plannedDate: string; createdBy: string }) =>
    http.post('/api/slitting-plans/manual', payload),
  getOrders: () => http.get('/api/slitting-orders'),
  execute: (dispatchId: string, payload: { actualWeightKg: number; yieldRate: number }) =>
    http.post(`/api/slitting-orders/${dispatchId}/execute`, payload),
  getRecords: () => http.get('/api/production-records'),
  getScrap: () => http.get('/api/scrap-records'),
  getPlanTasks: () => http.get('/api/slitting-plan-tasks'),
}
