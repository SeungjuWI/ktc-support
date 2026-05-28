"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getUserProfile } from "@/lib/supabase-auth";
import { Header } from "@/app/components/Header";

const TOTAL_STEPS = 7;

export default function CriteriaPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [animKey, setAnimKey] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace("/login"); return; }
      const profile = await getUserProfile(session.user.id, true);
      if (!profile || profile.status !== "approved") { router.replace("/login"); return; }
      setAuthed(true);
    });
  }, [router]);

  const goTo = useCallback((target: number) => {
    if (target === step) return;
    setDirection(target > step ? "next" : "prev");
    setStep(target);
    setAnimKey((k) => k + 1);
    contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  if (!authed) {
    return (
      <main className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <p className="text-[14px] text-gray-500">로딩 중...</p>
      </main>
    );
  }

  const canPrev = step > 0;
  const canNext = step < TOTAL_STEPS - 1;

  return (
    <main className="h-screen flex flex-col bg-[#F7F8FA] overflow-hidden">
      <Header />

      <div className="flex-1 flex flex-col mx-auto w-full max-w-[720px] px-5 overflow-hidden">
        {/* 상단 고정: 뒤로가기 + 프로그레스 */}
        <div className="pt-6 pb-8 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/talents"
              className="inline-flex items-center gap-1 text-[13px] text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              인재 목록
            </Link>
            <span className="text-[12px] text-gray-400">
              {step + 1} / {TOTAL_STEPS}
            </span>
          </div>

          <div className="flex gap-1">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className="h-[3px] flex-1 rounded-full overflow-hidden bg-[#E5E8EB]"
              >
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: i <= step ? "100%" : "0%",
                    backgroundColor: "#3182F6",
                  }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* 콘텐츠: 남은 공간 채움 + 스크롤 */}
        <div ref={contentRef} className="flex-1 overflow-y-auto scrollbar-hide pb-4">
          <div
            key={`content-${animKey}`}
            className={direction === "next" ? "criteria-slide-next" : "criteria-slide-prev"}
          >
            {step === 0 && <StepOverview />}
            {step === 1 && <StepR1Hard />}
            {step === 2 && <StepR1Score />}
            {step === 3 && <StepR1Yoe />}
            {step === 4 && <StepR2 />}
            {step === 5 && <StepR3 />}
            {step === 6 && <StepNotes />}
          </div>
        </div>

        {/* 하단 고정: 네비게이션 */}
        <div className="shrink-0 py-4 border-t border-gray-200/60 bg-[#F7F8FA]">
          <div className="flex items-center justify-between">
            <button
              onClick={() => canPrev && goTo(step - 1)}
              className={`inline-flex items-center gap-1.5 text-[13px] px-4 py-2.5 rounded-xl transition-all duration-100 ${
                canPrev
                  ? "text-gray-700 bg-white border-[0.5px] border-gray-200 hover:border-gray-300 active:scale-[0.97]"
                  : "text-gray-300 cursor-default"
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              이전
            </button>

            {canNext ? (
              <button
                onClick={() => goTo(step + 1)}
                className="inline-flex items-center gap-1.5 text-[13px] text-white bg-[#3182F6] hover:bg-[#2272EB] px-5 py-2.5 rounded-xl transition-all duration-100 active:scale-[0.97]"
              >
                다음
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            ) : (
              <Link
                href="/talents"
                className="inline-flex items-center gap-1.5 text-[13px] text-white bg-[#3182F6] hover:bg-[#2272EB] px-5 py-2.5 rounded-xl transition-all duration-100 active:scale-[0.97]"
              >
                인재 목록으로
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

/* ================================================================
   STEP 0 — 프로세스 개요
   ================================================================ */
function StepOverview() {
  return (
    <div className="criteria-stagger">
      <div>
        <h1 className="text-[22px] font-medium text-gray-900 tracking-tight mb-2">
          단계별 평가 기준 안내
        </h1>
        <p className="text-[14px] text-gray-500 leading-relaxed mb-8">
          KTC 2026 채용 프로세스는 총 3단계로 구성됩니다.
        </p>
      </div>

      {/* 3단계 카드 */}
      <ProcessCard
        step="R1" color="blue"
        title="1차 서류 스크리닝"
        who="채용 담당자"
        score="16점 만점"
        pass="10점 이상 + Hard Fail 없음"
      />
      <ProcessCard
        step="R2" color="green"
        title="AI 1차 스크리닝"
        who="AI (프롬프트 기반)"
        score="100점 만점"
        pass="70점 이상 (YOE 윈도우 내)"
      />
      <ProcessCard
        step="R3" color="orange"
        title="전화 인터뷰"
        who="채용 담당자"
        score="60점 만점"
        pass="별도 기준"
      />

      {/* 운영 원칙 */}
      <div className="bg-white rounded-2xl border-[0.5px] border-gray-200/60 p-5 mt-5">
        <p className="text-[13px] font-medium text-gray-900 mb-3">운영 원칙</p>
        <ul className="space-y-2.5">
          <Li>R1과 R2는 병행 또는 순차 운영 가능 (조직 정책에 따름)</Li>
          <Li>R1에서 <Highlight>Flag</Highlight> 처리된 항목은 R3에서 반드시 추가 확인</Li>
          <Li>R3는 R1·R2 통과자만 진행</Li>
        </ul>
      </div>
    </div>
  );
}

/* ================================================================
   STEP 1 — R1 필수요건 (Hard Requirements)
   ================================================================ */
function StepR1Hard() {
  return (
    <div className="criteria-stagger">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge color="blue">R1</Badge>
          <h1 className="text-[22px] font-medium text-gray-900 tracking-tight">필수 요건</h1>
        </div>
        <p className="text-[14px] text-gray-500 leading-relaxed mb-8">
          이력서(CV) 기반으로 기본 자격을 확인합니다.
        </p>
      </div>

      {/* 핵심 강조 */}
      <div className="bg-[#FFF8F0] rounded-2xl p-4">
        <p className="text-[13px] font-medium text-[#E8590C]">
          하나라도 Fail이면 즉시 탈락
        </p>
      </div>

      {/* 요건 카드 */}
      <HardCard label="국적" pass="베트남 국적이어야 통과" />
      <HardCard label="전공" pass="IT 관련 전공 또는 실무 포트폴리오가 있어야 통과" />
      <HardCard label="경력" pass="지원 포지션에서 6개월 이상 경력이 있어야 통과" />
      <HardCard label="프로젝트" pass="실제 참여한 프로젝트가 1건 이상이어야 통과" sub="수강 과목 나열만으로는 불충분" />
      <HardCard label="영어" pass="영문 이력서 또는 공인 자격증이 있어야 통과" flag />
      <HardCard label="입사 가능 시점" pass="합류 가능 시점이 명확해야 통과" flag sub="잦은 이직, 경력 공백, 정보 모순 시 확인 필요" />

      <p className="text-[11px] text-gray-400 mt-1">
        * 확인 필요 항목은 즉시 탈락이 아닌, R3 전화 인터뷰에서 추가 확인
      </p>
    </div>
  );
}

/* ================================================================
   STEP 2 — R1 채점 기준
   ================================================================ */
function StepR1Score() {
  return (
    <div className="criteria-stagger">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge color="blue">R1</Badge>
          <h1 className="text-[22px] font-medium text-gray-900 tracking-tight">채점 기준</h1>
        </div>
        <p className="text-[14px] text-gray-500 leading-relaxed mb-8">
          총 16점 만점, <span className="text-[#3182F6] font-medium">10점 이상</span> 통과
        </p>
      </div>

      {/* 배점표 */}
      <ScoreCard label="한국어 능력" sub="TOPIK 3~6급" score="+1" desc="가산점" accent />
      <ScoreCard label="업무 경험 기술" score="3" desc="경력 연차별 차등 평가 (다음 페이지에서 상세)" />
      <ScoreCard label="프로젝트 경험" score="3" desc="GitHub / 데모 링크 + 역할 명시 + 기술 스택 적합성" />
      <ScoreCard label="이력서 구성력" score="3" desc="90초 내 핵심 파악이 가능한 구조인지" />
      <ScoreCard label="성장 가능성" score="3" desc="자기주도 학습 / 해커톤 / 사이드 프로젝트 / 외부 자격증" />
      <ScoreCard label="직무 적합도" score="3" desc="기술 스택·경력이 채용 포지션과 얼마나 맞는지" />
    </div>
  );
}

/* ================================================================
   STEP 3 — R1 업무 경험 연차별 상세
   ================================================================ */
function StepR1Yoe() {
  return (
    <div className="criteria-stagger">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge color="blue">R1</Badge>
          <h1 className="text-[22px] font-medium text-gray-900 tracking-tight">업무 경험 — 연차별 상세</h1>
        </div>
        <p className="text-[14px] text-gray-500 leading-relaxed mb-5">
          &lsquo;업무 경험 기술&rsquo; 3점 항목의 연차별 채점 기준입니다.
        </p>
      </div>

      <YoeCompact tier="신입" range="1년 미만" low="학교 프로젝트 + 역할 명시" mid="기여도 불명확" high="구체적 기술 스택 + 실질적 기여" />
      <YoeCompact tier="주니어" range="1~2년" low="동일 업무 반복" mid="다양한 업무, 독립 처리 없음" high="기능 독립 처리 + 팀 임팩트" />
      <YoeCompact tier="미들" range="2~4년" low="시스템적 사고 초기" mid="소규모 리딩 + 결과물" high="리딩 + 임팩트 + 멘토링" />
      <YoeCompact tier="시니어" range="4년 이상" low="주도성 부재" mid="오너십 + 프로젝트 완수" high="매니징 + 성장 견인 + 로드맵" />
    </div>
  );
}

/* ================================================================
   STEP 4 — R2 AI 스크리닝
   ================================================================ */
function StepR2() {
  return (
    <div className="criteria-stagger">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge color="green">R2</Badge>
          <h1 className="text-[22px] font-medium text-gray-900 tracking-tight">AI 1차 스크리닝</h1>
        </div>
        <p className="text-[14px] text-gray-500 leading-relaxed mb-8">
          AI가 이력서를 표준화된 기준으로 정량 평가합니다.<br />
          100점 만점, <span className="text-[#1D9E75] font-medium">70점 이상</span> 통과
        </p>
      </div>

      {/* 평가 항목: 3D 도넛 + 범례 */}
      <DonutSection />

      {/* 연차 기준 */}
      <div className="bg-white rounded-2xl border-[0.5px] border-gray-200/60 p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[13px] font-medium text-gray-900">경력 연차 기준</p>
          <span className="text-[11px] text-[#E8590C] bg-[#FFF8F0] rounded-full px-2.5 py-1">범위 밖 = 자동 탈락</span>
        </div>

        <div className="space-y-2">
          <YoeRange req="3년" range="2~4년" />
          <YoeRange req="2년" range="1~3년" />
          <YoeRange req="2~4년" range="1~5년" />
        </div>

        <p className="text-[11px] text-gray-400 mt-3">요구 연차 기준 ±1년까지 허용</p>
      </div>
    </div>
  );
}

/* ================================================================
   STEP 4 — R3 전화 인터뷰
   ================================================================ */
function StepR3() {
  return (
    <div className="criteria-stagger">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge color="orange">R3</Badge>
          <h1 className="text-[22px] font-medium text-gray-900 tracking-tight">전화 인터뷰</h1>
        </div>
        <p className="text-[14px] text-gray-500 leading-relaxed mb-8">
          커뮤니케이션·동기·Culture Fit 직접 확인 — 60점 만점
        </p>
      </div>

      {/* 평가 항목 카드 */}
      <InterviewCard no={1} label="언어 능력" score="10점" question="영어로 간단한 자기소개 요청">
        <RubricRow range="1~3" desc="영어 불가 또는 한 문장 수준" level="low" />
        <RubricRow range="4~6" desc="2~3문장 가능, 발음 부정확" level="mid" />
        <RubricRow range="7~10" desc="간결·정보 충실·자신감·유창함" level="high" />
      </InterviewCard>

      <InterviewCard no={2} label="지원 동기" score="10점" question="KTC를 알게 된 경로 + 지원 동기와 기대">
        <RubricRow range="1~3" desc="방향성 없음, 답변 모호" level="low" />
        <RubricRow range="4~6" desc="기본 방향 있으나 구체성 부족" level="mid" />
        <RubricRow range="7~10" desc="커리어 목표 명확, 장기 성장 사고" level="high" />
      </InterviewCard>

      <InterviewCard no={3} label="직무 적합성" score="10점" question="최근 프로젝트에서의 본인 역할" star>
        <RubricRow range="1~3" desc="프로젝트/역할 설명 불분명, 기여 모호" level="low" />
        <RubricRow range="4~6" desc="프로젝트 설명 가능, 임팩트 불명확" level="mid" />
        <RubricRow range="7~10" desc="맥락 + 역할 + 업무 + 결과 + 의사결정 이유" level="high" />
      </InterviewCard>

      <InterviewCard no={4} label="성취 경험" score="10점" question="업무 중 가장 자랑스러웠던 일">
        <RubricRow range="1~3" desc="성취 사례 없음" level="low" />
        <RubricRow range="4~6" desc="성취 설명 가능, 디테일 부족" level="mid" />
        <RubricRow range="7~10" desc="디테일 + 개인 역할 + 결과 + 배운 점" level="high" />
      </InterviewCard>

      <InterviewCard no={5} label="문화 적합성" score="10점" question="한국·글로벌 팀 경험 또는 문화 차이 인식" star>
        <RubricRow range="1~3" desc="구체적 차이 없음, 일반론" level="low" />
        <RubricRow range="4~6" desc="1~2개 차이점 + 예시" level="mid" />
        <RubricRow range="7~10" desc="명확한 분석 + 경험 + 적응 방식" level="high" />
      </InterviewCard>

      <InterviewCard no={6} label="소통 능력" score="10점" question="별도 질문 없음, 전반 태도로 평가">
        <RubricRow range="1~3" desc="위축, 발화 매끄럽지 못함" level="low" />
        <RubricRow range="4~6" desc="정보 충분, 명료 전달" level="mid" />
        <RubricRow range="7~10" desc="자신감·유창함, 되묻기 등 상호작용" level="high" />
      </InterviewCard>

      {/* Flag 확인 */}
      <div className="bg-[#FFF8F0] rounded-2xl p-5 mt-5">
        <p className="text-[13px] font-medium text-[#E8590C] mb-3">R1 Flag 항목 추가 확인</p>
        <div className="space-y-2.5">
          <div className="flex items-start gap-2.5">
            <span className="text-[11px] text-[#E8590C] bg-[#E8590C]/10 rounded px-1.5 py-0.5 shrink-0 mt-[1px]">Flag</span>
            <p className="text-[12px] text-gray-700"><span className="font-medium">영어</span> → No.1 언어 능력 답변으로 자연스럽게 해소</p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="text-[11px] text-[#E8590C] bg-[#E8590C]/10 rounded px-1.5 py-0.5 shrink-0 mt-[1px]">Flag</span>
            <p className="text-[12px] text-gray-700"><span className="font-medium">입사 가능 여부</span> → 인터뷰 마지막에 별도 확인 (시점, 공백 이유, 이직 사유)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   STEP 5 — 공통 유의사항
   ================================================================ */
function StepNotes() {
  return (
    <div className="criteria-stagger">
      <div>
        <h1 className="text-[22px] font-medium text-gray-900 tracking-tight mb-2">
          평가자 공통 유의사항
        </h1>
        <p className="text-[14px] text-gray-500 leading-relaxed mb-8">
          모든 단계에서 공통으로 지켜야 할 원칙입니다.
        </p>
      </div>

      {/* 평가 원칙 */}
      <div className="bg-white rounded-2xl border-[0.5px] border-gray-200/60 p-5">
        <p className="text-[15px] font-medium text-gray-900 mb-4">평가 원칙</p>
        <div className="space-y-4">
          <NoteItem
            title="잠재력 중심"
            desc="R1·R2는 잠재력 스크리닝입니다. Tech stack 갭은 R3 이후에서 검증하세요."
          />
          <NoteItem
            title="핏 검증"
            desc="R3는 정보가 아닌 태도·소통·문화 적합성을 봅니다."
          />
          <NoteItem
            title="일관성 유지"
            desc="평가자 간 편차를 줄이기 위해, 모호한 경우 채점 가이드의 구체 기준을 그대로 따릅니다."
          />
        </div>
      </div>

      {/* 결과 기록 */}
      <div className="bg-white rounded-2xl border-[0.5px] border-gray-200/60 p-5">
        <p className="text-[15px] font-medium text-gray-900 mb-4">결과 기록</p>
        <ul className="space-y-2.5">
          <Li>모든 단계에서 <Highlight>점수 + 한 줄 코멘트 + 다음 단계 확인 사항</Highlight> 기록</Li>
          <Li>Flag 항목은 색상 또는 표시로 명확히 구분</Li>
          <Li>탈락 사유는 어떤 Hard Requirement에서 Fail했는지 명시</Li>
        </ul>
      </div>

      {/* 후보 응대 */}
      <div className="bg-white rounded-2xl border-[0.5px] border-gray-200/60 p-5">
        <p className="text-[15px] font-medium text-gray-900 mb-4">후보 응대</p>
        <ul className="space-y-2.5">
          <Li>결과 회신은 <Highlight>5영업일 내</Highlight> 이메일</Li>
          <Li>R3 종료 시 후보 질문 시간 반드시 부여</Li>
        </ul>
      </div>
    </div>
  );
}

/* ================================================================
   공통 서브 컴포넌트
   ================================================================ */

function Badge({ color, children }: { color: "blue" | "green" | "orange"; children: React.ReactNode }) {
  const styles = {
    blue: "bg-[#E8F3FF] text-[#3182F6]",
    green: "bg-[#E8FFF3] text-[#1D9E75]",
    orange: "bg-[#FFF8F0] text-[#E8590C]",
  };
  return (
    <span className={`text-[12px] font-medium rounded-full px-2.5 py-0.5 ${styles[color]}`}>
      {children}
    </span>
  );
}

function Highlight({ children }: { children: React.ReactNode }) {
  return <span className="text-gray-900 font-medium">{children}</span>;
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-[13px] text-gray-600 leading-relaxed">
      <span className="w-1 h-1 rounded-full bg-gray-400 mt-[8px] shrink-0" />
      <span>{children}</span>
    </li>
  );
}

/* 개요 - 프로세스 카드 */
function ProcessCard({ step, color, title, who, score, pass }: {
  step: string; color: "blue" | "green" | "orange";
  title: string; who: string; score: string; pass: string;
}) {
  const borderColors = {
    blue: "border-[#3182F6]/20",
    green: "border-[#1D9E75]/20",
    orange: "border-[#E8590C]/20",
  };
  return (
    <div className={`bg-white rounded-2xl border-[0.5px] ${borderColors[color]} p-5 mt-3`}>
      <div className="flex items-center gap-2.5 mb-3">
        <Badge color={color}>{step}</Badge>
        <span className="text-[15px] font-medium text-gray-900">{title}</span>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-[12px]">
        <span className="text-gray-500">평가: <span className="text-gray-700">{who}</span></span>
        <span className="text-gray-500">만점: <span className="text-gray-700">{score}</span></span>
        <span className="text-gray-500">통과: <span className="text-gray-700">{pass}</span></span>
      </div>
    </div>
  );
}

/* R1 필수요건 카드 */
function HardCard({ label, pass, sub, flag }: { label: string; pass: string; sub?: string; flag?: boolean }) {
  return (
    <div className={`bg-white rounded-2xl border-[0.5px] p-4 mt-3 ${flag ? "border-[#E8590C]/20" : "border-gray-200/60"}`}>
      <div className="flex items-center gap-2 mb-1">
        <p className="text-[13px] font-medium text-gray-900">{label}</p>
        {flag && <span className="text-[10px] text-[#E8590C] bg-[#FFF8F0] rounded px-1.5 py-0.5">확인 필요</span>}
      </div>
      <p className="text-[12px] text-gray-600 leading-relaxed">{pass}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

/* R1 채점 카드 */
function ScoreCard({ label, sub, score, desc, accent }: { label: string; sub?: string; score: string; desc: string; accent?: boolean }) {
  return (
    <div className="bg-white rounded-2xl border-[0.5px] border-gray-200/60 p-4 flex items-center gap-4 mt-3">
      <span className={`text-[16px] font-medium w-[36px] text-center shrink-0 criteria-pop ${
        accent ? "text-[#1D9E75]" : "text-[#3182F6]"
      }`}>
        {score}
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-gray-900">
          {label}
          {sub && <span className="text-gray-400 font-normal ml-1.5">{sub}</span>}
        </p>
        <p className="text-[12px] text-gray-500">{desc}</p>
      </div>
    </div>
  );
}

/* R1 연차별 컴팩트 카드 */
function YoeCompact({ tier, range, low, mid, high }: {
  tier: string; range: string; low: string; mid: string; high: string;
}) {
  return (
    <div className="bg-white rounded-2xl border-[0.5px] border-gray-200/60 p-4 mt-3">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[13px] font-medium text-gray-900">{tier}</span>
        <span className="text-[11px] text-gray-400">{range}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[#F9FAFB] rounded-lg px-3 py-2">
          <p className="text-[10px] text-gray-400 mb-0.5">1점</p>
          <p className="text-[12px] text-gray-500 leading-snug">{low}</p>
        </div>
        <div className="bg-[#F9FAFB] rounded-lg px-3 py-2">
          <p className="text-[10px] text-gray-400 mb-0.5">2점</p>
          <p className="text-[12px] text-gray-600 leading-snug">{mid}</p>
        </div>
        <div className="bg-[#E8F3FF]/50 rounded-lg px-3 py-2">
          <p className="text-[10px] text-[#3182F6] mb-0.5">3점</p>
          <p className="text-[12px] text-gray-900 leading-snug">{high}</p>
        </div>
      </div>
    </div>
  );
}

/* R2 도넛 섹션 (hover 상태 공유) */
const DONUT_DESCS = [
  "요구 연차 ±1년 이내",
  "도메인·산업·업무 연관성",
  "자기주도 학습, 도전 경험",
  "경력 흐름, 이슈 여부",
];

function DonutSection() {
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <div className="bg-white rounded-2xl border-[0.5px] border-gray-200/60 p-5">
      <p className="text-[13px] font-medium text-gray-900 mb-5">AI가 평가하는 4가지 항목</p>

      <div className="flex items-center justify-center mb-6">
        <Donut3D hovered={hovered} onHover={setHovered} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {DONUT_SEGMENTS.map((seg, i) => (
          <DonutLegend
            key={i}
            index={i}
            color={seg.top}
            label={seg.label}
            score={Math.round(seg.pct * 100)}
            desc={DONUT_DESCS[i]}
            active={hovered === i}
            onHover={setHovered}
          />
        ))}
      </div>
    </div>
  );
}

/* R2 3D 도넛 차트 */
const DONUT_SEGMENTS = [
  { pct: 0.30, top: "#3182F6", topLight: "#74AEFF", side: "#1B6AE0", label: "직무 경력 연차" },
  { pct: 0.25, top: "#8B95A1", topLight: "#ACB4BD", side: "#6B7684", label: "관련 업무 경험" },
  { pct: 0.25, top: "#34D399", topLight: "#6EE7B7", side: "#10B981", label: "성장 가능성" },
  { pct: 0.20, top: "#FBBF24", topLight: "#FDE68A", side: "#D97706", label: "커리어 안정성" },
];

function Donut3D({ hovered, onHover }: { hovered: number | null; onHover: (i: number | null) => void }) {
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const r = 52;
  const strokeW = 28;
  const hoverStrokeW = 34;
  const off = 4;
  const circumference = 2 * Math.PI * r;

  let cumulative = 0;
  const segData = DONUT_SEGMENTS.map((seg) => {
    const dash = seg.pct * circumference;
    const offset = cumulative;
    cumulative += dash;
    return { ...seg, dash, offset };
  });

  // 투명한 히트 영역용 arc path
  function hitArc(startAngle: number, endAngle: number) {
    const rad1 = ((startAngle - 90) * Math.PI) / 180;
    const rad2 = ((endAngle - 90) * Math.PI) / 180;
    const R = r + strokeW / 2 + 4;
    const rr = r - strokeW / 2 - 4;
    const large = endAngle - startAngle > 180 ? 1 : 0;
    const ox1 = cx + R * Math.cos(rad1), oy1 = cy + R * Math.sin(rad1);
    const ox2 = cx + R * Math.cos(rad2), oy2 = cy + R * Math.sin(rad2);
    const ix1 = cx + rr * Math.cos(rad1), iy1 = cy + rr * Math.sin(rad1);
    const ix2 = cx + rr * Math.cos(rad2), iy2 = cy + rr * Math.sin(rad2);
    return `M ${ox1} ${oy1} A ${R} ${R} 0 ${large} 1 ${ox2} ${oy2} L ${ix2} ${iy2} A ${rr} ${rr} 0 ${large} 0 ${ix1} ${iy1} Z`;
  }

  let angleAcc = 0;
  const hitPaths = DONUT_SEGMENTS.map((seg) => {
    const start = angleAcc;
    angleAcc += seg.pct * 360;
    return { start, end: angleAcc };
  });

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size + off }}>
      <div className="donut-reveal absolute inset-0">
        <svg width={size} height={size + off} viewBox={`0 0 ${size} ${size + off}`}>
          <defs>
            {DONUT_SEGMENTS.map((seg, i) => (
              <linearGradient key={`lg-${i}`} id={`donut-line-${i}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={seg.topLight} />
                <stop offset="100%" stopColor={seg.top} />
              </linearGradient>
            ))}
            <radialGradient id="donut-shine" cx="35%" cy="35%" r="60%">
              <stop offset="0%" stopColor="white" stopOpacity="0.35" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* 3D 두께 레이어 */}
          {segData.map((seg, i) => (
            <circle
              key={`depth-${i}`}
              cx={cx} cy={cy + off} r={r}
              fill="none" stroke={seg.side}
              strokeWidth={hovered === i ? hoverStrokeW : strokeW}
              strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
              strokeDashoffset={-seg.offset}
              transform={`rotate(-90 ${cx} ${cy + off})`}
              style={{ transition: "stroke-width 0.15s ease-out" }}
            />
          ))}
          {/* 메인 도넛 */}
          {segData.map((seg, i) => (
            <circle
              key={`main-${i}`}
              cx={cx} cy={cy} r={r}
              fill="none" stroke={`url(#donut-line-${i})`}
              strokeWidth={hovered === i ? hoverStrokeW : strokeW}
              strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
              strokeDashoffset={-seg.offset}
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{ transition: "stroke-width 0.15s ease-out" }}
            />
          ))}
          {/* 광택 */}
          <circle cx={cx} cy={cy} r={r + strokeW / 2} fill="url(#donut-shine)" />

          {/* 투명 히트 영역 */}
          {hitPaths.map((h, i) => (
            <path
              key={`hit-${i}`}
              d={hitArc(h.start, h.end)}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => onHover(i)}
              onMouseLeave={() => onHover(null)}
            />
          ))}
        </svg>
      </div>

      <span
        className="relative text-[14px] font-medium text-[#191F28]"
        style={{ animation: "donutTextPop 0.3s ease-out 1.3s both" }}
      >
        100점
      </span>
    </div>
  );
}

/* R2 연차 범위 행 */
function YoeRange({ req, range }: { req: string; range: string }) {
  return (
    <div className="flex items-center bg-[#F9FAFB] rounded-xl px-4 py-3">
      <span className="text-[13px] text-gray-500 w-[72px] shrink-0">요구 <span className="text-gray-900 font-medium">{req}</span></span>
      <svg width="20" height="12" viewBox="0 0 20 12" className="shrink-0 mx-2 text-gray-300">
        <path d="M0 6h16M13 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span className="text-[13px] text-[#3182F6] font-medium">{range}</span>
      <span className="text-[12px] text-gray-400 ml-1">허용</span>
    </div>
  );
}

function DonutLegend({ index, color, label, score, desc, active, onHover }: {
  index: number; color: string; label: string; score: number; desc: string;
  active: boolean; onHover: (i: number | null) => void;
}) {
  return (
    <div
      className="rounded-xl px-3.5 py-3 transition-all duration-150 cursor-default"
      style={{
        backgroundColor: active ? `${color}12` : "#F9FAFB",
        transform: active ? "scale(1.03)" : "scale(1)",
        borderWidth: "1px",
        borderColor: active ? `${color}40` : "transparent",
      }}
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform duration-150" style={{ backgroundColor: color, transform: active ? "scale(1.3)" : "scale(1)" }} />
        <span className="text-[13px] font-medium text-gray-900 flex-1">{label}</span>
        <span className="text-[14px] font-medium" style={{ color }}>{score}</span>
      </div>
      <p className="text-[11px] text-gray-500 pl-[18px]">{desc}</p>
    </div>
  );
}

/* R3 인터뷰 카드 */
function InterviewCard({ no, label, score, question, star, children }: {
  no: number; label: string; score: string; question: string; star?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border-[0.5px] border-gray-200/60 p-5 mt-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-400">#{no}</span>
          <span className="text-[14px] font-medium text-gray-900">{label}</span>
          {star && <span className="text-[10px] text-[#E8590C] bg-[#FFF8F0] rounded px-1 py-0.5">중점</span>}
        </div>
        <span className="text-[12px] text-[#3182F6] font-medium">{score}</span>
      </div>
      <p className="text-[12px] text-gray-500 mb-4">{question}</p>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}

/* R3 채점 행 */
function RubricRow({ range, desc, level }: { range: string; desc: string; level: "low" | "mid" | "high" }) {
  return (
    <div className={`flex items-start gap-3 rounded-lg p-2.5 ${level === "high" ? "bg-[#E8F3FF]/50" : "bg-[#F9FAFB]"}`}>
      <span className={`text-[11px] font-medium shrink-0 w-[40px] ${
        level === "high" ? "text-[#3182F6]" : level === "mid" ? "text-gray-500" : "text-gray-400"
      }`}>{range}</span>
      <span className={`text-[12px] ${level === "high" ? "text-gray-900" : "text-gray-600"}`}>{desc}</span>
    </div>
  );
}

/* 유의사항 노트 */
function NoteItem({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
      <p className="text-[13px] font-medium text-gray-900 mb-1">{title}</p>
      <p className="text-[12px] text-gray-500 leading-relaxed">{desc}</p>
    </div>
  );
}
