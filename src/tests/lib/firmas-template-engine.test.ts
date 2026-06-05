import { describe, it, expect } from 'vitest'
import { renderTemplate, signatureTag } from '@/lib/firmas/template-engine'

describe('renderTemplate — variables', () => {
  it('substitutes simple [[var]] tokens', () => {
    expect(renderTemplate('Hola [[nombre]]', { nombre: 'Ana' })).toBe('Hola Ana')
  })

  it('renders unknown vars as empty string', () => {
    expect(renderTemplate('X[[falta]]Y', {})).toBe('XY')
  })

  it('escapes HTML in substituted values (prevents breaking the document)', () => {
    expect(renderTemplate('[[v]]', { v: '<b>&"' })).toBe('&lt;b&gt;&amp;&quot;')
  })

  it('does NOT escape the template HTML itself', () => {
    expect(renderTemplate('<p>[[v]]</p>', { v: 'x' })).toBe('<p>x</p>')
  })

  it('tolerates whitespace inside tokens', () => {
    expect(renderTemplate('[[  nombre  ]]', { nombre: 'Ana' })).toBe('Ana')
  })
})

describe('renderTemplate — loops [[#key]]', () => {
  it('repeats the block once per array item with item scope', () => {
    const out = renderTemplate('[[#props]][[nombre]] [[/props]]', {
      props: [{ nombre: 'Ana' }, { nombre: 'Luis' }],
    })
    expect(out).toBe('Ana Luis ')
  })

  it('exposes _num (1-based), _first and _last meta', () => {
    const out = renderTemplate('[[#props]][[_num]][[?_last]].[[/_last]][[/props]]', {
      props: [{}, {}, {}],
    })
    expect(out).toBe('123.')
  })

  it('item scope can read outer-scope vars', () => {
    const out = renderTemplate('[[#props]][[nombre]]@[[ciudad]];[[/props]]', {
      ciudad: 'Pilar',
      props: [{ nombre: 'Ana' }, { nombre: 'Luis' }],
    })
    expect(out).toBe('Ana@Pilar;Luis@Pilar;')
  })

  it('renders nothing for empty or missing arrays', () => {
    expect(renderTemplate('a[[#props]]X[[/props]]b', { props: [] })).toBe('ab')
    expect(renderTemplate('a[[#props]]X[[/props]]b', {})).toBe('ab')
  })

  it('joins owners with a separator only after the first', () => {
    const tpl = '[[#propietarios]][[^_first]]; y [[/_first]][[nombre]][[/propietarios]]'
    const out = renderTemplate(tpl, {
      propietarios: [{ nombre: 'Ana' }, { nombre: 'Luis' }, { nombre: 'Eva' }],
    })
    expect(out).toBe('Ana; y Luis; y Eva')
  })
})

describe('renderTemplate — conditionals', () => {
  it('[[?key]] renders only when truthy', () => {
    expect(renderTemplate('[[?x]]SI[[/x]]', { x: true })).toBe('SI')
    expect(renderTemplate('[[?x]]SI[[/x]]', { x: false })).toBe('')
  })

  it('[[^key]] renders only when falsy', () => {
    expect(renderTemplate('[[^x]]NO[[/x]]', { x: false })).toBe('NO')
    expect(renderTemplate('[[^x]]NO[[/x]]', { x: true })).toBe('')
  })

  it('arrays are truthy only when non-empty', () => {
    expect(renderTemplate('[[?l]]hay[[/l]]', { l: [1] })).toBe('hay')
    expect(renderTemplate('[[?l]]hay[[/l]]', { l: [] })).toBe('')
  })
})

describe('signatureTag / [[firma]] injection', () => {
  it('signatureTag builds a DocuSeal signature field tag for a role', () => {
    expect(signatureTag('Propietario 1')).toBe(
      '{{Firma Propietario 1;role=Propietario 1;type=signature}}'
    )
  })

  it('[[firma]] inside a firmantes loop emits one tag per signer with its role', () => {
    const tpl = '[[#firmantes]][[firma]] [[nombre]] | [[/firmantes]]'
    const out = renderTemplate(tpl, {
      firmantes: [
        { role: 'Propietario 1', nombre: 'Ana' },
        { role: 'Conyuge 1', nombre: 'Luis' },
        { role: 'Corredor', nombre: 'Stella' },
      ],
    })
    expect(out).toBe(
      '{{Firma Propietario 1;role=Propietario 1;type=signature}} Ana | ' +
      '{{Firma Conyuge 1;role=Conyuge 1;type=signature}} Luis | ' +
      '{{Firma Corredor;role=Corredor;type=signature}} Stella | '
    )
  })

  it('does NOT escape the generated signature tag', () => {
    const out = renderTemplate('[[#firmantes]][[firma]][[/firmantes]]', {
      firmantes: [{ role: 'Propietario 1', nombre: 'Ana' }],
    })
    expect(out).toContain('{{Firma Propietario 1;role=Propietario 1;type=signature}}')
  })
})

describe('renderTemplate — integration (autorización shape)', () => {
  const tpl =
    'Entre [[#propietarios]][[^_first]] y [[/_first]][[nombre]] (DNI [[dni]])[[/propietarios]], ' +
    'por una parte. ' +
    '[[#conyuges]]ASENTIMIENTO: [[nombre]] ([[caracter]]). [[/conyuges]]' +
    'Precio: USD [[precio_numeros]] ([[precio_palabras]]). ' +
    'FIRMAS: [[#firmantes]][[firma]] [[/firmantes]]'

  it('expands body for 3 propietarios + 1 cónyuge and injects 4 signature tags', () => {
    const out = renderTemplate(tpl, {
      precio_numeros: '100000',
      precio_palabras: 'CIEN MIL',
      propietarios: [
        { nombre: 'Ana', dni: '1' },
        { nombre: 'Luis', dni: '2' },
        { nombre: 'Eva', dni: '3' },
      ],
      conyuges: [{ nombre: 'Pedro', caracter: 'Cónyuge' }],
      firmantes: [
        { role: 'Propietario 1', nombre: 'Ana' },
        { role: 'Propietario 2', nombre: 'Luis' },
        { role: 'Propietario 3', nombre: 'Eva' },
        { role: 'Conyuge 1', nombre: 'Pedro' },
        { role: 'Corredor', nombre: 'Stella' },
      ],
    })
    expect(out).toContain('Ana (DNI 1) y Luis (DNI 2) y Eva (DNI 3)')
    expect(out).toContain('ASENTIMIENTO: Pedro (Cónyuge).')
    expect(out).toContain('Precio: USD 100000 (CIEN MIL).')
    const tags = out.match(/\{\{Firma [^}]+;type=signature\}\}/g) || []
    expect(tags).toHaveLength(5)
  })
})
