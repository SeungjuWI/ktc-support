"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAdminI18n } from "@/lib/admin-i18n";

interface DeliveryItem {
  id: string;
  candidate_name: string;
  applied_company: string;
  applied_position: string;
  yoe: string;
  screening_score: number | null;
  strengths_ko: string[];
  ai_summary: string;
  cv_url: string;
  total_score: number | null;
  completed_at: string | null;
}

function extractFirstSentence(text: string): string {
  if (!text) return "";
  // 한국어 문장 끝: ~입니다. ~습니다. ~있습니다. ~됩니다. ~봤습니다. 등
  const match = text.match(/^.+?[다임음됨함]\.?\s/);
  if (match) return match[0].trim();
  // 마침표 기준 fallback
  const dotIdx = text.indexOf(". ");
  if (dotIdx > 0) return text.slice(0, dotIdx + 1);
  return text;
}

export default function DeliveryPage() {
  const { t } = useAdminI18n();
  const [items, setItems] = useState<DeliveryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/delivery");
      const json = await res.json();
      setItems(json.items || []);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const companies = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => { if (i.applied_company) set.add(i.applied_company); });
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    if (companyFilter === "all") return items;
    return items.filter((i) => i.applied_company === companyFilter);
  }, [items, companyFilter]);

  // 회사별 지원자 번호 매기기
  const withSeqNo = useMemo(() => {
    const counterMap: Record<string, number> = {};
    return filtered.map((item) => {
      const company = item.applied_company || "미지정";
      counterMap[company] = (counterMap[company] || 0) + 1;
      return { ...item, seqNo: counterMap[company] };
    });
  }, [filtered]);

  const exportCsv = () => {
    const headers = [
      "기업명", "이름", "영어 이름(공란 가능)", "경력", "지원 포지션",
      "매칭점수", "총평(3줄)", "인터뷰 결과", "이력서_파일ID(구드 링크)", "지원자 번호",
    ];
    const rows = withSeqNo.map((item) => [
      item.applied_company,
      item.candidate_name,
      item.candidate_name,
      item.yoe || "",
      item.applied_position,
      item.screening_score !== null ? String(item.screening_score) : "",
      item.strengths_ko.slice(0, 3).join(" / "),
      extractFirstSentence(item.ai_summary),
      item.cv_url,
      String(item.seqNo),
    ]);

    const bom = "\uFEFF";
    const csv = bom + [headers, ...rows]
      .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const companyName = companyFilter !== "all" ? `_${companyFilter}` : "";
    a.download = `delivery${companyName}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-[22px] font-medium text-gray-900">기업 전달용</h1>
          <p className="text-[13px] text-gray-500 mt-1">
            AI 인터뷰 PASS 확정 인원 · {filtered.length}명
            {companyFilter !== "all" && ` (${companyFilter})`}
          </p>
        </div>
        <button
          onClick={exportCsv}
          className="flex items-center gap-1.5 border-[0.5px] border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl text-[14px] font-medium transition-colors duration-100"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          CSV
        </button>
      </div>

      {/* 필터 */}
      <div className="flex gap-3 mb-4 items-center">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-2 border-[0.5px] border-gray-200 rounded-full text-[13px] bg-white text-gray-700 cursor-pointer hover:border-gray-300 transition-colors duration-100"
          >
            <span className="truncate max-w-[160px]">
              {companyFilter === "all" ? t("common.all") : companyFilter}
            </span>
            <svg
              className={`text-gray-400 transition-transform duration-100 ${dropdownOpen ? "rotate-180" : ""}`}
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border-[0.5px] border-gray-200 rounded-xl overflow-hidden z-50 min-w-[240px]">
              <button
                onClick={() => { setCompanyFilter("all"); setDropdownOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-[13px] hover:bg-gray-50 transition-colors duration-100 ${companyFilter === "all" ? "bg-gray-50 text-gray-900 font-medium" : "text-gray-700"}`}
              >
                <span>{t("common.all")}</span>
                <span className="text-[12px] text-gray-400">{items.length}명</span>
              </button>
              <div className="border-t border-gray-100" />
              {companies.map((c) => {
                const count = items.filter((i) => i.applied_company === c).length;
                return (
                  <button
                    key={c}
                    onClick={() => { setCompanyFilter(c); setDropdownOpen(false); }}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 text-[13px] hover:bg-gray-50 transition-colors duration-100 ${companyFilter === c ? "bg-gray-50 text-gray-900 font-medium" : "text-gray-700"}`}
                  >
                    <span className="truncate max-w-[160px]">{c}</span>
                    <span className="text-[12px] text-gray-400">{count}명</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 text-[14px]">{t("common.loading")}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-[14px]">PASS 확정 인원이 없습니다.</div>
      ) : (
        <div className="bg-white rounded-2xl border-[0.5px] border-gray-200/60 overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-gray-500 font-medium whitespace-nowrap">No.</th>
                <th className="px-3 py-3 text-left text-gray-500 font-medium whitespace-nowrap">기업명</th>
                <th className="px-3 py-3 text-left text-gray-500 font-medium whitespace-nowrap">이름</th>
                <th className="px-3 py-3 text-left text-gray-500 font-medium whitespace-nowrap">경력</th>
                <th className="px-3 py-3 text-left text-gray-500 font-medium whitespace-nowrap">지원 포지션</th>
                <th className="px-3 py-3 text-left text-gray-500 font-medium whitespace-nowrap">매칭점수</th>
                <th className="px-3 py-3 text-left text-gray-500 font-medium min-w-[240px]">총평 (3줄)</th>
                <th className="px-3 py-3 text-left text-gray-500 font-medium min-w-[240px]">인터뷰 결과 (3줄)</th>
                <th className="px-3 py-3 text-left text-gray-500 font-medium whitespace-nowrap">이력서</th>
              </tr>
            </thead>
            <tbody>
              {withSeqNo.map((item, idx) => {
                const prevCompany = idx > 0 ? withSeqNo[idx - 1].applied_company : null;
                const isNewCompany = item.applied_company !== prevCompany;
                return (
                  <tr
                    key={item.id}
                    className={`border-t hover:bg-gray-50/50 transition-colors duration-100 ${isNewCompany && idx > 0 ? "border-t-2 border-gray-300" : "border-gray-100"}`}
                  >
                    <td className="px-3 py-3 text-gray-400 text-[12px]">{item.seqNo}</td>
                    <td className="px-3 py-3 text-[12px] text-gray-700 whitespace-nowrap">{item.applied_company || "—"}</td>
                    <td className="px-3 py-3 font-medium text-gray-900 whitespace-nowrap">{item.candidate_name || "—"}</td>
                    <td className="px-3 py-3 text-[12px] text-gray-600 whitespace-nowrap">{item.yoe || "—"}</td>
                    <td className="px-3 py-3 text-[12px] text-gray-600 whitespace-nowrap">{item.applied_position || "—"}</td>
                    <td className="px-3 py-3 text-center">
                      {item.screening_score !== null ? (
                        <span className={`text-[13px] font-medium px-2 py-1 rounded-full ${
                          item.screening_score >= 85
                            ? "bg-grade-s-bg text-grade-s-text"
                            : item.screening_score >= 70
                            ? "bg-blue-50 text-blue-500"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {item.screening_score}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-[12px] text-gray-700">
                      {item.strengths_ko.length > 0 ? (
                        <ul className="space-y-0.5">
                          {item.strengths_ko.slice(0, 3).map((s, i) => (
                            <li key={i} className="leading-snug">{s}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-[12px] text-gray-700">
                      {item.ai_summary ? (
                        <div className="whitespace-pre-wrap leading-snug">
                          {extractFirstSentence(item.ai_summary)}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-[12px]">
                      {item.cv_url ? (
                        <a
                          href={item.cv_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-600 hover:underline"
                        >
                          이력서
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
