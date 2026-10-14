/**
 * Kleine Mathe-Helfer ohne Abhängigkeiten.
 * Vec2 ist eine Position/Richtung in Welt-Koordinaten (x, y).
 * In einer 3D-Version entspricht y der z-Achse am Boden.
 */

export interface Vec2 { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }

export const vec = (x = 0, y = 0): Vec2 => ({ x, y });
export const len = (v: Vec2): number => Math.hypot(v.x, v.y);
export const dist = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);
export const clamp = (v: number, min: number, max: number): number => (v < min ? min : v > max ? max : v);

export function normalize(v: Vec2): Vec2 {
  const l = len(v);
  return l > 1e-6 ? { x: v.x / l, y: v.y / l } : { x: 0, y: 0 };
}

/** Begrenzt die Länge eines Vektors auf max. 1 (für Joystick-Eingaben) */
export function clampLength1(v: Vec2): Vec2 {
  const l = len(v);
  return l > 1 ? { x: v.x / l, y: v.y / l } : { x: v.x, y: v.y };
}

export function pointInRect(p: Vec2, r: Rect): boolean {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

/**
 * Schiebt einen Kreis aus einem Rechteck heraus (einfache Kollisionsauflösung).
 * Gibt true zurück, wenn es eine Kollision gab. Mutiert `p`.
 */
export function pushCircleOutOfRect(p: Vec2, radius: number, r: Rect): boolean {
  const cx = clamp(p.x, r.x, r.x + r.w);
  const cy = clamp(p.y, r.y, r.y + r.h);
  const dx = p.x - cx;
  const dy = p.y - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= radius * radius) return false;
  if (d2 > 1e-9) {
    const d = Math.sqrt(d2);
    p.x = cx + (dx / d) * radius;
    p.y = cy + (dy / d) * radius;
  } else {
    // Mittelpunkt liegt im Rechteck: zur nächstgelegenen Kante schieben
    const left = p.x - r.x, right = r.x + r.w - p.x, top = p.y - r.y, bottom = r.y + r.h - p.y;
    const m = Math.min(left, right, top, bottom);
    if (m === left) p.x = r.x - radius;
    else if (m === right) p.x = r.x + r.w + radius;
    else if (m === top) p.y = r.y - radius;
    else p.y = r.y + r.h + radius;
  }
  return true;
}

/** Schiebt einen Kreis aus einem anderen (festen) Kreis. Mutiert `p`. */
export function pushCircleOutOfCircle(p: Vec2, radius: number, c: Vec2, cr: number): boolean {
  const dx = p.x - c.x, dy = p.y - c.y;
  const min = radius + cr;
  const d = Math.hypot(dx, dy);
  if (d >= min) return false;
  const nx = d > 1e-6 ? dx / d : 1, ny = d > 1e-6 ? dy / d : 0;
  p.x = c.x + nx * min;
  p.y = c.y + ny * min;
  return true;
}

/**
 * Deterministischer Zufallsgenerator (mulberry32).
 * Deterministisch = Tests und Replays sind reproduzierbar.
 */
export class Rng {
  private s: number;
  constructor(seed = Date.now()) { this.s = seed >>> 0; }
  next(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(min: number, max: number): number { return min + this.next() * (max - min); }
  int(min: number, maxExcl: number): number { return Math.floor(this.range(min, maxExcl)); }
  pick<T>(arr: readonly T[]): T { return arr[Math.floor(this.next() * arr.length)]; }
  chance(p: number): boolean { return this.next() < p; }
  /** Gewichtete Auswahl */
  weighted<T>(items: readonly T[], weight: (t: T) => number): T {
    const total = items.reduce((s, i) => s + weight(i), 0);
    let r = this.next() * total;
    for (const i of items) { r -= weight(i); if (r <= 0) return i; }
    return items[items.length - 1];
  }
}
