import { cn } from '@/lib/utils'
import styles from './clientProfileV1.module.css'

export function ProfileSection({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <section className={cn(styles.sectionCard, className)}>{children}</section>
}
