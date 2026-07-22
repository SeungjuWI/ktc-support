"use client";

import { useCallback, useEffect, useState } from "react";
import ConfirmModal from "@/app/components/ConfirmModal";

interface JDRow {
  jdCode: string;
  opsCode: string;
  category: string;
  funnel: string;
  company: string;
  position: string;
  db: { total: number; screened: number; sentToCompany: number; interviewing: number; matched: number };
  sheetCount: number;
  sheetStatusCounts: Record<string, number>;
}

interface PipelineData {
  totals: {
    total: number;
    pending: number;
    screened: number;
    sentToCompany: number;
    interviewing: number;
    matched: number;
    rejected: number;
    opsHired: number;
    opsActive: number;
  };
  jdRows: JDRow[];
  sheetErrors: string[];
  syncedAt: string;
}

const FUNNEL_COLORS: Record<string, string> = {
  "1. Intake": "#8B95A1",
  "2. CV Shared": "#3182F6",
  "4. Interview Scheduled": "#E8590C",
  "7. Contract": "#1D9E75",
  "9. Done": "#1D9E75",
  Drop: "#B0B8C1",
};

function funnelColor(funnel: string): string {
  const key = Object.keys(FUNNEL_COLORS).find((k) => funnel.trim().startsWith(k));
  return key ? FUNNEL_COLORS[key] : "#8B95A1";
}

function isClosedFunnel(funnel: string): boolean {
  const f = funnel.trim();
  return f.startsWith("7.") || f.startsWith("9.");
}

export default function DashboardPage() {
  const [data, setData] = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [closing, setClosing] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{ jd: JDRow; dbCount: number; sheetCount: number } | null>(null);
  const [result, setResult] = useState("");
  const [syncingHires, setSyncingHires] = useState(false);
  const [hiresConfirm, setHiresConfirm] = useState<{ promote: number; demote: number; unmatched: number; employeeCount: number } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/pipeline");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "불러오기 실패");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오기 실패");
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const requestClose = async (jd: JDRow) => {
    setClosing(jd.jdCode);
    setResult("");
    try {
      const res = await fetch("/api/admin/pipeline/close-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdCode: jd.jdCode, dryRun: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "조회 실패");
      setConfirmTarget({ jd, dbCount: json.dbTargets.length, sheetCount: json.sheetTargets.length });
    } catch (e) {
      setResult(e instanceof Error ? e.message : "조회 실패");
    }
    setClosing(null);
  };

  const requestSyncHires = async () => {
    setSyncingHires(true);
    setResult("");
    try {
      const res = await fetch("/api/admin/pipeline/sync-hires", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "조회 실패");
      setHiresConfirm({
        promote: json.toPromote.length,
        demote: json.toDemote.length,
        unmatched: json.unmatchedEmployees.length,
        employeeCount: json.employeeCount,
      });
    } catch (e) {
      setResult(e instanceof Error ? e.message : "조회 실패");
    }
    setSyncingHires(false);
  };

  const executeSyncHires = async () => {
    setHiresConfirm(null);
    setSyncingHires(true);
    try {
      const res = await fetch("/api/admin/pipeline/sync-hires", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "동기화 실패");
      setResult(`입사자 동기화 완료 — 입사 확정 ${json.promoted}명 · 기업 발송으로 이동 ${json.demoted}명 · DB 미매칭 입사자 ${json.unmatchedEmployees.length}명`);
      fetchData();
    } catch (e) {
      setResult(e instanceof Error ? e.message : "동기화 실패");
    }
    setSyncingHires(false);
  };

  const executeClose = async () => {
    if (!confirmTarget) return;
    const { jd } = confirmTarget;
    setConfirmTarget(null);
    setClosing(jd.jdCode);
    try {
      const res = await fetch("/api/admin/pipeline/close-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdCode: jd.jdCode }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "처리 실패");
      setResult(`${jd.jdCode} 잔여 후보 탈락 처리 완료 — DB ${json.dbUpdated}명 · 시트 ${json.sheetUpdated}행`);
      fetchData();
    } catch (e) {
      setResult(e instanceof Error ? e.message : "처리 실패");
    }
    setClosing(null);
  };

  if (loading && !data) {
    return <div className="flex items-center justify-center py-20"><p className="text-[14px] text-gray-500">로딩 중...</p></div>;
  }

  const funnelCards = data
    ? [
        { label: "전체 접수", value: data.totals.total, color: "#191F28" },
        { label: "스크리닝 대기", value: data.totals.pending, color: "#8B95A1" },
        { label: "스크리닝 합격", value: data.totals.screened, color: "#3182F6" },
        { label: "기업 발송", value: data.totals.sentToCompany, color: "#E8590C" },
        { label: "면접 진행", value: data.totals.interviewing, color: "#6B7684" },
        { label: "매칭 완료 (입사)", value: data.totals.matched, color: "#1D9E75" },
        { label: "재직 중 (KTC Ops)", value: data.totals.opsActive, color: "#1D9E75" },
        { label: "탈락", value: data.totals.rejected, color: "#B0B8C1" },
      ]
    : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-medium text-gray-900">채용 대시보드</h1>
          {data && (
            <p className="text-[12px] text-gray-500 mt-1">
              KTC Ops · Qualified Candidates 시트 연동 · {new Date(data.syncedAt).toLocaleString("ko-KR")}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={requestSyncHires} disabled={syncingHires || loading}
            className="px-4 py-2 bg-[#1D9E75] text-white text-[13px] rounded-xl hover:bg-[#178A64] transition-colors disabled:opacity-50">
            {syncingHires ? "동기화 중..." : "입사자 동기화 (KTC Ops)"}
          </button>
          <button onClick={fetchData} disabled={loading}
            className="px-4 py-2 bg-gray-900 text-white text-[13px] rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50">
            {loading ? "불러오는 중..." : "새로고침"}
          </button>
        </div>
      </div>

      {error && <div className="mb-4 px-4 py-3 bg-red-50 text-[13px] text-red-500 rounded-xl">{error}</div>}
      {result && <div className="mb-4 px-4 py-3 bg-blue-50 text-[13px] text-blue-600 rounded-xl">{result}</div>}
      {data && data.sheetErrors.length > 0 && (
        <div className="mb-4 px-4 py-3 bg-[#FFF8F0] text-[13px] text-[#E8590C] rounded-xl">
          시트 연동 오류: {data.sheetErrors.join(" · ")}
        </div>
      )}

      {/* 전체 퍼널 */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-8 gap-2.5 mb-6">
        {funnelCards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-gray-200/60 px-4 py-4">
            <p className="text-[11px] text-gray-500 mb-1.5">{card.label}</p>
            <p className="text-[20px] font-medium" style={{ color: card.color }}>
              {card.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* 공고별 진행 현황 */}
      <div className="bg-white rounded-2xl border border-gray-200/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <span className="text-[14px] font-medium text-gray-900">공고별 진행 현황</span>
          <span className="text-[12px] text-gray-500">{data?.jdRows.length || 0}개 공고 · KTC Ops 기준</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-[11px] text-gray-500 border-b border-gray-100">
                <th className="text-left font-normal px-5 py-2.5">공고</th>
                <th className="text-left font-normal px-3 py-2.5">Ops 단계</th>
                <th className="text-right font-normal px-3 py-2.5">지원</th>
                <th className="text-right font-normal px-3 py-2.5">스크리닝 합격</th>
                <th className="text-right font-normal px-3 py-2.5">발송</th>
                <th className="text-right font-normal px-3 py-2.5">면접</th>
                <th className="text-right font-normal px-3 py-2.5">매칭</th>
                <th className="text-left font-normal px-3 py-2.5">시트 상태</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(data?.jdRows || []).map((jd) => {
                const activeCount = jd.db.total - jd.db.matched;
                const canClose = isClosedFunnel(jd.funnel) && (jd.db.screened + jd.db.sentToCompany + jd.db.interviewing > 0);
                return (
                  <tr key={`${jd.opsCode}-${jd.jdCode}`} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-900">{jd.company}</span>
                        {jd.jdCode && (
                          <span className="text-[11px] text-[#3182F6] bg-[#E8F3FF] px-1.5 py-0.5 rounded">{jd.jdCode}</span>
                        )}
                      </div>
                      {jd.position && <p className="text-[11px] text-gray-500 mt-0.5 max-w-[360px] truncate">{jd.position}</p>}
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[11px]"
                        style={{ backgroundColor: funnelColor(jd.funnel) + "18", color: funnelColor(jd.funnel) }}>
                        {jd.funnel}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-gray-900">{jd.db.total || "—"}</td>
                    <td className="px-3 py-3 text-right text-gray-900">{jd.db.screened || "—"}</td>
                    <td className="px-3 py-3 text-right text-gray-900">{jd.db.sentToCompany || "—"}</td>
                    <td className="px-3 py-3 text-right text-gray-900">{jd.db.interviewing || "—"}</td>
                    <td className="px-3 py-3 text-right">
                      {jd.db.matched ? <span className="text-[#1D9E75] font-medium">{jd.db.matched}</span> : "—"}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[400px]">
                        {Object.entries(jd.sheetStatusCounts).map(([s, n]) => (
                          <span key={s} className="text-[11px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                            {s} {n}
                          </span>
                        ))}
                        {jd.sheetCount === 0 && <span className="text-[11px] text-gray-400">—</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {canClose && (
                        <button onClick={() => requestClose(jd)} disabled={closing !== null}
                          className="px-3 py-1.5 text-[12px] rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors whitespace-nowrap disabled:opacity-50">
                          {closing === jd.jdCode ? "처리 중..." : "잔여 후보 탈락 처리"}
                        </button>
                      )}
                      {isClosedFunnel(jd.funnel) && !canClose && activeCount === 0 && (
                        <span className="text-[11px] text-gray-400">정리 완료</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {hiresConfirm && (
        <ConfirmModal
          title="입사자 동기화 (KTC Ops Employee 탭 기준)"
          message={`KTC Ops 입사자 명단 ${hiresConfirm.employeeCount}명 기준으로 동기화합니다.\n\n· 입사 확정(매칭 완료) 처리: ${hiresConfirm.promote}명\n· 명단에 없는 기존 "매칭 완료" → 기업 발송으로 이동: ${hiresConfirm.demote}명\n· DB에서 못 찾은 입사자(채널 외 유입): ${hiresConfirm.unmatched}명 (변경 없음)`}
          confirmLabel="동기화 실행"
          onConfirm={executeSyncHires}
          onCancel={() => setHiresConfirm(null)}
        />
      )}

      {confirmTarget && (
        <ConfirmModal
          title={`${confirmTarget.jd.jdCode} 잔여 후보 탈락 처리`}
          message={`${confirmTarget.jd.company} — ${confirmTarget.jd.funnel}\n\nDB ${confirmTarget.dbCount}명, Qualified 시트 ${confirmTarget.sheetCount}행이 탈락 처리됩니다. 매칭 완료된 후보는 제외됩니다.`}
          confirmLabel="탈락 처리"
          danger
          onConfirm={executeClose}
          onCancel={() => setConfirmTarget(null)}
        />
      )}
    </div>
  );
}
