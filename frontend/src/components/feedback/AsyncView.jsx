import TableSkeleton from '../loading/TableSkeleton'
export default function AsyncView({ loading, error, children, skeleton, hasData = false }) {
  if (loading && !hasData) return skeleton ?? <TableSkeleton />
  if (error && !hasData) return <p role="alert" className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-500">{error.message ?? 'Something went wrong. Please try again.'}</p>
  return <>{error && <p role="status" className="mb-3 text-xs text-amber-600 dark:text-amber-400">Showing saved data. The latest update could not be fetched.</p>}{children}</>
}

