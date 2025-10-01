'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

interface CheckoutStepsProps {
  currentStep: 1 | 2 | 3
}

export default function CheckoutSteps({ currentStep }: CheckoutStepsProps) {
  const t = useTranslations('payment.steps')

  const steps = [
    { id: 1, name: t('addressSelection'), description: t('addressSelectionDescription') },
    { id: 2, name: t('payment'), description: t('paymentDescription') },
    { id: 3, name: t('confirmation'), description: t('confirmationDescription') },
  ]

  return (
    <div className="w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 mb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav aria-label="Progress" className="py-6">
          <ol className="flex items-center justify-center space-x-8 md:space-x-12">
            {steps.map((step, stepIdx) => (
              <li key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-medium',
                      step.id < currentStep
                        ? 'bg-blue-600 border-blue-600 text-white dark:bg-blue-500 dark:border-blue-500'
                        : step.id === currentStep
                          ? 'border-blue-600 text-blue-600 bg-white dark:border-blue-400 dark:text-blue-400 dark:bg-gray-900'
                          : 'border-gray-300 text-gray-500 bg-white dark:border-gray-600 dark:text-gray-400 dark:bg-gray-900'
                    )}
                  >
                    {step.id < currentStep ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <span>{step.id}</span>
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <div
                      className={cn(
                        'text-sm font-medium',
                        step.id <= currentStep
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-500 dark:text-gray-400'
                      )}
                    >
                      {step.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                      {step.description}
                    </div>
                  </div>
                </div>
                {stepIdx < steps.length - 1 && (
                  <div
                    className={cn(
                      'hidden md:block w-16 h-0.5 ml-8',
                      step.id < currentStep
                        ? 'bg-blue-600 dark:bg-blue-500'
                        : 'bg-gray-300 dark:bg-gray-600'
                    )}
                  />
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </div>
  )
}