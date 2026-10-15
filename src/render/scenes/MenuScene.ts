/**
 * Startbildschirm: Titel, kurze Anleitung, Highscore, Start-Button.
 */
import Phaser from 'phaser';
import { audio } from '../../audio/AudioManager';
import { formatPromille } from '../../core/scoring';
import { highscores } from '../../storage/highscore';
import { COLORS } from '../view/constants';
import { confettiRain, makeButton, rautenBackground, textStyle } from '../view/ui';

export class MenuScene extends Phaser.Scene {
  private starting = false;

  constructor() { super('Menu'); }

  create(): void {
    this.starting = false;
    const { width: W, height: H } = this.scale.gameSize;
    rautenBackground(this);
    confettiRain(this).setAlpha(0.7);

    // Deko: Maßkrüge links und rechts
    const m1 = this.add.image(W / 2 - 420, 120, 'drink_mass').setScale(3).setAngle(-15);
    const m2 = this.add.image(W / 2 + 420, 120, 'drink_mass').setScale(3).setAngle(15).setFlipX(true);
    this.tweens.add({ targets: [m1, m2], y: 108, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    const title = this.add.text(W / 2, 110, 'Maßkrug-Marathon', textStyle(84, COLORS.gold, { strokeThickness: 12 })).setOrigin(0.5);
    this.tweens.add({ targets: title, scale: 1.04, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.add.text(W / 2, 178, 'Ein Volksfest-Spiel bis zum Zapfenstreich', textStyle(26)).setOrigin(0.5);

    // Anleitung
    const howto = [
      'Sammle bis 23:00 Uhr so viel Promille wie möglich!',
      'Laufen: WASD / Pfeiltasten   ·   Nehmen: E / Leertaste   ·   Rülpsen: R halten',
      'Brezn, Hendl & Steckerlfisch füllen den Magen, Wasser hilft sofort.',
      'Sprudel-Druck? R halten und im grünen Bereich loslassen!',
      'Wild durcheinander trinken füllt den Mischmasch-Meter. Obacht!',
      'Ruft wer "Prost!": im Takt der Blasmusik mittrinken gibt Bonus!',
      'Kotzen kostet Promille – beim dritten Mal kommt der Sanka.',
    ];
    const panel = this.add.graphics();
    panel.fillStyle(0x000000, 0.45).fillRoundedRect(W / 2 - 470, 222, 940, 250, 20);
    panel.lineStyle(3, 0xffffff, 0.5).strokeRoundedRect(W / 2 - 470, 222, 940, 250, 20);
    this.add.text(W / 2, 347, howto.join('\n'), textStyle(22, COLORS.cream, { align: 'center', lineSpacing: 4, strokeThickness: 4 })).setOrigin(0.5);

    makeButton(this, W / 2, 545, 'Ozapft is!', () => this.startGame(), { width: 320, height: 84, size: 42 });

    const hs = this.add.text(W / 2, 625, '', textStyle(24, COLORS.gold)).setOrigin(0.5);
    void highscores.getBest().then((best) => {
      hs.setText(best ? `Rekord: ${formatPromille(best.score)} – ${best.title}` : 'Noch kein Rekord – zeig, was du verträgst!');
    });

    this.add.text(W / 2, H - 26, 'M: Ton an/aus  ·  Esc/P: Pause  ·  Bitte in echt: Trink mit Verstand!', textStyle(18, '#cfd8e3', { strokeThickness: 3 })).setOrigin(0.5);

    const mute = this.add.text(W - 20, 20, audio.muted ? '🔇' : '🔊', { fontSize: '34px' }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    const toggle = () => mute.setText(audio.toggleMute() ? '🔇' : '🔊');
    mute.on('pointerup', toggle);
    this.input.keyboard?.on('keydown-M', toggle);
    this.input.keyboard?.once('keydown-ENTER', () => this.startGame());
    this.input.keyboard?.once('keydown-SPACE', () => this.startGame());
  }

  private startGame(): void {
    if (this.starting) return; // Button + Taste gleichzeitig → nur einmal starten
    this.starting = true;
    audio.startMusic();
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Game'));
  }
}
