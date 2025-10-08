'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type ContactMessage = {
  id: string
  name: string
  email: string
  phone?: string | null
  subject?: string | null
  message: string
  locale?: string | null
  createdAt: string
  status: string
}

export default function AdminContactMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/admin/contact/messages')
        const data = await res.json()
        setMessages(data.messages || [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className='container mx-auto px-4 py-6'>
      <h1 className='text-2xl font-bold mb-4'>İletişim Mesajları</h1>

      <Card>
        <CardHeader>
          <CardTitle>Gelen Mesajlar</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Yükleniyor...</div>
          ) : messages.length === 0 ? (
            <div className='text-muted-foreground'>Mesaj bulunamadı.</div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='text-left border-b'>
                    <th className='py-2 pr-4'>Tarih</th>
                    <th className='py-2 pr-4'>Ad</th>
                    <th className='py-2 pr-4'>E-posta</th>
                    <th className='py-2 pr-4'>Telefon</th>
                    <th className='py-2 pr-4'>Konu</th>
                    <th className='py-2 pr-4'>Mesaj</th>
                    <th className='py-2 pr-4'>Durum</th>
                    <th className='py-2 pr-4'>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map(m => (
                    <tr key={m.id} className='border-b'>
                      <td className='py-2 pr-4'>{new Date(m.createdAt).toLocaleString()}</td>
                      <td className='py-2 pr-4'>{m.name}</td>
                      <td className='py-2 pr-4'>
                        <a
                          href={`mailto:${m.email}`}
                          className='text-primary hover:underline'
                        >
                          {m.email}
                        </a>
                      </td>
                      <td className='py-2 pr-4'>{m.phone || '-'}</td>
                      <td className='py-2 pr-4'>{m.subject || '-'}</td>
                      <td className='py-2 pr-4 whitespace-pre-line line-clamp-2'>{m.message}</td>
                      <td className='py-2 pr-4'>{m.status}</td>
                      <td className='py-2 pr-4'>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant='outline' size='sm'>Detaylar</Button>
                          </DialogTrigger>
                          <DialogContent className='max-w-2xl'>
                            <DialogHeader>
                              <DialogTitle>Mesaj Detayı</DialogTitle>
                            </DialogHeader>
                            <div className='space-y-3 text-sm'>
                              <div className='flex gap-2'><span className='font-medium'>Tarih:</span><span>{new Date(m.createdAt).toLocaleString()}</span></div>
                              <div className='flex gap-2'><span className='font-medium'>Ad:</span><span>{m.name}</span></div>
                              <div className='flex gap-2'>
                                <span className='font-medium'>E-posta:</span>
                                <a href={`mailto:${m.email}`} className='text-primary hover:underline'>{m.email}</a>
                              </div>
                              <div className='flex gap-2'><span className='font-medium'>Telefon:</span><span>{m.phone || '-'}</span></div>
                              <div className='flex gap-2'><span className='font-medium'>Konu:</span><span>{m.subject || '-'}</span></div>
                              <div className='flex gap-2'><span className='font-medium'>Dil:</span><span>{m.locale || '-'}</span></div>
                              <div className='flex gap-2'><span className='font-medium'>Durum:</span><span>{m.status}</span></div>
                              <div>
                                <div className='font-medium mb-1'>Mesaj İçeriği</div>
                                <div className='whitespace-pre-line rounded border p-3 bg-muted'>{m.message}</div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}