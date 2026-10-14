/**
 * Highscore-Speicher.
 *
 * Die Schnittstelle `HighscoreStore` ist bewusst asynchron, damit man die
 * lokale Variante später 1:1 gegen eine Online-API austauschen kann, z. B.:
 *
 *   class ApiHighscoreStore implements HighscoreStore {
 *     async getBest() { return (await fetch('/api/highscore')).json(); }
 *     async submit(entry) { await fetch('/api/highscore', { method: 'POST', body: JSON.stringify(entry) }); ... }
 *   }
 *
 * und in `src/main.ts` `highscores` neu belegen.
 */

export interface HighscoreEntry {
  score: number;
  promille: number;
  title: string;
  drinks: number;
  burps: number;
  /** ISO-Datum */
  date: string;
}

export interface HighscoreStore {
  /** Bester bisheriger Eintrag oder null */
  getBest(): Promise<HighscoreEntry | null>;
  /** Top-N-Liste (absteigend) */
  getTop(limit?: number): Promise<HighscoreEntry[]>;
  /** Neuen Eintrag speichern; liefert true, wenn es ein neuer Rekord ist */
  submit(entry: HighscoreEntry): Promise<boolean>;
}

const KEY = 'masskrug-marathon.highscores.v1';
const MAX_ENTRIES = 10;

/** localStorage-Variante – mit try/catch, weil Storage z. B. im Privatmodus fehlen kann. */
export class LocalHighscoreStore implements HighscoreStore {
  /** Fallback, falls localStorage nicht verfügbar ist (gilt dann nur für die Sitzung) */
  private memory: HighscoreEntry[] = [];

  private read(): HighscoreEntry[] {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return this.memory;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as HighscoreEntry[]).filter((e) => typeof e?.score === 'number') : this.memory;
    } catch {
      return this.memory;
    }
  }

  private write(list: HighscoreEntry[]): void {
    this.memory = list;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(list));
    } catch {
      /* Speicher voll oder gesperrt – dann eben nur im Speicher */
    }
  }

  async getBest(): Promise<HighscoreEntry | null> {
    return this.read()[0] ?? null;
  }

  async getTop(limit = 5): Promise<HighscoreEntry[]> {
    return this.read().slice(0, limit);
  }

  async submit(entry: HighscoreEntry): Promise<boolean> {
    const list = this.read();
    const best = list[0]?.score ?? -Infinity;
    const next = [...list, entry].sort((a, b) => b.score - a.score).slice(0, MAX_ENTRIES);
    this.write(next);
    return entry.score > best;
  }
}

/** Aktiver Highscore-Speicher – hier gegen eine Online-Variante austauschen. */
export const highscores: HighscoreStore = new LocalHighscoreStore();
