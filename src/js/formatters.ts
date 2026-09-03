/**
 * Pure number and currency formatting utilities.
 * Completely isolated from charting engines and DOM rendering frameworks
 * to prevent dependency leakage into background threads and Web Workers.
 */

export const getLocaleAndCurrency = (): { locale: string; currency: string } => {
  if (typeof document === 'undefined') {
    return { locale: 'en-US', currency: 'USD' };
  }
  const el = document.getElementById('country-select') as HTMLSelectElement | null;
  const val = el ? el.value : 'semi';
  switch (val) {
    case 'semi': // Canada
      return { locale: 'en-CA', currency: 'CAD' };
    case 'monthly-uk': // UK
      return { locale: 'en-GB', currency: 'GBP' };
    case 'monthly-au': // AU
      return { locale: 'en-AU', currency: 'AUD' };
    case 'monthly-nz': // NZ
      return { locale: 'en-NZ', currency: 'NZD' };
    case 'monthly': // USA
    default:
      return { locale: 'en-US', currency: 'USD' };
  }
};

export const getCurrencySymbol = (): string => {
  const { currency } = getLocaleAndCurrency();
  switch (currency) {
    case 'GBP':
      return '£';
    case 'CAD':
    case 'AUD':
    case 'NZD':
    case 'USD':
    default:
      return '$';
  }
};

let cachedLocale = '';
let cachedCurrency = '';
let cachedFormatCurrency: Intl.NumberFormat | null = null;
let cachedFormatDecimal: Intl.NumberFormat | null = null;

export const getFormatter = (style: 'currency' | 'decimal'): Intl.NumberFormat => {
  const { locale, currency } = getLocaleAndCurrency();
  if (
    locale !== cachedLocale ||
    currency !== cachedCurrency ||
    !cachedFormatCurrency ||
    !cachedFormatDecimal
  ) {
    cachedLocale = locale;
    cachedCurrency = currency;
    cachedFormatCurrency = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0
    });
    cachedFormatDecimal = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
  return style === 'currency' ? cachedFormatCurrency : cachedFormatDecimal;
};

export const formatCurrency = (n: number): string => {
  return getFormatter('currency').format(n);
};

export const formatDecimal = (n: number): string => {
  return getFormatter('decimal').format(n);
};
