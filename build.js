const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Simple build system optimized for 13KB target
class JS13kBuilder {
  constructor() {
    this.srcDir = './src';
    this.distDir = './dist';
    this.maxSize = 13312; // 13KB in bytes
  }

  build() {
    console.log('🐱 Building JS13k Cats Battle Royale...');
    
    // Clean dist directory
    if (fs.existsSync(this.distDir)) {
      fs.rmSync(this.distDir, { recursive: true });
    }
    fs.mkdirSync(this.distDir);

    // Read and concatenate all JS files
    const jsFiles = this.getJSFiles(this.srcDir);
    let combinedJS = jsFiles.map(file => {
      console.log(`📦 Including: ${file}`);
      return fs.readFileSync(file, 'utf8');
    }).join('\n');

    // Read HTML template
    const htmlTemplate = fs.readFileSync('./src/index.html', 'utf8');
    
    // Inline JS into HTML
    const finalHTML = htmlTemplate.replace('/* INLINE_JS */', combinedJS);
    
    // Write to dist
    fs.writeFileSync(path.join(this.distDir, 'index.html'), finalHTML);
    
    // Create ZIP
    this.createZip();
    
    // Check size
    this.checkSize();
  }

  getJSFiles(dir) {
    const files = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...this.getJSFiles(fullPath));
      } else if (item.endsWith('.js')) {
        files.push(fullPath);
      }
    }
    
    // Order files by dependency (main.js last)
    return files.sort((a, b) => {
      if (a.includes('main.js')) return 1;
      if (b.includes('main.js')) return -1;
      return 0;
    });
  }

  createZip() {
    try {
      execSync(`cd ${this.distDir} && zip -9 -r ../cats-13k.zip .`);
      console.log('📦 Created cats-13k.zip');
    } catch (error) {
      console.error('❌ Failed to create ZIP:', error.message);
    }
  }

  checkSize() {
    try {
      const stats = fs.statSync('./cats-13k.zip');
      const sizeMB = (stats.size / 1024).toFixed(2);
      const percent = ((stats.size / this.maxSize) * 100).toFixed(1);
      
      console.log(`📏 ZIP Size: ${stats.size} bytes (${sizeMB}KB) - ${percent}% of limit`);
      
      if (stats.size > this.maxSize) {
        console.error(`❌ Size exceeds 13KB limit by ${stats.size - this.maxSize} bytes!`);
        process.exit(1);
      } else {
        console.log(`✅ Size OK! ${this.maxSize - stats.size} bytes remaining`);
      }
    } catch (error) {
      console.error('❌ Failed to check size:', error.message);
    }
  }
}

// Run build
const builder = new JS13kBuilder();
builder.build();