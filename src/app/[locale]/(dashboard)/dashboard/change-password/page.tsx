'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import * as z from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const schema = z
  .object({
    currentPassword: z.string().min(6, { message: 'password_min_length' }),
    newPassword: z.string().min(6, { message: 'password_min_length' }),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'passwords_not_match',
    path: ['confirmNewPassword'],
  })

type FormValues = z.infer<typeof schema>

export default function ChangePasswordPage() {
  const tProfile = useTranslations('auth.profile')
  const tAuth = useTranslations('auth.reset_password')
  const locale = useLocale()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  })

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (res.ok) {
        toast({
          title: tProfile('password_changed'),
          description:
            locale === 'en'
              ? 'You can use your new password next sign in.'
              : 'Bir sonraki girişinizde yeni şifrenizi kullanabilirsiniz.',
        })
        form.reset()
        return
      }

      // Map server errors to friendly messages
      let message = tAuth('general_error')
      switch (data?.error) {
        case 'INVALID_CURRENT_PASSWORD':
          message = locale === 'en' ? 'Current password is incorrect' : 'Mevcut şifre yanlış'
          break
        case 'PASSWORD_MIN_LENGTH':
          message = tAuth('password_min_length')
          break
        case 'CURRENT_AND_NEW_PASSWORD_REQUIRED':
          message = locale === 'en' ? 'All fields are required' : tAuth('all_fields_required')
          break
        case 'PASSWORD_NOT_SET':
          message =
            locale === 'en'
              ? 'Password not set for this account'
              : 'Bu hesap için şifre tanımlı değil'
          break
        default:
          message = tAuth('general_error')
      }

      toast({ title: message, variant: 'destructive' })
    } catch (e) {
      toast({ title: tAuth('general_error'), variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  // Helper to render zod error messages using translation keys
  const translateError = (msg?: string) => {
    if (!msg) return ''
    try {
      return tAuth(msg as any)
    } catch {
      return msg
    }
  }

  return (
    <div className="container max-w-xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>{tProfile('change_password')}</CardTitle>
          <CardDescription>
            {locale === 'en'
              ? 'Update your account password securely'
              : 'Hesap şifrenizi güvenle güncelleyin'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tProfile('current_password')}</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="current-password" {...field} />
                    </FormControl>
                    <FormMessage>{translateError(form.formState.errors.currentPassword?.message)}</FormMessage>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tProfile('new_password')}</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage>{translateError(form.formState.errors.newPassword?.message)}</FormMessage>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmNewPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tProfile('confirm_new_password')}</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage>
                      {translateError(form.formState.errors.confirmNewPassword?.message)}
                    </FormMessage>
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isLoading}>
                {isLoading ? tAuth('updating') : tAuth('update_password')}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}