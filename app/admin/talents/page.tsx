"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Talent } from "@/lib/types";

type TalentWithPublished = Talent & { published: boolean };

function getGradeStyle(grade: string) {
  switch (grade) {
    case "S": return "bg-[#FFF8F0] text-[#E8590C]";
    case "A": return "bg-[#E8F3FF] text-[#3182F6]";
    default: return "bg-[#F2F4F6] text-[#6B7684]";
  }
}

function getAvailabilityLabel(a: string) {
  switch (a) {
    case "immediate": return "즉시 합류";
    case "negotiable": return "협의 가능";
    default: return "현직";
  }
}

export default function AdminTalentsPage() {
  const [talents, setTalents] = useState<TalentWithPublished[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadTalents();
  }, []);

  async function loadTalents() {
    const { data } = await supabase
      .from("talents")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setTalents(data as TalentWithPublished[]);
    setLoading(false);
  }

  async function togglePublished(id: string, current: boolean) {
    await supabase
      .from("talents")
      .update({ published: !current, updated_at: new Date().toISOString() })
      .eq("id", id);
    setTalents((prev) =>
      prev.map((t) => (t.id === id ? { ...t, published: !current } : t))
    );
  }

  async function publishAll() {
    await supabase.from("talents").update({ published: true, updated_at: new Date().toISOString() }).eq("published", false);
    setTalents((prev) => prev.map((t) => ({ ...t, published: true })));
  }

  async function unpublishAll() {
    await supabase.from("talents").update({ published: false, updated_at: new Date().toISOString() }).eq("published", true);
    setTalents((prev) => prev.map((t) => ({ ...t, published: false })));
  }

  async function deleteTalent(id: string) {
    if (deleting === id) {
      await supabase.from("talents").delete().eq("id", id);
      setTalents((prev) => prev.filter((t) => t.id !== id));
      setDeleting(null);
    } else {
      setDeleting(id);
      setTimeout(() => setDeleting(null), 3000);
    }
  }

  const filtered = talents.filter((t) => {
    if (filter === "published") return t.published;
    if (filter === "draft") return !t.published;
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-medium text-gray-900 tracking-tight mb-1">
            인재 관리
          </h1>
          <p className="text-[14px] text-gray-500">
            총 {talents.length}명 · 게시 {talents.filter((t) => t.published).length}명
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={publishAll}
            className="px-4 py-2.5 bg-[#3182F6] text-white rounded-xl text-[13px] hover:bg-[#2272EB] transition-colors">
            전체 게시
          </button>
          <button onClick={unpublishAll}
            className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-[13px] hover:border-gray-300 transition-colors">
            전체 비공개
          </button>
          <Link href="/admin/talents/new"
            className="px-4 py-2.5 bg-gray-900 text-white rounded-xl text-[13px] hover:bg-gray-800 transition-colors">
            + 인재 등록
          </Link>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex gap-2 mb-6">
        {([
          { key: "all", label: "전체" },
          { key: "published", label: "게시중" },
          { key: "draft", label: "비공개" },
        ] as const).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-[14px] py-[7px] rounded-full text-[13px] transition-colors ${
              filter === f.key
                ? "bg-gray-900 text-white"
                : "bg-white border-[0.5px] border-gray-200 text-gray-700 hover:border-gray-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 인재 목록 */}
      {loading ? (
        <div className="text-center py-16">
          <p className="text-[14px] text-gray-500">로딩 중...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[14px] text-gray-500">등록된 인재가 없습니다</p>
          <Link
            href="/admin/talents/new"
            className="inline-block mt-3 text-[14px] text-blue-500 font-medium hover:text-blue-600"
          >
            첫 인재 등록하기
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((t) => (
            <div
              key={t.id}
              className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl p-5 relative overflow-hidden"
            >
              {!t.published && (
                <>
                  <div className="absolute inset-0 bg-gray-900/5 z-[1] rounded-2xl" />
                  <span className="absolute top-3 left-3 z-[2] text-[11px] font-medium text-white bg-gray-900/70 px-2.5 py-1 rounded-full">
                    비공개
                  </span>
                </>
              )}
              <div className={`flex items-start gap-4 ${!t.published ? "opacity-40" : ""}`}>
                {/* 아바타 */}
                {t.photo_url ? (
                  <img src={t.photo_url} alt="" className="w-[42px] h-[42px] rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-[42px] h-[42px] rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <span className="text-[13px] font-medium text-blue-500">{t.name.charAt(0)}</span>
                  </div>
                )}

                {/* 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[15px] font-medium text-gray-900">{t.name}</p>
                    <span className="text-[13px] text-gray-500">{t.role}</span>
                    <span className={`text-[11px] font-medium px-2 py-[2px] rounded-full ${getGradeStyle(t.ovr_grade)}`}>
                      {t.ovr_grade} {t.ovr_score}
                    </span>
                  </div>
                  <p className="text-[13px] text-gray-500">
                    {t.years_exp}년차 · {t.location} · {getAvailabilityLabel(t.availability)} · {t.desired_salary_krw}만원/월
                  </p>
                  <div className="flex gap-1 mt-2">
                    {t.top_skills.map((skill) => (
                      <span key={skill} className="text-[11px] text-gray-600 bg-gray-100 px-[7px] py-[2px] rounded-full">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 액션 - 항상 선명하게 */}
              <div className="flex items-center justify-end gap-2 mt-3 relative z-[2]">
                  <button
                    onClick={() => togglePublished(t.id, t.published)}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                      t.published
                        ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        : "bg-blue-500 text-white hover:bg-blue-600"
                    }`}
                  >
                    {t.published ? "비공개" : "게시"}
                  </button>
                  <Link
                    href={`/admin/talents/${t.id}`}
                    className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-[12px] font-medium hover:bg-gray-200 transition-colors"
                  >
                    수정
                  </Link>
                  <button
                    onClick={() => deleteTalent(t.id)}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                      deleting === t.id
                        ? "bg-red-500 text-white"
                        : "bg-gray-100 text-gray-400 hover:text-red-500 hover:bg-red-50"
                    }`}
                  >
                    {deleting === t.id ? "확인" : "삭제"}
                  </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
