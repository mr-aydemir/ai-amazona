import path from 'node:path'
import type { PrismaConfig } from 'prisma'

export default {
  schema: path.join('src', 'prisma', 'schema.prisma'),
  migrations: {
    path: path.join('src', 'prisma', 'migrations'),
    seed: 'ts-node --compiler-options {"module":"CommonJS"} src/prisma/seed.ts',
  },
} satisfies PrismaConfig