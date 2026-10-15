/**
 * Fortschritt über Runden hinweg: Erfolge, gewählter Perk, Tageswiesn-Bestwerte.
 *
 * Wie beim Highscore ist die Schnittstelle asynchron, damit sie später gegen
 * eine Online-Variante (Konto, Server) ausgetauscht werden kann.
 */
import type { PerkId } from '../config/balance';

export interface DailyBest {
  score: number;
  promille: number;
  title: string;
}

export interface ProgressData {
  /** Freigeschaltete Erfolge: ID → ISO-Datum */
  achievements: Record<string, string>;
  /** Zuletzt gewählter Perk */
  perk: PerkId | null;
  /** Bestwert je Tageswiesn ("JJJJ-MM-TT") */
  daily: Record<string, DailyBest>;
  /** Gespielte Runden */
  rounds: number;
}

export interface ProgressStore {
  load(): Promise<ProgressData>;
  /** Neue Erfolge eintragen; liefert die wirklich neuen zurück */
  unlock(ids: string[]): Promise<string[]>;
  setPerk(perk: PerkId | null): Promise<void>;
  /** Tageswiesn-Ergebnis eintragen; liefert true bei neuem Tagesbestwert */
  submitDaily(dateKey: string, best: DailyBest): Promise<boolean>;
  countRound(): Promise<void>;
}

const KEY = 'masskrug-marathon.progress.v1';
/** Nur so viele Tage merken */
const MAX_DAYS = 60;

const empty = (): ProgressData => ({ achievements: {}, perk: null, daily: {}, rounds: 0 });

/** localStorage-Variante; ohne Storage (Privatmodus) gilt der Fortschritt nur für die Sitzung. */
export class LocalProgressStore implements ProgressStore {
  private memory: ProgressData = empty();

  private read(): ProgressData {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return this.memory;
      const p = JSON.parse(raw) as Partial<ProgressData>;
      return {
        achievements: p.achievements && typeof p.achievements === 'object' ? p.achievements : {},
        perk: (p.perk as PerkId | null) ?? null,
        daily: p.daily && typeof p.daily === 'object' ? p.daily : {},
        rounds: typeof p.rounds === 'number' ? p.rounds : 0,
      };
    } catch {
      return this.memory;
    }
  }

  private write(d: ProgressData): void {
    this.memory = d;
    try { window.localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* egal, dann nur im Speicher */ }
  }

  async load(): Promise<ProgressData> { return this.read(); }

  async unlock(ids: string[]): Promise<string[]> {
    const d = this.read();
    const fresh = ids.filter((id) => !d.achievements[id]);
    const now = new Date().toISOString();
    for (const id of fresh) d.achievements[id] = now;
    if (fresh.length) this.write(d);
    return fresh;
  }

  async setPerk(perk: PerkId | null): Promise<void> {
    const d = this.read();
    d.perk = perk;
    this.write(d);
  }

  async submitDaily(dateKey: string, best: DailyBest): Promise<boolean> {
    const d = this.read();
    const prev = d.daily[dateKey];
    if (prev && prev.score >= best.score) return false;
    d.daily[dateKey] = best;
    const keys = Object.keys(d.daily).sort();
    for (const k of keys.slice(0, Math.max(0, keys.length - MAX_DAYS))) delete d.daily[k];
    this.write(d);
    return true;
  }

  async countRound(): Promise<void> {
    const d = this.read();
    d.rounds++;
    this.write(d);
  }
}

/** Aktiver Fortschritts-Speicher – hier gegen eine Online-Variante austauschen. */
export const progress: ProgressStore = new LocalProgressStore();
