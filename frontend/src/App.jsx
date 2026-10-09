import { lazy, Suspense, useEffect, useState } from 'react'
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
      ? null
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
      <Suspense fallback={null}>
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
  const [booting, setBooting] = useState(() =>
    Boolean(tokenStore.get()),
  )

  const go = useNavigate()

  useEffect(() => {
    if (!booting) return undefined

    let alive = true

    authService
      .restoreSession()
      .then((account) => {
        if (!alive || !account) return

        registerRoles([
          { key: account.role, label: account.roleLabel },
        ])

        setUser(account)
      })
      .finally(() => {
        if (alive) setBooting(false)
      })

    return () => {
      alive = false
    }
  }, [booting])

  useEffect(() => {
    const onUnauthorized = () => setUser(null)

    window.addEventListener('ssis:unauthorized', onUnauthorized)

    return () => {
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
    await authService.logout()
    setUser(null)
  }

  const home = user ? landing(user.role) : DEFAULT_LOGIN

  // Render only the existing page background during session restoration.
  if (booting) return null

  return (
    <RouteErrorBoundary>
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
