import Link from "next/link";
import { dummyTalents } from "@/lib/dummy-talents";
import { TalentCard } from "@/app/components/talent/TalentCard";

export default function LandingPage() {
  const previewTalents = dummyTalents
    .filter((t) => t.availability !== "employed")
    .slice(0, 4);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white sticky top-0 z-10">
        <div className="mx-auto max-w-[1080px] px-5 h-[56px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect width="20" height="20" rx="6" fill="#3182F6" />
              <path d="M6 10.5L9 13.5L14 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[18px] font-medium text-gray-900 tracking-tight">
              TalentMarket
            </span>
          </Link>
          <Link
            href="/login"
            className="text-[14px] text-blue-500 font-medium hover:text-blue-600 transition-colors"
          >
            로그인
          </Link>
        </div>
        <div className="h-[0.5px] bg-gray-200/80" />
      </header>

      {/* 히어로 */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1080px] px-5 py-16 md:py-24 text-center">
          <p className="text-[14px] text-blue-500 font-medium mb-4 animate-section">
            베트남 개발자 채용, 아직도 이력서만 보고 계신가요?
          </p>
          <h1 className="text-[28px] md:text-[40px] font-medium text-gray-900 leading-tight tracking-tight mb-5 animate-section animate-delay-1">
            검증된 IT 인재를<br />
            능력치 카드로 3초 만에 비교하세요
          </h1>
          <p className="text-[15px] md:text-[16px] text-gray-500 leading-relaxed mb-8 max-w-[480px] mx-auto animate-section animate-delay-2">
            기술력·한국어·협업 능력까지 6대 역량을 KTC가 직접 평가했습니다.
            마음에 드는 인재에게 바로 인터뷰를 요청하세요.
          </p>
          <div className="flex justify-center gap-3 animate-section animate-delay-3">
            <Link
              href="/login"
              className="bg-blue-500 text-white px-6 py-3.5 rounded-xl text-[15px] font-medium hover:bg-blue-600 active:scale-[0.98] transition"
            >
              무료로 시작하기
            </Link>
          </div>
        </div>
        <div className="h-[0.5px] bg-gray-200/80" />
      </section>

      {/* 이용 방법 3단계 */}
      <section className="mx-auto max-w-[1080px] px-5 py-16">
        <p className="text-[12px] text-blue-500 font-medium mb-2 text-center">
          이용 방법
        </p>
        <p className="text-[22px] font-medium text-gray-900 tracking-tight text-center mb-10">
          3단계로 끝나는 채용
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {([
            {
              step: "01",
              title: "인재 카드 비교",
              desc: "직무, 경력, 한국어 능력, OVR 점수를 한눈에 비교하세요. 이력서를 열어볼 필요 없습니다.",
              icon: (
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#3182F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="9" height="9" rx="2" />
                  <rect x="16" y="3" width="9" height="9" rx="2" />
                  <rect x="3" y="16" width="9" height="9" rx="2" />
                  <rect x="16" y="16" width="9" height="9" rx="2" />
                </svg>
              ),
            },
            {
              step: "02",
              title: "인터뷰 요청",
              desc: "마음에 드는 인재를 발견하면 버튼 한 번으로 인터뷰를 요청하세요. 회사 정보만 입력하면 됩니다.",
              icon: (
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#3182F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 7L10.5 18.5 6 14" />
                </svg>
              ),
            },
            {
              step: "03",
              title: "KTC 매니저가 연결",
              desc: "영업일 1일 내에 KTC 매니저가 후보자와 일정을 조율하고, 면접을 세팅해 드립니다.",
              icon: (
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#3182F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="14" cy="10" r="4" />
                  <path d="M6 24c0-4.42 3.58-8 8-8s8 3.58 8 8" />
                </svg>
              ),
            },
          ] as const).map((item, i) => (
            <div
              key={item.step}
              className="bg-white border-[0.5px] border-gray-200/60 rounded-[20px] p-6 animate-section"
              style={{ animationDelay: `${0.1 + i * 0.1}s` }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                  {item.icon}
                </div>
                <span className="text-[12px] font-medium text-blue-500">
                  STEP {item.step}
                </span>
              </div>
              <p className="text-[15px] font-medium text-gray-900 mb-2">
                {item.title}
              </p>
              <p className="text-[13px] text-gray-500 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 숫자로 보는 서비스 */}
      <section className="bg-white border-y-[0.5px] border-gray-200/60">
        <div className="mx-auto max-w-[1080px] px-5 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {([
              { num: "142명", label: "등록 인재" },
              { num: "6대 역량", label: "KTC 직접 평가" },
              { num: "1일 내", label: "인터뷰 회신" },
              { num: "135~470만", label: "월 희망 연봉대" },
            ] as const).map((item) => (
              <div key={item.label}>
                <p className="text-[24px] font-medium text-gray-900 mb-1">
                  {item.num}
                </p>
                <p className="text-[13px] text-gray-500">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 인재 미리보기 (블러) */}
      <section className="mx-auto max-w-[1080px] px-5 py-16">
        <p className="text-[12px] text-blue-500 font-medium mb-2 text-center">
          미리보기
        </p>
        <p className="text-[22px] font-medium text-gray-900 tracking-tight text-center mb-8">
          이런 인재들이 기다리고 있어요
        </p>
        <div className="relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-[10px] select-none pointer-events-none">
            {previewTalents.map((talent, i) => (
              <div key={talent.id} className="blur-[3px]">
                <TalentCard
                  talent={talent}
                  photoUrl={[
                    "https://randomuser.me/api/portraits/men/32.jpg",
                    "https://randomuser.me/api/portraits/women/44.jpg",
                    "https://randomuser.me/api/portraits/men/67.jpg",
                    "https://randomuser.me/api/portraits/women/17.jpg",
                  ][i]}
                />
              </div>
            ))}
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/60 rounded-2xl">
            <p className="text-[15px] font-medium text-gray-900 mb-1">
              로그인하면 인재 프로필을 확인할 수 있어요
            </p>
            <p className="text-[13px] text-gray-500 mb-4">
              능력치, 경력, 한국어 수준까지 상세하게 비교해보세요
            </p>
            <Link
              href="/login"
              className="bg-blue-500 text-white px-5 py-3 rounded-xl text-[14px] font-medium hover:bg-blue-600 active:scale-[0.98] transition"
            >
              로그인하고 확인하기
            </Link>
          </div>
        </div>
      </section>

      {/* 최종 CTA */}
      <section className="bg-white border-t-[0.5px] border-gray-200/60">
        <div className="mx-auto max-w-[1080px] px-5 py-16 text-center">
          <p className="text-[22px] font-medium text-gray-900 tracking-tight mb-2">
            채용 고민, 여기서 끝내세요
          </p>
          <p className="text-[14px] text-gray-500 mb-6">
            가입은 무료입니다. 인터뷰 요청 시에만 비용이 발생합니다.
          </p>
          <Link
            href="/login"
            className="inline-block bg-blue-500 text-white px-8 py-3.5 rounded-xl text-[15px] font-medium hover:bg-blue-600 active:scale-[0.98] transition"
          >
            무료로 시작하기
          </Link>
        </div>
      </section>

      {/* 풋터 */}
      <footer className="border-t-[0.5px] border-gray-200/60 bg-gray-50">
        <div className="mx-auto max-w-[1080px] px-5 py-8">
          <div className="flex items-center gap-2 mb-3">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <rect width="20" height="20" rx="6" fill="#3182F6" />
              <path d="M6 10.5L9 13.5L14 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[14px] font-medium text-gray-700">
              TalentMarket
            </span>
          </div>
          <p className="text-[12px] text-gray-500">
            KTC 파트너사 · 베트남 IT 인재 마켓플레이스
          </p>
        </div>
      </footer>
    </main>
  );
}
