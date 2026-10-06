import { useState } from 'react'
import LoginForm from '../../components/auth/LoginForm'
import LoginPhoto from '../../components/auth/LoginPhoto'
import { ROLES, isStaffRole } from '../../config/roles'
import * as authService from '../../services/authService'

// Login page of one role. The role comes from the address (/student/login, /admin/login, ...), see App.jsx.
export default function Login({ role, theme, onToggleTheme, onLogin }) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  // Student = login left / photo right. Every staff role = photo left / login right (Admin layout).
  const staff = isStaffRole(role)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const next = {}
    if (!identifier.trim()) next.identifier = `Enter your ${ROLES[role].idLabel.toLowerCase()}.`
    if (!password) next.password = 'Enter your password.'
    if (Object.keys(next).length) return setErrors(next)

    setErrors({})
    setLoading(true)
    try {
      const { user } = await authService.login({ role, identifier, password })
      onLogin(user)
    } catch (err) {
      setErrors({ form: err.message })
      setLoading(false)
    }
  }

  // Photo and panel movement are enabled only on desktop.
  const desktopSlide = 'lg:absolute lg:inset-y-0 lg:w-1/2 lg:transform lg:transition-transform lg:duration-500 lg:ease-in-out'

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden lg:block">
      <LoginForm
        theme={theme}
        onToggleTheme={onToggleTheme}
        role={role}
        identifier={identifier}
        onIdentifierChange={setIdentifier}
        password={password}
        onPasswordChange={setPassword}
        errors={errors}
        loading={loading}
        onSubmit={handleSubmit}
        className={`min-h-screen w-full flex-1 ${desktopSlide} lg:left-0 ${staff ? 'lg:translate-x-full' : 'lg:translate-x-0'}`}
      />
      <LoginPhoto
        role={role}
        className={`hidden lg:flex ${desktopSlide} lg:right-0 lg:h-auto ${staff ? 'lg:-translate-x-full' : 'lg:translate-x-0'}`}
      />
    </div>
  )
}
