/**
 * Endscreen: Promille, Getränke, Rülpser, Titel, Highscore, "Nochmal".
 */
import Phaser from 'phaser';
import { audio } from '../../audio/AudioManager';
import { MODIFIERS, PERKS, SIDE_GOALS, type PerkId } from '../../config/balance';
import {
  ACHIEVEMENTS, PERK_UNLOCKS, dailySetup, evaluateAchievements, formatPromille, freeSetup, type GameResult,
} from '../../core';
import { progress } from '../../storage/progress';
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
    this.add.text(W / 2, 122, won ? `Durchgehalten bis ${r.clock} Uhr.` : `Um ${r.clock} Uhr abgeholt. ${CAUSE_TEXT[r.cause ?? 'kotz']}`, textStyle(24)).setOrigin(0.5);
    const mod = MODIFIERS[r.setup.modifier];
    const modeLine = [
      r.setup.daily ? `📅 Tageswiesn ${r.setup.dateKey?.split('-').reverse().slice(0, 2).join('.')}.` : 'Freies Spiel',
      `${mod.icon} ${mod.name}`, r.setup.perk ? `${PERKS[r.setup.perk].icon} ${PERKS[r.setup.perk].name}` : '',
    ].filter(Boolean).join('   ·   ');
    this.add.text(W / 2, 152, modeLine, textStyle(16, '#cfd8e3', { strokeThickness: 3 })).setOrigin(0.5);

    // Titel-Plakette
    const plaque = this.add.graphics();
    plaque.fillStyle(0x000000, 0.45).fillRoundedRect(W / 2 - 380, 170, 760, 330, 24);
    plaque.lineStyle(4, won ? 0xffd23f : 0x7ed957, 1).strokeRoundedRect(W / 2 - 380, 170, 760, 330, 24);

    const title = this.add.text(W / 2, 212, `„${r.title}“`, textStyle(48, won ? COLORS.gold : COLORS.vomit)).setOrigin(0.5).setScale(0);
    this.tweens.add({ targets: title, scale: 1, duration: 600, ease: 'Back.out', delay: 200 });

    this.add.text(W / 2, 276, formatPromille(r.promille), textStyle(60, COLORS.cream)).setOrigin(0.5);
    const s = r.stats;
    const goalsDone = r.sideGoals.filter((g) => g.done).length;
    const survivedVomits = won ? s.vomits : Math.max(0, s.vomits - 1);
    const parts = [
      !won ? 'Sanka ×0,5' : '', survivedVomits ? `${survivedVomits}× gekotzt` : '',
      goalsDone ? `Aufgaben +${Math.round(goalsDone * SIDE_GOALS.bonusEach * 100)} %` : '',
    ].filter(Boolean);
    this.add.text(W / 2, 320, `Score: ${formatPromille(r.score)}${parts.length ? `  (${parts.join(', ')})` : ''}`,
      textStyle(22, !won ? '#ffb3b3' : goalsDone ? '#8cff7a' : COLORS.cream)).setOrigin(0.5);

    const lines = [
      `Getränke: ${s.drinks}   ·   Rülpser: ${s.burps}${s.perfectBurps ? ` (${s.perfectBurps} perfekt)` : ''}   ·   Prost im Takt: ${s.prostsOnBeat}/${s.prosts}`,
      `Brotzeiten: ${s.foods}   ·   Klo: ${s.dixiVisits}×   ·   Lukas: ${Math.round(s.bestLukas * 100)} %   ·   Spitze: ${formatPromille(s.maxPromille)}`,
    ];
    this.add.text(W / 2, 374, lines.join('\n'), textStyle(19, COLORS.cream, { align: 'center', lineSpacing: 8, strokeThickness: 4 })).setOrigin(0.5);
    this.add.text(W / 2, 428, r.sideGoals.map((g) => `${g.done ? '✅' : '❌'} ${g.text}`).join('    '),
      textStyle(17, COLORS.cream, { strokeThickness: 3 })).setOrigin(0.5);

    const hsText = this.add.text(W / 2, 470, 'Wird gespeichert…', textStyle(24, COLORS.gold)).setOrigin(0.5);
    const celebrate = () => {
      audio.play('win');
      this.tweens.add({ targets: hsText, scale: 1.12, yoyo: true, repeat: -1, duration: 500 });
    };
    void highscores.submit({
      score: r.score, promille: r.promille, title: r.title, drinks: s.drinks, burps: s.burps, date: new Date().toISOString(),
    }).then(async (isRecord) => {
      if (r.setup.daily && r.setup.dateKey) {
        const dayRecord = await progress.submitDaily(r.setup.dateKey, { score: r.score, promille: r.promille, title: r.title });
        const best = (await progress.load()).daily[r.setup.dateKey];
        hsText.setText(isRecord ? '🏆 Neuer Rekord – und Tagesbestwert! 🏆'
          : dayRecord ? '📅 Neuer Tagesbestwert!' : `Tagesbestwert: ${formatPromille(best?.score ?? 0)}`);
        if (isRecord || dayRecord) celebrate();
        return;
      }
      const best = await highscores.getBest();
      hsText.setText(isRecord ? '🏆 Neuer Rekord! 🏆' : `Rekord: ${formatPromille(best?.score ?? 0)} – ${best?.title ?? ''}`);
      if (isRecord) celebrate();
    });

    // Erfolge freischalten
    const achText = this.add.text(W / 2, 528, '', textStyle(21, COLORS.gold, { strokeThickness: 4 })).setOrigin(0.5);
    void progress.countRound();
    void progress.unlock(evaluateAchievements(r)).then((fresh) => {
      if (!fresh.length) return;
      const names = fresh.map((id) => ACHIEVEMENTS.find((a) => a.id === id)?.name ?? id);
      const perks = (Object.keys(PERK_UNLOCKS) as PerkId[]).filter((p) => fresh.includes(PERK_UNLOCKS[p] ?? ''));
      achText.setText(`🏆 Neuer Erfolg: ${names.join(', ')}${perks.length ? `  ·  Perk frei: ${perks.map((p) => PERKS[p].name).join(', ')}` : ''}`);
      achText.setScale(0);
      this.tweens.add({ targets: achText, scale: 1, duration: 500, ease: 'Back.out', delay: 700 });
    });

    makeButton(this, W / 2 - 160, H - 118, 'Nochmal!', () => this.restart(), { width: 280, height: 76, size: 38 });
    makeButton(this, W / 2 + 160, H - 118, 'Menü', () => this.scene.start('Menu'), { width: 220, height: 76, size: 32, fill: 0xffffff });
    this.add.text(W / 2, H - 40, 'Enter: Nochmal  ·  Im echten Leben gilt: Wasser trinken & sicher heimkommen!', textStyle(18, '#cfd8e3', { strokeThickness: 3 })).setOrigin(0.5);
    this.time.delayedCall(600, () => this.input.keyboard?.once('keydown-ENTER', () => this.restart()));
  }

  /** Gleiche Art Runde nochmal: Tageswiesn bleibt Tageswiesn, freies Spiel bekommt einen neuen Seed */
  private restart(): void {
    const prev = this.result?.setup;
    const perk = prev?.perk ?? null;
    const setup = prev?.daily ? dailySetup(new Date(), perk) : freeSetup(Date.now() >>> 0, perk);
    this.scene.start('Game', { setup });
  }
}
