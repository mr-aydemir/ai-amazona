'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'

interface ContactFormProps {
  locale: string
}

export default function ContactForm({ locale }: ContactFormProps) {
  const t = useTranslations('contact.form')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setStatus('idle')
    try {
      const res = await fetch('/api/contact-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, subject, message, locale }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || t('submit_error'))
      setStatus('success')
      setName('')
      setEmail('')
      setPhone('')
      setSubject('')
      setMessage('')
    } catch (err) {
      console.error(err)
      setStatus('error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className='space-y-4'>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <div>
          <label className='block text-sm font-medium mb-1'>{t('name')}</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className='block text-sm font-medium mb-1'>{t('email')}</label>
          <Input type='email' value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className='block text-sm font-medium mb-1'>{t('phone')}</label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label className='block text-sm font-medium mb-1'>{t('subject')}</label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
      </div>
      <div>
        <label className='block text-sm font-medium mb-1'>{t('message')}</label>
        <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} required />
      </div>

      <div className='flex items-center gap-4'>
        <Button type='submit' disabled={submitting}>
          {submitting ? t('submitting') : t('submit')}
        </Button>
        {status === 'success' && (
          <span className='text-green-600 text-sm'>{t('success')}</span>
        )}
        {status === 'error' && (
          <span className='text-red-600 text-sm'>{t('error')}</span>
        )}
      </div>
    </form>
  )
}