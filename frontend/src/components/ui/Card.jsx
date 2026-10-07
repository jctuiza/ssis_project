import { cardClass } from '../../utils/styles'

export default function Card({ title, description, action, children, className = '', padded = true }) {
  return (
    <section className={`${cardClass} ${className}`}>
      {(title || action) && (
        <div className={`flex items-start justify-between gap-3 ${padded ? 'px-5 pt-5' : 'border-b border-slate-100 px-5 py-4 dark:border-white/10'}`}>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
            {description && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={padded ? 'p-5' : ''}>{children}</div>
    </section>
  )
}


