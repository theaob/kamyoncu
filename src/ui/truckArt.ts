import type { BodyKind, VehicleModel } from '../core/types';

/**
 * Parçalı yan görünüm araç çizimi (plan 3.2, docs/gorsel-stil.html "Kamyon parça
 * sistemi"). Birim metredir, zemin y = 0'dır; araç kabin + şasi + kasa/dorse +
 * tekerlerden kodla birleştirilir. Firma rengi `--livery` değişkeninden gelir.
 * Çıktı yalnızca sabit sayılardan üretilen SVG işaretlemesidir (kullanıcı metni içermez).
 */

const L = 'var(--livery)';
const L2 = 'var(--livery-2)';
const DARK = '#24292b';
const STEEL = '#8d979b';
const ALU = '#d3d8da';

const wheel = (x: number, r: number) =>
  `<circle cx="${x}" cy="${-r}" r="${r}" fill="#1b1e1f"/><circle cx="${x}" cy="${-r}" r="${r * 0.48}" fill="#9ca5a8"/><circle cx="${x}" cy="${-r}" r="${r * 0.14}" fill="#1b1e1f"/>`;

const chassis = (x0: number, x1: number, y: number) =>
  `<rect x="${x0}" y="${-y}" width="${x1 - x0}" height=".22" fill="${DARK}"/>`;

function cab(xf: number, len: number, h: number, base: number, sleeper: boolean, stripe: boolean) {
  const x0 = xf - len;
  const top = -h;
  const bot = -base;
  let s = `<path d="M${x0},${bot} L${x0},${top} L${xf - 0.35},${top} Q${xf - 0.05},${top} ${xf - 0.02},${top + 0.35} L${xf},${bot} Z" fill="${L}"/>`;
  if (stripe) {
    s += `<rect x="${x0}" y="${bot - (h - base) * 0.28}" width="${len}" height="${(h - base) * 0.12}" fill="${L2}" opacity=".9"/>`;
  }
  const wx = xf - (sleeper ? 1.25 : 1.0);
  const wTop = top + (sleeper ? 0.55 : 0.3);
  const wBot = top + (h - base) * 0.45;
  s += `<path d="M${wx},${wTop} L${xf - 0.22},${wTop} L${xf - 0.08},${wBot} L${wx},${wBot} Z" fill="#2f4752"/>`;
  if (sleeper) {
    s += `<rect x="${x0 + 0.2}" y="${top + 0.5}" width=".55" height=".3" rx=".05" fill="#2f4752"/>`;
  }
  s += `<line x1="${wx - 0.1}" y1="${wTop - 0.05}" x2="${wx - 0.1}" y2="${bot}" stroke="${DARK}" stroke-width=".03" opacity=".5"/>`;
  s += `<rect x="${xf - 0.12}" y="${bot - 0.05}" width=".16" height=".35" fill="${DARK}"/><rect x="${xf - 0.1}" y="${bot - 0.32}" width=".12" height=".12" fill="#f2c230"/>`;
  return s;
}

/** Güneşlik/rüzgâr kırıcı: premium seviyenin ayırt edici parçası. */
const visor = (xf: number, len: number, h: number) =>
  `<path d="M${xf - len + 0.3},${-h} L${xf - len + 0.3},${-h - 0.15} L${xf - 0.6},${-h - 0.15} L${xf - 0.45},${-h} Z" fill="${L}"/>`;

function cargo(x0: number, x1: number, yb: number, yt: number, kind: BodyKind): string {
  const w = x1 - x0;
  const h = yt - yb;
  let s = '';
  if (kind === 'frigorifik') {
    s += `<rect x="${x0}" y="${-yt}" width="${w}" height="${h}" fill="#f4f6f6" stroke="#9aa3a6" stroke-width=".03"/>`;
    for (let x = x0 + 0.6; x < x1 - 0.2; x += 0.6) {
      s += `<line x1="${x}" y1="${-yt}" x2="${x}" y2="${-yb}" stroke="#aab2b5" stroke-width=".025"/>`;
    }
    s += `<rect x="${x1 - 0.1}" y="${-yt + 0.25}" width=".22" height=".9" fill="#5d686c"/><rect x="${x0}" y="${-yb - 0.45}" width="${w}" height=".2" fill="${L}"/>`;
  } else if (kind === 'tenteli') {
    s += `<rect x="${x0}" y="${-yb - 0.18}" width="${w}" height=".18" fill="${STEEL}"/>`;
    s += `<rect x="${x0}" y="${-yt}" width="${w}" height="${h - 0.18}" fill="${L}"/>`;
    for (let x = x0 + 1.2; x < x1 - 0.3; x += 1.2) {
      s += `<line x1="${x}" y1="${-yt}" x2="${x}" y2="${-yb - 0.18}" stroke="#000" stroke-width=".04" opacity=".22"/>`;
    }
    s += `<rect x="${x0 + w * 0.1}" y="${-yt + h * 0.3}" width="${w * 0.45}" height="${h * 0.2}" fill="${L2}" opacity=".95"/>`;
  } else if (kind === 'tanker') {
    const ty = yt - 0.35;
    const r = (ty - yb) / 2;
    s += `<rect x="${x0 + 0.2}" y="${-ty}" width="${w - 0.4}" height="${ty - yb}" rx="${r}" fill="${ALU}" stroke="#9aa3a6" stroke-width=".03"/>`;
    s += `<rect x="${x0 + 0.5}" y="${-yb - r - 0.12}" width="${w - 1}" height=".24" fill="${L}"/>`;
    for (let x = x0 + 2; x < x1 - 1; x += 3) {
      s += `<rect x="${x}" y="${-ty - 0.15}" width=".6" height=".15" fill="${STEEL}"/>`;
    }
  } else {
    // Konteyner: oluklu kutu ve köşe parçaları.
    s += `<rect x="${x0}" y="${-yt}" width="${w}" height="${h}" fill="#3d6f8e"/>`;
    for (let x = x0 + 0.25; x < x1 - 0.1; x += 0.25) {
      s += `<line x1="${x}" y1="${-yt + 0.12}" x2="${x}" y2="${-yb - 0.12}" stroke="#000" stroke-width=".05" opacity=".18"/>`;
    }
    s += `<rect x="${x0}" y="${-yt}" width="${w}" height=".12" fill="#2e566f"/><rect x="${x0}" y="${-yb - 0.12}" width="${w}" height=".12" fill="#2e566f"/>`;
  }
  return s;
}

/** Sınıf başına rijit kamyon ölçüleri (metre). */
const RIGID: Record<
  1 | 2 | 3 | 4,
  {
    len: number;
    chassisY: number;
    body: [number, number, number, number];
    cab: [number, number, number];
    wheels: number[];
    r: number;
  }
> = {
  1: {
    len: 6,
    chassisY: 0.75,
    body: [0.2, 4.15, 0.78, 2.55],
    cab: [1.75, 2.35, 0.78],
    wheels: [1.6, 5.1],
    r: 0.36,
  },
  2: {
    len: 7.4,
    chassisY: 0.85,
    body: [0.2, 5.35, 0.9, 2.95],
    cab: [1.9, 2.65, 0.9],
    wheels: [2.2, 6.4],
    r: 0.42,
  },
  3: {
    len: 9,
    chassisY: 1,
    body: [0.2, 6.75, 1.05, 3.55],
    cab: [2.1, 3, 1.05],
    wheels: [2.5, 7.8],
    r: 0.5,
  },
  4: {
    len: 10,
    chassisY: 1.05,
    body: [0.2, 7.7, 1.1, 3.65],
    cab: [2.2, 3.05, 1.1],
    wheels: [2, 3.35, 8.8],
    r: 0.5,
  },
};

export interface TruckArt {
  viewBox: string;
  markup: string;
}

/**
 * Araç çizimi. Kamyonda `body` sabit kasadır; çekicide takılı dorse türüdür
 * (`null` ise yalnızca çekici çizilir).
 */
export function drawTruck(model: VehicleModel, body: BodyKind | null): TruckArt {
  const premium = model.tier === 'premium';
  const stripe = model.tier !== 'economy';
  if (!model.tractor) {
    const g = RIGID[model.vehicleClass as 1 | 2 | 3 | 4];
    const [bx0, bx1, byb, byt] = g.body;
    const [clen, ch, cbase] = g.cab;
    let s = chassis(0.3, g.len - 0.1, g.chassisY);
    s += cargo(bx0, bx1, byb, byt, body ?? 'tenteli');
    s += cab(g.len, clen, ch, cbase, premium && model.vehicleClass >= 3, stripe);
    if (premium) s += visor(g.len, clen, ch);
    s += g.wheels.map((x) => wheel(x, g.r)).join('');
    return { viewBox: `-0.3 -4.3 ${g.len + 0.6} 4.5`, markup: s };
  }
  let s =
    chassis(11, 16.4, 1.05) + `<rect x="11.6" y="-1.35" width="1.1" height=".18" fill="${DARK}"/>`;
  if (body) {
    s += cargo(0.3, 13.75, 1.3, 4, body);
    s += `<rect x=".3" y="-1.3" width="13.45" height=".22" fill="${DARK}"/>`;
    s += wheel(1.8, 0.5) + wheel(3.1, 0.5) + wheel(4.4, 0.5);
  }
  s += `<path d="M14.1,-3.85 L14.1,-4.0 L15.0,-4.0 L15.1,-3.85 Z" fill="${L}"/>`;
  s += cab(16.5, 2.4, 3.85, 1.15, true, stripe);
  if (premium) s += visor(16.5, 2.4, 3.85);
  s += wheel(12.1, 0.5) + wheel(15.35, 0.5);
  return { viewBox: body ? '-0.2 -4.3 17 4.5' : '10.3 -4.3 6.5 4.5', markup: s };
}
