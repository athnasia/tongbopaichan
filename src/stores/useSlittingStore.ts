import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { inventoryApi } from '@/api/inventory'
import { ordersApi } from '@/api/orders'
import { useConfigStore } from '@/stores/useConfigStore'
import type { ProductionOrder, SlittingPlan, TreatedFoilInventory } from '@/types/aps'

export const useSlittingStore = defineStore('slitting-manual', () => {
  const orders = ref<ProductionOrder[]>([])
  const inventories = ref<TreatedFoilInventory[]>([])
  const draftPlans = ref<SlittingPlan[]>([])

  const pendingOrders = computed(() =>
    orders.value.filter((o) => {
      const shortage = o.targetWeightKg - o.fulfilledKg - o.lockedWeightKg
      return o.status !== 'COMPLETED' && shortage > 0
    }),
  )

  const availableRolls = computed(() =>
    inventories.value.filter(
      (i) => i.status === 'AVAILABLE' && i.weightKg - i.lockedWeightKg > 0,
    ),
  )

  async function loadData() {
    const [poR, trR] = await Promise.all([
      ordersApi.getProductionOrders(),
      inventoryApi.getTreated(),
    ])
    orders.value = poR.data as ProductionOrder[]
    inventories.value = trR.data as TreatedFoilInventory[]
  }

  function saveDraftPlan(payload: { roll: TreatedFoilInventory; orders: ProductionOrder[] }) {
    const configStore = useConfigStore()
    const trimMargin = configStore.ruleConfig?.minTrimMargin ?? 10

    const storeRoll = inventories.value.find((i) => i.rollId === payload.roll.rollId)
    if (!storeRoll) return

    const rollAvailable = storeRoll.weightKg - storeRoll.lockedWeightKg

    type OrderItem = { ref: ProductionOrder; shortage: number }
    const storeOrders: OrderItem[] = payload.orders
      .map((o) => ({
        ref: orders.value.find((x) => x.productionOrderId === o.productionOrderId)!,
        shortage: 0,
      }))
      .filter((item) => !!item.ref)

    for (const item of storeOrders) {
      item.shortage = Math.max(
        0,
        item.ref.targetWeightKg - item.ref.fulfilledKg - item.ref.lockedWeightKg,
      )
    }

    const totalShortage = storeOrders.reduce((s, item) => s + item.shortage, 0)
    const consumeKg = Math.min(rollAvailable, totalShortage)

    storeRoll.lockedWeightKg += consumeKg

    const combinedOrders: SlittingPlan['combinedOrders'] = []
    for (const item of storeOrders) {
      const orderLock = totalShortage > 0 ? consumeKg * (item.shortage / totalShortage) : 0
      item.ref.lockedWeightKg += orderLock
      combinedOrders.push({
        orderId: item.ref.productionOrderId,
        width: item.ref.width,
        weightKg: orderLock,
      })
    }

    const totalWidthUsed = payload.orders.reduce((s, o) => s + o.width, 0)
    const returnWidth = storeRoll.width - totalWidthUsed - trimMargin

    const plan: SlittingPlan = {
      planId: `SP-DRAFT-${Date.now()}`,
      targetRollId: storeRoll.rollId,
      plannedDate: new Date().toISOString().slice(0, 10),
      combinedOrders,
      totalWidthUsed,
      trimWasteWidth: trimMargin,
      returnWidth,
      efficiency: storeRoll.width > 0 ? totalWidthUsed / storeRoll.width : 0,
      isCrossPeriod: false,
      planStatus: 'DRAFT',
      createdBy: '计划员',
      createdAt: new Date().toISOString(),
    }

    draftPlans.value.push(plan)
  }

  return { orders, inventories, draftPlans, pendingOrders, availableRolls, loadData, saveDraftPlan }
})
