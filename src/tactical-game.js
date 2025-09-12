// Tactical cat battle royale with full 3D movement
let G = {
  s: 'playing',
  p: null,
  cs: [],
  t: 0,
  k: new Set(),
  mouseDrag: false,
  rightMouseDrag: false,
  lastMouse: { x: 0, y: 0 },
  
  // WebSocket
  w: null,
  id: 'cat_' + (Math.random() * 1e6 | 0),
  
  // Combat state
  combat: null,
  turnOrder: [],
  currentTurn: 0,
  currentActions: 3,
  actionType: null, // 'move' or 'attack'
  attackCount: 0,
  moveDistance: 0, // Track movement used this turn
  eventLog: [],
  targetDialog: null, // Target selection state
  
  // Initialize
  init() {
    const canvas = document.querySelector('canvas');
    E.init(canvas);
    
    // Cat colors for differentiation (work better with orange base)
    this.catColors = ['#ffaa00', '#ff2222', '#88ff88', '#ffffff', '#ff44ff', '#ffff44', '#44ffff'];
    
    // Generate player
    this.p = P.g('You');
    this.p.id = 'player';
    this.p.pos = { x: 0, y: 0, z: 0 };
    this.p.color = this.catColors[0]; // Player gets first color
    this.lastCatPos = { x: this.p.pos.x, z: this.p.pos.z };
    
    // Generate 3D city
    this.generateCity();
    
    // Add player to scene
    E.add('cat', this.p.pos.x, this.p.pos.y, this.p.pos.z, 3, 5, 3, this.p.color);
    // Set catId on the player's object
    const playerObj = E.objects[E.objects.length - 1];
    playerObj.catId = this.p.id;
    
    // Add BOSS CAT - 10ft x 10ft black cat
    const boss = P.g('??????');
    boss.id = 'boss';
    boss.n = '??????';
    // Create copy of class to avoid corrupting shared reference
    boss.c = { ...boss.c, n: '??????' };
    boss.isBoss = true;
    // Make boss overpowered
    boss.h = boss.m = 100; // 100 HP
    boss.a = 15; // High AC
    boss.c.a = 8; // High attack bonus
    boss.s = { S: 20, D: 14, C: 20, I: 10, W: 10, H: 10 }; // Strong stats
    boss.color = '#000000'; // Black
    boss.pos = { x: 0, y: 0, z: 30 }; // Center-back position
    this.cs.push(boss);
    const bossObj = { type: 'boss', x: boss.pos.x, y: boss.pos.y, z: boss.pos.z, w: 10, h: 10, d: 10, color: boss.color, catId: boss.id };
    E.objects.push(bossObj);
    
    // Add 2-3 regular cats for testing - grid snapped positions
    const usedPositions = new Set(['0,0', '0,30']); // Player at origin, boss at 0,30
    for (let i = 0; i < 3; i++) {
      const enemy = P.g(`Cat${i+1}`);
      enemy.id = `enemy_${i}`;
      enemy.color = this.catColors[i + 1]; // Each enemy gets different color
      
      // Find available grid position
      let x, z, posKey;
      do {
        x = (Math.floor(Math.random() * 12) - 6) * 5; // -30 to +30 in 5ft increments
        z = (Math.floor(Math.random() * 12) - 6) * 5;
        posKey = `${x},${z}`;
      } while (usedPositions.has(posKey));
      
      usedPositions.add(posKey);
      enemy.pos = { x, y: 0, z };
      this.cs.push(enemy);
      const catObj = { type: 'cat', x: enemy.pos.x, y: enemy.pos.y, z: enemy.pos.z, w: 3, h: 5, d: 3, color: enemy.color, catId: enemy.id };
      E.objects.push(catObj);
    }
    
    // Position camera behind and above cat for proper view
    E.cam.x = this.p.pos.x;
    E.cam.y = 25;  
    E.cam.z = this.p.pos.z - 25;  // Further back behind cat
    E.cam.rx = -0.3;  // Looking down at cat
    E.cam.ry = 0;
    
    // Camera controls
    canvas.addEventListener('mousedown', e => {
      if (e.button === 0) {  // Left click
        this.mouseDrag = true;
      } else if (e.button === 2) {  // Right click
        this.rightMouseDrag = true;
        e.preventDefault();
      }
      this.lastMouse = { x: e.clientX, y: e.clientY };
    });
    
    canvas.addEventListener('mouseup', () => {
      this.mouseDrag = false;
      this.rightMouseDrag = false;
    });
    
    canvas.addEventListener('contextmenu', e => {
      e.preventDefault(); // Disable right-click menu
    });
    
    canvas.addEventListener('mousemove', e => {
      if (this.mouseDrag || this.rightMouseDrag) {
        const dx = e.clientX - this.lastMouse.x;
        const dy = e.clientY - this.lastMouse.y;
        
        if (this.mouseDrag) {
          // Left drag: rotate camera
          E.rotateCamera(-dy * 0.01, dx * 0.01);
        } else if (this.rightMouseDrag) {
          // Right drag: move camera relative to rotation
          const moveSpeed = 0.5;
          const camYaw = E.cam.ry;
          const cos = Math.cos(camYaw);
          const sin = Math.sin(camYaw);
          
          // Horizontal drag = strafe left/right relative to camera
          const strafeX = dx * cos * moveSpeed;
          const strafeZ = dx * sin * moveSpeed;
          
          // Vertical drag = move up/down (global Y)
          E.moveCamera(strafeX, -dy * moveSpeed, strafeZ);
        }
        
        this.lastMouse = { x: e.clientX, y: e.clientY };
      }
    });
    
    canvas.addEventListener('wheel', e => {
      const factor = e.deltaY > 0 ? 1.1 : 0.9;
      E.zoomCamera(factor);
      e.preventDefault();
    });
    
    // Keyboard controls
    document.addEventListener('keydown', e => {
      this.k.add(e.code);
      
      if (e.code === 'KeyI') E.setIsometric();
      if (e.code === 'Space') this.interact();
      if (e.code === 'KeyM') this.setAction('move');
      if (e.code === 'KeyX') this.setAction('attack');
      if (e.code === 'Escape') this.endAction();
      
      // Number keys for target selection
      if (this.targetDialog && e.code.startsWith('Digit')) {
        const num = parseInt(e.code.slice(5));
        if (num >= 1 && num <= 9) this.selectTarget(num);
      }
    });
    document.addEventListener('keyup', e => this.k.delete(e.code));
    
    // Connect multiplayer
    this.connect();
    
    // Update UI
    this.updateUI();
    
    // Start combat immediately for testing  
    this.startCombat([this.p, ...this.cs]);
    
    // Ensure camera follows player after combat start
    E.cam.x = this.p.pos.x;
    E.cam.z = this.p.pos.z - 25;
    
    // Start loop
    this.loop();
  },
  
  // Connect to multiplayer
  connect() {
    try {
      this.w = new WebSocket('wss://relay.js13kgames.com/roll-for-mischief');
      this.w.onopen = () => this.send('join', { id: this.id, cat: this.p });
      this.w.onmessage = e => {
        try {
          const msg = JSON.parse(e.data);
          this.handle(msg);
        } catch (err) {}
      };
    } catch (e) {}
  },
  
  // Send message
  send(type, data) {
    if (this.w && this.w.readyState === 1) {
      this.w.send(JSON.stringify({ type, data: { ...data, id: this.id } }));
    }
  },
  
  // Handle message
  handle(msg) {
    switch (msg.type) {
      case 'join':
        if (msg.data.id !== this.id) {
          const cat = msg.data.cat;
          cat.id = msg.data.id;
          this.cs.push(cat);
          E.add('cat', cat.pos.x, cat.pos.y, cat.pos.z, 3, 5, 3, '#654321');
        }
        break;
      case 'move':
        if (msg.data.id !== this.id) {
          const cat = this.cs.find(c => c.id === msg.data.id);
          if (cat) {
            cat.pos = msg.data.pos;
            const catObj = E.objects.find(obj => obj.type === 'cat' && obj.x === cat.pos.x && obj.z === cat.pos.z);
            if (catObj) {
              catObj.x = cat.pos.x;
              catObj.z = cat.pos.z;
            }
          }
        }
        break;
    }
  },
  
  // Generate 3D city with proper streets
  generateCity() {
    // Street width = 20ft (4 tiles)
    // Buildings are 30x30ft on average
    
    for (let bx = -5; bx <= 5; bx++) {
      for (let bz = -5; bz <= 5; bz++) {
        // Building block position
        const blockX = bx * 60; // 30ft building + 30ft space
        const blockZ = bz * 60;
        
        // Skip center for spawn
        if (Math.abs(bx) <= 1 && Math.abs(bz) <= 1) continue;
        
        // Building dimensions
        const w = 25 + Math.random() * 10; // 25-35ft
        const h = 15 + Math.random() * 50; // 15-65ft tall
        const d = 25 + Math.random() * 10;
        
        // Building color variants
        const colors = ['#4a4a6a', '#5a5a7a', '#6a5a7a', '#5a6a7a'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        E.add('building', blockX - w/2, 0, blockZ - d/2, w, h, d, color);
      }
    }
    
    // Add some smaller buildings between blocks
    for (let i = 0; i < 20; i++) {
      const x = (Math.random() - 0.5) * 400;
      const z = (Math.random() - 0.5) * 400;
      
      // Don't place too close to center
      if (Math.abs(x) < 50 && Math.abs(z) < 50) continue;
      
      const w = 10 + Math.random() * 15;
      const h = 8 + Math.random() * 25;
      const d = 10 + Math.random() * 15;
      
      E.add('building', x, 0, z, w, h, d, '#3a3a5a');
    }
  },
  
  // Game loop
  loop() {
    this.update();
    this.render();
    requestAnimationFrame(() => this.loop());
  },
  
  // Update
  update() {
    this.updateCamera();
    this.updatePlayer();
  },
  
  // Update camera movement
  updateCamera() {
    const speed = 2;
    
    // Calculate movement relative to camera rotation
    const camYaw = -E.cam.ry;  // Try negative to fix coordination
    const cos = Math.cos(camYaw);
    const sin = Math.sin(camYaw);
    
    
    if (this.k.has('KeyW')) {
      // Forward relative to camera
      E.moveCamera(-sin * speed, 0, cos * speed);
    }
    if (this.k.has('KeyS')) {
      // Backward relative to camera
      E.moveCamera(sin * speed, 0, -cos * speed);
    }
    if (this.k.has('KeyA')) {
      // Left relative to camera
      E.moveCamera(-cos * speed, 0, -sin * speed);
    }
    if (this.k.has('KeyD')) {
      // Right relative to camera
      E.moveCamera(cos * speed, 0, sin * speed);
    }
    if (this.k.has('KeyQ')) E.moveCamera(0, speed, 0);
    if (this.k.has('KeyE')) E.moveCamera(0, -speed, 0);
  },
  
  // Check if position is occupied by a cat
  occupied(x, z, e = null) {
    // Check player position
    if (this.p !== e && this.p.pos.x === x && this.p.pos.z === z) return 1;
    
    // Check all cats
    return this.cs.some(c => {
      if (c === e || !c.v) return false;
      
      if (c.isBoss) {
        // Boss cat occupies 2x2 grid (10ft x 10ft)
        const bossLeft = c.pos.x - 5;
        const bossRight = c.pos.x + 5;
        const bossTop = c.pos.z - 5;
        const bossBottom = c.pos.z + 5;
        
        return x >= bossLeft && x <= bossRight && z >= bossTop && z <= bossBottom;
      } else {
        // Regular cat occupies single 5ft square
        return c.pos.x === x && c.pos.z === z;
      }
    });
  },
  
  // Update player
  updatePlayer() {
    const moveDelay = 300; // Turn-based feel
    const now = Date.now();
    
    if (this.combat) {
      // In combat, only current player can move and must have actions/move selected
      if (this.turnOrder[this.currentTurn] !== this.p) return;
      if (this.actionType !== 'move' || this.currentActions <= 0) return;
      if (this.moveDistance >= 25) return; // Max 25ft movement per turn
    }
    
    if (!this.lastMove || now - this.lastMove > moveDelay) {
      let moved = false;
      const gridSize = 5; // 5ft squares
      let newX = this.p.pos.x;
      let newZ = this.p.pos.z;
      
      // Calculate new position based on input
      if (this.k.has('ArrowUp')) {
        newZ += gridSize;  // South (reversed)
      }
      if (this.k.has('ArrowDown')) {
        newZ -= gridSize;  // North (reversed)
      }
      if (this.k.has('ArrowLeft')) {
        newX -= gridSize;  // West
      }
      if (this.k.has('ArrowRight')) {
        newX += gridSize;  // East
      }
      
      // Only move if the new position is not occupied
      if ((newX !== this.p.pos.x || newZ !== this.p.pos.z) && !this.occupied(newX, newZ, this.p)) {
        this.p.pos.x = newX;
        this.p.pos.z = newZ;
        moved = true;
      }
      
      if (moved) {
        this.lastMove = now;
        
        // Track movement distance in combat
        if (this.combat && this.actionType === 'move') {
          this.moveDistance += 5;
          this.addEvent(`Moved 5ft (${this.moveDistance}/25ft used)`);
          
          // Consume action every 25ft of movement
          if (this.moveDistance >= 25) {
            this.currentActions--;
            this.moveDistance = 0; // Reset for next action
            this.addEvent(`Movement action consumed. ${this.currentActions} actions remaining.`);
            if (this.currentActions <= 0) this.actionType = null;
          }
        }
        
        // Update cat in scene
        const catIndex = E.objects.findIndex(obj => obj.type === 'cat');
        if (catIndex >= 0) {
          E.objects[catIndex].x = this.p.pos.x;
          E.objects[catIndex].z = this.p.pos.z;
        }
        
        // Send movement to other players
        this.send('move', { pos: this.p.pos });
        
        // Check for nearby enemies
        this.checkCombat();
        
        // Camera following - move camera by same amount cat moved
        const deltaX = this.p.pos.x - this.lastCatPos.x;
        const deltaZ = this.p.pos.z - this.lastCatPos.z;
        
        E.cam.x += deltaX;  // Move camera by exact same amount
        E.cam.z += deltaZ;
        
        // Store current cat position for next time
        this.lastCatPos = { x: this.p.pos.x, z: this.p.pos.z };
      }
    }
  },
  
  // Check for combat initiation
  checkCombat() {
    // Look for nearby cats within 30ft (6 squares)
    const nearby = this.cs.filter(cat => {
      const dx = cat.pos.x - this.p.pos.x;
      const dz = cat.pos.z - this.p.pos.z;
      const dist = Math.sqrt(dx*dx + dz*dz);
      return dist <= 30 && cat.v;
    });
    
    if (nearby.length > 0 && !this.combat) {
      this.startCombat([this.p, ...nearby]);
    }
  },
  
  // Start tactical combat
  startCombat(cats) {
    this.combat = {
      participants: cats,
      round: 1
    };
    
    // Roll initiative for all participants
    cats.forEach(cat => P.i(cat));
    this.turnOrder = cats.sort((a, b) => b.i - a.i);
    
    // Start with highest initiative (index 0)
    this.currentTurn = 0;
    
    console.log(`Combat started! Turn order: ${this.turnOrder.map(c => c.c.n).join(', ')}`);
    
    // Start the first turn
    const firstCat = this.turnOrder[0];
    this.addEvent(`${firstCat.c.n}'s turn begins`);
    
    // If first cat is AI, trigger its behavior
    if (firstCat !== this.p && firstCat.v) {
      setTimeout(() => this.runAITurn(firstCat), 1000);
    }
    
    // Position camera for combat
    const centerX = cats.reduce((sum, c) => sum + c.pos.x, 0) / cats.length;
    const centerZ = cats.reduce((sum, c) => sum + c.pos.z, 0) / cats.length;
    
    E.cam.x = centerX;
    E.cam.z = centerZ + 40;
    E.cam.y = 25;
    E.cam.rx = -0.3;
  },
  
  // Handle interactions
  interact() {
    if (this.combat) {
      this.nextTurn();
    }
  },
  
  // Add event to log
  addEvent(text) {
    this.eventLog.unshift(text);
    if (this.eventLog.length > 8) this.eventLog.pop(); // Keep last 8 events
    
    // Update HTML event log
    const eventList = document.querySelector('#event-list');
    if (eventList) {
      const eventDiv = document.createElement('div');
      eventDiv.style.color = '#00ff00';
      eventDiv.style.marginBottom = '2px';
      eventDiv.textContent = text;
      eventList.insertBefore(eventDiv, eventList.firstChild);
      
      // Remove old events
      while (eventList.children.length > 8) {
        eventList.removeChild(eventList.lastChild);
      }
    }
  },
  
  // Simple text wrapping
  wrapText(text, maxLength) {
    if (text.length <= maxLength) return [text];
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    words.forEach(word => {
      if ((currentLine + word).length <= maxLength) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });
    if (currentLine) lines.push(currentLine);
    return lines;
  },
  
  // Show target selection dialog
  showTargetDialog(targets, actionType) {
    this.targetDialog = { targets, actionType };
    this.addEvent(`Choose target (1-${targets.length}):`);
    targets.forEach((t, i) => {
      this.addEvent(`${i + 1}) ${t.c.n} Cat`);
    });
  },
  
  // Handle target selection input
  selectTarget(number) {
    if (!this.targetDialog) return;
    
    const index = number - 1;
    if (index >= 0 && index < this.targetDialog.targets.length) {
      const target = this.targetDialog.targets[index];
      if (this.targetDialog.actionType === 'attack') {
        this.executeAttack(target);
      }
      this.targetDialog = null;
    }
  },

  // Set current action type
  setAction(type) {
    if (!this.combat || this.currentActions <= 0) return;
    if (this.turnOrder[this.currentTurn] !== this.p) return;
    
    this.actionType = type;
    this.addEvent(`Selected ${type} action`);
    
    // Auto-attack if attack selected and enemies in range
    if (type === 'attack') {
      this.attemptAttack();
    }
  },
  
  // End current action
  endAction() {
    if (!this.combat || this.turnOrder[this.currentTurn] !== this.p) return;
    
    if (this.actionType === 'move' && this.moveDistance > 0) {
      // Consume action for partial movement
      this.currentActions--;
      this.addEvent(`Movement ended. ${this.currentActions} actions remaining.`);
      this.moveDistance = 0;
    }
    
    this.actionType = null;
  },
  
  // Attempt attack on nearby enemies
  attemptAttack() {
    const enemies = this.cs.filter(cat => {
      if (!cat.v) return false;
      
      if (cat.isBoss) {
        // Boss cat occupies 2x2 grid - check adjacency to any square
        const bossLeft = cat.pos.x - 5;
        const bossRight = cat.pos.x + 5;
        const bossTop = cat.pos.z - 5;
        const bossBottom = cat.pos.z + 5;
        
        // Check if player is adjacent to any edge of the boss area
        const adjacentX = (this.p.pos.x === bossLeft - 5) || (this.p.pos.x === bossRight + 5);
        const adjacentZ = (this.p.pos.z === bossTop - 5) || (this.p.pos.z === bossBottom + 5);
        const overlapX = this.p.pos.x >= bossLeft - 5 && this.p.pos.x <= bossRight + 5;
        const overlapZ = this.p.pos.z >= bossTop - 5 && this.p.pos.z <= bossBottom + 5;
        
        return (adjacentX && overlapZ) || (adjacentZ && overlapX);
      } else {
        // Regular cat - simple distance check
        const dx = cat.pos.x - this.p.pos.x;
        const dz = cat.pos.z - this.p.pos.z;
        const dist = Math.sqrt(dx*dx + dz*dz);
        return dist <= 5;
      }
    });
    
    if (enemies.length === 0) {
      this.addEvent('No enemies in range for attack');
      return;
    }
    
    if (enemies.length === 1) {
      // Auto-attack single target
      const target = enemies[0];
      this.executeAttack(target);
    } else {
      // Multiple targets - show numbered selection
      this.showTargetDialog(enemies, 'attack');
    }
  },
  
  // Execute attack on specific target
  executeAttack(target) {
    const map = this.attackCount * -5; // Multiple Attack Penalty
    const result = P.k(this.p, target, map);
    
    this.currentActions--;
    this.attackCount++;
    
    const mapText = map < 0 ? ` (MAP ${map})` : '';
    const bonusText = result.atkBonus >= 0 ? `+${result.atkBonus}` : `${result.atkBonus}`;
    const rollText = `1d20${bonusText} [${result.total}] vs AC ${result.targetAC}`;
    
    if (result.h) {
      const strText = result.strMod >= 0 ? `+${result.strMod}` : `${result.strMod}`;
      const dmgText = `1d6${strText} [${result.d}]`;
      this.addEvent(`Claw attack${mapText}: ${rollText} HIT for ${dmgText} damage`);
      if (!target.v) this.addEvent(`${target.c.n} is defeated!`);
    } else {
      this.addEvent(`Claw attack${mapText}: ${rollText} MISS`);
    }
    
    // Check if combat should end
    const alive = this.turnOrder.filter(cat => cat.v);
    if (alive.length <= 1) {
      this.endCombat();
      return;
    }
    
    if (this.currentActions <= 0) this.actionType = null;
  },
  
  // Next combat turn
  nextTurn() {
    // Skip dead cats
    do {
      this.currentTurn = (this.currentTurn + 1) % this.turnOrder.length;
    } while (!this.turnOrder[this.currentTurn].v);
    
    this.currentActions = 3; // Reset actions for new turn
    this.actionType = null;
    this.attackCount = 0;
    this.moveDistance = 0; // Reset movement
    
    if (this.currentTurn === 0) {
      this.combat.round++;
    }
    
    const currentCat = this.turnOrder[this.currentTurn];
    this.addEvent(`${currentCat.c.n}'s turn begins`);
    
    // AI behavior for NPCs
    if (currentCat !== this.p && currentCat.v) {
      setTimeout(() => this.runAITurn(currentCat), 1500);
    }
  },
  
  // Run AI turn for a cat
  runAITurn(currentCat) {
    let actions = 3;
    let attacks = 0;
    
    // Find alive targets (exclude self)
    const targets = this.turnOrder.filter(cat => cat.v && cat.id !== currentCat.id);
    if (targets.length === 0) {
      this.endCombat();
      return;
    }
    
    console.log(`${currentCat.c.n} (${currentCat.id}) has ${targets.length} targets: ${targets.map(t => t.c.n + '(' + t.id + ')').join(', ')}`);
    
    // Pick closest target (simple AI - they may attack each other or boss)
    let target = targets[0];
    let minDist = Infinity;
    targets.forEach(cat => {
      if (cat.id === currentCat.id) return; // Double-check to avoid self-targeting
      const dx = cat.pos.x - currentCat.pos.x;
      const dz = cat.pos.z - currentCat.pos.z;
      const dist = Math.sqrt(dx*dx + dz*dz);
      if (dist < minDist) {
        minDist = dist;
        target = cat;
      }
    });
    
    // Safety check - if somehow still targeting self, end turn
    if (target.id === currentCat.id) {
      console.error(`ERROR: ${currentCat.c.n} is targeting itself!`);
      this.nextTurn();
      return;
    }
    
    while (actions > 0 && currentCat.v) {
      // Re-check if target is still alive each action
      if (!target.v) {
        // Target died, find new target
        const newTargets = this.turnOrder.filter(cat => cat.v && cat.id !== currentCat.id);
        if (newTargets.length === 0) {
          this.endCombat();
          return;
        }
        target = newTargets[0]; // Just pick the first available
      }
      
      const dx = target.pos.x - currentCat.pos.x;
      const dz = target.pos.z - currentCat.pos.z;
      const dist = Math.sqrt(dx*dx + dz*dz);
      
      console.log(`${currentCat.c.n}(${currentCat.id}) targeting ${target.c.n}(${target.id}): distance=${dist.toFixed(1)}, dx=${dx}, dz=${dz}`);
      
      if (dist <= 5 && target.v) {
        // In range - attack
        const map = attacks * -5;
        const result = P.k(currentCat, target, map);
        
        const mapText = map < 0 ? ` (MAP ${map})` : '';
        const bonusText = result.atkBonus >= 0 ? `+${result.atkBonus}` : `${result.atkBonus}`;
      const rollText = `1d20${bonusText} [${result.total}] vs AC ${result.targetAC}`;
        
        if (result.h) {
          const strText = result.strMod >= 0 ? `+${result.strMod}` : `${result.strMod}`;
        const dmgText = `1d6${strText} [${result.d}]`;
          this.addEvent(`${currentCat.c.n} claw attack${mapText}: ${rollText} HIT for ${dmgText} damage`);
          if (!target.v) this.addEvent(`${target.c.n} is defeated!`);
        } else {
          this.addEvent(`${currentCat.c.n} claw attack${mapText}: ${rollText} MISS`);
        }
        attacks++;
        actions--;
      } else if (dist > 5) {
        // Move closer - try multiple movement options
        let moved = false;
        let moveDistance = 0;
        
        // Try different movement directions in order of preference
        const directions = [];
        
        if (Math.abs(dx) > Math.abs(dz)) {
          // Prefer X movement, fallback to Z (in grid squares)
          directions.push(
            { x: dx > 0 ? 5 : -5, z: 0 }, // 25ft = 5 grid squares
            { x: dx > 0 ? 4 : -4, z: 0 }, // 20ft = 4 grid squares
            { x: dx > 0 ? 3 : -3, z: 0 }, // 15ft = 3 grid squares  
            { x: dx > 0 ? 2 : -2, z: 0 }, // 10ft = 2 grid squares
            { x: dx > 0 ? 1 : -1, z: 0 }, // 5ft = 1 grid square
            { x: 0, z: dz > 0 ? 5 : -5 },
            { x: 0, z: dz > 0 ? 4 : -4 },
            { x: 0, z: dz > 0 ? 3 : -3 },
            { x: 0, z: dz > 0 ? 2 : -2 },
            { x: 0, z: dz > 0 ? 1 : -1 }
          );
        } else {
          // Prefer Z movement, fallback to X (in grid squares)
          directions.push(
            { x: 0, z: dz > 0 ? 5 : -5 }, // 25ft = 5 grid squares
            { x: 0, z: dz > 0 ? 4 : -4 }, // 20ft = 4 grid squares
            { x: 0, z: dz > 0 ? 3 : -3 }, // 15ft = 3 grid squares
            { x: 0, z: dz > 0 ? 2 : -2 }, // 10ft = 2 grid squares
            { x: 0, z: dz > 0 ? 1 : -1 }, // 5ft = 1 grid square
            { x: dx > 0 ? 5 : -5, z: 0 },
            { x: dx > 0 ? 4 : -4, z: 0 },
            { x: dx > 0 ? 3 : -3, z: 0 },
            { x: dx > 0 ? 2 : -2, z: 0 },
            { x: dx > 0 ? 1 : -1, z: 0 }
          );
        }
        
        // Try each direction until one works
        for (const dir of directions) {
          const newX = currentCat.pos.x + dir.x;
          const newZ = currentCat.pos.z + dir.z;
          
          if (!this.occupied(newX, newZ, currentCat)) {
            currentCat.pos.x = newX;
            currentCat.pos.z = newZ;
            moveDistance = (Math.abs(dir.x) + Math.abs(dir.z)) * 5; // Convert to feet
            moved = true;
            break;
          }
        }
        
        if (moved) {
          // Update cat in scene
          const catIndex = E.objects.findIndex(obj => (obj.type === 'cat' || obj.type === 'boss') && obj.catId === currentCat.id);
          if (catIndex >= 0) {
            E.objects[catIndex].x = currentCat.pos.x;
            E.objects[catIndex].z = currentCat.pos.z;
          }
          actions--;
          this.addEvent(`${currentCat.c.n} moves ${moveDistance}ft closer. ${actions} actions remaining.`);
        } else {
          // Can't move at all, skip action
          actions--;
          this.addEvent(`${currentCat.c.n} is blocked.`);
        }
      } else {
        break; // No valid actions
      }
    }
    
    // Check if combat should end
    const remaining = this.turnOrder.filter(cat => cat.v);
    if (remaining.length <= 1) {
      this.endCombat();
      return;
    }
    
    this.nextTurn();
  },
  
  // End combat
  endCombat() {
    const aliveCats = this.turnOrder.filter(cat => cat.v);
    const boss = this.turnOrder.find(cat => cat.isBoss);
    
    // Check victory conditions
    if (boss && !boss.v) {
      // Boss defeated - major victory!
      this.addEvent(`🏆🏆🏆 ?????? DEFEATED! The alley is saved!`);
      if (this.p.v) {
        this.addEvent(`You are victorious!`);
      }
    } else if (aliveCats.length === 1) {
      if (aliveCats[0].isBoss) {
        this.addEvent(`💀 ?????? reigns supreme! All hope is lost...`);
      } else {
        this.addEvent(`🏆 ${aliveCats[0].c.n} wins the battle!`);
      }
    } else if (aliveCats.length === 0) {
      this.addEvent(`💀 All cats have fallen...`);
    }
    
    this.combat = null;
    this.currentTurn = 0;
    this.currentActions = 3;
    this.actionType = null;
  },
  
  // Render
  render() {
    E.render();
    // Arrow must render after E.render() so cat positions are calculated
    this.renderArrow();
    this.renderUI();
  },

  // Render arrow above active cat
  renderArrow() {
    if (!this.combat || !this.turnOrder) {
      console.log('Arrow: No combat or turnOrder');
      return;
    }
    
    const activeCat = this.turnOrder[this.currentTurn];
    if (!activeCat || !activeCat.v) {
      console.log('Arrow: No active cat or cat dead');
      return;
    }
    
    // Calculate fresh screen position from world coordinates
    const gridX = activeCat.pos.x * 5; // 5ft per grid square
    const gridZ = activeCat.pos.z * 5;
    const centerX = gridX + 2.5; // Center of grid square
    const centerZ = gridZ + 2.5;
    
    const screenPos = E.project(centerX, 0, centerZ); // Ground level
    if (!screenPos) {
      console.log('Arrow: Cat position not projectable');
      return;
    }
    
    const ctx = E.ctx;
    
    // Calculate sprite size (same as sprite rendering)
    const worldSize = 5;
    const distanceFromCamera = screenPos.z;
    const spriteSize = Math.max(8, worldSize * 800 / distanceFromCamera);
    
    // Apply same adjustments as sprite rendering
    let spriteTop = screenPos.y - spriteSize;
    
    // Check if this is the boss cat
    const isBoss = activeCat.c && activeCat.c.n === '??????';
    if (isBoss) {
      spriteTop += 10; // Same as boss sprite adjustment
    }
    
    // Check if defeated
    if (!activeCat.v) {
      spriteTop += spriteSize * 0.4; // Same as defeated sprite adjustment  
    }
    
    // Position arrow at middle of sprite
    const arrowX = screenPos.x;
    const arrowY = spriteTop + spriteSize * 0.5; // Middle of sprite
    
    // Draw arrow pointing down
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(arrowX - 8, arrowY - 15);
    ctx.lineTo(arrowX + 8, arrowY - 15);
    ctx.closePath();
    ctx.fill();
    
    // Arrow outline
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();
  },
  
  // Update UI elements
  updateUI() {
    const stats = document.querySelector('#player-stats div');
    if (stats && this.p) {
      stats.innerHTML = `<strong>${this.p.c.n} Cat</strong><br>HP: ${this.p.h}/${this.p.m}<br>AC: ${this.p.a}<br>Pos: (${this.p.pos.x}, ${this.p.pos.z})`;
    }
    
    const lb = document.querySelector('#leaderboard-list');
    if (lb) {
      const connected = this.w && this.w.readyState === 1;
      const count = this.cs.filter(c => c.v).length + (this.p.v ? 1 : 0);
      lb.innerHTML = connected ? `Connected: ${count} cats` : 'Connecting...';
    }
  },
  
  // Render UI
  renderUI() {
    this.updateUI();
    
    const ctx = E.ctx;
    
    // Combat UI - horizontal initiative bar like screenshot
    if (this.combat) {
      // Initiative tracker - horizontal bar in top center
      const boxWidth = 120;
      const boxHeight = 60; // Increased height for bigger cats
      const startX = (E.w - (this.turnOrder.length * boxWidth)) / 2;
      const startY = 10;
      
      this.turnOrder.forEach((cat, i) => {
        const x = startX + i * boxWidth;
        const active = i === this.currentTurn;
        
        // Box background
        ctx.fillStyle = active ? 'rgba(255,255,0,0.8)' : 'rgba(0,0,0,0.7)';
        ctx.fillRect(x, startY, boxWidth - 2, boxHeight);
        
        // Border
        ctx.strokeStyle = active ? '#ffff00' : '#666666';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, startY, boxWidth - 2, boxHeight);
        
        // Cat head sprite (using same clip as skull effect) - bigger now
        if (SPRITES && SPRITES.cat) {
          const headSize = 30; // Bigger size for initiative tracker
          const headX = x + 5;
          const headY = startY + 5;
          
          // Calculate 75% height clip (same as skull effect)
          const spriteSize = SPRITES.cat.size;
          const clipHeight = Math.floor(spriteSize * 0.75);
          
          // Render clipped sprite
          for (let sy = 0; sy < clipHeight; sy++) {
            for (let sx = 0; sx < spriteSize; sx++) {
              const index = sy * spriteSize + sx;
              const char = SPRITES.cat.data[index];
              
              if (char && char !== '0' && SPRITES.cat.colors[char]) {
                let color = SPRITES.cat.colors[char];
                
                // Apply cat's color tinting
                if (cat.color !== '#f07010') {
                  const catR = parseInt(cat.color.slice(1, 3), 16);
                  const catG = parseInt(cat.color.slice(3, 5), 16);
                  const catB = parseInt(cat.color.slice(5, 7), 16);
                  const origR = parseInt(color.slice(1, 3), 16);
                  const origG = parseInt(color.slice(3, 5), 16);
                  const origB = parseInt(color.slice(5, 7), 16);
                  
                  const tintedR = Math.min(255, Math.floor((origR * catR) / 255));
                  const tintedG = Math.min(255, Math.floor((origG * catG) / 255));
                  const tintedB = Math.min(255, Math.floor((origB * catB) / 255));
                  
                  color = `#${tintedR.toString(16).padStart(2,'0')}${tintedG.toString(16).padStart(2,'0')}${tintedB.toString(16).padStart(2,'0')}`;
                }
                
                ctx.fillStyle = color;
                const pixelX = headX + Math.floor(sx * headSize / spriteSize);
                const pixelY = headY + Math.floor(sy * headSize / spriteSize);
                const pixelSize = Math.max(1, Math.floor(headSize / spriteSize));
                ctx.fillRect(pixelX, pixelY, pixelSize, pixelSize);
              }
            }
          }
        }
        
        // Text - use black text for readability on yellow highlight
        ctx.font = '10px monospace';
        ctx.fillStyle = active ? '#000000' : (cat.color === '#000000' ? '#ffffff' : cat.color); // Black for active, cat color otherwise
        ctx.fillText(cat.c.n, x + 40, startY + 15); // Moved further right for bigger sprite
        
        // Regular text color
        ctx.fillStyle = active ? '#000000' : '#ffffff'; // Black for active cat, white otherwise
        
        // Show HP for player's cat, health status for others
        if (cat === this.p) {
          ctx.fillText(`HP: ${cat.h}/${cat.m}`, x + 40, startY + 28); // Second line
          ctx.fillText(`Init: ${cat.i}`, x + 40, startY + 45); // Third line
        } else {
          // Show health status for other cats
          const hpPercent = cat.h / cat.m;
          let healthStatus = 'Healthy';
          if (hpPercent <= 0) healthStatus = 'Defeated';
          else if (hpPercent <= 0.25) healthStatus = 'Critical';
          else if (hpPercent <= 0.5) healthStatus = 'Bloodied';
          else if (hpPercent <= 0.75) healthStatus = 'Injured';
          
          ctx.fillText(healthStatus, x + 40, startY + 28); // Second line  
          ctx.fillText(`Init: ${cat.i}`, x + 40, startY + 45); // Third line
        }
      });
      
    }
    
    // Bottom left panel
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(10, E.h - 100, 300, 90);
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    
    if (this.combat) {
      // Combat controls in green in bottom left
      const currentCat = this.turnOrder[this.currentTurn];
      if (currentCat === this.p && this.p.v) {
        ctx.fillStyle = '#00ff00';
        const actionsText = `Actions: ${this.currentActions}/3`;
        ctx.fillText(actionsText, 20, E.h - 80);
        
        // Action dots right next to Actions text
        const textWidth = ctx.measureText(actionsText).width;
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = i < this.currentActions ? '#00ff00' : '#666666';
          ctx.beginPath();
          ctx.arc(25 + textWidth + i * 15, E.h - 85, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        
        ctx.fillStyle = '#00ff00';
        ctx.fillText(`Mode: ${this.actionType || 'None'}`, 20, E.h - 65);
        if (this.actionType === 'move') {
          ctx.fillText(`Movement: ${this.moveDistance}/25ft`, 20, E.h - 50);
        }
        ctx.fillText('M=Move, X=Attack, Space=End Turn', 20, E.h - 35);
      } else {
        ctx.fillStyle = '#ffff00';
        ctx.fillText(`${currentCat.c.n}'s Turn`, 20, E.h - 80);
        ctx.fillStyle = '#fff';
        if (!this.p.v) {
          ctx.fillStyle = '#ff0000';
          ctx.fillText('You are defeated!', 20, E.h - 65);
          ctx.fillText('Watching remaining combat...', 20, E.h - 50);
        } else {
          ctx.fillText('Waiting for enemy...', 20, E.h - 65);
        }
      }
    } else {
      // Regular help text
      ctx.fillText('WASD: Move camera', 20, E.h - 80);
      ctx.fillText('Mouse: Look around', 20, E.h - 65);
      ctx.fillText('Scroll: Zoom', 20, E.h - 50);
      ctx.fillText('Arrows: Move cat', 20, E.h - 35);
      ctx.fillText('I: Isometric view', 20, E.h - 20);
    }
    
    // Event log is now handled via HTML element
  }
};

// Start
document.addEventListener('DOMContentLoaded', () => {
  window.G = G; // Make globally accessible for 3D engine
  G.init();
});