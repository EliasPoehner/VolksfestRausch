/**
 * Endscreen: Promille, Getränke, Rülpser, Titel, Highscore, "Nochmal".
 */
import Phaser from 'phaser';
import { audio } from '../../audio/AudioManager';
import { formatPromille, type GameResult } from '../../core';
import { highscores } from '../../storage/highscore';
import { COLORS } from '../view/constants';
import { confettiRain, makeButton, rautenBackground, textStyle } from '../view/ui';

const CAUSE_TEXT: Record<string, string> = {
  kotz: 'Die Kotzleiste war voll.',
  sprudel: 'Der Sprudel-Druck war zu groß.',
  misch: 'Zu wild durcheinander getrunken.',
};

export class GameOverScene extends Phaser.Scene {
  private result: GameResult | null = null;

  constructor() { super('GameOver'); }

  init(data: { result: GameResult | null }): void {
    this.result = data.result;
  }

  create(): void {
    const { width: W, height: H } = this.scale.gameSize;
    const r = this.result;
    rautenBackground(this, 0.25);
    this.cameras.main.fadeIn(300, 0, 0, 0);
    if (!r) { this.scene.start('Menu'); return; }

    const won = r.reason === 'zapfenstreich';
    if (won) confettiRain(this);

    this.add.text(W / 2, 70, won ? 'Zapfenstreich!' : 'Tatü-tata…', textStyle(70, won ? COLORS.gold : COLORS.vomit, { strokeThickness: 11 })).setOrigin(0.5);
    this.add.text(W / 2, 128, won ? `Durchgehalten bis ${r.clock} Uhr.` : `Um ${r.clock} Uhr abgeholt. ${CAUSE_TEXT[r.cause ?? 'kotz']}`, textStyle(24)).setOrigin(0.5);

    // Titel-Plakette
    const plaque = this.add.graphics();
    plaque.fillStyle(0x000000, 0.45).fillRoundedRect(W / 2 - 360, 160, 720, 330, 24);
    plaque.lineStyle(4, won ? 0xffd23f : 0x7ed957, 1).strokeRoundedRect(W / 2 - 360, 160, 720, 330, 24);

    const title = this.add.text(W / 2, 205, `„${r.title}“`, textStyle(48, won ? COLORS.gold : COLORS.vomit)).setOrigin(0.5).setScale(0);
    this.tweens.add({ targets: title, scale: 1, duration: 600, ease: 'Back.out', delay: 200 });

    this.add.text(W / 2, 275, formatPromille(r.promille), textStyle(64, COLORS.cream)).setOrigin(0.5);
    if (!won) {
      this.add.text(W / 2, 320, `Sanka-Abzug: Score ${formatPromille(r.score)}`, textStyle(22, '#ffb3b3')).setOrigin(0.5);
    }

    const s = r.stats;
    const lines = [
      `Getränke: ${s.drinks}   ·   Rülpser: ${s.burps}${s.failedBurps ? ` (${s.failedBurps} daneben)` : ''}`,
      `Brotzeiten: ${s.foods}   ·   Prost mitgetrunken: ${s.prosts}   ·   Spitze: ${formatPromille(s.maxPromille)}`,
    ];
    this.add.text(W / 2, 380, lines.join('\n'), textStyle(22, COLORS.cream, { align: 'center', lineSpacing: 10, strokeThickness: 4 })).setOrigin(0.5);

    const hsText = this.add.text(W / 2, 455, 'Highscore wird gespeichert…', textStyle(24, COLORS.gold)).setOrigin(0.5);
    void highscores.submit({
      score: r.score, promille: r.promille, title: r.title, drinks: s.drinks, burps: s.burps, date: new Date().toISOString(),
    }).then(async (isRecord) => {
      const best = await highscores.getBest();
      hsText.setText(isRecord ? '🏆 Neuer Rekord! 🏆' : `Rekord: ${formatPromille(best?.score ?? 0)} – ${best?.title ?? ''}`);
      if (isRecord) {
        audio.play('win');
        this.tweens.add({ targets: hsText, scale: 1.12, yoyo: true, repeat: -1, duration: 500 });
      }
    });

    makeButton(this, W / 2 - 160, H - 140, 'Nochmal!', () => this.restart(), { width: 280, height: 80, size: 40 });
    makeButton(this, W / 2 + 160, H - 140, 'Menü', () => this.scene.start('Menu'), { width: 220, height: 80, size: 34, fill: 0xffffff });
    this.add.text(W / 2, H - 50, 'Enter: Nochmal  ·  Im echten Leben gilt: Wasser trinken & sicher heimkommen!', textStyle(18, '#cfd8e3', { strokeThickness: 3 })).setOrigin(0.5);
    this.time.delayedCall(600, () => this.input.keyboard?.once('keydown-ENTER', () => this.restart()));
  }

  private restart(): void {
    this.scene.start('Game');
  }
}
