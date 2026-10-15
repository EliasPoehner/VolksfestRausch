/**
 * Balance-Wächter: Bots mit verschiedenen Strategien spielen komplette Runden.
 * Die Assertions beschreiben, wie sich das Balancing anfühlen SOLL. Schlägt hier
 * etwas fehl, hat eine Änderung in `balance.ts` (oder der Logik) das Spiel gekippt.
 *
 * Mehr Seeds für eine genauere Auswertung: `BALANCE_SEEDS=60 npm test`
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { STRATEGIES, playRound, summarize, type RunSummary } from './support/bots';

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const SEED_COUNT = Number(env.BALANCE_SEEDS ?? 20);
const SEEDS = Array.from({ length: SEED_COUNT }, (_, i) => 1000 + i * 7919);

describe('Balance-Bots', () => {
  const r = {} as Record<keyof typeof STRATEGIES, RunSummary>;

  beforeAll(() => {
    for (const key of Object.keys(STRATEGIES) as (keyof typeof STRATEGIES)[]) {
      r[key] = summarize(STRATEGIES[key], SEEDS);
    }
    console.table(Object.values(r).map((s) => ({
      Strategie: s.strategy,
      'Ø Score': s.avgScore.toFixed(2),
      'Ø ‰': s.avgPromille.toFixed(2),
      Sanka: `${Math.round(s.sankaRate * 100)} %`,
      Gekotzt: `${Math.round(s.vomitRate * 100)} %`,
      'Ø Getränke': s.avgDrinks.toFixed(1),
    })));
  }, 120_000);

  it('Runden sind bei gleichem Seed reproduzierbar', () => {
    expect(playRound(STRATEGIES.smart, 4242)).toEqual(playRound(STRATEGIES.smart, 4242));
  });

  it('Kluges Spiel schlägt Maß-Spam deutlich', () => {
    expect(r.smart.avgScore).toBeGreaterThan(r.spam.avgScore * 1.5);
  });

  it('Kluges Spiel schlägt gieriges und wahlloses Spiel', () => {
    expect(r.smart.avgScore).toBeGreaterThan(r.greedy.avgScore);
    expect(r.smart.avgScore).toBeGreaterThan(r.random.avgScore);
  });

  it('Die Last Order lohnt sich: Endspurt schlägt gleichmäßiges kluges Spiel', () => {
    expect(r.lastOrder.avgScore).toBeGreaterThan(r.smart.avgScore * 1.05);
    expect(r.lastOrder.sankaRate).toBeLessThanOrEqual(0.15);
  });

  it('Maß-Spam endet fast immer im Sanka', () => {
    expect(r.spam.sankaRate).toBeGreaterThan(0.8);
  });

  it('Gier wird meistens bestraft', () => {
    expect(r.greedy.sankaRate).toBeGreaterThan(0.6);
  });

  it('Wer klug spielt, kommt fast immer bis zum Zapfenstreich', () => {
    expect(r.smart.sankaRate).toBeLessThanOrEqual(0.15);
  });

  it('Gute Promille-Werte bleiben in einem sinnvollen Rahmen', () => {
    expect(r.smart.avgPromille).toBeGreaterThan(1.8);
    expect(r.smart.avgPromille).toBeLessThan(3.2);
  });
});
