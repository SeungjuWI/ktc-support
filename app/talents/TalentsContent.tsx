"use client";

import Link from "next/link";
import { useState } from "react";
import { Talent } from "@/lib/types";
import { TalentCard } from "@/app/components/talent/TalentCard";
import { FilterChips } from "@/app/components/talent/FilterChips";
import { TalentDetailModal } from "@/app/components/talent/TalentDetailModal";

export default function TalentsContent({ talents }: { talents: Talent[] }) {
  const availableCount = talents.filter(
    (t) => t.availability === "immediate"
  ).length;

  const [selected, setSelected] = useState<Talent | null>(null);

  return (
    <main className="min-h-screen bg-[#F7F8FA]">
      {/* 헤더 */}
      <header className="bg-white sticky top-0 z-10">
        <div className="mx-auto max-w-[1080px] px-5 h-[56px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="VTM" width={24} height={24} className="rounded-[4px]" />
            <span className="text-[18px] text-gray-900 tracking-tight" style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>
              Vtm
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
