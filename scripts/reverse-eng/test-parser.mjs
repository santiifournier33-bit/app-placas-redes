// Test parser against captured HTML
import fs from 'node:fs/promises'
import path from 'node:path'
import { parseWebcontactsHtml } from '../../src/lib/tokko-panel/parser.ts'

const html = await fs.readFile(path.resolve(import.meta.dirname, 'output/webcontact-page.html'), 'utf8')
const rows = parseWebcontactsHtml(html, 'new')
console.log('Total parsed:', rows.length)
console.log('Sample first 3:')
for (const r of rows.slice(0, 3)) {
  console.log(JSON.stringify(r, null, 2))
}
console.log('\nSummary tags found:')
const tagCounts = new Map()
for (const r of rows) for (const t of r.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1)
console.log([...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20))
