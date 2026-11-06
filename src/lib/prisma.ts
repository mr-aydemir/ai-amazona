import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import type { PoolConfig } from 'pg'

function buildPoolConfig(): PoolConfig | null {
  const raw = process.env.DATABASE_URL
  if (!raw) return null

  try {
    const url = new URL(raw)
    const sslmode = url.searchParams.get('sslmode')

    // Prisma-specific pooler parameters are not understood by pg.
    url.searchParams.delete('pgbouncer')
    url.searchParams.delete('connection_limit')
    url.searchParams.delete('pool_timeout')
    url.searchParams.delete('sslmode')

    const isBuild = process.env.NEXT_PHASE === 'phase-production-build'

    return {
      connectionString: url.toString(),
      max: isBuild ? 5 : 1,
      connectionTimeoutMillis: 30000,
      idleTimeoutMillis: 10000,
      // Supabase's pooler certificate chain is not available to every runtime.
      ssl: sslmode && sslmode !== 'disable' ? { rejectUnauthorized: false } : undefined,
    }
  } catch {
    return { connectionString: raw }
  }
}

const poolConfig = buildPoolConfig()
const adapter = poolConfig ? new PrismaPg(poolConfig) : undefined
const prisma = adapter ? new PrismaClient({ adapter }) : new PrismaClient()

export default prisma
export { prisma }
