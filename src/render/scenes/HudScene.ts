/**
 * HUD als eigene Szene über der GameScene – so wirken Kamera-Wackeln und
 * Doppeltsehen nicht auf die Anzeigen.
 */
import Phaser from 'phaser';
import { METERS } from '../../config/balance';
import { formatPromille, type GameEvent } from '../../core';
import { audio } from '../../audio/AudioManager';
import type { GameScene } from './GameScene';
import { COLORS } from '../view/constants';
import { makeButton, textStyle } from '../view/ui';

interface Bar {
  x: number; y: number; w: number; h: number;
  color: number; label: Phaser.GameObjects.Text; marker?: number;
}

export class HudScene extends Phaser.Scene {
  private game_!: GameScene;
  private g!: Phaser.GameObjects.Graphics;
  private promilleText!: Phaser.GameObjects.Text;
  private clockText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private alertText!: Phaser.GameObjects.Text;
  private prostText!: Phaser.GameObjects.Text;
  private flashText!: Phaser.GameObjects.Text;
  private pauseLayer!: Phaser.GameObjects.Container;
  private muteIcon!: Phaser.GameObjects.Text;
  private bars!: { kotz: Bar; sprudel: Bar; misch: Bar };
  private shown = { kotz: 0, sprudel: 0, misch: 0 };
  private onPause = (p: boolean) => this.pauseLayer.setVisible(p);
  private t = 0;

  constructor() { super('Hud'); }

  init(data: { game: GameScene }): void {
    this.game_ = data.game;
  }

  create(): void {
    const { width: W, height: H } = this.scale.gameSize;
    this.t = 0;
    this.shown = { kotz: 0, sprudel: 0, misch: 0 };

    // Hintergrundleiste
    const bg = this.add.graphics();
    bg.fillStyle(0x12233d, 0.82).fillRoundedRect(8, 8, W - 16, 78, 16);
    bg.lineStyle(3, 0xffd23f, 0.8).strokeRoundedRect(8, 8, W - 16, 78, 16);

    this.add.image(42, 47, 'drink_mass').setScale(1.3);
    this.promilleText = this.add.text(70, 47, '0,00 ‰', textStyle(40, COLORS.gold)).setOrigin(0, 0.5);
    this.add.text(72, 16, 'PROMILLE', textStyle(13, '#cfd8e3', { strokeThickness: 3 }));

    const mk = (x: number, label: string, color: number, marker?: number): Bar => ({
      x, y: 48, w: 220, h: 22, color, marker,
      label: this.add.text(x, 20, label, textStyle(16, COLORS.cream, { strokeThickness: 3 })),
    });
    this.bars = {
      kotz: mk(270, 'Kotzleiste', 0x7ed957, METERS.kotz.warningThreshold),
      sprudel: mk(520, 'Sprudel-Druck', 0x6fc3ff, METERS.sprudel.dangerThreshold),
      misch: mk(770, 'Mischmasch', 0xc77dff, METERS.misch.doubleKotzThreshold),
    };
    this.g = this.add.graphics();

    this.clockText = this.add.text(W - 150, 47, '18:00', textStyle(40, COLORS.cream)).setOrigin(0.5);
    this.add.text(W - 150, 16, 'BIS ZAPFENSTREICH 23:00', textStyle(12, '#cfd8e3', { strokeThickness: 3 })).setOrigin(0.5, 0);

    this.statusText = this.add.text(16, 94, '', textStyle(18, COLORS.cream, { strokeThickness: 4 }));
    this.alertText = this.add.text(W / 2, 112, '', textStyle(26, '#ff8ad8')).setOrigin(0.5, 0);
    this.prostText = this.add.text(W / 2, H * 0.3, '', textStyle(44, COLORS.gold, { strokeThickness: 8, align: 'center' })).setOrigin(0.5);
    this.flashText = this.add.text(W / 2, H * 0.42, '', textStyle(54, COLORS.cream, { strokeThickness: 9, align: 'center' })).setOrigin(0.5).setAlpha(0);

    // Ton & Pause (auch für Touch)
    this.muteIcon = this.add.text(W - 26, 100, audio.muted ? '🔇' : '🔊', { fontSize: '30px' }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    this.muteIcon.on('pointerup', () => this.muteIcon.setText(audio.toggleMute() ? '🔇' : '🔊'));
    const pauseIcon = this.add.text(W - 76, 100, '⏸', { fontSize: '30px' }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    pauseIcon.on('pointerup', () => this.game_.togglePause());

    // Pause-Overlay
    const dim = this.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0).setInteractive();
    const ptxt = this.add.text(W / 2, H / 2 - 80, 'Brotzeit-Pause', textStyle(64, COLORS.gold)).setOrigin(0.5);
    const btn = makeButton(this, W / 2, H / 2 + 30, 'Weiter', () => this.game_.togglePause());
    const menu = makeButton(this, W / 2, H / 2 + 120, 'Zum Menü', () => {
      this.game_.scene.stop('Game');
      this.scene.start('Menu');
    }, { fill: 0xffffff, size: 28, height: 60 });
    this.pauseLayer = this.add.container(0, 0, [dim, ptxt, btn, menu]).setVisible(false).setDepth(100);

    this.game_.events.on('pause-changed', this.onPause);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game_.events.off('pause-changed', this.onPause));
    this.input.keyboard?.on('keydown-M', () => this.muteIcon.setText(audio.muted ? '🔇' : '🔊'));
  }

  update(_time: number, deltaMs: number): void {
    const dt = deltaMs / 1000;
    this.t += dt;
    const s = this.game_.state;
    if (!s) return;
    const m = s.meters;

    this.promilleText.setText(formatPromille(m.promille));
    this.clockText.setText(s.clock);
    this.clockText.setColor(s.timeLeft < 20 ? COLORS.gold : COLORS.cream);

    // Balken weich nachziehen
    const ease = Math.min(1, dt * 8);
    this.shown.kotz += (m.kotz - this.shown.kotz) * ease;
    this.shown.sprudel += (m.sprudel - this.shown.sprudel) * ease;
    this.shown.misch += (m.misch - this.shown.misch) * ease;

    this.g.clear();
    this.drawBar(this.bars.kotz, this.shown.kotz, m.kotz >= METERS.kotz.warningThreshold);
    this.drawBar(this.bars.sprudel, this.shown.sprudel, m.sprudel > METERS.sprudel.dangerThreshold);
    this.drawBar(this.bars.misch, this.shown.misch, m.misch >= METERS.misch.doubleKotzThreshold);
    this.bars.misch.label.setText(m.kotzMultiplier > 1 ? 'Mischmasch  ×2 Kotz!' : 'Mischmasch');

    // Statuszeile
    const p = s.player;
    const burp = p.burpCooldown > 0 ? `Rülpsen in ${p.burpCooldown.toFixed(1).replace('.', ',')} s` : 'Rülpsen bereit (R)';
    this.statusText.setText(`🍺 ${s.stats.drinks}   💨 ${s.stats.burps}   ·   ${burp}`);
    this.statusText.setColor(p.burpCooldown > 0 ? '#cfd8e3' : '#8fd3ff');

    // Hinweise
    let alert = '';
    if (s.phase !== 'playing') alert = '';
    else if (s.isWarning) alert = 'Mir is so schlecht… iss was!';
    else if (s.controlsInverted) alert = 'Steuerung verdreht!';
    else if (p.onCarousel) alert = 'Karussell! Schnell runter!';
    else if (p.slowTimer > 0) alert = 'Hendl-Koma… langsam!';
    else if (m.sprudel > METERS.sprudel.dangerThreshold) alert = 'Sprudel-Alarm! Rülpsen (R)!';
    this.alertText.setText(alert).setColor(s.isWarning ? COLORS.vomit : '#ff8ad8')
      .setScale(alert ? 1 + Math.sin(this.t * 8) * 0.04 : 1);

    if (s.prost.active) {
      const key = this.game_.touch ? 'Trink-Button' : 'E';
      this.prostText.setText(`PROST!  ${key} drücken!\n${s.prost.timeLeft.toFixed(1).replace('.', ',')} s`).setScale(1 + Math.sin(this.t * 12) * 0.05);
    } else this.prostText.setText('');
  }

  /** Kurze, große Einblendung in der Bildmitte */
  flash(text: string): void {
    if (!this.flashText) return;
    this.flashText.setText(text).setAlpha(1).setScale(0.6);
    this.tweens.add({ targets: this.flashText, scale: 1, duration: 300, ease: 'Back.out' });
    this.tweens.add({ targets: this.flashText, alpha: 0, delay: 1600, duration: 500 });
  }

  /** Wird von der GameScene für passende Events aufgerufen */
  handleEvent(e: GameEvent): void {
    if (e.type === 'hour') this.flash(`${e.hour}:00 Uhr – a Gaudi!`);
    if (e.type === 'gameEnd' && e.reason === 'zapfenstreich') this.flash('ZAPFENSTREICH!\nGeschafft!');
    if (e.type === 'vomit') this.flash(e.cause === 'sprudel' ? 'Zu viel Sprudel!' : e.cause === 'misch' ? 'Zu wild gemischt!' : 'Des war oans z\'vui…');
  }

  private drawBar(b: Bar, value: number, danger: boolean): void {
    const g = this.g;
    const f = Phaser.Math.Clamp(value / 100, 0, 1);
    g.fillStyle(0x000000, 0.5).fillRoundedRect(b.x, b.y, b.w, b.h, 8);
    if (f > 0.01) {
      const pulse = danger ? 0.75 + Math.sin(this.t * 12) * 0.25 : 1;
      g.fillStyle(danger ? 0xff5a4f : b.color, pulse).fillRoundedRect(b.x, b.y, Math.max(12, b.w * f), b.h, 8);
    }
    if (b.marker !== undefined) {
      const mx = b.x + (b.w * b.marker) / 100;
      g.lineStyle(2, 0xffffff, 0.8).lineBetween(mx, b.y - 3, mx, b.y + b.h + 3);
    }
    g.lineStyle(3, 0x2b1d14, 1).strokeRoundedRect(b.x, b.y, b.w, b.h, 8);
  }
}
