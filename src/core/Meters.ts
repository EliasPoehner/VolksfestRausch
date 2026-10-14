/**
 * Die vier Leisten des Spiels – reine Logik, keine Grafik.
 *
 *  - promille: Score. Steigt mit Alkohol, sinkt langsam.
 *  - kotz:     0–100. Bei 100 ist Schluss.
 *  - sprudel:  0–100. Kohlensäure-Druck; >80 erhöht Kotz pro Sekunde, 100 = sofort kotzen.
 *  - misch:    0–100. Verschiedene Sorten in 30 s; ≥50 verdoppelt Kotz-Anstieg, 100 = sofort kotzen.
 *  - magen:    0–100. Magenfüllung durch Essen. Dämpft Kotz und Alkoholaufnahme, wird verdaut.
 */
import { BURP, DRINKS, FOODS, METERS, VOMIT, type DrinkId, type FoodId } from '../config/balance';
import { clamp } from './math';
import type { VomitCause } from './events';

export interface DrinkLogEntry { drink: DrinkId; time: number }

export class Meters {
  promille = 0;
  kotz = 0;
  sprudel = 0;
  misch = 0;
  magen = 0;
  /** Noch nicht wirksamer Kotz (Obstler) – fließt nach und nach in die Kotzleiste */
  pendingKotz = 0;
  /** > 0: Magen ist nach dem Kotzen leer, Kotz wirkt stärker (s) */
  emptyStomach = 0;

  /** Letzte Getränke (für Mischmasch-Fenster) */
  private log: DrinkLogEntry[] = [];

  /** Faktor, mit dem jeder Kotz-Anstieg multipliziert wird */
  get kotzMultiplier(): number {
    return this.misch >= METERS.misch.doubleKotzThreshold ? METERS.misch.doubleKotzFactor : 1;
  }

  /** Dämpfung durch Magenfüllung bzw. Verstärkung durch leeren Magen (Faktor auf Kotz aus Getränken/Rausch) */
  get stomachFactor(): number {
    const shield = 1 - METERS.magen.kotzReductionAtFull * (this.magen / METERS.magen.max);
    return this.emptyStomach > 0 ? shield * VOMIT.emptyStomachKotzFactor : shield;
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
    const absorb = 1 - METERS.magen.absorptionSlowAtFull * (this.magen / METERS.magen.max);
    this.promille += d.promille * absorb;
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

    this.addKotz(d.kotz * this.stomachFactor);
    if (d.kotzDelayed) this.pendingKotz += d.kotzDelayed * this.stomachFactor;
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
    this.magen = clamp(this.magen + f.magen, 0, METERS.magen.max);
    this.misch = clamp(this.misch + f.misch, 0, METERS.misch.max);
  }

  /**
   * Nach dem Kotzen: Erleichterung, aber auch Verlust.
   * @param nth das wievielte Kotzen es war (1 = erstes)
   */
  relieveAfterVomit(nth: number): void {
    const idx = Math.min(nth, VOMIT.kotzAfter.length) - 1;
    this.kotz = VOMIT.kotzAfter[idx];
    this.sprudel = Math.min(this.sprudel, VOMIT.sprudelAfterMax);
    this.misch = Math.min(this.misch, VOMIT.mischAfterMax);
    this.promille *= VOMIT.promilleKeep;
    this.magen = 0;
    this.pendingKotz = 0;
    this.emptyStomach = VOMIT.emptyStomachSeconds;
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
    this.magen = Math.max(0, this.magen - METERS.magen.decayPerSecond * dt);
    this.emptyStomach = Math.max(0, this.emptyStomach - dt);

    // Verzögerter Kotz (Obstler) sickert nach
    if (this.pendingKotz > 0) {
      const flow = Math.min(this.pendingKotz, METERS.delayedKotz.drainPerSecond * dt);
      this.pendingKotz -= flow;
      this.addKotz(flow);
    }

    // Passiver Kotz-Anstieg durch den Rausch (voller Magen dämpft)
    this.addKotz(this.promille * METERS.kotz.passivePerPromillePerSecond * this.stomachFactor * dt);
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
