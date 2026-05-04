'use client'

import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  BeanOff,
  Bed,
  Beef,
  Brain,
  ClipboardCheck,
  Clock,
  Droplet,
  Dumbbell,
  Flame,
  Footprints,
  Moon,
  PersonStanding,
  Pill,
  Scale,
  Smartphone,
  Snowflake,
  Sun,
  TrendingUp,
  Utensils,
  Wheat,
  Wind,
  WineOff,
} from 'lucide-react'

/** Maps seed `icon` strings to lucide-react 0.544 exports. */
const HABIT_ICON_MAP: Record<string, LucideIcon> = {
  droplet: Droplet,
  flame: Flame,
  beef: Beef,
  wheat: Wheat,
  utensils: Utensils,
  pill: Pill,
  dumbbell: Dumbbell,
  footprints: Footprints,
  walking: PersonStanding,
  'trending-up': TrendingUp,
  moon: Moon,
  bed: Bed,
  activity: Activity,
  snowflake: Snowflake,
  brain: Brain,
  wind: Wind,
  smartphone: Smartphone,
  sun: Sun,
  'wine-off': WineOff,
  'coffee-off': BeanOff,
  clock: Clock,
  'clipboard-check': ClipboardCheck,
  scale: Scale,
}

export function HabitLucideIcon({
  name,
  className,
  'aria-hidden': ariaHidden = true,
}: {
  name: string | null | undefined
  className?: string
  'aria-hidden'?: boolean
}) {
  const key = typeof name === 'string' ? name.trim().toLowerCase() : ''
  const Icon = key ? HABIT_ICON_MAP[key] ?? Activity : Activity
  return <Icon className={className} aria-hidden={ariaHidden} />
}
