"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "!rounded-xl !border !border-ms-border-2 !bg-ms-surface !text-ms-ink !shadow-[var(--ms-shadow-menu)]",
          title: "!text-[13px] !font-semibold !text-ms-primary-ink",
          description: "!text-[12.5px] !text-ms-muted-3",
          icon: "!text-ms-primary-ink",
          actionButton:
            "!rounded-lg !bg-ms-primary !px-2.5 !text-[12px] !font-semibold !text-white hover:!brightness-[1.07]",
          cancelButton:
            "!rounded-lg !border !border-ms-border-2 !bg-ms-surface !text-[12px] !font-medium !text-ms-label hover:!bg-ms-hover",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
