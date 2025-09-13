const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Minification function for the build
function minifyCode(code) {
  // Remove all console.* statements
  code = code.replace(/console\.(log|error|warn|info|debug)\([^)]*\);?/g, '');
  
  // Remove empty lines created by console removal
  code = code.replace(/^\s*\n/gm, '');
  
  // Remove all comments
  code = code.replace(/\/\*[\s\S]*?\*\//g, ''); // Block comments
  code = code.replace(/\/\/.*$/gm, ''); // Line comments
  
  // Compress whitespace (but keep code structure)
  code = code.replace(/\s+/g, ' '); // Multiple spaces to single
  code = code.replace(/\s*([{}();,:])\s*/g, '$1'); // Remove spaces around operators
  code = code.replace(/;\s*}/g, '}'); // Remove unnecessary semicolons
  
  return code;
}

// String compression for common game messages
function compressStrings(code) {
  // Common game messages that appear frequently
  const commonStrings = [
    "'s turn begins",
    " is defeated!",
    "Selected ",
    " action",
    "Choose target",
    "No enemies in range",
    "Not enough actions",
    " claw attack",
    " HIT for ",
    " damage",
    " MISS",
    "HP: ",
    "AC: ",
    "Init: ",
    "Actions: ",
    "Mode: ",
    "Waiting for ",
    "Game Lobby",
    "Room Code: ",
    "Players Connected: ",
    "Roll for Mischief",
    "polyhedron games",
    "presents"
  ];
  
  // Create string table
  let stringTable = 'const S=' + JSON.stringify(commonStrings) + ';';
  
  // Replace strings with array references
  commonStrings.forEach((str, i) => {
    // Escape special regex characters
    const escaped = str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    code = code.replace(new RegExp(escaped, 'g'), `S[${i}]`);
  });
  
  return stringTable + code;
}

async function buildMinified() {
  console.log('🐱 Building MINIFIED JS13k game...');
  
  // Read source files
  const pathfinder = fs.readFileSync('./src/micro-pathfinder.js', 'utf8');
  const engine = fs.readFileSync('./src/engine-3d.js', 'utf8');
  const game = fs.readFileSync('./src/tactical-game.js', 'utf8');
  const sprites = fs.readFileSync('./src/sprites.js', 'utf8');
  
  // Combine files
  let combined = sprites + '\n' + pathfinder + '\n' + engine + '\n' + game;
  
  // Apply minification
  combined = minifyCode(combined);
  
  // Apply string compression
  combined = compressStrings(combined);
  
  // Additional optimizations
  combined = combined
    // Shorten Math calls
    .replace(/Math\.floor/g, '(~~')
    .replace(/Math\.random/g, 'Math.random')
    .replace(/Math\.sqrt/g, 'Math.sqrt')
    .replace(/Math\.abs/g, 'Math.abs')
    .replace(/Math\.min/g, 'Math.min')
    .replace(/Math\.max/g, 'Math.max')
    .replace(/Math\.PI/g, '3.14159')
    .replace(/Math\.cos/g, 'Math.cos')
    .replace(/Math\.sin/g, 'Math.sin');
  
  // Read and minify HTML
  let html = fs.readFileSync('./src/index.html', 'utf8');
  
  // Remove HTML comments and extra whitespace
  html = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .replace(/> </g, '><')
    .replace(/\s*([{}:;,])\s*/g, '$1');
  
  // Inline JS into HTML
  html = html.replace('/* INLINE_JS */', combined);
  
  // Write output
  if (fs.existsSync('./dist')) {
    fs.rmSync('./dist', { recursive: true });
  }
  fs.mkdirSync('./dist');
  fs.writeFileSync('./dist/index.html', html);
  
  // Create ZIP
  try {
    execSync('cd dist && zip -9 -r ../cats-13k-minified.zip .');
    console.log('📦 Created cats-13k-minified.zip');
    
    const stats = fs.statSync('./cats-13k-minified.zip');
    const sizeMB = (stats.size / 1024).toFixed(2);
    const percent = ((stats.size / 13312) * 100).toFixed(1);
    
    console.log(`📏 ZIP Size: ${stats.size} bytes (${sizeMB}KB) - ${percent}% of limit`);
    
    if (stats.size > 13312) {
      console.error(`❌ Over limit by ${stats.size - 13312} bytes!`);
      console.log('\n🔍 Need more aggressive optimization. Consider:');
      console.log('   - Using terser for advanced minification');
      console.log('   - Implementing base64 sprite compression');
      console.log('   - Removing non-essential features');
    } else {
      console.log(`✅ SUCCESS! ${13312 - stats.size} bytes remaining`);
    }
  } catch (error) {
    console.error('❌ Failed to create ZIP:', error.message);
  }
}

buildMinified().catch(console.error);