/**
 * GET /api/docs/debug-files?propertyId=XXXX
 * Diagnostic endpoint: logs into Tokko and returns the RAW API response
 * for a specific property's file list. Use to diagnose sync issues.
 */

import { NextResponse } from 'next/server'
import { getTokkoHttpModule, getSyncConfig } from '@/lib/docs/sync-bridge'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId')

    if (!propertyId) {
      return NextResponse.json({ error: 'Falta propertyId. Ejemplo: /api/docs/debug-files?propertyId=7973079' }, { status: 400 })
    }

    const config = getSyncConfig()
    if (!config.tokkoEmail || !config.tokkoPassword) {
      return NextResponse.json({ error: 'Faltan TOKKO_EMAIL o TOKKO_PASSWORD en tokko-drive-sync/.env' }, { status: 500 })
    }

    const tokkoHttp = getTokkoHttpModule()

    // Force fresh login — ignore any cached session state
    tokkoHttp.resetLogin()

    // Step 1: Login with cookie jar — will throw if credentials are wrong
    await tokkoHttp.login(config.tokkoEmail, config.tokkoPassword)

    // Step 1b: Inspect what cookies were set
    const sessionInfo = await tokkoHttp.inspectSession()
    // Step 2: Raw responses from multiple endpoints using the authenticated _debugGetHtml client
    const endpoints = [
      `/multiuploader/main/${propertyId}/?type=files&get_files=true`,
      `/multiuploader/main/${propertyId}/?type=all&get_files=true`,
      `/multiuploader/main/${propertyId}/`,
    ]

    const results: Record<string, unknown>[] = []

    for (const ep of endpoints) {
      try {
        const rawData = await tokkoHttp._debugGetHtml(ep)
        const preview = typeof rawData === 'string'
          ? rawData.slice(0, 600)
          : JSON.stringify(rawData).slice(0, 600)
        results.push({
          endpoint: ep,
          responseType: Array.isArray(rawData) ? 'array' : typeof rawData,
          isArray: Array.isArray(rawData),
          arrayLength: Array.isArray(rawData) ? rawData.length : null,
          preview,
        })
      } catch (e: unknown) {
        results.push({ endpoint: ep, error: e instanceof Error ? e.message : String(e) })
      }
    }

    // Step 3: Call getPropertyFiles with full diagnostic logging
    const files = await tokkoHttp.getPropertyFiles(propertyId)

    return NextResponse.json({
      propertyId,
      loginOk: sessionInfo.hasSessionId,
      sessionCookies: sessionInfo.cookies,
      filesFound: files.length,
      files,
      rawEndpointResults: results,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

