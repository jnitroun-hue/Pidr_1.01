type Props = { id: string; className?: string };

export default function SlotGlyph({ id, className }: Props) {
  return (
    <svg className={className} viewBox="0 0 80 80" aria-hidden>
      {draw(id)}
    </svg>
  );
}

function draw(id: string) {
  switch (id) {
    case 'cherry':
      return (
        <>
          <ellipse cx="28" cy="48" rx="14" ry="16" fill="#e11d48" />
          <ellipse cx="50" cy="52" rx="14" ry="16" fill="#be123c" />
          <ellipse cx="24" cy="44" rx="5" ry="3" fill="#fecdd3" opacity="0.8" />
          <path d="M30 34 C34 18 48 16 52 28" stroke="#166534" strokeWidth="3" fill="none" />
          <ellipse cx="56" cy="22" rx="8" ry="4" fill="#22c55e" transform="rotate(-20 56 22)" />
        </>
      );
    case 'lemon':
      return (
        <>
          <ellipse cx="40" cy="42" rx="22" ry="18" fill="#facc15" />
          <ellipse cx="40" cy="42" rx="16" ry="12" fill="#fde047" />
          <path d="M18 40 Q40 28 62 40" stroke="#eab308" strokeWidth="2" fill="none" />
          <ellipse cx="30" cy="36" rx="4" ry="2" fill="#fff7c2" />
        </>
      );
    case 'grape':
      return (
        <>
          {[
            [28, 30], [40, 28], [52, 30],
            [24, 42], [36, 40], [48, 42], [58, 44],
            [32, 54], [46, 54], [40, 64],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="7" fill="#7c3aed" />
          ))}
          <path d="M40 20 V12" stroke="#166534" strokeWidth="3" />
          <ellipse cx="50" cy="14" rx="8" ry="4" fill="#4ade80" />
        </>
      );
    case 'bell':
      return (
        <>
          <path d="M18 46 Q18 18 40 16 Q62 18 62 46 Z" fill="#fbbf24" />
          <rect x="16" y="46" width="48" height="8" rx="3" fill="#f59e0b" />
          <circle cx="40" cy="60" r="6" fill="#fde68a" />
          <ellipse cx="32" cy="30" rx="6" ry="8" fill="#fff7d6" opacity="0.7" />
        </>
      );
    case 'gem':
      return (
        <>
          <polygon points="40,8 66,28 40,72 14,28" fill="#10b981" />
          <polygon points="40,8 66,28 40,34 14,28" fill="#6ee7b7" />
          <polygon points="14,28 40,34 40,72" fill="#047857" />
          <polygon points="40,34 66,28 40,72" fill="#34d399" />
        </>
      );
    case 'crown':
      return (
        <>
          <path d="M12 52 L18 28 L32 42 L40 16 L48 42 L62 28 L68 52 Z" fill="#f5c518" />
          <rect x="12" y="52" width="56" height="10" rx="2" fill="#d97706" />
          <circle cx="24" cy="54" r="3" fill="#ef4444" />
          <circle cx="40" cy="54" r="3" fill="#3b82f6" />
          <circle cx="56" cy="54" r="3" fill="#22c55e" />
        </>
      );
    case 'wild':
      return (
        <>
          <polygon points="40,6 48,28 72,30 54,46 60,70 40,56 20,70 26,46 8,30 32,28" fill="#fbbf24" />
          <polygon points="40,16 45,30 60,31 48,42 52,58 40,48 28,58 32,42 20,31 35,30" fill="#fff7d6" />
        </>
      );
    case 'scatter':
      return (
        <>
          <polygon points="40,8 46,30 70,32 52,46 58,70 40,56 22,70 28,46 10,32 34,30" fill="#38bdf8" />
          <circle cx="40" cy="42" r="8" fill="#e0f2fe" />
        </>
      );
    case 'coin':
      return (
        <>
          <circle cx="40" cy="40" r="24" fill="#f59e0b" />
          <circle cx="40" cy="40" r="18" fill="#fbbf24" />
          <text x="40" y="48" textAnchor="middle" fontSize="22" fontWeight="800" fill="#92400e">$</text>
        </>
      );
    case 'dagger':
      return (
        <>
          <path d="M40 8 L50 40 L40 36 L30 40 Z" fill="#e5e7eb" />
          <rect x="36" y="36" width="8" height="28" rx="2" fill="#b45309" />
          <rect x="30" y="36" width="20" height="6" rx="2" fill="#fbbf24" />
        </>
      );
    case 'skull':
      return (
        <>
          <ellipse cx="40" cy="34" rx="18" ry="16" fill="#f5f5f4" />
          <rect x="28" y="44" width="24" height="16" rx="4" fill="#e7e5e4" />
          <circle cx="32" cy="34" r="4" fill="#1c1917" />
          <circle cx="48" cy="34" r="4" fill="#1c1917" />
          <path d="M34 44 H38 V50 H34 Z M42 44 H46 V50 H42 Z" fill="#1c1917" />
        </>
      );
    case 'rune':
      return (
        <>
          <polygon points="40,8 68,24 68,56 40,72 12,56 12,24" fill="#ea580c" />
          <polygon points="40,16 60,28 60,52 40,64 20,52 20,28" fill="#431407" />
          <path d="M40 24 V56 M28 36 H52" stroke="#fdba74" strokeWidth="4" />
        </>
      );
    case 'chest':
      return (
        <>
          <path d="M16 36 Q40 16 64 36 V62 H16 Z" fill="#b45309" />
          <rect x="16" y="40" width="48" height="22" fill="#92400e" />
          <rect x="34" y="44" width="12" height="10" rx="2" fill="#fde68a" />
          <path d="M16 40 H64" stroke="#fbbf24" strokeWidth="3" />
        </>
      );
    case 'leaf':
      return (
        <>
          <path d="M40 70 C20 50 12 28 28 14 C48 20 66 36 40 70 Z" fill="#22c55e" />
          <path d="M34 58 C36 40 42 28 52 20" stroke="#14532d" strokeWidth="2" fill="none" />
        </>
      );
    case 'acorn':
      return (
        <>
          <ellipse cx="40" cy="48" rx="14" ry="16" fill="#a16207" />
          <path d="M24 40 Q40 24 56 40 Q40 34 24 40 Z" fill="#78350f" />
          <rect x="37" y="16" width="6" height="12" rx="2" fill="#65a30d" />
        </>
      );
    case 'mushroom':
      return (
        <>
          <path d="M14 40 Q40 10 66 40 Z" fill="#ef4444" />
          <circle cx="28" cy="34" r="4" fill="#fff" />
          <circle cx="46" cy="30" r="5" fill="#fff" />
          <rect x="32" y="40" width="16" height="22" rx="4" fill="#fde68a" />
        </>
      );
    case 'owl':
      return (
        <>
          <ellipse cx="40" cy="42" rx="18" ry="22" fill="#78350f" />
          <circle cx="32" cy="40" r="7" fill="#fef3c7" />
          <circle cx="48" cy="40" r="7" fill="#fef3c7" />
          <circle cx="32" cy="40" r="3" fill="#1c1917" />
          <circle cx="48" cy="40" r="3" fill="#1c1917" />
          <polygon points="40,46 36,52 44,52" fill="#f59e0b" />
        </>
      );
    case 'oak':
      return (
        <>
          <rect x="36" y="46" width="8" height="22" fill="#92400e" />
          <circle cx="40" cy="32" r="16" fill="#65a30d" />
          <circle cx="28" cy="38" r="10" fill="#84cc16" />
          <circle cx="52" cy="36" r="10" fill="#4d7c0f" />
        </>
      );
    case 'drop':
      return <path d="M40 10 C58 36 58 52 40 68 C22 52 22 36 40 10 Z" fill="#22d3ee" />;
    case 'fish':
      return (
        <>
          <ellipse cx="36" cy="42" rx="20" ry="12" fill="#38bdf8" />
          <polygon points="54,42 70,28 70,56" fill="#0ea5e9" />
          <circle cx="26" cy="40" r="2" fill="#0f172a" />
        </>
      );
    case 'lantern':
      return (
        <>
          <rect x="28" y="22" width="24" height="36" rx="6" fill="#fde68a" />
          <rect x="34" y="14" width="12" height="10" fill="#f59e0b" />
          <path d="M32 40 H48" stroke="#f59e0b" strokeWidth="2" />
          <ellipse cx="40" cy="40" rx="4" ry="8" fill="#fff" opacity="0.7" />
        </>
      );
    case 'pearl':
      return (
        <>
          <path d="M16 48 Q40 20 64 48 Q40 40 16 48 Z" fill="#e2e8f0" />
          <circle cx="40" cy="42" r="10" fill="#f8fafc" />
          <circle cx="36" cy="38" r="3" fill="#fff" />
        </>
      );
    case 'wave':
      return (
        <>
          <path d="M8 36 Q20 24 32 36 T56 36 T80 36" stroke="#22d3ee" strokeWidth="6" fill="none" />
          <path d="M8 50 Q20 38 32 50 T56 50 T80 50" stroke="#67e8f9" strokeWidth="6" fill="none" />
        </>
      );
    case 'ticket':
      return (
        <>
          <rect x="14" y="24" width="52" height="32" rx="4" fill="#fb7185" />
          <circle cx="14" cy="40" r="5" fill="#1a0610" />
          <circle cx="66" cy="40" r="5" fill="#1a0610" />
          <path d="M28 32 H52 M28 40 H48 M28 48 H40" stroke="#fff" strokeWidth="2" />
        </>
      );
    case 'neon':
      return (
        <>
          <rect x="16" y="18" width="48" height="44" rx="4" fill="#1a0610" stroke="#fb7185" strokeWidth="4" />
          <text x="40" y="48" textAnchor="middle" fontSize="18" fontWeight="800" fill="#fda4af">NE</text>
        </>
      );
    case 'car':
      return (
        <>
          <path d="M14 46 L22 32 H58 L66 46 Z" fill="#e11d48" />
          <rect x="12" y="46" width="56" height="12" rx="3" fill="#9f1239" />
          <circle cx="26" cy="58" r="5" fill="#111" />
          <circle cx="54" cy="58" r="5" fill="#111" />
          <path d="M28 32 L32 24 H48 L52 32" fill="#fecdd3" />
        </>
      );
    case 'vault':
      return (
        <>
          <rect x="18" y="22" width="44" height="40" rx="4" fill="#64748b" />
          <circle cx="40" cy="42" r="10" fill="#0f172a" />
          <circle cx="40" cy="42" r="3" fill="#f8fafc" />
          <rect x="38" y="42" width="3" height="8" fill="#f8fafc" />
        </>
      );
    default:
      return <circle cx="40" cy="40" r="16" fill="#f5c518" />;
  }
}
