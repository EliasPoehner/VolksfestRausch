/**
 * GameScene – stellt den GameState dar und reicht Input weiter.
 *
 * Aufgabenteilung:
 *  - Logik:   GameState.step(dt, command) mit festem Zeitschritt (core/)
 *  - Darstellung: diese Szene liest den Zustand und synchronisiert Sprites
 *  - Effekte: Events aus GameState.events → Sounds, Partikel, Sprechblasen
 *
 * Für eine Three.js-Version wird genau diese Datei (plus HudScene) ersetzt.
 */
import Phaser from 'phaser';
import { DRUNK, FOODS, ROUND } from '../../config/balance';
import {
  BENCHES, BUMPER_ARENA, CAROUSEL, LIGHT_STRINGS, PATHS, TENT, WORLD,
} from '../../config/world';
import { GameState, NO_COMMAND, PLAYER_ID, type GameEvent, type Npc, type Pickup } from '../../core';
import { InputManager } from '../../input/InputManager';
import { KeyboardInput } from '../../input/KeyboardInput';
import { TouchInput, isTouchDevice } from '../../input/TouchInput';
import { audio } from '../../audio/AudioManager';
import { COLORS, DEPTH } from '../view/constants';
import { textStyle } from '../view/ui';
import type { TextureKey } from '../textures';
import type { HudScene } from './HudScene';

/** Darstellung einer Figur (Spieler/NPC): Container mit Schatten + Sprite */
interface FigureView {
  root: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Image;
  carry?: Phaser.GameObjects.Image;
  phase: number;
}

interface Bubble {
  entityId: number;
  root: Phaser.GameObjects.Container;
  ttl: number;
}

const BULB_COLORS = [0xff5a4f, 0xffd23f, 0x6fd3ff, 0x8cff7a, 0xff8ad8, 0xffffff];

export class GameScene extends Phaser.Scene {
  state!: GameState;
  inputs!: InputManager;
  touch: TouchInput | null = null;
  paused = false;

  private acc = 0;
  private time0 = 0;
  private playerView!: FigureView;
  private playerRing!: Phaser.GameObjects.Image;
  private slowIcon!: Phaser.GameObjects.Image;
  private npcViews = new Map<number, FigureView>();
  private pickupViews = new Map<number, Phaser.GameObjects.Image>();
  private carViews = new Map<number, Phaser.GameObjects.Image>();
  private boothViews = new Map<number, { goods: Phaser.GameObjects.Image[]; soldOut: Phaser.GameObjects.Text }>();
  private carousel!: Phaser.GameObjects.Image;
  private carouselCrown!: Phaser.GameObjects.Image;
  private bubbles: Bubble[] = [];
  private focusArrow!: Phaser.GameObjects.Image;
  private focusLabel!: Phaser.GameObjects.Text;
  private prostMark!: Phaser.GameObjects.Text;
  private prostRing!: Phaser.GameObjects.Graphics;
  private night!: Phaser.GameObjects.Rectangle;
  private bulbs: { img: Phaser.GameObjects.Image; phase: number }[] = [];
  private ghostCam!: Phaser.Cameras.Scene2D.Camera;
  private vignette: Phaser.FX.Vignette | null = null;
  private barrel: Phaser.FX.Barrel | null = null;
  private warningTimer = 0;
  private ending = false;
  private foamFx!: Phaser.GameObjects.Particles.ParticleEmitter;
  private burpFx!: Phaser.GameObjects.Particles.ParticleEmitter;
  private confettiFx!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() { super('Game'); }

  create(): void {
    this.state = new GameState();
    this.acc = 0;
    this.time0 = 0;
    this.paused = false;
    this.ending = false;
    this.npcViews.clear(); this.pickupViews.clear(); this.carViews.clear(); this.boothViews.clear();
    this.bubbles = []; this.bulbs = [];

    this.buildGround();
    this.buildStructures();
    this.buildLights();
    this.buildEntities();
    this.buildEffects();
    this.setupCameras();
    this.setupInput();

    this.scene.launch('Hud', { game: this });
    // Nur im Dev-Server: Zugriff für Debugging/Tests über die Browser-Konsole
    if (import.meta.env.DEV) (window as unknown as { __masskrug: GameScene }).__masskrug = this;
    this.cameras.main.fadeIn(300, 0, 0, 0);
    audio.setMusicVolume(this.state.evening.musicVolume, 0);
    audio.startMusic();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.inputs.destroy();
      this.touch = null;
      audio.setMusicWobble(0);
    });
  }

  // =========================================================================
  // Aufbau der Welt
  // =========================================================================

  private buildGround(): void {
    this.add.tileSprite(0, 0, WORLD.width, WORLD.height, 'grass').setOrigin(0).setDepth(DEPTH.ground);
    for (const p of PATHS) {
      this.add.tileSprite(p.x, p.y, p.w, p.h, 'gravel').setOrigin(0).setDepth(DEPTH.path);
    }
    // Zaun rundherum
    const g = this.add.graphics().setDepth(DEPTH.path + 1);
    const b = WORLD.border;
    g.lineStyle(6, 0x8b5a2b, 1).strokeRect(b - 10, b - 10, WORLD.width - 2 * b + 20, WORLD.height - 2 * b + 20);
    g.fillStyle(0x6b4423, 1);
    for (let x = b - 10; x <= WORLD.width - b + 10; x += 40) { g.fillRect(x - 4, b - 14, 8, 8); g.fillRect(x - 4, WORLD.height - b + 6, 8, 8); }
    for (let y = b - 10; y <= WORLD.height - b + 10; y += 40) { g.fillRect(b - 14, y - 4, 8, 8); g.fillRect(WORLD.width - b + 6, y - 4, 8, 8); }
    // Dunkler Rand außerhalb des Zauns
    g.fillStyle(0x2d5a28, 1);
    g.fillRect(0, 0, WORLD.width, b - 14); g.fillRect(0, WORLD.height - b + 14, WORLD.width, b);
    g.fillRect(0, 0, b - 14, WORLD.height); g.fillRect(WORLD.width - b + 14, 0, b, WORLD.height);

    // Bäume am Rand (Deko, keine Kollision)
    const trees: [number, number][] = [
      [90, 90], [260, 70], [760, 80], [1780, 80], [2300, 90], [2520, 160], [80, 820], [70, 1300], [100, 1700],
      [700, 1720], [1800, 1730], [2520, 1700], [2530, 1000], [2500, 760], [850, 300], [1750, 140],
    ];
    for (const [x, y] of trees) this.add.image(x, y, 'tree').setDepth(y + 30).setScale(0.9 + ((x * 7 + y) % 5) * 0.06);
  }

  private buildStructures(): void {
    // Bierzelt
    this.add.image(TENT.x, TENT.y - 40, 'tent').setOrigin(0).setDepth(TENT.y + TENT.h);
    this.add.text(TENT.x + TENT.w / 2, TENT.y + 110, 'FESTZELT', textStyle(64, COLORS.gold, { strokeThickness: 10 }))
      .setOrigin(0.5).setDepth(TENT.y + TENT.h + 1);
    this.add.text(TENT.x + TENT.w / 2, TENT.y + 268, '„Zum Durstigen Hirsch“', textStyle(30, COLORS.cream))
      .setOrigin(0.5).setDepth(TENT.y + TENT.h + 1);
    for (const fx of [TENT.x + 20, TENT.x + TENT.w - 20]) {
      const flag = this.add.image(fx, TENT.y - 50, 'rauten').setDisplaySize(30, 44).setDepth(TENT.y + TENT.h + 2).setOrigin(0, 0.5);
      this.tweens.add({ targets: flag, scaleX: flag.scaleX * 0.8, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }

    // Buden
    const boothNames = { brezn: 'Brezn', hendl: 'Hendl', steckerlfisch: 'Steckerlfisch' } as const;
    this.state.booths.forEach((b) => {
      const top = b.rect.y - 30;
      this.add.image(b.rect.x, top, `booth_${b.kind}` as TextureKey).setOrigin(0).setDepth(b.rect.y + b.rect.h);
      this.add.text(b.rect.x + b.rect.w / 2, top + 22, boothNames[b.kind], textStyle(b.kind === 'steckerlfisch' ? 22 : 28, COLORS.cream))
        .setOrigin(0.5).setDepth(b.rect.y + b.rect.h + 1);
      const goods: Phaser.GameObjects.Image[] = [];
      for (let i = 0; i < 4; i++) {
        goods.push(this.add.image(b.rect.x + 28 + i * 32, top + 98, `food_${b.kind}` as TextureKey).setDepth(b.rect.y + b.rect.h + 1).setScale(0.85));
      }
      const soldOut = this.add.text(b.rect.x + b.rect.w / 2, top + 98, 'Gleich fertig…', textStyle(18)).setOrigin(0.5)
        .setDepth(b.rect.y + b.rect.h + 2).setVisible(false);
      this.boothViews.set(b.id, { goods, soldOut });
    });

    // Bierbänke
    for (const bench of BENCHES) this.add.image(bench.x, bench.y, 'bench').setOrigin(0).setDepth(bench.y + bench.h);

    // Karussell (begehbar → liegt am Boden, dreht sich)
    this.carousel = this.add.image(CAROUSEL.x, CAROUSEL.y, 'carousel').setDepth(DEPTH.decal);
    this.carouselCrown = this.add.image(CAROUSEL.x, CAROUSEL.y, 'carousel_crown').setDepth(CAROUSEL.y + 20);
    this.add.text(CAROUSEL.x, CAROUSEL.y - CAROUSEL.r - 30, 'KARUSSELL', textStyle(30, COLORS.gold)).setOrigin(0.5).setDepth(CAROUSEL.y - CAROUSEL.r);

    // Autoscooter-Fläche
    const a = BUMPER_ARENA;
    const g = this.add.graphics().setDepth(DEPTH.decal);
    g.fillStyle(0x3b3f4a, 1).fillRect(a.x, a.y, a.w, a.h);
    g.lineStyle(1, 0x555b69, 1);
    for (let x = a.x; x <= a.x + a.w; x += 40) g.lineBetween(x, a.y, x, a.y + a.h);
    for (let y = a.y; y <= a.y + a.h; y += 40) g.lineBetween(a.x, y, a.x + a.w, y);
    // Bande in Gelb/Schwarz
    for (let i = 0; i < (2 * (a.w + a.h)) / 20; i++) {
      g.fillStyle(i % 2 ? 0x222222 : 0xffd23f, 1);
      const t = i * 20;
      if (t < a.w) g.fillRect(a.x + t, a.y - 8, 20, 8);
      else if (t < a.w + a.h) g.fillRect(a.x + a.w, a.y + (t - a.w), 8, 20);
      else if (t < 2 * a.w + a.h) g.fillRect(a.x + a.w - (t - a.w - a.h) - 20, a.y + a.h, 20, 8);
      else g.fillRect(a.x - 8, a.y + a.h - (t - 2 * a.w - a.h) - 20, 8, 20);
    }
    this.add.text(a.x + a.w / 2, a.y - 34, 'AUTOSCOOTER', textStyle(30, '#8fd3ff')).setOrigin(0.5).setDepth(a.y);
  }

  private buildLights(): void {
    const wires = this.add.graphics().setDepth(DEPTH.night - 1);
    for (const s of LIGHT_STRINGS) {
      const len = Math.hypot(s.to.x - s.from.x, s.to.y - s.from.y);
      const n = Math.max(2, Math.floor(len / 30));
      const pts: Phaser.Math.Vector2[] = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const sag = Math.sin(Math.PI * t) * 26;
        pts.push(new Phaser.Math.Vector2(s.from.x + (s.to.x - s.from.x) * t, s.from.y + (s.to.y - s.from.y) * t + sag));
      }
      wires.lineStyle(2, 0x2b1d14, 0.8).strokePoints(pts);
      for (let i = 1; i < pts.length - 1; i++) {
        const img = this.add.image(pts[i].x, pts[i].y + 4, 'bulb')
          .setTint(BULB_COLORS[i % BULB_COLORS.length]).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.lights).setScale(1.1);
        this.bulbs.push({ img, phase: Math.random() * Math.PI * 2 });
      }
      for (const p of [s.from, s.to]) this.add.image(p.x, p.y, 'pole').setDepth(DEPTH.night - 1);
    }
    // Birnen am Karussell-Rand
    for (let i = 0; i < 24; i++) {
      const ang = (i / 24) * Math.PI * 2;
      const img = this.add.image(CAROUSEL.x + Math.cos(ang) * (CAROUSEL.r + 4), CAROUSEL.y + Math.sin(ang) * (CAROUSEL.r + 4), 'bulb')
        .setTint(BULB_COLORS[i % 3]).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.lights);
      this.bulbs.push({ img, phase: i * 0.5 });
    }

    // Nacht-Overlay (wird mit der Uhrzeit dunkler). Übergroß wegen Kamera-Rotation.
    const { width, height } = this.scale.gameSize;
    this.night = this.add.rectangle(width / 2, height / 2, width * 2, height * 2, 0x0b1640, 0)
      .setScrollFactor(0).setDepth(DEPTH.night);
  }

  private makeFigure(texture: TextureKey, x: number, y: number): FigureView {
    const shadow = this.add.image(0, 0, 'shadow');
    const body = this.add.image(0, 0, texture).setOrigin(0.5, 0.95);
    const root = this.add.container(x, y, [shadow, body]);
    return { root, body, phase: Math.random() * 10 };
  }

  private buildEntities(): void {
    for (const n of this.state.npcs) this.addNpcView(n);
    for (const c of this.state.bumperCars) {
      this.carViews.set(c.id, this.add.image(c.pos.x, c.pos.y, `bumper_${c.variant % 5}` as TextureKey));
    }
    const p = this.state.player;
    this.playerView = this.makeFigure('player', p.pos.x, p.pos.y);
    this.playerRing = this.add.image(0, 2, 'ring');
    this.playerView.root.addAt(this.playerRing, 0);
    this.slowIcon = this.add.image(0, -78, 'food_hendl').setVisible(false);
    this.playerView.root.add(this.slowIcon);

    this.focusArrow = this.add.image(0, 0, 'arrow').setDepth(DEPTH.ui).setVisible(false);
    this.focusLabel = this.add.text(0, 0, '', textStyle(20)).setOrigin(0.5, 1).setDepth(DEPTH.ui).setVisible(false);
    this.prostMark = this.add.text(0, 0, 'PROST!', textStyle(36, COLORS.gold, { strokeThickness: 7 })).setOrigin(0.5, 1).setDepth(DEPTH.ui).setVisible(false);
    this.prostRing = this.add.graphics().setDepth(DEPTH.ui);
  }

  private addNpcView(n: Npc): void {
    const key: TextureKey = n.role === 'waitress' ? 'waitress' : `visitor_${n.variant}`;
    const v = this.makeFigure(key, n.pos.x, n.pos.y);
    if (n.role === 'waitress') {
      v.carry = this.add.image(16, -48, 'drink_mass').setScale(0.9);
      v.root.add(v.carry);
    }
    this.npcViews.set(n.id, v);
  }

  private buildEffects(): void {
    this.foamFx = this.add.particles(0, 0, 'bubble_foam', {
      speed: { min: 60, max: 160 }, angle: { min: 200, max: 340 }, gravityY: 300,
      lifespan: 700, scale: { start: 1, end: 0.3 }, emitting: false,
    }).setDepth(DEPTH.ui - 2);
    this.burpFx = this.add.particles(0, 0, 'px', {
      speed: { min: 30, max: 110 }, lifespan: 900, scale: { start: 1.6, end: 3.2 }, alpha: { start: 0.55, end: 0 },
      tint: [0xe8ffe0, 0xd0f5c0, 0xffffff], emitting: false,
    }).setDepth(DEPTH.ui - 2);
    this.confettiFx = this.add.particles(0, 0, 'confetti', {
      speed: { min: 150, max: 420 }, angle: { min: 220, max: 320 }, gravityY: 380, lifespan: 2200,
      rotate: { start: 0, end: 900 }, scale: { min: 0.8, max: 1.5 },
      tint: [0xe94b3c, 0xffd23f, 0x2f7fd6, 0x3fa34d, 0xffffff, 0xef6fa0], emitting: false,
    }).setDepth(DEPTH.lights + 1);
  }

  private setupCameras(): void {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD.width, WORLD.height);
    cam.startFollow(this.playerView.root, true, 0.12, 0.12);
    cam.setRoundPixels(false);

    // "Doppeltsehen": zweite, halbtransparente Kamera mit leichtem Versatz
    const { width, height } = this.scale.gameSize;
    this.ghostCam = this.cameras.add(0, 0, width, height, false, 'ghost');
    this.ghostCam.setAlpha(0).setVisible(false);

    // Post-FX nur mit WebGL verfügbar
    if (this.game.renderer.type === Phaser.WEBGL && cam.postFX) {
      this.vignette = cam.postFX.addVignette(0.5, 0.5, 0.95, 0.25);
      this.barrel = cam.postFX.addBarrel(1);
    }
  }

  private setupInput(): void {
    this.inputs = new InputManager().add(new KeyboardInput());
    if (isTouchDevice()) {
      this.touch = new TouchInput(document.getElementById('game') ?? document.body);
      this.inputs.add(this.touch);
    }
    const kb = this.input.keyboard;
    kb?.on('keydown-M', () => audio.toggleMute());
    kb?.on('keydown-ESC', () => this.togglePause());
    kb?.on('keydown-P', () => this.togglePause());
  }

  togglePause(): void {
    if (this.ending) return;
    this.paused = !this.paused;
    this.inputs.clearActions();
    this.events.emit('pause-changed', this.paused);
  }

  // =========================================================================
  // Update-Schleife
  // =========================================================================

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 0.1); // große Sprünge (Tab im Hintergrund) kappen
    if (!this.paused) {
      this.time0 += dt;
      // Fester Logik-Zeitschritt – unabhängig von der Framerate
      this.acc += dt;
      let steps = 0;
      while (this.acc >= ROUND.fixedStep && steps < 8) {
        this.state.step(ROUND.fixedStep, this.ending ? NO_COMMAND : this.inputs.poll());
        this.acc -= ROUND.fixedStep;
        steps++;
      }
      for (const e of this.state.events.drain()) this.onEvent(e);
    }
    this.render(dt);
  }

  // =========================================================================
  // Darstellung
  // =========================================================================

  private render(dt: number): void {
    const s = this.state;
    const t = this.time0;
    const promille = s.meters.promille;

    // --- Spieler ---
    const p = s.player;
    const pv = this.playerView;
    pv.root.setPosition(p.pos.x, p.pos.y).setDepth(p.pos.y);
    const moving = Math.hypot(p.vel.x, p.vel.y) > 10;
    if (!this.ending) {
      pv.body.y = moving ? -Math.abs(Math.sin(t * 12)) * 5 : 0;
      if (Math.abs(p.vel.x) > 5) pv.body.setFlipX(p.vel.x < 0);
      const sway = Math.sin(t * 2.1) * 0.05 * Math.min(promille, 3);
      const wobble = s.isWarning ? Math.sin(t * 32) * 0.14 : 0;
      pv.body.rotation = p.spin + sway + wobble;
      // Grün werden kurz vorm Kotzen (sanfter Verlauf ab 60)
      const k = Phaser.Math.Clamp((s.meters.kotz - 60) / 40, 0, 1);
      if (s.isVomiting) {
        // Kontrollverlust: grün, würgend, zitternd
        pv.body.setTint(0x6fe05a);
        pv.body.rotation = Math.sin(t * 40) * 0.22;
        pv.body.y = Math.abs(Math.sin(t * 20)) * 3;
      } else if (k > 0) {
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.ValueToColor(0xffffff), Phaser.Display.Color.ValueToColor(0x6fe05a), 100, k * 100);
        pv.body.setTint(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
      } else pv.body.clearTint();
      this.slowIcon.setVisible(p.slowTimer > 0).setAngle(Math.sin(t * 10) * 15);
      this.playerRing.setAlpha(0.6 + Math.sin(t * 4) * 0.3);
    }

    // --- NPCs ---
    for (const n of s.npcs) {
      const v = this.npcViews.get(n.id);
      if (!v) continue;
      v.root.setPosition(n.pos.x, n.pos.y).setDepth(n.pos.y);
      v.body.y = n.moving ? -Math.abs(Math.sin(t * 10 + v.phase)) * 4 : 0;
      if (n.moving && Math.abs(Math.cos(n.facing)) > 0.2) v.body.setFlipX(Math.cos(n.facing) < 0);
      v.body.rotation = n.moving ? Math.sin(t * 10 + v.phase) * 0.06 : 0;
      if (v.carry) {
        v.carry.setVisible(!!n.carrying);
        if (n.carrying) v.carry.setTexture(`drink_${n.carrying}` as TextureKey);
        v.carry.y = -48 + v.body.y;
      }
    }

    // --- Pickups (anlegen/entfernen) ---
    const alive = new Set<number>();
    for (const pk of s.pickups) {
      alive.add(pk.id);
      let img = this.pickupViews.get(pk.id);
      if (!img) {
        img = this.add.image(pk.pos.x, pk.pos.y, this.pickupTexture(pk)).setScale(0);
        this.tweens.add({ targets: img, scale: 1, duration: 300, ease: 'Back.out' });
        this.pickupViews.set(pk.id, img);
      }
      const bob = pk.source === 'field' ? Math.sin(t * 3 + pk.id) * 3 : 0;
      img.setPosition(pk.pos.x, pk.pos.y - 8 + bob);
      img.setDepth(pk.source === 'bench' ? pk.pos.y + 30 : pk.pos.y);
      // Blinken kurz bevor ein Wiesen-Pickup verschwindet
      img.setAlpha(pk.source === 'field' && pk.ttl < 4 ? (Math.sin(t * 20) > 0 ? 1 : 0.3) : 1);
    }
    for (const [id, img] of this.pickupViews) {
      if (!alive.has(id)) { img.destroy(); this.pickupViews.delete(id); }
    }

    // --- Buden ---
    for (const b of s.booths) {
      const v = this.boothViews.get(b.id);
      if (!v) continue;
      const ready = b.cooldown <= 0;
      v.goods.forEach((g) => g.setVisible(ready));
      v.soldOut.setVisible(!ready);
    }

    // --- Fahrgeschäfte ---
    this.carousel.rotation = s.carouselAngle;
    this.carouselCrown.rotation = -s.carouselAngle * 0.5;
    for (const c of s.bumperCars) {
      const img = this.carViews.get(c.id);
      if (!img) continue;
      img.setPosition(c.pos.x, c.pos.y).setDepth(c.pos.y);
      const target = Math.atan2(c.vel.y, c.vel.x) + Math.PI / 2;
      img.rotation = Phaser.Math.Angle.RotateTo(img.rotation, target, dt * 6);
    }

    this.renderFocus(t);
    this.renderBubbles(dt);
    this.renderAtmosphere(t, promille);
    this.touch?.setBurpReady(s.burpReady);

    // Warnsound wiederholen, solange es kritisch ist
    if (s.isWarning && !this.ending) {
      this.warningTimer -= dt;
      if (this.warningTimer <= 0) { audio.play('warning'); this.warningTimer = 2.2; }
    }
  }

  private pickupTexture(pk: Pickup): TextureKey {
    return (pk.kind === 'drink' ? `drink_${pk.drink}` : `food_${pk.food}`) as TextureKey;
  }

  private renderFocus(t: number): void {
    const s = this.state;
    const f = s.focus;
    const prostNpc = s.prost.active ? s.findNpc(s.prost.npcId) : undefined;

    this.prostRing.clear();
    if (prostNpc) {
      this.prostMark.setVisible(true).setPosition(prostNpc.pos.x, prostNpc.pos.y - 70 + Math.sin(t * 12) * 4)
        .setScale(1 + Math.sin(t * 10) * 0.08);
      const frac = s.prost.timeLeft / 3;
      this.prostRing.lineStyle(6, 0xffd23f, 1);
      this.prostRing.beginPath();
      this.prostRing.arc(prostNpc.pos.x, prostNpc.pos.y - 24, 34, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
      this.prostRing.strokePath();
    } else this.prostMark.setVisible(false);

    if (f && f.type !== 'prost' && !this.ending) {
      const verb = this.touch ? '🍺' : 'E:';
      this.focusArrow.setVisible(true).setPosition(f.pos.x, f.pos.y - 46 + Math.sin(t * 8) * 4);
      this.focusLabel.setVisible(true).setText(`${verb} ${f.label}`).setPosition(f.pos.x, f.pos.y - 58);
    } else {
      this.focusArrow.setVisible(false);
      this.focusLabel.setVisible(false);
    }
  }

  private renderAtmosphere(t: number, promille: number): void {
    const s = this.state;
    // Dämmerung → Nacht
    const night = Phaser.Math.Clamp((s.hour - 19) / 3.5, 0, 1);
    this.night.setFillStyle(0x0b1640, night * 0.5);
    for (const b of this.bulbs) {
      b.img.setAlpha((0.35 + night * 0.65) * (0.75 + Math.sin(t * 3 + b.phase) * 0.25));
    }

    // Rausch-Kamera: Schwanken, Wackeln, Doppeltsehen
    const cam = this.cameras.main;
    const p = Math.min(promille, 4);
    const { width } = this.scale.gameSize;
    const shake = DRUNK.shakePerPromille * p * width;
    const ox = Math.sin(t * 0.9) * 10 * p + (Math.random() - 0.5) * shake;
    const oy = Math.cos(t * 0.7) * 6 * p + (Math.random() - 0.5) * shake;
    if (!this.ending) cam.setFollowOffset(-ox, -oy);
    const rot = Math.sin(t * 0.6) * 0.012 * p;
    cam.setRotation(rot);

    const ghostAlpha = promille > 0.5 ? Math.min(0.45, (promille - 0.5) * DRUNK.doubleVisionPerPromille) : 0;
    this.ghostCam.setVisible(ghostAlpha > 0.01).setAlpha(ghostAlpha);
    if (ghostAlpha > 0.01) {
      const d = 4 + 8 * p;
      this.ghostCam.setZoom(cam.zoom);
      this.ghostCam.setRotation(rot);
      this.ghostCam.setScroll(cam.scrollX + Math.sin(t * 1.3) * d, cam.scrollY + Math.cos(t * 1.1) * d * 0.6);
    }

    if (this.vignette) this.vignette.strength = 0.25 + Math.min(0.5, p * 0.12) + (s.isWarning ? Math.sin(t * 8) * 0.1 + 0.1 : 0);
    if (this.barrel) this.barrel.amount = 1 + Math.sin(t * 1.4) * 0.025 * Math.max(0, p - 1);
    audio.setMusicWobble(Math.max(0, promille - 1) * 0.03);
  }

  // =========================================================================
  // Sprechblasen
  // =========================================================================

  private showBubble(entityId: number, text: string): void {
    // Pro Figur nur eine Blase
    const old = this.bubbles.find((b) => b.entityId === entityId);
    if (old) { old.root.destroy(); this.bubbles.splice(this.bubbles.indexOf(old), 1); }

    const isPlayer = entityId === PLAYER_ID;
    const label = this.add.text(0, 0, text, textStyle(isPlayer ? 20 : 17, COLORS.ink, { strokeThickness: 0, align: 'center', wordWrap: { width: 220 } })).setOrigin(0.5);
    const w = label.width + 20, h = label.height + 12;
    const g = this.add.graphics();
    g.fillStyle(isPlayer ? 0xfff6c2 : 0xffffff, 1).lineStyle(3, isPlayer ? 0xc9a227 : 0x2b1d14, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 10).strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
    g.fillTriangle(-8, h / 2 - 1, 8, h / 2 - 1, 0, h / 2 + 10);
    g.lineBetween(-8, h / 2, 0, h / 2 + 10); g.lineBetween(8, h / 2, 0, h / 2 + 10);
    const root = this.add.container(0, 0, [g, label]).setDepth(DEPTH.ui - 1).setScale(0);
    this.tweens.add({ targets: root, scale: 1, duration: 200, ease: 'Back.out' });
    this.bubbles.push({ entityId, root, ttl: 2.4 });
    this.positionBubble(this.bubbles[this.bubbles.length - 1]);
  }

  private positionBubble(b: Bubble): boolean {
    const pos = b.entityId === PLAYER_ID ? this.state.player.pos : this.state.findNpc(b.entityId)?.pos;
    if (!pos) return false;
    b.root.setPosition(pos.x, pos.y - 92);
    return true;
  }

  private renderBubbles(dt: number): void {
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.ttl -= dt;
      if (b.ttl <= 0 || !this.positionBubble(b)) {
        b.root.destroy();
        this.bubbles.splice(i, 1);
      } else if (b.ttl < 0.3) b.root.setAlpha(b.ttl / 0.3);
    }
  }

  /** Schwebender Text (z. B. "+0,32 ‰") */
  private floatText(x: number, y: number, text: string, color: string, size = 26): void {
    const tx = this.add.text(x, y, text, textStyle(size, color)).setOrigin(0.5).setDepth(DEPTH.ui);
    this.tweens.add({ targets: tx, y: y - 60, alpha: 0, duration: 1300, ease: 'Cubic.out', onComplete: () => tx.destroy() });
  }

  // =========================================================================
  // Events aus der Logik
  // =========================================================================

  private onEvent(e: GameEvent): void {
    const pp = this.state.player.pos;
    const hud = this.scene.get('Hud') as HudScene | null;
    if (hud && this.scene.isActive('Hud')) hud.handleEvent(e);
    switch (e.type) {
      case 'drink': {
        audio.play('gulp', { rate: Phaser.Math.FloatBetween(0.9, 1.15) });
        if (e.viaProst) audio.play('clink');
        this.foamFx.explode(10, e.pos.x, e.pos.y - 40);
        const gained = `+${e.promille.toFixed(2).replace('.', ',')} ‰`;
        const promille = e.viaProst ? `Prost! ${gained}` : gained;
        this.floatText(e.pos.x, e.pos.y - 70, promille, COLORS.gold);
        break;
      }
      case 'food':
        audio.play(e.food === 'wasser' ? 'gulp' : 'crunch');
        this.floatText(e.pos.x, e.pos.y - 70, `${FOODS[e.food].name}! Magen +${FOODS[e.food].magen}`, COLORS.vomit, 22);
        break;
      case 'burp': {
        audio.play(e.failed ? 'burpFail' : 'burp', { rate: Phaser.Math.FloatBetween(0.85, 1.2) });
        const dir = this.playerView.body.flipX ? -1 : 1;
        this.burpFx.explode(14, e.pos.x + dir * 20, e.pos.y - 40);
        this.cameras.main.shake(200, 0.004);
        this.floatText(e.pos.x, e.pos.y - 100, e.failed ? 'Ups…' : 'BÖÖRP!', e.failed ? COLORS.vomit : '#ffffff', 36);
        break;
      }
      case 'burpCooldown':
        this.floatText(pp.x, pp.y - 100, 'Geht no ned…', '#cfd8e3', 18);
        break;
      case 'speech':
        this.showBubble(e.entityId, e.text);
        break;
      case 'warningStart':
        this.warningTimer = 0;
        break;
      case 'prostStart':
        audio.play('prost');
        break;
      case 'prostEnd':
        if (e.joined) this.confettiFx.explode(30, pp.x, pp.y - 40);
        break;
      case 'carouselEnter':
        audio.play('whoosh');
        break;
      case 'bump':
        audio.play('bump');
        this.cameras.main.shake(180, 0.008);
        break;
      case 'controlsInverted':
        this.floatText(pp.x, pp.y - 110, '?! Links is rechts ?!', '#ff8ad8', 24);
        break;
      case 'confetti':
        this.confettiFx.explode(40, e.pos.x, e.pos.y);
        if (Phaser.Math.Distance.Between(e.pos.x, e.pos.y, pp.x, pp.y) < 700) audio.play('confetti');
        break;
      case 'hour':
        audio.play('clink');
        break;
      case 'phaseChange':
        audio.setMusicVolume(this.state.evening.musicVolume);
        audio.play('prost');
        this.confettiFx.explode(60, pp.x, pp.y - 40);
        break;
      case 'vomitSurvived':
        this.playVomitBurst(e.count, e.max);
        break;
      case 'vomitRecovered':
        this.floatText(pp.x, pp.y - 110, 'Weiter geht\'s!', '#ffffff', 26);
        break;
      case 'vomit':
        this.playVomitSequence();
        break;
      case 'gameEnd':
        if (e.reason === 'zapfenstreich') this.playWinSequence();
        break;
    }
  }

  // =========================================================================
  // End-Sequenzen
  // =========================================================================

  /** Gekotzt, aber überlebt: kurzer Würg-Moment, das Spiel läuft weiter. */
  private playVomitBurst(count: number, max: number): void {
    const p = this.state.player.pos;
    const dir = this.playerView.body.flipX ? -1 : 1;
    audio.play('vomit', { rate: Phaser.Math.FloatBetween(0.95, 1.1) });
    this.cameras.main.shake(350, 0.01);
    const fx = this.add.particles(p.x + dir * 12, p.y - 36, 'drop', {
      speedX: { min: 140 * dir, max: 360 * dir }, speedY: { min: -220, max: -60 }, gravityY: 700,
      lifespan: 900, scale: { start: 1.2, end: 0.6 }, quantity: 4, frequency: 25,
    }).setDepth(p.y + 1);
    this.time.delayedCall(900, () => { fx.stop(); this.time.delayedCall(1000, () => fx.destroy()); });
    const puddle = this.add.image(p.x + dir * 70, p.y + 6, 'puddle').setScale(0).setDepth(DEPTH.decal + 1);
    this.tweens.add({ targets: puddle, scale: 1, duration: 900, ease: 'Sine.out' });
    this.tweens.add({ targets: puddle, alpha: 0, delay: 14000, duration: 4000, onComplete: () => puddle.destroy() });
    this.floatText(p.x, p.y - 120, `Gekotzt! (${count}/${max})`, COLORS.vomit, 34);
  }

  private playVomitSequence(): void {
    this.ending = true;
    const pv = this.playerView;
    const p = this.state.player.pos;
    const dir = pv.body.flipX ? -1 : 1;
    pv.body.setTint(0x6fe05a);
    this.cameras.main.zoomTo(1.35, 1200, 'Sine.easeInOut');
    this.tweens.add({ targets: pv.body, angle: { from: -12, to: 12 }, duration: 70, yoyo: true, repeat: 8 });

    this.time.delayedCall(450, () => {
      audio.play('vomit');
      const fx = this.add.particles(p.x + dir * 12, p.y - 36, 'drop', {
        speedX: { min: 140 * dir, max: 360 * dir }, speedY: { min: -220, max: -60 }, gravityY: 700,
        lifespan: 900, scale: { start: 1.2, end: 0.6 }, quantity: 4, frequency: 25,
      }).setDepth(p.y + 1);
      const puddle = this.add.image(p.x + dir * 70, p.y + 6, 'puddle').setScale(0).setDepth(DEPTH.decal + 1);
      this.tweens.add({ targets: puddle, scale: 1, duration: 1400, ease: 'Sine.out' });
      this.time.delayedCall(1400, () => fx.stop());
    });

    // Sanitäter mit Trage
    this.time.delayedCall(2400, () => {
      audio.play('siren');
      const view = this.cameras.main.worldView;
      const sanka = this.add.image(view.x - 120, p.y - 30, 'sanka').setDepth(p.y + 50);
      const blink = this.time.addEvent({ delay: 150, loop: true, callback: () => sanka.setTint(sanka.tintTopLeft === 0xffffff ? 0xbfdcff : 0xffffff) });
      this.tweens.add({
        targets: sanka, x: p.x - 140, duration: 1500, ease: 'Cubic.out',
        onComplete: () => {
          const stretcher = this.add.image(p.x - 90, p.y + 4, 'stretcher').setDepth(p.y - 1);
          this.tweens.add({ targets: stretcher, x: p.x, duration: 500 });
          this.tweens.add({ targets: pv.body, angle: -90, duration: 400, delay: 450 });
          this.time.delayedCall(1100, () => {
            this.tweens.add({ targets: [stretcher, pv.root], x: sanka.x, alpha: 0, duration: 700 });
            this.time.delayedCall(800, () => {
              this.tweens.add({ targets: sanka, x: view.x + view.width + 200, duration: 1500, ease: 'Cubic.in' });
              this.time.delayedCall(1300, () => { blink.remove(); this.goToGameOver(); });
            });
          });
        },
      });
    });
  }

  private playWinSequence(): void {
    this.ending = true;
    audio.play('win');
    const p = this.state.player.pos;
    for (let i = 0; i < 6; i++) {
      this.time.delayedCall(i * 350, () => {
        this.confettiFx.explode(50, p.x + Phaser.Math.Between(-300, 300), p.y + Phaser.Math.Between(-150, 100));
        audio.play('confetti');
      });
    }
    this.tweens.add({ targets: this.playerView.body, y: -30, duration: 250, yoyo: true, repeat: 5, ease: 'Quad.out' });
    this.showBubble(PLAYER_ID, 'Schee war\'s!');
    this.time.delayedCall(3500, () => this.goToGameOver());
  }

  private goToGameOver(): void {
    const result = this.state.result;
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.stop('Hud');
      this.scene.start('GameOver', { result });
    });
  }
}
