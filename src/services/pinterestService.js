const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

class PinterestService {
  constructor() {
    this.baseURL = 'https://snappin.app';
    this.sessionCookies = null;
    this.csrfToken = null;
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }

  async initializeSession() {
    try {
      logger.info('Initializing session with SnapPin');
      
      const response = await axios.get(this.baseURL, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      this.csrfToken = $('meta[name="csrf-token"]').attr('content') || 
                      $('meta[name="csrf-token"]').attr('value') ||
                      $('input[name="_token"]').val();
      
      this.sessionCookies = response.headers['set-cookie'] || [];

      logger.info('Session initialized successfully', {
        hasCsrfToken: !!this.csrfToken,
        cookiesCount: this.sessionCookies.length
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to initialize session', error);
      throw new Error(`Failed to initialize download session: ${error.message}`);
    }
  }

  async getMediaInfo(pinterestUrl) {
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries) {
      try {
        if (!this.sessionCookies || !this.csrfToken || retryCount > 0) {
          await this.initializeSession();
        }

        logger.info(`Processing Pinterest URL (attempt ${retryCount + 1}): ${pinterestUrl}`);

        // Prepare cookies
        const cookieString = this.sessionCookies
          .map(cookie => {
            if (Array.isArray(cookie)) {
              return cookie[0].split(';')[0];
            }
            return cookie.split(';')[0];
          })
          .filter(Boolean)
          .join('; ');

        // Make POST request
        const response = await axios.post(
          this.baseURL,
          { url: pinterestUrl },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-TOKEN': this.csrfToken || '',
              'Cookie': cookieString,
              'User-Agent': this.userAgent,
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'Accept-Encoding': 'gzip, deflate, br',
              'Connection': 'keep-alive',
              'Origin': this.baseURL,
              'Referer': this.baseURL + '/',
              'Upgrade-Insecure-Requests': '1',
              'Sec-Fetch-Dest': 'document',
              'Sec-Fetch-Mode': 'navigate',
              'Sec-Fetch-Site': 'same-origin',
              'Sec-Fetch-User': '?1'
            },
            timeout: 15000,
            maxRedirects: 5
          }
        );

        const $ = cheerio.load(response.data);
        
        // Debug: log HTML structure
        logger.debug('Response HTML length:', response.data.length);
        if (response.data.length < 500) {
          logger.debug('Response content:', response.data);
        }

        const result = {
          success: false,
          type: null,
          urls: [],
          metadata: {
            title: 'Pinterest Media',
            source: pinterestUrl
          }
        };

        // Try to find video
        const videoSources = $('video source');
        if (videoSources.length > 0) {
          result.type = 'video';
          videoSources.each((i, elem) => {
            const src = $(elem).attr('src');
            if (src && (src.startsWith('http') || src.startsWith('//'))) {
              const fullSrc = src.startsWith('//') ? 'https:' + src : src;
              result.urls.push({
                url: fullSrc,
                quality: $(elem).attr('label') || $(elem).attr('title') || 'default',
                type: 'video/mp4'
              });
            }
          });
          result.success = true;
        }

        // Try to find images
        const images = $('img');
        if (images.length > 0 && !result.success) {
          // Look for response images specifically
          const responseImages = $('.response-image img, .result img, img[src*="pinimg"]');
          responseImages.each((i, elem) => {
            const src = $(elem).attr('src');
            if (src && (src.startsWith('http') || src.startsWith('//'))) {
              const fullSrc = src.startsWith('//') ? 'https:' + src : src;
              if (fullSrc.includes('pinimg') || fullSrc.includes('pinterest')) {
                result.type = 'image';
                result.urls.push({
                  url: fullSrc,
                  type: 'image',
                  alt: $(elem).attr('alt') || ''
                });
                result.success = true;
              }
            }
          });
        }

        // Try to find download button/link
        const downloadLinks = $('a[href*="download"], a.button, .download-btn');
        downloadLinks.each((i, elem) => {
          const href = $(elem).attr('href');
          if (href && (href.startsWith('http') || href.startsWith('//'))) {
            const fullHref = href.startsWith('//') ? 'https:' + href : href;
            if (!result.downloadLink && (fullHref.includes('download') || $(elem).text().toLowerCase().includes('download'))) {
              result.downloadLink = fullHref;
            }
          }
        });

        // Extract title if available
        const title = $('title').text();
        if (title && !title.includes('Error')) {
          result.metadata.title = title.replace(' - Snappin', '').trim();
        }

        // Extract description
        const description = $('meta[name="description"]').attr('content');
        if (description) {
          result.metadata.description = description;
        }

        if (result.success) {
          logger.info(`Successfully extracted ${result.type}`, {
            urlCount: result.urls.length,
            hasDownloadLink: !!result.downloadLink
          });
          return {
            status: 'success',
            data: {
              type: result.type,
              urls: result.urls,
              downloadLink: result.downloadLink,
              metadata: result.metadata,
              timestamp: new Date().toISOString()
            }
          };
        }

        // If no success, check for error messages
        const errorMsg = $('.error, .alert-danger, .message.error').text().trim();
        if (errorMsg) {
          throw new Error(`Service error: ${errorMsg}`);
        }

        throw new Error('No media found in the response');

      } catch (error) {
        logger.error(`Attempt ${retryCount + 1} failed:`, error);
        
        // Reset session
        this.sessionCookies = null;
        this.csrfToken = null;
        
        retryCount++;
        
        if (retryCount > maxRetries) {
          return {
            status: 'error',
            message: `Download failed after ${maxRetries + 1} attempts: ${error.message}`
          };
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
}

module.exports = new PinterestService();