'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { useTranslations } from 'next-intl'

export function AddressForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const t = useTranslations('dashboard.addresses.form')
  const tv = useTranslations('common.forms')

  const addressFormSchema = z.object({
    street: z.string().min(1, tv('field_required')),
    city: z.string().min(1, tv('field_required')),
    state: z.string().min(1, tv('field_required')),
    postalCode: z.string().min(1, tv('field_required')),
    country: z.string().min(1, tv('field_required')),
    isDefault: z.boolean().default(false),
  })

  type AddressFormValues = z.infer<typeof addressFormSchema>

  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      isDefault: false,
    },
  })

  async function onSubmit(data: AddressFormValues) {
    setIsLoading(true)

    try {
      const response = await fetch('/api/addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to add address')
      }

      toast({
        title: 'Address added',
        description: 'Your shipping address has been added successfully.',
      })

      form.reset()
      router.refresh()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
        <FormField
          control={form.control}
          name='street'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('street_label')}</FormLabel>
              <FormControl>
                <Input placeholder={t('street_placeholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className='grid grid-cols-2 gap-4'>
          <FormField
            control={form.control}
            name='city'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('city_label')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('city_placeholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='state'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('state_label')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('state_placeholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className='grid grid-cols-2 gap-4'>
          <FormField
            control={form.control}
            name='postalCode'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('postal_code_label')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('postal_code_placeholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='country'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('country_label')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('country_placeholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name='isDefault'
          render={({ field }) => (
            <FormItem className='flex flex-row items-start space-x-3 space-y-0'>
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className='space-y-1 leading-none'>
                <FormLabel>{t('set_default')}</FormLabel>
              </div>
            </FormItem>
          )}
        />
        <Button type='submit' disabled={isLoading}>
          {isLoading ? t('adding_loading') : t('add_button')}
        </Button>
      </form>
    </Form>
  )
}
