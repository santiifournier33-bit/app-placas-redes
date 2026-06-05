import { describe, it, expect } from 'vitest'
import { buildAutorizacion, isValidEmail, type AutorizacionInput } from '@/lib/firmas/autorizacion'
import { renderTemplate } from '@/lib/firmas/template-engine'

const base: AutorizacionInput = {
  propietarios: [
    {
      nombre: 'Ana Gómez', dni: '20111222', domicilio: 'Calle 1', localidad: 'Pilar',
      partido: 'Pilar', estadoCivil: 'Casada', telefono: '111', email: 'ana@mail.com',
      conyuge: { nombre: 'Pedro Gómez', caracter: 'Cónyuge', email: 'pedro@mail.com' },
    },
    {
      nombre: 'Luis Paz', dni: '25333444', domicilio: 'Calle 2', localidad: 'Pilar',
      partido: 'Pilar', estadoCivil: 'Soltero', telefono: '222', email: 'luis@mail.com',
      conyuge: null,
    },
  ],
  propiedad: { domicilio: 'Av. Falsa 123', localidad: 'Pilar', partido: 'Pilar', aptoCredito: 'SI' },
  precioUsd: 100000,
  exclusividadDias: 90,
  startDate: '2026-06-03',
  ejemplares: 2,
  ciudadFirma: 'Pilar',
  corredor: { nombre: 'Stella Maris Freire', email: 'freire@mail.com' },
}

describe('isValidEmail', () => {
  it('accepts well-formed and rejects malformed', () => {
    expect(isValidEmail('a@b.com')).toBe(true)
    expect(isValidEmail('bad@b')).toBe(false)
    expect(isValidEmail('no-at.com')).toBe(false)
    expect(isValidEmail('a@b.c')).toBe(false)
  })
})

describe('buildAutorizacion — submitters / roles', () => {
  it('creates one submitter per propietario, per signing cónyuge, plus corredor', () => {
    const { submitters } = buildAutorizacion(base)
    expect(submitters.map((s) => s.role)).toEqual([
      'Propietario 1', 'Propietario 2', 'Conyuge 1', 'Corredor',
    ])
    expect(submitters.find((s) => s.role === 'Conyuge 1')?.email).toBe('pedro@mail.com')
    expect(submitters.at(-1)).toEqual({ role: 'Corredor', name: 'Stella Maris Freire', email: 'freire@mail.com' })
  })

  it('signature tags rendered match exactly the submitter roles (no orphan signers)', () => {
    const { data, submitters } = buildAutorizacion(base)
    const tpl = '[[#firmantes]][[firma]][[/firmantes]][[#corredor]][[firma]][[/corredor]]'
    const html = renderTemplate(tpl, data)
    const tagRoles = [...html.matchAll(/role=([^;]+);type=signature/g)].map((m) => m[1])
    expect(tagRoles.sort()).toEqual(submitters.map((s) => s.role).sort())
  })
})

describe('buildAutorizacion — data', () => {
  it('converts price and days to words and computes end date', () => {
    const { data } = buildAutorizacion(base)
    expect(data.precio_palabras).toBe('CIEN MIL')
    expect(data.dias_exclusiva_palabras).toBe('NOVENTA')
    expect(data.fecha_inicio).toBe('03/06/2026')
    expect(data.fecha_fin).toBe('01/09/2026') // +90 días
  })

  it('builds asentimiento entry only for propietarios with cónyuge', () => {
    const { data } = buildAutorizacion(base)
    expect((data.conyuges as unknown[]).length).toBe(1)
  })
})
