/**
 * Meta-Ebene: Tageswiesn, Run-Modifier, Perks, Wiesn-Aufgaben und Erfolge.
 * Reine Logik ohne Speicher – gespeichert wird in `src/storage/progress.ts`.
 */
import {
  MODIFIERS, NO_FACTORS, PERKS, SIDE_GOALS,
  type ModifierId, type PerkId, type RunFactors,
} from '../config/balance';
import type { GameResult, GameStats } from './entities';
import { Rng } from './math';

/** Wie eine Runde aufgesetzt ist */
export interface RunSetup {
  seed: number;
  modifier: ModifierId;
  perk: PerkId | null;
  /** Tageswiesn: alle spielen am selben Tag dieselbe Runde */
  daily: boolean;
  /** Datum der Tageswiesn als "JJJJ-MM-TT" */
  dateKey: string | null;
}

/** "JJJJ-MM-TT" in Ortszeit */
export function dateKeyOf(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/** Seed aus einem Datum: gleiches Datum → gleicher Seed */
export function seedFromDateKey(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function pickModifier(rng: Rng): ModifierId {
  return rng.weighted(Object.values(MODIFIERS), (m) => m.weight).id;
}

/** Tageswiesn für ein Datum: fester Seed und fester Modifier */
export function dailySetup(date: Date, perk: PerkId | null = null): RunSetup {
  const dateKey = dateKeyOf(date);
  const seed = seedFromDateKey(dateKey);
  return { seed, modifier: pickModifier(new Rng(seed ^ 0x7a6e)), perk, daily: true, dateKey };
}

/** Freies Spiel: zufälliger Seed, zufälliges Wetter */
export function freeSetup(seed: number, perk: PerkId | null = null): RunSetup {
  return { seed, modifier: pickModifier(new Rng(seed ^ 0x7a6e)), perk, daily: false, dateKey: null };
}

/** Vervollständigt ein (Teil-)Setup – ohne Angaben: normales Wetter, kein Perk */
export function normalizeSetup(s: number | Partial<RunSetup>): RunSetup {
  const p = typeof s === 'number' ? { seed: s } : s;
  return {
    seed: p.seed ?? Date.now(), modifier: p.modifier ?? 'normal', perk: p.perk ?? null,
    daily: p.daily ?? false, dateKey: p.dateKey ?? null,
  };
}

/** Faktoren von Modifier und Perk zusammenrechnen */
export function runFactors(setup: RunSetup): RunFactors {
  const f: RunFactors = { ...NO_FACTORS };
  const parts = [MODIFIERS[setup.modifier].factors, setup.perk ? PERKS[setup.perk].factors : {}];
  for (const part of parts) {
    for (const [k, v] of Object.entries(part) as [keyof RunFactors, number][]) {
      if (k === 'driftBonus' || k === 'extraVisitors' || k === 'extraWaitresses') f[k] += v;
      else f[k] *= v;
    }
  }
  return f;
}

// ---------------------------------------------------------------------------
// Wiesn-Aufgaben (Nebenziele pro Runde)
// ---------------------------------------------------------------------------

export interface GoalContext {
  stats: GameStats;
  promille: number;
  /** null = Runde läuft noch */
  reason: GameResult['reason'] | null;
}

export interface SideGoalDef {
  id: string;
  text: string;
  /** Nur am Rundenende prüfbar (z. B. "kotzfrei") */
  atEnd: boolean;
  check(c: GoalContext): boolean;
}

const survived = (c: GoalContext) => c.reason === 'zapfenstreich';

export const SIDE_GOAL_POOL: SideGoalDef[] = [
  { id: 'prostTakt3', text: '3× Prost im Takt', atEnd: false, check: (c) => c.stats.prostsOnBeat >= 3 },
  { id: 'perfekt3', text: '3 perfekte Rülpser', atEnd: false, check: (c) => c.stats.perfectBurps >= 3 },
  { id: 'combo3', text: 'Prost-Combo ×3', atEnd: false, check: (c) => c.stats.maxProstCombo >= 3 },
  { id: 'sorten4', text: '4 verschiedene Getränke', atEnd: false, check: (c) => c.stats.drinkKinds.length >= 4 },
  { id: 'lukas80', text: 'Hau den Lukas: 80 %', atEnd: false, check: (c) => c.stats.bestLukas >= 0.8 },
  { id: 'riesenrad', text: 'Einmal Riesenrad fahren', atEnd: false, check: (c) => c.stats.riesenradRides >= 1 },
  { id: 'brotzeit5', text: '5 Brotzeiten', atEnd: false, check: (c) => c.stats.foods >= 5 },
  { id: 'duell', text: 'Ein Rülps-Duell gewinnen', atEnd: false, check: (c) => c.stats.duelsWon >= 1 },
  { id: 'kotzfrei', text: 'Kotzfrei bis 23:00', atEnd: true, check: (c) => survived(c) && c.stats.vomits === 0 },
  { id: 'keinRempler', text: 'Keinem Rempler in die Arme laufen', atEnd: true, check: (c) => survived(c) && c.stats.rempler === 0 },
  { id: 'zwei', text: 'Mit 2,0 ‰ zum Zapfenstreich', atEnd: true, check: (c) => survived(c) && c.promille >= 2 },
];

/** Feste Auswahl an Aufgaben für einen Seed */
export function pickSideGoals(seed: number, n = SIDE_GOALS.perRound): SideGoalDef[] {
  const rng = new Rng(seed ^ 0xa11ce);
  const pool = [...SIDE_GOAL_POOL];
  const out: SideGoalDef[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rng.next() * pool.length), 1)[0]);
  return out;
}

export function sideGoalDef(id: string): SideGoalDef | undefined {
  return SIDE_GOAL_POOL.find((g) => g.id === id);
}

// ---------------------------------------------------------------------------
// Erfolge (dauerhaft) und Perk-Freischaltung
// ---------------------------------------------------------------------------

export type AchievementId =
  | 'kotzfrei' | 'zeltkoenig' | 'legende' | 'combo5' | 'alleSorten' | 'glocke' | 'perfekt5' | 'herz' | 'aufgaben' | 'tageswiesn';

export interface AchievementDef {
  id: AchievementId;
  name: string;
  desc: string;
  check(r: GameResult): boolean;
}

const won = (r: GameResult) => r.reason === 'zapfenstreich';

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'kotzfrei', name: 'Kotzfrei', desc: 'Bis zum Zapfenstreich durchhalten, ohne zu kotzen', check: (r) => won(r) && r.stats.vomits === 0 },
  { id: 'zeltkoenig', name: 'Zeltkönig', desc: 'Mit mindestens 2,0 Score bis 23:00', check: (r) => won(r) && r.score >= 2 },
  { id: 'legende', name: 'Wiesn-Legende', desc: 'Mit mindestens 3,5 Score bis 23:00', check: (r) => won(r) && r.score >= 3.5 },
  { id: 'combo5', name: '5er-Prost-Combo', desc: '5× in Folge im Takt mittrinken', check: (r) => r.stats.maxProstCombo >= 5 },
  { id: 'alleSorten', name: 'Alle Sorten', desc: 'Alle 6 Getränke in einer Runde', check: (r) => r.stats.drinkKinds.length >= 6 },
  { id: 'glocke', name: 'Wia a Stier', desc: 'Beim Hau-den-Lukas die Glocke läuten', check: (r) => r.stats.lukasBells >= 1 },
  { id: 'perfekt5', name: 'Rülps-Meister', desc: '5 perfekte Rülpser in einer Runde', check: (r) => r.stats.perfectBurps >= 5 },
  { id: 'herz', name: 'Schutzengel', desc: 'Vom Lebkuchenherz vor dem Sanka gerettet', check: (r) => r.stats.heartSaves >= 1 },
  { id: 'aufgaben', name: 'Pflichtbewusst', desc: 'Alle Wiesn-Aufgaben einer Runde erfüllt', check: (r) => r.sideGoals.length > 0 && r.sideGoals.every((g) => g.done) },
  { id: 'tageswiesn', name: 'Stammgast', desc: 'Eine Tageswiesn bis zum Zapfenstreich spielen', check: (r) => r.setup.daily && won(r) },
];

export function evaluateAchievements(r: GameResult): AchievementId[] {
  return ACHIEVEMENTS.filter((a) => a.check(r)).map((a) => a.id);
}

/** Welcher Erfolg schaltet welchen Perk frei (null = von Anfang an frei) */
export const PERK_UNLOCKS: Record<PerkId, AchievementId | null> = {
  lederhose: null,
  magen: 'kotzfrei',
  leber: 'zeltkoenig',
};

export function unlockedPerks(achievements: ReadonlySet<string>): PerkId[] {
  return (Object.keys(PERK_UNLOCKS) as PerkId[]).filter((p) => {
    const need = PERK_UNLOCKS[p];
    return need === null || achievements.has(need);
  });
}
