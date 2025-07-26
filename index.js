const PDFParser = require('./lib/pdfParser');
const fs = require('fs');
const path = require('path');

// Command line interface for PDF parsing
class PDFParserCLI {
  constructor() {
    this.parser = new PDFParser();
  }

  async run() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      this.showHelp();
      return;
    }

    const command = args[0];

    switch (command) {
      case 'parse':
        await this.parseCommand(args.slice(1));
        break;
      case 'batch':
        await this.batchCommand(args.slice(1));
        break;
      case 'help':
        this.showHelp();
        break;
      default:
        // Assume it's a file path
        await this.parseFile(command, args.slice(1));
        break;
    }
  }

  async parseFile(filePath, options = []) {
    try {
      console.log(`\n📄 Parsing PDF: ${filePath}`);
      console.log('⏳ Processing...\n');

      const startTime = Date.now();
      const result = await this.parser.parseFile(filePath);
      const endTime = Date.now();

      if (result.success) {
        console.log('✅ PDF parsed successfully!\n');
        
        // Display metadata
        console.log('📊 Document Information:');
        console.log(`   File: ${result.metadata.fileName}`);
        console.log(`   Pages: ${result.metadata.pages}`);
        console.log(`   Size: ${this.formatFileSize(result.metadata.fileSize)}`);
        console.log(`   Processing time: ${endTime - startTime}ms\n`);

        // Display text statistics
        const stats = this.parser.getTextStats(result.text);
        console.log('📈 Text Statistics:');
        console.log(`   Characters: ${stats.characters.toLocaleString()}`);
        console.log(`   Words: ${stats.words.toLocaleString()}`);
        console.log(`   Sentences: ${stats.sentences.toLocaleString()}`);
        console.log(`   Paragraphs: ${stats.paragraphs.toLocaleString()}\n`);

        // Show preview of extracted text
        const preview = result.text.substring(0, 500);
        console.log('📝 Text Preview:');
        console.log('─'.repeat(50));
        console.log(preview + (result.text.length > 500 ? '...' : ''));
        console.log('─'.repeat(50));

        // Save to file if requested
        if (options.includes('--save') || options.includes('-s')) {
          await this.saveToFile(result, filePath);
        }

        // Show full text if requested
        if (options.includes('--full') || options.includes('-f')) {
          console.log('\n📄 Full Text:');
          console.log('═'.repeat(50));
          console.log(result.text);
          console.log('═'.repeat(50));
        }

      } else {
        console.error('❌ Error parsing PDF:');
        console.error(`   ${result.error}`);
      }

    } catch (error) {
      console.error('❌ Unexpected error:', error.message);
    }
  }

  async parseCommand(args) {
    if (args.length === 0) {
      console.log('❌ Please provide a PDF file path');
      return;
    }

    await this.parseFile(args[0], args.slice(1));
  }

  async batchCommand(args) {
    if (args.length === 0) {
      console.log('❌ Please provide a directory path');
      return;
    }

    const dirPath = args[0];
    
    if (!fs.existsSync(dirPath)) {
      console.log('❌ Directory not found:', dirPath);
      return;
    }

    const files = fs.readdirSync(dirPath)
      .filter(file => path.extname(file).toLowerCase() === '.pdf')
      .map(file => path.join(dirPath, file));

    if (files.length === 0) {
      console.log('❌ No PDF files found in directory');
      return;
    }

    console.log(`\n📁 Found ${files.length} PDF files`);
    console.log('🔄 Processing batch...\n');

    const results = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`[${i + 1}/${files.length}] Processing: ${path.basename(file)}`);
      
      const result = await this.parser.parseFile(file);
      results.push({
        file: path.basename(file),
        success: result.success,
        error: result.error,
        pages: result.metadata?.pages,
        words: result.success ? this.parser.getTextStats(result.text).words : 0
      });
    }

    // Summary
    console.log('\n📊 Batch Processing Summary:');
    console.log('─'.repeat(60));
    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;
    
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    
    if (failed > 0) {
      console.log('\n❌ Failed files:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`   ${r.file}: ${r.error}`);
      });
    }
  }

  async saveToFile(result, originalPath) {
    const outputPath = originalPath.replace('.pdf', '_extracted.txt');
    
    const content = `PDF Text Extraction Report
Generated: ${new Date().toLocaleString()}
Source: ${result.metadata.fileName}
Pages: ${result.metadata.pages}

${'='.repeat(50)}
EXTRACTED TEXT
${'='.repeat(50)}

${result.text}

${'='.repeat(50)}
STATISTICS
${'='.repeat(50)}

${JSON.stringify(this.parser.getTextStats(result.text), null, 2)}
`;

    fs.writeFileSync(outputPath, content, 'utf8');
    console.log(`💾 Text saved to: ${outputPath}`);
  }

  formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  showHelp() {
    console.log(`
📄 PDF Text Parser CLI

Usage:
  node index.js <pdf-file>              Parse a single PDF file
  node index.js parse <pdf-file>        Parse a single PDF file
  node index.js batch <directory>       Parse all PDFs in directory
  node index.js help                    Show this help

Options:
  --save, -s                           Save extracted text to file
  --full, -f                           Show full extracted text

Examples:
  node index.js document.pdf
  node index.js parse document.pdf --save
  node index.js batch ./pdfs/
  node index.js document.pdf --full --save

Features:
  ✅ Extract text from PDF files
  ✅ Display document metadata
  ✅ Show text statistics
  ✅ Batch processing
  ✅ Save results to file
  ✅ Error handling
`);
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  const cli = new PDFParserCLI();
  cli.run().catch(console.error);
}

module.exports = PDFParserCLI;