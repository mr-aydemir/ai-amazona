'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, MapPin } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { AddressModal } from './address-modal'
import { Address } from '@prisma/client'
import { useTranslations } from 'next-intl'

interface AddressSelectorProps {
  selectedAddressId?: string
  onAddressSelect: (address: Address) => void
}

export function AddressSelector({ selectedAddressId, onAddressSelect }: AddressSelectorProps) {
  const t = useTranslations('payment')
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)
  const [internalSelectedId, setInternalSelectedId] = useState<string | undefined>(selectedAddressId)
  const { toast } = useToast()

  // Adresleri yükle
  const fetchAddresses = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/addresses')

      if (!response.ok) {
        throw new Error('Failed to fetch addresses')
      }

      const data = await response.json()
      setAddresses(data)

      // Varsayılan adresi otomatik olarak seç
      if (data.length > 0) {
        const defaultAddress = data.find((addr: Address) => addr.isDefault) || data[0]
        setInternalSelectedId(defaultAddress.id)
        onAddressSelect(defaultAddress)
      }
    } catch (error) {
      console.error('Error fetching addresses:', error)
      toast({
        title: t('messages.error'),
        description: t('messages.addressLoadError'),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // selectedAddressId prop'u değiştiğinde internal state'i güncelle
  useEffect(() => {
    setInternalSelectedId(selectedAddressId)
  }, [selectedAddressId])

  useEffect(() => {
    fetchAddresses()
  }, [])

  // Adres silme
  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm(t('address.deleteConfirm'))) {
      return
    }

    try {
      const response = await fetch(`/api/addresses/${addressId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete address')
      }

      toast({
        title: t('messages.success'),
        description: t('messages.addressDeleted'),
      })

      // Adresleri yeniden yükle
      fetchAddresses()
    } catch (error) {
      console.error('Error deleting address:', error)
      toast({
        title: t('messages.error'),
        description: error instanceof Error ? error.message : t('messages.addressDeleteError'),
        variant: 'destructive',
      })
    }
  }

  // Adres düzenleme
  const handleEditAddress = (address: Address) => {
    setEditingAddress(address)
    setModalOpen(true)
  }

  // Yeni adres ekleme
  const handleAddAddress = () => {
    setEditingAddress(null)
    setModalOpen(true)
  }

  // Modal kapatma
  const handleModalClose = () => {
    setModalOpen(false)
    setEditingAddress(null)
    fetchAddresses() // Adresleri yeniden yükle
  }

  // Adres seçimi
  const handleAddressChange = (addressId: string) => {
    const address = addresses.find(addr => addr.id === addressId)
    if (address) {
      onAddressSelect(address)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {t('address.deliveryAddress')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="shadow-lg border border-border bg-background">
        <CardHeader className="bg-muted">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <MapPin className="h-5 w-5" />
            {t('address.deliveryAddress')}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t('address.selectDeliveryAddress')}
          </p>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          {addresses.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">{t('address.noAddresses')}</p>
              <p className="text-sm text-muted-foreground mb-4">
                {t('address.addAddressToOrder')}
              </p>
              <Button onClick={handleAddAddress} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                {t('address.addFirstAddress')}
              </Button>
            </div>
          ) : (
            <RadioGroup
              value={internalSelectedId}
              onValueChange={(value) => {
                const address = addresses.find(addr => addr.id === value)
                if (address) {
                  setInternalSelectedId(value)
                  onAddressSelect(address)
                }
              }}
            >
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-muted-foreground">
                  {t('address.savedAddressesCount', { count: addresses.length })}
                </p>
                <Button variant="outline" size="sm" onClick={handleAddAddress}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('address.addNewAddress')}
                </Button>
              </div>
              {addresses.map((address) => (
                <div key={address.id} className="flex items-start space-x-3">
                  <RadioGroupItem value={address.id} id={address.id} className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor={address.id} className="cursor-pointer">
                      <div className="border border-border rounded-lg p-4 hover:bg-muted transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{address.fullName}</h4>
                              {address.isDefault && (
                                <Badge variant="secondary" className="text-xs">
                                  {t('address.default')}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">
                              {address.street}
                            </p>
                            <p className="text-sm text-muted-foreground mb-1">
                              {address.city}, {address.state} {address.postalCode}
                            </p>
                            <p className="text-sm text-muted-foreground mb-1">
                              {address.country}
                            </p>
                            {address.phone && (
                              <p className="text-sm text-muted-foreground">
                                {t('address.phone')}: {address.phone}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault()
                                handleEditAddress(address)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault()
                                handleDeleteAddress(address.id)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Label>
                  </div>
                </div>
              ))}
            </RadioGroup>
          )}
        </CardContent>
      </Card>

      <AddressModal
        open={modalOpen}
        onClose={handleModalClose}
        address={editingAddress}
      />
    </>
  )
}