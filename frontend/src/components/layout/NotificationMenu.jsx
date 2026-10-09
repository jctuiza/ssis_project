import ConfirmationDialog from '../feedback/ConfirmationDialog'
import { useState } from 'react'
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
  const unread = notifications.filter((n) => !n.read).length

  return (
    <div className="relative">
      <ConfirmationDialog open={confirming} title="Delete all notifications" message="Clear your current notifications? Other users’ notifications will remain." confirmLabel="Delete All" danger loading={deleting} onConfirm={clear} onCancel={()=>!deleting && setConfirming(false)} />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
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

      {open && (
        <>
          <button type="button" aria-label="Close notifications" onClick={() => setOpen(false)} className="fixed inset-0 z-10 cursor-default" />
          <div className="absolute right-0 top-12 z-20 w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-xl dark:border-white/10 dark:bg-[#26272c]">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-white/10">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Recent updates from the system</p>
              </div>
              {unread > 0 && (
                <button type="button" onClick={onMarkAllRead} className="shrink-0 text-xs font-medium text-violet-600 hover:underline dark:text-violet-300">Mark all as read</button>
              )}
            </div>
            {notifications.length > 0 && <button type="button" className="px-4 py-2 text-xs text-rose-500 hover:underline" onClick={()=>setConfirming(true)}>Delete All</button>}
            <div className="max-h-80 overflow-y-auto">
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
        </>
      )}
    </div>
  )
}


