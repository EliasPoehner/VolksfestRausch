/**
 * Balance-Wächter für Wetter (Run-Modifier) und Perks: der kluge Bot spielt jede Variante.
 * Mehr Seeds: `BALANCE_SEEDS=60 npm test`
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { MODIFIERS, PERKS, type ModifierId, type PerkId } from '../src/config/balance';
import { smartBot, summarize, type RunSummary } from './support/bots';

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const SEED_COUNT = Math.max(6, Math.round(Number(env.BALANCE_SEEDS ?? 20) / 2.5));
const seeds = Array.from({ length: SEED_COUNT }, (_, i) => 1000 + i * 7919);

describe('Balance: Wetter und Perks', () => {
  let base: RunSummary;
  const mods = {} as Record<ModifierId, RunSummary>;
  const perks = {} as Record<PerkId, RunSummary>;

  beforeAll(() => {
    base = summarize(smartBot, seeds);
    for (const id of Object.keys(MODIFIERS) as ModifierId[]) mods[id] = summarize(smartBot, seeds, { modifier: id });
    for (const id of Object.keys(PERKS) as PerkId[]) perks[id] = summarize(smartBot, seeds, { perk: id });
    console.table([
      ...Object.entries(mods).map(([k, v]) => ({ Setup: `Wetter: ${k}`, 'Ø Score': v.avgScore.toFixed(2), Sanka: `${Math.round(v.sankaRate * 100)} %` })),
      ...Object.entries(perks).map(([k, v]) => ({ Setup: `Perk: ${k}`, 'Ø Score': v.avgScore.toFixed(2), Sanka: `${Math.round(v.sankaRate * 100)} %` })),
    ]);
  }, 180_000);

  it('Kein Wetter macht das Spiel kaputt (Score ±25 %, kaum Sanka)', () => {
    for (const r of Object.values(mods)) {
      expect(r.avgScore).toBeGreaterThan(base.avgScore * 0.75);
      expect(r.avgScore).toBeLessThan(base.avgScore * 1.25);
      expect(r.sankaRate).toBeLessThanOrEqual(0.2);
    }
  });

  it('Perks helfen ein wenig, aber keiner dominiert', () => {
    const scores = Object.values(perks).map((r) => r.avgScore);
    expect(Math.max(...scores)).toBeLessThan(base.avgScore * 1.2);
    expect(Math.max(...scores) / Math.min(...scores)).toBeLessThan(1.15);
  });
});
