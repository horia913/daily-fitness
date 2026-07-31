/**
 * Coach testing hub module registry.
 * Later modules (performance tests, body composition) register here as siblings.
 * The hub shell iterates this list — do not hardcode module names into layout.
 */

export type CoachTestingModuleId =
  | 'mobility'
  | 'performance'
  | 'body_comp'
  | 'strength'

export type CoachTestingModule = {
  id: CoachTestingModuleId
  title: string
  description: string
  /** Relative path under `/coach/testing/[clientId]/` */
  pathSegment: string
  available: boolean
}

export const COACH_TESTING_MODULES: CoachTestingModule[] = [
  {
    id: 'mobility',
    title: 'Mobility',
    description: 'ROM and strength grades by joint',
    pathSegment: 'mobility',
    available: true,
  },
  {
    id: 'performance',
    title: 'Performance tests',
    description: 'Jumps, sprints, carries & cardio — coach or self-logged',
    pathSegment: 'performance',
    available: true,
  },
  {
    id: 'body_comp',
    title: 'Body composition',
    description: 'Weight, BF% & waist — coach or self-logged',
    pathSegment: 'body-composition',
    available: true,
  },
  {
    id: 'strength',
    title: 'Strength testing',
    description: '1RM / 3RM / 5RM as real logged sets',
    pathSegment: 'strength',
    available: true,
  },
]

export function testingModuleHref(
  clientId: string,
  module: CoachTestingModule,
): string {
  return `/coach/testing/${clientId}/${module.pathSegment}`
}
