import { registerBakingHandlers } from './handlers/baking'
import { registerConfigHandlers } from './handlers/config'
import { registerInventoryHandlers } from './handlers/inventory'
import { registerMatchingHandlers } from './handlers/matching'
import { registerOrderHandlers } from './handlers/orders'
import { registerRawFoilHandlers } from './handlers/raw-foil'
import { registerSlittingHandlers } from './handlers/slitting'
import { registerAggregatedPlanHandlers } from './handlers/aggregated-plans'

registerConfigHandlers()
registerOrderHandlers()
registerMatchingHandlers()
registerInventoryHandlers()
registerRawFoilHandlers()
registerBakingHandlers()
registerSlittingHandlers()
registerAggregatedPlanHandlers()
