import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale } from './config';

export default getRequestConfig(async ({ requestLocale }) => {
  // Validate that the incoming `locale` parameter is valid
  const requested = await requestLocale;
  const locale = hasLocale(locales, requested)
    ? requested
    : defaultLocale;
  const currentLocale = locale ?? defaultLocale;

  // Define all available message files
  const messageFiles = ['admin', 'auth', 'cart', 'common', 'products', 'payment', 'dashboard', 'home', 'order', 'installments'];

  // Dynamically load and organize messages by namespace
  const messages: Record<string, any> = {};

  for (const file of messageFiles) {
    try {
      const fileMessages = (await import(`../../messages/${currentLocale}/${file}.json`)).default;
      messages[file] = fileMessages;
    } catch (error: any) {
      console.warn(`Failed to load ${file}.json for locale ${currentLocale}:`, error);
      messages[file] = {};
    }
  }

  return {
    locale: currentLocale,
    messages
  };
});