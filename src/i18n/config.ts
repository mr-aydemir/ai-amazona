export const locales = ['en', 'tr'] as const;
export const defaultLocale = 'tr' as const;

export type Locale = (typeof locales)[number];