import { describe, expect, it } from 'vitest';
import { ATTRACTIONS, BURP, DRINKS, EVENTS, FOODS, METERS, NPC_BEHAVIOR, PHASES, PLAYER, ROUND, SCORING, VOMIT } from '../src/config/balance';
import { BIERGARTEN } from '../src/config/world';
import { GameState, NO_COMMAND, eveningAt, lukasPowerAt } from '../src/core/GameState';
import { Meters } from '../src/core/Meters';
import { dist } from '../src/core/math';
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

  it('Rülpser im Sweet-Spot: mehr Sprudel-Abbau, weniger Kotz, nie daneben', () => {
    const m = new Meters();
    m.sprudel = 80; m.kotz = 20;
    const r = m.burp(0.0, (BURP.sweetStart + BURP.sweetEnd) / 2);
    expect(r).toEqual({ quality: 'perfect', failed: false });
    expect(m.sprudel).toBeCloseTo(80 - BURP.sprudelRelief * BURP.perfectFactor);
    expect(m.kotz).toBeCloseTo(20 - BURP.perfectKotzRelief);
  });

  it('Zu früh losgelassen: schwächer, Fehlrülpser möglich', () => {
    const m = new Meters();
    m.sprudel = 60;
    expect(m.burp(0.99, 0)).toEqual({ quality: 'weak', failed: false });
    expect(m.sprudel).toBeCloseTo(60 - BURP.sprudelRelief * BURP.weakMinFactor);
    expect(m.kotz).toBe(0);
    expect(m.burp(0.0, 0).failed).toBe(true);
    expect(m.kotz).toBe(BURP.failKotz);
  });

  it('Zu lange gehalten: immer Fehlrülpser, halbe Wirkung', () => {
    const m = new Meters();
    m.sprudel = 60;
    expect(m.burp(0.99, BURP.sweetEnd + 0.1)).toEqual({ quality: 'over', failed: true });
    expect(m.sprudel).toBeCloseTo(60 - BURP.sprudelRelief * BURP.overReliefFactor);
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

  it('R halten lädt auf, Loslassen im Sweet-Spot ergibt einen perfekten Rülpser', () => {
    const g = new GameState(3);
    g.meters.sprudel = 70;
    const steps = Math.round(((BURP.sweetStart + BURP.sweetEnd) / 2) / ROUND.fixedStep);
    for (let i = 0; i < steps; i++) g.step(ROUND.fixedStep, { ...NO_COMMAND, burpHeld: true });
    expect(g.player.burpCharging).toBe(true);
    expect(g.stats.burps).toBe(0);
    g.step(ROUND.fixedStep, NO_COMMAND);
    expect(g.player.burpCharging).toBe(false);
    expect(g.stats.perfectBurps).toBe(1);
    const e = g.events.drain().find((x) => x.type === 'burp');
    expect(e && e.type === 'burp' && e.quality).toBe('perfect');
  });

  it('Wer zu lange hält, rülpst automatisch daneben', () => {
    const g = new GameState(3);
    for (let i = 0; i < Math.ceil(BURP.autoReleaseAt / ROUND.fixedStep) + 2; i++) {
      g.step(ROUND.fixedStep, { ...NO_COMMAND, burpHeld: true });
    }
    expect(g.player.burpCharging).toBe(false);
    expect(g.stats.failedBurps).toBe(1);
  });

  it('Prost im Takt gibt mehr Promille und baut eine Combo auf', () => {
    const g = new GameState(11);
    const joinOnBeat = () => {
      let guard = 0;
      while (!g.prost.active && guard++ < 60 * 120) {
        g.meters.kotz = 0; g.meters.sprudel = 0; g.meters.misch = 0;
        g.step(ROUND.fixedStep, NO_COMMAND);
      }
      while (!g.prostOnBeat && g.prost.active) g.step(ROUND.fixedStep, NO_COMMAND);
      const before = g.meters.promille;
      g.step(ROUND.fixedStep, { ...NO_COMMAND, action: true });
      return (g.meters.promille - before) / g.meters.mods.promille;
    };
    const first = joinOnBeat();
    expect(first).toBeCloseTo(EVENTS.prost.bonusPromille * EVENTS.prost.onBeatFactor, 2);
    const second = joinOnBeat();
    expect(second).toBeCloseTo(EVENTS.prost.bonusPromille * EVENTS.prost.onBeatFactor * (1 + EVENTS.prost.comboStep), 2);
    expect(g.prostCombo).toBe(2);
    expect(g.stats.prostsOnBeat).toBe(2);
    expect(g.stats.maxProstCombo).toBe(2);
  });

  it('Prost neben dem Takt oder verpasst setzt die Combo zurück', () => {
    const g = new GameState(11);
    g.prostCombo = 3;
    let guard = 0;
    while (!g.prost.active && guard++ < 60 * 120) { g.meters.kotz = 0; g.step(ROUND.fixedStep, NO_COMMAND); }
    g.step(ROUND.fixedStep, { ...NO_COMMAND, action: true }); // sofort = vor dem ersten Schlag
    expect(g.prostCombo).toBe(0);
    g.prostCombo = 3;
    guard = 0;
    while (!g.prost.active && guard++ < 60 * 120) { g.meters.kotz = 0; g.step(ROUND.fixedStep, NO_COMMAND); }
    while (g.prost.active) g.step(ROUND.fixedStep, NO_COMMAND);
    expect(g.prostCombo).toBe(0);
  });

  it('Rülpsen hat einen Cooldown', () => {
    const g = new GameState(3);
    const tap = () => {
      g.step(ROUND.fixedStep, { ...NO_COMMAND, burpHeld: true });
      g.step(ROUND.fixedStep, NO_COMMAND);
    };
    tap();
    tap();
    expect(g.stats.burps).toBe(1);
  });
});

describe('Abend-Phasen', () => {
  const lastOrder = PHASES.find((p) => p.id === 'lastOrder')!;

  it('Die Phase richtet sich nach der Uhrzeit', () => {
    expect(eveningAt(18).id).toBe('gemuetlich');
    expect(eveningAt(19.99).id).toBe('gemuetlich');
    expect(eveningAt(20).id).toBe('stimmung');
    expect(eveningAt(21.5).id).toBe('stimmung');
    expect(eveningAt(22).id).toBe('lastOrder');
    expect(eveningAt(23).id).toBe('lastOrder');
  });

  it('Phasenwechsel kommen zur richtigen Uhrzeit, je genau einmal, und setzen die Modifikatoren', () => {
    const g = new GameState(5);
    expect(g.evening.id).toBe('gemuetlich');
    const changes: { phase: string; hour: number }[] = [];
    while (g.phase === 'playing') {
      g.meters.kotz = 0; g.meters.sprudel = 0; g.meters.misch = 0;
      g.step(ROUND.fixedStep, NO_COMMAND);
      for (const e of g.events.drain()) if (e.type === 'phaseChange') changes.push({ phase: e.phase, hour: g.hour });
    }
    expect(changes.map((c) => c.phase)).toEqual(['stimmung', 'lastOrder']);
    expect(changes[0].hour).toBeCloseTo(20, 1);
    expect(changes[1].hour).toBeCloseTo(22, 1);
    expect(g.meters.mods).toEqual({ promille: lastOrder.drinkPromilleFactor, kotz: lastOrder.drinkKotzFactor, liver: lastOrder.liverFactor });
  });

  it('Last Order: Getränke bringen mehr Promille und mehr Kotz', () => {
    const m = new Meters();
    m.mods = { promille: lastOrder.drinkPromilleFactor, kotz: lastOrder.drinkKotzFactor, liver: 1 };
    const gained = m.drink('mass', 0);
    expect(gained).toBeCloseTo(DRINKS.mass.promille * lastOrder.drinkPromilleFactor);
    expect(m.promille).toBeCloseTo(gained);
    expect(m.kotz).toBeCloseTo(DRINKS.mass.kotz * lastOrder.drinkKotzFactor);
  });

  it('Das Getränk-Event meldet die tatsächlich gewonnenen Promille', () => {
    const g = new GameState(3);
    g.meters.mods = { promille: 1.5, kotz: 1, liver: 1 };
    g.pickups.push({ id: 9999, kind: 'drink', drink: 'radler', pos: { ...g.player.pos }, source: 'field', ttl: 99 });
    g.step(ROUND.fixedStep, { ...NO_COMMAND, action: true });
    const e = g.events.drain().find((x) => x.type === 'drink');
    expect(e && e.type === 'drink' && e.promille).toBeCloseTo(DRINKS.radler.promille * 1.5);
  });

  it('Die Leber baut bei hohem Pegel schneller ab, die Phase verstärkt das', () => {
    const decay = (start: number, liver: number) => {
      const m = new Meters();
      m.promille = start; m.mods = { promille: 1, kotz: 1, liver };
      m.update(10);
      return start - m.promille;
    };
    expect(decay(1, 1)).toBeCloseTo((METERS.promille.decayPerSecond + METERS.promille.decayPerPromillePerSecond) * 10, 2);
    expect(decay(3, 1)).toBeGreaterThan(decay(1, 1));
    expect(decay(2, 1.25)).toBeGreaterThan(decay(2, 1));
  });
});

describe('Welt: Gegenmittel und Chancen', () => {
  /** Spieler direkt vor eine Attraktion stellen und E drücken */
  const use = (g: GameState, spot: { x: number; y: number }) => {
    g.player.pos = { ...spot };
    g.step(ROUND.fixedStep, NO_COMMAND);
    g.step(ROUND.fixedStep, { ...NO_COMMAND, action: true });
  };
  const runFor = (g: GameState, seconds: number) => {
    for (let i = 0; i < Math.round(seconds / ROUND.fixedStep); i++) g.step(ROUND.fixedStep, NO_COMMAND);
  };

  it('Dixi-Klo: erst Schlange, dann Erleichterung; man steht so lange still', () => {
    const g = new GameState(21);
    const d = g.dixis[0];
    use(g, d.door);
    expect(g.player.activity?.kind).toBe('dixi');
    g.meters.kotz = 60; g.meters.sprudel = 70;
    const pos = { ...g.player.pos };
    for (let i = 0; i < 30; i++) g.step(ROUND.fixedStep, { ...NO_COMMAND, move: { x: 1, y: 0 } });
    expect(g.player.pos).toEqual(pos);
    runFor(g, g.player.activity!.total);
    expect(g.player.activity).toBeNull();
    expect(g.stats.dixiVisits).toBe(1);
    expect(g.meters.kotz).toBeLessThan(60 + ATTRACTIONS.dixi.kotz + 5);
    expect(g.meters.sprudel).toBeLessThan(70 + ATTRACTIONS.dixi.sprudel + 1);
    expect(d.cooldown).toBeGreaterThan(0);
  });

  it('Die Dixi-Schlange wird mit jedem Besuch länger', () => {
    const g = new GameState(21);
    use(g, g.dixis[0].door);
    const first = g.player.activity!.queue;
    runFor(g, g.player.activity!.total + 0.1);
    use(g, g.dixis[1].door);
    expect(g.player.activity!.queue).toBeGreaterThan(first + ATTRACTIONS.dixi.queuePerVisit - (ATTRACTIONS.dixi.queueMax - ATTRACTIONS.dixi.queueMin));
  });

  it('Riesenrad: Kotz sinkt während der Fahrt', () => {
    const g = new GameState(21);
    const rad = g.attractions.find((a) => a.kind === 'riesenrad')!;
    use(g, rad.spot);
    expect(g.player.activity?.kind).toBe('riesenrad');
    g.meters.kotz = 70;
    runFor(g, ATTRACTIONS.riesenrad.rideSeconds + 0.1);
    expect(g.player.activity).toBeNull();
    expect(g.meters.kotz).toBeLessThan(70 + ATTRACTIONS.riesenrad.kotzPerSecond * ATTRACTIONS.riesenrad.rideSeconds * 0.7);
    expect(g.stats.riesenradRides).toBe(1);
  });

  it('Hau-den-Lukas: Nadel läuft hoch und runter und wird betrunken schneller', () => {
    const c = ATTRACTIONS.lukas;
    expect(lukasPowerAt(0, 0)).toBe(0);
    expect(lukasPowerAt(c.basePeriod / 2, 0)).toBeCloseTo(1);
    expect(lukasPowerAt(c.basePeriod, 0)).toBeCloseTo(0);
    const drunkPeriod = c.basePeriod / (1 + 2 * c.speedPerPromille);
    expect(lukasPowerAt(drunkPeriod / 2, 2)).toBeCloseTo(1);
  });

  it('Hau-den-Lukas: Glocke gibt ein Lebkuchenherz, mittlerer Schlag eine Freimaß', () => {
    const g = new GameState(21);
    const lukas = g.attractions.find((a) => a.kind === 'lukas')!;
    use(g, lukas.spot);
    while (g.lukasPower < ATTRACTIONS.lukas.bellAt) g.step(ROUND.fixedStep, NO_COMMAND);
    g.step(ROUND.fixedStep, { ...NO_COMMAND, action: true });
    expect(g.player.lebkuchenherz).toBe(true);
    expect(g.stats.lukasBells).toBe(1);
    lukas.cooldown = 0;
    const before = g.pickups.length;
    use(g, lukas.spot);
    while (g.lukasPower < ATTRACTIONS.lukas.prizeAt) g.step(ROUND.fixedStep, NO_COMMAND);
    g.step(ROUND.fixedStep, { ...NO_COMMAND, action: true });
    // schon ein Herz → auch die Glocke gibt "nur" eine Freimaß
    expect(g.pickups.length).toBeGreaterThan(before);
  });

  it('Das Lebkuchenherz rettet einmal vor dem Sanka', () => {
    const g = new GameState(21);
    g.player.lebkuchenherz = true;
    g.stats.vomits = VOMIT.maxVomits - 1;
    g.meters.kotz = 100;
    g.step(ROUND.fixedStep, NO_COMMAND);
    expect(g.phase).toBe('playing');
    expect(g.player.lebkuchenherz).toBe(false);
    expect(g.stats.heartSaves).toBe(1);
    expect(g.stats.vomits).toBe(VOMIT.maxVomits - 1);
    runFor(g, VOMIT.stunSeconds + 0.1);
    g.meters.kotz = 100;
    g.step(ROUND.fixedStep, NO_COMMAND);
    expect(g.phase).toBe('ended');
  });

  it('Familien gehen ab 20 Uhr heim und verschwinden', () => {
    const g = new GameState(21);
    const families = () => g.npcs.filter((n) => n.family).length;
    expect(families()).toBe(NPC_BEHAVIOR.family.count * 2);
    g.elapsed = ROUND.durationSeconds * 0.4;
    let gone = 0;
    for (let i = 0; i < 60 * 70; i++) {
      g.meters.kotz = 0; g.meters.sprudel = 0; g.meters.misch = 0;
      g.step(ROUND.fixedStep, NO_COMMAND);
      gone += g.events.drain().filter((e) => e.type === 'npcGone').length;
      if (families() === 0) break;
    }
    expect(g.evening.id).not.toBe('gemuetlich');
    expect(gone).toBeGreaterThan(NPC_BEHAVIOR.family.count);
  });

  it('Security schiebt Betrunkene aus dem Biergarten, Nüchterne nicht', () => {
    const g = new GameState(21);
    const sec = g.npcs.find((n) => n.role === 'security')!;
    const spot = { x: BIERGARTEN.x + BIERGARTEN.w / 2, y: BIERGARTEN.y + 20 };
    sec.pos = { x: spot.x + 30, y: spot.y };
    g.player.pos = { ...spot };
    g.meters.promille = 1;
    g.step(ROUND.fixedStep, NO_COMMAND);
    expect(g.stats.securityPushes).toBe(0);
    g.meters.promille = NPC_BEHAVIOR.security.promille + 0.3;
    sec.pos = { x: g.player.pos.x + 30, y: g.player.pos.y };
    g.step(ROUND.fixedStep, NO_COMMAND);
    expect(g.stats.securityPushes).toBe(1);
  });

  it('Rempler verschütten Bier, danach ist man kurz sicher', () => {
    const g = new GameState(21);
    const n = g.npcs.find((x) => x.role === 'visitor' && !x.family)!;
    n.drunk = true;
    g.meters.promille = 1;
    n.pos = { x: g.player.pos.x + 20, y: g.player.pos.y };
    g.step(ROUND.fixedStep, NO_COMMAND);
    expect(g.stats.rempler).toBe(1);
    expect(g.meters.promille).toBeLessThan(1);
    const other = g.npcs.find((x) => x.role === 'visitor' && !x.family && x.id !== n.id)!;
    other.drunk = true;
    other.pos = { x: g.player.pos.x + 20, y: g.player.pos.y };
    g.step(ROUND.fixedStep, NO_COMMAND);
    expect(g.stats.rempler).toBe(1);
  });

  it('Bierleichen liegen im Weg', () => {
    const g = new GameState(21);
    const n = g.npcs.find((x) => x.role === 'visitor' && !x.family)!;
    n.state = 'down'; n.timer = 30;
    n.pos = { x: g.player.pos.x + 60, y: g.player.pos.y };
    for (let i = 0; i < 60; i++) g.step(ROUND.fixedStep, { ...NO_COMMAND, move: { x: 1, y: 0 } });
    expect(dist(g.player.pos, n.pos)).toBeGreaterThanOrEqual(PLAYER.radius + NPC_BEHAVIOR.bierleiche.radius - 0.5);
  });
});

describe('Rülps-Duell', () => {
  const startDuel = (seed = 31) => {
    const g = new GameState(seed);
    g.elapsed = ROUND.durationSeconds * 0.41; // Stimmung
    let guard = 0;
    while (!g.duel.active && guard++ < 60 * 90) {
      g.meters.kotz = 0; g.meters.sprudel = 0; g.meters.misch = 0;
      g.step(ROUND.fixedStep, NO_COMMAND);
    }
    return g;
  };
  const burp = (g: GameState, seconds: number) => {
    for (let i = 0; i < Math.round(seconds / ROUND.fixedStep); i++) g.step(ROUND.fixedStep, { ...NO_COMMAND, burpHeld: true });
    g.step(ROUND.fixedStep, NO_COMMAND);
  };

  it('Ab der Stimmung fordert ein Besucher heraus, der Rülpser ist sofort bereit', () => {
    const g = startDuel();
    expect(g.duel.active).toBe(true);
    expect(g.burpReady).toBe(true);
    expect(g.prost.active).toBe(false);
  });

  it('Perfekter Rülpser gewinnt eine Freimaß', () => {
    const g = startDuel();
    const before = new Set(g.pickups.map((p) => p.id));
    burp(g, (BURP.sweetStart + BURP.sweetEnd) / 2);
    expect(g.duel.active).toBe(false);
    expect(g.stats.duelsWon).toBe(1);
    const prize = g.pickups.filter((p) => !before.has(p.id) && dist(p.pos, g.player.pos) < 80);
    expect(prize.map((p) => p.drink)).toEqual(['mass']);
  });

  it('Zu lang gehalten verliert, verpasst auch', () => {
    const g = startDuel();
    burp(g, BURP.sweetEnd + 0.2);
    expect(g.stats.duelsWon).toBe(0);
    const h = startDuel(32);
    while (h.duel.active) h.step(ROUND.fixedStep, NO_COMMAND);
    expect(h.stats.duelsWon).toBe(0);
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
