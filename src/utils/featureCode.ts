import type { FeatureCodeConfig, Strength, Urgency } from '@/types/aps'

export function generateFeatureCode(
  thickness: number,
  width: number,
  strength: Strength,
  urgency: Urgency,
  config: FeatureCodeConfig,
): string {
  const tLen = config.thicknessLength ?? 3
  const wLen = config.widthLength ?? 4
  const t = Math.round(thickness * 10).toString().padStart(tLen, '0')
  const w = Math.round(width).toString().padStart(wLen, '0')
  const s = config.strengthMap[strength] ?? '?'
  const u = config.urgencyMap[urgency] ?? '0'
  return `${t}${w}${s}${u}`
}
