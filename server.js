require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PDFParser = require('./lib/pdfParser');
const DocumentClassifier = require('./lib/classifier');
const FileOrganizer = require('./lib/fileOrganizer');
const WatermarkProcessor = require('./lib/watermarkProcessor');

const app = express();
const port = process.env.PORT || 3000;

// Initialize modules
const pdfParser = new PDFParser();
const classifier = new DocumentClassifier();
const fileOrganizer = new FileOrganizer();
const watermarkProcessor = new WatermarkProcessor();

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
app.get('/', (req, res) => {
  // Redirect to the embedded HTML interface
  res.redirect('/landing');
});

app.get('/test', (req, res) => {
  // Redirect to the embedded HTML interface
  res.redirect('/landing');
});

app.get('/landing', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Smart PDF Classifier</title>
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
            max-width: 840px;
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
            <h1>Smart PDF Classifier</h1>
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
            <button class="tab-btn" onclick="showTab('watermark')" id="watermarkTab">
                Watermark Tool
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
        
        <!-- Watermark Tool Tab -->
        <div id="watermarkContent" class="tab-content">
            <form id="watermarkForm" enctype="multipart/form-data">
                <div class="upload-area" onclick="document.getElementById('watermarkFileInput').click()">
                    <div class="upload-icon">WATERMARK</div>
                    <div class="upload-text">Click to select PDF file(s) for watermarking</div>
                    <div class="upload-subtext">or drag and drop here (max 10MB per file, up to 50 files)</div>
                    <input type="file" id="watermarkFileInput" name="pdfs" accept=".pdf" multiple required>
                </div>
                
                <div style="margin: 20px 0; text-align: center;">
                    <label for="watermarkPreset" style="display: block; margin-bottom: 10px; color: #333; font-weight: bold;">
                        Watermark Preset:
                    </label>
                    <select id="watermarkPreset" style="padding: 10px; border: 2px solid #667eea; border-radius: 8px; font-size: 1em; background: white; min-width: 200px;">
                        <option value="">Loading presets...</option>
                    </select>
                </div>
                
                <div id="customWatermarkOptions" style="margin: 20px 0; padding: 20px; border: 2px solid #e0e0e0; border-radius: 8px; background: #f9f9f9;">
                    <h3 style="margin-top: 0; color: #333;">Watermark Customization</h3>
                    <p style="margin: 0 0 15px 0; color: #666; font-size: 0.9em;">Customize your watermark appearance. When using a preset, these options will override the preset defaults.</p>
                    
                    <div style="margin-bottom: 15px;">
                        <label for="customText" style="display: block; margin-bottom: 5px; color: #333; font-weight: bold;">Text:</label>
                        <input type="text" id="customText" placeholder="Enter watermark text or use preset" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label for="opacity" style="display: block; margin-bottom: 5px; color: #333; font-weight: bold;">Opacity: <span id="opacityValue">0.3</span></label>
                        <input type="range" id="opacity" min="0.1" max="1" step="0.1" value="0.3" style="width: 100%;">
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label for="fontSize" style="display: block; margin-bottom: 5px; color: #333; font-weight: bold;">Font Size:</label>
                        <input type="number" id="fontSize" value="48" min="12" max="200" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label for="color" style="display: block; margin-bottom: 5px; color: #333; font-weight: bold;">Color:</label>
                        <input type="color" id="color" value="#ff0000" style="width: 100%; height: 40px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 10px; color: #333; font-weight: bold;">Position Control:</label>
                        
                        <div style="margin-bottom: 10px;">
                            <label for="positionX" style="display: block; margin-bottom: 5px; color: #555; font-size: 14px;">Horizontal Position (0% = Left, 50% = Center, 100% = Right):</label>
                            <input type="range" id="positionX" min="0" max="100" value="50" style="width: 100%; margin-bottom: 5px;">
                            <span id="positionXValue" style="font-size: 12px; color: #666;">50%</span>
                        </div>
                        
                        <div style="margin-bottom: 10px;">
                            <label for="positionY" style="display: block; margin-bottom: 5px; color: #555; font-size: 14px;">Vertical Position (0% = Bottom, 50% = Middle, 100% = Top):</label>
                            <input type="range" id="positionY" min="0" max="100" value="50" style="width: 100%; margin-bottom: 5px;">
                            <span id="positionYValue" style="font-size: 12px; color: #666;">50%</span>
                        </div>
                        
                        <div style="display: flex; gap: 10px; margin-top: 10px;">
                            <button type="button" onclick="setQuickPosition(50, 50)" style="flex: 1; padding: 5px; font-size: 12px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 3px; cursor: pointer;">Center</button>
                            <button type="button" onclick="setQuickPosition(0, 100)" style="flex: 1; padding: 5px; font-size: 12px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 3px; cursor: pointer;">Top-Left</button>
                            <button type="button" onclick="setQuickPosition(100, 100)" style="flex: 1; padding: 5px; font-size: 12px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 3px; cursor: pointer;">Top-Right</button>
                            <button type="button" onclick="setQuickPosition(0, 0)" style="flex: 1; padding: 5px; font-size: 12px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 3px; cursor: pointer;">Bottom-Left</button>
                            <button type="button" onclick="setQuickPosition(100, 0)" style="flex: 1; padding: 5px; font-size: 12px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 3px; cursor: pointer;">Bottom-Right</button>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label for="rotation" style="display: block; margin-bottom: 5px; color: #333; font-weight: bold;">Rotation (degrees):</label>
                        <input type="number" id="rotation" value="45" min="-180" max="180" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                </div>
                
                <div style="text-align: center;">
                    <button type="submit" class="btn">Add Watermark</button>
                    <button type="button" class="btn" onclick="clearWatermarkResult()">Clear</button>
                </div>
            </form>
            
            <div class="loading" id="watermarkLoading">
                <div class="spinner"></div>
                <p>Adding watermark...</p>
            </div>
            
            <div class="result" id="watermarkResult"></div>
        </div>
    </div>

    <script>
        // Tab functionality
        function showTab(tabName) {
            const extractTab = document.getElementById('extractTab');
            const classifyTab = document.getElementById('classifyTab');
            const watermarkTab = document.getElementById('watermarkTab');
            const extractContent = document.getElementById('extractContent');
            const classifyContent = document.getElementById('classifyContent');
            const watermarkContent = document.getElementById('watermarkContent');
            
            // Remove active class from all tabs and content
            extractTab.classList.remove('active');
            classifyTab.classList.remove('active');
            watermarkTab.classList.remove('active');
            extractContent.classList.remove('active');
            classifyContent.classList.remove('active');
            watermarkContent.classList.remove('active');
            
            // Add active class to selected tab and content
            if (tabName === 'extract') {
                extractTab.classList.add('active');
                extractContent.classList.add('active');
            } else if (tabName === 'classify') {
                classifyTab.classList.add('active');
                classifyContent.classList.add('active');
            } else if (tabName === 'watermark') {
                watermarkTab.classList.add('active');
                watermarkContent.classList.add('active');
                loadWatermarkPresets(); // Load presets when watermark tab is shown
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
            
            // Store classification data globally for organize function
            window.lastClassificationData = data;
            
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
                    '<h4>Classification Results (Editable)</h4>' +
                    '<div style="overflow-x: auto; margin-top: 10px;">' +
                        '<table id="classificationTable" style="width: 100%; border-collapse: collapse; font-size: 14px;">' +
                            '<thead>' +
                                '<tr style="background-color: #f8f9fa; border-bottom: 2px solid #dee2e6;">' +
                                    '<th style="padding: 12px 8px; text-align: left; border: 1px solid #dee2e6; font-weight: 600;">File Name</th>' +
                                    '<th style="padding: 12px 8px; text-align: left; border: 1px solid #dee2e6; font-weight: 600;">Requester (Editable)</th>' +
                                    '<th style="padding: 12px 8px; text-align: left; border: 1px solid #dee2e6; font-weight: 600;">Category (Editable)</th>' +
                                    '<th style="padding: 12px 8px; text-align: center; border: 1px solid #dee2e6; font-weight: 600;">Confidence</th>' +
                                '</tr>' +
                            '</thead>' +
                            '<tbody>';
            
            // Get available categories for dropdown
            const categories = {
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
            
            results.forEach((result, index) => {
                const statusIcon = result.success ? '✅' : '❌';
                const category = result.success ? result.category : 'OOPR';
                const confidence = result.success ? Math.round(result.confidence * 100) + '%' : 'N/A';
                const requester = result.success && result.requester ? result.requester.replace(/"/g, '&quot;') : 'N/A';
                const rowColor = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
                
                // Create category dropdown options
                let categoryOptions = '';
                Object.entries(categories).forEach(([code, name]) => {
                    const selected = code === category ? 'selected' : '';
                    categoryOptions += '<option value="' + code + '" ' + selected + '>' + code + ' - ' + name + '</option>';
                });
                
                resultHtml += '<tr style="background-color: ' + rowColor + '; border-bottom: 1px solid #dee2e6;">' +
                    '<td style="padding: 10px 8px; border: 1px solid #dee2e6;">' +
                        '<span style="margin-right: 8px;">' + statusIcon + '</span>' +
                        '<span style="font-weight: 500;">' + result.filename + '</span>' +
                    '</td>' +
                    '<td style="padding: 10px 8px; border: 1px solid #dee2e6;">' +
                        '<input type="text" id="requester_' + index + '" value="' + requester + '" ' +
                        'style="width: 100%; padding: 4px 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;" ' +
                        'onchange="updateClassificationData(' + index + ', &quot;requester&quot;, this.value)">' +
                    '</td>' +
                    '<td style="padding: 10px 8px; border: 1px solid #dee2e6;">' +
                        '<select id="category_' + index + '" ' +
                        'style="width: 100%; padding: 4px 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;" ' +
                        'onchange="updateClassificationData(' + index + ', &quot;category&quot;, this.value)">' +
                        categoryOptions +
                        '</select>' +
                    '</td>' +
                    '<td style="padding: 10px 8px; border: 1px solid #dee2e6; text-align: center;">' + confidence + '</td>' +
                '</tr>';
            });
            
            resultHtml += '</tbody></table></div></div>';
            
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
            
            // Add document numbering configuration section
            if (stats.successfulClassifications > 0) {
                resultHtml += '<div class="metadata" style="margin-top: 20px;">' +
                    '<h4>Document Numbering Configuration</h4>' +
                    '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-bottom: 15px;">';
                
                // Create numbering inputs for each category
                const categoryPrefixes = {
                    'BA_HALO': 'ICTBAK',
                    'BA_KKB': 'ICTBKK',
                    'BASTB': 'ICTSTB',
                    'CHR': 'ICTCRH',
                    'COF': 'ICTCOF',
                    'LOF': 'ICTLOA',
                    'OOPR': 'ICTOOP',
                    'SRF': 'ICTSRF',
                    'DO': 'ICTSKP'
                };
                
                Object.entries(categoryPrefixes).forEach(([category, prefix]) => {
                    resultHtml += '<div style="display: flex; flex-direction: column; padding: 10px; border: 1px solid #dee2e6; border-radius: 4px; background-color: #f8f9fa;">' +
                        '<label style="font-weight: 600; margin-bottom: 5px; color: #495057;">' + category + ' (' + prefix + '):</label>' +
                        '<input type="number" id="start_' + category + '" value="1" min="1" ' +
                        'style="padding: 6px 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;">' +
                    '</div>';
                });
                
                resultHtml += '</div></div>';
                
                resultHtml += '<div style="text-align: center; margin-top: 20px;">' +
                    '<button onclick="organizeClassifiedFiles()" class="btn" style="background: #28a745; margin-right: 10px;">📁 Organize Files to Folders</button>' +
                    '<button onclick="downloadOrganizedFiles()" class="btn" style="background: #007bff; margin-right: 10px;">📦 Download as ZIP</button>' +
                    '<button onclick="previewOrganization()" class="btn" style="background: #17a2b8;">👁️ Preview Organization</button>' +
                '</div>';
            }
            
            return resultHtml;
        }

        // Function to update classification data when user edits fields
        function updateClassificationData(index, field, value) {
            if (window.lastClassificationData && window.lastClassificationData.results[index]) {
                window.lastClassificationData.results[index][field] = value;
                console.log('[FRONTEND] Updated classification data:', window.lastClassificationData.results[index]);
            }
        }

        // Function to organize classified files
        async function organizeClassifiedFiles() {
            console.log('[FRONTEND] Starting organize files process...');
            
            if (!window.lastClassificationData) {
                console.error('[FRONTEND] No classification data available');
                alert('No classification data available. Please classify files first.');
                return;
            }

            console.log('[FRONTEND] Using cached classification data:', window.lastClassificationData);

            try {
                // Collect document numbering configuration
                const categoryPrefixes = {
                    'BA_HALO': 'ICTBAK',
                    'BA_KKB': 'ICTBKK',
                    'BASTB': 'ICTSTB',
                    'CHR': 'ICTCRH',
                    'COF': 'ICTCOF',
                    'LOF': 'ICTLOA',
                    'OOPR': 'ICTOOP',
                    'SRF': 'ICTSRF',
                    'DO': 'ICTSKP'
                };

                const numberingConfig = {};
                Object.keys(categoryPrefixes).forEach(category => {
                    const startElement = document.getElementById('start_' + category);
                    if (startElement) {
                        numberingConfig[category] = parseInt(startElement.value) || 1;
                    }
                });

                console.log('[FRONTEND] Document numbering config:', numberingConfig);

                const files = classifyFileInput.files;
                if (!files || files.length === 0) {
                    console.error('[FRONTEND] No files available for organization');
                    alert('No files available for organization.');
                    return;
                }

                console.log('[FRONTEND] Files to organize:', Array.from(files).map(f => ({
                    name: f.name,
                    size: f.size,
                    type: f.type
                })));

                // Show loading
                showClassifyResult('Organizing files to folders using cached classification results...', 'info');

                const formData = new FormData();
                for (let i = 0; i < files.length; i++) {
                    console.log('[FRONTEND] Adding file ' + (i + 1) + ': ' + files[i].name);
                    formData.append('pdfs', files[i]);
                }

                // Add cached classification results and numbering config to the form data
                formData.append('classificationResults', JSON.stringify(window.lastClassificationData.results));
                formData.append('numberingConfig', JSON.stringify(numberingConfig));

                console.log('[FRONTEND] Sending organize request with cached results to /api/organize-cached...');
                const response = await fetch('/api/organize-cached', {
                    method: 'POST',
                    body: formData
                });

                console.log('[FRONTEND] Response status:', response.status);
                console.log('[FRONTEND] Response headers:', Object.fromEntries(response.headers.entries()));

                let data;
                try {
                    const responseText = await response.text();
                    console.log('[FRONTEND] Raw response:', responseText);
                    data = JSON.parse(responseText);
                } catch (parseError) {
                    console.error('[FRONTEND] Error parsing response:', parseError);
                    throw new Error('Failed to parse server response: ' + parseError.message);
                }

                console.log('[FRONTEND] Parsed response data:', data);

                if (data.success) {
                    console.log('[FRONTEND] Organization successful');
                    let resultHtml = '<h3>✅ Files Organized Successfully!</h3>';
                    resultHtml += '<p style="color: #28a745; font-weight: bold;">📋 Used cached classification results with custom file naming!</p>';
                    
                    if (data.organization && data.organization.organized) {
                        console.log('[FRONTEND] Organized files:', data.organization.organized);
                        resultHtml += '<div class="metadata"><h4>Organized Files</h4>';
                        data.organization.organized.forEach(file => {
                            resultHtml += '<div class="metadata-item">' +
                                '<span>📄 ' + file.originalName + '</span>' +
                                '<span>→ ' + file.newName + ' (in ' + file.targetFolder + ')</span>' +
                                '</div>';
                        });
                        resultHtml += '</div>';
                    }

                    if (data.organization && data.organization.summary) {
                        const summary = data.organization.summary;
                        console.log('[FRONTEND] Organization summary:', summary);
                        resultHtml += '<div class="metadata"><h4>Summary</h4>' +
                            '<div class="metadata-item"><span>Total Files:</span><span>' + summary.total + '</span></div>' +
                            '<div class="metadata-item"><span>Successfully Organized:</span><span>' + summary.successful + '</span></div>' +
                            '<div class="metadata-item"><span>Failed:</span><span>' + summary.failed + '</span></div>' +
                        '</div>';
                    }

                    showClassifyResult(resultHtml, 'success');
                } else {
                    console.error('[FRONTEND] Organization failed:', data);
                    let errorMessage = 'Error organizing files: ' + (data.error || 'Unknown error');
                    
                    if (data.errorType) {
                        errorMessage += ' (' + data.errorType + ')';
                    }
                    
                    if (data.details && typeof data.details === 'object') {
                        console.error('[FRONTEND] Error details:', data.details);
                        errorMessage += '\\n\\nDetails logged to console.';
                    }
                    
                    showClassifyResult(errorMessage, 'error');
                }

            } catch (error) {
                console.error('[FRONTEND] CRITICAL ERROR in organizeClassifiedFiles:');
                console.error('[FRONTEND] Error type:', error.constructor.name);
                console.error('[FRONTEND] Error message:', error.message);
                console.error('[FRONTEND] Error stack:', error.stack);
                console.error('[FRONTEND] Classification data:', window.lastClassificationData);
                console.error('[FRONTEND] Files:', classifyFileInput.files);
                
                let errorMessage = 'Error organizing files: ' + error.message;
                errorMessage += '\\n\\nDetailed error information has been logged to the browser console.';
                errorMessage += '\\nPlease check the console (F12) for more details.';
                
                showClassifyResult(errorMessage, 'error');
            }
        }

        // Function to preview organization
        async function previewOrganization() {
            console.log('[FRONTEND] Starting preview organization...');
            
            if (!window.lastClassificationData) {
                console.error('[FRONTEND] No classification data available for preview');
                alert('No classification data available. Please classify files first.');
                return;
            }

            console.log('[FRONTEND] Using cached classification data for preview:', window.lastClassificationData);

            try {
                // Show loading
                showClassifyResult('Generating organization preview using cached classification results...', 'info');

                console.log('[FRONTEND] Sending preview request with cached results to /api/organize-preview-cached...');
                const response = await fetch('/api/organize-preview-cached', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        classificationResults: window.lastClassificationData.results,
                        outputDir: './organized_documents'
                    })
                });

                console.log('[FRONTEND] Preview response status:', response.status);
                console.log('[FRONTEND] Preview response headers:', Object.fromEntries(response.headers.entries()));

                let data;
                try {
                    const responseText = await response.text();
                    console.log('[FRONTEND] Raw preview response:', responseText);
                    data = JSON.parse(responseText);
                } catch (parseError) {
                    console.error('[FRONTEND] Error parsing preview response:', parseError);
                    throw new Error('Failed to parse server response: ' + parseError.message);
                }

                console.log('[FRONTEND] Parsed preview data:', data);

                if (data.success) {
                    console.log('[FRONTEND] Preview generation successful');
                    let resultHtml = '<h3>👁️ Organization Preview</h3>';
                    resultHtml += '<p style="color: #17a2b8; font-weight: bold;">📋 Using cached classification results - no re-classification needed!</p>';
                    
                    if (data.preview && data.preview.folders) {
                        console.log('[FRONTEND] Preview folders:', data.preview.folders);
                        resultHtml += '<div class="metadata"><h4>Folder Structure Preview</h4>';
                        
                        Object.entries(data.preview.folders).forEach(([folder, files]) => {
                            resultHtml += '<div class="metadata-item" style="flex-direction: column; align-items: flex-start;">' +
                                '<span style="font-weight: bold; color: #007bff;">📁 ' + folder + '</span>';
                            
                            files.forEach(file => {
                                resultHtml += '<span style="margin-left: 20px; color: #666;">📄 ' + file + '</span>';
                            });
                            
                            resultHtml += '</div>';
                        });
                        
                        resultHtml += '</div>';
                    }

                    if (data.preview && data.preview.summary) {
                        const summary = data.preview.summary;
                        console.log('[FRONTEND] Preview summary:', summary);
                        resultHtml += '<div class="metadata"><h4>Preview Summary</h4>' +
                            '<div class="metadata-item"><span>Total Files:</span><span>' + summary.totalFiles + '</span></div>' +
                            '<div class="metadata-item"><span>Folders to Create:</span><span>' + summary.foldersToCreate + '</span></div>' +
                        '</div>';
                    }

                    showClassifyResult(resultHtml, 'success');
                } else {
                    console.error('[FRONTEND] Preview generation failed:', data);
                    let errorMessage = 'Error generating preview: ' + (data.error || 'Unknown error');
                    
                    if (data.errorType) {
                        errorMessage += ' (' + data.errorType + ')';
                    }
                    
                    showClassifyResult(errorMessage, 'error');
                }

            } catch (error) {
                console.error('[FRONTEND] CRITICAL ERROR in previewOrganization:');
                console.error('[FRONTEND] Error type:', error.constructor.name);
                console.error('[FRONTEND] Error message:', error.message);
                console.error('[FRONTEND] Error stack:', error.stack);
                console.error('[FRONTEND] Classification data:', window.lastClassificationData);
                
                let errorMessage = 'Error generating preview: ' + error.message;
                errorMessage += '\\n\\nDetailed error information has been logged to the browser console.';
                errorMessage += '\\nPlease check the console (F12) for more details.';
                
                showClassifyResult(errorMessage, 'error');
            }
        }

        // Function to download organized files as ZIP
        async function downloadOrganizedFiles() {
            console.log('[FRONTEND] Starting download organized files process...');
            
            if (!window.lastClassificationData) {
                console.error('[FRONTEND] No classification data available');
                alert('No classification data available. Please classify files first.');
                return;
            }

            console.log('[FRONTEND] Using cached classification data:', window.lastClassificationData);

            try {
                const files = classifyFileInput.files;
                if (!files || files.length === 0) {
                    console.error('[FRONTEND] No files available for download');
                    alert('No files available for download.');
                    return;
                }

                console.log('[FRONTEND] Files to download:', Array.from(files).map(f => ({
                    name: f.name,
                    size: f.size,
                    type: f.type
                })));

                // Show loading
                showClassifyResult('Creating downloadable ZIP file with organized documents...', 'info');

                // Convert files to base64 for cached download
                const sourceFiles = [];
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const base64Data = await fileToBase64(file);
                    sourceFiles.push({
                        filename: file.name,
                        base64Data: base64Data // fileToBase64 already returns clean base64 without prefix
                    });
                }

                console.log('[FRONTEND] Sending download request with cached results to /api/organize-download-cached...');
                const response = await fetch('/api/organize-download-cached', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        classificationResults: window.lastClassificationData.results,
                        sourceFiles: sourceFiles
                    })
                });

                console.log('[FRONTEND] Response status:', response.status);
                const data = await response.json();
                console.log('[FRONTEND] Parsed response data:', data);

                if (data.success && data.download) {
                    console.log('[FRONTEND] ZIP creation successful');
                    
                    // Create download link
                    const downloadUrl = \`/api/download/\${data.download.zipId}\`;
                    
                    let resultHtml = '<h3>📦 ZIP File Ready for Download!</h3>';
                    resultHtml += '<p style="color: #007bff; font-weight: bold;">Your organized documents have been packaged into a ZIP file.</p>';
                    
                    resultHtml += '<div style="text-align: center; margin: 20px 0;">';
                    resultHtml += '<a href="' + downloadUrl + '" download="' + data.download.filename + '" class="btn" style="background: #28a745; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; display: inline-block;">';
                    resultHtml += '⬇️ Download ZIP File</a>';
                    resultHtml += '</div>';

                    if (data.download.summary) {
                        const summary = data.download.summary;
                        console.log('[FRONTEND] Download summary:', summary);
                        resultHtml += '<div class="metadata"><h4>Package Summary</h4>' +
                            '<div class="metadata-item"><span>Total Files:</span><span>' + summary.total + '</span></div>' +
                            '<div class="metadata-item"><span>Successfully Organized:</span><span>' + summary.successful + '</span></div>' +
                            '<div class="metadata-item"><span>Failed:</span><span>' + summary.failed + '</span></div>' +
                        '</div>';
                    }

                    resultHtml += '<p style="color: #666; font-size: 0.9em; margin-top: 15px;">💡 The ZIP file will be automatically deleted after download for security.</p>';

                    showClassifyResult(resultHtml, 'success');
                } else {
                    console.error('[FRONTEND] ZIP creation failed:', data);
                    let errorMessage = 'Error creating ZIP file: ' + (data.error || 'Unknown error');
                    showClassifyResult(errorMessage, 'error');
                }

            } catch (error) {
                console.error('[FRONTEND] CRITICAL ERROR in downloadOrganizedFiles:');
                console.error('[FRONTEND] Error type:', error.constructor.name);
                console.error('[FRONTEND] Error message:', error.message);
                console.error('[FRONTEND] Error stack:', error.stack);
                
                let errorMessage = 'Error creating download: ' + error.message;
                errorMessage += '\\n\\nDetailed error information has been logged to the browser console.';
                errorMessage += '\\nPlease check the console (F12) for more details.';
                
                showClassifyResult(errorMessage, 'error');
            }
        }
        
        // Watermark functionality
        const watermarkForm = document.getElementById('watermarkForm');
        const watermarkFileInput = document.getElementById('watermarkFileInput');
        const watermarkLoading = document.getElementById('watermarkLoading');
        const watermarkResult = document.getElementById('watermarkResult');
        const watermarkPreset = document.getElementById('watermarkPreset');
        const opacitySlider = document.getElementById('opacity');
        const opacityValue = document.getElementById('opacityValue');
        
        // Update opacity display
        opacitySlider.addEventListener('input', function() {
            opacityValue.textContent = this.value;
        });
        
        // Position slider controls
        const positionXSlider = document.getElementById('positionX');
        const positionYSlider = document.getElementById('positionY');
        const positionXValue = document.getElementById('positionXValue');
        const positionYValue = document.getElementById('positionYValue');
        
        // Update position display values
        positionXSlider.addEventListener('input', function() {
            positionXValue.textContent = this.value + '%';
        });
        
        positionYSlider.addEventListener('input', function() {
            positionYValue.textContent = this.value + '%';
        });
        
        // Quick position function
        function setQuickPosition(x, y) {
            positionXSlider.value = x;
            positionYSlider.value = y;
            positionXValue.textContent = x + '%';
            positionYValue.textContent = y + '%';
        }
        
        // Load watermark presets
        async function loadWatermarkPresets() {
            try {
                const response = await fetch('/api/watermark/presets');
                const data = await response.json();
                
                if (data.success && data.presets) {
                    watermarkPreset.innerHTML = '<option value="">Custom Watermark</option>';
                    
                    Object.entries(data.presets).forEach(([key, preset]) => {
                        const option = document.createElement('option');
                        option.value = key;
                        option.textContent = key.toUpperCase() + ' - ' + preset.text;
                        watermarkPreset.appendChild(option);
                    });
                } else {
                    watermarkPreset.innerHTML = '<option value="">Error loading presets</option>';
                }
            } catch (error) {
                console.error('Error loading watermark presets:', error);
                watermarkPreset.innerHTML = '<option value="">Error loading presets</option>';
            }
        }
        
        // Handle preset selection
        watermarkPreset.addEventListener('change', async function() {
            const customOptions = document.getElementById('customWatermarkOptions');
            // Always show customization options
            customOptions.style.display = 'block';
            
            if (this.value !== '') {
                // Preset selected - populate fields with preset values
                try {
                    const response = await fetch('/api/watermark/presets');
                    const data = await response.json();
                    
                    if (data.success && data.presets && data.presets[this.value]) {
                        const preset = data.presets[this.value];
                        
                        // Populate form fields with preset values
                        document.getElementById('customText').value = preset.text;
                        document.getElementById('opacity').value = preset.opacity;
                        document.getElementById('opacityValue').textContent = preset.opacity;
                        document.getElementById('fontSize').value = preset.fontSize;
                        document.getElementById('rotation').value = preset.rotation;
                        
                        // Convert RGB to hex for color input
                        const hexColor = '#' + 
                            Math.round(preset.color.r * 255).toString(16).padStart(2, '0') +
                            Math.round(preset.color.g * 255).toString(16).padStart(2, '0') +
                            Math.round(preset.color.b * 255).toString(16).padStart(2, '0');
                        document.getElementById('color').value = hexColor;
                        
                        // Set position sliders to center (default)
                        document.getElementById('positionX').value = '50';
                        document.getElementById('positionY').value = '50';
                        document.getElementById('positionXValue').textContent = '50%';
                        document.getElementById('positionYValue').textContent = '50%';
                    }
                } catch (error) {
                    console.error('Error loading preset details:', error);
                }
            } else {
                // Custom watermark - reset to defaults
                document.getElementById('customText').value = '';
                document.getElementById('opacity').value = '0.3';
                document.getElementById('opacityValue').textContent = '0.3';
                document.getElementById('fontSize').value = '48';
                document.getElementById('color').value = '#ff0000';
                document.getElementById('positionX').value = '50';
                document.getElementById('positionY').value = '50';
                document.getElementById('positionXValue').textContent = '50%';
                document.getElementById('positionYValue').textContent = '50%';
                document.getElementById('rotation').value = '45';
            }
        });
        
        // Watermark form submission
        watermarkForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const files = watermarkFileInput.files;
            if (!files || files.length === 0) {
                showWatermarkResult('Please select at least one PDF file', 'error');
                return;
            }
            
            watermarkLoading.style.display = 'block';
            watermarkResult.style.display = 'none';
            
            try {
                const formData = new FormData();
                
                // Add all selected files
                for (let i = 0; i < files.length; i++) {
                    formData.append('pdfs', files[i]);
                }
                
                const preset = watermarkPreset.value;
                const customText = document.getElementById('customText').value;
                
                // Validate that we have either a preset or custom text
                if (!preset && !customText.trim()) {
                    showWatermarkResult('Please enter watermark text or select a preset', 'error');
                    watermarkLoading.style.display = 'none';
                    return;
                }
                
                // Always send preset if selected (for base settings)
                if (preset) {
                    formData.append('preset', preset);
                }
                
                // Always send custom options (they will override preset values if provided)
                formData.append('customText', customText);
                formData.append('opacity', document.getElementById('opacity').value);
                formData.append('fontSize', document.getElementById('fontSize').value);
                formData.append('color', document.getElementById('color').value);
                formData.append('positionX', document.getElementById('positionX').value);
                formData.append('positionY', document.getElementById('positionY').value);
                formData.append('rotation', document.getElementById('rotation').value);
                
                const response = await fetch('/api/watermark', {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    const contentType = response.headers.get('content-type');
                    
                    if (contentType && contentType.includes('application/pdf')) {
                        // Single file - handle direct PDF download
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'watermarked_' + files[0].name;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);
                        
                        showWatermarkResult('✅ Watermark added successfully! File downloaded.', 'success');
                    } else {
                        // Multiple files - handle ZIP download response
                        const data = await response.json();
                        
                        if (data.success && data.download) {
                             let resultHtml = '<h3>✅ Watermark Processing Complete!</h3>';
                             resultHtml += '<p><strong>Successfully processed:</strong> ' + data.successfulFiles + ' out of ' + data.totalFiles + ' files</p>';
                             
                             if (data.failedFiles > 0) {
                                 resultHtml += '<p style="color: #e74c3c;"><strong>Failed:</strong> ' + data.failedFiles + ' files</p>';
                                 if (data.errors) {
                                     resultHtml += '<div style="margin: 10px 0; padding: 10px; background: #ffeaa7; border-radius: 5px;">';
                                     resultHtml += '<strong>Errors:</strong><ul>';
                                     data.errors.forEach(function(error) {
                                         resultHtml += '<li>' + error.filename + ': ' + error.error + '</li>';
                                     });
                                     resultHtml += '</ul></div>';
                                 }
                             }
                             
                             const downloadUrl = data.download.downloadUrl;
                             resultHtml += '<div style="margin: 20px 0; text-align: center;">';
                             resultHtml += '<a href="' + downloadUrl + '" download="' + data.download.filename + '" class="btn" style="background: #28a745; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; display: inline-block;">';
                             resultHtml += '⬇️ Download Watermarked Files (ZIP)</a>';
                             resultHtml += '</div>';
                             
                             resultHtml += '<p style="color: #666; font-size: 0.9em; margin-top: 15px;">💡 The ZIP file will be automatically deleted after download for security.</p>';
                             
                             showWatermarkResult(resultHtml, 'success');
                         } else {
                             showWatermarkResult('Error: ' + (data.error || 'Failed to process watermark'), 'error');
                         }
                    }
                } else {
                    const errorData = await response.json();
                    showWatermarkResult('Error: ' + (errorData.error || 'Failed to add watermark'), 'error');
                }
            } catch (error) {
                console.error('Watermark error:', error);
                showWatermarkResult('Error: ' + error.message, 'error');
            } finally {
                watermarkLoading.style.display = 'none';
            }
        });
        
        function showWatermarkResult(content, type) {
            watermarkResult.innerHTML = content;
            watermarkResult.className = 'result ' + type;
            watermarkResult.style.display = 'block';
        }
        
        function clearWatermarkResult() {
            watermarkResult.style.display = 'none';
            watermarkFileInput.value = '';
            watermarkPreset.value = '';
            document.getElementById('customText').value = '';
            document.getElementById('opacity').value = '0.3';
            document.getElementById('opacityValue').textContent = '0.3';
            document.getElementById('fontSize').value = '48';
            document.getElementById('color').value = '#ff0000';
            document.getElementById('rotation').value = '45';
            document.getElementById('customWatermarkOptions').style.display = 'block';
            document.querySelector('#watermarkContent .upload-text').textContent = 'Click to select PDF file for watermarking';
        }
        
        // Drag and drop for watermark
        const watermarkUploadArea = document.querySelector('#watermarkContent .upload-area');
        
        watermarkUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            watermarkUploadArea.classList.add('dragover');
        });
        
        watermarkUploadArea.addEventListener('dragleave', () => {
            watermarkUploadArea.classList.remove('dragover');
        });
        
        watermarkUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            watermarkUploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            const pdfFiles = Array.from(files).filter(file => file.type === 'application/pdf');
            
            if (pdfFiles.length > 0) {
                // Create a new FileList with only PDF files
                const dt = new DataTransfer();
                pdfFiles.forEach(file => dt.items.add(file));
                watermarkFileInput.files = dt.files;
                
                if (pdfFiles.length === 1) {
                    updateWatermarkFileName(pdfFiles[0].name);
                } else {
                    updateWatermarkFileName(pdfFiles.length + ' PDF files selected');
                }
            } else {
                updateWatermarkFileName('No PDF files found. Please drop PDF files only.');
            }
        });
        
        watermarkFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                if (e.target.files.length === 1) {
                    updateWatermarkFileName(e.target.files[0].name);
                } else {
                    updateWatermarkFileName(e.target.files.length + ' PDF files selected');
                }
            }
        });
        
        function updateWatermarkFileName(fileName) {
            const uploadText = document.querySelector('#watermarkContent .upload-text');
            uploadText.textContent = fileName;
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
  console.log('[ORGANIZE] Starting file organization process...');
  console.log('[ORGANIZE] Request body:', req.body);
  console.log('[ORGANIZE] Files received:', req.files ? req.files.length : 0);
  
  try {
    if (!req.files || req.files.length === 0) {
      console.log('[ORGANIZE] ERROR: No PDF files provided');
      return res.status(400).json({
        success: false,
        error: 'No PDF files provided'
      });
    }

    console.log('[ORGANIZE] Files details:', req.files.map(f => ({
      originalname: f.originalname,
      size: f.size,
      mimetype: f.mimetype,
      path: f.path
    })));

    const outputDir = req.body.outputDir || './organized_documents';
    const createZip = req.body.createZip === 'true';

    console.log('[ORGANIZE] Configuration:', { outputDir, createZip });

    // First classify all documents using buffer-based method
    console.log('[ORGANIZE] Reading file buffers...');
    const documents = req.files.map(file => {
      try {
        const buffer = fs.readFileSync(file.path);
        console.log(`[ORGANIZE] Successfully read buffer for ${file.originalname}, size: ${buffer.length} bytes`);
        return {
          pdfBuffer: buffer,
          filename: file.originalname
        };
      } catch (readError) {
        console.error(`[ORGANIZE] Error reading file ${file.originalname}:`, readError);
        throw readError;
      }
    });

    console.log('[ORGANIZE] Starting classification...');
    const classificationResults = await classifier.classifyBatchFromBuffers(documents);
    console.log('[ORGANIZE] Classification result:', {
      success: Array.isArray(classificationResults),
      resultsCount: classificationResults ? classificationResults.length : 0,
      error: Array.isArray(classificationResults) ? null : 'Invalid result format'
    });
    
    if (!Array.isArray(classificationResults) || classificationResults.length === 0) {
      console.log('[ORGANIZE] Classification failed: Invalid or empty results');
      return res.status(400).json({
        success: false,
        error: 'Classification failed: Invalid or empty results',
        details: classificationResults
      });
    }

    // Check if any classification failed
    const failedClassifications = classificationResults.filter(result => !result.success);
    if (failedClassifications.length > 0) {
      console.log('[ORGANIZE] Some classifications failed:', failedClassifications.map(f => f.filename));
    }

    // Log classification results
    console.log('[ORGANIZE] Classification details:');
    classificationResults.forEach((result, index) => {
      console.log(`[ORGANIZE] File ${index + 1}: ${result.filename} -> ${result.success ? result.category : 'FAILED'} (${result.success ? Math.round(result.confidence * 100) + '%' : result.error})`);
    });

    // Then organize the files
    console.log('[ORGANIZE] Starting file organization...');
    
    // Create a mapping of original filenames to their temporary file paths
    const fileMapping = {};
    req.files.forEach(file => {
      fileMapping[file.originalname] = file.path;
    });
    
    console.log('[ORGANIZE] File mapping:', fileMapping);
    console.log('[ORGANIZE] Target directory:', outputDir);
    
    // Copy files to a temporary directory with their original names for organization
    const tempOrgDir = './temp_organize';
    if (!fs.existsSync(tempOrgDir)) {
      fs.mkdirSync(tempOrgDir, { recursive: true });
    }
    
    // Copy files with original names
    for (const [originalName, tempPath] of Object.entries(fileMapping)) {
      const targetPath = path.join(tempOrgDir, originalName);
      fs.copyFileSync(tempPath, targetPath);
    }
    
    const organizationResult = await fileOrganizer.organizeFiles(
      classificationResults,
      tempOrgDir,  // Source directory (temp directory with original names)
      outputDir    // Target directory (where organized files should go)
    );
    
    // Clean up temporary organization directory
    fs.rmSync(tempOrgDir, { recursive: true, force: true });

    console.log('[ORGANIZE] Organization result:', {
      success: organizationResult.success,
      organized: organizationResult.organized ? organizationResult.organized.length : 0,
      summary: organizationResult.summary
    });

    // Clean up uploaded files
    console.log('[ORGANIZE] Cleaning up temporary files...');
    req.files.forEach(file => {
      fs.unlink(file.path, (err) => {
        if (err) {
          console.error(`[ORGANIZE] Error deleting temp file ${file.originalname}:`, err);
        } else {
          console.log(`[ORGANIZE] Deleted temp file: ${file.originalname}`);
        }
      });
    });

    console.log('[ORGANIZE] Process completed successfully');
    res.json({
      success: true,
      classification: {
        success: true,
        results: classificationResults
      },
      organization: organizationResult
    });

  } catch (error) {
    console.error('[ORGANIZE] CRITICAL ERROR:');
    console.error('[ORGANIZE] Error type:', error.constructor.name);
    console.error('[ORGANIZE] Error message:', error.message);
    console.error('[ORGANIZE] Error stack:', error.stack);
    console.error('[ORGANIZE] Request details:', {
      files: req.files ? req.files.map(f => ({ name: f.originalname, size: f.size })) : 'none',
      body: req.body
    });
    
    // Clean up files on error
    if (req.files) {
      req.files.forEach(file => {
        fs.unlink(file.path, (err) => {
          if (err) console.error(`[ORGANIZE] Error cleaning up file ${file.originalname}:`, err);
        });
      });
    }
    
    res.status(500).json({
      success: false,
      error: `Organization failed: ${error.message}`,
      errorType: error.constructor.name,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// New endpoint for organizing with cached classification results
app.post('/api/organize-cached', upload.array('pdfs', 50), async (req, res) => {
  try {
    console.log('[ORGANIZE-CACHED] Starting organization with cached results...');
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No PDF files provided'
      });
    }

    // Get cached classification results from request body
    let cachedResults;
    try {
      cachedResults = JSON.parse(req.body.classificationResults);
    } catch (parseError) {
      console.error('[ORGANIZE-CACHED] Error parsing cached results:', parseError);
      return res.status(400).json({
        success: false,
        error: 'Invalid cached classification results'
      });
    }

    // Get numbering configuration from request body
    let numberingConfig = {};
    try {
      if (req.body.numberingConfig) {
        numberingConfig = JSON.parse(req.body.numberingConfig);
        console.log('[ORGANIZE-CACHED] Numbering config received:', numberingConfig);
      }
    } catch (parseError) {
      console.error('[ORGANIZE-CACHED] Error parsing numbering config:', parseError);
      // Continue with default numbering if parsing fails
    }

    if (!Array.isArray(cachedResults) || cachedResults.length === 0) {
      console.log('[ORGANIZE-CACHED] Invalid cached results format');
      return res.status(400).json({
        success: false,
        error: 'Invalid or empty cached classification results'
      });
    }

    console.log('[ORGANIZE-CACHED] Using cached classification results for', cachedResults.length, 'files');

    const outputDir = req.body.outputDir || './organized_documents';
    const createZip = req.body.createZip === 'true';

    console.log('[ORGANIZE-CACHED] Configuration:', { outputDir, createZip, numberingConfig });

    // Create a mapping of original filenames to their temporary file paths
    const fileMapping = {};
    req.files.forEach(file => {
      fileMapping[file.originalname] = file.path;
    });
    
    console.log('[ORGANIZE-CACHED] File mapping:', fileMapping);
    
    // Copy files to a temporary directory with their original names for organization
    const tempOrgDir = './temp_organize_cached';
    if (!fs.existsSync(tempOrgDir)) {
      fs.mkdirSync(tempOrgDir, { recursive: true });
    }
    
    // Copy files with original names
    for (const [originalName, tempPath] of Object.entries(fileMapping)) {
      const targetPath = path.join(tempOrgDir, originalName);
      fs.copyFileSync(tempPath, targetPath);
    }
    
    console.log('[ORGANIZE-CACHED] Starting file organization with cached results and custom naming...');
    const organizationResult = await fileOrganizer.organizeFilesWithNumbering(
      cachedResults,   // Use cached classification results
      tempOrgDir,      // Source directory (temp directory with original names)
      outputDir,       // Target directory (where organized files should go)
      numberingConfig  // Document numbering configuration
    );
    
    // Clean up temporary organization directory
    fs.rmSync(tempOrgDir, { recursive: true, force: true });

    console.log('[ORGANIZE-CACHED] Organization result:', {
      success: organizationResult.success,
      organized: organizationResult.organized ? organizationResult.organized.length : 0,
      summary: organizationResult.summary
    });

    // Clean up uploaded files
    console.log('[ORGANIZE-CACHED] Cleaning up temporary files...');
    req.files.forEach(file => {
      fs.unlink(file.path, (err) => {
        if (err) {
          console.error(`[ORGANIZE-CACHED] Error deleting temp file ${file.originalname}:`, err);
        } else {
          console.log(`[ORGANIZE-CACHED] Deleted temp file: ${file.originalname}`);
        }
      });
    });

    console.log('[ORGANIZE-CACHED] Process completed successfully');
    res.json({
      success: true,
      classification: {
        success: true,
        results: cachedResults
      },
      organization: organizationResult
    });

  } catch (error) {
    console.error('[ORGANIZE-CACHED] CRITICAL ERROR:');
    console.error('[ORGANIZE-CACHED] Error type:', error.constructor.name);
    console.error('[ORGANIZE-CACHED] Error message:', error.message);
    console.error('[ORGANIZE-CACHED] Error stack:', error.stack);
    
    // Clean up files on error
    if (req.files) {
      req.files.forEach(file => {
        fs.unlink(file.path, (err) => {
          if (err) console.error(`[ORGANIZE-CACHED] Error cleaning up file ${file.originalname}:`, err);
        });
      });
    }
    
    res.status(500).json({
      success: false,
      error: `Organization failed: ${error.message}`,
      errorType: error.constructor.name,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
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

    const classificationResults = await classifier.classifyBatchFromBuffers(documents);
    
    if (!Array.isArray(classificationResults) || classificationResults.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Classification failed: Invalid or empty results'
      });
    }

    // Preview organization without moving files
    const preview = await fileOrganizer.previewOrganization(
      classificationResults,
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
      classification: {
        success: true,
        results: classificationResults
      },
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

// Preview organization with cached results endpoint
app.post('/api/organize-preview-cached', express.json(), async (req, res) => {
  try {
    console.log('[PREVIEW-CACHED] Starting preview with cached results...');
    
    const { classificationResults, outputDir = './organized_documents' } = req.body;

    if (!Array.isArray(classificationResults) || classificationResults.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or empty cached classification results'
      });
    }

    console.log('[PREVIEW-CACHED] Using cached classification results for', classificationResults.length, 'files');

    // Preview organization without moving files
    const preview = await fileOrganizer.previewOrganization(
      classificationResults,
      outputDir
    );

    console.log('[PREVIEW-CACHED] Preview generated successfully');
    res.json({
      success: true,
      classification: {
        success: true,
        results: classificationResults
      },
      preview: preview
    });

  } catch (error) {
    console.error('[PREVIEW-CACHED] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Create downloadable ZIP of organized documents
app.post('/api/organize-download', upload.array('pdfs', 50), async (req, res) => {
  try {
    console.log('[ORGANIZE-DOWNLOAD] Starting organization for download...');
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No PDF files provided'
      });
    }

    // First classify all documents using buffer-based method
    const documents = req.files.map(file => ({
      pdfBuffer: fs.readFileSync(file.path),
      filename: file.originalname
    }));

    console.log('[ORGANIZE-DOWNLOAD] Classifying', documents.length, 'documents...');
    const classificationResults = await classifier.classifyBatchFromBuffers(documents);
    
    if (!Array.isArray(classificationResults) || classificationResults.length === 0) {
      // Clean up uploaded files on error
      req.files.forEach(file => {
        fs.unlink(file.path, (err) => {
          if (err) console.error('[ORGANIZE-DOWNLOAD] Error cleaning up file:', err);
        });
      });
      
      return res.status(400).json({
        success: false,
        error: 'Classification failed: Invalid or empty results'
      });
    }

    console.log('[ORGANIZE-DOWNLOAD] Creating downloadable ZIP...');
    
    // Create downloadable ZIP with organized files
    const zipResult = await fileOrganizer.createDownloadableZip(
      classificationResults,
      req.files.map(file => file.path) // source file paths
    );

    // Clean up uploaded files
    console.log('[ORGANIZE-DOWNLOAD] Cleaning up uploaded files...');
    req.files.forEach(file => {
      fs.unlink(file.path, (err) => {
        if (err) {
          console.error(`[ORGANIZE-DOWNLOAD] Error deleting temp file ${file.originalname}:`, err);
        } else {
          console.log(`[ORGANIZE-DOWNLOAD] Deleted temp file: ${file.originalname}`);
        }
      });
    });

    console.log('[ORGANIZE-DOWNLOAD] ZIP created successfully:', zipResult.zipPath);
    res.json({
      success: true,
      classification: {
        success: true,
        results: classificationResults
      },
      download: {
        zipId: zipResult.zipId,
        filename: zipResult.filename,
        summary: zipResult.summary
      }
    });

  } catch (error) {
    console.error('[ORGANIZE-DOWNLOAD] Error:', error);
    
    // Clean up files on error
    if (req.files) {
      req.files.forEach(file => {
        fs.unlink(file.path, (err) => {
          if (err) console.error(`[ORGANIZE-DOWNLOAD] Error cleaning up file ${file.originalname}:`, err);
        });
      });
    }
    
    res.status(500).json({
      success: false,
      error: `Organization failed: ${error.message}`
    });
  }
});

// Create downloadable ZIP with cached classification results
app.post('/api/organize-download-cached', express.json(), async (req, res) => {
  try {
    console.log('[ORGANIZE-DOWNLOAD-CACHED] Starting organization for download with cached results...');
    
    const { classificationResults, sourceFiles } = req.body;

    if (!Array.isArray(classificationResults) || classificationResults.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or empty cached classification results'
      });
    }

    if (!Array.isArray(sourceFiles) || sourceFiles.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Source files information required'
      });
    }

    console.log('[ORGANIZE-DOWNLOAD-CACHED] Creating downloadable ZIP with cached results...');
    
    // Create downloadable ZIP with organized files using cached results
    const zipResult = await fileOrganizer.createDownloadableZipFromCached(
      classificationResults,
      sourceFiles
    );

    console.log('[ORGANIZE-DOWNLOAD-CACHED] ZIP created successfully:', zipResult.zipPath);
    res.json({
      success: true,
      classification: {
        success: true,
        results: classificationResults
      },
      download: {
        zipId: zipResult.zipId,
        filename: zipResult.filename,
        summary: zipResult.summary
      }
    });

  } catch (error) {
    console.error('[ORGANIZE-DOWNLOAD-CACHED] Error:', error);
    res.status(500).json({
      success: false,
      error: `Organization failed: ${error.message}`
    });
  }
});

// Download ZIP file endpoint
app.get('/api/download/:zipId', async (req, res) => {
  try {
    const { zipId } = req.params;
    console.log('[DOWNLOAD] Requested ZIP download:', zipId);
    
    const zipPath = path.join(__dirname, 'temp', 'zips', `${zipId}.zip`);
    
    // Check if ZIP file exists
    if (!fs.existsSync(zipPath)) {
      return res.status(404).json({
        success: false,
        error: 'ZIP file not found or expired'
      });
    }

    // Extract timestamp from zipId to create a user-friendly filename
    // zipId format: zip_timestamp_randomstring
    const timestampMatch = zipId.match(/zip_(\d+)_/);
    let filename = 'organized_documents.zip';
    
    if (timestampMatch) {
      const timestamp = parseInt(timestampMatch[1]);
      const date = new Date(timestamp);
      const formattedDate = date.toISOString().replace(/[:.]/g, '-').slice(0, -5); // Remove milliseconds and Z
      filename = `organized_documents_${formattedDate}.zip`;
    }
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(zipPath);
    fileStream.pipe(res);
    
    // Clean up ZIP file after download
    fileStream.on('end', () => {
      console.log('[DOWNLOAD] ZIP file sent successfully, cleaning up...');
      setTimeout(() => {
        fs.unlink(zipPath, (err) => {
          if (err) {
            console.error('[DOWNLOAD] Error deleting ZIP file:', err);
          } else {
            console.log('[DOWNLOAD] ZIP file cleaned up:', zipPath);
          }
        });
      }, 1000); // Small delay to ensure download completes
    });

    fileStream.on('error', (error) => {
      console.error('[DOWNLOAD] Error streaming ZIP file:', error);
      res.status(500).json({
        success: false,
        error: 'Error downloading file'
      });
    });

  } catch (error) {
    console.error('[DOWNLOAD] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Download failed'
    });
  }
});

// Watermark API endpoints

// Get watermark presets
app.get('/api/watermark/presets', (req, res) => {
  try {
    console.log('📋 [WATERMARK API] Getting watermark presets');
    
    const presets = watermarkProcessor.getPresets();
    
    res.json({
      success: true,
      presets: presets,
      presetNames: watermarkProcessor.getPresetNames()
    });
    
    console.log('✅ [WATERMARK API] Presets sent successfully');
  } catch (error) {
    console.error('❌ [WATERMARK API] Error getting presets:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get watermark presets'
    });
  }
});

// Add watermark to PDF - supports single and multiple files
app.post('/api/watermark', upload.array('pdfs', 50), async (req, res) => {
  try {
    console.log('🔖 [WATERMARK API] Starting watermark request');
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No PDF files provided'
      });
    }
    
    console.log(`🔖 [WATERMARK API] Processing ${req.files.length} file(s)`);
    
    const { preset, customText, opacity, fontSize, color, rotation, positionX, positionY } = req.body;
    
    console.log('📄 [WATERMARK API] Files:', req.files.map(f => f.originalname));
    console.log('⚙️ [WATERMARK API] Options:', { preset, customText, opacity, fontSize, color, rotation, positionX, positionY });
    
    // Prepare watermark options
    const watermarkOptions = {
      preset: preset,
      customText: customText,
      opacity: opacity ? parseFloat(opacity) : undefined,
      fontSize: fontSize ? parseInt(fontSize) : undefined,
      color: color,
      rotation: rotation ? parseInt(rotation) : undefined,
      positionX: positionX ? parseInt(positionX) : undefined,
      positionY: positionY ? parseInt(positionY) : undefined
    };
    
    // Validate options
    const validation = watermarkProcessor.validateOptions(watermarkOptions);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid watermark options',
        details: validation.errors
      });
    }
    
    // Process all files
    const watermarkedFiles = [];
    const errors = [];
    
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      try {
        console.log(`📖 [WATERMARK API] Processing file ${i + 1}/${req.files.length}: ${file.originalname}`);
        
        // Read file buffer from disk
        const pdfBuffer = fs.readFileSync(file.path);
        console.log(`📊 [WATERMARK API] File buffer read successfully. Size: ${pdfBuffer.length} bytes`);
        
        // Add watermark
        const result = await watermarkProcessor.addWatermark(pdfBuffer, watermarkOptions);
        
        if (result.success) {
          console.log(`✅ [WATERMARK API] Watermark added successfully to ${file.originalname}`);
          console.log('📊 [WATERMARK API] Original size:', result.originalSize, 'bytes');
          console.log('📊 [WATERMARK API] Watermarked size:', result.watermarkedSize, 'bytes');
          
          // Generate filename
          const nameWithoutExt = file.originalname.replace(/\.pdf$/i, '');
          const watermarkedFilename = `${nameWithoutExt}_watermarked.pdf`;
          
          watermarkedFiles.push({
            originalName: file.originalname,
            watermarkedName: watermarkedFilename,
            buffer: result.buffer,
            originalSize: result.originalSize,
            watermarkedSize: result.watermarkedSize
          });
        } else {
          console.error(`❌ [WATERMARK API] Watermark failed for ${file.originalname}:`, result.error);
          errors.push({
            filename: file.originalname,
            error: result.error
          });
        }
        
      } catch (fileError) {
        console.error(`❌ [WATERMARK API] Error processing ${file.originalname}:`, fileError.message);
        errors.push({
          filename: file.originalname,
          error: fileError.message
        });
      }
    }
    
    // Clean up uploaded files
    req.files.forEach(file => {
      fs.unlink(file.path, (err) => {
        if (err) console.error('Error deleting temp file:', err);
      });
    });
    
    if (watermarkedFiles.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'Failed to process any files',
        errors: errors
      });
    }
    
    // If only one file, return it directly
    if (watermarkedFiles.length === 1) {
      const file = watermarkedFiles[0];
      
      // Set headers for file download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${file.watermarkedName}"`);
      res.setHeader('Content-Length', file.buffer.length);
      
      // Send the watermarked PDF
      res.send(file.buffer);
      
      console.log('✅ [WATERMARK API] Single file watermark completed successfully');
      return;
    }
    
    // Multiple files - create ZIP
    console.log('📦 [WATERMARK API] Creating ZIP for multiple watermarked files...');
    
    const archiver = require('archiver');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const zipId = `watermark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const zipFilename = `watermarked_files_${timestamp}.zip`;
    
    // Create temp downloads directory
    const downloadDir = path.join(__dirname, 'temp', 'zips');
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }
    
    const zipPath = path.join(downloadDir, `${zipId}.zip`);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    archive.pipe(output);
    
    // Add each watermarked file to the ZIP
    watermarkedFiles.forEach(file => {
      archive.append(file.buffer, { name: file.watermarkedName });
    });
    
    await archive.finalize();
    
    // Wait for ZIP creation to complete
    await new Promise((resolve, reject) => {
      output.on('close', resolve);
      output.on('error', reject);
    });
    
    console.log('✅ [WATERMARK API] ZIP created successfully:', zipPath);
    
    // Return ZIP download information
    res.json({
      success: true,
      message: `Successfully watermarked ${watermarkedFiles.length} files`,
      totalFiles: req.files.length,
      successfulFiles: watermarkedFiles.length,
      failedFiles: errors.length,
      errors: errors.length > 0 ? errors : undefined,
      download: {
        zipId: zipId,
        filename: zipFilename,
        downloadUrl: `/api/download/${zipId}`,
        fileCount: watermarkedFiles.length
      }
    });
    
  } catch (error) {
    console.error('❌ [WATERMARK API] Unexpected error:', error.message);
    
    // Clean up uploaded files on error
    if (req.files) {
      req.files.forEach(file => {
        fs.unlink(file.path, (err) => {
          if (err) console.error('Error cleaning up file:', err);
        });
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error during watermark processing'
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
Organize & Download ZIP: http://localhost:${port}/api/organize-download
Organize & Download ZIP (Cached): http://localhost:${port}/api/organize-download-cached
Download ZIP: http://localhost:${port}/api/download/:zipId
Preview Organization: http://localhost:${port}/api/organize-preview
Health check: http://localhost:${port}/health

Features:
Web-based PDF upload and parsing
AI-powered document classification
Automatic document organization
Downloadable ZIP packages with organized files
Batch processing support (Base64 & File Upload)
REST API for programmatic access
Text statistics and metadata extraction
File size limit: 10MB per file
No file uploads for Base64 endpoint
Automatic cleanup of temporary files

Press Ctrl+C to stop the server
  `);
});
