// Use puppeteer-extra with stealth plugin
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

const { extractTypography } = require('../services/typographyService');
const { extractColors } = require('../services/colorService');
const { extractGradients } = require('../services/gradientService');
const { extractPageTitle } = require('../services/titleService');

// Use stealth plugin if enabled in env
if (process.env.STEALTH_MODE === 'true') {
  console.log('Stealth mode enabled');
  puppeteer.use(StealthPlugin());
}

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 3600000; // 1 hour in milliseconds

/**
 * Retry a function with a delay between attempts
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {number} retryDelay - Delay between retries in ms
 * @returns {Promise<any>} - Result of the function call
 */
const retry = async (fn, maxRetries = 3, retryDelay = 2000) => {
  const actualMaxRetries = parseInt(process.env.MAX_RETRIES || maxRetries);
  const actualRetryDelay = parseInt(process.env.RETRY_DELAY || retryDelay);
  let lastError;
  
  for (let attempt = 1; attempt <= actualMaxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.log(`Attempt ${attempt}/${actualMaxRetries} failed: ${error.message}`);
      
      if (attempt < actualMaxRetries) {
        // Use exponential backoff
        const backoffDelay = actualRetryDelay * Math.pow(1.5, attempt - 1);
        console.log(`Retrying in ${backoffDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
  }
  
  throw lastError;
};

/**
 * Handle page navigation with retries and better error handling
 * @param {puppeteer.Page} page - Puppeteer page
 * @param {string} url - URL to navigate to
 * @param {number} timeout - Navigation timeout
 * @returns {Promise<void>}
 */
const navigateToUrl = async (page, url, timeout) => {
  return retry(async () => {
    try {
      // Set longer timeout for navigation
      await page.goto(url, { 
        waitUntil: 'networkidle2', 
        timeout: timeout
      });
    } catch (error) {
      // Check for specific network errors
      if (
        error.message.includes('net::ERR_NETWORK_CHANGED') ||
        error.message.includes('net::ERR_INTERNET_DISCONNECTED') ||
        error.message.includes('net::ERR_CONNECTION_RESET')
      ) {
        console.log('Network connection issue detected. Waiting before retry...');
        // Wait longer before retry for network issues
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      throw error;
    }
  }, parseInt(process.env.MAX_RETRIES || 3), parseInt(process.env.RETRY_DELAY || 5000));
};

/**
 * Controller for handling web scraping requests
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
const scrapeWebsite = async (req, res, next) => {
  const { url, nocache } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'url parameter is required.' });
  }

  // Use cache unless nocache is specified
  const useCache = nocache !== 'true';
  if (useCache && cache.has(url)) {
    const cachedData = cache.get(url);
    if (Date.now() - cachedData.timestamp < CACHE_TTL) {
      console.log(`Serving cached result for ${url}`);
      return res.json(cachedData.data);
    } else {
      // Remove expired cache
      cache.delete(url);
    }
  }

  let browser;
  try {
    console.log(`Starting scrape for ${url}`);
    const puppeteerTimeout = parseInt(process.env.PUPPETEER_TIMEOUT || 60000);
    
    // Launch browser with timeout from environment variable and additional settings
    const launchOptions = {
      executablePath: process.env.NODE_ENV === 'production' 
        ? '/usr/bin/google-chrome-stable' 
        : puppeteer.executablePath(),
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-extensions',
        '--ignore-certificate-errors',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-infobars',
        '--window-position=0,0',
        '--disable-notifications',
        '--disable-blink-features=AutomationControlled'
      ],
      headless: true,
      timeout: puppeteerTimeout,
      ignoreHTTPSErrors: true
    };
    
    browser = await puppeteer.launch(launchOptions);
    
    // Create new page with optimized settings
    const page = await browser.newPage();
    
    // User agent selection
    const userAgents = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
    ];
    
    // Pick a random user agent
    const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    
    // Basic evasion 
    await page.evaluateOnNewDocument(() => {
      // Overwrite the 'plugins' property to use a custom getter
      Object.defineProperty(navigator, 'plugins', {
        // This just needs to have length > 0
        get: () => [1, 2, 3, 4, 5],
      });

      // Overwrite the 'languages' property to use a custom getter
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en', 'es'],
      });
      
      // Pass the Webdriver test
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
      
      // Pass the Chrome test
      window.chrome = {
        runtime: {},
      };
      
      // Pass the Permissions test
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );
    });
    
    // Set user agent to mimic a regular browser
    await page.setUserAgent(randomUserAgent);
    console.log(`Using user agent: ${randomUserAgent}`);
    
    // Set extra HTTP headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"macOS"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    });
    
    // Set viewport
    await page.setViewport({
      width: 1920,
      height: 1080
    });
    
    // Set resource blocking for better performance
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      // Block unnecessary resources to improve performance
      const resourceType = request.resourceType();
      if (['image', 'media', 'font', 'stylesheet'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });
    
    // Add error handler for page errors
    page.on('error', error => {
      console.error(`Page error: ${error.message}`);
    });
    
    // Set a timeout for the navigation
    console.log(`Navigating to ${url} with timeout ${puppeteerTimeout}ms`);
    await navigateToUrl(page, url, puppeteerTimeout);
    
    // Allow a bit more time for dynamic content to load
    await page.waitForTimeout(2000);
    
    console.log(`Successfully loaded ${url}, extracting data`);
    // Extract data using our services
    const [titleResult, typographyResult, colorsResult, gradientsResult] = await Promise.all([
      extractPageTitle(page),
      extractTypography(page),
      extractColors(page),
      extractGradients(page)
    ]);
    
    // Build the response object
    const result = {
      url,
      title: titleResult,
      ...typographyResult,
      colors: colorsResult,
      gradients: gradientsResult
    };
    
    // Cache the result
    if (useCache) {
      cache.set(url, {
        data: result,
        timestamp: Date.now()
      });
    }
    
    console.log(`Scraping complete for ${url}`);
    res.json(result);
  } catch (error) {
    console.error(`Scraping error for ${url}:`, error);
    
    // Check for specific network errors
    if (error.message.includes('net::ERR_NETWORK_CHANGED')) {
      return res.status(503).json({
        error: 'Network Connection Issue',
        details: 'Network connection changed during request. Please try again.'
      });
    } else if (error.message.includes('Navigation timeout')) {
      return res.status(504).json({
        error: 'Gateway Timeout',
        details: 'The page took too long to load. The website might be too complex or unavailable.'
      });
    } else if (error.message.includes('ERR_NAME_NOT_RESOLVED')) {
      return res.status(400).json({
        error: 'Invalid URL',
        details: 'The URL provided could not be resolved. Please check it and try again.'
      });
    } else if (error.message.includes('ERR_CONNECTION_REFUSED')) {
      return res.status(503).json({
        error: 'Connection Refused',
        details: 'The server refused the connection. The site might be down or blocking requests.'
      });
    } else if (error.message.includes('ERR_CONNECTION_TIMED_OUT')) {
      return res.status(504).json({
        error: 'Connection Timeout',
        details: 'The connection to the server timed out. Please try again later.'
      });
    }
    
    next(error);
  } finally {
    if (browser) {
      try {
        await browser.close();
        console.log('Browser closed successfully');
      } catch (err) {
        console.error('Error closing browser:', err);
      }
    }
  }
};

module.exports = {
  scrapeWebsite
}; 