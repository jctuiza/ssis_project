import { SessionContext } from './session'

export default function SessionProvider({ user, navigate, logout, updateUser, children }) {
  return (
    <SessionContext.Provider value={{ user, navigate, logout, updateUser }}>
      {children}
    </SessionContext.Provider>
  )
}
