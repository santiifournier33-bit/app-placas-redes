/**
 * POST /api/docs/sync
 * Executes synchronization via an external Node.js worker process.
 * This avoids axios-cookiejar-support incompatibility with Next.js App Router runtime.
 * Returns Server-Sent Events for real-time progress.
 *
 * Body: { mode: "folders" | "files" | "classify", agent: string | null }
 */

import { spawn } from 'child_process'
import path from 'path'
import { getSyncConfig } from '@/lib/docs/sync-bridge'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const mode: string = body.mode || 'folders'
    const agentFilter: string | null = body.agent || null

    const config = getSyncConfig()

    if (!config.tokkoApiKey || !config.rootFolderId) {
      return new Response(JSON.stringify({ error: 'Faltan variables de entorno (TOKKO_API_KEY, GOOGLE_DRIVE_ROOT_FOLDER_ID)' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const workerPath = [process.cwd(), 'tokko-drive-sync', 'src', 'worker.js'].join(path.sep)

    const command = JSON.stringify({
      cmd: 'sync',
      mode,
      agentFilter,
      config: {
        tokkoApiKey: config.tokkoApiKey,
        rootFolderId: config.rootFolderId,
        tokkoEmail: config.tokkoEmail,
        tokkoPassword: config.tokkoPassword,
        oauthClientPath: config.oauthClientPath,
      },
    })

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        function send(data: Record<string, unknown>) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }

        const child = spawn('node', [workerPath], {
          cwd: path.join(process.cwd(), 'tokko-drive-sync'),
          stdio: ['pipe', 'pipe', 'pipe'],
        })

        // Send the command via stdin
        child.stdin.write(command)
        child.stdin.end()

        // Parse stdout line by line (each line is a JSON event)
        let buffer = ''
        child.stdout.on('data', (chunk: Buffer) => {
          buffer += chunk.toString('utf8')
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed) continue
            try {
              const event = JSON.parse(trimmed)
              send(event)
            } catch {
              send({ type: 'progress', message: trimmed })
            }
          }
        })

        child.stderr.on('data', (chunk: Buffer) => {
          const msg = chunk.toString('utf8').trim()
          if (msg) {
            // stderr is usually debug logs — only surface actual errors
            if (msg.toLowerCase().includes('error')) {
              send({ type: 'error', message: msg })
            }
          }
        })

        await new Promise<void>((resolve) => {
          child.on('close', (code) => {
            if (code !== 0) {
              send({ type: 'error', message: `Worker terminó con código ${code}` })
            }
            resolve()
          })

          child.on('error', (err) => {
            send({ type: 'error', message: `No se pudo iniciar el worker: ${err.message}` })
            resolve()
          })
        })

        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
