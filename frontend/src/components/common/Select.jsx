import { fieldClass, fieldErrorClass } from '../../utils/styles'

// options: ['A', 'B'] or [{ value, label }]
export default function Select({ label, options, error, placeholder, className = '', id, ...props }) {
  const fid = id ?? props.name ?? label
  return (
    <div className={className}>
      {label && <label htmlFor={fid} className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">{label}</label>}
      <select id={fid} aria-invalid={Boolean(error)} className={`${fieldClass} ${error ? fieldErrorClass : ''}`} {...props}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => {
          const opt = typeof o === 'string' ? { value: o, label: o } : o
          return <option key={opt.value} value={opt.value}>{opt.label}</option>
        })}
      </select>
      {error && <p role="alert" className="mt-1 text-xs text-rose-500">{error}</p>}
    </div>
  )
}