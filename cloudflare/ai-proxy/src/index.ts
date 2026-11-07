interface Env {
  OPENROUTER_API_KEY: string
  ALLOWED_ORIGINS: string
  PROXY_TOKEN?: string
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MAX_BODY_BYTES = 200_000
const MAX_MESSAGES = 4
const MAX_TOKENS = 2200

const ALLOWED_MODELS = new Set([
  'nvidia/nemotron-3.5-super-vl:free',
  'nvidia/nemotron-3.5-lightning:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'dots-studio/dots-3-note-preview:free',
])

function corsHeaders(origin: string, allowed: string[]) {
  const allowedOrigin = allowed.includes(origin) ? origin : allowed[0] || ''

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Proxy-Token',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

function json(data: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') || ''
    const allowed = (env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
    const headers = corsHeaders(origin, allowed)

    if (!allowed.includes(origin)) {
      return json({ error: 'Origin not allowed' }, 403, headers)
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers })
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, headers)
    }

    if (env.PROXY_TOKEN && request.headers.get('X-Proxy-Token') !== env.PROXY_TOKEN) {
      return json({ error: 'Unauthorized' }, 401, headers)
    }

    const raw = await request.text()
    if (raw.length > MAX_BODY_BYTES) {
      return json({ error: 'Payload too large' }, 413, headers)
    }

    let body: any
    try {
      body = JSON.parse(raw)
    } catch {
      return json({ error: 'Invalid JSON' }, 400, headers)
    }

    if (typeof body?.model !== 'string' || !ALLOWED_MODELS.has(body.model)) {
      return json({ error: 'Model not allowed' }, 400, headers)
    }

    if (!Array.isArray(body?.messages) || body.messages.length === 0 || body.messages.length > MAX_MESSAGES) {
      return json({ error: 'Invalid messages' }, 400, headers)
    }

    for (const message of body.messages) {
      if (
        !message ||
        typeof message.role !== 'string' ||
        typeof message.content !== 'string' ||
        message.content.length > 50_000
      ) {
        return json({ error: 'Invalid message' }, 400, headers)
      }
    }

    const maxTokens = Math.min(MAX_TOKENS, Math.max(256, Number(body.max_tokens) || 2000))
    const temperature = Math.min(1, Math.max(0, Number(body.temperature) || 0.7))

    try {
      const upstream = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://www.hivhestin.com',
          'X-Title': 'Hivhestin Blog',
        },
        body: JSON.stringify({
          model: body.model,
          messages: body.messages,
          temperature,
          max_tokens: maxTokens,
        }),
      })

      const text = await upstream.text()
      return new Response(text, {
        status: upstream.status,
        headers: {
          ...headers,
          'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
          'Cache-Control': 'no-store',
        },
      })
    } catch (error) {
      console.error('[AI_PROXY_UPSTREAM]', error)
      return json({ error: 'Upstream request failed' }, 502, headers)
    }
  },
}
