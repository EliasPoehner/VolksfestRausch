/**
 * Datenmodelle aller Spielobjekte. Reine Daten, keine Grafik.
 * Jede Entität hat eine Welt-Position `pos` (x, y).
 */
import type { DrinkId, FoodId } from '../config/balance';
import type { BoothKind } from '../config/world';
import type { Rect, Vec2 } from './math';

/** ID 0 ist immer der Spieler (z. B. für Sprechblasen). */
export const PLAYER_ID = 0;

export interface Player {
  id: typeof PLAYER_ID;
  pos: Vec2;
  /** Aktuelle Bewegung (Welt-Einheiten/s) – für Laufanimation im Renderer */
  vel: Vec2;
  /** Blickrichtung in Radiant (0 = Osten/rechts) */
  facing: number;
  /** Verbleibende Verlangsamung durch Hendl (s) */
  slowTimer: number;
  /** Verbleibende Dauer vertauschter Steuerung (s) */
  invertTimer: number;
  /** Steht der Spieler gerade auf dem Karussell? */
  onCarousel: boolean;
  /** Zusätzliche Drehung durch Karussell (Radiant, wächst stetig) */
  spin: number;
  /** Rülps-Cooldown (s) */
  burpCooldown: number;
  /** Lädt gerade einen Rülpser auf (R gehalten)? */
  burpCharging: boolean;
  /** Wie lange schon aufgeladen wird (s) */
  burpCharge: number;
  /** Jäger-Kick: verbleibende Tempo-Boost-Dauer (s) */
  boostTimer: number;
  /** Sekt-Laune: ein "Prost!" zählt doppelt, solange > 0 (s) */
  prostBoostTimer: number;
  /** > 0: Kontrollverlust nach dem Kotzen (s) */
  vomitTimer: number;
  /** Zeit seit Beginn des Kontrollverlusts (s) */
  vomitElapsed: number;
}

export type PickupKind = 'drink' | 'food';

export interface Pickup {
  id: number;
  kind: PickupKind;
  drink?: DrinkId;
  food?: FoodId;
  pos: Vec2;
  /** 'field' = zufällig auf der Wiese, 'bench' = auf einer Bierbank */
  source: 'field' | 'bench';
  /** Restlebensdauer (nur 'field') */
  ttl: number;
}

export interface BenchSlot {
  benchIndex: number;
  pos: Vec2;
  pickupId: number | null;
  refillTimer: number;
}

export interface Booth {
  id: number;
  kind: BoothKind;
  rect: Rect;
  /** Punkt vor der Theke, an dem man das Essen bekommt */
  counter: Vec2;
  /** > 0: gerade ausverkauft / wird nachgelegt */
  cooldown: number;
}

export type NpcRole = 'visitor' | 'waitress';
export type WaitressState = 'toTent' | 'refill' | 'deliver' | 'wait' | 'roam';

export interface Npc {
  id: number;
  role: NpcRole;
  pos: Vec2;
  target: Vec2;
  speed: number;
  /** Optik-Variante (Farben), wird nur vom Renderer interpretiert */
  variant: number;
  facing: number;
  moving: boolean;
  /** Zeit bis zur nächsten Aktion/Pause */
  timer: number;
  /** Zeit bis zur nächsten Sprechblase */
  chatterTimer: number;
  /** Erkennt Festhängen an Hindernissen */
  stuckTimer: number;
  /** Nur Bedienungen: */
  carrying: DrinkId | null;
  state: WaitressState | 'idle' | 'walk';
}

export interface BumperCar {
  id: number;
  pos: Vec2;
  vel: Vec2;
  radius: number;
  variant: number;
  hitCooldown: number;
}

/** Was der Spieler gerade aufnehmen könnte (für Hinweis "E: Maß Bier") */
export interface InteractionFocus {
  type: 'pickup' | 'booth' | 'waitress' | 'prost';
  id: number;
  pos: Vec2;
  label: string;
}

export interface ProstState {
  active: boolean;
  npcId: number;
  timeLeft: number;
  /** Seit Beginn des Prost-Rufs (s) – daraus ergibt sich der Takt */
  elapsed: number;
}

export interface GameStats {
  drinks: number;
  foods: number;
  burps: number;
  failedBurps: number;
  /** Rülpser im Sweet-Spot */
  perfectBurps: number;
  prosts: number;
  /** "Prost!" im Takt der Blasmusik */
  prostsOnBeat: number;
  /** Längste Prost-Combo (im Takt in Folge) */
  maxProstCombo: number;
  maxPromille: number;
  /** Wie oft gekotzt wurde (inkl. dem letzten, falls der Sanka kam) */
  vomits: number;
}

export interface GameResult {
  reason: 'vomit' | 'zapfenstreich';
  cause?: 'kotz' | 'sprudel' | 'misch';
  promille: number;
  score: number;
  title: string;
  clock: string;
  stats: GameStats;
}
