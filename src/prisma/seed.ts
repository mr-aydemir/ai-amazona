import { PrismaClient, OrderStatus } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { hash } from 'bcryptjs'
import { subDays, addHours, addMinutes } from 'date-fns'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create admin user
  const adminPassword = await hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      password: adminPassword,
      role: 'ADMIN',
    },
  })
  console.log('✅ Admin user created')

  // Create multiple regular users
  const userPassword = await hash('user123', 12)
  const users = []

  const userEmails = [
    'user@example.com',
    'ahmet@example.com',
    'mehmet@example.com',
    'ayse@example.com',
    'fatma@example.com'
  ]

  const userNames = [
    'Regular User',
    'Ahmet Yılmaz',
    'Mehmet Demir',
    'Ayşe Kaya',
    'Fatma Özkan'
  ]

  for (let i = 0; i < userEmails.length; i++) {
    const user = await prisma.user.upsert({
      where: { email: userEmails[i] },
      update: {},
      create: {
        email: userEmails[i],
        name: userNames[i],
        password: userPassword,
        role: 'USER',
      },
    })
    users.push(user)
  }
  console.log('✅ Regular users created')

  // Create categories
  const categories = []

  const tshirts = await prisma.category.upsert({
    where: { name: 'T-shirts' },
    update: {},
    create: {
      name: 'T-shirts',
      description: 'Comfortable and stylish t-shirts',
      image: '/images/c-tshirts.jpg',
    },
  })
  categories.push(tshirts)

  const jeans = await prisma.category.upsert({
    where: { name: 'Jeans' },
    update: {},
    create: {
      name: 'Jeans',
      description: 'Classic and trendy jeans',
      image: '/images/c-jeans.jpg',
    },
  })
  categories.push(jeans)

  const shoes = await prisma.category.upsert({
    where: { name: 'Shoes' },
    update: {},
    create: {
      name: 'Shoes',
      description: 'Comfortable and stylish shoes',
      image: '/images/c-shoes.jpg',
    },
  })
  categories.push(shoes)

  // Add more categories
  const jackets = await prisma.category.upsert({
    where: { name: 'Jackets' },
    update: {},
    create: {
      name: 'Jackets',
      description: 'Warm and stylish jackets for all seasons',
      image: '/images/placeholder.jpg',
    },
  })
  categories.push(jackets)

  const accessories = await prisma.category.upsert({
    where: { name: 'Accessories' },
    update: {},
    create: {
      name: 'Accessories',
      description: 'Fashion accessories to complete your look',
      image: '/images/placeholder.jpg',
    },
  })
  categories.push(accessories)

  const electronics = await prisma.category.upsert({
    where: { name: 'Electronics' },
    update: {},
    create: {
      name: 'Electronics',
      description: 'Latest electronic gadgets and devices',
      image: '/images/placeholder.jpg',
    },
  })
  categories.push(electronics)

  console.log('✅ Categories created')

  // Ensure system base currency is USD so product prices (stored in USD) are interpreted correctly
  try {
    const existingSetting = await prisma.systemSetting.findFirst()
    if (!existingSetting) {
      await prisma.systemSetting.create({
        data: {
          baseCurrency: 'USD',
          currencyRefreshDays: 1,
          vatRate: 0.1,
          shippingFlatFee: 10,
          freeShippingThreshold: 100,
          showPricesInclVat: false,
        }
      })
      console.log('✅ SystemSetting created with baseCurrency USD')
    } else if (existingSetting.baseCurrency !== 'USD') {
      await prisma.systemSetting.update({
        where: { id: existingSetting.id },
        data: { baseCurrency: 'USD' }
      })
      console.log('✅ SystemSetting baseCurrency updated to USD')
    } else {
      console.log('ℹ️ SystemSetting already set to USD')
    }
  } catch (e) {
    console.warn('⚠️ Failed to ensure SystemSetting baseCurrency USD:', (e as Error)?.message)
  }


  await prisma.product.upsert({
    where: { id: 'tshirt-2' },
    update: {},
    create: {
      id: 'tshirt-2',
      name: 'Graphic Print T-Shirt',
      description: 'A stylish graphic print t-shirt with modern design. Made from premium cotton blend.',
      price: 34.99,
      images: JSON.stringify(['/images/p12-1.jpg', '/images/p12-2.jpg']),
      categoryId: tshirts.id,
      stock: 30,
    },
  })

  await prisma.product.upsert({
    where: { id: 'tshirt-3' },
    update: {},
    create: {
      id: 'tshirt-3',
      name: 'Premium Black T-Shirt',
      description: 'Premium quality black t-shirt with superior comfort and durability.',
      price: 39.99,
      images: JSON.stringify(['/images/placeholder.jpg']),
      categoryId: tshirts.id,
      stock: 45,
    },
  })

  // Jeans
  await prisma.product.upsert({
    where: { id: 'jeans-1' },
    update: {},
    create: {
      id: 'jeans-1',
      name: 'Classic Blue Jeans',
      description: 'Classic fit blue jeans with comfortable stretch. Perfect for casual and semi-formal occasions.',
      price: 59.99,
      images: JSON.stringify(['/images/p21-1.jpg', '/images/p21-2.jpg']),
      categoryId: jeans.id,
      stock: 40,
    },
  })

  await prisma.product.upsert({
    where: { id: 'jeans-2' },
    update: {},
    create: {
      id: 'jeans-2',
      name: 'Slim Fit Black Jeans',
      description: 'Modern slim fit black jeans with premium denim. Stylish and comfortable for all-day wear.',
      price: 64.99,
      images: JSON.stringify(['/images/p22-1.jpg', '/images/p22-2.jpg']),
      categoryId: jeans.id,
      stock: 35,
    },
  })



  // Shoes
  await prisma.product.upsert({
    where: { id: 'shoes-1' },
    update: {},
    create: {
      id: 'shoes-1',
      name: 'Classic Sneakers',
      description: 'Comfortable everyday sneakers with great support. Perfect for walking and casual activities.',
      price: 79.99,
      images: JSON.stringify(['/images/p31-1.jpg', '/images/p31-2.jpg']),
      categoryId: shoes.id,
      stock: 25,
    },
  })

  await prisma.product.upsert({
    where: { id: 'shoes-2' },
    update: {},
    create: {
      id: 'shoes-2',
      name: 'Running Shoes',
      description: 'High-performance running shoes with advanced cushioning and breathable mesh upper.',
      price: 89.99,
      images: JSON.stringify(['/images/p32-1.jpg', '/images/p32-2.jpg']),
      categoryId: shoes.id,
      stock: 20,
    },
  })









  // Add translations (TR) for categories and products
  console.log('🈯 Adding translations (TR) for categories and products...')

  // Category translations (TR)
  await prisma.categoryTranslation.upsert({
    where: { categoryId_locale: { categoryId: tshirts.id, locale: 'tr' } },
    update: {
      name: 'Tişörtler',
      description: 'Rahat ve şık tişörtler',
    },
    create: {
      categoryId: tshirts.id,
      locale: 'tr',
      name: 'Tişörtler',
      description: 'Rahat ve şık tişörtler',
    },
  })

  await prisma.categoryTranslation.upsert({
    where: { categoryId_locale: { categoryId: jeans.id, locale: 'tr' } },
    update: {
      name: 'Kot Pantolonlar',
      description: 'Klasik ve trend kotlar',
    },
    create: {
      categoryId: jeans.id,
      locale: 'tr',
      name: 'Kot Pantolonlar',
      description: 'Klasik ve trend kotlar',
    },
  })

  await prisma.categoryTranslation.upsert({
    where: { categoryId_locale: { categoryId: shoes.id, locale: 'tr' } },
    update: {
      name: 'Ayakkabılar',
      description: 'Rahat ve şık ayakkabılar',
    },
    create: {
      categoryId: shoes.id,
      locale: 'tr',
      name: 'Ayakkabılar',
      description: 'Rahat ve şık ayakkabılar',
    },
  })

  // Product translations (TR)
  await prisma.productTranslation.upsert({
    where: { productId_locale: { productId: 'tshirt-1', locale: 'tr' } },
    update: {
      name: 'Klasik Beyaz Tişört',
      description: '%100 pamuk, günlük kullanım için rahat beyaz tişört.',
    },
    create: {
      productId: 'tshirt-1',
      locale: 'tr',
      name: 'Klasik Beyaz Tişört',
      description: '%100 pamuk, günlük kullanım için rahat beyaz tişört.',
    },
  })

  await prisma.productTranslation.upsert({
    where: { productId_locale: { productId: 'tshirt-2', locale: 'tr' } },
    update: {
      name: 'Grafik Baskılı Tişört',
      description: 'Modern tasarımlı, premium pamuk karışımı grafik baskılı tişört.',
    },
    create: {
      productId: 'tshirt-2',
      locale: 'tr',
      name: 'Grafik Baskılı Tişört',
      description: 'Modern tasarımlı, premium pamuk karışımı grafik baskılı tişört.',
    },
  })

  await prisma.productTranslation.upsert({
    where: { productId_locale: { productId: 'jeans-1', locale: 'tr' } },
    update: {
      name: 'Klasik Mavi Kot',
      description: 'Rahat esneme özelliğine sahip klasik mavi kot; günlük ve yarı resmi kullanım için ideal.',
    },
    create: {
      productId: 'jeans-1',
      locale: 'tr',
      name: 'Klasik Mavi Kot',
      description: 'Rahat esneme özelliğine sahip klasik mavi kot; günlük ve yarı resmi kullanım için ideal.',
    },
  })

  await prisma.productTranslation.upsert({
    where: { productId_locale: { productId: 'jeans-2', locale: 'tr' } },
    update: {
      name: 'Slim Fit Siyah Kot',
      description: 'Modern slim fit siyah kot; gün boyu rahat ve şık.',
    },
    create: {
      productId: 'jeans-2',
      locale: 'tr',
      name: 'Slim Fit Siyah Kot',
      description: 'Modern slim fit siyah kot; gün boyu rahat ve şık.',
    },
  })

  await prisma.productTranslation.upsert({
    where: { productId_locale: { productId: 'shoes-1', locale: 'tr' } },
    update: {
      name: 'Klasik Spor Ayakkabı',
      description: 'Yürüyüş ve günlük aktiviteler için konforlu, destekli spor ayakkabı.',
    },
    create: {
      productId: 'shoes-1',
      locale: 'tr',
      name: 'Klasik Spor Ayakkabı',
      description: 'Yürüyüş ve günlük aktiviteler için konforlu, destekli spor ayakkabı.',
    },
  })

  await prisma.productTranslation.upsert({
    where: { productId_locale: { productId: 'shoes-2', locale: 'tr' } },
    update: {
      name: 'Koşu Ayakkabısı',
      description: 'Gelişmiş yastıklama ve nefes alabilen örgü üst kısma sahip performans koşu ayakkabısı.',
    },
    create: {
      productId: 'shoes-2',
      locale: 'tr',
      name: 'Koşu Ayakkabısı',
      description: 'Gelişmiş yastıklama ve nefes alabilen örgü üst kısma sahip performans koşu ayakkabısı.',
    },
  })

  // Category translations (EN)
  await prisma.categoryTranslation.upsert({
    where: { categoryId_locale: { categoryId: tshirts.id, locale: 'en' } },
    update: {
      name: 'T-shirts',
      description: 'Comfortable and stylish t-shirts',
    },
    create: {
      categoryId: tshirts.id,
      locale: 'en',
      name: 'T-shirts',
      description: 'Comfortable and stylish t-shirts',
    },
  })

  await prisma.categoryTranslation.upsert({
    where: { categoryId_locale: { categoryId: jeans.id, locale: 'en' } },
    update: {
      name: 'Jeans',
      description: 'Classic and trendy jeans',
    },
    create: {
      categoryId: jeans.id,
      locale: 'en',
      name: 'Jeans',
      description: 'Classic and trendy jeans',
    },
  })

  await prisma.categoryTranslation.upsert({
    where: { categoryId_locale: { categoryId: shoes.id, locale: 'en' } },
    update: {
      name: 'Shoes',
      description: 'Comfortable and stylish shoes',
    },
    create: {
      categoryId: shoes.id,
      locale: 'en',
      name: 'Shoes',
      description: 'Comfortable and stylish shoes',
    },
  })

  // Product translations (EN)
  await prisma.productTranslation.upsert({
    where: { productId_locale: { productId: 'tshirt-1', locale: 'en' } },
    update: {
      name: 'Classic White T-Shirt',
      description:
        'A comfortable white t-shirt made from 100% cotton. Perfect for everyday wear with a relaxed fit.',
    },
    create: {
      productId: 'tshirt-1',
      locale: 'en',
      name: 'Classic White T-Shirt',
      description:
        'A comfortable white t-shirt made from 100% cotton. Perfect for everyday wear with a relaxed fit.',
    },
  })

  await prisma.productTranslation.upsert({
    where: { productId_locale: { productId: 'tshirt-2', locale: 'en' } },
    update: {
      name: 'Graphic Print T-Shirt',
      description: 'A stylish graphic print t-shirt with modern design. Made from premium cotton blend.',
    },
    create: {
      productId: 'tshirt-2',
      locale: 'en',
      name: 'Graphic Print T-Shirt',
      description: 'A stylish graphic print t-shirt with modern design. Made from premium cotton blend.',
    },
  })

  await prisma.productTranslation.upsert({
    where: { productId_locale: { productId: 'jeans-1', locale: 'en' } },
    update: {
      name: 'Classic Blue Jeans',
      description:
        'Classic fit blue jeans with comfortable stretch. Perfect for casual and semi-formal occasions.',
    },
    create: {
      productId: 'jeans-1',
      locale: 'en',
      name: 'Classic Blue Jeans',
      description:
        'Classic fit blue jeans with comfortable stretch. Perfect for casual and semi-formal occasions.',
    },
  })

  await prisma.productTranslation.upsert({
    where: { productId_locale: { productId: 'jeans-2', locale: 'en' } },
    update: {
      name: 'Slim Fit Black Jeans',
      description:
        'Modern slim fit black jeans with premium denim. Stylish and comfortable for all-day wear.',
    },
    create: {
      productId: 'jeans-2',
      locale: 'en',
      name: 'Slim Fit Black Jeans',
      description:
        'Modern slim fit black jeans with premium denim. Stylish and comfortable for all-day wear.',
    },
  })

  await prisma.productTranslation.upsert({
    where: { productId_locale: { productId: 'shoes-1', locale: 'en' } },
    update: {
      name: 'Classic Sneakers',
      description:
        'Comfortable everyday sneakers with great support. Perfect for walking and casual activities.',
    },
    create: {
      productId: 'shoes-1',
      locale: 'en',
      name: 'Classic Sneakers',
      description:
        'Comfortable everyday sneakers with great support. Perfect for walking and casual activities.',
    },
  })

  await prisma.productTranslation.upsert({
    where: { productId_locale: { productId: 'shoes-2', locale: 'en' } },
    update: {
      name: 'Running Shoes',
      description:
        'High-performance running shoes with advanced cushioning and breathable mesh upper.',
    },
    create: {
      productId: 'shoes-2',
      locale: 'en',
      name: 'Running Shoes',
      description:
        'High-performance running shoes with advanced cushioning and breathable mesh upper.',
    },
  })

  console.log('✅ Products and category translations created')

  console.log('✅ Products created')

  // Create homepage banners
  console.log('🖼️ Creating banners...')

  // Cleanup legacy duplicated banners (from pre-translation schema)
  console.log('🧹 Cleaning up legacy banner records...')
  await prisma.banner.deleteMany({
    where: {
      id: { startsWith: 'banner-tr-' },
    },
  })

  await prisma.banner.upsert({
    where: { id: 'banner-1' },
    update: {},
    create: {
      id: 'banner-1',
      image: '/images/banner1.jpg',
      linkUrl: '/products',
      sortOrder: 1,
      active: true,
    },
  })

  await prisma.banner.upsert({
    where: { id: 'banner-2' },
    update: {},
    create: {
      id: 'banner-2',
      image: '/images/banner2.jpg',
      linkUrl: '/products?sort=price_desc',
      sortOrder: 2,
      active: true,
    },
  })

  await prisma.banner.upsert({
    where: { id: 'banner-3' },
    update: {},
    create: {
      id: 'banner-3',
      image: '/images/banner3.jpg',
      linkUrl: '/products',
      sortOrder: 3,
      active: true,
    },
  })

  // Banner translations
  console.log('🈯 Adding translations for banners...')

  // EN translations
  await prisma.bannerTranslation.upsert({
    where: { bannerId_locale: { bannerId: 'banner-1', locale: 'en' } },
    update: {
      title: 'New Arrivals',
      description: 'Check out our latest collection of amazing products',
    },
    create: {
      bannerId: 'banner-1',
      locale: 'en',
      title: 'New Arrivals',
      description: 'Check out our latest collection of amazing products',
    },
  })

  await prisma.bannerTranslation.upsert({
    where: { bannerId_locale: { bannerId: 'banner-2', locale: 'en' } },
    update: {
      title: 'Special Offers',
      description: 'Get up to 50% off on selected items',
    },
    create: {
      bannerId: 'banner-2',
      locale: 'en',
      title: 'Special Offers',
      description: 'Get up to 50% off on selected items',
    },
  })

  await prisma.bannerTranslation.upsert({
    where: { bannerId_locale: { bannerId: 'banner-3', locale: 'en' } },
    update: {
      title: 'Free Shipping',
      description: 'On orders over $100',
    },
    create: {
      bannerId: 'banner-3',
      locale: 'en',
      title: 'Free Shipping',
      description: 'On orders over $100',
    },
  })

  // TR translations
  await prisma.bannerTranslation.upsert({
    where: { bannerId_locale: { bannerId: 'banner-1', locale: 'tr' } },
    update: {
      title: 'Yeni Gelenler',
      description: 'En yeni ürün koleksiyonumuzu keşfedin',
    },
    create: {
      bannerId: 'banner-1',
      locale: 'tr',
      title: 'Yeni Gelenler',
      description: 'En yeni ürün koleksiyonumuzu keşfedin',
    },
  })

  await prisma.bannerTranslation.upsert({
    where: { bannerId_locale: { bannerId: 'banner-2', locale: 'tr' } },
    update: {
      title: 'Özel Fırsatlar',
      description: 'Seçili ürünlerde %50’ye varan indirim',
    },
    create: {
      bannerId: 'banner-2',
      locale: 'tr',
      title: 'Özel Fırsatlar',
      description: 'Seçili ürünlerde %50’ye varan indirim',
    },
  })

  await prisma.bannerTranslation.upsert({
    where: { bannerId_locale: { bannerId: 'banner-3', locale: 'tr' } },
    update: {
      title: 'Ücretsiz Kargo',
      description: '1000₺ üzeri siparişlerde geçerli',
    },
    create: {
      bannerId: 'banner-3',
      locale: 'tr',
      title: 'Ücretsiz Kargo',
      description: '1000₺ üzeri siparişlerde geçerli',
    },
  })

  console.log('✅ Banners created')

  // Create contact info (single record)
  console.log('📞 Creating contact info...')
  const contact = await prisma.contactInfo.upsert({
    where: { id: 'site-contact' },
    update: {},
    create: {
      id: 'site-contact',
      phone: '+90 555 555 55 55',
      email: 'info@hivhestin.com',
      iban: 'TR12 3456 7890 1234 5678 9012 34',
      taxNumber: '1234567890',
      mernisNumber: '12345678901',
      mapEmbed:
        'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d12041.432!2d28.978358!3d41.008238!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sHivhestin!5e0!3m2!1str!2str!4v0000000000',
    },
  })

  await prisma.contactInfoTranslation.upsert({
    where: { contactInfoId_locale: { contactInfoId: contact.id, locale: 'tr' } },
    update: { address: 'İstiklal Cd. No:1, Beyoğlu/İstanbul' },
    create: {
      contactInfoId: contact.id,
      locale: 'tr',
      address: 'İstiklal Cd. No:1, Beyoğlu/İstanbul',
    },
  })

  await prisma.contactInfoTranslation.upsert({
    where: { contactInfoId_locale: { contactInfoId: contact.id, locale: 'en' } },
    update: { address: 'Istiklal Ave No:1, Beyoglu/Istanbul' },
    create: {
      contactInfoId: contact.id,
      locale: 'en',
      address: 'Istiklal Ave No:1, Beyoglu/Istanbul',
    },
  })
  console.log('✅ Contact info created')

  // Optionally limit demo products; keep imported products active
  const allowedProductIdsBase = [
    'tshirt-1',
    'tshirt-2',
    'jeans-1',
    'jeans-2',
    'shoes-1',
    'shoes-2',
  ]
  const allowedProductIds = [...allowedProductIdsBase]

  if (process.env.SEED_DEMO_ONLY === 'true') {
    await prisma.product.updateMany({
      where: { id: { notIn: allowedProductIds } },
      data: { status: 'INACTIVE' },
    })
    console.log('✅ Limited to demo products; others set INACTIVE')
  } else {
    console.log('ℹ️ Skipping product deactivation to keep imported products active')
  }

  // Create sample orders
  console.log('📦 Creating sample orders...')

  const products = await prisma.product.findMany()
  const regularUsers = await prisma.user.findMany({ where: { role: 'USER' } })
  const statuses = Object.values(OrderStatus)

  // Create sample addresses for users
  const addresses = []
  for (let i = 0; i < regularUsers.length; i++) {
    const user = regularUsers[i]
    const address = await prisma.address.upsert({
      where: { id: `address-${user.id}` },
      update: {},
      create: {
        id: `address-${user.id}`,
        userId: user.id,
        fullName: user.name || 'Sample User',
        street: `${123 + i} Sample Street`,
        city: 'Istanbul',
        state: 'Istanbul',
        postalCode: `3400${i}`,
        country: 'Turkey',
        phone: `+90555000000${i}`,
        tcNumber: `1234567890${i}`,
        isDefault: true,
      },
    })
    addresses.push(address)
  }

  // Generate 150 orders with more realistic data
  for (let i = 0; i < 150; i++) {
    // Generate a random date within the last 60 days
    const randomDays = Math.floor(Math.random() * 60)
    const randomHours = Math.floor(Math.random() * 24)
    const randomMinutes = Math.floor(Math.random() * 60)
    const orderDate = addMinutes(
      addHours(subDays(new Date(), randomDays), randomHours),
      randomMinutes
    )

    // Randomly select a user
    const randomUser = regularUsers[Math.floor(Math.random() * regularUsers.length)]
    const userAddress = addresses.find(addr => addr.userId === randomUser.id)

    // Randomly select 1-4 products for the order
    const numItems = Math.floor(Math.random() * 4) + 1 // 1-4 items
    const selectedProducts = [...products]
      .sort(() => 0.5 - Math.random())
      .slice(0, numItems)

    // Calculate total order value
    const orderItems = selectedProducts.map((product) => ({
      productId: product.id,
      quantity: Math.floor(Math.random() * 3) + 1, // 1-3 quantity
      price: product.price,
    }))

    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    )

    // Add shipping cost (random between 10-25)
    const shippingCost = Math.floor(Math.random() * 16) + 10
    const total = subtotal + shippingCost

    // Determine order status based on order age
    let orderStatus: OrderStatus = OrderStatus.PENDING
    if (randomDays > 30) {
      orderStatus = OrderStatus.DELIVERED
    } else if (randomDays > 15) {
      orderStatus = Math.random() > 0.3 ? OrderStatus.DELIVERED : OrderStatus.SHIPPED
    } else if (randomDays > 7) {
      orderStatus = Math.random() > 0.5 ? OrderStatus.SHIPPED : OrderStatus.PROCESSING
    } else if (randomDays > 2) {
      orderStatus = Math.random() > 0.7 ? OrderStatus.PROCESSING : OrderStatus.PENDING
    }

    // Set paid date for non-pending orders
    const paidAt = orderStatus !== OrderStatus.PENDING ? orderDate : null

    // Create the order
    await prisma.order.create({
      data: {
        userId: randomUser.id,
        shippingFullName: userAddress?.fullName || randomUser.name || 'Sample User',
        shippingStreet: userAddress?.street || 'Sample Street',
        shippingCity: userAddress?.city || 'Istanbul',
        shippingState: userAddress?.state || 'Istanbul',
        shippingPostalCode: userAddress?.postalCode || '34000',
        shippingCountry: userAddress?.country || 'Turkey',
        shippingPhone: userAddress?.phone || '+905550000000',
        shippingTcNumber: userAddress?.tcNumber || '12345678901',
        shippingEmail: randomUser.email || 'user@example.com',
        status: orderStatus,
        total,
        shippingCost,
        paidAt,
        createdAt: orderDate,
        items: {
          create: orderItems,
        },
      },
    })
  }

  console.log('✅ Sample orders created')

  // Create some sample saved cards for users
  console.log('💳 Creating sample saved cards...')

  for (let i = 0; i < 3; i++) {
    const user = regularUsers[i]
    await prisma.savedCard.create({
      data: {
        userId: user.id,
        cardUserKey: `user_${user.id}_${Date.now() + i}`,
        cardToken: `card_token_${i + 1}_${Date.now()}`,
        cardAlias: `My Card ${i + 1}`,
        cardFamily: i === 0 ? 'Bonus' : i === 1 ? 'Maximum' : 'World',
        cardAssociation: i === 0 ? 'VISA' : 'MASTER_CARD',
        cardType: 'CREDIT_CARD',
        binNumber: i === 0 ? '454671' : i === 1 ? '552879' : '540061',
        lastFourDigits: `000${i + 1}`,
        cardBankCode: i === 0 ? '12' : i === 1 ? '46' : '64',
        cardBankName: i === 0 ? 'Garanti BBVA' : i === 1 ? 'Akbank' : 'İş Bankası',
        isDefault: i === 0,
      },
    })
  }

  console.log('✅ Sample saved cards created')

  console.log('🎉 Database seeding completed successfully!')
  console.log(`
📊 Summary:
- ${regularUsers.length} users created
- ${categories.length} categories created  
- ${products.length} products created
- 150 orders created
- 3 saved cards created
- Multiple addresses created
  `)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
