// Popup controller for Property Scraper Extension

import { generateCSV, downloadCSV } from '../lib/csv.js';

const CURRENCIES = [
  'AUD','BRL','CAD','CHF','CNY','CZK','DKK','EUR','GBP','HKD',
  'HUF','IDR','ILS','INR','JPY','KRW','MXN','MYR','NOK','NZD',
  'PHP','PLN','RUB','SEK','SGD','THB','TRY','USD','VND','ZAR'
];

// DOM Elements
const mainView = document.getElementById('mainView');
const editView = document.getElementById('editView');
const propertyList = document.getElementById('propertyList');
const propertyCount = document.getElementById('propertyCount');
const urlInput = document.getElementById('urlInput');
const addToQueueBtn = document.getElementById('addToQueueBtn');
const queueSection = document.getElementById('queueSection');
const queueList = document.getElementById('queueList');
const queueCount = document.getElementById('queueCount');
const clearQueueBtn = document.getElementById('clearQueueBtn');
const exportBtn = document.getElementById('exportBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const settingsBtn = document.getElementById('settingsBtn');
const backBtn = document.getElementById('backBtn');
const saveEditBtn = document.getElementById('saveEditBtn');
const confirmOverlay = document.getElementById('confirmOverlay');
const confirmCancel = document.getElementById('confirmCancel');
const confirmOk = document.getElementById('confirmOk');
const toast = document.getElementById('toast');

let currentEditId = null;
let queue = []; // { id, url, status: 'pending'|'scraping'|'done'|'error', error? }
let isProcessing = false;

// Initialize currency dropdown
const currencySelect = document.getElementById('editCurrency');
CURRENCIES.forEach(code => {
  const opt = document.createElement('option');
  opt.value = code;
  opt.textContent = code;
  currencySelect.appendChild(opt);
});

// Load properties on open
if (chrome.runtime?.id) {
  loadProperties();
}

// Listen for progress updates from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SCRAPE_PROGRESS') {
    // Update individual queue item status based on URL
    if (message.url) {
      const item = queue.find(q => q.url === message.url);
      if (item) {
        item.status = message.status === 'success' ? 'done' : message.status === 'error' ? 'error' : 'scraping';
        if (message.status === 'error') item.error = message.error;
        renderQueue();
      }
    }
    if (message.status === 'success') {
      loadProperties();
    }
  }
});

// --- Event Handlers ---

// Add URLs to queue
addToQueueBtn?.addEventListener('click', () => {
  addUrlsFromInput();
});

// Also support Ctrl+Enter / Cmd+Enter to add
urlInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    addUrlsFromInput();
  }
});

function addUrlsFromInput() {
  const urls = urlInput.value
    .split('\n')
    .map(u => u.trim())
    .filter(u => u.startsWith('http'));

  if (urls.length === 0) {
    showToast('Paste at least one valid URL', 'error');
    return;
  }

  // Add to queue
  urls.forEach(url => {
    // Skip duplicates already in queue
    if (queue.some(q => q.url === url && q.status !== 'error')) return;
    queue.push({
      id: Date.now() + Math.random(),
      url,
      status: 'pending',
    });
  });

  // Clear input immediately
  urlInput.value = '';
  urlInput.focus();

  renderQueue();

  // Start processing if not already
  if (!isProcessing) {
    processQueue();
  }
}

// Clear completed/errored items from queue
clearQueueBtn?.addEventListener('click', () => {
  queue = queue.filter(q => q.status === 'pending' || q.status === 'scraping');
  renderQueue();
});

exportBtn?.addEventListener('click', async () => {
  if (!chrome.runtime?.id) return;
  const response = await chrome.runtime.sendMessage({ type: 'GET_PROPERTIES' });
  const properties = response || [];

  if (properties.length === 0) {
    showToast('No properties to export', 'error');
    return;
  }

  const csv = generateCSV(properties);
  downloadCSV(csv);
  showToast(`Exported ${properties.length} properties`, 'success');
});

clearAllBtn?.addEventListener('click', () => {
  showConfirm('Clear all scraped properties?', async () => {
    if (!chrome.runtime?.id) return;
    await chrome.runtime.sendMessage({ type: 'CLEAR_ALL' });
    loadProperties();
    showToast('All properties cleared', 'success');
  });
});

settingsBtn?.addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('settings/settings.html') });
});

backBtn?.addEventListener('click', () => {
  editView.classList.remove('active');
  mainView.classList.remove('hidden');
  currentEditId = null;
});

saveEditBtn?.addEventListener('click', async () => {
  if (!currentEditId) return;

  const imagesText = document.getElementById('editImages').value;
  const images = imagesText.split('\n').map(s => s.trim()).filter(Boolean);

  const priceTypeRadio = document.querySelector('input[name="priceType"]:checked');

  const data = {
    name: document.getElementById('editName').value,
    location: document.getElementById('editLocation').value,
    checkIn: document.getElementById('editCheckIn').value,
    checkOut: document.getElementById('editCheckOut').value,
    price: parseFloat(document.getElementById('editPrice').value) || 0,
    currency: document.getElementById('editCurrency').value,
    price_type: priceTypeRadio ? priceTypeRadio.value : 'Per Night',
    bedrooms: parseInt(document.getElementById('editBedrooms').value, 10) || 0,
    bathrooms: parseInt(document.getElementById('editBathrooms').value, 10) || 0,
    category: document.getElementById('editCategory').value,
    description: document.getElementById('editDescription').value,
    images,
  };

  if (!chrome.runtime?.id) return;
  await chrome.runtime.sendMessage({ type: 'UPDATE_PROPERTY', id: currentEditId, data });
  showToast('Property updated', 'success');

  editView.classList.remove('active');
  mainView.classList.remove('hidden');
  currentEditId = null;
  loadProperties();
});

confirmCancel?.addEventListener('click', () => {
  confirmOverlay.classList.remove('active');
});

// --- Queue Processing ---

async function processQueue() {
  const pending = queue.filter(q => q.status === 'pending');
  if (pending.length === 0) {
    isProcessing = false;
    return;
  }

  isProcessing = true;

  // Mark all pending as scraping
  pending.forEach(q => { q.status = 'scraping'; });
  renderQueue();

  const urls = pending.map(q => q.url);

  if (!chrome.runtime?.id) { isProcessing = false; return; }

  if (urls.length === 1) {
    // Single URL
    try {
      const response = await chrome.runtime.sendMessage({ type: 'SCRAPE_PAGE', url: urls[0] });
      if (response?.success) {
        pending[0].status = 'done';
        loadProperties();
      } else {
        pending[0].status = 'error';
        pending[0].error = response?.error;
      }
    } catch (err) {
      pending[0].status = 'error';
      pending[0].error = err.message;
    }
    renderQueue();
    isProcessing = false;
    // Check for more
    processQueue();
  } else {
    // Batch
    chrome.runtime.sendMessage(
      { type: 'SCRAPE_TABS', urls },
      (response) => {
        if (response?.success) {
          const failedUrls = new Set((response.errorDetails || []).map(e => e.url));
          pending.forEach(q => {
            q.status = failedUrls.has(q.url) ? 'error' : 'done';
            if (failedUrls.has(q.url)) {
              const err = response.errorDetails.find(e => e.url === q.url);
              q.error = err?.error;
            }
          });
          loadProperties();
        } else {
          pending.forEach(q => {
            q.status = 'error';
            q.error = response?.error || 'Batch scraping failed';
          });
        }
        renderQueue();
        isProcessing = false;
        processQueue();
      }
    );
  }
}

// --- Render Functions ---

function renderQueue() {
  const activeItems = queue.length;
  queueCount.textContent = activeItems;
  queueSection.style.display = activeItems > 0 ? '' : 'none';

  while (queueList.firstChild) queueList.removeChild(queueList.firstChild);

  queue.forEach(item => {
    const row = document.createElement('div');
    row.className = 'queue-item';

    // Status dot
    const dot = document.createElement('div');
    dot.className = `queue-dot ${item.status}`;
    row.appendChild(dot);

    // URL
    const urlEl = document.createElement('div');
    urlEl.className = 'queue-url';
    urlEl.textContent = item.url.replace(/^https?:\/\/(www\.)?/, '');
    urlEl.title = item.url;
    row.appendChild(urlEl);

    // Status label
    const statusEl = document.createElement('div');
    statusEl.className = `queue-status ${item.status}`;
    statusEl.textContent = item.status === 'scraping' ? 'scraping...' : item.status;
    if (item.status === 'error' && item.error) {
      statusEl.title = item.error;
    }
    row.appendChild(statusEl);

    // Remove button (using DOM methods, no innerHTML)
    const removeBtn = document.createElement('button');
    removeBtn.className = 'queue-item-remove';
    removeBtn.title = 'Remove';
    const removeSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    removeSvg.setAttribute('viewBox', '0 0 24 24');
    removeSvg.setAttribute('fill', 'none');
    removeSvg.setAttribute('stroke', 'currentColor');
    removeSvg.setAttribute('stroke-width', '2');
    removeSvg.setAttribute('stroke-linecap', 'round');
    removeSvg.setAttribute('stroke-linejoin', 'round');
    const xPath1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    xPath1.setAttribute('d', 'M18 6 6 18');
    const xPath2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    xPath2.setAttribute('d', 'm6 6 12 12');
    removeSvg.appendChild(xPath1);
    removeSvg.appendChild(xPath2);
    removeBtn.appendChild(removeSvg);
    removeBtn.addEventListener('click', () => {
      queue = queue.filter(q => q.id !== item.id);
      renderQueue();
    });
    row.appendChild(removeBtn);

    queueList.appendChild(row);
  });
}

async function loadProperties() {
  if (!chrome.runtime?.id) return;
  const properties = await chrome.runtime.sendMessage({ type: 'GET_PROPERTIES' }) || [];
  if (propertyCount) propertyCount.textContent = properties.length;
  renderPropertyList(properties);
}

function renderPropertyList(properties) {
  while (propertyList.firstChild) propertyList.removeChild(propertyList.firstChild);

  if (properties.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.5');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    const p1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p1.setAttribute('d', 'M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8');
    const p2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p2.setAttribute('d', 'M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z');
    svg.appendChild(p1);
    svg.appendChild(p2);
    empty.appendChild(svg);

    const text = document.createElement('p');
    text.textContent = 'No properties scraped yet.\nPaste URLs above and add them to the queue.';
    empty.appendChild(text);

    propertyList.appendChild(empty);
    return;
  }

  properties.forEach(prop => {
    const card = document.createElement('div');
    card.className = 'property-card';

    // Thumbnail
    if (prop.images && prop.images.length > 0) {
      const img = document.createElement('img');
      img.className = 'property-thumb';
      img.src = prop.images[0];
      img.alt = prop.name || 'Property';
      img.onerror = () => {
        const placeholder = createThumbPlaceholder();
        img.replaceWith(placeholder);
      };
      card.appendChild(img);
    } else {
      card.appendChild(createThumbPlaceholder());
    }

    // Info
    const info = document.createElement('div');
    info.className = 'property-info';

    const nameEl = document.createElement('div');
    nameEl.className = 'property-name';
    nameEl.textContent = prop.name || 'Untitled';
    nameEl.title = prop.name || '';
    info.appendChild(nameEl);

    const locationEl = document.createElement('div');
    locationEl.className = 'property-location';
    locationEl.textContent = prop.location || 'No location';
    info.appendChild(locationEl);

    const priceEl = document.createElement('div');
    priceEl.className = 'property-price';
    const priceNum = typeof prop.price === 'number' ? prop.price : parseFloat(prop.price) || 0;
    priceEl.textContent = `${prop.currency || 'NZD'} $${priceNum.toLocaleString()}/${prop.price_type === 'Total Stay' ? 'total' : 'night'}`;
    info.appendChild(priceEl);

    card.appendChild(info);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'property-actions';

    const editBtn = createIconButton('edit', [
      'M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z',
      'm15 5 4 4',
    ]);
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditView(prop);
    });
    actions.appendChild(editBtn);

    const deleteBtn = createIconButton('delete', [
      'M3 6h18',
      'M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6',
      'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2',
    ]);
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteProperty(prop.id);
    });
    actions.appendChild(deleteBtn);

    card.appendChild(actions);
    propertyList.appendChild(card);
  });
}

function createThumbPlaceholder() {
  const placeholder = document.createElement('div');
  placeholder.className = 'property-thumb-placeholder';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.5');
  const p1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p1.setAttribute('d', 'M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8');
  const p2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p2.setAttribute('d', 'M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z');
  svg.appendChild(p1);
  svg.appendChild(p2);
  placeholder.appendChild(svg);
  return placeholder;
}

function createIconButton(type, paths) {
  const btn = document.createElement('button');
  btn.className = 'icon-btn' + (type === 'delete' ? ' delete' : '');
  btn.title = type === 'delete' ? 'Delete' : 'Edit';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  paths.forEach(d => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  });
  btn.appendChild(svg);
  return btn;
}

function openEditView(prop) {
  currentEditId = prop.id;
  mainView.classList.add('hidden');
  editView.classList.add('active');

  document.getElementById('editName').value = prop.name || '';
  document.getElementById('editLocation').value = prop.location || '';
  document.getElementById('editCheckIn').value = prop.checkIn || '';
  document.getElementById('editCheckOut').value = prop.checkOut || '';
  document.getElementById('editPrice').value = prop.price || 0;
  document.getElementById('editCurrency').value = prop.currency || 'NZD';
  document.getElementById('editBedrooms').value = prop.bedrooms || 0;
  document.getElementById('editBathrooms').value = prop.bathrooms || 0;
  document.getElementById('editCategory').value = prop.category || 'Luxury';
  document.getElementById('editDescription').value = prop.description || '';
  document.getElementById('editImages').value = Array.isArray(prop.images)
    ? prop.images.join('\n')
    : (prop.images || '');

  const priceType = prop.price_type || 'Per Night';
  document.querySelectorAll('input[name="priceType"]').forEach(radio => {
    radio.checked = radio.value === priceType;
  });
}

async function deleteProperty(id) {
  if (!chrome.runtime?.id) return;
  await chrome.runtime.sendMessage({ type: 'DELETE_PROPERTY', id });
  showToast('Property deleted', 'success');
  loadProperties();
}

function showToast(message, type) {
  toast.textContent = message;
  toast.className = 'toast ' + type;
  setTimeout(() => {
    toast.className = 'toast';
  }, 3000);
}

function showConfirm(message, onConfirm) {
  document.getElementById('confirmMessage').textContent = message;
  confirmOverlay.classList.add('active');

  const handler = () => {
    confirmOverlay.classList.remove('active');
    confirmOk.removeEventListener('click', handler);
    onConfirm();
  };
  confirmOk.addEventListener('click', handler);
}
