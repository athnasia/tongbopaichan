import type { RawFoilInventory, TreatedFoilInventory } from '@/types/aps'
import http from './http'

export const inventoryApi = {
  getRawFoil: () => http.get<RawFoilInventory[]>('/api/inventory/raw-foil'),
  getTreated: () => http.get<TreatedFoilInventory[]>('/api/inventory/treated'),
  getFinished: () => http.get('/api/inventory/finished'),
  updateTreated: (rollId: string, patch: Partial<TreatedFoilInventory>) =>
    http.put<TreatedFoilInventory>(`/api/inventory/treated/${rollId}`, patch),
}
