/**
 * Wiederverwendbare UI-Bausteine für die Phaser-Szenen (Buttons, Textstile).
 */
import Phaser from 'phaser';
import { UI_FONT_STACK } from '../assetManifest';
import { COLORS } from './constants';
import { audio } from '../../audio/AudioManager';

export function textStyle(size: number, color = COLORS.cream, extra: Phaser.Types.GameObjects.Text.TextStyle = {}): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: UI_FONT_STACK,
    fontSize: `${size}px`,
    color,
    stroke: COLORS.ink,
    strokeThickness: Math.max(3, Math.round(size / 7)),
    ...extra,
  };
}

/** Cartoon-Button mit Hover-/Klick-Effekt. */
export function makeButton(
  scene: Phaser.Scene, x: number, y: number, label: string, onClick: () => void,
  opts: { width?: number; height?: number; fill?: number; size?: number } = {},
): Phaser.GameObjects.Container {
  const w = opts.width ?? 280, h = opts.height ?? 72, fill = opts.fill ?? 0xffd23f;
  const g = scene.add.graphics();
  const draw = (pressed: boolean, hover: boolean) => {
    g.clear();
    g.fillStyle(0x000000, 0.35); g.fillRoundedRect(-w / 2, -h / 2 + 6, w, h, 18);
    g.fillStyle(hover ? Phaser.Display.Color.ValueToColor(fill).lighten(12).color : fill, 1);
    g.fillRoundedRect(-w / 2, -h / 2 + (pressed ? 4 : 0), w, h, 18);
    g.lineStyle(4, 0x2b1d14, 1); g.strokeRoundedRect(-w / 2, -h / 2 + (pressed ? 4 : 0), w, h, 18);
  };
  draw(false, false);
  const text = scene.add.text(0, 0, label, textStyle(opts.size ?? 34, COLORS.ink, { strokeThickness: 0 })).setOrigin(0.5);
  const c = scene.add.container(x, y, [g, text]);
  c.setSize(w, h).setInteractive({ useHandCursor: true });
  c.on('pointerover', () => draw(false, true));
  c.on('pointerout', () => { draw(false, false); text.y = 0; });
  c.on('pointerdown', () => { draw(true, true); text.y = 4; });
  c.on('pointerup', () => {
    draw(false, true); text.y = 0;
    audio.play('click');
    onClick();
  });
  return c;
}

/** Hintergrund mit bayerischen Rauten und leichtem Abdunkeln */
export function rautenBackground(scene: Phaser.Scene, alpha = 0.35): void {
  const { width, height } = scene.scale.gameSize;
  scene.add.tileSprite(0, 0, width, height, 'rauten').setOrigin(0).setAlpha(alpha);
  scene.add.rectangle(0, 0, width, height, 0x12233d, 0.55).setOrigin(0);
}

/** Konfetti-Regen über den ganzen Bildschirm (für Menü/Siegerscreen) */
export function confettiRain(scene: Phaser.Scene, depth = 0): Phaser.GameObjects.Particles.ParticleEmitter {
  const { width } = scene.scale.gameSize;
  return scene.add.particles(0, -20, 'confetti', {
    x: { min: 0, max: width },
    lifespan: 5000,
    speedY: { min: 80, max: 180 },
    speedX: { min: -40, max: 40 },
    rotate: { start: 0, end: 720 },
    scale: { min: 0.8, max: 1.4 },
    tint: [0xe94b3c, 0xffd23f, 0x2f7fd6, 0x3fa34d, 0xffffff, 0xef6fa0],
    frequency: 90,
  }).setDepth(depth);
}
