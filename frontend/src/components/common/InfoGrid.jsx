export default function InfoGrid({ items, columns = 'sm:grid-cols-2' }) {
  return (
    <dl className={`grid gap-4 ${columns}`}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs text-slate-400">{item.label}</dt>
          <dd className="mt-1 break-words text-sm font-medium text-slate-800 dark:text-slate-100">{item.value || '—'}</dd>
        </div>
      ))}
    </dl>
  )
}
