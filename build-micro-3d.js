const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

// Process PNG to single line bytestring with interpolation
function processPNG(filePath, targetSize = 32) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(new PNG({ filterType: 4 }))
      .on('parsed', function() {
        const sourceWidth = this.width;
        const sourceHeight = this.height;
        
        console.log(`📐 Source: ${sourceWidth}x${sourceHeight}, Target: ${targetSize}x${targetSize}`);
        
        // Calculate sampling area size for interpolation
        const xRatio = sourceWidth / targetSize;
        const yRatio = sourceHeight / targetSize;
        
        let sprite = '';
        const colorMap = new Map();
        const chars = '123456789ABCDEFGHIJKLMNPQRSTUVWXYZ';
        let colorIndex = 0;
        
        // Downsample with area averaging and color quantization
        for (let ty = 0; ty < targetSize; ty++) {
          for (let tx = 0; tx < targetSize; tx++) {
            // Calculate source area bounds for this target pixel
            const x1 = Math.floor(tx * xRatio);
            const x2 = Math.min(Math.floor((tx + 1) * xRatio), sourceWidth);
            const y1 = Math.floor(ty * yRatio);
            const y2 = Math.min(Math.floor((ty + 1) * yRatio), sourceHeight);
            
            let totalR = 0, totalG = 0, totalB = 0, totalA = 0;
            let sampleCount = 0;
            
            // Average all pixels in the source area
            for (let sy = y1; sy < y2; sy++) {
              for (let sx = x1; sx < x2; sx++) {
                const idx = (sourceWidth * sy + sx) << 2;
                totalR += this.data[idx];
                totalG += this.data[idx + 1];
                totalB += this.data[idx + 2];
                totalA += this.data[idx + 3];
                sampleCount++;
              }
            }
            
            if (sampleCount === 0) {
              sprite += '0';
              continue;
            }
            
            // Average and quantize the color components to reduce palette
            const avgR = Math.round(totalR / sampleCount) & 0xF0; // Quantize to 16 levels
            const avgG = Math.round(totalG / sampleCount) & 0xF0;
            const avgB = Math.round(totalB / sampleCount) & 0xF0;
            const avgA = Math.round(totalA / sampleCount);
            
            if (avgA < 128) {
              sprite += '0'; // transparent
            } else {
              const color = `#${avgR.toString(16).padStart(2,'0')}${avgG.toString(16).padStart(2,'0')}${avgB.toString(16).padStart(2,'0')}`;
              
              if (!colorMap.has(color)) {
                colorMap.set(color, chars[colorIndex % chars.length]);
                colorIndex++;
              }
              
              sprite += colorMap.get(color);
            }
          }
        }
        
        resolve({ 
          sprite, 
          colorMap: Object.fromEntries(colorMap),
          width: targetSize,
          height: targetSize
        });
      })
      .on('error', reject);
  });
}

// Process sprite images into compressed data
async function processSprites() {
  const spritesDir = './src/sprites';
  
  // Check if sprites directory exists
  if (fs.existsSync(spritesDir)) {
    const files = fs.readdirSync(spritesDir);
    
    for (const file of files) {
      if (file === 'cat.png') {
        console.log(`🎨 Processing ${file}...`);
        
        try {
          const result = await processPNG(path.join(spritesDir, file), 32); // 32x32 sprite
          console.log(`📏 Sprite size: ${result.width}x${result.height}`);
          console.log(`🎨 Colors found: ${Object.keys(result.colorMap).length}`);
          
          // Generate sprites.js file - invert color mapping for lookup
          const invertedColors = {};
          Object.entries(result.colorMap).forEach(([color, char]) => {
            invertedColors[char] = color;
          });
          
          const spritesJS = `// Generated sprite data
const SPRITES = {
  cat: {
    data: '${result.sprite}',
    colors: ${JSON.stringify(invertedColors, null, 2)},
    size: ${result.width}
  }
};`;

          fs.writeFileSync('./src/sprites.js', spritesJS);
          console.log('✨ Generated src/sprites.js');
          
          return result;
        } catch (err) {
          console.error('Error processing PNG:', err.message);
        }
      }
    }
  }
  
  return null;
}

// Build micro 3D version
async function buildMicro3D() {
  console.log('🐱 Building MICRO 3D tactical cat battle royale...');
  
  // Process sprites
  const sprites = await processSprites();
  
  // Read full components (not micro)  
  const pathfinder = fs.readFileSync('./src/micro-pathfinder.js', 'utf8');
  const fullEngine = fs.readFileSync('./src/engine-3d.js', 'utf8');
  const game = fs.readFileSync('./src/tactical-game.js', 'utf8');
  
  // Read sprites if available
  let spritesData = '';
  if (fs.existsSync('./src/sprites.js')) {
    spritesData = fs.readFileSync('./src/sprites.js', 'utf8') + '\n';
  }
  
  // Use full engine method names (no replacements needed)
  let updatedGame = game;
  
  // Combine
  let combined = spritesData + pathfinder + '\n' + fullEngine + '\n' + updatedGame;
  
  // Basic compression
  combined = combined.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Read HTML
  let html = fs.readFileSync('./src/index.html', 'utf8');
  html = html.replace('/* INLINE_JS */', combined);
  
  // Write
  if (fs.existsSync('./dist')) {
    fs.rmSync('./dist', { recursive: true });
  }
  fs.mkdirSync('./dist');
  fs.writeFileSync('./dist/index.html', html);
  
  // Create ZIP
  try {
    const { execSync } = require('child_process');
    execSync('cd dist && zip -9 -r ../cats-13k-micro-3d.zip .');
    console.log('📦 Created cats-13k-micro-3d.zip');
    
    const stats = fs.statSync('./cats-13k-micro-3d.zip');
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

buildMicro3D().catch(console.error);