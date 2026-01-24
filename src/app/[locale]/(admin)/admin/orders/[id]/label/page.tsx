
import React from 'react'
import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import LabelView from './label-view'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{
    id: string
    locale: string
  }>
}

export default async function LabelPage({ params }: PageProps) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/')
  }

  const { id, locale } = await params
  
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: true
    }
  })

  if (!order) {
    notFound()
  }

  const contactInfo = await prisma.contactInfo.findFirst({
    include: {
        translations: {
            where: { locale }
        }
    }
  })

  return <LabelView order={order} contactInfo={contactInfo} />
}
