import { createContext, useContext } from 'react'
export const DataLoading = createContext(false)
export const useDataLoading = () => useContext(DataLoading)
