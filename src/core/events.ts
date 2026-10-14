/**
 * Spiel-Events: Die Logik schreibt Events in eine Queue, der Renderer
 * (Phaser heute, Three.js morgen) liest sie einmal pro Frame aus und
 * spielt passende Sounds, Partikel und Sprechblasen ab.
 *
 * Wichtig: Die Logik hängt NICHT vom Renderer ab – sie weiß nur,
 * *dass* etwas passiert ist, nicht *wie* es aussieht.
 */
import type { DrinkId, FoodId } from '../config/balance';
import type { Vec2 } from './math';

export type VomitCause = 'kotz' | 'sprudel' | 'misch';
export type EndReason = 'vomit' | 'zapfenstreich';

export type GameEvent =
  | { type: 'drink'; drink: DrinkId; pos: Vec2; viaProst: boolean }
  | { type: 'food'; food: FoodId; pos: Vec2 }
  | { type: 'burp'; failed: boolean; pos: Vec2 }
  | { type: 'burpCooldown' }
  | { type: 'speech'; entityId: number; text: string }
  | { type: 'warningStart' }
  | { type: 'warningEnd' }
  | { type: 'prostStart'; npcId: number }
  | { type: 'prostEnd'; joined: boolean }
  | { type: 'carouselEnter' }
  | { type: 'bump'; pos: Vec2 }
  | { type: 'controlsInverted' }
  | { type: 'confetti'; pos: Vec2 }
  | { type: 'hour'; hour: number }
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
