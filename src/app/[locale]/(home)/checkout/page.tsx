import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import CheckoutGuard from '@/components/checkout/checkout-guard'
import { ShippingForm } from '@/components/checkout/shipping-form'
import { OrderSummaryCartContainer } from '@/components/checkout/order-summary-cart-container'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import CheckoutSteps from '@/components/checkout/checkout-steps'

export const metadata: Metadata = {
  title: 'Checkout'
}

interface CheckoutPageProps {
  params: Promise<{ locale: string }>
}

export default async function CheckoutPage(props: CheckoutPageProps) {
  const { locale } = await props.params
  const tCart = await getTranslations('cart')

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
            <ShippingForm />
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
