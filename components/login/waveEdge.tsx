function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type CloudOptions = {
  seed: number;
  baseX: number; // posisi garis di ujung atas & bawah
  arc: number;   // seberapa jauh bagian tengah menjorok  )
  depth: number; // kedalaman tonjolan relatif terhadap tinggi gumpalan
  minH: number;
  maxH: number;
  jitter: number;
};

const H = 1000;
const W = 100;

function cloudPath({ seed, baseX, arc, depth, minH, maxH, jitter }: CloudOptions) {
  const rand = rng(seed);

  const curve = (y: number) => baseX + arc * Math.sin((Math.PI * y) / H);

  let y = 0;
  let cx = curve(0);
  let d = `M${W} 0 L${cx.toFixed(1)} 0`;

  while (y < H) {
    let h =
      rand() < 0.3
        ? minH * (0.4 + rand() * 0.35)
        : minH + rand() * (maxH - minH);

    if (H - y - h < minH * 0.5) h = H - y;
    h = Math.min(h, H - y);

    const nextY = y + h;
    const isLast = nextY >= H;

    const minor = !isLast && rand() < 0.35;
    let nx = isLast ? curve(H) : curve(nextY) + (rand() - 0.5) * jitter;
    if (minor) nx -= h * depth * 0.5;

    const peak = (h * depth * (0.75 + rand() * 0.6)) / 0.75;
    const off1 = peak * (0.8 + rand() * 0.4);
    const off2 = peak * (0.8 + rand() * 0.4);

    const lean1 = 0.1 + rand() * 0.22;
    const lean2 = 0.1 + rand() * 0.22;

    const c1x = Math.max(0, cx - off1);
    const c2x = Math.max(0, nx - off2);
    const c1y = y + h * lean1;
    const c2y = nextY - h * lean2;

    d +=
      ` C${c1x.toFixed(1)} ${c1y.toFixed(1)},` +
      ` ${c2x.toFixed(1)} ${c2y.toFixed(1)},` +
      ` ${nx.toFixed(1)} ${nextY.toFixed(1)}`;

    y = nextY;
    cx = nx;
  }

  d += ` L${W} ${H} Z`;
  return d;
}

// Dari belakang (paling kiri) ke depan (putih)
const LAYERS = [
  {
    d: cloudPath({ seed: 11, baseX: 28, arc: 34, depth: 0.12, minH: 90, maxH: 170, jitter: 6 }),
    fill: "#86efac",
    opacity: 0.35,
  },
  {
    d: cloudPath({ seed: 27, baseX: 42, arc: 34, depth: 0.11, minH: 80, maxH: 150, jitter: 6 }),
    fill: "#bbf7d0",
    opacity: 0.6,
  },
  {
    d: cloudPath({ seed: 5, baseX: 56, arc: 34, depth: 0.1, minH: 70, maxH: 130, jitter: 5 }),
    fill: "#ffffff",
    opacity: 1,
  },
];

const paths = LAYERS.map((layer, i) => (
  <path key={i} d={layer.d} fill={layer.fill} fillOpacity={layer.opacity} />
));

export default function WaveEdge({
  variant = "side",
}: {
  variant?: "side" | "bottom";
}) {
  // Desktop: tepi vertikal di sisi kanan panel
  if (variant === "side") {
    return (
      <svg
        className="pointer-events-none absolute inset-y-0 right-0 h-full w-64"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {paths}
      </svg>
    );
  }

  // HP: path yang sama, diputar (x,y) -> (y,x) jadi tepi horizontal di bawah
  return (
    <svg
      className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full"
      viewBox={`0 0 ${H} ${W}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <g transform="matrix(0 1 1 0 0 0)">{paths}</g>
    </svg>
  );
}