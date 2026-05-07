import { defineStore } from 'pinia'
import { ordersApi } from '@/api/orders'
import { matchingApi } from '@/api/matching'
import { inventoryApi } from '@/api/inventory'
import { rawFoilApi } from '@/api/raw-foil'
import { bakingApi } from '@/api/baking'
import { slittingApi } from '@/api/slitting'
import type {
  FinishedProductInventory,
  MachineCapability,
  ProductionOrder,
  RawErpOrder,
  RawFoilInventory,
  SchedulingRuleConfig,
  SlittingPlan,
  TreatedFoilInventory,
  ProductAttributeMapping,
} from '@/types/aps'
import type {
  DashboardMetric, DemandShortageRow, GanttTask, InventoryBucket,
  ProcessNodeSummary, ProductionRecord, ScrapRecord, SlittingDispatchOrder,
} from '@/types/demo'

interface ApsState {
  rawOrders: RawErpOrder[]
  attrMappings: ProductAttributeMapping[]
  productionOrders: ProductionOrder[]
  machines: MachineCapability[]
  rules: SchedulingRuleConfig | null
  rawFoilInventory: RawFoilInventory[]
  treatedFoilInventory: TreatedFoilInventory[]
  finishedProductInventory: FinishedProductInventory[]
  slittingPlans: SlittingPlan[]
  rawFoilPlanTasks: GanttTask[]
  bakingPlanTasks: GanttTask[]
  slittingPlanTasks: GanttTask[]
  slittingOrders: SlittingDispatchOrder[]
  productionRecords: ProductionRecord[]
  scrapRecords: ScrapRecord[]
  loading: boolean
}

export const useApsStore = defineStore('aps', {
  state: (): ApsState => ({
    rawOrders: [], attrMappings: [], productionOrders: [],
    machines: [], rules: null,
    rawFoilInventory: [], treatedFoilInventory: [], finishedProductInventory: [],
    slittingPlans: [],
    rawFoilPlanTasks: [], bakingPlanTasks: [], slittingPlanTasks: [],
    slittingOrders: [], productionRecords: [], scrapRecords: [], loading: false,
  }),

  getters: {
    approvedOrders: (state) => state.productionOrders.filter((p) => p.reviewStatus === 'APPROVED'),
    rawFoilMachines: (state) => state.machines.filter((m) => m.machineId.startsWith('RF-')),

    demandShortages: (state): DemandShortageRow[] =>
      state.productionOrders
        .filter((po) => po.reviewStatus === 'APPROVED')
        .map((po) => ({
          groupKey: `${po.thickness}-${po.strength}`,
          productionOrderId: po.productionOrderId,
          width: po.width,
          urgency: po.urgency,
          targetWeightKg: po.targetWeightKg,
          fulfilledKg: po.fulfilledKg,
          lockedWeightKg: po.lockedWeightKg,
          shortageKg: po.targetWeightKg - po.fulfilledKg - po.lockedWeightKg,
          thickness: po.thickness,
          strength: po.strength,
        })),

    dashboardMetrics: (state): DashboardMetric[] => {
      const approved = state.productionOrders.filter((p) => p.reviewStatus === 'APPROVED')
      const fulfilledKg = approved.reduce((s, p) => s + p.fulfilledKg, 0)
      const shortageKg = approved.reduce((s, p) => s + Math.max(0, p.targetWeightKg - p.fulfilledKg - p.lockedWeightKg), 0)
      const treatedAvail = state.treatedFoilInventory.reduce((s, i) => s + (i.weightKg - i.lockedWeightKg), 0)
      return [
        { label: '已审核订单', value: `${approved.length}`, helper: `ERP散单 ${state.rawOrders.length} 条`, tone: 'primary' },
        { label: '已下发重量', value: `${fulfilledKg.toLocaleString()} kg`, helper: '已进入成品库', tone: 'success' },
        { label: '待生产生箔', value: `${shortageKg.toLocaleString()} kg`, helper: '进入生箔排产需求池', tone: 'warning' },
        { label: '熟箔可用量', value: `${treatedAvail.toLocaleString()} kg`, helper: '熟箔库可调配量', tone: 'primary' },
      ]
    },

    processNodes: (state): ProcessNodeSummary[] => [
      { key: 'orders', title: 'ERP散单/打标审核', route: '/orders/review', count: state.productionOrders.length, status: `${state.productionOrders.filter((p) => p.reviewStatus === 'APPROVED').length} 已审核`, detail: '' },
      { key: 'matching', title: '选配盘', route: '/matching', count: state.productionOrders.filter((p) => p.reviewStatus === 'APPROVED').length, status: `${state.productionOrders.filter((p) => p.lockedWeightKg > 0).length} 条已锁料`, detail: '' },
      { key: 'raw-foil', title: '生箔排产', route: '/raw-foil/plan', count: state.rawFoilPlanTasks.filter((t) => t.parent).length, status: `${state.productionRecords.filter((r) => r.process === '生箔').length} 条记录`, detail: '' },
      { key: 'baking', title: '烘烤计划', route: '/baking/plan', count: state.bakingPlanTasks.filter((t) => t.parent).length, status: `${state.rawFoilInventory.filter((i) => i.status === 'CONSUMED').length} 卷烘烤中`, detail: '' },
      { key: 'inventory', title: '熟箔库', route: '/inventory/treated', count: state.treatedFoilInventory.length, status: `${state.treatedFoilInventory.filter((i) => i.isSlitReturn).length} 卷窄卷`, detail: '' },
      { key: 'slitting', title: '分切计划/指令', route: '/slitting/plan', count: state.slittingPlans.length, status: `${state.slittingOrders.filter((o) => o.status !== '待下发').length} 条下发`, detail: '' },
    ],

    inventoryBuckets: (state): InventoryBucket[] => [
      {
        label: '生箔库',
        count: state.rawFoilInventory.filter((i) => i.status === 'AVAILABLE').length,
        totalWeightKg: state.rawFoilInventory.filter((i) => i.status === 'AVAILABLE').reduce((s, i) => s + i.weightKg, 0),
      },
      {
        label: '熟箔库',
        count: state.treatedFoilInventory.filter((i) => i.status === 'AVAILABLE').length,
        totalWeightKg: state.treatedFoilInventory.filter((i) => i.status === 'AVAILABLE').reduce((s, i) => s + i.weightKg, 0),
      },
      {
        label: '成品库',
        count: state.finishedProductInventory.filter((i) => i.status === 'IN_STOCK').length,
        totalWeightKg: state.finishedProductInventory.filter((i) => i.status === 'IN_STOCK').reduce((s, i) => s + i.weightKg, 0),
      },
    ],

    capacityChartData: () => [
      { category: '订单审核', value: 86 }, { category: '库存命中', value: 63 },
      { category: '生箔排产', value: 71 }, { category: '烘烤排程', value: 58 }, { category: '分切执行', value: 48 },
    ],

    inventoryChartData: (state) => [
      { category: '生箔库', value: state.rawFoilInventory.filter((i) => i.status === 'AVAILABLE').reduce((s, i) => s + i.weightKg, 0) },
      { category: '熟箔库', value: state.treatedFoilInventory.filter((i) => i.status === 'AVAILABLE').reduce((s, i) => s + i.weightKg - i.lockedWeightKg, 0) },
      { category: '成品库', value: state.finishedProductInventory.reduce((s, i) => s + i.weightKg, 0) },
    ],

    scrapChartData: (state) => {
      const totals = state.scrapRecords.reduce<Record<string, number>>((r, i) => {
        return { ...r, [i.process]: (r[i.process] ?? 0) + i.weightKg }
      }, {})
      return Object.entries(totals).map(([category, value]) => ({ category, value }))
    },
  },

  actions: {
    async init() {
      this.loading = true
      try {
        const [erpR, poR, rfInvR, trInvR, fnInvR, spR, soR, prR, scR, rfR, bkR, sptR] = await Promise.all([
          ordersApi.getErpOrders(),
          ordersApi.getProductionOrders(),
          inventoryApi.getRawFoil(),
          inventoryApi.getTreated(),
          inventoryApi.getFinished(),
          slittingApi.getPlans(),
          slittingApi.getOrders(),
          slittingApi.getRecords(),
          slittingApi.getScrap(),
          rawFoilApi.getPlans(),
          bakingApi.getPlans(),
          slittingApi.getPlanTasks(),
        ])
        this.rawOrders = erpR.data as RawErpOrder[]
        this.productionOrders = poR.data as ProductionOrder[]
        this.rawFoilInventory = rfInvR.data as RawFoilInventory[]
        this.treatedFoilInventory = trInvR.data as TreatedFoilInventory[]
        this.finishedProductInventory = fnInvR.data as FinishedProductInventory[]
        this.slittingPlans = spR.data as SlittingPlan[]
        this.slittingOrders = soR.data as SlittingDispatchOrder[]
        this.productionRecords = prR.data as ProductionRecord[]
        this.scrapRecords = scR.data as ScrapRecord[]
        this.rawFoilPlanTasks = rfR.data as GanttTask[]
        this.bakingPlanTasks = bkR.data as GanttTask[]
        this.slittingPlanTasks = sptR.data as GanttTask[]
      } finally {
        this.loading = false
      }
    },

    async refreshOrders() {
      const poR = await ordersApi.getProductionOrders()
      this.productionOrders = poR.data as ProductionOrder[]
    },

    async refreshInventory() {
      const [rfR, trR, fnR] = await Promise.all([
        inventoryApi.getRawFoil(),
        inventoryApi.getTreated(),
        inventoryApi.getFinished(),
      ])
      this.rawFoilInventory = rfR.data as RawFoilInventory[]
      this.treatedFoilInventory = trR.data as TreatedFoilInventory[]
      this.finishedProductInventory = fnR.data as FinishedProductInventory[]
    },

    async convertOrders(orderIds: string[]) {
      await ordersApi.convertOrders(orderIds)
      await this.refreshOrders()
    },
    async approveOrder(id: string) {
      await ordersApi.approveOrder(id)
      await this.refreshOrders()
    },
    async batchApprove(ids: string[]) {
      await ordersApi.batchApprove(ids)
      await this.refreshOrders()
    },
    async revokeOrder(id: string) {
      await ordersApi.revokeOrder(id)
      await this.refreshOrders()
    },
    async updateOrder(id: string, patch: Partial<ProductionOrder>) {
      await ordersApi.updateOrder(id, patch)
      await this.refreshOrders()
    },

    async runAutoMatch() {
      const res = await matchingApi.runAutoMatch()
      const d = res.data as { productionOrders: ProductionOrder[]; treatedFoilInventory: TreatedFoilInventory[] }
      this.productionOrders = d.productionOrders
      this.treatedFoilInventory = d.treatedFoilInventory
    },
    async resetMatch() {
      const res = await matchingApi.resetMatch()
      const d = res.data as { productionOrders: ProductionOrder[]; treatedFoilInventory: TreatedFoilInventory[] }
      this.productionOrders = d.productionOrders
      this.treatedFoilInventory = d.treatedFoilInventory
    },
    async manualAssign(orderId: string, rollId: string) {
      const res = await matchingApi.manualAssign(orderId, rollId)
      const d = res.data as { productionOrders: ProductionOrder[]; treatedFoilInventory: TreatedFoilInventory[] }
      if (d) {
        this.productionOrders = d.productionOrders
        this.treatedFoilInventory = d.treatedFoilInventory
      }
    },
    async pushToRawFoil() {
      const res = await matchingApi.pushToRawFoil()
      const d = res.data as { added: number; rawFoilPlanTasks: GanttTask[] }
      this.rawFoilPlanTasks = d.rawFoilPlanTasks
      return d.added
    },

    async generateSlittingPlans() {
      const res = await slittingApi.generatePlans()
      this.slittingPlans = res.data as SlittingPlan[]
      const sptR = await slittingApi.getPlanTasks()
      this.slittingPlanTasks = sptR.data as GanttTask[]
    },
    async createManualSlittingPlan(payload: { targetRollId: string; orderIds: string[]; plannedDate: string; createdBy: string }) {
      const res = await slittingApi.createManualPlan(payload)
      if (!res.data) throw new Error((res as { message?: string }).message ?? '创建失败')
      const [spR, poR, trR] = await Promise.all([
        slittingApi.getPlans(),
        ordersApi.getProductionOrders(),
        inventoryApi.getTreated(),
      ])
      this.slittingPlans = spR.data as SlittingPlan[]
      this.productionOrders = poR.data as ProductionOrder[]
      this.treatedFoilInventory = trR.data as TreatedFoilInventory[]
      return res.data as SlittingPlan
    },
    async updateSlittingPlanSchedule(payload: { planId: string; newMachineId: string; newDate: string }) {
      const plan = this.slittingPlans.find((p) => p.planId === payload.planId)
      if (plan) {
        plan.machineId = payload.newMachineId
        plan.plannedDate = payload.newDate
      }
      await slittingApi.updatePlan(payload.planId, {
        machineId: payload.newMachineId,
        plannedDate: payload.newDate,
      })
    },

    async releasePlan(planId: string) {
      await slittingApi.releasePlan(planId)
      const [spR, soR, poR, trR] = await Promise.all([
        slittingApi.getPlans(), slittingApi.getOrders(),
        ordersApi.getProductionOrders(), inventoryApi.getTreated(),
      ])
      this.slittingPlans = spR.data as SlittingPlan[]
      this.slittingOrders = soR.data as SlittingDispatchOrder[]
      this.productionOrders = poR.data as ProductionOrder[]
      this.treatedFoilInventory = trR.data as TreatedFoilInventory[]
    },
    async executeSlitting(dispatchId: string, payload: { actualWeightKg: number; yieldRate: number }) {
      await slittingApi.execute(dispatchId, payload)
      const [soR, prR, scR, trR, fnR] = await Promise.all([
        slittingApi.getOrders(), slittingApi.getRecords(), slittingApi.getScrap(),
        inventoryApi.getTreated(), inventoryApi.getFinished(),
      ])
      this.slittingOrders = soR.data as SlittingDispatchOrder[]
      this.productionRecords = prR.data as ProductionRecord[]
      this.scrapRecords = scR.data as ScrapRecord[]
      this.treatedFoilInventory = trR.data as TreatedFoilInventory[]
      this.finishedProductInventory = fnR.data as FinishedProductInventory[]
    },
    async confirmRawFoilProduction(machineId: string, plannedDate: string, plannedWeightKg: number) {
      await rawFoilApi.createRecord({ machineId, plannedDate, plannedWeightKg })
      const [prR, rfR, rfPlanR] = await Promise.all([
        slittingApi.getRecords(), inventoryApi.getRawFoil(), rawFoilApi.getPlans(),
      ])
      this.productionRecords = prR.data as ProductionRecord[]
      this.rawFoilInventory = rfR.data as RawFoilInventory[]
      this.rawFoilPlanTasks = rfPlanR.data as GanttTask[]
    },
    async reserveForBaking(rollIds: string[]) {
      await bakingApi.reserve(rollIds)
      const [rfR, prR] = await Promise.all([inventoryApi.getRawFoil(), slittingApi.getRecords()])
      this.rawFoilInventory = rfR.data as RawFoilInventory[]
      this.productionRecords = prR.data as ProductionRecord[]
    },
    async completeBaking(recordId: string) {
      await bakingApi.complete(recordId)
      const [trR, prR] = await Promise.all([inventoryApi.getTreated(), slittingApi.getRecords()])
      this.treatedFoilInventory = trR.data as TreatedFoilInventory[]
      this.productionRecords = prR.data as ProductionRecord[]
    },
  },
})
