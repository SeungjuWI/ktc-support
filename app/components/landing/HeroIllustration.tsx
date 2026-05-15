"use client";

export function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 320 280"
      fill="none"
      className="w-full max-w-[320px]"
    >
      {/* 메인 카드 — 왼쪽에서 슬라이드인 */}
      <g className="landing-card-main">
        <rect x="40" y="30" width="170" height="220" rx="16" fill="white" stroke="#E5E8EB" strokeWidth="0.5" />

        {/* 아바타 */}
        <circle cx="80" cy="72" r="20" fill="#E8F3FF" />
        <text x="80" y="76" textAnchor="middle" fill="#3182F6" fontSize="12" fontWeight="500" style={{ fontFamily: "inherit" }}>T.N</text>

        {/* OVR 뱃지 */}
        <rect x="150" y="55" width="44" height="24" rx="12" fill="#FFF8F0" />
        <text x="172" y="71" textAnchor="middle" fill="#E8590C" fontSize="11" fontWeight="500" style={{ fontFamily: "inherit" }}>S 89</text>

        {/* 직무 */}
        <rect x="56" y="104" width="80" height="10" rx="3" fill="#191F28" opacity="0.85" />
        <rect x="56" y="120" width="56" height="8" rx="3" fill="#8B95A1" opacity="0.5" />

        {/* 스킬 태그 */}
        <rect x="56" y="142" width="48" height="18" rx="9" fill="#F2F4F6" />
        <text x="80" y="154" textAnchor="middle" fill="#6B7684" fontSize="9" style={{ fontFamily: "inherit" }}>React</text>
        <rect x="110" y="142" width="60" height="18" rx="9" fill="#F2F4F6" />
        <text x="140" y="154" textAnchor="middle" fill="#6B7684" fontSize="9" style={{ fontFamily: "inherit" }}>TypeScript</text>

        {/* 별점 */}
        {[0, 1, 2, 3, 4].map((i) => (
          <circle key={i} cx={62 + i * 12} cy="176" r="3.5" fill={i < 4 ? "#3182F6" : "#E5E8EB"} />
        ))}

        {/* 구분선 */}
        <line x1="56" y1="194" x2="194" y2="194" stroke="#F2F4F6" strokeWidth="0.5" />

        {/* 상태 + 연봉 */}
        <circle cx="62" cy="214" r="3" fill="#1D9E75" />
        <rect x="70" y="210" width="36" height="8" rx="3" fill="#8B95A1" opacity="0.4" />
        <rect x="148" y="207" width="46" height="12" rx="3" fill="#191F28" opacity="0.75" />
      </g>

      {/* 미니 레이더 — 오른쪽 상단, 퍼지며 등장 */}
      <g className="landing-radar" style={{ transformOrigin: "262px 90px" }}>
        {/* 그리드 */}
        <polygon points="262,55 292,72.5 292,107.5 262,125 232,107.5 232,72.5" fill="none" stroke="#E5E8EB" strokeWidth="0.5" />
        <polygon points="262,67 280,77.5 280,97.5 262,108 244,97.5 244,77.5" fill="none" stroke="#E5E8EB" strokeWidth="0.5" />
        {/* 데이터 */}
        <polygon points="262,60 288,76 285,105 262,118 238,100 240,74" fill="#3182F6" fillOpacity="0.12" />
        <polygon points="262,60 288,76 285,105 262,118 238,100 240,74" fill="none" stroke="#3182F6" strokeWidth="1" strokeLinejoin="round" />
      </g>

      {/* 플로팅 뱃지 — 우하단 */}
      <g className="landing-badge">
        <rect x="210" y="180" width="80" height="56" rx="14" fill="white" stroke="#E5E8EB" strokeWidth="0.5" />
        <text x="250" y="204" textAnchor="middle" fill="#3182F6" fontSize="18" fontWeight="500" style={{ fontFamily: "inherit" }}>92</text>
        <text x="250" y="222" textAnchor="middle" fill="#8B95A1" fontSize="9" style={{ fontFamily: "inherit" }}>실무력</text>
      </g>

      {/* 작은 점 장식 */}
      <circle cx="30" cy="140" r="2" fill="#3182F6" opacity="0.2" className="landing-dot-1" />
      <circle cx="310" cy="160" r="3" fill="#3182F6" opacity="0.15" className="landing-dot-2" />
      <circle cx="220" cy="268" r="2" fill="#E8590C" opacity="0.2" className="landing-dot-3" />
    </svg>
  );
}
