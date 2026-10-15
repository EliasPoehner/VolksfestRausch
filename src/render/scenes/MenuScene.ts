/**
 * Startbildschirm: Titel, Kurzanleitung, Perk-Auswahl, freies Spiel oder Tageswiesn,
 * Rekorde und Erfolge.
 */
import Phaser from 'phaser';
import { audio } from '../../audio/AudioManager';
import { MODIFIERS, PERKS, type PerkId } from '../../config/balance';
import {
  ACHIEVEMENTS, PERK_UNLOCKS, dailySetup, freeSetup, unlockedPerks, type RunSetup,
} from '../../core/meta';
import { formatPromille } from '../../core/scoring';
import { highscores } from '../../storage/highscore';
import { progress, type ProgressData } from '../../storage/progress';
import { COLORS } from '../view/constants';
import { confettiRain, makeButton, rautenBackground, textStyle } from '../view/ui';

export class MenuScene extends Phaser.Scene {
  private starting = false;
  private data_: ProgressData | null = null;
  private perkChoices: (PerkId | null)[] = [null];
  private perkIndex = 0;
  private perkText!: Phaser.GameObjects.Text;
  private perkDesc!: Phaser.GameObjects.Text;
  private overlay: Phaser.GameObjects.Container | null = null;

  constructor() { super('Menu'); }

  create(): void {
    this.starting = false;
    this.overlay = null;
    const { width: W, height: H } = this.scale.gameSize;
    rautenBackground(this);
    confettiRain(this).setAlpha(0.7);

    // Deko: Maßkrüge links und rechts
    const m1 = this.add.image(W / 2 - 420, 110, 'drink_mass').setScale(3).setAngle(-15);
    const m2 = this.add.image(W / 2 + 420, 110, 'drink_mass').setScale(3).setAngle(15).setFlipX(true);
    this.tweens.add({ targets: [m1, m2], y: 98, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    const title = this.add.text(W / 2, 100, 'Maßkrug-Marathon', textStyle(84, COLORS.gold, { strokeThickness: 12 })).setOrigin(0.5);
    this.tweens.add({ targets: title, scale: 1.04, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.add.text(W / 2, 166, 'Ein Volksfest-Spiel bis zum Zapfenstreich', textStyle(26)).setOrigin(0.5);

    // Anleitung
    const howto = [
      'Sammle bis 23:00 Uhr so viel Promille wie möglich!',
      'Laufen: WASD / Pfeile  ·  Nehmen: E  ·  Rülpsen: R halten, im Grünen loslassen',
      'Essen füllt den Magen – Wasser und Dixi-Klo helfen sofort.',
      '„Prost!“ im Takt der Blasmusik gibt Bonus – ab 22 Uhr ist Last Order!',
      'Kotzen kostet Promille – beim dritten Mal kommt der Sanka.',
    ];
    const panel = this.add.graphics();
    panel.fillStyle(0x000000, 0.45).fillRoundedRect(W / 2 - 470, 198, 940, 178, 20);
    panel.lineStyle(3, 0xffffff, 0.5).strokeRoundedRect(W / 2 - 470, 198, 940, 178, 20);
    this.add.text(W / 2, 287, howto.join('\n'), textStyle(21, COLORS.cream, { align: 'center', lineSpacing: 6, strokeThickness: 4 })).setOrigin(0.5);

    // Perk-Auswahl
    this.add.text(W / 2 - 250, 414, 'Perk:', textStyle(26, COLORS.cream)).setOrigin(1, 0.5);
    const arrow = (x: number, label: string, dir: number) => this.add.text(x, 414, label, textStyle(30, COLORS.gold))
      .setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => this.cyclePerk(dir));
    arrow(W / 2 - 220, '◀', -1);
    arrow(W / 2 + 220, '▶', 1);
    this.perkText = this.add.text(W / 2, 414, '', textStyle(26, COLORS.gold)).setOrigin(0.5);
    this.perkDesc = this.add.text(W / 2, 446, '', textStyle(16, '#cfd8e3', { strokeThickness: 3 })).setOrigin(0.5);

    // Start-Buttons
    makeButton(this, W / 2 - 170, 520, 'Ozapft is!', () => this.startGame(false), { width: 300, height: 80, size: 38 });
    makeButton(this, W / 2 + 170, 520, '📅 Tageswiesn', () => this.startGame(true), { width: 300, height: 80, size: 30, fill: 0x8fd3ff });

    const today = dailySetup(new Date());
    const mod = MODIFIERS[today.modifier];
    const dailyText = this.add.text(W / 2, 590, `Tageswiesn heute: ${mod.icon} ${mod.name} – für alle gleich`, textStyle(19, '#8fd3ff', { strokeThickness: 3 })).setOrigin(0.5);
    const hs = this.add.text(W / 2, 630, '', textStyle(22, COLORS.gold)).setOrigin(0.5);
    void highscores.getBest().then((best) => {
      hs.setText(best ? `Rekord: ${formatPromille(best.score)} – ${best.title}` : 'Noch kein Rekord – zeig, was du verträgst!');
    });

    // Erfolge (oben links)
    const ach = this.add.text(20, 20, '🏆 Erfolge', textStyle(22, COLORS.gold)).setInteractive({ useHandCursor: true });
    ach.on('pointerup', () => this.toggleAchievements());

    void progress.load().then((d) => {
      this.data_ = d;
      const have = new Set(Object.keys(d.achievements));
      this.perkChoices = [null, ...unlockedPerks(have)];
      this.perkIndex = Math.max(0, this.perkChoices.indexOf(d.perk));
      this.showPerk();
      ach.setText(`🏆 Erfolge ${have.size}/${ACHIEVEMENTS.length}`);
      const best = today.dateKey ? d.daily[today.dateKey] : undefined;
      if (best) dailyText.setText(`${dailyText.text}  ·  dein Tagesbestwert: ${formatPromille(best.score)}`);
    });
    this.showPerk();

    this.add.text(W / 2, H - 22, 'Enter: Los  ·  T: Tageswiesn  ·  ←/→: Perk  ·  A: Erfolge  ·  M: Ton  ·  Bitte in echt: Trink mit Verstand!',
      textStyle(16, '#cfd8e3', { strokeThickness: 3 })).setOrigin(0.5);

    const mute = this.add.text(W - 20, 20, audio.muted ? '🔇' : '🔊', { fontSize: '34px' }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    const toggle = () => mute.setText(audio.toggleMute() ? '🔇' : '🔊');
    mute.on('pointerup', toggle);
    const kb = this.input.keyboard;
    kb?.on('keydown-M', toggle);
    kb?.on('keydown-ENTER', () => { if (!this.overlay) this.startGame(false); });
    kb?.on('keydown-SPACE', () => { if (!this.overlay) this.startGame(false); });
    kb?.on('keydown-T', () => { if (!this.overlay) this.startGame(true); });
    kb?.on('keydown-LEFT', () => this.cyclePerk(-1));
    kb?.on('keydown-RIGHT', () => this.cyclePerk(1));
    kb?.on('keydown-A', () => this.toggleAchievements());
    kb?.on('keydown-ESC', () => { if (this.overlay) this.toggleAchievements(); });
  }

  private get perk(): PerkId | null { return this.perkChoices[this.perkIndex] ?? null; }

  private cyclePerk(dir: number): void {
    if (this.overlay) return;
    const n = this.perkChoices.length;
    this.perkIndex = (this.perkIndex + dir + n) % n;
    this.showPerk();
    void progress.setPerk(this.perk);
    audio.play('click');
  }

  private showPerk(): void {
    if (!this.perkText) return;
    const p = this.perk;
    this.perkText.setText(p ? `${PERKS[p].icon} ${PERKS[p].name}` : 'Ohne Perk');
    // Nächster gesperrter Perk als Anreiz
    const have = new Set(Object.keys(this.data_?.achievements ?? {}));
    const locked = (Object.keys(PERK_UNLOCKS) as PerkId[]).find((id) => !this.perkChoices.includes(id));
    const need = locked ? ACHIEVEMENTS.find((a) => a.id === PERK_UNLOCKS[locked]) : undefined;
    const hint = locked && need && !have.has(need.id) ? `   ·   🔒 ${PERKS[locked].name}: Erfolg „${need.name}“` : '';
    this.perkDesc.setText((p ? PERKS[p].desc : 'Ganz normal, ohne Vorteil.') + hint);
  }

  private toggleAchievements(): void {
    if (this.overlay) { this.overlay.destroy(); this.overlay = null; return; }
    const { width: W, height: H } = this.scale.gameSize;
    const have = this.data_?.achievements ?? {};
    const dim = this.add.rectangle(0, 0, W, H, 0x000000, 0.7).setOrigin(0).setInteractive();
    dim.on('pointerup', () => this.toggleAchievements());
    const box = this.add.graphics();
    box.fillStyle(0x12233d, 0.96).fillRoundedRect(W / 2 - 470, 60, 940, 600, 24);
    box.lineStyle(4, 0xffd23f, 1).strokeRoundedRect(W / 2 - 470, 60, 940, 600, 24);
    const items: Phaser.GameObjects.GameObject[] = [dim, box];
    items.push(this.add.text(W / 2, 100, `Erfolge  ${Object.keys(have).length}/${ACHIEVEMENTS.length}`, textStyle(40, COLORS.gold)).setOrigin(0.5));
    ACHIEVEMENTS.forEach((a, i) => {
      const done = !!have[a.id];
      const unlocks = (Object.keys(PERK_UNLOCKS) as PerkId[]).find((p) => PERK_UNLOCKS[p] === a.id);
      const extra = unlocks ? `  → schaltet ${PERKS[unlocks].icon} ${PERKS[unlocks].name} frei` : '';
      items.push(this.add.text(W / 2 - 440, 150 + i * 48, `${done ? '✅' : '⬜'} ${a.name}`, textStyle(24, done ? COLORS.gold : '#cfd8e3')));
      items.push(this.add.text(W / 2 - 170, 156 + i * 48, a.desc + extra, textStyle(15, done ? COLORS.cream : '#9fb0c3', { strokeThickness: 3 })));
    });
    items.push(this.add.text(W / 2, 636, 'Klick oder Esc zum Schließen', textStyle(16, '#cfd8e3', { strokeThickness: 3 })).setOrigin(0.5));
    this.overlay = this.add.container(0, 0, items).setDepth(1000);
  }

  private startGame(daily: boolean): void {
    if (this.starting || this.overlay) return; // Button + Taste gleichzeitig → nur einmal starten
    this.starting = true;
    const setup: RunSetup = daily ? dailySetup(new Date(), this.perk) : freeSetup(Date.now() >>> 0, this.perk);
    audio.startMusic();
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Game', { setup }));
  }
}
