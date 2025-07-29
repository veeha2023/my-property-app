// supabase/functions/scrape-images/index.ts
// Version 1.6: Final version using deno_dom and robust scraping logic.

import { DOMParser, Element } from 'https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts';
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      throw new Error('No URL provided.');
    }

    console.log(`Scraping images from: ${url}`);

    // Fetch the HTML content from the provided URL
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();

    // Parse HTML using DOMParser instead of cheerio
    const doc = new DOMParser().parseFromString(html, 'text/html');
    
    if (!doc) {
      throw new Error('Failed to parse HTML');
    }

    const imageSources = new Set<string>();

    // Find all img elements
    const images = doc.querySelectorAll('img');
    
    images.forEach((imgNode) => {
      const img = imgNode as Element;
      // Try multiple attribute sources
      const src = img.getAttribute('src') || 
                  img.getAttribute('data-src') || 
                  img.getAttribute('data-lazy-src') ||
                  img.getAttribute('data-original');
      
      if (src) {
        let imageUrl = src;
        
        // Handle relative URLs
        if (src.startsWith('//')) {
          imageUrl = 'https:' + src;
        } else if (src.startsWith('/')) {
          const urlObj = new URL(url);
          imageUrl = urlObj.origin + src;
        }
        
        // Only include valid HTTP/HTTPS URLs
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
          // Filter out common non-property images
          const isValidPropertyImage = !imageUrl.toLowerCase().includes('avatar') &&
                                     !imageUrl.toLowerCase().includes('logo') &&
                                     !imageUrl.toLowerCase().includes('icon') &&
                                     !imageUrl.toLowerCase().includes('favicon') &&
                                     !imageUrl.toLowerCase().includes('svg') &&
                                     !imageUrl.includes('1x1') &&
                                     !imageUrl.includes('blank');
          
          if (isValidPropertyImage) {
            // Try to get higher resolution version
            const highResUrl = imageUrl
              .replace(/small|thumb|medium/gi, 'large')
              .replace(/_\d+x\d+(\.|_)/, '_1920x1080$1')
              .replace(/w_\d+,h_\d+/, 'w_1920,h_1080');
            
            imageSources.add(highResUrl);
          }
        }
      }
    });

    // Also check for background images in style attributes
    const elementsWithBgImages = doc.querySelectorAll('[style*="background-image"]');
    elementsWithBgImages.forEach((elementNode) => {
      const element = elementNode as Element;
      const style = element.getAttribute('style');
      if (style) {
        const bgImageMatch = style.match(/background-image:\s*url\(['"]?([^'"]+)['"]?\)/);
        if (bgImageMatch && bgImageMatch[1]) {
          let bgImageUrl = bgImageMatch[1];
          
          if (bgImageUrl.startsWith('//')) {
            bgImageUrl = 'https:' + bgImageUrl;
          } else if (bgImageUrl.startsWith('/')) {
            const urlObj = new URL(url);
            bgImageUrl = urlObj.origin + bgImageUrl;
          }
          
          if ((bgImageUrl.startsWith('http://') || bgImageUrl.startsWith('https://')) &&
              !bgImageUrl.toLowerCase().includes('logo') &&
              !bgImageUrl.toLowerCase().includes('icon')) {
            imageSources.add(bgImageUrl);
          }
        }
      }
    });

    const imageArray = Array.from(imageSources);
    
    console.log(`Found ${imageArray.length} images`);

    const data = {
      images: imageArray,
      count: imageArray.length,
      url: url
    };

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error scraping images:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: error instanceof Error ? error.stack : undefined
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
