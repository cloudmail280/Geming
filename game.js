// =============================================================
//  GEMING FIGHTER — 2D mobile fighting game (Street Fighter style)
//  6 karakter: Kodam, Boja, Natan, Botex, Rudy, Opal
// =============================================================
(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const touchEl = document.getElementById('touch');
  const topbar = document.getElementById('topbar');
  const btnBack = document.getElementById('btn-back');

  const W = 960;
  const H = 540;
  canvas.width = W;
  canvas.height = H;

  // -----------------------------------------------------------
  // RESIZE: jaga rasio 16:9
  // -----------------------------------------------------------
  function resize() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const ratio = W / H;
    let w = vw, h = vw / ratio;
    if (h > vh) { h = vh; w = vh * ratio; }
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 100));
  resize();

  // -----------------------------------------------------------
  // INPUT
  // -----------------------------------------------------------
  const keys = {
    left:false, right:false, up:false,
    punch:false, kick:false, skill:false, block:false
  };
  function setKey(name, val) { if (name in keys) keys[name] = val; }

  const kbMap = {
    'ArrowLeft':'left','ArrowRight':'right','ArrowUp':'up',
    'a':'left','d':'right','w':'up',
    'j':'punch','k':'kick','l':'skill',';':'block',
    'z':'punch','x':'kick','c':'skill','v':'block',
    ' ':'punch'
  };
  window.addEventListener('keydown', e => { const k = kbMap[e.key]; if (k) { setKey(k,true); e.preventDefault(); } });
  window.addEventListener('keyup',   e => { const k = kbMap[e.key]; if (k) { setKey(k,false); e.preventDefault(); } });

  document.querySelectorAll('#touch .btn').forEach(btn => {
    const key = btn.dataset.key;
    const press = e => { e.preventDefault(); setKey(key,true); btn.classList.add('pressed'); };
    const release = e => { e.preventDefault(); setKey(key,false); btn.classList.remove('pressed'); };
    btn.addEventListener('touchstart', press, {passive:false});
    btn.addEventListener('touchend', release);
    btn.addEventListener('touchcancel', release);
    btn.addEventListener('mousedown', press);
    btn.addEventListener('mouseup', release);
    btn.addEventListener('mouseleave', release);
  });

  // -----------------------------------------------------------
  // KARAKTER — tiap karakter punya skema kostum berbeda (gaya Street Fighter)
  // -----------------------------------------------------------
  const FIGHTERS = [
    {
      id: 'kodam', name: 'Kodam', tag: 'Tank',
      style: 'strongman',
      skin: '#d8a073', hair: '#1a0a06', eye: '#2a1408',
      outfit: '#7a3a14', accent: '#e0b040', pants: '#2a1810',
      color1: '#7a3a14', color2: '#e0b040',
      hp: 130, speed: 3.2, jump: 13, weight: 1.3,
      punchDmg: 9, kickDmg: 11,
      skillName: 'Earth Slam',
      desc: 'Petarung berbadan besar. Skill: Earth Slam — gelombang batu.',
      skillExec: (s, o, world) => {
        s.state = 'skill'; s.stateTime = 36; s.vx = 0;
        world.fx.push(makeShock(s.x, s.y + s.h/2 - 4, -1, '#c08040', 22, s.idx));
        world.fx.push(makeShock(s.x, s.y + s.h/2 - 4,  1, '#c08040', 22, s.idx));
        world.shake = 14;
      }
    },
    {
      id: 'boja', name: 'Boja', tag: 'Balanced',
      style: 'gi',
      skin: '#e7c19a', hair: '#241208', eye: '#1f1208',
      outfit: '#f0f0f0', accent: '#c8302a', pants: '#f0f0f0',
      color1: '#0d2a55', color2: '#ff5b3c',
      hp: 100, speed: 4.2, jump: 14, weight: 1.0,
      punchDmg: 8, kickDmg: 10,
      skillName: 'Fireball',
      desc: 'Karateka seimbang. Skill: Fireball — bola api lurus.',
      skillExec: (s, o, world) => {
        s.state = 'skill'; s.stateTime = 24; s.vx = 0;
        const dir = s.facing;
        world.projectiles.push({
          x: s.x + dir*30, y: s.y - 4, vx: dir*9, vy: 0,
          r: 16, life: 80, dmg: 16, owner: s.idx, type: 'fire', tint: '#ff6a2e'
        });
      }
    },
    {
      id: 'natan', name: 'Natan', tag: 'Speedster',
      style: 'ninja',
      skin: '#caa080', hair: '#0a0a0a', eye: '#080808',
      outfit: '#1a3a26', accent: '#a3ff4d', pants: '#0a1a14',
      color1: '#0a3d2a', color2: '#a3ff4d',
      hp: 90, speed: 5.4, jump: 15, weight: 0.85,
      punchDmg: 7, kickDmg: 9,
      skillName: 'Lightning Dash',
      desc: 'Ninja gesit. Skill: Lightning Dash — tabrakan kilat.',
      skillExec: (s, o, world) => {
        s.state = 'skill'; s.stateTime = 22;
        s.vx = s.facing * 18;
        s.invuln = 18;
        s.dashHits = 0; s.dashMaxHits = 2;
        for (let i=0;i<6;i++) world.fx.push(makeSpark(s.x, s.y, '#a3ff4d'));
      }
    },
    {
      id: 'botex', name: 'Botex', tag: 'Defender',
      style: 'karate',
      skin: '#d4a888', hair: '#3a2a18', eye: '#1a1208',
      outfit: '#1c1c2a', accent: '#3df0d2', pants: '#1c1c2a',
      color1: '#2a2a3a', color2: '#3df0d2',
      hp: 115, speed: 3.8, jump: 12, weight: 1.15,
      punchDmg: 8, kickDmg: 10,
      skillName: 'Counter Stance',
      desc: 'Master pertahanan. Skill: Counter Stance — balas serangan.',
      skillExec: (s, o, world) => {
        s.state = 'skill'; s.stateTime = 50; s.vx = 0;
        s.counterActive = 50;
      }
    },
    {
      id: 'rudy', name: 'Rudy', tag: 'Brawler',
      style: 'boxer',
      skin: '#c98a5e', hair: '#0a0808', eye: '#1a0a06',
      outfit: '#9a1a1a', accent: '#ffd33a', pants: '#1a1a1a',
      color1: '#4a1010', color2: '#ffd33a',
      hp: 100, speed: 4.0, jump: 13, weight: 1.0,
      punchDmg: 9, kickDmg: 9,
      skillName: 'Rapid Flurry',
      desc: 'Petinju agresif. Skill: Rapid Flurry — 5 jab beruntun.',
      skillExec: (s, o, world) => {
        s.state = 'skill'; s.stateTime = 50; s.vx = 0;
        s.flurryTimer = 0; s.flurryHits = 0;
      }
    },
    {
      id: 'opal', name: 'Opal', tag: 'Mystic',
      style: 'mage',
      skin: '#ead0bc', hair: '#dcb0ff', eye: '#3a1a5a',
      outfit: '#3a1a5e', accent: '#e0a8ff', pants: '#1f0a30',
      color1: '#37105e', color2: '#e0a8ff',
      hp: 95, speed: 3.8, jump: 13, weight: 0.95,
      punchDmg: 7, kickDmg: 9,
      skillName: 'Sky Bolt',
      desc: 'Penyihir. Skill: Sky Bolt — petir menyambar dari langit.',
      skillExec: (s, o, world) => {
        s.state = 'skill'; s.stateTime = 30; s.vx = 0;
        const targetX = o.x;
        world.timers.push({ t: 24, fn: () => {
          world.fx.push(makeBolt(targetX, 0, GROUND_Y, '#cba8ff'));
          if (Math.abs(targetX - o.x) < 80 && !o.dead) {
            applyHit(o, s, 22, 0.5, world, true);
          }
          world.shake = 10;
        }});
      }
    }
  ];

  // -----------------------------------------------------------
  // EFFECT HELPERS
  // -----------------------------------------------------------
  function makeShock(x, y, dir, tint, life, ownerIdx) {
    return { type:'shock', x, y, vx: dir*7, life, dmg: 14, tint, hit: new Set(), ownerIdx };
  }
  function makeSpark(x, y, tint) {
    return { type:'spark', x: x+(Math.random()-0.5)*30, y: y+(Math.random()-0.5)*40,
             vx:(Math.random()-0.5)*4, vy:(Math.random()-0.5)*4, life: 18+Math.random()*10, tint };
  }
  function makeBolt(x, yTop, yBot, tint) {
    return { type:'bolt', x, yTop, yBot, life: 18, tint };
  }
  function makeHitFx(x, y, tint) {
    return { type:'hit', x, y, life: 14, r: 6, tint: tint || '#ffeb6b' };
  }

  // -----------------------------------------------------------
  // GAME WORLD
  // -----------------------------------------------------------
  const GROUND_Y = 460;
  const GRAVITY = 0.85;
  const FLOOR_FRICTION = 0.82;

  let scene = 'title';
  let selectIdx = 0;
  let p1Pick = -1;
  let p2Pick = -1;
  let world = null;
  let resultText = '';
  let resultColor = '#fff';
  let frame = 0;

  function startBattle(p1Id, p2Id) {
    const p1 = FIGHTERS[p1Id];
    const p2 = FIGHTERS[p2Id];
    world = {
      fighters: [
        spawnFighter(p1, 0, 250, 1),
        spawnFighter(p2, 1, 700, -1)
      ],
      projectiles: [], fx: [], timers: [],
      round: 1, maxRounds: 3, score: [0,0],
      shake: 0, timer: 60 * 99,
      state: 'intro', stateTime: 90,
      announce: 'GET READY', announceTime: 90,
      ended: false
    };
    scene = 'battle';
    touchEl.classList.remove('hidden');
    topbar.classList.remove('hidden');
  }

  function spawnFighter(def, idx, x, facing) {
    return {
      idx, def,
      name: def.name,
      tint: def.color2,
      base: def.color1,
      x, y: GROUND_Y - 90,
      w: 56, h: 100,
      vx: 0, vy: 0,
      onGround: true,
      facing,
      hp: def.hp, hpMax: def.hp,
      energy: 0, energyMax: 100,
      state: 'idle', stateTime: 0,
      hitDone: false,
      stun: 0, invuln: 0, blocking: false,
      counterActive: 0,
      flurryTimer: 0, flurryHits: 0,
      dashHits: 0, dashMaxHits: 0,
      dead: false,
      anim: 0
    };
  }

  // -----------------------------------------------------------
  // AI
  // -----------------------------------------------------------
  function aiThink(self, opp, intent) {
    intent.left=intent.right=intent.up=intent.punch=intent.kick=intent.skill=intent.block=false;
    if (self.dead || self.stun > 0) return;
    if (self.state !== 'idle' && self.state !== 'walk' && self.state !== 'jump') return;

    const dx = opp.x - self.x;
    const adx = Math.abs(dx);
    self.facing = dx >= 0 ? 1 : -1;

    if (adx > 90) { if (dx > 0) intent.right = true; else intent.left = true; }
    if (adx < 95 && Math.random() < 0.06) {
      intent[Math.random() < 0.5 ? 'punch' : 'kick'] = true;
    }
    if (self.energy >= self.energyMax && Math.random() < 0.02) intent.skill = true;
    if (adx < 110 && Math.random() < 0.03) intent.block = true;
    if (adx < 200 && adx > 120 && Math.random() < 0.012) intent.up = true;
  }

  // -----------------------------------------------------------
  // UPDATE FIGHTER
  // -----------------------------------------------------------
  function updateFighter(f, opp, intent) {
    if (f.dead) {
      f.vy += GRAVITY; f.y += f.vy;
      if (f.y > GROUND_Y - f.h/2) { f.y = GROUND_Y - f.h/2; f.vy = 0; }
      return;
    }
    if (f.stun > 0) f.stun--;
    if (f.invuln > 0) f.invuln--;
    if (f.counterActive > 0) f.counterActive--;

    const canAct = f.stun <= 0 && (f.state === 'idle' || f.state === 'walk' || f.state === 'jump');
    if (canAct) f.facing = (opp.x >= f.x) ? 1 : -1;

    f.blocking = canAct && intent.block && f.onGround;

    if (canAct && !f.blocking) {
      let mv = 0;
      if (intent.left) mv -= 1;
      if (intent.right) mv += 1;
      f.vx = mv * f.def.speed;
      if (f.onGround) f.state = mv ? 'walk' : 'idle';
      if (intent.up && f.onGround) {
        f.vy = -f.def.jump; f.onGround = false; f.state = 'jump';
      }
      if (intent.punch) {
        f.state = 'punch'; f.stateTime = 14; f.hitDone = false; f.vx *= 0.4;
      } else if (intent.kick) {
        f.state = 'kick'; f.stateTime = 18; f.hitDone = false; f.vx *= 0.4;
      } else if (intent.skill && f.energy >= f.energyMax) {
        f.energy = 0;
        f.def.skillExec(f, opp, world);
      }
    } else if (f.blocking) {
      f.vx = 0; f.state = 'block';
    } else {
      f.stateTime--;
      if (f.stateTime <= 0) {
        f.state = f.onGround ? 'idle' : 'jump';
        f.flurryHits = 0;
      }
    }

    // Flurry (Rudy)
    if (f.def.id === 'rudy' && f.state === 'skill') {
      f.flurryTimer = (f.flurryTimer || 0) + 1;
      if (f.flurryTimer % 9 === 0 && f.flurryHits < 5) {
        const reach = 70;
        const hx = f.x + f.facing * reach;
        if (Math.abs(hx - opp.x) < 50 && Math.abs(f.y - opp.y) < 60 && !opp.dead) {
          applyHit(opp, f, 5, 0.15, world, false);
        }
        world.fx.push(makeHitFx(hx, f.y - 10, f.tint));
        f.flurryHits++;
      }
    }

    f.vy += GRAVITY;
    f.x += f.vx; f.y += f.vy;
    if (f.y >= GROUND_Y - f.h/2) {
      f.y = GROUND_Y - f.h/2; f.vy = 0;
      if (!f.onGround) { f.onGround = true; if (f.state === 'jump') f.state = 'idle'; }
    } else f.onGround = false;

    if (f.x < 50) f.x = 50;
    if (f.x > W - 50) f.x = W - 50;

    if (f.onGround && Math.abs(f.vx) < 0.05) f.vx = 0;
    if (f.state === 'idle' || f.state === 'walk') f.vx *= FLOOR_FRICTION;

    // hitbox punch/kick
    if ((f.state === 'punch' || f.state === 'kick') && !f.hitDone) {
      const peakStart = f.state === 'punch' ? 4 : 6;
      const peakEnd   = f.state === 'punch' ? 10 : 14;
      const elapsed = (f.state === 'punch' ? 14 : 18) - f.stateTime;
      if (elapsed >= peakStart && elapsed <= peakEnd) {
        const reach = f.state === 'punch' ? 60 : 78;
        const hx = f.x + f.facing * reach;
        if (Math.abs(hx - opp.x) < 50 && Math.abs(f.y - opp.y) < 70 && !opp.dead) {
          const dmg = f.state === 'punch' ? f.def.punchDmg : f.def.kickDmg;
          applyHit(opp, f, dmg, f.state === 'punch' ? 0.15 : 0.25, world, false);
          f.hitDone = true;
        }
      }
    }

    // dash hits Natan
    if (f.state === 'skill' && f.def.id === 'natan' && f.dashMaxHits > 0) {
      if (Math.abs(f.x - opp.x) < 60 && Math.abs(f.y - opp.y) < 70 && f.dashHits < f.dashMaxHits) {
        applyHit(opp, f, 10, 0.4, world, false);
        f.dashHits++;
      }
    }

    f.anim++;
    if (f.energy < f.energyMax) f.energy += 0.18;
  }

  // -----------------------------------------------------------
  // APPLY HIT
  // -----------------------------------------------------------
  function applyHit(target, attacker, dmg, knockback, world, ignoreBlock) {
    if (target.dead || target.invuln > 0) return;
    if (target.counterActive > 0 && !ignoreBlock) {
      target.counterActive = 0;
      const reflectDmg = dmg + 4;
      attacker.hp = Math.max(0, attacker.hp - reflectDmg);
      attacker.stun = 26; attacker.state = 'hurt'; attacker.stateTime = 26;
      attacker.vx = -target.facing * 7; attacker.vy = -6;
      world.fx.push(makeHitFx(attacker.x, attacker.y - 20, '#3df0d2'));
      world.shake = Math.max(world.shake, 8);
      if (attacker.hp <= 0) attacker.dead = true;
      return;
    }
    let real = dmg;
    if (target.blocking && !ignoreBlock) {
      real = Math.ceil(dmg * 0.2);
      target.vx = attacker.facing * 2;
    } else {
      target.state = 'hurt'; target.stateTime = 16;
      target.vx = attacker.facing * (4 + knockback*8);
      target.vy = -3 - knockback*2;
      target.stun = 18;
    }
    target.hp = Math.max(0, target.hp - real);
    attacker.energy = Math.min(attacker.energyMax, attacker.energy + real * 1.2);
    target.energy = Math.min(target.energyMax, target.energy + real * 0.6);
    world.fx.push(makeHitFx((attacker.x + target.x)/2, target.y - 20, attacker.tint));
    world.shake = Math.max(world.shake, 4 + knockback*4);
    if (target.hp <= 0) {
      target.dead = true; target.state = 'ko'; target.stateTime = 999;
      target.vy = -8; target.vx = attacker.facing * 4;
    }
  }

  // -----------------------------------------------------------
  // BATTLE LOOP
  // -----------------------------------------------------------
  const p1Intent = {left:false,right:false,up:false,punch:false,kick:false,skill:false,block:false};
  const p2Intent = {left:false,right:false,up:false,punch:false,kick:false,skill:false,block:false};
  let edgePrev = {punch:false,kick:false,skill:false,up:false};

  function readPlayerIntent() {
    p1Intent.left  = keys.left;
    p1Intent.right = keys.right;
    p1Intent.block = keys.block;
    p1Intent.up    = keys.up    && !edgePrev.up;
    p1Intent.punch = keys.punch && !edgePrev.punch;
    p1Intent.kick  = keys.kick  && !edgePrev.kick;
    p1Intent.skill = keys.skill && !edgePrev.skill;
    edgePrev.up = keys.up; edgePrev.punch = keys.punch;
    edgePrev.kick = keys.kick; edgePrev.skill = keys.skill;
  }

  function updateBattle() {
    const [p1, p2] = world.fighters;
    if (world.state === 'intro') {
      world.stateTime--;
      if (world.stateTime <= 0) {
        world.state = 'fight';
        world.announce = 'FIGHT!'; world.announceTime = 50;
      }
      return;
    }
    if (world.state === 'over') {
      world.stateTime--;
      if (world.stateTime <= 0 && !world.ended) {
        world.ended = true; scene = 'result';
        touchEl.classList.add('hidden');
      }
      [p1,p2].forEach(f => updateFighter(f, f===p1?p2:p1,
        {left:false,right:false,up:false,punch:false,kick:false,skill:false,block:false}));
      stepProjectiles(); stepFx();
      return;
    }
    if (world.announceTime > 0) world.announceTime--;
    if (world.timer > 0) world.timer--;
    readPlayerIntent();
    aiThink(p2, p1, p2Intent);
    updateFighter(p1, p2, p1Intent);
    updateFighter(p2, p1, p2Intent);
    stepProjectiles(); stepFx(); stepTimers();
    if (world.shake > 0) world.shake = Math.max(0, world.shake - 1);

    if ((p1.dead || p2.dead || world.timer <= 0) && world.state === 'fight') {
      let winner = -1;
      if (p1.dead && !p2.dead) winner = 1;
      else if (p2.dead && !p1.dead) winner = 0;
      else winner = (p1.hp > p2.hp) ? 0 : (p2.hp > p1.hp ? 1 : -1);
      if (winner >= 0) world.score[winner]++;
      world.state = 'over'; world.stateTime = 110;
      if (winner === 0) { world.announce = 'KAMU MENANG!'; resultText = `${p1.name} MENANG`; resultColor = p1.tint; }
      else if (winner === 1) { world.announce = 'KALAH'; resultText = `${p2.name} MENANG`; resultColor = p2.tint; }
      else { world.announce = 'SERI'; resultText = 'SERI'; resultColor = '#fff'; }
      world.announceTime = 110;
    }
  }

  function stepProjectiles() {
    const [p1, p2] = world.fighters;
    for (let i = world.projectiles.length - 1; i >= 0; i--) {
      const p = world.projectiles[i];
      p.x += p.vx; p.y += p.vy; p.life--;
      const target = (p.owner === 0) ? p2 : p1;
      if (Math.abs(p.x - target.x) < 36 && Math.abs(p.y - target.y) < 50 && !target.dead) {
        applyHit(target, world.fighters[p.owner], p.dmg, 0.45, world, false);
        world.fx.push(makeHitFx(p.x, p.y, p.tint));
        world.projectiles.splice(i, 1); continue;
      }
      if (p.x < -50 || p.x > W + 50 || p.life <= 0) world.projectiles.splice(i, 1);
    }
  }

  function stepFx() {
    const [p1, p2] = world.fighters;
    for (let i = world.fx.length - 1; i >= 0; i--) {
      const f = world.fx[i];
      f.life--;
      if (f.type === 'shock') {
        f.x += f.vx;
        [p1, p2].forEach((t, ti) => {
          if (ti === f.ownerIdx || f.hit.has(ti)) return;
          if (Math.abs(f.x - t.x) < 38 && Math.abs(f.y - t.y) < 70 && !t.dead) {
            applyHit(t, world.fighters[f.ownerIdx], f.dmg, 0.4, world, false);
            f.hit.add(ti);
          }
        });
      }
      if (f.type === 'spark') { f.x += f.vx; f.y += f.vy; f.vy += 0.2; }
      if (f.life <= 0) world.fx.splice(i, 1);
    }
  }

  function stepTimers() {
    for (let i = world.timers.length - 1; i >= 0; i--) {
      world.timers[i].t--;
      if (world.timers[i].t <= 0) {
        try { world.timers[i].fn(); } catch(e) {}
        world.timers.splice(i, 1);
      }
    }
  }

  // -----------------------------------------------------------
  // BACKGROUND ARENA
  // -----------------------------------------------------------
  function clear(color) { ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); }

  function drawBgArena() {
    const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    g.addColorStop(0, '#1a0a3a'); g.addColorStop(0.6, '#3a0e5a'); g.addColorStop(1, '#601a4a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, GROUND_Y);
    // bulan
    ctx.fillStyle = '#ffe6c0'; ctx.beginPath(); ctx.arc(780, 110, 38, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(255,230,192,0.18)'; ctx.beginPath(); ctx.arc(780, 110, 60, 0, Math.PI*2); ctx.fill();
    // gunung siluet
    ctx.fillStyle = '#180325';
    ctx.beginPath(); ctx.moveTo(0, GROUND_Y);
    for (let x = 0; x <= W; x += 30) {
      const y = GROUND_Y - 60 - Math.sin(x*0.012)*30 - Math.sin(x*0.03)*12;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, GROUND_Y); ctx.closePath(); ctx.fill();
    // lantai
    const fg = ctx.createLinearGradient(0, GROUND_Y, 0, H);
    fg.addColorStop(0, '#1a0a30'); fg.addColorStop(1, '#05010a');
    ctx.fillStyle = fg; ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    ctx.strokeStyle = 'rgba(180,120,255,0.25)'; ctx.lineWidth = 1;
    for (let i = 0; i < 14; i++) {
      const yy = GROUND_Y + Math.pow(i/14, 1.6) * (H - GROUND_Y);
      ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W, yy); ctx.stroke();
    }
  }

  // =============================================================
  //  KARAKTER MANUSIA — SPRITE GAYA STREET FIGHTER (vector canvas)
  // =============================================================
  // Helper kecil
  function rrect(x, y, w, h, r) {
    r = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.lineTo(x+w-r, y); ctx.quadraticCurveTo(x+w, y, x+w, y+r);
    ctx.lineTo(x+w, y+h-r); ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
    ctx.lineTo(x+r, y+h); ctx.quadraticCurveTo(x, y+h, x, y+h-r);
    ctx.lineTo(x, y+r); ctx.quadraticCurveTo(x, y, x+r, y);
    ctx.closePath();
  }
  function darken(hex, amt = 0.2) {
    const h = hex.replace('#','');
    const n = parseInt(h.length===3 ? h.split('').map(c=>c+c).join('') : h, 16);
    let r = (n>>16)&255, g = (n>>8)&255, b = n&255;
    r = Math.max(0, Math.floor(r*(1-amt)));
    g = Math.max(0, Math.floor(g*(1-amt)));
    b = Math.max(0, Math.floor(b*(1-amt)));
    return `rgb(${r},${g},${b})`;
  }
  function lighten(hex, amt = 0.2) {
    const h = hex.replace('#','');
    const n = parseInt(h.length===3 ? h.split('').map(c=>c+c).join('') : h, 16);
    let r = (n>>16)&255, g = (n>>8)&255, b = n&255;
    r = Math.min(255, Math.floor(r+(255-r)*amt));
    g = Math.min(255, Math.floor(g+(255-g)*amt));
    b = Math.min(255, Math.floor(b+(255-b)*amt));
    return `rgb(${r},${g},${b})`;
  }

  // Render satu karakter di koordinat lokal (origin di pusat tubuh)
  // pose: { state, t (anim), facing, stateTime }
  function drawHumanFighter(def, pose) {
    const t = pose.t || 0;
    const state = pose.state || 'idle';
    const stateTime = pose.stateTime || 0;

    // -- pose params
    let bob = 0;
    if (state === 'walk') bob = Math.sin(t*0.4)*2;
    else if (state === 'idle') bob = Math.sin(t*0.08)*1.2;
    const yOff = bob;

    // posisi kaki
    let leftFootX = -10, leftFootY = 44;
    let rightFootX = 10, rightFootY = 44;
    let kneeBend = 0;

    if (state === 'walk') {
      const ph = Math.sin(t*0.4);
      leftFootX = -10 + ph*4; leftFootY = 44 - Math.max(0, ph)*4;
      rightFootX = 10 - ph*4; rightFootY = 44 - Math.max(0, -ph)*4;
    } else if (state === 'jump' || !pose.onGround) {
      kneeBend = 6;
      leftFootY = 36; rightFootY = 36;
      leftFootX = -8; rightFootX = 8;
    } else if (state === 'idle') {
      // kuda-kuda fighter
      leftFootX = -14; rightFootX = 12;
    } else if (state === 'punch') {
      // kuda-kuda condong ke depan
      leftFootX = -16; rightFootX = 14;
    } else if (state === 'kick') {
      // kaki belakang nopang, kaki depan terangkat
      leftFootX = -16; leftFootY = 44;
      // kaki kanan akan digambar terpisah (tendangan)
    } else if (state === 'block') {
      leftFootX = -12; rightFootX = 12;
    } else if (state === 'hurt') {
      leftFootX = -14; rightFootX = 8;
    } else if (state === 'ko') {
      leftFootX = -20; rightFootX = 20;
    }

    // posisi tangan (relatif terhadap bahu kiri/kanan)
    let leftHandX = -22, leftHandY = -2;
    let rightHandX = 22, rightHandY = -2;
    let punchExtend = 0;
    let kickExtend = 0;

    if (state === 'idle' || state === 'walk') {
      // kepalan terangkat — pose bertarung
      leftHandX = -18; leftHandY = -10 + Math.sin(t*0.08)*1;
      rightHandX = 14; rightHandY = -14 + Math.sin(t*0.08+1)*1;
    } else if (state === 'jump') {
      leftHandX = -22; leftHandY = -16;
      rightHandX = 18; rightHandY = -18;
    } else if (state === 'punch') {
      const elapsed = 14 - stateTime;
      const reach = Math.sin(Math.max(0,Math.min(elapsed,7))/7 * Math.PI);
      punchExtend = reach * 36;
      leftHandX = -16; leftHandY = -8;
      rightHandX = 12 + punchExtend; rightHandY = -10 + Math.sin(reach*Math.PI)*-2;
    } else if (state === 'kick') {
      const elapsed = 18 - stateTime;
      const reach = Math.sin(Math.max(0,Math.min(elapsed,9))/9 * Math.PI);
      kickExtend = reach * 44;
      leftHandX = -16; leftHandY = -4;
      rightHandX = 14; rightHandY = -10;
    } else if (state === 'block') {
      // dua tangan menyilang di depan dada
      leftHandX = -2; leftHandY = -14;
      rightHandX = 2; rightHandY = -14;
    } else if (state === 'hurt') {
      leftHandX = -22; leftHandY = -4;
      rightHandX = 18; rightHandY = -2;
    } else if (state === 'skill') {
      // pose siap
      leftHandX = -12; leftHandY = -16;
      rightHandX = 12; rightHandY = -16;
    } else if (state === 'ko') {
      leftHandX = -28; leftHandY = 10;
      rightHandX = 28; rightHandY = 10;
    }

    // tilt tubuh (untuk hurt/punch)
    let bodyTiltX = 0;
    if (state === 'hurt') bodyTiltX = -6;
    if (state === 'punch') bodyTiltX = 4;
    if (state === 'kick') bodyTiltX = -3;

    // ============ MULAI MENGGAMBAR ============
    // Bayangan
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 50, 26, 5, 0, 0, Math.PI*2);
    ctx.fill();

    // KAKI BELAKANG (kiri) — paha + betis + sepatu
    drawLeg(leftFootX, leftFootY + yOff, def.pants, kneeBend, true);
    // KAKI DEPAN (kanan) — atau kick leg
    if (state === 'kick') {
      // betis terangkat, paha mendekat horizontal saat puncak tendangan
      drawKickLeg(kickExtend, def.pants, def.skin);
    } else {
      drawLeg(rightFootX, rightFootY + yOff, def.pants, kneeBend, false);
    }

    // PINGGUL/BELT
    ctx.fillStyle = darken(def.pants, 0.15);
    rrect(-14 + bodyTiltX, 0 + yOff, 28, 10, 2); ctx.fill();
    ctx.fillStyle = def.accent;
    ctx.fillRect(-14 + bodyTiltX, 4 + yOff, 28, 3);

    // TORSO (tubuh + baju per gaya)
    drawTorso(def, bodyTiltX, yOff);

    // LENGAN BELAKANG (agak ke belakang, kalem)
    drawArm(leftHandX + bodyTiltX, leftHandY + yOff, def, false);

    // LENGAN DEPAN (yang ngePunch / block / dll)
    drawArm(rightHandX + bodyTiltX, rightHandY + yOff, def, true, state, punchExtend);

    // KEPALA + RAMBUT + WAJAH
    drawHead(def, bodyTiltX*0.4, yOff, state === 'hurt');

    // AURA
    if (state === 'block') {
      ctx.strokeStyle = 'rgba(80,220,255,0.85)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0 + yOff, 38, 0, Math.PI*2); ctx.stroke();
    }
    if (pose.counterActive > 0) {
      const a = 0.4 + Math.sin(t*0.5)*0.3;
      ctx.strokeStyle = `rgba(60,240,210,${a})`;
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0 + yOff, 44, 0, Math.PI*2); ctx.stroke();
    }
    if (state === 'skill') {
      const a = 0.5 + Math.sin(t*0.6)*0.4;
      ctx.strokeStyle = `rgba(255,255,255,${a})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0 + yOff, 52, 0, Math.PI*2); ctx.stroke();
    }
  }

  // ---- SUB-RENDERERS ----
  function drawLeg(footX, footY, pantsColor, knee, isBack) {
    const hipX = footX > 0 ? 4 : -4;
    const hipY = 8;
    const kneeX = (footX + hipX)/2 + (isBack ? -1 : 1);
    const kneeY = (footY + hipY)/2 + knee;
    // paha
    ctx.strokeStyle = pantsColor;
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(kneeX, kneeY); ctx.stroke();
    // betis
    ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(kneeX, kneeY); ctx.lineTo(footX, footY); ctx.stroke();
    // sepatu (selalu hitam dgn aksen)
    ctx.fillStyle = '#1a1a1a';
    rrect(footX - 8, footY - 2, 16, 8, 3); ctx.fill();
    ctx.fillStyle = '#444';
    ctx.fillRect(footX - 8, footY + 4, 16, 2);
  }

  function drawKickLeg(extend, pantsColor, skinColor) {
    // tendangan tinggi — paha agak horizontal, betis melayang ke depan
    const hipX = 0, hipY = 4;
    const kneeX = 14 + extend*0.3;
    const kneeY = -4;
    const ankleX = 28 + extend;
    const ankleY = -8 - extend*0.1;
    ctx.strokeStyle = pantsColor;
    ctx.lineWidth = 12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(kneeX, kneeY); ctx.stroke();
    ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(kneeX, kneeY); ctx.lineTo(ankleX, ankleY); ctx.stroke();
    // sepatu
    ctx.save();
    ctx.translate(ankleX, ankleY);
    ctx.rotate(-0.3);
    ctx.fillStyle = '#1a1a1a';
    rrect(-4, -4, 18, 8, 3); ctx.fill();
    ctx.fillStyle = '#444';
    ctx.fillRect(-4, 1, 18, 2);
    ctx.restore();
  }

  function drawTorso(def, tx, yOff) {
    const x = -16 + tx, y = -22 + yOff;
    const w = 32, h = 26;
    if (def.style === 'gi' || def.style === 'karate') {
      // Gi (kimono) — putih/gelap dengan lapel V dan ikat sash
      ctx.fillStyle = def.outfit;
      rrect(x, y, w, h+4, 4); ctx.fill();
      // bayangan
      ctx.fillStyle = darken(def.outfit, 0.2);
      ctx.fillRect(x, y + h - 6, w, 6);
      // lapel V (segitiga gelap di tengah)
      ctx.fillStyle = darken(def.outfit, 0.45);
      ctx.beginPath();
      ctx.moveTo(0 + tx, y + 1);
      ctx.lineTo(-7 + tx, y + h);
      ctx.lineTo(7 + tx, y + h);
      ctx.closePath(); ctx.fill();
      // garis kulit di V
      ctx.fillStyle = def.skin;
      ctx.beginPath();
      ctx.moveTo(0 + tx, y + 4);
      ctx.lineTo(-3 + tx, y + h - 2);
      ctx.lineTo(3 + tx, y + h - 2);
      ctx.closePath(); ctx.fill();
    } else if (def.style === 'strongman') {
      // Tank top + bidang dada otot
      ctx.fillStyle = def.skin;
      rrect(x, y, w, h+4, 4); ctx.fill();
      // tank top
      ctx.fillStyle = def.outfit;
      ctx.beginPath();
      ctx.moveTo(x+4, y);
      ctx.lineTo(x+w-4, y);
      ctx.lineTo(x+w-2, y+h+4);
      ctx.lineTo(x+2, y+h+4);
      ctx.closePath(); ctx.fill();
      // garis dada
      ctx.fillStyle = darken(def.skin, 0.25);
      ctx.fillRect(-1 + tx, y + 6, 2, 12);
      // perut
      ctx.fillStyle = darken(def.skin, 0.18);
      ctx.fillRect(-8 + tx, y + 18, 4, 3);
      ctx.fillRect( 4 + tx, y + 18, 4, 3);
    } else if (def.style === 'ninja') {
      // Pakaian ninja gelap dengan sabuk
      ctx.fillStyle = def.outfit;
      rrect(x, y, w, h+4, 4); ctx.fill();
      ctx.fillStyle = darken(def.outfit, 0.3);
      ctx.fillRect(x, y + 2, w, 2);
      // tali silang
      ctx.strokeStyle = def.accent;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x+4, y+2); ctx.lineTo(x+w-4, y+h);
      ctx.moveTo(x+w-4, y+2); ctx.lineTo(x+4, y+h);
      ctx.stroke();
    } else if (def.style === 'boxer') {
      // Tank top petinju, bidang dada
      ctx.fillStyle = def.skin;
      rrect(x, y, w, h+4, 4); ctx.fill();
      ctx.fillStyle = def.outfit;
      // singlet
      ctx.beginPath();
      ctx.moveTo(x+6, y);
      ctx.lineTo(x+w-6, y);
      ctx.lineTo(x+w-2, y+h+4);
      ctx.lineTo(x+2, y+h+4);
      ctx.closePath(); ctx.fill();
      // garis dada
      ctx.fillStyle = darken(def.skin, 0.22);
      ctx.fillRect(-1 + tx, y + 8, 2, 10);
      // logo accent
      ctx.fillStyle = def.accent;
      ctx.fillRect(-5 + tx, y + 6, 10, 3);
    } else if (def.style === 'mage') {
      // Jubah panjang
      ctx.fillStyle = def.outfit;
      rrect(x-3, y, w+6, h+10, 5); ctx.fill();
      // hiasan
      ctx.fillStyle = def.accent;
      ctx.fillRect(-1 + tx, y + 4, 2, h);
      // bintang/aksen
      ctx.fillStyle = lighten(def.accent, 0.3);
      ctx.beginPath();
      ctx.arc(0 + tx, y + 12, 3, 0, Math.PI*2); ctx.fill();
    }
  }

  function drawArm(handX, handY, def, isFront, state, punchExtend) {
    const shoulderX = handX > 0 ? 14 : -14;
    const shoulderY = -16;
    // upper arm (kostum)
    let sleeveColor;
    if (def.style === 'gi' || def.style === 'karate' || def.style === 'mage' || def.style === 'ninja') {
      sleeveColor = def.outfit;
    } else {
      sleeveColor = def.skin; // tank top / boxer = lengan terbuka
    }
    // lengan panjang ke tangan
    ctx.strokeStyle = sleeveColor;
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(shoulderX, shoulderY); ctx.lineTo(handX, handY); ctx.stroke();
    // kalau lengan terbuka (tank/boxer), tambahkan area kulit di lower arm
    if (sleeveColor !== def.skin && (def.style === 'gi' || def.style === 'karate')) {
      // gi pendek di siku
      const elbowX = (shoulderX + handX)/2;
      const elbowY = (shoulderY + handY)/2;
      ctx.strokeStyle = def.skin;
      ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(elbowX, elbowY); ctx.lineTo(handX, handY); ctx.stroke();
    }
    // tangan: sarung tinju utk Rudy, kepalan utk lain
    if (def.style === 'boxer' && isFront) {
      // sarung tinju besar
      ctx.fillStyle = def.outfit;
      ctx.beginPath(); ctx.arc(handX, handY, 10, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = def.accent;
      ctx.beginPath(); ctx.arc(handX, handY+1, 5, 0, Math.PI); ctx.fill();
      ctx.strokeStyle = darken(def.outfit, 0.3);
      ctx.lineWidth = 1; ctx.stroke();
    } else if (def.style === 'boxer') {
      ctx.fillStyle = def.outfit;
      ctx.beginPath(); ctx.arc(handX, handY, 8, 0, Math.PI*2); ctx.fill();
    } else {
      // kepalan tangan biasa
      ctx.fillStyle = def.skin;
      ctx.beginPath(); ctx.arc(handX, handY, 6, 0, Math.PI*2); ctx.fill();
      // wristband
      if (def.style === 'karate' || def.style === 'gi' || def.style === 'ninja') {
        ctx.fillStyle = def.accent;
        ctx.fillRect(handX - 6, handY - 8, 12, 3);
      }
      // glow saat punch
      if (state === 'punch' && isFront && punchExtend > 12) {
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(handX, handY, 9, 0, Math.PI*2); ctx.stroke();
      }
    }
  }

  function drawHead(def, tx, yOff, hurt) {
    const cx = 0 + tx, cy = -32 + yOff;
    // leher
    ctx.fillStyle = darken(def.skin, 0.15);
    ctx.fillRect(cx - 4, cy + 6, 8, 5);
    // kepala
    ctx.fillStyle = def.skin;
    ctx.beginPath(); ctx.ellipse(cx, cy, 11, 13, 0, 0, Math.PI*2); ctx.fill();
    // bayangan rahang
    ctx.fillStyle = darken(def.skin, 0.12);
    ctx.beginPath(); ctx.ellipse(cx, cy + 6, 9, 4, 0, 0, Math.PI*2); ctx.fill();

    // RAMBUT & headgear per style
    if (def.style === 'gi') {
      // headband + rambut pendek
      ctx.fillStyle = def.hair;
      ctx.beginPath();
      ctx.moveTo(cx-11, cy-2);
      ctx.quadraticCurveTo(cx, cy-15, cx+11, cy-2);
      ctx.lineTo(cx+10, cy-5); ctx.lineTo(cx-10, cy-5);
      ctx.closePath(); ctx.fill();
      // headband
      ctx.fillStyle = def.accent;
      rrect(cx-12, cy-6, 24, 4, 1); ctx.fill();
      // ujung pita
      ctx.fillStyle = def.accent;
      ctx.fillRect(cx-14, cy-4, 4, 8);
    } else if (def.style === 'strongman') {
      // botak + jenggot
      ctx.fillStyle = darken(def.skin, 0.25);
      ctx.beginPath(); ctx.arc(cx, cy-2, 11, Math.PI, Math.PI*2); ctx.fill();
      // jenggot
      ctx.fillStyle = def.hair;
      ctx.beginPath();
      ctx.moveTo(cx-8, cy+3);
      ctx.quadraticCurveTo(cx, cy+12, cx+8, cy+3);
      ctx.lineTo(cx+6, cy+8); ctx.lineTo(cx-6, cy+8);
      ctx.closePath(); ctx.fill();
      // kumis
      ctx.fillRect(cx-5, cy+2, 10, 2);
    } else if (def.style === 'ninja') {
      // kerudung wajah — hanya mata terlihat
      ctx.fillStyle = def.outfit;
      ctx.beginPath();
      ctx.moveTo(cx-12, cy-12);
      ctx.lineTo(cx+12, cy-12);
      ctx.lineTo(cx+12, cy-2);
      ctx.lineTo(cx+10, cy+10);
      ctx.lineTo(cx-10, cy+10);
      ctx.lineTo(cx-12, cy-2);
      ctx.closePath(); ctx.fill();
      // celah mata
      ctx.fillStyle = def.skin;
      ctx.fillRect(cx-9, cy-3, 18, 4);
      // ikat depan kepala
      ctx.fillStyle = def.accent;
      ctx.fillRect(cx-13, cy-9, 26, 2);
      // ujung ikat ninja kebelakang
      ctx.fillRect(cx-15, cy-7, 4, 7);
    } else if (def.style === 'karate') {
      // rambut acak
      ctx.fillStyle = def.hair;
      ctx.beginPath();
      ctx.moveTo(cx-11, cy);
      ctx.quadraticCurveTo(cx-12, cy-14, cx-2, cy-14);
      ctx.quadraticCurveTo(cx+2, cy-16, cx+8, cy-14);
      ctx.quadraticCurveTo(cx+13, cy-10, cx+11, cy);
      ctx.lineTo(cx+10, cy-4); ctx.lineTo(cx-10, cy-4);
      ctx.closePath(); ctx.fill();
      // dahi visible
    } else if (def.style === 'boxer') {
      // rambut crewcut + headgear band
      ctx.fillStyle = def.hair;
      ctx.beginPath();
      ctx.moveTo(cx-11, cy-3);
      ctx.quadraticCurveTo(cx, cy-14, cx+11, cy-3);
      ctx.lineTo(cx+10, cy-6); ctx.lineTo(cx-10, cy-6);
      ctx.closePath(); ctx.fill();
    } else if (def.style === 'mage') {
      // tudung jubah
      ctx.fillStyle = def.outfit;
      ctx.beginPath();
      ctx.moveTo(cx-14, cy-2);
      ctx.quadraticCurveTo(cx-16, cy-18, cx, cy-18);
      ctx.quadraticCurveTo(cx+16, cy-18, cx+14, cy-2);
      ctx.lineTo(cx+12, cy+2);
      ctx.lineTo(cx-12, cy+2);
      ctx.closePath(); ctx.fill();
      // bayangan dalam tudung
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.ellipse(cx, cy-2, 9, 7, 0, 0, Math.PI*2); ctx.fill();
      // rambut keluar samping
      ctx.fillStyle = def.hair;
      ctx.fillRect(cx-13, cy+3, 4, 8);
      ctx.fillRect(cx+9, cy+3, 4, 8);
    }

    // MATA & MULUT (muncul kecuali ninja & mage gelap)
    if (def.style !== 'ninja' && def.style !== 'mage') {
      // alis tegas (fighter)
      ctx.fillStyle = darken(def.hair, 0.1);
      ctx.fillRect(cx-7, cy-4, 5, 1.5);
      ctx.fillRect(cx+2, cy-4, 5, 1.5);
      // mata
      ctx.fillStyle = '#fff';
      ctx.fillRect(cx-6, cy-2, 4, 3);
      ctx.fillRect(cx+2, cy-2, 4, 3);
      ctx.fillStyle = def.eye;
      ctx.fillRect(cx-5, cy-2, 2, 3);
      ctx.fillRect(cx+3, cy-2, 2, 3);
      // mulut
      ctx.fillStyle = darken(def.skin, 0.4);
      if (hurt) {
        ctx.fillRect(cx-3, cy+5, 6, 2); // O grimace
      } else {
        ctx.fillRect(cx-3, cy+5, 6, 1); // garis
      }
    } else if (def.style === 'mage') {
      // hanya 2 titik mata bersinar di dalam tudung
      ctx.fillStyle = lighten(def.accent, 0.3);
      ctx.fillRect(cx-4, cy-3, 2, 2);
      ctx.fillRect(cx+2, cy-3, 2, 2);
    }
  }

  // Wrapper utk render saat battle
  function drawFighter(f) {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.scale(f.facing, 1);
    drawHumanFighter(f.def, {
      t: f.anim,
      state: f.dead ? 'ko' : f.state,
      stateTime: f.stateTime,
      onGround: f.onGround,
      counterActive: f.counterActive
    });
    // hurt flash
    if (f.state === 'hurt' && (frame % 4 < 2)) {
      ctx.fillStyle = 'rgba(255,80,80,0.35)';
      ctx.fillRect(-22, -46, 44, 92);
    }
    ctx.restore();

    if (f.dead) {
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.beginPath(); ctx.ellipse(f.x, f.y + 30, 40, 6, 0, 0, Math.PI*2); ctx.fill();
    }
  }

  // -----------------------------------------------------------
  // PROYEKTIL & FX
  // -----------------------------------------------------------
  function drawProjectiles() {
    world.projectiles.forEach(p => {
      if (p.type === 'fire') {
        for (let i = 0; i < 6; i++) {
          const r = p.r - i*2;
          if (r <= 0) break;
          ctx.fillStyle = i < 2 ? '#fff2b8' : (i < 4 ? '#ffae3c' : '#ff5b3c');
          ctx.beginPath();
          ctx.arc(p.x - p.vx*i*0.3, p.y + Math.sin((frame+i)*0.6)*2, r, 0, Math.PI*2);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = p.tint;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
      }
    });
  }
  function drawFx() {
    world.fx.forEach(f => {
      if (f.type === 'shock') {
        ctx.fillStyle = 'rgba(120,80,40,0.7)';
        for (let i=0;i<3;i++) {
          ctx.beginPath();
          ctx.arc(f.x - i*8*Math.sign(f.vx), f.y - i*4, 14 - i*3, 0, Math.PI*2);
          ctx.fill();
        }
      } else if (f.type === 'spark') {
        ctx.fillStyle = f.tint; ctx.fillRect(f.x, f.y, 3, 3);
      } else if (f.type === 'hit') {
        const k = (14 - f.life) / 14;
        ctx.strokeStyle = f.tint; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(f.x, f.y, 6 + k*22, 0, Math.PI*2); ctx.stroke();
      } else if (f.type === 'bolt') {
        ctx.strokeStyle = f.tint; ctx.lineWidth = 4;
        let yy = f.yTop;
        ctx.beginPath(); ctx.moveTo(f.x, yy);
        while (yy < f.yBot) {
          yy += 18 + Math.random()*8;
          ctx.lineTo(f.x + (Math.random()-0.5)*28, yy);
        }
        ctx.stroke();
      }
    });
  }

  // -----------------------------------------------------------
  // HUD
  // -----------------------------------------------------------
  function drawHUD() {
    const [p1, p2] = world.fighters;
    drawBar(40, 30, 360, 22, p1.hp / p1.hpMax, p1.tint, p1.name, false);
    drawBar(W - 400, 30, 360, 22, p2.hp / p2.hpMax, p2.tint, p2.name, true);
    drawSmallBar(40, 56, 220, 8, p1.energy / p1.energyMax, '#fff');
    drawSmallBar(W - 260, 56, 220, 8, p2.energy / p2.energyMax, '#fff');
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(Math.ceil(world.timer / 60).toString().padStart(2,'0'), W/2, 42);
    ctx.font = '12px sans-serif';
    ctx.fillText('Ronde ' + world.round, W/2, 64);
  }
  function drawBar(x, y, w, h, frac, color, label, mirror) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x, y, w, h);
    const fw = Math.max(0, Math.min(1, frac)) * (w - 4);
    ctx.fillStyle = color;
    if (mirror) ctx.fillRect(x + w - 2 - fw, y + 2, fw, h - 4);
    else        ctx.fillRect(x + 2, y + 2, fw, h - 4);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = mirror ? 'right' : 'left';
    ctx.fillText(label, mirror ? x + w : x, y - 6);
  }
  function drawSmallBar(x, y, w, h, frac, color) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x, y, w, h);
    const fw = Math.max(0, Math.min(1, frac)) * (w - 2);
    ctx.fillStyle = color; ctx.fillRect(x + 1, y + 1, fw, h - 2);
  }
  function drawAnnounce() {
    if (world.announceTime <= 0) return;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 64px sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillText(world.announce, W/2 + 4, H/2 + 4);
    ctx.fillStyle = '#fff';
    ctx.fillText(world.announce, W/2, H/2);
    ctx.restore();
  }

  // -----------------------------------------------------------
  // TITLE SCREEN
  // -----------------------------------------------------------
  let titleAnim = 0;
  let titleBtn = null;
  function drawTitle() {
    titleAnim++;
    drawBgArena();
    // 2 sample karakter di belakang
    ctx.save();
    ctx.translate(280, 380);
    ctx.scale(1.2, 1.2);
    drawHumanFighter(FIGHTERS[1], { t: titleAnim, state: 'idle', stateTime: 0, onGround: true });
    ctx.restore();
    ctx.save();
    ctx.translate(680, 380);
    ctx.scale(-1.2, 1.2);
    drawHumanFighter(FIGHTERS[2], { t: titleAnim+30, state: 'idle', stateTime: 0, onGround: true });
    ctx.restore();

    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 78px sans-serif';
    ctx.shadowColor = '#a060ff'; ctx.shadowBlur = 24;
    ctx.fillText('GEMING FIGHTER', W/2, 130);
    ctx.shadowBlur = 0;
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#e0c8ff';
    ctx.fillText('6 Petarung. Skill Unik. Pertarungan Sentuh.', W/2, 170);

    const bx = W/2 - 130, by = 210, bw = 260, bh = 70;
    const pulse = 0.5 + Math.sin(titleAnim*0.08)*0.5;
    ctx.fillStyle = `rgba(160,80,255,${0.5 + pulse*0.4})`;
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('MULAI', W/2, by + 45);

    ctx.font = '14px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('Ketuk layar untuk memilih petarung', W/2, by + bh + 30);
    ctx.restore();

    titleBtn = { x: bx, y: by, w: bw, h: bh };
  }

  // -----------------------------------------------------------
  // SELECT SCREEN — sekarang dengan portrait karakter sungguhan
  // -----------------------------------------------------------
  let charBoxes = [];
  let selectStartBtn = null;

  function drawSelect() {
    drawBgArena();
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('PILIH PETARUNG', W/2, 50);
    ctx.font = '14px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('Ketuk salah satu kartu di bawah', W/2, 74);

    charBoxes = [];
    const cols = 3;
    const cw = 280, ch = 170;
    const gx = (W - cols*cw - (cols-1)*16) / 2;
    const gy = 100;
    for (let i = 0; i < FIGHTERS.length; i++) {
      const f = FIGHTERS[i];
      const cx = gx + (i % cols) * (cw + 16);
      const cy = gy + Math.floor(i / cols) * (ch + 16);
      charBoxes.push({ x: cx, y: cy, w: cw, h: ch, idx: i });

      // card bg
      const sel = (i === selectIdx);
      const bg = ctx.createLinearGradient(cx, cy, cx, cy+ch);
      bg.addColorStop(0, sel ? darken(f.color1, 0.1) : 'rgba(15,8,30,0.85)');
      bg.addColorStop(1, sel ? darken(f.color1, 0.4) : 'rgba(8,4,18,0.85)');
      ctx.fillStyle = bg;
      rrect(cx, cy, cw, ch, 8); ctx.fill();
      ctx.strokeStyle = sel ? f.color2 : 'rgba(255,255,255,0.25)';
      ctx.lineWidth = sel ? 4 : 2;
      ctx.strokeRect(cx, cy, cw, ch);

      // PORTRAIT — gambar mini fighter
      ctx.save();
      ctx.translate(cx + 64, cy + 124);
      ctx.scale(0.95, 0.95);
      // bayangan tanah kecil
      drawHumanFighter(f, {
        t: frame + i*30,
        state: sel ? 'idle' : 'idle',
        stateTime: 0,
        onGround: true
      });
      ctx.restore();

      // info
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(f.name, cx + 130, cy + 36);
      ctx.font = '11px sans-serif';
      ctx.fillStyle = f.color2;
      ctx.fillText(f.tag.toUpperCase(), cx + 130, cy + 52);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('Skill: ' + f.skillName, cx + 130, cy + 76);
      // stats
      drawStatBar(cx + 130, cy + 90, 'HP',  f.hp / 130, f.color2);
      drawStatBar(cx + 130, cy + 108, 'SPD', f.speed / 6, f.color2);
      drawStatBar(cx + 130, cy + 126, 'ATK', (f.punchDmg + f.kickDmg) / 22, f.color2);
    }

    // tombol mulai
    const bx = W/2 - 130, by = H - 50, bw = 260, bh = 40;
    ctx.fillStyle = 'rgba(160,80,255,0.85)';
    rrect(bx, by, bw, bh, 6); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 17px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PILIH ' + FIGHTERS[selectIdx].name.toUpperCase(), W/2, by + 26);
    ctx.restore();

    selectStartBtn = { x: bx, y: by, w: bw, h: bh };
  }

  function drawStatBar(x, y, label, frac, color) {
    ctx.fillStyle = '#fff';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, x, y + 8);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(x + 28, y + 1, 110, 8);
    ctx.fillStyle = color;
    ctx.fillRect(x + 28, y + 1, Math.max(0, Math.min(1, frac)) * 110, 8);
  }

  // -----------------------------------------------------------
  // RESULT SCREEN
  // -----------------------------------------------------------
  let resultBtn = null;
  function drawResult() {
    drawBgArena();
    // tampilkan pemenang besar di tengah
    if (world && world.fighters) {
      const winnerIdx = (world.fighters[0].dead && !world.fighters[1].dead) ? 1
                      : (world.fighters[1].dead && !world.fighters[0].dead) ? 0
                      : (world.fighters[0].hp > world.fighters[1].hp ? 0 : 1);
      const winner = world.fighters[winnerIdx];
      ctx.save();
      ctx.translate(W/2, 350);
      ctx.scale(2.0, 2.0);
      drawHumanFighter(winner.def, { t: frame, state: 'idle', stateTime: 0, onGround: true });
      ctx.restore();
    }
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = resultColor;
    ctx.font = 'bold 56px sans-serif';
    ctx.shadowColor = resultColor; ctx.shadowBlur = 20;
    ctx.fillText(resultText, W/2, 90);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = '18px sans-serif';
    ctx.fillText(`${world.fighters[0].name} vs ${world.fighters[1].name}`, W/2, 122);

    const bx = W/2 - 130, by = H - 70, bw = 260, bh = 50;
    ctx.fillStyle = 'rgba(160,80,255,0.85)';
    rrect(bx, by, bw, bh, 6); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('BERTARUNG LAGI', W/2, by + 32);
    resultBtn = { x: bx, y: by, w: bw, h: bh };
    ctx.restore();
  }

  // -----------------------------------------------------------
  // POINTER
  // -----------------------------------------------------------
  function canvasPointer(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (W / rect.width),
      y: (e.clientY - rect.top) * (H / rect.height)
    };
  }
  function inBox(p, b) {
    return b && p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
  }
  function onPointerDown(e) {
    const p = canvasPointer(e.touches ? e.touches[0] : e);
    if (scene === 'title') {
      scene = 'select';
    } else if (scene === 'select') {
      const c = charBoxes.find(b => inBox(p, b));
      if (c) selectIdx = c.idx;
      if (inBox(p, selectStartBtn)) {
        p1Pick = selectIdx;
        let pool = FIGHTERS.map((_,i)=>i).filter(i => i !== p1Pick);
        p2Pick = pool[Math.floor(Math.random()*pool.length)];
        startBattle(p1Pick, p2Pick);
      }
    } else if (scene === 'result') {
      if (inBox(p, resultBtn)) scene = 'select';
    }
  }
  canvas.addEventListener('mousedown', onPointerDown);
  canvas.addEventListener('touchstart', e => { e.preventDefault(); onPointerDown(e); }, {passive:false});

  btnBack.addEventListener('click', () => {
    scene = 'select';
    touchEl.classList.add('hidden');
    topbar.classList.add('hidden');
  });
  btnBack.addEventListener('touchstart', e => {
    e.preventDefault();
    scene = 'select';
    touchEl.classList.add('hidden');
    topbar.classList.add('hidden');
  });

  // -----------------------------------------------------------
  // MAIN LOOP
  // -----------------------------------------------------------
  function loop() {
    frame++;
    if (scene === 'title') {
      clear('#0a0a18'); drawTitle();
    } else if (scene === 'select') {
      clear('#0a0a18'); drawSelect();
    } else if (scene === 'battle') {
      updateBattle();
      ctx.save();
      if (world.shake > 0) {
        ctx.translate((Math.random()-0.5)*world.shake, (Math.random()-0.5)*world.shake);
      }
      drawBgArena();
      drawFighter(world.fighters[0]);
      drawFighter(world.fighters[1]);
      drawProjectiles();
      drawFx();
      ctx.restore();
      drawHUD();
      drawAnnounce();
    } else if (scene === 'result') {
      clear('#0a0a18'); drawResult();
    }
    requestAnimationFrame(loop);
  }

  touchEl.classList.add('hidden');
  topbar.classList.add('hidden');
  loop();
})();
