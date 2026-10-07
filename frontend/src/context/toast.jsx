import { createContext, useContext } from 'react'

export const ToastContext = createContext({ notify: () => {} })
export const useToast = () => useContext(ToastContext)


