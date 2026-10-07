import useCachedData from './useCachedData'

// Compatibility wrapper; all callers supply an explicit stable resource key.
export default function useService(fn, deps = [], resource = fn.name) {
  if (!resource) throw new Error('useService requires a stable resource key for anonymous loaders.')
  return useCachedData(resource, fn, deps)
}

