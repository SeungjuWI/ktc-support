"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ConfirmModal from "@/app/components/ConfirmModal";
import type { Talent } from "@/lib/types";
import { useAdminI18n } from "@/lib/admin-i18n";
import { getCached, setCached } from "@/lib/admin-cache";

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
  const { t, lang } = useAdminI18n();
  const [talents, setTalents] = useState<TalentWithPublished[]>(() => getCached<TalentWithPublished[]>("admin:talents") ?? []);
  const [loading, setLoading] = useState(() => !getCached("admin:talents"));
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dedupLoading, setDedupLoading] = useState(false);
  const [dedupResult, setDedupResult] = useState<{ removed: number; duplicateGroups: number } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<{ type: string } | null>(null);

  useEffect(() => {
    loadTalents();
  }, []);

  useEffect(() => { if (!loading) setCached("admin:talents", talents); }, [talents, loading]);

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

  async function dedupTalents() {
    setDedupLoading(true);
    setDedupResult(null);
    try {
      const res = await fetch("/api/admin/dedup-talents", { method: "POST" });
      const json = await res.json();
      setDedupResult({ removed: json.removed, duplicateGroups: json.duplicateGroups });
      if (json.removed > 0) loadTalents();
    } catch { /* ignore */ }
    setDedupLoading(false);
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

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((t) => t.id)));
    }
  }

  async function bulkDeletePhotos() {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    // Storage 파일 삭제
    const fileNames = ids.map((id) => `${id}.jpg`);
    await supabase.storage.from("talent-photos").remove(fileNames);
    // DB photo_url null
    for (const id of ids) {
      await supabase.from("talents").update({ photo_url: null }).eq("id", id);
    }
    setTalents((prev) =>
      prev.map((t) => (selectedIds.has(t.id) ? { ...t, photo_url: undefined } : t))
    );
    setSelectedIds(new Set());
  }

  async function bulkDeleteTalents() {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    // Storage 파일도 같이 삭제
    const fileNames = ids.map((id) => `${id}.jpg`);
    await supabase.storage.from("talent-photos").remove(fileNames);
    for (const id of ids) {
      await supabase.from("talents").delete().eq("id", id);
    }
    setTalents((prev) => prev.filter((t) => !selectedIds.has(t.id)));
    setSelectedIds(new Set());
  }

  const filtered = talents.filter((t) => {
    if (filter === "published") return t.published;
    if (filter === "draft") return !t.published;
    return true;
  }).filter((t) => !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.role.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-medium text-gray-900 tracking-tight mb-1">
            {t("talents.title")}
          </h1>
          <p className="text-[14px] text-gray-500">
            총 {talents.length}명 · 게시 {talents.filter((t) => t.published).length}명
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setBulkAction((v) => !v); setSelectedIds(new Set()); }}
            className={`px-4 py-2.5 rounded-xl text-[13px] transition-colors ${
              bulkAction
                ? "bg-gray-900 text-white"
                : "bg-white border border-gray-200 text-gray-700 hover:border-gray-300"
            }`}>
            {bulkAction ? "선택 해제" : "선택 모드"}
          </button>
          <div className={`flex gap-2 ${bulkAction ? "opacity-40 pointer-events-none" : ""}`}>
            <button onClick={publishAll}
              className="px-4 py-2.5 bg-[#3182F6] text-white rounded-xl text-[13px] hover:bg-[#2272EB] transition-colors">
              {t("talents.publishAll")}
            </button>
            <button onClick={unpublishAll}
              className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-[13px] hover:border-gray-300 transition-colors">
              {t("talents.unpublishAll")}
            </button>
            <button onClick={dedupTalents} disabled={dedupLoading}
              className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-[13px] hover:border-gray-300 transition-colors disabled:opacity-50">
              {dedupLoading ? "정리 중..." : "중복 정리"}
            </button>
            <Link href="/admin/talents/new"
              className="px-4 py-2.5 bg-gray-900 text-white rounded-xl text-[13px] hover:bg-gray-800 transition-colors">
              {t("talents.addTalent")}
            </Link>
          </div>
        </div>
      </div>

      {dedupResult && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-[13px] ${
          dedupResult.removed > 0
            ? "bg-[#E8F3FF] text-[#3182F6]"
            : "bg-[#F2F4F6] text-[#6B7684]"
        }`}>
          {dedupResult.removed > 0
            ? `${dedupResult.duplicateGroups}개 그룹에서 중복 ${dedupResult.removed}개 제거 완료`
            : "중복 카드가 없습니다"}
          <button onClick={() => setDedupResult(null)} className="ml-2 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      <div className="mb-4">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={lang === "ko" ? "이름 또는 역할로 검색..." : lang === "vi" ? "Tìm theo tên hoặc vai trò..." : "Search by name or role..."}
          className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-300" />
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

      {/* 하단 고정 액션 바 — 선택모드에서 1명 이상 선택 시 표시 */}
      {bulkAction && selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-5 py-3 flex items-center gap-3">
          <label className="flex items-center gap-2 text-[13px] text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={filtered.length > 0 && selectedIds.size === filtered.length}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded accent-[#3182F6]"
            />
            전체
          </label>
          <span className="text-[13px] font-medium text-[#3182F6]">{selectedIds.size}명 선택</span>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => setPendingConfirm({ type: "deletePhotos" })}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-[13px] font-medium hover:border-gray-300 transition-colors"
            >
              프로필 사진 삭제
            </button>
            <button
              onClick={() => setPendingConfirm({ type: "deleteTalents" })}
              className="px-4 py-2 bg-red-500 text-white rounded-xl text-[13px] font-medium hover:bg-red-600 transition-colors"
            >
              카드 삭제
            </button>
          </div>
        </div>
      )}

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
              onClick={bulkAction ? () => toggleSelect(t.id) : undefined}
              className={`rounded-2xl p-5 relative overflow-hidden transition-colors ${
                bulkAction ? "cursor-pointer" : ""
              } ${
                bulkAction && selectedIds.has(t.id)
                  ? "bg-[#E8F3FF] border-[1.5px] border-[#3182F6]"
                  : "bg-white border-[0.5px] border-gray-200/60"
              }`}
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
                    {t.years_exp}년차 · {t.location} · {getAvailabilityLabel(t.availability)} · {(t.salary_min_vnd / 1000000).toFixed(0)}~{(t.salary_max_vnd / 1000000).toFixed(0)}M VND
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

              {/* 액션 - 선택모드에서는 숨김 */}
              {!bulkAction && <div className="flex items-center justify-end gap-2 mt-3 relative z-[2]">
                  {t.resume_url && (
                    <a
                      href={t.resume_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-gray-100 text-blue-500 rounded-lg text-[12px] font-medium hover:bg-blue-50 transition-colors mr-auto"
                    >
                      이력서
                    </a>
                  )}
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
              </div>}
            </div>
          ))}
        </div>
      )}

      {pendingConfirm?.type === "deletePhotos" && (
        <ConfirmModal
          title={`${selectedIds.size}명 프로필 사진 삭제`}
          message={`선택한 ${selectedIds.size}명의 프로필 사진을 삭제합니다.`}
          confirmLabel="삭제"
          danger
          onConfirm={() => { setPendingConfirm(null); bulkDeletePhotos(); }}
          onCancel={() => setPendingConfirm(null)}
        />
      )}

      {pendingConfirm?.type === "deleteTalents" && (
        <ConfirmModal
          title={`${selectedIds.size}명 카드 삭제`}
          message={`선택한 ${selectedIds.size}명의 인재 카드를 삭제합니다.\n되돌릴 수 없습니다.`}
          confirmLabel="삭제"
          danger
          onConfirm={() => { setPendingConfirm(null); bulkDeleteTalents(); }}
          onCancel={() => setPendingConfirm(null)}
        />
      )}
    </div>
  );
}
