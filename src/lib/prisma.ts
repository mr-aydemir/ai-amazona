import { PrismaClient } from '@prisma/client'

function buildDatabaseUrl(raw: string | undefined) {
  if (!raw) return undefined

  try {
    const url = new URL(raw)
    // Build workers generate many pages in parallel with a single connection.
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      url.searchParams.set('connection_limit', '5')
      url.searchParams.set('pool_timeout', '60')
    } else if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', '30')
    }
    return url.toString()
  } catch {
    return raw
  }
}

const datasourceUrl = buildDatabaseUrl(process.env.DATABASE_URL)
const prisma = datasourceUrl ? new PrismaClient({ datasourceUrl }) : new PrismaClient()

export default prisma
export { prisma }
