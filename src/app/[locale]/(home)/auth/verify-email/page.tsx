'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Loader2, Mail, ArrowLeft, Clock, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

type VerificationStatus = 'loading' | 'success' | 'error' | 'expired' | 'invalid'

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<VerificationStatus>('loading')
  const [message, setMessage] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setStatus('invalid')
      setMessage('Doğrulama token\'ı bulunamadı.')
      return
    }

    verifyEmail(token)
  }, [token])

  const verifyEmail = async (verificationToken: string) => {
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
          setMessage(data.message || 'Bu e-posta adresi zaten doğrulanmış!')
          toast.info('E-posta zaten doğrulanmış! Giriş yapabilirsiniz.')
        } else {
          setStatus('success')
          setMessage(data.message || 'E-posta adresiniz başarıyla doğrulandı!')
          toast.success('E-posta doğrulandı! Artık giriş yapabilirsiniz.')
        }
        
        // Redirect to sign in page after 3 seconds
        setTimeout(() => {
          router.push('/auth/signin')
        }, 3000)
      } else {
        if (response.status === 400 && data.message?.includes('süresi dolmuş')) {
          setStatus('expired')
          setMessage(data.message)
        } else {
          setStatus('error')
          setMessage(data.message || 'Doğrulama sırasında bir hata oluştu.')
        }
        toast.error(data.message || 'Doğrulama başarısız!')
      }
    } catch (error) {
      console.error('Verification error:', error)
      setStatus('error')
      setMessage('Sunucu hatası. Lütfen tekrar deneyin.')
      toast.error('Bağlantı hatası!')
    }
  }

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
        body: JSON.stringify({ email }),
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
        return <Mail className="h-16 w-16 text-gray-500" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'loading':
        return 'text-blue-600'
      case 'success':
        return 'text-green-600'
      case 'error':
      case 'expired':
      case 'invalid':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusTitle = () => {
    switch (status) {
      case 'loading':
        return 'E-posta Doğrulanıyor...'
      case 'success':
        return 'E-posta Doğrulandı!'
      case 'error':
        return 'Doğrulama Başarısız'
      case 'expired':
        return 'Token Süresi Dolmuş'
      case 'invalid':
        return 'Geçersiz Token'
      default:
        return 'E-posta Doğrulama'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Home Link */}
        <div className="mb-6">
          <Link 
            href="/" 
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Ana Sayfaya Dön
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
            <CardDescription className="text-gray-600">
              {status === 'loading' && 'Lütfen bekleyin, e-posta adresiniz doğrulanıyor...'}
              {status === 'success' && 'Hesabınız aktifleştirildi. Giriş sayfasına yönlendiriliyorsunuz...'}
              {status === 'error' && 'E-posta doğrulama işlemi başarısız oldu.'}
              {status === 'expired' && 'Doğrulama linkinizin süresi dolmuş.'}
              {status === 'invalid' && 'Doğrulama linki geçersiz veya bulunamadı.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="text-center space-y-4">
            {/* Status Message */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-700 leading-relaxed">
                {message}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {status === 'success' && (
                <div className="space-y-2">
                  <Button 
                    onClick={() => router.push('/auth/signin')}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    Giriş Sayfasına Git
                  </Button>
                  <p className="text-xs text-gray-500">
                    3 saniye içinde otomatik olarak yönlendirileceksiniz...
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
                    Doğrulama E-postasını Yeniden Gönder
                  </Button>
                  <Button 
                    onClick={() => router.push('/auth/signup')}
                    variant="ghost"
                    className="w-full"
                  >
                    Yeni Hesap Oluştur
                  </Button>
                </div>
              )}

              {status === 'invalid' && (
                <div className="space-y-2">
                  <Button 
                    onClick={() => router.push('/auth/signup')}
                    className="w-full"
                  >
                    Kayıt Ol
                  </Button>
                  <Button 
                    onClick={() => router.push('/auth/signin')}
                    variant="outline"
                    className="w-full"
                  >
                    Giriş Yap
                  </Button>
                </div>
              )}

              {status === 'loading' && (
                <div className="flex justify-center">
                  <div className="animate-pulse text-sm text-gray-500">
                    İşlem devam ediyor...
                  </div>
                </div>
              )}
            </div>

            {/* Help Text */}
            <div className="pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 leading-relaxed">
                Sorun yaşıyorsanız, lütfen spam/gereksiz e-posta klasörünüzü kontrol edin 
                veya destek ekibimizle iletişime geçin.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Amazona © 2024 - Güvenli E-posta Doğrulama
          </p>
        </div>
      </div>
    </div>
  )
}