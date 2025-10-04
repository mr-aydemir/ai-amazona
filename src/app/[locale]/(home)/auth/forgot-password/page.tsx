'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Mail } from 'lucide-react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isEmailSent, setIsEmailSent] = useState(false)
  const t = useTranslations('auth.forgot_password')
  const locale = useLocale()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      toast.error(t('general_error'))
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, locale }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setIsEmailSent(true)
        toast.success(t('reset_sent_title'), {
          description: t('reset_sent'),
        })
      } else {
        // Handle different error types
        if (data.error) {
          toast.error(t('general_error_title'), {
            description: data.error
          })
        } else {
          toast.error(t('general_error_title'), {
            description: t('general_error')
          })
        }
      }
    } catch (error) {
      console.error('Forgot password error:', error)
      toast.error(t('general_error_title'), {
        description: t('network_error')
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isEmailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
              <Mail className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-foreground">
              {t('reset_sent_title')}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('reset_sent_description')}
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t('reset_sent')}
                </p>
                <div className="text-sm font-medium text-foreground bg-muted p-3 rounded-md">
                  {email}
                </div>
                <Link href="/auth/signin">
                  <Button className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('back_to_signin')}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-foreground">
            {t('page_title')}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('page_subtitle')}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('card_title')}</CardTitle>
            <CardDescription>
              {t('card_description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('email_placeholder')}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t('sending') : t('send_reset_link')}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/auth/signin"
                className="inline-flex items-center text-sm text-primary hover:underline"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('back_to_signin')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}