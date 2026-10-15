/**
 * Spiel-Events: Die Logik schreibt Events in eine Queue, der Renderer
 * (Phaser heute, Three.js morgen) liest sie einmal pro Frame aus und
 * spielt passende Sounds, Partikel und Sprechblasen ab.
 *
 * Wichtig: Die Logik hängt NICHT vom Renderer ab – sie weiß nur,
 * *dass* etwas passiert ist, nicht *wie* es aussieht.
 */
import type { DrinkId, EveningPhaseId, FoodId } from '../config/balance';
import type { Vec2 } from './math';
import type { BurpQuality } from './Meters';

export type VomitCause = 'kotz' | 'sprudel' | 'misch';
export type EndReason = 'vomit' | 'zapfenstreich';

export type GameEvent =
  /** `promille` = tatsächlich gewonnene Promille (nach Magen und Phase) */
  | { type: 'drink'; drink: DrinkId; pos: Vec2; viaProst: boolean; promille: number }
  | { type: 'food'; food: FoodId; pos: Vec2 }
  /** Rülpser losgelassen: `quality` = zu früh / Sweet-Spot / zu spät */
  | { type: 'burp'; failed: boolean; quality: BurpQuality; pos: Vec2 }
  /** R wird gehalten – Aufladen beginnt */
  | { type: 'burpChargeStart' }
  | { type: 'burpCooldown' }
  | { type: 'speech'; entityId: number; text: string }
  | { type: 'warningStart' }
  | { type: 'warningEnd' }
  | { type: 'prostStart'; npcId: number }
  /** Ein Schlag der Blasmusik während des Prost-Fensters (`n` = 1, 2, …) */
  | { type: 'prostBeat'; n: number }
  /** `onBeat` = im Takt mitgetrunken, `combo` = aktuelle Combo danach */
  | { type: 'prostEnd'; joined: boolean; onBeat: boolean; combo: number }
  | { type: 'carouselEnter' }
  | { type: 'bump'; pos: Vec2 }
  | { type: 'controlsInverted' }
  | { type: 'confetti'; pos: Vec2 }
  | { type: 'hour'; hour: number }
  /** Neue Abend-Phase (Gemütlich → Stimmung → Last Order) */
  | { type: 'phaseChange'; phase: EveningPhaseId }
  /** Gekotzt, aber überstanden – das Spiel läuft weiter. `count` = wievielte Kotzerei, `max` = Sanka-Grenze */
  | { type: 'vomitSurvived'; cause: VomitCause; pos: Vec2; count: number; max: number }
  /** Das Stunden-Ende des Kontrollverlusts */
  | { type: 'vomitRecovered' }
  /** Letztes Kotzen: der Sanka kommt */
  | { type: 'vomit'; cause: VomitCause; pos: Vec2 }
  | { type: 'gameEnd'; reason: EndReason };

export class EventQueue {
  private items: GameEvent[] = [];
  push(e: GameEvent): void { this.items.push(e); }
  /** Gibt alle gesammelten Events zurück und leert die Queue. */
  drain(): GameEvent[] {
    const out = this.items;
    this.items = [];
    return out;
  }
}
