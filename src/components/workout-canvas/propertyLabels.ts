import type { SlotProperty } from '@/lib/groupModel/types'

const LABELS: Record<SlotProperty, string> = {
  load: 'Load',
  rir: 'RIR',
  tempo: 'Tempo',
  rest_after_exercise: 'Rest after exercise',
  drop_set: 'Drop set',
  cluster: 'Cluster set',
  rest_pause: 'Rest-pause',
}

export function propertyLabel(property: SlotProperty): string {
  return LABELS[property] ?? property
}

export const PRESCRIPTION_PROPERTIES: SlotProperty[] = ['load', 'rir', 'tempo', 'rest_after_exercise']
export const TECHNIQUE_PROPERTIES: SlotProperty[] = ['drop_set', 'cluster', 'rest_pause']
