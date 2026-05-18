"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { TalentCard } from "@/app/components/talent/TalentCard";
import { TalentPreviewModal } from "@/app/components/talent/TalentPreviewModal";
import { Header } from "@/app/components/Header";
import type { Talent } from "@/lib/types";

const LANDING_TALENTS: Talent[] = [
  {
    id: "landing-1", name: "Tran N.", role: "프론트엔드", years_exp: 3, location: "호치민",
    ovr_score: 89, ovr_grade: "S", top_skills: ["React", "TypeScript"], korean_level: 4,
    desired_salary_krw: 150, availability: "immediate",
    ktc_comment: "한국 기업 협업 경험 풍부. 의사소통 명료하고 일정 준수 우수.",
    tags: ["한국어 비즈니스", "원격 가능", "한국 기업 경험"],
    abilities: { technical: 88, english: 78, collaboration: 92, stability: 90, growth: 86 },
    detailed_skills: [
      { name: "React", score: 92, type: "core" }, { name: "TypeScript", score: 85, type: "core" },
      { name: "Next.js", score: 80, type: "core" }, { name: "Tailwind CSS", score: 78, type: "sub" },
    ],
    career_history: [
      { tier: "Tier 1 한국계 IT 기업", position: "시니어 프론트엔드", startDate: "2022.03", endDate: "current", current: true },
      { tier: "Tier 2 베트남 스타트업", position: "프론트엔드 개발자", startDate: "2020.06", endDate: "2022.02", current: false },
    ],
    photo_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
  },
  {
    id: "landing-2", name: "Hoang L.", role: "백엔드", years_exp: 4, location: "하노이",
    ovr_score: 85, ovr_grade: "S", top_skills: ["Java", "Spring Boot"], korean_level: 3,
    desired_salary_krw: 180, availability: "negotiable",
    ktc_comment: "대규모 트래픽 처리 경험 보유. 꼼꼼한 성격으로 코드 리뷰에 적극적.",
    tags: ["대규모 트래픽", "MSA 경험", "코드 리뷰 문화"],
    abilities: { technical: 90, english: 82, collaboration: 78, stability: 88, growth: 80 },
    detailed_skills: [
      { name: "Java", score: 90, type: "core" }, { name: "Spring Boot", score: 88, type: "core" },
      { name: "MySQL", score: 82, type: "core" }, { name: "AWS", score: 75, type: "sub" },
    ],
    career_history: [
      { tier: "Tier 1 한국계 IT 기업", position: "백엔드 리드", startDate: "2021.01", endDate: "current", current: true },
      { tier: "Tier 1 글로벌 기업 베트남 지사", position: "시니어 백엔드", startDate: "2018.06", endDate: "2020.12", current: false },
    ],
    photo_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
  },
  {
    id: "landing-3", name: "Minh T.", role: "UI/UX 디자이너", years_exp: 3, location: "호치민",
    ovr_score: 87, ovr_grade: "S", top_skills: ["Figma", "Prototyping"], korean_level: 5,
    desired_salary_krw: 130, availability: "immediate",
    ktc_comment: "차분하고 논리적인 디자이너. 한국어 능통하여 커뮤니케이션 비용 매우 낮음.",
    tags: ["한국어 능통", "디자인 시스템", "스타트업 경험"],
    abilities: { technical: 82, english: 70, collaboration: 90, stability: 85, growth: 88 },
    detailed_skills: [
      { name: "Figma", score: 95, type: "core" }, { name: "Prototyping", score: 88, type: "core" },
      { name: "Design System", score: 82, type: "core" }, { name: "HTML/CSS", score: 65, type: "sub" },
    ],
    career_history: [
      { tier: "Tier 1 한국계 스타트업", position: "리드 디자이너", startDate: "2023.01", endDate: "current", current: true },
      { tier: "Tier 2 베트남 에이전시", position: "UI/UX 디자이너", startDate: "2021.03", endDate: "2022.12", current: false },
    ],
    photo_url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face",
  },
  {
    id: "landing-4", name: "Duc P.", role: "풀스택", years_exp: 3, location: "다낭",
    ovr_score: 78, ovr_grade: "A", top_skills: ["Node.js", "React"], korean_level: 2,
    desired_salary_krw: 140, availability: "negotiable",
    ktc_comment: "프론트와 백엔드를 균형 있게 다루는 타입. 팀 협업에서 강점.",
    tags: ["풀스택", "팀 플레이어", "원격 가능"],
    abilities: { technical: 80, english: 78, collaboration: 82, stability: 75, growth: 76 },
    detailed_skills: [
      { name: "Node.js", score: 82, type: "core" }, { name: "React", score: 78, type: "core" },
      { name: "PostgreSQL", score: 75, type: "core" }, { name: "AWS", score: 65, type: "sub" },
    ],
    career_history: [
      { tier: "Tier 2 한국계 중소기업", position: "풀스택 개발자", startDate: "2021.06", endDate: "current", current: true },
      { tier: "Tier 2 베트남 스타트업", position: "웹 개발자", startDate: "2019.03", endDate: "2021.05", current: false },
    ],
    photo_url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
  },
];

function useInView(ref: React.RefObject<HTMLElement | null>, threshold = 0.3) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref, threshold]);
  return visible;
}

function WhyVietnam() {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, 0.3);
  const [showTitle, setShowTitle] = useState(false);
  const [showItems, setShowItems] = useState([false, false, false, false, false]);

  useEffect(() => {
    if (!visible) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setShowTitle(true), 0));
    for (let i = 0; i < 5; i++) {
      timers.push(setTimeout(() => setShowItems((p) => { const n = [...p]; n[i] = true; return n; }), 600 + i * 200));
    }
    return () => timers.forEach(clearTimeout);
  }, [visible]);

  const items = [
    { num: "50% 절감", desc: "한국 대비 인건비 절반", img: "/money.png" },
    { num: "110만+ 명", desc: "매년 5만명 배출되는 IT 인력", img: "/work.png" },
    { num: "시차 2시간", desc: "실시간 협업이 가능한 거리", img: "/time.png" },
    { num: "한국어 가능", desc: "한국어 소통 가능 인재 보유", img: "/korean.png" },
    { num: "높은 몰입도", desc: "성실하고 끈기 있는 업무 태도", img: "/fire.png" },
  ];

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1080px] px-5 py-40" ref={ref}>
        <div className={`transition-all duration-700 ${showTitle ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <p className="text-[28px] md:text-[34px] font-[600] text-gray-900 tracking-tight text-center mb-3">
            왜 <span className="text-blue-500">베트남</span> IT 인재인가요?
          </p>
          <p className="text-[17px] text-gray-500 text-center mb-14">
            이미 글로벌 기업들이 선택한 이유가 있습니다
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-5 max-w-[1080px] mx-auto">
          {items.map((item, i) => (
            <div
              key={item.num}
              className={`text-center px-5 py-7 rounded-2xl border-[1px] border-gray-200/30 bg-[#F7F8FA] transition-all duration-500 ${showItems[i] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
            >
              <div className="w-28 h-28 mx-auto mb-3">
                <img src={item.img} alt={item.num} className="w-full h-full object-contain" />
              </div>
              <p className="text-[22px] font-[600] text-gray-900 mb-1">{item.num}</p>
              <p className="text-[13px] text-gray-500 leading-snug">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SubHero() {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, 0.5);
  const [show, setShow] = useState([false, false, false, false]);

  useEffect(() => {
    if (!visible) return;
    const t = [
      setTimeout(() => setShow((p) => [true, p[1], p[2], p[3]]), 0),
      setTimeout(() => setShow((p) => [p[0], true, p[2], p[3]]), 300),
      setTimeout(() => setShow((p) => [p[0], p[1], true, p[3]]), 600),
      setTimeout(() => setShow((p) => [p[0], p[1], p[2], true]), 1000),
    ];
    return () => t.forEach(clearTimeout);
  }, [visible]);

  const lines = ["서류 검증", "전화 면접", "능력치 정량화"];

  return (
    <section className="bg-white border-b-[0.5px] border-gray-200/60 mt-20">
      <div className="mx-auto max-w-[1080px] px-5 py-48 text-center" ref={ref}>
        <div className="mb-8">
          {lines.map((text, i) => (
            <p
              key={text}
              className={`text-[28px] md:text-[36px] font-[600] text-gray-900 leading-[1.4] tracking-tight transition-all duration-700 ${show[i] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
            >
              {text}
            </p>
          ))}
        </div>
        <p
          className={`text-[22px] md:text-[28px] text-gray-500 leading-relaxed transition-all duration-700 ${show[3] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
        >
          <span className="text-gray-900 font-medium">모두 완료된 인재</span>만 보여드립니다.
          <br />
          카드 한 장으로 <span className="text-gray-900 font-medium">3초 만에</span> 판단하세요.
        </p>
      </div>
    </section>
  );
}

const COMPARE_ROWS = [
  { label: "이력서 검토", old: "직접 읽고 판단", nw: "능력치 카드로 3초" },
  { label: "인재 검증", old: "자체 검증 필요", nw: "KTC가 사전 평가 완료" },
  { label: "면접", old: "직접 일정 조율", nw: "녹화 면접 제공 (필요 시)" },
  { label: "채용 리드타임", old: "2~4주 소요", nw: "최소 1일" },
  { label: "담당자 에너지", old: "서류→면접→협상 전부", nw: "카드 보고 클릭 한 번" },
] as const;

function CompareSection() {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, 0.35);
  const [showTitle, setShowTitle] = useState(false);
  const [rowPhase, setRowPhase] = useState<number[]>([]);
  // phase: 0=hidden, 1=old visible, 2=old faded + new appears

  useEffect(() => {
    if (!visible) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setShowTitle(true), 0));

    COMPARE_ROWS.forEach((_, i) => {
      const base = 500 + i * 800;
      timers.push(setTimeout(() => {
        setRowPhase((p) => { const n = [...p]; n[i] = 1; return n; });
      }, base));
      timers.push(setTimeout(() => {
        setRowPhase((p) => { const n = [...p]; n[i] = 2; return n; });
      }, base + 400));
    });
    return () => timers.forEach(clearTimeout);
  }, [visible]);

  function getPhase(i: number) { return rowPhase[i] || 0; }

  return (
    <section className="bg-white border-b-[0.5px] border-gray-200/60 mt-40">
      <div className="mx-auto max-w-[560px] px-5 py-32" ref={ref}>
        <div className={`transition-all duration-700 ${showTitle ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <p className="text-[28px] md:text-[34px] font-[600] text-gray-900 tracking-tight text-center mb-3">
            기존 채용과 비교해보세요
          </p>
          <p className="text-[17px] text-gray-500 text-center mb-16">
            같은 채용인데 <span className="text-blue-500 font-medium">에너지가 다릅니다</span>
          </p>
        </div>

        <div className="flex flex-col gap-7">
          {COMPARE_ROWS.map((row, i) => {
            const phase = getPhase(i);
            return (
              <div
                key={row.label}
                className={`transition-all duration-500 ${phase >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
              >
                <p className="text-[15px] font-medium text-gray-900 mb-3">{row.label}</p>
                <div className="flex items-center gap-4">
                  {/* 기존 */}
                  <div className={`flex-1 text-center rounded-xl px-4 py-4 border-[1.5px] border-gray-200 transition-all duration-500 ${phase >= 2 ? "opacity-40" : "bg-white"
                    }`}>
                    <p className="text-[15px] text-gray-700">{row.old}</p>
                  </div>

                  {/* 화살표 */}
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className={`flex-shrink-0 transition-all duration-500 ${phase >= 2 ? "text-blue-500" : "text-gray-300"}`}>
                    <path d="M6 14h16M16 8l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>

                  {/* 베팀 */}
                  <div className={`flex-1 text-center rounded-xl px-4 py-4 border-[2px] transition-all duration-500 ${phase >= 2 ? "border-blue-500 bg-blue-50/60 scale-[1.03]" : "border-gray-200 bg-white opacity-40"
                    }`}>
                    <p className={`text-[15px] font-[600] transition-all duration-500 ${phase >= 2 ? "text-blue-500" : "text-gray-300"
                      }`}>{row.nw}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PreviewSection({ onSelectTalent }: { onSelectTalent: (t: Talent) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, 0.4);
  const [showTitle, setShowTitle] = useState(false);
  const [showCards, setShowCards] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const t1 = setTimeout(() => setShowTitle(true), 0);
    const t2 = setTimeout(() => setShowCards(true), 500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [visible]);

  return (
    <section className="bg-white mt-20">
      <div className="mx-auto max-w-[1080px] px-5 py-40" ref={ref}>
        <div className={`transition-all duration-700 ${showTitle ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <p className="text-[28px] md:text-[34px] font-[600] text-gray-900 tracking-tight text-center mb-3">
            이런 인재들이 <span className="text-blue-500">검증</span>되어 있어요
          </p>
          <p className="text-[17px] text-gray-500 text-center mb-14">
            이력서 분석 · 전화 면접 · 능력치 평가가 완료된 인재만 등록됩니다
          </p>
        </div>
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-[10px] max-w-[900px] mx-auto transition-all duration-700 ${showCards ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          {LANDING_TALENTS.map((talent, i) => (
            <div
              key={talent.id}
              onClick={() => onSelectTalent(talent)}
              className={`cursor-pointer transition-transform duration-200 hover:scale-[1.02] hover:z-10 ${showCards && i === 0 ? "animate-nudge" : ""}`}
            >
              <TalentCard talent={talent} blurPhoto />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaSection() {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, 0.5);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) setShow(true);
  }, [visible]);

  return (
    <section className="bg-white mt-20">
      <div className="mx-auto max-w-[1080px] px-5 py-40 text-center" ref={ref}>
        <div className={`transition-all duration-700 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <p className="text-[28px] md:text-[34px] font-[600] text-gray-900 tracking-tight mb-3">
            베트남 IT 인재 채용,<br className="md:hidden" /> <span className="text-blue-500">더 이상 에너지 쓰지 마세요</span>
          </p>
          <p className="text-[17px] text-gray-500 mb-8">
            가입은 무료입니다 · 채용 확정 시에만 비용이 발생합니다
          </p>
          <Link href="/login" className="inline-block bg-blue-500 text-white px-8 py-4 rounded-xl text-[16px] font-medium hover:bg-blue-600 active:scale-[0.98] transition">
            무료로 시작하기
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  const [selectedTalent, setSelectedTalent] = useState<Talent | null>(null);
  const stepsRef = useRef<HTMLDivElement>(null);
  const stepsVisible = useInView(stepsRef, 0.3);
  const [stepTitleShow, setStepTitleShow] = useState(false);
  const [stepShow, setStepShow] = useState([false, false, false]);

  useEffect(() => {
    if (!stepsVisible) return;
    const t = [
      setTimeout(() => setStepTitleShow(true), 0),
      setTimeout(() => setStepShow((p) => [true, p[1], p[2]]), 700),
      setTimeout(() => setStepShow((p) => [p[0], true, p[2]]), 1100),
      setTimeout(() => setStepShow((p) => [p[0], p[1], true]), 1500),
    ];
    return () => t.forEach(clearTimeout);
  }, [stepsVisible]);

  return (
    <main className="min-h-screen bg-white">
      <Header />

      {/* 히어로 — 풀스크린 배경 이미지 */}
      <section className="h-[calc(100vh-56px)] relative flex items-center justify-center overflow-hidden">
        {/* 배경 이미지 */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/hero-bg.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/55 via-white/35 to-white/65" />

        {/* 콘텐츠 — 텍스트 뒤에 은은한 백드롭 */}
        <div className="relative z-10 text-center px-5">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-white/65 blur-[50px] rounded-full scale-125" />
            <div className="relative">
              <p className="text-[15px] md:text-[17px] text-gray-500 mb-4 animate-section">
                베트남 IT 인재 채용에 에너지 쏟기 싫으시죠?
              </p>
              <h1 className="text-[32px] md:text-[52px] font-[600] text-gray-900 leading-[1.2] tracking-tight animate-section animate-delay-1">
                이력서 분석부터 면접까지,<br />
                <span className="text-blue-500"><span className="font-[700]">베팀</span>이 다 해놨습니다</span>
              </h1>
            </div>
          </div>
        </div>

        {/* 스크롤 화살표 */}
        <button
          onClick={() => window.scrollTo({ top: window.innerHeight, behavior: "smooth" })}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 w-10 h-10 rounded-full bg-white/80 border-[0.5px] border-gray-200/60 flex items-center justify-center hover:bg-white active:scale-[0.95] transition animate-bounce"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#6B7684" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7l5 5 5-5" />
          </svg>
        </button>
      </section>


      {/* 왜 베트남인가 */}
      <WhyVietnam />

      {/* 서브 히어로 */}
      <SubHero />

      {/* 비교표 */}
      <CompareSection />

      {/* 이용 방법 3단계 */}
      <section className="bg-white mt-20">
        <div className="mx-auto max-w-[1080px] px-5 py-40" ref={stepsRef}>
          <div className={`transition-all duration-700 ${stepTitleShow ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <p className="text-[28px] md:text-[34px] font-[600] text-gray-900 tracking-tight text-center mb-3">
              귀사는 <span className="text-blue-500">고르기만</span> 하세요
            </p>
            <p className="text-[17px] text-gray-500 text-center mb-14">
              나머지는 KTC가 전부 처리합니다
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {([
              {
                num: "1",
                tag: "이미 완료됨",
                color: "gray" as const,
                title: "서류 검증 + 능력치 정량화",
                desc: "KTC가 이력서 분석, 전화 면접을 거쳐 6대 역량을 점수화했습니다.",
              },
              {
                num: "2",
                tag: "귀사가 할 일",
                color: "blue" as const,
                title: "카드 비교 → 채용 or 면접",
                desc: "면접 없이 바로 채용하거나, 녹화 면접을 먼저 확인할 수 있습니다.",
              },
              {
                num: "3",
                tag: "KTC가 처리",
                color: "gray" as const,
                title: "면접 조율 + 채용 완료",
                desc: "영업일 1일 내 면접 세팅. 채용 확정 시 EOR 계약까지 원스톱.",
              },
            ] as const).map((step, i) => (
              <div
                key={step.num}
                className={`rounded-2xl border-[1.5px] p-7 transition-all duration-500 ${stepShow[i] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                  } ${step.color === "blue"
                    ? "border-blue-500 bg-blue-50/30"
                    : "border-gray-200 bg-white"
                  }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span
                    className={`w-9 h-9 rounded-full text-[14px] font-medium flex items-center justify-center ${step.color === "blue"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-300 text-white"
                      }`}
                  >
                    {step.num}
                  </span>
                  <span
                    className={`text-[13px] font-medium ${step.color === "blue" ? "text-blue-500" : "text-gray-400"
                      }`}
                  >
                    {step.tag}
                  </span>
                </div>
                <p className="text-[18px] font-medium text-gray-900 mb-3">
                  {step.title}
                </p>
                <p className="text-[15px] text-gray-500 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 인재 미리보기 */}
      <PreviewSection onSelectTalent={setSelectedTalent} />

      {/* 최종 CTA */}
      <CtaSection />

      {/* 풋터 */}
      <footer className="border-t-[0.5px] border-gray-200/60 px-5 py-10">
        <div className="max-w-[1080px] mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <img src="/logo.png" alt="VTM" width={20} height={20} className="rounded-[3px]" />
            <span className="text-[14px] text-gray-700" style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>Vtm</span>
          </div>
          <div className="text-[12px] text-gray-500 leading-[20px]">
            <p>상호명: 멋쟁이사자처럼 · 대표: 나성영</p>
            <p>사업자 번호: 264-88-01106 · 통신판매업 신고번호: 2022-서울종로-1534</p>
            <p>주소: 서울 종로구 종로3길17, 광화문D타워 D1동 16층, 17층</p>
            <p>전화번호: 02-6203-3222 · wsj@likelion.net</p>
          </div>
          <p className="text-[11px] text-gray-400 mt-4">Copyright © 2022 멋쟁이사자처럼 All rights reserved.</p>
        </div>
      </footer>

      {selectedTalent && (
        <TalentPreviewModal talent={selectedTalent} onClose={() => setSelectedTalent(null)} />
      )}
    </main>
  );
}
