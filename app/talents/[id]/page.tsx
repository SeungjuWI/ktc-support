import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchTalents, fetchTalentById } from "@/lib/supabase-queries";
import { AbilityCard } from "@/app/components/talent/AbilityCard";
import { CareerHistory } from "@/app/components/talent/CareerHistory";
import { TalentTags } from "@/app/components/talent/TalentTags";
import { InterviewCTA } from "@/app/components/talent/InterviewCTA";
import { DetailNav } from "./DetailNav";

export const revalidate = 60;

export async function generateStaticParams() {
  const talents = await fetchTalents();
  return talents.map((t) => ({ id: t.id }));
}

export default async function TalentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const talent = await fetchTalentById(params.id);
  if (!talent) notFound();

  return (
    <main className="min-h-screen bg-[#F7F8FA]">
      {/* 헤더 */}
      <header className="bg-white sticky top-0 z-10">
        <div className="mx-auto max-w-[720px] px-4 h-[56px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect width="20" height="20" rx="6" fill="#3182F6" />
              <path d="M6 10.5L9 13.5L14 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[18px] font-medium text-gray-900 tracking-tight">
              베팀
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

      <div className="max-w-[720px] mx-auto px-4 py-6">
        {/* A. 네비게이션 */}
        <DetailNav />

        {/* B. 메인 능력치 카드 */}
        <AbilityCard talent={talent} />

        {/* C. 경력 */}
        <div className="animate-section animate-delay-2">
          <CareerHistory careers={talent.career_history} />
        </div>

        {/* D. 태그 */}
        <div className="animate-section animate-delay-3">
          <TalentTags tags={talent.tags} availability={talent.availability} />
        </div>

        {/* E. CTA (모바일 sticky) */}
        <div className="md:relative sticky bottom-0 left-0 right-0 md:mt-0 mt-3 md:p-0 p-3 md:bg-transparent bg-white md:border-none border-t-[0.5px] border-gray-200/60 z-10 animate-section animate-delay-4">
          <InterviewCTA talent={talent} />
        </div>
      </div>
    </main>
  );
}
