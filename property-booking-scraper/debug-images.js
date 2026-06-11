import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Block fonts/media like the scraper does
await page.route('**/*', (route) => {
    const type = route.request().resourceType();
    if (['font', 'media'].includes(type)) return route.abort();
    return route.continue();
});

await page.goto('https://www.booking.com/hotel/nz/aroha-motel.en-gb.html?checkin=2026-04-30&checkout=2026-05-01&selected_currency=NZD', {
    waitUntil: 'domcontentloaded',
});

await page.waitForSelector('[data-testid="rt-name-link"]', { timeout: 20000 }).catch(() => console.log('TIMED OUT'));
await page.waitForTimeout(3000);

// Count room links
const count = await page.locator('[data-testid="rt-name-link"]').count();
console.log(`Found ${count} room links`);

if (count > 0) {
    // Click the first one
    const link = page.locator('[data-testid="rt-name-link"]').first();
    const text = await link.textContent();
    console.log(`Clicking: "${text.trim()}"`);

    await link.click({ force: true });
    await page.waitForTimeout(3000);

    // Check what appeared
    const result = await page.evaluate(() => {
        // Count images with "Photo of" alt text
        const photoImgs = document.querySelectorAll('img[alt^="Photo of"]');
        const photoSrcs = Array.from(photoImgs).map(img => ({
            alt: img.getAttribute('alt'),
            src: (img.getAttribute('src') || '').substring(0, 100),
        }));

        // Check URL hash
        const hash = window.location.hash;

        // Any new overlays/modals
        const overlays = document.querySelectorAll('[role="dialog"], [class*="lightbox"]:not(.g-hidden)');

        return {
            hash,
            photoImgCount: photoImgs.length,
            photos: photoSrcs.slice(0, 5),
            overlayCount: overlays.length,
        };
    });

    console.log('Hash:', result.hash);
    console.log(`Photo images: ${result.photoImgCount}`);
    console.log(`Overlays: ${result.overlayCount}`);
    for (const p of result.photos) {
        console.log(`  alt="${p.alt}" src=${p.src}`);
    }
}

await browser.close();
