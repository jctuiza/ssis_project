export default function AsyncView({ loading, error, children }) {
  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true">
        {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-200/70 dark:bg-white/5" />)}
      </div>
    )
  }
  if (error) {
    return <p role="alert" className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-500">{error.message ?? 'Something went wrong. Please try again.'}</p>
  }
  return children
}
