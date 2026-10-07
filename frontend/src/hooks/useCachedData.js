import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import { cache } from '../api/cache'
import { onDataChange } from '../api/apiClient'
import { tokenStore } from '../api/session'

export default function useCachedData(resource, loader, deps = []) {
  // The token partitions every resource between authenticated sessions.
  const key = JSON.stringify([tokenStore.get(), resource, deps])
  const latest = useRef(loader)
  latest.current = loader
  const subscribe = useCallback(listener => cache.subscribe(key, listener), [key])
  const read = useCallback(() => cache.entry(key).snapshot, [key])
  const snapshot = useSyncExternalStore(subscribe, read, read)
  const reload = useCallback(() => cache.fetch(key, () => latest.current(), true), [key])
  useEffect(() => {
    cache.fetch(key, () => latest.current())
    return onDataChange(reload)
  }, [key, reload])
  return { ...snapshot, reload }
}

