import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tokenStore } from '../src/api/session.js'
import { cache } from '../src/api/cache.js'

await test('blocked browser storage retains the current token and signals login/logout', () => {
  const storage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const win = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const events = []
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Blocked') } })
  globalThis.sessionStorage = { getItem:()=>null, removeItem(){} }
  globalThis.window = { dispatchEvent: event => events.push(event.type) }
  try {
    tokenStore.set('test-token')
    assert.equal(tokenStore.get(), 'test-token')
    tokenStore.clear()
    assert.equal(tokenStore.get(), null)
    assert.deepEqual(events, ['ssis:session-changed', 'ssis:session-changed'])
  } finally {
    if (storage) Object.defineProperty(globalThis, 'localStorage', storage); else delete globalThis.localStorage
    if (win) Object.defineProperty(globalThis, 'window', win); else delete globalThis.window
  }
})
await test('working browser storage persists the token and clears it', () => {
  const values = new Map()
  globalThis.localStorage = { getItem: k => values.get(k) ?? null, setItem: (k,v) => values.set(k,v), removeItem: k => values.delete(k) }
  try {
    tokenStore.set('stored-token'); assert.equal(values.get('ssis-session'), 'stored-token')
    assert.equal(tokenStore.get(), 'stored-token')
    tokenStore.clear(); assert.equal(values.has('ssis-session'), false)
  } finally { delete globalThis.localStorage;delete globalThis.sessionStorage }
})
await test('simultaneous resource loads share one request', async () => {
  cache.clear()
  let calls = 0
  const loader = async () => { calls++; return ['record'] }
  const first = cache.fetch('dedup', loader)
  const second = cache.fetch('dedup', loader)
  assert.equal(first, second)
  await first
  assert.equal(calls, 1)
  assert.deepEqual(cache.entry('dedup').snapshot.data, ['record'])
})
await test('logout prevents an in-flight response from restoring private data', async () => {
  cache.clear()
  let finish
  const pending = cache.fetch('private', () => new Promise(resolve => { finish = resolve }))
  await Promise.resolve()
  cache.clear()
  finish(['private-record']); await pending
  assert.equal(cache.entry('private').snapshot.data, null)
})
await test('mutation invalidation discards stale responses while a fresh request completes', async () => {
  cache.clear()
  let finish
  const stale = cache.fetch('balance', () => new Promise(resolve => { finish = resolve }))
  await Promise.resolve()
  cache.invalidate()
  await cache.fetch('balance', async () => ({ balance: 25 }), true)
  finish({ balance: 100 }); await stale
  assert.deepEqual(cache.entry('balance').snapshot.data, { balance: 25 })
})
await test('failed refresh keeps prior data and a subsequent retry clears the error', async () => {
  cache.clear()
  await cache.fetch('retry', async () => ['old'])
  await cache.fetch('retry', async () => { throw new Error('Offline') }, true)
  assert.deepEqual(cache.entry('retry').snapshot.data, ['old'])
  assert.equal(cache.entry('retry').snapshot.error.message, 'Offline')
  await cache.fetch('retry', async () => ['new'], true)
  assert.equal(cache.entry('retry').snapshot.error, null)
  assert.deepEqual(cache.entry('retry').snapshot.data, ['new'])
})
