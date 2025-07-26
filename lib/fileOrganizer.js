const fs = require('fs');
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
      'OOPR': 'Out of Policy Request',
      'SRF': 'SRF Scan',
      'DO': 'Skip'
    };
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