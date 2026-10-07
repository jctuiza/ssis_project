import { useState } from 'react'
import { GraduationCap, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import ConfirmationDialog from '../feedback/ConfirmationDialog'
import { ROLES } from '../../config/roles'

// `items` is the menu for the signed-in user (built from the permissions of their role, see config/navigation.js).
export default function Sidebar({ user, items, currentPage, onNavigate, onLogout, mobileOpen, onClose, collapsed, onToggleCollapse }) {
  const [hovered, setHovered] = useState(false)
  const [suppressHover, setSuppressHover] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  // A collapsed sidebar opens while hovered, unless it was just collapsed by the button.
  const isExpanded = !collapsed || (hovered && !suppressHover)

  const goTo = (page) => {
    onNavigate(page)
    onClose()
  }

  const handleToggle = () => {
    if (collapsed) {
      onToggleCollapse(false)
      setSuppressHover(false)
    } else {
      onToggleCollapse(true)
      setSuppressHover(true)
    }
    setHovered(false)
  }

  const doLogout = async () => {
    setLoggingOut(true)
    try {
      await onLogout()
    } finally {
      setLoggingOut(false)
      setConfirmLogout(false)
    }
  }

  const label = (extra = '') => `overflow-hidden whitespace-nowrap transition-all duration-300 ${isExpanded ? 'w-auto opacity-100' : 'w-0 opacity-0'} ${extra}`

  return (
    <>
      {mobileOpen && <button type="button" aria-label="Close navigation" onClick={onClose} className="fixed inset-0 z-30 bg-black/40 lg:hidden" />}

      <aside
        onMouseEnter={() => collapsed && !suppressHover && setHovered(true)}
        onMouseLeave={() => { setHovered(false); setSuppressHover(false) }}
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-violet-100 bg-sidebar transition-[width,transform] duration-300 ease-in-out dark:border-white/10 dark:bg-[#202126] lg:translate-x-0 ${mobileOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full'} ${isExpanded ? 'lg:w-64' : 'lg:w-20'}`}
      >
        <div className={`relative flex h-20 shrink-0 items-center border-b border-slate-100 transition-all duration-300 dark:border-white/10 ${isExpanded ? 'gap-3 px-6' : 'justify-center px-2'}`}>
          <div className="group relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-500 text-white shadow-sm">
            <GraduationCap className={`h-5 w-5 transition-opacity duration-200 ${isExpanded ? '' : 'group-hover:opacity-0'}`} />
            {!isExpanded && <PanelLeftOpen className="absolute h-5 w-5 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />}
          </div>
          <div className={`min-w-0 ${label()}`}>
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">Student Services</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{ROLES[user.role]?.portal ?? 'Portal'}</p>
          </div>
          {isExpanded && (
            <button
              type="button"
              onClick={handleToggle}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className="absolute right-2 hidden h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-surface text-slate-500 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600 dark:border-white/10 dark:bg-[#26272c] dark:text-slate-300 dark:hover:bg-violet-500/10 dark:hover:text-violet-300 lg:grid"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>

        <nav className={`flex-1 space-y-1 overflow-y-auto py-6 transition-all duration-300 ${isExpanded ? 'px-4' : 'px-3'}`} aria-label="Main navigation">
          <p className={`mb-3 overflow-hidden text-xs font-semibold text-slate-400 transition-all duration-300 dark:text-slate-500 ${isExpanded ? 'h-auto px-3 opacity-100' : 'h-0 opacity-0'}`}>Menu</p>
          {items.map(({ key, label: text, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => goTo(key)}
              aria-current={currentPage === key ? 'page' : undefined}
              title={!isExpanded ? text : undefined}
              className={`flex w-full items-center rounded-xl py-2.5 text-left text-sm font-medium transition-all duration-200 ${isExpanded ? 'gap-3 px-3' : 'justify-center px-2'} ${
                currentPage === key
                  ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300'
                  : 'text-slate-600 hover:bg-violet-50 hover:text-violet-600 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-violet-300'
              }`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span className={label()}>{text}</span>
            </button>
          ))}
        </nav>

        <div className={`shrink-0 border-t border-slate-100 transition-all duration-300 dark:border-white/10 ${isExpanded ? 'p-4' : 'p-3'}`}>
          <button
            type="button"
            onClick={() => setConfirmLogout(true)}
            title={!isExpanded ? 'Logout' : undefined}
            className={`flex w-full items-center rounded-xl py-2.5 text-sm font-medium text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-rose-500/10 dark:hover:text-rose-300 ${isExpanded ? 'gap-3 px-3' : 'justify-center px-2'}`}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            <span className={label()}>Logout</span>
          </button>
        </div>
      </aside>

      {/* Rendered outside <aside> so the sidebar's transform does not trap the fixed-position pop-up. */}
      <ConfirmationDialog
        open={confirmLogout}
        title="Log out"
        message="Are you sure you want to log out of your account?"
        confirmLabel="Logout"
        danger
        loading={loggingOut}
        onConfirm={doLogout}
        onCancel={() => !loggingOut && setConfirmLogout(false)}
      />
    </>
  )
}


