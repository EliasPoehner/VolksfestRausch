/**
 * Balance-Bots: spielen eine komplette Runde über `GameState.step()` – mit echten
 * Eingaben (Laufen, E, R), ohne Renderer. Jeder Bot verfolgt eine Strategie
 * (was trinkt/isst er, wann rülpst er, macht er beim "Prost!" mit).
 *
 * Wird von `tests/balance.test.ts` genutzt, um zu prüfen, dass das Balancing
 * nicht unbemerkt kippt (z. B. "kluger Bot schlägt Spam-Bot").
 */
import { BURP, DRINKS, ROUND, type DrinkId, type FoodId } from '../../src/config/balance';
import { GameState, type PlayerCommand } from '../../src/core/GameState';
import type { GameResult } from '../../src/core/entities';
import type { Meters } from '../../src/core/Meters';
import { Rng, dist, normalize, type Vec2 } from '../../src/core/math';

export type Item = { kind: 'drink'; id: DrinkId } | { kind: 'food'; id: FoodId };

export interface Strategy {
  name: string;
  /** Will der Bot dieses Getränk/Essen jetzt haben? */
  wants(item: Item, m: Meters, g: GameState, rng: Rng): boolean;
  /** Beim "Prost!" mittrinken? */
  joinProst(m: Meters, g: GameState): boolean;
  /** Jetzt rülpsen (wird nur gefragt, wenn der Rülpser bereit ist)? */
  shouldBurp(m: Meters, g: GameState, rng: Rng): boolean;
  /** Wie lange R gehalten wird (s). Standard: Mitte des Sweet-Spots */
  burpHold?(rng: Rng): number;
  /** Beim "Prost!" auf den Takt warten statt sofort zu drücken? */
  prostOnBeat?: boolean;
}

const SWEET_MID = (BURP.sweetStart + BURP.sweetEnd) / 2;

interface Target { key: string; pos: Vec2 }

/** Steuert einen Spieler mit einer Strategie. Ein Bot = eine Runde. */
export class Bot {
  private readonly rng: Rng;
  private target: Target | null = null;
  private targetTime = 0;
  private retarget = 0;
  private stuck = 0;
  private sidestep = 0;
  private sideSign = 1;
  private lastPos: Vec2 | null = null;
  private mash = 0;
  private burpTarget = SWEET_MID;
  private readonly blocked = new Map<string, number>();

  constructor(private readonly strategy: Strategy, seed: number) {
    this.rng = new Rng(seed ^ 0x5eed);
  }

  command(g: GameState, dt: number): PlayerCommand {
    const m = g.meters;
    const cmd: PlayerCommand = { move: { x: 0, y: 0 }, action: false, burpHeld: false };

    // Kontrollverlust: "Reiß di zam!" mit ca. 7,5 Tastendrücken pro Sekunde
    if (g.isVomiting) {
      cmd.action = this.mash++ % 8 === 0;
      return cmd;
    }

    // Rülpsen: halten, bis die gewünschte Ladezeit erreicht ist, dann loslassen
    if (g.player.burpCharging) {
      cmd.burpHeld = g.player.burpCharge + dt < this.burpTarget;
    } else if (g.burpReady && this.strategy.shouldBurp(m, g, this.rng)) {
      cmd.burpHeld = true;
      this.burpTarget = this.strategy.burpHold?.(this.rng) ?? SWEET_MID;
    }

    if (g.prost.active) {
      if (this.strategy.joinProst(m, g) && (!this.strategy.prostOnBeat || g.prostOnBeat)) cmd.action = true;
      return cmd;
    }

    // Was gerade in Reichweite ist und gewollt wird, sofort nehmen
    const focusItem = g.focus ? this.itemFor(g, g.focus.type, g.focus.id) : null;
    if (focusItem && this.strategy.wants(focusItem, m, g, this.rng)) {
      cmd.action = true;
      this.target = null;
      return cmd;
    }

    for (const [k, t] of this.blocked) if (t <= g.elapsed) this.blocked.delete(k);
    this.retarget -= dt;
    if (!this.target || this.retarget <= 0) {
      const next = this.chooseTarget(g);
      if (next?.key !== this.target?.key) this.targetTime = 0;
      this.target = next;
      this.retarget = 0.25;
    }
    if (!this.target) return cmd;

    // Zu lange unterwegs? Ziel eine Weile ignorieren.
    this.targetTime += dt;
    if (this.targetTime > 8) {
      this.blocked.set(this.target.key, g.elapsed + 12);
      this.target = null;
      return cmd;
    }

    cmd.move = this.steer(g.player.pos, this.target.pos, dt);
    return cmd;
  }

  /** Läuft geradeaus zum Ziel; hängt man fest, wird kurz seitlich ausgewichen. */
  private steer(pos: Vec2, target: Vec2, dt: number): Vec2 {
    const dir = normalize({ x: target.x - pos.x, y: target.y - pos.y });
    if (this.lastPos && dist(pos, this.lastPos) < 0.5) this.stuck += dt;
    else this.stuck = Math.max(0, this.stuck - dt);
    this.lastPos = { ...pos };
    if (this.stuck > 0.3 && this.sidestep <= 0) {
      this.sidestep = 0.7;
      this.sideSign = this.rng.next() < 0.5 ? -1 : 1;
      this.stuck = 0;
    }
    if (this.sidestep > 0) {
      this.sidestep -= dt;
      return normalize({ x: -dir.y * this.sideSign + dir.x * 0.2, y: dir.x * this.sideSign + dir.y * 0.2 });
    }
    return dir;
  }

  private itemFor(g: GameState, type: string, id: number): Item | null {
    if (type === 'pickup') {
      const pk = g.pickups.find((p) => p.id === id);
      if (!pk) return null;
      return pk.kind === 'drink' ? { kind: 'drink', id: pk.drink! } : { kind: 'food', id: pk.food! };
    }
    if (type === 'booth') {
      const b = g.booths.find((x) => x.id === id);
      return b ? { kind: 'food', id: b.kind } : null;
    }
    if (type === 'waitress') {
      const n = g.findNpc(id);
      return n?.carrying ? { kind: 'drink', id: n.carrying } : null;
    }
    return null;
  }

  private chooseTarget(g: GameState): Target | null {
    const m = g.meters;
    const pp = g.player.pos;
    let best: Target | null = null;
    let bestD = Infinity;
    const consider = (key: string, item: Item, pos: Vec2) => {
      if (this.blocked.has(key)) return;
      const d = dist(pp, pos);
      if (d >= bestD) return;
      if (!this.strategy.wants(item, m, g, this.rng)) return;
      bestD = d;
      best = { key, pos };
    };
    for (const pk of g.pickups) {
      consider(`p${pk.id}`, pk.kind === 'drink' ? { kind: 'drink', id: pk.drink! } : { kind: 'food', id: pk.food! }, pk.pos);
    }
    for (const b of g.booths) if (b.cooldown <= 0) consider(`b${b.id}`, { kind: 'food', id: b.kind }, b.counter);
    for (const n of g.npcs) if (n.role === 'waitress' && n.carrying) consider(`w${n.id}`, { kind: 'drink', id: n.carrying }, n.pos);
    return best;
  }
}

/** Spielt eine komplette Runde mit einer Strategie. */
export function playRound(strategy: Strategy, seed: number): GameResult {
  const g = new GameState(seed);
  const bot = new Bot(strategy, seed);
  const dt = ROUND.fixedStep;
  const maxSteps = Math.ceil(ROUND.durationSeconds / dt) + 10;
  for (let i = 0; i < maxSteps && g.phase === 'playing'; i++) {
    g.step(dt, bot.command(g, dt));
    g.events.drain();
  }
  if (!g.result) throw new Error(`Runde ${strategy.name}/${seed} ohne Ergebnis`);
  return g.result;
}

// ---------------------------------------------------------------------------
// Strategien
// ---------------------------------------------------------------------------

/** Nur Maß, sonst nichts: kein Essen, kein Rülpsen, jedes "Prost!" mit. */
export const spamBot: Strategy = {
  name: 'Maß-Spam',
  wants: (item) => item.kind === 'drink' && item.id === 'mass',
  joinProst: () => true,
  shouldBurp: () => false,
};

/** Trinkt alles, was Promille bringt, rülpst bei Druck, isst nur im Notfall. */
export const greedyBot: Strategy = {
  name: 'Gierig',
  wants: (item, m) => (item.kind === 'drink' ? m.kotz < 80 : m.kotz > 75 && item.id !== 'wasser'),
  joinProst: () => true,
  shouldBurp: (m) => m.sprudel > 55,
  // ungeduldig: hält mal zu kurz, mal zu lang
  burpHold: (rng) => 0.3 + rng.next() * 0.9,
};

/** Nimmt, was in der Nähe liegt, und rülpst zufällig. */
export const randomBot: Strategy = {
  name: 'Wahllos',
  wants: (_item, _m, _g, rng) => rng.next() < 0.6,
  joinProst: (_m, g) => g.elapsed % 2 < 1,
  shouldBurp: (_m, _g, rng) => rng.next() < 0.01,
  burpHold: (rng) => rng.next() * 1.6,
};

/**
 * Kluger Bot: bleibt bei einer Biersorte, hält den Magen gefüllt, rülpst früh,
 * nimmt Wasser gegen Sprudel und trinkt nur, solange die Leisten Luft haben.
 */
export const smartBot: Strategy = {
  name: 'Klug',
  wants: (item, m) => {
    if (item.kind === 'food') {
      if (item.id === 'wasser') return m.sprudel > 55 || m.kotz > 60;
      if (item.id === 'steckerlfisch') return m.misch > 30 || m.magen < 40;
      return m.magen < 45;
    }
    const d = DRINKS[item.id];
    if (m.kotz + d.kotz * 2 > 62) return false;
    if (m.sprudel + d.sprudel > 70) return false;
    if (item.id !== 'mass' && item.id !== 'weissbier') return false;
    if (m.misch > 10) return false;
    return true;
  },
  joinProst: (m) => m.kotz < 65 && m.sprudel < 65,
  shouldBurp: (m) => m.sprudel > 35,
  prostOnBeat: true,
};

/**
 * Wie der kluge Bot, nutzt aber die Last Order: ab 22 Uhr trinkt er mehr
 * und lässt die Kotzleiste höher laufen, weil Getränke dann mehr bringen.
 */
export const lastOrderBot: Strategy = {
  ...smartBot,
  name: 'Klug + Endspurt',
  wants: (item, m, g, rng) => {
    if (g.evening.id !== 'lastOrder' || item.kind === 'food') return smartBot.wants(item, m, g, rng);
    const d = DRINKS[item.id];
    if (m.kotz + d.kotz * 2.7 > 72) return false;
    if (m.sprudel + d.sprudel > 75) return false;
    return item.id === 'mass' || item.id === 'weissbier';
  },
};

/** Wie der kluge Bot, aber ohne Gefühl: tippt R nur kurz an und drückt beim "Prost!" sofort. */
export const clumsyBot: Strategy = {
  ...smartBot,
  name: 'Klug ohne Gefühl',
  burpHold: () => 0,
  prostOnBeat: false,
};

export const STRATEGIES = {
  spam: spamBot, greedy: greedyBot, random: randomBot, smart: smartBot, lastOrder: lastOrderBot, clumsy: clumsyBot,
};

export interface RunSummary {
  strategy: string;
  rounds: number;
  avgScore: number;
  avgPromille: number;
  sankaRate: number;
  /** Anteil Runden mit mindestens einem Kotzen (inkl. Sanka) */
  vomitRate: number;
  avgDrinks: number;
}

export function summarize(strategy: Strategy, seeds: readonly number[]): RunSummary {
  const results = seeds.map((s) => playRound(strategy, s));
  const avg = (f: (r: GameResult) => number) => results.reduce((s, r) => s + f(r), 0) / results.length;
  return {
    strategy: strategy.name,
    rounds: results.length,
    avgScore: avg((r) => r.score),
    avgPromille: avg((r) => r.promille),
    sankaRate: avg((r) => (r.reason === 'vomit' ? 1 : 0)),
    vomitRate: avg((r) => (r.stats.vomits > 0 ? 1 : 0)),
    avgDrinks: avg((r) => r.stats.drinks),
  };
}
