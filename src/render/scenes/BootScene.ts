/**
 * BootScene: lädt Font, optionale Sprite-Dateien und Sounds und erzeugt die
 * prozeduralen Grafiken. Danach geht's ins Menü.
 */
import Phaser from 'phaser';
import { SPRITE_FILES, UI_FONT } from '../assetManifest';
import { generateTextures } from '../textures';
import { audio } from '../../audio/AudioManager';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload(): void {
    const { width, height } = this.scale.gameSize;
    const bar = this.add.rectangle(width / 2 - 200, height / 2, 4, 24, 0xffd23f).setOrigin(0, 0.5);
    this.add.rectangle(width / 2, height / 2, 404, 28).setStrokeStyle(3, 0xffffff);
    this.load.on('progress', (p: number) => { bar.width = 400 * p; });

    // Optionale echte Sprites (siehe assetManifest.ts)
    for (const [key, path] of Object.entries(SPRITE_FILES)) {
      if (path) this.load.image(key, path);
    }
  }

  async create(): Promise<void> {
    generateTextures(this);
    audio.init();

    // Font laden (relativer Pfad → funktioniert auch in Unterordnern)
    try {
      const font = new FontFace(UI_FONT, 'url(assets/fonts/LilitaOne-Regular.ttf)');
      await font.load();
      document.fonts.add(font);
    } catch {
      /* Fallback-Font wird genutzt */
    }
    this.scene.start('Menu');
  }
}
