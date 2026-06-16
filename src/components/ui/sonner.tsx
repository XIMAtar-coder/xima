import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      closeButton
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-popover group-[.toaster]:text-popover-foreground group-[.toaster]:border group-[.toaster]:border-border group-[.toaster]:shadow-xl group-[.toaster]:rounded-xl",
          title: "group-[.toast]:text-popover-foreground group-[.toast]:font-medium",
          description: "group-[.toast]:text-popover-foreground/80",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg",
          closeButton:
            "group-[.toast]:bg-popover group-[.toast]:text-popover-foreground group-[.toast]:border-border",
          error:
            "group-[.toaster]:!bg-popover group-[.toaster]:!text-popover-foreground group-[.toaster]:!border-l-4 group-[.toaster]:!border-l-destructive group-[.toaster]:[&>[data-icon]]:!text-destructive",
          success:
            "group-[.toaster]:!bg-popover group-[.toaster]:!text-popover-foreground group-[.toaster]:!border-l-4 group-[.toaster]:!border-l-emerald-500 group-[.toaster]:[&>[data-icon]]:!text-emerald-500",
          warning:
            "group-[.toaster]:!bg-popover group-[.toaster]:!text-popover-foreground group-[.toaster]:!border-l-4 group-[.toaster]:!border-l-amber-500 group-[.toaster]:[&>[data-icon]]:!text-amber-500",
          info:
            "group-[.toaster]:!bg-popover group-[.toaster]:!text-popover-foreground group-[.toaster]:!border-l-4 group-[.toaster]:!border-l-primary group-[.toaster]:[&>[data-icon]]:!text-primary",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
