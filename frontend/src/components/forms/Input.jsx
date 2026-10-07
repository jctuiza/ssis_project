import { fieldClass, fieldErrorClass } from '../../utils/styles'

const labelClass = 'mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300'

export default function Input({ label, error, className = '', id, ...props }) {
  const fid = id ?? props.name ?? label
  return (
    <div className={className}>
      {label && <label htmlFor={fid} className={labelClass}>{label}</label>}
      <input id={fid} aria-invalid={Boolean(error)} className={`${fieldClass} ${error ? fieldErrorClass : ''}`} {...props} />
      {error && <p role="alert" className="mt-1 text-xs text-rose-500">{error}</p>}
    </div>
  )
}

export function Textarea({ label, error, className = '', id, ...props }) {
  const fid = id ?? props.name ?? label
  return (
    <div className={className}>
      {label && <label htmlFor={fid} className={labelClass}>{label}</label>}
      <textarea id={fid} rows={3} aria-invalid={Boolean(error)} className={`${fieldClass} resize-none ${error ? fieldErrorClass : ''}`} {...props} />
      {error && <p role="alert" className="mt-1 text-xs text-rose-500">{error}</p>}
    </div>
  )
}

