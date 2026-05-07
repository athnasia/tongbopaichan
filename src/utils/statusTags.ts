/** Shared tag-type helpers — eliminates duplicated status→colour logic across views */

type TagType = 'success' | 'warning' | 'danger' | 'info' | 'primary' | ''

export function inventoryProcessStateTag(ps: string): TagType {
  if (ps === 'TREATED') return 'success'
  if (ps === 'RAW_FOIL') return 'warning'
  return ''
}

export function inventoryProcessStateStyle(ps: string): Record<string, string> {
  return ps === 'SLIT_RETURN'
    ? { color: '#722ED1', background: '#722ED118', borderColor: '#722ED150' }
    : {}
}

export function inventoryStatusTag(s: string): TagType {
  if (s === 'AVAILABLE') return 'success'
  if (s === 'RESERVED') return 'warning'
  return 'info'
}

export function slittingOrderStatusTag(s: string): TagType {
  if (s === '已执行') return 'success'
  if (s === '已下发') return 'warning'
  return 'info'
}

export function slittingPlanStatusTag(s: string): TagType {
  if (s === 'COMPLETED') return 'success'
  if (s === 'RELEASED') return 'warning'
  return 'info'
}

export function recordStatusTag(s: string): TagType {
  return s === 'DONE' ? 'success' : 'warning'
}

export function matchStatusTag(fulfilledKg: number, shortageKg: number) {
  if (shortageKg === 0) return { type: 'success' as TagType, label: '完全满足' }
  if (fulfilledKg === 0) return { type: 'danger' as TagType, label: '完全缺料' }
  return { type: 'warning' as TagType, label: '部分满足' }
}
