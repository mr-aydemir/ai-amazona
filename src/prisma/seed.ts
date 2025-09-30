/* eslint-disable @typescript-eslint/no-unused-vars */
import { PrismaClient, OrderStatus } from '@prisma/client'
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

  // Create products
  console.log('🛍️ Creating products...')
  
  // T-shirts
  await prisma.product.upsert({
    where: { id: 'tshirt-1' },
    update: {},
    create: {
      id: 'tshirt-1',
      name: 'Classic White T-Shirt',
      description: 'A comfortable white t-shirt made from 100% cotton. Perfect for everyday wear with a relaxed fit.',
      price: 29.99,
      images: JSON.stringify(['/images/p11-1.jpg', '/images/p11-2.jpg']),
      categoryId: tshirts.id,
      stock: 50,
    },
  })

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

  await prisma.product.upsert({
    where: { id: 'jeans-3' },
    update: {},
    create: {
      id: 'jeans-3',
      name: 'Distressed Denim Jeans',
      description: 'Trendy distressed denim jeans with authentic vintage look.',
      price: 69.99,
      images: JSON.stringify(['/images/placeholder.jpg']),
      categoryId: jeans.id,
      stock: 25,
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

  await prisma.product.upsert({
    where: { id: 'shoes-3' },
    update: {},
    create: {
      id: 'shoes-3',
      name: 'Leather Boots',
      description: 'Premium leather boots with durable construction and timeless style.',
      price: 129.99,
      images: JSON.stringify(['/images/placeholder.jpg']),
      categoryId: shoes.id,
      stock: 15,
    },
  })

  // Jackets
  await prisma.product.upsert({
    where: { id: 'jacket-1' },
    update: {},
    create: {
      id: 'jacket-1',
      name: 'Winter Parka',
      description: 'Warm winter parka with waterproof exterior and insulated lining.',
      price: 149.99,
      images: JSON.stringify(['/images/placeholder.jpg']),
      categoryId: jackets.id,
      stock: 20,
    },
  })

  await prisma.product.upsert({
    where: { id: 'jacket-2' },
    update: {},
    create: {
      id: 'jacket-2',
      name: 'Denim Jacket',
      description: 'Classic denim jacket with vintage wash and comfortable fit.',
      price: 79.99,
      images: JSON.stringify(['/images/placeholder.jpg']),
      categoryId: jackets.id,
      stock: 30,
    },
  })

  // Accessories
  await prisma.product.upsert({
    where: { id: 'acc-1' },
    update: {},
    create: {
      id: 'acc-1',
      name: 'Leather Wallet',
      description: 'Premium leather wallet with multiple card slots and bill compartment.',
      price: 49.99,
      images: JSON.stringify(['/images/placeholder.jpg']),
      categoryId: accessories.id,
      stock: 50,
    },
  })

  await prisma.product.upsert({
    where: { id: 'acc-2' },
    update: {},
    create: {
      id: 'acc-2',
      name: 'Sunglasses',
      description: 'Stylish sunglasses with UV protection and polarized lenses.',
      price: 89.99,
      images: JSON.stringify(['/images/placeholder.jpg']),
      categoryId: accessories.id,
      stock: 40,
    },
  })

  // Electronics
  await prisma.product.upsert({
    where: { id: 'elec-1' },
    update: {},
    create: {
      id: 'elec-1',
      name: 'Wireless Headphones',
      description: 'High-quality wireless headphones with noise cancellation and long battery life.',
      price: 199.99,
      images: JSON.stringify(['/images/placeholder.jpg']),
      categoryId: electronics.id,
      stock: 25,
    },
  })

  await prisma.product.upsert({
    where: { id: 'elec-2' },
    update: {},
    create: {
      id: 'elec-2',
      name: 'Smartphone Case',
      description: 'Protective smartphone case with shock absorption and wireless charging compatibility.',
      price: 29.99,
      images: JSON.stringify(['/images/placeholder.jpg']),
      categoryId: electronics.id,
      stock: 100,
    },
  })

  console.log('✅ Products created')

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
