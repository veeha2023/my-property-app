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

// Exchange rate cache
let exchangeRates = {};
let lastFetchTime = 0;
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

// Fetch live exchange rates from API
export const fetchExchangeRates = async () => {
  const now = Date.now();
  
  // Return cached rates if still valid
  if (exchangeRates.rates && (now - lastFetchTime) < CACHE_DURATION) {
    return exchangeRates;
  }

  try {
    const response = await fetch('https://api.freecurrencyapi.com/v1/latest', {
      method: 'GET',
      headers: {
        'apikey': 'fca_live_QWblV13xKQrCWDBd7heibrjh6OUDwaFYbwbBFwtm'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    exchangeRates = data;
    lastFetchTime = now;
    
    return exchangeRates;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    // Return cached rates if available, otherwise return empty object
    return exchangeRates.rates ? exchangeRates : { rates: {} };
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
export const convertItemsCurrency = async (items, fromCurrency, toCurrency) => {
  if (fromCurrency === toCurrency) {
    return items;
  }

  const rates = await fetchExchangeRates();
  
  return items.map(item => ({
    ...item,
    currency: toCurrency,
    price: convertCurrency(item.price || 0, fromCurrency, toCurrency, rates.rates),
    price_if_selected: convertCurrency(item.price_if_selected || 0, fromCurrency, toCurrency, rates.rates),
    price_if_not_selected: convertCurrency(item.price_if_not_selected || 0, fromCurrency, toCurrency, rates.rates)
  }));
};

