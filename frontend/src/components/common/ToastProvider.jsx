import { useCallback, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { ToastContext } from '../../context/toast'

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const notify = useCallback((message, type = 'success') => {
    const id = `${Date.now()}-${Math.round(Math.random() * 1000)}`
    setToasts((list) => [...list, { id, message, type }])
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 3500)
  }, [])
  const value = useMemo(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(360px,calc(100vw-32px))] flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200 bg-surface p-4 text-sm shadow-lg dark:border-white/10 dark:bg-[#2d2e34]">
            {t.type === 'error' ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />}
            <p className="text-slate-700 dark:text-slate-100">{t.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
