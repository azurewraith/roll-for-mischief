// Ultra-compressed Pathfinder 2e for 13KB - only essential features
const P = {
  // Cat classes - minimal data
  C: {
    F: { n: 'Fighter', h: 10, a: 3 }, // name, hitDie, attack bonus
    R: { n: 'Rogue', h: 8, a: 2 },
    W: { n: 'Wizard', h: 6, a: 1 },
    C: { n: 'Cleric', h: 8, a: 2 }
  },
  
  // Generate cat (ultra-minimal)
  g(n = 'Cat') {
    const keys = Object.keys(this.C);
    const c = this.C[keys[Math.floor(Math.random() * keys.length)]];
    const s = () => 3 + (Math.random() * 18 | 0); // 3-20 stats
    const st = { S: s(), D: s(), C: s(), I: s(), W: s(), H: s() }; // STR,DEX,CON,INT,WIS,CHA
    const hp = c.h + Math.floor((st.C - 10) / 2);
    
    return {
      n, c, s: st, h: hp, m: hp, // name, class, stats, hp, maxhp
      a: 10 + Math.floor((st.D - 10) / 2), // AC
      p: { x: 0, y: 0, z: 0 }, // position
      v: true, t: 0 // alive, time
    };
  },
  
  // Roll d20 + modifier
  r(m = 0) { return Math.floor(Math.random() * 20) + 1 + m; },
  
  // Initiative
  i(cat) { return cat.i = this.r(Math.floor((cat.s.D - 10) / 2)); },
  
  // Attack (with optional MAP)
  k(a, t, map = 0) {
    const d20 = Math.floor(Math.random() * 20) + 1;
    const atkBonus = a.c.a + Math.floor((a.s.S - 10) / 2) + map;
    const total = d20 + atkBonus;
    const hit = total >= t.a;
    
    if (hit) {
      const d6 = Math.floor(Math.random() * 6) + 1;
      const strMod = Math.floor((a.s.S - 10) / 2);
      const dmg = Math.max(1, d6 + strMod);
      t.h = Math.max(0, t.h - dmg);
      if (t.h <= 0) t.v = false;
      return { h: true, d: dmg, d20, atkBonus, total, targetAC: t.a, d6, strMod };
    }
    return { h: false, d: 0, d20, atkBonus, total, targetAC: t.a };
  },
  
  // Diplomacy
  d(cat) { return this.r(Math.floor((cat.s.H - 10) / 2)) >= 12; }
};