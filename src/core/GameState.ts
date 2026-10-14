/**
 * GameState – das Herz des Spiels.
 *
 * Enthält die komplette Spiellogik OHNE Phaser-Abhängigkeit:
 * Spieler, NPCs, Pickups, Buden, Gefahren, Leisten, Uhr, Events.
 *
 * Nutzung durch einen Renderer:
 *   const game = new GameState();
 *   // pro fester Zeitschritt:
 *   game.step(dt, command);
 *   // pro Frame:
 *   for (const e of game.events.drain()) { ... Effekte abspielen ... }
 *   ... game.player / game.npcs / game.pickups / game.meters darstellen ...
 *
 * Der Renderer darf den Zustand LESEN, aber nicht verändern.
 */
import {
  BURP, DRINKS, DRUNK, EVENTS, FOODS, HAZARDS, LINES, PLAYER, ROUND, SPAWNS, VOMIT,
  type DrinkId, type FoodId,
} from '../config/balance';
import {
  BENCHES, BENCH_SLOTS, BOOTHS, BOOTH_COUNTER_OFFSET, BUMPER_ARENA, CAROUSEL, CAROUSEL_POLE_RADIUS,
  PLAYER_START, TENT, TENT_DOOR, WORLD,
} from '../config/world';
import {
  PLAYER_ID, type BenchSlot, type Booth, type BumperCar, type GameResult, type GameStats,
  type InteractionFocus, type Npc, type Pickup, type Player, type ProstState,
} from './entities';
import { EventQueue, type VomitCause } from './events';
import {
  Rng, clamp, clampLength1, dist, normalize, pointInRect, pushCircleOutOfCircle, pushCircleOutOfRect,
  type Rect, type Vec2,
} from './math';
import { Meters } from './Meters';
import { clockHour, clockLabel, computeScore, titleFor } from './scoring';

/** Eingabe für einen Logik-Schritt – vom Input-Modul geliefert. */
export interface PlayerCommand {
  /** Laufrichtung, Länge 0..1 */
  move: Vec2;
  /** E / Leertaste / Touch-Button wurde in diesem Schritt gedrückt */
  action: boolean;
  /** R / Touch-Button wurde in diesem Schritt gedrückt */
  burp: boolean;
}

export const NO_COMMAND: PlayerCommand = { move: { x: 0, y: 0 }, action: false, burp: false };

export type GamePhase = 'playing' | 'ended';

const NPC_RADIUS = 14;

export class GameState {
  readonly events = new EventQueue();
  readonly meters = new Meters();
  readonly rng: Rng;

  phase: GamePhase = 'playing';
  /** Verstrichene Spielzeit in Sekunden */
  elapsed = 0;
  result: GameResult | null = null;

  readonly player: Player;
  readonly npcs: Npc[] = [];
  readonly pickups: Pickup[] = [];
  readonly booths: Booth[] = [];
  readonly benchSlots: BenchSlot[] = [];
  readonly bumperCars: BumperCar[] = [];
  /** Feste Hindernisse (Zelt, Buden, Bänke) */
  readonly solids: Rect[] = [];

  focus: InteractionFocus | null = null;
  prost: ProstState = { active: false, npcId: -1, timeLeft: 0 };
  /** Aktueller Winkel des Karussells (Renderer dreht die Grafik mit) */
  carouselAngle = 0;
  /** Aktueller Drift-Vektor (für Debug/Renderer, z. B. Schwank-Animation) */
  drift: Vec2 = { x: 0, y: 0 };

  readonly stats: GameStats = { drinks: 0, foods: 0, burps: 0, failedBurps: 0, prosts: 0, maxPromille: 0, vomits: 0 };

  private nextId = 1;
  private fieldSpawnTimer = 0;
  private nextProstIn: number;
  private lastHour = ROUND.startHour;
  private playerLineTimer = 8;
  private wasWarning = false;

  constructor(seed = Date.now()) {
    this.rng = new Rng(seed);
    this.player = {
      id: PLAYER_ID, pos: { ...PLAYER_START }, vel: { x: 0, y: 0 }, facing: -Math.PI / 2,
      slowTimer: 0, invertTimer: 0, onCarousel: false, spin: 0, burpCooldown: 0,
      boostTimer: 0, prostBoostTimer: 0, vomitTimer: 0, vomitElapsed: 0,
    };
    this.nextProstIn = this.rng.range(EVENTS.prost.minInterval * 0.5, EVENTS.prost.maxInterval * 0.6);
    this.buildWorld();
  }

  // -------------------------------------------------------------------------
  // Aufbau
  // -------------------------------------------------------------------------

  private buildWorld(): void {
    this.solids.push(TENT);

    for (const b of BOOTHS) {
      this.solids.push(b.rect);
      this.booths.push({
        id: this.nextId++, kind: b.kind, rect: b.rect, cooldown: 0,
        counter: { x: b.rect.x + b.rect.w / 2, y: b.rect.y + b.rect.h + BOOTH_COUNTER_OFFSET },
      });
    }

    BENCHES.forEach((bench, benchIndex) => {
      this.solids.push(bench);
      for (let s = 0; s < BENCH_SLOTS; s++) {
        const slot: BenchSlot = {
          benchIndex,
          pos: { x: bench.x + (bench.w / (BENCH_SLOTS + 1)) * (s + 1), y: bench.y + bench.h / 2 },
          pickupId: null,
          refillTimer: this.rng.range(0, SPAWNS.benchRefillSeconds),
        };
        this.benchSlots.push(slot);
      }
    });

    for (let i = 0; i < SPAWNS.visitors; i++) {
      const pos = this.randomWalkablePoint();
      this.npcs.push(this.makeNpc('visitor', pos));
    }
    for (let i = 0; i < SPAWNS.waitresses; i++) {
      const w = this.makeNpc('waitress', { x: TENT_DOOR.x + this.rng.range(-80, 80), y: TENT_DOOR.y });
      w.state = 'refill';
      w.timer = this.rng.range(0.5, SPAWNS.waitressRefillSeconds * 2);
      w.speed = SPAWNS.waitressSpeed;
      this.npcs.push(w);
    }

    for (let i = 0; i < HAZARDS.bumperCar.count; i++) {
      const a = this.rng.range(0, Math.PI * 2);
      this.bumperCars.push({
        id: this.nextId++,
        pos: {
          x: BUMPER_ARENA.x + 40 + this.rng.range(0, BUMPER_ARENA.w - 80),
          y: BUMPER_ARENA.y + 40 + this.rng.range(0, BUMPER_ARENA.h - 80),
        },
        vel: { x: Math.cos(a) * HAZARDS.bumperCar.speed, y: Math.sin(a) * HAZARDS.bumperCar.speed },
        radius: 24, variant: i, hitCooldown: 0,
      });
    }

    // Ein paar Pickups von Anfang an
    for (let i = 0; i < 6; i++) this.spawnFieldPickup();
  }

  private makeNpc(role: Npc['role'], pos: Vec2): Npc {
    return {
      id: this.nextId++, role, pos: { ...pos }, target: { ...pos },
      speed: SPAWNS.visitorSpeed * this.rng.range(0.7, 1.3),
      variant: this.rng.int(0, 8), facing: 0, moving: false,
      timer: this.rng.range(0, 3), chatterTimer: this.rng.range(EVENTS.npcChatterMin, EVENTS.npcChatterMax * 3),
      stuckTimer: 0, carrying: null, state: 'idle',
    };
  }

  /** Zufälliger Punkt auf der Wiese, der nicht in Hindernissen/Fahrgeschäften liegt. */
  randomWalkablePoint(margin = 30): Vec2 {
    for (let tries = 0; tries < 60; tries++) {
      const p = {
        x: this.rng.range(WORLD.border + margin, WORLD.width - WORLD.border - margin),
        y: this.rng.range(WORLD.border + margin, WORLD.height - WORLD.border - margin),
      };
      if (this.isFreeSpot(p, margin)) return p;
    }
    return { ...PLAYER_START };
  }

  private isFreeSpot(p: Vec2, margin: number): boolean {
    for (const s of this.solids) {
      if (pointInRect(p, { x: s.x - margin, y: s.y - margin, w: s.w + margin * 2, h: s.h + margin * 2 })) return false;
    }
    if (dist(p, CAROUSEL) < CAROUSEL.r + margin) return false;
    if (pointInRect(p, { x: BUMPER_ARENA.x - margin, y: BUMPER_ARENA.y - margin, w: BUMPER_ARENA.w + margin * 2, h: BUMPER_ARENA.h + margin * 2 })) return false;
    return true;
  }

  // -------------------------------------------------------------------------
  // Öffentliche Abfragen
  // -------------------------------------------------------------------------

  get clock(): string { return clockLabel(this.elapsed); }
  get hour(): number { return clockHour(this.elapsed); }
  get timeLeft(): number { return Math.max(0, ROUND.durationSeconds - this.elapsed); }
  get isWarning(): boolean { return this.meters.isWarning && this.phase === 'playing'; }
  get burpReady(): boolean { return this.player.burpCooldown <= 0; }
  get controlsInverted(): boolean { return this.player.invertTimer > 0; }
  /** Kontrollverlust nach dem Kotzen */
  get isVomiting(): boolean { return this.player.vomitTimer > 0; }
  /** Wie oft man noch kotzen darf, bevor der Sanka kommt (inkl. dem letzten, tödlichen Mal) */
  get vomitsLeft(): number { return Math.max(0, VOMIT.maxVomits - this.stats.vomits); }

  findNpc(id: number): Npc | undefined { return this.npcs.find((n) => n.id === id); }

  // -------------------------------------------------------------------------
  // Haupt-Update (fester Zeitschritt)
  // -------------------------------------------------------------------------

  step(dt: number, cmd: PlayerCommand): void {
    if (this.phase !== 'playing') return;
    this.elapsed += dt;

    this.updatePlayer(dt, cmd);
    this.updateHazards(dt);
    this.updateNpcs(dt);
    this.updateSpawns(dt);
    this.updateFocus();
    this.handleActions(cmd);
    this.updateProst(dt);
    this.meters.update(dt);
    this.updateMood(dt);
    this.updateClock();
    this.stats.maxPromille = Math.max(this.stats.maxPromille, this.meters.promille);
    this.checkEnd();
  }

  // --- Spieler -------------------------------------------------------------

  private updatePlayer(dt: number, cmd: PlayerCommand): void {
    const p = this.player;
    const promille = this.meters.promille;
    p.burpCooldown = Math.max(0, p.burpCooldown - dt);
    p.slowTimer = Math.max(0, p.slowTimer - dt);
    p.invertTimer = Math.max(0, p.invertTimer - dt);
    p.boostTimer = Math.max(0, p.boostTimer - dt);
    p.prostBoostTimer = Math.max(0, p.prostBoostTimer - dt);

    // Kontrollverlust nach dem Kotzen: kein Laufen, Tasten hämmern verkürzt ihn
    if (p.vomitTimer > 0) {
      p.vomitElapsed += dt;
      p.vomitTimer = Math.max(0, p.vomitTimer - dt);
      p.vel = { x: 0, y: 0 };
      if (p.vomitTimer <= 0) this.endVomitStun();
      return;
    }

    let move = clampLength1(cmd.move);

    // Ab 2,5 ‰: gelegentlich vertauschte Richtungen
    if (promille >= DRUNK.invertThreshold && p.invertTimer <= 0 && this.rng.chance(DRUNK.invertChancePerSecond * dt)) {
      p.invertTimer = DRUNK.invertDurationSeconds;
      this.events.push({ type: 'controlsInverted' });
    }
    if (p.invertTimer > 0) move = { x: -move.x, y: -move.y };

    // Ab 1,5 ‰: Drift (langsames, "organisches" Schwanken über Sinuswellen)
    const driftStrength = promille >= DRUNK.driftThreshold
      ? Math.min(DRUNK.driftMax, (promille - DRUNK.driftThreshold + 0.3) * DRUNK.driftPerPromille)
      : 0;
    const t = this.elapsed;
    this.drift = {
      x: (Math.sin(t * 0.9) + Math.sin(t * 2.3 + 1.7) * 0.5) / 1.5 * driftStrength,
      y: (Math.cos(t * 0.7 + 0.4) + Math.sin(t * 1.9) * 0.5) / 1.5 * driftStrength,
    };
    const moving = move.x !== 0 || move.y !== 0;
    const driftScale = moving ? 1 : 0.3;
    const dir = { x: move.x + this.drift.x * driftScale, y: move.y + this.drift.y * driftScale };

    const speed = PLAYER.speed * (p.slowTimer > 0 ? PLAYER.slowFactor : 1) * (p.boostTimer > 0 ? PLAYER.boostFactor : 1);
    p.vel = { x: dir.x * speed, y: dir.y * speed };
    p.pos.x += p.vel.x * dt;
    p.pos.y += p.vel.y * dt;
    if (moving) p.facing = Math.atan2(move.y, move.x);

    this.collideWithWorld(p.pos, PLAYER.radius);
  }

  private collideWithWorld(pos: Vec2, radius: number): boolean {
    let hit = false;
    for (const s of this.solids) hit = pushCircleOutOfRect(pos, radius, s) || hit;
    hit = pushCircleOutOfCircle(pos, radius, CAROUSEL, CAROUSEL_POLE_RADIUS) || hit;
    const b = WORLD.border + radius;
    const cx = clamp(pos.x, b, WORLD.width - b);
    const cy = clamp(pos.y, b, WORLD.height - b);
    if (cx !== pos.x || cy !== pos.y) hit = true;
    pos.x = cx; pos.y = cy;
    return hit;
  }

  // --- Gefahren ------------------------------------------------------------

  private updateHazards(dt: number): void {
    const p = this.player;
    this.carouselAngle += HAZARDS.carousel.angularSpeed * dt;

    // Karussell: mitdrehen + Kotz-Anstieg
    const dc = dist(p.pos, CAROUSEL);
    const on = dc < CAROUSEL.r;
    if (on && !p.onCarousel) {
      this.events.push({ type: 'carouselEnter' });
      this.say(PLAYER_ID, 'Huiiii!');
    }
    p.onCarousel = on;
    if (on) {
      const a = Math.atan2(p.pos.y - CAROUSEL.y, p.pos.x - CAROUSEL.x) + HAZARDS.carousel.angularSpeed * dt;
      p.pos.x = CAROUSEL.x + Math.cos(a) * dc;
      p.pos.y = CAROUSEL.y + Math.sin(a) * dc;
      p.spin += HAZARDS.carousel.angularSpeed * 2.5 * dt;
      this.meters.addKotz(HAZARDS.carousel.kotzPerSecond * dt);
      this.collideWithWorld(p.pos, PLAYER.radius);
    } else {
      // Drehung langsam auslaufen lassen (auf das nächste Vielfache von 2π)
      const target = Math.round(p.spin / (Math.PI * 2)) * Math.PI * 2;
      p.spin += (target - p.spin) * Math.min(1, dt * 4);
    }

    // Autoscooter
    const a = BUMPER_ARENA;
    for (const car of this.bumperCars) {
      car.hitCooldown = Math.max(0, car.hitCooldown - dt);
      // leichte Zufallslenkung
      if (this.rng.chance(dt * 0.8)) {
        const ang = Math.atan2(car.vel.y, car.vel.x) + this.rng.range(-1.2, 1.2);
        car.vel = { x: Math.cos(ang) * HAZARDS.bumperCar.speed, y: Math.sin(ang) * HAZARDS.bumperCar.speed };
      }
      car.pos.x += car.vel.x * dt;
      car.pos.y += car.vel.y * dt;
      if (car.pos.x < a.x + car.radius) { car.pos.x = a.x + car.radius; car.vel.x = Math.abs(car.vel.x); }
      if (car.pos.x > a.x + a.w - car.radius) { car.pos.x = a.x + a.w - car.radius; car.vel.x = -Math.abs(car.vel.x); }
      if (car.pos.y < a.y + car.radius) { car.pos.y = a.y + car.radius; car.vel.y = Math.abs(car.vel.y); }
      if (car.pos.y > a.y + a.h - car.radius) { car.pos.y = a.y + a.h - car.radius; car.vel.y = -Math.abs(car.vel.y); }

      const d = dist(car.pos, p.pos);
      if (d < car.radius + PLAYER.radius && car.hitCooldown <= 0) {
        car.hitCooldown = 0.8;
        const n = normalize({ x: p.pos.x - car.pos.x, y: p.pos.y - car.pos.y });
        const k = HAZARDS.bumperCar.knockback * 0.12;
        p.pos.x += n.x * k; p.pos.y += n.y * k;
        car.vel = { x: -n.x * HAZARDS.bumperCar.speed, y: -n.y * HAZARDS.bumperCar.speed };
        this.meters.addKotz(HAZARDS.bumperCar.kotzOnHit);
        this.events.push({ type: 'bump', pos: { ...p.pos } });
        this.say(PLAYER_ID, this.rng.pick(['Hoppla!', 'Obacht!', 'Au weh!']));
        this.collideWithWorld(p.pos, PLAYER.radius);
      }
    }
  }

  // --- NPCs ----------------------------------------------------------------

  private updateNpcs(dt: number): void {
    for (const n of this.npcs) {
      n.timer -= dt;
      n.chatterTimer -= dt;

      if (n.role === 'visitor') this.updateVisitor(n);
      else this.updateWaitress(n, dt);

      // Bewegung zum Ziel
      const dx = n.target.x - n.pos.x, dy = n.target.y - n.pos.y;
      const d = Math.hypot(dx, dy);
      const shouldMove = n.state !== 'idle' && n.state !== 'refill' && n.state !== 'wait' && d > 4;
      n.moving = shouldMove;
      if (shouldMove) {
        const step = Math.min(d, n.speed * dt);
        const before = { ...n.pos };
        n.pos.x += (dx / d) * step;
        n.pos.y += (dy / d) * step;
        n.facing = Math.atan2(dy, dx);
        this.collideWithWorld(n.pos, NPC_RADIUS);
        // Festgehangen? Neues Ziel suchen.
        const moved = Math.hypot(n.pos.x - before.x, n.pos.y - before.y);
        n.stuckTimer = moved < step * 0.3 ? n.stuckTimer + dt : 0;
        if (n.stuckTimer > 1.2) {
          n.stuckTimer = 0;
          if (n.role === 'visitor') n.target = this.randomWalkablePoint();
          else if (n.state === 'deliver' || n.state === 'toTent') {
            // Bedienung hängt fest: kurzer Umweg, danach weiter wie geplant
            n.state = n.carrying ? 'roam' : 'toTent';
            n.target = { x: n.pos.x + this.rng.range(-160, 160), y: n.pos.y + this.rng.range(60, 160) };
            n.timer = 1.5;
          } else n.target = this.randomWalkablePoint();
        }
      }

      // Zufällige Sprechblasen
      if (n.chatterTimer <= 0) {
        n.chatterTimer = this.rng.range(EVENTS.npcChatterMin, EVENTS.npcChatterMax) * (SPAWNS.visitors / 6);
        if (dist(n.pos, this.player.pos) < 520) {
          this.say(n.id, n.role === 'waitress' && n.carrying ? 'Maß gefällig?' : this.rng.pick(LINES.npc));
        }
      }
    }
  }

  private updateVisitor(n: Npc): void {
    const arrived = dist(n.pos, n.target) <= 4;
    if (n.state === 'walk' && arrived) {
      n.state = 'idle';
      n.timer = this.rng.range(1, 5);
    } else if (n.state === 'idle' && n.timer <= 0) {
      n.state = 'walk';
      n.target = this.randomWalkablePoint();
    }
  }

  private updateWaitress(n: Npc, _dt: number): void {
    const p = this.player.pos;
    switch (n.state) {
      case 'toTent':
        // timer > 0: gerade auf einem Umweg (siehe Festhänge-Erkennung)
        if (n.timer <= 0) n.target = { ...TENT_DOOR };
        if (dist(n.pos, TENT_DOOR) < 12) { n.state = 'refill'; n.timer = SPAWNS.waitressRefillSeconds; }
        break;
      case 'refill':
        if (n.timer <= 0) {
          n.carrying = this.randomDrink(true);
          if (this.rng.chance(0.55)) {
            n.state = 'deliver';
          } else {
            n.state = 'roam';
            n.target = this.randomWalkablePoint();
          }
        }
        break;
      case 'deliver': {
        // Zum Spieler laufen (mit kleinem Abstand)
        const off = normalize({ x: n.pos.x - p.x, y: n.pos.y - p.y });
        n.target = { x: p.x + off.x * 44, y: p.y + off.y * 44 };
        if (dist(n.pos, p) < 60) {
          n.state = 'wait';
          n.timer = 7;
          this.say(n.id, 'Maß gefällig?');
        }
        break;
      }
      case 'wait':
        if (n.timer <= 0 || dist(n.pos, p) > 220) { n.state = 'roam'; n.target = this.randomWalkablePoint(); }
        break;
      case 'roam':
        if (dist(n.pos, n.target) <= 6) {
          n.state = this.rng.chance(0.6) ? 'deliver' : 'roam';
          if (n.state === 'roam') n.target = this.randomWalkablePoint();
        }
        break;
      default:
        n.state = 'toTent';
    }
    if (!n.carrying && n.state !== 'refill') n.state = 'toTent';
  }

  // --- Spawns --------------------------------------------------------------

  private randomDrink(waitress = false): DrinkId {
    const list = Object.values(DRINKS);
    // Bedienungen bringen bevorzugt Bier
    return this.rng.weighted(list, (d) => d.spawnWeight * (waitress && (d.id === 'mass' || d.id === 'weissbier' || d.id === 'radler') ? 3 : 1)).id;
  }

  private randomFood(): FoodId {
    return this.rng.weighted(Object.values(FOODS), (f) => f.spawnWeight).id;
  }

  private spawnFieldPickup(): void {
    const isDrink = this.rng.chance(SPAWNS.drinkShare);
    const pos = this.randomWalkablePoint(24);
    this.pickups.push({
      id: this.nextId++, kind: isDrink ? 'drink' : 'food',
      drink: isDrink ? this.randomDrink() : undefined,
      food: isDrink ? undefined : this.randomFood(),
      pos, source: 'field', ttl: SPAWNS.fieldPickupLifetime * this.rng.range(0.8, 1.2),
    });
  }

  private updateSpawns(dt: number): void {
    // Wiesen-Pickups altern lassen
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      if (pk.source === 'field') {
        pk.ttl -= dt;
        if (pk.ttl <= 0) this.pickups.splice(i, 1);
      }
    }
    const fieldCount = this.pickups.filter((p) => p.source === 'field').length;
    this.fieldSpawnTimer -= dt;
    if (this.fieldSpawnTimer <= 0 && fieldCount < SPAWNS.maxFieldPickups) {
      this.fieldSpawnTimer = SPAWNS.fieldSpawnInterval;
      this.spawnFieldPickup();
    }

    // Bierbänke nachfüllen
    for (const slot of this.benchSlots) {
      if (slot.pickupId !== null) continue;
      slot.refillTimer -= dt;
      if (slot.refillTimer <= 0) {
        const pk: Pickup = {
          id: this.nextId++, kind: 'drink', drink: this.randomDrink(), pos: { ...slot.pos }, source: 'bench', ttl: Infinity,
        };
        this.pickups.push(pk);
        slot.pickupId = pk.id;
      }
    }

    for (const b of this.booths) b.cooldown = Math.max(0, b.cooldown - dt);
  }

  // --- Interaktion ---------------------------------------------------------

  private updateFocus(): void {
    const pp = this.player.pos;
    let best: InteractionFocus | null = null;
    if (this.isVomiting) { this.focus = null; return; }
    let bestD = PLAYER.interactRadius;

    if (this.prost.active) {
      const npc = this.findNpc(this.prost.npcId);
      this.focus = { type: 'prost', id: this.prost.npcId, pos: npc ? { ...npc.pos } : { ...pp }, label: 'Mittrinken!' };
      return;
    }

    for (const pk of this.pickups) {
      const d = dist(pp, pk.pos);
      if (d < bestD) {
        bestD = d;
        const label = pk.kind === 'drink' ? DRINKS[pk.drink!].name : FOODS[pk.food!].name;
        best = { type: 'pickup', id: pk.id, pos: pk.pos, label };
      }
    }
    for (const b of this.booths) {
      const d = dist(pp, b.counter);
      if (d < bestD + 10 && b.cooldown <= 0) {
        bestD = d;
        best = { type: 'booth', id: b.id, pos: b.counter, label: FOODS[b.kind].name };
      }
    }
    for (const n of this.npcs) {
      if (n.role !== 'waitress' || !n.carrying) continue;
      const d = dist(pp, n.pos);
      if (d < bestD + 8) {
        bestD = d;
        best = { type: 'waitress', id: n.id, pos: n.pos, label: DRINKS[n.carrying].name };
      }
    }
    this.focus = best;
  }

  private handleActions(cmd: PlayerCommand): void {
    // Beim Kotzen: Aktion = "Reiß di zam!" (verkürzt den Kontrollverlust), sonst nichts
    if (this.isVomiting) {
      if (cmd.action) {
        const p = this.player;
        const floor = Math.max(0, VOMIT.minStunSeconds - p.vomitElapsed);
        p.vomitTimer = Math.max(p.vomitTimer - VOMIT.mashShorten, floor);
        if (p.vomitTimer <= 0) this.endVomitStun();
      }
      return;
    }
    if (cmd.burp) this.tryBurp();
    if (!cmd.action) return;

    // "Prost!" hat Vorrang
    if (this.prost.active) {
      const boost = this.player.prostBoostTimer > 0 ? 2 : 1;
      this.meters.prost(EVENTS.prost.bonusPromille * boost, EVENTS.prost.sprudel, EVENTS.prost.kotz);
      this.stats.prosts++;
      this.stats.drinks++;
      this.prost = { active: false, npcId: -1, timeLeft: 0 };
      this.events.push({ type: 'drink', drink: 'mass', pos: { ...this.player.pos }, viaProst: true });
      this.events.push({ type: 'prostEnd', joined: true });
      this.say(PLAYER_ID, 'Prooost!');
      return;
    }

    const f = this.focus;
    if (!f) return;
    if (f.type === 'pickup') {
      const idx = this.pickups.findIndex((p) => p.id === f.id);
      if (idx < 0) return;
      const pk = this.pickups[idx];
      this.pickups.splice(idx, 1);
      if (pk.source === 'bench') {
        const slot = this.benchSlots.find((s) => s.pickupId === pk.id);
        if (slot) { slot.pickupId = null; slot.refillTimer = SPAWNS.benchRefillSeconds * this.rng.range(0.7, 1.4); }
      }
      if (pk.kind === 'drink') this.consumeDrink(pk.drink!);
      else this.consumeFood(pk.food!);
    } else if (f.type === 'booth') {
      const b = this.booths.find((x) => x.id === f.id);
      if (!b || b.cooldown > 0) return;
      b.cooldown = SPAWNS.boothCooldownSeconds;
      this.consumeFood(b.kind);
    } else if (f.type === 'waitress') {
      const n = this.findNpc(f.id);
      if (!n || !n.carrying) return;
      const drink = n.carrying;
      n.carrying = null;
      n.state = 'toTent';
      n.timer = 0;
      this.say(n.id, 'Wohl bekomm\'s!');
      this.consumeDrink(drink);
    }
    this.focus = null;
  }

  private consumeDrink(id: DrinkId): void {
    this.meters.drink(id, this.elapsed);
    const d = DRINKS[id];
    if (d.speedBoostSeconds) this.player.boostTimer = d.speedBoostSeconds;
    if (d.prostBoostSeconds) this.player.prostBoostTimer = d.prostBoostSeconds;
    this.stats.drinks++;
    this.events.push({ type: 'drink', drink: id, pos: { ...this.player.pos }, viaProst: false });
    if (this.rng.chance(0.45)) this.say(PLAYER_ID, this.rng.pick(LINES.drink));
  }

  private consumeFood(id: FoodId): void {
    this.meters.eat(id);
    this.stats.foods++;
    const f = FOODS[id];
    if (f.slowSeconds > 0) this.player.slowTimer = Math.max(this.player.slowTimer, f.slowSeconds);
    this.events.push({ type: 'food', food: id, pos: { ...this.player.pos } });
    if (this.rng.chance(0.5)) this.say(PLAYER_ID, this.rng.pick(LINES.food));
  }

  private tryBurp(): void {
    const p = this.player;
    if (p.burpCooldown > 0) { this.events.push({ type: 'burpCooldown' }); return; }
    p.burpCooldown = BURP.cooldownSeconds;
    const failed = this.meters.burp(this.rng.next());
    this.stats.burps++;
    if (failed) this.stats.failedBurps++;
    this.events.push({ type: 'burp', failed, pos: { ...p.pos } });
    this.say(PLAYER_ID, this.rng.pick(failed ? LINES.burpFail : LINES.burp));
  }

  // --- Prost-Event ---------------------------------------------------------

  private updateProst(dt: number): void {
    if (this.prost.active) {
      this.prost.timeLeft -= dt;
      if (this.prost.timeLeft <= 0) {
        this.prost = { active: false, npcId: -1, timeLeft: 0 };
        this.events.push({ type: 'prostEnd', joined: false });
      }
      return;
    }
    if (this.isVomiting) return;
    this.nextProstIn -= dt;
    if (this.nextProstIn > 0) return;
    this.nextProstIn = this.rng.range(EVENTS.prost.minInterval, EVENTS.prost.maxInterval);

    // Nächstgelegenen Besucher wählen, der nicht zu weit weg ist
    let best: Npc | null = null;
    let bestD = 480;
    for (const n of this.npcs) {
      const d = dist(n.pos, this.player.pos);
      if (d < bestD) { bestD = d; best = n; }
    }
    if (!best) return;
    this.prost = { active: true, npcId: best.id, timeLeft: EVENTS.prost.windowSeconds };
    this.events.push({ type: 'prostStart', npcId: best.id });
    this.say(best.id, 'Prost!');
  }

  // --- Stimmung, Uhr, Ende -------------------------------------------------

  private updateMood(dt: number): void {
    const warn = this.meters.isWarning;
    if (warn && !this.wasWarning) this.events.push({ type: 'warningStart' });
    if (!warn && this.wasWarning) this.events.push({ type: 'warningEnd' });
    this.wasWarning = warn;

    this.playerLineTimer -= dt;
    if (this.playerLineTimer <= 0) {
      this.playerLineTimer = this.rng.range(7, 13);
      if (this.meters.kotz > 60) this.say(PLAYER_ID, this.rng.pick(LINES.sick));
      else if (this.meters.promille > 1.2) this.say(PLAYER_ID, this.rng.pick(LINES.drunk));
    }

    if (this.rng.chance(EVENTS.confettiChancePerSecond * dt)) {
      this.events.push({ type: 'confetti', pos: this.randomNear(this.player.pos, 260) });
    }
  }

  private randomNear(p: Vec2, r: number): Vec2 {
    return { x: p.x + this.rng.range(-r, r), y: p.y + this.rng.range(-r, r) };
  }

  private updateClock(): void {
    const h = Math.floor(this.hour);
    if (h > this.lastHour && h < ROUND.endHour) {
      this.lastHour = h;
      this.events.push({ type: 'hour', hour: h });
      this.events.push({ type: 'confetti', pos: { ...this.player.pos } });
    }
  }

  private checkEnd(): void {
    const cause = this.meters.checkVomit();
    if (cause) {
      this.stats.vomits++;
      if (this.stats.vomits >= VOMIT.maxVomits) {
        this.events.push({ type: 'vomit', cause, pos: { ...this.player.pos } });
        this.finish('vomit', cause);
        return;
      }
      this.startVomitStun(cause);
    }
    if (this.elapsed >= ROUND.durationSeconds) this.finish('zapfenstreich');
  }

  /** Gekotzt, aber noch nicht abgeholt: Erleichterung, Verlust und kurzer Kontrollverlust. */
  private startVomitStun(cause: VomitCause): void {
    const p = this.player;
    this.meters.relieveAfterVomit(this.stats.vomits);
    p.vomitTimer = VOMIT.stunSeconds;
    p.vomitElapsed = 0;
    p.boostTimer = 0;
    p.prostBoostTimer = 0;
    p.slowTimer = 0;
    p.invertTimer = 0;
    this.prost = { active: false, npcId: -1, timeLeft: 0 };
    this.events.push({ type: 'vomitSurvived', cause, pos: { ...p.pos }, count: this.stats.vomits, max: VOMIT.maxVomits });
    this.say(PLAYER_ID, this.rng.pick(LINES.vomit));
  }

  private endVomitStun(): void {
    this.player.slowTimer = Math.max(this.player.slowTimer, VOMIT.dazedSeconds);
    this.events.push({ type: 'vomitRecovered' });
    this.say(PLAYER_ID, this.rng.pick(LINES.recover));
  }

  private finish(reason: GameResult['reason'], cause?: GameResult['cause']): void {
    if (this.phase === 'ended') return;
    this.phase = 'ended';
    this.prost.active = false;
    this.focus = null;
    const vomited = reason === 'vomit';
    const survived = vomited ? Math.max(0, this.stats.vomits - 1) : this.stats.vomits;
    const score = computeScore(this.meters.promille, vomited, survived);
    this.result = {
      reason, cause, promille: this.meters.promille, score,
      title: titleFor(score, vomited), clock: this.clock, stats: { ...this.stats },
    };
    this.events.push({ type: 'gameEnd', reason });
  }

  private say(entityId: number, text: string): void {
    this.events.push({ type: 'speech', entityId, text });
  }
}
