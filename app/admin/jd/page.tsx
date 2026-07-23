"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { type JobDescription } from "@/lib/jd-data";
import { useAdminI18n } from "@/lib/admin-i18n";
import { getCached, setCached } from "@/lib/admin-cache";
import ConfirmModal from "@/app/components/ConfirmModal";

interface JDPosting {
  id: string;
  jd_code: string;
  platform: string;
  url: string;
  posted_at: string | null;
  status: string;
  created_at: string;
}

interface JDStat {
  code: string;
  jd: JobDescription;
  status: "active" | "closed";
  funnel: string | null;
  totalCandidates: number;
  statusCounts: Record<string, number>;
}

interface UnregisteredStat {
  code: string;
  totalCandidates: number;
  statusCounts: Record<string, number>;
}

interface JDStatsData {
  jds: JDStat[];
  unregistered: UnregisteredStat[];
  opsError: boolean;
}

const PLATFORM_OPTIONS = [
  "ITviec", "LinkedIn", "TopDev", "Glint", "YBOX", "VietnamWorks",
  "Facebook", "자사 사이트", "기타",
];

// 지원자 상태 칩 표시 순서 (파이프라인 순)
const STATUS_ORDER = [
  "new", "passed", "ready_to_forward", "sent_to_company",
  "interviewing", "offer", "final_passed", "rejected", "screening_failed",
];

export default function JDPage() {
  const { t } = useAdminI18n();
  const [data, setData] = useState<JDStatsData | null>(() => getCached<JDStatsData>("admin:jdStats"));
  const [loading, setLoading] = useState(() => !getCached("admin:jdStats"));
  const [postings, setPostings] = useState<Record<string, JDPosting[]>>(() => getCached<Record<string, JDPosting[]>>("admin:jdPostings") ?? {});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [fullJD, setFullJD] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [showClosed, setShowClosed] = useState(false);
  const [modal, setModal] = useState<null | { mode: "add"; presetCode?: string } | { mode: "edit"; stat: JDStat }>(null);
  const [deleteTarget, setDeleteTarget] = useState<JDStat | null>(null);
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchingFor, setSearchingFor] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/jd-stats");
      const json = await res.json();
      if (res.ok) {
        setData(json);
        setCached("admin:jdStats", json);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const loadPostings = async () => {
    const { data: rows } = await supabase
      .from("jd_postings")
      .select("*")
      .order("created_at", { ascending: false });

    const grouped: Record<string, JDPosting[]> = {};
    (rows || []).forEach((p: JDPosting) => {
      if (!grouped[p.jd_code]) grouped[p.jd_code] = [];
      grouped[p.jd_code].push(p);
    });
    setPostings(grouped);
  };

  useEffect(() => {
    fetchStats();
    loadPostings();
  }, []);

  useEffect(() => { setCached("admin:jdPostings", postings); }, [postings]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-[14px] text-gray-500">{t("common.loading")}</p>
      </div>
    );
  }

  const jds = data?.jds ?? [];
  const q = search.trim().toLowerCase();
  const matchesSearch = (s: JDStat) =>
    !q || s.code.toLowerCase().includes(q) || s.jd.company.toLowerCase().includes(q) || s.jd.position.toLowerCase().includes(q);

  const activeList = jds.filter((s) => s.status === "active").filter(matchesSearch)
    .sort((a, b) => b.totalCandidates - a.totalCandidates);
  const closedList = jds.filter((s) => s.status === "closed").filter(matchesSearch)
    .sort((a, b) => b.totalCandidates - a.totalCandidates);
  const unregistered = (data?.unregistered ?? []).filter((u) => !q || u.code.toLowerCase().includes(q));

  const activeAll = jds.filter((s) => s.status === "active");
  const activeHires = activeAll.reduce((sum, s) => sum + s.jd.hires, 0);
  const totalApplicants =
    jds.reduce((sum, s) => sum + s.totalCandidates, 0) +
    (data?.unregistered ?? []).reduce((sum, u) => sum + u.totalCandidates, 0);

  const toggleSet = (set: Set<string>, code: string) => {
    const next = new Set(set);
    if (next.has(code)) next.delete(code); else next.add(code);
    return next;
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from("jd_definitions").delete().eq("code", deleteTarget.code);
    setDeleteTarget(null);
    fetchStats();
  };

  const statusChips = (code: string, statusCounts: Record<string, number>) => {
    const entries = STATUS_ORDER.filter((s) => statusCounts[s]).map((s) => [s, statusCounts[s]] as const);
    const extras = Object.entries(statusCounts).filter(([s]) => !STATUS_ORDER.includes(s));
    return [...entries, ...extras].map(([status, count]) => (
      <Link
        key={status}
        href={`/admin/candidates?jd=${encodeURIComponent(code)}&status=${encodeURIComponent(status)}`}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] hover:opacity-75 transition-opacity"
        style={{ backgroundColor: pipelineStatusColor(status) + "18", color: pipelineStatusColor(status) }}
      >
        {t(`status.${status}`)} {count}
      </Link>
    ));
  };

  const renderRow = (item: JDStat, dimmed: boolean) => {
    const isExpanded = expanded.has(item.code);
    return (
      <div key={item.code} className={`bg-white rounded-2xl border border-gray-200/60 overflow-hidden ${dimmed ? "opacity-[0.72]" : ""}`}>
        <div
          onClick={() => setExpanded((prev) => toggleSet(prev, item.code))}
          className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <div className="flex-shrink-0">
            <span className={`inline-block px-2.5 py-1 rounded-lg text-[13px] font-medium ${
              !dimmed && item.totalCandidates > 0
                ? "bg-[#E8F3FF] text-[#3182F6]"
                : "bg-gray-100 text-gray-500"
            }`}>
              {item.code}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[14px] font-medium text-gray-900 truncate">{item.jd.position}</span>
              {item.status === "closed" && (
                <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  {t("jd.section.closed")}{item.funnel ? ` · ${item.funnel}` : ""}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[12px] text-gray-500 truncate">
              <span className="truncate">{item.jd.company}</span>
              <span>·</span>
              <span className="flex-shrink-0">{item.jd.experience}</span>
              <span>·</span>
              <span className="flex-shrink-0">{item.jd.salary}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right">
              <div className="flex items-center gap-1.5 justify-end">
                <span className="text-[12px] text-gray-500">{t("jd.hires")}</span>
                <span className="text-[14px] font-medium text-gray-900">{item.jd.hires}</span>
              </div>
              <div className="flex items-center gap-1.5 justify-end">
                <span className="text-[12px] text-gray-500">{t("jd.applicants")}</span>
                <span className={`text-[14px] font-medium ${item.totalCandidates > 0 && !dimmed ? "text-[#3182F6]" : "text-gray-400"}`}>
                  {item.totalCandidates}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setModal({ mode: "edit", stat: item })}
                className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                title={t("common.edit")}
              >
                <PencilIcon />
              </button>
              <button
                onClick={() => setDeleteTarget(item)}
                className="p-1.5 text-gray-400 hover:text-[#E8590C] transition-colors"
                title={t("common.delete")}
              >
                <TrashIcon />
              </button>
            </div>
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="#B0B8C1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform duration-100 ${isExpanded ? "rotate-180" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>

        {isExpanded && (
          <div className="px-5 pb-5 border-t border-gray-100">
            {/* 지원자 현황 — 칩 클릭 시 후보자 페이지 해당 필터로 이동 */}
            <div className="flex items-start justify-between gap-3 pt-4 mb-4">
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                {item.totalCandidates > 0
                  ? statusChips(item.code, item.statusCounts)
                  : <span className="text-[11px] text-gray-400">{t("jd.noApplicants")}</span>}
                {item.totalCandidates > 0 && (
                  <Link
                    href={`/admin/candidates?jd=${encodeURIComponent(item.code)}`}
                    className="text-[11px] text-[#3182F6] hover:text-[#2272EB] transition-colors ml-1"
                  >
                    {t("jd.viewAllCandidates")} →
                  </Link>
                )}
              </div>
              <button
                onClick={() => setSearchingFor(searchingFor === item.code ? null : item.code)}
                className="text-[11px] text-[#3182F6] hover:text-[#2272EB] transition-colors flex-shrink-0"
              >
                {searchingFor === item.code ? t("common.cancel") : t("jd.addCandidates")}
              </button>
            </div>

            {searchingFor === item.code && (
              <CandidateSearchPanel
                t={t}
                jdCode={item.code}
                onChanged={fetchStats}
              />
            )}

            {/* 구인 공고 링크 */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[12px] font-medium text-gray-700">{t("jd.postingLinks")}</p>
                <button
                  onClick={() => setAddingFor(addingFor === item.code ? null : item.code)}
                  className="text-[11px] text-[#3182F6] hover:text-[#2272EB] transition-colors"
                >
                  {addingFor === item.code ? t("common.cancel") : t("jd.add")}
                </button>
              </div>

              {addingFor === item.code && (
                <PostingForm
                  t={t}
                  jdCode={item.code}
                  onSave={() => { setAddingFor(null); loadPostings(); }}
                  onCancel={() => setAddingFor(null)}
                />
              )}

              {(postings[item.code] || []).length > 0 ? (
                <div className="space-y-2">
                  {(postings[item.code] || []).map((posting) => (
                    editingId === posting.id ? (
                      <PostingForm
                        key={posting.id}
                        t={t}
                        jdCode={item.code}
                        initial={posting}
                        onSave={() => { setEditingId(null); loadPostings(); }}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      <PostingRow
                        key={posting.id}
                        t={t}
                        posting={posting}
                        onEdit={() => setEditingId(posting.id)}
                        onDelete={async () => {
                          await supabase.from("jd_postings").delete().eq("id", posting.id);
                          loadPostings();
                        }}
                        onStatusChange={async (newStatus: string) => {
                          await supabase.from("jd_postings").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", posting.id);
                          loadPostings();
                        }}
                      />
                    )
                  ))}
                </div>
              ) : (
                addingFor !== item.code && (
                  <p className="text-[11px] text-gray-400 py-1">{t("jd.noPostings")}</p>
                )
              )}
            </div>

            {/* JD 전문 — 기본 접힘 */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={() => setFullJD((prev) => toggleSet(prev, item.code))}
                className="text-[11px] text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1"
              >
                {fullJD.has(item.code) ? t("jd.hideFullJD") : t("jd.viewFullJD")}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className={`transition-transform duration-100 ${fullJD.has(item.code) ? "rotate-180" : ""}`}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {fullJD.has(item.code) && (
                <div className="space-y-3 mt-3">
                  <DetailSection title="Responsibilities" content={item.jd.responsibilities} />
                  <DetailSection title="Qualifications" content={item.jd.qualifications} />
                  {item.jd.preferred && <DetailSection title="Preferred" content={item.jd.preferred} />}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[22px] font-medium text-gray-900">{t("nav.jd")}</h1>
        <button
          onClick={() => setModal({ mode: "add" })}
          className="px-4 py-2 text-[13px] text-white bg-[#3182F6] rounded-xl hover:bg-[#2272EB] transition-colors"
        >
          {t("jd.addNew")}
        </button>
      </div>

      {data?.opsError && (
        <p className="text-[11px] text-[#E8590C] bg-[#FFF8F0] px-3 py-2 rounded-lg mb-4">{t("jd.sheetWarn")}</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard label={t("jd.stat.activeJD")} value={activeAll.length} color="#3182F6" />
        <StatCard label={t("jd.stat.activeHires")} value={activeHires} color="#1D9E75" />
        <StatCard label={t("jd.totalApplicants")} value={totalApplicants} color="#191F28" />
        <StatCard label={t("jd.stat.closedJD")} value={jds.length - activeAll.length} color="#8B95A1" />
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("jd.searchJD")}
          className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-300"
        />
      </div>

      {/* 미등록 JD 코드 */}
      {unregistered.length > 0 && (
        <div className="bg-[#FFF8F0] rounded-2xl border border-[#E8590C]/20 p-4 mb-5">
          <p className="text-[12px] font-medium text-[#E8590C] mb-1">{t("jd.section.unregistered")}</p>
          <p className="text-[11px] text-gray-500 mb-3">{t("jd.unregisteredHint")}</p>
          <div className="space-y-2">
            {unregistered.map((u) => (
              <div key={u.code} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5">
                <span className="inline-block px-2.5 py-1 rounded-lg text-[13px] font-medium bg-gray-100 text-gray-700 flex-shrink-0">
                  {u.code}
                </span>
                <div className="flex-1 flex flex-wrap items-center gap-1.5 min-w-0">
                  {statusChips(u.code, u.statusCounts)}
                </div>
                <span className="text-[12px] text-gray-500 flex-shrink-0">
                  {t("jd.applicants")} <span className="font-medium text-gray-900">{u.totalCandidates}</span>
                </span>
                <button
                  onClick={() => setModal({ mode: "add", presetCode: u.code })}
                  className="text-[11px] text-[#3182F6] hover:text-[#2272EB] transition-colors flex-shrink-0"
                >
                  {t("jd.registerJD")}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 모집중 */}
      <p className="text-[12px] text-gray-500 mb-2">
        {t("jd.section.active")} <span className="font-medium text-gray-900">{activeList.length}</span>
      </p>
      <div className="space-y-3">
        {activeList.map((item) => renderRow(item, false))}
        {activeList.length === 0 && (
          <p className="text-[12px] text-gray-400 py-6 text-center bg-white rounded-2xl border border-gray-200/60">{t("jd.noJDFound")}</p>
        )}
      </div>

      {/* 마감 — 접힌 섹션 */}
      {closedList.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowClosed(!showClosed)}
            className="flex items-center gap-1.5 text-[12px] text-gray-500 hover:text-gray-700 transition-colors mb-2"
          >
            {t("jd.section.closed")} <span className="font-medium text-gray-900">{closedList.length}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform duration-100 ${showClosed ? "rotate-180" : ""}`}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {showClosed && (
            <div className="space-y-3">
              {closedList.map((item) => renderRow(item, true))}
            </div>
          )}
        </div>
      )}

      {/* JD 추가/수정 모달 */}
      {modal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/30" onClick={() => setModal(null)} />
          <div className="relative flex items-center justify-center p-4 min-h-full">
            <div className="relative w-full max-w-[720px] my-8">
              <JDDefinitionForm
                t={t}
                initial={modal.mode === "edit" ? { code: modal.stat.code, ...modal.stat.jd } : undefined}
                presetCode={modal.mode === "add" ? modal.presetCode : undefined}
                onSave={() => { setModal(null); fetchStats(); }}
                onCancel={() => setModal(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* JD 삭제 확인 */}
      {deleteTarget && (
        <ConfirmModal
          title={t("jd.deleteConfirm")}
          message={`${deleteTarget.code} · ${deleteTarget.jd.company} — ${deleteTarget.jd.position}\n${
            deleteTarget.totalCandidates > 0 ? `${deleteTarget.totalCandidates}${t("jd.deleteWarnCount")}\n` : ""
          }${t("jd.deleteWarnKeep")}`}
          confirmLabel={t("common.delete")}
          cancelLabel={t("common.cancel")}
          danger
          onConfirm={executeDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/60 p-4">
      <p className="text-[11px] text-gray-500 mb-1">{label}</p>
      <p className="text-[22px] font-medium" style={{ color }}>{value}</p>
    </div>
  );
}

function DetailSection({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <p className="text-[11px] text-gray-500 mb-1.5">{title}</p>
      <div className="text-[12px] text-gray-700 leading-[1.6] whitespace-pre-line bg-gray-50 rounded-xl px-4 py-3">
        {content}
      </div>
    </div>
  );
}

function pipelineStatusColor(status: string): string {
  const map: Record<string, string> = {
    new: "#8B95A1",
    passed: "#3182F6",
    ready_to_forward: "#2272EB",
    sent_to_company: "#E8590C",
    interviewing: "#6B7684",
    offer: "#B8860B",
    final_passed: "#1D9E75",
    rejected: "#B0B8C1",
    screening_failed: "#B0B8C1",
  };
  return map[status] || "#8B95A1";
}

type TFn = (key: string) => string;

const POSTING_STATUS_KEYS: { value: string; labelKey: string; color: string }[] = [
  { value: "active", labelKey: "jd.posting.active", color: "#1D9E75" },
  { value: "paused", labelKey: "jd.posting.paused", color: "#E8590C" },
  { value: "closed", labelKey: "jd.posting.closed", color: "#B0B8C1" },
  { value: "expired", labelKey: "jd.posting.expired", color: "#8B95A1" },
];

interface JDFormData {
  code: string;
  company: string;
  position: string;
  experience: string;
  hires: number;
  salary: string;
  responsibilities: string;
  qualifications: string;
  preferred: string;
}

function JDDefinitionForm({
  t,
  initial,
  presetCode,
  onSave,
  onCancel,
}: {
  t: TFn;
  initial?: JDFormData;
  presetCode?: string;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<JDFormData>(
    initial || {
      code: presetCode || "",
      company: "",
      position: "",
      experience: "",
      hires: 1,
      salary: "",
      responsibilities: "",
      qualifications: "",
      preferred: "",
    }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isEdit = !!initial;

  const set = (field: keyof JDFormData, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.code.trim() || !form.company.trim() || !form.position.trim()) {
      setError(t("jd.form.required"));
      return;
    }
    setSaving(true);
    setError("");

    const payload = {
      code: form.code.trim().toUpperCase(),
      company: form.company.trim(),
      position: form.position.trim(),
      experience: form.experience.trim(),
      hires: form.hires,
      salary: form.salary.trim(),
      responsibilities: form.responsibilities.trim(),
      qualifications: form.qualifications.trim(),
      preferred: form.preferred.trim(),
      updated_at: new Date().toISOString(),
    };

    let hasError = false;
    if (isEdit) {
      const { error: err } = await supabase
        .from("jd_definitions")
        .update(payload)
        .eq("code", initial.code);
      if (err) { setError(err.message); hasError = true; }
    } else {
      const { error: err } = await supabase
        .from("jd_definitions")
        .insert(payload);
      if (err) {
        setError(err.message.includes("duplicate") ? t("jd.form.duplicateCode") : err.message);
        hasError = true;
      }
    }

    setSaving(false);
    if (!hasError) onSave();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200/60 p-6 space-y-4">
      <p className="text-[17px] font-medium text-gray-900 mb-3">
        {isEdit ? `${t("jd.form.editTitle")} — ${initial.code}` : t("jd.form.addTitle")}
      </p>

      {error && (
        <p className="text-[13px] text-[#E8590C] bg-[#FFF8F0] px-3 py-2.5 rounded-lg">{error}</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="text-[12px] text-gray-500 mb-1 block">{t("jd.form.code")} *</label>
          <input
            value={form.code}
            onChange={(e) => set("code", e.target.value)}
            disabled={isEdit}
            placeholder="ABC101"
            className="w-full text-[14px] px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 outline-none focus:border-[#3182F6] disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>
        <div>
          <label className="text-[12px] text-gray-500 mb-1 block">{t("jd.form.company")} *</label>
          <input
            value={form.company}
            onChange={(e) => set("company", e.target.value)}
            className="w-full text-[14px] px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 outline-none focus:border-[#3182F6]"
          />
        </div>
        <div>
          <label className="text-[12px] text-gray-500 mb-1 block">{t("jd.form.position")} *</label>
          <input
            value={form.position}
            onChange={(e) => set("position", e.target.value)}
            className="w-full text-[14px] px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 outline-none focus:border-[#3182F6]"
          />
        </div>
        <div>
          <label className="text-[12px] text-gray-500 mb-1 block">{t("jd.form.hires")}</label>
          <input
            type="number"
            min={1}
            value={form.hires}
            onChange={(e) => set("hires", parseInt(e.target.value) || 1)}
            className="w-full text-[14px] px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 outline-none focus:border-[#3182F6]"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ExperienceInput t={t} value={form.experience} onChange={(v) => set("experience", v)} />
        <SalaryInput t={t} value={form.salary} onChange={(v) => set("salary", v)} />
      </div>

      <div>
        <label className="text-[12px] text-gray-500 mb-1 block">Responsibilities</label>
        <textarea
          value={form.responsibilities}
          onChange={(e) => set("responsibilities", e.target.value)}
          rows={5}
          className="w-full text-[14px] leading-[1.6] px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 outline-none focus:border-[#3182F6] resize-y"
        />
      </div>

      <div>
        <label className="text-[12px] text-gray-500 mb-1 block">Qualifications</label>
        <textarea
          value={form.qualifications}
          onChange={(e) => set("qualifications", e.target.value)}
          rows={5}
          className="w-full text-[14px] leading-[1.6] px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 outline-none focus:border-[#3182F6] resize-y"
        />
      </div>

      <div>
        <label className="text-[12px] text-gray-500 mb-1 block">Preferred</label>
        <textarea
          value={form.preferred}
          onChange={(e) => set("preferred", e.target.value)}
          rows={3}
          className="w-full text-[14px] leading-[1.6] px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 outline-none focus:border-[#3182F6] resize-y"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={onCancel}
          className="px-4 py-2.5 text-[14px] text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
        >
          {t("common.cancel")}
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="px-4 py-2.5 text-[14px] text-white bg-[#3182F6] rounded-xl hover:bg-[#2272EB] disabled:opacity-50 transition-colors"
        >
          {saving ? t("jd.form.saving") : isEdit ? t("common.edit") : t("jd.form.add")}
        </button>
      </div>
    </div>
  );
}

const FIELD_INPUT_CLS =
  "text-[14px] px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 outline-none focus:border-[#3182F6]";

// 폼 입력칸과 같은 룩의 커스텀 드롭다운 (네이티브 select 대체)
function SelectField({
  value,
  onChange,
  options,
  className,
  small,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
  small?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className={`relative ${className || ""}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between gap-2 text-left ${
          small
            ? "text-[12px] px-2.5 py-1.5 rounded-lg border bg-white text-gray-900"
            : FIELD_INPUT_CLS
        } ${open ? "border-[#3182F6]" : "border-gray-200"} border transition-colors`}
      >
        <span className="truncate">{selected?.label || ""}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8B95A1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={`flex-shrink-0 transition-transform duration-100 ${open ? "rotate-180" : ""}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-1.5 max-h-[240px] overflow-y-auto bg-white border border-gray-200/80 rounded-xl py-1 z-50"
          style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}
        >
          {options.map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-[13px] transition-colors ${
                opt.value === value
                  ? "text-[#3182F6] bg-[#E8F3FF]/50"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// 공고 행의 상태 pill 드롭다운 (상태색 유지)
function StatusPillSelect({
  t,
  value,
  onChange,
}: {
  t: TFn;
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = POSTING_STATUS_KEYS.find((s) => s.value === value);
  const color = current?.color || "#8B95A1";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5 transition-opacity hover:opacity-75"
        style={{ backgroundColor: color + "18", color }}
      >
        {current ? t(current.labelKey) : value}
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
          className={`transition-transform duration-100 ${open ? "rotate-180" : ""}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute top-full left-0 mt-1.5 min-w-[120px] bg-white border border-gray-200/80 rounded-xl py-1 z-50"
          style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}
        >
          {POSTING_STATUS_KEYS.map((s) => (
            <button
              type="button"
              key={s.value}
              onClick={() => { onChange(s.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-[12px] flex items-center gap-2 transition-colors ${
                s.value === value ? "bg-gray-50" : "hover:bg-gray-50"
              }`}
            >
              <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-gray-700">{t(s.labelKey)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// 기존 free text 값 파싱 — 인식 못 하는 형식이면 null (→ 직접 입력 모드로 폴백)
function parseExperience(text: string): { kind: "intern" | "fresher" | "years"; min: string; max: string } | null {
  const s = text.trim();
  if (!s) return { kind: "years", min: "", max: "" };
  if (/^intern/i.test(s)) return { kind: "intern", min: "", max: "" };
  if (/^(fresher|entry)/i.test(s)) return { kind: "fresher", min: "", max: "" };
  let m = s.match(/^(\d+)\s*[-–~]\s*(\d+)\s*years?$/i) || s.match(/^(\d+)\s*[-–~]\s*(\d+)$/);
  if (m) return { kind: "years", min: m[1], max: m[2] };
  m = s.match(/^(\d+)\s*\+\s*years?$/i);
  if (m) return { kind: "years", min: m[1], max: "" };
  m = s.match(/^(\d+)\s*years?$/i) || s.match(/^(\d+)$/);
  if (m) return { kind: "years", min: m[1], max: m[1] };
  return null;
}

function composeExperience(kind: "intern" | "fresher" | "years", min: string, max: string): string {
  if (kind === "intern") return "Intern";
  if (kind === "fresher") return "Fresher";
  const yearWord = (n: string) => (n === "1" ? "year" : "years");
  if (min && max) return min === max ? `${min} ${yearWord(min)}` : `${min}-${max} years`;
  if (min) return `${min}+ years`;
  if (max) return `0-${max} years`;
  return "";
}

function parseSalary(text: string): { min: string; max: string } | null {
  const s = text.trim();
  if (!s) return { min: "", max: "" };
  let m = s.match(/^(\d+(?:\.\d+)?)\s*M?\s*[-–~]\s*(\d+(?:\.\d+)?)\s*M?\s*(?:VND)?$/i);
  if (m) return { min: m[1], max: m[2] };
  m = s.match(/^up\s*to\s*(\d+(?:\.\d+)?)\s*M?\s*(?:VND)?$/i);
  if (m) return { min: "", max: m[1] };
  m = s.match(/^từ\s*(\d+(?:\.\d+)?)\s*M?\s*(?:VND)?$/i) || s.match(/^(\d+(?:\.\d+)?)\s*M?\s*\+\s*(?:VND)?$/i);
  if (m) return { min: m[1], max: "" };
  return null;
}

function composeSalary(min: string, max: string): string {
  if (min && max) return `${min}M – ${max}M VND`;
  if (min) return `${min}M+ VND`;
  if (max) return `Up to ${max}M VND`;
  return "";
}

function ExperienceInput({ t, value, onChange }: { t: TFn; value: string; onChange: (v: string) => void }) {
  const [init] = useState(() => parseExperience(value));
  const [custom, setCustom] = useState(init === null);
  const [kind, setKind] = useState<"intern" | "fresher" | "years">(init?.kind ?? "years");
  const [minY, setMinY] = useState(init?.min ?? "");
  const [maxY, setMaxY] = useState(init?.max ?? "");

  const apply = (k: "intern" | "fresher" | "years", mn: string, mx: string) => {
    setKind(k); setMinY(mn); setMaxY(mx);
    onChange(composeExperience(k, mn, mx));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[12px] text-gray-500">{t("jd.form.experience")}</label>
        <button
          type="button"
          onClick={() => setCustom(!custom)}
          className="text-[11px] text-[#3182F6] hover:text-[#2272EB] transition-colors"
        >
          {custom ? t("jd.form.presetInput") : t("jd.form.customInput")}
        </button>
      </div>
      {custom ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="3-5 years"
          className={`w-full ${FIELD_INPUT_CLS}`}
        />
      ) : (
        <div className="flex items-center gap-2">
          <SelectField
            value={kind}
            onChange={(v) => apply(v as "intern" | "fresher" | "years", minY, maxY)}
            className="flex-1 min-w-0"
            options={[
              { value: "intern", label: t("jd.form.expIntern") },
              { value: "fresher", label: t("jd.form.expFresher") },
              { value: "years", label: t("jd.form.expYears") },
            ]}
          />
          {kind === "years" && (
            <>
              <input
                type="number" min={0}
                value={minY}
                onChange={(e) => apply(kind, e.target.value, maxY)}
                placeholder={t("jd.form.min")}
                className={`w-[76px] flex-shrink-0 ${FIELD_INPUT_CLS}`}
              />
              <span className="text-[13px] text-gray-400 flex-shrink-0">~</span>
              <input
                type="number" min={0}
                value={maxY}
                onChange={(e) => apply(kind, minY, e.target.value)}
                placeholder={t("jd.form.max")}
                className={`w-[76px] flex-shrink-0 ${FIELD_INPUT_CLS}`}
              />
            </>
          )}
        </div>
      )}
      {!custom && value && (
        <p className="text-[11px] text-gray-400 mt-1">{value}</p>
      )}
    </div>
  );
}

function SalaryInput({ t, value, onChange }: { t: TFn; value: string; onChange: (v: string) => void }) {
  const [init] = useState(() => parseSalary(value));
  const [custom, setCustom] = useState(init === null);
  const [minS, setMinS] = useState(init?.min ?? "");
  const [maxS, setMaxS] = useState(init?.max ?? "");

  const apply = (mn: string, mx: string) => {
    setMinS(mn); setMaxS(mx);
    onChange(composeSalary(mn, mx));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[12px] text-gray-500">{t("jd.form.salary")}</label>
        <button
          type="button"
          onClick={() => setCustom(!custom)}
          className="text-[11px] text-[#3182F6] hover:text-[#2272EB] transition-colors"
        >
          {custom ? t("jd.form.presetInput") : t("jd.form.customInput")}
        </button>
      </div>
      {custom ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="20M – 30M VND"
          className={`w-full ${FIELD_INPUT_CLS}`}
        />
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="number" min={0}
            value={minS}
            onChange={(e) => apply(e.target.value, maxS)}
            placeholder={t("jd.form.min")}
            className={`flex-1 min-w-0 ${FIELD_INPUT_CLS}`}
          />
          <span className="text-[13px] text-gray-400 flex-shrink-0">~</span>
          <input
            type="number" min={0}
            value={maxS}
            onChange={(e) => apply(minS, e.target.value)}
            placeholder={t("jd.form.max")}
            className={`flex-1 min-w-0 ${FIELD_INPUT_CLS}`}
          />
          <span className="text-[13px] text-gray-500 flex-shrink-0">M VND</span>
        </div>
      )}
      {!custom && value && (
        <p className="text-[11px] text-gray-400 mt-1">{value}</p>
      )}
    </div>
  );
}

interface SearchCandidate {
  id: string;
  full_name: string;
  position: string | null;
  yoe: string | null;
  skills: string | null;
  applied_job: string | null;
  pipeline_status: string;
  llm_score: number | null;
}

function CandidateSearchPanel({
  t,
  jdCode,
  onChanged,
}: {
  t: TFn;
  jdCode: string;
  onChanged: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchCandidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setLoading(true);

    const term = `%${q.trim()}%`;
    const { data } = await supabase
      .from("candidates")
      .select("id, full_name, position, yoe, skills, applied_job, pipeline_status, llm_score")
      .or(`full_name.ilike.${term},position.ilike.${term},skills.ilike.${term}`)
      .order("created_at", { ascending: false })
      .limit(50);

    setResults(data || []);
    setLoading(false);
  };

  const handleInput = (v: string) => {
    setQuery(v);
    setMessage("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(v), 300);
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const isAlreadyAssigned = (c: SearchCandidate) => {
    const code = c.applied_job?.match(/^([A-Z]+\d+)/)?.[1];
    return code === jdCode;
  };

  // 기존 지원 행을 덮어쓰지 않고 클론 API로 행을 복제 (멀티 잡 지원 방식과 통일)
  const handleAdd = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    const ids = Array.from(selected);

    let added = 0;
    let existed = 0;
    for (const id of ids) {
      try {
        const res = await fetch("/api/admin/candidates/clone", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ candidateId: id, jdCode }),
        });
        const j = await res.json();
        if (res.ok && j.existed) existed++;
        else if (res.ok) added++;
      } catch { /* ignore */ }
    }

    setSaving(false);
    setMessage(
      `${added}${t("jd.candidateAdded")}${existed > 0 ? ` · ${existed}${t("jd.addedExisted")}` : ""}`
    );
    setSelected(new Set());
    if (query.trim().length >= 2) search(query);
    onChanged();
  };

  return (
    <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
      <input
        type="text"
        value={query}
        onChange={(e) => handleInput(e.target.value)}
        placeholder={t("jd.searchPlaceholder")}
        autoFocus
        className="w-full text-[12px] px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 outline-none focus:border-[#3182F6]"
      />

      {loading && <p className="text-[11px] text-gray-400 py-2">{t("common.loading")}</p>}

      {!loading && results.length > 0 && (
        <div className="max-h-[280px] overflow-y-auto space-y-1.5">
          {results.map((c) => {
            const assigned = isAlreadyAssigned(c);
            const checked = selected.has(c.id);
            return (
              <label
                key={c.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                  assigned ? "bg-white opacity-50 cursor-default" : checked ? "bg-[#E8F3FF]" : "bg-white hover:bg-gray-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={assigned}
                  onChange={() => !assigned && toggle(c.id)}
                  className="w-3.5 h-3.5 rounded accent-[#3182F6] flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-medium text-gray-900 truncate">{c.full_name}</span>
                    {c.llm_score != null && (
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                        c.llm_score >= 85 ? "bg-[#FFF8F0] text-[#E8590C]"
                        : c.llm_score >= 70 ? "bg-[#E8F3FF] text-[#3182F6]"
                        : "bg-gray-100 text-gray-500"
                      }`}>
                        {c.llm_score}
                      </span>
                    )}
                    {assigned && (
                      <span className="text-[10px] text-gray-400">{t("jd.alreadyAssigned")}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-0.5">
                    {c.position && <span className="truncate">{c.position}</span>}
                    {c.yoe && <><span>·</span><span>{c.yoe}</span></>}
                    {c.applied_job && !assigned && (
                      <><span>·</span><span className="text-gray-400 truncate">{c.applied_job}</span></>
                    )}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      )}

      {!loading && query.trim().length >= 2 && results.length === 0 && (
        <p className="text-[11px] text-gray-400 py-2">{t("jd.noCandidatesFound")}</p>
      )}

      {message && (
        <p className="text-[11px] text-[#1D9E75] bg-[#1D9E75]/10 px-3 py-2 rounded-lg">{message}</p>
      )}

      {selected.size > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleAdd}
            disabled={saving}
            className="px-4 py-2 text-[12px] text-white bg-[#3182F6] rounded-lg hover:bg-[#2272EB] disabled:opacity-50 transition-colors"
          >
            {saving ? t("jd.form.saving") : `${t("jd.addSelected")} (${selected.size})`}
          </button>
        </div>
      )}
    </div>
  );
}

function PostingForm({
  t,
  jdCode,
  initial,
  onSave,
  onCancel,
}: {
  t: TFn;
  jdCode: string;
  initial?: JDPosting;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [platform, setPlatform] = useState(initial?.platform || PLATFORM_OPTIONS[0]);
  const [url, setUrl] = useState(initial?.url || "");
  const [postedAt, setPostedAt] = useState(
    initial?.posted_at ? initial.posted_at.slice(0, 16) : ""
  );
  const [status, setStatus] = useState(initial?.status || "active");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!url.trim()) return;
    setSaving(true);
    setError("");

    const payload = {
      jd_code: jdCode,
      platform,
      url: url.trim(),
      posted_at: postedAt ? new Date(postedAt).toISOString() : null,
      status,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (initial) {
      result = await supabase.from("jd_postings").update(payload).eq("id", initial.id);
    } else {
      result = await supabase.from("jd_postings").insert(payload);
    }

    setSaving(false);
    if (result.error) {
      setError(result.error.message);
      console.error("jd_postings save error:", result.error);
      return;
    }
    onSave();
  };

  return (
    <div className="bg-gray-50 rounded-xl p-3 mb-2 space-y-2.5">
      {error && (
        <p className="text-[11px] text-[#E8590C] bg-[#FFF8F0] px-3 py-2 rounded-lg">{error}</p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-gray-500 mb-0.5 block">{t("jd.posting.platform")}</label>
          <SelectField
            small
            value={platform}
            onChange={setPlatform}
            options={PLATFORM_OPTIONS.map((p) => ({ value: p, label: p }))}
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 mb-0.5 block">{t("jd.posting.status")}</label>
          <SelectField
            small
            value={status}
            onChange={setStatus}
            options={POSTING_STATUS_KEYS.map((s) => ({ value: s.value, label: t(s.labelKey) }))}
          />
        </div>
      </div>
      <div>
        <label className="text-[10px] text-gray-500 mb-0.5 block">{t("jd.posting.url")}</label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          className="w-full text-[12px] px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-900 outline-none focus:border-[#3182F6]"
        />
      </div>
      <div>
        <label className="text-[10px] text-gray-500 mb-0.5 block">{t("jd.posting.postedAt")}</label>
        <input
          type="datetime-local"
          value={postedAt}
          onChange={(e) => setPostedAt(e.target.value)}
          className="w-full text-[12px] px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-900 outline-none focus:border-[#3182F6]"
        />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-[11px] text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {t("common.cancel")}
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving || !url.trim()}
          className="px-3 py-1.5 text-[11px] text-white bg-[#3182F6] rounded-lg hover:bg-[#2272EB] disabled:opacity-50 transition-colors"
        >
          {saving ? t("jd.form.saving") : initial ? t("common.edit") : t("common.save")}
        </button>
      </div>
    </div>
  );
}

function PostingRow({
  t,
  posting,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  t: TFn;
  posting: JDPosting;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-200/60 px-3 py-2.5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[11px] font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">
            {posting.platform}
          </span>
          <StatusPillSelect t={t} value={posting.status} onChange={onStatusChange} />
        </div>
        <a
          href={posting.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-[#3182F6] hover:text-[#2272EB] truncate block transition-colors"
        >
          {posting.url}
        </a>
        {posting.posted_at && (
          <p className="text-[10px] text-gray-400 mt-0.5">
            {t("jd.posted")}: {new Date(posting.posted_at).toLocaleDateString("ko-KR", {
              year: "numeric", month: "short", day: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={onEdit}
          className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
          title={t("common.edit")}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 text-gray-400 hover:text-[#E8590C] transition-colors"
          title={t("common.delete")}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
