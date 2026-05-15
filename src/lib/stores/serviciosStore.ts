import { create } from "zustand"
import { persist } from "zustand/middleware"
import { SEED_CATEGORIES, SEED_MACRO_CATEGORIES, GROUP_TO_MACRO } from "@/lib/servicios/categories-seed"
import { nextDueDate } from "@/lib/servicios/recurrence"

export type Currency = "ARS" | "USD"

export type RecurrenceFreq =
  | "once" | "daily" | "weekly" | "biweekly"
  | "monthly" | "bimonthly" | "quarterly"
  | "semiannual" | "annual" | "custom"

export type PaymentStatus = "pendiente" | "vence_hoy" | "pagado" | "vencido"

// Kept for migration reference only — new code should use macroCategoryId
export type CategoryGroup =
  | "operativos" | "marketing" | "tecnologia" | "profesionales" | "personales"

export interface MacroCategory {
  id: string
  name: string
  iconName: string
  color: string
  isCustom: boolean
}

export interface Recurrence {
  freq: RecurrenceFreq
  customDays?: number
  dayOfMonth?: number
  endDate?: string | null
}

export interface Category {
  id: string
  name: string
  iconName: string
  color: string
  isCustom: boolean
  macroCategoryId: string
  /** @deprecated use macroCategoryId */
  group?: CategoryGroup
}

export interface Provider {
  id: string
  name: string
  categoryId: string
  notes: string
  defaultCurrency: Currency
  recurrence: Recurrence | null
  reminderDaysBefore: number[]
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface Attachment {
  id: string
  name: string
  type: "image" | "pdf" | "doc"
  dataUrl: string
  size: number
  uploadedAt: string
}

export interface Payment {
  id: string
  providerId: string | null
  categoryId: string
  amount: number
  currency: Currency
  exchangeRate: number | null
  exchangeRateDate: string | null
  amountUSD: number
  dueDate: string
  paidDate: string | null
  notes: string
  attachments: Attachment[]
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface ExchangeRate {
  date: string
  blueBuy: number
  source: "dolarhoy" | "manual"
  fetchedAt: string
}

export interface ServiciosState {
  macroCategories: MacroCategory[]
  providers: Provider[]
  payments: Payment[]
  categories: Category[]
  rates: ExchangeRate[]
  lastRateFetch: string | null
  dashboardLayout: string[]

  // MacroCategory CRUD
  addMacroCategory: (m: Omit<MacroCategory, "id" | "isCustom">) => string
  updateMacroCategory: (id: string, updates: Partial<Omit<MacroCategory, "id">>) => void
  deleteMacroCategory: (id: string) => boolean // returns false if has subcategories

  // Provider CRUD
  addProvider: (p: Omit<Provider, "id" | "createdAt" | "updatedAt">) => string
  updateProvider: (id: string, updates: Partial<Omit<Provider, "id" | "createdAt">>) => void
  deleteProvider: (id: string) => void

  // Payment CRUD
  addPayment: (p: Omit<Payment, "id" | "amountUSD" | "createdAt" | "updatedAt">) => string
  updatePayment: (id: string, updates: Partial<Omit<Payment, "id" | "createdAt">>) => void
  deletePayment: (id: string) => void
  markAsPaid: (paymentId: string, paidDate?: string) => string | null

  // Category CRUD
  addCategory: (c: Omit<Category, "id" | "isCustom" | "group">) => string
  updateCategory: (id: string, updates: Partial<Omit<Category, "id" | "group">>) => void
  deleteCategory: (id: string) => void

  // Exchange rate
  addRate: (rate: ExchangeRate) => void
  getCurrentRate: () => ExchangeRate | null

  // Dashboard layout
  setDashboardLayout: (order: string[]) => void
}

function genId() { return crypto.randomUUID() }
function nowISO() { return new Date().toISOString() }

function calcAmountUSD(amount: number, currency: Currency, rate: number | null): number {
  if (currency === "USD") return amount
  if (!rate || rate <= 0) return 0
  return amount / rate
}

export const useServiciosStore = create<ServiciosState>()(
  persist(
    (set, get) => ({
      macroCategories: SEED_MACRO_CATEGORIES,
      providers: [],
      payments: [],
      categories: SEED_CATEGORIES,
      rates: [],
      lastRateFetch: null,
      dashboardLayout: ["insights", "kpis", "vencimientos", "calendar"],

      addMacroCategory: (m) => {
        const id = genId()
        const macro: MacroCategory = { ...m, id, isCustom: true }
        set((s) => ({ macroCategories: [...s.macroCategories, macro] }))
        return id
      },

      updateMacroCategory: (id, updates) =>
        set((s) => ({
          macroCategories: s.macroCategories.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
        })),

      deleteMacroCategory: (id) => {
        const { categories } = get()
        if (categories.some((c) => c.macroCategoryId === id)) return false
        set((s) => ({
          macroCategories: s.macroCategories.filter((m) => m.id !== id),
        }))
        return true
      },

      addProvider: (p) => {
        const id = genId()
        set((s) => ({ providers: [...s.providers, { ...p, id, createdAt: nowISO(), updatedAt: nowISO() }] }))
        return id
      },

      updateProvider: (id, updates) =>
        set((s) => ({
          providers: s.providers.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: nowISO() } : p
          ),
        })),

      deleteProvider: (id) =>
        set((s) => ({
          providers: s.providers.filter((p) => p.id !== id),
          payments: s.payments.map((pay) =>
            pay.providerId === id ? { ...pay, providerId: null } : pay
          ),
        })),

      addPayment: (p) => {
        const id = genId()
        const amountUSD = calcAmountUSD(p.amount, p.currency, p.exchangeRate)
        const payment: Payment = { ...p, id, amountUSD, createdAt: nowISO(), updatedAt: nowISO() }
        set((s) => ({ payments: [...s.payments, payment] }))
        return id
      },

      updatePayment: (id, updates) =>
        set((s) => ({
          payments: s.payments.map((pay) => {
            if (pay.id !== id) return pay
            const merged = { ...pay, ...updates, updatedAt: nowISO() }
            if (updates.amount !== undefined || updates.currency !== undefined || updates.exchangeRate !== undefined) {
              merged.amountUSD = calcAmountUSD(merged.amount, merged.currency, merged.exchangeRate)
            }
            return merged
          }),
        })),

      deletePayment: (id) =>
        set((s) => ({ payments: s.payments.filter((p) => p.id !== id) })),

      markAsPaid: (paymentId, paidDate) => {
        const state = get()
        const pay = state.payments.find((p) => p.id === paymentId)
        if (!pay || pay.paidDate) return null

        const now = paidDate ?? nowISO()
        set((s) => ({
          payments: s.payments.map((p) =>
            p.id === paymentId ? { ...p, paidDate: now, updatedAt: nowISO() } : p
          ),
        }))

        if (!pay.providerId) return null
        const provider = state.providers.find((p) => p.id === pay.providerId)
        if (!provider || !provider.recurrence || provider.recurrence.freq === "once") return null

        const nextDue = nextDueDate(pay.dueDate, provider.recurrence)
        if (!nextDue) return null

        const nextId = genId()
        const nextPayment: Payment = {
          id: nextId,
          providerId: pay.providerId,
          categoryId: pay.categoryId,
          amount: pay.amount,
          currency: pay.currency,
          exchangeRate: null,
          exchangeRateDate: null,
          amountUSD: 0,
          dueDate: nextDue,
          paidDate: null,
          notes: "",
          attachments: [],
          tags: pay.tags,
          createdAt: nowISO(),
          updatedAt: nowISO(),
        }
        set((s) => ({ payments: [...s.payments, nextPayment] }))
        return nextId
      },

      addCategory: (c) => {
        const id = genId()
        set((s) => ({ categories: [...s.categories, { ...c, id, isCustom: true }] }))
        return id
      },

      updateCategory: (id, updates) =>
        set((s) => ({
          categories: s.categories.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),

      deleteCategory: (id) =>
        set((s) => ({ categories: s.categories.filter((c) => c.id !== id) })),

      addRate: (rate) =>
        set((s) => {
          const filtered = s.rates.filter((r) => r.date !== rate.date)
          return {
            rates: [...filtered, rate].sort((a, b) => a.date.localeCompare(b.date)),
            lastRateFetch: rate.date,
          }
        }),

      getCurrentRate: () => {
        const { rates } = get()
        if (rates.length === 0) return null
        return rates[rates.length - 1]
      },

      setDashboardLayout: (order) => set({ dashboardLayout: order }),
    }),
    {
      name: "prod-servicios",
      version: 2,
      migrate: (persistedState, version) => {
        const state = persistedState as Record<string, unknown>
        if (version < 2) {
          const cats = ((state.categories as Record<string, unknown>[]) ?? []).map((c) => ({
            ...c,
            macroCategoryId:
              (c.macroCategoryId as string | undefined) ??
              GROUP_TO_MACRO[(c.group as string) ?? ""] ??
              "macro-operaciones",
          }))
          const existingMacroIds = new Set(
            ((state.macroCategories as { id: string }[]) ?? []).map((m) => m.id)
          )
          const macros = [
            ...SEED_MACRO_CATEGORIES.filter((m) => !existingMacroIds.has(m.id)),
            ...((state.macroCategories as MacroCategory[]) ?? []),
          ]
          return { ...state, categories: cats, macroCategories: macros }
        }
        return state
      },
    }
  )
)
