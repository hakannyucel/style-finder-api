/**
 * Extracts typography information from webpage
 * @param {Page} page - Puppeteer page object
 * @returns {Object} Typography data and meta information
 */
const extractTypography = async (page) => {
  return await page.evaluate(() => {
    const typographyProps = [
      "font-family", "font-size", "font-weight", "line-height",
      "letter-spacing", "text-transform", "font-style", "text-decoration"
    ];

    const groups = {};
    const tagCounts = {};
    let duplicatesRemoved = 0;

    // Getting all elements and extracting typography information through computed style
    const elements = Array.from(document.querySelectorAll('*'));
    elements.forEach(el => {
      const tag = el.tagName.toLowerCase();

      // Checking for error possibilities in className
      let className = '';
      if (typeof el.className === 'string') {
        className = el.className.trim();
      } else if (el.className && typeof el.className.baseVal === 'string') {
        className = el.className.baseVal.trim();
      }

      const computed = window.getComputedStyle(el);
      const styleObj = {};
      typographyProps.forEach(prop => {
        let val = computed.getPropertyValue(prop).trim();
        if (prop === "font-family") {
          // Get only the first font from comma-separated values
          val = val.split(',')[0].trim();
          // If font-family value is in quotes, remove the quotes
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.substring(1, val.length - 1);
          }
        }
        styleObj[prop] = val;
      });

      // Group key: combination of tag, className and typography properties
      const key = tag + '|' + className + '|' + typographyProps.map(prop => styleObj[prop]).join('|');
      if (groups[key]) {
        groups[key].count++;
        duplicatesRemoved++;
      } else {
        groups[key] = {
          tag,
          className,
          ...styleObj,
          count: 1
        };
      }
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });

    // Converting grouped typography information to array without duplicate count
    const typography = Object.values(groups).map(group => {
      const { count, ...rest } = group;
      return rest;
    });

    // Sorting by font-size from largest to smallest
    typography.sort((a, b) => parseFloat(b['font-size']) - parseFloat(a['font-size']));

    // CSS meta information: external and inline CSS counts and rule count from all styleSheets
    const externalCSSCount = document.querySelectorAll('link[rel="stylesheet"]').length;
    let inlineCSSCount = 0;
    document.querySelectorAll('style').forEach(styleEl => {
      try {
        if (styleEl.sheet && styleEl.sheet.cssRules) {
          inlineCSSCount += styleEl.sheet.cssRules.length;
        }
      } catch (e) {
        // Ignore access errors
      }
    });

    let typographyRulesCount = 0;
    for (let sheet of document.styleSheets) {
      try {
        if (sheet.cssRules) {
          typographyRulesCount += sheet.cssRules.length;
        }
      } catch (e) {
        // StyleSheets that cannot be accessed due to CORS restrictions
      }
    }

    const totalTagsFound = Object.keys(tagCounts).length;

    return {
      typography,
      meta: {
        externalCSSCount,
        inlineCSSCount,
        typographyRulesCount,
        duplicatesRemoved,
        tagCounts,
        totalTagsFound
      }
    };
  });
};

module.exports = {
  extractTypography
}; 