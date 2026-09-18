import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold ring-offset-background transition-colors duration-[120ms] ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:bg-muted disabled:text-muted-foreground disabled:border-transparent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Flat: no glow, no scale. One primary per area; the rest outline or ghost.
        default: "bg-primary text-primary-foreground rounded-md hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90",
        outline:
          "bg-card border border-input rounded-md hover:bg-muted text-foreground",
        secondary:
          "bg-muted border border-border text-foreground rounded-md hover:bg-muted/80",
        ghost: "hover:bg-muted rounded-md text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 text-sm max-sm:h-11",
        sm: "h-9 rounded-md px-3 text-sm",
        lg: "h-11 rounded-md px-6 text-[15px]",
        icon: "h-10 w-10 rounded-md",
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
