import { ChevronRight } from 'lucide-react'

export default function Breadcrumb({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm font-medium">
      {items.map((item, i) => (
        <span key={item} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
          <span className={i === items.length - 1 ? 'text-violet-600 dark:text-violet-300' : 'text-slate-400'}>{item}</span>
        </span>
      ))}
    </nav>
  )
}


