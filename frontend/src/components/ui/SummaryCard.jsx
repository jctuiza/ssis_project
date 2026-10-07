export default function SummaryCard({ label, value, icon: Icon, description }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-surface p-5 shadow-sm dark:border-white/10 dark:bg-[#26272c] dark:shadow-none">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 truncate text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{value}</p>
          {description && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{description}</p>}
        </div>
        {Icon && (
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </section>
  )
}


