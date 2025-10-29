'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { toast } from 'sonner'
import { Users, Shield, Search } from 'lucide-react'

type Role = 'ADMIN' | 'STAFF' | 'USER'

interface UserRow {
  id: string
  name: string | null
  email: string
  role: Role
  emailVerified: string | null
  image?: string | null
  createdAt: string
  _count?: { orders: number }
}

type Filter = 'ALL' | 'ADMIN' | 'STAFF'

export default function StaffPage() {
  const t = useTranslations('admin')
  const locale = useLocale()
  const [filter, setFilter] = useState<Filter>('ALL')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserRow[]>([])

  const filtered = useMemo(() => {
    const byRole = users.filter(u => (filter === 'ALL' ? true : u.role === filter))
    const q = search.trim().toLowerCase()
    if (!q) return byRole
    return byRole.filter(u => (u.name ?? '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  }, [users, filter, search])

  useEffect(() => {
    fetchList('ALL')
  }, [])

  const fetchList = async (role: Filter) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/users?role=${role}`)
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setUsers(data.users ?? [])
    } catch (e) {
      console.error('Staff list error', e)
      toast.error(locale === 'tr' ? 'Personel listesi yüklenemedi' : 'Failed to load staff list')
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, role: Role) => {
    const prev = users.slice()
    setUsers(curr => curr.map(u => (u.id === userId ? { ...u, role } : u)))
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      })
      if (!res.ok) throw new Error('update failed')
      toast.success(locale === 'tr' ? 'Rol güncellendi' : 'Role updated')
    } catch (e) {
      console.error('Update role error', e)
      setUsers(prev)
      toast.error(locale === 'tr' ? 'Rol güncellenemedi' : 'Failed to update role')
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{locale === 'tr' ? 'Personel Yönetimi' : 'Staff Management'}</h2>
          <p className="text-muted-foreground">
            {locale === 'tr' ? 'Admin ve personel rollerini görüntüleyin ve yönetin' : 'View and manage admin and staff roles'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant={filter === 'ALL' ? 'default' : 'outline'} onClick={() => { setFilter('ALL'); fetchList('ALL') }}>
            <Users className="h-4 w-4 mr-2" />{locale === 'tr' ? 'Tümü' : 'All'}
          </Button>
          <Button variant={filter === 'ADMIN' ? 'default' : 'outline'} onClick={() => { setFilter('ADMIN'); fetchList('ADMIN') }}>
            <Shield className="h-4 w-4 mr-2" />{locale === 'tr' ? 'Yöneticiler' : 'Admins'}
          </Button>
          <Button variant={filter === 'STAFF' ? 'default' : 'outline'} onClick={() => { setFilter('STAFF'); fetchList('STAFF') }}>
            <Users className="h-4 w-4 mr-2" />{locale === 'tr' ? 'Personeller' : 'Staff'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{locale === 'tr' ? 'Kullanıcılar' : 'Users'}</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder={locale === 'tr' ? 'Ara...' : 'Search...'} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{locale === 'tr' ? 'İsim' : 'Name'}</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>{locale === 'tr' ? 'Rol' : 'Role'}</TableHead>
                    <TableHead>{locale === 'tr' ? 'Kayıt' : 'Joined'}</TableHead>
                    <TableHead>{locale === 'tr' ? 'Siparişler' : 'Orders'}</TableHead>
                    <TableHead>{locale === 'tr' ? 'İşlemler' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        {locale === 'tr' ? 'Kayıt bulunamadı' : 'No results'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name || (locale === 'tr' ? 'İsimsiz' : 'No name')}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{u.role}</Badge>
                            <Select value={u.role} onValueChange={(val) => handleRoleChange(u.id, val as Role)}>
                              <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder={locale === 'tr' ? 'Rol seç' : 'Select role'} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ADMIN">Admin</SelectItem>
                                <SelectItem value="STAFF">Staff</SelectItem>
                                <SelectItem value="USER">User</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                        <TableCell>{new Date(u.createdAt).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US')}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{u._count?.orders ?? 0}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(u.email)}>
                            {locale === 'tr' ? 'Email kopyala' : 'Copy email'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}