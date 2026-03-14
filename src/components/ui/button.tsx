import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold ring-offset-background transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground rounded-[14px] shadow-[0_4px_16px_rgba(0,122,255,0.30)] hover:bg-[#0071e3] hover:shadow-[0_6px_24px_rgba(0,122,255,0.40)] hover:scale-[1.01]",
        destructive:
          "bg-destructive text-destructive-foreground rounded-[14px] hover:bg-[#e0342b] shadow-[0_4px_16px_rgba(255,59,48,0.25)]",
        outline:
          "bg-[rgba(255,255,255,0.72)] backdrop-blur-[28px] border border-[rgba(60,60,67,0.18)] rounded-[14px] hover:bg-[rgba(255,255,255,0.88)] text-primary",
        secondary:
          "bg-[rgba(255,255,255,0.72)] backdrop-blur-[28px] border border-[rgba(60,60,67,0.18)] text-primary rounded-[14px] hover:bg-[rgba(255,255,255,0.88)]",
        ghost: "hover:bg-[rgba(0,0,0,0.04)] rounded-[10px] text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6 py-3 text-[17px]",
        sm: "h-9 rounded-[14px] px-4 text-[15px]",
        lg: "h-12 rounded-[14px] px-8 text-[17px]",
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
