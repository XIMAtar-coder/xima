import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-[999px] px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-[rgba(99,102,241,0.15)] border border-[rgba(99,102,241,0.25)] text-primary",
        secondary:
          "bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.12)] text-[rgba(255,255,255,0.7)]",
        destructive:
          "bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.25)] text-red-400",
        outline: "border border-[rgba(255,255,255,0.12)] text-[rgba(255,255,255,0.7)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
