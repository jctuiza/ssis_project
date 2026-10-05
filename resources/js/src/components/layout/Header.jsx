import { Menu } from 'lucide-react'
import NotificationMenu from './NotificationMenu'
import ProfileMenu from './ProfileMenu'
import ThemeToggle from './ThemeToggle'
import { ROLES } from '../../config/roles'

export default function Header({ user, title, theme, onToggleTheme, onMenu, notifications, onOpenNotification, onMarkAllRead, onProfile }) {
  return (
    <header className="sticky top-0 z-20 border-b border-violet-500/30 bg-violet-600/95 backdrop-blur dark:bg-violet-700/95">
      <div className="flex h-20 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenu}
            aria-label="Open navigation"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/20 lg:hidden"
          >
            <Menu className="h-[19px] w-[19px]" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-white sm:text-xl">{title}</h1>
            <p className="hidden truncate text-xs text-violet-100 dark:text-violet-200 sm:block">
              {ROLES[user.role]?.portal} · Student Services Information System
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} onHeader />
          <NotificationMenu notifications={notifications} onOpenItem={onOpenNotification} onMarkAllRead={onMarkAllRead} />
          <ProfileMenu user={user} onProfile={onProfile} />
        </div>
      </div>
    </header>
  )
}
