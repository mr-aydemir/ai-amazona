'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Loader2, Mail, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'

type VerificationStatus = 'loading' | 'success' | 'error' | 'expired' | 'invalid'

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<VerificationStatus>('loading')
  const [message, setMessage] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const t = useTranslations('auth.verify_email')
  const locale = useLocale()
  const hasRequestedRef = useRef(false)

  const verifyEmail = useCallback(async (verificationToken: string) => {
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: verificationToken }),
      })

      const data = await response.json()

      if (response.ok) {
        if (data.alreadyVerified) {
          setStatus('success')
          setMessage(data.message || t('success_message'))
          toast.info(t('success_message'))
        } else {
          setStatus('success')
          setMessage(data.message || t('success_message'))
          toast.success(t('success_message'))
        }

        // Redirect to sign in page after 3 seconds
        setTimeout(() => {
          router.push('/auth/signin')
        }, 3000)
      } else {
        if (response.status === 400 && data.message?.includes('süresi dolmuş')) {
          setStatus('expired')
          setMessage(t('expired_message'))
        } else {
          setStatus('error')
          setMessage(data.message || t('error_message'))
        }
        toast.error(data.message || t('error_message'))
      }
    } catch (error) {
      console.error('Verification error:', error)
      setStatus('error')
      setMessage(t('error_message'))
      toast.error(t('error_message'))
    }
  }, [router, t])

  useEffect(() => {
    if (!token) {
      setStatus('invalid')
      setMessage(t('token_not_found'))
      return
    }

    // Guard against double invocation in React Strict Mode (dev) or re-renders
    if (hasRequestedRef.current) return
    hasRequestedRef.current = true
    verifyEmail(token)
  }, [token, verifyEmail])

  const resendVerificationEmail = async () => {
    try {
      // Get email from URL params or ask user to enter it
      const urlParams = new URLSearchParams(window.location.search)
      const email = urlParams.get('email')

      if (!email) {
        // If no email in URL, we need to ask user for their email
        const userEmail = prompt('Doğrulama e-postasını yeniden göndermek için e-posta adresinizi girin:')
        if (!userEmail) return

        await sendResendRequest(userEmail)
      } else {
        await sendResendRequest(email)
      }
    } catch (error) {
      console.error('Resend error:', error)
      toast.error('Bir hata oluştu. Lütfen tekrar deneyin.')
    }
  }

  const sendResendRequest = async (email: string) => {
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, locale }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(data.message || 'Doğrulama e-postası yeniden gönderildi!')
        setMessage('Doğrulama e-postası yeniden gönderildi. Lütfen gelen kutunuzu kontrol edin.')
      } else {
        toast.error(data.message || 'E-posta gönderilemedi.')
      }
    } catch (error) {
      console.error('Send resend request error:', error)
      toast.error('Bağlantı hatası. Lütfen tekrar deneyin.')
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />
      case 'success':
        return <CheckCircle className="h-16 w-16 text-green-500" />
      case 'error':
      case 'expired':
      case 'invalid':
        return <XCircle className="h-16 w-16 text-red-500" />
      default:
        return <Mail className="h-16 w-16 text-muted-foreground" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'loading':
        return 'text-blue-600 dark:text-blue-400'
      case 'success':
        return 'text-green-600 dark:text-green-400'
      case 'error':
      case 'expired':
      case 'invalid':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-muted-foreground'
    }
  }

  const getStatusTitle = () => {
    switch (status) {
      case 'loading':
        return t('verifying')
      case 'success':
        return t('success_title')
      case 'error':
        return t('error_title')
      case 'expired':
        return t('expired_title')
      case 'invalid':
        return t('invalid_title')
      default:
        return t('title')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Home Link */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('back_to_home')}
          </Link>
        </div>

        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              {getStatusIcon()}
            </div>
            <CardTitle className={`text-2xl font-bold ${getStatusColor()}`}>
              {getStatusTitle()}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {status === 'loading' && t('please_wait')}
              {status === 'success' && t('success_message')}
              {status === 'error' && t('error_message')}
              {status === 'expired' && t('expired_message')}
              {status === 'invalid' && t('invalid_message')}
            </CardDescription>
          </CardHeader>

          <CardContent className="text-center space-y-4">
            {/* Status Message */}
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-foreground leading-relaxed">
                {message}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {status === 'success' && (
                <div className="space-y-2">
                  <Button
                    onClick={() => router.push('/auth/signin')}
                    className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
                  >
                    {t('go_to_signin')}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    {t('redirecting_in_seconds')}
                  </p>
                </div>
              )}

              {(status === 'error' || status === 'expired') && (
                <div className="space-y-2">
                  <Button
                    onClick={resendVerificationEmail}
                    variant="outline"
                    className="w-full"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {t('resend_verification')}
                  </Button>
                  <Button
                    onClick={() => router.push('/auth/signup')}
                    variant="ghost"
                    className="w-full"
                  >
                    {t('create_new_account')}
                  </Button>
                </div>
              )}

              {status === 'invalid' && (
                <div className="space-y-2">
                  <Button
                    onClick={() => router.push('/auth/signup')}
                    className="w-full"
                  >
                    {t('sign_up')}
                  </Button>
                  <Button
                    onClick={() => router.push('/auth/signin')}
                    variant="outline"
                    className="w-full"
                  >
                    {t('sign_in')}
                  </Button>
                </div>
              )}

              {status === 'loading' && (
                <div className="flex justify-center">
                  <div className="animate-pulse text-sm text-muted-foreground">
                    {t('processing')}
                  </div>
                </div>
              )}
            </div>

            {/* Help Text */}
            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t('help_text')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            {t('footer_text')}
          </p>
        </div>
      </div>
    </div>
  )
}