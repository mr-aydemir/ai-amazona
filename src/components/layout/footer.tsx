'use client'

import Link from 'next/link'
import { Facebook, Instagram, Twitter } from 'lucide-react'
import { useTranslations } from 'next-intl'

export function Footer() {
  const t = useTranslations('common.footer')

  return (
    <footer className='bg-background border-t'>
      <div className='container mx-auto px-4 sm:px-6 lg:px-8 py-12'>
        <div className='grid grid-cols-1 md:grid-cols-4 gap-8'>
          {/* Shop */}
          <div>
            <h3 className='font-semibold mb-4 text-foreground'>{t('sections.shop')}</h3>
            <ul className='space-y-2'>
              <li>
                <Link
                  href='/search'
                  className='text-muted-foreground hover:text-foreground transition-colors'
                >
                  {t('links.all_products')}
                </Link>
              </li>
              <li>
                <Link
                  href='/categories'
                  className='text-muted-foreground hover:text-foreground transition-colors'
                >
                  {t('links.categories')}
                </Link>
              </li>
              <li>
                <Link
                  href='/deals'
                  className='text-muted-foreground hover:text-foreground transition-colors'
                >
                  {t('links.deals')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className='font-semibold mb-4 text-foreground'>{t('sections.customer_service')}</h3>
            <ul className='space-y-2'>
              <li>
                <Link
                  href='/contact'
                  className='text-muted-foreground hover:text-foreground transition-colors'
                >
                  {t('links.contact_us')}
                </Link>
              </li>
              <li>
                <Link
                  href='/shipping'
                  className='text-muted-foreground hover:text-foreground transition-colors'
                >
                  {t('links.shipping_info')}
                </Link>
              </li>
              <li>
                <Link
                  href='/returns'
                  className='text-muted-foreground hover:text-foreground transition-colors'
                >
                  {t('links.returns')}
                </Link>
              </li>
              <li>
                <Link
                  href='/faqs'
                  className='text-muted-foreground hover:text-foreground transition-colors'
                >
                  {t('links.faqs')}
                </Link>
              </li>
            </ul>
          </div>

          {/* About */}
          <div>
            <h3 className='font-semibold mb-4 text-foreground'>{t('sections.about')}</h3>
            <ul className='space-y-2'>
              <li>
                <Link
                  href='/about'
                  className='text-muted-foreground hover:text-foreground transition-colors'
                >
                  {t('links.about_us')}
                </Link>
              </li>
              <li>
                <Link
                  href='/careers'
                  className='text-muted-foreground hover:text-foreground transition-colors'
                >
                  {t('links.careers')}
                </Link>
              </li>
              <li>
                <Link
                  href='/privacy'
                  className='text-muted-foreground hover:text-foreground transition-colors'
                >
                  {t('links.privacy_policy')}
                </Link>
              </li>
              <li>
                <Link
                  href='/terms'
                  className='text-muted-foreground hover:text-foreground transition-colors'
                >
                  {t('links.terms_of_use')}
                </Link>
              </li>
              <li>
                <Link
                  href='/cookies'
                  className='text-muted-foreground hover:text-foreground transition-colors'
                >
                  {t('links.cookies_policy')}
                </Link>
              </li>
              <li>
                <Link
                  href='/distance-sales'
                  className='text-muted-foreground hover:text-foreground transition-colors'
                >
                  {t('links.distance_sales')}
                </Link>
              </li>
              <li>
                <Link
                  href='/return-policy'
                  className='text-muted-foreground hover:text-foreground transition-colors'
                >
                  {t('links.return_policy')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h3 className='font-semibold mb-4 text-foreground'>{t('sections.connect')}</h3>
            <div className='flex space-x-4'>
              {/* <a
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
              </a> */}
              <a
                href='https://www.instagram.com/hivhestin3d_official/'
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
            {t('copyright', { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </footer>
  )
}
