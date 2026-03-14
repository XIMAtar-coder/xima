import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-[12px] bg-[rgba(255,255,255,0.06)]", className)}
      {...props}
    />
  )
}

export { Skeleton }
