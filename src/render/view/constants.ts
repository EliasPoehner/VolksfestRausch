/** Logische Auflösung; der Scale Manager (FIT) skaliert auf jede Bildschirmgröße. */
export const VIEW_WIDTH = 1280;
export const VIEW_HEIGHT = 720;

/** Farbpalette fürs UI */
export const COLORS = {
  ink: '#2b1d14',
  cream: '#fff6e0',
  gold: '#ffd23f',
  blue: '#2f7fd6',
  red: '#e94b3c',
  green: '#3fa34d',
  vomit: '#7ed957',
};

/** Tiefe (z-Order) für Ebenen, die nicht y-sortiert werden */
export const DEPTH = {
  ground: -100000,
  path: -99999,
  decal: -99990,
  night: 100000,
  lights: 100001,
  ui: 100010,
};
