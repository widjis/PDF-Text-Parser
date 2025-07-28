const fs = require('fs-extra');
const path = require('path');
const pdf = require('pdf-parse');

class PDFParser {
  constructor() {
    this.supportedFormats = ['.pdf'];
  }

  /**
   * Parse a PDF file and extract text
   * @param {string} filePath - Path to the PDF file
   * @param {Object} options - Parsing options
   * @returns {Promise<Object>} - Parsed result with text and metadata
   */
  async parseFile(filePath, options = {}) {
    try {
      console.log('📄 Parsing PDF file:', filePath);
      
      // Validate file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Validate file extension
      const ext = path.extname(filePath).toLowerCase();
      if (!this.supportedFormats.includes(ext)) {
        throw new Error(`Unsupported file format: ${ext}`);
      }

      // Read the PDF file
      const dataBuffer = fs.readFileSync(filePath);
      
      // Parse the PDF using pdf-parse
      const data = await pdf(dataBuffer, options);

      console.log(`✅ Successfully extracted ${data.text.length} characters from PDF`);
      return {
        success: true,
        text: data.text || '',
        method: 'pdf-parse',
        metadata: {
          pages: data.numpages,
          info: data.info,
          version: data.version,
          fileSize: fs.statSync(filePath).size,
          fileName: path.basename(filePath),
          filePath: filePath,
          extractedAt: new Date().toISOString()
        },
        stats: this.getTextStats(data.text || '')
      };

    } catch (error) {
      console.error('❌ PDF parsing failed:', error.message);
      return {
        success: false,
        error: `PDF parsing failed: ${error.message}`,
        text: '',
        method: 'pdf-parse-failed',
        metadata: {
          fileName: path.basename(filePath),
          filePath: filePath,
          note: `PDF parsing failed: ${error.message}`
        },
        stats: this.getTextStats('')
      };
    }
  }

  /**
   * Parse PDF from buffer
   * @param {Buffer} buffer - PDF buffer
   * @param {Object} options - Parsing options
   * @returns {Promise<Object>} - Parsed result
   */
  async parseBuffer(buffer, options = {}) {
    try {
      const data = await pdf(buffer, options);

      return {
        success: true,
        text: data.text || '',
        method: 'text-extraction',
        metadata: {
          pages: data.numpages,
          info: data.info,
          version: data.version,
          fileSize: buffer.length,
          extractedAt: new Date().toISOString()
        },
        stats: this.getTextStats(data.text || '')
      };

    } catch (error) {
      return {
        success: false,
        error: `PDF text extraction failed: ${error.message}`,
        text: '',
        method: 'text-extraction-failed',
        metadata: {
          fileSize: buffer.length,
          extractedAt: new Date().toISOString()
        },
        stats: this.getTextStats('')
      };
    }
  }

  /**
   * Parse multiple PDF files
   * @param {Array<string>} filePaths - Array of file paths
   * @param {Object} options - Parsing options
   * @returns {Promise<Array>} - Array of parsed results
   */
  async parseMultiple(filePaths, options = {}) {
    const results = [];

    for (const filePath of filePaths) {
      const result = await this.parseFile(filePath, options);
      results.push(result);
    }

    return results;
  }

  /**
   * Extract text with page separation
   * @param {string} filePath - Path to the PDF file
   * @returns {Promise<Object>} - Result with pages array
   */
  async parseWithPages(filePath) {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      
      // Parse with page render function to separate pages
      const data = await pdf(dataBuffer, {
        pagerender: (pageData) => {
          return pageData.getTextContent().then(textContent => {
            return textContent.items.map(item => item.str).join(' ');
          });
        }
      });

      return {
        success: true,
        text: data.text,
        pages: data.text.split('\f'), // Form feed character separates pages
        metadata: {
          pages: data.numpages,
          info: data.info,
          version: data.version,
          fileSize: fs.statSync(filePath).size,
          fileName: path.basename(filePath),
          extractedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        text: null,
        pages: null,
        metadata: null
      };
    }
  }

  /**
   * Clean and format extracted text
   * @param {string} text - Raw extracted text
   * @returns {string} - Cleaned text
   */
  cleanText(text) {
    if (!text) return '';

    return text
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n\s*\n/g, '\n') // Remove empty lines
      .trim();
  }

  /**
   * Get text statistics
   * @param {string} text - Text to analyze
   * @returns {Object} - Text statistics
   */
  getTextStats(text) {
    if (!text || typeof text !== 'string') {
      return {
        characters: 0,
        charactersNoSpaces: 0,
        words: 0,
        sentences: 0,
        paragraphs: 0,
        averageWordsPerSentence: 0
      };
    }

    const words = text.split(/\s+/).filter(word => word.length > 0);
    const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
    const paragraphs = text.split(/\n\s*\n/).filter(para => para.trim().length > 0);

    return {
      characters: text.length,
      charactersNoSpaces: text.replace(/\s/g, '').length,
      words: words.length,
      sentences: sentences.length,
      paragraphs: paragraphs.length,
      averageWordsPerSentence: sentences.length > 0 ? Math.round(words.length / sentences.length) : 0
    };
  }
}

module.exports = PDFParser;