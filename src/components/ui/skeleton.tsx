import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-[12px] bg-[rgba(118,118,128,0.12)]", className)}
      {...props}
    />
  )
}

export { Skeleton }
