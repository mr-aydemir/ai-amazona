import { Suspense } from 'react'
import { XCircle, AlertTriangle, CreditCard, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

interface PaymentErrorPageProps {
  searchParams: Promise<{
    error?: string
    message?: string
    conversationId?: string
  }>
}

function getErrorDetails(error: string, message?: string, t?: any) {
  const errorKey = error as keyof typeof errorTypes
  const errorTypes = {
    '3ds_failed': 'error.3ds_failed',
    'payment_failed': 'error.payment_failed',
    'unauthorized': 'error.unauthorized',
    'invalid_data': 'error.invalid_data',
    'completion_failed': 'error.completion_failed',
    'callback_error': 'error.callback_error',
    'invalid_callback_method': 'error.invalid_callback_method'
  }

  const errorType = errorTypes[errorKey] || 'error.unknown'

  return {
    title: t ? t(`${errorType}.title`) : 'Payment Error',
    description: t ? (message || t(`${errorType}.description`)) : (message || 'An unknown error occurred. Please try again.'),
    icon: error === '3ds_failed' ? <CreditCard className="w-8 h-8 text-danger-600" /> :
      error === 'unauthorized' ? <AlertTriangle className="w-8 h-8 text-warning-600" /> :
        error === 'invalid_data' ? <AlertTriangle className="w-8 h-8 text-warning-600" /> :
          error === 'invalid_callback_method' ? <AlertTriangle className="w-8 h-8 text-warning-600" /> :
            <XCircle className="w-8 h-8 text-danger-600" />
  }
}

async function PaymentErrorContent({ searchParams }: { searchParams: { error?: string; message?: string; conversationId?: string } }) {
  const { error = 'unknown', message, conversationId } = searchParams
  const t = await getTranslations('payment')
  const errorDetails = getErrorDetails(error, message, t)

  return (
    <div className="min-h-screen bg-gradient-to-br from-danger-50 to-danger-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-danger-100 rounded-full flex items-center justify-center mb-4">
            {errorDetails.icon}
          </div>
          <CardTitle className="text-2xl font-bold text-danger-800">
            {errorDetails.title}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Error Description */}
          <Alert className="border-danger-200 bg-danger-50">
            <AlertTriangle className="h-4 w-4 text-danger-600" />
            <AlertDescription className="text-danger-800">
              {errorDetails.description}
            </AlertDescription>
          </Alert>

          {/* Error Details */}
          {conversationId && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{t('error.transactionId')}</span>
                <span className="text-sm font-mono text-foreground">#{conversationId.slice(-8).toUpperCase()}</span>
              </div>
            </div>
          )}

          {/* Suggestions */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">{t('error.suggestions.title')}</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 bg-muted rounded-full mt-2 flex-shrink-0"></span>
                <span>{t('error.suggestions.checkCardInfo')}</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 bg-muted rounded-full mt-2 flex-shrink-0"></span>
                <span>{t('error.suggestions.checkCardLimit')}</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 bg-muted rounded-full mt-2 flex-shrink-0"></span>
                <span>{t('error.suggestions.tryDifferentCard')}</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 bg-muted rounded-full mt-2 flex-shrink-0"></span>
                <span>{t('error.suggestions.checkConnection')}</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button asChild className="w-full bg-danger-600 hover:bg-danger-700">
              <Link href="/checkout">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('error.actions.backToPayment')}
              </Link>
            </Button>

            <Button asChild variant="outline" className="w-full">
              <Link href="/cart">
                {t('error.actions.viewCart')}
              </Link>
            </Button>

            <Button asChild variant="ghost" className="w-full">
              <Link href="/">
                {t('error.actions.backToHome')}
              </Link>
            </Button>
          </div>

          {/* Support Info */}
          <div className="text-center pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              {t('error.support.contactText')}{' '}
              <Link href="/contact" className="text-danger-600 hover:underline">
                {t('error.support.customerService')}
              </Link>
              {' '}ile iletişime geçin.
            </p>
            {conversationId && (
              <p className="text-xs text-muted-foreground mt-1">
                {t('error.support.supportNote')}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default async function PaymentErrorPage({ searchParams }: PaymentErrorPageProps) {
  const resolvedSearchParams = await searchParams

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-danger-50 to-danger-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-danger-600"></div>
      </div>
    }>
      <PaymentErrorContent searchParams={resolvedSearchParams} />
    </Suspense>
  )
}