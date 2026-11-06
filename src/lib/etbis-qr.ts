import fs from 'node:fs/promises'
import path from 'node:path'
import QRCode from 'qrcode'
import sharp from 'sharp'

const CANVAS_WIDTH = 990
const CANVAS_HEIGHT = 1143
const QR_SIZE = 950
const QR_LEFT = 20
const QR_TOP = 15
const QR_CENTER_X = QR_LEFT + Math.round(QR_SIZE / 2)
const QR_CENTER_Y = QR_TOP + Math.round(QR_SIZE / 2)
const WHITE_BOX_WIDTH = 360
const WHITE_BOX_HEIGHT = 300
const LOGO_WIDTH = 254
const LOGO_HEIGHT = 155
const TEXT_TOP = 975

function templatePath(name: string) {
  return path.join(process.cwd(), 'public', 'images', name)
}

/**
 * Generates the ETBİS "registered" badge served in the footer.
 * The output matches the original badge layout: QR code, centered ETBİS
 * logo and the red "ETBİS'e Kayıtlıdır." caption.
 */
export async function generateEtbisQr(url: string): Promise<string> {
  const [logoSource, textSource] = await Promise.all([
    fs.readFile(templatePath('etbis-logo.png')),
    fs.readFile(templatePath('etbis-text.png')),
  ])

  const [qrBuffer, logoBuffer, textBuffer] = await Promise.all([
    QRCode.toBuffer(url, {
      type: 'png',
      errorCorrectionLevel: 'H',
      margin: 0,
      width: QR_SIZE,
    }),
    sharp(logoSource)
      .resize(LOGO_WIDTH, LOGO_HEIGHT, { fit: 'contain', background: '#ffffff' })
      .png()
      .toBuffer(),
    sharp(textSource)
      .resize(CANVAS_WIDTH, Math.round((CANVAS_WIDTH / 1980) * 335))
      .png()
      .toBuffer(),
  ])

  const whiteBox = Buffer.from(
    `<svg width="${WHITE_BOX_WIDTH}" height="${WHITE_BOX_HEIGHT}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect width="${WHITE_BOX_WIDTH}" height="${WHITE_BOX_HEIGHT}" rx="40" ry="40" fill="#ffffff"/>` +
      `</svg>`
  )

  const png = await sharp({
    create: {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      channels: 4,
      background: '#ffffff',
    },
  })
    .composite([
      { input: qrBuffer, left: QR_LEFT, top: QR_TOP },
      {
        input: whiteBox,
        left: QR_CENTER_X - Math.round(WHITE_BOX_WIDTH / 2),
        top: QR_CENTER_Y - Math.round(WHITE_BOX_HEIGHT / 2),
      },
      {
        input: logoBuffer,
        left: QR_CENTER_X - Math.round(LOGO_WIDTH / 2),
        top: QR_CENTER_Y - Math.round(LOGO_HEIGHT / 2),
      },
      { input: textBuffer, left: 0, top: TEXT_TOP },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer()

  return `data:image/png;base64,${png.toString('base64')}`
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}
