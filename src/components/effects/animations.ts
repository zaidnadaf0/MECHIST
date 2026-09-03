/**
 * Hand-authored, minimal Lottie animation data. Each export is a tiny AE-style
 * JSON that lottie-react can play inline — no network fetches.
 *
 * Animations are short loops: pulse, radar, orbit, tick.
 * Standard lottie JSON shape.
 */

export type LottieAnim = {
  v: string;
  fr: number;
  ip: number;
  op: number;
  w: number;
  h: number;
  nm: string;
  ddd: number;
  assets: unknown[];
  layers: unknown[];
  meta: { g: string };
};

const META = 'mechist-inline';
const FRAMES = 60;

// ── helpers ───────────────────────────────────────────────────────────

type RGBATuple = [number, number, number, number];
type ScaleKey = { t?: number; s: [number, number, number]; h?: number };
type OpKey = { t?: number; o: number };

/** Solid filled circle, optionally animated. */
function filledCircle(
  ind: number,
  name: string,
  cx: number,
  cy: number,
  r: number,
  color: RGBATuple,
  scale: ScaleKey[] = [
    { t: 0, s: [100, 100, 100] },
    { t: 60, s: [100, 100, 100] },
  ],
  opacity: OpKey[] = [
    { t: 0, o: 100 },
    { t: 60, o: 100 },
  ],
) {
  return {
    ddd: 0,
    ind,
    ty: 4,
    nm: name,
    sr: 1,
    ks: {
      o: { a: 1, k: opacity, ix: 11 },
      r: { a: 0, k: 0, ix: 10 },
      p: { a: 0, k: [cx, cy, 0], ix: 2 },
      a: { a: 0, k: [0, 0, 0], ix: 1 },
      s: { a: 1, k: scale, ix: 6 },
    },
    ao: 0,
    shapes: [
      {
        ty: 'gr',
        it: [
          {
            d: 1,
            ty: 'el',
            s: { a: 0, k: [r * 2, r * 2], ix: 2 },
            p: { a: 0, k: [0, 0], ix: 3 },
            nm: 'E',
          },
          {
            ty: 'fl',
            c: { a: 0, k: color, ix: 4 },
            o: { a: 0, k: 100, ix: 5 },
            r: 1,
            bm: 0,
            nm: 'F',
          },
          {
            ty: 'tr',
            p: { a: 0, k: [0, 0] },
            a: { a: 0, k: [0, 0] },
            s: { a: 0, k: [100, 100] },
            r: { a: 0, k: 0 },
            o: { a: 0, k: 100 },
          },
        ],
        nm: 'g',
        np: 2,
        cix: 2,
        bm: 0,
        ix: 1,
        hd: false,
      },
    ],
    ip: 0,
    op: 60,
    st: 0,
    bm: 0,
  };
}

/** Stroked ring, optionally scaled. */
function strokedRing(
  ind: number,
  name: string,
  cx: number,
  cy: number,
  r: number,
  color: RGBATuple,
  scale: ScaleKey[] = [
    { t: 0, s: [10, 10, 100] },
    { t: 60, s: [180, 180, 100] },
  ],
  opacity: OpKey[] = [
    { t: 0, o: 100 },
    { t: 60, o: 0 },
  ],
) {
  return {
    ddd: 0,
    ind,
    ty: 4,
    nm: name,
    sr: 1,
    ks: {
      o: { a: 1, k: opacity, ix: 11 },
      r: { a: 0, k: 0, ix: 10 },
      p: { a: 0, k: [cx, cy, 0], ix: 2 },
      a: { a: 0, k: [0, 0, 0], ix: 1 },
      s: { a: 1, k: scale, ix: 6 },
    },
    ao: 0,
    shapes: [
      {
        ty: 'gr',
        it: [
          {
            d: 1,
            ty: 'el',
            s: { a: 0, k: [r * 2, r * 2], ix: 2 },
            p: { a: 0, k: [0, 0], ix: 3 },
            nm: 'E',
          },
          {
            ty: 'st',
            c: { a: 0, k: color, ix: 4 },
            o: { a: 0, k: 100, ix: 5 },
            w: { a: 0, k: 3, ix: 6 },
            lc: 2,
            lj: 2,
            nm: 'S',
          },
          {
            ty: 'tr',
            p: { a: 0, k: [0, 0] },
            a: { a: 0, k: [0, 0] },
            s: { a: 0, k: [100, 100] },
            r: { a: 0, k: 0 },
            o: { a: 0, k: 100 },
          },
        ],
        nm: 'g',
        np: 2,
        cix: 2,
        bm: 0,
        ix: 1,
        hd: false,
      },
    ],
    ip: 0,
    op: 60,
    st: 0,
    bm: 0,
  };
}

// ── exports ───────────────────────────────────────────────────────────

// Radar pulse — concentric expanding ring + center dot
export const radar: LottieAnim = {
  v: '5.7.4',
  fr: FRAMES,
  ip: 0,
  op: FRAMES,
  w: 200,
  h: 200,
  nm: 'radar',
  ddd: 0,
  assets: [],
  layers: [
    strokedRing(1, 'ring1', 100, 100, 30, [0.91, 0.69, 0.29, 1]),
    filledCircle(2, 'dot', 100, 100, 6, [0.91, 0.69, 0.29, 1]),
  ],
  meta: { g: META },
};

// Pulse — single soft circle breathing
export const pulse: LottieAnim = {
  v: '5.7.4',
  fr: FRAMES,
  ip: 0,
  op: FRAMES,
  w: 200,
  h: 200,
  nm: 'pulse',
  ddd: 0,
  assets: [],
  layers: [
    filledCircle(1, 'core', 100, 100, 18, [0.91, 0.69, 0.29, 1], [
      { t: 0, s: [80, 80, 100] },
      { t: 30, s: [120, 120, 100] },
      { t: 60, s: [80, 80, 100] },
    ]),
  ],
  meta: { g: META },
};

// Orbit — satellite rotating around a center
export const orbit: LottieAnim = {
  v: '5.7.4',
  fr: FRAMES,
  ip: 0,
  op: FRAMES,
  w: 200,
  h: 200,
  nm: 'orbit',
  ddd: 0,
  assets: [],
  layers: [
    filledCircle(1, 'center', 100, 100, 6, [0.5, 0.5, 0.5, 1]),
    {
      ddd: 0,
      ind: 2,
      ty: 4,
      nm: 'satellite',
      sr: 1,
      ks: {
        o: { a: 0, k: 100, ix: 11 },
        r: { a: 1, k: [{ t: 0, s: [0] }, { t: 60, s: [360] }], ix: 10 },
        p: {
          a: 1,
          k: [
            { t: 0, s: [100, 30, 0], h: 0 },
            { t: 60, s: [100, 170, 0], h: 0 },
          ],
          ix: 2,
        },
        a: { a: 0, k: [0, 0, 0], ix: 1 },
        s: { a: 0, k: [100, 100, 100], ix: 6 },
      },
      ao: 0,
      shapes: [
        {
          ty: 'gr',
          it: [
            { d: 1, ty: 'el', s: { a: 0, k: [16, 16] }, p: { a: 0, k: [0, 0] }, nm: 'E' },
            { ty: 'fl', c: { a: 0, k: [0.91, 0.69, 0.29, 1] }, o: { a: 0, k: 100 }, r: 1, nm: 'F' },
            {
              ty: 'tr',
              p: { a: 0, k: [0, 0] },
              a: { a: 0, k: [0, 0] },
              s: { a: 0, k: [100, 100] },
              r: { a: 0, k: 0 },
              o: { a: 0, k: 100 },
            },
          ],
          nm: 'g',
        },
      ],
      ip: 0,
      op: 60,
      st: 0,
      bm: 0,
    },
  ],
  meta: { g: META },
};

// Tick — animated checkmark drawn stroke
export const tick: LottieAnim = {
  v: '5.7.4',
  fr: FRAMES,
  ip: 0,
  op: FRAMES,
  w: 200,
  h: 200,
  nm: 'tick',
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: 'check',
      sr: 1,
      ks: {
        o: { a: 0, k: 100, ix: 11 },
        r: { a: 0, k: 0, ix: 10 },
        p: { a: 0, k: [100, 100, 0], ix: 2 },
        a: { a: 0, k: [0, 0, 0], ix: 1 },
        s: { a: 0, k: [100, 100, 100], ix: 6 },
      },
      ao: 0,
      shapes: [
        {
          ty: 'gr',
          it: [
            {
              ind: 0,
              ty: 'sh',
              ix: 1,
              ks: {
                a: 0,
                k: {
                  i: [[0, 0], [0, 0], [0, 0]],
                  o: [[0, 0], [0, 0], [0, 0]],
                  v: [[-40, 0], [-10, 30], [40, -30]],
                  c: false,
                },
              },
              nm: 'path',
            },
            {
              ty: 'tm',
              s: { a: 0, k: 0 },
              e: {
                a: 1,
                k: [
                  { t: 0, s: [0], h: 0 },
                  { t: 25, s: [100], h: 0 },
                  { t: 50, s: [100], h: 0 },
                  { t: 60, s: [100], h: 0 },
                ],
                ix: 2,
              },
              o: { a: 0, k: 0 },
              m: 1,
              ix: 2,
              nm: 'trim',
            },
            {
              ty: 'st',
              c: { a: 0, k: [0.91, 0.69, 0.29, 1] },
              o: { a: 0, k: 100 },
              w: { a: 0, k: 10 },
              lc: 2,
              lj: 2,
              nm: 'stroke',
            },
            {
              ty: 'tr',
              p: { a: 0, k: [0, 0] },
              a: { a: 0, k: [0, 0] },
              s: { a: 0, k: [100, 100] },
              r: { a: 0, k: 0 },
              o: { a: 0, k: 100 },
            },
          ],
          nm: 'g',
        },
      ],
      ip: 0,
      op: 60,
      st: 0,
      bm: 0,
    },
  ],
  meta: { g: META },
};
