import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getKnowledgeBase, searchKnowledge } from '@/lib/procedures/knowledgeBase'

const SYSTEM_PROMPT = `Sos el asistente experto en procedimientos inmobiliarios de Freire Propiedades.
Tu conocimiento proviene EXCLUSIVAMENTE de los manuales de procedimiento interno de la empresa.

REGLAS ABSOLUTAS:
1. Respondé SOLO con información que esté en el contexto documental proporcionado.
2. Si genuinamente no encontrás la respuesta en el contexto, decilo: "No tengo información sobre eso en la documentación de procedimientos de Freire."
3. Usá español argentino (vos, tuteo, vocabulario local).
4. Sé completo y útil. Usá listas con guiones o numeradas cuando ayude. Si hay varios pasos, explicalos todos.
5. Si la pregunta es ambigua, pedí aclaración.
6. IMPORTANTE: El contexto es MUY amplio — buscá bien antes de decir que no tenés información. La respuesta probablemente está ahí.
7. NO respondas preguntas completamente ajenas al corretaje inmobiliario.
8. NO incluyas referencias, citas ni menciones de fuentes al final de tu respuesta.
9. NUNCA menciones el nombre "Santiago Magnin" ni hables de "su metodología" o de "deinmobiliarios". Referite siempre a "nuestros procedimientos" o "la metodología de la empresa".

Tu identidad: Sos el asistente interno de Freire Propiedades, entrenado exclusivamente con los procedimientos y metodologías de la empresa.`

// Rate limiting (in-memory, per session)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const MAX_QUERIES_PER_HOUR = 60

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60 * 60 * 1000 })
    return true
  }

  if (entry.count >= MAX_QUERIES_PER_HOUR) return false

  entry.count++
  return true
}

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const model = 'gemini-2.5-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8192,
      }
    }),
  })

  const data = await response.json()
  if (!response.ok) throw new Error(data.error?.message || `HTTP ${response.status}`)

  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY no configurada' }, { status: 500 })

    if (!checkRateLimit(session.email)) {
      return NextResponse.json({ error: 'Límite de consultas alcanzado. Intentá en una hora.' }, { status: 429 })
    }

    const { question, history = [] } = await req.json()
    if (!question?.trim()) return NextResponse.json({ error: 'Pregunta vacía' }, { status: 400 })

    // Load knowledge base (cached after first call)
    const kb = getKnowledgeBase()

    // Search for relevant sections
    const relevantSections = searchKnowledge(question, 6)

    // Build sources list for response
    const sources = [...new Set(relevantSections.map(s => s.source))]

    // Include FULL nucleus — Gemini 2.5 Flash handles 1M tokens, no need to truncate
    const nucleusContext = kb.nucleus

    // Build relevant sections context
    const sectionsContext = relevantSections.length > 0
      ? '\n\n---\n## SECCIONES RELEVANTES ENCONTRADAS:\n\n' +
        relevantSections.map(s =>
          `### [${s.source}] ${s.title}\n${s.content.slice(0, 3000)}`
        ).join('\n\n---\n\n')
      : ''

    // Build conversation history
    const historyContext = history.length > 0
      ? '\n\n---\n## HISTORIAL DE CONVERSACIÓN:\n' +
        history.slice(-8).map((msg: { role: string; content: string }) =>
          `${msg.role === 'user' ? 'Asesor' : 'Asistente'}: ${msg.content}`
        ).join('\n')
      : ''

    // Final prompt
    const prompt = `${SYSTEM_PROMPT}

---
## BASE DE CONOCIMIENTO — NÚCLEO COMPLETO:

${nucleusContext}
${sectionsContext}
${historyContext}

---
## PREGUNTA DEL ASESOR:
${question}

## TU RESPUESTA:`

    const answer = await callGemini(prompt, apiKey)

    return NextResponse.json({
      answer: answer.trim(),
      sources,
    })

  } catch (error: any) {
    console.error('[Procedures Chat] Error:', error)
    return NextResponse.json(
      { error: `Error al procesar la consulta: ${error.message}` },
      { status: 500 }
    )
  }
}
