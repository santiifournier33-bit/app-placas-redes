import fs from 'fs'
import path from 'path'

// ── Types ────────────────────────────────────────────────────────────────────

export interface KnowledgeSection {
  id: string
  source: string       // "Masterclass 7: Captación"
  title: string        // Section heading
  content: string      // Full section text
  keywords: string[]   // Auto-extracted keywords
}

interface KnowledgeBase {
  nucleus: string              // NÚCLEO full text (always included)
  sections: KnowledgeSection[] // Sections from the other 20 docs
}

// ── Singleton cache ───────────────────────────────────────────────────────────

let _cache: KnowledgeBase | null = null

const DOCS_DIR = path.join(process.cwd(), 'agente-santimagnin')
const NUCLEUS_FILE = 'NUCLEO_CONOCIMIENTO_SANTIAGO_MAGNIN.md'

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractKeywords(text: string): string[] {
  // Remove markdown, split into words, filter stopwords
  const stopwords = new Set([
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del',
    'en', 'con', 'por', 'para', 'que', 'es', 'son', 'se', 'su', 'sus',
    'al', 'a', 'o', 'y', 'e', 'pero', 'si', 'no', 'más', 'como', 'muy',
    'todo', 'todos', 'cada', 'esta', 'este', 'estos', 'estas', 'hay',
    'tiene', 'hacer', 'puede', 'cuando', 'sobre', 'entre', 'bien',
    'the', 'and', 'or', 'of', 'to', 'a', 'in', 'is', 'it', 'for',
  ])

  return text
    .toLowerCase()
    .replace(/[^a-záéíóúüñ\s]/gi, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopwords.has(w))
    .slice(0, 60)
}

function getSourceLabel(filename: string): string {
  return filename
    .replace(/\.es\.md$/, '')
    .replace(/\.txt$/, '')
    .replace(/\.md$/, '')
    .replace(/^Q&A /, 'Q&A ')
    .trim()
}

function splitIntoSections(content: string, source: string): KnowledgeSection[] {
  // Split by ## headings (not ###)
  const parts = content.split(/\n(?=## )/g)
  const sections: KnowledgeSection[] = []

  for (const part of parts) {
    if (part.trim().length < 100) continue // Skip tiny fragments

    const lines = part.split('\n')
    const title = lines[0].replace(/^#+\s*/, '').trim()
    const body = lines.slice(1).join('\n').trim()

    if (!body) continue

    const id = `${source}::${title}`.replace(/\s+/g, '_').toLowerCase()

    sections.push({
      id,
      source,
      title,
      content: part.trim(),
      keywords: extractKeywords(title + ' ' + body),
    })
  }

  // If no ## headings, treat whole doc as one section
  if (sections.length === 0 && content.trim().length > 200) {
    const title = path.basename(source)
    sections.push({
      id: source.replace(/\s+/g, '_').toLowerCase(),
      source,
      title,
      content: content.trim(),
      keywords: extractKeywords(content),
    })
  }

  return sections
}

// ── Load knowledge base ───────────────────────────────────────────────────────

export function getKnowledgeBase(): KnowledgeBase {
  if (_cache) return _cache

  let nucleus = ''
  const sections: KnowledgeSection[] = []

  try {
    const files = fs.readdirSync(DOCS_DIR)

    for (const file of files) {
      if (!file.endsWith('.md') && !file.endsWith('.txt')) continue

      const filePath = path.join(DOCS_DIR, file)
      const content = fs.readFileSync(filePath, 'utf-8')

      if (file === NUCLEUS_FILE) {
        nucleus = content
        continue
      }

      const source = getSourceLabel(file)
      const fileSections = splitIntoSections(content, source)
      sections.push(...fileSections)
    }

    console.log(`[KnowledgeBase] Loaded nucleus (${nucleus.length} chars) + ${sections.length} sections from ${files.length} files`)
  } catch (err: any) {
    console.error('[KnowledgeBase] Error loading documents:', err.message)
  }

  _cache = { nucleus, sections }
  return _cache
}

// ── Search ────────────────────────────────────────────────────────────────────

export function searchKnowledge(query: string, topK = 4): KnowledgeSection[] {
  const kb = getKnowledgeBase()
  if (!kb.sections.length) return []

  const queryTokens = extractKeywords(query)
  
  // Also include the raw query words (short words matter for proper nouns)
  const rawTokens = query.toLowerCase().replace(/[^a-záéíóúüñ\s]/gi, ' ').split(/\s+/).filter(w => w.length > 2)
  const allQueryTokens = [...new Set([...queryTokens, ...rawTokens])]

  // Score each section
  const scored = kb.sections.map(section => {
    let score = 0

    for (const token of allQueryTokens) {
      // Title match (high weight)
      if (section.title.toLowerCase().includes(token)) score += 5
      // Keywords match
      if (section.keywords.includes(token)) score += 3
      // Content match
      if (section.content.toLowerCase().includes(token)) score += 1
    }

    // Boost Q&A sections (they're structured as questions and answers)
    if (section.source.startsWith('Q&A')) score *= 1.3

    return { section, score }
  })

  // Sort by score, take top K, filter out zero scores
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(s => s.section)
}
