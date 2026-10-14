import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import RouteErrorBoundary from './components/feedback/RouteErrorBoundary'
import {
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from 'react-router-dom'
import OnlineEnrollment from './pages/auth/OnlineEnrollment'
import Login from './pages/auth/Login'
import DashboardLayout from './layouts/DashboardLayout'
import AppRoutes from './routes/AppRoutes'
import useService from './hooks/useService'
import SessionProvider from './context/SessionProvider'
import { ROLES, registerRoles } from './config/roles'
import { navFor, homePage } from './config/navigation'
import * as authService from './services/auth/authService'
import { tokenStore } from './api/session'

const ForcePasswordChange = lazy(() =>
  import('./pages/auth/ForcePasswordChange'),
)

const DEFAULT_LOGIN = '/student/login'
const isRole = (key) => Object.hasOwn(ROLES, key)
const landing = (role) => `/${role}/${homePage(role)}`

function SessionPending({ error, onRetry }) {
  return <main className="min-h-screen bg-page dark:bg-slate-950">
    {error && <div role="alert" className="mx-auto max-w-3xl p-6 text-sm text-slate-700 dark:text-slate-200">{error.message} <button type="button" className="ml-2 underline" onClick={onRetry}>Retry</button></div>}
  </main>
}

function LoginRoute({ user, theme, onToggleTheme, onLogin }) {
  const { role } = useParams()

  const { data: loginRoles, loading } = useService(
    authService.getLoginRoles,
    [],
    'App.jsx:1',
  )

  if (user) {
    return <Navigate to={landing(user.role)} replace />
  }

  if (loginRoles) {
    registerRoles(loginRoles)
  }

  if (!isRole(role)) {
    return loading
      ? <SessionPending />
      : <Navigate to={DEFAULT_LOGIN} replace />
  }

  return (
    <Login
      key={role}
      role={role}
      theme={theme}
      onToggleTheme={onToggleTheme}
      onLogin={onLogin}
    />
  )
}

function PortalRoute({
  user,
  theme,
  onToggleTheme,
  navigate,
  logout,
  updateUser,
}) {
  const { role, page } = useParams()

  if (!user) {
    return (
      <Navigate
        to={isRole(role) ? `/${role}/login` : DEFAULT_LOGIN}
        replace
      />
    )
  }

  if (user.role !== role) {
    return <Navigate to={landing(user.role)} replace />
  }

  if (user.mustChangePassword) {
    return (
      <Suspense fallback={<SessionPending />}>
        <ForcePasswordChange
          user={user}
          theme={theme}
          onToggleTheme={onToggleTheme}
          onDone={() => updateUser({ mustChangePassword: false })}
          onLogout={logout}
        />
      </Suspense>
    )
  }

  if (!navFor(user).some((item) => item.key === page)) {
    return <Navigate to={landing(role)} replace />
  }

  return (
    <SessionProvider user={user} navigate={navigate} logout={logout} updateUser={updateUser}>
      <DashboardLayout
        user={user}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onLogout={logout}
        currentPage={page}
        onNavigate={navigate}
      >
        <AppRoutes
          key={`${role}-${page}`}
          user={user}
          page={page}
        />
      </DashboardLayout>
    </SessionProvider>
  )
}

function RoleHome({ user }) {
  const { role } = useParams()

  if (user) {
    return <Navigate to={landing(user.role)} replace />
  }

  return (
    <Navigate
      to={isRole(role) ? `/${role}/login` : DEFAULT_LOGIN}
      replace
    />
  )
}

export default function App() {
  const [theme, setTheme] = useState('dark')
  const [user, setUser] = useState(null)
  const [sessionError, setSessionError] = useState(null)
  const [sessionRevision, setSessionRevision] = useState(0)
  const [booting, setBooting] = useState(true)
  const bootingRef = useRef(booting)
  bootingRef.current = booting
  const userRef = useRef(user)
  userRef.current = user

  const go = useNavigate()

  useEffect(() => {
    if (!booting) return undefined

    let alive = true
    setSessionError(null)

    authService
      .restoreSession()
      .then((account) => {
        if (!alive) return
        if (!account) { setUser(null); return }

        registerRoles([
          { key: account.role, label: account.roleLabel },
        ])

        setUser(account)
      })
      .catch((error) => {
        if (alive) setSessionError(error)
      })
      .finally(() => {
        if (alive) setBooting(false)
      })

    return () => {
      alive = false
    }
  }, [booting, sessionRevision])

  useEffect(() => {
    let alive = true
    let checking = false
    const revalidate = () => {
      setUser(null)
      setSessionError(null)
      setBooting(Boolean(tokenStore.get()))
      setSessionRevision(value => value + 1)
    }
    const refreshSession = () => {
      if (checking || bootingRef.current || !tokenStore.get()) return
      checking = true
      const token = tokenStore.get()
      authService.restoreSession().then(account => {
        if (!alive || tokenStore.get() !== token) return
        if (account) registerRoles([{ key: account.role, label: account.roleLabel }])
        const previous = userRef.current
        if (previous && account && (previous.role !== account.role || JSON.stringify(previous.permissions) !== JSON.stringify(account.permissions))) {
          window.dispatchEvent(new Event('ssis:session-changed'))
          return
        }
        setUser(current => JSON.stringify(current) === JSON.stringify(account) ? current : account)
        setSessionError(null)
      }).catch(error => {
        if (alive && tokenStore.get() === token) setSessionError(error)
      }).finally(() => {
        checking = false
      })
    }
    const onVisible = () => { if (document.visibilityState === 'visible') refreshSession() }
    const onPageShow = event => { if (event.persisted) revalidate() }
    const onUnauthorized = revalidate

    window.addEventListener('ssis:unauthorized', onUnauthorized)
    window.addEventListener('ssis:session-changed', revalidate)
    window.addEventListener('focus', refreshSession)
    window.addEventListener('online', refreshSession)
    window.addEventListener('ssis:retry-session', refreshSession)
    window.addEventListener('pageshow', onPageShow)
    document.addEventListener('visibilitychange', onVisible)
    const timer = setInterval(() => {
      if (!tokenStore.get() || document.visibilityState !== 'visible') return
      refreshSession()
    }, 30000)

    return () => {
      alive = false
      clearInterval(timer)
      window.removeEventListener('ssis:session-changed', revalidate)
      window.removeEventListener('focus', refreshSession)
      window.removeEventListener('online', refreshSession)
      window.removeEventListener('ssis:retry-session', refreshSession)
      window.removeEventListener('pageshow', onPageShow)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener(
        'ssis:unauthorized',
        onUnauthorized,
      )
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle(
      'dark',
      theme === 'dark',
    )
  }, [theme])

  const toggleTheme = () => {
    setTheme((current) =>
      current === 'dark' ? 'light' : 'dark',
    )
  }

  const navigate = (page) => {
    go(`/${user.role}/${page}`)
    window.scrollTo({ top: 0 })
  }

  const handleLogin = (account) => {
    registerRoles([
      { key: account.role, label: account.roleLabel },
    ])
    setUser(account)
  }

  const updateUser = (patch) => {
    setUser((current) => ({ ...current, ...patch }))
  }

  const logout = async () => {
    try {
      await authService.logout()
      setUser(null)
    } catch (error) {
      setSessionError(new Error(`Logout could not be confirmed: ${error.message} Retry to reconnect, then log out again.`))
    }
  }

  const home = user ? landing(user.role) : DEFAULT_LOGIN

  if (booting || (sessionError && !user)) return <SessionPending error={sessionError} onRetry={() => setBooting(true)} />

  return (
    <RouteErrorBoundary>
      {sessionError && user && <div role="alert" className="fixed bottom-4 left-4 right-4 z-50 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-slate-900 dark:border-amber-700 dark:bg-slate-900 dark:text-white">{sessionError.message} <button type="button" className="ml-2 underline" onClick={() => window.dispatchEvent(new Event('ssis:retry-session'))}>Retry</button></div>}
      <Routes>
          <Route path="/online-enrollment" element={<OnlineEnrollment />} />
        <Route
          path="/"
          element={<Navigate to={home} replace />}
        />

        <Route
          path="/login"
          element={<Navigate to={DEFAULT_LOGIN} replace />}
        />

        <Route
          path="/:role"
          element={<RoleHome user={user} />}
        />

        <Route
          path="/:role/login"
          element={
            <LoginRoute
              user={user}
              theme={theme}
              onToggleTheme={toggleTheme}
              onLogin={handleLogin}
            />
          }
        />

        <Route
          path="/:role/:page"
          element={
            <PortalRoute
              user={user}
              theme={theme}
              onToggleTheme={toggleTheme}
              navigate={navigate}
              logout={logout}
              updateUser={updateUser}
            />
          }
        />

        <Route
          path="*"
          element={<Navigate to={home} replace />}
        />
      </Routes>
    </RouteErrorBoundary>
  )
}
