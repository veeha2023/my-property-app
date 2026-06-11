// Content script: floating "Scrape Property" button on booking sites

(function () {
  if (document.getElementById('property-scraper-host')) return;

  const host = document.createElement('div');
  host.id = 'property-scraper-host';
  const shadow = host.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = `
    :host {
      all: initial;
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    .scrape-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      background: #0F172A;
      color: #22C55E;
      border: 1px solid #334155;
      border-radius: 12px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
      transition: all 200ms ease;
      user-select: none;
    }

    .scrape-btn:hover {
      background: #1E293B;
      border-color: #22C55E;
      box-shadow: 0 4px 24px rgba(34, 197, 94, 0.2);
    }

    .scrape-btn:active {
      transform: scale(0.97);
    }

    .scrape-btn.loading {
      color: #94A3B8;
      cursor: wait;
      pointer-events: none;
    }

    .scrape-btn.success {
      color: #22C55E;
      border-color: #22C55E;
      background: #052e16;
    }

    .scrape-btn.error {
      color: #EF4444;
      border-color: #EF4444;
      background: #450a0a;
    }

    .icon {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }

    .spinner {
      width: 18px;
      height: 18px;
      border: 2px solid #334155;
      border-top: 2px solid #22C55E;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;

  function createSvgIcon(paths, extraAttrs) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', extraAttrs?.strokeWidth || '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    paths.forEach(d => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      svg.appendChild(path);
    });
    return svg;
  }

  function createHouseIcon() {
    return createSvgIcon([
      'M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8',
      'M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
    ]);
  }

  function createCheckIcon() {
    return createSvgIcon(['M20 6 9 17l-5-5'], { strokeWidth: '2.5' });
  }

  function createXIcon() {
    return createSvgIcon(['M18 6 6 18', 'm6 6 12 12'], { strokeWidth: '2.5' });
  }

  function setButtonState(btn, state, text) {
    btn.className = 'scrape-btn' + (state ? ' ' + state : '');
    while (btn.firstChild) btn.removeChild(btn.firstChild);

    if (state === 'loading') {
      const spinner = document.createElement('div');
      spinner.className = 'spinner';
      btn.appendChild(spinner);
    } else if (state === 'success') {
      btn.appendChild(createCheckIcon());
    } else if (state === 'error') {
      btn.appendChild(createXIcon());
    } else {
      btn.appendChild(createHouseIcon());
    }

    const span = document.createElement('span');
    span.textContent = text;
    btn.appendChild(span);
  }

  const btn = document.createElement('button');
  btn.className = 'scrape-btn';
  setButtonState(btn, '', 'Scrape Property');

  btn.addEventListener('click', async () => {
    if (btn.classList.contains('loading')) return;

    setButtonState(btn, 'loading', 'Scraping...');

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SCRAPE_PAGE',
        url: window.location.href,
      });

      if (response?.success) {
        const countText = response.count > 1 ? `${response.count} rooms` : '1 property';
        setButtonState(btn, 'success', `${countText} scraped`);
      } else {
        throw new Error(response?.error || 'Scraping failed');
      }
    } catch (err) {
      setButtonState(btn, 'error', 'Error');
      console.error('[Property Scraper]', err.message);
    }

    setTimeout(() => setButtonState(btn, '', 'Scrape Property'), 3000);
  });

  shadow.appendChild(style);
  shadow.appendChild(btn);
  document.body.appendChild(host);
})();
