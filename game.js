// =============================================================
//  GEMING FIGHTER — 2D mobile fighting game
//  6 karakter: Kodam, Boja, Natan, Botex, Rudy, Opal
// =============================================================
(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const touchEl = document.getElementById('touch');
  const topbar = document.getElementById('topbar');
  const btnBack = document.getElementById('btn-back');

  // virtual resolution -- world berukuran tetap, canvas di-scale
  const W = 960;
  const H = 540;
  canvas.width = W;
  canvas.height = H;

  // -----------------------------------------------------------
  // RESIZE: jaga rasio 16:9, isi layar sebanyak mungkin
  // -----------------------------------------------------------
  function resize() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
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
  // INPUT: keyboard + tombol sentuh
  // -----------------------------------------------------------
  const keys = {
    left: false, right: false, up: false,
    punch: false, kick: false, skill: false, block: false,
    // edge triggers (true hanya 1 frame)
    _punch: false, _kick: false, _skill: false, _up: false
  };
  const prev = { punch:false, kick:false, skill:false, up:false };

  function setKey(name, val) {
    if (!(name in keys)) return;
    keys[name] = val;
  }

  // keyboard mapping (untuk testing desktop)
  const kbMap = {
    'ArrowLeft':'left','ArrowRight':'right','ArrowUp':'up',
    'a':'left','d':'right','w':'up',
    'j':'punch','k':'kick','l':'skill',';':'block',
    'z':'punch','x':'kick','c':'skill','v':'block',
    ' ':'punch'
  };
  window.addEventListener('keydown', e => {
    const k = kbMap[e.key]; if (k) { setKey(k, true); e.preventDefault(); }
  });
  window.addEventListener('keyup', e => {
    const k = kbMap[e.key]; if (k) { setKey(k, false); e.preventDefault(); }
  });

  // tombol sentuh
  document.querySelectorAll('#touch .btn').forEach(btn => {
    const key = btn.dataset.key;
    const press = e => { e.preventDefault(); setKey(key, true); btn.classList.add('pressed'); };
    const release = e => { e.preventDefault(); setKey(key, false); btn.classList.remove('pressed'); };
    btn.addEventListener('touchstart', press, {passive:false});
    btn.addEventListener('touchend', release);
    btn.addEventListener('touchcancel', release);
    btn.addEventListener('mousedown', press);
    btn.addEventListener('mouseup', release);
    btn.addEventListener('mouseleave', release);
  });

  // -----------------------------------------------------------
  // KARAKTER: definisi 6 petarung
  // -----------------------------------------------------------
  /*  Tiap karakter punya:
      - color1, color2: skema warna tubuh & aksen
      - hp, speed, jump, weight: stat dasar
      - punchDmg, kickDmg
      - skill: { name, cost, exec(self, opp, world) }
  */
  const FIGHTERS = [
    {
      id: 'kodam', name: 'Kodam', tag: 'Tank',
      color1: '#5b3a1a', color2: '#d49a3a',
      desc: 'Petarung kuat & berat. Skill: Earth Slam — banting tanah, gelombang batu.',
      hp: 130, speed: 3.2, jump: 13, weight: 1.3,
      punchDmg: 9, kickDmg: 11,
      skillName: 'Earth Slam',
      skillExec: (s, o, world) => {
        s.state = 'skill'; s.stateTime = 36; s.vx = 0;
        // shockwave dari kaki Kodam ke dua arah
        world.fx.push(makeShock(s.x, s.y + s.h/2 - 4, -1, s.tint, 22, s.idx));
        world.fx.push(makeShock(s.x, s.y + s.h/2 - 4,  1, s.tint, 22, s.idx));
        world.shake = 14;
      }
    },
    {
      id: 'boja', name: 'Boja', tag: 'Balanced',
      color1: '#0d2a55', color2: '#ff5b3c',
      desc: 'Petarung api seimbang. Skill: Fireball — proyektil api lurus.',
      hp: 100, speed: 4.2, jump: 14, weight: 1.0,
      punchDmg: 8, kickDmg: 10,
      skillName: 'Fireball',
      skillExec: (s, o, world) => {
        s.state = 'skill'; s.stateTime = 24; s.vx = 0;
        const dir = s.facing;
        world.projectiles.push({
          x: s.x + dir * 30, y: s.y - 4, vx: dir * 9, vy: 0,
          r: 16, life: 80, dmg: 16, owner: s.idx, type: 'fire', tint: '#ff6a2e'
        });
      }
    },
    {
      id: 'natan', name: 'Natan', tag: 'Speedster',
      color1: '#0a3d2a', color2: '#a3ff4d',
      desc: 'Cepat & lincah. Skill: Lightning Dash — sambar maju, hit ganda.',
      hp: 90, speed: 5.4, jump: 15, weight: 0.85,
      punchDmg: 7, kickDmg: 9,
      skillName: 'Lightning Dash',
      skillExec: (s, o, world) => {
        s.state = 'skill'; s.stateTime = 22;
        s.vx = s.facing * 18;
        s.invuln = 18;
        s.dashHits = 0; s.dashMaxHits = 2;
        for (let i=0;i<6;i++) world.fx.push(makeSpark(s.x, s.y, s.tint));
      }
    },
    {
      id: 'botex', name: 'Botex', tag: 'Defender',
      color1: '#2a2a3a', color2: '#3df0d2',
      desc: 'Pertahanan kokoh. Skill: Counter Stance — balas serangan masuk.',
      hp: 115, speed: 3.8, jump: 12, weight: 1.15,
      punchDmg: 8, kickDmg: 10,
      skillName: 'Counter Stance',
      skillExec: (s, o, world) => {
        s.state = 'skill'; s.stateTime = 50; s.vx = 0;
        s.counterActive = 50;
      }
    },
    {
      id: 'rudy', name: 'Rudy', tag: 'Brawler',
      color1: '#4a1010', color2: '#ffd33a',
      desc: 'Petinju agresif. Skill: Rapid Flurry — 5 pukulan beruntun cepat.',
      hp: 100, speed: 4.0, jump: 13, weight: 1.0,
      punchDmg: 9, kickDmg: 9,
      skillName: 'Rapid Flurry',
      skillExec: (s, o, world) => {
        s.state = 'skill'; s.stateTime = 50; s.vx = 0;
        s.flurryTimer = 0; s.flurryHits = 0;
      }
    },
    {
      id: 'opal', name: 'Opal', tag: 'Mystic',
      color1: '#37105e', color2: '#e0a8ff',
      desc: 'Mistik jarak jauh. Skill: Sky Bolt — petir menyambar lawan.',
      hp: 95, speed: 3.8, jump: 13, weight: 0.95,
      punchDmg: 7, kickDmg: 9,
      skillName: 'Sky Bolt',
      skillExec: (s, o, world) => {
        s.state = 'skill'; s.stateTime = 30; s.vx = 0;
        // sambar lokasi lawan setelah 0.4 detik
        const targetX = o.x;   // bekukan posisi awal target supaya petir muncul di sana
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
  // EFEK / PROYEKTIL HELPERS
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

  let scene = 'title';            // 'title' | 'select' | 'battle' | 'result'
  let selectIdx = 0;              // kursor di select
  let p1Pick = -1;                // index karakter player
  let p2Pick = -1;                // index karakter AI
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
      projectiles: [],
      fx: [],
      timers: [],
      round: 1, maxRounds: 3,
      score: [0, 0],
      shake: 0,
      timer: 60 * 99,        // 99 detik
      state: 'intro', stateTime: 90,
      announce: 'GET READY',
      announceTime: 90,
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
      w: 56, h: 92,
      vx: 0, vy: 0,
      onGround: true,
      facing,
      hp: def.hp, hpMax: def.hp,
      energy: 0, energyMax: 100,
      state: 'idle', stateTime: 0,
      // attack hitbox bookkeeping
      hitDone: false,
      // debuffs / buffs
      stun: 0, invuln: 0, blocking: false,
      counterActive: 0,
      flurryTimer: 0, flurryHits: 0,
      dashHits: 0, dashMaxHits: 0,
      dead: false,
      anim: 0
    };
  }

  // -----------------------------------------------------------
  // AI sederhana untuk player 2
  // -----------------------------------------------------------
  function aiThink(self, opp, intent) {
    intent.left = false; intent.right = false; intent.up = false;
    intent.punch = false; intent.kick = false; intent.skill = false; intent.block = false;

    if (self.dead || self.stun > 0) return;
    if (self.state !== 'idle' && self.state !== 'walk' && self.state !== 'jump') return;

    const dx = opp.x - self.x;
    const adx = Math.abs(dx);
    self.facing = dx >= 0 ? 1 : -1;

    // dekati lawan
    if (adx > 90) {
      if (dx > 0) intent.right = true; else intent.left = true;
    }

    // serang acak ketika dekat
    if (adx < 95 && Math.random() < 0.06) {
      const r = Math.random();
      if (r < 0.5) intent.punch = true;
      else intent.kick = true;
    }
    // skill bila energy penuh
    if (self.energy >= self.energyMax && Math.random() < 0.02) {
      intent.skill = true;
    }
    // block sesekali
    if (adx < 110 && Math.random() < 0.03) intent.block = true;
    // lompat sesekali
    if (adx < 200 && adx > 120 && Math.random() < 0.012) intent.up = true;
  }

  // -----------------------------------------------------------
  // UPDATE FIGHTER (untuk satu fighter dengan 'intent' berisi tombol)
  // -----------------------------------------------------------
  function updateFighter(f, opp, intent) {
    if (f.dead) {
      // jatuh
      f.vy += GRAVITY;
      f.y += f.vy;
      if (f.y > GROUND_Y - f.h/2) { f.y = GROUND_Y - f.h/2; f.vy = 0; }
      return;
    }

    if (f.stun > 0) f.stun--;
    if (f.invuln > 0) f.invuln--;
    if (f.counterActive > 0) f.counterActive--;

    const canAct = f.stun <= 0 && (f.state === 'idle' || f.state === 'walk' || f.state === 'jump');

    // facing terhadap lawan saat idle
    if (canAct) f.facing = (opp.x >= f.x) ? 1 : -1;

    // BLOCKING
    f.blocking = canAct && intent.block && f.onGround;

    // GERAKAN
    if (canAct && !f.blocking) {
      let mv = 0;
      if (intent.left) mv -= 1;
      if (intent.right) mv += 1;
      f.vx = mv * f.def.speed;
      if (f.onGround) f.state = mv ? 'walk' : 'idle';

      if (intent.up && f.onGround) {
        f.vy = -f.def.jump;
        f.onGround = false;
        f.state = 'jump';
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
      f.vx = 0;
      f.state = 'block';
    } else {
      // sedang attack/skill/hurt — kurangi waktu state
      f.stateTime--;
      if (f.stateTime <= 0) {
        f.state = f.onGround ? 'idle' : 'jump';
        f.flurryHits = 0;
      }
    }

    // FLURRY (Rudy) — selama state==='skill'
    if (f.def.id === 'rudy' && f.state === 'skill') {
      f.flurryTimer = (f.flurryTimer || 0) + 1;
      if (f.flurryTimer % 9 === 0 && f.flurryHits < 5) {
        // hit kotak di depan
        const reach = 70;
        const hx = f.x + f.facing * reach;
        if (Math.abs(hx - opp.x) < 50 && Math.abs(f.y - opp.y) < 60 && !opp.dead) {
          applyHit(opp, f, 5, 0.15, world, false);
        }
        world.fx.push(makeHitFx(hx, f.y - 10, f.tint));
        f.flurryHits++;
      }
    }

    // PHYSICS
    f.vy += GRAVITY;
    f.x += f.vx;
    f.y += f.vy;

    // ground collide
    if (f.y >= GROUND_Y - f.h/2) {
      f.y = GROUND_Y - f.h/2;
      f.vy = 0;
      if (!f.onGround) {
        f.onGround = true;
        if (f.state === 'jump') f.state = 'idle';
      }
    } else {
      f.onGround = false;
    }

    // batas kiri/kanan arena
    if (f.x < 50) f.x = 50;
    if (f.x > W - 50) f.x = W - 50;

    // friction
    if (f.onGround && Math.abs(f.vx) < 0.05) f.vx = 0;
    if (f.state === 'idle' || f.state === 'walk') f.vx *= FLOOR_FRICTION;

    // HITBOX serangan biasa (punch/kick) — single hit per swing
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

    // dash hits (Natan)
    if (f.state === 'skill' && f.def.id === 'natan' && f.dashMaxHits > 0) {
      if (Math.abs(f.x - opp.x) < 60 && Math.abs(f.y - opp.y) < 70 && f.dashHits < f.dashMaxHits) {
        applyHit(opp, f, 10, 0.4, world, false);
        f.dashHits++;
      }
    }

    // animasi clock
    f.anim++;
    // energy regen
    if (f.energy < f.energyMax) f.energy += 0.18;
  }

  // -----------------------------------------------------------
  // APPLY HIT
  // -----------------------------------------------------------
  function applyHit(target, attacker, dmg, knockback, world, ignoreBlock) {
    if (target.dead || target.invuln > 0) return;
    // counter (Botex)
    if (target.counterActive > 0 && !ignoreBlock) {
      target.counterActive = 0;
      // balikkan: attacker yang kena
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
      target.dead = true;
      target.state = 'ko'; target.stateTime = 999;
      target.vy = -8;
      target.vx = attacker.facing * 4;
    }
  }

  // -----------------------------------------------------------
  // UPDATE WORLD (battle scene)
  // -----------------------------------------------------------
  const p1Intent = { left:false,right:false,up:false,punch:false,kick:false,skill:false,block:false };
  const p2Intent = { left:false,right:false,up:false,punch:false,kick:false,skill:false,block:false };

  // edge-detect untuk action buttons (P1)
  let edgePrev = { punch:false, kick:false, skill:false, up:false };

  function readPlayerIntent() {
    p1Intent.left  = keys.left;
    p1Intent.right = keys.right;
    p1Intent.block = keys.block;
    // edge-trigger biar sekali tekan = sekali aksi
    p1Intent.up    = keys.up    && !edgePrev.up;
    p1Intent.punch = keys.punch && !edgePrev.punch;
    p1Intent.kick  = keys.kick  && !edgePrev.kick;
    p1Intent.skill = keys.skill && !edgePrev.skill;
    edgePrev.up    = keys.up;
    edgePrev.punch = keys.punch;
    edgePrev.kick  = keys.kick;
    edgePrev.skill = keys.skill;
  }

  function updateBattle() {
    const [p1, p2] = world.fighters;

    // intro / outro phase
    if (world.state === 'intro') {
      world.stateTime--;
      if (world.stateTime <= 0) {
        world.state = 'fight';
        world.announce = 'FIGHT!';
        world.announceTime = 50;
      }
      return;
    }
    if (world.state === 'over') {
      world.stateTime--;
      if (world.stateTime <= 0 && !world.ended) {
        world.ended = true;
        scene = 'result';
        touchEl.classList.add('hidden');
      }
      // tetap update fisika ringan
      [p1, p2].forEach(f => updateFighter(f, f === p1 ? p2 : p1, {left:false,right:false,up:false,punch:false,kick:false,skill:false,block:false}));
      stepProjectiles();
      stepFx();
      return;
    }

    if (world.announceTime > 0) world.announceTime--;
    if (world.timer > 0) world.timer--;

    readPlayerIntent();
    aiThink(p2, p1, p2Intent);

    updateFighter(p1, p2, p1Intent);
    updateFighter(p2, p1, p2Intent);

    stepProjectiles();
    stepFx();
    stepTimers();

    if (world.shake > 0) world.shake = Math.max(0, world.shake - 1);

    // ronde berakhir?
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
      p.x += p.vx; p.y += p.vy;
      p.life--;
      const target = (p.owner === 0) ? p2 : p1;
      if (Math.abs(p.x - target.x) < 36 && Math.abs(p.y - target.y) < 50 && !target.dead) {
        const att = world.fighters[p.owner];
        applyHit(target, att, p.dmg, 0.45, world, false);
        world.fx.push(makeHitFx(p.x, p.y, p.tint));
        world.projectiles.splice(i, 1);
        continue;
      }
      if (p.x < -50 || p.x > W + 50 || p.life <= 0) {
        world.projectiles.splice(i, 1);
      }
    }
  }

  function stepFx() {
    const [p1, p2] = world.fighters;
    for (let i = world.fx.length - 1; i >= 0; i--) {
      const f = world.fx[i];
      f.life--;
      if (f.type === 'shock') {
        f.x += f.vx;
        const targets = [p1, p2];
        targets.forEach((t, ti) => {
          if (ti === f.ownerIdx) return;       // jangan kena pemilik
          if (f.hit.has(ti)) return;            // sudah pernah kena
          if (Math.abs(f.x - t.x) < 38 && Math.abs(f.y - t.y) < 70 && !t.dead) {
            const owner = world.fighters[f.ownerIdx];
            applyHit(t, owner, f.dmg, 0.4, world, false);
            f.hit.add(ti);
          }
        });
      }
      if (f.type === 'spark') {
        f.x += f.vx; f.y += f.vy; f.vy += 0.2;
      }
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
  // RENDER
  // -----------------------------------------------------------
  function clear(color) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, W, H);
  }

  function drawBgArena(t) {
    // langit gradien
    const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    g.addColorStop(0, '#1a0a3a');
    g.addColorStop(0.6, '#3a0e5a');
    g.addColorStop(1, '#601a4a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, GROUND_Y);

    // bulan
    ctx.fillStyle = '#ffe6c0';
    ctx.beginPath(); ctx.arc(780, 110, 38, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(255,230,192,0.18)';
    ctx.beginPath(); ctx.arc(780, 110, 60, 0, Math.PI*2); ctx.fill();

    // siluet gunung
    ctx.fillStyle = '#180325';
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    for (let x = 0; x <= W; x += 30) {
      const y = GROUND_Y - 60 - Math.sin(x*0.012)*30 - Math.sin(x*0.03)*12;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, GROUND_Y); ctx.closePath(); ctx.fill();

    // lantai
    const fg = ctx.createLinearGradient(0, GROUND_Y, 0, H);
    fg.addColorStop(0, '#1a0a30');
    fg.addColorStop(1, '#05010a');
    ctx.fillStyle = fg;
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

    // garis grid lantai (perspektif)
    ctx.strokeStyle = 'rgba(180,120,255,0.25)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 14; i++) {
      const yy = GROUND_Y + Math.pow(i/14, 1.6) * (H - GROUND_Y);
      ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W, yy); ctx.stroke();
    }
  }

  function drawFighter(f) {
    const { x, y, w, h, facing } = f;
    const t = f.anim;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing, 1);

    // bayangan
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.ellipse(0, h/2 + 4, 36, 7, 0, 0, Math.PI*2); ctx.fill();

    // body proportions
    const bob = (f.state === 'walk') ? Math.sin(t*0.4)*2 : (f.state === 'idle' ? Math.sin(t*0.08)*1.2 : 0);
    const yOff = bob;

    // legs
    ctx.fillStyle = f.base;
    let legSwing = 0;
    if (f.state === 'walk') legSwing = Math.sin(t*0.4) * 8;
    if (f.state === 'jump' || !f.onGround) legSwing = -6;
    // left leg
    ctx.fillRect(-12, 12 + yOff, 8, 28);
    // right leg
    ctx.fillRect(4 + legSwing*0.2, 12 + yOff, 8, 28 - Math.abs(legSwing)*0.4);

    // torso
    ctx.fillStyle = f.base;
    ctx.fillRect(-16, -18 + yOff, 32, 32);
    // belt
    ctx.fillStyle = f.tint;
    ctx.fillRect(-16, 10 + yOff, 32, 4);

    // arms
    ctx.fillStyle = f.base;
    let armFront = 0; // angle sederhana via offset x
    if (f.state === 'punch') {
      const elapsed = 14 - f.stateTime;
      const reach = Math.sin(Math.min(elapsed,7)/7 * Math.PI) * 28;
      armFront = reach;
    } else if (f.state === 'kick') {
      armFront = -4;
    } else if (f.state === 'block') {
      armFront = 6;
    }
    // back arm
    ctx.fillRect(-22, -10 + yOff, 8, 22);
    // front arm (with punch reach)
    ctx.fillRect(14 + armFront, -10 + yOff, 8 + armFront*0.3, 22);
    // fist saat punch
    if (f.state === 'punch') {
      ctx.fillStyle = f.tint;
      ctx.beginPath(); ctx.arc(22 + armFront + 6, -2 + yOff, 8, 0, Math.PI*2); ctx.fill();
    }

    // kick leg
    if (f.state === 'kick') {
      const elapsed = 18 - f.stateTime;
      const reach = Math.sin(Math.min(elapsed,9)/9 * Math.PI) * 38;
      ctx.fillStyle = f.base;
      ctx.fillRect(8, 4 + yOff, 14 + reach, 12);
      ctx.fillStyle = f.tint;
      ctx.fillRect(20 + reach, 6 + yOff, 8, 8);
    }

    // head
    ctx.fillStyle = '#f1c89a';
    ctx.beginPath(); ctx.arc(0, -28 + yOff, 14, 0, Math.PI*2); ctx.fill();
    // hair / band
    ctx.fillStyle = f.tint;
    ctx.fillRect(-14, -36 + yOff, 28, 6);
    // eye
    ctx.fillStyle = '#222';
    ctx.fillRect(4, -30 + yOff, 4, 4);

    // block aura
    if (f.state === 'block') {
      ctx.strokeStyle = 'rgba(80,220,255,0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, -6 + yOff, 36, 0, Math.PI*2); ctx.stroke();
    }
    // counter aura (Botex)
    if (f.counterActive > 0) {
      const a = 0.4 + Math.sin(t*0.5)*0.3;
      ctx.strokeStyle = `rgba(60,240,210,${a})`;
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, -6 + yOff, 42, 0, Math.PI*2); ctx.stroke();
    }
    // skill aura
    if (f.state === 'skill') {
      const a = 0.5 + Math.sin(t*0.6)*0.4;
      ctx.strokeStyle = `rgba(255,255,255,${a})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, -6 + yOff, 50, 0, Math.PI*2); ctx.stroke();
    }
    // hurt flash
    if (f.state === 'hurt' && (frame % 4 < 2)) {
      ctx.fillStyle = 'rgba(255,80,80,0.45)';
      ctx.fillRect(-20, -38 + yOff, 40, 60);
    }

    ctx.restore();

    // KO
    if (f.dead) {
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(-30, -10, 60, 30);
      ctx.restore();
    }
  }

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
        ctx.fillStyle = f.tint;
        ctx.fillRect(f.x, f.y, 3, 3);
      } else if (f.type === 'hit') {
        const k = (14 - f.life) / 14;
        ctx.strokeStyle = f.tint;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(f.x, f.y, 6 + k*22, 0, Math.PI*2); ctx.stroke();
      } else if (f.type === 'bolt') {
        ctx.strokeStyle = f.tint;
        ctx.lineWidth = 4;
        let yy = f.yTop;
        ctx.beginPath();
        ctx.moveTo(f.x, yy);
        while (yy < f.yBot) {
          yy += 18 + Math.random()*8;
          const xx = f.x + (Math.random()-0.5)*28;
          ctx.lineTo(xx, yy);
        }
        ctx.stroke();
      }
    });
  }

  function drawHUD() {
    const [p1, p2] = world.fighters;
    drawBar(40, 30, 360, 22, p1.hp / p1.hpMax, p1.tint, p1.name, false);
    drawBar(W - 400, 30, 360, 22, p2.hp / p2.hpMax, p2.tint, p2.name, true);
    // energy
    drawSmallBar(40, 56, 220, 8, p1.energy / p1.energyMax, '#fff');
    drawSmallBar(W - 260, 56, 220, 8, p2.energy / p2.energyMax, '#fff');
    // timer
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(Math.ceil(world.timer / 60).toString().padStart(2,'0'), W/2, 42);
    // skor (round wins)
    ctx.fillStyle = '#fff';
    ctx.font = '12px sans-serif';
    ctx.fillText('Ronde ' + world.round, W/2, 64);
  }

  function drawBar(x, y, w, h, frac, color, label, mirror) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x, y, w, h);
    const fw = Math.max(0, Math.min(1, frac)) * (w - 4);
    ctx.fillStyle = color;
    if (mirror) ctx.fillRect(x + w - 2 - fw, y + 2, fw, h - 4);
    else        ctx.fillRect(x + 2, y + 2, fw, h - 4);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = mirror ? 'right' : 'left';
    ctx.fillText(label, mirror ? x + w : x, y - 6);
  }
  function drawSmallBar(x, y, w, h, frac, color) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x, y, w, h);
    const fw = Math.max(0, Math.min(1, frac)) * (w - 2);
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, fw, h - 2);
  }

  function drawAnnounce() {
    if (world.announceTime <= 0) return;
    const t = world.announceTime;
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
  // SCENE: TITLE
  // -----------------------------------------------------------
  let titleAnim = 0;
  function drawTitle() {
    titleAnim++;
    drawBgArena();
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 78px sans-serif';
    ctx.shadowColor = '#a060ff'; ctx.shadowBlur = 24;
    ctx.fillText('GEMING FIGHTER', W/2, 200);
    ctx.shadowBlur = 0;
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#e0c8ff';
    ctx.fillText('6 Petarung. Skill Unik. Pertarungan Sentuh.', W/2, 240);

    // tombol Mulai
    const bx = W/2 - 130, by = 320, bw = 260, bh = 70;
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
    ctx.fillText('Ketuk layar untuk memulai', W/2, by + bh + 30);
    ctx.restore();

    // simpan tombol untuk klik
    titleBtn = { x: bx, y: by, w: bw, h: bh };
  }
  let titleBtn = null;

  // -----------------------------------------------------------
  // SCENE: SELECT
  // -----------------------------------------------------------
  let pickedSide = 0; // 0 = pilih P1, 1 = sudah, AI random
  let charBoxes = [];

  function drawSelect() {
    drawBgArena();
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('PILIH PETARUNG', W/2, 60);
    ctx.font = '14px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('Ketuk salah satu kartu di bawah', W/2, 88);

    charBoxes = [];
    const cols = 3, rows = 2;
    const cw = 260, ch = 150;
    const gx = (W - cols*cw - (cols-1)*20) / 2;
    const gy = 130;
    for (let i = 0; i < FIGHTERS.length; i++) {
      const f = FIGHTERS[i];
      const cx = gx + (i % cols) * (cw + 20);
      const cy = gy + Math.floor(i / cols) * (ch + 20);
      charBoxes.push({ x: cx, y: cy, w: cw, h: ch, idx: i });

      // card bg
      ctx.fillStyle = (i === selectIdx) ? f.color1 : 'rgba(20,10,40,0.7)';
      ctx.fillRect(cx, cy, cw, ch);
      ctx.strokeStyle = (i === selectIdx) ? f.color2 : 'rgba(255,255,255,0.25)';
      ctx.lineWidth = (i === selectIdx) ? 4 : 2;
      ctx.strokeRect(cx, cy, cw, ch);

      // mini avatar
      ctx.fillStyle = f.color1;
      ctx.fillRect(cx + 14, cy + 30, 60, 80);
      ctx.fillStyle = '#f1c89a';
      ctx.beginPath(); ctx.arc(cx + 44, cy + 28, 18, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = f.color2;
      ctx.fillRect(cx + 24, cy + 14, 40, 8);
      ctx.fillStyle = f.color2;
      ctx.fillRect(cx + 14, cy + 70, 60, 5);

      // name + tag
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(f.name, cx + 90, cy + 36);
      ctx.font = '12px sans-serif';
      ctx.fillStyle = f.color2;
      ctx.fillText(f.tag.toUpperCase(), cx + 90, cy + 54);
      // skill
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('Skill: ' + f.skillName, cx + 90, cy + 78);
      // stat bars
      drawStatBar(cx + 90, cy + 92, 'HP', f.hp / 130, f.color2);
      drawStatBar(cx + 90, cy + 108, 'SPD', f.speed / 6, f.color2);
      drawStatBar(cx + 90, cy + 124, 'ATK', (f.punchDmg + f.kickDmg) / 22, f.color2);
    }

    // tombol mulai bertarung
    const bx = W/2 - 120, by = H - 60, bw = 240, bh = 44;
    ctx.fillStyle = 'rgba(160,80,255,0.85)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PILIH ' + FIGHTERS[selectIdx].name.toUpperCase(), W/2, by + 28);
    ctx.restore();

    selectStartBtn = { x: bx, y: by, w: bw, h: bh };
  }
  let selectStartBtn = null;

  function drawStatBar(x, y, label, frac, color) {
    ctx.fillStyle = '#fff';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, x, y + 8);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(x + 28, y + 1, 120, 8);
    ctx.fillStyle = color;
    ctx.fillRect(x + 28, y + 1, Math.max(0, Math.min(1, frac)) * 120, 8);
  }

  // -----------------------------------------------------------
  // SCENE: RESULT
  // -----------------------------------------------------------
  let resultBtn = null;
  function drawResult() {
    drawBgArena();
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = resultColor;
    ctx.font = 'bold 64px sans-serif';
    ctx.shadowColor = resultColor; ctx.shadowBlur = 20;
    ctx.fillText(resultText, W/2, 200);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = '22px sans-serif';
    ctx.fillText(`${world.fighters[0].name} vs ${world.fighters[1].name}`, W/2, 250);

    const bx = W/2 - 130, by = 320, bw = 260, bh = 60;
    ctx.fillStyle = 'rgba(160,80,255,0.85)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('BERTARUNG LAGI', W/2, by + 38);
    resultBtn = { x: bx, y: by, w: bw, h: bh };
    ctx.restore();
  }

  // -----------------------------------------------------------
  // POINTER (klik / tap) handler
  // -----------------------------------------------------------
  function canvasPointer(e) {
    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (W / rect.width);
    const cy = (e.clientY - rect.top) * (H / rect.height);
    return { x: cx, y: cy };
  }
  function inBox(p, b) {
    return b && p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
  }
  function onPointerDown(e) {
    const p = canvasPointer(e.touches ? e.touches[0] : e);
    if (scene === 'title') {
      // ketuk di mana saja masuk ke select
      scene = 'select';
    } else if (scene === 'select') {
      const c = charBoxes.find(b => inBox(p, b));
      if (c) selectIdx = c.idx;
      if (inBox(p, selectStartBtn)) {
        p1Pick = selectIdx;
        // AI pilih acak (tapi bukan diri sendiri)
        let pool = FIGHTERS.map((_,i)=>i).filter(i => i !== p1Pick);
        p2Pick = pool[Math.floor(Math.random()*pool.length)];
        startBattle(p1Pick, p2Pick);
      }
    } else if (scene === 'result') {
      if (inBox(p, resultBtn)) {
        scene = 'select';
      }
    }
  }
  canvas.addEventListener('mousedown', onPointerDown);
  canvas.addEventListener('touchstart', e => { e.preventDefault(); onPointerDown(e); }, {passive:false});

  // tombol back
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
      clear('#0a0a18');
      drawTitle();
    } else if (scene === 'select') {
      clear('#0a0a18');
      drawSelect();
    } else if (scene === 'battle') {
      updateBattle();
      ctx.save();
      // screen shake
      if (world.shake > 0) {
        ctx.translate((Math.random()-0.5)*world.shake, (Math.random()-0.5)*world.shake);
      }
      drawBgArena();
      // urutkan: yang lebih jauh (y kecil) duluan
      drawFighter(world.fighters[0]);
      drawFighter(world.fighters[1]);
      drawProjectiles();
      drawFx();
      ctx.restore();
      drawHUD();
      drawAnnounce();
    } else if (scene === 'result') {
      clear('#0a0a18');
      drawResult();
    }
    requestAnimationFrame(loop);
  }

  // tampilkan touch controls hanya di battle (sudah dihandle pada startBattle)
  touchEl.classList.add('hidden');
  topbar.classList.add('hidden');

  loop();
})();
