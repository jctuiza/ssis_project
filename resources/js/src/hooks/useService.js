import { useEffect, useState } from 'react'
import { onDataChange } from '../services/api'

// Runs a service function (mock now, Laravel API later) and tracks loading/error state.
// The data refreshes by itself whenever anything in the shared database changes, so a request submitted in one
// portal shows up in the others without a manual reload. With Laravel, onDataChange becomes polling or Echo.
export default function useService(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const [tick, setTick] = useState(0)

  useEffect(() => onDataChange(() => setTick((t) => t + 1)), [])

  useEffect(() => {
    let alive = true
    fn()
      .then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((error) => alive && setState({ data: null, loading: false, error }))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps])

  return { ...state, reload: () => setTick((t) => t + 1) }
}
