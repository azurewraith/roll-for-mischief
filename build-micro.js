const fs = require('fs');

// Ultra-aggressive build for 13KB target
function buildMicro() {
  console.log('🐱 Building ultra-compressed cat battle royale...');
  
  // Read micro components
  const pathfinder = fs.readFileSync('./src/micro-pathfinder.js', 'utf8');
  const renderer = fs.readFileSync('./src/micro-renderer.js', 'utf8');
  const game = fs.readFileSync('./src/micro-game.js', 'utf8');
  
  // Combine and ultra-compress
  let combined = pathfinder + renderer + game;
  
  // Simple compression that doesn't break strings
  const compressions = [
    // Remove all comments
    [/\/\*[\s\S]*?\*\//g, ''],
    [/\/\/.*$/gm, ''],
    
    // Basic whitespace compression - but preserve URL structures
    [/\s+(?!:\/\/)/g, ' '],
    [/\s*{\s*/g, '{'],
    [/\s*}\s*/g, '}'],
    [/\s*;\s*/g, ';'],
    [/\s*,\s*/g, ','],
    [/\s*\(\s*/g, '('],
    [/\s*\)\s*/g, ')'],
    
    // Remove trailing semicolons before }
    [/;\s*}/g, '}'],
    
    // Remove leading/trailing whitespace from lines
    [/^\s+/gm, ''],
    [/\s+$/gm, ''],
  ];
  
  for (const [pattern, replacement] of compressions) {
    combined = combined.replace(pattern, replacement);
  }
  
  // Don't add aliases that might break syntax
  // Just keep the code as-is after compression
  
  // Read HTML template
  let html = fs.readFileSync('./src/index.html', 'utf8');
  
  // Compress HTML too
  html = html
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .replace(/\s*=\s*"/g, '="')
    .replace(/"\s+/g, '" ')
    .replace(/<!--[\s\S]*?-->/g, '');
  
  // Inline the compressed JS
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
    execSync('cd dist && zip -9 -r ../cats-13k-micro.zip .');
    console.log('📦 Created cats-13k-micro.zip');
    
    // Check size
    const stats = fs.statSync('./cats-13k-micro.zip');
    const sizeMB = (stats.size / 1024).toFixed(2);
    const percent = ((stats.size / 13312) * 100).toFixed(1);
    
    console.log(`📏 ZIP Size: ${stats.size} bytes (${sizeMB}KB) - ${percent}% of limit`);
    
    if (stats.size > 13312) {
      console.error(`❌ Still over limit by ${stats.size - 13312} bytes!`);
    } else {
      console.log(`✅ SUCCESS! ${13312 - stats.size} bytes remaining`);
    }
    
    // Show compression stats
    console.log(`📊 Original JS: ${pathfinder.length + renderer.length + game.length} bytes`);
    console.log(`📊 Compressed JS: ${combined.length} bytes`);
    console.log(`📊 Final HTML: ${html.length} bytes`);
    
  } catch (error) {
    console.error('❌ Failed to create ZIP:', error.message);
  }
}

buildMicro();