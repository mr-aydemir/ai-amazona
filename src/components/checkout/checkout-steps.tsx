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
    <div className="w-full bg-background border-b border-border mb-8">
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
                        ? 'bg-primary border-primary text-primary-foreground'
                        : step.id === currentStep
                          ? 'border-primary text-primary bg-background'
                          : 'border-border text-muted-foreground bg-background'
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
                          ? 'text-primary'
                          : 'text-muted-foreground'
                      )}
                    >
                      {step.name}
                    </div>
                    <div className="text-xs text-muted-foreground hidden sm:block">
                      {step.description}
                    </div>
                  </div>
                </div>
                {stepIdx < steps.length - 1 && (
                  <div
                    className={cn(
                      'hidden md:block w-16 h-0.5 ml-8',
                      step.id < currentStep
                        ? 'bg-primary'
                        : 'bg-muted'
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