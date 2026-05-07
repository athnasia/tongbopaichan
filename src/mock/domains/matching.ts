import type { ProductionOrder } from '@/types/aps'

export interface MatchingSeed {
  // DemandGroup and OrderAllocation are removed — replaced by frontend GroupBy on productionOrders
  _unused?: never
}

export function createMatchingSeed(_productionOrders: ProductionOrder[]): MatchingSeed {
  return {}
}
