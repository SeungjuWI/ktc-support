"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { updateTalentVerification } from "@/lib/create-talent-card";
import { useAdminI18n } from "@/lib/admin-i18n";
import { JD_MAP } from "@/lib/jd-data";
import { getUserProfile } from "@/lib/supabase-auth";

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
  interview_session_id: string | null;
  rejection_reason: string | null;
  llm_score: number | null;
  llm_summary: string | null;
  talent_id: string | null;
  created_at: string;
}

const PIPELINE_STEPS = [
  { key: "pending", labelKey: "candidates.tab.pending", statuses: ["new"], color: "#8B95A1" },
  { key: "ai_passed", labelKey: "candidates.tab.aiPassed", statuses: ["passed"], color: "#3182F6" },
  { key: "ai_interview_sent", labelKey: "candidates.tab.aiInterviewSent", statuses: ["ai_interview_sent"], color: "#E8590C" },
  { key: "ai_interview_done", labelKey: "candidates.tab.aiInterviewDone", statuses: ["ai_interview_done"], color: "#6B7684" },
  { key: "final_passed", labelKey: "candidates.tab.finalPassed", statuses: ["final_passed"], color: "#1D9E75" },
] as const;

const EXIT_STEPS = [
  { key: "screening_failed", labelKey: "candidates.tab.screeningFailed", statuses: ["screening_failed"], color: "#B0B8C1" },
  { key: "rejected", labelKey: "candidates.tab.rejected", statuses: ["rejected"], color: "#B0B8C1" },
] as const;

const ALL_STEPS = [...PIPELINE_STEPS, ...EXIT_STEPS];

const STATUS_COLORS: Record<string, string> = {
  new: "#8B95A1",
  passed: "#3182F6",
  ai_interview_sent: "#E8590C",
  ai_interview_done: "#6B7684",
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
  const [sendingAll, setSendingAll] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) getUserProfile(session.user.id).then((p) => { if (p?.role === "super_admin") setIsSuperAdmin(true); });
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

  const sendAllInterviews = async (deadline: string) => {
    const targets = filtered.filter((c) => c.email);
    if (targets.length === 0) return;

    setSendingAll(true);
    setShowSendModal(false);
    setResult(null);
    try {
      const res = await fetch("/api/admin/send-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateIds: targets.map((c) => c.id), deadline }),
      });
      const json = await res.json();
      const msg = `AI 인터뷰 발송 완료\n\n성공: ${json.sent}명\n실패: ${json.failed}명\n전체: ${json.total}명`;
      setResult(msg.replace(/\n/g, " · "));
      alert(msg);
      fetchCandidates();
    } catch {
      setResult("AI 인터뷰 발송 실패");
      alert("AI 인터뷰 발송 실패");
    }
    setSendingAll(false);
  };

  const tabGroup = ALL_STEPS.find((tab) => tab.key === activeTab)!;
  const sources = Array.from(new Set(candidates.map((c) => c.source)));
  // applied_job에서 JD_MAP을 통해 회사/포지션 추출
  const companyOptions = Array.from(new Set(
    candidates.map((c) => {
      const code = c.applied_job?.match(/^([A-Z]+\d+)/)?.[1];
      return code && JD_MAP[code] ? JD_MAP[code].company : null;
    }).filter(Boolean)
  )) as string[];
  const positionOptions = Array.from(new Set(
    candidates.map((c) => {
      const code = c.applied_job?.match(/^([A-Z]+\d+)/)?.[1];
      return code && JD_MAP[code] ? JD_MAP[code].position : null;
    }).filter(Boolean)
  )) as string[];

  const getCompany = (c: Candidate) => {
    const code = c.applied_job?.match(/^([A-Z]+\d+)/)?.[1];
    return code && JD_MAP[code] ? JD_MAP[code].company : null;
  };
  const getPosition = (c: Candidate) => {
    const code = c.applied_job?.match(/^([A-Z]+\d+)/)?.[1];
    return code && JD_MAP[code] ? JD_MAP[code].position : null;
  };

  // 필터(소스/회사/포지션) 적용된 베이스 — 탭/검색 제외
  const filteredBase = candidates
    .filter((c) => sourceFilter === "all" || c.source === sourceFilter)
    .filter((c) => companyFilter === "all" || getCompany(c) === companyFilter)
    .filter((c) => positionFilter === "all" || getPosition(c) === positionFilter);

  const counts = {
    pending: filteredBase.filter((c) => c.pipeline_status === "new").length,
    ai_passed: filteredBase.filter((c) => c.pipeline_status === "passed").length,
    ai_interview_sent: filteredBase.filter((c) => c.pipeline_status === "ai_interview_sent").length,
    ai_interview_done: filteredBase.filter((c) => c.pipeline_status === "ai_interview_done").length,
    final_passed: filteredBase.filter((c) => c.pipeline_status === "final_passed").length,
    screening_failed: filteredBase.filter((c) => c.pipeline_status === "screening_failed").length,
    rejected: filteredBase.filter((c) => c.pipeline_status === "rejected").length,
  };

  const filtered = filteredBase
    .filter((c) => tabGroup.statuses.includes(c.pipeline_status as never))
    .filter((c) => !search || c.full_name.toLowerCase().includes(search.toLowerCase()));


  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-[14px] text-gray-500">{t("common.loading")}</p></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[22px] font-medium text-gray-900">{t("candidates.title")}</h1>
        {isSuperAdmin && (
          <div className="flex gap-2">
            <button onClick={async () => {
                if (!confirm("중복 후보자를 정리합니다. 진행하시겠습니까?")) return;
                setBusy(true); setMessage("중복 정리 중...");
                const res = await fetch("/api/admin/dedup-candidates", { method: "POST" });
                const json = await res.json();
                setResult(`중복 그룹 ${json.duplicateGroups}개, ${json.deleted}명 삭제`);
                setBusy(false); fetchCandidates();
              }} disabled={busy}
              className="px-4 py-2 bg-gray-600 text-white text-[13px] rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-50">
              중복 정리
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
        <div className="flex items-center">
          {PIPELINE_STEPS.map((step, i) => {
            const isActive = activeTab === step.key;
            const count = counts[step.key as keyof typeof counts];
            return (
              <React.Fragment key={step.key}>
                <button
                  onClick={() => setActiveTab(step.key)}
                  className={`flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl transition-colors flex-1 min-w-0 ${
                    isActive ? "" : "hover:bg-gray-50/50"
                  }`}
                  style={isActive ? { backgroundColor: step.color + "0C" } : undefined}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[15px] font-medium text-white"
                    style={{ backgroundColor: isActive ? step.color : step.color + "60" }}
                  >
                    {count}
                  </div>
                  <span
                    className={`text-[11px] leading-tight text-center truncate w-full ${isActive ? "font-medium" : ""}`}
                    style={{ color: isActive ? step.color : "#6B7684" }}
                  >
                    {t(step.labelKey)}
                  </span>
                </button>
                {i < PIPELINE_STEPS.length - 1 && (
                  <div className="flex-shrink-0 text-gray-200">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                )}
              </React.Fragment>
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

      {isSuperAdmin && activeTab === "ai_passed" && filtered.length > 0 && (
        <div className="mb-3 flex items-center justify-between bg-blue-50 border border-blue-500/20 rounded-xl px-4 py-3">
          <span className="text-[13px] text-blue-600">
            {filtered.filter((c) => c.email).length}명에게 AI 인터뷰 코드를 일괄 발송할 수 있습니다
          </span>
          <button onClick={() => setShowSendModal(true)} disabled={sendingAll || busy}
            className="px-4 py-2 bg-[#3182F6] text-white text-[13px] rounded-xl hover:bg-[#2272EB] transition-colors disabled:opacity-50">
            {sendingAll ? "발송 중..." : `전체 발송 (${filtered.filter((c) => c.email).length}명)`}
          </button>
        </div>
      )}

      {showSendModal && (() => {
        const targets = filtered.filter((c) => c.email);
        const sample = targets[0];
        return (
          <SendInterviewModal
            count={targets.length}
            sampleName={sample?.full_name || ""}
            sampleCompany={sample?.applied_company || sample?.applied_job || "the position"}
            onConfirm={sendAllInterviews}
            onClose={() => setShowSendModal(false)}
          />
        );
      })()}

      <div className="bg-white rounded-2xl border border-gray-200/60 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-[14px] text-gray-500">
            {candidates.length === 0 ? t("candidates.noData") : t("candidates.noMatch")}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((c) => (
              <div key={c.id} onClick={() => setSelectedCandidate(c)}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 cursor-pointer transition-colors">
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
                <div className="flex flex-col items-end flex-shrink-0">
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

      {selectedCandidate && (
        <CandidateDetailModal candidate={selectedCandidate} onClose={() => { setSelectedCandidate(null); fetchCandidates(); }} />
      )}
    </div>
  );
}

const STAGE_OPTIONS = [
  { value: "new", label: "스크리닝 대기" },
  { value: "passed", label: "스크리닝 합격" },
  { value: "ai_interview_sent", label: "AI 인터뷰 발송" },
  { value: "ai_interview_done", label: "AI 인터뷰 완료" },
  { value: "final_passed", label: "최종 합격" },
  { value: "screening_failed", label: "스크리닝 실패" },
  { value: "rejected", label: "불합격" },
];

function CandidateDetailModal({ candidate: initCandidate, onClose }: { candidate: Candidate; onClose: () => void }) {
  const { t, lang } = useAdminI18n();
  const [c, setC] = useState(initCandidate);
  const [memo, setMemo] = useState(c.phone_interview_note || "");
  const [saving, setSaving] = useState(false);
  const [sendingInterview, setSendingInterview] = useState(false);
  const [interviewSession, setInterviewSession] = useState<{ id: string; access_code: string; status: string; total_score: number | null } | null>(null);
  const [loadingSession, setLoadingSession] = useState(false);
  const [assigningJD, setAssigningJD] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const summary = c.llm_summary ? JSON.parse(c.llm_summary) : null;
  const currentJobCode = c.applied_job?.match(/^([A-Z]+\d+)/)?.[1] || "";

  // 언어별 데이터 선택
  const getSummaryText = () => lang === "ko" ? (summary?.summary_ko || summary?.summary_en || summary?.summary || "") : (summary?.summary_en || summary?.summary || "");
  const getStrengths = () => lang === "ko" ? (summary?.strengths_ko || summary?.strengths_en || summary?.strengths || []) : (summary?.strengths_en || summary?.strengths || []);
  const getGaps = () => lang === "ko" ? (summary?.gaps_ko || summary?.gaps_en || summary?.gaps || []) : (summary?.gaps_en || summary?.gaps || []);

  const updateStatus = async (newStatus: string, extra?: Record<string, unknown>) => {
    setSaving(true);
    await supabase.from("candidates").update({ pipeline_status: newStatus, ...extra, updated_at: new Date().toISOString() }).eq("id", c.id);
    await updateTalentVerification(supabase, c.id, newStatus);
    setC((prev) => ({ ...prev, pipeline_status: newStatus, ...extra } as Candidate));
    setSaving(false);
  };

  const saveMemo = async () => {
    await supabase.from("candidates").update({ phone_interview_note: memo, updated_at: new Date().toISOString() }).eq("id", c.id);
  };

  const assignJD = async (code: string) => {
    setAssigningJD(true);
    const jd = JD_MAP[code];
    const newAppliedJob = code ? `${code} - ${jd?.position || ""}` : "";
    await supabase.from("candidates").update({
      applied_job: newAppliedJob || null,
      updated_at: new Date().toISOString(),
    }).eq("id", c.id);
    setC((prev) => ({ ...prev, applied_job: newAppliedJob || null } as Candidate));
    setAssigningJD(false);
  };

  const deleteCandidate = async () => {
    if (!confirm(`${c.full_name}을(를) 삭제하시겠습니까? 연결된 인재 카드와 인터뷰 세션도 함께 삭제됩니다.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/candidates/${c.id}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok) {
        onClose();
      } else {
        alert(`삭제 실패: ${json.error || "알 수 없는 오류"}`);
      }
    } catch (e) {
      alert(`삭제 실패: ${e}`);
    }
    setDeleting(false);
  };

  const changeStage = async (newStatus: string) => {
    await updateStatus(newStatus);
  };

  // AI 인터뷰 세션 조회
  useEffect(() => {
    if (["ai_interview_sent", "ai_interview_done", "final_passed"].includes(c.pipeline_status)) {
      setLoadingSession(true);
      fetch(`/api/admin/interviews?candidateId=${c.id}`)
        .then((r) => r.json())
        .then((json) => {
          const session = json.sessions?.find((s: { candidate_id: string }) => s.candidate_id === c.id);
          if (session) setInterviewSession(session);
        })
        .finally(() => setLoadingSession(false));
    }
  }, [c.id, c.pipeline_status]);

  const sendAiInterview = async () => {
    if (!c.email) return;
    setSendingInterview(true);
    try {
      const res = await fetch("/api/admin/send-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateIds: [c.id] }),
      });
      const json = await res.json();
      const r = json.results?.[0];
      if (json.success && r?.sent) {
        setC((prev) => ({ ...prev, pipeline_status: "ai_interview_sent" } as Candidate));
        alert(`발송 완료: ${r.code}`);
      } else {
        alert(`발송 실패: ${r?.error || "Unknown error"}`);
      }
    } catch {
      alert("발송 실패: 네트워크 오류");
    } finally {
      setSendingInterview(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-[480px] h-full bg-white overflow-y-auto scrollbar-hide">
        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[16px] font-medium text-gray-900">{c.full_name}</h2>
              <StatusBadge status={c.pipeline_status} score={c.llm_score} t={t} />
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7684" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
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

          <div>
            <p className="text-[11px] text-gray-500 mb-3">JD 배정</p>
            <JDDropdown value={currentJobCode} onChange={assignJD} disabled={assigningJD} />
          </div>

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

                {summary.yoe_check && (
                  <div>
                    <p className="text-[11px] text-gray-500 mb-1">{t("detail.yoeCheck")}</p>
                    <p className="text-[12px] text-gray-700">{summary.yoe_check}</p>
                  </div>
                )}

                {getSummaryText() && (
                  <div>
                    <p className="text-[11px] text-gray-500 mb-1">{t("detail.summary")}</p>
                    <p className="text-[12px] text-gray-700">{getSummaryText()}</p>
                  </div>
                )}

                {summary.top_skills?.length > 0 && (
                  <div>
                    <p className="text-[11px] text-gray-500 mb-1">{t("detail.skills")}</p>
                    <div className="flex flex-wrap gap-1">
                      {summary.top_skills.map((s: string) => (
                        <span key={s} className="text-[11px] bg-white px-2 py-0.5 rounded-full text-gray-700">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

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

          <div className="flex gap-2">
            {c.cv_url && (
              <a href={c.cv_url} target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-100 rounded-xl text-[13px] text-gray-700 hover:bg-gray-200 transition-colors">
                {t("detail.viewCV")}
              </a>
            )}
            {c.portfolio_url && (
              <a href={c.portfolio_url} target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-100 rounded-xl text-[13px] text-gray-700 hover:bg-gray-200 transition-colors">
                {t("detail.portfolio")}
              </a>
            )}
          </div>

          {["ai_interview_sent", "ai_interview_done", "final_passed"].includes(c.pipeline_status) && (
            <>
              {/* AI 인터뷰 상태 */}
              <div>
                <p className="text-[11px] text-gray-500 mb-2">{t("aiInterview.status")}</p>
                {loadingSession ? (
                  <p className="text-[13px] text-gray-400">Loading...</p>
                ) : interviewSession ? (
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-gray-500">Code</span>
                      <span className="text-[13px] font-mono text-gray-700">{interviewSession.access_code}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-gray-500">Status</span>
                      <span className={`text-[12px] px-2 py-0.5 rounded-full ${
                        interviewSession.status === "scored" ? "bg-[#1D9E75]/10 text-[#1D9E75]" :
                        interviewSession.status === "completed" ? "bg-blue-50 text-blue-500" :
                        interviewSession.status === "in_progress" ? "bg-[#FFF8F0] text-[#E8590C]" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {t(`aiInterview.${interviewSession.status === "pending" ? "notStarted" : interviewSession.status === "in_progress" ? "inProgress" : interviewSession.status === "completed" ? "completed" : "scored"}`)}
                      </span>
                    </div>
                    {interviewSession.total_score !== null && (
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] text-gray-500">Score</span>
                        <span className="text-[14px] font-medium text-gray-900">{interviewSession.total_score}/70 ({Math.round(interviewSession.total_score / 70 * 100)}%)</span>
                      </div>
                    )}
                    {["scored", "completed"].includes(interviewSession.status) && (
                      <a href={`/admin/interviews/${interviewSession.id}`} target="_blank" rel="noopener noreferrer"
                        className="block text-center py-2 bg-blue-50 text-blue-500 rounded-lg text-[13px] hover:bg-blue-100 transition-colors mt-2">
                        {t("aiInterview.viewResult")}
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-[13px] text-gray-400">{t("aiInterview.notStarted")}</p>
                )}
              </div>

              {/* 메모 */}
              <div>
                <p className="text-[11px] text-gray-500 mb-2">{t("aiInterview.memo")}</p>
                <textarea value={memo} onChange={(e) => setMemo(e.target.value)} onBlur={saveMemo}
                  placeholder={t("aiInterview.memoPlaceholder")}
                  className="w-full h-24 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:border-gray-300" />
              </div>
            </>
          )}

          {/* 주요 액션 */}
          <div className="space-y-3 pt-2">
            {c.pipeline_status === "passed" && (
              <div className="space-y-2">
                <button onClick={sendAiInterview}
                  disabled={sendingInterview || !c.email}
                  className="w-full py-3 bg-[#3182F6] text-white text-[14px] rounded-xl hover:bg-[#2272EB] transition-colors disabled:opacity-50">
                  {sendingInterview ? t("aiInterview.sending") : t("aiInterview.send")}
                </button>
                {!c.email && <p className="text-[12px] text-red-500 text-center">Email not available</p>}
              </div>
            )}

            {c.pipeline_status === "ai_interview_done" && (
              <div className="flex gap-2">
                <button onClick={() => updateStatus("final_passed")} disabled={saving}
                  className="flex-1 py-3 bg-[#3182F6] text-white text-[14px] rounded-xl hover:bg-[#2272EB] transition-colors disabled:opacity-50">
                  {t("aiInterview.finalPass")}
                </button>
                <button onClick={() => updateStatus("rejected", { rejection_reason: "AI interview rejected" })} disabled={saving}
                  className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 text-[14px] rounded-xl hover:border-gray-300 transition-colors disabled:opacity-50">
                  {t("aiInterview.reject")}
                </button>
              </div>
            )}
          </div>

          {/* 단계 변경 + 삭제 */}
          <div className="pt-4 mt-2 border-t border-gray-100 space-y-3">
            <div>
              <p className="text-[11px] text-gray-500 mb-2">단계 수동 변경</p>
              <div className="flex flex-wrap gap-1.5">
                {STAGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => changeStage(opt.value)}
                    disabled={saving || c.pipeline_status === opt.value}
                    className={`px-2.5 py-1.5 rounded-lg text-[12px] transition-colors disabled:opacity-40 ${
                      c.pipeline_status === opt.value
                        ? "bg-gray-900 text-white"
                        : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={deleteCandidate}
              disabled={deleting}
              className="w-full py-2.5 text-[13px] text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
            >
              {deleting ? "삭제 중..." : "후보자 삭제"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SendInterviewModal({ count, sampleName, sampleCompany, onConfirm, onClose }: {
  count: number;
  sampleName: string;
  sampleCompany: string;
  onConfirm: (deadline: string) => void;
  onClose: () => void;
}) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().split("T")[0];
  const [date, setDate] = useState(defaultDate);
  const [hour, setHour] = useState("23");
  const [minute, setMinute] = useState("59");
  const [showPreview, setShowPreview] = useState(false);

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutes = ["00", "15", "30", "45", "59"];

  const getDeadlineEn = () => {
    if (!date) return "";
    const [y, m, d] = date.split("-");
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    return `${months[Number(m) - 1]} ${Number(d)}, ${y} at ${hour}:${minute}`;
  };

  const getDeadlineKo = () => {
    if (!date) return "";
    const [y, m, d] = date.split("-");
    return `${y}년 ${Number(m)}월 ${Number(d)}일 ${hour}:${minute} (베트남 시간, GMT+7)`;
  };

  const getDeadlineISO = () => {
    if (!date) return "";
    // 베트남 시간(GMT+7) 기준 ISO 문자열 생성
    return `${date}T${hour}:${minute}:00+07:00`;
  };

  const handleConfirm = () => {
    onConfirm(getDeadlineISO());
  };

  const sampleCode = "KTC-A2B3C4";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-[560px] mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 px-6 py-5 border-b border-gray-100 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[16px] font-medium text-gray-900">AI 인터뷰 전체 발송</h3>
              <p className="text-[13px] text-gray-500 mt-1">{count}명에게 발송합니다</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7684" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-[12px] text-gray-500 mb-2 block">마감 날짜</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] text-gray-900 focus:outline-none focus:border-gray-300"
            />
          </div>

          <div>
            <label className="text-[12px] text-gray-500 mb-2 block">마감 시간 (베트남 시간, GMT+7)</label>
            <div className="flex gap-2 items-center">
              <Dropdown
                value={hour}
                onChange={setHour}
                placeholder="시"
                options={hours.map((h) => ({ value: h, label: `${h}시` }))}
              />
              <span className="text-gray-400">:</span>
              <Dropdown
                value={minute}
                onChange={setMinute}
                placeholder="분"
                options={minutes.map((m) => ({ value: m, label: `${m}분` }))}
              />
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl px-3.5 py-3">
            <p className="text-[11px] text-gray-500 mb-1">이메일에 표시될 마감</p>
            <p className="text-[13px] text-gray-900">{getDeadlineKo()}</p>
          </div>

          <button
            onClick={() => setShowPreview(!showPreview)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] text-gray-700 hover:border-gray-300 transition-colors"
          >
            <span>이메일 미리보기 (첫 번째 후보자 기준)</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform ${showPreview ? "rotate-180" : ""}`}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {showPreview && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 space-y-1">
                <div className="flex gap-2 text-[12px]">
                  <span className="text-gray-500 w-[40px]">To:</span>
                  <span className="text-gray-900">(각 후보자 이메일)</span>
                </div>
                <div className="flex gap-2 text-[12px]">
                  <span className="text-gray-500 w-[40px]">제목:</span>
                  <span className="text-gray-900">[{sampleCompany}] Congratulations on passing the screening — AI Interview link</span>
                </div>
              </div>
              <div className="bg-white p-4">
                <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", maxWidth: 520, margin: "0 auto" }}>
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 6, background: "#E8F3FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: "#3182F6", fontSize: 14, fontWeight: 500 }}>V</span>
                    </div>
                  </div>

                  <p style={{ fontSize: 14, color: "#191F28", lineHeight: 1.8, margin: "0 0 16px" }}>
                    Dear <strong>{sampleName}</strong>,
                  </p>

                  <p style={{ fontSize: 14, color: "#191F28", lineHeight: 1.8, margin: "0 0 8px" }}>
                    This is <strong>VTM</strong>, the recruitment agency for <strong>{sampleCompany}</strong>. Congratulations on passing the document screening!
                  </p>

                  <p style={{ fontSize: 14, color: "#4E5968", lineHeight: 1.8, margin: "0 0 8px" }}>
                    The next step is an <strong>AI voice interview</strong>.
                  </p>

                  <p style={{ fontSize: 14, color: "#4E5968", lineHeight: 1.8, margin: "0 0 8px" }}>
                    This interview method was introduced to evaluate your skills more fairly. You can complete it at any time that suits you — it only takes about <strong>15 minutes</strong>, regardless of the interviewer&apos;s schedule.
                  </p>

                  <p style={{ fontSize: 14, color: "#4E5968", lineHeight: 1.8, margin: "0 0 20px" }}>
                    No additional software is required — simply click the link below to get started. If you pass this round, we will contact you separately to arrange a final interview with the company.
                  </p>

                  <div style={{ textAlign: "center" as const, marginBottom: 14 }}>
                    <span style={{ display: "inline-block", background: "#3182F6", color: "white", padding: "12px 32px", borderRadius: 10, fontSize: 14, fontWeight: 500 }}>
                      Start Interview
                    </span>
                  </div>

                  <div style={{ background: "#F9FAFB", borderRadius: 12, padding: 16, marginBottom: 16, textAlign: "center" as const }}>
                    <p style={{ fontSize: 12, color: "#8B95A1", margin: "0 0 6px" }}>Access Code</p>
                    <p style={{ fontSize: 22, fontWeight: 600, color: "#191F28", margin: 0, letterSpacing: 2, fontFamily: "monospace" }}>{sampleCode}</p>
                  </div>

                  <div style={{ background: "#F9FAFB", borderRadius: 12, padding: 14, marginBottom: 16 }}>
                    <p style={{ fontSize: 12, color: "#191F28", fontWeight: 500, margin: "0 0 4px" }}>Deadline</p>
                    <p style={{ fontSize: 14, color: "#E8590C", fontWeight: 500, margin: "0 0 6px" }}>
                      {getDeadlineEn()} (Vietnam time, GMT+7)
                    </p>
                    <p style={{ fontSize: 12, color: "#8B95A1", margin: 0 }}>
                      If not completed by the deadline, the application will be automatically closed.
                    </p>
                  </div>

                  <div style={{ background: "#FFF8F0", borderRadius: 12, padding: 14, marginBottom: 16 }}>
                    <p style={{ fontSize: 12, color: "#E8590C", fontWeight: 500, margin: "0 0 6px" }}>Before you begin, please note:</p>
                    <ul style={{ fontSize: 12, color: "#6B7684", lineHeight: 1.8, margin: 0, paddingLeft: 18 }}>
                      <li>You may only attempt the interview <strong>once</strong> — retakes are not available</li>
                      <li>Please use a <strong>stable Wi-Fi or internet connection</strong></li>
                      <li>Closing or refreshing the browser during the interview will <strong>end your session</strong></li>
                      <li>Please <strong>read all on-screen instructions</strong> carefully before starting</li>
                    </ul>
                  </div>

                  <p style={{ fontSize: 14, color: "#4E5968", lineHeight: 1.8, margin: "0 0 8px" }}>
                    If you have any questions, please click the button below to contact us.
                  </p>
                  <div style={{ textAlign: "center", marginBottom: 16 }}>
                    <span style={{ display: "inline-block", background: "#F2F4F6", color: "#4E5968", padding: "8px 20px", borderRadius: 10, fontSize: 13 }}>
                      Contact Us / Liên hệ
                    </span>
                  </div>
                  <p style={{ fontSize: 14, color: "#4E5968", lineHeight: 1.8, margin: "0 0 24px" }}>
                    Best of luck!
                  </p>
                  <p style={{ fontSize: 14, color: "#191F28", lineHeight: 1.8, margin: "0 0 24px" }}>
                    <strong>Sean</strong><br/>VTM Recruitment Team
                  </p>

                  <div style={{ borderTop: "1px solid #E5E8EB", paddingTop: 16 }}>
                    <p style={{ fontSize: 11, color: "#B0B8C1", lineHeight: 1.6, margin: 0 }}>
                      VTM Recruitment · Likelion
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-100 flex gap-2 rounded-b-2xl">
          <button onClick={onClose}
            className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 text-[13px] rounded-xl hover:border-gray-300 transition-colors">
            취소
          </button>
          <button onClick={handleConfirm}
            className="flex-1 py-2.5 bg-[#3182F6] text-white text-[13px] rounded-xl hover:bg-[#2272EB] transition-colors">
            발송하기 ({count}명)
          </button>
        </div>
      </div>
    </div>
  );
}

function JDDropdown({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const jd = value ? JD_MAP[value] : null;
  const label = jd ? `${value} — ${jd.company} · ${jd.position}` : "미배정";

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
            미배정
          </button>
          {Object.entries(JD_MAP).map(([code, j]) => (
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
