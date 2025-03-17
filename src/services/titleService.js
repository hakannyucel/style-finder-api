/**
 * Extracts page title from webpage
 * @param {Page} page - Puppeteer page object
 * @returns {string} The page title
 */
const extractPageTitle = async (page) => {
  return await page.evaluate(() => {
    // Try to get the title from various sources
    const titleTag = document.querySelector('title');
    const h1Tag = document.querySelector('h1');
    const ogTitle = document.querySelector('meta[property="og:title"]');
    
    // Return the title in order of preference
    if (titleTag && titleTag.textContent) {
      return titleTag.textContent.trim();
    } else if (ogTitle && ogTitle.getAttribute('content')) {
      return ogTitle.getAttribute('content').trim();
    } else if (h1Tag && h1Tag.textContent) {
      return h1Tag.textContent.trim();
    } else {
      return 'Unknown Title';
    }
  });
};

module.exports = {
  extractPageTitle
}; 