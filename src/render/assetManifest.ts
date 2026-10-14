/**
 * Asset-Manifest für Grafiken.
 *
 * Standardmäßig werden ALLE Grafiken prozedural erzeugt (siehe textures.ts).
 * Wer echte Sprites verwenden möchte (z. B. von Kenney.nl, CC0), legt die
 * PNG-Datei in public/assets/sprites/ ab und trägt sie hier ein:
 *
 *   player: 'assets/sprites/player.png',
 *
 * Beim Booten wird dann die Datei geladen und die prozedurale Grafik mit
 * gleichem Schlüssel übersprungen. Größen sollten ungefähr den
 * prozeduralen Vorbildern entsprechen (siehe Kommentar je Key in textures.ts).
 */
import type { TextureKey } from './textures';

export const SPRITE_FILES: Partial<Record<TextureKey, string>> = {
  // Beispiel: 'drink_mass': 'assets/sprites/drink_mass.png',
};

/** Webfont (Google Fonts, OFL) – liegt lokal, wird per CSS @font-face geladen */
export const UI_FONT = 'Lilita One';
export const UI_FONT_STACK = `"${UI_FONT}", "Trebuchet MS", system-ui, sans-serif`;
