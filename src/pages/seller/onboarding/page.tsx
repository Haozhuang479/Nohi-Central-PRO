
import { useState } from "react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"
import { X, Sparkles, CheckCircle2, Circle, Lock } from "lucide-react"
import { useLanguage } from "@/lib/language-context"

// ─── Circular progress SVG ────────────────────────────────────────────────────
function CircularProgress({ done, total, label }: { done: number; total: number; label: string }) {
  const r = 72
  const circ = 2 * Math.PI * r
  const pct = done / total
  const dashOffset = circ * (1 - pct)

  return (
    <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>
      <svg width="180" height="180" className="-rotate-90">
        <circle cx="90" cy="90" r={r} fill="none" stroke="var(--border)" strokeWidth="14" />
        <circle
          cx="90" cy="90" r={r}
          fill="none"
          stroke="var(--foreground)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={dashOffset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold text-foreground tabular-nums">{done}/{total}</span>
        <span className="text-xs text-muted-foreground mt-0.5">{label}</span>
      </div>
    </div>
  )
}

// ─── Set up events dialog ──────────────────────────────────────────────────────
function SetUpEventsDialog({
  open,
  onClose,
  onConnect,
}: {
  open: boolean
  onClose: () => void
  onConnect: () => void
}) {
  const { t } = useLanguage()
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="relative bg-popover rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="text-lg font-semibold text-foreground">{t("onboarding.eventsDialogTitle")}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="size-5" />
          </button>
        </div>

        {/* Illustration */}
        <div className="mx-6 mt-2 mb-4 rounded-xl bg-secondary/60 p-6 flex items-center justify-center h-36">
          <svg viewBox="0 0 200 80" className="w-full h-full" fill="none">
            <polyline
              points="10,60 40,45 70,50 100,25 130,30 160,10 190,15"
              stroke="var(--foreground)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {[10,40,70,100,130,160,190].map((x, i) => {
              const ys = [60,45,50,25,30,10,15]
              return <circle key={i} cx={x} cy={ys[i]} r="4" fill="var(--foreground)" />
            })}
          </svg>
        </div>

        <div className="px-6 pb-2 flex flex-col gap-4">
          <p className="text-sm text-foreground/80 leading-relaxed">{t("onboarding.eventsDialogBody1")}</p>
          <p className="text-sm text-foreground/80 leading-relaxed">{t("onboarding.eventsDialogBody2")}</p>

          {/* AI-assisted banner */}
          <div className="rounded-xl bg-secondary border border-border px-4 py-3 flex gap-3 items-start">
            <Sparkles className="size-4 text-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">{t("onboarding.shopDetected")}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t("onboarding.shopDetectedDesc")}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-5 mt-2 border-t border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Circle className="size-4 text-amber-500" />
            <span>{t("onboarding.todo")}</span>
          </div>
          <div className="flex gap-3">
            <button className="text-sm font-medium text-foreground hover:underline px-3 py-2 rounded-lg transition-colors hover:bg-secondary">
              {t("onboarding.selectAnotherMethod")}
            </button>
            <button
              onClick={onConnect}
              className="text-sm font-semibold bg-foreground text-background px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
            >
              {t("onboarding.connectShop")}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Task card ─────────────────────────────────────────────────────────────────
interface TaskCardProps {
  title: string
  description: string
  status: "done" | "todo"
  aiAssisted?: boolean
  optional?: boolean
  onSetUp?: () => void
  labelTask: string
  labelAi: string
  labelDone: string
  labelTodo: string
  labelView: string
  labelSetUp: string
}

function TaskCard({
  title, description, status, aiAssisted, optional, onSetUp,
  labelTask, labelAi, labelDone, labelTodo, labelView, labelSetUp,
}: TaskCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-popover p-5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center rounded-md border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-foreground">
          {labelTask}
        </span>
        {optional && (
          <span className="inline-flex items-center rounded-md border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            Optional
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1 flex-1">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>

      <div className="flex items-center gap-1.5 text-xs">
        {status === "done" ? (
          <>
            <CheckCircle2 className="size-4 text-green-600" />
            <span className="text-green-700 font-medium">{labelDone}</span>
          </>
        ) : (
          <>
            <Circle className="size-4 text-amber-500" />
            <span className="text-amber-600 font-medium">{labelTodo}</span>
          </>
        )}
      </div>

      {status === "done" ? (
        <button className="w-full rounded-xl bg-secondary/60 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors">
          {labelView}
        </button>
      ) : (
        <button
          onClick={onSetUp}
          className="w-full rounded-xl bg-foreground py-2 text-sm font-semibold text-background hover:opacity-90 transition-opacity"
        >
          {labelSetUp}
        </button>
      )}
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const [eventsOpen, setEventsOpen] = useState(false)
  const { t } = useLanguage()

  const [tasks, setTasks] = useState([
    {
      id: "payment",
      titleKey: "onboarding.paymentTitle",
      descKey: "onboarding.paymentDesc",
      status: "todo" as "done" | "todo",
      aiAssisted: false,
    },
    {
      id: "feed",
      titleKey: "onboarding.feedTitle",
      descKey: "onboarding.feedDesc",
      status: "todo" as "done" | "todo",
      aiAssisted: true,
    },
    {
      id: "events",
      titleKey: "onboarding.eventsTitle",
      descKey: "onboarding.eventsDesc",
      status: "todo" as "done" | "todo",
      aiAssisted: true,
    },
    {
      id: "connect-accounts",
      titleKey: "onboarding.connectAccountsTitle",
      descKey: "onboarding.connectAccountsDesc",
      status: "todo" as "done" | "todo",
      aiAssisted: false,
      optional: true,
    },
  ])

  const doneTasks = tasks.filter((t) => t.status === "done").length
  const totalTasks = tasks.length
  const allDone = doneTasks === totalTasks

  const markDone = (id: string) => {
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, status: "done" } : task)))
  }

  return (
    <>
      <SetUpEventsDialog
        open={eventsOpen}
        onClose={() => setEventsOpen(false)}
        onConnect={() => { markDone("events"); setEventsOpen(false) }}
      />

      <div className="p-6 md:p-10 max-w-5xl mx-auto flex flex-col gap-8">
        {/* Page title */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
            {t("onboarding.section")}
          </p>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            {t("onboarding.hello")}
          </h1>
        </div>

        {/* Main card */}
        <div className="rounded-2xl bg-popover overflow-hidden">
          {/* Title row */}
          <div className="px-8 pt-8 pb-4 border-b border-border">
            <h2 className="text-xl font-semibold text-foreground">{t("onboarding.completeTitle")}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t("onboarding.completeDesc")}</p>
          </div>

          {/* Promotional credit banner */}
          <div className="mx-8 mt-5 flex items-center gap-3 rounded-xl bg-secondary/60 border border-border px-4 py-3">
            <p className="text-sm text-foreground flex-1">
              {t("onboarding.creditBanner")} <strong>$1,200.00</strong> {t("onboarding.creditBannerSuffix")}
            </p>
            <Link
              href="/seller/billing/promotional-credits"
              className="text-xs text-muted-foreground underline hover:text-foreground transition-colors whitespace-nowrap"
            >
              {t("onboarding.learnMore")}
            </Link>
          </div>

          {/* Progress + Cards */}
          <div className="px-8 py-8 flex flex-col lg:flex-row gap-8 items-start">
            <div className="shrink-0 flex items-center justify-center lg:justify-start">
              <CircularProgress done={doneTasks} total={totalTasks} label={t("onboarding.tasksCompleted")} />
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  title={t(task.titleKey)}
                  description={t(task.descKey)}
                  optional={"optional" in task ? task.optional : false}
                  status={task.status}
                  aiAssisted={task.aiAssisted}
                  labelTask={t("onboarding.task")}
                  labelAi={t("onboarding.aiAssisted")}
                  labelDone={t("onboarding.done")}
                  labelTodo={t("onboarding.todo")}
                  labelView={t("onboarding.viewSetup")}
                  labelSetUp={t("onboarding.setUp")}
                  onSetUp={
                    task.id === "events"
                      ? () => setEventsOpen(true)
                      : () => markDone(task.id)
                  }
                />
              ))}
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex justify-end px-8 pb-6">
            <button
              disabled={!allDone}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-colors",
                allDone
                  ? "bg-foreground text-background hover:opacity-90 cursor-pointer"
                  : "bg-secondary text-muted-foreground cursor-not-allowed"
              )}
            >
              {!allDone && <Lock className="size-4" />}
              {t("onboarding.createCampaign")}
            </button>
          </div>
        </div>

        {/* Footer links */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <Link to="#" className="hover:text-foreground transition-colors">{t("onboarding.termsOfSale")}</Link>
          <Link to="#" className="hover:text-foreground transition-colors">{t("onboarding.privacyPolicy")}</Link>
          <Link to="#" className="hover:text-foreground transition-colors">{t("onboarding.contact")}</Link>
        </div>
      </div>
    </>
  )
}
