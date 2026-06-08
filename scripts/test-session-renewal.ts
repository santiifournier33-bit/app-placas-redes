import assert from 'node:assert/strict'
import { shouldRenewSession } from '../src/lib/auth/session-renewal'

const WEEK = 7 * 24 * 60 * 60
const now = 1_000_000

// Recién emitido (queda toda la ventana) → NO renovar.
assert.equal(shouldRenewSession(now + WEEK, WEEK, now), false)

// Justo en el 50% restante → NO renovar (umbral estricto).
assert.equal(shouldRenewSession(now + WEEK / 2, WEEK, now), false)

// Menos del 50% restante → renovar.
assert.equal(shouldRenewSession(now + WEEK / 2 - 1, WEEK, now), true)

// Casi vencido → renovar.
assert.equal(shouldRenewSession(now + 60, WEEK, now), true)

// Ya vencido → NO renovar (que el proxy lo mande a /login).
assert.equal(shouldRenewSession(now - 1, WEEK, now), false)

console.log('session-renewal: OK')
