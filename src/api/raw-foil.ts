import http from './http'

export const rawFoilApi = {
  getPlans: () => http.get('/api/raw-foil-plans'),
  getRecords: () => http.get('/api/raw-foil-records'),
  createRecord: (payload: { machineId: string; plannedDate: string; plannedWeightKg: number }) =>
    http.post('/api/raw-foil-records', payload),
}
