"use client";

import { Talent } from "@/lib/types";
import { RadarChart } from "./RadarChart";
import { AnimatedOVR } from "./AnimatedOVR";

const ABILITY_KEYS = ["technical", "english", "collaboration", "stability", "growth"] as const;
const ABILITY_LABELS: Record<string, string> = {
  technical: "실무력",
  english: "영어",
  collaboration: "협업·소통",
  stability: "안정성",
  growth: "성장성",
};

function getScoreStyle(score: number) {
  if (score >= 85) return "bg-grade-s-bg text-grade-s-text";
  if (score >= 70) return "bg-grade-a-bg text-grade-a-text";
  return "bg-grade-b-bg text-grade-b-text";
}

export function AbilityCard({ talent }: { talent: Talent }) {
  const hasAbilities = talent.abilities && !ABILITY_KEYS.every(k => talent.abilities[k] === 0);
  const hasSkills = talent.detailed_skills && talent.detailed_skills.length > 0;
  const hasCareer = talent.career_history && talent.career_history.length > 0;
  const verification = (talent as unknown as { verification?: string[] }).verification || [];

  const VERIFY_COLORS: Record<string, string> = {
    "서류 합격": "#3182F6",
    "인터뷰 합격": "#1D9E75",
  };

  // top_skills 사용 가능하면 사용
  const skills = (talent.top_skills?.[0] && talent.top_skills[0] !== "")
    ? talent.top_skills.filter(Boolean)
    : [];

  return (
    <div className="bg-white border-[0.5px] border-gray-200/60 rounded-[20px] p-6 mb-3 animate-section">
      {/* 헤더 */}
      <div className="flex items-start gap-4 mb-6">
        <img src={talent.photo_url || "/default-profile.png"} alt="" className="w-[72px] h-[72px] rounded-full object-cover flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[16px] font-medium text-gray-900 mb-1 leading-tight">
            {talent.role}
          </p>
          <p className="text-[14px] text-gray-600">
            {talent.years_exp > 0 ? `${talent.years_exp}년차` : "신입"} · {talent.location}
          </p>
        </div>
        <div
          className={`text-center px-4 py-2.5 rounded-xl flex-shrink-0 animate-ovr ${getScoreStyle(talent.ovr_score)}`}
        >
          <p className="text-[24px] font-medium leading-none">
            <AnimatedOVR target={talent.ovr_score} />
          </p>
          <p className="text-[11px] font-medium mt-1">OVR</p>
        </div>
      </div>

      {/* 검증 칩 */}
      {verification.length > 0 && (
        <div className="flex gap-1.5 mb-5">
          {verification.map((chip) => (
            <span key={chip} className="text-[11px] px-2.5 py-1 rounded-full"
              style={{ backgroundColor: (VERIFY_COLORS[chip] || "#8B95A1") + "15", color: VERIFY_COLORS[chip] || "#8B95A1" }}>
              {chip}
            </span>
          ))}
        </div>
      )}

      {/* 한줄 요약 */}
      {talent.ktc_comment && (
        <div className="bg-gray-50 rounded-xl px-4 py-3.5 mb-5">
          <p className="text-[14px] text-gray-900 leading-relaxed">
            {talent.ktc_comment}
          </p>
        </div>
      )}

      {/* 핵심 스킬 */}
      {skills.length > 0 && (
        <div className="mb-5">
          <p className="text-[12px] text-gray-500 mb-2.5">핵심 스킬</p>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((skill) => (
              <span key={skill} className="text-[12px] text-gray-700 bg-gray-100 px-2.5 py-1 rounded-full">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 5각형 레이더 차트 + 능력치 바 */}
      {hasAbilities && (
        <div className="mb-5">
          <p className="text-[12px] text-gray-500 mb-3">종합 능력치</p>
          <RadarChart abilities={talent.abilities} />
          <div className="grid grid-cols-2 gap-y-3 gap-x-6">
            {ABILITY_KEYS.map((key, i) => {
              const value = talent.abilities[key];
              return (
                <div key={key}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[13px] text-gray-600">{ABILITY_LABELS[key]}</span>
                    <span className="text-[13px] font-medium text-gray-900">{value}</span>
                  </div>
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-900 rounded-full animate-bar"
                      style={{ width: `${value}%`, animationDelay: `${0.3 + i * 0.06}s` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 세부 스킬 바 */}
      {hasSkills && (
        <div className="mb-5">
          <p className="text-[12px] text-gray-500 mb-3">세부 스킬</p>
          <div className="flex flex-col gap-2.5">
            {talent.detailed_skills.map((skill, i) => (
              <div key={skill.name} className="flex items-center gap-3">
                <span className="text-[13px] text-gray-900 w-[90px] flex-shrink-0">{skill.name}</span>
                <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full animate-bar ${skill.type === "core" ? "bg-blue-500" : "bg-gray-500"}`}
                    style={{ width: `${skill.score}%`, animationDelay: `${0.5 + i * 0.08}s` }}
                  />
                </div>
                <span className="text-[12px] font-medium text-gray-600 w-7 text-right">{skill.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 강점 / 약점 */}
      {talent.tags && talent.tags.length > 0 && (
        <div className="mb-5">
          <p className="text-[12px] text-gray-500 mb-2.5">강점</p>
          <div className="space-y-2">
            {talent.tags.map((s, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-[18px] h-[18px] rounded-full bg-[#1D9E75]/10 flex items-center justify-center flex-shrink-0 mt-[1px]">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5L4.5 7.5L8 3" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-[13px] text-gray-900 leading-relaxed">{s}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 경력 */}
      {hasCareer && (
        <div>
          <p className="text-[12px] text-gray-500 mb-3">경력</p>
          {talent.career_history.map((career, i) => (
            <div
              key={i}
              className={`flex items-start gap-3.5 ${
                i < talent.career_history.length - 1 ? "pb-3 mb-3 border-b-[0.5px] border-gray-200/60" : ""
              }`}
            >
              <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${career.current ? "bg-blue-500" : "bg-gray-300"}`} />
              <div>
                <p className="text-[14px] font-medium text-gray-900 mb-0.5">{career.tier}</p>
                <p className="text-[13px] text-gray-600">
                  {career.position} · {career.startDate} – {career.current ? "현재" : career.endDate}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
