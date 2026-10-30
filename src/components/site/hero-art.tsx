/** Hero illustration: laptop dashboard, phone voice assistant, reminder notification, invoice and charts. */
export function HeroArt() {
  const bars = [34, 52, 44, 68, 58, 84, 74];
  return (
    <svg viewBox="0 0 620 480" role="img" aria-label="Invoice dashboard on a laptop with a phone voice assistant, a payment reminder and an invoice" className="h-auto w-full">
      <defs>
        <linearGradient id="ha-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#D1FAE5" />
          <stop offset="1" stopColor="#DBEAFE" />
        </linearGradient>
        <linearGradient id="ha-green" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#34D399" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="ha-screen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#F1F5F9" />
        </linearGradient>
        <filter id="ha-shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="14" stdDeviation="14" floodColor="#0F3D2E" floodOpacity="0.22" />
        </filter>
      </defs>

      <ellipse cx="310" cy="250" rx="290" ry="215" fill="url(#ha-bg)" opacity="0.75" />
      <circle cx="560" cy="70" r="26" fill="#BFDBFE" opacity="0.8" />
      <circle cx="60" cy="400" r="18" fill="#A7F3D0" opacity="0.9" />

      {/* laptop */}
      <g filter="url(#ha-shadow)">
        <rect x="110" y="86" width="400" height="258" rx="16" fill="#1E293B" />
        <rect x="122" y="98" width="376" height="234" rx="8" fill="url(#ha-screen)" />
        <path d="M70 344h480l-26 36H96z" fill="#CBD5E1" />
        <path d="M70 344h480l-4 8H74z" fill="#94A3B8" />
        <rect x="262" y="344" width="96" height="8" rx="4" fill="#94A3B8" />
      </g>
      {/* laptop screen contents */}
      <rect x="122" y="98" width="70" height="234" rx="8" fill="#ECFDF5" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x="132" y={116 + i * 26} width={i === 0 ? 50 : 40} height="9" rx="4.5" fill="#059669" opacity={i === 0 ? 1 : 0.35} />
      ))}
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={204 + i * 98} y="108" width="90" height="46" rx="8" fill="#fff" stroke="#E2E8F0" />
          <rect x={212 + i * 98} y="118" width="34" height="6" rx="3" fill="#94A3B8" />
          <rect x={212 + i * 98} y="132" width="56" height="10" rx="4" fill={i === 2 ? "#F59E0B" : "#059669"} />
        </g>
      ))}
      <rect x="204" y="164" width="190" height="156" rx="8" fill="#fff" stroke="#E2E8F0" />
      {bars.map((h, i) => (
        <rect key={i} x={216 + i * 25} y={306 - h} width="16" height={h} rx="4" fill="url(#ha-green)" opacity={0.45 + i * 0.08} />
      ))}
      <polyline points={bars.map((h, i) => `${224 + i * 25},${300 - h - 10}`).join(" ")} fill="none" stroke="#047857" strokeWidth="2.5" strokeLinejoin="round" />
      <rect x="404" y="164" width="86" height="156" rx="8" fill="#fff" stroke="#E2E8F0" />
      <circle cx="447" cy="226" r="26" fill="none" stroke="#E2E8F0" strokeWidth="12" />
      <circle cx="447" cy="226" r="26" fill="none" stroke="#10B981" strokeWidth="12" strokeDasharray="100 164" transform="rotate(-90 447 226)" />
      <circle cx="447" cy="226" r="26" fill="none" stroke="#3B82F6" strokeWidth="12" strokeDasharray="34 164" strokeDashoffset="-100" transform="rotate(-90 447 226)" />
      <rect x="418" y="274" width="58" height="6" rx="3" fill="#CBD5E1" />
      <rect x="418" y="288" width="40" height="6" rx="3" fill="#E2E8F0" />

      {/* phone with voice assistant */}
      <g filter="url(#ha-shadow)">
        <rect x="446" y="196" width="128" height="238" rx="22" fill="#0F172A" />
        <rect x="454" y="206" width="112" height="218" rx="16" fill="#fff" />
        <rect x="492" y="212" width="36" height="6" rx="3" fill="#E2E8F0" />
      </g>
      <circle cx="510" cy="302" r="34" fill="#A7F3D0" opacity="0.6" />
      <circle cx="510" cy="302" r="22" fill="url(#ha-green)" />
      <rect x="505" y="291" width="10" height="16" rx="5" fill="#fff" />
      <path d="M498 304a12 12 0 0 0 24 0M510 316v6" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {[10, 20, 30, 18, 38, 24, 14, 28, 12].map((h, i) => (
        <rect key={i} x={466 + i * 10} y={366 - h / 2} width="5" height={h} rx="2.5" fill="#10B981" opacity="0.8" />
      ))}
      <rect x="470" y="396" width="80" height="8" rx="4" fill="#E2E8F0" />

      {/* reminder notification */}
      <g filter="url(#ha-shadow)">
        <rect x="22" y="120" width="190" height="64" rx="14" fill="#fff" />
      </g>
      <circle cx="52" cy="152" r="16" fill="#FEF3C7" />
      <path d="M52 143a7 7 0 0 0-7 7v5l-3 4h20l-3-4v-5a7 7 0 0 0-7-7zM49 162a3 3 0 0 0 6 0" fill="#F59E0B" />
      <rect x="78" y="140" width="104" height="8" rx="4" fill="#0F172A" opacity="0.8" />
      <rect x="78" y="156" width="82" height="7" rx="3.5" fill="#94A3B8" />

      {/* invoice document */}
      <g filter="url(#ha-shadow)">
        <rect x="40" y="262" width="150" height="176" rx="12" fill="#fff" transform="rotate(-6 115 350)" />
      </g>
      <g transform="rotate(-6 115 350)">
        <rect x="56" y="280" width="52" height="10" rx="5" fill="#059669" />
        <rect x="56" y="300" width="100" height="6" rx="3" fill="#CBD5E1" />
        <rect x="56" y="314" width="84" height="6" rx="3" fill="#E2E8F0" />
        <rect x="56" y="328" width="92" height="6" rx="3" fill="#E2E8F0" />
        <line x1="56" y1="352" x2="174" y2="352" stroke="#E2E8F0" />
        <rect x="56" y="362" width="44" height="9" rx="4.5" fill="#0F172A" opacity="0.8" />
        <rect x="118" y="360" width="56" height="13" rx="6.5" fill="#D1FAE5" />
        <path d="M130 367l4 4 8-8" stroke="#059669" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="56" y="388" width="70" height="30" rx="8" fill="#ECFDF5" />
        <polyline points="62,410 78,400 92,406 118,392" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
