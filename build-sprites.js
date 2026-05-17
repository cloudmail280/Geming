// =============================================================
//  build-sprites.js — Render karakter vector ke PNG sprite sheet
//  Dipakai untuk membuat placeholder sprites dari vector renderer
//  yang sama persis dengan yang dipakai di game.
//  Output: sprites/<id>/<state>.png + manifest.json
// =============================================================
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// -------------------- Mirror dari FIGHTERS di game.js --------------------
const FIGHTERS = [
  { id: 'kodam', name: 'Kodam', style: 'strongman',
    skin: '#d8a073', hair: '#1a0a06', eye: '#2a1408',
    outfit: '#7a3a14', accent: '#e0b040', pants: '#2a1810' },
  { id: 'boja', name: 'Boja', style: 'gi',
    skin: '#e7c19a', hair: '#241208', eye: '#1f1208',
    outfit: '#f0f0f0', accent: '#c8302a', pants: '#f0f0f0' },
  { id: 'natan', name: 'Natan', style: 'ninja',
    skin: '#caa080', hair: '#0a0a0a', eye: '#080808',
    outfit: '#1a3a26', accent: '#a3ff4d', pants: '#0a1a14' },
  { id: 'botex', name: 'Botex', style: 'karate',
    skin: '#d4a888', hair: '#3a2a18', eye: '#1a1208',
    outfit: '#1c1c2a', accent: '#3df0d2', pants: '#1c1c2a' },
  { id: 'rudy', name: 'Rudy', style: 'boxer',
    skin: '#c98a5e', hair: '#0a0808', eye: '#1a0a06',
    outfit: '#9a1a1a', accent: '#ffd33a', pants: '#1a1a1a' },
  { id: 'opal', name: 'Opal', style: 'mage',
    skin: '#ead0bc', hair: '#dcb0ff', eye: '#3a1a5a',
    outfit: '#3a1a5e', accent: '#e0a8ff', pants: '#1f0a30' }
];

// Frame size & anchor — frame 128x128, kaki di y=116 (anchorY)
const FRAME_W = 128;
const FRAME_H = 128;
const ANCHOR_Y = 116;

// -------------------- Helpers (sama seperti game.js) --------------------
function rrect(ctx, x, y, w, h, r) {
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

// -------------------- Sub-renderer (port dari game.js) --------------------
function drawLeg(ctx, footX, footY, pantsColor, knee, isBack) {
  const hipX = footX > 0 ? 4 : -4;
  const hipY = 8;
  const kneeX = (footX + hipX)/2 + (isBack ? -1 : 1);
  const kneeY = (footY + hipY)/2 + knee;
  ctx.strokeStyle = pantsColor; ctx.lineWidth = 12; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(kneeX, kneeY); ctx.stroke();
  ctx.lineWidth = 10;
  ctx.beginPath(); ctx.moveTo(kneeX, kneeY); ctx.lineTo(footX, footY); ctx.stroke();
  ctx.fillStyle = '#1a1a1a';
  rrect(ctx, footX - 8, footY - 2, 16, 8, 3); ctx.fill();
  ctx.fillStyle = '#444';
  ctx.fillRect(footX - 8, footY + 4, 16, 2);
}

function drawKickLeg(ctx, extend, pantsColor) {
  const hipX = 0, hipY = 4;
  const kneeX = 14 + extend*0.3, kneeY = -4;
  const ankleX = 28 + extend, ankleY = -8 - extend*0.1;
  ctx.strokeStyle = pantsColor; ctx.lineWidth = 12; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(kneeX, kneeY); ctx.stroke();
  ctx.lineWidth = 10;
  ctx.beginPath(); ctx.moveTo(kneeX, kneeY); ctx.lineTo(ankleX, ankleY); ctx.stroke();
  ctx.save(); ctx.translate(ankleX, ankleY); ctx.rotate(-0.3);
  ctx.fillStyle = '#1a1a1a'; rrect(ctx, -4, -4, 18, 8, 3); ctx.fill();
  ctx.fillStyle = '#444'; ctx.fillRect(-4, 1, 18, 2);
  ctx.restore();
}

function drawTorso(ctx, def, tx, yOff) {
  const x = -16 + tx, y = -22 + yOff, w = 32, h = 26;
  if (def.style === 'gi' || def.style === 'karate') {
    ctx.fillStyle = def.outfit; rrect(ctx, x, y, w, h+4, 4); ctx.fill();
    ctx.fillStyle = darken(def.outfit, 0.2); ctx.fillRect(x, y + h - 6, w, 6);
    ctx.fillStyle = darken(def.outfit, 0.45);
    ctx.beginPath();
    ctx.moveTo(0 + tx, y + 1); ctx.lineTo(-7 + tx, y + h); ctx.lineTo(7 + tx, y + h);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = def.skin;
    ctx.beginPath();
    ctx.moveTo(0 + tx, y + 4); ctx.lineTo(-3 + tx, y + h - 2); ctx.lineTo(3 + tx, y + h - 2);
    ctx.closePath(); ctx.fill();
  } else if (def.style === 'strongman') {
    ctx.fillStyle = def.skin; rrect(ctx, x, y, w, h+4, 4); ctx.fill();
    ctx.fillStyle = def.outfit;
    ctx.beginPath();
    ctx.moveTo(x+4, y); ctx.lineTo(x+w-4, y);
    ctx.lineTo(x+w-2, y+h+4); ctx.lineTo(x+2, y+h+4);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = darken(def.skin, 0.25); ctx.fillRect(-1 + tx, y + 6, 2, 12);
    ctx.fillStyle = darken(def.skin, 0.18);
    ctx.fillRect(-8 + tx, y + 18, 4, 3);
    ctx.fillRect( 4 + tx, y + 18, 4, 3);
  } else if (def.style === 'ninja') {
    ctx.fillStyle = def.outfit; rrect(ctx, x, y, w, h+4, 4); ctx.fill();
    ctx.fillStyle = darken(def.outfit, 0.3); ctx.fillRect(x, y + 2, w, 2);
    ctx.strokeStyle = def.accent; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x+4, y+2); ctx.lineTo(x+w-4, y+h);
    ctx.moveTo(x+w-4, y+2); ctx.lineTo(x+4, y+h);
    ctx.stroke();
  } else if (def.style === 'boxer') {
    ctx.fillStyle = def.skin; rrect(ctx, x, y, w, h+4, 4); ctx.fill();
    ctx.fillStyle = def.outfit;
    ctx.beginPath();
    ctx.moveTo(x+6, y); ctx.lineTo(x+w-6, y);
    ctx.lineTo(x+w-2, y+h+4); ctx.lineTo(x+2, y+h+4);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = darken(def.skin, 0.22); ctx.fillRect(-1 + tx, y + 8, 2, 10);
    ctx.fillStyle = def.accent; ctx.fillRect(-5 + tx, y + 6, 10, 3);
  } else if (def.style === 'mage') {
    ctx.fillStyle = def.outfit; rrect(ctx, x-3, y, w+6, h+10, 5); ctx.fill();
    ctx.fillStyle = def.accent; ctx.fillRect(-1 + tx, y + 4, 2, h);
    ctx.fillStyle = lighten(def.accent, 0.3);
    ctx.beginPath(); ctx.arc(0 + tx, y + 12, 3, 0, Math.PI*2); ctx.fill();
  }
}

function drawArm(ctx, handX, handY, def, isFront, state, punchExtend) {
  const shoulderX = handX > 0 ? 14 : -14;
  const shoulderY = -16;
  let sleeveColor;
  if (def.style === 'gi' || def.style === 'karate' || def.style === 'mage' || def.style === 'ninja') sleeveColor = def.outfit;
  else sleeveColor = def.skin;
  ctx.strokeStyle = sleeveColor; ctx.lineWidth = 9; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(shoulderX, shoulderY); ctx.lineTo(handX, handY); ctx.stroke();
  if (sleeveColor !== def.skin && (def.style === 'gi' || def.style === 'karate')) {
    const elbowX = (shoulderX + handX)/2;
    const elbowY = (shoulderY + handY)/2;
    ctx.strokeStyle = def.skin; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(elbowX, elbowY); ctx.lineTo(handX, handY); ctx.stroke();
  }
  if (def.style === 'boxer' && isFront) {
    ctx.fillStyle = def.outfit;
    ctx.beginPath(); ctx.arc(handX, handY, 10, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = def.accent;
    ctx.beginPath(); ctx.arc(handX, handY+1, 5, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = darken(def.outfit, 0.3); ctx.lineWidth = 1; ctx.stroke();
  } else if (def.style === 'boxer') {
    ctx.fillStyle = def.outfit;
    ctx.beginPath(); ctx.arc(handX, handY, 8, 0, Math.PI*2); ctx.fill();
  } else {
    ctx.fillStyle = def.skin;
    ctx.beginPath(); ctx.arc(handX, handY, 6, 0, Math.PI*2); ctx.fill();
    if (def.style === 'karate' || def.style === 'gi' || def.style === 'ninja') {
      ctx.fillStyle = def.accent;
      ctx.fillRect(handX - 6, handY - 8, 12, 3);
    }
    if (state === 'punch' && isFront && punchExtend > 12) {
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(handX, handY, 9, 0, Math.PI*2); ctx.stroke();
    }
  }
}

function drawHead(ctx, def, tx, yOff, hurt) {
  const cx = 0 + tx, cy = -32 + yOff;
  ctx.fillStyle = darken(def.skin, 0.15);
  ctx.fillRect(cx - 4, cy + 6, 8, 5);
  ctx.fillStyle = def.skin;
  ctx.beginPath(); ctx.ellipse(cx, cy, 11, 13, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = darken(def.skin, 0.12);
  ctx.beginPath(); ctx.ellipse(cx, cy + 6, 9, 4, 0, 0, Math.PI*2); ctx.fill();

  if (def.style === 'gi') {
    ctx.fillStyle = def.hair;
    ctx.beginPath();
    ctx.moveTo(cx-11, cy-2); ctx.quadraticCurveTo(cx, cy-15, cx+11, cy-2);
    ctx.lineTo(cx+10, cy-5); ctx.lineTo(cx-10, cy-5);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = def.accent; rrect(ctx, cx-12, cy-6, 24, 4, 1); ctx.fill();
    ctx.fillStyle = def.accent; ctx.fillRect(cx-14, cy-4, 4, 8);
  } else if (def.style === 'strongman') {
    ctx.fillStyle = darken(def.skin, 0.25);
    ctx.beginPath(); ctx.arc(cx, cy-2, 11, Math.PI, Math.PI*2); ctx.fill();
    ctx.fillStyle = def.hair;
    ctx.beginPath();
    ctx.moveTo(cx-8, cy+3); ctx.quadraticCurveTo(cx, cy+12, cx+8, cy+3);
    ctx.lineTo(cx+6, cy+8); ctx.lineTo(cx-6, cy+8);
    ctx.closePath(); ctx.fill();
    ctx.fillRect(cx-5, cy+2, 10, 2);
  } else if (def.style === 'ninja') {
    ctx.fillStyle = def.outfit;
    ctx.beginPath();
    ctx.moveTo(cx-12, cy-12); ctx.lineTo(cx+12, cy-12);
    ctx.lineTo(cx+12, cy-2); ctx.lineTo(cx+10, cy+10);
    ctx.lineTo(cx-10, cy+10); ctx.lineTo(cx-12, cy-2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = def.skin; ctx.fillRect(cx-9, cy-3, 18, 4);
    ctx.fillStyle = def.accent; ctx.fillRect(cx-13, cy-9, 26, 2);
    ctx.fillRect(cx-15, cy-7, 4, 7);
  } else if (def.style === 'karate') {
    ctx.fillStyle = def.hair;
    ctx.beginPath();
    ctx.moveTo(cx-11, cy);
    ctx.quadraticCurveTo(cx-12, cy-14, cx-2, cy-14);
    ctx.quadraticCurveTo(cx+2, cy-16, cx+8, cy-14);
    ctx.quadraticCurveTo(cx+13, cy-10, cx+11, cy);
    ctx.lineTo(cx+10, cy-4); ctx.lineTo(cx-10, cy-4);
    ctx.closePath(); ctx.fill();
  } else if (def.style === 'boxer') {
    ctx.fillStyle = def.hair;
    ctx.beginPath();
    ctx.moveTo(cx-11, cy-3);
    ctx.quadraticCurveTo(cx, cy-14, cx+11, cy-3);
    ctx.lineTo(cx+10, cy-6); ctx.lineTo(cx-10, cy-6);
    ctx.closePath(); ctx.fill();
  } else if (def.style === 'mage') {
    ctx.fillStyle = def.outfit;
    ctx.beginPath();
    ctx.moveTo(cx-14, cy-2);
    ctx.quadraticCurveTo(cx-16, cy-18, cx, cy-18);
    ctx.quadraticCurveTo(cx+16, cy-18, cx+14, cy-2);
    ctx.lineTo(cx+12, cy+2); ctx.lineTo(cx-12, cy+2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.ellipse(cx, cy-2, 9, 7, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = def.hair;
    ctx.fillRect(cx-13, cy+3, 4, 8);
    ctx.fillRect(cx+9, cy+3, 4, 8);
  }

  if (def.style !== 'ninja' && def.style !== 'mage') {
    ctx.fillStyle = darken(def.hair, 0.1);
    ctx.fillRect(cx-7, cy-4, 5, 1.5);
    ctx.fillRect(cx+2, cy-4, 5, 1.5);
    ctx.fillStyle = '#fff';
    ctx.fillRect(cx-6, cy-2, 4, 3);
    ctx.fillRect(cx+2, cy-2, 4, 3);
    ctx.fillStyle = def.eye;
    ctx.fillRect(cx-5, cy-2, 2, 3);
    ctx.fillRect(cx+3, cy-2, 2, 3);
    ctx.fillStyle = darken(def.skin, 0.4);
    if (hurt) ctx.fillRect(cx-3, cy+5, 6, 2);
    else ctx.fillRect(cx-3, cy+5, 6, 1);
  } else if (def.style === 'mage') {
    ctx.fillStyle = lighten(def.accent, 0.3);
    ctx.fillRect(cx-4, cy-3, 2, 2);
    ctx.fillRect(cx+2, cy-3, 2, 2);
  }
}

// Render single fighter dengan pose tertentu — translate+scale sudah di-set caller
function drawHumanFighter(ctx, def, pose) {
  const t = pose.t || 0;
  const state = pose.state || 'idle';
  const stateTime = pose.stateTime || 0;

  let bob = 0;
  if (state === 'walk') bob = Math.sin(t*0.4)*2;
  else if (state === 'idle') bob = Math.sin(t*0.08)*1.2;
  const yOff = bob;

  let leftFootX = -10, leftFootY = 44;
  let rightFootX = 10, rightFootY = 44;
  let kneeBend = 0;
  if (state === 'walk') {
    const ph = Math.sin(t*0.4);
    leftFootX = -10 + ph*4; leftFootY = 44 - Math.max(0, ph)*4;
    rightFootX = 10 - ph*4; rightFootY = 44 - Math.max(0, -ph)*4;
  } else if (state === 'jump' || !pose.onGround) {
    kneeBend = 6; leftFootY = 36; rightFootY = 36;
    leftFootX = -8; rightFootX = 8;
  } else if (state === 'idle') { leftFootX = -14; rightFootX = 12;
  } else if (state === 'punch') { leftFootX = -16; rightFootX = 14;
  } else if (state === 'kick') { leftFootX = -16; leftFootY = 44;
  } else if (state === 'block') { leftFootX = -12; rightFootX = 12;
  } else if (state === 'hurt') { leftFootX = -14; rightFootX = 8;
  } else if (state === 'ko') { leftFootX = -20; rightFootX = 20; }

  let leftHandX = -22, leftHandY = -2;
  let rightHandX = 22, rightHandY = -2;
  let punchExtend = 0, kickExtend = 0;

  if (state === 'idle' || state === 'walk') {
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
    leftHandX = -2; leftHandY = -14;
    rightHandX = 2; rightHandY = -14;
  } else if (state === 'hurt') {
    leftHandX = -22; leftHandY = -4;
    rightHandX = 18; rightHandY = -2;
  } else if (state === 'skill') {
    leftHandX = -12; leftHandY = -16;
    rightHandX = 12; rightHandY = -16;
  } else if (state === 'ko') {
    leftHandX = -28; leftHandY = 10;
    rightHandX = 28; rightHandY = 10;
  }

  let bodyTiltX = 0;
  if (state === 'hurt') bodyTiltX = -6;
  if (state === 'punch') bodyTiltX = 4;
  if (state === 'kick') bodyTiltX = -3;

  // Bayangan
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 50, 26, 5, 0, 0, Math.PI*2);
  ctx.fill();

  drawLeg(ctx, leftFootX, leftFootY + yOff, def.pants, kneeBend, true);
  if (state === 'kick') {
    drawKickLeg(ctx, kickExtend, def.pants);
  } else {
    drawLeg(ctx, rightFootX, rightFootY + yOff, def.pants, kneeBend, false);
  }

  ctx.fillStyle = darken(def.pants, 0.15);
  rrect(ctx, -14 + bodyTiltX, 0 + yOff, 28, 10, 2); ctx.fill();
  ctx.fillStyle = def.accent;
  ctx.fillRect(-14 + bodyTiltX, 4 + yOff, 28, 3);

  drawTorso(ctx, def, bodyTiltX, yOff);
  drawArm(ctx, leftHandX + bodyTiltX, leftHandY + yOff, def, false);
  drawArm(ctx, rightHandX + bodyTiltX, rightHandY + yOff, def, true, state, punchExtend);
  drawHead(ctx, def, bodyTiltX*0.4, yOff, state === 'hurt');

  // aura skill
  if (state === 'skill') {
    const a = 0.5 + Math.sin(t*0.6)*0.4;
    ctx.strokeStyle = `rgba(255,255,255,${a})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0 + yOff, 52, 0, Math.PI*2); ctx.stroke();
  }
  if (state === 'block') {
    ctx.strokeStyle = 'rgba(80,220,255,0.85)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0 + yOff, 38, 0, Math.PI*2); ctx.stroke();
  }
}

// -------------------- Build sheet untuk satu state --------------------
function buildSheet(def, state, frames, framePoseFn) {
  const canvas = createCanvas(FRAME_W * frames, FRAME_H);
  const ctx = canvas.getContext('2d');
  for (let i = 0; i < frames; i++) {
    ctx.save();
    ctx.translate(i * FRAME_W + FRAME_W/2, ANCHOR_Y);
    const pose = framePoseFn(i, frames);
    drawHumanFighter(ctx, def, pose);
    ctx.restore();
  }
  return canvas;
}

// Definisi tiap state — frames + poseFn
const STATES = {
  idle:  { frames: 4, fps: 6,  loop: true,  pose: (i, n) => ({ t: i * 18, state: 'idle', onGround: true }) },
  walk:  { frames: 6, fps: 10, loop: true,  pose: (i, n) => ({ t: i * 4,  state: 'walk', onGround: true }) },
  jump:  { frames: 2, fps: 4,  loop: true,  pose: (i, n) => ({ t: i * 8,  state: 'jump', onGround: false }) },
  punch: { frames: 5, fps: 24, loop: false, pose: (i, n) => ({ t: 0, state: 'punch', stateTime: 14 - Math.round((i + 0.5) / n * 14), onGround: true }) },
  kick:  { frames: 5, fps: 18, loop: false, pose: (i, n) => ({ t: 0, state: 'kick',  stateTime: 18 - Math.round((i + 0.5) / n * 18), onGround: true }) },
  block: { frames: 1, fps: 1,  loop: true,  pose: (i, n) => ({ t: 0, state: 'block', onGround: true }) },
  hurt:  { frames: 2, fps: 8,  loop: false, pose: (i, n) => ({ t: i * 6, state: 'hurt', onGround: true }) },
  ko:    { frames: 1, fps: 1,  loop: true,  pose: (i, n) => ({ t: 0, state: 'ko', onGround: true }) },
  skill: { frames: 6, fps: 18, loop: false, pose: (i, n) => ({ t: i * 4, state: 'skill', onGround: true }) }
};

// -------------------- Run --------------------
const ROOT = path.join(__dirname, 'sprites');
let totalFiles = 0;
for (const def of FIGHTERS) {
  const dir = path.join(ROOT, def.id);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const manifest = { frameW: FRAME_W, frameH: FRAME_H, anchorY: ANCHOR_Y, states: {} };

  for (const [stateName, info] of Object.entries(STATES)) {
    const sheet = buildSheet(def, stateName, info.frames, info.pose);
    const filename = `${stateName}.png`;
    const buffer = sheet.toBuffer('image/png');
    fs.writeFileSync(path.join(dir, filename), buffer);
    totalFiles++;

    const m = { src: filename, frames: info.frames, fps: info.fps };
    if (!info.loop) m.loop = false;
    manifest.states[stateName] = m;
  }
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`  ✔ ${def.id} (${Object.keys(STATES).length} states)`);
}
console.log(`\nDone! ${totalFiles} PNGs + 6 manifests written to sprites/`);
