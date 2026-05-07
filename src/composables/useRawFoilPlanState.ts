import { reactive } from 'vue'

export interface RawFoilSlot {
  slotId: string
  productionOrderId: string
  machineId: string
  date: string
  plannedWeightKg: number
  thickness: number
  width: number
  strength: string
}

// Module-singleton shared between RawFoilBucketBoard and RawFoilPlanView.
const rawFoilSlots = reactive<Record<string, RawFoilSlot>>({})

function removeSlot(slotId: string) {
  delete rawFoilSlots[slotId]
}

export function useRawFoilPlanState() {
  return { rawFoilSlots, removeSlot }
}
