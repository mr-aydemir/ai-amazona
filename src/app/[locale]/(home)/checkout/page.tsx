import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import CheckoutGuard from '@/components/checkout/checkout-guard'
import { ShippingForm } from '@/components/checkout/shipping-form'
import { OrderSummaryCartContainer } from '@/components/checkout/order-summary-cart-container'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import CheckoutSteps from '@/components/checkout/checkout-steps'
import prisma from '@/lib/prisma'

export const metadata: Metadata = {
  title: 'Checkout'
}

interface CheckoutPageProps {
  params: Promise<{ locale: string }>
}

export default async function CheckoutPage(props: CheckoutPageProps) {
  const { locale } = await props.params
  const tCart = await getTranslations('cart')
  const session = await auth()

  // Require login for checkout; after login, continue from this page
  if (!session?.user?.id) {
    const callback = `/${locale}/checkout`
    redirect(`/${locale}/auth/signin?callbackUrl=${encodeURIComponent(callback)}`)
  }

  // Fetch legal contents on the server side
  let termsHtml: string | null = null
  let privacyHtml: string | null = null

  try {
    let termsPage = await prisma.termsPage.findFirst({ where: { slug: 'terms' } })
    if (!termsPage) {
      termsPage = await prisma.termsPage.create({ data: { slug: 'terms' } })
    }
    const termsT = await prisma.termsPageTranslation.findUnique({
      where: { termsPageId_locale: { termsPageId: termsPage.id, locale } },
    })
    termsHtml = termsT?.contentHtml || null
  } catch (e) {
    termsHtml = null
  }

  try {
    let privacyPage = await prisma.privacyPage.findFirst({ where: { slug: 'privacy' } })
    if (!privacyPage) {
      privacyPage = await prisma.privacyPage.create({ data: { slug: 'privacy' } })
    }
    const privacyT = await prisma.privacyPageTranslation.findUnique({
      where: { privacyPageId_locale: { privacyPageId: privacyPage.id, locale } },
    })
    privacyHtml = privacyT?.contentHtml || null
  } catch (e) {
    privacyHtml = null
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Sepet boşsa koruma */}
      <CheckoutGuard />

      {/* Adım göstergesi */}
      <CheckoutSteps currentStep={2} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Teslimat / Adres seçim formu */}

        <Card className="shadow-lg border-border bg-background  space-y-4">
          <CardHeader className="bg-muted">
            <CardTitle className="text-foreground">{tCart('checkout.shipping_info')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ShippingForm termsHtml={termsHtml} privacyHtml={privacyHtml} />
          </CardContent>
        </Card>

        {/* Yeni Order Summary */}
        <div>

          <Card className="shadow-lg border-border bg-background space-y-4">
            <CardHeader className="bg-muted">
              <CardTitle className="text-foreground">{tCart('checkout.order_summary')}</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderSummaryCartContainer />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
