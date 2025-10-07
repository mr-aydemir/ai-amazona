'use client'

import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Eye, EyeOff, Github, Mail } from 'lucide-react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'

export default function SignInPage() {
  const t = useTranslations('auth.signin')
  const tAuth = useTranslations('auth')
  const router = useRouter()
  const searchParams = useSearchParams()
  const locale = useLocale()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const callbackUrlParam = searchParams.get('callbackUrl')
  const callbackUrl = (callbackUrlParam && callbackUrlParam.startsWith('/') && !callbackUrlParam.startsWith('//'))
    ? callbackUrlParam
    : `/${locale}`

  useEffect(() => {
    const checkSession = async () => {
      const session = await getSession()
      if (session) {
        toast.success(t('already_signed_in'), {
          description: t('already_signed_in_message')
        })
        router.push(callbackUrl)
      }
    }
    checkSession()
  }, [router, t, callbackUrl])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false
      })

      if (result?.error) {
        // Handle specific error types from NextAuth
        if (result.error === 'CredentialsSignin') {
          // This means the credentials provider returned null
          // We need to check what the actual error was from our API
          try {
            const response = await fetch('/api/auth/validate', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: formData.email,
                password: formData.password,
              }),
            })

            const data = await response.json()

            if (!response.ok && data.error) {
              switch (data.error) {
                case 'USER_NOT_FOUND':
                  toast.error(t('signin_error_title'), {
                    description: t('user_not_found_message')
                  })
                  break
                case 'INVALID_PASSWORD':
                  toast.error(t('signin_error_title'), {
                    description: t('invalid_password_message')
                  })
                  break
                case 'INVALID_EMAIL_FORMAT':
                  toast.error(t('signin_error_title'), {
                    description: t('invalid_email_format_message')
                  })
                  break
                case 'MISSING_FIELDS':
                  toast.error(t('signin_error_title'), {
                    description: t('missing_fields_message')
                  })
                  break
                default:
                  toast.error(t('signin_error_title'), {
                    description: data.message || t('signin_error_message')
                  })
              }
            } else {
              toast.error(t('signin_error_title'), {
                description: t('signin_error_message')
              })
            }
          } catch (_) {
            toast.error(t('signin_error_title'), {
              description: t('signin_error_message')
            })
          }
        } else {
          toast.error(t('signin_error_title'), {
            description: t('signin_error_message')
          })
        }
      } else {
        toast.success(t('signin_success_title'), {
          description: t('signin_success_message')
        })
        router.push(callbackUrl)
      }
    } catch (_) {
      toast.error(t('general_error_title'), {
        description: t('general_error_message')
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    try {
      await signIn(provider, { callbackUrl })
    } catch (_) {
      toast.error(t('general_error_title'), {
        description: t('general_error_message')
      })
    }
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
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={t('email_placeholder')}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t('password')}</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm text-primary hover:underline"
                  >
                    {tAuth('forgot_password.title')}
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={t('password_placeholder')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t('signin_loading') : t('signin_button')}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  {t('or')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                onClick={() => handleOAuthSignIn('google')}
                className="w-full"
              >
                <Mail className="mr-2 h-4 w-4" />
                {t('signin_with_google')}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleOAuthSignIn('github')}
                className="w-full"
              >
                <Github className="mr-2 h-4 w-4" />
                {t('signin_with_github')}
              </Button>
            </div>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">{t('no_account')} </span>
              <Link href="/auth/signup" className="font-medium text-primary hover:underline">
                {t('signup_link')}
              </Link>
            </div>

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium text-foreground mb-2">{t('demo_accounts')}</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p><strong>{t('demo_admin')}</strong> admin@example.com / 123456</p>
                <p><strong>{t('demo_user')}</strong> user@example.com / 123456</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}