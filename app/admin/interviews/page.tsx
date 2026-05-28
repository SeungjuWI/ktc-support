"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAdminI18n } from "@/lib/admin-i18n";

interface Session {
  id: string;
  access_code: string;
  candidate_name: string;
  candidate_email: string;
  candidate_phone: string | null;
  applied_company: string | null;
  applied_position: string | null;
  candidate_id: string | null;
  screening_score: number | null;
  cv_url: string | null;
  status: string;
  total_score: number | null;
  human_decision: string | null;
  completed_at: string | null;
  created_at: string;
  started_at: string | null;
  deadline: string | null;
  response_count?: number;
}

interface CandidateRow {
  candidate_name: string;
  candidate_email: string;
  applied_company: string;
  applied_position: string;
}

interface IssuedResult {
  code: string;
  candidate_name?: string;
  candidate_email?: string;
  applied_company?: string;
  applied_position?: string;
}

const emptyRow = (): CandidateRow => ({ candidate_name: "", candidate_email: "", applied_company: "", applied_position: "" });

function calcGrade(screening: number | null, interview: number | null): { score: number; grade: string } | null {
  if (screening === null || screening === undefined || interview === null || interview === undefined) return null;
  const normalizedInterview = (interview / 70) * 100;
  const combined = Math.round((screening + normalizedInterview) / 2);
  let grade = "F";
  if (combined >= 80) grade = "A";
  else if (combined >= 65) grade = "B";
  else if (combined >= 50) grade = "C";
  else if (combined >= 35) grade = "D";
  return { score: combined, grade };
}

const gradeBadge = (grade: string) => {
  if (grade === "A") return "bg-grade-s-bg text-grade-s-text";
  if (grade === "B") return "bg-blue-50 text-blue-500";
  if (grade === "C") return "bg-gray-100 text-gray-600";
  if (grade === "D") return "bg-gray-100 text-gray-500";
  return "bg-red-400/10 text-red-500"; // F
};

function isOverdue(session: Session): boolean {
  if (!session.deadline) return false;
  if (session.status === "scored" || session.status === "completed") return false;
  return new Date() > new Date(session.deadline);
}

function formatDeadline(d: string): string {
  const date = new Date(d);
  // 베트남 시간(GMT+7) 기준으로 표시
  const vnStr = date.toLocaleString("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = vnStr.match(/(\d+)\/(\d+),?\s*(\d+):(\d+)/);
  if (!parts) return d;
  return `${parts[1]}/${parts[2]} ${parts[3]}:${parts[4]}`;
}

export default function InterviewsAdminPage() {
  const { t } = useAdminI18n();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [rows, setRows] = useState<CandidateRow[]>([emptyRow()]);
  const [issuedResults, setIssuedResults] = useState<IssuedResult[]>([]);
  const [issueDeadline, setIssueDeadline] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  const fetchSessions = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/interviews");
    const json = await res.json();
    setSessions(json.sessions || []);
    setLoading(false);
  };

  useEffect(() => { fetchSessions(); }, []);

  const companies = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach(s => { if (s.applied_company) set.add(s.applied_company); });
    return Array.from(set).sort();
  }, [sessions]);

  // 회사별 진행률 계산 (scored or completed / total)
  const getProgress = (companySessions: Session[]) => {
    if (companySessions.length === 0) return 0;
    const done = companySessions.filter(s => s.status === "scored" || s.status === "completed").length;
    return Math.round((done / companySessions.length) * 100);
  };

  // 드롭다운 외부 클릭 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const updateRow = (idx: number, field: keyof CandidateRow, value: string) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const addRow = () => setRows(prev => [...prev, emptyRow()]);
  const removeRow = (idx: number) => {
    if (rows.length <= 1) return;
    setRows(prev => prev.filter((_, i) => i !== idx));
  };

  const issueCodes = async () => {
    setIssuing(true);
    const candidates = rows.filter(r => r.candidate_name || r.candidate_email);
    const payload: Record<string, unknown> = candidates.length > 0 ? { candidates } : { count: rows.length };
    if (issueDeadline) payload.deadline = new Date(issueDeadline).toISOString();

    const res = await fetch("/api/admin/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setIssuedResults(json.results || []);
    setIssuing(false);
    fetchSessions();
  };

  const copyAll = () => {
    const text = issuedResults.map(r =>
      [r.code, r.candidate_name, r.candidate_email, r.applied_company, r.applied_position].filter(Boolean).join("\t")
    ).join("\n");
    navigator.clipboard.writeText(text);
  };

  const closeModal = () => {
    setShowIssueModal(false);
    setIssuedResults([]);
    setRows([emptyRow()]);
    setIssueDeadline("");
  };

  const statusBadge = (status: string) => {
    if (status === "scored") return "bg-status-available/10 text-status-available";
    if (status === "in_progress") return "bg-grade-s-bg text-grade-s-text";
    if (status === "completed") return "bg-blue-50 text-blue-500";
    if (status === "abandoned") return "bg-red-400/10 text-red-500";
    return "bg-gray-100 text-gray-600";
  };

  const statusLabel = (s: Session) => {
    if (s.status === "abandoned") return `abandoned (${s.response_count ?? "?"}/${7})`;
    if (s.status === "in_progress") return `in_progress (${s.response_count ?? "?"}/${7})`;
    return s.status;
  };

  const filtered = sessions.filter((s) => {
    if (companyFilter !== "all") {
      if (companyFilter === "none") { if (s.applied_company) return false; }
      else { if (s.applied_company !== companyFilter) return false; }
    }
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.access_code.toLowerCase().includes(q) ||
      (s.candidate_name || "").toLowerCase().includes(q) ||
      (s.candidate_email || "").toLowerCase().includes(q) ||
      (s.candidate_phone || "").toLowerCase().includes(q) ||
      (s.applied_company || "").toLowerCase().includes(q) ||
      (s.applied_position || "").toLowerCase().includes(q) ||
      s.status.toLowerCase().includes(q)
    );
  });

  const overdueCount = filtered.filter(s => isOverdue(s)).length;

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(s => s.id)));
    }
  };

  const toggleBulkMode = () => {
    setBulkMode(v => !v);
    setSelected(new Set());
  };

  const bulkDecision = async (decision: string) => {
    if (selected.size === 0) return;
    setBulkLoading(true);
    await fetch("/api/admin/interviews/bulk-decision", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected), decision }),
    });
    setBulkLoading(false);
    setSelected(new Set());
    fetchSessions();
  };

  const exportCsv = () => {
    const headers = ["코드", "이름", "스크리닝 점수", "Phone", "회사", "포지션", "상태", "데드라인", "인터뷰 점수", "등급", "결정"];
    const rows = filtered.map(s => {
      const g = calcGrade(s.screening_score, s.total_score);
      return [
        s.access_code,
        s.candidate_name || "",
        s.screening_score !== null && s.screening_score !== undefined ? String(s.screening_score) : "",
        s.candidate_phone || "",
        s.applied_company || "",
        s.applied_position || "",
        s.status,
        s.deadline ? formatDeadline(s.deadline) : "",
        s.total_score !== null ? `${s.total_score}/70 (${Math.round(s.total_score/70*100)}%)` : "",
        g ? `${g.grade} ${g.score}` : "",
        s.human_decision || "",
      ];
    });
    const bom = "\uFEFF";
    const csv = bom + [headers, ...rows].map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `interviews_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-[22px] font-medium text-gray-900">{t("nav.interviews")}</h1>
          <p className="text-[13px] text-gray-500 mt-1">
            Total: {filtered.length}
            {filtered.length !== sessions.length && ` / ${sessions.length}`}
            {" | "}Scored: {filtered.filter(s => s.status === "scored").length}
            {" | "}Pending: {filtered.filter(s => s.status === "pending").length}
            {overdueCount > 0 && <span className="text-red-500"> | {t("interviews.overdue")}: {overdueCount}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={toggleBulkMode}
            className={`px-4 py-2 rounded-xl text-[13px] transition-colors duration-100 ${
              bulkMode
                ? "bg-gray-900 text-white"
                : "bg-white border-[0.5px] border-gray-200 text-gray-700 hover:border-gray-300"
            }`}>
            {bulkMode ? "선택 해제" : "선택 모드"}
          </button>
          <button onClick={exportCsv}
            className="flex items-center gap-1.5 border-[0.5px] border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl text-[13px] font-medium transition-colors duration-100">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            CSV
          </button>
          <button onClick={() => setShowIssueModal(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-[13px] font-medium transition-colors duration-100">
            + {t("interviews.issueCodes")}
          </button>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex gap-3 mb-4 items-center">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-2 border-[0.5px] border-gray-200 rounded-full text-[13px] bg-white text-gray-700 cursor-pointer hover:border-gray-300 transition-colors duration-100"
          >
            <span className="truncate max-w-[120px]">
              {companyFilter === "all" ? t("common.all") : companyFilter === "none" ? t("interviews.unassigned") : companyFilter}
            </span>
            {companyFilter !== "all" && (
              <span className="text-[11px] text-blue-500 font-medium">
                {getProgress(sessions.filter(s => companyFilter === "none" ? !s.applied_company : s.applied_company === companyFilter))}%
              </span>
            )}
            <svg className={`text-gray-400 transition-transform duration-100 ${dropdownOpen ? "rotate-180" : ""}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border-[0.5px] border-gray-200 rounded-xl overflow-hidden z-50 min-w-[240px]">
              {/* 전체 */}
              <button
                onClick={() => { setCompanyFilter("all"); setDropdownOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-[13px] hover:bg-gray-50 transition-colors duration-100 ${companyFilter === "all" ? "bg-gray-50 text-gray-900 font-medium" : "text-gray-700"}`}
              >
                <span>{t("common.all")}</span>
                <span className="text-[12px] text-gray-400">{sessions.length}건 · {getProgress(sessions)}%</span>
              </button>

              <div className="border-t border-gray-100" />

              {companies.map(c => {
                const companySessions = sessions.filter(s => s.applied_company === c);
                const progress = getProgress(companySessions);
                return (
                  <button
                    key={c}
                    onClick={() => { setCompanyFilter(c); setDropdownOpen(false); }}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 text-[13px] hover:bg-gray-50 transition-colors duration-100 ${companyFilter === c ? "bg-gray-50 text-gray-900 font-medium" : "text-gray-700"}`}
                  >
                    <span className="truncate max-w-[120px]">{c}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-[40px] h-[4px] bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full transition-all duration-100" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-[12px] text-gray-400 w-[60px] text-right">{companySessions.length}건 · {progress}%</span>
                    </div>
                  </button>
                );
              })}

              {sessions.some(s => !s.applied_company) && (
                <>
                  <div className="border-t border-gray-100" />
                  <button
                    onClick={() => { setCompanyFilter("none"); setDropdownOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-[13px] hover:bg-gray-50 transition-colors duration-100 ${companyFilter === "none" ? "bg-gray-50 text-gray-900 font-medium" : "text-gray-400"}`}
                  >
                    <span>{t("interviews.unassigned")}</span>
                    <span className="text-[12px] text-gray-400">{sessions.filter(s => !s.applied_company).length}건</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="relative w-[280px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t("interviews.search")}
            className="w-full pl-8 pr-8 py-2 border-[0.5px] border-gray-200 rounded-full text-[13px] outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 text-[14px]">{t("common.loading")}</div>
      ) : (
        <div className={`bg-white rounded-2xl border-[0.5px] border-gray-200/60 ${bulkMode && selected.size > 0 ? "mb-16" : ""}`}>
          <table className="w-full text-[13px] table-fixed">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-500 font-medium w-[18%]">{t("interviews.col.code")} / {t("interviews.col.name")}</th>
                <th className="px-4 py-3 text-left text-gray-500 font-medium w-[18%]">{t("interviews.col.company")} / {t("interviews.col.position")}</th>
                <th className="px-4 py-3 text-left text-gray-500 font-medium w-[12%]">Phone</th>
                <th className="px-4 py-3 text-left text-gray-500 font-medium w-[20%]">{t("interviews.col.status")} / {t("interviews.deadline")}</th>
                <th className="px-4 py-3 text-left text-gray-500 font-medium w-[18%]">{t("interviews.col.screeningScore")} / {t("interviews.col.score")}</th>
                <th className="px-4 py-3 text-left text-gray-500 font-medium w-[14%]">등급 / {t("interviews.col.decision")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const overdue = isOverdue(s);
                const gradeResult = calcGrade(s.screening_score, s.total_score);
                const isSelected = selected.has(s.id);
                return (
                  <tr key={s.id}
                    onClick={bulkMode ? () => toggleSelect(s.id) : undefined}
                    className={`border-t border-gray-100 transition-colors duration-100 ${
                      bulkMode ? "cursor-pointer" : ""
                    } ${
                      bulkMode && isSelected
                        ? "bg-[#E8F3FF] border-l-2 border-l-[#3182F6]"
                        : overdue ? "bg-red-50/30 hover:bg-gray-50/50" : "hover:bg-gray-50/50"
                    }`}>
                    <td className="px-4 py-3">
                      {bulkMode ? (
                        <span className="font-mono text-[12px] text-blue-500">{s.access_code}</span>
                      ) : (
                        <Link href={`/admin/interviews/${s.id}`} className="text-blue-500 hover:text-blue-600 hover:underline font-mono text-[12px]">{s.access_code}</Link>
                      )}
                      <div className="text-[13px] text-gray-900 mt-0.5 truncate">{s.candidate_name || <span className="text-gray-400">—</span>}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[12px] text-gray-600 truncate" title={s.applied_company || undefined}>{s.applied_company || <span className="text-gray-400">—</span>}</div>
                      <div className="text-[12px] text-gray-500 mt-0.5 truncate" title={s.applied_position || undefined}>{s.applied_position || <span className="text-gray-400">—</span>}</div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-600">{s.candidate_phone || <span className="text-gray-400">—</span>}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[12px] px-2 py-1 rounded-full ${statusBadge(s.status)}`}>{statusLabel(s)}</span>
                        {overdue && <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500">{t("interviews.overdue")}</span>}
                      </div>
                      <div className="text-[12px] mt-0.5">
                        {s.deadline ? (
                          <span className={overdue ? "text-red-500 font-medium" : "text-gray-500"}>{formatDeadline(s.deadline)}</span>
                        ) : <span className="text-gray-400">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[12px]">
                        <span className="text-gray-500">CV </span>
                        {s.screening_score !== null && s.screening_score !== undefined ? (
                          <span className={`font-medium ${s.screening_score >= 85 ? "text-grade-s-text" : s.screening_score >= 70 ? "text-blue-500" : "text-gray-600"}`}>{s.screening_score}</span>
                        ) : <span className="text-gray-400">—</span>}
                      </div>
                      <div className="text-[12px] mt-0.5">
                        <span className="text-gray-500">IV </span>
                        <span className="font-medium text-gray-900">
                          {s.total_score !== null ? `${s.total_score}/70 (${Math.round(s.total_score/70*100)}%)` : <span className="text-gray-400">—</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        {gradeResult ? (
                          <span className={`text-[12px] px-2 py-1 rounded-full font-medium ${gradeBadge(gradeResult.grade)}`}>
                            {gradeResult.grade} {gradeResult.score}
                          </span>
                        ) : <span className="text-gray-400 text-[12px]">—</span>}
                      </div>
                      <div className="mt-1">
                        {s.human_decision === "pass" && <span className="text-status-available font-medium text-[12px]">PASS</span>}
                        {s.human_decision === "fail" && <span className="text-red-500 font-medium text-[12px]">FAIL</span>}
                        {s.human_decision === "hold" && <span className="text-grade-s-text font-medium text-[12px]">HOLD</span>}
                        {!s.human_decision && <span className="text-gray-400 text-[12px]">—</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    {search || companyFilter !== "all" ? t("interviews.noResult") : t("interviews.noData")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 하단 고정 액션 바 — 선택모드에서 1명 이상 선택 시 표시 */}
      {bulkMode && selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-5 py-3 flex items-center gap-3">
          <label className="flex items-center gap-2 text-[13px] text-gray-700 cursor-pointer">
            <input type="checkbox"
              checked={selected.size === filtered.length}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500" />
            전체 선택
          </label>
          <span className="text-[13px] text-gray-500">{selected.size}명 선택</span>
          <div className="flex gap-2 ml-auto">
            <button onClick={() => bulkDecision("pass")} disabled={bulkLoading}
              className="px-4 py-2 rounded-xl text-[13px] font-medium bg-[#1D9E75]/10 text-[#1D9E75] hover:bg-[#1D9E75]/20 transition-colors duration-100 disabled:opacity-50">
              PASS
            </button>
            <button onClick={() => bulkDecision("hold")} disabled={bulkLoading}
              className="px-4 py-2 rounded-xl text-[13px] font-medium bg-grade-s-bg text-grade-s-text hover:bg-orange-100 transition-colors duration-100 disabled:opacity-50">
              HOLD
            </button>
            <button onClick={() => bulkDecision("fail")} disabled={bulkLoading}
              className="px-4 py-2 rounded-xl text-[13px] font-medium bg-red-50 text-red-500 hover:bg-red-100 transition-colors duration-100 disabled:opacity-50">
              FAIL
            </button>
          </div>
        </div>
      )}

      {/* 코드 발급 모달 */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-[18px] font-medium text-gray-900 mb-4">{t("interviews.issueCodes")}</h2>

            {issuedResults.length === 0 ? (
              <>
                <p className="text-[13px] text-gray-500 mb-3">{t("interviews.issueDesc")}</p>

                <div className="mb-4">
                  <label className="block text-[13px] font-medium text-gray-700 mb-1.5">{t("interviews.deadlineVN")}</label>
                  <input type="datetime-local" value={issueDeadline} onChange={(e) => setIssueDeadline(e.target.value)}
                    className="px-3 py-2 border-[0.5px] border-gray-200 rounded-xl text-[14px] outline-none focus:ring-2 focus:ring-blue-500" />
                  {!issueDeadline && <p className="text-[12px] text-gray-400 mt-1">{t("interviews.noDeadline")}</p>}
                </div>

                <div className="border-[0.5px] border-gray-200 rounded-xl overflow-hidden mb-4">
                  <table className="w-full text-[13px]">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-500 font-medium">{t("interviews.col.name")}</th>
                        <th className="px-3 py-2 text-left text-gray-500 font-medium">{t("interviews.col.email")}</th>
                        <th className="px-3 py-2 text-left text-gray-500 font-medium">{t("interviews.col.company")}</th>
                        <th className="px-3 py-2 text-left text-gray-500 font-medium">{t("interviews.col.position")}</th>
                        <th className="px-3 py-2 w-[40px]"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => (
                        <tr key={idx} className="border-t border-gray-100">
                          <td className="px-2 py-1.5">
                            <input type="text" value={row.candidate_name} onChange={(e) => updateRow(idx, "candidate_name", e.target.value)}
                              placeholder="Nguyen Van A"
                              className="w-full px-2 py-1.5 border-[0.5px] border-gray-200 rounded-lg text-[13px] outline-none focus:ring-1 focus:ring-blue-500" />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="text" value={row.candidate_email} onChange={(e) => updateRow(idx, "candidate_email", e.target.value)}
                              placeholder="email@example.com"
                              className="w-full px-2 py-1.5 border-[0.5px] border-gray-200 rounded-lg text-[13px] outline-none focus:ring-1 focus:ring-blue-500" />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="text" value={row.applied_company} onChange={(e) => updateRow(idx, "applied_company", e.target.value)}
                              placeholder="FPT Software"
                              className="w-full px-2 py-1.5 border-[0.5px] border-gray-200 rounded-lg text-[13px] outline-none focus:ring-1 focus:ring-blue-500" />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="text" value={row.applied_position} onChange={(e) => updateRow(idx, "applied_position", e.target.value)}
                              placeholder="Backend Dev"
                              className="w-full px-2 py-1.5 border-[0.5px] border-gray-200 rounded-lg text-[13px] outline-none focus:ring-1 focus:ring-blue-500" />
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            {rows.length > 1 && (
                              <button onClick={() => removeRow(idx)} className="text-gray-400 hover:text-red-500 transition-colors duration-100">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button onClick={addRow}
                  className="w-full py-2 border-[0.5px] border-dashed border-gray-300 rounded-xl text-[13px] text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors duration-100 mb-4">
                  {t("interviews.addRow")}
                </button>

                <div className="flex gap-2">
                  <button onClick={closeModal} className="flex-1 px-4 py-2 bg-gray-100 rounded-xl text-[14px] text-gray-700 hover:bg-gray-200 transition-colors duration-100">{t("common.cancel")}</button>
                  <button onClick={issueCodes} disabled={issuing} className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-xl text-[14px] disabled:opacity-50 hover:bg-blue-600 transition-colors duration-100">
                    {issuing ? t("interviews.issuing") : `${rows.length}${t("interviews.issueN")}`}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-[13px] text-gray-600 mb-3">{issuedResults.length}{t("interviews.issueComplete")}</p>
                <div className="border-[0.5px] border-gray-200 rounded-xl overflow-hidden mb-4">
                  <table className="w-full text-[13px]">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-500 font-medium">{t("interviews.col.code")}</th>
                        <th className="px-3 py-2 text-left text-gray-500 font-medium">{t("interviews.col.name")}</th>
                        <th className="px-3 py-2 text-left text-gray-500 font-medium">{t("interviews.col.email")}</th>
                        <th className="px-3 py-2 text-left text-gray-500 font-medium">{t("interviews.col.company")}</th>
                        <th className="px-3 py-2 text-left text-gray-500 font-medium">{t("interviews.col.position")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {issuedResults.map((r, idx) => (
                        <tr key={idx} className="border-t border-gray-100">
                          <td className="px-3 py-2 font-mono text-[12px] text-blue-500">{r.code}</td>
                          <td className="px-3 py-2">{r.candidate_name || "—"}</td>
                          <td className="px-3 py-2 text-gray-600">{r.candidate_email || "—"}</td>
                          <td className="px-3 py-2 text-gray-600">{r.applied_company || "—"}</td>
                          <td className="px-3 py-2 text-gray-600">{r.applied_position || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-2">
                  <button onClick={copyAll} className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-xl text-[14px] hover:bg-gray-800 transition-colors duration-100">{t("interviews.copyAll")}</button>
                  <button onClick={closeModal} className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-xl text-[14px] hover:bg-blue-600 transition-colors duration-100">{t("interviews.done")}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
