"use client";

import { useEffect, useState } from "react";
import { Talent, toInitials } from "@/lib/types";
import { RadarChart } from "./RadarChart";
import { InterviewRequestModal } from "./InterviewRequestModal";
import { Toast } from "@/app/components/ui/Toast";


const ABILITY_LABELS: Record<string, string> = {
  technical: "실무력",
  korean: "한국어",
  english: "영어",
  collaboration: "협업·소통",
  stability: "안정성",
  growth: "성장성",
};

function getRoleLabel(role: string) {
  if (role.includes("디자이너")) return role;
  if (role.includes("분석가")) return role;
  if (role.includes("QA")) return "QA 엔지니어";
  if (role.includes("DevOps")) return "DevOps 엔지니어";
  return `${role} 개발자`;
}

function getGradeStyle(grade: string) {
  switch (grade) {
    case "S": return "bg-grade-s-bg text-grade-s-text";
    case "A": return "bg-grade-a-bg text-grade-a-text";
    default: return "bg-grade-b-bg text-grade-b-text";
  }
}

export function TalentDetailModal({ talent, onClose }: { talent: Talent; onClose: () => void }) {
  const [animate, setAnimate] = useState(false);
  const [showInterview, setShowInterview] = useState(false);
  const [toast, setToast] = useState("");
  const [scrapped, setScrapped] = useState(false);
  const photo = talent.photo_url;

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("talent-market:scraps") || "[]");
    setScrapped(saved.includes(talent.id));
  }, [talent.id]);

  function handleScrap() {
    const saved: string[] = JSON.parse(localStorage.getItem("talent-market:scraps") || "[]");
    if (saved.includes(talent.id)) {
      localStorage.setItem("talent-market:scraps", JSON.stringify(saved.filter((id: string) => id !== talent.id)));
      setScrapped(false);
      setToast("스크랩이 해제되었습니다");
    } else {
      saved.push(talent.id);
      localStorage.setItem("talent-market:scraps", JSON.stringify(saved));
      setScrapped(true);
      setToast("스크랩되었습니다");
    }
    setTimeout(() => setToast(""), 2000);
  }

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => setAnimate(true), 100);
    return () => { document.body.style.overflow = ""; clearTimeout(t); };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center" onClick={onClose}>
      <div className="w-full max-w-[640px] mx-4 bg-white rounded-[20px] overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

        {/* 헤더 + X버튼 */}
        <div className="flex items-center justify-between p-6 pb-0">
          <div className="flex items-center gap-4">
            {photo ? (
              <img src={photo} alt="" className="w-[72px] h-[72px] rounded-full object-cover" />
            ) : (
              <div className="w-[72px] h-[72px] rounded-full bg-blue-50 flex items-center justify-center">
                <span className="text-[22px] font-medium text-blue-500">{toInitials(talent.name)}</span>
              </div>
            )}
            <div>
              <p className="text-[18px] font-medium text-gray-900 mb-1">{getRoleLabel(talent.role)}</p>
              <p className="text-[14px] text-gray-500">{talent.years_exp}년차 · {talent.location}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`text-center px-4 py-2.5 rounded-xl ${getGradeStyle(talent.ovr_grade)}`}>
              <p className="text-[22px] font-medium leading-none">{talent.ovr_score}</p>
              <p className="text-[11px] font-medium mt-1">OVR · {talent.ovr_grade}</p>
            </div>
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center bg-gray-100 rounded-[10px]">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#6B7684" strokeWidth="1.5" strokeLinecap="round">
                <path d="M5 5l8 8M13 5l-8 8" />
              </svg>
            </button>
          </div>
        </div>

        {/* KTC 평가 */}
        <div className="px-6 pt-5">
          <div className="bg-[#F7F8FA] rounded-xl px-4 py-3.5">
            <p className="text-[12px] text-gray-500 mb-1.5">KTC 평가</p>
            <p className="text-[14px] text-gray-900 leading-relaxed">{talent.ktc_comment}</p>
          </div>
        </div>

        {/* 레이더 차트 + 능력치 */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-6">
            <div className="flex-shrink-0 scale-[0.85] origin-top-left">
              <RadarChart abilities={talent.abilities} />
            </div>
            <div className="flex-1 grid grid-cols-2 gap-y-3.5 gap-x-5">
              {Object.entries(talent.abilities).map(([key, value], i) => (
                <div key={key}>
                  <p className="text-[12px] mb-1"><span className="text-gray-500">{ABILITY_LABELS[key]}</span> <span className="font-medium text-gray-900">{value}</span></p>
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-900 rounded-full transition-all duration-700 ease-out"
                      style={{ width: animate ? `${value}%` : "0%", transitionDelay: `${0.3 + i * 0.08}s` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 세부 스킬 */}
        <div className="px-6 pt-3">
          <p className="text-[11px] text-gray-500 mb-2">세부 스킬</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {talent.detailed_skills.map((skill, i) => (
              <div key={skill.name} className="flex items-center gap-2">
                <span className="text-[12px] text-gray-900 w-[70px] flex-shrink-0">{skill.name}</span>
                <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${skill.type === "core" ? "bg-blue-500" : "bg-gray-400"}`}
                    style={{ width: animate ? `${skill.score}%` : "0%", transitionDelay: `${0.6 + i * 0.08}s` }}
                  />
                </div>
                <span className="text-[11px] text-gray-500 w-5 text-right">{skill.score}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 경력 */}
        <div className="px-6 pt-3">
          <p className="text-[11px] text-gray-500 mb-2">경력</p>
          {talent.career_history.map((career, i) => (
            <div key={i} className="flex items-center gap-2 mb-1">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${career.current ? "bg-blue-500" : "bg-gray-300"}`} />
              <p className="text-[12px] text-gray-700">{career.tier} · {career.position} · {career.startDate}–{career.current ? "현재" : career.endDate}</p>
            </div>
          ))}
        </div>

        {/* 태그 + 희망 연봉 */}
        <div className="px-6 pt-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-1.5">
              {talent.availability === "immediate" && (
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#E8F5E9] text-[#1D9E75] font-medium">즉시 합류</span>
              )}
              {talent.tags.map((tag) => (
                <span key={tag} className="text-[11px] px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">{tag}</span>
              ))}
            </div>
            <p className="text-[20px] font-medium text-gray-900 flex-shrink-0 ml-3">{talent.desired_salary_krw}만원<span className="text-[12px] text-gray-500 font-normal">/월</span></p>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="px-6 pt-4 pb-5 flex gap-2">
          <button
            onClick={handleScrap}
            className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-xl border-[0.5px] transition-colors ${
              scrapped ? "bg-blue-50 border-blue-200" : "bg-white border-gray-200 hover:border-gray-300"
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill={scrapped ? "#3182F6" : "none"} stroke={scrapped ? "#3182F6" : "#8B95A1"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 3h10a1 1 0 011 1v13.5l-6-3.5-6 3.5V4a1 1 0 011-1z"/>
            </svg>
          </button>
          <button
            onClick={() => setShowInterview(true)}
            className="flex-1 h-12 bg-blue-500 text-white rounded-xl text-[15px] font-medium hover:bg-blue-600 active:scale-[0.98] transition"
          >
            문의하기
          </button>
        </div>
      </div>

      {showInterview && (
        <InterviewRequestModal
          talent={talent}
          onClose={() => setShowInterview(false)}
          onSuccess={() => {
            setShowInterview(false);
            setToast("요청이 접수되었습니다. KTC 매니저가 곧 연락드립니다.");
            setTimeout(() => setToast(""), 3000);
          }}
        />
      )}

      {toast && <Toast message={toast} />}
    </div>
  );
}
