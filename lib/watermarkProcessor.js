const { PDFDocument, rgb, degrees } = require('pdf-lib');
const fs = require('fs-extra');

class WatermarkProcessor {
  constructor() {
    // Predefined watermark presets
    this.presets = {
      'confidential': {
        text: 'CONFIDENTIAL',
        opacity: 0.3,
        fontSize: 48,
        color: { r: 1, g: 0, b: 0 }, // Red
        rotation: 45
      },
      'draft': {
        text: 'DRAFT',
        opacity: 0.2,
        fontSize: 36,
        color: { r: 0.5, g: 0.5, b: 0.5 }, // Gray
        rotation: 45
      },
      'approved': {
        text: 'APPROVED',
        opacity: 0.25,
        fontSize: 40,
        color: { r: 0, g: 0.8, b: 0 }, // Green
        rotation: 0
      },
      'copy': {
        text: 'COPY',
        opacity: 0.2,
        fontSize: 32,
        color: { r: 0, g: 0, b: 1 }, // Blue
        rotation: 45
      },
      'sample': {
        text: 'SAMPLE',
        opacity: 0.15,
        fontSize: 44,
        color: { r: 0.8, g: 0.4, b: 0 }, // Orange
        rotation: 45
      },
      'uncontrolled': {
        text: 'UNCONTROLLED',
        opacity: 0.4,
        fontSize: 52,
        color: { r: 0.8, g: 0, b: 0.8 }, // Magenta
        rotation: -30
      }
    };
  }

  /**
   * Add watermark to PDF
   * @param {Buffer} pdfBuffer - Original PDF buffer
   * @param {Object} options - Watermark options
   * @returns {Promise<Object>} - Result with watermarked PDF buffer
   */
  async addWatermark(pdfBuffer, options = {}) {
    try {
      console.log('🔖 [WATERMARK] Starting watermark process...');
      console.log('📊 [WATERMARK] PDF buffer size:', pdfBuffer.length, 'bytes');
      console.log('⚙️ [WATERMARK] Options:', JSON.stringify(options, null, 2));

      // Load the existing PDF
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pages = pdfDoc.getPages();
      
      console.log('📄 [WATERMARK] PDF loaded successfully. Pages:', pages.length);

      // Determine watermark settings
      let watermarkSettings;
      if (options.preset && this.presets[options.preset]) {
        // Start with preset as base
        watermarkSettings = { ...this.presets[options.preset] };
        console.log('🎨 [WATERMARK] Using preset as base:', options.preset);
        
        // Override with custom options if provided
        if (options.customText && options.customText.trim()) {
          watermarkSettings.text = options.customText;
        }
        if (options.opacity !== undefined) {
          watermarkSettings.opacity = parseFloat(options.opacity);
        }
        if (options.fontSize !== undefined) {
          watermarkSettings.fontSize = parseInt(options.fontSize);
        }
        if (options.color) {
          watermarkSettings.color = this.parseColor(options.color);
        }
        if (options.rotation !== undefined) {
          watermarkSettings.rotation = parseInt(options.rotation);
        }
        
        console.log('🎨 [WATERMARK] Preset customized with user options');
      } else {
        // Pure custom watermark settings
        watermarkSettings = {
          text: options.customText || 'WATERMARK',
          opacity: options.opacity ? parseFloat(options.opacity) : 0.3,
          fontSize: options.fontSize ? parseInt(options.fontSize) : 36,
          color: this.parseColor(options.color) || { r: 0.5, g: 0.5, b: 0.5 },
          rotation: options.rotation ? parseInt(options.rotation) : 45
        };
        console.log('🎨 [WATERMARK] Using pure custom settings');
      }
      
      // Add position settings (default to center: 50%, 50%)
      watermarkSettings.positionX = options.positionX !== undefined ? parseInt(options.positionX) : 50;
      watermarkSettings.positionY = options.positionY !== undefined ? parseInt(options.positionY) : 50;

      console.log('🔧 [WATERMARK] Final settings:', JSON.stringify(watermarkSettings, null, 2));

      // Apply watermark to each page
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();
        
        console.log(`📝 [WATERMARK] Processing page ${i + 1}/${pages.length} (${width}x${height})`);

        // Get font for text width calculation
        const font = await pdfDoc.embedFont('Helvetica-Bold');
        
        // Calculate text dimensions
        const textWidth = font.widthOfTextAtSize(watermarkSettings.text, watermarkSettings.fontSize);
        const textHeight = font.heightAtSize(watermarkSettings.fontSize);
        
        console.log(`📏 [WATERMARK] Text dimensions: ${textWidth}x${textHeight}`);

        // Calculate position based on percentage sliders with proper centering
        // Use simple interpolation: 0% = left/bottom edge, 50% = center, 100% = right/top edge
        const x = (watermarkSettings.positionX / 100) * (width - textWidth);
        const y = (watermarkSettings.positionY / 100) * (height - textHeight);
        
        console.log(`📐 [WATERMARK] Page dimensions: ${width}x${height}`);
        console.log(`📐 [WATERMARK] Text size: ${textWidth}x${textHeight}`);
        console.log(`📐 [WATERMARK] Position percentages: X=${watermarkSettings.positionX}%, Y=${watermarkSettings.positionY}%`);
        console.log(`📍 [WATERMARK] Final position: (${x.toFixed(2)}, ${y.toFixed(2)})`);
        
        // Calculate what the center position should be for verification
        const centerX = (width - textWidth) / 2;
        const centerY = (height - textHeight) / 2;
        console.log(`🎯 [WATERMARK] True center would be: (${centerX.toFixed(2)}, ${centerY.toFixed(2)})`);
        console.log(`📏 [WATERMARK] At 100% X should be: ${(width - textWidth).toFixed(2)}, currently: ${x.toFixed(2)}`);

        // Draw watermark text
        page.drawText(watermarkSettings.text, {
          x: x,
          y: y,
          size: watermarkSettings.fontSize,
          font: font,
          color: rgb(
            watermarkSettings.color.r,
            watermarkSettings.color.g,
            watermarkSettings.color.b
          ),
          opacity: watermarkSettings.opacity,
          rotate: degrees(watermarkSettings.rotation)
        });
      }

      console.log('✅ [WATERMARK] Watermark applied to all pages');

      // Save the watermarked PDF
      const watermarkedPdfBytes = await pdfDoc.save();
      
      console.log('💾 [WATERMARK] Watermarked PDF saved. Size:', watermarkedPdfBytes.length, 'bytes');

      return {
        success: true,
        buffer: Buffer.from(watermarkedPdfBytes),
        originalSize: pdfBuffer.length,
        watermarkedSize: watermarkedPdfBytes.length,
        pages: pages.length,
        watermarkText: watermarkSettings.text,
        processedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ [WATERMARK] Error adding watermark:', error.message);
      return {
        success: false,
        error: `Watermark processing failed: ${error.message}`,
        buffer: null
      };
    }
  }

  /**
   * Parse color string to RGB object
   * @param {string} colorString - Color name or hex
    * @returns {Object} RGB color object
    */
  // Note: calculatePosition method removed - now using percentage-based positioning

  parseColor(colorString) {
    const colorMap = {
      'red': { r: 1, g: 0, b: 0 },
      'green': { r: 0, g: 0.8, b: 0 },
      'blue': { r: 0, g: 0, b: 1 },
      'gray': { r: 0.5, g: 0.5, b: 0.5 },
      'grey': { r: 0.5, g: 0.5, b: 0.5 },
      'black': { r: 0, g: 0, b: 0 },
      'orange': { r: 1, g: 0.5, b: 0 },
      'purple': { r: 0.5, g: 0, b: 0.5 },
      'yellow': { r: 1, g: 1, b: 0 }
    };

    if (!colorString) {
      return { r: 0.5, g: 0.5, b: 0.5 };
    }

    // Check for named colors first
    if (colorMap[colorString.toLowerCase()]) {
      return colorMap[colorString.toLowerCase()];
    }

    // Parse hex colors (e.g., #ff0000, #FF0000)
    if (colorString.startsWith('#')) {
      const hex = colorString.slice(1);
      
      // Handle 3-digit hex (e.g., #f00)
      if (hex.length === 3) {
        const r = parseInt(hex[0] + hex[0], 16) / 255;
        const g = parseInt(hex[1] + hex[1], 16) / 255;
        const b = parseInt(hex[2] + hex[2], 16) / 255;
        return { r, g, b };
      }
      
      // Handle 6-digit hex (e.g., #ff0000)
      if (hex.length === 6) {
        const r = parseInt(hex.slice(0, 2), 16) / 255;
        const g = parseInt(hex.slice(2, 4), 16) / 255;
        const b = parseInt(hex.slice(4, 6), 16) / 255;
        return { r, g, b };
      }
    }

    // Default to gray if color not recognized
    console.warn(`[WATERMARK] Unrecognized color format: ${colorString}, defaulting to gray`);
    return { r: 0.5, g: 0.5, b: 0.5 };
  }

  /**
   * Get available watermark presets
   * @returns {Object} Available presets
   */
  getPresets() {
    return this.presets;
  }

  /**
   * Get preset names for UI
   * @returns {Array} Array of preset names
   */
  getPresetNames() {
    return Object.keys(this.presets);
  }

  /**
   * Get preset details
   * @param {string} presetName - Name of the preset
   * @returns {Object|null} Preset details or null if not found
   */
  getPresetDetails(presetName) {
    return this.presets[presetName] || null;
  }

  /**
   * Validate watermark options
   * @param {Object} options - Watermark options to validate
   * @returns {Object} Validation result
   */
  validateOptions(options) {
    const errors = [];

    if (options.preset && !this.presets[options.preset]) {
      errors.push(`Invalid preset: ${options.preset}`);
    }

    if (options.opacity !== undefined) {
      const opacity = parseFloat(options.opacity);
      if (isNaN(opacity) || opacity < 0 || opacity > 1) {
        errors.push('Opacity must be a number between 0 and 1');
      }
    }

    if (options.fontSize !== undefined) {
      const fontSize = parseInt(options.fontSize);
      if (isNaN(fontSize) || fontSize < 8 || fontSize > 200) {
        errors.push('Font size must be a number between 8 and 200');
      }
    }

    if (options.rotation !== undefined) {
      const rotation = parseInt(options.rotation);
      if (isNaN(rotation) || rotation < -360 || rotation > 360) {
        errors.push('Rotation must be a number between -360 and 360');
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
}

module.exports = WatermarkProcessor;