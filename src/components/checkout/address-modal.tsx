'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'

const addressSchema = z.object({
  fullName: z.string().min(1, 'Ad soyad gereklidir'),
  street: z.string().min(1, 'Adres gereklidir'),
  city: z.string().min(1, 'Şehir gereklidir'),
  state: z.string().min(1, 'İl/Bölge gereklidir'),
  postalCode: z.string().min(1, 'Posta kodu gereklidir'),
  country: z.string().min(1, 'Ülke gereklidir'),
  phone: z.string().optional(),
  tcNumber: z.string().optional(),
  isDefault: z.boolean().default(false),
})

type AddressFormValues = z.infer<typeof addressSchema>

interface Address {
  id: string
  fullName: string
  street: string
  city: string
  state: string
  postalCode: string
  country: string
  phone: string
  tcNumber: string
  isDefault: boolean
}

interface AddressModalProps {
  open: boolean
  onClose: () => void
  address?: Address | null
}

export function AddressModal({ open, onClose, address }: AddressModalProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      fullName: '',
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'Türkiye',
      phone: '',
      tcNumber: '',
      isDefault: false,
    },
  })

  // Düzenleme modunda form verilerini doldur
  useEffect(() => {
    if (address) {
      form.reset({
        fullName: address.fullName,
        street: address.street,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
        phone: address.phone || '',
        tcNumber: address.tcNumber || '',
        isDefault: address.isDefault,
      })
    } else {
      form.reset({
        fullName: '',
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'Türkiye',
        phone: '',
        tcNumber: '',
        isDefault: false,
      })
    }
  }, [address, form])

  const onSubmit = async (data: AddressFormValues) => {
    try {
      setLoading(true)

      const url = address ? `/api/addresses/${address.id}` : '/api/addresses'
      const method = address ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save address')
      }

      toast({
        title: 'Başarılı',
        description: address ? 'Adres başarıyla güncellendi' : 'Adres başarıyla eklendi',
      })

      onClose()
    } catch (error) {
      console.error('Error saving address:', error)
      toast({
        title: 'Hata',
        description: error instanceof Error ? error.message : 'Adres kaydedilirken bir hata oluştu',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {address ? 'Adresi Düzenle' : 'Yeni Adres Ekle'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ad Soyad *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ad Soyad" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="street"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adres *</FormLabel>
                  <FormControl>
                    <Input placeholder="Sokak, Mahalle, Bina No" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Şehir *</FormLabel>
                    <FormControl>
                      <Input placeholder="Şehir" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>İl/Bölge *</FormLabel>
                    <FormControl>
                      <Input placeholder="İl/Bölge" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Posta Kodu *</FormLabel>
                    <FormControl>
                      <Input placeholder="Posta Kodu" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ülke *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ülke" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefon</FormLabel>
                  <FormControl>
                    <Input placeholder="Telefon numarası" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tcNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>TC Kimlik No</FormLabel>
                  <FormControl>
                    <Input placeholder="TC Kimlik numarası" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isDefault"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Varsayılan adres olarak ayarla
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                İptal
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Kaydediliyor...' : address ? 'Güncelle' : 'Kaydet'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}