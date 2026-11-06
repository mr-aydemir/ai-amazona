import Link from 'next/link'
import { getLocale } from 'next-intl/server'
import { Button } from '@/components/ui/button'

export default async function NotFound() {
  const locale = await getLocale()
  const isEn = locale.startsWith('en')

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-muted-foreground mb-4">404</h1>
        <h2 className="text-2xl font-bold mb-4">
          {isEn ? 'Page Not Found' : 'Sayfa Bulunamadı'}
        </h2>
        <p className="text-muted-foreground mb-6">
          {isEn
            ? 'The page you are looking for does not exist.'
            : 'Aradığınız sayfa mevcut değil.'}
        </p>
        <Button asChild>
          <Link href={`/${locale}`}>{isEn ? 'Return Home' : 'Ana Sayfaya Dön'}</Link>
        </Button>
      </div>
    </div>
  )
}
