'use server'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { getCurrencyData, convertServer } from '@/lib/server-currency'

type CreateBody = {
  productId: string
  categoryId: number
  cargoCompanyId: number
  brandId?: number
  brandName?: string
  barcode?: string
  stockCode?: string
  quantity?: number
  vatRate?: number
  deliveryDuration?: number
  priceMultiplier?: number
  dimensionalWeight?: number
  attributes?: Array<{ attributeId: number, attributeValueId?: number, customAttributeValue?: string }>
  locale?: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Giriş yapmanız gerekiyor' }, { status: 401 })
    }
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Bu işlem için admin yetkisi gerekiyor' }, { status: 403 })
    }

    const body = (await request.json()) as Partial<CreateBody>
    const productId = String(body.productId || '')
    const categoryId = Number(body.categoryId)
    const cargoCompanyId = Number(body.cargoCompanyId)
    const brandId = body.brandId != null ? Number(body.brandId) : undefined
    const brandName = body.brandName ? String(body.brandName) : undefined
    const barcode = body.barcode ? String(body.barcode) : undefined
    const stockCode = body.stockCode ? String(body.stockCode) : undefined
    const quantityOverride = body.quantity != null ? Number(body.quantity) : undefined
    const vatRate = body.vatRate != null ? Number(body.vatRate) : 20
    const deliveryDuration = body.deliveryDuration != null ? Number(body.deliveryDuration) : 1
    const priceMultiplier = body.priceMultiplier != null ? Number(body.priceMultiplier) : 1
    const dimensionalWeight = body.dimensionalWeight != null ? Number(body.dimensionalWeight) : 1
    const attributes = Array.isArray(body.attributes) ? body.attributes.map((a) => ({
      attributeId: Number(a.attributeId),
      attributeValueId: a.attributeValueId != null ? Number(a.attributeValueId) : undefined,
      customAttributeValue: a.customAttributeValue != null ? String(a.customAttributeValue) : undefined,
    })) : undefined
    const locale = body.locale ? String(body.locale) : 'tr'

    if (!productId) {
      return NextResponse.json({ error: 'Ürün ID gerekli' }, { status: 400 })
    }
    if (!Number.isFinite(categoryId) || categoryId <= 0) {
      return NextResponse.json({ error: 'Geçerli Trendyol kategori ID gerekli' }, { status: 400 })
    }
    if (!Number.isFinite(cargoCompanyId) || cargoCompanyId <= 0) {
      return NextResponse.json({ error: 'Geçerli kargo şirketi ID gerekli' }, { status: 400 })
    }

    // Trendyol credentials
    const supplierId = process.env.TRENDYOL_SUPPLIER_ID
    const apiKey = process.env.TRENDYOL_API_KEY
    const apiSecret = process.env.TRENDYOL_API_SECRET
    const userAgent = process.env.TRENDYOL_USER_AGENT || `${supplierId} - SelfIntegration`
    if (!supplierId || !apiKey || !apiSecret) {
      return NextResponse.json({
        error: 'Trendyol kimlik bilgileri eksik',
        message: 'TRENDYOL_SUPPLIER_ID, TRENDYOL_API_KEY, TRENDYOL_API_SECRET ortam değişkenlerini ayarlayın.'
      }, { status: 500 })
    }

    // Fetch local product with translations
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { translations: true }
    })
    if (!product) {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 })
    }

    // Parse images from JSON string
    let images: string[] = []
    try {
      images = Array.isArray(product.images) ? (product.images as any) : JSON.parse(product.images || '[]')
    } catch {
      images = []
    }
    const imageItems = images.map((url) => ({ url }))

    // Use locale-specific title/description if available
    const tr = product.translations?.find((t) => (t.locale?.split('-')[0] || t.locale) === locale)
    const title = tr?.name || product.name || ''
    const description = tr?.description || product.description || ''

    // Price conversion to TRY using system rates
    const { baseCurrency, rates } = await getCurrencyData()
    const priceTRY = convertServer(product.price ?? 0, baseCurrency, 'TRY', rates) * (Number.isFinite(priceMultiplier) ? priceMultiplier : 1)

    // Quantity
    const quantity = Number.isFinite(quantityOverride) ? quantityOverride! : (product.stock ?? 0)

    // Build Trendyol payload
    const payload = {
      items: [
        {
          barcode: barcode || productId,
          title: title,
          description: description,
          productMainId: stockCode || productId,
          stockCode: stockCode || productId,
          brandId: brandId,
          brandName: brandName,
          categoryId,
          cargoCompanyId,
          dimensionalWeight,
          images: imageItems,
          salePrice: Number(priceTRY.toFixed(2)),
          vatRate,
          quantity,
          deliveryDuration,
          attributes,
        },
      ],
    }

    // Remove undefined keys to avoid API complaints
    const clean = (obj: any) => {
      return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined && v !== null))
    }
    payload.items = payload.items.map((it: any) => clean(it)) as any

    const url = `https://api.trendyol.com/sapigw/suppliers/${supplierId}/v2/products`
    const basicAuth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'User-Agent': userAgent,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const raw = await res.text()
    let bodyOut: any = raw
    try { bodyOut = JSON.parse(raw) } catch { }

    if (!res.ok) {
      return NextResponse.json({ error: 'Trendyol API hata', status: res.status, body: bodyOut }, { status: res.status })
    }

    return NextResponse.json({ success: true, body: bodyOut })
  } catch (error: any) {
    return NextResponse.json({ error: 'Sunucu hatası', message: error?.message ?? 'unknown error' }, { status: 500 })
  }
}