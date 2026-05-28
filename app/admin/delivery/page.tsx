"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAdminI18n } from "@/lib/admin-i18n";
import ConfirmModal from "@/app/components/ConfirmModal";

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
  const match = text.match(/^.+?[다임음됨함]\.?\s/);
  if (match) return match[0].trim();
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

  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState<Record<string, Partial<DeliveryItem>>>({});
  const [saving, setSaving] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  const fetchItems = async () => {
    const res = await fetch("/api/admin/delivery");
    const json = await res.json();
    setItems(json.items || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // 모달 열릴 때 배경 스크롤 방지
  useEffect(() => {
    document.body.style.overflow = showEditModal ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [showEditModal]);

  const companies = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => { if (i.applied_company) set.add(i.applied_company); });
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    if (companyFilter === "all") return items;
    return items.filter((i) => i.applied_company === companyFilter);
  }, [items, companyFilter]);

  const withSeqNo = useMemo(() => {
    const counterMap: Record<string, number> = {};
    return filtered.map((item) => {
      const company = item.applied_company || "미지정";
      counterMap[company] = (counterMap[company] || 0) + 1;
      return { ...item, seqNo: counterMap[company] };
    });
  }, [filtered]);

  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };
  const toggleSelectAll = () => {
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map(i => i.id)));
  };
  const toggleBulkMode = () => { setBulkMode(v => !v); setSelected(new Set()); };

  const openEditModal = () => { setEditData({}); setShowEditModal(true); };
  const closeEditModal = () => { setEditData({}); setShowEditModal(false); };

  const getEditVal = (item: DeliveryItem, field: keyof DeliveryItem) => editData[item.id]?.[field] ?? item[field];
  const setEditVal = (id: string, field: string, value: unknown) => {
    setEditData(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const saveEdits = async () => {
    const updates = Object.entries(editData).map(([id, fields]) => ({ id, ...fields }));
    if (updates.length === 0) { closeEditModal(); return; }
    setSaving(true);
    await fetch("/api/admin/delivery", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates }),
    });
    setSaving(false);
    closeEditModal();
    fetchItems();
  };

  const bulkRemove = async () => {
    if (selected.size === 0) return;
    setShowRemoveConfirm(false);
    await fetch("/api/admin/candidates/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected), action: "change_status", value: "rejected" }),
    });
    setSelected(new Set());
    fetchItems();
  };

  const exportCsv = () => {
    const headers = [
      "기업명", "이름", "영어 이름(공란 가능)", "경력", "지원 포지션",
      "매칭점수", "총평(3줄)", "인터뷰 결과", "이력서_파일ID(구드 링크)", "지원자 번호",
    ];
    const rows = withSeqNo.map((item) => [
      item.applied_company, item.candidate_name, item.candidate_name,
      item.yoe || "", item.applied_position,
      item.screening_score !== null ? String(item.screening_score) : "",
      item.strengths_ko.slice(0, 3).join(" / "),
      extractFirstSentence(item.ai_summary), item.cv_url, String(item.seqNo),
    ]);
    const bom = "\uFEFF";
    const csv = bom + [headers, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `delivery${companyFilter !== "all" ? `_${companyFilter}` : ""}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 읽기 전용 테이블 행
  const readRow = (item: DeliveryItem & { seqNo: number }, idx: number) => {
    const prevCompany = idx > 0 ? withSeqNo[idx - 1].applied_company : null;
    const isNewCompany = item.applied_company !== prevCompany;
    const isSelected = selected.has(item.id);
    return (
      <tr key={item.id}
        onClick={bulkMode ? () => toggleSelect(item.id) : undefined}
        className={`border-t transition-colors duration-100 ${isNewCompany && idx > 0 ? "border-t-2 border-gray-300" : "border-gray-100"} ${bulkMode ? "cursor-pointer" : ""} ${bulkMode && isSelected ? "bg-[#E8F3FF] border-l-2 border-l-[#3182F6]" : "hover:bg-gray-50/50"}`}>
        <td className="px-3 py-3 text-gray-400 text-[12px]">{item.seqNo}</td>
        <td className="px-3 py-3 text-[12px] text-gray-700 max-w-[120px] truncate" title={item.applied_company}>{item.applied_company || "—"}</td>
        <td className="px-3 py-3 font-medium text-gray-900 whitespace-nowrap">{item.candidate_name || "—"}</td>
        <td className="px-3 py-3 text-[12px] text-gray-600 whitespace-nowrap">{item.yoe || "—"}</td>
        <td className="px-3 py-3 text-[12px] text-gray-600 max-w-[140px] truncate" title={item.applied_position}>{item.applied_position || "—"}</td>
        <td className="px-3 py-3 text-center">
          {item.screening_score !== null ? (
            <span className={`text-[13px] font-medium px-2 py-1 rounded-full ${item.screening_score >= 85 ? "bg-grade-s-bg text-grade-s-text" : item.screening_score >= 70 ? "bg-blue-50 text-blue-500" : "bg-gray-100 text-gray-600"}`}>
              {item.screening_score}
            </span>
          ) : <span className="text-gray-400">—</span>}
        </td>
        <td className="px-3 py-3 text-[12px] text-gray-700">
          {item.strengths_ko.length > 0 ? (
            <ul className="space-y-0.5">{item.strengths_ko.slice(0, 3).map((s, i) => <li key={i} className="leading-snug">{s}</li>)}</ul>
          ) : <span className="text-gray-400">—</span>}
        </td>
        <td className="px-3 py-3 text-[12px] text-gray-700">
          {item.ai_summary ? <div className="whitespace-pre-wrap leading-snug">{extractFirstSentence(item.ai_summary)}</div> : <span className="text-gray-400">—</span>}
        </td>
        <td className="px-3 py-3 text-[12px]">
          {item.cv_url ? <a href={item.cv_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 hover:underline">이력서</a> : <span className="text-gray-400">—</span>}
        </td>
      </tr>
    );
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
        <div className="flex gap-2">
          <button onClick={toggleBulkMode}
            className={`px-4 py-2 rounded-xl text-[13px] transition-colors duration-100 ${bulkMode ? "bg-gray-900 text-white" : "bg-white border-[0.5px] border-gray-200 text-gray-700 hover:border-gray-300"}`}>
            {bulkMode ? t("bulk.deselectAll") : t("bulk.selectMode")}
          </button>
          <button onClick={exportCsv}
            className="flex items-center gap-1.5 border-[0.5px] border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl text-[13px] font-medium transition-colors duration-100">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            CSV
          </button>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex gap-3 mb-4 items-center">
        <div className="relative" ref={dropdownRef}>
          <button onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-2 border-[0.5px] border-gray-200 rounded-full text-[13px] bg-white text-gray-700 cursor-pointer hover:border-gray-300 transition-colors duration-100">
            <span className="truncate max-w-[160px]">{companyFilter === "all" ? t("common.all") : companyFilter}</span>
            <svg className={`text-gray-400 transition-transform duration-100 ${dropdownOpen ? "rotate-180" : ""}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border-[0.5px] border-gray-200 rounded-xl overflow-hidden z-50 min-w-[240px]">
              <button onClick={() => { setCompanyFilter("all"); setDropdownOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-[13px] hover:bg-gray-50 ${companyFilter === "all" ? "bg-gray-50 text-gray-900 font-medium" : "text-gray-700"}`}>
                <span>{t("common.all")}</span><span className="text-[12px] text-gray-400">{items.length}명</span>
              </button>
              <div className="border-t border-gray-100" />
              {companies.map((c) => (
                <button key={c} onClick={() => { setCompanyFilter(c); setDropdownOpen(false); }}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 text-[13px] hover:bg-gray-50 ${companyFilter === c ? "bg-gray-50 text-gray-900 font-medium" : "text-gray-700"}`}>
                  <span className="truncate max-w-[160px]">{c}</span>
                  <span className="text-[12px] text-gray-400">{items.filter((i) => i.applied_company === c).length}명</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 text-[14px]">{t("common.loading")}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-[14px]">PASS 확정 인원이 없습니다.</div>
      ) : (
        <div className={`bg-white rounded-2xl border-[0.5px] border-gray-200/60 overflow-x-auto ${bulkMode && selected.size > 0 ? "mb-16" : ""}`}>
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
            <tbody>{withSeqNo.map((item, idx) => readRow(item, idx))}</tbody>
          </table>
        </div>
      )}

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
            <button onClick={openEditModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-medium bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              내용 수정
            </button>
            <button onClick={() => setShowRemoveConfirm(true)}
              className="px-4 py-2 rounded-xl text-[13px] font-medium bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
              목록에서 제외
            </button>
          </div>
        </div>
      )}

      {/* 편집 모달 — 풀스크린 */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <div>
              <h2 className="text-[18px] font-medium text-gray-900">내용 수정</h2>
              <p className="text-[13px] text-gray-500 mt-0.5">셀을 직접 클릭하여 수정 · 변경사항은 저장 시 반영됩니다</p>
            </div>
            <div className="flex gap-2">
              <button onClick={closeEditModal}
                className="px-4 py-2 rounded-xl text-[13px] bg-white border border-gray-200 text-gray-700 hover:border-gray-300 transition-colors">
                {t("common.cancel")}
              </button>
              <button onClick={() => setShowSaveConfirm(true)} disabled={saving || Object.keys(editData).length === 0}
                className="px-5 py-2 rounded-xl text-[13px] bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50">
                {saving ? t("common.loading") : `${t("common.save")} ${Object.keys(editData).length > 0 ? `(${Object.keys(editData).length})` : ""}`}
              </button>
            </div>
          </div>

          {/* 테이블 */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-3 text-left text-gray-500 font-medium whitespace-nowrap w-[50px]">No.</th>
                  <th className="px-3 py-3 text-left text-gray-500 font-medium whitespace-nowrap w-[140px]">기업명</th>
                  <th className="px-3 py-3 text-left text-gray-500 font-medium whitespace-nowrap w-[120px]">이름</th>
                  <th className="px-3 py-3 text-left text-gray-500 font-medium whitespace-nowrap w-[60px]">경력</th>
                  <th className="px-3 py-3 text-left text-gray-500 font-medium whitespace-nowrap w-[140px]">지원 포지션</th>
                  <th className="px-3 py-3 text-left text-gray-500 font-medium whitespace-nowrap w-[60px]">점수</th>
                  <th className="px-3 py-3 text-left text-gray-500 font-medium min-w-[260px]">총평 (3줄)</th>
                  <th className="px-3 py-3 text-left text-gray-500 font-medium min-w-[260px]">인터뷰 결과</th>
                  <th className="px-3 py-3 text-left text-gray-500 font-medium w-[200px]">이력서 URL</th>
                </tr>
              </thead>
              <tbody>
                {withSeqNo.map((item, idx) => {
                  const prevCompany = idx > 0 ? withSeqNo[idx - 1].applied_company : null;
                  const isNewCompany = item.applied_company !== prevCompany;
                  const isEdited = !!editData[item.id];
                  return (
                    <tr key={item.id}
                      className={`border-t ${isNewCompany && idx > 0 ? "border-t-2 border-gray-300" : "border-gray-100"} ${isEdited ? "bg-blue-50/30" : "hover:bg-gray-50/50"}`}>
                      <td className="px-3 py-2 text-gray-400 text-[12px]">{item.seqNo}</td>
                      <td className="px-3 py-1">
                        <input type="text" value={(getEditVal(item, "applied_company") as string) || ""}
                          onChange={(e) => setEditVal(item.id, "applied_company", e.target.value)}
                          className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-[12px] outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20" />
                      </td>
                      <td className="px-3 py-1">
                        <input type="text" value={(getEditVal(item, "candidate_name") as string) || ""}
                          onChange={(e) => setEditVal(item.id, "candidate_name", e.target.value)}
                          className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-[12px] font-medium outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20" />
                      </td>
                      <td className="px-3 py-1">
                        <input type="text" value={(getEditVal(item, "yoe") as string) || ""}
                          onChange={(e) => setEditVal(item.id, "yoe", e.target.value)}
                          className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-[12px] outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20" />
                      </td>
                      <td className="px-3 py-1">
                        <input type="text" value={(getEditVal(item, "applied_position") as string) || ""}
                          onChange={(e) => setEditVal(item.id, "applied_position", e.target.value)}
                          className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-[12px] outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20" />
                      </td>
                      <td className="px-3 py-2 text-center text-[12px] text-gray-500">
                        {item.screening_score ?? "—"}
                      </td>
                      <td className="px-3 py-1">
                        <textarea
                          value={(() => { const v = editData[item.id]?.strengths_ko ?? item.strengths_ko; return Array.isArray(v) ? v.join("\n") : ""; })()}
                          onChange={(e) => setEditVal(item.id, "strengths_ko", e.target.value.split("\n"))}
                          rows={3}
                          className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-[12px] outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 resize-none leading-snug" />
                      </td>
                      <td className="px-3 py-1">
                        <textarea
                          value={(getEditVal(item, "ai_summary") as string) || ""}
                          onChange={(e) => setEditVal(item.id, "ai_summary", e.target.value)}
                          rows={3}
                          className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-[12px] outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 resize-none leading-snug" />
                      </td>
                      <td className="px-3 py-1">
                        <input type="text" value={(getEditVal(item, "cv_url") as string) || ""}
                          onChange={(e) => setEditVal(item.id, "cv_url", e.target.value)}
                          placeholder="URL"
                          className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-[12px] outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showRemoveConfirm && (
        <ConfirmModal
          title={`${selected.size}명 목록에서 제외`}
          message={`선택한 ${selected.size}명을 기업 전달 목록에서 제외합니다.\n(불합격 처리되며 목록에서 사라집니다)`}
          confirmLabel="제외"
          danger
          onConfirm={bulkRemove}
          onCancel={() => setShowRemoveConfirm(false)}
        />
      )}

      {showSaveConfirm && (
        <ConfirmModal
          title={`${Object.keys(editData).length}명 내용 수정`}
          message={`${Object.keys(editData).length}명의 정보를 수정합니다.\n저장 후 되돌릴 수 없습니다.`}
          confirmLabel={t("common.save")}
          onConfirm={() => { setShowSaveConfirm(false); saveEdits(); }}
          onCancel={() => setShowSaveConfirm(false)}
        />
      )}
    </div>
  );
}
