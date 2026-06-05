/**
 * Motor de plantillas para documentos de firma.
 *
 * Sintaxis (delimitador `[[ ]]`, reservado para el app):
 *   - Variable:      [[clave]]                      → valor de scope (HTML-escapado)
 *   - Loop:          [[#lista]] ... [[/lista]]      → repite por cada item del array
 *   - Condicional:   [[?clave]] ... [[/clave]]      → renderiza si truthy
 *   - Negado:        [[^clave]] ... [[/clave]]      → renderiza si falsy
 *   - Firma:         [[firma]]                      → inyecta el tag de firma de DocuSeal
 *
 * Dentro de un loop, cada item expone meta: _index (0-based), _num (1-based),
 * _first y _last (booleanos). El item puede leer también las variables del scope padre.
 *
 * El tag de firma de DocuSeal (`{{...;role=...;type=signature}}`) lo genera SIEMPRE
 * este motor a partir del `role` del firmante — el autor de la plantilla nunca lo tipea,
 * así no puede romperlo. `{{ }}` queda reservado para DocuSeal.
 */

export interface Firmante {
  /** Rol exacto que matchea el submitter en DocuSeal (ej. "Propietario 1", "Corredor"). */
  role: string
  nombre?: string
  [key: string]: unknown
}

export type TemplateData = Record<string, unknown>

/** Construye el tag de campo de firma de DocuSeal para un rol. */
export function signatureTag(role: string): string {
  return `{{Firma ${role};role=${role};type=signature}}`
}

// ---- Parser ----

type Node =
  | { type: 'text'; value: string }
  | { type: 'var'; name: string }
  | { type: 'block'; kind: 'loop' | 'if' | 'unless'; name: string; children: Node[] }

const TOKEN = /\[\[\s*([#?^/]?)\s*([\p{L}\p{N}_.]+)\s*\]\]/gu

function parse(tpl: string): Node[] {
  const root: Node[] = []
  const stack: Node[][] = [root]
  const blockStack: Array<{ name: string }> = []
  let last = 0
  let m: RegExpExecArray | null

  const pushText = (value: string) => {
    if (value) stack[stack.length - 1].push({ type: 'text', value })
  }

  TOKEN.lastIndex = 0
  while ((m = TOKEN.exec(tpl)) !== null) {
    pushText(tpl.slice(last, m.index))
    last = TOKEN.lastIndex
    const [, sigil, name] = m

    if (sigil === '/') {
      // cierre: descartar el bloque actual (matchea por nombre)
      if (blockStack.length && blockStack[blockStack.length - 1].name === name) {
        blockStack.pop()
        stack.pop()
      }
      continue
    }

    if (sigil === '#' || sigil === '?' || sigil === '^') {
      const kind = sigil === '#' ? 'loop' : sigil === '?' ? 'if' : 'unless'
      const block: Node = { type: 'block', kind, name, children: [] }
      stack[stack.length - 1].push(block)
      stack.push(block.children)
      blockStack.push({ name })
      continue
    }

    // variable
    stack[stack.length - 1].push({ type: 'var', name })
  }
  pushText(tpl.slice(last))
  return root
}

// ---- Render ----

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function isTruthy(val: unknown): boolean {
  if (Array.isArray(val)) return val.length > 0
  return Boolean(val)
}

function toStr(val: unknown): string {
  if (val === null || val === undefined) return ''
  return String(val)
}

function renderNodes(nodes: Node[], scope: Record<string, unknown>): string {
  let out = ''
  for (const node of nodes) {
    if (node.type === 'text') {
      out += node.value
    } else if (node.type === 'var') {
      if (node.name === 'firma') {
        const role = scope.role
        out += typeof role === 'string' && role ? signatureTag(role) : ''
      } else {
        out += escapeHtml(toStr(scope[node.name]))
      }
    } else {
      const val = scope[node.name]
      if (node.kind === 'loop') {
        if (Array.isArray(val)) {
          const len = val.length
          val.forEach((item, i) => {
            const itemScope = {
              ...scope,
              ...(item && typeof item === 'object' ? (item as Record<string, unknown>) : {}),
              _index: i,
              _num: i + 1,
              _first: i === 0,
              _last: i === len - 1,
            }
            out += renderNodes(node.children, itemScope)
          })
        } else if (isTruthy(val)) {
          out += renderNodes(node.children, scope)
        }
      } else if (node.kind === 'if') {
        if (isTruthy(val)) out += renderNodes(node.children, scope)
      } else {
        // unless
        if (!isTruthy(val)) out += renderNodes(node.children, scope)
      }
    }
  }
  return out
}

/**
 * Renderiza una plantilla `[[ ]]` contra `data`.
 * Las variables se HTML-escapan; los tags de firma `{{...}}` se emiten sin escapar.
 */
export function renderTemplate(tpl: string, data: TemplateData): string {
  return renderNodes(parse(tpl), data as Record<string, unknown>)
}
