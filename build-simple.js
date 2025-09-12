const fs = require('fs');

// Minimal build for testing - no compression
function buildSimple() {
  console.log('🐱 Building simple version...');
  
  // Read micro components
  const pathfinder = fs.readFileSync('./src/micro-pathfinder.js', 'utf8');
  const renderer = fs.readFileSync('./src/micro-renderer.js', 'utf8');
  const game = fs.readFileSync('./src/micro-game.js', 'utf8');
  
  // Just combine - minimal compression
  let combined = pathfinder + '\n' + renderer + '\n' + game;
  
  // Only remove block comments - skip line comments to avoid breaking URLs
  combined = combined.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Read HTML template
  let html = fs.readFileSync('./src/index.html', 'utf8');
  
  // Inline the JS
  html = html.replace('/* INLINE_JS */', combined);
  
  // Clean dist directory and write
  if (fs.existsSync('./dist')) {
    fs.rmSync('./dist', { recursive: true });
  }
  fs.mkdirSync('./dist');
  fs.writeFileSync('./dist/index.html', html);
  
  // Create ZIP
  try {
    const { execSync } = require('child_process');
    execSync('cd dist && zip -9 -r ../cats-13k-simple.zip .');
    console.log('📦 Created cats-13k-simple.zip');
    
    // Check size
    const stats = fs.statSync('./cats-13k-simple.zip');
    const sizeMB = (stats.size / 1024).toFixed(2);
    const percent = ((stats.size / 13312) * 100).toFixed(1);
    
    console.log(`📏 ZIP Size: ${stats.size} bytes (${sizeMB}KB) - ${percent}% of limit`);
    
    if (stats.size > 13312) {
      console.error(`❌ Over limit by ${stats.size - 13312} bytes!`);
    } else {
      console.log(`✅ SUCCESS! ${13312 - stats.size} bytes remaining`);
    }
    
  } catch (error) {
    console.error('❌ Failed to create ZIP:', error.message);
  }
}

buildSimple();