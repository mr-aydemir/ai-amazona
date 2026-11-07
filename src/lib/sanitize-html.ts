import sanitizeHtml from 'sanitize-html'

const BLOCK_LEVEL_TAG = /<(p|h[1-6]|ul|ol|li|div|blockquote|table|thead|tbody|tr|th|td|pre)\b/i

export function sanitizeRichHtml(input: string | null | undefined): string {
  let html = typeof input === 'string' ? input : ''
  // Only convert newlines for plain-text input. In HTML content, newlines
  // between block elements are formatting whitespace and must not become <br/>.
  if (!BLOCK_LEVEL_TAG.test(html)) {
    html = html.replace(/\r?\n/g, '<br/>')
  }
  return sanitizeHtml(html, {
    allowedTags: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'blockquote', 'ul', 'ol', 'li',
      'a', 'strong', 'em', 'u', 'i', 'span', 'div',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'img', 'pre', 'code'
    ],
    disallowedTagsMode: 'discard',
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt'],
      table: ['border'],
      span: [],
      div: [],
      pre: [],
      code: [],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowProtocolRelative: true,
    transformTags: {
      a: (tagName, attribs) => {
        const href = (attribs.href || '').trim().toLowerCase()
        if (href.startsWith('javascript:')) {
          delete attribs.href
        }
        if (attribs.target && attribs.target !== '_blank') {
          delete attribs.target
        }
        attribs.rel = 'noopener noreferrer nofollow'
        return { tagName, attribs }
      },
      img: (tagName, attribs) => {
        const src = (attribs.src || '').trim().toLowerCase()
        // Block data URIs and javascript URLs
        if (!src || src.startsWith('data:') || src.startsWith('javascript:')) {
          delete attribs.src
        }
        return { tagName, attribs }
      },
    },
    enforceHtmlBoundary: true,
  })
}

export function sanitizeText(input: string | null | undefined): string {
  const html = typeof input === 'string' ? input : ''
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
}

export function sanitizeMapEmbed(input: string | null | undefined): string {
  const html = typeof input === 'string' ? input : ''
  return sanitizeHtml(html, {
    allowedTags: ['iframe'],
    allowedAttributes: {
      iframe: ['src', 'width', 'height', 'allow', 'loading', 'referrerpolicy']
    },
    transformTags: {
      iframe: (tagName, attribs) => {
        const src = (attribs.src || '').trim().toLowerCase()
        // Only allow Google Maps embed URLs
        const allowed = src.includes('google.com/maps') || src.includes('maps.google.com/maps')
        if (!allowed) {
          // Strip src to neutralize non-google iframes
          delete attribs.src
        }
        return { tagName, attribs }
      }
    },
    enforceHtmlBoundary: true,
  })
}
