// Background service worker for Property Scraper Extension

import { scrapeProperty, scrapeMultiple } from './apify.js';
import { normalizeToProperties } from './normalizer.js';

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'SCRAPE_PAGE':
      handleScrapePage(message.url).then(sendResponse).catch(err =>
        sendResponse({ success: false, error: err.message })
      );
      return true;

    case 'SCRAPE_TABS':
      handleScrapeTabs(message.urls).then(sendResponse).catch(err =>
        sendResponse({ success: false, error: err.message })
      );
      return true;

    case 'GET_PROPERTIES':
      getStoredProperties().then(sendResponse);
      return true;

    case 'DELETE_PROPERTY':
      deleteProperty(message.id).then(sendResponse);
      return true;

    case 'UPDATE_PROPERTY':
      updateProperty(message.id, message.data).then(sendResponse);
      return true;

    case 'CLEAR_ALL':
      clearAllProperties().then(sendResponse);
      return true;

    case 'GET_API_TOKEN':
      getApiToken().then(sendResponse);
      return true;

    case 'SCRAPE_PROGRESS':
      // Progress updates handled via chrome.runtime.sendMessage from scrapeMultiple
      return false;
  }
});

async function getApiToken() {
  const result = await chrome.storage.local.get('apifyApiToken');
  return result.apifyApiToken || null;
}

async function handleScrapePage(url) {
  const apiToken = await getApiToken();
  if (!apiToken) {
    throw new Error('Apify API token not set. Go to extension settings to add it.');
  }

  const { actorId, rawData } = await scrapeProperty(url, apiToken);

  if (!rawData || (Array.isArray(rawData) && rawData.length === 0)) {
    throw new Error('No data returned from scraper. The page may not be a property listing.');
  }

  const properties = normalizeToProperties(actorId, rawData, url);

  if (properties.length === 0) {
    throw new Error('Could not extract property data from this page.');
  }

  // Add unique IDs and timestamps
  const timestamped = properties.map(prop => ({
    ...prop,
    id: `prop-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    scrapedAt: new Date().toISOString(),
  }));

  // Append to stored properties
  const existing = await getStoredProperties();
  const updated = [...existing, ...timestamped];
  await chrome.storage.local.set({ properties: updated });

  // Update badge
  updateBadge(updated.length);

  return { success: true, count: timestamped.length, total: updated.length };
}

async function handleScrapeTabs(urls) {
  const apiToken = await getApiToken();
  if (!apiToken) {
    throw new Error('Apify API token not set. Go to extension settings to add it.');
  }

  if (!urls || urls.length === 0) {
    throw new Error('No URLs to scrape.');
  }

  // Send initial progress (catch errors if popup is closed)
  chrome.runtime.sendMessage({ type: 'SCRAPE_PROGRESS', completed: 0, total: urls.length }).catch(() => {});

  const results = await scrapeMultiple(urls, apiToken, (completed, total, url, status) => {
    chrome.runtime.sendMessage({ type: 'SCRAPE_PROGRESS', completed, total, url, status }).catch(() => {});
  });

  // Normalize and store successful results
  const allNewProperties = [];
  const errors = [];

  for (const result of results) {
    if (result.error) {
      errors.push({ url: result.url, error: result.error });
      continue;
    }
    if (result.rawData) {
      const properties = normalizeToProperties(result.actorId, result.rawData, result.url);
      const timestamped = properties.map(prop => ({
        ...prop,
        id: `prop-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        scrapedAt: new Date().toISOString(),
      }));
      allNewProperties.push(...timestamped);
    }
  }

  // Append to existing
  const existing = await getStoredProperties();
  const updated = [...existing, ...allNewProperties];
  await chrome.storage.local.set({ properties: updated });
  updateBadge(updated.length);

  return {
    success: true,
    scraped: allNewProperties.length,
    errors: errors.length,
    total: updated.length,
    errorDetails: errors,
  };
}

async function getStoredProperties() {
  const result = await chrome.storage.local.get('properties');
  return result.properties || [];
}

async function deleteProperty(id) {
  const properties = await getStoredProperties();
  const filtered = properties.filter(p => p.id !== id);
  await chrome.storage.local.set({ properties: filtered });
  updateBadge(filtered.length);
  return { success: true, total: filtered.length };
}

async function updateProperty(id, data) {
  const properties = await getStoredProperties();
  const index = properties.findIndex(p => p.id === id);
  if (index >= 0) {
    properties[index] = { ...properties[index], ...data };
    await chrome.storage.local.set({ properties });
    return { success: true };
  }
  return { success: false, error: 'Property not found' };
}

async function clearAllProperties() {
  await chrome.storage.local.set({ properties: [] });
  updateBadge(0);
  return { success: true };
}

function updateBadge(count) {
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#FFD700' });
}

// Open popup as a full tab when extension icon is clicked
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('popup/popup.html') });
});

// Initialize badge on install
chrome.runtime.onInstalled.addListener(async () => {
  const properties = await getStoredProperties();
  updateBadge(properties.length);
});
