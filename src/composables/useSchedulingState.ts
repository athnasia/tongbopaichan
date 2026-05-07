import { reactive } from 'vue'

export interface ScheduledSlot {
  slotId: string
  originalPlanId: string
  machineId: string
  date: string
  scheduledKg: number
  fullPlanWeight: number  // total weight of the source plan (used to compute remaining without re-fetching)
}

// Module-singleton reactive records shared between the board and the plan list.
// scheduledQtyRecord[planId] = total kg across all slots for this plan in current session.
// remainingQtyRecord[planId] = kg still unscheduled.
// scheduledSlots[slotId]    = one entry per cell-drop (allows same plan in multiple cells).
const scheduledQtyRecord = reactive<Record<string, number>>({})
const remainingQtyRecord = reactive<Record<string, number>>({})
const scheduledSlots = reactive<Record<string, ScheduledSlot>>({})

function removeSlot(slotId: string) {
  const slot = scheduledSlots[slotId]
  if (!slot) return
  const { originalPlanId, fullPlanWeight } = slot
  delete scheduledSlots[slotId]

  const newTotal = Object.values(scheduledSlots)
    .filter((s) => s.originalPlanId === originalPlanId)
    .reduce((sum, s) => sum + s.scheduledKg, 0)

  if (newTotal > 0) {
    scheduledQtyRecord[originalPlanId] = newTotal
    remainingQtyRecord[originalPlanId] = fullPlanWeight - newTotal
  } else {
    delete scheduledQtyRecord[originalPlanId]
    delete remainingQtyRecord[originalPlanId]
  }
}

export function useSchedulingState() {
  return { scheduledQtyRecord, remainingQtyRecord, scheduledSlots, removeSlot }
}
