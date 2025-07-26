# PDF Text Parser & Classifier

A powerful Node.js application for extracting text from PDF files using multiple OCR engines and AI-powered document classification.

## 🚀 Features

### Text Extraction
- **🔤 Tesseract OCR**: Offline text extraction using Tesseract.js
- **🤖 OpenAI Vision API**: Advanced image-based text extraction using GPT-4 Vision
- **🚀 OpenAI Responses API**: Direct PDF processing with GPT-4.1 (NEW!)
- **📄 Direct Text Extraction**: Using `pdf-parse` for text-based PDFs

### Document Classification
- **🎯 AI-Powered Classification**: Automatic document categorization using OpenAI GPT
- **📁 Auto-Organization**: Automatically organize documents into folders
- **🔄 Manual Override**: Review and correct classifications before processing
- **📊 Batch Processing**: Handle multiple documents simultaneously

### Supported Document Types
- **BA_HALO**: Kartu Halo (SIM card related documents)
- **BA_KKB**: Berita Kehilangan (Loss/missing item reports)
- **BASTB**: Serah Terima Barang (Goods handover/delivery documents)
- **CHR**: Checklist Reimbursement HP (Phone reimbursement checklists)
- **COF**: COF Scan (Checkout Form documents)
- **OOPR**: Out of Policy Request (Exception/special requests)
- **SRF**: SRF Scan (Service Request Forms)

### Additional Features
- **Web Interface**: Modern Express.js server with file upload functionality
- **CLI Support**: Command-line interface for batch processing
- **Multiple Output Formats**: Plain text, JSON, structured data

## 🛠️ Installation

1. Clone the repository:
```bash
git clone https://github.com/widjis/PDF-Text-Parser.git
cd PDF-Text-Parser
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file and add your OpenAI API key:
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

4. Start the server:
```bash
npm start
```

5. Open your browser and navigate to `http://localhost:3000`

## 📋 Requirements

- Node.js 14+ 
- OpenAI API Key (for AI-powered features)
- Internet connection (for OpenAI features)

## 🎯 Usage

### Single Document Processing
1. Upload a PDF file
2. Select OCR method (Tesseract, OpenAI Vision, or OpenAI Responses)
3. Click "Parse PDF"
4. View extracted text and statistics

### Batch Classification & Organization
1. Upload multiple PDF files
2. Review auto-classifications
3. Override any incorrect classifications
4. Click "Process" to organize files into folders
5. Download organized folder structure

### CLI Usage

```bash
# Parse a single PDF file
node index.js path/to/your/file.pdf

# Parse with OCR fallback
node index.js path/to/your/file.pdf --ocr

# Parse multiple files
node index.js path/to/folder/*.pdf
```

### Web Server

```bash
# Start the web server
npm run server

# Access the web interface at http://localhost:3000
```

### Programmatic Usage

```javascript
const PDFParser = require('./lib/pdfParser');

const parser = new PDFParser();

// Parse PDF file
parser.parseFile('path/to/file.pdf')
  .then(result => {
    console.log('Extracted text:', result.text);
    console.log('Metadata:', result.metadata);
  })
  .catch(error => {
    console.error('Error:', error);
  });
```

## 🔧 API Endpoints

- `POST /parse` - Parse single PDF file
- `POST /parse-multiple` - Parse multiple PDF files
- `POST /classify` - Classify documents (Coming Soon)
- `POST /organize` - Organize classified documents (Coming Soon)
- `GET /` - Web interface for file upload
- `GET /health` - Health check endpoint

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🙏 Acknowledgments

- OpenAI for their powerful APIs
- Tesseract.js for offline OCR capabilities
- pdf-poppler for PDF to image conversion

## 📞 Support

If you have any questions or issues, please open an issue on GitHub.

---

Made with ❤️ by [Widji Santoso](https://github.com/widjis)