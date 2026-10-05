import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import Login from './pages/auth/Login'
import ForcePasswordChange from './pages/auth/ForcePasswordChange'
import DashboardLayout from './components/layout/DashboardLayout'
import AppRoutes from './routes/AppRoutes'
import useService from './hooks/useService'
import { SessionContext } from './context/session'
import { ROLES, registerRoles } from './config/roles'
import { navFor, homePage } from './config/navigation'
import * as authService from './services/authService'
import { tokenStore } from './services/session'

// Every role has its own address:  /student/login, /admin/login, /registrar/login ...
// After login the portal lives under /<role>/<page>, for example /student/grades or /cashier/payments.
// Students land on /student/home, staff roles land on /<role>/dashboard.
const DEFAULT_LOGIN = '/student/login'
const isRole = (key) => Object.hasOwn(ROLES, key)
const landing = (role) => `/${role}/${homePage(role)}`

// /:role/login  -> the login page of that role (the role comes from the URL, there is no dropdown).
function LoginRoute({ user, theme, onToggleTheme, onLogin }) {
  const { role } = useParams()
  const { data: loginRoles, loading } = useService(authService.getLoginRoles)

  if (user) return <Navigate to={landing(user.role)} replace />
  // Roles created by the administrator get their own login address too (/<role-key>/login).
  if (loginRoles) registerRoles(loginRoles)
  if (!isRole(role)) return loading ? null : <Navigate to={DEFAULT_LOGIN} replace />

  return <Login key={role} role={role} theme={theme} onToggleTheme={onToggleTheme} onLogin={onLogin} />
}

// /:role/:page  -> a page of the portal. Visitors who are not signed in are sent to the login of that role.
function PortalRoute({ user, theme, onToggleTheme, navigate, logout, updateUser }) {
  const { role, page } = useParams()

  if (!user) return <Navigate to={isRole(role) ? `/${role}/login` : DEFAULT_LOGIN} replace />
  // A signed-in user can only open their own portal.
  if (user.role !== role) return <Navigate to={landing(user.role)} replace />

  // Accounts created by the Registrar or reset by the Administrator must choose their own password first.
  if (user.mustChangePassword) {
    return <ForcePasswordChange user={user} theme={theme} onToggleTheme={onToggleTheme} onDone={() => updateUser({ mustChangePassword: false })} onLogout={logout} />
  }

  // Unknown pages, or pages the role is not allowed to open, fall back to the landing page.
  if (!navFor(user).some((item) => item.key === page)) return <Navigate to={landing(role)} replace />

  return (
    <SessionContext.Provider value={{ user, navigate, logout, updateUser }}>
      <DashboardLayout user={user} theme={theme} onToggleTheme={onToggleTheme} onLogout={logout} currentPage={page} onNavigate={navigate}>
        <AppRoutes key={`${role}-${page}`} user={user} page={page} />
      </DashboardLayout>
    </SessionContext.Provider>
  )
}

// /:role  -> the landing page when signed in, otherwise the login page of that role.
function RoleHome({ user }) {
  const { role } = useParams()
  if (user) return <Navigate to={landing(user.role)} replace />
  return <Navigate to={isRole(role) ? `/${role}/login` : DEFAULT_LOGIN} replace />
}

export default function App() {
  const [theme, setTheme] = useState('dark')
  const [user, setUser] = useState(null) // the signed-in user, from the Laravel login / session response
  const [booting, setBooting] = useState(() => Boolean(tokenStore.get())) // true while a saved login token is being checked
  const go = useNavigate()

  // A page refresh keeps the user signed in: the saved token is checked once with GET /api/me.
  useEffect(() => {
    if (!booting) return undefined
    let alive = true
    authService
      .restoreSession()
      .then((account) => {
        if (!alive || !account) return
        registerRoles([{ key: account.role, label: account.roleLabel }])
        setUser(account)
      })
      .finally(() => alive && setBooting(false))
    return () => {
      alive = false
    }
  }, [booting])

  // The API answers 401 when the token expired or was revoked (for example after a password reset): back to the login page.
  useEffect(() => {
    const onUnauthorized = () => setUser(null)
    window.addEventListener('ssis:unauthorized', onUnauthorized)
    return () => window.removeEventListener('ssis:unauthorized', onUnauthorized)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  // Pages call navigate('grades'); the router turns it into /<role>/grades.
  const navigate = (page) => {
    go(`/${user.role}/${page}`)
    window.scrollTo({ top: 0 })
  }
  // After login the login route sees the user and redirects to the landing page of the role.
  const handleLogin = (account) => {
    registerRoles([{ key: account.role, label: account.roleLabel }])
    setUser(account)
  }
  // Merge changes (a new profile photo, edited contact details) into the session so every screen updates together.
  const updateUser = (patch) => setUser((u) => ({ ...u, ...patch }))
  // After logout the portal route redirects to /<role>/login.
  const logout = async () => {
    await authService.logout()
    setUser(null)
  }

  const home = user ? landing(user.role) : DEFAULT_LOGIN

  if (booting) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500 dark:text-slate-400">Loading…</div>
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to={home} replace />} />
      <Route path="/login" element={<Navigate to={DEFAULT_LOGIN} replace />} />
      <Route path="/:role" element={<RoleHome user={user} />} />
      <Route path="/:role/login" element={<LoginRoute user={user} theme={theme} onToggleTheme={toggleTheme} onLogin={handleLogin} />} />
      <Route
        path="/:role/:page"
        element={<PortalRoute user={user} theme={theme} onToggleTheme={toggleTheme} navigate={navigate} logout={logout} updateUser={updateUser} />}
      />
      <Route path="*" element={<Navigate to={home} replace />} />
    </Routes>
  )
}
