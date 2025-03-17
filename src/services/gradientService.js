const { findClosestColorName, parseRgb, rgbToHex } = require('../utils/colorUtils');

/**
 * Extracts all gradients from webpage
 * @param {Page} page - Puppeteer page object
 * @returns {Array} List of gradients with name and color information
 */
const extractGradients = async (page) => {
  const rawGradients = await page.evaluate(() => {
    // Set to keep track of unique gradients
    const uniqueGradients = new Set();
    
    // Expanded list of properties that can contain gradients
    const gradientProperties = [
      // Background properties
      'background-image', 'background',
      // Border properties
      'border-image', 'border-image-source',
      // Text properties
      'color', 'text-fill-color', 'text-stroke-color', '-webkit-text-fill-color', '-webkit-text-stroke-color',
      // Other properties that might use gradients
      'box-shadow', 'text-shadow',
      'fill', 'stroke',
      'list-style-image',
      'content',
      // Mask properties
      'mask', 'mask-image', '-webkit-mask', '-webkit-mask-image',
      // Filter properties
      'filter',
      // Custom properties
      '--background', '--color', '--gradient'
    ];
    
    // Helper function to check if a value is a valid color
    const isValidColor = (color) => {
      if (!color || typeof color !== 'string') return false;
      
      // Check for hex colors
      if (color.startsWith('#') && /^#([0-9A-F]{3}){1,2}$/i.test(color)) return true;
      
      // Check for rgb/rgba
      if (color.startsWith('rgb') && color.includes('(') && color.includes(')')) return true;
      
      // Check for hsl/hsla
      if (color.startsWith('hsl') && color.includes('(') && color.includes(')')) return true;
      
      // Check for standard CSS color names - Just check if it's a plain word
      // We'll filter out gradient keywords that might be misinterpreted as colors
      if (/^[a-z]+$/i.test(color)) {
        const gradientKeywords = ['to', 'at', 'from', 'deg', 'rad', 'grad', 'turn', 'repeat', 'repeating', 'linear', 'radial', 'conic'];
        return !gradientKeywords.includes(color.toLowerCase());
      }
      
      return false;
    };
    
    // Helper function to extract color stops from a gradient
    const extractColorStops = (gradientValue) => {
      if (!gradientValue || typeof gradientValue !== 'string') return [];
      
      // Get everything between the first parenthesis
      const openParenIndex = gradientValue.indexOf('(');
      if (openParenIndex === -1) return [];
      
      const closeParenIndex = gradientValue.lastIndexOf(')');
      if (closeParenIndex === -1) return [];
      
      const gradientContent = gradientValue.substring(openParenIndex + 1, closeParenIndex).trim();
      
      // Skip angle/direction if present
      let colorStopsPart = gradientContent;
      
      // Check for directions like "to right", "to bottom", etc.
      if (colorStopsPart.startsWith('to ')) {
        const firstComma = colorStopsPart.indexOf(',');
        if (firstComma !== -1) {
          colorStopsPart = colorStopsPart.substring(firstComma + 1).trim();
        }
      } 
      // Check for angle like "90deg", "1.25turn", etc.
      else if (/^\d+(\.\d+)?(deg|grad|rad|turn)/.test(colorStopsPart)) {
        const firstComma = colorStopsPart.indexOf(',');
        if (firstComma !== -1) {
          colorStopsPart = colorStopsPart.substring(firstComma + 1).trim();
        }
      }
      
      // Split by commas, but be careful with rgba/hsla that also have commas
      const parts = [];
      let currentPart = '';
      let parenthesisDepth = 0;
      
      for (let i = 0; i < colorStopsPart.length; i++) {
        const char = colorStopsPart[i];
        
        if (char === '(') {
          parenthesisDepth++;
          currentPart += char;
        } else if (char === ')') {
          parenthesisDepth--;
          currentPart += char;
        } else if (char === ',' && parenthesisDepth === 0) {
          parts.push(currentPart.trim());
          currentPart = '';
        } else {
          currentPart += char;
        }
      }
      
      if (currentPart.trim()) {
        parts.push(currentPart.trim());
      }
      
      // Extract just the color part from each stop (ignoring positions)
      const colorStops = parts.map(part => {
        // For parts like "rgb(0, 0, 255) 50%", extract just the color
        const colorMatch = part.match(/(#[0-9a-f]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|[a-z]+)(?:\s+\d+%)?/i);
        return colorMatch ? colorMatch[1] : null;
      }).filter(color => color && isValidColor(color));
      
      return colorStops;
    };
    
    // Helper function to extract gradient information
    const extractGradientInfo = (gradientValue) => {
      // Check if it's a gradient
      if (!gradientValue || typeof gradientValue !== 'string' || !gradientValue.includes('gradient')) return null;
      
      // Determine gradient type
      const type = gradientValue.includes('linear-gradient') ? 'linear' : 
                   gradientValue.includes('radial-gradient') ? 'radial' :
                   gradientValue.includes('conic-gradient') ? 'conic' : 
                   gradientValue.includes('repeating-linear-gradient') ? 'repeating-linear' :
                   gradientValue.includes('repeating-radial-gradient') ? 'repeating-radial' :
                   gradientValue.includes('repeating-conic-gradient') ? 'repeating-conic' : 'other';
      
      // Extract color stops
      const colorStops = extractColorStops(gradientValue);
      
      // Need at least two colors for a gradient
      if (colorStops.length < 2) return null;
      
      // Return the gradient information
      return {
        start: colorStops[0],
        end: colorStops[colorStops.length - 1],
        type: type,
        full: gradientValue.trim()
      };
    };
    
    // Get all elements
    const elements = Array.from(document.querySelectorAll('*'));
    
    // Extract all gradients from computed style
    elements.forEach(el => {
      const computed = window.getComputedStyle(el);
      
      gradientProperties.forEach(prop => {
        try {
          const value = computed.getPropertyValue(prop).trim();
          
          // Check if the value contains a gradient
          if (value && value.includes('gradient')) {
            // For properties that might contain multiple gradients (comma-separated)
            let gradients = [];
            let inParenthesis = 0;
            let currentGradient = '';
            
            // Properly split multiple gradient values
            for (let i = 0; i < value.length; i++) {
              const char = value[i];
              
              if (char === '(') {
                inParenthesis++;
                currentGradient += char;
              } else if (char === ')') {
                inParenthesis--;
                currentGradient += char;
                
                if (inParenthesis === 0 && currentGradient.includes('gradient')) {
                  gradients.push(currentGradient);
                  currentGradient = '';
                }
              } else if (char === ',' && inParenthesis === 0) {
                currentGradient = '';
              } else {
                currentGradient += char;
              }
            }
            
            gradients.forEach(gradient => {
              // Only add if it's a valid gradient with color stops
              const result = extractGradientInfo(gradient);
              if (result) {
                uniqueGradients.add(JSON.stringify(result));
              }
            });
          }
        } catch (error) {
          // Skip any properties that cause errors
          console.log(`Error processing property ${prop}: ${error.message}`);
        }
      });
      
      // Check for any custom properties that might contain gradients
      try {
        const customProps = [...Array(computed.length)]
          .map((_, i) => computed[i])
          .filter(prop => prop.startsWith('--'));
        
        customProps.forEach(prop => {
          try {
            const value = computed.getPropertyValue(prop).trim();
            
            if (value && value.includes('gradient')) {
              let gradients = [];
              let inParenthesis = 0;
              let currentGradient = '';
              
              // Properly split multiple gradient values
              for (let i = 0; i < value.length; i++) {
                const char = value[i];
                
                if (char === '(') {
                  inParenthesis++;
                  currentGradient += char;
                } else if (char === ')') {
                  inParenthesis--;
                  currentGradient += char;
                  
                  if (inParenthesis === 0 && currentGradient.includes('gradient')) {
                    gradients.push(currentGradient);
                    currentGradient = '';
                  }
                } else if (char === ',' && inParenthesis === 0) {
                  currentGradient = '';
                } else {
                  currentGradient += char;
                }
              }
              
              gradients.forEach(gradient => {
                const result = extractGradientInfo(gradient);
                if (result) {
                  uniqueGradients.add(JSON.stringify(result));
                }
              });
            }
          } catch (error) {
            // Skip any properties that cause errors
            console.log(`Error processing custom property ${prop}: ${error.message}`);
          }
        });
      } catch (error) {
        console.log(`Error processing custom properties: ${error.message}`);
      }
    });
    
    // Convert Set back to array of objects
    return Array.from(uniqueGradients).map(g => JSON.parse(g));
  });
  
  // Process raw gradients to add names and convert colors to hex
  const processedGradients = await page.evaluate(async (rawGradients) => {
    // Helper function to convert color to hex
    const colorToHex = (color) => {
      if (!color) return '#000000';
      
      try {
        // Use a temporary DOM element to convert colors
        const temp = document.createElement('div');
        temp.style.color = color;
        document.body.appendChild(temp);
        
        // Get computed color
        const computedColor = window.getComputedStyle(temp).color;
        document.body.removeChild(temp);
        
        // Parse the RGB values
        const match = computedColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
        if (match) {
          const [, r, g, b] = match;
          // Convert to hex and ensure 2 characters per component
          return `#${parseInt(r).toString(16).padStart(2, '0')}${parseInt(g).toString(16).padStart(2, '0')}${parseInt(b).toString(16).padStart(2, '0')}`;
        }
      } catch (error) {
        console.log(`Error converting color to hex: ${error.message}`);
      }
      
      return color; // Return original if conversion failed
    };
    
    return rawGradients.map(gradient => {
      try {
        // Convert colors to hex
        const startHex = colorToHex(gradient.start);
        const endHex = colorToHex(gradient.end);
        
        return {
          start: startHex,
          end: endHex,
          type: gradient.type,
          full: gradient.full
        };
      } catch (error) {
        console.log(`Error processing gradient: ${error.message}`);
        return gradient; // Return original if processing failed
      }
    });
  }, rawGradients);
  
  // Find closest color names for the hex values
  const namedGradients = processedGradients.map(gradient => {
    const startColorName = findClosestColorName(gradient.start);
    const endColorName = findClosestColorName(gradient.end);
    
    // Create a descriptive name
    const gradientName = `${startColorName} to ${endColorName}`;
    
    return {
      name: gradientName,
      start: gradient.start,
      end: gradient.end
    };
  });
  
  // Remove duplicates
  const uniqueProcessedGradients = [];
  const seenGradients = new Set();
  
  namedGradients.forEach(gradient => {
    const key = `${gradient.start}-${gradient.end}`;
    if (!seenGradients.has(key)) {
      seenGradients.add(key);
      uniqueProcessedGradients.push(gradient);
    }
  });
  
  return uniqueProcessedGradients;
};

module.exports = {
  extractGradients
}; 