# Geming Fighter — Sprite Guide

Game ini sudah siap pakai sprite PNG. Selama folder `sprites/<id>/` belum berisi sprite, game akan otomatis pakai gambar vector. Begitu kamu drop sprite di sini, game otomatis pakai gambar sungguhan.

## Struktur Folder

```
sprites/
  kodam/
    manifest.json
    idle.png
    walk.png
    punch.png
    kick.png
    block.png
    hurt.png
    skill.png
  boja/
    manifest.json
    idle.png
    ...
  natan/
  botex/
  rudy/
  opal/
```

## Format Sprite

- **Spritesheet horizontal**: PNG berisi beberapa frame berurutan kiri ke kanan.
- Tiap frame ukurannya sama (mis. 128×128 px).
- Background transparan (PNG-32).
- Karakter menghadap **kanan** (game akan auto-flip kalau hadap kiri).
- Pijakan kaki harus konsisten antar frame supaya animasi mulus.

## Manifest

Tiap karakter butuh `manifest.json`:

```json
{
  "frameW": 128,
  "frameH": 128,
  "anchorY": 116,
  "states": {
    "idle":  { "src": "idle.png",  "frames": 4, "fps": 6 },
    "walk":  { "src": "walk.png",  "frames": 6, "fps": 10 },
    "jump":  { "src": "jump.png",  "frames": 2, "fps": 4 },
    "punch": { "src": "punch.png", "frames": 5, "fps": 24, "loop": false },
    "kick":  { "src": "kick.png",  "frames": 5, "fps": 18, "loop": false },
    "block": { "src": "block.png", "frames": 1, "fps": 1 },
    "hurt":  { "src": "hurt.png",  "frames": 2, "fps": 8, "loop": false },
    "ko":    { "src": "ko.png",    "frames": 1, "fps": 1 },
    "skill": { "src": "skill.png", "frames": 6, "fps": 18, "loop": false }
  }
}
```

**Field penting:**
- `frameW`, `frameH`: ukuran satu frame dalam pixel.
- `anchorY`: jarak dari atas frame ke titik kaki. Game akan men-translate `-frameW/2` di X dan `-anchorY` di Y.
- `loop: false`: untuk attack yang main sekali (punch/kick/skill).

**Tip ukuran:**
- Ukuran fighter di game ~92 px tinggi. Sprite 128×128 dengan karakter ~110 px tinggi dan `anchorY: 116` paling pas.
- Boleh lebih besar (256×256 dst.), browser otomatis scale.

## Tiap karakter butuh state mana saja?

**Minimal:** `idle`, `punch`, `kick`, `hurt`. Sisanya akan otomatis pakai vector kalau tidak ada.

**Ideal:** semua 9 state di atas.

**Per karakter, tambahan opsional:**
- Boja (Fireball): `skill.png` menampilkan pose lemparan tangan.
- Kodam (Earth Slam): `skill.png` menampilkan banting tanah dengan dua tangan.
- Natan (Lightning Dash): `skill.png` pose menerjang.
- Botex (Counter): `skill.png` pose kuda-kuda terbuka.
- Rudy (Flurry): `skill.png` rangkaian jab cepat.
- Opal (Sky Bolt): `skill.png` mengangkat tangan ke langit.

## Cara Cepat Dapat Sprite

### Opsi A — AI Image Generation
Pakai layanan seperti **PixelLab AI**, **Scenario.gg**, **Retro Diffusion**, atau **Layer.ai**.

Prompt template untuk tiap karakter (copy-paste, sesuaikan):

**Kodam (Strongman/Tank)**
> Pixel art sprite sheet, side view fighting game character, "Kodam": muscular bald strongman with thick black beard and mustache, brown leather tank top, wide brown pants with golden belt, bare arms, fierce expression, classic Street Fighter II style, transparent background, 128x128 per frame, 4 idle frames showing breathing animation, character facing right, no shadow

**Boja (Karate/Balanced)**
> Pixel art sprite sheet, side view fighting game character, "Boja": athletic karateka with short black spiky hair and red headband, white karate gi with red trim, black belt, fighting stance, Street Fighter II Ryu style, transparent background, 128x128 per frame, 4 idle frames, character facing right

**Natan (Ninja/Speedster)**
> Pixel art sprite sheet, side view fighting game character, "Natan": agile ninja with face mask covering nose and mouth, only eyes visible, dark green hooded outfit with neon green accents, twin shoulder cross-straps, light frame, transparent background, 128x128 per frame, 4 idle frames showing alert breathing pose

**Botex (Karate/Defender)**
> Pixel art sprite sheet, side view fighting game character, "Botex": stoic defender with messy brown hair, dark navy karate gi with cyan accents, cyan wristbands, defensive stance, hands raised, transparent background, 128x128 per frame, 4 idle frames

**Rudy (Boxer/Brawler)**
> Pixel art sprite sheet, side view fighting game character, "Rudy": aggressive boxer with crewcut black hair, red singlet with gold stripe accent, black shorts, big red boxing gloves, classic boxer stance, transparent background, 128x128 per frame, 4 idle frames bouncing on toes

**Opal (Mage/Mystic)**
> Pixel art sprite sheet, side view fighting game character, "Opal": mysterious mage in long dark purple robe with glowing lavender accents, deep hood casting shadow over face, only glowing eyes visible inside hood, ethereal pose, magical aura, transparent background, 128x128 per frame, 4 idle frames with floating cape animation

Lalu untuk action frames tambahkan: `"5 frames showing punch animation: wind-up, mid-strike, peak extension, retract, recovery"`.

### Opsi B — OpenGameArt (Public Domain / CC-BY)
1. Buka https://opengameart.org dan cari "fighting game" atau "side scroller fighter".
2. Pastikan lisensinya CC0, CC-BY, atau OGA-BY (yang membolehkan pakai komersial).
3. Download spritesheet PNG, simpan di `sprites/<karakter>/`.
4. Buat `manifest.json` sesuai dimensi frame asetnya.
5. Catat sumber & lisensi di `sprites/CREDITS.md` agar memenuhi kewajiban atribusi.

**Set yang relevan untuk fighter side-view (cek lisensi di halaman masing-masing):**
- "Fighting Game Asset Pack" — https://opengameart.org/content/fighting-game-asset-pack
- "2D, kung fu master" — https://opengameart.org/content/2d-kung-fu-master
- "Free CC0 Modular Animated Vector Characters 2D" — https://opengameart.org/content/free-cc0-modular-animated-vector-characters-2d

### Opsi C — Itch.io (banyak yang gratis)
Cari di https://itch.io/game-assets/free/tag-fighting

## Testing

1. Drop satu file mis. `sprites/boja/idle.png` (4 frame, 128×128 = 512×128 total).
2. Buat `sprites/boja/manifest.json` dengan satu state `idle`.
3. Refresh game, pilih Boja. Kalau muncul sprite-nya bukan vector → working!
4. Tambahkan state lain bertahap.

## Troubleshooting

- **Sprite tidak muncul:** buka DevTools → Network. Pastikan `manifest.json` 200 OK dan PNG juga 200 OK.
- **Karakter terlihat melayang/tenggelam:** sesuaikan `anchorY`. Naikkan kalau melayang, turunkan kalau tenggelam.
- **Animasi terlalu cepat/lambat:** atur `fps`.
- **Terbalik kiri-kanan:** pastikan sprite asli menghadap kanan. Game pakai `ctx.scale(facing, 1)`.
