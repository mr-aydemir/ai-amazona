'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye, EyeOff, Mail, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

export default function SignUpPage() {
  const t = useTranslations('auth.signup')
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showVerificationMessage, setShowVerificationMessage] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    if (formData.password !== formData.confirmPassword) {
      toast.error(t('general_error_title'), {
        description: 'Şifreler eşleşmiyor.'
      })
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        if (data.requiresVerification) {
          toast.success(data.message || 'Hesap oluşturuldu! E-posta doğrulama linki gönderildi.')
          // Show verification message instead of redirecting immediately
          setShowVerificationMessage(true)
        } else {
          toast.success(t('signup_success_title'), {
            description: t('signup_success_message')
          })
          router.push('/auth/signin')
        }
      } else {
        toast.error(t('signup_error_title'), {
          description: data.message || t('general_error_message')
        })
      }
    } catch (error) {
      toast.error(t('general_error_title'), {
        description: t('general_error_message')
      })
    } finally {
      setIsLoading(false)
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
            {showVerificationMessage ? (
              // Verification Message UI
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="bg-green-100 p-3 rounded-full">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                  {t('verification_required_title')}
                </h2>
                <div className="space-y-2">
                  <p className="text-muted-foreground">
                    {t('verification_required_message')}
                  </p>
                  <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{t('verification_email_sent')}</span>
                    <span className="font-medium">{formData.email}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('verification_check_spam')}
                  </p>
                </div>
                <div className="flex flex-col space-y-3 pt-4">
                  <Button
                    onClick={() => router.push('/auth/signin')}
                    className="w-full"
                  >
                    Giriş Yap
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowVerificationMessage(false)}
                    className="w-full"
                  >
                    {t('card_title')}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => router.push(`/auth/verify-email?email=${encodeURIComponent(formData.email)}`)}
                    className="w-full text-sm"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Doğrulama E-postasını Yeniden Gönder
                  </Button>
                </div>
              </div>
            ) : (
              // Original Form UI
              <>
                <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('name')}</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder={t('name_placeholder')}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('email_placeholder')}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('password')}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('password_placeholder')}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
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
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder={t('confirm_password_placeholder')}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
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
                {isLoading ? t('signup_loading') : t('signup_button')}
              </Button>
            </form>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">{t('have_account')} </span>
              <Link href="/auth/signin" className="font-medium text-primary hover:underline">
                {t('signin_link')}
              </Link>
            </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}