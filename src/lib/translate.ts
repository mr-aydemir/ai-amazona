// Note: Removed 'server-only' import to allow usage in Node scripts.

// FTAPI PythonAnywhere:
// Endpoint examples:
//   /translate?sl=tr&dl=en&text=merhaba dünya
//   /translate?dl=en&text=merhaba dünya (source auto-detect)
// Response contains `destination-text` with translated string.

async function translateViaFTAPI(text: string, from = 'tr', to = 'en'): Promise<string> {
  const base = (process.env.TRANSLATE_API_URL || 'https://ftapi.pythonanywhere.com').replace(/\/$/, '')
  const url = `${base}/translate?sl=${encodeURIComponent(from)}&dl=${encodeURIComponent(to)}&text=${encodeURIComponent(text)}`
  try {
    const res = await fetch(url, { method: 'GET' })
    const raw = await res.text()
    let json: any = raw
    try { json = JSON.parse(raw) } catch { /* keep raw for fallback */ }
    const translated = typeof json?.['destination-text'] === 'string' ? json['destination-text'] : null
    if (translated && translated.trim().length > 0) {
      return translated.trim()
    }
    // Fallback if API returned unexpected format
    return text
  } catch {
    // Network/API error: return original text
    return text
  }
}

export async function translateToEnglish(text: string): Promise<string> {
  const input = (text || '').toString()
  if (!input.trim()) return ''
  return await translateViaFTAPI(input, 'tr', 'en')
}