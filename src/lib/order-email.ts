import { prisma } from '@/lib/prisma'
import { sendEmail, renderEmailTemplate } from '@/lib/email'
import { getUserPreferredLocale } from '@/lib/user-locale'
import { getCurrencyData } from '@/lib/server-currency'

export async function sendOrderReceivedEmail(orderId: string) {
  try {
    const baseOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true }
    })

    if (!baseOrder) {
      console.warn('[ORDER_EMAIL] Order not found:', orderId)
      return
    }

    const userLocale = baseOrder.userId
      ? await getUserPreferredLocale(baseOrder.userId)
      : 'tr'

    //const locales = [userLocale, 'en', 'tr']

    const orderForEmail = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        items: {
          include: {
            product: {
              include: {
                translations: true
              }
            }
          }
        }
      }
    })

    const to = baseOrder.shippingEmail || orderForEmail?.user?.email || ''
    if (!to) {
      console.warn('[ORDER_EMAIL] No recipient email for order:', orderId)
      return
    }

    // Prefer payment currency stored on the order; fallback by locale
    const displayCurrency = baseOrder.paymentCurrency || (userLocale === 'en' ? 'USD' : 'TRY')
    const conversionRate = baseOrder.conversionRate ?? (await (async () => {
      try {
        const { baseCurrency, rates } = await getCurrencyData()
        const map = new Map(rates.map(r => [r.currency, r.rate]))
        const baseRate = Number(map.get(baseCurrency)) || 1
        const displayRate = Number(map.get(displayCurrency)) || baseRate
        return displayRate / baseRate
      } catch {
        return 1
      }
    })())

    const itemsHtml = (orderForEmail?.items || [])
      .map((it) => {
        const translations = it.product?.translations || []

        const name = translations.find(l => l.locale === userLocale)?.name ?? it.product.name
        const qty = it.quantity
        const lineTotalDisplay = (it.price * qty * conversionRate)
        const lineTotalFormatted = new Intl.NumberFormat(
          userLocale === 'en' ? 'en-US' : 'tr-TR',
          { style: 'currency', currency: displayCurrency }
        ).format(lineTotalDisplay)

        return `<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #eee;padding:8px 0;">
                <div style="color:#333;font-size:14px;">${name} × ${qty}</div>
                <div style="color:#555;font-size:13px;">${lineTotalFormatted}</div>
              </div>`
      })
      .join('')

    const totalDisplayAmount = typeof baseOrder.paidAmount === 'number'
      ? baseOrder.paidAmount
      : baseOrder.total * conversionRate
    const totalFormatted = new Intl.NumberFormat(
      userLocale === 'en' ? 'en-US' : 'tr-TR',
      { style: 'currency', currency: displayCurrency }
    ).format(totalDisplayAmount)

    const orderDateFormatted = baseOrder.createdAt
      ? new Date(baseOrder.createdAt).toLocaleString(
        userLocale === 'en' ? 'en-US' : 'tr-TR'
      )
      : ''

    const orderUrl = `${process.env.NEXTAUTH_URL}/${userLocale}/order-confirmation/${orderId}`

    const html = await renderEmailTemplate(userLocale, 'order-received', {
      orderId: orderId,
      userName: baseOrder.shippingFullName || orderForEmail?.user?.name || '',
      total: totalFormatted,
      orderDate: orderDateFormatted,
      itemsHtml,
      orderUrl,
    })

    const subject =
      userLocale === 'en'
        ? 'Order Received - Hivhestin'
        : 'Siparişiniz Alındı - Hivhestin'

    await sendEmail({ to, subject, html })
  } catch (error) {
    console.error('[ORDER_EMAIL] Failed to send order received email:', error)
  }
}