const fs = require('fs-extra');
const path = require('path');

class FileOrganizer {
  constructor() {
    this.baseOutputDir = './organized_documents';
    
    // Folder mapping based on categories
    this.folderMapping = {
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
  }

  /**
   * Create downloadable ZIP from cached classification results
   * @param {Array} classificationResults - Cached classification results
   * @param {Array} sourceFiles - Array of source file information {filename, base64Data}
   * @returns {Object} ZIP creation result with download info
   */
  async createDownloadableZipFromCached(classificationResults, sourceFiles) {
    try {
      console.log('[FileOrganizer] Creating downloadable ZIP from cached results...');
      
      // Create temporary directory for organization
      const tempId = Date.now().toString();
      const tempOrgDir = path.join(__dirname, '..', 'temp', 'organize', tempId);
      
      // Ensure temp directory exists
      await fs.ensureDir(tempOrgDir);
      
      // Create temporary files from base64 data
      const tempFilePaths = [];
      for (let i = 0; i < sourceFiles.length; i++) {
        const sourceFile = sourceFiles[i];
        const tempFilePath = path.join(tempOrgDir, `temp_${i}_${sourceFile.filename}`);
        
        // Convert base64 to buffer and write to temp file
        const buffer = Buffer.from(sourceFile.base64Data, 'base64');
        await fs.writeFile(tempFilePath, buffer);
        tempFilePaths.push(tempFilePath);
      }
      
      console.log('[FileOrganizer] Created', tempFilePaths.length, 'temporary files');
      
      // Organize files using the existing method
      const organizationResult = await this.organizeFilesForDownload(
        classificationResults,
        tempFilePaths,
        tempOrgDir
      );
      
      if (!organizationResult.success) {
        throw new Error(`Organization failed: ${organizationResult.error}`);
      }
      
      // Create ZIP file
      const zipResult = await this.createZipFromOrganizedFiles(organizationResult.tempOrgDir);
      
      // Clean up temporary organization directory
      await this.cleanupTempFiles([tempOrgDir]);
      
      return {
        ...zipResult,
        summary: organizationResult.summary
      };
      
    } catch (error) {
      console.error('[FileOrganizer] Error creating downloadable ZIP from cached results:', error);
      throw error;
    }
  }

  /**
   * Create folder structure for all categories
   * @param {string} baseDir - Base directory for organization
   * @returns {Promise<Object>} Created folders info
   */
  async createFolderStructure(baseDir = null) {
    const outputDir = baseDir || this.baseOutputDir;
    const createdFolders = {};

    try {
      // Create base directory if it doesn't exist
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Create category folders
      for (const [category, folderName] of Object.entries(this.folderMapping)) {
        const folderPath = path.join(outputDir, folderName);
        
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true });
          createdFolders[category] = {
            path: folderPath,
            name: folderName,
            created: true
          };
        } else {
          createdFolders[category] = {
            path: folderPath,
            name: folderName,
            created: false
          };
        }
      }

      return {
        success: true,
        baseDir: outputDir,
        folders: createdFolders,
        message: 'Folder structure created successfully'
      };

    } catch (error) {
      console.error('Error creating folder structure:', error);
      return {
        success: false,
        error: error.message,
        folders: createdFolders
      };
    }
  }

  /**
   * Organize files based on classification results with custom numbering
   * @param {Array} classificationResults - Array of classification results
   * @param {string} sourceDir - Source directory containing files
   * @param {string} targetDir - Target directory for organization
   * @param {Object} numberingConfig - Document numbering configuration
   * @returns {Promise<Object>} Organization results
   */
  async organizeFilesWithNumbering(classificationResults, sourceDir, targetDir = null, numberingConfig = {}) {
    const outputDir = targetDir || this.baseOutputDir;
    const results = {
      success: true,
      organized: [],
      failed: [],
      summary: {}
    };

    // Category prefixes for file naming
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

    // Initialize counters for each category
    const categoryCounters = {};
    Object.keys(categoryPrefixes).forEach(category => {
      categoryCounters[category] = numberingConfig[category] || 1;
    });

    try {
      // Create folder structure first
      const folderResult = await this.createFolderStructure(outputDir);
      if (!folderResult.success) {
        throw new Error('Failed to create folder structure: ' + folderResult.error);
      }

      // Process each classification result
      for (const result of classificationResults) {
        try {
          if (!result.success) {
            results.failed.push({
              filename: result.filename,
              error: result.error || 'Classification failed',
              category: result.category
            });
            continue;
          }

          const sourceFile = path.join(sourceDir, result.filename);
          const targetFolder = folderResult.folders[result.category];
          
          if (!targetFolder) {
            results.failed.push({
              filename: result.filename,
              error: 'Unknown category: ' + result.category,
              category: result.category
            });
            continue;
          }

          // Check if source file exists
          if (!fs.existsSync(sourceFile)) {
            results.failed.push({
              filename: result.filename,
              error: 'Source file not found',
              category: result.category
            });
            continue;
          }

          // Generate custom filename with numbering
          const prefix = categoryPrefixes[result.category] || 'ICTUNK';
          const counter = categoryCounters[result.category];
          const paddedCounter = counter.toString().padStart(3, '0');
          const requesterName = result.requester && result.requester !== 'N/A' ? result.requester : 'Unknown';
          const ext = path.extname(result.filename);
          
          const newFilename = `${prefix}${paddedCounter} - ${requesterName}${ext}`;
          
          // Generate target file path with duplicate handling
          const targetFile = this.generateTargetPathWithCustomName(targetFolder.path, newFilename);
          
          // Copy file to target location
          fs.copyFileSync(sourceFile, targetFile);

          // Increment counter for this category
          categoryCounters[result.category]++;

          results.organized.push({
            originalName: result.filename,
            newName: path.basename(targetFile),
            category: result.category,
            categoryName: result.categoryName,
            confidence: result.confidence,
            requester: result.requester,
            sourcePath: sourceFile,
            targetPath: targetFile,
            targetFolder: targetFolder.name,
            documentNumber: paddedCounter
          });

        } catch (fileError) {
          console.error(`Error organizing file ${result.filename}:`, fileError);
          results.failed.push({
            filename: result.filename,
            error: fileError.message,
            category: result.category
          });
        }
      }

      // Generate summary
      results.summary = this.generateSummary(results.organized, results.failed);

    } catch (error) {
      console.error('Error in file organization with numbering:', error);
      results.success = false;
      results.error = error.message;
    }

    return results;
  }

  /**
   * Generate target file path with custom name and duplicate handling
   * @param {string} targetDir - Target directory
   * @param {string} filename - Custom filename
   * @returns {string} Target file path
   */
  generateTargetPathWithCustomName(targetDir, filename) {
    const ext = path.extname(filename);
    const baseName = path.basename(filename, ext);
    let targetPath = path.join(targetDir, filename);
    let counter = 1;

    // Handle duplicates by adding counter
    while (fs.existsSync(targetPath)) {
      const newFilename = `${baseName}_dup${counter}${ext}`;
      targetPath = path.join(targetDir, newFilename);
      counter++;
    }

    return targetPath;
  }

  /**
   * Organize files based on classification results
   * @param {Array} classificationResults - Array of classification results
   * @param {string} sourceDir - Source directory containing files
   * @param {string} targetDir - Target directory for organization
   * @returns {Promise<Object>} Organization results
   */
  async organizeFiles(classificationResults, sourceDir, targetDir = null) {
    const outputDir = targetDir || this.baseOutputDir;
    const results = {
      success: true,
      organized: [],
      failed: [],
      summary: {}
    };

    try {
      // Create folder structure first
      const folderResult = await this.createFolderStructure(outputDir);
      if (!folderResult.success) {
        throw new Error('Failed to create folder structure: ' + folderResult.error);
      }

      // Process each classification result
      for (const result of classificationResults) {
        try {
          if (!result.success) {
            results.failed.push({
              filename: result.filename,
              error: result.error || 'Classification failed',
              category: result.category
            });
            continue;
          }

          const sourceFile = path.join(sourceDir, result.filename);
          const targetFolder = folderResult.folders[result.category];
          
          if (!targetFolder) {
            results.failed.push({
              filename: result.filename,
              error: 'Unknown category: ' + result.category,
              category: result.category
            });
            continue;
          }

          // Check if source file exists
          if (!fs.existsSync(sourceFile)) {
            results.failed.push({
              filename: result.filename,
              error: 'Source file not found',
              category: result.category
            });
            continue;
          }

          // Generate target file path with duplicate handling
          const targetFile = this.generateTargetPath(targetFolder.path, result.filename);
          
          // Copy file to target location
          fs.copyFileSync(sourceFile, targetFile);

          results.organized.push({
            filename: result.filename,
            category: result.category,
            categoryName: result.categoryName,
            confidence: result.confidence,
            sourcePath: sourceFile,
            targetPath: targetFile,
            targetFolder: targetFolder.name
          });

        } catch (fileError) {
          console.error(`Error organizing file ${result.filename}:`, fileError);
          results.failed.push({
            filename: result.filename,
            error: fileError.message,
            category: result.category
          });
        }
      }

      // Generate summary
      results.summary = this.generateSummary(results.organized, results.failed);

    } catch (error) {
      console.error('Error in file organization:', error);
      results.success = false;
      results.error = error.message;
    }

    return results;
  }

  /**
   * Generate target file path with duplicate handling
   * @param {string} targetDir - Target directory
   * @param {string} filename - Original filename
   * @returns {string} Target file path
   */
  generateTargetPath(targetDir, filename) {
    const ext = path.extname(filename);
    const baseName = path.basename(filename, ext);
    let targetPath = path.join(targetDir, filename);
    let counter = 1;

    // Handle duplicates by adding counter
    while (fs.existsSync(targetPath)) {
      const newFilename = `${baseName}_${counter}${ext}`;
      targetPath = path.join(targetDir, newFilename);
      counter++;
    }

    return targetPath;
  }

  /**
   * Generate organization summary
   * @param {Array} organized - Successfully organized files
   * @param {Array} failed - Failed files
   * @returns {Object} Summary statistics
   */
  generateSummary(organized, failed) {
    const summary = {
      total: organized.length + failed.length,
      successful: organized.length,
      failed: failed.length,
      successRate: 0,
      categoryBreakdown: {},
      confidenceStats: {
        high: 0,    // >= 0.8
        medium: 0,  // 0.5 - 0.79
        low: 0      // < 0.5
      }
    };

    if (summary.total > 0) {
      summary.successRate = (summary.successful / summary.total) * 100;
    }

    // Category breakdown
    organized.forEach(item => {
      const category = item.categoryName || item.category;
      summary.categoryBreakdown[category] = (summary.categoryBreakdown[category] || 0) + 1;
    });

    // Confidence statistics
    organized.forEach(item => {
      if (item.confidence >= 0.8) {
        summary.confidenceStats.high++;
      } else if (item.confidence >= 0.5) {
        summary.confidenceStats.medium++;
      } else {
        summary.confidenceStats.low++;
      }
    });

    return summary;
  }

  /**
   * Create ZIP archive of organized files
   * @param {string} sourceDir - Directory to zip
   * @param {string} zipPath - Output ZIP file path
   * @returns {Promise<Object>} ZIP creation result
   */
  async createZipArchive(sourceDir, zipPath) {
    try {
      const archiver = require('archiver');
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      return new Promise((resolve, reject) => {
        output.on('close', () => {
          resolve({
            success: true,
            zipPath: zipPath,
            size: archive.pointer(),
            message: 'ZIP archive created successfully'
          });
        });

        archive.on('error', (err) => {
          reject({
            success: false,
            error: err.message
          });
        });

        archive.pipe(output);
        archive.directory(sourceDir, false);
        archive.finalize();
      });

    } catch (error) {
      console.error('Error creating ZIP archive:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Preview organization without actually moving files
   * @param {Array} classificationResults - Classification results
   * @param {string} sourceDir - Source directory
   * @returns {Object} Preview of organization
   */
  previewOrganization(classificationResults, sourceDir) {
    const preview = {
      folderStructure: {},
      fileDistribution: {},
      summary: {
        total: classificationResults.length,
        successful: 0,
        failed: 0
      }
    };

    // Initialize folder structure
    Object.entries(this.folderMapping).forEach(([category, folderName]) => {
      preview.folderStructure[folderName] = {
        category: category,
        files: [],
        count: 0
      };
    });

    // Process classification results
    classificationResults.forEach(result => {
      if (result.success && this.folderMapping[result.category]) {
        const folderName = this.folderMapping[result.category];
        preview.folderStructure[folderName].files.push({
          filename: result.filename,
          confidence: result.confidence,
          category: result.category
        });
        preview.folderStructure[folderName].count++;
        preview.summary.successful++;
      } else {
        preview.summary.failed++;
      }
    });

    // Generate file distribution
    Object.entries(preview.folderStructure).forEach(([folderName, data]) => {
      if (data.count > 0) {
        preview.fileDistribution[folderName] = data.count;
      }
    });

    return preview;
  }

  /**
   * Organize files in a temporary directory for ZIP download
   * @param {Array} classificationResults - Array of classification results
   * @param {Object} fileMapping - Mapping of filenames to file paths
   * @param {string} tempDir - Temporary directory for organization
   * @returns {Promise<Object>} Organization results
   */
  async organizeFilesForDownload(classificationResults, fileMapping, tempDir = null) {
    const outputDir = tempDir || `./temp_organize_${Date.now()}`;
    const results = {
      success: true,
      organized: [],
      failed: [],
      summary: {},
      tempDir: outputDir
    };

    // Category prefixes for file naming
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

    // Initialize counters for each category
    const categoryCounters = {};
    Object.keys(categoryPrefixes).forEach(category => {
      categoryCounters[category] = 1;
    });

    try {
      // Create temporary folder structure
      const folderResult = await this.createFolderStructure(outputDir);
      if (!folderResult.success) {
        throw new Error('Failed to create folder structure: ' + folderResult.error);
      }

      // Process each classification result
      for (const result of classificationResults) {
        try {
          if (!result.success) {
            results.failed.push({
              filename: result.filename,
              error: result.error || 'Classification failed',
              category: result.category
            });
            continue;
          }

          const sourceFile = fileMapping[result.filename];
          const targetFolder = folderResult.folders[result.category];
          
          if (!targetFolder) {
            results.failed.push({
              filename: result.filename,
              error: 'Unknown category: ' + result.category,
              category: result.category
            });
            continue;
          }

          // Check if source file exists
          if (!sourceFile || !fs.existsSync(sourceFile)) {
            results.failed.push({
              filename: result.filename,
              error: 'Source file not found',
              category: result.category
            });
            continue;
          }

          // Generate custom filename with numbering
          const prefix = categoryPrefixes[result.category] || 'ICTUNK';
          const counter = categoryCounters[result.category];
          const paddedCounter = counter.toString().padStart(3, '0');
          const requesterName = result.requester && result.requester !== 'N/A' ? result.requester : 'Unknown';
          const ext = path.extname(result.filename);
          
          const newFilename = `${prefix}${paddedCounter} - ${requesterName}${ext}`;
          
          // Generate target file path with duplicate handling
          const targetFile = this.generateTargetPathWithCustomName(targetFolder.path, newFilename);
          
          // Copy file to target location
          fs.copyFileSync(sourceFile, targetFile);

          // Increment counter for this category
          categoryCounters[result.category]++;

          results.organized.push({
            originalName: result.filename,
            newName: path.basename(targetFile),
            category: result.category,
            categoryName: result.categoryName,
            confidence: result.confidence,
            requester: result.requester,
            sourcePath: sourceFile,
            targetPath: targetFile,
            targetFolder: targetFolder.name,
            documentNumber: paddedCounter
          });

        } catch (fileError) {
          console.error(`Error organizing file ${result.filename}:`, fileError);
          results.failed.push({
            filename: result.filename,
            error: fileError.message,
            category: result.category
          });
        }
      }

      // Generate summary
      results.summary = this.generateSummary(results.organized, results.failed);

    } catch (error) {
      console.error('Error in file organization for download:', error);
      results.success = false;
      results.error = error.message;
    }

    return results;
  }

  /**
   * Create ZIP file from organized directory and return download info
   * @param {string} sourceDir - Directory to zip
   * @param {string} zipName - Name for the ZIP file (without extension)
   * @returns {Promise<Object>} ZIP creation result with download info
   */
  async createDownloadableZip(sourceDir, zipName = 'organized_documents') {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const zipFilename = `${zipName}_${timestamp}.zip`;
      const zipPath = path.join('./temp_downloads', zipFilename);
      
      // Create temp downloads directory
      const downloadDir = './temp_downloads';
      if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
      }

      // Create ZIP archive
      const zipResult = await this.createZipArchive(sourceDir, zipPath);
      
      if (zipResult.success) {
        return {
          success: true,
          zipPath: zipPath,
          zipFilename: zipFilename,
          downloadUrl: `/download/${zipFilename}`,
          size: zipResult.size,
          message: 'ZIP file created successfully'
        };
      } else {
        throw new Error(zipResult.error);
      }

    } catch (error) {
      console.error('Error creating downloadable ZIP:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clean up temporary directories and files
   * @param {Array} paths - Array of paths to clean up
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanupTempFiles(paths) {
    const results = {
      success: true,
      cleaned: [],
      failed: []
    };

    for (const filePath of paths) {
      try {
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          
          if (stats.isDirectory()) {
            // Remove directory recursively
            fs.rmSync(filePath, { recursive: true, force: true });
          } else {
            // Remove file
            fs.unlinkSync(filePath);
          }
          
          results.cleaned.push(filePath);
          console.log(`✅ Cleaned up: ${filePath}`);
        }
      } catch (error) {
        console.error(`❌ Failed to clean up ${filePath}:`, error);
        results.failed.push({
          path: filePath,
          error: error.message
        });
      }
    }

    if (results.failed.length > 0) {
      results.success = false;
    }

    return results;
  }

  /**
   * Generate target file path with custom name and duplicate handling
   * @param {string} targetDir - Target directory
   * @param {string} customFilename - Custom filename
   * @returns {string} Target file path
   */
  generateTargetPathWithCustomName(targetDir, customFilename) {
    const ext = path.extname(customFilename);
    const baseName = path.basename(customFilename, ext);
    let targetPath = path.join(targetDir, customFilename);
    let counter = 1;

    // Handle duplicates by adding counter
    while (fs.existsSync(targetPath)) {
      const newFilename = `${baseName}_${counter}${ext}`;
      targetPath = path.join(targetDir, newFilename);
      counter++;
    }

    return targetPath;
  }

  /**
   * Get folder mapping
   * @returns {Object} Folder mapping
   */
  getFolderMapping() {
    return this.folderMapping;
  }

  /**
   * Set base output directory
   * @param {string} dir - New base directory
   */
  setBaseOutputDir(dir) {
    this.baseOutputDir = dir;
  }
}

module.exports = FileOrganizer;