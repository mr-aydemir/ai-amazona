import { prisma } from '@/lib/prisma'
import { sendEmail, renderEmailTemplate } from '@/lib/email'
import { defaultLocale } from '@/i18n/config'

export async function sendStaffQuestionNotification(questionId: string) {
  try {
    const adminUsers = await prisma.user.findMany({
      where: { OR: [{ role: 'ADMIN' }, { role: 'STAFF' }] },
      select: { email: true }
    })

    if (!adminUsers || adminUsers.length === 0) {
      console.log('[QUESTION_EMAIL] No admin/staff users found, skipping')
      return
    }

    const question = await prisma.productQuestion.findUnique({
      where: { id: questionId },
      include: {
        product: { include: { translations: true } },
        user: { select: { name: true, email: true } }
      }
    })

    if (!question) {
      console.warn('[QUESTION_EMAIL] Question not found:', questionId)
      return
    }

    const staffLocale: 'tr' | 'en' = (defaultLocale as 'en' | 'tr')

    const productName = (() => {
      const translations = question.product?.translations || []
      const t = translations.find((l: any) => l.locale === staffLocale)
      return t?.name ?? question.product?.name ?? ''
    })()

    const askerName = question.hideName
      ? (staffLocale === 'en' ? 'Anonymous' : 'Anonim')
      : (question.user?.name || question.guestName || question.user?.email || question.guestEmail || (staffLocale === 'en' ? 'Anonymous' : 'Anonim'))

    const isPublicText = question.isPublic
      ? (staffLocale === 'en' ? 'Public' : 'Herkese Açık')
      : (staffLocale === 'en' ? 'Private' : 'Gizli')

    const createdAtText = question.createdAt
      ? new Date(question.createdAt).toLocaleString(staffLocale === 'en' ? 'en-US' : 'tr-TR')
      : ''

    const originEnv = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || ''
    const adminUrl = `${originEnv}/${staffLocale}/admin/questions`

    const html = await renderEmailTemplate(staffLocale, 'staff-question-received', {
      productName,
      askerName,
      isPublicText,
      createdAtText,
      questionContent: question.content,
      adminUrl,
    })

    const shortId = `#${questionId.slice(-8)}`
    const subject = staffLocale === 'en'
      ? `New Product Question ${shortId}`
      : `Yeni Ürün Sorusu ${shortId}`

    for (const r of adminUsers) {
      try {
        await sendEmail({ to: r.email, subject, html })
      } catch (e) {
        console.error('[QUESTION_EMAIL] Send error to', r.email, e)
      }
    }
  } catch (error) {
    console.error('[QUESTION_EMAIL] Failed to send staff question notification:', error)
  }
}