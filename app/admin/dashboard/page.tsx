"use client";

import { useCallback, useEffect, useState } from "react";
import ConfirmModal from "@/app/components/ConfirmModal";
import { useAdminI18n } from "@/lib/admin-i18n";
import { getCached, setCached } from "@/lib/admin-cache";

interface JDRow {
  jdCode: string;
  opsCode: string;
  category: string;
  funnel: string;
  company: string;
  position: string;
  db: { total: number; screened: number; readyToForward: number; sentToCompany: number; interviewing: number; offer: number; matched: number };
  sheetCount: number;
  sheetStatusCounts: Record<string, number>;
}

interface PipelineData {
  totals: {
    total: number;
    pending: number;
    screened: number;
    readyToForward: number;
    sentToCompany: number;
    interviewing: number;
    offer: number;
    matched: number;
    rejected: number;
    rejectedOnly: number;
    screeningFailed: number;
    opsHired: number;
    opsActive: number;
  };
  jdRows: JDRow[];
  sheetErrors: string[];
  syncedAt: string;
}

// order: 테이블 정렬 우선순위 — 진행이 뜨거운 공고가 위, 종료·드롭이 아래
const FUNNEL_META: { prefix: string; labelKey: string; color: string; order: number }[] = [
  { prefix: "4.", labelKey: "dash.funnel.interviewScheduled", color: "#E8590C", order: 0 },
  { prefix: "7.", labelKey: "dash.funnel.contract", color: "#1D9E75", order: 1 },
  { prefix: "2.", labelKey: "dash.funnel.cvShared", color: "#3182F6", order: 2 },
  { prefix: "1.", labelKey: "dash.funnel.intake", color: "#8B95A1", order: 3 },
  { prefix: "9.", labelKey: "dash.funnel.done", color: "#1D9E75", order: 4 },
  { prefix: "Drop", labelKey: "dash.funnel.drop", color: "#B0B8C1", order: 5 },
];

function funnelMeta(funnel: string) {
  return FUNNEL_META.find((m) => funnel.trim().startsWith(m.prefix)) || null;
}

function isClosedFunnel(funnel: string): boolean {
  const f = funnel.trim();
  return f.startsWith("7.") || f.startsWith("9.");
}

// 시트의 자유 입력 Status 문자열 → 번역 키 (모르는 값은 원문 표시)
const SHEET_STATUS_KEYS: Record<string, string> = {
  "sent to company": "dash.sheet.sentToCompany",
  "ready to forward": "dash.sheet.readyToForward",
  "company interviewed": "dash.sheet.companyInterviewed",
  "not selected": "dash.sheet.notSelected",
  passed: "dash.sheet.passed",
  rejected: "dash.sheet.rejected",
  interviewing: "dash.sheet.interviewing",
  "(없음)": "dash.sheet.none",
};

export default function DashboardPage() {
  const { t, lang } = useAdminI18n();
  const [data, setData] = useState<PipelineData | null>(() => getCached<PipelineData>("admin:pipeline"));
  const [loading, setLoading] = useState(() => !getCached("admin:pipeline"));
  const [error, setError] = useState("");
  const [closing, setClosing] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{ jd: JDRow; dbCount: number; sheetCount: number } | null>(null);
  const [result, setResult] = useState("");
  const [syncingHires, setSyncingHires] = useState(false);
  const [hiresConfirm, setHiresConfirm] = useState<{ promote: number; demote: number; unmatched: number; employeeCount: number } | null>(null);
  const [pulling, setPulling] = useState(false);
  const [pullConfirm, setPullConfirm] = useState<{ count: number; sample: string[] } | null>(null);

  const sheetStatusLabel = (s: string) => {
    const key = SHEET_STATUS_KEYS[s.trim().toLowerCase()] || SHEET_STATUS_KEYS[s];
    return key ? t(key) : s;
  };

  const funnelLabel = (funnel: string) => {
    const meta = funnelMeta(funnel);
    return meta ? t(meta.labelKey) : funnel;
  };

  const funnelColor = (funnel: string) => funnelMeta(funnel)?.color || "#8B95A1";

  // 캐시가 있으면 로딩 화면 없이 백그라운드로 갱신. fresh=true면 서버의 시트 캐시도 무시(동기화 직후)
  const fetchData = useCallback(async (fresh = false) => {
    setError("");
    try {
      const res = await fetch(fresh ? "/api/admin/pipeline?fresh=1" : "/api/admin/pipeline");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "failed");
      setData(json);
      setCached("admin:pipeline", json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

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
      if (!res.ok) throw new Error(json.error || "failed");
      setHiresConfirm({
        promote: json.toPromote.length,
        demote: json.toDemote.length,
        unmatched: json.unmatchedEmployees.length,
        employeeCount: json.employeeCount,
      });
    } catch (e) {
      setResult(e instanceof Error ? e.message : "failed");
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
      if (!res.ok) throw new Error(json.error || "failed");
      setResult(
        lang === "ko"
          ? `입사자 동기화 완료 — 입사 확정 ${json.promoted}명 · 기업 발송으로 이동 ${json.demoted}명 · DB 미매칭 ${json.unmatchedEmployees.length}명`
          : lang === "vi"
          ? `Đồng bộ xong — xác nhận ${json.promoted} · chuyển sang đã gửi DN ${json.demoted} · không khớp DB ${json.unmatchedEmployees.length}`
          : `Hire sync done — matched ${json.promoted} · moved to sent ${json.demoted} · unmatched ${json.unmatchedEmployees.length}`
      );
      fetchData(true);
    } catch (e) {
      setResult(e instanceof Error ? e.message : "failed");
    }
    setSyncingHires(false);
  };

  const requestPull = async () => {
    setPulling(true);
    setResult("");
    try {
      const res = await fetch("/api/admin/pipeline/pull-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "failed");
      setPullConfirm({
        count: json.updates.length,
        sample: json.updates.slice(0, 8).map((u: { name: string; from: string; to: string }) => `${u.name}: ${t("status." + u.from)} → ${t("status." + u.to)}`),
      });
    } catch (e) {
      setResult(e instanceof Error ? e.message : "failed");
    }
    setPulling(false);
  };

  const executePull = async () => {
    setPullConfirm(null);
    setPulling(true);
    try {
      const res = await fetch("/api/admin/pipeline/pull-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "failed");
      setResult(
        lang === "ko"
          ? `시트 → 앱 동기화 완료 — ${json.updated}명 상태 업데이트 (시트 ${json.sheetRows}행 기준)`
          : lang === "vi"
          ? `Đồng bộ xong — cập nhật ${json.updated} UV (từ ${json.sheetRows} dòng sheet)`
          : `Sheet → app sync done — ${json.updated} candidates updated (from ${json.sheetRows} sheet rows)`
      );
      fetchData(true);
    } catch (e) {
      setResult(e instanceof Error ? e.message : "failed");
    }
    setPulling(false);
  };

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
      if (!res.ok) throw new Error(json.error || "failed");
      setConfirmTarget({ jd, dbCount: json.dbTargets.length, sheetCount: json.sheetTargets.length });
    } catch (e) {
      setResult(e instanceof Error ? e.message : "failed");
    }
    setClosing(null);
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
      if (!res.ok) throw new Error(json.error || "failed");
      setResult(
        lang === "ko"
          ? `${jd.jdCode} 잔여 후보 탈락 처리 완료 — DB ${json.dbUpdated}명 · 시트 ${json.sheetUpdated}행`
          : lang === "vi"
          ? `${jd.jdCode} đã loại UV còn lại — DB ${json.dbUpdated} · sheet ${json.sheetUpdated}`
          : `${jd.jdCode} remaining candidates rejected — DB ${json.dbUpdated} · sheet ${json.sheetUpdated}`
      );
      fetchData(true);
    } catch (e) {
      setResult(e instanceof Error ? e.message : "failed");
    }
    setClosing(null);
  };

  if (loading && !data) {
    return <div className="flex items-center justify-center py-20"><p className="text-[14px] text-gray-500">{t("dash.loading")}</p></div>;
  }

  const funnelCards = data
    ? [
        { label: t("dash.card.total"), value: data.totals.total, color: "#191F28" },
        { label: t("dash.card.pending"), value: data.totals.pending, color: "#8B95A1" },
        { label: t("dash.card.screened"), value: data.totals.screened, color: "#3182F6" },
        { label: t("dash.card.readyToForward"), value: data.totals.readyToForward, color: "#2272EB" },
        { label: t("dash.card.sent"), value: data.totals.sentToCompany, color: "#E8590C" },
        { label: t("dash.card.interviewing"), value: data.totals.interviewing, color: "#6B7684" },
        { label: t("dash.card.offer"), value: data.totals.offer, color: "#B8860B" },
        { label: t("dash.card.matched"), value: data.totals.matched, color: "#1D9E75" },
        { label: t("dash.card.active"), value: data.totals.opsActive, color: "#1D9E75", sub: t("dash.card.activeSub") },
        {
          label: t("dash.card.rejected"),
          value: data.totals.rejected,
          color: "#B0B8C1",
          sub: `${t("candidates.tab.rejected")} ${data.totals.rejectedOnly.toLocaleString()} · ${t("candidates.tab.screeningFailed")} ${data.totals.screeningFailed.toLocaleString()}`,
        },
      ]
    : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-medium text-gray-900">{t("dash.title")}</h1>
          {data && (
            <p className="text-[12px] text-gray-500 mt-1">
              {t("dash.subtitle")} · {new Date(data.syncedAt).toLocaleString(lang === "ko" ? "ko-KR" : lang === "vi" ? "vi-VN" : "en-US")}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={requestPull} disabled={pulling || loading}
            className="px-4 py-2 bg-[#3182F6] text-white text-[13px] rounded-xl hover:bg-[#2272EB] transition-colors disabled:opacity-50 whitespace-nowrap">
            {pulling ? t("dash.syncing") : t("dash.pullSheet")}
          </button>
          <button onClick={requestSyncHires} disabled={syncingHires || loading}
            className="px-4 py-2 bg-[#1D9E75] text-white text-[13px] rounded-xl hover:bg-[#178A64] transition-colors disabled:opacity-50 whitespace-nowrap">
            {syncingHires ? t("dash.syncing") : t("dash.syncHires")}
          </button>
          <button onClick={() => fetchData(true)} disabled={loading}
            className="px-4 py-2 bg-gray-900 text-white text-[13px] rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 whitespace-nowrap">
            {loading ? t("dash.loading") : t("dash.refresh")}
          </button>
        </div>
      </div>

      {error && <div className="mb-4 px-4 py-3 bg-red-50 text-[13px] text-red-500 rounded-xl">{error}</div>}
      {result && <div className="mb-4 px-4 py-3 bg-blue-50 text-[13px] text-blue-600 rounded-xl">{result}</div>}
      {data && data.sheetErrors.length > 0 && (
        <div className="mb-4 px-4 py-3 bg-[#FFF8F0] text-[13px] text-[#E8590C] rounded-xl">
          {t("dash.sheetError")}: {data.sheetErrors.join(" · ")}
        </div>
      )}

      {/* 전체 퍼널 */}
      <div className="grid grid-cols-4 md:grid-cols-5 gap-2.5 mb-6">
        {funnelCards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-gray-200/60 px-4 py-4">
            <p className="text-[11px] text-gray-500 mb-1.5 whitespace-nowrap">{card.label}</p>
            <p className="text-[20px] font-medium" style={{ color: card.color }}>
              {card.value.toLocaleString()}
            </p>
            {"sub" in card && card.sub && (
              <p className="text-[10px] text-gray-400 mt-1 whitespace-nowrap">{card.sub}</p>
            )}
          </div>
        ))}
      </div>

      {/* 공고별 진행 현황 */}
      <div className="bg-white rounded-2xl border border-gray-200/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <span className="text-[14px] font-medium text-gray-900">{t("dash.jdTable.title")}</span>
          <span className="text-[12px] text-gray-500">{data?.jdRows.length || 0}{t("dash.jdTable.count")}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-[11px] text-gray-500 border-b border-gray-100">
                <th className="text-left font-normal px-5 py-2.5 whitespace-nowrap">{t("dash.col.jd")}</th>
                <th className="text-left font-normal px-3 py-2.5 whitespace-nowrap">{t("dash.col.funnel")}</th>
                <th className="text-right font-normal px-3 py-2.5 whitespace-nowrap">{t("dash.col.applied")}</th>
                <th className="text-right font-normal px-3 py-2.5 whitespace-nowrap">{t("dash.col.screened")}</th>
                <th className="text-right font-normal px-3 py-2.5 whitespace-nowrap">{t("dash.col.readyToForward")}</th>
                <th className="text-right font-normal px-3 py-2.5 whitespace-nowrap">{t("dash.col.sent")}</th>
                <th className="text-right font-normal px-3 py-2.5 whitespace-nowrap">{t("dash.col.interview")}</th>
                <th className="text-right font-normal px-3 py-2.5 whitespace-nowrap">{t("dash.col.offer")}</th>
                <th className="text-right font-normal px-3 py-2.5 whitespace-nowrap">{t("dash.col.matched")}</th>
                <th className="text-left font-normal px-3 py-2.5 whitespace-nowrap">{t("dash.col.sheetStatus")}</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[...(data?.jdRows || [])]
                .sort(
                  (a, b) =>
                    (funnelMeta(a.funnel)?.order ?? 9) - (funnelMeta(b.funnel)?.order ?? 9) ||
                    b.db.total - a.db.total
                )
                .map((jd) => {
                const activeCount = jd.db.total - jd.db.matched;
                const canClose = isClosedFunnel(jd.funnel) && (jd.db.screened + jd.db.readyToForward + jd.db.sentToCompany + jd.db.interviewing + jd.db.offer > 0);
                return (
                  <tr key={`${jd.opsCode}-${jd.jdCode}`} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <span className="text-gray-900">{jd.company}</span>
                        {jd.jdCode && (
                          <span className="text-[11px] text-[#3182F6] bg-[#E8F3FF] px-1.5 py-0.5 rounded">{jd.jdCode}</span>
                        )}
                      </div>
                      {jd.position && <p className="text-[11px] text-gray-500 mt-0.5 max-w-[360px] truncate">{jd.position}</p>}
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] whitespace-nowrap"
                        style={{ backgroundColor: funnelColor(jd.funnel) + "18", color: funnelColor(jd.funnel) }}>
                        {funnelLabel(jd.funnel)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-gray-900 whitespace-nowrap">{jd.db.total || "—"}</td>
                    <td className="px-3 py-3 text-right text-gray-900 whitespace-nowrap">{jd.db.screened || "—"}</td>
                    <td className="px-3 py-3 text-right text-gray-900 whitespace-nowrap">{jd.db.readyToForward || "—"}</td>
                    <td className="px-3 py-3 text-right text-gray-900 whitespace-nowrap">{jd.db.sentToCompany || "—"}</td>
                    <td className="px-3 py-3 text-right text-gray-900 whitespace-nowrap">{jd.db.interviewing || "—"}</td>
                    <td className="px-3 py-3 text-right text-gray-900 whitespace-nowrap">{jd.db.offer || "—"}</td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      {jd.db.matched ? <span className="text-[#1D9E75] font-medium">{jd.db.matched}</span> : "—"}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[400px]">
                        {Object.entries(jd.sheetStatusCounts).map(([s, n]) => (
                          <span key={s} className="text-[11px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                            {sheetStatusLabel(s)} {n}
                          </span>
                        ))}
                        {jd.sheetCount === 0 && <span className="text-[11px] text-gray-400">—</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {canClose && (
                        <button onClick={() => requestClose(jd)} disabled={closing !== null}
                          className="px-3 py-1.5 text-[12px] rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors whitespace-nowrap disabled:opacity-50">
                          {closing === jd.jdCode ? t("dash.processing") : t("dash.closeRemaining")}
                        </button>
                      )}
                      {isClosedFunnel(jd.funnel) && !canClose && activeCount === 0 && (
                        <span className="text-[11px] text-gray-400 whitespace-nowrap">{t("dash.cleared")}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {pullConfirm && (
        <ConfirmModal
          title={t("dash.pullSheet")}
          message={
            (lang === "ko"
              ? `Qualified 시트 Status 기준으로 ${pullConfirm.count}명의 앱 상태를 업데이트합니다.\n(앞 단계로 되돌리지 않으며, 매칭 완료는 변경하지 않습니다)\n\n`
              : lang === "vi"
              ? `Cập nhật ${pullConfirm.count} UV theo Status trong sheet.\n(Không lùi giai đoạn, không đổi UV đã match)\n\n`
              : `Update ${pullConfirm.count} candidates from sheet Status.\n(No backward moves; matched candidates untouched)\n\n`) +
            pullConfirm.sample.join("\n") +
            (pullConfirm.count > 8 ? `\n… +${pullConfirm.count - 8}` : "")
          }
          confirmLabel={t("dash.pullSheet")}
          onConfirm={executePull}
          onCancel={() => setPullConfirm(null)}
        />
      )}

      {hiresConfirm && (
        <ConfirmModal
          title={t("dash.syncHires")}
          message={
            lang === "ko"
              ? `KTC Ops 입사자 명단 ${hiresConfirm.employeeCount}명 기준으로 동기화합니다.\n\n· 입사 확정(매칭 완료) 처리: ${hiresConfirm.promote}명\n· 명단에 없는 기존 "매칭 완료" → 기업 발송으로 이동: ${hiresConfirm.demote}명\n· DB에서 못 찾은 입사자(채널 외 유입): ${hiresConfirm.unmatched}명 (변경 없음)`
              : lang === "vi"
              ? `Đồng bộ theo danh sách ${hiresConfirm.employeeCount} nhân sự trong KTC Ops.\n\n· Xác nhận đã match: ${hiresConfirm.promote}\n· Chuyển "đã match" không có trong danh sách → đã gửi DN: ${hiresConfirm.demote}\n· Không tìm thấy trong DB: ${hiresConfirm.unmatched} (không đổi)`
              : `Sync against ${hiresConfirm.employeeCount} hires in KTC Ops.\n\n· Mark as matched: ${hiresConfirm.promote}\n· Existing "matched" not in list → sent to company: ${hiresConfirm.demote}\n· Not found in DB: ${hiresConfirm.unmatched} (unchanged)`
          }
          confirmLabel={t("dash.syncHires")}
          onConfirm={executeSyncHires}
          onCancel={() => setHiresConfirm(null)}
        />
      )}

      {confirmTarget && (
        <ConfirmModal
          title={`${confirmTarget.jd.jdCode} ${t("dash.closeRemaining")}`}
          message={
            lang === "ko"
              ? `${confirmTarget.jd.company} — ${funnelLabel(confirmTarget.jd.funnel)}\n\nDB ${confirmTarget.dbCount}명, Qualified 시트 ${confirmTarget.sheetCount}행이 탈락 처리됩니다. 매칭 완료된 후보는 제외됩니다.`
              : lang === "vi"
              ? `${confirmTarget.jd.company} — ${funnelLabel(confirmTarget.jd.funnel)}\n\nSẽ loại ${confirmTarget.dbCount} UV trong DB và ${confirmTarget.sheetCount} dòng trong sheet. UV đã match không bị ảnh hưởng.`
              : `${confirmTarget.jd.company} — ${funnelLabel(confirmTarget.jd.funnel)}\n\n${confirmTarget.dbCount} candidates in DB and ${confirmTarget.sheetCount} sheet rows will be rejected. Matched candidates are excluded.`
          }
          confirmLabel={t("dash.closeRemaining")}
          danger
          onConfirm={executeClose}
          onCancel={() => setConfirmTarget(null)}
        />
      )}
    </div>
  );
}
