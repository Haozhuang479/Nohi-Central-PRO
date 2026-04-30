import { cn } from "@/lib/utils"

export function SectionWrapper({
  title,
  subtitle,
  children,
  className,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("p-6 md:p-10 max-w-4xl mx-auto flex flex-col gap-8", className)}>
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  )
}

export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div>
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {children}
    </div>
  )
}
