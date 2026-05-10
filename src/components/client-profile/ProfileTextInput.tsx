import { cn } from '@/lib/utils'
import styles from './clientProfileV1.module.css'

export function ProfileTextInput({
  value,
  onChange,
  disabled,
  type = 'text',
  placeholder,
  inputMode,
  min,
  step,
  dirty,
  error,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  type?: string
  placeholder?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  min?: number
  step?: number | string
  dirty?: boolean
  error?: string
}) {
  return (
    <input
      type={type}
      className={cn(
        styles.input,
        dirty && styles.inputDirty,
        error && styles.inputError
      )}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      inputMode={inputMode}
      min={min}
      step={step}
    />
  )
}
