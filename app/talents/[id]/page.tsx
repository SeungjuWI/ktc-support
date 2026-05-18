import { notFound } from "next/navigation";
import { fetchTalents, fetchTalentById } from "@/lib/supabase-queries";
import { Header } from "@/app/components/Header";
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

  const hasCareer = talent.career_history && talent.career_history.length > 0;
  const hasTags = talent.tags && talent.tags.length > 0;

  return (
    <main className="min-h-screen bg-[#F7F8FA]">
      <Header />

      <div className="max-w-[720px] mx-auto px-4 py-6">
        <DetailNav />

        {/* 메인 능력치 카드 */}
        <AbilityCard talent={talent} />

        {/* 경력 (데이터 있을 때만) */}
        {hasCareer && (
          <div className="animate-section animate-delay-2">
            <CareerHistory careers={talent.career_history} />
          </div>
        )}

        {/* 태그 (AbilityCard에서 이미 보여주지만 별도 섹션 원하면) */}
        {hasTags && !talent.ktc_comment?.includes("[LLM 스크리닝") && (
          <div className="animate-section animate-delay-3">
            <TalentTags tags={talent.tags} availability={talent.availability} />
          </div>
        )}

        {/* 이력서 링크 */}
        {talent.resume_url && (
          <div className="bg-white border-[0.5px] border-gray-200/60 rounded-[20px] p-6 mb-3 animate-section animate-delay-3">
            <p className="text-[12px] text-gray-500 mb-3">이력서</p>
            <a
              href={talent.resume_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[14px] text-[#3182F6] hover:text-[#2272EB] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              이력서 PDF 보기
            </a>
          </div>
        )}

        {/* CTA */}
        <div className="md:relative sticky bottom-0 left-0 right-0 md:mt-0 mt-3 md:p-0 p-3 md:bg-transparent bg-white md:border-none border-t-[0.5px] border-gray-200/60 z-10 animate-section animate-delay-4">
          <InterviewCTA talent={talent} />
        </div>
      </div>
    </main>
  );
}
