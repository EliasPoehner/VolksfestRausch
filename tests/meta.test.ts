import { describe, expect, it } from 'vitest';
import { PERKS, ROUND, SIDE_GOALS } from '../src/config/balance';
import { GameState, NO_COMMAND } from '../src/core/GameState';
import type { GameResult } from '../src/core/entities';
import {
  ACHIEVEMENTS, dailySetup, dateKeyOf, evaluateAchievements, freeSetup, normalizeSetup, pickSideGoals, runFactors, unlockedPerks,
} from '../src/core/meta';
import { computeScore } from '../src/core/scoring';
import { LocalProgressStore } from '../src/storage/progress';

describe('Tageswiesn & Setup', () => {
  it('Gleicher Tag → gleiche Runde, anderer Tag → andere Runde', () => {
    const a = dailySetup(new Date(2026, 9, 15, 9));
    const b = dailySetup(new Date(2026, 9, 15, 22));
    const c = dailySetup(new Date(2026, 9, 16, 9));
    expect(a).toEqual(b);
    expect(a.seed).not.toBe(c.seed);
    expect(a.daily).toBe(true);
    expect(a.dateKey).toBe('2026-10-15');
    expect(dateKeyOf(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('Gleicher Seed spielt sich gleich – auch mit Wetter und Perk', () => {
    const setup = { ...freeSetup(77, 'leber'), modifier: 'regen' as const };
    const run = () => {
      const g = new GameState(setup);
      for (let i = 0; i < 600; i++) g.step(ROUND.fixedStep, { ...NO_COMMAND, move: { x: 1, y: 0.3 } });
      return { pos: g.player.pos, promille: g.meters.promille, npcs: g.npcs.length };
    };
    expect(run()).toEqual(run());
  });

  it('Ohne Angaben: normales Wetter und kein Perk', () => {
    const s = normalizeSetup(5);
    expect(s).toMatchObject({ seed: 5, modifier: 'normal', perk: null, daily: false });
    expect(runFactors(s).speed).toBe(1);
  });

  it('Wetter und Perk werden kombiniert', () => {
    const f = runFactors({ seed: 1, modifier: 'trachtenumzug', perk: 'leber', daily: false, dateKey: null });
    expect(f.extraVisitors).toBeGreaterThan(0);
    expect(f.liver).toBeCloseTo(PERKS.leber.factors.liver!);
    const g = new GameState({ seed: 1, modifier: 'trachtenumzug' });
    expect(g.npcs.filter((n) => n.role === 'waitress').length).toBeGreaterThan(5);
  });

  it('Regen macht langsamer', () => {
    const dist = (modifier: 'normal' | 'regen') => {
      const g = new GameState({ seed: 3, modifier });
      const x0 = g.player.pos.x;
      for (let i = 0; i < 30; i++) g.step(ROUND.fixedStep, { ...NO_COMMAND, move: { x: 1, y: 0 } });
      return g.player.pos.x - x0;
    };
    expect(dist('regen')).toBeLessThan(dist('normal'));
  });
});

describe('Wiesn-Aufgaben', () => {
  it('Pro Seed eine feste Auswahl verschiedener Aufgaben', () => {
    const a = pickSideGoals(42).map((g) => g.id);
    expect(a).toEqual(pickSideGoals(42).map((g) => g.id));
    expect(new Set(a).size).toBe(SIDE_GOALS.perRound);
  });

  it('Erfüllte Aufgaben geben Score-Bonus', () => {
    expect(computeScore(2, false, 0, 2)).toBeCloseTo(2 * (1 + 2 * SIDE_GOALS.bonusEach), 2);
  });

  it('Eine Aufgabe wird während der Runde erkannt und gemeldet', () => {
    // Seed suchen, dessen Aufgaben "5 Brotzeiten" enthalten
    let seed = 1;
    while (!pickSideGoals(seed).some((g) => g.id === 'brotzeit5')) seed++;
    const g = new GameState(seed);
    g.stats.foods = 5;
    g.step(ROUND.fixedStep, NO_COMMAND);
    const e = g.events.drain().find((x) => x.type === 'sideGoal');
    expect(e && e.type === 'sideGoal' && e.id).toBe('brotzeit5');
    expect(g.sideGoals.find((x) => x.def.id === 'brotzeit5')!.done).toBe(true);
  });

  it('End-Aufgaben zählen erst am Rundenende', () => {
    let seed = 1;
    while (!pickSideGoals(seed).some((g) => g.id === 'kotzfrei')) seed++;
    const g = new GameState(seed);
    g.step(ROUND.fixedStep, NO_COMMAND);
    expect(g.sideGoals.find((x) => x.def.id === 'kotzfrei')!.done).toBe(false);
    while (g.phase === 'playing') {
      g.meters.kotz = 0; g.meters.sprudel = 0; g.meters.misch = 0;
      g.step(ROUND.fixedStep, NO_COMMAND);
    }
    expect(g.result!.sideGoals.find((x) => x.id === 'kotzfrei')!.done).toBe(true);
  });
});

describe('Erfolge & Perks', () => {
  const result = (over: Omit<Partial<GameResult>, 'stats'> & { stats?: Partial<GameResult['stats']> }): GameResult => {
    const g = new GameState(1);
    const base = { ...g.stats };
    return {
      setup: normalizeSetup(1), sideGoals: [], reason: 'zapfenstreich', promille: 1, score: 1, title: '', clock: '23:00',
      ...over, stats: { ...base, ...over.stats },
    } as GameResult;
  };

  it('Kotzfrei, Zeltkönig, Legende', () => {
    expect(evaluateAchievements(result({ score: 2.1 }))).toEqual(expect.arrayContaining(['kotzfrei', 'zeltkoenig']));
    expect(evaluateAchievements(result({ score: 3.6 }))).toContain('legende');
    expect(evaluateAchievements(result({ reason: 'vomit', stats: { vomits: 3 } }))).not.toContain('kotzfrei');
  });

  it('Combo, Sorten, Glocke, Rülps-Meister, Schutzengel, Aufgaben, Tageswiesn', () => {
    const ids = evaluateAchievements(result({
      stats: { maxProstCombo: 5, drinkKinds: ['mass', 'radler', 'weissbier', 'obstler', 'sekt', 'jaeger'], lukasBells: 1, perfectBurps: 5, heartSaves: 1 },
      sideGoals: [{ id: 'a', text: '', done: true }],
      setup: { ...normalizeSetup(1), daily: true, dateKey: '2026-10-15' },
    }));
    expect(ids).toEqual(expect.arrayContaining(['combo5', 'alleSorten', 'glocke', 'perfekt5', 'herz', 'aufgaben', 'tageswiesn']));
    expect(ACHIEVEMENTS.length).toBe(10);
  });

  it('Perks werden über Erfolge freigeschaltet', () => {
    expect(unlockedPerks(new Set())).toEqual(['lederhose']);
    expect(unlockedPerks(new Set(['kotzfrei', 'zeltkoenig']))).toEqual(['lederhose', 'magen', 'leber']);
  });
});

describe('Fortschritts-Speicher (ohne localStorage)', () => {
  it('merkt sich Erfolge, Perk und Tagesbestwerte', async () => {
    const p = new LocalProgressStore();
    expect(await p.unlock(['kotzfrei'])).toEqual(['kotzfrei']);
    expect(await p.unlock(['kotzfrei', 'glocke'])).toEqual(['glocke']);
    await p.setPerk('magen');
    expect(await p.submitDaily('2026-10-15', { score: 2, promille: 2, title: 'x' })).toBe(true);
    expect(await p.submitDaily('2026-10-15', { score: 1, promille: 1, title: 'y' })).toBe(false);
    await p.countRound();
    const d = await p.load();
    expect(Object.keys(d.achievements).sort()).toEqual(['glocke', 'kotzfrei']);
    expect(d.perk).toBe('magen');
    expect(d.daily['2026-10-15'].score).toBe(2);
    expect(d.rounds).toBe(1);
  });
});
