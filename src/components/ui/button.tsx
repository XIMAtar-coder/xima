import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-[15px] font-medium ring-offset-background transition-all duration-[220ms] ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground rounded-[14px] shadow-[0_0_24px_rgba(99,102,241,0.35)] hover:bg-[#4f46e5] hover:shadow-[0_0_32px_rgba(99,102,241,0.5)] hover:scale-[1.02]",
        destructive:
          "bg-destructive text-destructive-foreground rounded-[14px] hover:bg-destructive/90",
        outline:
          "bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.12)] rounded-[14px] hover:bg-[rgba(255,255,255,0.13)] text-foreground",
        secondary:
          "bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.12)] text-foreground rounded-[14px] hover:bg-[rgba(255,255,255,0.13)]",
        ghost: "hover:bg-[rgba(255,255,255,0.08)] rounded-[10px] text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-7 py-3.5",
        sm: "h-9 rounded-[14px] px-4",
        lg: "h-12 rounded-[14px] px-8",
        icon: "h-10 w-10 rounded-[14px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
