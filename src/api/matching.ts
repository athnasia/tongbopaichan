import http from './http'

export const matchingApi = {
  runAutoMatch: () => http.post('/api/matching/run'),
  resetMatch: () => http.post('/api/matching/reset'),
  manualAssign: (orderId: string, rollId: string) =>
    http.post('/api/matching/manual', { orderId, rollId }),
  pushToRawFoil: () => http.post('/api/matching/push-to-raw-foil'),
}
