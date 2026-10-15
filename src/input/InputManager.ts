/**
 * Abstrahierter Input – unabhängig von Phaser.
 *
 * Liefert pro Logik-Schritt einen `PlayerCommand`:
 *   - move:   Richtungsvektor (Länge 0..1)
 *   - action: E/Leertaste/Touch "Trinken" wurde gedrückt (Flanke)
 *   - burpHeld: R/Touch "Rülpsen" ist gedrückt (Halten lädt auf, Loslassen rülpst)
 *
 * Quellen werden zusammengeführt (Tastatur + Touch gleichzeitig möglich).
 * Weil hier nur DOM-Events genutzt werden, funktioniert das Modul
 * unverändert auch mit einem Three.js-Renderer.
 */
import type { PlayerCommand } from '../core/GameState';
import { clampLength1, type Vec2 } from '../core/math';

export interface InputSource {
  /** Aktuelle Richtung (Länge 0..1) */
  getMove(): Vec2;
  /**
   * Gibt gedrückte Aktionen seit dem letzten Aufruf zurück und setzt sie zurück.
   * `burpHeld` ist true, solange Rülpsen gehalten wird – oder wenn es seit dem letzten
   * Aufruf kurz angetippt wurde (damit auch ganz kurze Tipper ankommen).
   */
  consumeActions(): { action: boolean; burpHeld: boolean };
  destroy(): void;
}

export class InputManager {
  private sources: InputSource[] = [];

  add(source: InputSource): this {
    this.sources.push(source);
    return this;
  }

  /**
   * Erzeugt den Befehl für den nächsten Logik-Schritt.
   * Aktionen werden dabei "verbraucht", damit ein Tastendruck nur einmal zählt.
   */
  poll(): PlayerCommand {
    let x = 0, y = 0, action = false, burpHeld = false;
    for (const s of this.sources) {
      const m = s.getMove();
      x += m.x; y += m.y;
      const a = s.consumeActions();
      action ||= a.action;
      burpHeld ||= a.burpHeld;
    }
    return { move: clampLength1({ x, y }), action, burpHeld };
  }

  /** Nur die Flanken verwerfen (z. B. beim Pausieren) */
  clearActions(): void {
    for (const s of this.sources) s.consumeActions();
  }

  destroy(): void {
    for (const s of this.sources) s.destroy();
    this.sources = [];
  }
}
