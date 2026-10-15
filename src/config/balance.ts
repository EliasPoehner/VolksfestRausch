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
// Dramaturgie des Abends: Phasen
// ---------------------------------------------------------------------------

export type EveningPhaseId = 'gemuetlich' | 'stimmung' | 'lastOrder';

export interface EveningPhaseConfig {
  id: EveningPhaseId;
  /** Anzeigename (HUD) */
  name: string;
  /** Ab dieser In-Game-Stunde gilt die Phase */
  fromHour: number;
  /** Große Einblendung beim Phasenwechsel (Zeile 1 / Zeile 2) */
  banner: string;
  subline: string;
  /** Faktor auf den Abstand zwischen zwei "Prost!"-Rufen (< 1 = häufiger) */
  prostIntervalFactor: number;
  /** Faktor auf das Spawn-Intervall der Wiesen-Pickups (< 1 = mehr Nachschub) */
  fieldSpawnIntervalFactor: number;
  /** Faktor auf die Promille aus Getränken und "Prost!" */
  drinkPromilleFactor: number;
  /** Faktor auf den Kotz aus Getränken und "Prost!" (auch den verzögerten) */
  drinkKotzFactor: number;
  /** Faktor auf den Promille-Abbau (`METERS.promille`): in der Stimmung macht die Leber Überstunden */
  liverFactor: number;
  /** Lautstärke der Blasmusik (0–1, nur Renderer) */
  musicVolume: number;
}

/** Aufsteigend nach `fromHour`. Die erste Phase gilt ab Rundenbeginn. */
export const PHASES: EveningPhaseConfig[] = [
  {
    id: 'gemuetlich', name: 'Gemütlich', fromHour: 18, banner: '', subline: '',
    prostIntervalFactor: 1.35, fieldSpawnIntervalFactor: 1, drinkPromilleFactor: 1, drinkKotzFactor: 1,
    liverFactor: 1, musicVolume: 0.22,
  },
  {
    id: 'stimmung', name: 'Stimmung', fromHour: 20, banner: '20:00 – Jetzt kocht\'s Zelt!', subline: 'Mehr Prost, mehr Nachschub',
    prostIntervalFactor: 0.6, fieldSpawnIntervalFactor: 0.7, drinkPromilleFactor: 1, drinkKotzFactor: 1,
    liverFactor: 1.25, musicVolume: 0.35,
  },
  {
    id: 'lastOrder', name: 'Last Order', fromHour: 22, banner: '22:00 – LAST ORDER!', subline: 'Getränke +50 % Promille – aber Obacht!',
    prostIntervalFactor: 0.8, fieldSpawnIntervalFactor: 0.8, drinkPromilleFactor: 1.5, drinkKotzFactor: 1.25,
    liverFactor: 1, musicVolume: 0.5,
  },
];

// ---------------------------------------------------------------------------
// Leisten-Raten & Schwellen
// ---------------------------------------------------------------------------

export const METERS = {
  promille: {
    /** Grund-Abbau pro Sekunde (Leber arbeitet); wird je Phase mit `liverFactor` multipliziert */
    decayPerSecond: 0.0015,
    /** Zusätzlicher Abbau pro Sekunde je 1 ‰: wer früh hoch aufbaut, verliert mehr (ebenfalls × `liverFactor`) */
    decayPerPromillePerSecond: 0.003,
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
  /** Sprudel-Abbau eines voll geladenen (perfekten) Rülpsers ohne Bonus */
  sprudelRelief: 35,
  /** Chance auf einen Fehlrülpser bei zu kurz geladenem Rülpser */
  failChance: 0.1,
  /** Kotz-Anstieg bei Fehlrülpser */
  failKotz: 7,
  /** Aufladen (R halten): ab hier beginnt der Sweet-Spot (s) … */
  sweetStart: 0.6,
  /** … und hier endet er (s). Länger halten = Fehlrülpser */
  sweetEnd: 0.9,
  /** So lange kann man höchstens halten, dann platzt er von selbst (als Fehlrülpser) */
  autoReleaseAt: 1.5,
  /** Zu früh losgelassen: Wirkung wächst von diesem Anteil bis 100 % am Sweet-Spot-Beginn */
  weakMinFactor: 0.35,
  /** Im Sweet-Spot: Sprudel-Abbau × diesem Faktor und kein Fehlrülpser */
  perfectFactor: 1.3,
  /** Im Sweet-Spot: zusätzlich so viel weniger Kotz */
  perfectKotzRelief: 4,
  /** Zu spät: nur dieser Anteil des Sprudel-Abbaus, und es ist immer ein Fehlrülpser */
  overReliefFactor: 0.5,
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
  /** Geschwindigkeitsfaktor, während man einen Rülpser auflädt */
  burpChargeFactor: 0.7,
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
    /** Takt der Blasmusik (Schläge pro Minute) – "Prost!" im Takt gibt Bonus */
    beatBpm: 132,
    /** So weit (s) darf man neben einem Schlag liegen und ist trotzdem "im Takt" */
    beatTolerance: 0.1,
    /** Im Takt mitgetrunken: Promille-Bonus × diesem Faktor */
    onBeatFactor: 1.5,
    /** Jedes weitere "Prost!" im Takt in Folge erhöht den Bonus um diesen Anteil … */
    comboStep: 0.25,
    /** … bis höchstens zu dieser Combo-Stufe */
    comboMax: 4,
  },
  /** Zufällige Sprechblasen von NPCs: Intervall (s) */
  npcChatterMin: 2.5,
  npcChatterMax: 6,
  /** Konfetti: zur vollen Stunde garantiert, sonst Chance pro Sekunde */
  confettiChancePerSecond: 0.012,
};

// ---------------------------------------------------------------------------
// Welt: Gegenmittel und Chancen
// ---------------------------------------------------------------------------

export const ATTRACTIONS = {
  dixi: {
    /** Wartezeit (s) in der Schlange; wächst mit der Uhrzeit um `queuePerHour` je Stunde nach 18 Uhr … */
    queueMin: 0.5,
    queueMax: 2,
    queuePerHour: 0.5,
    /** … und um so viel (s) mit jedem eigenen Besuch (die Leute merken sich das) */
    queuePerVisit: 2,
    /** Zeit in der Kabine (s) */
    insideSeconds: 2.5,
    kotz: -15,
    sprudel: -40,
    misch: -10,
    /** Danach ist die Kabine so lange "wird geputzt" (s) */
    cooldownSeconds: 30,
  },
  riesenrad: {
    rideSeconds: 10,
    /** Pro Sekunde während der Fahrt (zusätzlich zu den normalen Raten) */
    kotzPerSecond: -3.5,
    sprudelPerSecond: -2,
    /** Bis die nächste Gondel frei ist (s) */
    cooldownSeconds: 25,
  },
  lukas: {
    /** So lange (s) läuft die Nadel; wer nicht drückt, schlägt am Ende ins Leere */
    maxSeconds: 4,
    /** Dauer (s) eines Nadel-Durchlaufs hoch und runter (nüchtern) … */
    basePeriod: 1.3,
    /** … je 1 ‰ wird sie um diesen Anteil schneller */
    speedPerPromille: 0.3,
    /** Ab dieser Kraft (0–1) läutet die Glocke: Lebkuchenherz */
    bellAt: 0.92,
    /** Ab dieser Kraft gibt es eine Freimaß */
    prizeAt: 0.7,
    /** Anstrengung: so viel Kotz kostet jeder Schlag */
    effortKotz: 3,
    cooldownSeconds: 15,
  },
};

export const NPC_BEHAVIOR = {
  /** Bierleichen: Besucher schlafen ab der Stimmungs-Phase ein und liegen im Weg */
  bierleiche: { chancePerSecond: 0.004, minSeconds: 14, maxSeconds: 24, radius: 22, maxDown: 3 },
  /** Rempler: torkelnde Besucher (Anteil je Phase), die einem das Bier verschütten */
  rempler: {
    share: { gemuetlich: 0, stimmung: 0.25, lastOrder: 0.45 } as Record<EveningPhaseId, number>,
    promilleLoss: 0.05,
    sprudel: 5,
    kotz: 2,
    knockback: 55,
    /** Pause (s), bevor derselbe Rempler wieder zuschlagen kann */
    cooldownSeconds: 12,
    /** So lange (s) ist man nach einem Rempler vor dem nächsten sicher */
    playerGraceSeconds: 6,
    /** Chance pro Sekunde, dass ein Rempler in der Nähe auf einen zusteuert */
    seekChancePerSecond: 0.12,
    seekRadius: 320,
  },
  /** Security im Biergarten: ab diesem Pegel wird man rausgeschoben */
  security: { count: 1, promille: 2.2, radius: 70, push: 150, chaseSpeed: 95, patrolSpeed: 55, cooldownSeconds: 1.5 },
  /** Familien (Eltern mit Kind) – nur in der gemütlichen Phase, dann gehen sie heim */
  family: { count: 4, leaveSpeed: 80 },
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
// Meta: Run-Modifier (Wetter & Anlass) und Perks
// ---------------------------------------------------------------------------

/** Faktoren, die eine Runde verändern (1 = unverändert, `driftBonus` additiv) */
export interface RunFactors {
  /** Laufgeschwindigkeit */
  speed: number;
  /** Spawn-Intervall der Wiesen-Pickups (< 1 = mehr) */
  fieldSpawnInterval: number;
  /** Abstand zwischen "Prost!"-Rufen (< 1 = öfter) */
  prostInterval: number;
  /** Zusätzliche Drift der Steuerung (Anteil der Laufgeschwindigkeit) */
  driftBonus: number;
  /** Zusätzliche Besucher und Bedienungen */
  extraVisitors: number;
  extraWaitresses: number;
  /** Sprudel-Abbau pro Sekunde */
  sprudelDecay: number;
  /** Passiver Kotz durch den Rausch */
  passiveKotz: number;
  /** Kotz aus Getränken */
  drinkKotz: number;
  /** Promille aus Getränken */
  drinkPromille: number;
  /** Promille-Abbau (Leber) */
  liver: number;
  /** Häufigkeit von Wasser als Wiesen-Pickup */
  wasserWeight: number;
  /** Wirkung von Remplern und Security-Schubsern (Promille-Verlust, Schubs) */
  shove: number;
}

export const NO_FACTORS: RunFactors = {
  speed: 1, fieldSpawnInterval: 1, prostInterval: 1, driftBonus: 0, extraVisitors: 0, extraWaitresses: 0,
  sprudelDecay: 1, passiveKotz: 1, drinkKotz: 1, drinkPromille: 1, liver: 1, wasserWeight: 1, shove: 1,
};

export type ModifierId = 'normal' | 'regen' | 'trachtenumzug' | 'hitzewelle';

export interface ModifierConfig {
  id: ModifierId;
  name: string;
  /** Kurzbeschreibung für Menü und Start-Banner */
  desc: string;
  icon: string;
  factors: Partial<RunFactors>;
  /** Gewicht bei der zufälligen Auswahl (freies Spiel und Tageswiesn) */
  weight: number;
}

export const MODIFIERS: Record<ModifierId, ModifierConfig> = {
  normal: { id: 'normal', name: 'Kaiserwetter', icon: '☀️', desc: 'A ganz normaler, scheener Wiesn-Tag.', factors: {}, weight: 3 },
  regen: {
    id: 'regen', name: 'Regenwetter', icon: '🌧️', desc: 'Matsch: langsamer und rutschig, weniger auf der Wiese, alle drängen ins Zelt (mehr Prost).',
    factors: { speed: 0.9, driftBonus: 0.12, fieldSpawnInterval: 1.4, prostInterval: 0.8 }, weight: 1,
  },
  trachtenumzug: {
    id: 'trachtenumzug', name: 'Trachtenumzug', icon: '🎺', desc: 'Volle Wiesn: mehr Leut, mehr Bedienungen, mehr Prost – und mehr Gedränge.',
    factors: { extraVisitors: 10, extraWaitresses: 3, prostInterval: 0.85 }, weight: 1,
  },
  hitzewelle: {
    id: 'hitzewelle', name: 'Hitzewelle', icon: '🔥', desc: 'Der Sprudel baut langsamer ab und der Rausch schlägt mehr auf den Magen – zum Glück gibt\'s viel Wasser.',
    factors: { sprudelDecay: 0.75, passiveKotz: 1.15, wasserWeight: 2.5 }, weight: 1,
  },
};

export type PerkId = 'lederhose' | 'magen' | 'leber';

export interface PerkConfig {
  id: PerkId;
  name: string;
  desc: string;
  icon: string;
  factors: Partial<RunFactors>;
}

/** Ein Perk pro Runde. Freischaltung über Erfolge, siehe `src/core/meta.ts` */
export const PERKS: Record<PerkId, PerkConfig> = {
  lederhose: {
    id: 'lederhose', name: 'Krachlederne', icon: '🩳', desc: 'Rempler und Security bringen di kaum aus der Ruhe (halbe Wirkung).',
    factors: { shove: 0.5 },
  },
  magen: {
    id: 'magen', name: 'Magen aus Stahl', icon: '🛡️', desc: 'Getränke gehen 15 % weniger auf den Magen, bringen aber 5 % weniger Promille.',
    factors: { drinkKotz: 0.85, drinkPromille: 0.95 },
  },
  leber: {
    id: 'leber', name: 'Leber wia a Ochs', icon: '🐂', desc: 'Promille bauen 40 % langsamer ab, dafür ist dir 10 % schneller schlecht.',
    factors: { liver: 0.6, passiveKotz: 1.1 },
  },
};

/** Wiesn-Aufgaben: so viele pro Runde, jede erfüllte gibt diesen Score-Bonus (multiplikativ addiert) */
export const SIDE_GOALS = { perRound: 3, bonusEach: 0.05 };

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
  family: ['Mama, i mog a Zuckerwatte!', 'Papa, Karussell!', 'Glei geh ma hoam.', 'Ned so schnell!'],
  familyLeave: ['Pfiat eich, mia gengan hoam!', 'Ab ins Bett, Kinder!'],
  security: ['Du hosd gnua, Freind!', 'Do kummst ned eini!', 'Geh weida, Spezl!'],
  rempler: ['Hoppala!', '\'Tschuldigung… hicks!', 'Obacht, Bua!'],
  remplerPlayer: ['Mei Bier!', 'He! Mei Maß!', 'Pass doch auf!'],
  bierleiche: ['Zzz…', 'Nur kurz hinlegen…', 'Mama…'],
  dixi: ['Endlich…', 'Puh, des hat pressiert!', 'Wia neu geboren!'],
  riesenrad: ['Schee is die Aussicht!', 'Durchschnaufen…', 'Von do obn is alles so kloa.'],
  lukasBell: ['DING! Wia a Stier!', 'Hau ruck!'],
  lukasMid: ['Ned schlecht!', 'Fast!'],
  lukasWeak: ['Mei Arm…', 'Des war nix.'],
  heart: ['Mei Lebkuchenherz hod mi grett!', 'Schutzengel aus Lebkuchen!'],
  npc: [
    'Oans, zwoa, g\'suffa!', 'Ein Prosit der Gemütlichkeit!', 'Zwoa Maß, bittschön!',
    'Servus!', 'Mia san mia!', 'Wo is des Klo?', 'Hendl, frisch vom Grill!', 'Brezn, Brezn!',
    'Heid is a scheener Dog!', 'Schee war\'s!', 'Hock di her!',
  ],
};
