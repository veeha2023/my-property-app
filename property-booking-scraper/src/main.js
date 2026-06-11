/**
 * Property Booking Scraper — Custom Apify Actor
 *
 * Scrapes a single Booking.com property page using Playwright and returns
 * one row per unique room type. Each row includes:
 * - room_type (e.g. "One-Bedroom Suite", "Studio")
 * - Room-specific images (filtered from the photo gallery)
 * - Final price including taxes & fees (first option per room type)
 * - Bedrooms/bathrooms parsed from room type name
 *
 * Supports Booking.com login for member/Genius pricing.
 */

import { Actor } from 'apify';
import { PlaywrightCrawler, log } from 'crawlee';

await Actor.init();

const input = await Actor.getInput();
if (!input?.url) {
    throw new Error('Missing required input: url');
}

const { url: rawUrl, currency = 'NZD', bookingEmail, bookingPassword } = input;

// Ensure currency is set in the URL
const propertyUrl = new URL(rawUrl);
propertyUrl.searchParams.set('selected_currency', currency);

// Extract check-in/out dates from URL params
const checkIn = propertyUrl.searchParams.get('checkin') || '';
const checkOut = propertyUrl.searchParams.get('checkout') || '';

const crawler = new PlaywrightCrawler({
    maxRequestsPerCrawl: 1,
    requestHandlerTimeoutSecs: 120,
    headless: true,
    launchContext: {
        launchOptions: {
            args: ['--disable-blink-features=AutomationControlled'],
        },
    },
    preNavigationHooks: [
        async ({ page }) => {
            // Block unnecessary resources to speed up loading
            await page.route('**/*', (route) => {
                const type = route.request().resourceType();
                if (['font', 'media'].includes(type)) {
                    return route.abort();
                }
                return route.continue();
            });
        },
    ],
    requestHandler: async ({ page, request }) => {
        // --- OPTIONAL: Log into Booking.com for member pricing ---
        if (bookingEmail && bookingPassword) {
            log.info('Logging into Booking.com for member pricing...');
            await page.goto('https://account.booking.com/sign-in');
            await page.waitForLoadState('domcontentloaded');

            // Enter email
            const emailInput = page.locator('input[type="email"], input[name="loginname"], #username');
            await emailInput.waitFor({ timeout: 10000 }).catch(() => {});
            if (await emailInput.count() > 0) {
                await emailInput.fill(bookingEmail);
                // Click submit/next
                const submitBtn = page.locator('button[type="submit"], [data-testid="login-button"]');
                await submitBtn.first().click().catch(() => {});
                await page.waitForTimeout(2000);

                // Enter password
                const passInput = page.locator('input[type="password"], input[name="password"]');
                await passInput.waitFor({ timeout: 10000 }).catch(() => {});
                if (await passInput.count() > 0) {
                    await passInput.fill(bookingPassword);
                    const passSubmit = page.locator('button[type="submit"]');
                    await passSubmit.first().click().catch(() => {});
                    await page.waitForTimeout(3000);
                }
            }
            log.info('Login attempt complete, navigating to property...');
        }

        // The crawler framework navigated to the page already.
        // Wait for Booking.com's async micro-frontends to render the room table.
        await page.waitForLoadState('domcontentloaded');
        await page.waitForSelector('[data-testid="rt-name-link"], .hprt-roomtype-link', {
            timeout: 20000,
        }).catch(() => {});

        // Extra wait for price rendering and photo gallery setup
        await page.waitForTimeout(3000);

        // --- EXTRACT ALL ROOM DATA FROM DOM ---
        const results = await page.evaluate((params) => {
            const { currency, checkIn, checkOut, sourceUrl } = params;

            // Helper: get text content of first matching selector
            const text = (...selectors) => {
                for (const sel of selectors) {
                    const el = document.querySelector(sel);
                    if (el?.textContent?.trim()) return el.textContent.trim();
                }
                return '';
            };

            // Helper: parse price string to number
            const parsePrice = (str) => {
                if (!str) return 0;
                const cleaned = String(str).replace(/[^0-9.,]/g, '').replace(/,/g, '');
                return parseFloat(cleaned) || 0;
            };

            // Helper: parse bedrooms from room type name
            const parseBedrooms = (roomName) => {
                const lower = roomName.toLowerCase();
                const digitMatch = lower.match(/(\d+)[\s-]*bed(?:room)/);
                if (digitMatch) return parseInt(digitMatch[1], 10);
                if (lower.includes('three-bedroom') || lower.includes('3-bedroom')) return 3;
                if (lower.includes('two-bedroom') || lower.includes('2-bedroom')) return 2;
                if (lower.includes('one-bedroom') || lower.includes('1-bedroom')) return 1;
                if (lower.includes('studio')) return 0;
                return 0;
            };

            // --- PROPERTY-LEVEL DATA ---
            const propertyName = text(
                '[data-testid="title"]',
                'h2.pp-header__title',
                'h2.d2fee87262.pp-header__title',
                'h2#hp_hotel_name',
                '.hp__hotel-name',
                'h2',
            );

            let location = text(
                '[data-testid="address"]',
                '.hp_address_subtitle',
                '.a53cbfa6de.f17adf7576',
                '#showMap2 .hp_address_subtitle',
            );
            if (location && location.includes(',')) {
                const parts = location.split(',').map(s => s.trim());
                location = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
            }
            if (!location) {
                const titleMatch = document.title.match(/,\s*([^(]+)/);
                if (titleMatch) location = titleMatch[1].trim();
            }

            // --- PROPERTY-LEVEL IMAGES (fallback) ---
            let propertyImages = [];
            const imgSelectors = [
                '.bh-photo-grid img',
                '[data-testid="photo-grid"] img',
                'a.bh-photo-grid-item img',
                '.hp--gallery img',
                '#photo_wrapper img',
                '.hotel-photos img',
            ];
            for (const sel of imgSelectors) {
                const els = document.querySelectorAll(sel);
                if (els.length > 0) {
                    propertyImages = Array.from(els)
                        .map(img => {
                            // Try src, then data-src, then srcset
                            let src = img.getAttribute('src') || img.getAttribute('data-src') || '';
                            if (!src) {
                                const srcset = img.getAttribute('srcset') || '';
                                const first = srcset.split(',')[0]?.trim()?.split(' ')[0];
                                if (first) src = first;
                            }
                            src = src.replace(/\/max\d+\//, '/max1280x900/');
                            src = src.replace(/square\d+/, 'max1280x900');
                            return src;
                        })
                        .filter(src => src && src.startsWith('http'));
                    if (propertyImages.length > 0) break;
                }
            }

            // --- EXTRACT ROOM TYPES FROM AVAILABILITY TABLE ---
            // Booking.com has two table formats:
            //   New: .roomstable with [data-testid="rt-name-link"] links, rows in tbody
            //   Legacy: .hprt-table with .hprt-roomtype-link links

            const roomBlocks = [];

            // Strategy 1: New Booking.com layout — [data-testid="rt-name-link"]
            const rtNameLinks = document.querySelectorAll('[data-testid="rt-name-link"]');
            if (rtNameLinks.length > 0) {
                for (const link of rtNameLinks) {
                    const roomType = link.textContent.trim();
                    // Navigate up to the table row to find the price
                    const row = link.closest('tr');
                    if (!row) continue;

                    // Price: look for price display in the same row
                    let price = 0;
                    const priceEls = row.querySelectorAll('[class*="price"], span');
                    for (const el of priceEls) {
                        const text = el.textContent.trim();
                        // Match currency-prefixed prices like "NZD 168" or "NZ$168"
                        if (/(?:NZ?\$|USD?|EUR|GBP|[A-Z]{3})\s*[\d,.]+|[\d,.]+/.test(text)) {
                            const parsed = parsePrice(text);
                            if (parsed > 10 && parsed < 100000) { price = parsed; break; }
                        }
                    }

                    roomBlocks.push({
                        roomType,
                        roomId: link.id?.replace('room_type_id_', '') || '',
                        options: price > 0 ? [{ price: Math.round(price * 100) / 100 }] : [],
                    });
                }
            }

            // Strategy 2: Legacy layout — .hprt-table
            if (roomBlocks.length === 0) {
                const roomRows = document.querySelectorAll('table.hprt-table > tbody > tr, .hprt-table > tbody > tr');
                let currentRoom = null;

                for (const row of roomRows) {
                    const roomTypeName = row.querySelector('.hprt-roomtype-icon-link, .hprt-roomtype-link');
                    if (roomTypeName) {
                        currentRoom = {
                            roomType: roomTypeName.textContent.trim(),
                            roomId: row.getAttribute('data-block-id')?.split('_')[0] || '',
                            options: [],
                        };
                        roomBlocks.push(currentRoom);
                    }
                    if (!currentRoom) continue;

                    const priceCell = row.querySelector('.hprt-price-price, .bui-price-display__value');
                    if (priceCell) {
                        const price = parsePrice(priceCell.textContent);
                        const taxesEl = row.querySelector('.hprt-price-price-total, .prd-taxes-and-fees-under-price');
                        let total = price;
                        if (taxesEl) {
                            const taxAmount = parsePrice(taxesEl.textContent);
                            if (taxAmount > 0 && taxAmount < price) total = price + taxAmount;
                            else if (taxAmount > price) total = taxAmount;
                        }
                        const finalEl = row.querySelector('[data-testid="price-for-x-nights"], .hprt-price-total-price');
                        if (finalEl) { const fp = parsePrice(finalEl.textContent); if (fp > 0) total = fp; }
                        if (total > 0) currentRoom.options.push({ price: Math.round(total * 100) / 100 });
                    }
                }
            }

            // --- BUILD PER-ROOM-TYPE RESULTS ---
            // Deduplicate room types (take first option per unique name)
            const seenRoomTypes = new Set();
            const roomResults = [];

            for (const block of roomBlocks) {
                if (seenRoomTypes.has(block.roomType)) continue;
                seenRoomTypes.add(block.roomType);

                const firstOption = block.options[0];
                if (!firstOption) continue;

                const bedrooms = parseBedrooms(block.roomType);
                const bathrooms = bedrooms > 0 ? Math.max(1, bedrooms - 1) : 1;

                roomResults.push({
                    name: propertyName,
                    location,
                    price: firstOption.price,
                    currency,
                    price_type: 'Total Stay',
                    bedrooms,
                    bathrooms,
                    room_type: block.roomType,
                    images: propertyImages.slice(0, 20),
                    checkIn,
                    checkOut,
                    homeImageIndex: 0,
                    selected: false,
                    category: '',
                    recommended: false,
                    sourceUrl,
                    _roomId: block.roomId,
                });
            }

            // If no room blocks found, return single property-level result
            if (roomResults.length === 0) {
                let price = 0;
                const priceSelectors = [
                    '[data-testid="price-and-discounted-price"]',
                    '.prco_total_highlight .bui-price-display__value',
                    '.bui-price-display__value',
                ];
                for (const sel of priceSelectors) {
                    const el = document.querySelector(sel);
                    if (el?.textContent) {
                        const parsed = parsePrice(el.textContent);
                        if (parsed > 0) { price = Math.round(parsed * 100) / 100; break; }
                    }
                }

                roomResults.push({
                    name: propertyName,
                    location,
                    price,
                    currency,
                    price_type: 'Total Stay',
                    bedrooms: 0,
                    bathrooms: 1,
                    room_type: '',
                    images: propertyImages.slice(0, 20),
                    checkIn,
                    checkOut,
                    homeImageIndex: 0,
                    selected: false,
                    category: '',
                    recommended: false,
                    sourceUrl,
                });
            }

            return { roomResults, propertyImages };
        }, {
            currency,
            checkIn,
            checkOut,
            sourceUrl: request.url,
        });

        // --- EXTRACT ROOM-SPECIFIC IMAGES ---
        // Click each room type link to open its photo lightbox, then scrape
        // images with alt text "Photo of <RoomType> #N"
        const allRoomLinks = await page.locator('[data-testid="rt-name-link"]').all();
        const roomLinkMap = {};
        for (const link of allRoomLinks) {
            const linkText = (await link.textContent()).trim();
            if (!roomLinkMap[linkText]) roomLinkMap[linkText] = link;
        }

        for (const room of results.roomResults) {
            try {
                const roomLink = roomLinkMap[room.room_type];
                if (!roomLink) { delete room._roomId; continue; }

                await roomLink.click({ force: true });
                await page.waitForTimeout(2500);

                const roomImages = await page.evaluate((roomType) => {
                    const images = [];
                    const photoImgs = document.querySelectorAll(`img[alt^="Photo of ${roomType}"]`);
                    for (const img of photoImgs) {
                        let src = img.getAttribute('src') || img.getAttribute('data-src') || '';
                        src = src.replace(/\/max\d+\//, '/max1280x900/');
                        src = src.replace(/square\d+/, 'max1280x900');
                        if (src.startsWith('http') && !images.includes(src)) images.push(src);
                    }
                    return images;
                }, room.room_type);

                if (roomImages.length > 0) {
                    room.images = roomImages.slice(0, 20);
                    log.info(`  ${room.room_type}: ${roomImages.length} room-specific photos`);
                }

                // Scroll back to top for next room click
                await page.evaluate(() => window.scrollTo(0, 0));
                await page.waitForTimeout(500);
            } catch (e) {
                log.warning(`  ${room.room_type}: could not get room photos (${e.message?.substring(0, 60)})`);
            }
            delete room._roomId;
        }

        // Push all room type results
        for (const room of results.roomResults) {
            await Actor.pushData(room);
        }
        log.info(`Scraped ${results.roomResults.length} room types from: ${results.roomResults[0]?.name}`);
    },
    failedRequestHandler: async ({ request, log: reqLog }) => {
        reqLog.error(`Failed to scrape ${request.url}`);
        await Actor.pushData({
            name: '',
            location: '',
            price: 0,
            currency,
            price_type: 'Total Stay',
            bedrooms: 0,
            bathrooms: 1,
            room_type: '',
            images: [],
            checkIn,
            checkOut,
            homeImageIndex: 0,
            selected: false,
            category: '',
            recommended: false,
            sourceUrl: request.url,
            error: `Failed to scrape: ${request.url}`,
        });
    },
});

await crawler.run([propertyUrl.toString()]);
await Actor.exit();
