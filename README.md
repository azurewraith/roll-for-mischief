# Cats 13K - JS13kGames 2025 Entry

**Theme**: BLACK CAT  
**Size**: 3.13KB (24.1% of 13KB limit)  
**Category**: Online (Multiplayer)

## Game Description

A multiplayer cat battle royale with simplified Pathfinder 2e mechanics. Players control cats in a low-poly city environment, surviving against other players, environmental hazards, and a roaming boss cat.

### Key Features

- **Multiplayer Battle Royale**: Real-time multiplayer using WebSocket/PartySocket
- **Pathfinder 2e Mechanics**: Simplified stats, combat, and diplomacy system
- **Shrinking Play Area**: Environmental pressure forces encounters
- **Boss Cat AI**: Roaming "Shadow Cat" boss with enhanced stats
- **Low-Poly 3D Rendering**: Custom canvas-based 3D renderer
- **Cat Classes**: Fighter, Rogue, Wizard, and Cleric cats with unique abilities

### Controls

- **WASD**: Move your cat around the city
- **Space**: Interact with nearby cats or initiate encounters
- **1**: Attack (during combat)
- **2**: Defend (during combat)  
- **3**: Attempt diplomacy (during combat)

### Gameplay

1. **Spawn**: Random cat character with Pathfinder 2e stats
2. **Explore**: Navigate city blocks and alleyways  
3. **Encounter**: Meet other player cats and choose combat or diplomacy
4. **Survive**: Avoid the shrinking storm area and roaming boss
5. **Win**: Last cat standing wins the battle royale

## Technical Implementation

### Ultra-Compressed Architecture

The game uses extreme compression techniques to fit within 13KB:

- **Micro-Pathfinder**: Essential P2e mechanics in <1KB
- **Micro-Renderer**: 3D projection and rendering in <2KB  
- **Micro-Game**: Core game loop and networking in <7KB
- **Variable Compression**: Single-letter variable names throughout
- **Function Minification**: Aggressive code compression

### Multiplayer Support

- **PartySocket Integration**: Uses competition-provided PartySocket when available
- **WebSocket Fallback**: Native WebSocket for local development
- **Offline Mode**: Graceful degradation for single-player experience
- **Real-time Sync**: Player positions, combat, and boss movement

### 3D Rendering System

- **Custom Projection**: Perspective projection without external libraries
- **Depth Sorting**: Painter's algorithm for polygon rendering
- **Procedural Geometry**: All models generated algorithmically
- **Low-Poly Style**: Minimal polygons for optimal performance

## Build System

### Development Build
```bash
npm install
npm run dev     # Start development server
npm test        # Run test suite
npm run build   # Build full-featured version (exceeds 13KB)
```

### Competition Build  
```bash
node build-micro.js  # Build ultra-compressed version
```

### Size Analysis
```bash
node optimize.js     # Analyze code size and optimization targets
npm run size        # Check current build size
```

## Project Structure

```
cats-13k/
├── src/                    # Source code
│   ├── micro-pathfinder.js # Ultra-compressed P2e system
│   ├── micro-renderer.js   # Minimal 3D renderer
│   ├── micro-game.js       # Core game logic
│   └── index.html          # HTML template
├── dist/                   # Built game files
├── test/                   # Test suite
├── build-micro.js          # Ultra-compression build
└── cats-13k-micro.zip     # Final 13KB submission
```

## Competition Compliance

✅ **Size Limit**: 3.13KB (well under 13KB limit)  
✅ **Theme**: "BLACK CAT" - players are cats, boss is "Shadow Cat"  
✅ **Offline-First**: Works without internet connection  
✅ **Online Features**: Multiplayer via PartySocket (optional)  
✅ **No External Libraries**: Everything custom-built  
✅ **Browser Compatible**: Works in modern browsers  

## Development Notes

### Original Full-Featured Version

The initial implementation included:
- Complete JRPG-style dialog system
- Detailed 3D cat models with procedural tails
- Full Pathfinder 2e spell system
- Comprehensive UI with bordered dialogs
- Advanced boss AI with patrol routes
- Survival leaderboards

**Total Size**: 68KB+ uncompressed, 17KB compressed

### Ultra-Compressed Version

To meet the 13KB limit, the game was drastically simplified:
- Single-letter variable names (`P`, `R`, `G`)
- Compressed object properties (`n`, `c`, `s`, `h`, `m`, `a`, `p`, `v`, `t`)
- Removed all comments and whitespace
- Simplified 3D models to basic boxes
- Auto-resolved combat with diplomacy checks
- Essential multiplayer features only

**Final Size**: 3.13KB compressed

### Multiplayer Architecture

The game supports real-time multiplayer through:
- Room-based sessions via PartySocket
- Position broadcasting for movement
- Combat state synchronization  
- Boss AI shared across all players
- Graceful offline fallback

## Future Enhancements

If size limits were relaxed, the game could be expanded with:
- Full JRPG dialog system with choices
- Detailed 3D cat models and animations
- Complete Pathfinder 2e spell and feat system
- Interactive environment objects
- Sound effects and background music
- Advanced boss encounters with multiple phases
- Persistent leaderboards and statistics

---

*Created for JS13kGames 2025 competition - Theme: "BLACK CAT"*