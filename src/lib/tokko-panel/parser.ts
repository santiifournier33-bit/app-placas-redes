import * as cheerio from 'cheerio'

export interface WebcontactRow {
  web_contact_id: number
  contact_name: string
  contact_email: string | null
  contact_phone: string | null
  received_at_text: string // raw "19/05/2026 17:38"
  received_at_iso: string | null
  property_tokko_id: number | null
  property_address: string | null
  property_thumbnail: string | null
  agent_name: string | null
  message: string | null
  tags: string[]
  source_portal: 'argenprop' | 'zonaprop' | 'web' | 'tokko' | 'manual' | null
  bucket: 'new' | 'assigned' | 'deleted'
}

function parseDateDdmmyyyy(raw: string | undefined | null): string | null {
  if (!raw) return null
  // "DD/MM/YYYY HH:MM" or "DD/MM/YYYY"
  const m = raw.match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/)
  if (!m) return null
  const [, dd, mm, yyyy, hh, min] = m
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh ?? 0), Number(min ?? 0))
  return date.toISOString()
}

function detectPortal(tags: string[]): WebcontactRow['source_portal'] {
  const lower = tags.map(t => t.toLowerCase())
  if (lower.includes('argenprop')) return 'argenprop'
  if (lower.includes('zonaprop')) return 'zonaprop'
  if (lower.includes('web')) return 'web'
  if (lower.includes('manual')) return 'manual'
  return 'tokko'
}

export function parseWebcontactsHtml(
  html: string,
  bucket: WebcontactRow['bucket'],
): WebcontactRow[] {
  const $ = cheerio.load(html)
  const rows: WebcontactRow[] = []

  $('div[id^="webcontact_container_"]').each((_, li) => {
    const $li = $(li)
    const id = $li.attr('id') ?? ''
    const idMatch = id.match(/webcontact_container_(\d+)/)
    if (!idMatch) return
    const web_contact_id = Number(idMatch[1])

    const contact_name = $li.find('.webcontact_name').first().text().trim()

    // Extract email/phone from li text-pattern "Email: <X>" and "Celular: <X>"
    const liText = $li.text()
    const emailMatch = liText.match(/Email:\s*([^\s<>]+@[^\s<>]+)/i)
    const phoneMatch = liText.match(/Celular:\s*([0-9+\-\s()]+)/i)
    const contact_email = emailMatch ? emailMatch[1].trim() : null
    const contact_phone = phoneMatch ? phoneMatch[1].trim() : null

    // Received at: <li title="DD/MM/YYYY HH:MM">
    const dateLi = $li.find('li[title]').first()
    const received_at_text = dateLi.attr('title') ?? ''
    const received_at_iso = parseDateDdmmyyyy(received_at_text)

    // Property: from JS onclick="open_property_display(X)"
    let property_tokko_id: number | null = null
    const onclickAttrs: string[] = []
    $li.find('[onclick]').each((_, el) => {
      const oc = $(el).attr('onclick')
      if (oc) onclickAttrs.push(oc)
    })
    for (const oc of onclickAttrs) {
      const m = oc.match(/open_property_display\((\d+)\)/)
      if (m) { property_tokko_id = Number(m[1]); break }
    }

    const property_address = $li.find('.web_contact_lead_address').first().text().trim() || null
    const property_thumbnail = $li.find('img.web_contact_lead_img').first().attr('src') ?? null

    // Agent
    const agent_name = $li.find('.webcontact_property_address_box div').first().text().trim() || null

    // Message
    const message = $li.find('.webcontact_msg').first().text().trim() || null

    // Tags
    const tags: string[] = []
    $li.find('.webcontact_tag_list div').each((_, t) => {
      const txt = $(t).text().trim()
      if (txt) tags.push(txt)
    })

    rows.push({
      web_contact_id,
      contact_name,
      contact_email,
      contact_phone,
      received_at_text,
      received_at_iso,
      property_tokko_id,
      property_address,
      property_thumbnail,
      agent_name,
      message,
      tags,
      source_portal: detectPortal(tags),
      bucket,
    })
  })

  return rows
}
