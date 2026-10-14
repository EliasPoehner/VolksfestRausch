/**
 * Prozedurale Platzhalter-Grafiken im Cartoon-Look (dicke dunkle Outlines,
 * kräftige Farben). Gezeichnet mit der Canvas-2D-API und als Phaser-Textur
 * registriert.
 *
 * Jede Grafik hat einen festen Schlüssel (TextureKey). Wird in
 * assetManifest.ts eine PNG-Datei für einen Schlüssel eingetragen, wird die
 * prozedurale Variante übersprungen – so lassen sich Grafiken einzeln
 * austauschen, ohne Spielcode anzufassen.
 */
import Phaser from 'phaser';

const OUTLINE = '#2b1d14';

export const PERSON_VARIANTS = 8;

export type TextureKey =
  | 'grass' | 'gravel' | 'shadow' | 'ring'
  | 'player'
  | `visitor_${number}` | 'waitress'
  | 'drink_mass' | 'drink_radler' | 'drink_weissbier' | 'drink_obstler' | 'drink_sekt' | 'drink_jaeger'
  | 'food_brezn' | 'food_hendl' | 'food_steckerlfisch' | 'food_wasser'
  | 'tent' | 'booth_brezn' | 'booth_hendl' | 'booth_steckerlfisch' | 'bench'
  | 'carousel' | 'carousel_crown' | `bumper_${number}` | 'tree' | 'pole'
  | 'bulb' | 'px' | 'confetti' | 'drop' | 'puddle' | 'arrow' | 'sanka' | 'stretcher'
  | 'bubble_foam' | 'rauten';

type Ctx = CanvasRenderingContext2D;

/** Erzeugt eine Canvas-Textur, sofern der Key noch nicht existiert. */
function make(scene: Phaser.Scene, key: TextureKey, w: number, h: number, draw: (ctx: Ctx) => void): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return;
  const ctx = tex.getContext();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  draw(ctx);
  tex.refresh();
}

// --- kleine Zeichen-Helfer ---------------------------------------------------

function fillStroke(ctx: Ctx, fill: string, lw = 2.5, stroke = OUTLINE): void {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

function rrect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Pseudozufall für reproduzierbare Texturen */
function seeded(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

// --- Personen ---------------------------------------------------------------

interface PersonStyle {
  female: boolean;
  skin: string;
  shirt: string;
  pants: string;
  hair: string;
  hat: string | null;
  apron?: string;
  checkered?: boolean;
  bigFeather?: boolean;
}

const SKINS = ['#f6c7a0', '#e8b18b', '#c98e65', '#f9d6b8'];
const SHIRTS = ['#d9473b', '#3b7dd8', '#3fa34d', '#f0f0f0', '#e08a2e', '#8a4fc4', '#ef6fa0', '#2fb5b5'];
const HAIRS = ['#f1d27a', '#6b3e1e', '#2a1b12', '#c4552b', '#bdbdbd'];

/** Chibi-Figur in 3/4-Ansicht von vorne, 44×60 px */
function drawPerson(ctx: Ctx, s: PersonStyle): void {
  // Beine
  ctx.fillStyle = s.female ? s.skin : '#e8e2d0'; // Wadlstrümpfe
  rrect(ctx, 14, 44, 6, 11, 2); fillStroke(ctx, ctx.fillStyle as string, 2);
  rrect(ctx, 24, 44, 6, 11, 2); fillStroke(ctx, s.female ? s.skin : '#e8e2d0', 2);
  // Schuhe
  ellipse(ctx, 16.5, 56, 5, 3); fillStroke(ctx, '#3a2516', 2);
  ellipse(ctx, 27.5, 56, 5, 3); fillStroke(ctx, '#3a2516', 2);

  if (s.female) {
    // Dirndl-Rock
    ctx.beginPath();
    ctx.moveTo(12, 30); ctx.lineTo(32, 30); ctx.lineTo(37, 48); ctx.lineTo(7, 48); ctx.closePath();
    fillStroke(ctx, s.pants);
    // Schürze
    ctx.beginPath();
    ctx.moveTo(16, 31); ctx.lineTo(28, 31); ctx.lineTo(30, 46); ctx.lineTo(14, 46); ctx.closePath();
    fillStroke(ctx, s.apron ?? '#f4f4f4', 2);
    // Mieder
    rrect(ctx, 12, 20, 20, 13, 4); fillStroke(ctx, s.shirt);
    // Bluse (Ausschnitt)
    ellipse(ctx, 22, 21, 7, 3.5); fillStroke(ctx, '#ffffff', 1.5);
    // Schleife
    ellipse(ctx, 29, 31, 2.5, 2); fillStroke(ctx, '#c22', 1.2);
  } else {
    // Lederhose
    ctx.beginPath();
    ctx.moveTo(12, 32); ctx.lineTo(32, 32); ctx.lineTo(31, 46); ctx.lineTo(23, 46); ctx.lineTo(22, 40); ctx.lineTo(21, 46); ctx.lineTo(13, 46); ctx.closePath();
    fillStroke(ctx, s.pants);
    // Hemd
    rrect(ctx, 11, 19, 22, 15, 5); fillStroke(ctx, s.shirt);
    if (s.checkered) {
      ctx.save();
      rrect(ctx, 11, 19, 22, 15, 5); ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      for (let x = 11; x < 34; x += 6) ctx.fillRect(x, 19, 3, 15);
      for (let y = 19; y < 34; y += 6) ctx.fillRect(11, y, 22, 3);
      ctx.restore();
      rrect(ctx, 11, 19, 22, 15, 5); ctx.lineWidth = 2.5; ctx.strokeStyle = OUTLINE; ctx.stroke();
    }
    // Hosenträger
    ctx.strokeStyle = s.pants; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(16, 20); ctx.lineTo(17, 33); ctx.moveTo(28, 20); ctx.lineTo(27, 33); ctx.stroke();
    ctx.fillStyle = '#7a5230'; ctx.fillRect(16, 25, 12, 3);
  }
  // Arme
  ellipse(ctx, 9, 30, 4, 5); fillStroke(ctx, s.skin, 2);
  ellipse(ctx, 35, 30, 4, 5); fillStroke(ctx, s.skin, 2);

  // Kopf
  if (s.female) {
    // Zöpfe
    ellipse(ctx, 11, 20, 3.5, 6); fillStroke(ctx, s.hair, 2);
    ellipse(ctx, 33, 20, 3.5, 6); fillStroke(ctx, s.hair, 2);
  }
  ellipse(ctx, 22, 13, 11, 10.5); fillStroke(ctx, s.skin);
  // Haare
  ctx.save();
  ellipse(ctx, 22, 13, 11, 10.5); ctx.clip();
  ctx.fillStyle = s.hair;
  ctx.beginPath(); ctx.ellipse(22, 4, 13, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // Gesicht
  ctx.fillStyle = OUTLINE;
  ellipse(ctx, 18, 14, 1.4, 1.8); ctx.fill();
  ellipse(ctx, 26, 14, 1.4, 1.8); ctx.fill();
  ctx.fillStyle = 'rgba(230,80,80,0.45)';
  ellipse(ctx, 15, 17.5, 2.4, 1.5); ctx.fill();
  ellipse(ctx, 29, 17.5, 2.4, 1.5); ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(22, 17, 3, 0.2, Math.PI - 0.2); ctx.stroke();

  if (s.hat) {
    // Tirolerhut
    ellipse(ctx, 22, 5, 13, 3.5); fillStroke(ctx, s.hat, 2);
    ctx.beginPath();
    ctx.moveTo(14, 5); ctx.quadraticCurveTo(15, -3, 22, -2); ctx.quadraticCurveTo(29, -3, 30, 5); ctx.closePath();
    // (Hut ragt minimal über den oberen Rand → leicht nach unten versetzt zeichnen)
    fillStroke(ctx, s.hat, 2);
    ctx.fillStyle = '#c0392b'; ctx.fillRect(15, 2.5, 14, 2);
    // Feder / Gamsbart
    ctx.strokeStyle = s.bigFeather ? '#ffffff' : '#5a4a3a';
    ctx.lineWidth = s.bigFeather ? 3 : 2;
    ctx.beginPath(); ctx.moveTo(28, 2); ctx.quadraticCurveTo(36, -2, 38, s.bigFeather ? -1 : 3); ctx.stroke();
  } else if (s.female) {
    // Blume im Haar
    ctx.fillStyle = '#ff6fa8';
    for (let i = 0; i < 5; i++) { ellipse(ctx, 31 + Math.cos(i * 1.26) * 2.2, 5 + Math.sin(i * 1.26) * 2.2, 1.8, 1.8); ctx.fill(); }
    ctx.fillStyle = '#ffe14d'; ellipse(ctx, 31, 5, 1.3, 1.3); ctx.fill();
  }
}

/** Person in eine 44×62-Textur zeichnen (2 px Luft oben für den Hut) */
function makePerson(scene: Phaser.Scene, key: TextureKey, s: PersonStyle): void {
  make(scene, key, 44, 62, (ctx) => { ctx.translate(0, 3); drawPerson(ctx, s); });
}

// --- Getränke & Essen (36×36) ----------------------------------------------------------

function drawMug(ctx: Ctx, beer: string): void {
  // Henkel
  ctx.beginPath(); ctx.arc(27, 19, 6, -Math.PI / 2, Math.PI / 2);
  ctx.lineWidth = 6; ctx.strokeStyle = OUTLINE; ctx.stroke();
  ctx.lineWidth = 3; ctx.strokeStyle = '#dfeff5'; ctx.stroke();
  // Glas
  rrect(ctx, 8, 9, 19, 23, 3); fillStroke(ctx, beer);
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(11, 13, 3, 16);
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(20, 13, 4, 16);
  // Schaum
  ctx.beginPath();
  ctx.arc(11, 9, 4.5, 0, Math.PI * 2); ctx.arc(17.5, 7, 5, 0, Math.PI * 2); ctx.arc(23.5, 9, 4.5, 0, Math.PI * 2);
  fillStroke(ctx, '#fffaf0', 2);
}

function drawTextures(scene: Phaser.Scene): void {
  // ---- Boden ----
  make(scene, 'grass', 64, 64, (ctx) => {
    ctx.fillStyle = '#5fae4b'; ctx.fillRect(0, 0, 64, 64);
    const r = seeded(7);
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = r() > 0.5 ? '#6cbf55' : '#539c41';
      const x = r() * 64, y = r() * 64;
      ctx.fillRect(x, y, 2, 4);
    }
    for (let i = 0; i < 3; i++) { ctx.fillStyle = r() > 0.5 ? '#fff6a8' : '#ffffff'; ctx.fillRect(r() * 62, r() * 62, 2, 2); }
  });
  make(scene, 'gravel', 64, 64, (ctx) => {
    ctx.fillStyle = '#d8c39a'; ctx.fillRect(0, 0, 64, 64);
    const r = seeded(11);
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = ['#c9b285', '#e6d5b0', '#b9a27a'][Math.floor(r() * 3)];
      ellipse(ctx, r() * 64, r() * 64, 1 + r() * 2, 1 + r() * 1.5); ctx.fill();
    }
  });
  make(scene, 'rauten', 40, 40, (ctx) => {
    // Bayerische Rauten (weiß-blau), kachelbar
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 40, 40);
    ctx.fillStyle = '#2f7fd6';
    ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(40, 20); ctx.lineTo(20, 40); ctx.lineTo(0, 20); ctx.closePath(); ctx.fill();
  });

  make(scene, 'shadow', 40, 14, (ctx) => {
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; ellipse(ctx, 20, 7, 18, 6); ctx.fill();
  });
  make(scene, 'ring', 56, 22, (ctx) => {
    ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 3; ellipse(ctx, 28, 11, 24, 8); ctx.stroke();
  });

  // ---- Personen ----
  makePerson(scene, 'player', {
    female: false, skin: SKINS[0], shirt: '#d9473b', pants: '#6b4423', hair: HAIRS[1],
    hat: '#2e6b3a', checkered: true, bigFeather: true,
  });
  for (let i = 0; i < PERSON_VARIANTS; i++) {
    const female = i % 2 === 1;
    makePerson(scene, `visitor_${i}`, {
      female, skin: SKINS[i % SKINS.length], shirt: SHIRTS[(i * 3) % SHIRTS.length],
      pants: female ? SHIRTS[(i * 5 + 2) % SHIRTS.length] : ['#6b4423', '#4e3220', '#80562f'][i % 3],
      hair: HAIRS[(i * 2) % HAIRS.length], hat: !female && i % 4 === 0 ? '#3d5c3a' : null,
      checkered: !female && i % 3 === 0,
    });
  }
  makePerson(scene, 'waitress', {
    female: true, skin: SKINS[3], shirt: '#1f3d7a', pants: '#2f7fd6', hair: HAIRS[0], hat: null, apron: '#ffffff',
  });

  // ---- Getränke ----
  make(scene, 'drink_mass', 36, 36, (ctx) => drawMug(ctx, '#f2b400'));
  make(scene, 'drink_radler', 36, 36, (ctx) => drawMug(ctx, '#f7e27a'));
  make(scene, 'drink_weissbier', 36, 36, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(12, 33); ctx.lineTo(24, 33); ctx.lineTo(23, 24); ctx.quadraticCurveTo(28, 12, 25, 6); ctx.lineTo(11, 6); ctx.quadraticCurveTo(8, 12, 13, 24); ctx.closePath();
    fillStroke(ctx, '#e59a2a');
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(13, 10, 2, 18);
    ctx.beginPath(); ctx.arc(14, 6, 4, 0, Math.PI * 2); ctx.arc(19, 4, 4.5, 0, Math.PI * 2); ctx.arc(23, 6, 4, 0, Math.PI * 2);
    fillStroke(ctx, '#fffaf0', 2);
  });
  make(scene, 'drink_obstler', 36, 36, (ctx) => {
    ctx.beginPath(); ctx.moveTo(11, 14); ctx.lineTo(25, 14); ctx.lineTo(23, 31); ctx.lineTo(13, 31); ctx.closePath();
    fillStroke(ctx, '#e6f6ff');
    ctx.fillStyle = 'rgba(190,230,255,0.9)'; ctx.fillRect(13.5, 19, 9, 10);
    // Birne als Deko
    ctx.fillStyle = '#9ccc3c'; ellipse(ctx, 27, 10, 4, 5); ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.stroke();
  });
  make(scene, 'drink_sekt', 36, 36, (ctx) => {
    ctx.beginPath(); ctx.moveTo(12, 4); ctx.lineTo(24, 4); ctx.lineTo(21, 20); ctx.lineTo(15, 20); ctx.closePath();
    fillStroke(ctx, '#fff1b8');
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(18, 20); ctx.lineTo(18, 30); ctx.moveTo(12, 31); ctx.lineTo(24, 31); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    for (const [x, y] of [[16, 9], [19, 13], [17, 16], [20, 8]]) { ellipse(ctx, x, y, 1.2, 1.2); ctx.fill(); }
  });
  make(scene, 'drink_jaeger', 36, 36, (ctx) => {
    rrect(ctx, 11, 12, 14, 21, 3); fillStroke(ctx, '#1f4a2a');
    rrect(ctx, 15, 4, 6, 9, 1); fillStroke(ctx, '#1f4a2a', 2);
    rrect(ctx, 12.5, 17, 11, 9, 1); fillStroke(ctx, '#e8892b', 1.5);
    ctx.fillStyle = OUTLINE; ellipse(ctx, 18, 21.5, 2.2, 2.2); ctx.fill();
  });

  // ---- Essen ----
  make(scene, 'food_brezn', 36, 36, (ctx) => {
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 8;
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(10, 30); ctx.quadraticCurveTo(2, 8, 18, 9); ctx.quadraticCurveTo(34, 8, 26, 30);
      ctx.moveTo(10, 30); ctx.lineTo(24, 17); ctx.moveTo(26, 30); ctx.lineTo(12, 17);
    };
    path(); ctx.stroke();
    ctx.strokeStyle = '#a0522d'; ctx.lineWidth = 5; path(); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    for (const [x, y] of [[9, 15], [18, 10], [27, 15], [16, 21], [21, 23]]) ctx.fillRect(x, y, 1.6, 1.6);
  });
  make(scene, 'food_hendl', 36, 36, (ctx) => {
    ellipse(ctx, 16, 20, 11, 9); fillStroke(ctx, '#d98c3a');
    ctx.beginPath(); ctx.moveTo(24, 16); ctx.lineTo(31, 9); ctx.lineWidth = 6; ctx.strokeStyle = OUTLINE; ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = '#f5ead6'; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ellipse(ctx, 13, 17, 4, 2.5); ctx.fill();
    ctx.fillStyle = '#9b5a22'; ellipse(ctx, 18, 24, 3, 1.5); ctx.fill();
  });
  make(scene, 'food_steckerlfisch', 36, 36, (ctx) => {
    ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(18, 34); ctx.lineTo(18, 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(18, 16, 6.5, 12, 0, 0, Math.PI * 2); fillStroke(ctx, '#8fa3ad');
    ctx.beginPath(); ctx.moveTo(18, 27); ctx.lineTo(12, 33); ctx.lineTo(24, 33); ctx.closePath(); fillStroke(ctx, '#7b8f99', 2);
    ctx.fillStyle = '#5e4a32'; for (let y = 10; y < 24; y += 4) ctx.fillRect(14, y, 8, 1.5);
    ctx.fillStyle = OUTLINE; ellipse(ctx, 18, 8, 1.5, 1.5); ctx.fill();
  });
  make(scene, 'food_wasser', 36, 36, (ctx) => {
    rrect(ctx, 12, 10, 12, 23, 4); fillStroke(ctx, '#6ec6ff');
    rrect(ctx, 15, 4, 6, 7, 1); fillStroke(ctx, '#2f7fd6', 2);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(12.5, 17, 11, 6);
    ctx.fillStyle = '#2f7fd6'; ctx.fillRect(15, 19, 6, 2);
  });

  // ---- Bierzelt (600×420: Dach 600×380 + Front 40) ----
  make(scene, 'tent', 600, 420, (ctx) => {
    // Dach mit Rauten
    ctx.save();
    rrect(ctx, 4, 4, 592, 372, 14); ctx.clip();
    for (let y = -20; y < 400; y += 40) for (let x = -20; x < 620; x += 40) {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, 40, 40);
      ctx.fillStyle = '#2f7fd6';
      ctx.beginPath(); ctx.moveTo(x + 20, y); ctx.lineTo(x + 40, y + 20); ctx.lineTo(x + 20, y + 40); ctx.lineTo(x, y + 20); ctx.closePath(); ctx.fill();
    }
    // Firstschatten
    const g = ctx.createLinearGradient(0, 0, 0, 380);
    g.addColorStop(0, 'rgba(0,0,0,0.18)'); g.addColorStop(0.5, 'rgba(255,255,255,0.15)'); g.addColorStop(0.51, 'rgba(0,0,0,0.1)'); g.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 600, 380);
    ctx.restore();
    rrect(ctx, 4, 4, 592, 372, 14); ctx.lineWidth = 6; ctx.strokeStyle = OUTLINE; ctx.stroke();
    // First
    ctx.strokeStyle = '#1b4f8f'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(20, 190); ctx.lineTo(580, 190); ctx.stroke();
    // Front (Holzfassade)
    rrect(ctx, 20, 366, 560, 50, 6); fillStroke(ctx, '#a8713f', 4);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;
    for (let x = 40; x < 580; x += 22) { ctx.beginPath(); ctx.moveTo(x, 370); ctx.lineTo(x, 412); ctx.stroke(); }
    // Eingang
    rrect(ctx, 255, 372, 90, 46, 10); fillStroke(ctx, '#3a2516', 3);
    ctx.fillStyle = 'rgba(255,200,90,0.55)'; rrect(ctx, 262, 380, 76, 38, 8); ctx.fill();
    // Girlande
    ctx.strokeStyle = '#2e8b3a'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(250, 374); ctx.quadraticCurveTo(300, 394, 350, 374); ctx.stroke();
  });

  // ---- Buden (150×120: Markise + Theke) ----
  const booth = (key: TextureKey, stripe: string) => make(scene, key, 150, 120, (ctx) => {
    // Rückwand
    rrect(ctx, 6, 30, 138, 60, 6); fillStroke(ctx, '#b07a45', 3);
    // Markise
    ctx.save(); rrect(ctx, 2, 2, 146, 52, 8); ctx.clip();
    for (let x = 0; x < 150; x += 18) { ctx.fillStyle = (x / 18) % 2 === 0 ? stripe : '#ffffff'; ctx.fillRect(x, 0, 18, 54); }
    ctx.restore();
    rrect(ctx, 2, 2, 146, 52, 8); ctx.lineWidth = 3; ctx.strokeStyle = OUTLINE; ctx.stroke();
    // Wellenkante
    ctx.fillStyle = stripe;
    for (let x = 4; x < 146; x += 18) { ctx.beginPath(); ctx.arc(x + 9, 54, 9, 0, Math.PI); ctx.fill(); ctx.stroke(); }
    // Theke
    rrect(ctx, 0, 84, 150, 34, 6); fillStroke(ctx, '#8b5a2b', 3);
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(4, 88, 142, 6);
  });
  booth('booth_brezn', '#2f7fd6');
  booth('booth_hendl', '#d9473b');
  booth('booth_steckerlfisch', '#2e8b3a');

  // ---- Bierbank-Garnitur (220×46) ----
  make(scene, 'bench', 220, 46, (ctx) => {
    rrect(ctx, 4, 1, 212, 9, 3); fillStroke(ctx, '#9b6a3a', 2);
    rrect(ctx, 4, 36, 212, 9, 3); fillStroke(ctx, '#9b6a3a', 2);
    rrect(ctx, 0, 12, 220, 22, 3); fillStroke(ctx, '#c99a62', 2.5);
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(4, 23); ctx.lineTo(216, 23); ctx.stroke();
  });

  // ---- Karussell (360×360) ----
  make(scene, 'carousel', 360, 360, (ctx) => {
    const c = 180, R = 175;
    for (let i = 0; i < 16; i++) {
      ctx.beginPath(); ctx.moveTo(c, c); ctx.arc(c, c, R, (i / 16) * Math.PI * 2, ((i + 1) / 16) * Math.PI * 2); ctx.closePath();
      ctx.fillStyle = i % 2 === 0 ? '#e94b3c' : '#ffd23f'; ctx.fill();
    }
    ctx.beginPath(); ctx.arc(c, c, R, 0, Math.PI * 2); ctx.lineWidth = 6; ctx.strokeStyle = OUTLINE; ctx.stroke();
    ctx.beginPath(); ctx.arc(c, c, R - 12, 0, Math.PI * 2); ctx.lineWidth = 3; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    // Rösser
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const x = c + Math.cos(a) * 118, y = c + Math.sin(a) * 118;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2);
      ellipse(ctx, 0, 0, 10, 17); fillStroke(ctx, i % 2 ? '#ffffff' : '#8fd3ff', 2.5);
      ellipse(ctx, 0, -17, 6, 8); fillStroke(ctx, i % 2 ? '#ffffff' : '#8fd3ff', 2.5);
      ctx.fillStyle = '#c0392b'; ctx.fillRect(-6, -3, 12, 6);
      ctx.restore();
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fillStyle = '#c9a227'; ctx.fill();
    }
  });
  make(scene, 'carousel_crown', 90, 90, (ctx) => {
    for (let i = 0; i < 10; i++) {
      ctx.beginPath(); ctx.moveTo(45, 45); ctx.arc(45, 45, 40, (i / 10) * Math.PI * 2, ((i + 1) / 10) * Math.PI * 2); ctx.closePath();
      ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#e94b3c'; ctx.fill();
    }
    ctx.beginPath(); ctx.arc(45, 45, 40, 0, Math.PI * 2); ctx.lineWidth = 4; ctx.strokeStyle = OUTLINE; ctx.stroke();
    ctx.beginPath(); ctx.arc(45, 45, 9, 0, Math.PI * 2); fillStroke(ctx, '#ffd23f', 3);
  });

  // ---- Autoscooter (52×52) ----
  const carColors = ['#e94b3c', '#2f7fd6', '#3fa34d', '#ffd23f', '#a259d9'];
  carColors.forEach((col, i) => make(scene, `bumper_${i}`, 52, 52, (ctx) => {
    rrect(ctx, 3, 6, 46, 40, 16); fillStroke(ctx, '#333333', 3);
    rrect(ctx, 8, 10, 36, 32, 12); fillStroke(ctx, col, 2.5);
    rrect(ctx, 16, 16, 20, 16, 6); fillStroke(ctx, '#222222', 2);
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ellipse(ctx, 16, 14, 6, 2.5); ctx.fill();
    ctx.beginPath(); ctx.arc(36, 36, 3, 0, Math.PI * 2); fillStroke(ctx, '#ffd23f', 1.5);
  }));

  // ---- Deko ----
  make(scene, 'tree', 96, 96, (ctx) => {
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ellipse(ctx, 52, 56, 40, 34); ctx.fill();
    ctx.beginPath();
    ctx.arc(48, 48, 34, 0, Math.PI * 2);
    fillStroke(ctx, '#3d8b3a', 3);
    ctx.fillStyle = '#4ea84a';
    for (const [x, y, r] of [[38, 36, 14], [58, 40, 12], [46, 58, 12], [62, 58, 9]]) { ellipse(ctx, x, y, r, r); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ellipse(ctx, 36, 32, 8, 6); ctx.fill();
  });
  make(scene, 'pole', 16, 16, (ctx) => {
    ctx.beginPath(); ctx.arc(8, 8, 5, 0, Math.PI * 2); fillStroke(ctx, '#6b4423', 2);
  });
  make(scene, 'bulb', 24, 24, (ctx) => {
    const g = ctx.createRadialGradient(12, 12, 0, 12, 12, 12);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,0.85)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 24, 24);
  });
  make(scene, 'px', 10, 10, (ctx) => { ctx.fillStyle = '#ffffff'; ellipse(ctx, 5, 5, 5, 5); ctx.fill(); });
  make(scene, 'confetti', 6, 10, (ctx) => { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 6, 10); });
  make(scene, 'drop', 16, 16, (ctx) => {
    ellipse(ctx, 8, 8, 6.5, 6.5); fillStroke(ctx, '#7ed957', 2, '#2f6b1f');
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ellipse(ctx, 6, 6, 2, 1.5); ctx.fill();
  });
  make(scene, 'puddle', 110, 64, (ctx) => {
    ctx.beginPath();
    const r = seeded(5);
    for (let i = 0; i <= 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const rr = 0.75 + r() * 0.25;
      const x = 55 + Math.cos(a) * 50 * rr, y = 32 + Math.sin(a) * 26 * rr;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    fillStroke(ctx, '#8be05e', 3, '#2f6b1f');
    ctx.fillStyle = '#b6f08f';
    for (let i = 0; i < 6; i++) { ellipse(ctx, 25 + r() * 60, 18 + r() * 28, 3 + r() * 4, 2 + r() * 2); ctx.fill(); }
  });
  make(scene, 'arrow', 24, 18, (ctx) => {
    ctx.beginPath(); ctx.moveTo(2, 2); ctx.lineTo(22, 2); ctx.lineTo(12, 16); ctx.closePath();
    fillStroke(ctx, '#ffe14d', 2.5);
  });
  make(scene, 'bubble_foam', 12, 12, (ctx) => { ellipse(ctx, 6, 6, 5, 5); fillStroke(ctx, '#fffaf0', 1.5, '#c9a227'); });

  // ---- Sanka & Trage ----
  make(scene, 'sanka', 150, 74, (ctx) => {
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; rrect(ctx, 8, 14, 140, 58, 12); ctx.fill();
    rrect(ctx, 4, 6, 140, 60, 12); fillStroke(ctx, '#ffffff', 4);
    ctx.fillStyle = '#e53935'; ctx.fillRect(6, 30, 136, 12);
    // Windschutzscheibe (vorne = rechts)
    rrect(ctx, 108, 12, 26, 48, 6); fillStroke(ctx, '#9fd3ff', 3);
    // Blaulicht
    rrect(ctx, 70, 2, 26, 10, 4); fillStroke(ctx, '#2f7fd6', 2.5);
    rrect(ctx, 70, 60, 26, 10, 4); fillStroke(ctx, '#2f7fd6', 2.5);
    // Kreuz
    ctx.fillStyle = '#e53935'; ctx.fillRect(34, 16, 8, 24); ctx.fillRect(26, 24, 24, 8);
    ctx.fillStyle = '#1b1b1b'; ctx.font = 'bold 13px sans-serif'; ctx.fillText('SANKA', 52, 54);
  });
  make(scene, 'stretcher', 76, 28, (ctx) => {
    rrect(ctx, 2, 4, 72, 20, 4); fillStroke(ctx, '#e8e8e8', 3);
    ctx.fillStyle = '#e53935'; ctx.fillRect(6, 12, 64, 4);
  });
}

/** Erzeugt alle fehlenden Texturen. Aufruf in BootScene.create(). */
export function generateTextures(scene: Phaser.Scene): void {
  drawTextures(scene);
}
