import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-xl border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        "fc-glass": "fc-badge fc-glass-soft text-white",
        "fc-outline":
          "fc-badge border-[color:var(--fc-glass-border)] text-[color:var(--fc-text-dim)]",
        "fc-filled": "fc-badge bg-[var(--fc-accent)] text-black",
        "status-success":
          "rounded-full border px-[9px] py-1 text-[10px] font-bold tracking-[0.10em] uppercase border-[color:color-mix(in_srgb,var(--fc-status-success)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--fc-status-success)_16%,transparent)] text-[color:var(--fc-status-success)]",
        "status-warning":
          "rounded-full border px-[9px] py-1 text-[10px] font-bold tracking-[0.10em] uppercase border-[color:color-mix(in_srgb,var(--fc-status-warning)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--fc-status-warning)_16%,transparent)] text-[color:var(--fc-status-warning)]",
        "status-error":
          "rounded-full border px-[9px] py-1 text-[10px] font-bold tracking-[0.10em] uppercase border-[color:color-mix(in_srgb,var(--fc-status-error)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--fc-status-error)_16%,transparent)] text-[color:var(--fc-status-error)]",
        "status-info":
          "rounded-full border px-[9px] py-1 text-[10px] font-bold tracking-[0.10em] uppercase border-[color:color-mix(in_srgb,var(--fc-accent)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--fc-accent)_16%,transparent)] text-[color:var(--fc-accent)]",
        "status-active":
          "rounded-full border px-[9px] py-1 text-[10px] font-bold tracking-[0.10em] uppercase border-[color:var(--fc-accent)] bg-[color:var(--fc-accent)] text-[#061018]",
        "status-critical":
          "rounded-full border px-[9px] py-1 text-[9px] font-bold tracking-[0.10em] uppercase border-[color:color-mix(in_srgb,var(--fc-accent)_28%,transparent)] bg-[color:color-mix(in_srgb,var(--fc-accent)_12%,transparent)] text-[color:var(--fc-accent)]",
        "status-new":
          "rounded-full border px-[9px] py-1 text-[9px] font-bold tracking-[0.10em] uppercase border-[color:var(--fc-sev-new-border)] bg-[color:var(--fc-sev-new-soft)] text-[color:var(--fc-sev-new)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
