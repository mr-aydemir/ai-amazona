'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye, EyeOff, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null)
  const [token, setToken] = useState<string | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('auth.reset_password')

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    if (tokenParam) {
      setToken(tokenParam)
      validateToken(tokenParam)
    } else {
      setIsValidToken(false)
    }
  }, [searchParams])

  const validateToken = async (tokenToValidate: string) => {
    try {
      const response = await fetch('/api/auth/validate-reset-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: tokenToValidate }),
      })

      if (response.ok) {
        setIsValidToken(true)
      } else {
        setIsValidToken(false)
        const data = await response.json()
        toast.error(data.error || t('invalid_token'))
      }
    } catch (error) {
      console.error('Token validation error:', error)
      setIsValidToken(false)
      toast.error(t('general_error'))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!password || !confirmPassword) {
      toast.error(t('all_fields_required'))
      return
    }

    if (password.length < 6) {
      toast.error(t('password_min_length'))
      return
    }

    if (password !== confirmPassword) {
      toast.error(t('passwords_not_match'))
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password
        }),
      })

      if (response.ok) {
        toast.success(t('success_title'), {
          description: t('success_message'),
        })
        setTimeout(() => {
          router.push('/auth/signin')
        }, 2000)
      } else {
        const data = await response.json()
        if (data.error === 'INVALID_TOKEN') {
          toast.error(t('invalid_token'))
        } else if (data.error === 'TOKEN_EXPIRED') {
          toast.error(t('token_expired'))
        } else {
          toast.error(t('general_error'))
        }
      }
    } catch (error) {
      console.error('Reset password error:', error)
      toast.error(t('general_error'))
    } finally {
      setIsLoading(false)
    }
  }

  if (isValidToken === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-sm text-muted-foreground">{t('validating_token')}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (isValidToken === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-foreground">
              {t('invalid_token_title')}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('invalid_token_description')}
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t('request_new_reset')}
                </p>
                <div className="space-y-2">
                  <Link href="/auth/forgot-password">
                    <Button className="w-full">
                      {t('request_new_link')}
                    </Button>
                  </Link>
                  <Link href="/auth/signin">
                    <Button variant="outline" className="w-full">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      {t('back_to_signin')}
                    </Button>
                  </Link>
                </div>
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
                <Label htmlFor="password">{t('new_password')}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('confirm_password')}</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('confirm_password_placeholder')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t('updating') : t('update_password')}
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