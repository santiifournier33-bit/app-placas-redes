import { NextResponse } from "next/server"

export const revalidate = 3600

export async function GET() {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const res = await fetch("https://dolarhoy.com/cotizaciondolarblue", {
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch dolarhoy" }, { status: 502 })
    }

    const html = await res.text()
    const match = html.match(/compra[^$]*?\$\s*([\d.,]+)/i)

    if (!match) {
      return NextResponse.json({ error: "Could not parse exchange rate" }, { status: 502 })
    }

    const blueBuy = parseFloat(match[1].replace(/\./g, "").replace(",", "."))
    if (isNaN(blueBuy) || blueBuy <= 0) {
      return NextResponse.json({ error: "Invalid rate parsed" }, { status: 502 })
    }

    return NextResponse.json({
      blueBuy,
      date: new Date().toISOString().slice(0, 10),
      source: "dolarhoy",
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
