/** Hibrit stil harita paleti (bkz. docs/gorsel-stil.html, yön D). Harita her temada açık renktir. */
export const MAP_COLORS = {
  sea: 0xcfe0ea,
  land: 0xf4f2ec,
  coast: 0xa9bfcb,
  otoyol: 0x1f7a4d,
  otoyolCasing: 0xffffff,
  devlet: 0x8f8a7e,
  il: 0xb3ada0,
  cityDot: 0x2a3134,
  cityCenter: 0xffffff,
  label: 0x2a3134,
  labelHalo: 0xf4f2ec,
} as const;

/** Ekran pikseli cinsinden çizgi kalınlıkları; yakınlaştırmadan bağımsız sabit kalır. */
export const ROAD_WIDTH_PX = { otoyol: 4, devlet: 2.5, il: 1.5 } as const;
export const OTOYOL_CASING_PX = 7;
