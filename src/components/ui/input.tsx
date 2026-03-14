import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-[12px] border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.05)] px-[18px] py-3.5 text-[15px] text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-[rgba(255,255,255,0.3)] focus-visible:outline-none focus-visible:border-primary focus-visible:shadow-[0_0_0_3px_rgba(99,102,241,0.20)] disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-[220ms] ease-out",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
