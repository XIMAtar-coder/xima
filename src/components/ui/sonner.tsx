import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[rgba(255,255,255,0.06)] group-[.toaster]:backdrop-blur-[40px] group-[.toaster]:text-foreground group-[.toaster]:border-[rgba(255,255,255,0.10)] group-[.toaster]:shadow-[0_8px_32px_rgba(0,0,0,0.24)] group-[.toaster]:rounded-[14px]",
          description: "group-[.toast]:text-[rgba(255,255,255,0.55)]",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-[10px]",
          cancelButton:
            "group-[.toast]:bg-[rgba(255,255,255,0.08)] group-[.toast]:text-[rgba(255,255,255,0.55)] group-[.toast]:rounded-[10px]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
