const fs = require('fs-extra');
const path = require('path');
const pdf = require('pdf-parse');
const Tesseract = require('tesseract.js');

// OCR dependencies
let tesseract, pdfPoppler, openai;

try {
    tesseract = require('tesseract.js');
    pdfPoppler = require('pdf-poppler');
    console.log('✅ OCR dependencies loaded successfully');
} catch (error) {
    console.log('❌ OCR dependencies not available:', error.message);
}

// OpenAI dependency
try {
    const { OpenAI } = require('openai');
    openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });
    if (process.env.OPENAI_API_KEY) {
        console.log('✅ OpenAI API initialized successfully');
    } else {
        console.log('⚠️ OpenAI API key not found in environment variables');
    }
} catch (error) {
    console.log('❌ OpenAI not available:', error.message);
}

class PDFParser {
  constructor() {
    this.supportedFormats = ['.pdf'];
  }



  /**
   * Parse a PDF file and extract text
   * @param {string} filePath - Path to the PDF file
   * @param {Object} options - Parsing options
   * @param {string} options.ocrMethod - OCR method: 'tesseract' (default) or 'openai'
   * @returns {Promise<Object>} - Parsed result with text and metadata
   */
  async parseFile(filePath, options = {}) {
    try {
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
      
      // Parse the PDF
      const data = await pdf(dataBuffer, options);

      // Check if text extraction was successful
      if (data.text && data.text.trim().length > 0) {
        return {
          success: true,
          text: data.text,
          method: 'text-extraction',
          metadata: {
            pages: data.numpages,
            info: data.info,
            version: data.version,
            fileSize: fs.statSync(filePath).size,
            fileName: path.basename(filePath),
            filePath: filePath,
            extractedAt: new Date().toISOString()
          }
        };
      } else {
        // If no text found, try OCR
        console.log('No extractable text found, attempting OCR...');
        return await this.parseWithOCR(dataBuffer, path.basename(filePath), options.ocrMethod);
      }

    } catch (error) {
      // If regular parsing fails, try OCR as fallback
      console.log('Regular parsing failed, attempting OCR fallback...');
      try {
        return await this.parseWithOCR(dataBuffer, path.basename(filePath), options.ocrMethod);
      } catch (ocrError) {
        return {
          success: false,
          error: `Both text extraction and OCR failed. Text extraction: ${error.message}, OCR: ${ocrError.message}`,
          text: null,
          metadata: null
        };
      }
    }
  }

  /**
   * Parse PDF using OpenAI Responses API (Direct PDF Processing)
   * @param {Buffer} buffer - PDF buffer
   * @param {string} fileName - File name
   * @returns {Promise<Object>} - Parsed result with OpenAI Responses API
   */
  async parseWithOpenAIResponses(buffer, fileName) {
    console.log('🤖 Starting OpenAI Responses API processing for:', fileName);
    
    // Check if OpenAI is available
    if (!openai) {
      throw new Error('OpenAI not available. Please check your API key configuration.');
    }

    try {
      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      
      console.log('📄 Preparing PDF for OpenAI Responses API...');
      
      // Create temporary directory for processing
      const tempDir = path.join(os.tmpdir(), 'pdf-responses-' + Date.now());
      fs.mkdirSync(tempDir, { recursive: true });
      
      // Write PDF buffer to temporary file
      const tempPdfPath = path.join(tempDir, 'temp.pdf');
      fs.writeFileSync(tempPdfPath, buffer);
      
      console.log('🚀 Uploading PDF to OpenAI...');
      
      // Upload the PDF file to OpenAI
      const file = await openai.files.create({
        file: fs.createReadStream(tempPdfPath),
        purpose: "user_data",
      });
      
      console.log(`📤 File uploaded with ID: ${file.id}`);
      console.log('🔍 Processing PDF with OpenAI Responses API...');
      
      // Use the Responses API to process the PDF
      const response = await openai.responses.create({
        model: "gpt-4o-mini",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_file",
                file_id: file.id,
              },
              {
                type: "input_text",
                text: "Extract all text from this PDF document. Return only the text content, maintaining the original formatting and structure as much as possible. Do not add any commentary, explanations, or analysis - just the extracted text.",
              },
            ],
          },
        ],
      });
      
      const extractedText = response.output_text || '';
      
      // Clean up temporary files
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.warn('Could not clean up temporary files:', cleanupError.message);
      }
      
      // Clean up uploaded file from OpenAI (optional)
      try {
        await openai.files.del(file.id);
        console.log(`🗑️ Cleaned up uploaded file: ${file.id}`);
      } catch (deleteError) {
        console.warn('Could not delete uploaded file:', deleteError.message);
      }
      
      console.log(`🎉 OpenAI Responses API completed! Total characters extracted: ${extractedText.length}`);
      
      return {
        success: true,
        text: extractedText,
        method: 'openai-responses',
        metadata: {
          fileName,
          fileSize: buffer.length,
          ocrEngine: 'OpenAI GPT-4.1 Responses API',
          note: 'Text extracted using OpenAI Responses API with direct PDF processing',
          fileId: file.id
        },
        stats: this.getTextStats(extractedText)
      };
      
    } catch (error) {
      console.error('❌ OpenAI Responses API processing failed:', error.message);
      
      return {
        success: false,
        text: '',
        method: 'openai-responses-failed',
        metadata: {
          fileName,
          fileSize: buffer.length,
          note: `OpenAI Responses API processing failed: ${error.message}`
        },
        stats: this.getTextStats('')
      };
    }
  }

  /**
   * Parse PDF using OCR (Optical Character Recognition)
   * @param {Buffer} buffer - PDF buffer
   * @param {string} fileName - File name
   * @param {string} method - OCR method: 'tesseract' (default), 'openai', or 'openai-responses'
   * @returns {Promise<Object>} - Parsed result with OCR
   */
  async parseWithOCR(buffer, fileName, method = 'tesseract') {
    console.log(`🔍 Starting ${method.toUpperCase()} OCR processing for:`, fileName);
    
    if (method === 'openai-responses') {
      return await this.parseWithOpenAIResponses(buffer, fileName);
    } else if (method === 'openai') {
      return await this.parseWithOpenAI(buffer, fileName);
    } else {
      return await this.parseWithTesseract(buffer, fileName);
    }
  }

  /**
   * Parse PDF using Tesseract.js OCR
   * @param {Buffer} buffer - PDF buffer
   * @param {string} fileName - File name
   * @returns {Promise<Object>} - Parsed result with OCR
   */
  async parseWithTesseract(buffer, fileName) {
    console.log('🔍 Starting Tesseract OCR processing for:', fileName);
    
    // Check if OCR dependencies are available
    if (!tesseract || !pdfPoppler) {
      throw new Error('OCR dependencies not available. Please install tesseract.js and pdf-poppler.');
    }

    try {
      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      
      console.log('📄 Converting PDF to images...');
      
      // Create temporary directory for processing
      const tempDir = path.join(os.tmpdir(), 'pdf-ocr-' + Date.now());
      fs.mkdirSync(tempDir, { recursive: true });
      
      // Write PDF buffer to temporary file
      const tempPdfPath = path.join(tempDir, 'temp.pdf');
      fs.writeFileSync(tempPdfPath, buffer);
      
      // Convert PDF to images using pdf-poppler
      const options = {
        format: 'png',
        out_dir: tempDir,
        out_prefix: 'page',
        page: null // Convert all pages
      };
      
      console.log('Converting PDF to images...');
      await pdfPoppler.convert(tempPdfPath, options);
      
      // Read the generated image files
      const files = fs.readdirSync(tempDir);
      const imageFiles = files
        .filter(file => file.startsWith('page') && file.endsWith('.png'))
        .sort((a, b) => {
          // Sort by page number
          const aNum = parseInt(a.match(/page\.(\d+)\.png/)?.[1] || '0');
          const bNum = parseInt(b.match(/page\.(\d+)\.png/)?.[1] || '0');
          return aNum - bNum;
        })
        .map(file => path.join(tempDir, file));
      
      const numPages = imageFiles.length;
      console.log(`📊 PDF has ${numPages} pages`);
      
      let allText = '';
      
      // Process each page
      for (let i = 0; i < imageFiles.length; i++) {
        const pageNum = i + 1;
        console.log(`🔍 Processing page ${pageNum}/${numPages}...`);
        
        try {
          console.log(`🔤 Running Tesseract OCR on page ${pageNum}...`);
          
          // Perform OCR on the image
          const { data: { text } } = await tesseract.recognize(imageFiles[i], 'eng', {
            logger: m => {
              if (m.status === 'recognizing text') {
                console.log(`📝 OCR Progress: ${Math.round(m.progress * 100)}%`);
              }
            }
          });
          
          if (text.trim()) {
            allText += text.trim() + '\n\n';
            console.log(`✅ Extracted ${text.trim().length} characters from page ${pageNum}`);
          } else {
            console.log(`⚠️ No text found on page ${pageNum}`);
          }
          
        } catch (pageError) {
          console.error(`❌ Error processing page ${pageNum}:`, pageError.message);
          continue; // Continue with next page
        }
      }
      
      // Clean up temporary files
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.warn('Could not clean up temporary files:', cleanupError.message);
      }
      
      const finalText = allText.trim();
      console.log(`🎉 Tesseract OCR completed! Total characters extracted: ${finalText.length}`);
      
      return {
        success: true,
        text: finalText,
        method: 'tesseract-ocr',
        metadata: {
          fileName,
          fileSize: buffer.length,
          pages: numPages,
          ocrEngine: 'Tesseract.js',
          note: 'Text extracted using Tesseract OCR (Optical Character Recognition)'
        },
        stats: this.getTextStats(finalText)
      };
      
    } catch (error) {
      console.error('❌ Tesseract OCR processing failed:', error.message);
      
      return {
        success: false,
        text: '',
        method: 'tesseract-ocr-failed',
        metadata: {
          fileName,
          fileSize: buffer.length,
          note: `Tesseract OCR processing failed: ${error.message}`
        },
        stats: this.getTextStats('')
      };
    }
  }

  /**
   * Parse PDF using OpenAI Vision API
   * @param {Buffer} buffer - PDF buffer
   * @param {string} fileName - File name
   * @returns {Promise<Object>} - Parsed result with OCR
   */
  async parseWithOpenAI(buffer, fileName) {
    console.log('🔍 Starting OpenAI Vision OCR processing for:', fileName);
    
    // Check if OpenAI is available
    if (!openai || !process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API not available. Please install openai package and set OPENAI_API_KEY environment variable.');
    }

    try {
      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      
      console.log('📄 Converting PDF to images for OpenAI...');
      
      // Create temporary directory for processing
      const tempDir = path.join(os.tmpdir(), 'pdf-openai-' + Date.now());
      fs.mkdirSync(tempDir, { recursive: true });
      
      // Write PDF buffer to temporary file
      const tempPdfPath = path.join(tempDir, 'temp.pdf');
      fs.writeFileSync(tempPdfPath, buffer);
      
      // Convert PDF to images using pdf-poppler
      const options = {
        format: 'png',
        out_dir: tempDir,
        out_prefix: 'page',
        page: null // Convert all pages
      };
      
      console.log('Converting PDF to images...');
      await pdfPoppler.convert(tempPdfPath, options);
      
      // Read the generated image files
      const files = fs.readdirSync(tempDir);
      const imageFiles = files
        .filter(file => file.startsWith('page') && file.endsWith('.png'))
        .sort((a, b) => {
          // Sort by page number
          const aNum = parseInt(a.match(/page\.(\d+)\.png/)?.[1] || '0');
          const bNum = parseInt(b.match(/page\.(\d+)\.png/)?.[1] || '0');
          return aNum - bNum;
        })
        .map(file => path.join(tempDir, file));
      
      const numPages = imageFiles.length;
      console.log(`📊 PDF has ${numPages} pages`);
      
      let allText = '';
      
      // Process each page with OpenAI
      for (let i = 0; i < imageFiles.length; i++) {
        const pageNum = i + 1;
        console.log(`🔍 Processing page ${pageNum}/${numPages} with OpenAI...`);
        
        try {
          // Read image file and convert to base64
          const imageBuffer = fs.readFileSync(imageFiles[i]);
          const base64Image = imageBuffer.toString('base64');
          
          console.log(`🤖 Sending page ${pageNum} to OpenAI Vision API...`);
          
          // Call OpenAI Vision API
          const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Extract all text from this image. Return only the text content, maintaining the original formatting and structure as much as possible. Do not add any commentary or explanations."
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:image/png;base64,${base64Image}`
                    }
                  }
                ]
              }
            ],
            max_tokens: 4000
          });
          
          const extractedText = response.choices[0]?.message?.content?.trim() || '';
          
          if (extractedText) {
            allText += extractedText + '\n\n';
            console.log(`✅ Extracted ${extractedText.length} characters from page ${pageNum}`);
          } else {
            console.log(`⚠️ No text found on page ${pageNum}`);
          }
          
        } catch (pageError) {
          console.error(`❌ Error processing page ${pageNum} with OpenAI:`, pageError.message);
          continue; // Continue with next page
        }
      }
      
      // Clean up temporary files
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.warn('Could not clean up temporary files:', cleanupError.message);
      }
      
      const finalText = allText.trim();
      console.log(`🎉 OpenAI OCR completed! Total characters extracted: ${finalText.length}`);
      
      return {
        success: true,
        text: finalText,
        method: 'openai-ocr',
        metadata: {
          fileName,
          fileSize: buffer.length,
          pages: numPages,
          ocrEngine: 'OpenAI GPT-4 Vision',
          note: 'Text extracted using OpenAI Vision API'
        },
        stats: this.getTextStats(finalText)
      };
      
    } catch (error) {
      console.error('❌ OpenAI OCR processing failed:', error.message);
      
      return {
        success: false,
        text: '',
        method: 'openai-ocr-failed',
        metadata: {
          fileName,
          fileSize: buffer.length,
          note: `OpenAI OCR processing failed: ${error.message}`
        },
        stats: this.getTextStats('')
      };
    }
  }

  /**
   * Parse PDF from buffer
   * @param {Buffer} buffer - PDF buffer
   * @param {Object} options - Parsing options
   * @param {string} options.ocrMethod - OCR method: 'tesseract' (default) or 'openai'
   * @returns {Promise<Object>} - Parsed result
   */
  async parseBuffer(buffer, options = {}) {
    try {
      const data = await pdf(buffer, options);

      // Check if text extraction was successful
      if (data.text && data.text.trim().length > 0) {
        return {
          success: true,
          text: data.text,
          method: 'text-extraction',
          metadata: {
            pages: data.numpages,
            info: data.info,
            version: data.version,
            fileSize: buffer.length,
            extractedAt: new Date().toISOString()
          }
        };
      } else {
        // If no text found, try OCR
        console.log('No extractable text found in buffer, attempting OCR...');
        return await this.parseWithOCR(buffer, 'uploaded-file.pdf', options.ocrMethod);
      }

    } catch (error) {
      // If regular parsing fails, try OCR as fallback
      console.log('Regular buffer parsing failed, attempting OCR fallback...');
      try {
        return await this.parseWithOCR(buffer, 'uploaded-file.pdf', options.ocrMethod);
      } catch (ocrError) {
        return {
          success: false,
          error: `Both text extraction and OCR failed. Text extraction: ${error.message}, OCR: ${ocrError.message}`,
          text: null,
          metadata: null
        };
      }
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