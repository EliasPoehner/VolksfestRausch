/**
 * Die vier Leisten des Spiels – reine Logik, keine Grafik.
 *
 *  - promille: Score. Steigt mit Alkohol, sinkt langsam.
 *  - kotz:     0–100. Bei 100 ist Schluss.
 *  - sprudel:  0–100. Kohlensäure-Druck; >80 erhöht Kotz pro Sekunde, 100 = sofort kotzen.
 *  - misch:    0–100. Verschiedene Sorten in 30 s; ≥50 verdoppelt Kotz-Anstieg, 100 = sofort kotzen.
 */
import { BURP, DRINKS, FOODS, METERS, type DrinkId, type FoodId } from '../config/balance';
import { clamp } from './math';
import type { VomitCause } from './events';

export interface DrinkLogEntry { drink: DrinkId; time: number }

export class Meters {
  promille = 0;
  kotz = 0;
  sprudel = 0;
  misch = 0;

  /** Letzte Getränke (für Mischmasch-Fenster) */
  private log: DrinkLogEntry[] = [];

  /** Faktor, mit dem jeder Kotz-Anstieg multipliziert wird */
  get kotzMultiplier(): number {
    return this.misch >= METERS.misch.doubleKotzThreshold ? METERS.misch.doubleKotzFactor : 1;
  }

  /** Erhöht die Kotzleiste (berücksichtigt den Mischmasch-Multiplikator). */
  addKotz(amount: number): void {
    const a = amount > 0 ? amount * this.kotzMultiplier : amount;
    this.kotz = clamp(this.kotz + a, 0, METERS.kotz.max);
  }

  /**
   * Ein Getränk trinken.
   * @param now Spielzeit in Sekunden (für das Mischmasch-Zeitfenster)
   */
  drink(id: DrinkId, now: number): void {
    const d = DRINKS[id];
    this.promille += d.promille;
    this.sprudel = clamp(this.sprudel + d.sprudel, 0, METERS.sprudel.max);

    // Mischmasch: alle *anderen* Sorten, die im Zeitfenster getrunken wurden
    this.log = this.log.filter((e) => now - e.time <= METERS.misch.windowSeconds);
    const otherTypes = new Set(this.log.map((e) => e.drink).filter((t) => t !== id));
    this.misch = clamp(
      this.misch + otherTypes.size * METERS.misch.perDistinctOtherType + d.mischBonus,
      0,
      METERS.misch.max,
    );
    this.log.push({ drink: id, time: now });

    this.addKotz(d.kotz);
  }

  /** Bonus-Schluck beim "Prost!"-Event (kein eigenes Getränk im Mischmasch-Sinn) */
  prost(promille: number, sprudel: number, kotz: number): void {
    this.promille += promille;
    this.sprudel = clamp(this.sprudel + sprudel, 0, METERS.sprudel.max);
    this.addKotz(kotz);
  }

  /** Etwas essen bzw. Wasser trinken. */
  eat(id: FoodId): void {
    const f = FOODS[id];
    this.addKotz(f.kotz);
    this.sprudel = clamp(this.sprudel + f.sprudel, 0, METERS.sprudel.max);
    this.promille = Math.max(0, this.promille + f.promille);
  }

  /**
   * Rülpsen. `roll` ist eine Zufallszahl 0..1 (von außen, damit testbar).
   * @returns true bei Fehlrülpser
   */
  burp(roll: number): boolean {
    this.sprudel = clamp(this.sprudel - BURP.sprudelRelief, 0, METERS.sprudel.max);
    const failed = roll < BURP.failChance;
    if (failed) this.addKotz(BURP.failKotz);
    return failed;
  }

  /** Zeitbasiertes Update (Abbau, passive Anstiege). */
  update(dt: number): void {
    this.promille = Math.max(0, this.promille - METERS.promille.decayPerSecond * dt);
    this.sprudel = Math.max(0, this.sprudel - METERS.sprudel.decayPerSecond * dt);
    this.misch = Math.max(0, this.misch - METERS.misch.decayPerSecond * dt);

    // Passiver Kotz-Anstieg durch den Rausch
    this.addKotz(this.promille * METERS.kotz.passivePerPromillePerSecond * dt);
    // Zu viel Druck im Bauch
    if (this.sprudel > METERS.sprudel.dangerThreshold) {
      this.addKotz(METERS.sprudel.kotzPerSecondAboveDanger * dt);
    }
  }

  /** Liefert den Grund, falls jetzt gekotzt wird – sonst null. */
  checkVomit(): VomitCause | null {
    if (this.sprudel >= METERS.sprudel.max) return 'sprudel';
    if (this.misch >= METERS.misch.max) return 'misch';
    if (this.kotz >= METERS.kotz.max) return 'kotz';
    return null;
  }

  get isWarning(): boolean {
    return this.kotz >= METERS.kotz.warningThreshold;
  }
}
