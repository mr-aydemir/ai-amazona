import { prisma } from '@/lib/prisma'

/**
 * Get user's preferred locale from database
 * @param userId - User ID
 * @returns User's preferred locale or 'tr' as default
 */
export async function getUserPreferredLocale(userId: string): Promise<'tr' | 'en'> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferredLocale: true }
    })

    return (user?.preferredLocale as 'tr' | 'en') || 'tr'
  } catch (error) {
    console.error('Error fetching user preferred locale:', error)
    return 'tr' // Default fallback
  }
}

/**
 * Get user's preferred locale by email
 * @param email - User email
 * @returns User's preferred locale or 'tr' as default
 */
export async function getUserPreferredLocaleByEmail(email: string): Promise<'tr' | 'en'> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { preferredLocale: true }
    })

    return (user?.preferredLocale as 'tr' | 'en') || 'tr'
  } catch (error) {
    console.error('Error fetching user preferred locale by email:', error)
    return 'tr' // Default fallback
  }
}