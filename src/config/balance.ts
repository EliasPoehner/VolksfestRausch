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
  /** Kotz, der erst verzögert wirkt (fließt über `METERS.delayedKotz` in die Kotzleiste) */
  kotzDelayed?: number;
  /** Jäger-Kick: Dauer (s) des Tempo-Boosts */
  speedBoostSeconds?: number;
  /** Sekt-Laune: Dauer (s), in der ein "Prost!" doppelt zählt */
  prostBoostSeconds?: number;
  /** Relative Häufigkeit beim zufälligen Spawnen */
  spawnWeight: number;
  /** Farbe für prozedurale Grafik/Partikel (0xRRGGBB) */
  color: number;
}

export const DRINKS: Record<DrinkId, DrinkConfig> = {
  mass:      { id: 'mass',      name: 'Maß Bier',     promille: 0.32, sprudel: 22, kotz: 6, mischBonus: 0,  spawnWeight: 5, color: 0xf2b400 },
  radler:    { id: 'radler',    name: 'Radler',       promille: 0.12, sprudel: 14, kotz: 3, mischBonus: 0,  spawnWeight: 3, color: 0xf7dc6f },
  weissbier: { id: 'weissbier', name: 'Weißbier',     promille: 0.22, sprudel: 24, kotz: 5, mischBonus: 0,  spawnWeight: 3, color: 0xe59a2a },
  // Obstler: kein Sprudel, beruhigt sogar den Bauch – aber der Kotz kommt zeitverzögert
  obstler:   { id: 'obstler',   name: 'Obstler',      promille: 0.28, sprudel: -8, kotz: 3, mischBonus: 0,  spawnWeight: 2, color: 0xdff3ff, kotzDelayed: 11 },
  // Sekt: viel Sprudel, dafür zählt ein "Prost!" kurz doppelt
  sekt:      { id: 'sekt',      name: 'Sekt',         promille: 0.18, sprudel: 34, kotz: 5, mischBonus: 0,  spawnWeight: 2, color: 0xfff1b8, prostBoostSeconds: 25 },
  // Jägermeister: Mischmasch-Spike, dafür kurzer Tempo-Kick
  jaeger:    { id: 'jaeger',    name: 'Jägermeister', promille: 0.28, sprudel: 0,  kotz: 6, mischBonus: 28, spawnWeight: 2, color: 0x5a2d0c, speedBoostSeconds: 6 },
};

// ---------------------------------------------------------------------------
// Essen / Gegenmittel
// ---------------------------------------------------------------------------

export type FoodId = 'brezn' | 'hendl' | 'steckerlfisch' | 'wasser';

export interface FoodConfig {
  id: FoodId;
  name: string;
  /** Sofortige Veränderung der Kotzleiste (negativ = gut) */
  kotz: number;
  /** Veränderung des Sprudel-Drucks */
  sprudel: number;
  /** Veränderung der Promille (Wasser: kleiner Trade-off) */
  promille: number;
  /** Magenfüllung (0–100): Puffer, der Kotz und Alkoholaufnahme dämpft */
  magen: number;
  /** Veränderung des Mischmasch-Meters */
  misch: number;
  /** Verlangsamung beim Essen: Dauer in s (0 = keine) */
  slowSeconds: number;
  /** Relative Häufigkeit als Pickup auf der Wiese */
  spawnWeight: number;
  color: number;
}

export const FOODS: Record<FoodId, FoodConfig> = {
  // Brezn: billige Unterlage, kaum Soforthilfe
  brezn:         { id: 'brezn',         name: 'Brezn',         kotz: -6,  sprudel: 0,   promille: 0,    magen: 28, misch: 0,   slowSeconds: 0, spawnWeight: 4, color: 0xa0522d },
  // Hendl: füllt den Magen am stärksten, macht dafür kurz träge
  hendl:         { id: 'hendl',         name: 'Hendl',         kotz: -12, sprudel: 0,   promille: 0,    magen: 55, misch: 0,   slowSeconds: 3, spawnWeight: 1, color: 0xd98c3a },
  // Steckerlfisch: mittlere Unterlage und beruhigt den Mischmasch
  steckerlfisch: { id: 'steckerlfisch', name: 'Steckerlfisch', kotz: -8,  sprudel: 0,   promille: 0,    magen: 35, misch: -35, slowSeconds: 0, spawnWeight: 1, color: 0x8fa3ad },
  // Wasser: nur Soforthilfe gegen Kotz und Sprudel, kostet etwas Promille
  wasser:        { id: 'wasser',        name: 'Wasser',        kotz: -16, sprudel: -22, promille: -0.1, magen: 0,  misch: 0,   slowSeconds: 0, spawnWeight: 3, color: 0x6ec6ff },
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
  /** Verzögerter Kotz (Obstler): so viel fließt pro Sekunde in die Kotzleiste */
  delayedKotz: {
    drainPerSecond: 2,
  },
  /** Magenfüllung durch Essen: dämpft Kotz und Alkoholaufnahme */
  magen: {
    max: 100,
    /** Verdauung pro Sekunde */
    decayPerSecond: 0.8,
    /** Bei voller Füllung: so viel weniger Kotz aus Getränken und Rausch (0.5 = −50 %) */
    kotzReductionAtFull: 0.5,
    /** Bei voller Füllung: so viel langsamer wirkt der Alkohol (0.2 = −20 % Promille pro Getränk) */
    absorptionSlowAtFull: 0.2,
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
  /** Geschwindigkeitsfaktor während Jäger-Kick */
  boostFactor: 1.3,
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
// Kotzen als Ereignis
// ---------------------------------------------------------------------------

export const VOMIT = {
  /** Beim n-ten Kotzen ist Schluss (Sanka). Davor ist Kotzen "nur" ein teurer Rückschlag. */
  maxVomits: 3,
  /** Dauer des Kontrollverlusts (s) */
  stunSeconds: 2.6,
  /** Jeder Tastendruck („Reiß di zam!“) verkürzt den Kontrollverlust um so viel (s) */
  mashShorten: 0.22,
  /** So kurz kann der Kontrollverlust frühestens enden (s) */
  minStunSeconds: 1.0,
  /** Anteil der Promille, der nach dem Kotzen bleibt */
  promilleKeep: 0.65,
  /** Kotzleiste nach dem 1., 2. Kotzen – je öfter, desto weniger Erleichterung */
  kotzAfter: [30, 42],
  /** Sprudel/Mischmasch werden höchstens auf diese Werte zurückgesetzt */
  sprudelAfterMax: 25,
  mischAfterMax: 20,
  /** Nachwirkung: Magen ist leer, Getränke und Rausch wirken so lange … */
  emptyStomachSeconds: 20,
  /** … um diesen Faktor stärker auf die Kotzleiste */
  emptyStomachKotzFactor: 1.4,
  /** Danach noch kurz benommen (Verlangsamung, s) */
  dazedSeconds: 3,
};

// ---------------------------------------------------------------------------
// Scoring & Titel
// ---------------------------------------------------------------------------

export const SCORING = {
  /** Wer vom Sanka abgeholt wird, bekommt nur diesen Anteil seiner Promille als Score */
  vomitScoreFactor: 0.5,
  /** Jedes überstandene Kotzen kostet diesen Anteil am Score (nicht unter `minVomitFactor`) */
  perVomitPenalty: 0.12,
  minVomitFactor: 0.45,
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
  vomit: ['*BLEEEH*', 'Uuuargh…', 'Do geht nix mehr…'],
  recover: ['Jetzt geht\'s wieder.', 'Des hat guad do…', 'Oans geht no!'],
  burp: ['*BÖÖRP*', '*Rülps*', 'Tschuldigung!'],
  burpFail: ['Uuups…', 'Des war knapp…'],
  npc: [
    'Oans, zwoa, g\'suffa!', 'Ein Prosit der Gemütlichkeit!', 'Zwoa Maß, bittschön!',
    'Servus!', 'Mia san mia!', 'Wo is des Klo?', 'Hendl, frisch vom Grill!', 'Brezn, Brezn!',
    'Heid is a scheener Dog!', 'Schee war\'s!', 'Hock di her!',
  ],
};
