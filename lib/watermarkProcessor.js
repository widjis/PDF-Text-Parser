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
        watermarkSettings = { ...this.presets[options.preset] };
        console.log('🎨 [WATERMARK] Using preset:', options.preset);
      } else {
        // Custom watermark settings
        watermarkSettings = {
          text: options.customText || 'WATERMARK',
          opacity: options.opacity || 0.3,
          fontSize: options.fontSize || 36,
          color: this.parseColor(options.color) || { r: 0.5, g: 0.5, b: 0.5 },
          rotation: options.rotation || 45
        };
        console.log('🎨 [WATERMARK] Using custom settings');
      }

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

        // Calculate centered position
        const x = (width - textWidth) / 2;
        const y = (height - textHeight) / 2;
        
        console.log(`📍 [WATERMARK] Positioning at: (${x.toFixed(2)}, ${y.toFixed(2)})`);

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

    if (colorString && colorMap[colorString.toLowerCase()]) {
      return colorMap[colorString.toLowerCase()];
    }

    // Default to gray if color not found
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
      if (isNaN(rotation) || rotation < 0 || rotation > 360) {
        errors.push('Rotation must be a number between 0 and 360');
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
}

module.exports = WatermarkProcessor;