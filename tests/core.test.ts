import { describe, expect, it } from 'vitest';
import { BURP, DRINKS, EVENTS, FOODS, METERS, ROUND, SCORING } from '../src/config/balance';
import { GameState, NO_COMMAND } from '../src/core/GameState';
import { Meters } from '../src/core/Meters';
import { clockLabel, computeScore, titleFor } from '../src/core/scoring';

describe('Meters', () => {
  it('Maß erhöht Promille und Sprudel', () => {
    const m = new Meters();
    m.drink('mass', 0);
    expect(m.promille).toBeCloseTo(DRINKS.mass.promille);
    expect(m.sprudel).toBe(DRINKS.mass.sprudel);
    expect(m.misch).toBe(0);
  });

  it('Verschiedene Sorten im Zeitfenster füllen den Mischmasch-Meter', () => {
    const m = new Meters();
    m.drink('mass', 0);
    m.drink('radler', 5);
    expect(m.misch).toBe(METERS.misch.perDistinctOtherType);
    m.drink('sekt', 10);
    expect(m.misch).toBe(METERS.misch.perDistinctOtherType * 3);
  });

  it('Sorten außerhalb des Zeitfensters zählen nicht', () => {
    const m = new Meters();
    m.drink('mass', 0);
    m.drink('radler', METERS.misch.windowSeconds + 1);
    expect(m.misch).toBe(0);
  });

  it('Jägermeister erhöht den Mischmasch stark', () => {
    const m = new Meters();
    m.drink('jaeger', 0);
    expect(m.misch).toBe(DRINKS.jaeger.mischBonus);
  });

  it('Ab Mischmasch 50 steigt die Kotzleiste doppelt', () => {
    const m = new Meters();
    m.misch = 60;
    m.addKotz(10);
    expect(m.kotz).toBe(20);
  });

  it('Wasser: Kotz runter, Sprudel runter, Promille runter', () => {
    const m = new Meters();
    m.promille = 1; m.kotz = 50; m.sprudel = 50;
    m.eat('wasser');
    expect(m.kotz).toBe(50 + FOODS.wasser.kotz);
    expect(m.sprudel).toBe(50 + FOODS.wasser.sprudel);
    expect(m.promille).toBeCloseTo(0.9);
  });

  it('Rülpsen baut Sprudel ab, Fehlrülpser erhöht Kotz', () => {
    const m = new Meters();
    m.sprudel = 60;
    expect(m.burp(0.99)).toBe(false);
    expect(m.sprudel).toBe(60 - BURP.sprudelRelief);
    expect(m.kotz).toBe(0);
    expect(m.burp(0.0)).toBe(true);
    expect(m.kotz).toBe(BURP.failKotz);
  });

  it('Sprudel über 80 erhöht die Kotzleiste pro Sekunde', () => {
    const m = new Meters();
    m.sprudel = 95;
    m.update(1);
    expect(m.kotz).toBeGreaterThanOrEqual(METERS.sprudel.kotzPerSecondAboveDanger - 0.01);
  });

  it('Kotzgründe werden erkannt', () => {
    const m = new Meters();
    expect(m.checkVomit()).toBeNull();
    m.sprudel = 100; expect(m.checkVomit()).toBe('sprudel');
    m.sprudel = 0; m.misch = 100; expect(m.checkVomit()).toBe('misch');
    m.misch = 0; m.kotz = 100; expect(m.checkVomit()).toBe('kotz');
  });
});

describe('Scoring', () => {
  it('Titel und Score', () => {
    expect(titleFor(0.3, false)).toBe('Radler-Rookie');
    expect(titleFor(1.5, false)).toBe('Bierbank-Azubi');
    expect(titleFor(2.8, false)).toBe('Zeltkönig');
    expect(titleFor(4.0, false)).toBe('Wiesn-Legende');
    expect(titleFor(3.0, true)).toBe(SCORING.vomitTitle);
    expect(computeScore(2, true)).toBeCloseTo(2 * SCORING.vomitScoreFactor);
  });

  it('Uhr läuft von 18:00 bis 23:00', () => {
    expect(clockLabel(0)).toBe('18:00');
    expect(clockLabel(ROUND.durationSeconds / 2)).toBe('20:30');
    expect(clockLabel(ROUND.durationSeconds)).toBe('23:00');
  });
});

describe('GameState', () => {
  it('Zapfenstreich beendet die Runde nach der Rundenzeit', () => {
    const g = new GameState(42);
    const dt = ROUND.fixedStep;
    let guard = 0;
    while (g.phase === 'playing' && guard++ < 100000) {
      // Ohne Trinken bleibt man nüchtern – aber Essen hilft, falls was passiert
      g.meters.kotz = 0;
      g.step(dt, NO_COMMAND);
    }
    expect(g.phase).toBe('ended');
    expect(g.result?.reason).toBe('zapfenstreich');
  });

  it('Kotzleiste bei 100 beendet das Spiel mit Kotzen', () => {
    const g = new GameState(1);
    g.meters.kotz = 100;
    g.step(ROUND.fixedStep, NO_COMMAND);
    expect(g.result?.reason).toBe('vomit');
    const ev = g.events.drain().map((e) => e.type);
    expect(ev).toContain('vomit');
    expect(ev).toContain('gameEnd');
  });

  it('Prost-Event: Mittrinken gibt Bonus-Promille', () => {
    const g = new GameState(7);
    // Prost erzwingen
    let guard = 0;
    while (!g.prost.active && guard++ < 60 * 60) g.step(ROUND.fixedStep, NO_COMMAND);
    expect(g.prost.active).toBe(true);
    const before = g.meters.promille;
    g.step(ROUND.fixedStep, { ...NO_COMMAND, action: true });
    expect(g.meters.promille).toBeGreaterThan(before + EVENTS.prost.bonusPromille * 0.9);
    expect(g.stats.prosts).toBe(1);
  });

  it('Rülpsen hat einen Cooldown', () => {
    const g = new GameState(3);
    g.step(ROUND.fixedStep, { ...NO_COMMAND, burp: true });
    g.step(ROUND.fixedStep, { ...NO_COMMAND, burp: true });
    expect(g.stats.burps).toBe(1);
  });
});

describe('Simulation', () => {
  it('Bedienungen bleiben nicht dauerhaft hängen und liefern Getränke aus', () => {
    const g = new GameState(99);
    const dt = ROUND.fixedStep;
    let served = 0;
    // 60 s simulieren, Spieler nimmt alles, was eine Bedienung bringt
    for (let i = 0; i < 60 * 60; i++) {
      g.meters.kotz = 0; g.meters.sprudel = 0; g.meters.misch = 0;
      const action = g.focus?.type === 'waitress';
      if (action) served++;
      g.step(dt, { ...NO_COMMAND, action });
    }
    expect(served).toBeGreaterThan(0);
    const states = g.npcs.filter((n) => n.role === 'waitress').map((n) => n.state);
    expect(states.length).toBe(5);
  });
});
