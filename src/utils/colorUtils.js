// JSON dosyasını doğrudan import ediyoruz
const colorNameList = require('../../node_modules/color-name-list/dist/colornames.bestof.json');
const nearestColor = require('nearest-color');

// nearestColor için {name => hex} formatında bir nesne oluşturuyoruz
const colors = colorNameList.reduce((o, { name, hex }) => Object.assign(o, { [name]: hex }), {});

// nearest color finder'ı oluşturuyoruz
const nearest = nearestColor.from(colors);

/**
 * Converts a hex color to RGB format
 * @param {string} hex - Hex color code
 * @returns {string} RGB representation
 */
const hexToRgb = (hex) => {
  // Remove the hash if it exists
  hex = hex.replace(/^#/, '');
  
  // Parse the hex values
  let r, g, b;
  if (hex.length === 3) {
    r = parseInt(hex.charAt(0) + hex.charAt(0), 16);
    g = parseInt(hex.charAt(1) + hex.charAt(1), 16);
    b = parseInt(hex.charAt(2) + hex.charAt(2), 16);
  } else {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  }
  
  return `RGB(${r}, ${g}, ${b})`;
};

/**
 * Extracts RGB values from a CSS rgb/rgba string
 * @param {string} rgb - RGB or RGBA string
 * @returns {Object} Object with r, g, b values
 */
const parseRgb = (rgb) => {
  const rgbValues = rgb.match(/\d+/g);
  if (!rgbValues || rgbValues.length < 3) return null;
  
  return {
    r: parseInt(rgbValues[0]),
    g: parseInt(rgbValues[1]),
    b: parseInt(rgbValues[2])
  };
};

/**
 * Converts RGB object to hex color
 * @param {Object} rgb - Object with r, g, b values
 * @returns {string} Hex color code
 */
const rgbToHex = (rgb) => {
  if (!rgb) return '#000000';
  
  function componentToHex(c) {
    const hex = c.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }
  
  return '#' + componentToHex(rgb.r) + componentToHex(rgb.g) + componentToHex(rgb.b);
};

/**
 * Finds the closest named color using nearest-color package
 * @param {string} colorValue - Color value in hex or rgb
 * @returns {string} Name of the closest color
 */
const findClosestColorName = (colorValue) => {
  try {
    let hexColor;
    
    // Convert to hex if it's in RGB format
    if (colorValue.startsWith('rgb')) {
      const rgb = parseRgb(colorValue);
      if (rgb) {
        hexColor = rgbToHex(rgb);
      } else {
        return 'Unknown';
      }
    } else if (colorValue.startsWith('#')) {
      hexColor = colorValue;
    } else {
      return 'Unknown';
    }
    
    // Use nearest-color package to find the closest color
    const result = nearest(hexColor);
    return result ? result.name : 'Unknown';
  } catch (error) {
    console.error('Error finding closest color name:', error);
    return 'Unknown';
  }
};

/**
 * Sorts colors from black to white
 * @param {Array} colors - Array of color objects
 * @returns {Array} Sorted array of colors
 */
const sortColorsByBrightness = (colors) => {
  return colors.sort((a, b) => {
    const rgbA = parseRgb(a.rgb);
    const rgbB = parseRgb(b.rgb);
    
    if (!rgbA || !rgbB) return 0;
    
    const brightnessA = (rgbA.r * 299 + rgbA.g * 587 + rgbA.b * 114) / 1000;
    const brightnessB = (rgbB.r * 299 + rgbB.g * 587 + rgbB.b * 114) / 1000;
    
    return brightnessA - brightnessB; // Sort from black to white
  });
};

module.exports = {
  hexToRgb,
  parseRgb,
  rgbToHex,
  findClosestColorName,
  sortColorsByBrightness
}; 