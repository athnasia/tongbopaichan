import { createBakingPlanSeed } from '@/mock/domains/baking-plan'
import { createBaseDataSeed } from '@/mock/domains/base-data'
import { createExecutionSeed } from '@/mock/domains/execution'
import { createInventorySeed } from '@/mock/domains/inventory'
import { createOrderDomainSeed } from '@/mock/domains/orders'
import { createRawFoilPlanSeed } from '@/mock/domains/raw-foil-plan'
import { createScrapSeed } from '@/mock/domains/scrap'
import { createSlittingSeed } from '@/mock/domains/slitting'
import type { ApsSeedState } from '@/types/demo'

export function createSeedState(): ApsSeedState {
  const { attrMappings, rawOrders, productionOrders } = createOrderDomainSeed()
  const { machines, rules, featureCodeConfig, featureCodeVersions } = createBaseDataSeed()
  const { rawFoilInventory, treatedFoilInventory, finishedProductInventory } = createInventorySeed()
  const { rawFoilPlanTasks } = createRawFoilPlanSeed()
  const { bakingPlanTasks } = createBakingPlanSeed()
  const { slittingPlans, slittingPlanTasks, slittingOrders } = createSlittingSeed()
  const { productionRecords } = createExecutionSeed()
  const { scrapRecords } = createScrapSeed()

  return {
    rawOrders,
    attrMappings,
    productionOrders,
    machines,
    rules,
    featureCodeConfig,
    featureCodeVersions,
    rawFoilInventory,
    treatedFoilInventory,
    finishedProductInventory,
    slittingPlans,
    rawFoilPlanTasks,
    bakingPlanTasks,
    slittingPlanTasks,
    slittingOrders,
    productionRecords,
    scrapRecords,
  }
}
