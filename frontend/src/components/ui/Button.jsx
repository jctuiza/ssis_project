// All variants use solid colors (no gradients).
const variants = {
  primary: 'bg-violet-500 text-white hover:bg-violet-600 focus-visible:ring-violet-400',
  outline:
    'border border-slate-300 text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-400 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-white/10',
  danger: 'bg-rose-500 text-white hover:bg-rose-600 focus-visible:ring-rose-400',
  ghost: 'text-violet-600 hover:bg-violet-50 focus-visible:ring-violet-400 dark:text-violet-300 dark:hover:bg-violet-500/10',
}
const sizes = { md: 'px-4 py-2.5 text-sm', sm: 'px-3 py-1.5 text-xs' }

export default function Button({ variant = 'primary', size = 'md', loading = false, className = '', children, disabled, ...props }) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  )
}


