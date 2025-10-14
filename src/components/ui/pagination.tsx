import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
  const maxVisiblePages = 5

  let visiblePages = pages
  if (totalPages > maxVisiblePages) {
    const start = Math.max(
      Math.min(
        currentPage - Math.floor(maxVisiblePages / 2),
        totalPages - maxVisiblePages + 1
      ),
      1
    )
    visiblePages = pages.slice(start - 1, start + maxVisiblePages - 1)
  }

  return (
    <nav aria-label='Pagination' className='flex justify-center'>
      <ul className='flex items-center gap-2'>
        <li>
          <Button
            variant='outline'
            size='icon'
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label='Previous page'
          >
            <ChevronLeft className='h-4 w-4' />
            <span className='sr-only'>Previous</span>
          </Button>
        </li>

        {visiblePages[0] > 1 && (
          <>
            <li>
              <Button
                variant='outline'
                size='icon'
                onClick={() => onPageChange(1)}
                aria-label='Page 1'
              >
                1
              </Button>
            </li>
            {visiblePages[0] > 2 && (
              <li>
                <span className='px-2 text-muted-foreground'>…</span>
              </li>
            )}
          </>
        )}

        {visiblePages.map((page) => (
          <li key={page}>
            <Button
              variant={currentPage === page ? 'default' : 'outline'}
              size='icon'
              onClick={() => onPageChange(page)}
              aria-current={currentPage === page ? 'page' : undefined}
              aria-label={`Page ${page}`}
            >
              {page}
            </Button>
          </li>
        ))}

        {visiblePages[visiblePages.length - 1] < totalPages && (
          <>
            {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
              <li>
                <span className='px-2 text-muted-foreground'>…</span>
              </li>
            )}
            <li>
              <Button
                variant='outline'
                size='icon'
                onClick={() => onPageChange(totalPages)}
                aria-label={`Page ${totalPages}`}
              >
                {totalPages}
              </Button>
            </li>
          </>
        )}

        <li>
          <Button
            variant='outline'
            size='icon'
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label='Next page'
          >
            <ChevronRight className='h-4 w-4' />
            <span className='sr-only'>Next</span>
          </Button>
        </li>
      </ul>
    </nav>
  )
}
