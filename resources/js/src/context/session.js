import { createContext, useContext } from 'react'

// Holds { user, navigate, logout, updateUser } for every page below the login screen.
export const SessionContext = createContext(null)
export const useSession = () => useContext(SessionContext)
