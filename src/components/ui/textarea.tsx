import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-[12px] border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.05)] px-[18px] py-3.5 text-[15px] text-foreground ring-offset-background placeholder:text-[rgba(255,255,255,0.3)] focus-visible:outline-none focus-visible:border-primary focus-visible:shadow-[0_0_0_3px_rgba(99,102,241,0.20)] disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-[220ms] ease-out",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
