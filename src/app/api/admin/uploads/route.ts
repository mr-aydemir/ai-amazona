import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { UTApi } from 'uploadthing/server'

function isAdmin(session: any) {
  return session?.user && session.user.role === 'ADMIN'
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const utapi = new UTApi()
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = (searchParams.get('search') || '').toLowerCase()
    const offset = (page - 1) * limit

    // UploadThing currently does not support server-side filtering by name, so we
    // list a larger window and filter client-side here.
    const listLimit = Math.max(limit * page, 100)
    const listRes = await utapi.listFiles({ limit: listLimit })

    const allFiles = (listRes?.files || []).map((f: any) => ({
      key: f.key,
      name: f.name,
      size: f.size,
      uploadedAt: f.uploadedAt,
      url: f.url ?? (f.key ? `https://utfs.io/f/${f.key}` : undefined),
    }))

    const filtered = search
      ? allFiles.filter((f) =>
          (f.name || '').toLowerCase().includes(search) ||
          (f.key || '').toLowerCase().includes(search)
        )
      : allFiles

    const paged = filtered.slice(offset, offset + limit)

    return NextResponse.json({
      files: paged,
      pagination: {
        page,
        limit,
        total: filtered.length,
        pages: Math.ceil(filtered.length / limit),
      },
    })
  } catch (error) {
    console.error('[ADMIN_UPLOADS_GET] Error:', error)
    return NextResponse.json({ error: 'Failed to list uploaded files' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const utapi = new UTApi()
    const body = await request.json()
    const { key, keys } = body || {}

    const targets: string[] = Array.isArray(keys)
      ? keys.filter((k) => typeof k === 'string')
      : typeof key === 'string'
        ? [key]
        : []

    if (!targets.length) {
      return NextResponse.json({ error: 'File key is required' }, { status: 400 })
    }

    const res = await utapi.deleteFiles(targets)

    // res.success can be boolean or per-file; normalize
    const success = Array.isArray(res)
      ? res.every((r: any) => r?.success)
      : (res as any)?.success !== false

    return NextResponse.json({ success })
  } catch (error) {
    console.error('[ADMIN_UPLOADS_DELETE] Error:', error)
    return NextResponse.json({ error: 'Failed to delete file(s)' }, { status: 500 })
  }
}