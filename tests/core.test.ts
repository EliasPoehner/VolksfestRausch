import { describe, expect, it } from 'vitest';
import { BURP, DRINKS, EVENTS, FOODS, METERS, PLAYER, ROUND, SCORING, VOMIT } from '../src/config/balance';
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

describe('Magenfüllung & Getränke-Rollen', () => {
  it('Essen füllt den Magen und senkt nur wenig sofort', () => {
    const m = new Meters();
    m.kotz = 40;
    m.eat('hendl');
    expect(m.magen).toBe(FOODS.hendl.magen);
    expect(m.kotz).toBe(40 + FOODS.hendl.kotz);
  });

  it('Voller Magen dämpft Kotz und Alkoholaufnahme eines Getränks', () => {
    const empty = new Meters();
    const full = new Meters();
    full.magen = 100;
    empty.drink('mass', 0);
    full.drink('mass', 0);
    expect(full.kotz).toBeCloseTo(empty.kotz * (1 - METERS.magen.kotzReductionAtFull));
    expect(full.promille).toBeCloseTo(empty.promille * (1 - METERS.magen.absorptionSlowAtFull));
  });

  it('Magen wird verdaut', () => {
    const m = new Meters();
    m.magen = 50;
    m.update(10);
    expect(m.magen).toBeCloseTo(50 - METERS.magen.decayPerSecond * 10);
  });

  it('Steckerlfisch baut Mischmasch ab', () => {
    const m = new Meters();
    m.misch = 60;
    m.eat('steckerlfisch');
    expect(m.misch).toBe(60 + FOODS.steckerlfisch.misch);
  });

  it('Obstler: Kotz kommt verzögert, dafür sinkt der Sprudel', () => {
    const m = new Meters();
    m.sprudel = 30;
    m.drink('obstler', 0);
    expect(m.kotz).toBeCloseTo(DRINKS.obstler.kotz);
    expect(m.sprudel).toBe(30 + DRINKS.obstler.sprudel);
    m.update(3);
    expect(m.kotz).toBeGreaterThan(DRINKS.obstler.kotz + 5);
    m.update(20);
    expect(m.pendingKotz).toBe(0);
  });

  it('Nach dem Kotzen ist der Magen leer und Kotz wirkt stärker', () => {
    const m = new Meters();
    m.relieveAfterVomit(1);
    const calm = new Meters();
    m.drink('mass', 0);
    calm.drink('mass', 0);
    expect(m.kotz - VOMIT.kotzAfter[0]).toBeGreaterThan(calm.kotz);
    m.update(VOMIT.emptyStomachSeconds + 1);
    expect(m.emptyStomach).toBe(0);
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
    expect(computeScore(2, false, 1)).toBeCloseTo(2 * (1 - SCORING.perVomitPenalty));
    expect(computeScore(2, false, 99)).toBeCloseTo(2 * SCORING.minVomitFactor);
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

  it('Erstes Kotzen beendet das Spiel nicht, sondern wirft zurück', () => {
    const g = new GameState(1);
    g.meters.promille = 2;
    g.meters.kotz = 100;
    g.meters.magen = 80;
    g.step(ROUND.fixedStep, NO_COMMAND);
    expect(g.phase).toBe('playing');
    expect(g.stats.vomits).toBe(1);
    expect(g.isVomiting).toBe(true);
    expect(g.meters.kotz).toBe(VOMIT.kotzAfter[0]);
    expect(g.meters.promille).toBeLessThan(2 * VOMIT.promilleKeep + 0.01);
    expect(g.meters.magen).toBe(0);
    const ev = g.events.drain().map((e) => e.type);
    expect(ev).toContain('vomitSurvived');
    expect(ev).not.toContain('gameEnd');
  });

  it('Während des Kotzens ist man handlungsunfähig; Hämmern verkürzt, aber nicht unter das Minimum', () => {
    const g = new GameState(1);
    g.meters.kotz = 100;
    g.step(ROUND.fixedStep, NO_COMMAND);
    const pos = { ...g.player.pos };
    g.step(ROUND.fixedStep, { ...NO_COMMAND, move: { x: 1, y: 0 } });
    expect(g.player.pos).toEqual(pos);
    // Voll hämmern
    let steps = 0;
    while (g.isVomiting && steps++ < 600) g.step(ROUND.fixedStep, { ...NO_COMMAND, action: true });
    const stunDuration = steps * ROUND.fixedStep;
    expect(stunDuration).toBeGreaterThanOrEqual(VOMIT.minStunSeconds - 0.1);
    expect(stunDuration).toBeLessThan(VOMIT.stunSeconds);
    expect(g.events.drain().map((e) => e.type)).toContain('vomitRecovered');
    expect(g.player.slowTimer).toBeGreaterThan(0);
  });

  it('Ohne Hämmern dauert der Kontrollverlust die volle Zeit', () => {
    const g = new GameState(1);
    g.meters.kotz = 100;
    g.step(ROUND.fixedStep, NO_COMMAND);
    let steps = 0;
    while (g.isVomiting && steps++ < 600) g.step(ROUND.fixedStep, NO_COMMAND);
    expect(steps * ROUND.fixedStep).toBeGreaterThan(VOMIT.stunSeconds - 0.1);
  });

  it('Beim letzten erlaubten Kotzen kommt der Sanka', () => {
    const g = new GameState(1);
    g.stats.vomits = VOMIT.maxVomits - 1;
    g.meters.promille = 2;
    g.meters.kotz = 100;
    g.step(ROUND.fixedStep, NO_COMMAND);
    expect(g.phase).toBe('ended');
    expect(g.result?.reason).toBe('vomit');
    const ev = g.events.drain().map((e) => e.type);
    expect(ev).toContain('vomit');
    expect(ev).toContain('gameEnd');
  });

  it('Sekt verdoppelt das Prost, Jäger gibt Tempo', () => {
    const g = new GameState(5);
    g.player.prostBoostTimer = 10;
    let guard = 0;
    while (!g.prost.active && guard++ < 60 * 60) { g.player.prostBoostTimer = 10; g.step(ROUND.fixedStep, NO_COMMAND); }
    const before = g.meters.promille;
    g.step(ROUND.fixedStep, { ...NO_COMMAND, action: true });
    expect(g.meters.promille).toBeGreaterThan(before + EVENTS.prost.bonusPromille * 1.8);

    const h = new GameState(6);
    const x0 = h.player.pos.x;
    h.step(1 / 10, { ...NO_COMMAND, move: { x: 1, y: 0 } });
    const normal = h.player.pos.x - x0;
    const j = new GameState(6);
    j.player.boostTimer = 5;
    const x1 = j.player.pos.x;
    j.step(1 / 10, { ...NO_COMMAND, move: { x: 1, y: 0 } });
    expect(j.player.pos.x - x1).toBeCloseTo(normal * PLAYER.boostFactor, 3);
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
