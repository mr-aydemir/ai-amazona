'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Status = 'idle' | 'loading' | 'success' | 'error' | 'invalid'

export function NewsletterSignup() {
  const t = useTranslations('home.newsletter')
  const locale = useLocale()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setStatus('invalid')
      return
    }

    setStatus('loading')
    try {
      const res = await fetch('/api/contact-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Newsletter',
          email: email.trim(),
          subject: 'newsletter',
          message: `E-bülten aboneliği (${locale})`,
          locale,
        }),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
      setEmail('')
    } catch {
      setStatus('error')
    }
  }

  return (
    <section className='container mx-auto px-4 sm:px-6 lg:px-8'>
      <div className='rounded-2xl bg-primary px-6 py-10 text-primary-foreground sm:px-10'>
        <div className='flex flex-col gap-6 md:flex-row md:items-center md:justify-between'>
          <div className='max-w-xl'>
            <div className='mb-2 flex items-center gap-2'>
              <Mail className='h-5 w-5' />
              <h2 className='text-2xl font-bold'>{t('title')}</h2>
            </div>
            <p className='text-sm text-primary-foreground/80'>{t('subtitle')}</p>
          </div>

          <form onSubmit={onSubmit} className='flex w-full max-w-md flex-col gap-2 sm:flex-row'>
            <Input
              type='email'
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (status !== 'idle') setStatus('idle')
              }}
              placeholder={t('placeholder')}
              aria-label={t('placeholder')}
              className='bg-background text-foreground'
              required
            />
            <Button type='submit' variant='secondary' disabled={status === 'loading'}>
              {status === 'loading' ? t('loading') : t('button')}
            </Button>
          </form>
        </div>

        {status === 'success' ? (
          <p className='mt-3 text-sm text-primary-foreground/90'>{t('success')}</p>
        ) : null}
        {status === 'error' ? (
          <p className='mt-3 text-sm text-red-200'>{t('error')}</p>
        ) : null}
        {status === 'invalid' ? (
          <p className='mt-3 text-sm text-red-200'>{t('invalid')}</p>
        ) : null}
      </div>
    </section>
  )
}
