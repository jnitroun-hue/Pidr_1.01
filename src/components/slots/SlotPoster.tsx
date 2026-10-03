type Props = { gameId: string };

export default function SlotPoster({ gameId }: Props) {
  if (gameId === 'hex-vault') return <Hex />;
  if (gameId === 'oak-fortune') return <Oak />;
  if (gameId === 'neon-river') return <River />;
  if (gameId === 'limitless-city') return <City />;
  return <Golden />;
}

function Golden() {
  return (
    <svg viewBox="0 0 240 320" className="posterArt" aria-hidden>
      <defs>
        <linearGradient id="gsky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7c2d12" />
          <stop offset="1" stopColor="#431407" />
        </linearGradient>
      </defs>
      <rect width="240" height="320" fill="url(#gsky)" />
      <circle cx="180" cy="54" r="36" fill="#fde68a" />
      <polygon points="120,70 150,150 90,150" fill="#f5c518" />
      <polygon points="70,110 100,190 40,190" fill="#fbbf24" />
      <polygon points="170,120 200,200 140,200" fill="#f59e0b" />
      <rect x="40" y="210" width="160" height="70" rx="12" fill="#78350f" />
      <circle cx="70" cy="188" r="16" fill="#ef4444" />
      <circle cx="96" cy="196" r="16" fill="#dc2626" />
      <ellipse cx="150" cy="200" rx="22" ry="16" fill="#facc15" />
      <polygon points="120,150 132,186 108,186" fill="#22c55e" />
    </svg>
  );
}

function Hex() {
  return (
    <svg viewBox="0 0 240 320" aria-hidden>
      <rect width="240" height="320" fill="#1c1410" />
      <polygon points="120,40 190,80 190,160 120,200 50,160 50,80" fill="#9a3412" />
      <polygon points="120,58 172,88 172,148 120,178 68,148 68,88" fill="#431407" />
      <path d="M120 90 V150 M96 112 H144" stroke="#fdba74" strokeWidth="8" />
      <rect x="78" y="214" width="84" height="58" rx="6" fill="#b45309" />
      <rect x="104" y="230" width="32" height="22" rx="3" fill="#fde68a" />
    </svg>
  );
}

function Oak() {
  return (
    <svg viewBox="0 0 240 320" aria-hidden>
      <rect width="240" height="320" fill="#14532d" />
      <circle cx="40" cy="40" r="50" fill="#86efac" opacity="0.25" />
      <rect x="108" y="170" width="24" height="110" fill="#78350f" />
      <circle cx="120" cy="130" r="58" fill="#65a30d" />
      <circle cx="78" cy="160" r="36" fill="#84cc16" />
      <circle cx="168" cy="154" r="40" fill="#4d7c0f" />
      <circle cx="120" cy="46" r="16" fill="#fef9c3" />
    </svg>
  );
}

function River() {
  return (
    <svg viewBox="0 0 240 320" aria-hidden>
      <rect width="240" height="320" fill="#082f49" />
      <path d="M0 180 Q60 140 120 180 T240 180 V320 H0 Z" fill="#0e7490" />
      <path d="M0 210 Q60 180 120 210 T240 210 V320 H0 Z" fill="#06b6d4" />
      <circle cx="70" cy="230" r="16" fill="#e0f2fe" />
      <ellipse cx="150" cy="150" rx="28" ry="16" fill="#38bdf8" />
      <polygon points="176,150 206,132 206,168" fill="#0284c7" />
      <rect x="150" y="48" width="28" height="48" rx="6" fill="#fde68a" />
    </svg>
  );
}

function City() {
  return (
    <svg viewBox="0 0 240 320" aria-hidden>
      <rect width="240" height="320" fill="#4c0519" />
      <rect x="20" y="120" width="46" height="160" fill="#881337" />
      <rect x="76" y="70" width="54" height="210" fill="#be123c" />
      <rect x="140" y="100" width="40" height="180" fill="#9f1239" />
      <rect x="188" y="150" width="34" height="130" fill="#fb7185" />
      {[40, 92, 110, 158, 204].map((x) =>
        [150, 180, 210, 240].map((y) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="8" height="10" fill="#fde68a" />
        ))
      )}
      <circle cx="190" cy="48" r="18" fill="#fda4af" />
    </svg>
  );
}
