import nodemailer from 'nodemailer'
import path from 'path'
import { readFile } from 'fs/promises'

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

// Centralized Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_USE_TLS === 'true',
  auth: {
    user: process.env.EMAIL_HOST_USER,
    pass: process.env.EMAIL_HOST_PASSWORD,
  },
})

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  const from = process.env.EMAIL_FROM || `"Hivhestin" <${process.env.EMAIL_HOST_USER}>`

  try {
    const info = await transporter.sendMail({ from, to, subject, html, text })
    console.log('[EMAIL] Sent:', { to, subject, messageId: info.messageId })
    return info
  } catch (error) {
    console.error('[EMAIL] Send error:', error)
    throw error
  }
}

// Render HTML templates stored in src/emails/<locale>/<template>.html
export async function renderEmailTemplate(
  locale: string,
  templateName: string,
  variables: Record<string, string>
) {
  const filePath = path.join(process.cwd(), 'src', 'emails', locale, `${templateName}.html`)
  let html = await readFile(filePath, 'utf-8')

  // Simple replace for {{key}} placeholders
  for (const [key, value] of Object.entries(variables)) {
    const re = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
    html = html.replace(re, value ?? '')
  }

  return html
}