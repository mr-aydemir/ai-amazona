import fs from 'node:fs/promises'
import path from 'node:path'
import QRCode from 'qrcode'
import { PNG } from 'pngjs'

const CANVAS_WIDTH = 990
const CANVAS_HEIGHT = 1143
const QR_SIZE = 950
const QR_LEFT = 20
const QR_TOP = 15
const QR_CENTER_X = QR_LEFT + Math.round(QR_SIZE / 2)
const QR_CENTER_Y = QR_TOP + Math.round(QR_SIZE / 2)
const WHITE_BOX_WIDTH = 360
const WHITE_BOX_HEIGHT = 300
const WHITE_BOX_RADIUS = 40
const LOGO_WIDTH = 254
const LOGO_HEIGHT = 155
const TEXT_TOP = 975

interface Bitmap {
  width: number
  height: number
  data: Buffer
}

function templatePath(name: string) {
  return path.join(process.cwd(), 'public', 'images', name)
}

function createCanvas(width: number, height: number): Bitmap {
  const data = Buffer.alloc(width * height * 4)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255
    data[i + 1] = 255
    data[i + 2] = 255
    data[i + 3] = 255
  }
  return { width, height, data }
}

function blendOver(dst: Bitmap, x: number, y: number, r: number, g: number, b: number, a: number) {
  if (a <= 0 || x < 0 || y < 0 || x >= dst.width || y >= dst.height) return
  const i = (y * dst.width + x) * 4
  const alpha = Math.min(1, a)
  dst.data[i] = Math.round(dst.data[i] * (1 - alpha) + r * alpha)
  dst.data[i + 1] = Math.round(dst.data[i + 1] * (1 - alpha) + g * alpha)
  dst.data[i + 2] = Math.round(dst.data[i + 2] * (1 - alpha) + b * alpha)
  dst.data[i + 3] = 255
}

function blitScaled(
  dst: Bitmap,
  src: Bitmap,
  dstX: number,
  dstY: number,
  dstW: number,
  dstH: number
) {
  for (let dy = 0; dy < dstH; dy++) {
    const sy0 = Math.floor((dy * src.height) / dstH)
    const sy1 = Math.max(sy0 + 1, Math.floor(((dy + 1) * src.height) / dstH))
    for (let dx = 0; dx < dstW; dx++) {
      const sx0 = Math.floor((dx * src.width) / dstW)
      const sx1 = Math.max(sx0 + 1, Math.floor(((dx + 1) * src.width) / dstW))

      let r = 0
      let g = 0
      let b = 0
      let a = 0
      let count = 0

      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          const i = (sy * src.width + sx) * 4
          r += src.data[i]
          g += src.data[i + 1]
          b += src.data[i + 2]
          a += src.data[i + 3]
          count++
        }
      }

      blendOver(dst, dstX + dx, dstY + dy, r / count, g / count, b / count, a / count / 255)
    }
  }
}

function drawRoundedRect(dst: Bitmap, left: number, top: number, width: number, height: number, radius: number) {
  const samples = 4
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let inside = 0
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const px = x + (sx + 0.5) / samples
          const py = y + (sy + 0.5) / samples
          const cx = Math.min(Math.max(px, radius), width - radius)
          const cy = Math.min(Math.max(py, radius), height - radius)
          const dx = px - cx
          const dy = py - cy
          if (dx * dx + dy * dy <= radius * radius) inside++
        }
      }
      const alpha = inside / (samples * samples)
      if (alpha > 0) blendOver(dst, left + x, top + y, 255, 255, 255, alpha)
    }
  }
}

/**
 * Generates the ETBİS "registered" badge served in the footer.
 * The output matches the original badge layout: QR code, centered ETBİS
 * logo and the red "ETBİS'e Kayıtlıdır." caption.
 *
 * This is implemented with pure JavaScript (qrcode + pngjs) so it does not
 * depend on native image libraries being present in the runtime image.
 */
export async function generateEtbisQr(url: string): Promise<string> {
  const [logoSource, textSource, qrBuffer] = await Promise.all([
    fs.readFile(templatePath('etbis-logo.png')),
    fs.readFile(templatePath('etbis-text.png')),
    QRCode.toBuffer(url, {
      type: 'png',
      errorCorrectionLevel: 'H',
      margin: 0,
      width: QR_SIZE,
    }),
  ])

  const logoPng = PNG.sync.read(logoSource)
  const textPng = PNG.sync.read(textSource)
  const qrPng = PNG.sync.read(qrBuffer)

  const logo: Bitmap = { width: logoPng.width, height: logoPng.height, data: logoPng.data }
  const text: Bitmap = { width: textPng.width, height: textPng.height, data: textPng.data }
  const qr: Bitmap = { width: qrPng.width, height: qrPng.height, data: qrPng.data }

  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT)

  blitScaled(canvas, qr, QR_LEFT, QR_TOP, QR_SIZE, QR_SIZE)

  drawRoundedRect(
    canvas,
    QR_CENTER_X - Math.round(WHITE_BOX_WIDTH / 2),
    QR_CENTER_Y - Math.round(WHITE_BOX_HEIGHT / 2),
    WHITE_BOX_WIDTH,
    WHITE_BOX_HEIGHT,
    WHITE_BOX_RADIUS
  )

  blitScaled(
    canvas,
    logo,
    QR_CENTER_X - Math.round(LOGO_WIDTH / 2),
    QR_CENTER_Y - Math.round(LOGO_HEIGHT / 2),
    LOGO_WIDTH,
    LOGO_HEIGHT
  )

  const textHeight = Math.round((text.height / text.width) * CANVAS_WIDTH)
  blitScaled(canvas, text, 0, TEXT_TOP, CANVAS_WIDTH, textHeight)

  const out = new PNG({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT })
  canvas.data.copy(out.data)
  const buffer = PNG.sync.write(out)

  return `data:image/png;base64,${buffer.toString('base64')}`
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}
