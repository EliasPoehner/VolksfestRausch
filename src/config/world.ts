/**
 * Layout der Festwiese in Welt-Koordinaten.
 *
 * Konvention: x nach rechts, y nach "unten" (Süden) in der Draufsicht.
 * Für eine spätere 3D-Version wird (x, y) einfach auf (x, z) gemappt –
 * die Höhe (y in Three.js) spielt für die Logik keine Rolle.
 */

export interface RectDef { x: number; y: number; w: number; h: number }
export interface CircleDef { x: number; y: number; r: number }

export type BoothKind = 'brezn' | 'hendl' | 'steckerlfisch';

export const WORLD = {
  width: 2600,
  height: 1800,
  /** Rand, den der Spieler nicht verlassen kann (Zaun) */
  border: 40,
};

/** Das große Bierzelt (fest, man läuft drumherum) */
export const TENT: RectDef = { x: 1000, y: 120, w: 600, h: 380 };
/** Ausgang des Zelts – hier holen sich die Bedienungen Nachschub */
export const TENT_DOOR = { x: TENT.x + TENT.w / 2, y: TENT.y + TENT.h + 20 };

/** Karussell: begehbar, aber man wird gedreht (Mittelmast ist fest) */
export const CAROUSEL: CircleDef = { x: 480, y: 470, r: 175 };
export const CAROUSEL_POLE_RADIUS = 34;

/** Autoscooter-Fläche: begehbar, Autoscooter fahren darin herum */
export const BUMPER_ARENA: RectDef = { x: 1920, y: 260, w: 520, h: 400 };

/** Buden: fest, Aufnahme-Punkt vor der Theke (Süden) */
export const BOOTHS: { kind: BoothKind; rect: RectDef }[] = [
  { kind: 'brezn', rect: { x: 600, y: 1180, w: 150, h: 90 } },
  { kind: 'hendl', rect: { x: 980, y: 1330, w: 150, h: 90 } },
  { kind: 'steckerlfisch', rect: { x: 1560, y: 1330, w: 150, h: 90 } },
  { kind: 'brezn', rect: { x: 1980, y: 1180, w: 150, h: 90 } },
  { kind: 'hendl', rect: { x: 2200, y: 1460, w: 150, h: 90 } },
];
/** Abstand des Aufnahme-Punkts unterhalb der Bude */
export const BOOTH_COUNTER_OFFSET = 34;

/** Bierbänke (Tisch mit Bänken) im Biergarten vor dem Zelt */
export const BENCHES: RectDef[] = (() => {
  const list: RectDef[] = [];
  const cols = [860, 1160, 1460];
  const rows = [600, 720, 840];
  for (const y of rows) for (const x of cols) list.push({ x, y, w: 220, h: 46 });
  // Ein paar verstreute Bänke an den Buden
  list.push({ x: 300, y: 1450, w: 220, h: 46 });
  list.push({ x: 1250, y: 1600, w: 220, h: 46 });
  list.push({ x: 2050, y: 860, w: 220, h: 46 });
  return list;
})();
/** Plätze für Krüge je Bank */
export const BENCH_SLOTS = 3;

/** Wege (rein dekorativ, Kies) */
export const PATHS: RectDef[] = [
  { x: 40, y: 1020, w: 2520, h: 110 },
  { x: 1245, y: 500, w: 110, h: 1260 },
  { x: 360, y: 640, w: 110, h: 420 },
  { x: 2130, y: 640, w: 110, h: 420 },
];

/** Lichterketten: Linien zwischen Masten (Renderer hängt Birnen dran) */
export const LIGHT_STRINGS: { from: { x: number; y: number }; to: { x: number; y: number } }[] = [
  { from: { x: 60, y: 1000 }, to: { x: 640, y: 1000 } },
  { from: { x: 640, y: 1000 }, to: { x: 1240, y: 1000 } },
  { from: { x: 1360, y: 1000 }, to: { x: 1960, y: 1000 } },
  { from: { x: 1960, y: 1000 }, to: { x: 2540, y: 1000 } },
  { from: { x: 60, y: 1150 }, to: { x: 640, y: 1150 } },
  { from: { x: 640, y: 1150 }, to: { x: 1240, y: 1150 } },
  { from: { x: 1360, y: 1150 }, to: { x: 1960, y: 1150 } },
  { from: { x: 1960, y: 1150 }, to: { x: 2540, y: 1150 } },
  { from: { x: 840, y: 560 }, to: { x: 1240, y: 560 } },
  { from: { x: 1360, y: 560 }, to: { x: 1760, y: 560 } },
  { from: { x: 840, y: 920 }, to: { x: 1240, y: 920 } },
  { from: { x: 1360, y: 920 }, to: { x: 1760, y: 920 } },
];

/** Startposition des Spielers */
export const PLAYER_START = { x: 1300, y: 960 };
