/**
 * ZENTRALE BALANCING-KONFIGURATION
 * ================================
 * Alle Spielwerte (Getränke, Essen, Raten, Schwellen) stehen hier.
 * Wer das Spiel leichter/schwerer machen will, muss nur diese Datei anfassen.
 *
 * Einheiten:
 *  - Promille: echte ‰-Werte (0.35 = 0,35 ‰)
 *  - Leisten (Kotz, Sprudel, Mischmasch): 0–100
 *  - Zeiten: Sekunden (Echtzeit), Geschwindigkeiten: Welt-Einheiten pro Sekunde
 */

// ---------------------------------------------------------------------------
// Getränke
// ---------------------------------------------------------------------------

export type DrinkId = 'mass' | 'radler' | 'weissbier' | 'obstler' | 'sekt' | 'jaeger';

export interface DrinkConfig {
  id: DrinkId;
  /** Anzeigename */
  name: string;
  /** Promille, die das Getränk sofort bringt */
  promille: number;
  /** Sprudel-Druck (Kohlensäure), der sofort hinzukommt */
  sprudel: number;
  /** Direkter Anstieg der Kotzleiste */
  kotz: number;
  /** Zusätzlicher Mischmasch-Bonus (unabhängig von der Sorten-Vielfalt) */
  mischBonus: number;
  /** Relative Häufigkeit beim zufälligen Spawnen */
  spawnWeight: number;
  /** Farbe für prozedurale Grafik/Partikel (0xRRGGBB) */
  color: number;
}

export const DRINKS: Record<DrinkId, DrinkConfig> = {
  mass:      { id: 'mass',      name: 'Maß Bier',     promille: 0.32, sprudel: 22, kotz: 6,  mischBonus: 0,  spawnWeight: 5, color: 0xf2b400 },
  radler:    { id: 'radler',    name: 'Radler',       promille: 0.12, sprudel: 14, kotz: 3,  mischBonus: 0,  spawnWeight: 3, color: 0xf7dc6f },
  weissbier: { id: 'weissbier', name: 'Weißbier',     promille: 0.22, sprudel: 24, kotz: 5,  mischBonus: 0,  spawnWeight: 3, color: 0xe59a2a },
  obstler:   { id: 'obstler',   name: 'Obstler',      promille: 0.28, sprudel: 0,  kotz: 14, mischBonus: 0,  spawnWeight: 2, color: 0xdff3ff },
  sekt:      { id: 'sekt',      name: 'Sekt',         promille: 0.18, sprudel: 34, kotz: 5,  mischBonus: 0,  spawnWeight: 2, color: 0xfff1b8 },
  jaeger:    { id: 'jaeger',    name: 'Jägermeister', promille: 0.28, sprudel: 0,  kotz: 6,  mischBonus: 28, spawnWeight: 2, color: 0x5a2d0c },
};

// ---------------------------------------------------------------------------
// Essen / Gegenmittel
// ---------------------------------------------------------------------------

export type FoodId = 'brezn' | 'hendl' | 'steckerlfisch' | 'wasser';

export interface FoodConfig {
  id: FoodId;
  name: string;
  /** Veränderung der Kotzleiste (negativ = gut) */
  kotz: number;
  /** Veränderung des Sprudel-Drucks */
  sprudel: number;
  /** Veränderung der Promille (Wasser: kleiner Trade-off) */
  promille: number;
  /** Verlangsamung beim Essen: Dauer in s (0 = keine) */
  slowSeconds: number;
  /** Relative Häufigkeit als Pickup auf der Wiese */
  spawnWeight: number;
  color: number;
}

export const FOODS: Record<FoodId, FoodConfig> = {
  brezn:         { id: 'brezn',         name: 'Brezn',         kotz: -15, sprudel: 0,   promille: 0,    slowSeconds: 0, spawnWeight: 4, color: 0xa0522d },
  hendl:         { id: 'hendl',         name: 'Hendl',         kotz: -30, sprudel: 0,   promille: 0,    slowSeconds: 2, spawnWeight: 1, color: 0xd98c3a },
  steckerlfisch: { id: 'steckerlfisch', name: 'Steckerlfisch', kotz: -25, sprudel: 0,   promille: 0,    slowSeconds: 0, spawnWeight: 1, color: 0x8fa3ad },
  wasser:        { id: 'wasser',        name: 'Wasser',        kotz: -20, sprudel: -10, promille: -0.1, slowSeconds: 0, spawnWeight: 3, color: 0x6ec6ff },
};

// ---------------------------------------------------------------------------
// Runde / Uhr
// ---------------------------------------------------------------------------

export const ROUND = {
  /** Echtzeit-Dauer einer Runde in Sekunden */
  durationSeconds: 180,
  /** In-Game-Uhr: Start- und Endstunde (Zapfenstreich) */
  startHour: 18,
  endHour: 23,
  /** Fester Logik-Zeitschritt (s) – Logik läuft unabhängig von der Framerate */
  fixedStep: 1 / 60,
};

// ---------------------------------------------------------------------------
// Leisten-Raten & Schwellen
// ---------------------------------------------------------------------------

export const METERS = {
  promille: {
    /** Abbau pro Sekunde (Leber arbeitet) */
    decayPerSecond: 0.0018,
  },
  kotz: {
    max: 100,
    /** Passiver Anstieg pro Sekunde je 1 ‰ (je voller, desto flauer) */
    passivePerPromillePerSecond: 0.45,
    /** Ab diesem Wert: Warnung (grün + wackeln + Warnsound) */
    warningThreshold: 85,
  },
  sprudel: {
    max: 100,
    /** Abbau pro Sekunde */
    decayPerSecond: 2.2,
    /** Ab diesem Wert steigt die Kotzleiste pro Sekunde */
    dangerThreshold: 80,
    /** Kotz-Anstieg pro Sekunde über der Schwelle */
    kotzPerSecondAboveDanger: 6,
  },
  misch: {
    max: 100,
    /** Zeitfenster, in dem verschiedene Sorten zählen (s) */
    windowSeconds: 30,
    /** Mischmasch-Anstieg pro *anderer* Sorte im Zeitfenster */
    perDistinctOtherType: 18,
    /** Abbau pro Sekunde */
    decayPerSecond: 1.2,
    /** Ab diesem Wert steigt die Kotzleiste doppelt so schnell */
    doubleKotzThreshold: 50,
    doubleKotzFactor: 2,
  },
};

// ---------------------------------------------------------------------------
// Rülpsen
// ---------------------------------------------------------------------------

export const BURP = {
  cooldownSeconds: 5,
  /** Sprudel-Abbau pro Rülpser */
  sprudelRelief: 35,
  /** Wahrscheinlichkeit für einen Fehlrülpser */
  failChance: 0.1,
  /** Kotz-Anstieg bei Fehlrülpser */
  failKotz: 7,
};

// ---------------------------------------------------------------------------
// Spieler & Bewegung
// ---------------------------------------------------------------------------

export const PLAYER = {
  speed: 230,
  radius: 16,
  /** Reichweite für Aufnehmen (E / Leertaste) */
  interactRadius: 56,
  /** Geschwindigkeitsfaktor während Hendl-Verlangsamung */
  slowFactor: 0.45,
};

// ---------------------------------------------------------------------------
// Rausch-Effekte
// ---------------------------------------------------------------------------

export const DRUNK = {
  /** Ab diesen Promille driftet die Steuerung */
  driftThreshold: 1.5,
  /** Drift-Stärke je ‰ über der Schwelle (Anteil der Laufgeschwindigkeit) */
  driftPerPromille: 0.35,
  driftMax: 0.75,
  /** Ab diesen Promille werden Richtungen gelegentlich vertauscht */
  invertThreshold: 2.5,
  /** Chance pro Sekunde, dass die Steuerung kurz vertauscht wird */
  invertChancePerSecond: 0.12,
  invertDurationSeconds: 1.6,
  /** Kamera-Wackeln: Intensität pro ‰ (wird im Renderer interpretiert) */
  shakePerPromille: 0.0009,
  /** Doppeltsehen: Ghost-Alpha pro ‰ (max. 0.45) */
  doubleVisionPerPromille: 0.14,
};

// ---------------------------------------------------------------------------
// Gefahren
// ---------------------------------------------------------------------------

export const HAZARDS = {
  carousel: {
    /** Kotz-Anstieg pro Sekunde auf dem Karussell */
    kotzPerSecond: 14,
    /** Winkelgeschwindigkeit (rad/s), mit der man mitgedreht wird */
    angularSpeed: 1.6,
  },
  bumperCar: {
    /** Kotz-Anstieg bei Zusammenstoß mit einem Autoscooter */
    kotzOnHit: 5,
    knockback: 420,
    speed: 150,
    count: 5,
  },
};

// ---------------------------------------------------------------------------
// Spawns, NPCs, Events
// ---------------------------------------------------------------------------

export const SPAWNS = {
  /** Max. gleichzeitige zufällige Pickups auf der Wiese */
  maxFieldPickups: 14,
  /** Intervall (s) zwischen Wiesen-Spawns */
  fieldSpawnInterval: 2.2,
  /** Anteil Getränke vs. Essen bei Wiesen-Spawns */
  drinkShare: 0.78,
  /** Lebensdauer eines Wiesen-Pickups (s) */
  fieldPickupLifetime: 28,
  /** Biertisch: Nachfüllzeit (s) je Platz */
  benchRefillSeconds: 9,
  /** Bude: Nachkochzeit (s) nach dem Kauf */
  boothCooldownSeconds: 8,
  visitors: 26,
  waitresses: 5,
  /** Bedienung: Wartezeit am Zelt zum Nachfüllen (s) */
  waitressRefillSeconds: 4,
  waitressSpeed: 120,
  visitorSpeed: 60,
};

export const EVENTS = {
  prost: {
    /** Zufallsintervall zwischen zwei "Prost!"-Rufen (s) */
    minInterval: 18,
    maxInterval: 32,
    /** Reaktionszeit (s) */
    windowSeconds: 3,
    /** Bonus fürs Mittrinken */
    bonusPromille: 0.2,
    sprudel: 12,
    kotz: 3,
  },
  /** Zufällige Sprechblasen von NPCs: Intervall (s) */
  npcChatterMin: 2.5,
  npcChatterMax: 6,
  /** Konfetti: zur vollen Stunde garantiert, sonst Chance pro Sekunde */
  confettiChancePerSecond: 0.012,
};

// ---------------------------------------------------------------------------
// Scoring & Titel
// ---------------------------------------------------------------------------

export const SCORING = {
  /** Wer kotzt, bekommt nur diesen Anteil seiner Promille als Score */
  vomitScoreFactor: 0.5,
  /** Titel je nach Score (aufsteigend, erster passender gewinnt) */
  titles: [
    { maxScore: 1.0, title: 'Radler-Rookie' },
    { maxScore: 2.0, title: 'Bierbank-Azubi' },
    { maxScore: 3.5, title: 'Zeltkönig' },
    { maxScore: Infinity, title: 'Wiesn-Legende' },
  ],
  vomitTitle: 'Ein Fall für den Sanka',
};

// ---------------------------------------------------------------------------
// Sprüche
// ---------------------------------------------------------------------------

export const LINES = {
  drink: ['Oans, zwoa, g\'suffa!', 'Prost Mahlzeit!', 'Ozapft is!', 'Hoch die Krüge!'],
  food: ['Des geht no!', 'Mei, is des guad!', 'A Brotzeit muass sei!'],
  drunk: ['I bin ned bsoffn!', 'Wo is mei Hut?', 'Heid geh i ned hoam!', 'Des Zelt dreht si…'],
  sick: ['Mir is a bissl schlecht…', 'Uff…', 'Ned guad…'],
  burp: ['*BÖÖRP*', '*Rülps*', 'Tschuldigung!'],
  burpFail: ['Uuups…', 'Des war knapp…'],
  npc: [
    'Oans, zwoa, g\'suffa!', 'Ein Prosit der Gemütlichkeit!', 'Zwoa Maß, bittschön!',
    'Servus!', 'Mia san mia!', 'Wo is des Klo?', 'Hendl, frisch vom Grill!', 'Brezn, Brezn!',
    'Heid is a scheener Dog!', 'Schee war\'s!', 'Hock di her!',
  ],
};
