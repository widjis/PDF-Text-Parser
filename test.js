const PDFParser = require('./lib/pdfParser');
const path = require('path');

// Test the PDF parser functionality
async function runTests() {
  console.log('🧪 PDF Parser Test Suite\n');
  
  const parser = new PDFParser();
  
  // Test 1: Basic functionality test
  console.log('Test 1: Testing parser initialization...');
  try {
    console.log('✅ Parser initialized successfully');
    console.log(`   Supported formats: ${parser.supportedFormats.join(', ')}\n`);
  } catch (error) {
    console.log('❌ Parser initialization failed:', error.message);
    return;
  }

  // Test 2: Test with non-existent file
  console.log('Test 2: Testing with non-existent file...');
  try {
    const result = await parser.parseFile('non-existent-file.pdf');
    if (!result.success && result.error.includes('File not found')) {
      console.log('✅ Correctly handled non-existent file');
    } else {
      console.log('❌ Did not handle non-existent file correctly');
    }
  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
  console.log();

  // Test 3: Test with invalid file format
  console.log('Test 3: Testing with invalid file format...');
  try {
    const result = await parser.parseFile('test.txt');
    if (!result.success && result.error.includes('Unsupported file format')) {
      console.log('✅ Correctly handled invalid file format');
    } else {
      console.log('❌ Did not handle invalid file format correctly');
    }
  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
  console.log();

  // Test 4: Test text cleaning function
  console.log('Test 4: Testing text cleaning function...');
  try {
    const dirtyText = '  This   is    a   test   text  with   multiple   spaces  \n\n\n  and  empty  lines  ';
    const cleanText = parser.cleanText(dirtyText);
    const expected = 'This is a test text with multiple spaces and empty lines';
    
    if (cleanText === expected) {
      console.log('✅ Text cleaning works correctly');
    } else {
      console.log('❌ Text cleaning failed');
      console.log(`   Expected: "${expected}"`);
      console.log(`   Got: "${cleanText}"`);
    }
  } catch (error) {
    console.log('❌ Text cleaning error:', error.message);
  }
  console.log();

  // Test 5: Test text statistics
  console.log('Test 5: Testing text statistics...');
  try {
    const testText = 'Hello world! This is a test. How are you? Fine, thanks.';
    const stats = parser.getTextStats(testText);
    
    console.log('✅ Text statistics generated:');
    console.log(`   Characters: ${stats.characters}`);
    console.log(`   Words: ${stats.words}`);
    console.log(`   Sentences: ${stats.sentences}`);
    console.log(`   Paragraphs: ${stats.paragraphs}`);
  } catch (error) {
    console.log('❌ Text statistics error:', error.message);
  }
  console.log();

  // Test 6: Test buffer parsing with dummy data
  console.log('Test 6: Testing buffer parsing with invalid data...');
  try {
    const dummyBuffer = Buffer.from('This is not a PDF file');
    const result = await parser.parseBuffer(dummyBuffer);
    
    if (!result.success) {
      console.log('✅ Correctly handled invalid PDF buffer');
    } else {
      console.log('❌ Should have failed with invalid PDF buffer');
    }
  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
  console.log();

  // Test 7: Create a sample PDF for testing (if you have one)
  console.log('Test 7: Instructions for testing with real PDF...');
  console.log('📝 To test with a real PDF file:');
  console.log('   1. Place a PDF file in this directory');
  console.log('   2. Run: node test.js path/to/your/file.pdf');
  console.log('   3. Or use the CLI: node index.js your-file.pdf');
  console.log('   4. Or start the web server: node server.js');
  console.log();

  console.log('🎉 Test suite completed!');
  console.log('\n📚 Usage Examples:');
  console.log('   CLI: node index.js document.pdf');
  console.log('   Web: node server.js (then visit http://localhost:3000)');
  console.log('   API: POST to http://localhost:3000/api/parse');
}

// If a file path is provided as argument, test with that file
async function testWithFile(filePath) {
  console.log(`\n🔍 Testing with file: ${filePath}\n`);
  
  const parser = new PDFParser();
  const result = await parser.parseFile(filePath);
  
  if (result.success) {
    console.log('✅ PDF parsed successfully!');
    console.log('\n📊 Metadata:');
    console.log(JSON.stringify(result.metadata, null, 2));
    
    const stats = parser.getTextStats(result.text);
    console.log('\n📈 Statistics:');
    console.log(JSON.stringify(stats, null, 2));
    
    console.log('\n📝 Text Preview (first 500 characters):');
    console.log('─'.repeat(50));
    console.log(result.text.substring(0, 500) + (result.text.length > 500 ? '...' : ''));
    console.log('─'.repeat(50));
  } else {
    console.log('❌ Failed to parse PDF:');
    console.log(`   Error: ${result.error}`);
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    // Test with provided file
    testWithFile(args[0]).catch(console.error);
  } else {
    // Run test suite
    runTests().catch(console.error);
  }
}