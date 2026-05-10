import { cn } from '@/lib/utils'
import styles from './clientProfileV1.module.css'

export function UnitInput({
  value,
  onChange,
  disabled,
  unit,
  inputMode,
  min,
  step,
  dirty,
  error,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  unit: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  min?: number
  step?: number | string
  dirty?: boolean
  error?: string
}) {
  return (
    <div className={styles.unitInput}>
      <input
        type="number"
        className={cn(
          styles.input,
          dirty && styles.inputDirty,
          error && styles.inputError
        )}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        inputMode={inputMode}
        min={min}
        step={step}
      />
      <span className={styles.unitSuffix}>{unit}</span>
    </div>
  )
}
