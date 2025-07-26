require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PDFParser = require('./lib/pdfParser');

const app = express();
const port = process.env.PORT || 3000;

// Initialize PDF parser
const pdfParser = new PDFParser();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PDF Text Parser</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            padding: 40px;
            max-width: 600px;
            width: 100%;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .header h1 {
            color: #333;
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .header p {
            color: #666;
            font-size: 1.1em;
        }
        
        .upload-area {
            border: 3px dashed #667eea;
            border-radius: 15px;
            padding: 40px;
            text-align: center;
            margin-bottom: 20px;
            transition: all 0.3s ease;
            cursor: pointer;
        }
        
        .upload-area:hover {
            border-color: #764ba2;
            background-color: #f8f9ff;
        }
        
        .upload-area.dragover {
            border-color: #764ba2;
            background-color: #f0f4ff;
        }
        
        .upload-icon {
            font-size: 3em;
            color: #667eea;
            margin-bottom: 15px;
        }
        
        .upload-text {
            color: #333;
            font-size: 1.2em;
            margin-bottom: 10px;
        }
        
        .upload-subtext {
            color: #666;
            font-size: 0.9em;
        }
        
        #fileInput {
            display: none;
        }
        
        .btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 25px;
            font-size: 1em;
            cursor: pointer;
            transition: all 0.3s ease;
            margin: 10px 5px;
        }
        
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        }
        
        .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        
        .result {
            margin-top: 30px;
            padding: 20px;
            border-radius: 10px;
            display: none;
        }
        
        .result.success {
            background-color: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
        }
        
        .result.error {
            background-color: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
        }
        
        .loading {
            display: none;
            text-align: center;
            margin: 20px 0;
        }
        
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .metadata {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
        }
        
        .metadata h4 {
            color: #333;
            margin-bottom: 10px;
        }
        
        .metadata-item {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
            padding: 5px 0;
            border-bottom: 1px solid #eee;
        }
        
        .text-preview {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
            max-height: 300px;
            overflow-y: auto;
            font-family: monospace;
            font-size: 0.9em;
            line-height: 1.4;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📄 PDF Text Parser</h1>
            <p>Upload a PDF file to extract text content</p>
        </div>
        
        <form id="uploadForm" enctype="multipart/form-data">
            <div class="upload-area" onclick="document.getElementById('fileInput').click()">
                <div class="upload-icon">📁</div>
                <div class="upload-text">Click to select PDF file</div>
                <div class="upload-subtext">or drag and drop here (max 10MB)</div>
                <input type="file" id="fileInput" name="pdf" accept=".pdf" required>
            </div>
            
            <div style="margin: 20px 0; text-align: center;">
                <label for="ocrMethod" style="display: block; margin-bottom: 10px; color: #333; font-weight: bold;">
                    🔍 OCR Method (for scanned PDFs):
                </label>
                <select id="ocrMethod" name="ocrMethod" style="padding: 10px; border: 2px solid #667eea; border-radius: 8px; font-size: 1em; background: white; min-width: 200px;">
                    <option value="tesseract">🔤 Tesseract (Offline)</option>
                    <option value="openai">🤖 OpenAI Vision (Online)</option>
                    <option value="openai-responses">🚀 OpenAI Responses API (Direct PDF)</option>
                </select>
                <div style="margin-top: 8px; font-size: 0.9em; color: #666;">
                    Choose OCR method for extracting text from scanned documents
                </div>
            </div>
            
            <div style="text-align: center;">
                <button type="submit" class="btn">Parse PDF</button>
                <button type="button" class="btn" onclick="clearResult()">Clear</button>
            </div>
        </form>
        
        <div class="loading" id="loading">
            <div class="spinner"></div>
            <p>Processing PDF...</p>
        </div>
        
        <div class="result" id="result"></div>
    </div>

    <script>
        // Global variable to store parsed text
        let lastParsedText = '';
        
        const uploadArea = document.querySelector('.upload-area');
        const fileInput = document.getElementById('fileInput');
        const uploadForm = document.getElementById('uploadForm');
        const loading = document.getElementById('loading');
        const result = document.getElementById('result');

        // Drag and drop functionality
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type === 'application/pdf') {
                fileInput.files = files;
                updateFileName(files[0].name);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                updateFileName(e.target.files[0].name);
            }
        });

        function updateFileName(fileName) {
            const uploadText = document.querySelector('.upload-text');
            uploadText.textContent = fileName;
        }

        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData();
            const file = fileInput.files[0];
            const ocrMethod = document.getElementById('ocrMethod').value;
            
            if (!file) {
                showResult('Please select a PDF file', 'error');
                return;
            }
            
            formData.append('pdf', file);
            formData.append('ocrMethod', ocrMethod);
            
            loading.style.display = 'block';
            result.style.display = 'none';
            
            try {
                const response = await fetch('/upload', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Store the parsed text for download
                    lastParsedText = data.text;
                    console.log('Text stored for download:', { 
                        textLength: lastParsedText.length, 
                        preview: lastParsedText.substring(0, 100) + '...' 
                    });
                    showResult(formatSuccessResult(data), 'success');
                } else {
                    showResult('Error: ' + data.error, 'error');
                }
            } catch (error) {
                showResult('Upload failed: ' + error.message, 'error');
            } finally {
                loading.style.display = 'none';
            }
        });

        function showResult(content, type) {
            result.innerHTML = content;
            result.className = 'result ' + type;
            result.style.display = 'block';
        }

        function formatSuccessResult(data) {
            const stats = data.stats;
            const metadata = data.metadata;
            const method = data.method || 'text-extraction';
            
            let methodIcon, methodText, additionalInfo = '';
            
            switch(method) {
                case 'tesseract':
                    methodIcon = '🔤';
                    methodText = 'Tesseract OCR (Offline)';
                    break;
                case 'openai':
                    methodIcon = '🤖';
                    methodText = 'OpenAI Vision OCR (Online)';
                    break;
                case 'openai-responses':
                    methodIcon = '🚀';
                    methodText = 'OpenAI Responses API (Direct PDF)';
                    break;
                case 'ocr':
                    methodIcon = '🔍';
                    methodText = 'OCR (Optical Character Recognition)';
                    break;
                case 'ocr-unavailable':
                    methodIcon = '⚠️';
                    methodText = 'OCR Not Available';
                    additionalInfo = '<div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 15px 0;">' +
                        '<h4 style="color: #856404; margin-bottom: 10px;">📋 OCR Information</h4>' +
                        '<p style="color: #856404; margin: 5px 0;"><strong>Note:</strong> ' + metadata.note + '</p>' +
                        '<p style="color: #856404; margin: 5px 0;"><strong>Suggestion:</strong> ' + metadata.suggestion + '</p>' +
                        '</div>';
                    break;
                case 'ocr-failed':
                    methodIcon = '❌';
                    methodText = 'OCR Failed';
                    additionalInfo = '<div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 8px; margin: 15px 0;">' +
                        '<h4 style="color: #721c24; margin-bottom: 10px;">⚠️ OCR Error</h4>' +
                        '<p style="color: #721c24; margin: 5px 0;">' + metadata.note + '</p>' +
                        '</div>';
                    break;
                default:
                    methodIcon = '📄';
                    methodText = 'Direct Text Extraction';
            }
            
            return \`
                <h3>✅ PDF Processed Successfully!</h3>
                
                <div class="metadata">
                    <h4>📊 Document Information</h4>
                    <div class="metadata-item">
                        <span>File Name:</span>
                        <span>\${metadata.fileName}</span>
                    </div>
                    \${metadata.pages ? \`
                    <div class="metadata-item">
                        <span>Pages:</span>
                        <span>\${metadata.pages}</span>
                    </div>
                    \` : ''}
                    <div class="metadata-item">
                        <span>File Size:</span>
                        <span>\${formatFileSize(metadata.fileSize)}</span>
                    </div>
                    <div class="metadata-item">
                        <span>Processing Method:</span>
                        <span>\${methodIcon} \${methodText}</span>
                    </div>
                    \${(method === 'ocr' || method === 'openai' || method === 'openai-responses') && metadata.ocrEngine ? \`
                    <div class="metadata-item">
                        <span>OCR Engine:</span>
                        <span>\${metadata.ocrEngine}</span>
                    </div>
                    \` : ''}
                </div>
                
                \${additionalInfo}
                
                \${stats.characters > 0 ? \`
                <div class="metadata">
                    <h4>📈 Text Statistics</h4>
                    <div class="metadata-item">
                        <span>Characters:</span>
                        <span>\${stats.characters.toLocaleString()}</span>
                    </div>
                    <div class="metadata-item">
                        <span>Words:</span>
                        <span>\${stats.words.toLocaleString()}</span>
                    </div>
                    <div class="metadata-item">
                        <span>Sentences:</span>
                        <span>\${stats.sentences.toLocaleString()}</span>
                    </div>
                    <div class="metadata-item">
                        <span>Paragraphs:</span>
                        <span>\${stats.paragraphs.toLocaleString()}</span>
                    </div>
                </div>
                
                <div class="text-preview">
                    <h4>📝 Text Preview (first 1000 characters):</h4>
                    <pre>\${data.text.substring(0, 1000)}\${data.text.length > 1000 ? '...' : ''}</pre>
                </div>
                
                <div style="text-align: center; margin-top: 20px;">
                    <button class="btn" onclick="downloadText(event)">Download Full Text</button>
                </div>
                \` : \`
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 15px 0; text-align: center;">
                    <h4 style="color: #6c757d;">📄 No Text Content Available</h4>
                    <p style="color: #6c757d;">This PDF appears to contain images or scanned content without extractable text.</p>
                </div>
                \`}
            \`;
        }

        function formatFileSize(bytes) {
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            if (bytes === 0) return '0 Bytes';
            const i = Math.floor(Math.log(bytes) / Math.log(1024));
            return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
        }

        function clearResult() {
            result.style.display = 'none';
            fileInput.value = '';
            lastParsedText = ''; // Clear the stored text
            document.querySelector('.upload-text').textContent = 'Click to select PDF file';
        }

        function downloadText(event) {
            console.log('downloadText called', { lastParsedText: !!lastParsedText, textLength: lastParsedText.length });
            
            if (!lastParsedText) {
                alert('No text available for download. Please parse a PDF file first.');
                return;
            }
            
            try {
                const blob = new Blob([lastParsedText], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'extracted_text.txt';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                console.log('Download completed successfully');
                
                // Show success message
                const button = event ? event.target : document.querySelector('button[onclick="downloadText(event)"]');
                if (button) {
                    const originalText = button.textContent;
                    button.textContent = 'Downloaded!';
                    button.style.backgroundColor = '#28a745';
                    setTimeout(() => {
                        button.textContent = originalText;
                        button.style.backgroundColor = '';
                    }, 2000);
                }
            } catch (error) {
                console.error('Download error:', error);
                alert('Failed to download text. Please try again.');
            }
        }

        // Store the last parsed text for download
        window.setLastParsedText = function(text) {
            lastParsedText = text;
        };
    </script>
</body>
</html>
  `);
});

// Upload and parse PDF endpoint
app.post('/upload', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No PDF file uploaded'
      });
    }

    const filePath = req.file.path;
    const ocrMethod = req.body.ocrMethod || 'tesseract'; // Default to tesseract
    console.log('Processing PDF file:', filePath, 'with OCR method:', ocrMethod);
    
    const result = await pdfParser.parseFile(filePath, { ocrMethod });
    console.log('Parse result:', { 
      success: result.success, 
      textLength: result.text ? result.text.length : 0,
      textPreview: result.text ? result.text.substring(0, 100) + '...' : 'No text',
      method: result.method
    });

    if (result.success) {
      const stats = pdfParser.getTextStats(result.text);
      
      const response = {
        success: true,
        text: result.text,
        method: result.method || 'text-extraction',
        metadata: result.metadata,
        stats: stats
      };
      
      console.log('Sending response with text length:', response.text.length);
      res.json(response);
    } else {
      console.log('Parse failed:', result.error);
      res.status(400).json({
        success: false,
        error: result.error
      });
    }

    // Clean up uploaded file
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting file:', err);
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API endpoint for parsing PDF from buffer
app.post('/api/parse', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No PDF file provided'
      });
    }

    const ocrMethod = req.body.ocrMethod || 'tesseract'; // Default to tesseract
    const result = await pdfParser.parseBuffer(req.file.buffer, { ocrMethod });
    
    if (result.success) {
      const stats = pdfParser.getTextStats(result.text);
      res.json({
        success: true,
        text: result.text,
        method: result.method || 'text-extraction',
        metadata: result.metadata,
        stats: stats
      });
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('API parse error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 10MB.'
      });
    }
  }
  
  res.status(500).json({
    success: false,
    error: error.message
  });
});

// Start server
app.listen(port, () => {
  console.log(`
🚀 PDF Text Parser Server Started!

📍 Server running at: http://localhost:${port}
📄 Web interface: http://localhost:${port}
🔗 API endpoint: http://localhost:${port}/api/parse
❤️  Health check: http://localhost:${port}/health

Features:
✅ Web-based PDF upload and parsing
✅ REST API for programmatic access
✅ Text statistics and metadata extraction
✅ File size limit: 10MB
✅ Automatic cleanup of uploaded files

Press Ctrl+C to stop the server
  `);
});