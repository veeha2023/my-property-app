// Normalizes Apify actor outputs into unified property schema
// Field mappings based on actual actor output samples in OUTPUT/

const WORD_TO_NUM = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

const TLD_CURRENCY_MAP = {
  '.co.nz': 'NZD', '.com.au': 'AUD', '.co.uk': 'GBP',
  '.ca': 'CAD', '.de': 'EUR', '.fr': 'EUR', '.it': 'EUR',
  '.es': 'EUR', '.nl': 'EUR', '.co.th': 'THB', '.co.jp': 'JPY',
  '.co.in': 'INR', '.sg': 'SGD', '.my': 'MYR', '.ph': 'PHP',
  '.co.id': 'IDR', '.vn': 'VND', '.co.kr': 'KRW', '.hk': 'HKD',
  '.com.br': 'BRL', '.com.mx': 'MXN', '.co.za': 'ZAR',
};

const SYMBOL_TO_ISO = {
  'US$': 'USD', '$': 'USD', 'NZ$': 'NZD', 'A$': 'AUD', 'C$': 'CAD',
  'HK$': 'HKD', 'S$': 'SGD', '€': 'EUR', '£': 'GBP', '¥': 'JPY',
  '₹': 'INR', '₩': 'KRW', 'R$': 'BRL', '₱': 'PHP', '฿': 'THB',
  '₺': 'TRY', '₽': 'RUB', 'zł': 'PLN', 'kr': 'SEK', 'Kč': 'CZK',
  'Ft': 'HUF', 'R': 'ZAR', 'Rp': 'IDR', 'RM': 'MYR', '₫': 'VND',
  '₪': 'ILS', 'CHF': 'CHF',
};

function inferCurrencyFromUrl(url) {
  try {
    const hostname = new URL(url).hostname;
    for (const [tld, currency] of Object.entries(TLD_CURRENCY_MAP)) {
      if (hostname.endsWith(tld)) return currency;
    }
  } catch {}
  return 'NZD';
}

function normalizeCurrency(raw) {
  if (!raw) return null;
  const str = String(raw).trim();
  if (/^[A-Z]{3}$/.test(str)) return str;
  if (SYMBOL_TO_ISO[str]) return SYMBOL_TO_ISO[str];
  const isoMatch = str.match(/\b([A-Z]{3})\b/);
  if (isoMatch) return isoMatch[1];
  return null;
}

function roundPrice(val) {
  return Math.round(parseFloat(val || 0) * 100) / 100;
}

function parseNumericPrice(str) {
  if (typeof str === 'number') return str;
  if (!str) return 0;
  const cleaned = String(str).replace(/[^0-9.,]/g, '').replace(/,/g, '');
  return parseFloat(cleaned) || 0;
}

function extractImages(data) {
  if (Array.isArray(data.images)) {
    return data.images.map(img =>
      typeof img === 'string' ? img : (img.imageUrl || img.url || img.large || img.picture || img.baseUrl || '')
    ).filter(Boolean);
  }
  if (Array.isArray(data.photos)) {
    return data.photos.map(p => typeof p === 'string' ? p : (p.url || p.large || '')).filter(Boolean);
  }
  if (Array.isArray(data.pictureUrls)) return data.pictureUrls;
  if (Array.isArray(data.photoUrls)) return data.photoUrls;
  if (data.image) return [data.image];
  return [];
}


function parseBedroomsFromName(roomType) {
  const digitMatch = roomType.match(/(\d+)[\s-]*bed/i);
  if (digitMatch) {
    const bedrooms = parseInt(digitMatch[1], 10);
    return { bedrooms, bathrooms: Math.max(1, bedrooms - 1) };
  }
  const wordMatch = roomType.match(/(\w+)[\s-]*bed/i);
  if (wordMatch && WORD_TO_NUM[wordMatch[1].toLowerCase()]) {
    const bedrooms = WORD_TO_NUM[wordMatch[1].toLowerCase()];
    return { bedrooms, bathrooms: Math.max(1, bedrooms - 1) };
  }
  if (roomType && !roomType.toLowerCase().includes('studio')) {
    return { bedrooms: 1, bathrooms: 1 };
  }
  return { bedrooms: 0, bathrooms: 0 };
}


// ============================================================
// BOOKING.COM NORMALIZER
// ============================================================

function getRoomImages(rawData, roomId) {
  if (!rawData.roomImages || !Array.isArray(rawData.roomImages)) return null;
  const roomIdStr = String(roomId);
  const matched = rawData.roomImages
    .filter(img => img.associatedRoomIds?.includes(roomIdStr))
    .map(img => img.largeUrl || img.thumbUrl)
    .filter(Boolean);
  return matched.length > 0 ? matched : null;
}

function normalizeBooking(rawData, sourceUrl) {
  const hotelName = rawData.name || rawData.title || rawData.hotelName || '';

  // LOCATION: just city
  let location = '';
  if (rawData.address && typeof rawData.address === 'object') {
    location = rawData.address.city || '';
  } else if (typeof rawData.address === 'string') {
    location = rawData.address;
  } else {
    location = rawData.city || '';
  }

  const hotelImages = extractImages(rawData);

  // CURRENCY: prefer selected_currency from URL (actor may override to USD internally)
  let currency = '';
  try {
    const urlCurrency = new URL(sourceUrl).searchParams.get('selected_currency');
    if (urlCurrency) currency = urlCurrency;
  } catch {}
  if (!currency) {
    const rawCurrency = rawData.currency || '';
    currency = normalizeCurrency(rawCurrency) || inferCurrencyFromUrl(sourceUrl);
  }

  // DATES: use checkInDate/checkOutDate (proper YYYY-MM-DD), NOT checkIn/checkOut (policy text)
  const checkIn = rawData.checkInDate || '';
  const checkOut = rawData.checkOutDate || '';

  const rooms = rawData.rooms || [];
  if (rooms.length > 0) {
    const results = [];
    for (const room of rooms) {
      const options = room.options || [];
      if (options.length === 0) continue;

      // BEDROOMS from bedTypes labels
      let bedrooms = 0;
      let bathrooms = 1;
      if (room.bedTypes) {
        const labeledRooms = room.bedTypes.filter(bt => bt.room && bt.room.toLowerCase().includes('bedroom'));
        if (labeledRooms.length > 0) {
          bedrooms = labeledRooms.length;
          bathrooms = Math.max(1, bedrooms - 1);
        } else {
          const parsed = parseBedroomsFromName(room.roomType || '');
          bedrooms = parsed.bedrooms;
          bathrooms = parsed.bathrooms;
        }
      } else {
        const parsed = parseBedroomsFromName(room.roomType || '');
        bedrooms = parsed.bedrooms;
        bathrooms = parsed.bathrooms;
      }

      // IMAGES: prefer room-specific images, fall back to hotel-level
      const roomImages = getRoomImages(rawData, room.id) || hotelImages;

      const roomTypeName = room.roomType || room.name || 'Room';

      // Create one property per occupancy option
      for (const opt of options) {
        // PRICE: use opt.price (final post-tax total), NOT displayedPrice (pre-tax)
        const roomPrice = roundPrice(opt.price || 0);
        const roomCurrency = normalizeCurrency(opt.currency) || currency;

        results.push({
          name: hotelName,
          location,
          price: roomPrice,
          currency: roomCurrency,
          price_type: 'Total Stay',
          bedrooms,
          bathrooms,
          room_type: roomTypeName,
          images: roomImages,
          checkIn,
          checkOut,
          homeImageIndex: 0,
          selected: false,
          category: '',
          recommended: false,
          sourceUrl,
        });
      }
    }
    return results;
  }

  // Single property (vacation rental)
  return [{
    name: hotelName,
    location,
    price: roundPrice(rawData.price || 0),
    currency,
    price_type: 'Total Stay',
    bedrooms: rawData.bedrooms || 0,
    bathrooms: rawData.bathrooms || 0,
    room_type: '',
    images: hotelImages,
    checkIn,
    checkOut,
    homeImageIndex: 0,
    selected: false,
    category: '',
    recommended: false,
    sourceUrl,
  }];
}

// ============================================================
// AIRBNB NORMALIZER
// ============================================================

function normalizeAirbnb(rawData, sourceUrl) {
  const images = extractImages(rawData);
  const location = rawData.location || rawData.city || '';

  // PRICE: get total stay price
  let price = 0;
  let priceCurrency = '';
  if (rawData.price && typeof rawData.price === 'object') {
    const bd = rawData.price.breakDown || {};
    // Use total price for the stay (already discounted if discount exists)
    const totalStr = bd.total?.price || bd.basePrice?.price || rawData.price.price || '0';
    price = parseNumericPrice(totalStr);

    // Currency from URL params
    try {
      const urlCurrency = new URL(rawData.url || sourceUrl).searchParams.get('currency');
      if (urlCurrency) priceCurrency = urlCurrency;
    } catch {}
  } else if (typeof rawData.price === 'number') {
    price = rawData.price;
  }

  const currency = priceCurrency || normalizeCurrency(rawData.currency) || inferCurrencyFromUrl(sourceUrl);

  // BEDROOMS/BATHROOMS from subDescription.items: ["6 guests", "3 bedrooms", "4 beds", "2 baths"]
  let bedrooms = 0;
  let bathrooms = 0;
  if (rawData.subDescription?.items) {
    for (const item of rawData.subDescription.items) {
      const bedroomMatch = item.match(/(\d+)\s*bedroom/i);
      if (bedroomMatch) bedrooms = parseInt(bedroomMatch[1], 10);
      const bathMatch = item.match(/(\d+)\s*bath/i);
      if (bathMatch) bathrooms = parseInt(bathMatch[1], 10);
    }
  }
  if (!bedrooms) bedrooms = rawData.bedrooms || 0;
  if (!bathrooms) bathrooms = rawData.bathrooms || 0;

  return [{
    name: rawData.title || rawData.name || '',
    location,
    price: roundPrice(price),
    currency,
    price_type: 'Total Stay',
    bedrooms,
    bathrooms,
    room_type: '',
    images,
    checkIn: rawData.checkIn || '',
    checkOut: rawData.checkOut || '',
    homeImageIndex: 0,
    selected: false,
    category: '',
    recommended: false,
    sourceUrl,
  }];
}

// ============================================================
// GENERIC NORMALIZER
// ============================================================

function normalizeGeneric(rawData, sourceUrl) {
  const images = extractImages(rawData);

  let location = rawData.address || rawData.location || rawData.city || '';
  if (typeof location === 'object' && location !== null) {
    location = location.city || location.full || '';
  }

  return [{
    name: rawData.name || rawData.title || rawData.hotelName || '',
    location: String(location),
    price: roundPrice(rawData.price || rawData.rate || 0),
    currency: normalizeCurrency(rawData.currency) || inferCurrencyFromUrl(sourceUrl),
    price_type: 'Total Stay',
    bedrooms: rawData.bedrooms || 0,
    bathrooms: rawData.bathrooms || 0,
    room_type: '',
    images,
    checkIn: rawData.checkIn || rawData.checkin || '',
    checkOut: rawData.checkOut || rawData.checkout || '',
    homeImageIndex: 0,
    selected: false,
    category: '',
    recommended: false,
    sourceUrl,
  }];
}

// ============================================================
// MAIN ENTRY POINT
// ============================================================

function isPreNormalized(data) {
  // Custom actors return data already in the target schema
  return data && typeof data.name === 'string' && typeof data.price === 'number'
    && typeof data.currency === 'string' && 'sourceUrl' in data && 'room_type' in data;
}

export function normalizeToProperties(actorId, rawData, sourceUrl) {
  if (!rawData) return [];

  // Custom actors return an array of pre-normalized items (one per room type)
  if (Array.isArray(rawData) && rawData.length > 0 && isPreNormalized(rawData[0])) {
    return rawData;
  }

  // Single pre-normalized item
  if (isPreNormalized(rawData)) {
    return [rawData];
  }

  switch (actorId) {
    case 'voyager~booking-scraper':
      return normalizeBooking(rawData, sourceUrl);

    case 'tri_angle~airbnb-rooms-urls-scraper':
      return normalizeAirbnb(rawData, sourceUrl);

    case 'getdataforme~expedia-scraper':
    case 'jeremy_frost~hotels-com-scraper':
    case 'easyapi~vrbo-property-listing-scraper':
    case 'knagymate~fast-agoda-scraper':
    case 'hotels-scrapers~trip-hotel-scraper':
      return normalizeBooking(rawData, sourceUrl);

    default:
      return normalizeGeneric(rawData, sourceUrl);
  }
}
