import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Fetching system settings...')
  const settings = await prisma.systemSetting.findFirst()
  const vatRate = settings?.vatRate ?? 0.20 // Default to 20% if not set
  
  console.log(`Current system VAT rate: ${vatRate}`)
  
  console.log('Fetching all orders...')
  const orders = await prisma.order.findMany({
    include: {
      items: true
    }
  })
  
  console.log(`Found ${orders.length} orders. Starting update...`)
  
  let updatedCount = 0
  
  for (const order of orders) {
    // Calculate subtotal
    const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    
    // Calculate tax amount based on current rate
    const taxPrice = subtotal * vatRate
    
    // Update order with taxPrice
    await prisma.order.update({
      where: { id: order.id },
      data: {
        taxPrice: taxPrice
      }
    })
    
    // Update all items with taxRate
    for (const item of order.items) {
      await prisma.orderItem.update({
        where: { id: item.id },
        data: {
          taxRate: vatRate
        }
      })
    }
    
    updatedCount++
    if (updatedCount % 10 === 0) {
      console.log(`Updated ${updatedCount} orders...`)
    }
  }
  
  console.log(`\nSuccessfully updated ${updatedCount} orders with VAT rate: ${vatRate}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
