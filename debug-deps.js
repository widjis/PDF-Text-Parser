#!/usr/bin/env node

console.log('🔍 Debugging Dependencies...');
console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);
console.log('Node version:', process.version);
console.log('');

const dependencies = [
    '@napi-rs/canvas',
    'pdf-poppler', 
    'pdf2pic',
    'tesseract.js',
    'pdfjs-dist',
    'pdf-parse'
];

async function testDependency(depName) {
    try {
        console.log(`Testing ${depName}...`);
        const dep = require(depName);
        console.log(`✅ ${depName} loaded successfully`);
        return true;
    } catch (error) {
        console.log(`❌ ${depName} failed:`, error.message);
        if (error.message.includes('linux is NOT supported')) {
            console.log(`🎯 FOUND THE CULPRIT: ${depName}`);
        }
        return false;
    }
}

async function main() {
    console.log('Testing each dependency individually...\n');
    
    for (const dep of dependencies) {
        await testDependency(dep);
        console.log('');
    }
    
    console.log('Dependency test completed.');
}

main().catch(console.error);