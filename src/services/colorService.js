const { hexToRgb, rgbToHex, findClosestColorName, sortColorsByBrightness } = require('../utils/colorUtils');

/**
 * Extracts all colors from webpage
 * @param {Page} page - Puppeteer page object
 * @returns {Array} List of colors with name, hex and rgb values
 */
const extractColors = async (page) => {
  const rawColors = await page.evaluate(() => {
    // Set to keep track of unique colors
    const uniqueColors = new Set();
    const colorProperties = [
      'color', 'background-color', 'border-color', 'border-top-color', 
      'border-right-color', 'border-bottom-color', 'border-left-color',
      'outline-color', 'text-decoration-color'
    ];
    
    // Get all elements
    const elements = Array.from(document.querySelectorAll('*'));
    
    // Extract all colors from computed style
    elements.forEach(el => {
      const computed = window.getComputedStyle(el);
      
      colorProperties.forEach(prop => {
        const value = computed.getPropertyValue(prop).trim();
        
        // Only add valid color values (rgb, rgba, hex)
        if (value && 
            value !== 'transparent' && 
            value !== 'none' && 
            value !== 'inherit' && 
            value !== 'initial' && 
            value !== 'currentcolor' &&
            value !== 'rgba(0, 0, 0, 0)') {
          uniqueColors.add(value);
        }
      });
    });
    
    return Array.from(uniqueColors);
  });
  
  // Process raw colors to add name, hex and rgb formats
  const processedColors = rawColors.map(colorValue => {
    let hex, rgb;
    
    if (colorValue.startsWith('#')) {
      hex = colorValue;
      rgb = hexToRgb(colorValue);
    } else if (colorValue.startsWith('rgb')) {
      rgb = colorValue;
      // Extract RGB values and convert to hex
      const rgbValues = colorValue.match(/\d+/g);
      if (rgbValues && rgbValues.length >= 3) {
        hex = rgbToHex({
          r: parseInt(rgbValues[0]),
          g: parseInt(rgbValues[1]),
          b: parseInt(rgbValues[2])
        });
      } else {
        hex = '#000000'; // Default if parsing fails
      }
    } else {
      // For other color formats (named colors etc.)
      // Use a default value
      hex = '#000000';
      rgb = 'RGB(0, 0, 0)';
    }
    
    return {
      name: findClosestColorName(colorValue),
      hex,
      rgb
    };
  });
  
  // Remove any potential duplicates again (might happen after processing)
  const uniqueProcessedColors = [];
  const seenHexCodes = new Set();
  
  processedColors.forEach(color => {
    if (!seenHexCodes.has(color.hex)) {
      seenHexCodes.add(color.hex);
      uniqueProcessedColors.push(color);
    }
  });
  
  // Sort colors from black to white
  return sortColorsByBrightness(uniqueProcessedColors);
};

module.exports = {
  extractColors
}; 