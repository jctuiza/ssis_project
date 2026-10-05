import { Check } from 'lucide-react'
import { DOCUMENT_FLOW } from '../../config/constants'

export default function WorkflowSteps({ status }) {
  if (status === 'Rejected') {
    return <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-500">This request was rejected. See the remarks for details.</p>
  }
  const current = DOCUMENT_FLOW.indexOf(status)
  return (
    <ol className="grid grid-cols-4 gap-x-2 gap-y-4">
      {DOCUMENT_FLOW.map((step, i) => (
        <li key={step} className="flex flex-col items-center gap-1.5 text-center">
          <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-semibold ${i <= current ? 'bg-violet-500 text-white' : 'bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-400'}`}>
            {i < current || status === 'Completed' ? <Check className="h-4 w-4" /> : i + 1}
          </span>
          <span className={`text-[11px] leading-tight ${i <= current ? 'font-medium text-slate-800 dark:text-slate-100' : 'text-slate-400'}`}>{step}</span>
        </li>
      ))}
    </ol>
  )
}