import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/')
  }

  return (
    <SidebarProvider
      className='w-full'
    >
      <div className='min-h-screen bg-background w-full'>
        <div className='grid grid-cols-1 md:grid-cols-[auto_1fr] w-full'>
          <aside className='hidden md:block min-h-screen'>
            <AdminSidebar />
          </aside>
          <SidebarInset>
            <main className='px-4 py-8 sm:px-6 lg:px-8'>
              <SidebarTrigger />
              {children}
            </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  )
}
