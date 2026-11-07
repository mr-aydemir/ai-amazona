function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function wrapTitle(title: string, maxChars = 26): string[] {
  const words = title.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length > maxChars && current) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
    if (lines.length === 2) break
  }

  if (current && lines.length < 3) lines.push(current)
  if (lines.length === 3) {
    const joined = lines.join(' ')
    if (joined.length < title.length) {
      lines[2] = `${lines[2].replace(/[.,;:!?]+$/, '')}…`
    }
  }

  return lines
}

export function renderBlogCoverSvg(title: string, index: number): string {
  const lines = wrapTitle(title)
  const lineHeight = 72
  const startY = 330 - ((lines.length - 1) * lineHeight) / 2
  const number = String(index).padStart(2, '0')

  const titleTspans = lines
    .map((line, i) => `<tspan x="80" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`)
    .join('')

  return `<svg width="1200" height="675" viewBox="0 0 1200 675" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="675" gradientUnits="userSpaceOnUse">
      <stop stop-color="#0A0A0D"/>
      <stop offset="0.55" stop-color="#121015"/>
      <stop offset="1" stop-color="#1B090C"/>
    </linearGradient>
    <radialGradient id="glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(980 110) rotate(125) scale(620)">
      <stop stop-color="#C8102E" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#C8102E" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="675" fill="url(#bg)"/>
  <rect width="1200" height="675" fill="url(#glow)"/>
  <g opacity="0.10" stroke="#FFFFFF">
    <path d="M0 150H1200M0 300H1200M0 450H1200M0 600H1200"/>
    <path d="M150 0V675M300 0V675M450 0V675M600 0V675M750 0V675M900 0V675M1050 0V675"/>
  </g>
  <g opacity="0.9">
    <path d="M860 250L1010 175L1160 250L1010 325L860 250Z" stroke="#C8102E" stroke-width="2"/>
    <path d="M860 250V430L1010 505V325" stroke="#FFFFFF" stroke-opacity="0.22" stroke-width="2"/>
    <path d="M1160 250V430L1010 505" stroke="#C8102E" stroke-opacity="0.65" stroke-width="2"/>
    <path d="M900 430L1050 355L1200 430L1050 505L900 430Z" stroke="#FFFFFF" stroke-opacity="0.14" stroke-width="2"/>
  </g>
  <text x="80" y="88" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" letter-spacing="6">HIVHESTIN</text>
  <text x="80" y="126" fill="#C8102E" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="700" letter-spacing="4">3D PRINTING GUIDE</text>
  <text x="80" y="${startY}" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-size="64" font-weight="800">${titleTspans}</text>
  <text x="80" y="616" fill="#A1A1AA" font-family="Arial, Helvetica, sans-serif" font-size="20">hivhestin.com</text>
  <text x="1120" y="90" text-anchor="end" fill="#FFFFFF" fill-opacity="0.10" font-family="Arial, Helvetica, sans-serif" font-size="150" font-weight="800">${number}</text>
</svg>`
}
