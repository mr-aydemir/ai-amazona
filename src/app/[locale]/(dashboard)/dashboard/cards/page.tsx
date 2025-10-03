'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { CreditCard, Trash2, Building2, ShieldCheck, Loader2 } from 'lucide-react'
import type { SavedCard } from '@prisma/client'

export default function CardsPage() {
  const t = useTranslations('dashboard.cards')
  const ta = useTranslations('common.actions')
  const ts = useTranslations('common.status')
  const { toast } = useToast()

  const [cards, setCards] = useState<SavedCard[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [cardAlias, setCardAlias] = useState('')
  const [cardHolderName, setCardHolderName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [expireMonth, setExpireMonth] = useState('')
  const [expireYear, setExpireYear] = useState('')
  const [cvc, setCvc] = useState('')

  const loadCards = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/saved-cards', { cache: 'no-store' })
      const data = await res.json()
      if (res.ok && data?.success) {
        setCards(data.cards || [])
      } else {
        toast({
          variant: 'destructive',
          title: ts('error'),
          description: data?.error || 'Failed to load cards',
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: ts('error'),
        description: error instanceof Error ? error.message : 'Failed to load cards',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCards()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id)
      const res = await fetch(`/api/saved-cards/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || t('deleted_error'))
      }

      setCards((prev) => prev.filter((c) => c.id !== id))
      toast({ title: t('deleted_success') })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('deleted_error'),
        description: error instanceof Error ? error.message : t('deleted_error'),
      })
    } finally {
      setDeletingId(null)
    }
  }

  const formatCardNumber = (value: string) => {
    return value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim()
  }

  const onlyDigits = (s: string) => s.replace(/\D/g, '')
  const twoDigit = (s: string) => onlyDigits(s).slice(0, 2)
  const threeDigit = (s: string) => onlyDigits(s).slice(0, 3)

  const handleAddCard = async () => {
    try {
      setIsAdding(true)
      const normalizedMonth = expireMonth.padStart(2, '0')
      const normalizedYearRaw = expireYear
      const normalizedYear = normalizedYearRaw.length === 4
        ? normalizedYearRaw.slice(-2)
        : normalizedYearRaw.padStart(2, '0')
      const res = await fetch('/api/iyzico/save-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardAlias: cardAlias || undefined,
          cardHolderName,
          cardNumber: cardNumber.replace(/\s/g, ''),
          expireMonth: normalizedMonth,
          expireYear: normalizedYear,
          cvc,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || t('added_error'))
      }
      setCards((prev) => [data.card, ...prev])
      setAddOpen(false)
      setCardAlias('')
      setCardHolderName('')
      setCardNumber('')
      setExpireMonth('')
      setExpireYear('')
      setCvc('')
      toast({ title: t('added_success') })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('added_error'),
        description: error instanceof Error ? error.message : t('added_error'),
      })
    } finally {
      setIsAdding(false)
    }
  }

  const humanize = (value?: string | null) => {
    if (!value) return '-'
    return value.replace(/_/g, ' ')
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold'>{t('title')}</h1>
          <p className='text-muted-foreground'>{t('description')}</p>
        </div>
        <div className='flex items-center gap-2'>
          <Button onClick={() => setAddOpen(true)}>{t('add_card')}</Button>
          <CreditCard className='h-8 w-8 text-primary' />
        </div>
      </div>

      <div className='flex items-center gap-2 rounded-md border p-3 text-sm text-muted-foreground'>
        <ShieldCheck className='h-4 w-4 text-primary' />
        <span>{t('security_note')}</span>
      </div>

      {loading ? (
        <div className='flex items-center gap-2 text-muted-foreground'>
          <Loader2 className='h-5 w-5 animate-spin' />
          <span>{ts('loading')}</span>
        </div>
      ) : cards.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>{t('no_cards')}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {cards.map((card) => (
            <Card key={card.id} className='flex flex-col'>
              <CardHeader className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <CardTitle className='text-base'>{card.cardAlias}</CardTitle>
                  {card.isDefault && <Badge variant='secondary'>Default</Badge>}
                </div>
                <CardDescription>
                  **** **** **** {card.lastFourDigits || '****'}
                </CardDescription>
              </CardHeader>
              <CardContent className='flex-1 space-y-3'>
                <div className='flex items-center gap-2 text-sm'>
                  <Building2 className='h-4 w-4 text-muted-foreground' />
                  <span>{card.cardBankName || '-'}</span>
                </div>
                <div className='flex items-center gap-2 text-sm'>
                  <ShieldCheck className='h-4 w-4 text-muted-foreground' />
                  <span>
                    {humanize(card.cardAssociation)} · {humanize(card.cardType)}
                  </span>
                </div>
                <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                  <span>BIN: {card.binNumber || '-'}</span>
                </div>

                <div className='pt-2'>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant='destructive' size='sm' disabled={deletingId === card.id}>
                        <Trash2 className='mr-2 h-4 w-4' />
                        {deletingId === card.id ? t('deleting_loading') : t('delete_button')}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('delete_confirm_title')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('delete_confirm_message')}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{ta('cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(card.id)}>
                          {ta('delete')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className='sm:max-w-[500px]'>
          <DialogHeader>
            <DialogTitle>{t('add_card')}</DialogTitle>
          </DialogHeader>
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label>{t('form.card_alias')}</Label>
              <Input value={cardAlias} onChange={(e) => setCardAlias(e.target.value)} placeholder={t('form.card_alias')} />
            </div>
            <div className='space-y-2'>
              <Label>{t('form.card_holder_name')}</Label>
              <Input value={cardHolderName} onChange={(e) => setCardHolderName(e.target.value)} placeholder={t('form.card_holder_name')} />
            </div>
            <div className='space-y-2'>
              <Label>{t('form.card_number')}</Label>
              <Input value={cardNumber} onChange={(e) => setCardNumber(formatCardNumber(e.target.value))} placeholder='1234 5678 9012 3456' />
            </div>
            <div className='grid grid-cols-3 gap-3'>
              <div className='space-y-2'>
                <Label>{t('form.expire_month')}</Label>
                <Input
                  value={expireMonth}
                  onChange={(e) => setExpireMonth(twoDigit(e.target.value))}
                  placeholder='MM'
                  inputMode='numeric'
                  maxLength={2}
                />
              </div>
              <div className='space-y-2'>
                <Label>{t('form.expire_year')}</Label>
                <Input
                  value={expireYear}
                  onChange={(e) => setExpireYear(twoDigit(e.target.value))}
                  placeholder='YY'
                  inputMode='numeric'
                  maxLength={2}
                />
              </div>
              <div className='space-y-2'>
                <Label>{t('form.cvc')}</Label>
                <Input
                  value={cvc}
                  onChange={(e) => setCvc(threeDigit(e.target.value))}
                  placeholder='CVC'
                  inputMode='numeric'
                  maxLength={3}
                />
              </div>
            </div>
            <div className='flex justify-end gap-2 pt-2'>
              <Button variant='outline' onClick={() => setAddOpen(false)} disabled={isAdding}>
                {ta('cancel')}
              </Button>
              <Button onClick={handleAddCard} disabled={isAdding}>
                {isAdding ? t('adding_loading') : ta('save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}