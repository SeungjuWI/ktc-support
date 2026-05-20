"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAdminI18n } from "@/lib/admin-i18n";

interface Session {
  id: string;
  access_code: string;
  candidate_name: string;
  candidate_email: string;
  applied_company: string | null;
  candidate_id: string | null;
  status: string;
  total_score: number | null;
  human_decision: string | null;
  completed_at: string | null;
  created_at: string;
  started_at: string | null;
  response_count?: number;
}

export default function InterviewsAdminPage() {
  const { t } = useAdminI18n();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueCount, setIssueCount] = useState(10);
  const [issuedCodes, setIssuedCodes] = useState<string[]>([]);
  const [issuing, setIssuing] = useState(false);

  const fetchSessions = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/interviews");
    const json = await res.json();
    setSessions(json.sessions || []);
    setLoading(false);
  };

  useEffect(() => { fetchSessions(); }, []);

  const issueCodes = async () => {
    setIssuing(true);
    const res = await fetch("/api/admin/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: issueCount }),
    });
    const json = await res.json();
    setIssuedCodes(json.codes || []);
    setIssuing(false);
    fetchSessions();
  };

  const copyAll = () => {
    navigator.clipboard.writeText(issuedCodes.join("\n"));
  };

  const statusBadge = (status: string) => {
    if (status === "scored") return "bg-status-available/10 text-status-available";
    if (status === "in_progress") return "bg-grade-s-bg text-grade-s-text";
    if (status === "completed") return "bg-blue-50 text-blue-500";
    if (status === "abandoned") return "bg-red-400/10 text-red-500";
    return "bg-gray-100 text-gray-600";
  };

  const statusLabel = (s: Session) => {
    if (s.status === "abandoned") return `abandoned (${s.response_count ?? "?"}/${7} answered)`;
    if (s.status === "in_progress") return `in_progress (${s.response_count ?? "?"}/${7})`;
    return s.status;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-[22px] font-medium text-gray-900">{t("nav.interviews")}</h1>
          <p className="text-[13px] text-gray-500 mt-1">
            Total: {sessions.length} | Scored: {sessions.filter((s) => s.status === "scored").length} | Pending: {sessions.filter((s) => s.status === "pending").length} | Abandoned: {sessions.filter((s) => s.status === "abandoned").length}
          </p>
        </div>
        <button onClick={() => setShowIssueModal(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-[14px] font-medium transition-colors duration-100">
          + {t("interviews.issueCodes")}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 text-[14px]">{t("common.loading")}</div>
      ) : (
        <div className="bg-white rounded-2xl border-[0.5px] border-gray-200/60 overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-500 font-medium">Code</th>
                <th className="px-4 py-3 text-left text-gray-500 font-medium">Name</th>
                <th className="px-4 py-3 text-left text-gray-500 font-medium">Company</th>
                <th className="px-4 py-3 text-left text-gray-500 font-medium">Status</th>
                <th className="px-4 py-3 text-left text-gray-500 font-medium">Score</th>
                <th className="px-4 py-3 text-left text-gray-500 font-medium">Decision</th>
                <th className="px-4 py-3 text-left text-gray-500 font-medium">Completed</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50/50 transition-colors duration-100">
                  <td className="px-4 py-3 font-mono text-[12px] text-gray-600">{s.access_code}</td>
                  <td className="px-4 py-3">
                    {s.candidate_name && s.status !== "pending" ? (
                      <Link href={`/admin/interviews/${s.id}`} className="text-blue-500 hover:text-blue-600">
                        {s.candidate_name}
                      </Link>
                    ) : (s.candidate_name || <span className="text-gray-400">—</span>)}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-gray-600">
                    <div className="flex items-center gap-1.5">
                      {s.candidate_id ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#E8F3FF] text-[#3182F6] text-[11px]">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                          auto
                        </span>
                      ) : (
                        <span className="inline-flex px-1.5 py-0.5 rounded-full bg-[#F2F4F6] text-[#8B95A1] text-[11px]">
                          manual
                        </span>
                      )}
                      {s.applied_company && <span>{s.applied_company}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[12px] px-2 py-1 rounded-full ${statusBadge(s.status)}`}>{statusLabel(s)}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {s.total_score !== null ? `${s.total_score}/70 (${Math.round(s.total_score/70*100)}%)` : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {s.human_decision === "pass" && <span className="text-status-available font-medium">PASS</span>}
                    {s.human_decision === "fail" && <span className="text-red-500 font-medium">FAIL</span>}
                    {s.human_decision === "hold" && <span className="text-grade-s-text font-medium">HOLD</span>}
                    {!s.human_decision && <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-gray-500">
                    {s.completed_at ? new Date(s.completed_at).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    No interview sessions yet. Issue codes to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showIssueModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => { setShowIssueModal(false); setIssuedCodes([]); }}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-[18px] font-medium text-gray-900 mb-4">{t("interviews.issueCodes")}</h2>
            {issuedCodes.length === 0 ? (
              <>
                <label className="block text-[13px] font-medium text-gray-700 mb-2">Number of codes (1-100)</label>
                <input type="number" value={issueCount} onChange={(e) => setIssueCount(parseInt(e.target.value, 10))}
                  min={1} max={100} className="w-full px-3 py-2 border-[0.5px] border-gray-200 rounded-xl mb-4 text-[14px] outline-none focus:ring-2 focus:ring-blue-500" />
                <div className="flex gap-2">
                  <button onClick={() => setShowIssueModal(false)} className="flex-1 px-4 py-2 bg-gray-100 rounded-xl text-[14px] text-gray-700 hover:bg-gray-200 transition-colors duration-100">{t("common.cancel")}</button>
                  <button onClick={issueCodes} disabled={issuing} className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-xl text-[14px] disabled:opacity-50 hover:bg-blue-600 transition-colors duration-100">
                    {issuing ? "Issuing..." : "Issue"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-[13px] text-gray-600 mb-3">{issuedCodes.length} codes issued. Share with candidates:</p>
                <pre className="bg-gray-50 p-3 rounded-xl text-[13px] font-mono max-h-80 overflow-y-auto whitespace-pre-wrap">{issuedCodes.join("\n")}</pre>
                <div className="flex gap-2 mt-4">
                  <button onClick={copyAll} className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-xl text-[14px] hover:bg-gray-800 transition-colors duration-100">Copy All</button>
                  <button onClick={() => { setShowIssueModal(false); setIssuedCodes([]); }} className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-xl text-[14px] hover:bg-blue-600 transition-colors duration-100">Done</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
