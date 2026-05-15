"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import type { OvrGrade, Availability, DetailedSkill, CareerEntry, Abilities } from "@/lib/types";
import { supabase } from "@/lib/supabase";

export type TalentFormData = {
  name: string;
  photo_url?: string;
  resume_url?: string;
  role: string;
  years_exp: number;
  location: string;
  ovr_score: number;
  ovr_grade: OvrGrade;
  top_skills: [string, string];
  korean_level: 1 | 2 | 3 | 4 | 5;
  desired_salary_krw: number;
  availability: Availability;
  ktc_comment: string;
  abilities: Abilities;
  detailed_skills: DetailedSkill[];
  career_history: CareerEntry[];
  tags: string[];
  published: boolean;
};

const DEFAULT_DATA: TalentFormData = {
  name: "",
  role: "",
  years_exp: 1,
  location: "호치민",
  ovr_score: 0,
  ovr_grade: "C",
  top_skills: ["", ""],
  korean_level: 1,
  desired_salary_krw: 0,
  availability: "negotiable",
  ktc_comment: "",
  abilities: { technical: 0, korean: 0, english: 0, collaboration: 0, stability: 0, growth: 0 },
  detailed_skills: [],
  career_history: [],
  tags: [],
  published: false,
};

const ABILITY_LABELS: Record<keyof Abilities, string> = {
  technical: "실무력",
  korean: "한국어",
  english: "영어",
  collaboration: "협업·소통",
  stability: "안정성",
  growth: "성장성",
};

const ROLE_OPTIONS = [
  "Frontend", "Backend", "Fullstack", "iOS", "Android", "React Native",
  "Flutter", "DevOps", "데이터 분석가", "UI/UX 디자이너", "QA 엔지니어",
];

const LOCATION_OPTIONS = ["호치민", "하노이", "다낭", "기타"];

const TAG_COMMON = ["원격 가능", "한국 기업 경험", "스타트업 경험", "팀 플레이어", "리더십", "장기 근속", "성장형 인재", "가성비"];
const TAG_BY_ROLE: Record<string, string[]> = {
  Frontend: ["반응형 웹", "디자인 감각", "성능 최적화", "접근성"],
  Backend: ["대규모 트래픽", "MSA 경험", "DB 설계", "API 설계"],
  Fullstack: ["풀스택", "MVP 개발", "1인 개발 가능"],
  iOS: ["앱스토어 출시", "SwiftUI", "레거시 유지보수"],
  Android: ["플레이스토어 출시", "Compose", "레거시 유지보수"],
  "React Native": ["크로스플랫폼", "앱스토어 출시", "네이티브 연동"],
  Flutter: ["크로스플랫폼", "앱스토어 출시", "네이티브 연동"],
  DevOps: ["클라우드 전문", "장애 대응", "문서화 우수", "CI/CD 구축"],
  "데이터 분석가": ["데이터 분석", "대시보드", "BI 도구", "A/B 테스트"],
  "UI/UX 디자이너": ["디자인 시스템", "비주얼 디자인", "사용자 리서치", "프로토타이핑"],
  "QA 엔지니어": ["테스트 자동화", "부하 테스트", "QA 프로세스"],
};
const TAG_LANG = ["한국어 능통", "한국어 비즈니스", "한국어 기초", "영어 소통", "일본어 가능"];

const SKILL_SUGGESTIONS: Record<string, string[]> = {
  Frontend: ["React", "Vue.js", "Angular", "Next.js", "Nuxt.js", "TypeScript", "JavaScript", "HTML/CSS", "Tailwind CSS", "Sass/SCSS", "Redux", "Zustand", "Webpack", "Vite", "Storybook", "Jest", "Cypress", "Figma", "Git"],
  Backend: ["Java", "Spring Boot", "Node.js", "Express", "NestJS", "Python", "Django", "FastAPI", "Go", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Docker", "AWS", "REST API", "GraphQL", "Kafka", "RabbitMQ", "Git"],
  Fullstack: ["React", "Next.js", "Vue.js", "Node.js", "Express", "NestJS", "TypeScript", "Python", "Django", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Docker", "AWS", "REST API", "GraphQL", "Git", "Tailwind CSS"],
  iOS: ["Swift", "SwiftUI", "UIKit", "Objective-C", "Xcode", "CocoaPods", "SPM", "CoreData", "Combine", "RxSwift", "Alamofire", "Firebase", "TestFlight", "CI/CD", "Git"],
  Android: ["Kotlin", "Java", "Jetpack Compose", "Android SDK", "MVVM", "Dagger/Hilt", "Retrofit", "Room", "Coroutines", "RxJava", "Firebase", "Gradle", "CI/CD", "Git"],
  "React Native": ["React Native", "TypeScript", "JavaScript", "Redux", "MobX", "React Navigation", "Expo", "Firebase", "REST API", "GraphQL", "iOS/Android", "CodePush", "Jest", "Git"],
  Flutter: ["Flutter", "Dart", "Bloc", "Provider", "Riverpod", "GetX", "Firebase", "REST API", "GraphQL", "iOS/Android", "Hive", "SQLite", "CI/CD", "Git"],
  DevOps: ["AWS", "GCP", "Azure", "Docker", "Kubernetes", "Terraform", "Ansible", "Jenkins", "GitHub Actions", "GitLab CI", "Prometheus", "Grafana", "ELK Stack", "Nginx", "Linux", "Shell Script", "ArgoCD", "Helm"],
  "데이터 분석가": ["SQL", "Python", "R", "Pandas", "NumPy", "Tableau", "PowerBI", "Looker", "BigQuery", "Spark", "Airflow", "Excel", "Google Analytics", "A/B Testing", "Statistics", "Jupyter", "dbt"],
  "UI/UX 디자이너": ["Figma", "Sketch", "Adobe XD", "Photoshop", "Illustrator", "Prototyping", "Design System", "User Research", "Wireframe", "HTML/CSS", "Framer", "Zeplin", "After Effects", "Motion Design"],
  "QA 엔지니어": ["Selenium", "Cypress", "Appium", "Jest", "JUnit", "TestNG", "Postman", "JMeter", "SQL", "Git", "Jenkins", "JIRA", "Playwright", "K6", "LoadRunner"],
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[15px] font-medium text-gray-900 mb-4 mt-8 first:mt-0">{children}</h2>;
}

function FieldLabel({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <label className="block mb-1.5">
      <span className="text-[13px] text-gray-700">{children}</span>
      {sub && <span className="text-[11px] text-gray-400 ml-1">{sub}</span>}
    </label>
  );
}

const inputClass = "w-full px-3 py-2.5 bg-white border-[0.5px] border-gray-200 rounded-xl text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [appearance:textfield]";

function Dropdown<T extends string>({
  value,
  options,
  onChange,
  placeholder,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full px-3 py-2.5 bg-white border-[0.5px] rounded-xl text-[14px] text-left flex items-center justify-between transition-colors ${
          open ? "border-blue-500" : "border-gray-200"
        }`}
      >
        <span className={selected ? "text-gray-900" : "text-gray-400"}>
          {selected?.label || placeholder || "선택"}
        </span>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#8B95A1" strokeWidth="1.5" strokeLinecap="round" className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M3.5 5.5L7 9l3.5-3.5" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 bg-white border-[0.5px] border-gray-200 rounded-xl py-1 max-h-[200px] overflow-y-auto scrollbar-thin">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-[13px] transition-colors ${
                  value === o.value ? "text-blue-500 bg-blue-50" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function skillSimilarity(skill: string, query: string): number {
  const s = skill.toLowerCase();
  const q = query.toLowerCase();
  if (s === q) return 100;
  if (s.startsWith(q)) return 90;
  if (s.includes(q)) return 70;
  return 0;
}

function SkillInput({
  value,
  role,
  onChange,
}: {
  value: string;
  role: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);

  const roleSkills = SKILL_SUGGESTIONS[role] || [];
  const otherSkills = Object.entries(SKILL_SUGGESTIONS)
    .filter(([k]) => k !== role)
    .flatMap(([, v]) => v);
  const allSkills = Array.from(new Set([...roleSkills, ...otherSkills]));
  const scored = allSkills
    .map((s) => ({ name: s, score: query ? skillSimilarity(s, query) : 50 }))
    .filter((s) => s.score > 20)
    .sort((a, b) => b.score - a.score);

  const hasExactMatch = allSkills.some((s) => s.toLowerCase() === query.toLowerCase());

  function handleSelect(s: string) {
    onChange(s);
    setQuery(s);
    setOpen(false);
  }

  return (
    <div className="relative flex-1 min-w-0">
      <input
        className={inputClass}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="스킬명"
      />
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 bg-white border-[0.5px] border-gray-200 rounded-xl py-1 max-h-[160px] overflow-y-auto scrollbar-thin">
            {scored.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => handleSelect(s.name)}
                className={`w-full text-left px-3 py-2 text-[13px] transition-colors ${
                  s.name.toLowerCase() === query.toLowerCase() ? "text-blue-500 bg-blue-50" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {s.name}
              </button>
            ))}
            {query && !hasExactMatch && (
              <button
                type="button"
                onClick={() => handleSelect(query)}
                className="w-full text-left px-3 py-2 text-[13px] text-blue-500 hover:bg-blue-50 transition-colors border-t border-gray-100"
              >
                &quot;{query}&quot; 직접 추가
              </button>
            )}
            {!query && allSkills.length === 0 && (
              <p className="px-3 py-2 text-[12px] text-gray-400">직무를 먼저 선택해주세요</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function TalentForm({
  initialData,
  onSave,
  saving,
}: {
  initialData?: TalentFormData;
  onSave: (data: TalentFormData) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<TalentFormData>(initialData || DEFAULT_DATA);
  const [tagInput, setTagInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [resumeUploading, setResumeUploading] = useState(false);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function updateField<K extends keyof TalentFormData>(key: K, value: TalentFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("talent-photos")
      .upload(fileName, file, { upsert: true });

    if (error) {
      alert("사진 업로드 실패: " + error.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("talent-photos")
      .getPublicUrl(fileName);

    updateField("photo_url", urlData.publicUrl);
    setUploading(false);
  }

  async function handleResumeUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setResumeUploading(true);
    const fileName = `${Date.now()}_${file.name}`;
    const { error } = await supabase.storage
      .from("talent-resumes")
      .upload(fileName, file, { upsert: true });

    if (error) {
      alert("이력서 업로드 실패: " + error.message);
      setResumeUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("talent-resumes")
      .getPublicUrl(fileName);

    updateField("resume_url", urlData.publicUrl);
    setResumeUploading(false);
  }

  function updateAbility(key: keyof Abilities, value: number) {
    setForm((prev) => ({
      ...prev,
      abilities: { ...prev.abilities, [key]: Math.min(100, Math.max(0, value)) },
    }));
  }

  function updateTopSkill(index: number, value: string) {
    const skills = [...form.top_skills] as [string, string];
    skills[index] = value;
    updateField("top_skills", skills);
  }

  // 세부 스킬
  function addDetailedSkill() {
    setForm((prev) => ({
      ...prev,
      detailed_skills: [...prev.detailed_skills, { name: "", score: 50, type: "core" }],
    }));
  }

  function updateDetailedSkill(index: number, field: keyof DetailedSkill, value: string | number) {
    setForm((prev) => ({
      ...prev,
      detailed_skills: prev.detailed_skills.map((s, i) =>
        i === index ? { ...s, [field]: value } : s
      ),
    }));
  }

  function removeDetailedSkill(index: number) {
    setForm((prev) => ({
      ...prev,
      detailed_skills: prev.detailed_skills.filter((_, i) => i !== index),
    }));
  }

  // 경력
  function addCareer() {
    setForm((prev) => ({
      ...prev,
      career_history: [
        ...prev.career_history,
        { tier: "", position: "", startDate: "", endDate: "", current: false },
      ],
    }));
  }

  function updateCareer(index: number, field: keyof CareerEntry, value: string | boolean) {
    setForm((prev) => ({
      ...prev,
      career_history: prev.career_history.map((c, i) =>
        i === index ? { ...c, [field]: value } : c
      ),
    }));
  }

  function removeCareer(index: number) {
    setForm((prev) => ({
      ...prev,
      career_history: prev.career_history.filter((_, i) => i !== index),
    }));
  }

  // 태그
  function addTag() {
    const tag = tagInput.trim();
    if (tag && !form.tags.includes(tag)) {
      updateField("tags", [...form.tags, tag]);
    }
    setTagInput("");
  }

  function removeTag(tag: string) {
    updateField("tags", form.tags.filter((t) => t !== tag));
  }

  // OVR 등급 자동 계산
  function autoGrade(score: number): OvrGrade {
    if (score >= 85) return "S";
    if (score >= 70) return "A";
    if (score >= 55) return "B";
    return "C";
  }

  function handleOvrChange(raw: string) {
    if (raw === "") {
      setForm((prev) => ({ ...prev, ovr_score: 0, ovr_grade: "C" }));
      return;
    }
    const score = Math.min(99, Math.max(0, parseInt(raw) || 0));
    setForm((prev) => ({ ...prev, ovr_score: score, ovr_grade: autoGrade(score) }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.role) {
      alert("이름과 직무는 필수입니다");
      return;
    }
    onSave(form);
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* 게시 상태 토글 */}
      <div className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl p-5 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[14px] font-medium text-gray-900">게시 상태</p>
            <p className="text-[12px] text-gray-500 mt-0.5">
              {form.published ? "인재 목록에 공개됩니다" : "비공개 상태입니다. 저장 후 게시할 수 있습니다"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => updateField("published", !form.published)}
            className={`relative w-[44px] h-[24px] rounded-full transition-colors ${
              form.published ? "bg-blue-500" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-[2px] w-[20px] h-[20px] rounded-full bg-white transition-transform ${
                form.published ? "left-[22px]" : "left-[2px]"
              }`}
            />
          </button>
        </div>
      </div>

      {/* 기본 정보 */}
      <div className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl p-5 mb-4">
        <SectionTitle>기본 정보</SectionTitle>

        {/* 사진 업로드 */}
        <div className="flex items-center gap-4 mb-5">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-[72px] h-[72px] rounded-full bg-blue-50 flex items-center justify-center cursor-pointer hover:bg-blue-100 transition-colors overflow-hidden flex-shrink-0"
          >
            {form.photo_url ? (
              <img src={form.photo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3182F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-[13px] text-blue-500 font-medium hover:text-blue-600 disabled:text-gray-400"
            >
              {uploading ? "업로드 중..." : form.photo_url ? "사진 변경" : "사진 업로드"}
            </button>
            <p className="text-[11px] text-gray-400 mt-0.5">공개 카드에 표시됩니다</p>
            {form.photo_url && (
              <button
                type="button"
                onClick={() => updateField("photo_url", undefined)}
                className="text-[11px] text-gray-400 hover:text-red-500 mt-0.5"
              >
                삭제
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
          />
        </div>

        {/* 이력서 업로드 */}
        <div className="flex items-center gap-3 mb-5 px-1">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B95A1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
          </svg>
          {form.resume_url ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <a
                href={form.resume_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] text-blue-500 hover:text-blue-600 truncate"
              >
                이력서 보기
              </a>
              <button
                type="button"
                onClick={() => resumeInputRef.current?.click()}
                className="text-[12px] text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                변경
              </button>
              <button
                type="button"
                onClick={() => updateField("resume_url", undefined)}
                className="text-[12px] text-gray-400 hover:text-red-500 flex-shrink-0"
              >
                삭제
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => resumeInputRef.current?.click()}
              disabled={resumeUploading}
              className="text-[13px] text-blue-500 font-medium hover:text-blue-600 disabled:text-gray-400"
            >
              {resumeUploading ? "업로드 중..." : "이력서 PDF 업로드"}
            </button>
          )}
          <input
            ref={resumeInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleResumeUpload}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>이름</FieldLabel>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="Tran Nguyen"
            />
          </div>
          <div>
            <FieldLabel>직무</FieldLabel>
            <Dropdown
              value={form.role}
              options={ROLE_OPTIONS.map((r) => ({ value: r, label: r }))}
              onChange={(v) => updateField("role", v)}
              placeholder="선택"
            />
          </div>
          <div>
            <FieldLabel sub="년">경력</FieldLabel>
            <input
              type="number"
              className={inputClass}
              value={form.years_exp || ""}
              onChange={(e) => updateField("years_exp", parseInt(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
          <div>
            <FieldLabel>지역</FieldLabel>
            <Dropdown
              value={form.location}
              options={LOCATION_OPTIONS.map((l) => ({ value: l, label: l }))}
              onChange={(v) => updateField("location", v)}
            />
          </div>
          <div>
            <FieldLabel sub="만원/월">희망 월급</FieldLabel>
            <input
              type="number"
              className={inputClass}
              value={form.desired_salary_krw || ""}
              onChange={(e) => updateField("desired_salary_krw", parseInt(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
          <div>
            <FieldLabel>합류 가능 상태</FieldLabel>
            <Dropdown
              value={form.availability}
              options={[
                { value: "immediate" as const, label: "즉시 합류" },
                { value: "negotiable" as const, label: "협의 가능" },
                { value: "employed" as const, label: "현직" },
              ]}
              onChange={(v) => updateField("availability", v)}
            />
          </div>
        </div>
      </div>

      {/* OVR + 한국어 */}
      <div className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl p-5 mb-4">
        <SectionTitle>평가</SectionTitle>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <FieldLabel sub="0~99">OVR 점수</FieldLabel>
            <div className="flex items-center gap-3">
              <input
                type="number"
                className={inputClass}
                value={form.ovr_score || ""}
                onChange={(e) => handleOvrChange(e.target.value)}
                placeholder="0"
              />
              <span className={`text-[13px] font-medium px-3 py-2 rounded-full flex-shrink-0 ${
                form.ovr_grade === "S" ? "bg-[#FFF8F0] text-[#E8590C]" :
                form.ovr_grade === "A" ? "bg-[#E8F3FF] text-[#3182F6]" :
                "bg-[#F2F4F6] text-[#6B7684]"
              }`}>
                {form.ovr_grade} 등급
              </span>
            </div>
          </div>
          <div>
            <FieldLabel sub="1~5">한국어 레벨</FieldLabel>
            <div className="flex items-center gap-2">
              {([1, 2, 3, 4, 5] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => updateField("korean_level", level)}
                  className={`w-9 h-9 rounded-lg text-[13px] font-medium transition-colors ${
                    form.korean_level >= level
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>

        <FieldLabel>KTC 평가 코멘트</FieldLabel>
        <textarea
          className={inputClass + " resize-none h-[80px]"}
          value={form.ktc_comment}
          onChange={(e) => updateField("ktc_comment", e.target.value)}
          placeholder="예: 풀스택 역량이 뛰어나고 한국어 소통이 원활합니다"
        />
      </div>

      {/* 핵심 스킬 */}
      <div className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl p-5 mb-4">
        <SectionTitle>핵심 스킬 (카드 표시용)</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>스킬 1</FieldLabel>
            <SkillInput value={form.top_skills[0]} role={form.role} onChange={(v) => updateTopSkill(0, v)} />
          </div>
          <div>
            <FieldLabel>스킬 2</FieldLabel>
            <SkillInput value={form.top_skills[1]} role={form.role} onChange={(v) => updateTopSkill(1, v)} />
          </div>
        </div>
      </div>

      {/* 6대 능력치 */}
      <div className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl p-5 mb-4">
        <SectionTitle>능력치 (레이더 차트)</SectionTitle>
        <div className="grid grid-cols-3 gap-4">
          {(Object.keys(ABILITY_LABELS) as (keyof Abilities)[]).map((key) => (
            <div key={key}>
              <FieldLabel>{ABILITY_LABELS[key]}</FieldLabel>
              <input
                type="number"
                className={inputClass}
                value={form.abilities[key] || ""}
                onChange={(e) => updateAbility(key, parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          ))}
        </div>
      </div>

      {/* 세부 스킬 */}
      <div className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>세부 스킬</SectionTitle>
          <button
            type="button"
            onClick={addDetailedSkill}
            className="text-[13px] text-blue-500 font-medium hover:text-blue-600"
          >
            + 추가
          </button>
        </div>
        {form.detailed_skills.length === 0 ? (
          <p className="text-[13px] text-gray-400 text-center py-4">
            세부 스킬을 추가해주세요
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {form.detailed_skills.map((skill, i) => (
              <div key={i} className="flex items-center gap-2">
                <SkillInput
                  value={skill.name}
                  role={form.role}
                  onChange={(v) => updateDetailedSkill(i, "name", v)}
                />
                <input
                  type="number"
                  className="w-[48px] flex-shrink-0 text-center px-1 py-2.5 bg-white border-[0.5px] border-gray-200 rounded-xl text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [appearance:textfield]"
                  value={skill.score || ""}
                  onChange={(e) => updateDetailedSkill(i, "score", Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                  placeholder="0"
                />
                <button
                  type="button"
                  onClick={() => updateDetailedSkill(i, "type", skill.type === "core" ? "sub" : "core")}
                  className={`px-2 py-1.5 rounded-lg text-[12px] font-medium flex-shrink-0 transition-colors ${
                    skill.type === "core"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {skill.type === "core" ? "핵심" : "보조"}
                </button>
                <button
                  type="button"
                  onClick={() => removeDetailedSkill(i)}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M4 4l8 8M12 4l-8 8" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 경력 */}
      <div className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>경력 사항</SectionTitle>
          <button
            type="button"
            onClick={addCareer}
            className="text-[13px] text-blue-500 font-medium hover:text-blue-600"
          >
            + 추가
          </button>
        </div>
        {form.career_history.length === 0 ? (
          <p className="text-[13px] text-gray-400 text-center py-4">
            경력을 추가해주세요
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {form.career_history.map((career, i) => (
              <div key={i} className="border-[0.5px] border-gray-200/60 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[12px] text-gray-500">경력 {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeCareer(i)}
                    className="text-[12px] text-gray-400 hover:text-red-500 transition-colors"
                  >
                    삭제
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel sub="예: 대기업, 스타트업">회사 티어</FieldLabel>
                    <input
                      className={inputClass}
                      value={career.tier}
                      onChange={(e) => updateCareer(i, "tier", e.target.value)}
                      placeholder="스타트업"
                    />
                  </div>
                  <div>
                    <FieldLabel>포지션</FieldLabel>
                    <input
                      className={inputClass}
                      value={career.position}
                      onChange={(e) => updateCareer(i, "position", e.target.value)}
                      placeholder="Frontend Developer"
                    />
                  </div>
                  <div>
                    <FieldLabel>시작일</FieldLabel>
                    <input
                      className={inputClass}
                      value={career.startDate}
                      onChange={(e) => updateCareer(i, "startDate", e.target.value)}
                      placeholder="2022.03"
                    />
                  </div>
                  <div>
                    <FieldLabel>종료일</FieldLabel>
                    <div className="flex items-center gap-2">
                      <input
                        className={inputClass + (career.current ? " opacity-50" : "")}
                        value={career.current ? "" : career.endDate}
                        onChange={(e) => updateCareer(i, "endDate", e.target.value)}
                        placeholder="2024.01"
                        disabled={career.current}
                      />
                      <label className="flex items-center gap-1.5 flex-shrink-0 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={career.current}
                          onChange={(e) => {
                            updateCareer(i, "current", e.target.checked);
                            if (e.target.checked) updateCareer(i, "endDate", "current");
                          }}
                          className="w-4 h-4 rounded border-gray-300 accent-blue-500"
                        />
                        <span className="text-[12px] text-gray-500">재직중</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 태그 */}
      <div className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl p-5 mb-4">
        <SectionTitle>태그</SectionTitle>

        {/* 언어 */}
        <p className="text-[12px] text-gray-500 mb-2">언어</p>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {TAG_LANG.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => form.tags.includes(tag) ? removeTag(tag) : updateField("tags", [...form.tags, tag])}
              className={`px-2.5 py-1.5 rounded-full text-[12px] transition-colors ${
                form.tags.includes(tag)
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* 직무별 */}
        {(TAG_BY_ROLE[form.role] || []).length > 0 && (
          <>
            <p className="text-[12px] text-gray-500 mb-2">직무</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {TAG_BY_ROLE[form.role].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => form.tags.includes(tag) ? removeTag(tag) : updateField("tags", [...form.tags, tag])}
                  className={`px-2.5 py-1.5 rounded-full text-[12px] transition-colors ${
                    form.tags.includes(tag)
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </>
        )}

        {/* 공통 */}
        <p className="text-[12px] text-gray-500 mb-2">공통</p>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {TAG_COMMON.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => form.tags.includes(tag) ? removeTag(tag) : updateField("tags", [...form.tags, tag])}
              className={`px-2.5 py-1.5 rounded-full text-[12px] transition-colors ${
                form.tags.includes(tag)
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* 직접 추가 */}
        <div className="flex gap-2">
          <input
            className={inputClass + " flex-1"}
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); addTag(); }
            }}
            placeholder="직접 추가"
          />
          <button
            type="button"
            onClick={addTag}
            className="px-3 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-[13px] font-medium hover:bg-gray-200 transition-colors flex-shrink-0"
          >
            추가
          </button>
        </div>

        {/* 프리셋에 없는 커스텀 태그만 표시 */}
        {form.tags.filter((t) => ![...TAG_LANG, ...(TAG_BY_ROLE[form.role] || []), ...TAG_COMMON].includes(t)).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {form.tags
              .filter((t) => ![...TAG_LANG, ...(TAG_BY_ROLE[form.role] || []), ...TAG_COMMON].includes(t))
              .map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-[12px] text-white bg-gray-900 px-2.5 py-1.5 rounded-full"
                >
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="text-gray-400 hover:text-red-300">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M3 3l6 6M9 3l-6 6" />
                    </svg>
                  </button>
                </span>
              ))}
          </div>
        )}
      </div>

      {/* 저장 버튼 */}
      <div className="flex items-center justify-between py-6">
        <Link
          href="/admin/talents"
          className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-[14px] font-medium hover:bg-gray-200 transition-colors"
        >
          취소
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 bg-blue-500 text-white rounded-xl text-[14px] font-medium hover:bg-blue-600 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </form>
  );
}
