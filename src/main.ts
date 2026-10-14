/**
 * Einstiegspunkt: erstellt das Phaser-Spiel mit allen Szenen.
 *
 * Für eine Three.js-Version würde man hier stattdessen den Three-Renderer
 * starten – /core, /config, /input, /storage und /audio bleiben gleich.
 */
import Phaser from 'phaser';
import { BootScene } from './render/scenes/BootScene';
import { MenuScene } from './render/scenes/MenuScene';
import { GameScene } from './render/scenes/GameScene';
import { HudScene } from './render/scenes/HudScene';
import { GameOverScene } from './render/scenes/GameOverScene';
import { VIEW_HEIGHT, VIEW_WIDTH } from './render/view/constants';

new Phaser.Game({
  type: Phaser.AUTO, // WebGL (mit Post-FX), Fallback Canvas
  parent: 'game',
  backgroundColor: '#12233d',
  width: VIEW_WIDTH,
  height: VIEW_HEIGHT,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: { antialias: true, roundPixels: false },
  input: { activePointers: 3 },
  scene: [BootScene, MenuScene, GameScene, HudScene, GameOverScene],
});
