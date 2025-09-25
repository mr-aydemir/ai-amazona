export const locales = ['en', 'tr'] as const;
export const defaultLocale = 'en' as const;

export type Locale = (typeof locales)[number];