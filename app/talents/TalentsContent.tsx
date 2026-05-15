"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Talent } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { getUserProfile } from "@/lib/supabase-auth";
import { TalentCard } from "@/app/components/talent/TalentCard";
import { FilterChips } from "@/app/components/talent/FilterChips";
import { TalentDetailModal } from "@/app/components/talent/TalentDetailModal";
import { Header } from "@/app/components/Header";

export default function TalentsContent({ talents }: { talents: Talent[] }) {
  const availableCount = talents.filter(
    (t) => t.availability === "immediate"
  ).length;

  const router = useRouter();
  const [selected, setSelected] = useState<Talent | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
        return;
      }
      const profile = await getUserProfile(session.user.id);
      if (!profile || profile.status !== "approved") {
        router.replace("/login");
        return;
      }
      setAuthed(true);
    });
  }, [router]);

  if (!authed) {
    return (
      <main className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <p className="text-[14px] text-gray-500">로딩 중...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F8FA]">
      <Header />

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
          <span className="text-[12px] text-gray-500">{talents.length}명 표시</span>
          <button className="text-[12px] text-gray-600 hover:text-gray-900 transition-colors">
            추천순 ▼
          </button>
        </div>

        {/* 카드 그리드 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-[10px]">
          {talents.map((talent) => (
            <div key={talent.id} onClick={() => setSelected(talent)} className="cursor-pointer">
              <TalentCard talent={talent} />
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <TalentDetailModal talent={selected} onClose={() => setSelected(null)} />
      )}
    </main>
  );
}
