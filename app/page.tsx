import { dummyTalents } from "@/lib/dummy-talents";
import { TalentCard } from "@/app/components/talent/TalentCard";
import { FilterChips } from "@/app/components/talent/FilterChips";

export default function Home() {
  const availableCount = dummyTalents.filter(
    (t) => t.availability === "immediate"
  ).length;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white sticky top-0 z-10">
        <div className="mx-auto max-w-[1080px] px-5 h-[56px] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect width="20" height="20" rx="6" fill="#3182F6" />
              <path d="M6 10.5L9 13.5L14 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[18px] font-medium text-gray-900 tracking-tight">
              TalentMarket
            </span>
          </div>
          <button className="text-[14px] text-blue-500 font-medium hover:text-blue-600 transition-colors">
            로그인
          </button>
        </div>
        <div className="h-[0.5px] bg-gray-200/80" />
      </header>

      <div className="mx-auto max-w-[1080px] px-5 pt-8 pb-16">
        {/* 타이틀 */}
        <div className="mb-5">
          <h1 className="text-[22px] font-medium text-gray-900 tracking-tight">
            베트남 IT 인재
          </h1>
          <p className="text-[14px] text-gray-500 mt-1">
            지금 합류 가능한 인재{" "}
            <span className="text-blue-500 font-medium">{availableCount}명</span>
          </p>
        </div>

        {/* 필터 칩 */}
        <div className="mb-5">
          <FilterChips />
        </div>

        {/* 정렬 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[12px] text-gray-500">28명 표시</span>
          <button className="text-[12px] text-gray-600 hover:text-gray-900 transition-colors">
            추천순 ▼
          </button>
        </div>

        {/* 카드 그리드 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-[10px]">
          {dummyTalents.map((talent) => (
            <TalentCard key={talent.id} talent={talent} />
          ))}
        </div>

        {/* 더보기 */}
        <div className="flex justify-center mt-6">
          <button className="text-[13px] text-gray-600 bg-gray-100 rounded-xl px-6 py-3 hover:bg-gray-200 transition-colors duration-100">
            더 보기
          </button>
        </div>
      </div>
    </main>
  );
}
