/**
 * Abstrahierter Input – unabhängig von Phaser.
 *
 * Liefert pro Logik-Schritt einen `PlayerCommand`:
 *   - move:   Richtungsvektor (Länge 0..1)
 *   - action: E/Leertaste/Touch "Trinken" wurde gedrückt (Flanke)
 *   - burp:   R/Touch "Rülpsen" wurde gedrückt (Flanke)
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
  /** Gibt gedrückte Aktionen seit dem letzten Aufruf zurück und setzt sie zurück */
  consumeActions(): { action: boolean; burp: boolean };
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
    let x = 0, y = 0, action = false, burp = false;
    for (const s of this.sources) {
      const m = s.getMove();
      x += m.x; y += m.y;
      const a = s.consumeActions();
      action ||= a.action;
      burp ||= a.burp;
    }
    return { move: clampLength1({ x, y }), action, burp };
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
