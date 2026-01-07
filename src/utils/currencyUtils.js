// Currency utilities for the property app
export const CURRENCIES = {
  'AUD': { name: 'Australian Dollar', symbol: 'A$', code: 'AUD' },
  'BRL': { name: 'Brazilian Real', symbol: 'R$', code: 'BRL' },
  'CAD': { name: 'Canadian Dollar', symbol: 'C$', code: 'CAD' },
  'CHF': { name: 'Swiss Franc', symbol: 'CHF', code: 'CHF' },
  'CNY': { name: 'Chinese Yuan', symbol: '¥', code: 'CNY' },
  'CZK': { name: 'Czech Koruna', symbol: 'Kč', code: 'CZK' },
  'DKK': { name: 'Danish Krone', symbol: 'kr', code: 'DKK' },
  'EUR': { name: 'Euro', symbol: '€', code: 'EUR' },
  'GBP': { name: 'British Pound', symbol: '£', code: 'GBP' },
  'HKD': { name: 'Hong Kong Dollar', symbol: 'HK$', code: 'HKD' },
  'HUF': { name: 'Hungarian Forint', symbol: 'Ft', code: 'HUF' },
  'IDR': { name: 'Indonesian Rupiah', symbol: 'Rp', code: 'IDR' },
  'ILS': { name: 'Israeli Shekel', symbol: '₪', code: 'ILS' },
  'INR': { name: 'Indian Rupee', symbol: '₹', code: 'INR' },
  'JPY': { name: 'Japanese Yen', symbol: '¥', code: 'JPY' },
  'KRW': { name: 'South Korean Won', symbol: '₩', code: 'KRW' },
  'MXN': { name: 'Mexican Peso', symbol: '$', code: 'MXN' },
  'MYR': { name: 'Malaysian Ringgit', symbol: 'RM', code: 'MYR' },
  'NOK': { name: 'Norwegian Krone', symbol: 'kr', code: 'NOK' },
  'NZD': { name: 'New Zealand Dollar', symbol: 'NZ$', code: 'NZD' },
  'PHP': { name: 'Philippine Peso', symbol: '₱', code: 'PHP' },
  'PLN': { name: 'Polish Zloty', symbol: 'zł', code: 'PLN' },
  'RUB': { name: 'Russian Ruble', symbol: '₽', code: 'RUB' },
  'SEK': { name: 'Swedish Krona', symbol: 'kr', code: 'SEK' },
  'SGD': { name: 'Singapore Dollar', symbol: 'S$', code: 'SGD' },
  'THB': { name: 'Thai Baht', symbol: '฿', code: 'THB' },
  'TRY': { name: 'Turkish Lira', symbol: '₺', code: 'TRY' },
  'USD': { name: 'US Dollar', symbol: '$', code: 'USD' },
  'VND': { name: 'Vietnamese Dong', symbol: '₫', code: 'VND' },
  'ZAR': { name: 'South African Rand', symbol: 'R', code: 'ZAR' }
};

export const DEFAULT_CURRENCY = 'NZD';
export const MARKUP_PERCENTAGE = 0.02; // 2% markup

// Exchange rate cache with date support
let exchangeRateCache = {};
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

export const getCurrencySymbol = (currencyCode) => {
  return CURRENCIES[currencyCode]?.symbol || currencyCode;
};

export const getCurrencyName = (currencyCode) => {
  return CURRENCIES[currencyCode]?.name || currencyCode;
};

export const getCurrencyOptions = () => {
  return Object.entries(CURRENCIES).map(([code, data]) => ({
    value: code,
    label: `${data.symbol} ${data.name} (${code})`
  }));
};

// Format number with thousand separators
// INR uses Indian numbering system (12,34,567.89)
// Other currencies use standard system (1,234,567.89)
export const formatNumberWithCommas = (number, currencyCode = 'NZD') => {
  const num = parseFloat(number);
  if (isNaN(num)) return '0.00';

  // Handle INR with Indian numbering system
  if (currencyCode === 'INR') {
    const [integerPart, decimalPart] = num.toFixed(2).split('.');

    // For Indian numbering: first 3 digits from right, then groups of 2
    let formattedInteger = '';
    const reversed = integerPart.split('').reverse().join('');

    for (let i = 0; i < reversed.length; i++) {
      if (i === 3 || (i > 3 && (i - 3) % 2 === 0)) {
        formattedInteger = ',' + formattedInteger;
      }
      formattedInteger = reversed[i] + formattedInteger;
    }

    return `${formattedInteger}.${decimalPart}`;
  }

  // Standard formatting for other currencies
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// Fetch live exchange rates from API with optional date
export const fetchExchangeRates = async (date = null) => {
  const now = Date.now();
  const cacheKey = date || 'latest';

  // Return cached rates if still valid
  if (exchangeRateCache[cacheKey] && (now - (exchangeRateCache[cacheKey].timestamp || 0)) < CACHE_DURATION) {
    return exchangeRateCache[cacheKey].data;
  }

  try {
    // Check if the provided date is today
    const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    const isToday = date === today || !date;

    let url;
    if (isToday) {
      // Use latest endpoint for today or no date
      url = 'https://api.freecurrencyapi.com/v1/latest?apikey=fca_live_QWblV13xKQrCWDBd7heibrjh6OUDwaFYbwbBFwtm';
    } else {
      // Use historical endpoint for past dates
      url = `https://api.freecurrencyapi.com/v1/historical?apikey=fca_live_QWblV13xKQrCWDBd7heibrjh6OUDwaFYbwbBFwtm&date=${date}`;
    }

    const response = await fetch(url, {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const jsonData = await response.json();

    // Extract rates based on endpoint type
    let rates;
    if (isToday) {
      // Latest endpoint returns: {data: {USD: 1, EUR: 0.85, ...}}
      rates = jsonData.data || {};
    } else {
      // Historical endpoint returns: {data: {"2026-01-06": {USD: 1, ...}}}
      // Extract the rates from the nested date object
      const dataObj = jsonData.data || {};
      rates = dataObj[date] || {};
    }

    // Cache the rates (not the whole response)
    exchangeRateCache[cacheKey] = {
      data: rates,
      timestamp: now
    };

    return rates;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    // Return cached rates if available, otherwise return empty object
    return exchangeRateCache[cacheKey]?.data || {};
  }
};

// Detect user's currency based on locale
export const detectUserCurrency = () => {
  try {
    // Try to get currency from browser locale
    const userLocale = navigator.language || 'en-US';
    const formatter = new Intl.NumberFormat(userLocale, { style: 'currency', currency: 'USD' });
    const parts = formatter.formatToParts(1);
    const currencyPart = parts.find(part => part.type === 'currency');

    if (currencyPart && CURRENCIES[currencyPart.value]) {
      return currencyPart.value;
    }

    // Fallback: Map common locales to currencies
    const localeToCurrency = {
      'en-US': 'USD', 'en-GB': 'GBP', 'en-AU': 'AUD', 'en-NZ': 'NZD', 'en-CA': 'CAD',
      'de': 'EUR', 'fr': 'EUR', 'es': 'EUR', 'it': 'EUR', 'nl': 'EUR',
      'ja': 'JPY', 'zh-CN': 'CNY', 'ko': 'KRW', 'hi': 'INR', 'th': 'THB',
      'pt-BR': 'BRL', 'ru': 'RUB', 'tr': 'TRY', 'pl': 'PLN', 'sv': 'SEK',
      'no': 'NOK', 'da': 'DKK', 'cs': 'CZK', 'hu': 'HUF', 'id': 'IDR',
      'ms': 'MYR', 'vi': 'VND', 'fil': 'PHP', 'he': 'ILS', 'ar': 'SAR'
    };

    const baseLocale = userLocale.split('-')[0];
    return localeToCurrency[userLocale] || localeToCurrency[baseLocale] || DEFAULT_CURRENCY;
  } catch (error) {
    console.error('Error detecting currency:', error);
    return DEFAULT_CURRENCY;
  }
};

// Convert amount from one currency to another with markup
export const convertCurrency = (amount, fromCurrency, toCurrency, rates = null) => {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  if (!rates) {
    console.warn('No exchange rates provided for conversion');
    return amount;
  }

  // Get base rate (assuming USD as base in the API)
  const fromRate = rates[fromCurrency] || 1;
  const toRate = rates[toCurrency] || 1;
  
  // Convert to USD first, then to target currency
  const usdAmount = amount / fromRate;
  const convertedAmount = usdAmount * toRate;
  
  // Apply 2% markup
  const finalAmount = convertedAmount * (1 + MARKUP_PERCENTAGE);
  
  return Math.round(finalAmount * 100) / 100; // Round to 2 decimal places
};

// Convert all items in an array to a new currency
export const convertItemsCurrency = async (items, fromCurrency, toCurrency, conversionDate = null) => {
  if (fromCurrency === toCurrency) {
    return items;
  }

  const rates = await fetchExchangeRates(conversionDate);

  return items.map(item => ({
    ...item,
    currency: toCurrency,
    price: convertCurrency(item.price || 0, fromCurrency, toCurrency, rates),
    price_if_selected: convertCurrency(item.price_if_selected || 0, fromCurrency, toCurrency, rates),
    price_if_not_selected: convertCurrency(item.price_if_not_selected || 0, fromCurrency, toCurrency, rates)
  }));
};

