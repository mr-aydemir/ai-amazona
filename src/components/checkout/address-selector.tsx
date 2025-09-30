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
  createdAt: string
  updatedAt: string
}

interface AddressSelectorProps {
  selectedAddressId?: string
  onAddressSelect: (address: Address) => void
}

export function AddressSelector({ selectedAddressId, onAddressSelect }: AddressSelectorProps) {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)
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

      // Eğer seçili adres yoksa ve varsayılan adres varsa, onu seç
      if (!selectedAddressId && data.length > 0) {
        const defaultAddress = data.find((addr: Address) => addr.isDefault) || data[0]
        onAddressSelect(defaultAddress)
      }
    } catch (error) {
      console.error('Error fetching addresses:', error)
      toast({
        title: 'Hata',
        description: 'Adresler yüklenirken bir hata oluştu',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAddresses()
  }, [])

  // Adres silme
  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm('Bu adresi silmek istediğinizden emin misiniz?')) {
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
        title: 'Başarılı',
        description: 'Adres başarıyla silindi',
      })

      // Adresleri yeniden yükle
      fetchAddresses()
    } catch (error) {
      console.error('Error deleting address:', error)
      toast({
        title: 'Hata',
        description: error instanceof Error ? error.message : 'Adres silinirken bir hata oluştu',
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
            Teslimat Adresi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Teslimat Adresi
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddAddress}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Yeni Adres
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {addresses.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 mb-4">Henüz kayıtlı adresiniz yok</p>
              <Button onClick={handleAddAddress}>
                <Plus className="h-4 w-4 mr-2" />
                İlk Adresinizi Ekleyin
              </Button>
            </div>
          ) : (
            <RadioGroup
              value={selectedAddressId}
              onValueChange={handleAddressChange}
              className="space-y-4"
            >
              {addresses.map((address) => (
                <div key={address.id} className="flex items-start space-x-3">
                  <RadioGroupItem value={address.id} id={address.id} className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor={address.id} className="cursor-pointer">
                      <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{address.fullName}</h4>
                              {address.isDefault && (
                                <Badge variant="secondary" className="text-xs">
                                  Varsayılan
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-1">
                              {address.street}
                            </p>
                            <p className="text-sm text-gray-600 mb-1">
                              {address.city}, {address.state} {address.postalCode}
                            </p>
                            <p className="text-sm text-gray-600 mb-1">
                              {address.country}
                            </p>
                            {address.phone && (
                              <p className="text-sm text-gray-600">
                                Tel: {address.phone}
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