import http from './http'

export const rawFoilApi = {
  getPlans: () => http.get('/api/raw-foil-plans'),
  getRecords: () => http.get('/api/raw-foil-records'),
  createRecord: (payload: { machineId: string; plannedDate: string; plannedWeightKg: number }) =>
    http.post('/api/raw-foil-records', payload),
  getAggregatedPlans: () => http.get('/api/aggregated-raw-foil-plans'),
  generateWeeklyPlans: () => http.post('/api/aggregated-raw-foil-plans/generate', {}),
  completeAggregatedPlan: (planId: string, payload: { actualWeightKg: number; yieldRate: number }) =>
    http.post(`/api/aggregated-raw-foil-plans/${planId}/complete`, payload),
}
