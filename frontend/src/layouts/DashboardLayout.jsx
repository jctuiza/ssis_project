import { useState } from 'react'
import Sidebar from '../components/layout/Sidebar'
import Header from '../components/layout/Header'
import useService from '../hooks/useService'
import { getNotifications, markNotificationsRead } from '../services/admin/activityService'
import { navFor } from '../config/navigation'

export default function DashboardLayout({ user, theme, onToggleTheme, onLogout, currentPage, onNavigate, children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  // false = expanded, true = collapsed (desktop)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const { data: notifications, reload } = useService(() => getNotifications(), [user.id], "components/layout/DashboardLayout.jsx:1")

  // The menu depends on the permissions of the user's role.
  const items = navFor(user)
  const title = items.find((n) => n.key === currentPage)?.label ?? items[0]?.label

  const markAllRead = async () => {
    await markNotificationsRead()
    reload()
  }

  return (
    <div className="min-h-screen bg-page text-slate-800 dark:bg-[#1c1d21] dark:text-slate-200">
      <Sidebar
        user={user}
        items={items}
        currentPage={currentPage}
        onNavigate={onNavigate}
        onLogout={onLogout}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={setSidebarCollapsed}
      />

      <div className={`min-h-screen transition-[padding] duration-300 ease-in-out ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        <Header
          user={user}
          title={title}
          theme={theme}
          onToggleTheme={onToggleTheme}
          onMenu={() => setMobileOpen(true)}
          notifications={notifications ?? []}
          onOpenNotification={(n) => n.page && items.some((i) => i.key === n.page) && onNavigate(n.page)}
          onMarkAllRead={markAllRead}
          onProfile={() => onNavigate('profile')}
        />
        <main className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">{children}</main>
      </div>
    </div>
  )
}


