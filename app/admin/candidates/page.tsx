"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { updateTalentVerification } from "@/lib/create-talent-card";
import { useAdminI18n } from "@/lib/admin-i18n";

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

const TAB_KEYS = [
  { key: "pending", labelKey: "candidates.tab.pending", statuses: ["new"] },
  { key: "ai_passed", labelKey: "candidates.tab.aiPassed", statuses: ["passed"] },
  { key: "phone_pending", labelKey: "candidates.tab.phonePending", statuses: ["phone_interview_pending"] },
  { key: "phone_done", labelKey: "candidates.tab.phoneDone", statuses: ["phone_interview_done"] },
  { key: "final_passed", labelKey: "candidates.tab.finalPassed", statuses: ["final_passed"] },
  { key: "rejected", labelKey: "candidates.tab.rejected", statuses: ["rejected", "screening_failed"] },
] as const;

const STATUS_COLORS: Record<string, string> = {
  new: "#8B95A1",
  passed: "#3182F6",
  phone_interview_pending: "#E8590C",
  phone_interview_done: "#6B7684",
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
  const [jobFilter, setJobFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const fetchCandidates = useCallback(async () => {
    const { data } = await supabase.from("candidates").select("*").order("created_at", { ascending: false });
    if (data) setCandidates(data);
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

  const tabGroup = TAB_KEYS.find((tab) => tab.key === activeTab)!;
  const sources = Array.from(new Set(candidates.map((c) => c.source)));
  const jobCodes = Array.from(new Set(candidates.map((c) => c.applied_job?.match(/^([A-Z]+\d+)/)?.[1]).filter(Boolean))) as string[];
  const filtered = candidates
    .filter((c) => tabGroup.statuses.includes(c.pipeline_status as never))
    .filter((c) => sourceFilter === "all" || c.source === sourceFilter)
    .filter((c) => jobFilter === "all" || (c.applied_job || "").startsWith(jobFilter))
    .filter((c) => !search || c.full_name.toLowerCase().includes(search.toLowerCase()));

  const counts = {
    pending: candidates.filter((c) => c.pipeline_status === "new").length,
    ai_passed: candidates.filter((c) => c.pipeline_status === "passed").length,
    phone_pending: candidates.filter((c) => c.pipeline_status === "phone_interview_pending").length,
    phone_done: candidates.filter((c) => c.pipeline_status === "phone_interview_done").length,
    final_passed: candidates.filter((c) => c.pipeline_status === "final_passed").length,
    rejected: candidates.filter((c) => c.pipeline_status === "rejected" || c.pipeline_status === "screening_failed").length,
  };

  const STAT_KEYS: { key: keyof typeof counts; labelKey: string; color: string }[] = [
    { key: "pending", labelKey: "candidates.stat.pending", color: "#191F28" },
    { key: "ai_passed", labelKey: "candidates.stat.aiPassed", color: "#3182F6" },
    { key: "phone_pending", labelKey: "candidates.stat.phonePending", color: "#E8590C" },
    { key: "phone_done", labelKey: "candidates.stat.phoneDone", color: "#6B7684" },
    { key: "final_passed", labelKey: "candidates.stat.finalPassed", color: "#1D9E75" },
    { key: "rejected", labelKey: "candidates.stat.rejected", color: "#B0B8C1" },
  ];

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-[14px] text-gray-500">{t("common.loading")}</p></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[22px] font-medium text-gray-900">{t("candidates.title")}</h1>
        <div className="flex gap-2">
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

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-5">
        {STAT_KEYS.map((s) => (
          <div key={s.key} className="bg-white rounded-2xl border border-gray-200/60 p-4">
            <p className="text-[11px] text-gray-500 mb-1">{t(s.labelKey)}</p>
            <p className="text-[22px] font-medium" style={{ color: s.color }}>{counts[s.key]}</p>
          </div>
        ))}
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
        {TAB_KEYS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-3.5 py-[7px] rounded-full text-[13px] transition-colors ${
              activeTab === tab.key ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-700 hover:border-gray-300"
            }`}>
            {t(tab.labelKey)} ({counts[tab.key as keyof typeof counts]})
          </button>
        ))}
      </div>

      <div className="flex gap-1.5 mb-3 flex-wrap">
        <button onClick={() => setJobFilter("all")}
          className={`px-2.5 py-1 rounded-full text-[12px] transition-colors ${jobFilter === "all" ? "bg-[#3182F6] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          {t("candidates.allJobs")}
        </button>
        {jobCodes.map((code) => (
          <button key={code} onClick={() => setJobFilter(code)}
            className={`px-2.5 py-1 rounded-full text-[12px] transition-colors ${jobFilter === code ? "bg-[#3182F6] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {code}
          </button>
        ))}
      </div>

      <div className="flex gap-1.5 mb-4 flex-wrap">
        <button onClick={() => setSourceFilter("all")}
          className={`px-2.5 py-1 rounded-full text-[12px] transition-colors ${sourceFilter === "all" ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          {t("candidates.allSources")}
        </button>
        {sources.map((src) => (
          <button key={src} onClick={() => setSourceFilter(src)}
            className={`px-2.5 py-1 rounded-full text-[12px] transition-colors ${sourceFilter === src ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {src}
          </button>
        ))}
      </div>

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
                    {c.applied_job && <span className="text-[#3182F6]">{c.applied_job.match(/^([A-Z]+\d+)/)?.[1]}</span>}
                    {c.applied_job && c.position && <span>·</span>}
                    {c.position && <span>{c.position}</span>}
                    {(c.position || c.applied_job) && c.city && <span>·</span>}
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

function CandidateDetailModal({ candidate: initCandidate, onClose }: { candidate: Candidate; onClose: () => void }) {
  const { t, lang } = useAdminI18n();
  const [c, setC] = useState(initCandidate);
  const [phoneNote, setPhoneNote] = useState(c.phone_interview_note || "");
  const [phoneDate, setPhoneDate] = useState("");
  const [phoneTime, setPhoneTime] = useState("");
  const [saving, setSaving] = useState(false);
  const summary = c.llm_summary ? JSON.parse(c.llm_summary) : null;

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

  const savePhoneNote = async () => {
    await supabase.from("candidates").update({ phone_interview_note: phoneNote, updated_at: new Date().toISOString() }).eq("id", c.id);
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

          {["phone_interview_pending", "phone_interview_done", "final_passed"].includes(c.pipeline_status) && (
            <div>
              <p className="text-[11px] text-gray-500 mb-2">{t("phone.memo")}</p>
              <textarea value={phoneNote} onChange={(e) => setPhoneNote(e.target.value)} onBlur={savePhoneNote}
                placeholder={t("phone.memoPlaceholder")}
                className="w-full h-24 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:border-gray-300" />
            </div>
          )}

          <div className="space-y-3 pt-2">
            {c.pipeline_status === "passed" && (
              <div className="space-y-2">
                <p className="text-[11px] text-gray-500">{t("phone.schedule")}</p>
                <div className="flex gap-2">
                  <input type="date" value={phoneDate} onChange={(e) => setPhoneDate(e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[13px] text-gray-900 focus:outline-none focus:border-gray-300" />
                  <input type="text" value={phoneTime} maxLength={5}
                    onChange={(e) => { let v = e.target.value.replace(/[^0-9]/g, ""); if (v.length > 4) v = v.slice(0, 4); if (v.length >= 3) v = v.slice(0, 2) + ":" + v.slice(2); setPhoneTime(v); }}
                    placeholder="14:00"
                    className="w-[80px] px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[13px] text-gray-900 focus:outline-none focus:border-gray-300 text-center" />
                </div>
                <button onClick={() => updateStatus("phone_interview_pending", { phone_interview_date: phoneDate && phoneTime ? `${phoneDate}T${phoneTime}` : phoneDate || null })}
                  disabled={saving || !phoneDate || phoneTime.length < 5}
                  className="w-full py-3 bg-[#3182F6] text-white text-[14px] rounded-xl hover:bg-[#2272EB] transition-colors disabled:opacity-50">
                  {t("phone.moveToPending")}
                </button>
              </div>
            )}

            {c.pipeline_status === "phone_interview_pending" && (
              <button onClick={() => updateStatus("phone_interview_done")} disabled={saving}
                className="w-full py-3 bg-[#3182F6] text-white text-[14px] rounded-xl hover:bg-[#2272EB] transition-colors disabled:opacity-50">
                {t("phone.markDone")}
              </button>
            )}

            {c.pipeline_status === "phone_interview_done" && (
              <div className="flex gap-2">
                <button onClick={() => updateStatus("final_passed")} disabled={saving}
                  className="flex-1 py-3 bg-[#3182F6] text-white text-[14px] rounded-xl hover:bg-[#2272EB] transition-colors disabled:opacity-50">
                  {t("phone.finalPass")}
                </button>
                <button onClick={() => updateStatus("rejected", { rejection_reason: "Phone interview rejected" })} disabled={saving}
                  className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 text-[14px] rounded-xl hover:border-gray-300 transition-colors disabled:opacity-50">
                  {t("phone.reject")}
                </button>
              </div>
            )}

            {["passed", "phone_interview_pending"].includes(c.pipeline_status) && (
              <button onClick={() => updateStatus("rejected", { rejection_reason: "Manually rejected" })} disabled={saving}
                className="w-full py-2.5 text-[13px] text-gray-500 hover:text-gray-700 transition-colors">
                {t("phone.rejectAction")}
              </button>
            )}
          </div>
        </div>
      </div>
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
