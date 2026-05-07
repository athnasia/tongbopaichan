import { reactive } from 'vue'

export interface BakingSlot {
  slotId: string
  rollId: string
  machineId: string
  date: string
  weightKg: number
}

// Module-singleton shared between BakingBucketBoard and BakingPlanView.
const bakingSlots = reactive<Record<string, BakingSlot>>({})

function removeSlot(slotId: string) {
  delete bakingSlots[slotId]
}

export function useBakingState() {
  return { bakingSlots, removeSlot }
}
