import Link from 'next/link'
import { Facebook, Instagram, Twitter } from 'lucide-react'

export function Footer() {
  return (
    <footer className='bg-background border-t'>
      <div className='container mx-auto px-4 sm:px-6 lg:px-8 py-12'>
        <div className='grid grid-cols-1 md:grid-cols-4 gap-8'>
          {/* Shop */}
          <div>
            <h3 className='font-semibold mb-4 text-foreground'>Shop</h3>
            <ul className='space-y-2'>
              <li>
                <Link
                  href='/search'
                  className='text-muted-foreground hover:text-foreground transition-colors'
                >
                  All Products
                </Link>
              </li>
              <li>
                <Link
                  href='/categories'
                  className='text-muted-foreground hover:text-foreground transition-colors'
                >
                  Categories
                </Link>
              </li>
              <li>
                <Link
                  href='/deals'
                  className='text-muted-foreground hover:text-foreground transition-colors'
                >
                  Deals
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className='font-semibold mb-4 text-foreground'>Customer Service</h3>
            <ul className='space-y-2'>
              <li>
                <Link
                  href='/contact'
                  className='text-muted-foreground hover:text-foreground transition-colors'
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  href='/shipping'
                  className='text-muted-foreground hover:text-foreground transition-colors'
                >
                  Shipping Information
                </Link>
              </li>
              <li>
                <Link
                  href='/returns'
                  className='text-muted-foreground hover:text-foreground transition-colors'
                >
                  Returns & Exchanges
                </Link>
              </li>
            </ul>
          </div>

          {/* About */}
          <div>
            <h3 className='font-semibold mb-4 text-foreground'>About</h3>
            <ul className='space-y-2'>
              <li>
                <Link
                  href='/about'
                  className='text-muted-foreground hover:text-foreground transition-colors'
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href='/careers'
                  className='text-muted-foreground hover:text-foreground transition-colors'
                >
                  Careers
                </Link>
              </li>
              <li>
                <Link
                  href='/privacy'
                  className='text-muted-foreground hover:text-foreground transition-colors'
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h3 className='font-semibold mb-4 text-foreground'>Connect With Us</h3>
            <div className='flex space-x-4'>
              <a
                href='https://facebook.com'
                target='_blank'
                rel='noopener noreferrer'
                className='text-muted-foreground hover:text-foreground transition-colors'
              >
                <Facebook className='h-6 w-6' />
              </a>
              <a
                href='https://twitter.com'
                target='_blank'
                rel='noopener noreferrer'
                className='text-muted-foreground hover:text-foreground transition-colors'
              >
                <Twitter className='h-6 w-6' />
              </a>
              <a
                href='https://instagram.com'
                target='_blank'
                rel='noopener noreferrer'
                className='text-muted-foreground hover:text-foreground transition-colors'
              >
                <Instagram className='h-6 w-6' />
              </a>
            </div>
          </div>
        </div>

        <div className='mt-8 pt-8 border-t border-border'>
          <p className='text-center text-muted-foreground'>
            © {new Date().getFullYear()} AI Amazona. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
