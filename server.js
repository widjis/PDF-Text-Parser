require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PDFParser = require('./lib/pdfParser');
const DocumentClassifier = require('./lib/classifier');
const FileOrganizer = require('./lib/fileOrganizer');

const app = express();
const port = process.env.PORT || 3000;

// Initialize modules
const pdfParser = new PDFParser();
const classifier = new DocumentClassifier();
const fileOrganizer = new FileOrganizer();

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
app.use(express.json({ limit: '50mb' })); // Increased limit for base64 PDF files
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

// Routes
app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-form.html'));
});

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
        
        .tab-navigation {
            display: flex;
            justify-content: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #eee;
        }
        
        .tab-btn {
            background: #f8f9fa;
            color: #666;
            border: none;
            padding: 15px 30px;
            font-size: 1.1em;
            cursor: pointer;
            transition: all 0.3s ease;
            border-radius: 10px 10px 0 0;
            margin: 0 5px;
            border-bottom: 3px solid transparent;
        }
        
        .tab-btn.active {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-bottom: 3px solid #764ba2;
        }
        
        .tab-btn:hover {
            background: #e9ecef;
            color: #333;
        }
        
        .tab-btn.active:hover {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        
        .tab-content {
            display: none;
        }
        
        .tab-content.active {
            display: block;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>PDF Text Parser</h1>
            <p>Extract text from PDFs or classify documents with AI</p>
        </div>
        
        <!-- Tab Navigation -->
        <div class="tab-navigation">
            <button class="tab-btn active" onclick="showTab('extract')" id="extractTab">
                Extract Text
            </button>
            <button class="tab-btn" onclick="showTab('classify')" id="classifyTab">
                Classify Documents
            </button>
        </div>
        
        <!-- Extract Text Tab -->
        <div id="extractContent" class="tab-content active">
            <form id="uploadForm" enctype="multipart/form-data">
                <div class="upload-area" onclick="document.getElementById('fileInput').click()">
                    <div class="upload-icon">FILE</div>
                    <div class="upload-text">Click to select PDF file</div>
                    <div class="upload-subtext">or drag and drop here (max 10MB)</div>
                    <input type="file" id="fileInput" name="pdf" accept=".pdf" required>
                </div>
                
                <div style="margin: 20px 0; text-align: center;">
                    <label for="ocrMethod" style="display: block; margin-bottom: 10px; color: #333; font-weight: bold;">
                        OCR Method (for scanned PDFs):
                    </label>
                    <select id="ocrMethod" name="ocrMethod" style="padding: 10px; border: 2px solid #667eea; border-radius: 8px; font-size: 1em; background: white; min-width: 200px;">
                        <option value="tesseract">Tesseract (Offline)</option>
                        <option value="openai">OpenAI Vision (Online)</option>
                        <option value="openai-responses">OpenAI Responses API (Direct PDF)</option>
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
        
        <!-- Classify Documents Tab -->
        <div id="classifyContent" class="tab-content">
            <form id="classifyForm" enctype="multipart/form-data">
                <div class="upload-area" onclick="document.getElementById('classifyFileInput').click()">
                    <div class="upload-icon">CLASSIFY</div>
                    <div class="upload-text">Click to select PDF files for classification</div>
                    <div class="upload-subtext">or drag and drop multiple files here (max 10MB each)</div>
                    <input type="file" id="classifyFileInput" name="pdfs" accept=".pdf" multiple required>
                </div>
                
                <div style="text-align: center;">
                    <button type="submit" class="btn">Classify Documents</button>
                    <button type="button" class="btn" onclick="clearClassifyResult()">Clear</button>
                </div>
            </form>
            
            <div class="loading" id="classifyLoading">
                <div class="spinner"></div>
                <p>Classifying documents...</p>
            </div>
            
            <div class="result" id="classifyResult"></div>
        </div>
    </div>

    <script>
        // Tab functionality
        function showTab(tabName) {
            const extractTab = document.getElementById('extractTab');
            const classifyTab = document.getElementById('classifyTab');
            const extractContent = document.getElementById('extractContent');
            const classifyContent = document.getElementById('classifyContent');
            
            // Remove active class from all tabs and content
            extractTab.classList.remove('active');
            classifyTab.classList.remove('active');
            extractContent.classList.remove('active');
            classifyContent.classList.remove('active');
            
            // Add active class to selected tab and content
            if (tabName === 'extract') {
                extractTab.classList.add('active');
                extractContent.classList.add('active');
            } else if (tabName === 'classify') {
                classifyTab.classList.add('active');
                classifyContent.classList.add('active');
            }
        }
        
        // Initialize with extract tab active
        showTab('extract');
    </script>

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
                    methodIcon = 'OCR';
                    methodText = 'Tesseract OCR (Offline)';
                    break;
                case 'openai':
                    methodIcon = 'AI';
                    methodText = 'OpenAI Vision OCR (Online)';
                    break;
                case 'openai-responses':
                    methodIcon = 'API';
                    methodText = 'OpenAI Responses API (Direct PDF)';
                    break;
                case 'ocr':
                    methodIcon = 'OCR';
                    methodText = 'OCR (Optical Character Recognition)';
                    break;
                case 'ocr-unavailable':
                    methodIcon = 'WARNING';
                    methodText = 'OCR Not Available';
                    additionalInfo = '<div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 15px 0;">' +
                        '<h4 style="color: #856404; margin-bottom: 10px;">OCR Information</h4>' +
                        '<p style="color: #856404; margin: 5px 0;"><strong>Note:</strong> ' + metadata.note + '</p>' +
                        '<p style="color: #856404; margin: 5px 0;"><strong>Suggestion:</strong> ' + metadata.suggestion + '</p>' +
                        '</div>';
                    break;
                case 'ocr-failed':
                    methodIcon = 'ERROR';
                    methodText = 'OCR Failed';
                    additionalInfo = '<div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 8px; margin: 15px 0;">' +
                        '<h4 style="color: #721c24; margin-bottom: 10px;">OCR Error</h4>' +
                        '<p style="color: #721c24; margin: 5px 0;">' + metadata.note + '</p>' +
                        '</div>';
                    break;
                default:
                    methodIcon = 'TEXT';
                    methodText = 'Direct Text Extraction';
            }
            
            return '<h3>PDF Processed Successfully!</h3>' +
                '<div class="metadata">' +
                    '<h4>Document Information</h4>' +
                    '<div class="metadata-item">' +
                        '<span>File Name:</span>' +
                        '<span>' + metadata.fileName + '</span>' +
                    '</div>' +
                    (metadata.pages ? 
                        '<div class="metadata-item">' +
                            '<span>Pages:</span>' +
                            '<span>' + metadata.pages + '</span>' +
                        '</div>' : '') +
                    '<div class="metadata-item">' +
                        '<span>File Size:</span>' +
                        '<span>' + formatFileSize(metadata.fileSize) + '</span>' +
                    '</div>' +
                    '<div class="metadata-item">' +
                        '<span>Processing Method:</span>' +
                        '<span>' + methodIcon + ' ' + methodText + '</span>' +
                    '</div>' +
                    ((method === 'ocr' || method === 'openai' || method === 'openai-responses') && metadata.ocrEngine ? 
                        '<div class="metadata-item">' +
                            '<span>OCR Engine:</span>' +
                            '<span>' + metadata.ocrEngine + '</span>' +
                        '</div>' : '') +
                '</div>' +
                additionalInfo +
                (stats.characters > 0 ? 
                    '<div class="metadata">' +
                        '<h4>Text Statistics</h4>' +
                        '<div class="metadata-item">' +
                            '<span>Characters:</span>' +
                            '<span>' + stats.characters.toLocaleString() + '</span>' +
                        '</div>' +
                        '<div class="metadata-item">' +
                            '<span>Words:</span>' +
                            '<span>' + stats.words.toLocaleString() + '</span>' +
                        '</div>' +
                        '<div class="metadata-item">' +
                            '<span>Sentences:</span>' +
                            '<span>' + stats.sentences.toLocaleString() + '</span>' +
                        '</div>' +
                        '<div class="metadata-item">' +
                            '<span>Paragraphs:</span>' +
                            '<span>' + stats.paragraphs.toLocaleString() + '</span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="text-preview">' +
                        '<h4>Text Preview (first 1000 characters):</h4>' +
                        '<pre>' + data.text.substring(0, 1000) + (data.text.length > 1000 ? '...' : '') + '</pre>' +
                    '</div>' +
                    '<div style="text-align: center; margin-top: 20px;">' +
                        '<button class="btn" onclick="downloadText(event)">Download Full Text</button>' +
                    '</div>' :
                    '<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 15px 0; text-align: center;">' +
                        '<h4 style="color: #6c757d;">No Text Content Available</h4>' +
                        '<p style="color: #6c757d;">This PDF appears to contain images or scanned content without extractable text.</p>' +
                    '</div>');
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

        // Classification functionality
        const classifyForm = document.getElementById('classifyForm');
        const classifyFileInput = document.getElementById('classifyFileInput');
        const classifyLoading = document.getElementById('classifyLoading');
        const classifyResult = document.getElementById('classifyResult');

        // Classification form submission
        classifyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const files = classifyFileInput.files;
            
            if (files.length === 0) {
                showClassifyResult('Please select PDF files for classification', 'error');
                return;
            }
            
            classifyLoading.style.display = 'block';
            classifyResult.style.display = 'none';
            
            try {
                // Convert files to base64
                console.log('[FRONTEND] Converting files to base64...');
                const documents = [];
                
                for (let file of files) {
                    console.log('[FRONTEND] Processing file: ' + file.name + ' (' + file.size + ' bytes)');
                    
                    const base64Data = await fileToBase64(file);
                    documents.push({
                        base64Data: base64Data,
                        filename: file.name
                    });
                }
                
                console.log('[FRONTEND] Converted ' + documents.length + ' files to base64');
                console.log('[FRONTEND] Sending base64 data to server...');
                
                // Send base64 data to the new endpoint
                const response = await fetch('/api/classify-batch-base64', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ documents })
                });
                
                const data = await response.json();
                
                if (response.ok && data.success) {
                    console.log('[FRONTEND] Classification successful');
                    showClassifyResult(formatClassificationResult(data), 'success');
                } else {
                    console.error('[FRONTEND] Classification failed:', data.error);
                    
                    // Handle specific error types
                    let errorMessage = data.error || 'Unknown error occurred';
                    
                    if (response.status === 413 || errorMessage.includes('too large')) {
                        errorMessage = 'Files too large! Please try:\\n• Reducing file sizes\\n• Selecting fewer files\\n• Using files smaller than 10MB each';
                    } else if (response.status === 500) {
                        errorMessage = 'Server error occurred. Please try again or contact support.';
                    }
                    
                    showClassifyResult('Error: ' + errorMessage, 'error');
                }
            } catch (error) {
                console.error('[FRONTEND] Classification error:', error);
                
                let errorMessage = error.message;
                
                if (error.message.includes('Failed to fetch')) {
                    errorMessage = 'Network error. Please check your connection and try again.';
                } else if (error.message.includes('request entity too large')) {
                    errorMessage = 'Files too large! Please reduce file sizes or select fewer files.';
                }
                
                showClassifyResult('Classification failed: ' + errorMessage, 'error');
            } finally {
                classifyLoading.style.display = 'none';
            }
        });

        // Helper function to convert file to base64
        function fileToBase64(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    // Remove the data URL prefix to get pure base64
                    const base64 = reader.result.split(',')[1];
                    resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }

        function showClassifyResult(content, type) {
            classifyResult.innerHTML = content;
            classifyResult.className = 'result ' + type;
            classifyResult.style.display = 'block';
        }

        function clearClassifyResult() {
            classifyResult.style.display = 'none';
            classifyFileInput.value = '';
            document.querySelector('#classifyContent .upload-text').textContent = 'Click to select PDF files for classification';
        }

        function formatClassificationResult(data) {
            const results = data.results;
            const stats = data.statistics;
            
            let resultHtml = '<h3>Classification Complete!</h3>' +
                '<div class="metadata">' +
                    '<h4>Classification Summary</h4>' +
                    '<div class="metadata-item">' +
                        '<span>Total Documents:</span>' +
                        '<span>' + stats.totalDocuments + '</span>' +
                    '</div>' +
                    '<div class="metadata-item">' +
                        '<span>Successfully Classified:</span>' +
                        '<span>' + stats.successfulClassifications + '</span>' +
                    '</div>' +
                    '<div class="metadata-item">' +
                        '<span>Failed Classifications:</span>' +
                        '<span>' + stats.failedClassifications + '</span>' +
                    '</div>' +
                    '<div class="metadata-item">' +
                        '<span>Processing Time:</span>' +
                        '<span>' + stats.processingTime + '</span>' +
                    '</div>' +
                '</div>' +
                '<div class="metadata">' +
                    '<h4>Classification Results</h4>';
            
            results.forEach(result => {
                const statusIcon = result.success ? 'SUCCESS' : 'FAILED';
                const category = result.success ? result.category : 'Failed';
                const confidence = result.success ? Math.round(result.confidence * 100) + '%' : 'N/A';
                
                resultHtml += '<div class="metadata-item">' +
                    '<span>' + statusIcon + ' ' + result.filename + '</span>' +
                    '<span>' + category + ' (' + confidence + ')</span>' +
                '</div>';
            });
            
            resultHtml += '</div>';
            
            if (stats.categoryBreakdown) {
                resultHtml += '<div class="metadata">' +
                    '<h4>Category Breakdown</h4>';
                
                Object.entries(stats.categoryBreakdown).forEach(([category, count]) => {
                    resultHtml += '<div class="metadata-item">' +
                        '<span>' + category + ':</span>' +
                        '<span>' + count + ' documents</span>' +
                    '</div>';
                });
                
                resultHtml += '</div>';
            }
            
            return resultHtml;
        }
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

// Classification endpoints
app.post('/api/classify', upload.single('pdf'), async (req, res) => {
  try {
    console.log('[SERVER] Classification request received');
        console.log(`[SERVER] File info:`, req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    } : 'No file');

    if (!req.file) {
      console.error('[SERVER] No PDF file provided in request');
      return res.status(400).json({
        success: false,
        error: 'No PDF file provided'
      });
    }

    console.log('[SERVER] Reading file buffer...');
    // Read file buffer directly instead of using file path
    const pdfBuffer = fs.readFileSync(req.file.path);
    console.log(`[SERVER] File buffer read successfully. Size: ${pdfBuffer.length} bytes`);
    
    console.log('[SERVER] Calling classifier.classifyDocumentFromBuffer...');
    const result = await classifier.classifyDocumentFromBuffer(pdfBuffer, req.file.originalname);
    console.log(`[SERVER] Classification result received:`, JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('[SERVER] Classification successful, sending response');
      res.json(result);
    } else {
      console.error('[SERVER] Classification failed, sending error response');
      res.status(400).json(result);
    }

    // Clean up uploaded file
    console.log('[SERVER] Cleaning up uploaded file...');
    fs.unlink(req.file.path, (err) => {
      if (err) {
        console.error('[SERVER] Error deleting file:', err);
      } else {
        console.log('[SERVER] File cleanup completed');
      }
    });

  } catch (error) {
    console.error('[SERVER] Classification endpoint error:');
    console.error('[SERVER] Error message:', error.message);
    console.error('[SERVER] Error stack:', error.stack);
    console.error('[SERVER] Error details:', JSON.stringify(error, null, 2));
    
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Pure Base64 Batch classification endpoint (no file uploads)
app.post('/api/classify-batch-base64', express.json({ limit: '50mb' }), async (req, res) => {
  try {
    console.log('[SERVER] Base64 batch classification request received');
    console.log(`[SERVER] Request body type:`, typeof req.body);
    
    const { documents } = req.body;
    
    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      console.log('[SERVER] No documents provided or invalid format');
      return res.status(400).json({
        success: false,
        error: 'No PDF documents provided. Expected format: { documents: [{ base64Data, filename }] }'
      });
    }

    console.log(`[SERVER] Number of documents: ${documents.length}`);
    
    // Check payload size
    const payloadSize = JSON.stringify(req.body).length;
    console.log(`[SERVER] Total payload size: ${(payloadSize / 1024 / 1024).toFixed(2)} MB`);
    
    if (payloadSize > 50 * 1024 * 1024) { // 50MB limit
      console.log('[SERVER] Payload too large');
      return res.status(413).json({
        success: false,
        error: 'Payload too large. Maximum size is 50MB. Consider reducing file size or number of files.'
      });
    }

    const startTime = Date.now();

    // Convert base64 data to buffers
    const documentsWithBuffers = documents.map((doc, index) => {
      console.log(`[SERVER] Processing document ${index + 1}: ${doc.filename}`);
      
      if (!doc.base64Data || !doc.filename) {
        throw new Error(`Document ${index + 1} missing base64Data or filename`);
      }

      // Remove data URL prefix if present (data:application/pdf;base64,)
      const base64String = doc.base64Data.replace(/^data:application\/pdf;base64,/, '');
      
      try {
        const pdfBuffer = Buffer.from(base64String, 'base64');
        console.log(`[SERVER] Document ${doc.filename}: ${(pdfBuffer.length / 1024 / 1024).toFixed(2)} MB`);
        
        return {
          pdfBuffer: pdfBuffer,
          filename: doc.filename
        };
      } catch (bufferError) {
        throw new Error(`Failed to decode base64 data for ${doc.filename}: ${bufferError.message}`);
      }
    });

    console.log('[SERVER] Starting base64 batch classification...');
    const results = await classifier.classifyBatchFromBuffers(documentsWithBuffers);
    
    const endTime = Date.now();
    const processingTime = `${(endTime - startTime) / 1000}s`;
    
    console.log(`[SERVER] Base64 batch classification completed in ${processingTime}`);
    console.log(`[SERVER] Results summary:`, results.map(r => ({ 
      filename: r.filename, 
      success: r.success, 
      category: r.category 
    })));

    // Calculate statistics
    const statistics = {
      totalDocuments: results.length,
      successfulClassifications: results.filter(r => r.success).length,
      failedClassifications: results.filter(r => !r.success).length,
      processingTime: processingTime,
      categoryBreakdown: {}
    };

    // Calculate category breakdown
    results.filter(r => r.success).forEach(result => {
      const category = result.category;
      statistics.categoryBreakdown[category] = (statistics.categoryBreakdown[category] || 0) + 1;
    });

    console.log('[SERVER] Statistics calculated:', statistics);
    console.log('[SERVER] No file cleanup needed - pure base64 processing!');

    const response = {
      success: true,
      results: results,
      statistics: statistics
    };

    console.log('[SERVER] Sending base64 batch classification response');
    res.json(response);

  } catch (error) {
    console.error('[SERVER] Base64 batch classification error:');
    console.error('[SERVER] Error message:', error.message);
    console.error('[SERVER] Error stack:', error.stack);
    
    // Handle specific error types
    if (error.message.includes('request entity too large')) {
      return res.status(413).json({
        success: false,
        error: 'Request payload too large. Please reduce file size or number of files.'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error: ' + error.message
    });
  }
});

// Legacy Batch classification endpoint (with file uploads) - kept for backward compatibility
app.post('/api/classify-batch', upload.array('pdfs', 50), async (req, res) => {
  try {
    console.log('[SERVER] Legacy batch classification request received');
    console.log(`[SERVER] Number of files: ${req.files ? req.files.length : 0}`);
    
    if (!req.files || req.files.length === 0) {
      console.log('[SERVER] No files provided');
      return res.status(400).json({
        success: false,
        error: 'No PDF files provided'
      });
    }

    const startTime = Date.now();

    // Read file buffers directly instead of using file paths
    const documents = req.files.map(file => {
      console.log(`[SERVER] Processing file: ${file.originalname} (${file.size} bytes)`);
      return {
        pdfBuffer: fs.readFileSync(file.path),
        filename: file.originalname
      };
    });

    console.log('[SERVER] Starting legacy batch classification...');
    const results = await classifier.classifyBatchFromBuffers(documents);
    
    const endTime = Date.now();
    const processingTime = `${(endTime - startTime) / 1000}s`;
    
    console.log(`[SERVER] Legacy batch classification completed in ${processingTime}`);
    console.log(`[SERVER] Results summary:`, results.map(r => ({ 
      filename: r.filename, 
      success: r.success, 
      category: r.category 
    })));

    // Calculate statistics
    const statistics = {
      totalDocuments: results.length,
      successfulClassifications: results.filter(r => r.success).length,
      failedClassifications: results.filter(r => !r.success).length,
      processingTime: processingTime,
      categoryBreakdown: {}
    };

    // Calculate category breakdown
    results.filter(r => r.success).forEach(result => {
      const category = result.category;
      statistics.categoryBreakdown[category] = (statistics.categoryBreakdown[category] || 0) + 1;
    });

    console.log('[SERVER] Statistics calculated:', statistics);
    
    // Clean up uploaded files
    console.log('[SERVER] Cleaning up uploaded files...');
    req.files.forEach(file => {
      fs.unlink(file.path, (err) => {
        if (err) {
          console.error('[SERVER] Error deleting file:', err);
        } else {
          console.log(`[SERVER] Deleted file: ${file.originalname}`);
        }
      });
    });

    const response = {
      success: true,
      results: results,
      statistics: statistics
    };

    console.log('[SERVER] Sending legacy batch classification response');
    res.json(response);

  } catch (error) {
    console.error('[SERVER] Legacy batch classification error:');
    console.error('[SERVER] Error message:', error.message);
    console.error('[SERVER] Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Organization endpoints
app.post('/api/organize', upload.array('pdfs', 50), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No PDF files provided'
      });
    }

    const outputDir = req.body.outputDir || './organized_documents';
    const createZip = req.body.createZip === 'true';

    // First classify all documents using buffer-based method
    const documents = req.files.map(file => ({
      pdfBuffer: fs.readFileSync(file.path),
      filename: file.originalname
    }));

    const classificationResult = await classifier.classifyBatchFromBuffers(documents);
    
    if (!classificationResult.success) {
      return res.status(400).json(classificationResult);
    }

    // Then organize the files
    const organizationResult = await fileOrganizer.organizeFiles(
      classificationResult.results,
      outputDir,
      createZip
    );

    // Clean up uploaded files
    req.files.forEach(file => {
      fs.unlink(file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    });

    res.json({
      success: true,
      classification: classificationResult,
      organization: organizationResult
    });

  } catch (error) {
    console.error('Organization error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Preview organization endpoint
app.post('/api/organize-preview', upload.array('pdfs', 50), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No PDF files provided'
      });
    }

    const outputDir = req.body.outputDir || './organized_documents';

    // First classify all documents using buffer-based method
    const documents = req.files.map(file => ({
      pdfBuffer: fs.readFileSync(file.path),
      filename: file.originalname
    }));

    const classificationResult = await classifier.classifyBatchFromBuffers(documents);
    
    if (!classificationResult.success) {
      return res.status(400).json(classificationResult);
    }

    // Preview organization without moving files
    const preview = await fileOrganizer.previewOrganization(
      classificationResult.results,
      outputDir
    );

    // Clean up uploaded files
    req.files.forEach(file => {
      fs.unlink(file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    });

    res.json({
      success: true,
      classification: classificationResult,
      preview: preview
    });

  } catch (error) {
    console.error('Organization preview error:', error);
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
PDF Text Parser & Document Classifier Server Started!

Server running at: http://localhost:${port}
Web interface: http://localhost:${port}

API Endpoints:
Parse PDF: http://localhost:${port}/api/parse
Classify PDF: http://localhost:${port}/api/classify
Batch Classify (Base64): http://localhost:${port}/api/classify-batch-base64
Batch Classify (Legacy): http://localhost:${port}/api/classify-batch
Organize Documents: http://localhost:${port}/api/organize
Preview Organization: http://localhost:${port}/api/organize-preview
Health check: http://localhost:${port}/health

Features:
Web-based PDF upload and parsing
AI-powered document classification
Automatic document organization
Batch processing support (Base64 & File Upload)
REST API for programmatic access
Text statistics and metadata extraction
File size limit: 10MB per file
No file uploads for Base64 endpoint

Press Ctrl+C to stop the server
  `);
});
