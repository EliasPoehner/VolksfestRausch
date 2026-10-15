/**
 * Datenmodelle aller Spielobjekte. Reine Daten, keine Grafik.
 * Jede Entität hat eine Welt-Position `pos` (x, y).
 */
import type { DrinkId, FoodId } from '../config/balance';
import type { BoothKind } from '../config/world';
import type { Rect, Vec2 } from './math';
import type { RunSetup } from './meta';

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
  /** Gerade beschäftigt (Klo, Riesenrad, Hau-den-Lukas) – dann kein Laufen */
  activity: Activity | null;
  /** Lebkuchenherz vom Hau-den-Lukas: rettet einmal vor dem Sanka */
  lebkuchenherz: boolean;
}

export type ActivityKind = 'dixi' | 'riesenrad' | 'lukas';

export interface Activity {
  kind: ActivityKind;
  /** Verstrichene Zeit (s) */
  elapsed: number;
  /** Gesamtdauer (s); beim Lukas die Höchstdauer */
  total: number;
  /** Dixi: Wartezeit (s), bevor man in die Kabine kommt */
  queue: number;
  /** Welche Kabine/Attraktion */
  targetId: number;
}

/** Dixi-Klo-Kabine */
export interface Dixi {
  id: number;
  rect: Rect;
  door: Vec2;
  /** > 0: besetzt bzw. wird geputzt */
  cooldown: number;
}

/** Riesenrad oder Hau-den-Lukas */
export interface Attraction {
  id: number;
  kind: 'riesenrad' | 'lukas';
  /** Hier steht man zum Einsteigen/Zuschlagen */
  spot: Vec2;
  /** > 0: gerade nicht verfügbar */
  cooldown: number;
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

export type NpcRole = 'visitor' | 'waitress' | 'security';
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
  /** 'down' = Bierleiche (liegt im Weg), 'leave' = geht heim, 'chase'/'patrol' = Security */
  state: WaitressState | 'idle' | 'walk' | 'down' | 'leave' | 'chase' | 'patrol';
  /** Torkelt herum und rempelt (ab der Stimmungs-Phase) */
  drunk: boolean;
  /** Teil einer Familie (nur am frühen Abend) */
  family: boolean;
  /** Kind: folgt dieser NPC-ID */
  followId: number | null;
  /** Pause nach einem Rempler bzw. einem Schubser der Security (s) */
  bumpCooldown: number;
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
  type: 'pickup' | 'booth' | 'waitress' | 'prost' | 'dixi' | 'riesenrad' | 'lukas';
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
  dixiVisits: number;
  riesenradRides: number;
  /** Beste Hau-den-Lukas-Kraft (0–1) */
  bestLukas: number;
  /** Wie oft die Glocke geläutet hat */
  lukasBells: number;
  /** Rempler abbekommen */
  rempler: number;
  /** Von der Security rausgeschoben */
  securityPushes: number;
  /** Lebkuchenherz hat vor dem Sanka gerettet */
  heartSaves: number;
  /** Welche Getränkesorten getrunken wurden */
  drinkKinds: DrinkId[];
}

export interface GameResult {
  /** Wie die Runde aufgesetzt war (Seed, Wetter, Perk, Tageswiesn) */
  setup: RunSetup;
  /** Wiesn-Aufgaben dieser Runde */
  sideGoals: { id: string; text: string; done: boolean }[];
  reason: 'vomit' | 'zapfenstreich';
  cause?: 'kotz' | 'sprudel' | 'misch';
  promille: number;
  score: number;
  title: string;
  clock: string;
  stats: GameStats;
}
