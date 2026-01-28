import * as React from "react"

import { cn } from "@/lib/utils"

type InputVariant = "default" | "fc"

function Input({
  className,
  type,
  variant = "default",
  ...props
}: React.ComponentProps<"input"> & { variant?: InputVariant }) {
  const baseClass =
    variant === "fc"
      ? "fc-input h-12 w-full px-4 text-sm"
      : "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-xl border bg-transparent px-3 py-1 text-base text-slate-900 dark:text-slate-100 shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"

  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        baseClass,
        variant === "fc"
          ? "focus-visible:border-[var(--fc-accent-cyan)] focus-visible:ring-2 focus-visible:ring-[rgba(0,242,255,0.2)]"
          : "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
