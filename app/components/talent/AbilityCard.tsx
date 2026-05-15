"use client";

import { Talent, toInitials } from "@/lib/types";
import { RadarChart } from "./RadarChart";
import { AnimatedOVR } from "./AnimatedOVR";

const ABILITY_LABELS: Record<string, string> = {
  technical: "실무력",
  korean: "한국어",
  english: "영어",
  collaboration: "협업·소통",
  stability: "안정성",
  growth: "성장성",
};

function getGradeStyle(grade: string) {
  switch (grade) {
    case "S":
      return "bg-grade-s-bg text-grade-s-text";
    case "A":
      return "bg-grade-a-bg text-grade-a-text";
    default:
      return "bg-grade-b-bg text-grade-b-text";
  }
}

function getRoleLabel(role: string) {
  if (role.includes("디자이너")) return role;
  if (role.includes("분석가")) return role;
  if (role.includes("QA")) return "QA 엔지니어";
  if (role.includes("DevOps")) return "DevOps 엔지니어";
  return `${role} 개발자`;
}

function getAvailabilityText(availability: string) {
  switch (availability) {
    case "immediate":
      return "즉시 합류 가능";
    case "negotiable":
      return "협의 가능";
    default:
      return "현직";
  }
}

export function AbilityCard({ talent }: { talent: Talent }) {
  return (
    <div className="bg-white border-[0.5px] border-gray-200/60 rounded-[20px] p-6 mb-3 animate-section">
      {/* B-1. 헤더 */}
      <div className="flex items-start gap-4 mb-6">
        <div className="w-[72px] h-[72px] rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
          <span className="text-[22px] font-medium text-blue-500">
            {toInitials(talent.name)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[16px] font-medium text-gray-900 mb-1 leading-tight">
            {getRoleLabel(talent.role)}
          </p>
          <p className="text-[14px] text-gray-600">
            {talent.years_exp}년차 · {talent.location} ·{" "}
            {getAvailabilityText(talent.availability)}
          </p>
        </div>
        <div
          className={`text-center px-4 py-2.5 rounded-xl flex-shrink-0 animate-ovr ${getGradeStyle(talent.ovr_grade)}`}
        >
          <p className="text-[24px] font-medium leading-none">
            <AnimatedOVR target={talent.ovr_score} />
          </p>
          <p className="text-[11px] font-medium mt-1">
            OVR · {talent.ovr_grade}
          </p>
        </div>
      </div>

      {/* B-2. KTC 한줄평 */}
      <div className="bg-gray-50 rounded-xl px-4 py-3.5 mb-6">
        <p className="text-[12px] text-gray-500 mb-1.5">KTC 평가</p>
        <p className="text-[14px] text-gray-900 leading-relaxed">
          {talent.ktc_comment}
        </p>
      </div>

      {/* 레이더 차트 */}
      <p className="text-[12px] text-gray-500 mb-3">종합 능력치</p>
      <RadarChart abilities={talent.abilities} />

      {/* B-3. 6대 능력치 바 */}
      <div className="grid grid-cols-2 gap-y-3 gap-x-6 mb-6">
        {Object.entries(talent.abilities).map(([key, value], i) => (
          <div key={key}>
            <div className="flex justify-between mb-1.5">
              <span className="text-[13px] text-gray-600">
                {ABILITY_LABELS[key]}
              </span>
              <span className="text-[13px] font-medium text-gray-900">
                {value}
              </span>
            </div>
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gray-900 rounded-full animate-bar"
                style={{
                  width: `${value}%`,
                  animationDelay: `${0.3 + i * 0.06}s`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* B-4. 세부 스킬 */}
      <p className="text-[12px] text-gray-500 mb-3">세부 스킬</p>
      <div className="flex flex-col gap-2.5">
        {talent.detailed_skills.map((skill, i) => (
          <div key={skill.name} className="flex items-center gap-3">
            <span className="text-[13px] text-gray-900 w-[90px] flex-shrink-0">
              {skill.name}
            </span>
            <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full animate-bar ${skill.type === "core" ? "bg-blue-500" : "bg-gray-500"}`}
                style={{
                  width: `${skill.score}%`,
                  animationDelay: `${0.5 + i * 0.08}s`,
                }}
              />
            </div>
            <span className="text-[12px] font-medium text-gray-600 w-7 text-right">
              {skill.score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
