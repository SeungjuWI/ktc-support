"use client";

import { Abilities } from "@/lib/types";

const LABELS = ["실무력", "한국어", "영어", "협업·소통", "안정성", "성장성"];
const KEYS: (keyof Abilities)[] = [
  "technical",
  "korean",
  "english",
  "collaboration",
  "stability",
  "growth",
];

const SIZE = 200;
const CENTER = SIZE / 2;
const RADIUS = 75;
const LEVELS = 3;

function polarToCartesian(angle: number, radius: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.cos(rad),
    y: CENTER + radius * Math.sin(rad),
  };
}

function getPolygonPoints(values: number[], maxRadius: number) {
  return values
    .map((v, i) => {
      const angle = (360 / values.length) * i;
      const r = (v / 100) * maxRadius;
      const { x, y } = polarToCartesian(angle, r);
      return `${x},${y}`;
    })
    .join(" ");
}

function getGridPolygon(level: number) {
  const r = (RADIUS / LEVELS) * (level + 1);
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (360 / 6) * i;
    const { x, y } = polarToCartesian(angle, r);
    return `${x},${y}`;
  }).join(" ");
}

export function RadarChart({ abilities }: { abilities: Abilities }) {
  const values = KEYS.map((k) => abilities[k]);
  const dataPoints = getPolygonPoints(values, RADIUS);

  return (
    <div className="flex justify-center mb-6">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="overflow-visible"
      >
        {/* 그리드 배경 */}
        {Array.from({ length: LEVELS }, (_, i) => (
          <polygon
            key={i}
            points={getGridPolygon(i)}
            fill="none"
            stroke="#E5E8EB"
            strokeWidth="0.5"
          />
        ))}

        {/* 축 선 */}
        {Array.from({ length: 6 }, (_, i) => {
          const angle = (360 / 6) * i;
          const { x, y } = polarToCartesian(angle, RADIUS);
          return (
            <line
              key={i}
              x1={CENTER}
              y1={CENTER}
              x2={x}
              y2={y}
              stroke="#E5E8EB"
              strokeWidth="0.5"
            />
          );
        })}

        {/* 데이터 영역 */}
        <g className="animate-radar">
          <polygon
            points={dataPoints}
            fill="#3182F6"
            fillOpacity="0.12"
          />
          <polygon
            points={dataPoints}
            fill="none"
            stroke="#3182F6"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </g>

        {/* 라벨 */}
        {LABELS.map((label, i) => {
          const angle = (360 / 6) * i;
          const { x, y } = polarToCartesian(angle, RADIUS + 18);
          return (
            <text
              key={label}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-gray-500 text-[11px]"
              style={{ fontFamily: "inherit" }}
            >
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
