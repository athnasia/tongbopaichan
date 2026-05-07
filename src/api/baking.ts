import http from './http'

export const bakingApi = {
  getPlans: () => http.get('/api/baking-plans'),
  reserve: (rollIds: string[]) => http.post('/api/baking-plans/reserve', { rollIds }),
  getRecords: () => http.get('/api/baking-records'),
  complete: (recordId: string) => http.post(`/api/baking-records/${recordId}/complete`),
}
