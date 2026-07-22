"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { updateTalentVerification } from "@/lib/create-talent-card";
import { useAdminI18n } from "@/lib/admin-i18n";
import { JD_MAP, resolveJD, type JobDescription } from "@/lib/jd-data";
import { getUserProfile } from "@/lib/supabase-auth";
import ConfirmModal from "@/app/components/ConfirmModal";

function Dropdown({ value, onChange, options, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
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
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] transition-colors whitespace-nowrap ${
          value !== "all"
            ? "bg-gray-900 text-white"
            : "bg-white border border-gray-200 text-gray-700 hover:border-gray-300"
        }`}
      >
        {selected?.label || placeholder}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 min-w-[180px] max-h-[280px] overflow-y-auto bg-white border border-gray-200/80 rounded-xl py-1 z-50"
          style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3.5 py-2 text-[13px] transition-colors ${
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

interface Candidate {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  position: string | null;
  yoe: string | null;
  cv_url: string | null;
  portfolio_url: string | null;
  skills: string | null;
  source: string;
  applied_date: string | null;
  applied_job: string | null;
  applied_company: string | null;
  pipeline_status: string;
  phone_interview_note: string | null;
  rejection_reason: string | null;
  llm_score: number | null;
  llm_summary: string | null;
  talent_id: string | null;
  created_at: string;
}

const PIPELINE_STEPS = [
  { key: "pending", labelKey: "candidates.tab.pending", statuses: ["new"], color: "#8B95A1" },
  { key: "ai_passed", labelKey: "candidates.tab.aiPassed", statuses: ["passed"], color: "#3182F6" },
  { key: "ready_to_forward", labelKey: "candidates.tab.readyToForward", statuses: ["ready_to_forward"], color: "#2272EB" },
  { key: "sent_to_company", labelKey: "candidates.tab.sentToCompany", statuses: ["sent_to_company"], color: "#E8590C" },
  { key: "interviewing", labelKey: "candidates.tab.interviewing", statuses: ["interviewing"], color: "#6B7684" },
  { key: "offer", labelKey: "candidates.tab.offer", statuses: ["offer"], color: "#B8860B" },
  { key: "final_passed", labelKey: "candidates.tab.finalPassed", statuses: ["final_passed"], color: "#1D9E75" },
] as const;

const EXIT_STEPS = [
  { key: "screening_failed", labelKey: "candidates.tab.screeningFailed", statuses: ["screening_failed"], color: "#B0B8C1" },
  { key: "rejected", labelKey: "candidates.tab.rejected", statuses: ["rejected"], color: "#B0B8C1" },
] as const;

const ALL_STEPS = [...PIPELINE_STEPS, ...EXIT_STEPS];

const STAGE_OPTIONS = [
  { value: "new", labelKey: "candidates.tab.pending" },
  { value: "passed", labelKey: "candidates.tab.aiPassed" },
  { value: "ready_to_forward", labelKey: "candidates.tab.readyToForward" },
  { value: "sent_to_company", labelKey: "candidates.tab.sentToCompany" },
  { value: "interviewing", labelKey: "candidates.tab.interviewing" },
  { value: "offer", labelKey: "candidates.tab.offer" },
  { value: "final_passed", labelKey: "candidates.tab.finalPassed" },
  { value: "screening_failed", labelKey: "candidates.tab.screeningFailed" },
  { value: "rejected", labelKey: "candidates.tab.rejected" },
];

// 리스트 인라인 원클릭 진행용 다음 단계 체인
const NEXT_STAGE: Record<string, string> = {
  passed: "ready_to_forward",
  ready_to_forward: "sent_to_company",
  sent_to_company: "interviewing",
  interviewing: "offer",
  offer: "final_passed",
};

const STATUS_COLORS: Record<string, string> = {
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

function StatusBadge({ status, score, t }: { status: string; score: number | null; t: (k: string) => string }) {
  const color = STATUS_COLORS[status] || "#8B95A1";
  const label = t(`status.${status}`);
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px]"
      style={{ backgroundColor: color + "18", color }}>
      {score !== null ? `${score} · ` : ""}{label}
    </span>
  );
}

async function readStream(res: Response, onData: (data: Record<string, unknown>) => void) {
  const reader = res.body?.getReader();
  const decoder = new TextDecoder();
  if (!reader) throw new Error("Stream not available");
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const match = line.match(/^data: (.+)$/);
      if (match) onData(JSON.parse(match[1]));
    }
  }
}

export default function CandidatesPage() {
  const { t, lang } = useAdminI18n();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("pending");
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [allJDs, setAllJDs] = useState<Record<string, JobDescription>>(JD_MAP);
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showBulkJD, setShowBulkJD] = useState(false);
  const [showBulkStage, setShowBulkStage] = useState(false);
  const [pendingBulk, setPendingBulk] = useState<{ action: string; value?: string; label: string } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const bulkStageRef = useRef<HTMLDivElement>(null);
  const bulkJDRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // 리스트에서 모달 없이 바로 단계 변경 (낙관적 업데이트 + 시트 자동 반영)
  const quickChangeStatus = async (c: Candidate, newStatus: string, extra?: Record<string, unknown>) => {
    setCandidates((prev) => prev.map((x) => (x.id === c.id ? ({ ...x, pipeline_status: newStatus, ...extra } as Candidate) : x)));
    setToast(`${c.full_name} → ${t(`status.${newStatus}`)}`);
    await supabase.from("candidates").update({ pipeline_status: newStatus, ...extra, updated_at: new Date().toISOString() }).eq("id", c.id);
    await updateTalentVerification(supabase, c.id, newStatus);
    fetch("/api/admin/pipeline/push-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateId: c.id }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.updated) {
          setToast(`${c.full_name} → ${t(`status.${newStatus}`)} · ${j.appended ? t("toast.sheetRowAdded") : t("toast.sheetSynced")} ✓`);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) getUserProfile(session.user.id).then((p) => { if (p?.role === "super_admin") setIsSuperAdmin(true); });
    });
    // DB JDs 병합
    supabase.from("jd_definitions").select("*").then(({ data }) => {
      if (data && data.length > 0) {
        const merged = { ...JD_MAP };
        for (const row of data) {
          merged[row.code] = {
            company: row.company,
            position: row.position,
            experience: row.experience,
            hires: row.hires,
            salary: row.salary,
            responsibilities: row.responsibilities,
            qualifications: row.qualifications,
            preferred: row.preferred,
          };
        }
        setAllJDs(merged);
      }
    });
  }, []);

  const fetchCandidates = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/candidates");
      const data = await res.json();
      if (Array.isArray(data)) setCandidates(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);

  const runAction = async (url: string, label: string) => {
    setBusy(true); setResult(null); setProgress(0); setMessage(`${label}...`);
    try {
      const res = await fetch(url, { method: "POST" });
      await readStream(res, (data) => {
        if (data.type === "status") setMessage(data.message as string);
        else if (data.type === "progress") {
          setProgress(data.progress as number);
          setMessage(`${data.progress}% (${data.inserted || 0}/${data.total || 0})`);
        } else if (data.type === "screening") {
          setProgress(Math.round((((data.current as number) - 1) / (data.total as number)) * 100));
          setMessage(`${data.current}/${data.total} ${data.name}...`);
        } else if (data.type === "result") {
          setProgress(data.progress as number);
          const emoji = data.verdict === "PASS" ? "✅" : data.verdict === "FAIL" ? "❌" : "⚠️";
          setMessage(`${data.current}/${data.total} ${emoji} ${data.name} — ${data.score != null ? data.score : (data.error || "error")}`);
        } else if (data.type === "created") {
          setProgress(data.progress as number);
          setMessage(`${data.current}/${data.total} ✅ ${data.name}`);
        } else if (data.type === "done") {
          const parts = [];
          if (data.inserted != null) parts.push(`${data.inserted}`);
          if (data.passed != null) parts.push(`pass: ${data.passed}`);
          if (data.failed != null) parts.push(`fail: ${data.failed}`);
          if (data.created != null) parts.push(`created: ${data.created}`);
          if (data.errors != null && (data.errors as number) > 0) parts.push(`errors: ${data.errors}`);
          setResult(`${label} — ${parts.join(" · ")}`);
          fetchCandidates();
        } else if (data.type === "error") {
          setResult(`Error: ${data.message}`);
        }
      });
    } catch {
      setResult(`${label} error`);
    }
    setBusy(false); setProgress(0); setMessage("");
  };

  const tabGroup = ALL_STEPS.find((tab) => tab.key === activeTab)!;
  const sources = Array.from(new Set(candidates.map((c) => c.source)));
  // applied_job에서 allJDs를 통해 회사/포지션 추출 (코드 기준 단일 해석)
  const getCompany = (c: Candidate) => resolveJD(c.applied_job, allJDs)?.company ?? null;
  const getPosition = (c: Candidate) => resolveJD(c.applied_job, allJDs)?.position ?? null;

  const companyOptions = Array.from(new Set(
    candidates.map((c) => getCompany(c)).filter(Boolean)
  )) as string[];
  const positionOptions = Array.from(new Set(
    candidates.map((c) => getPosition(c)).filter(Boolean)
  )) as string[];

  // 필터(소스/회사/포지션) 적용된 베이스 — 탭/검색 제외
  const filteredBase = candidates
    .filter((c) => sourceFilter === "all" || c.source === sourceFilter)
    .filter((c) => companyFilter === "all" || getCompany(c) === companyFilter)
    .filter((c) => positionFilter === "all" || getPosition(c) === positionFilter);

  const counts = Object.fromEntries(
    ALL_STEPS.map((step) => [
      step.key,
      filteredBase.filter((c) => (step.statuses as readonly string[]).includes(c.pipeline_status)).length,
    ])
  ) as Record<string, number>;

  const filtered = filteredBase
    .filter((c) => tabGroup.statuses.includes(c.pipeline_status as never))
    .filter((c) => !search || c.full_name.toLowerCase().includes(search.toLowerCase()));


  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(c => c.id)));
  };

  const toggleBulkMode = () => {
    setBulkMode(v => !v);
    setSelected(new Set());
    setShowBulkJD(false);
    setShowBulkStage(false);
  };

  const requestBulkAction = (action: string, value?: string) => {
    if (selected.size === 0) return;
    const labels: Record<string, string> = {
      delete: t("common.delete"),
      change_status: t("bulk.changeStage"),
      assign_jd: t("bulk.assignJD"),
    };
    const label = action === "change_status"
      ? `${labels[action]} → ${STAGE_OPTIONS.find(o => o.value === value)?.labelKey ? t(STAGE_OPTIONS.find(o => o.value === value)!.labelKey) : value}`
      : action === "assign_jd"
      ? `${labels[action]} → ${value || t("bulk.unassigned")}`
      : labels[action] || action;
    setPendingBulk({ action, value, label });
    setShowBulkJD(false);
    setShowBulkStage(false);
  };

  const executeBulkAction = async () => {
    if (!pendingBulk || selected.size === 0) return;
    setBulkLoading(true);
    await fetch("/api/admin/candidates/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected), action: pendingBulk.action, value: pendingBulk.value }),
    });
    setBulkLoading(false);
    setSelected(new Set());
    setPendingBulk(null);
    fetchCandidates();
  };

  // 벌크 드롭다운 외부 클릭 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bulkStageRef.current && !bulkStageRef.current.contains(e.target as Node)) setShowBulkStage(false);
      if (bulkJDRef.current && !bulkJDRef.current.contains(e.target as Node)) setShowBulkJD(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-[14px] text-gray-500">{t("common.loading")}</p></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[22px] font-medium text-gray-900">{t("candidates.title")}</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowCreateModal(true)}
            disabled={bulkMode}
            className={`px-4 py-2 rounded-xl text-[13px] transition-colors duration-100 bg-[#1D9E75] text-white hover:bg-[#178A64] ${bulkMode ? "opacity-40 pointer-events-none" : ""}`}>
            + {t("candidates.addCandidate")}
          </button>
          <button onClick={toggleBulkMode}
            className={`px-4 py-2 rounded-xl text-[13px] transition-colors duration-100 ${
              bulkMode ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-700 hover:border-gray-300"
            }`}>
            {bulkMode ? t("bulk.deselectAll") : t("bulk.selectMode")}
          </button>
        {isSuperAdmin && (
          <div className={`flex gap-2 ${bulkMode ? "opacity-40 pointer-events-none" : ""}`}>
            <button onClick={async () => {
                if (!confirm(t("candidates.dedupConfirm"))) return;
                setBusy(true); setMessage(t("candidates.dedupRunning"));
                const res = await fetch("/api/admin/dedup-candidates", { method: "POST" });
                const json = await res.json();
                setResult(`${t("candidates.dedupResult.groups")} ${json.duplicateGroups}, ${json.deleted}${t("candidates.dedupResult.deleted")}`);
                setBusy(false); fetchCandidates();
              }} disabled={busy}
              className="px-4 py-2 bg-gray-600 text-white text-[13px] rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-50">
              {t("candidates.dedup")}
            </button>
            <button onClick={() => runAction("/api/generate-cards", t("candidates.generateCards"))} disabled={busy}
              className="px-4 py-2 bg-[#1D9E75] text-white text-[13px] rounded-xl hover:bg-[#178A64] transition-colors disabled:opacity-50">
              {t("candidates.generateCards")}
            </button>
            <button onClick={() => runAction("/api/screen-batch", t("candidates.llmScreening"))} disabled={busy}
              className="px-4 py-2 bg-[#3182F6] text-white text-[13px] rounded-xl hover:bg-[#2272EB] transition-colors disabled:opacity-50">
              {t("candidates.llmScreening")}
            </button>
            <button onClick={() => runAction("/api/sync-sheets", t("candidates.syncSheets"))} disabled={busy}
              className="px-4 py-2 bg-gray-900 text-white text-[13px] rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50">
              {t("candidates.syncSheets")}
            </button>
          </div>
        )}
        </div>
      </div>

      {busy && (
        <div className="mb-4 px-4 py-3 bg-white border border-gray-200/60 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] text-gray-700">{message}</span>
            {progress > 0 && <span className="text-[13px] font-medium text-gray-900">{progress}%</span>}
          </div>
          {progress > 0 && (
            <div className="h-[6px] bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#3182F6] rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      )}

      {result && !busy && <div className="mb-4 px-4 py-3 bg-blue-50 text-[13px] text-blue-600 rounded-xl">{result}</div>}

      {/* 파이프라인 로드맵 */}
      <div className="bg-white rounded-2xl border border-gray-200/60 p-5 mb-5">
        <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
          {PIPELINE_STEPS.map((step) => {
            const isActive = activeTab === step.key;
            const count = counts[step.key as keyof typeof counts];
            return (
              <button
                key={step.key}
                onClick={() => setActiveTab(step.key)}
                className={`rounded-xl border px-3.5 py-3 text-left transition-colors min-w-0 ${
                  isActive ? "" : "bg-white border-gray-200 hover:border-gray-300"
                }`}
                style={isActive ? { borderColor: step.color, backgroundColor: step.color + "0D" } : undefined}
              >
                <p
                  className={`text-[12px] mb-1 truncate ${isActive ? "font-medium" : ""}`}
                  style={{ color: isActive ? step.color : "#6B7684" }}
                >
                  {t(step.labelKey)}
                </p>
                <p
                  className="text-[20px] font-medium leading-none tabular-nums"
                  style={{ color: isActive ? step.color : "#191F28" }}
                >
                  {count.toLocaleString()}
                </p>
              </button>
            );
          })}
        </div>

        {/* 탈락 섹션 */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
          <span className="text-[11px] text-gray-400 flex-shrink-0">탈락</span>
          {EXIT_STEPS.map((step) => {
            const isActive = activeTab === step.key;
            const count = counts[step.key as keyof typeof counts];
            return (
              <button
                key={step.key}
                onClick={() => setActiveTab(step.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] transition-colors ${
                  isActive
                    ? "bg-gray-900 text-white"
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                }`}
              >
                {t(step.labelKey)}
                <span className={`${isActive ? "text-gray-300" : "text-gray-400"}`}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={lang === "ko" ? "이름으로 검색..." : lang === "vi" ? "Tìm theo tên..." : "Search by name..."}
          className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-300"
        />
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <Dropdown
          value={companyFilter}
          onChange={setCompanyFilter}
          placeholder={t("candidates.allCompanies")}
          options={[
            { value: "all", label: t("candidates.allCompanies") },
            ...companyOptions.map((company) => ({ value: company, label: company })),
          ]}
        />
        <Dropdown
          value={positionFilter}
          onChange={setPositionFilter}
          placeholder={t("candidates.allPositions")}
          options={[
            { value: "all", label: t("candidates.allPositions") },
            ...positionOptions.map((pos) => ({ value: pos, label: pos })),
          ]}
        />
        <Dropdown
          value={sourceFilter}
          onChange={setSourceFilter}
          placeholder={t("candidates.allSources")}
          options={[
            { value: "all", label: t("candidates.allSources") },
            ...sources.map((src) => ({ value: src, label: src })),
          ]}
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/60 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-[14px] text-gray-500">
            {candidates.length === 0 ? t("candidates.noData") : t("candidates.noMatch")}
          </div>
        ) : (
          <div className={`divide-y divide-gray-100 ${bulkMode && selected.size > 0 ? "mb-16" : ""}`}>
            {filtered.map((c) => (
              <div key={c.id}
                onClick={bulkMode ? () => toggleSelect(c.id) : () => setSelectedCandidate(c)}
                className={`group flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors ${
                  bulkMode && selected.has(c.id)
                    ? "bg-[#E8F3FF] border-l-2 border-l-[#3182F6]"
                    : "hover:bg-gray-50"
                }`}>
                <div className="w-[38px] h-[38px] rounded-full bg-[#E8F3FF] flex items-center justify-center flex-shrink-0">
                  <span className="text-[13px] font-medium text-[#3182F6]">{c.full_name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[14px] font-medium text-gray-900 truncate">{c.full_name}</span>
                    <StatusBadge status={c.pipeline_status} score={c.llm_score} t={t} />
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-gray-500">
                    {getCompany(c) && (
                      <span className="bg-[#E8F3FF] text-[#3182F6] px-1.5 py-0.5 rounded text-[11px] font-medium">
                        {getCompany(c)}
                      </span>
                    )}
                    {getPosition(c) && <span>{getPosition(c)}</span>}
                    {(getCompany(c) || getPosition(c)) && c.city && <span>·</span>}
                    {c.city && <span>{c.city}</span>}
                  </div>
                </div>
                {/* 인라인 퀵 액션 (hover 시 표시) */}
                {!bulkMode && (
                  <div className="hidden group-hover:flex items-center gap-1.5 flex-shrink-0">
                    {NEXT_STAGE[c.pipeline_status] && (
                      <button
                        onClick={(e) => { e.stopPropagation(); quickChangeStatus(c, NEXT_STAGE[c.pipeline_status]); }}
                        className="px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[#3182F6] text-white hover:bg-[#2272EB] transition-colors whitespace-nowrap"
                      >
                        {t(`status.${NEXT_STAGE[c.pipeline_status]}`)} →
                      </button>
                    )}
                    {!["rejected", "screening_failed", "final_passed"].includes(c.pipeline_status) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); quickChangeStatus(c, "rejected", { rejection_reason: "Manual reject" }); }}
                        className="px-3 py-1.5 rounded-lg text-[12px] bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500 transition-colors whitespace-nowrap"
                      >
                        {t("action.reject")}
                      </button>
                    )}
                  </div>
                )}
                <div className="flex flex-col items-end flex-shrink-0 group-hover:hidden">
                  <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full mb-1">{c.source}</span>
                  {c.applied_date && <span className="text-[11px] text-gray-400">{c.applied_date}</span>}
                </div>
                {c.cv_url && (
                  <a href={c.cv_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                    className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7684" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 하단 고정 벌크 액션 바 */}
      {bulkMode && selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-5 py-3 flex items-center gap-3">
          <label className="flex items-center gap-2 text-[13px] text-gray-700 cursor-pointer">
            <input type="checkbox" checked={selected.size === filtered.length} onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500" />
            {t("bulk.selectAll")}
          </label>
          <span className="text-[13px] text-gray-500">{selected.size}{t("bulk.selected")}</span>
          <div className="flex gap-2 ml-auto">
            {/* 단계 변경 드롭다운 */}
            <div className="relative" ref={bulkStageRef}>
              <button onClick={() => { setShowBulkStage(v => !v); setShowBulkJD(false); }} disabled={bulkLoading}
                className="px-4 py-2 rounded-xl text-[13px] font-medium bg-[#3182F6]/10 text-[#3182F6] hover:bg-[#3182F6]/20 transition-colors disabled:opacity-50">
                {t("bulk.changeStage")}
              </button>
              {showBulkStage && (
                <div className="absolute bottom-full left-0 mb-1.5 min-w-[180px] max-h-[280px] overflow-y-auto bg-white border border-gray-200/80 rounded-xl py-1 z-50"
                  style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
                  {STAGE_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => requestBulkAction("change_status", opt.value)}
                      className="w-full text-left px-3.5 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors">
                      {t(opt.labelKey)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* JD 배정 드롭다운 */}
            <div className="relative" ref={bulkJDRef}>
              <button onClick={() => { setShowBulkJD(v => !v); setShowBulkStage(false); }} disabled={bulkLoading}
                className="px-4 py-2 rounded-xl text-[13px] font-medium bg-[#1D9E75]/10 text-[#1D9E75] hover:bg-[#1D9E75]/20 transition-colors disabled:opacity-50">
                {t("bulk.assignJD")}
              </button>
              {showBulkJD && (
                <div className="absolute bottom-full right-0 mb-1.5 min-w-[300px] max-h-[280px] overflow-y-auto bg-white border border-gray-200/80 rounded-xl py-1 z-50"
                  style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
                  <button onClick={() => requestBulkAction("assign_jd", "")}
                    className="w-full text-left px-3.5 py-2 text-[13px] text-gray-400 hover:bg-gray-50 transition-colors">
                    {t("bulk.unassigned")}
                  </button>
                  {Object.entries(allJDs).map(([code, j]) => (
                    <button key={code} onClick={() => requestBulkAction("assign_jd", `${code} - ${j.position}`)}
                      className="w-full text-left px-3.5 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors">
                      {code} — {j.company} · {j.position}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* 삭제 */}
            <button onClick={() => requestBulkAction("delete")} disabled={bulkLoading}
              className="px-4 py-2 rounded-xl text-[13px] font-medium bg-red-50 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50">
              {t("common.delete")}
            </button>
          </div>
        </div>
      )}

      {pendingBulk && (
        <ConfirmModal
          title={`${selected.size}명 일괄 ${pendingBulk.label}`}
          message={`선택한 ${selected.size}명에게 "${pendingBulk.label}" 작업을 실행합니다.`}
          confirmLabel={pendingBulk.label}
          danger={pendingBulk.action === "delete"}
          onConfirm={executeBulkAction}
          onCancel={() => setPendingBulk(null)}
        />
      )}

      {selectedCandidate && (() => {
        const idx = filtered.findIndex((x) => x.id === selectedCandidate.id);
        return (
          <CandidateDetailModal
            candidate={selectedCandidate}
            jdMap={allJDs}
            position={idx >= 0 ? `${idx + 1} / ${filtered.length}` : undefined}
            onPrev={idx > 0 ? () => setSelectedCandidate(filtered[idx - 1]) : undefined}
            onNext={idx >= 0 && idx < filtered.length - 1 ? () => setSelectedCandidate(filtered[idx + 1]) : undefined}
            onStatusChanged={(id, status, extra) => {
              setCandidates((prev) => prev.map((x) => (x.id === id ? ({ ...x, pipeline_status: status, ...extra } as Candidate) : x)));
              // 단계 변경으로 현재 탭에서 빠져나가면 자동으로 다음 후보 선택 (연속 검토 흐름 유지)
              if (!(tabGroup.statuses as readonly string[]).includes(status) && idx >= 0) {
                const next = filtered[idx + 1] || filtered[idx - 1];
                if (next && next.id !== id) setSelectedCandidate(next);
              }
            }}
            onClose={() => { setSelectedCandidate(null); fetchCandidates(); }}
          />
        );
      })()}

      {toast && (
        <div className="fixed bottom-5 right-5 z-[70] bg-gray-900 text-white text-[13px] px-4 py-2.5 rounded-xl">
          {toast}
        </div>
      )}

      {showCreateModal && (
        <CreateCandidateModal
          jdMap={allJDs}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); fetchCandidates(); }}
        />
      )}
    </div>
  );
}

function CreateCandidateModal({ jdMap, onClose, onCreated }: { jdMap: Record<string, JobDescription>; onClose: () => void; onCreated: () => void }) {
  const { t, lang } = useAdminI18n();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    city: "",
    position: "",
    yoe: "",
    cv_url: "",
    portfolio_url: "",
    skills: "",
    source: "manual",
    applied_date: new Date().toISOString().split("T")[0],
    applied_job: "",
    applied_company: "",
    pipeline_status: "new",
  });

  const set = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.full_name.trim()) {
      setError(lang === "ko" ? "이름은 필수입니다" : "Name is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed");
        setSaving(false);
        return;
      }
      onCreated();
    } catch {
      setError("Network error");
      setSaving(false);
    }
  };

  const fields: { key: string; label: string; type?: string; required?: boolean; placeholder?: string }[] = [
    { key: "full_name", label: lang === "ko" ? "이름 *" : "Full Name *", required: true, placeholder: "Nguyen Van A" },
    { key: "email", label: "Email", type: "email", placeholder: "email@example.com" },
    { key: "phone", label: lang === "ko" ? "전화번호" : "Phone", placeholder: "+84..." },
    { key: "city", label: lang === "ko" ? "도시" : "City", placeholder: "Ho Chi Minh" },
    { key: "position", label: lang === "ko" ? "포지션" : "Position", placeholder: "Backend Developer" },
    { key: "yoe", label: lang === "ko" ? "경력 (년)" : "YoE", placeholder: "3" },
    { key: "skills", label: lang === "ko" ? "스킬" : "Skills", placeholder: "React, Node.js, Python" },
    { key: "cv_url", label: "CV URL", type: "url", placeholder: "https://..." },
    { key: "portfolio_url", label: "Portfolio URL", type: "url", placeholder: "https://..." },
    { key: "applied_company", label: lang === "ko" ? "지원 회사" : "Applied Company", placeholder: "" },
    { key: "applied_date", label: lang === "ko" ? "지원일" : "Applied Date", type: "date" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-[480px] h-full bg-white overflow-y-auto scrollbar-hide">
        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-medium text-gray-900">{t("candidates.addCandidate")}</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7684" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="text-[12px] text-gray-500 mb-1.5 block">{f.label}</label>
              <input
                type={f.type || "text"}
                value={form[f.key as keyof typeof form]}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-300"
              />
            </div>
          ))}

          <div>
            <label className="text-[12px] text-gray-500 mb-1.5 block">{lang === "ko" ? "소스" : "Source"}</label>
            <input
              type="text"
              value={form.source}
              onChange={(e) => set("source", e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-300"
            />
          </div>

          <div>
            <label className="text-[12px] text-gray-500 mb-1.5 block">{t("bulk.assignJD")}</label>
            <JDDropdown
              value={form.applied_job?.match(/^([A-Z]+\d+)/)?.[1] || ""}
              onChange={(code) => {
                const jd = jdMap[code];
                set("applied_job", code ? `${code} - ${jd?.position || ""}` : "");
              }}
              disabled={false}
              jdMap={jdMap}
            />
          </div>

          <div>
            <label className="text-[12px] text-gray-500 mb-1.5 block">{lang === "ko" ? "초기 상태" : "Initial Status"}</label>
            <div className="flex flex-wrap gap-1.5">
              {STAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => set("pipeline_status", opt.value)}
                  className={`px-2.5 py-1.5 rounded-lg text-[12px] transition-colors ${
                    form.pipeline_status === opt.value
                      ? "bg-gray-900 text-white"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {t(opt.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-[13px] text-red-500">{error}</p>}
        </div>

        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-100 flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 text-[13px] rounded-xl hover:border-gray-300 transition-colors">
            {lang === "ko" ? "취소" : "Cancel"}
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 py-2.5 bg-[#3182F6] text-white text-[13px] rounded-xl hover:bg-[#2272EB] transition-colors disabled:opacity-50">
            {saving ? "..." : lang === "ko" ? "추가" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CandidateDetailModal({ candidate: initCandidate, onClose, jdMap, onPrev, onNext, position, onStatusChanged }: {
  candidate: Candidate;
  onClose: () => void;
  jdMap: Record<string, JobDescription>;
  onPrev?: () => void;
  onNext?: () => void;
  position?: string;
  onStatusChanged?: (id: string, status: string, extra?: Record<string, unknown>) => void;
}) {
  const { t, lang } = useAdminI18n();
  const [c, setC] = useState(initCandidate);
  const [memo, setMemo] = useState(c.phone_interview_note || "");
  const [saving, setSaving] = useState(false);
  const [assigningJD, setAssigningJD] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingCV, setEditingCV] = useState(false);
  const [cvDraft, setCvDraft] = useState(c.cv_url || "");
  const [savingCV, setSavingCV] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [closing, setClosing] = useState(false);
  const [cloneJD, setCloneJD] = useState("");
  const [cloning, setCloning] = useState(false);
  const [cloneResult, setCloneResult] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  // 같은 후보를 다른 JD 행으로 복제 후 바로 스크리닝
  const cloneAndScreen = async () => {
    if (!cloneJD) return;
    setCloning(true);
    setCloneResult(lang === "ko" ? "복제 중..." : "Cloning...");
    try {
      const res = await fetch("/api/admin/candidates/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: c.id, jdCode: cloneJD }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "clone failed");
      if (json.existed) {
        setCloneResult(lang === "ko" ? `이미 ${cloneJD} 지원 행이 있습니다` : `Row for ${cloneJD} already exists`);
        setCloning(false);
        return;
      }
      setCloneResult(lang === "ko" ? "스크리닝 중..." : "Screening...");
      const r2 = await fetch("/api/screen-candidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: json.id }),
      });
      const j2 = await r2.json();
      if (!r2.ok) throw new Error(j2.error || "screening failed");
      setCloneResult(`${cloneJD}: ${j2.score ?? "?"}${j2.verdict ? ` · ${j2.verdict}` : ""} ✓`);
    } catch (e) {
      setCloneResult(`${lang === "ko" ? "실패" : "Failed"}: ${e instanceof Error ? e.message : "error"}`);
    }
    setCloning(false);
  };

  // 고급 토글 펼치면 패널을 맨 아래까지 부드럽게 스크롤 (삭제 버튼까지 다 보이게)
  useEffect(() => {
    if (showAdvanced) {
      requestAnimationFrame(() => {
        panelRef.current?.scrollTo({ top: panelRef.current.scrollHeight, behavior: "smooth" });
      });
    }
  }, [showAdvanced]);
  const summary = c.llm_summary ? JSON.parse(c.llm_summary) : null;
  const currentJobCode = c.applied_job?.match(/^([A-Z]+\d+)/)?.[1] || "";

  // 닫힘 모션 재생 후 언마운트
  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 220);
  }, [onClose]);

  // 후보 전환 시 패널은 유지하고 내용만 리셋 (슬라이드 모션은 열 때 1회만)
  useEffect(() => {
    setC(initCandidate);
    setMemo(initCandidate.phone_interview_note || "");
    setCvDraft(initCandidate.cv_url || "");
    setEditingCV(false);
    setCloneResult("");
  }, [initCandidate]);

  // 키보드: ← → 후보 이동, Esc 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Escape") handleClose();
      if (e.key === "ArrowLeft" && onPrev) onPrev();
      if (e.key === "ArrowRight" && onNext) onNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleClose, onPrev, onNext]);

  const getSummaryText = () => lang === "ko" ? (summary?.summary_ko || summary?.summary_en || summary?.summary || "") : (summary?.summary_en || summary?.summary || "");
  const getStrengths = () => lang === "ko" ? (summary?.strengths_ko || summary?.strengths_en || summary?.strengths || []) : (summary?.strengths_en || summary?.strengths || []);
  const getGaps = () => lang === "ko" ? (summary?.gaps_ko || summary?.gaps_en || summary?.gaps || []) : (summary?.gaps_en || summary?.gaps || []);

  const updateStatus = async (newStatus: string, extra?: Record<string, unknown>) => {
    setSaving(true);
    await supabase.from("candidates").update({ pipeline_status: newStatus, ...extra, updated_at: new Date().toISOString() }).eq("id", c.id);
    await updateTalentVerification(supabase, c.id, newStatus);
    fetch("/api/admin/pipeline/push-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateId: c.id }),
    }).catch(() => {});
    setC((prev) => ({ ...prev, pipeline_status: newStatus, ...extra } as Candidate));
    onStatusChanged?.(c.id, newStatus, extra);
    setSaving(false);
  };

  const saveMemo = async () => {
    await supabase.from("candidates").update({ phone_interview_note: memo, updated_at: new Date().toISOString() }).eq("id", c.id);
  };

  const assignJD = async (code: string) => {
    setAssigningJD(true);
    const jd = jdMap[code];
    const newAppliedJob = code ? `${code} - ${jd?.position || ""}` : "";
    await supabase.from("candidates").update({
      applied_job: newAppliedJob || null,
      updated_at: new Date().toISOString(),
    }).eq("id", c.id);
    setC((prev) => ({ ...prev, applied_job: newAppliedJob || null } as Candidate));
    setAssigningJD(false);
  };

  const deleteCandidate = async () => {
    if (!confirm(`${c.full_name}${t("bulk.deleteCandidateConfirm")}`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/candidates/${c.id}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok) handleClose();
      else alert(`삭제 실패: ${json.error || "알 수 없는 오류"}`);
    } catch (e) {
      alert(`삭제 실패: ${e}`);
    }
    setDeleting(false);
  };

  const nextStage = NEXT_STAGE[c.pipeline_status];
  const isTerminal = ["rejected", "screening_failed", "final_passed"].includes(c.pipeline_status);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className={`panel-backdrop absolute inset-0 bg-black/30 ${closing ? "panel-backdrop-out" : ""}`} onClick={handleClose} />
      <div ref={panelRef} className={`panel-slide-in relative w-full max-w-[720px] h-full bg-white overflow-y-auto scrollbar-hide ${closing ? "panel-slide-out" : ""}`}>
        {/* 고정 헤더: 이름 + 네비 + 액션 */}
        <div className="sticky top-0 bg-white z-10 px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <h2 className="text-[17px] font-medium text-gray-900 truncate">{c.full_name}</h2>
              <StatusBadge status={c.pipeline_status} score={c.llm_score} t={t} />
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={onPrev} disabled={!onPrev}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none"
                title="←">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7684" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              {position && <span className="text-[12px] text-gray-400 tabular-nums px-1">{position}</span>}
              <button onClick={onNext} disabled={!onNext}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none"
                title="→">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7684" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
              <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 ml-1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7684" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
          {/* 액션 바: 단계 액션은 왼쪽, 문서 링크는 오른쪽 */}
          <div className="flex items-center gap-2">
            {nextStage && (
              <button onClick={() => updateStatus(nextStage)} disabled={saving}
                className="px-4 py-2.5 bg-[#3182F6] text-white text-[13px] font-medium rounded-xl hover:bg-[#2272EB] transition-colors disabled:opacity-50 whitespace-nowrap">
                {t(`status.${nextStage}`)} →
              </button>
            )}
            {!isTerminal && (
              <button onClick={() => updateStatus("rejected", { rejection_reason: "Manual reject" })} disabled={saving}
                className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-[13px] rounded-xl hover:border-red-200 hover:text-red-500 transition-colors disabled:opacity-50 whitespace-nowrap">
                {t("action.reject")}
              </button>
            )}
            {c.pipeline_status === "final_passed" && (
              <a href={`/admin/profiles/${c.id}`}
                className="px-4 py-2.5 bg-[#1D9E75] text-white text-[13px] rounded-xl hover:bg-[#178A64] transition-colors whitespace-nowrap">
                프로필 카드
              </a>
            )}
            <div className="flex items-center gap-2 ml-auto">
              {c.cv_url && (
                <a href={c.cv_url} target="_blank" rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 text-[13px] rounded-xl hover:bg-gray-200 transition-colors whitespace-nowrap">
                  {t("detail.viewCV")}
                </a>
              )}
              {c.portfolio_url && (
                <a href={c.portfolio_url} target="_blank" rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 text-[13px] rounded-xl hover:bg-gray-200 transition-colors whitespace-nowrap">
                  {t("detail.portfolio")}
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* 스크리닝 결과 — 판단에 제일 중요하니 최상단 */}
          {summary && (
            <div>
              <p className="text-[11px] text-gray-500 mb-3">{t("detail.screeningResult")}</p>
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-[22px] font-medium ${c.llm_score && c.llm_score >= 70 ? "text-[#1D9E75]" : "text-[#E8590C]"}`}>
                      {c.llm_score}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] ${summary.verdict === "PASS" ? "bg-[#1D9E75]/10 text-[#1D9E75]" : "bg-[#E8590C]/10 text-[#E8590C]"}`}>
                      {summary.verdict}
                    </span>
                  </div>
                  {summary.company && <span className="text-[11px] text-gray-500">{summary.company}</span>}
                </div>

                {getSummaryText() && <p className="text-[12px] text-gray-700">{getSummaryText()}</p>}

                {summary.top_skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {summary.top_skills.map((s: string) => (
                      <span key={s} className="text-[11px] bg-white px-2 py-0.5 rounded-full text-gray-700">{s}</span>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {getStrengths().length > 0 && (
                    <div>
                      <p className="text-[11px] text-gray-500 mb-1">{t("detail.strengths")}</p>
                      {getStrengths().map((s: string, i: number) => (
                        <p key={i} className="text-[12px] text-[#1D9E75]">• {s}</p>
                      ))}
                    </div>
                  )}
                  {getGaps().length > 0 && (
                    <div>
                      <p className="text-[11px] text-gray-500 mb-1">{t("detail.gaps")}</p>
                      {getGaps().map((g: string, i: number) => (
                        <p key={i} className="text-[12px] text-[#E8590C]">• {g}</p>
                      ))}
                    </div>
                  )}
                </div>

                {summary.yoe_check && (
                  <div>
                    <p className="text-[11px] text-gray-500 mb-1">{t("detail.yoeCheck")}</p>
                    <p className="text-[12px] text-gray-700">{summary.yoe_check}</p>
                  </div>
                )}

                {summary.career_history?.length > 0 && (
                  <div>
                    <p className="text-[11px] text-gray-500 mb-1">{t("detail.career")}</p>
                    {summary.career_history.map((ch: { company: string; position: string; period: string }, i: number) => (
                      <p key={i} className="text-[12px] text-gray-700">• {ch.company} — {ch.position} ({ch.period})</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {c.pipeline_status === "rejected" && c.rejection_reason && (
            <div>
              <p className="text-[11px] text-gray-500 mb-2">{t("detail.rejectionReason")}</p>
              <p className="text-[13px] text-gray-700 bg-red-50 px-3.5 py-2.5 rounded-xl">{c.rejection_reason}</p>
            </div>
          )}

          {/* 기본 정보 + 지원 정보 2열 */}
          <div className="grid grid-cols-2 gap-5">
            <div>
              <p className="text-[11px] text-gray-500 mb-3">{t("detail.basicInfo")}</p>
              <div className="space-y-2">
                {c.position && <InfoRow label={t("detail.position")} value={c.position} />}
                {c.yoe && <InfoRow label={t("detail.experience")} value={`${c.yoe}yr`} />}
                {c.city && <InfoRow label={t("detail.city")} value={c.city} />}
                {c.email && <InfoRow label={t("detail.email")} value={c.email} />}
                {c.phone && <InfoRow label={t("detail.phone")} value={c.phone} />}
              </div>
            </div>
            <div>
              <p className="text-[11px] text-gray-500 mb-3">{t("detail.applicationInfo")}</p>
              <div className="space-y-2">
                <InfoRow label={t("detail.source")} value={c.source} />
                {c.applied_job && <InfoRow label={t("detail.appliedJob")} value={c.applied_job} />}
                {c.applied_company && <InfoRow label={t("detail.appliedCompany")} value={c.applied_company} />}
                {c.applied_date && <InfoRow label={t("detail.appliedDate")} value={c.applied_date} />}
              </div>
            </div>
          </div>

          <div>
            <p className="text-[11px] text-gray-500 mb-2">{t("bulk.assignJD")}</p>
            <JDDropdown value={currentJobCode} onChange={assignJD} disabled={assigningJD} jdMap={jdMap} />
          </div>

          {/* 멀티 지원: 다른 JD로 복제 스크리닝 */}
          <div>
            <p className="text-[11px] text-gray-500 mb-2">{t("detail.cloneScreen")}</p>
            <div className="flex gap-2 items-center">
              <div className="flex-1 min-w-0">
                <JDDropdown value={cloneJD} onChange={setCloneJD} disabled={cloning} jdMap={jdMap} />
              </div>
              <button onClick={cloneAndScreen} disabled={!cloneJD || cloneJD === currentJobCode || cloning}
                className="px-4 py-2.5 bg-gray-900 text-white text-[13px] rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40 whitespace-nowrap flex-shrink-0">
                {cloning ? "..." : t("detail.cloneScreenRun")}
              </button>
            </div>
            {cloneResult && <p className="text-[12px] text-gray-600 mt-2">{cloneResult}</p>}
          </div>

          {/* 메모 */}
          <div>
            <p className="text-[11px] text-gray-500 mb-2">{t("detail.memo")}</p>
            <textarea value={memo} onChange={(e) => setMemo(e.target.value)} onBlur={saveMemo}
              placeholder={t("detail.memoPlaceholder")}
              className="w-full h-20 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:border-gray-300" />
          </div>

          {/* CV 링크 관리 */}
          <div>
            <p className="text-[11px] text-gray-500 mb-2">CV</p>
            {editingCV ? (
              <div className="space-y-2">
                <input
                  type="url"
                  value={cvDraft}
                  onChange={(e) => setCvDraft(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-300"
                />
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      setSavingCV(true);
                      const newUrl = cvDraft.trim() || null;
                      await fetch(`/api/admin/candidates/${c.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ cv_url: newUrl }),
                      });
                      setC((prev) => ({ ...prev, cv_url: newUrl } as Candidate));
                      setSavingCV(false);
                      setEditingCV(false);
                    }}
                    disabled={savingCV}
                    className="flex-1 py-2 bg-[#3182F6] text-white text-[13px] rounded-xl hover:bg-[#2272EB] transition-colors disabled:opacity-50"
                  >
                    {savingCV ? "..." : t("common.save")}
                  </button>
                  <button
                    onClick={() => { setCvDraft(c.cv_url || ""); setEditingCV(false); }}
                    className="flex-1 py-2 bg-white border border-gray-200 text-gray-700 text-[13px] rounded-xl hover:border-gray-300 transition-colors"
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { setCvDraft(c.cv_url || ""); setEditingCV(true); }}
                className="text-[13px] text-[#3182F6] hover:underline"
              >
                {c.cv_url ? t("common.edit") : `+ ${lang === "ko" ? "CV 링크 추가" : lang === "vi" ? "Thêm CV" : "Add CV link"}`}
              </button>
            )}
          </div>

          {/* 고급: 수동 단계 변경 + 삭제 */}
          <div className="pt-3 border-t border-gray-100">
            <button onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-[12px] text-gray-500 hover:text-gray-700 transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className={`transition-transform ${showAdvanced ? "rotate-90" : ""}`}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
              {t("bulk.manualStageChange")}
            </button>
            {showAdvanced && (
              <div className="section-expand-in mt-3 space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {STAGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => updateStatus(opt.value)}
                      disabled={saving || c.pipeline_status === opt.value}
                      className={`px-2.5 py-1.5 rounded-lg text-[12px] transition-colors disabled:opacity-40 ${
                        c.pipeline_status === opt.value
                          ? "bg-gray-900 text-white"
                          : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {t(opt.labelKey)}
                    </button>
                  ))}
                </div>
                <button
                  onClick={deleteCandidate}
                  disabled={deleting}
                  className="w-full py-2.5 text-[13px] text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                >
                  {deleting ? t("bulk.deleting") : t("bulk.deleteCandidate")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function JDDropdown({ value, onChange, disabled, jdMap }: { value: string; onChange: (v: string) => void; disabled: boolean; jdMap: Record<string, JobDescription> }) {
  const { t } = useAdminI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const jd = value ? jdMap[value] : null;
  const label = jd ? `${value} — ${jd.company} · ${jd.position}` : t("bulk.unassigned");

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] text-gray-900 transition-colors disabled:opacity-50 ${
          !disabled ? "hover:border-gray-300" : ""
        }`}
      >
        <span className="truncate">{label}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B7684" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={`flex-shrink-0 ml-2 transition-transform ${open ? "rotate-180" : ""}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 max-h-[240px] overflow-y-auto bg-white border border-gray-200/80 rounded-xl py-1 z-50"
          style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
          <button
            onClick={() => { onChange(""); setOpen(false); }}
            className={`w-full text-left px-3.5 py-2 text-[13px] transition-colors ${
              !value ? "text-[#3182F6] bg-[#E8F3FF]/50" : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            {t("bulk.unassigned")}
          </button>
          {Object.entries(jdMap).map(([code, j]) => (
            <button
              key={code}
              onClick={() => { onChange(code); setOpen(false); }}
              className={`w-full text-left px-3.5 py-2 text-[13px] transition-colors ${
                code === value ? "text-[#3182F6] bg-[#E8F3FF]/50" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {code} — {j.company} · {j.position}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-[12px] text-gray-500 w-[72px] flex-shrink-0 pt-px">{label}</span>
      <span className="text-[13px] text-gray-900 break-all">{value}</span>
    </div>
  );
}
