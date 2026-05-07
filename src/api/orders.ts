import type { ProductionOrder } from '@/types/aps'
import http from './http'

export const ordersApi = {
  getErpOrders: () => http.get('/api/erp-orders'),
  getProductionOrders: () => http.get<ProductionOrder[]>('/api/production-orders'),
  convertOrders: (orderIds: string[]) => http.post<ProductionOrder[]>('/api/production-orders', { orderIds }),
  updateOrder: (id: string, patch: Partial<ProductionOrder>) => http.put(`/api/production-orders/${id}`, patch),
  approveOrder: (id: string) => http.post(`/api/production-orders/${id}/approve`),
  revokeOrder: (id: string) => http.post(`/api/production-orders/${id}/revoke`),
  batchApprove: (ids: string[]) => http.post<ProductionOrder[]>('/api/production-orders/batch-approve', { ids }),
}
