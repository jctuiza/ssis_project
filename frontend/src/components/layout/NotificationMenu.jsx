import ConfirmationDialog from '../feedback/ConfirmationDialog'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bell } from 'lucide-react'

// notifications: [{ id, text, time, page, read }]
export default function NotificationMenu({ notifications = [], onOpenItem, onMarkAllRead, onDeleteAll }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const clear = async () => {
    if (deleting) return
    setDeleting(true)
    try { await onDeleteAll?.(); setConfirming(false) } catch { /* Parent displays the API error. */ } finally { setDeleting(false) }
  }
  const [open, setOpen] = useState(false)
  const buttonRef = useRef(null)
  const panelRef = useRef(null)
  const panelId = useId()
  const [position, setPosition] = useState(null)
  useEffect(() => {
    if (!open) return
    const place = () => {
      const rect = buttonRef.current.getBoundingClientRect()
      const width = Math.min(360, window.innerWidth - 32)
      const top = Math.min(rect.bottom + 8, Math.max(16, window.innerHeight - 160))
      setPosition({ width, left: Math.max(16, Math.min(rect.right - width, window.innerWidth - width - 16)), top, maxHeight: Math.max(0, window.innerHeight - top - 16) })
    }
    const dismiss = event => {
      if (!buttonRef.current?.contains(event.target) && !panelRef.current?.contains(event.target)) setOpen(false)
    }
    const escape = event => {
      if (event.key === 'Escape') { setOpen(false); buttonRef.current?.focus() }
    }
    place()
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', escape)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      document.removeEventListener('keydown', escape)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])
  const unread = notifications.filter((n) => !n.read).length

  return (
    <div className="relative">
      {confirming && createPortal(<ConfirmationDialog open={confirming} title="Delete all notifications" message="Clear your current notifications? Other users’ notifications will remain." confirmLabel="Delete All" danger loading={deleting} onConfirm={clear} onCancel={()=>!deleting && setConfirming(false)} />, document.body)}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        ref={buttonRef}
        aria-controls={open ? panelId : undefined}
        aria-expanded={open}
        className="relative grid h-10 w-10 place-items-center rounded-xl border border-white/20 bg-white/10 text-white transition hover:border-white/40 hover:bg-white/20"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[10px] font-bold text-violet-700 ring-2 ring-violet-600 dark:ring-violet-700">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && position && createPortal(
          <div ref={panelRef} id={panelId} role="region" aria-label="Notifications" style={position} className="fixed z-40 flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-xl dark:border-white/10 dark:bg-[#26272c]">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-white/10">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Recent updates from the system</p>
              </div>
              {unread > 0 && (
                <button type="button" onClick={onMarkAllRead} className="shrink-0 text-xs font-medium text-violet-600 hover:underline dark:text-violet-300">Mark all as read</button>
              )}
            </div>
            {notifications.length > 0 && <button type="button" className="px-4 py-2 text-xs text-rose-500 hover:underline" onClick={()=>{ setOpen(false); setConfirming(true) }}>Delete All</button>}
            <div className="min-h-0 max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">No new notifications.</p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => { setOpen(false); onOpenItem?.(n) }}
                    className={`flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-page dark:border-white/5 dark:hover:bg-white/5 ${n.read ? '' : 'bg-violet-50/60 dark:bg-violet-500/5'}`}
                  >
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-slate-300 dark:bg-slate-600' : 'bg-violet-500'}`} />
                    <span>
                      <span className="block text-sm leading-5 text-slate-700 dark:text-slate-200">{n.text}</span>
                      <span className="mt-1 block text-xs text-slate-400">{n.time}</span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        , document.body
      )}
    </div>
  )
}


