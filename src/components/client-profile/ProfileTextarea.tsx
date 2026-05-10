import { cn } from '@/lib/utils'
import styles from './clientProfileV1.module.css'

export function ProfileTextarea({
  value,
  onChange,
  disabled,
  placeholder,
  rows,
  maxLength,
  dirty,
  error,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  placeholder?: string
  rows?: number
  maxLength?: number
  dirty?: boolean
  error?: string
}) {
  return (
    <textarea
      className={cn(
        styles.textarea,
        dirty && styles.textareaDirty,
        error && styles.textareaError
      )}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      rows={rows}
      maxLength={maxLength}
    />
  )
}
