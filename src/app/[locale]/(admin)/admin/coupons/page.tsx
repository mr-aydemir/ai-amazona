import CouponAdminClient from './_components/coupon-admin-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <CouponAdminClient locale={locale} />
}
