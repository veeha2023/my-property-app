// Apify API client for Property Scraper Extension

// Custom actors (owned by us — lightweight, returns only 15 fields)
const CUSTOM_ACTOR_MAP = {
  'booking.com': 'veeha_travel~property-booking-scraper',
};

const ACTOR_MAP = {
  'booking.com': 'voyager~booking-scraper',  // fallback — replaced by custom actor above
  'airbnb.com': 'tri_angle~airbnb-rooms-urls-scraper',
  'airbnb.co.nz': 'tri_angle~airbnb-rooms-urls-scraper',
  'expedia.com': 'getdataforme~expedia-scraper',
  'hotels.com': 'jeremy_frost~hotels-com-scraper',
  'vrbo.com': 'easyapi~vrbo-property-listing-scraper',
  'agoda.com': 'knagymate~fast-agoda-scraper',
  'trip.com': 'hotels-scrapers~trip-hotel-scraper',
};

const UNIVERSAL_ACTOR = 'stanvanrooy6~universal-ai-web-scraper';

const SUPPORTED_DOMAINS = Object.keys(ACTOR_MAP);

export function getActorForUrl(url) {
  const hostname = new URL(url).hostname.replace(/^www\./, '');
  // Prefer custom actor if available
  if (CUSTOM_ACTOR_MAP[hostname]) return CUSTOM_ACTOR_MAP[hostname];
  return ACTOR_MAP[hostname] || UNIVERSAL_ACTOR;
}

export function isCustomActor(actorId) {
  return Object.values(CUSTOM_ACTOR_MAP).includes(actorId);
}

export function isSupportedDomain(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return SUPPORTED_DOMAINS.includes(hostname) || true; // all domains supported via universal
  } catch {
    return false;
  }
}

export function isBookingSite(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return SUPPORTED_DOMAINS.includes(hostname) ||
      hostname.includes('booking') ||
      hostname.includes('airbnb') ||
      hostname.includes('expedia') ||
      hostname.includes('hotel') ||
      hostname.includes('vrbo') ||
      hostname.includes('agoda') ||
      hostname.includes('trip.com') ||
      hostname.includes('bookabach') ||
      hostname.includes('ratehawk');
  } catch {
    return false;
  }
}

function buildActorInput(actorId, url) {
  // Custom actors use a simpler input format (url + currency)
  if (isCustomActor(actorId)) {
    return { url, currency: 'NZD' };
  }

  // Third-party actors accept startUrls as object array
  switch (actorId) {
    case 'voyager~booking-scraper': {
      // Force NZD currency by adding selected_currency param
      const bookingUrl = new URL(url);
      bookingUrl.searchParams.set('selected_currency', 'NZD');
      return {
        startUrls: [{ url: bookingUrl.toString() }],
        maxItems: 1,
        currency: 'NZD',
      };
    }

    case 'tri_angle~airbnb-rooms-urls-scraper': {
      // Force currency to NZD by modifying the URL
      const airbnbUrl = new URL(url);
      airbnbUrl.searchParams.set('currency', 'NZD');
      return {
        startUrls: [{ url: airbnbUrl.toString() }],
        maxItems: 1,
        currency: 'NZD',
      };
    }

    case 'getdataforme~expedia-scraper':
      return {
        startUrls: [{ url }],
        maxItems: 1,
      };

    case 'jeremy_frost~hotels-com-scraper':
      return {
        startUrls: [{ url }],
        maxItems: 1,
      };

    case 'easyapi~vrbo-property-listing-scraper':
      return {
        startUrls: [{ url }],
        maxItems: 1,
      };

    case 'knagymate~fast-agoda-scraper':
      return {
        startUrls: [{ url }],
        maxItems: 1,
      };

    case 'hotels-scrapers~trip-hotel-scraper':
      return {
        startUrls: [{ url }],
        maxItems: 1,
      };

    case UNIVERSAL_ACTOR:
      return {
        startUrls: [{ url }],
        instructions: 'Extract the property/accommodation name, location/address, price per night, currency, number of bedrooms, number of bathrooms, description, and all image URLs from this property listing page.',
        maxItems: 1,
      };

    default:
      return { startUrls: [{ url }], maxItems: 1 };
  }
}

export async function scrapeProperty(url, apiToken) {
  const actorId = getActorForUrl(url);
  const input = buildActorInput(actorId, url);

  console.log('[Property Scraper] Actor:', actorId);
  console.log('[Property Scraper] Input:', JSON.stringify(input));
  console.log('[Property Scraper] URL:', `https://api.apify.com/v2/acts/${actorId}/runs?waitForFinish=300`);

  // Start actor run and wait for completion (up to 300s max)
  // Retry loop for 402 memory-limit errors (wait for other runs to finish)
  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [30000, 60000, 90000]; // 30s, 60s, 90s
  let runResponse;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    runResponse = await fetch(
      `https://api.apify.com/v2/acts/${actorId}/runs?waitForFinish=300`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`,
        },
        body: JSON.stringify(input),
      }
    );

    if (runResponse.status === 402 && attempt < MAX_RETRIES) {
      const errorText = await runResponse.text();
      console.warn(`[Property Scraper] Memory limit hit (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in ${RETRY_DELAYS[attempt] / 1000}s...`, errorText);
      await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
      continue;
    }
    break;
  }

  if (!runResponse.ok) {
    const errorText = await runResponse.text();
    console.error('[Property Scraper] API error:', runResponse.status, errorText);
    if (runResponse.status === 402) {
      throw new Error('Apify memory limit exceeded. Stop existing runs at https://console.apify.com or upgrade your plan.');
    }
    throw new Error(`Apify API error (${runResponse.status}): ${errorText}`);
  }

  let run = await runResponse.json();
  const runId = run.data?.id;

  console.log('[Property Scraper] Run ID:', runId);
  console.log('[Property Scraper] Run status:', run.data?.status);
  console.log('[Property Scraper] Run statusMessage:', run.data?.statusMessage);

  // If still running after initial wait, poll until complete
  if (run.data?.status === 'RUNNING' || run.data?.status === 'READY') {
    console.log('[Property Scraper] Still running, polling...');
    const MAX_POLLS = 10;
    for (let i = 0; i < MAX_POLLS; i++) {
      const pollResponse = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?waitForFinish=60`,
        { headers: { 'Authorization': `Bearer ${apiToken}` } }
      );
      run = await pollResponse.json();
      console.log(`[Property Scraper] Poll ${i + 1}: status=${run.data?.status}`);
      if (run.data?.status === 'SUCCEEDED' || run.data?.status === 'FAILED' ||
          run.data?.status === 'ABORTED' || run.data?.status === 'TIMED-OUT') {
        break;
      }
    }
  }

  if (run.data?.status !== 'SUCCEEDED') {
    const statusMsg = run.data?.statusMessage || '';
    const runUrl = `https://console.apify.com/actors/runs/${runId}`;
    console.error('[Property Scraper] Run FAILED:', JSON.stringify(run.data, null, 2));

    // Try to fetch the run log for more details
    let logSnippet = '';
    try {
      const logResponse = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}/log`,
        { headers: { 'Authorization': `Bearer ${apiToken}` } }
      );
      if (logResponse.ok) {
        const logText = await logResponse.text();
        // Get last 500 chars of log (most relevant)
        logSnippet = logText.slice(-500);
        console.error('[Property Scraper] Run log (last 500 chars):', logSnippet);
      }
    } catch (logErr) {
      console.error('[Property Scraper] Could not fetch log:', logErr.message);
    }

    throw new Error(
      statusMsg
        ? `Actor failed: ${statusMsg}`
        : `Actor run failed (${run.data?.status}). Check logs: ${runUrl}`
    );
  }

  console.log('[Property Scraper] Run SUCCEEDED, fetching dataset...');

  // Fetch results from the run's dataset
  const datasetId = run.data.defaultDatasetId;
  const resultsResponse = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?format=json`,
    {
      headers: { 'Authorization': `Bearer ${apiToken}` },
    }
  );

  if (!resultsResponse.ok) {
    throw new Error(`Failed to fetch results: ${resultsResponse.status}`);
  }

  const items = await resultsResponse.json();
  console.log('[Property Scraper] Got', items.length, 'items from dataset');
  if (items.length > 0) {
    console.log('[Property Scraper] First item keys:', Object.keys(items[0]).join(', '));
    // Log key fields to debug normalizer mapping
    const d = items[0];
    console.log('[Property Scraper] Raw data sample:', JSON.stringify({
      name: d.name, title: d.title, hotelName: d.hotelName,
      address: d.address, location: d.location, city: d.city,
      price: d.price, currency: d.currency, priceCurrency: d.priceCurrency,
      checkIn: d.checkIn, checkin: d.checkin, checkOut: d.checkOut, checkout: d.checkout,
      description: typeof d.description === 'string' ? d.description?.slice(0, 100) : d.description,
      rooms: d.rooms ? `[${d.rooms.length} rooms]` : undefined,
      images: d.images ? `[${d.images.length} images]` : undefined,
      photos: d.photos ? `[${d.photos.length} photos]` : undefined,
    }, null, 2));
  }

  // Custom actors return multiple items (one per room type) — return all
  if (isCustomActor(actorId)) {
    return { actorId, rawData: items };
  }
  return { actorId, rawData: items[0] || null };
}

export async function scrapeMultiple(urls, apiToken, onProgress) {
  const CONCURRENCY = 1; // Sequential to avoid Apify free-tier memory limits
  const results = [];
  let completed = 0;

  const chunks = [];
  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    chunks.push(urls.slice(i, i + CONCURRENCY));
  }

  for (const chunk of chunks) {
    const chunkResults = await Promise.allSettled(
      chunk.map(async (url) => {
        try {
          const result = await scrapeProperty(url, apiToken);
          completed++;
          if (onProgress) onProgress(completed, urls.length, url, 'success');
          return { url, ...result };
        } catch (error) {
          completed++;
          if (onProgress) onProgress(completed, urls.length, url, 'error');
          throw error;
        }
      })
    );

    for (const result of chunkResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({ url: null, actorId: null, rawData: null, error: result.reason.message });
      }
    }
  }

  return results;
}
