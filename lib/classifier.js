const OpenAI = require('openai');

class DocumentClassifier {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Document categories mapping
    this.categories = {
      'BA_HALO': 'Kartu Halo',
      'BA_KKB': 'Berita Kehilangan', 
      'BASTB': 'Serah Terima Barang',
      'CHR': 'Checklist Reimbursement HP',
      'COF': 'COF Scan',
      'LOF': 'ICT Loan Form',
      'OOPR': 'Out of Policy Request',
      'SRF': 'SRF Scan',
      'DO': 'Skip'
    };
    
    this.categoryDescriptions = {
      'BA_HALO': 'Kartu Halo (SIM card related documents)',
      'BA_KKB': 'Berita Kehilangan (Loss/missing item reports)',
      'BASTB': 'Serah Terima Barang (Goods handover/delivery documents)',
      'CHR': 'Checklist Reimbursement HP (Phone reimbursement checklists)',
      'COF': 'COF Scan (Checkout Form documents)',
      'LOF': 'ICT Loan Form (ICT equipment loan forms)',
      'OOPR': 'Out of Policy Request (Exception/special requests)',
      'SRF': 'SRF Scan (Service Request Forms)',
      'DO': 'Skip (Delivery orders - mark as skip)'
    };
  }

  /**
   * Classify a document using direct PDF processing with OpenAI Responses API (Base64)
   * @param {Buffer} pdfBuffer - PDF buffer data
   * @param {string} filename - The original filename (optional)
   * @returns {Promise<Object>} Classification result with category and confidence
   */
  async classifyDocumentFromBuffer(pdfBuffer, filename = '') {
    try {
      console.log('🔍 [CLASSIFIER] Starting classification process...');
      console.log(`📄 [CLASSIFIER] Filename: ${filename}`);
      console.log(`📊 [CLASSIFIER] Buffer size: ${pdfBuffer ? pdfBuffer.length : 'undefined'} bytes`);

      if (!pdfBuffer) {
        console.error('❌ [CLASSIFIER] No PDF buffer provided');
        throw new Error('No PDF buffer provided for classification');
      }

      console.log('🔄 [CLASSIFIER] Converting PDF buffer to base64...');
      
      // Convert PDF buffer to base64 string
      const base64String = pdfBuffer.toString('base64');
      console.log(`✅ [CLASSIFIER] Base64 conversion completed. Length: ${base64String.length} characters`);
      
      console.log('📝 [CLASSIFIER] Building classification prompt...');
      const prompt = this.buildClassificationPrompt('', filename);
      console.log(`✅ [CLASSIFIER] Prompt built. Length: ${prompt.length} characters`);
      
      console.log('🤖 [CLASSIFIER] Sending request to OpenAI Responses API...');
      console.log(`🎯 [CLASSIFIER] Model: gpt-4.1`);
      console.log(`📋 [CLASSIFIER] Input type: PDF base64 + text prompt`);
      
      // Use Responses API for direct PDF processing with base64
      const response = await this.openai.responses.create({
        model: 'gpt-4.1',
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_file',
                filename: filename,
                file_data: `data:application/pdf;base64,${base64String}`,
              },
              {
                type: 'input_text',
                text: prompt,
              },
            ],
          },
        ],
      });

      console.log('📥 [CLASSIFIER] Received response from OpenAI');
      console.log(`📄 [CLASSIFIER] Response output_text:`, response.output_text);
      console.log(`🔧 [CLASSIFIER] Full response object:`, JSON.stringify(response, null, 2));

      console.log('🔍 [CLASSIFIER] Parsing classification response...');
      const result = this.parseClassificationResponse(response.output_text);
      console.log(`✅ [CLASSIFIER] Parsed result:`, JSON.stringify(result, null, 2));
      
      // Add category name and description
      result.categoryName = this.categories[result.category] || 'Unknown';
      result.categoryDescription = this.categoryDescriptions[result.category] || 'Unknown category';
      result.filename = filename;
      
      console.log(`🎉 [CLASSIFIER] Classification completed successfully for ${filename}`);
      console.log(`📊 [CLASSIFIER] Final result: ${result.category} (${result.confidence}) - ${result.categoryName}`);
      
      return {
        success: true,
        ...result
      };

    } catch (error) {
      console.error('💥 [CLASSIFIER] Classification error occurred:');
      console.error('❌ [CLASSIFIER] Error message:', error.message);
      console.error('📍 [CLASSIFIER] Error stack:', error.stack);
      console.error('🔧 [CLASSIFIER] Error details:', JSON.stringify(error, null, 2));
      
      const fallbackResult = {
        success: false,
        error: error.message,
        category: 'OOPR', // Default to Out of Policy Request
        categoryName: 'Out of Policy Request',
        requester: 'N/A',
        confidence: 0.1,
        filename: filename
      };
      
      console.log('🔄 [CLASSIFIER] Returning fallback result:', JSON.stringify(fallbackResult, null, 2));
      return fallbackResult;
    }
  }

  /**
   * Classify a document using direct PDF processing with OpenAI Responses API (File Path - Updated for Base64)
   * @param {string} pdfPath - Path to the PDF file
   * @param {string} filename - The original filename (optional)
   * @returns {Promise<Object>} Classification result with category and confidence
   */
  async classifyDocumentFromPDF(pdfPath, filename = '') {
    try {
      if (!pdfPath) {
        throw new Error('No PDF path provided for classification');
      }

      // Read PDF file and convert to buffer
      const fs = require('fs');
      const pdfBuffer = fs.readFileSync(pdfPath);
      
      // Use the new buffer-based method
      return await this.classifyDocumentFromBuffer(pdfBuffer, filename);

    } catch (error) {
      console.error('Classification error:', error);
      return {
        success: false,
        error: error.message,
        category: 'OOPR', // Default to Out of Policy Request
        categoryName: 'Out of Policy Request',
        requester: 'N/A',
        confidence: 0.1,
        filename: filename
      };
    }
  }

  /**
   * Classify a document based on its extracted text (fallback method)
   * @param {string} text - The extracted text from the PDF
   * @param {string} filename - The original filename (optional)
   * @returns {Promise<Object>} Classification result with category and confidence
   */
  async classifyDocument(text, filename = '') {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('No text provided for classification');
      }

      const prompt = this.buildClassificationPrompt(text, filename);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert document classifier for Indonesian business documents. Analyze the provided text and classify it into one of the predefined categories. Respond only with the category code and confidence score in the exact format requested.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 100
      });

      const result = this.parseClassificationResponse(response.choices[0].message.content);
      
      // Add category name and description
      result.categoryName = this.categories[result.category] || 'Unknown';
      result.categoryDescription = this.categoryDescriptions[result.category] || 'Unknown category';
      result.filename = filename;
      
      return {
        success: true,
        ...result
      };

    } catch (error) {
      console.error('Classification error:', error);
      return {
        success: false,
        error: error.message,
        category: 'OOPR', // Default to Out of Policy Request
        categoryName: 'Out of Policy Request',
        requester: 'N/A',
        confidence: 0.1,
        filename: filename
      };
    }
  }

  /**
   * Classify multiple documents in batch using direct PDF processing with buffers
   * @param {Array} documents - Array of {pdfBuffer, filename} objects
   * @returns {Promise<Array>} Array of classification results
   */
  async classifyBatchFromBuffers(documents) {
    const results = [];
    
    for (const doc of documents) {
      try {
        const result = await this.classifyDocumentFromBuffer(doc.pdfBuffer, doc.filename);
        results.push(result);
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error classifying ${doc.filename}:`, error);
        results.push({
          success: false,
          error: error.message,
          category: 'OOPR',
          categoryName: 'Out of Policy Request',
          requester: 'N/A',
          confidence: 0.1,
          filename: doc.filename
        });
      }
    }
    
    return results;
  }

  /**
   * Classify multiple documents in batch using direct PDF processing
   * @param {Array} documents - Array of {pdfPath, filename} objects
   * @returns {Promise<Array>} Array of classification results
   */
  async classifyBatchFromPDF(documents) {
    const results = [];
    
    for (const doc of documents) {
      try {
        const result = await this.classifyDocumentFromPDF(doc.pdfPath, doc.filename);
        results.push(result);
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error classifying ${doc.filename}:`, error);
        results.push({
          success: false,
          error: error.message,
          category: 'OOPR',
          categoryName: 'Out of Policy Request',
          requester: 'N/A',
          confidence: 0.1,
          filename: doc.filename
        });
      }
    }
    
    return results;
  }

  /**
   * Classify multiple documents in batch (fallback method using extracted text)
   * @param {Array} documents - Array of {text, filename} objects
   * @returns {Promise<Array>} Array of classification results
   */
  async classifyBatch(documents) {
    const results = [];
    
    for (const doc of documents) {
      try {
        const result = await this.classifyDocument(doc.text, doc.filename);
        results.push(result);
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error classifying ${doc.filename}:`, error);
        results.push({
          success: false,
          error: error.message,
          category: 'OOPR',
          categoryName: 'Out of Policy Request',
          requester: 'N/A',
          confidence: 0.1,
          filename: doc.filename
        });
      }
    }
    
    return results;
  }

  /**
   * Build the classification prompt
   * @param {string} text - Document text (optional for PDF-direct processing)
   * @param {string} filename - Filename
   * @returns {string} Formatted prompt
   */
  buildClassificationPrompt(text = '', filename) {
    const basePrompt = `Klasifikasikan dokumen bisnis Indonesia ini ke dalam salah satu kategori berikut dan ekstrak nama pemohon/requester jika tersedia:

KATEGORI YANG TERSEDIA:
1. BA_HALO - Kartu Halo (SIM card related documents)
2. BA_KKB - Berita Kehilangan (Loss/missing item reports)
3. BASTB - Serah Terima Barang (Goods handover/delivery documents)
4. CHR - Checklist Reimbursement HP (Phone reimbursement checklists)
5. COF - COF Scan (Checkout Form documents)
6. LOF - ICT Loan Form (ICT equipment loan forms)
7. OOPR - Out of Policy Request (Exception/special requests)
8. SRF - SRF Scan (Service Request Forms)
9. DO - Skip (Delivery orders - mark as skip)

NAMA FILE: ${filename}

INSTRUKSI:
- Analisis konten dokumen dengan teliti (baik teks maupun visual)
- Pilih kategori yang paling sesuai berdasarkan isi dokumen
- Ekstrak nama pemohon/requester dari dokumen (cari field seperti "Nama", "Pemohon", "Requester", "Diajukan oleh", "Nama Karyawan", dll.)
- Berikan tingkat kepercayaan (0.1-1.0)
- Jika tidak yakin atau tidak cocok dengan kategori manapun, pilih OOPR
- Jika nama pemohon tidak ditemukan, tulis "N/A"

RESPONS DALAM FORMAT:
KATEGORI: [KODE_KATEGORI]
REQUESTER: [NAMA_PEMOHON atau N/A]
CONFIDENCE: [0.1-1.0]

Contoh:
KATEGORI: COF
REQUESTER: John Doe
CONFIDENCE: 0.85

Atau jika nama tidak ditemukan:
KATEGORI: SRF
REQUESTER: N/A
CONFIDENCE: 0.92`;

    // If text is provided (fallback method), include it in the prompt
    if (text && text.trim().length > 0) {
      return basePrompt + `

TEKS DOKUMEN:
${text.substring(0, 2000)}${text.length > 2000 ? '...' : ''}`;
    }

    return basePrompt;
  }

  /**
   * Parse the classification response from OpenAI
   * @param {string} response - Raw response from OpenAI
   * @returns {Object} Parsed result
   */
  parseClassificationResponse(response) {
    try {
      console.log('🔍 [PARSER] Starting response parsing...');
      console.log(`📄 [PARSER] Raw response:`, response);
      console.log(`📊 [PARSER] Response type:`, typeof response);
      console.log(`📏 [PARSER] Response length:`, response ? response.length : 'undefined');

      if (!response) {
        console.error('❌ [PARSER] Response is null or undefined');
        return { category: 'OOPR', requester: 'N/A', confidence: 0.1 };
      }

      const lines = response.trim().split('\n');
      console.log(`📋 [PARSER] Split into ${lines.length} lines:`, lines);
      
      let category = 'OOPR';
      let requester = 'N/A';
      let confidence = 0.1;

      console.log('🔍 [PARSER] Searching for KATEGORI, REQUESTER, and CONFIDENCE...');
      
      for (const line of lines) {
        console.log(`🔎 [PARSER] Processing line: "${line}"`);
        
        if (line.includes('KATEGORI:')) {
          console.log('✅ [PARSER] Found KATEGORI line');
          const match = line.match(/KATEGORI:\s*([A-Z_]+)/i);
          if (match) {
            category = match[1].toUpperCase();
            console.log(`📝 [PARSER] Extracted category: ${category}`);
          } else {
            console.log('❌ [PARSER] Could not extract category from line');
          }
        }
        
        if (line.includes('REQUESTER:')) {
          console.log('✅ [PARSER] Found REQUESTER line');
          const match = line.match(/REQUESTER:\s*(.+)/i);
          if (match) {
            requester = match[1].trim();
            console.log(`👤 [PARSER] Extracted requester: ${requester}`);
          } else {
            console.log('❌ [PARSER] Could not extract requester from line');
          }
        }
        
        if (line.includes('CONFIDENCE:')) {
          console.log('✅ [PARSER] Found CONFIDENCE line');
          const match = line.match(/CONFIDENCE:\s*([\d.]+)/);
          if (match) {
            confidence = parseFloat(match[1]);
            console.log(`📊 [PARSER] Extracted confidence: ${confidence}`);
          } else {
            console.log('❌ [PARSER] Could not extract confidence from line');
          }
        }
      }

      console.log(`🔍 [PARSER] Before validation - Category: ${category}, Requester: ${requester}, Confidence: ${confidence}`);

      // Validate category
      console.log('🔍 [PARSER] Validating category against available categories...');
      console.log(`📋 [PARSER] Available categories:`, Object.keys(this.categories));
      
      if (!this.categories[category]) {
        console.log(`❌ [PARSER] Category "${category}" not found in available categories, defaulting to OOPR`);
        category = 'OOPR';
        confidence = Math.min(confidence, 0.3);
      } else {
        console.log(`✅ [PARSER] Category "${category}" is valid`);
      }

      // Clean up requester name
      if (!requester || requester.toLowerCase() === 'n/a' || requester.trim() === '') {
        requester = 'N/A';
      }

      // Ensure confidence is within valid range
      const originalConfidence = confidence;
      confidence = Math.max(0.1, Math.min(1.0, confidence));
      if (originalConfidence !== confidence) {
        console.log(`🔧 [PARSER] Confidence adjusted from ${originalConfidence} to ${confidence}`);
      }

      const finalResult = { category, requester, confidence };
      console.log(`🎉 [PARSER] Final parsed result:`, finalResult);
      
      return finalResult;
      
    } catch (error) {
      console.error('💥 [PARSER] Error parsing classification response:');
      console.error('❌ [PARSER] Error message:', error.message);
      console.error('📍 [PARSER] Error stack:', error.stack);
      console.error('🔧 [PARSER] Error details:', JSON.stringify(error, null, 2));
      
      const fallbackResult = { category: 'OOPR', requester: 'N/A', confidence: 0.1 };
      console.log('🔄 [PARSER] Returning fallback result:', fallbackResult);
      return fallbackResult;
    }
  }

  /**
   * Get all available categories
   * @returns {Object} Categories mapping
   */
  getCategories() {
    return this.categories;
  }

  /**
   * Get category descriptions
   * @returns {Object} Category descriptions
   */
  getCategoryDescriptions() {
    return this.categoryDescriptions;
  }

  /**
   * Get classification statistics
   * @param {Array} results - Array of classification results
   * @returns {Object} Statistics
   */
  getClassificationStats(results) {
    const stats = {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      averageConfidence: 0,
      categoryDistribution: {},
      confidenceDistribution: {
        high: 0,    // >= 0.8
        medium: 0,  // 0.5 - 0.79
        low: 0      // < 0.5
      }
    };

    const successfulResults = results.filter(r => r.success);
    
    if (successfulResults.length > 0) {
      // Calculate average confidence
      const totalConfidence = successfulResults.reduce((sum, r) => sum + r.confidence, 0);
      stats.averageConfidence = totalConfidence / successfulResults.length;

      // Category distribution
      successfulResults.forEach(result => {
        const category = result.category;
        stats.categoryDistribution[category] = (stats.categoryDistribution[category] || 0) + 1;
      });

      // Confidence distribution
      successfulResults.forEach(result => {
        if (result.confidence >= 0.8) {
          stats.confidenceDistribution.high++;
        } else if (result.confidence >= 0.5) {
          stats.confidenceDistribution.medium++;
        } else {
          stats.confidenceDistribution.low++;
        }
      });
    }

    return stats;
  }
}

module.exports = DocumentClassifier;