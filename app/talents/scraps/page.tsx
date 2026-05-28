"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Talent } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { getUserProfile } from "@/lib/supabase-auth";
import { getScrapIds } from "@/lib/scraps";
import { TalentCard } from "@/app/components/talent/TalentCard";
import { TalentDetailModal } from "@/app/components/talent/TalentDetailModal";
import { Header } from "@/app/components/Header";
import Link from "next/link";

export default function ScrapsPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [talents, setTalents] = useState<Talent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Talent | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace("/login"); return; }
      const profile = await getUserProfile(session.user.id, true);
      if (!profile || profile.status !== "approved") { router.replace("/login"); return; }
      setAuthed(true);
    });
  }, [router]);

  useEffect(() => {
    if (!authed) return;
    async function loadScraps() {
      const ids = getScrapIds();
      if (ids.length === 0) { setLoading(false); return; }

      const { data, error } = await supabase
        .from("talents")
        .select("*")
        .in("id", ids)
        .eq("published", true)
        .order("ovr_score", { ascending: false });

      if (!error && data) setTalents(data as Talent[]);
      setLoading(false);
    }
    loadScraps();
  }, [authed]);

  function handleUnscrapped(talentId: string) {
    // 디테일 모달에서 스크랩 해제 시 목록에서도 제거
    setTalents((prev) => prev.filter((t) => t.id !== talentId));
  }

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
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/talents"
            className="text-[14px] text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← 인재 목록
          </Link>
        </div>

        <div className="mb-5">
          <h1 className="text-[22px] font-medium text-gray-900 tracking-tight">
            스크랩한 인재
          </h1>
          <p className="text-[14px] text-gray-500 mt-1">
            {loading ? "로딩 중..." : `${talents.length}명`}
          </p>
        </div>

        {/* 카드 그리드 */}
        {!loading && talents.length === 0 ? (
          <div className="text-center py-20">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mx-auto mb-4">
              <path d="M12 8h24a2 2 0 012 2v32l-14-8-14 8V10a2 2 0 012-2z" stroke="#D1D6DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p className="text-[15px] text-gray-500 mb-2">스크랩한 인재가 없습니다</p>
            <p className="text-[13px] text-gray-400 mb-6">인재 카드에서 북마크 아이콘을 눌러 스크랩해보세요</p>
            <Link
              href="/talents"
              className="inline-block px-5 py-2.5 bg-blue-500 text-white rounded-xl text-[14px] font-medium hover:bg-blue-600 active:scale-[0.98] transition"
            >
              인재 둘러보기
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-[10px]">
            {talents.map((talent) => (
              <div key={talent.id} onClick={() => setSelected(talent)} className="cursor-pointer">
                <TalentCard talent={talent} />
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <TalentDetailModal
          talent={selected}
          onClose={() => {
            // 모달 닫힐 때 스크랩 해제된 인재 제거
            const ids = getScrapIds();
            if (!ids.includes(selected.id)) {
              handleUnscrapped(selected.id);
            }
            setSelected(null);
          }}
        />
      )}
    </main>
  );
}
