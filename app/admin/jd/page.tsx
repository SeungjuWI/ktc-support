"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { JD_MAP, loadAllJDs, type JobDescription } from "@/lib/jd-data";
import { useAdminI18n } from "@/lib/admin-i18n";

interface JDPosting {
  id: string;
  jd_code: string;
  platform: string;
  url: string;
  posted_at: string | null;
  status: string;
  created_at: string;
}

interface JDWithStats {
  code: string;
  jd: JobDescription;
  totalCandidates: number;
  statusCounts: Record<string, number>;
}

const PLATFORM_OPTIONS = [
  "ITviec", "LinkedIn", "TopDev", "Glint", "YBOX", "VietnamWorks",
  "Facebook", "자사 사이트", "기타",
];

export default function JDPage() {
  const { t } = useAdminI18n();
  const [jdList, setJdList] = useState<JDWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [postings, setPostings] = useState<Record<string, JDPosting[]>>({});
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddJD, setShowAddJD] = useState(false);
  const [editingJDCode, setEditingJDCode] = useState<string | null>(null);
  const [dbJDCodes, setDbJDCodes] = useState<Set<string>>(new Set());
  const [searchingFor, setSearchingFor] = useState<string | null>(null);

  const loadPostings = async () => {
    const { data } = await supabase
      .from("jd_postings")
      .select("*")
      .order("created_at", { ascending: false });

    const grouped: Record<string, JDPosting[]> = {};
    (data || []).forEach((p: JDPosting) => {
      if (!grouped[p.jd_code]) grouped[p.jd_code] = [];
      grouped[p.jd_code].push(p);
    });
    setPostings(grouped);
  };

  const loadJDs = async () => {
    // 하드코딩 JD 중 DB에 없는 것 자동 삽입
    const { data: dbJDs } = await supabase.from("jd_definitions").select("code");
    const existingCodes = new Set((dbJDs || []).map((r: { code: string }) => r.code));
    const missing = Object.entries(JD_MAP).filter(([code]) => !existingCodes.has(code));
    if (missing.length > 0) {
      await supabase.from("jd_definitions").upsert(
        missing.map(([code, jd]) => ({
          code,
          company: jd.company,
          position: jd.position,
          experience: jd.experience,
          hires: jd.hires,
          salary: jd.salary,
          responsibilities: jd.responsibilities,
          qualifications: jd.qualifications,
          preferred: jd.preferred,
        }))
      );
    }

    const allJDs = await loadAllJDs(supabase as never);

    const { data: dbJDsRefresh } = await supabase.from("jd_definitions").select("code");
    setDbJDCodes(new Set((dbJDsRefresh || []).map((r: { code: string }) => r.code)));

    const { data: candidates } = await supabase
      .from("candidates")
      .select("applied_job, pipeline_status");

    const countsByCode: Record<string, Record<string, number>> = {};

    (candidates || []).forEach((c) => {
      const match = c.applied_job?.match(/^([A-Z]+\d+)/);
      if (!match) return;
      const code = match[1];
      if (!countsByCode[code]) countsByCode[code] = {};
      countsByCode[code][c.pipeline_status] = (countsByCode[code][c.pipeline_status] || 0) + 1;
    });

    const list: JDWithStats[] = Object.entries(allJDs).map(([code, jd]) => {
      const statusCounts = countsByCode[code] || {};
      const totalCandidates = Object.values(statusCounts).reduce((a, b) => a + b, 0);
      return { code, jd, totalCandidates, statusCounts };
    });

    setJdList(list);
    setLoading(false);
  };

  useEffect(() => {
    loadJDs();
    loadPostings();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-[14px] text-gray-500">{t("common.loading")}</p>
      </div>
    );
  }

  const totalJDs = jdList.length;
  const activeJDs = jdList.filter((j) => j.totalCandidates > 0).length;
  const totalHires = jdList.reduce((sum, j) => sum + j.jd.hires, 0);
  const totalCandidatesAll = jdList.reduce((sum, j) => sum + j.totalCandidates, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[22px] font-medium text-gray-900">{t("nav.jd")}</h1>
        <button
          onClick={() => { setShowAddJD(true); setEditingJDCode(null); }}
          className="px-4 py-2 text-[13px] text-white bg-[#3182F6] rounded-xl hover:bg-[#2272EB] transition-colors"
        >
          {t("jd.addNew")}
        </button>
      </div>

      {showAddJD && (
        <JDDefinitionForm
          t={t}
          onSave={() => { setShowAddJD(false); loadJDs(); }}
          onCancel={() => setShowAddJD(false)}
        />
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard label={t("jd.totalJD")} value={totalJDs} color="#191F28" />
        <StatCard label={t("jd.activeJD")} value={activeJDs} color="#3182F6" />
        <StatCard label={t("jd.totalHires")} value={totalHires} color="#1D9E75" />
        <StatCard label={t("jd.totalApplicants")} value={totalCandidatesAll} color="#E8590C" />
      </div>

      <div className="space-y-3">
        {jdList.map((item) => (
          <div key={item.code} className="bg-white rounded-2xl border border-gray-200/60 overflow-hidden">
            <div
              onClick={() => setExpandedCode(expandedCode === item.code ? null : item.code)}
              className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="flex-shrink-0">
                <span className={`inline-block px-2.5 py-1 rounded-lg text-[13px] font-medium ${
                  item.totalCandidates > 0
                    ? "bg-[#E8F3FF] text-[#3182F6]"
                    : "bg-gray-100 text-gray-500"
                }`}>
                  {item.code}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[14px] font-medium text-gray-900 truncate">{item.jd.position}</span>
                </div>
                <div className="flex items-center gap-2 text-[12px] text-gray-500">
                  <span>{item.jd.company}</span>
                  <span>·</span>
                  <span>{item.jd.experience}</span>
                  <span>·</span>
                  <span>{item.jd.salary}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] text-gray-500">{t("jd.hires")}</span>
                    <span className="text-[14px] font-medium text-gray-900">{item.jd.hires}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] text-gray-500">{t("jd.applicants")}</span>
                    <span className={`text-[14px] font-medium ${item.totalCandidates > 0 ? "text-[#3182F6]" : "text-gray-400"}`}>
                      {item.totalCandidates}
                    </span>
                  </div>
                </div>
                {dbJDCodes.has(item.code) && (
                  <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => { setEditingJDCode(item.code); setShowAddJD(false); }}
                      className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                      title={t("common.edit")}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`"${item.code}" — ${t("jd.deleteConfirm")}`)) return;
                        await supabase.from("jd_definitions").delete().eq("code", item.code);
                        loadJDs();
                      }}
                      className="p-1.5 text-gray-400 hover:text-[#E8590C] transition-colors"
                      title={t("common.delete")}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                )}
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="#B0B8C1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className={`transition-transform duration-100 ${expandedCode === item.code ? "rotate-180" : ""}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>

            {editingJDCode === item.code && (
              <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                <JDDefinitionForm
                  t={t}
                  initial={{ code: item.code, ...item.jd }}
                  onSave={() => { setEditingJDCode(null); loadJDs(); }}
                  onCancel={() => setEditingJDCode(null)}
                />
              </div>
            )}

            {expandedCode === item.code && (
              <div className="px-5 pb-5 border-t border-gray-100">
                <div className="flex items-center justify-between pt-4 mb-4">
                  <div className="flex flex-wrap gap-1.5">
                    {item.totalCandidates > 0 && Object.entries(item.statusCounts).map(([status, count]) => (
                      <span key={status} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px]"
                        style={{ backgroundColor: pipelineStatusColor(status) + "18", color: pipelineStatusColor(status) }}>
                        {t(`status.${status}`)} {count}
                      </span>
                    ))}
                    {item.totalCandidates === 0 && (
                      <span className="text-[11px] text-gray-400">{t("jd.applicants")} 0</span>
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
                    jdPosition={item.jd.position}
                    onDone={() => { setSearchingFor(null); loadJDs(); }}
                  />
                )}

                <div className="space-y-3">
                  <DetailSection title="Responsibilities" content={item.jd.responsibilities} />
                  <DetailSection title="Qualifications" content={item.jd.qualifications} />
                  {item.jd.preferred && <DetailSection title="Preferred" content={item.jd.preferred} />}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
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
                    !addingFor && (
                      <p className="text-[11px] text-gray-400 py-2">{t("jd.noPostings")}</p>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
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
    sent_to_company: "#E8590C",
    interviewing: "#6B7684",
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
  onSave,
  onCancel,
}: {
  t: TFn;
  initial?: JDFormData;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<JDFormData>(
    initial || {
      code: "",
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
    <div className="bg-white rounded-2xl border border-gray-200/60 p-5 mb-5 space-y-3">
      <p className="text-[14px] font-medium text-gray-900 mb-2">
        {isEdit ? `${t("jd.form.editTitle")} — ${initial.code}` : t("jd.form.addTitle")}
      </p>

      {error && (
        <p className="text-[11px] text-[#E8590C] bg-[#FFF8F0] px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="text-[10px] text-gray-500 mb-0.5 block">{t("jd.form.code")} *</label>
          <input
            value={form.code}
            onChange={(e) => set("code", e.target.value)}
            disabled={isEdit}
            placeholder="ABC101"
            className="w-full text-[12px] px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-900 outline-none focus:border-[#3182F6] disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 mb-0.5 block">{t("jd.form.company")} *</label>
          <input
            value={form.company}
            onChange={(e) => set("company", e.target.value)}
            className="w-full text-[12px] px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-900 outline-none focus:border-[#3182F6]"
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 mb-0.5 block">{t("jd.form.position")} *</label>
          <input
            value={form.position}
            onChange={(e) => set("position", e.target.value)}
            className="w-full text-[12px] px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-900 outline-none focus:border-[#3182F6]"
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 mb-0.5 block">{t("jd.form.hires")}</label>
          <input
            type="number"
            min={1}
            value={form.hires}
            onChange={(e) => set("hires", parseInt(e.target.value) || 1)}
            className="w-full text-[12px] px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-900 outline-none focus:border-[#3182F6]"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-gray-500 mb-0.5 block">{t("jd.form.experience")}</label>
          <input
            value={form.experience}
            onChange={(e) => set("experience", e.target.value)}
            placeholder="3-5 years"
            className="w-full text-[12px] px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-900 outline-none focus:border-[#3182F6]"
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 mb-0.5 block">{t("jd.form.salary")}</label>
          <input
            value={form.salary}
            onChange={(e) => set("salary", e.target.value)}
            placeholder="20M – 30M VND"
            className="w-full text-[12px] px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-900 outline-none focus:border-[#3182F6]"
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] text-gray-500 mb-0.5 block">Responsibilities</label>
        <textarea
          value={form.responsibilities}
          onChange={(e) => set("responsibilities", e.target.value)}
          rows={4}
          className="w-full text-[12px] px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-900 outline-none focus:border-[#3182F6] resize-y"
        />
      </div>

      <div>
        <label className="text-[10px] text-gray-500 mb-0.5 block">Qualifications</label>
        <textarea
          value={form.qualifications}
          onChange={(e) => set("qualifications", e.target.value)}
          rows={4}
          className="w-full text-[12px] px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-900 outline-none focus:border-[#3182F6] resize-y"
        />
      </div>

      <div>
        <label className="text-[10px] text-gray-500 mb-0.5 block">Preferred</label>
        <textarea
          value={form.preferred}
          onChange={(e) => set("preferred", e.target.value)}
          rows={3}
          className="w-full text-[12px] px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-900 outline-none focus:border-[#3182F6] resize-y"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-[12px] text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {t("common.cancel")}
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="px-4 py-2 text-[12px] text-white bg-[#3182F6] rounded-lg hover:bg-[#2272EB] disabled:opacity-50 transition-colors"
        >
          {saving ? t("jd.form.saving") : isEdit ? t("common.edit") : t("jd.form.add")}
        </button>
      </div>
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
  jdPosition,
  onDone,
}: {
  t: TFn;
  jdCode: string;
  jdPosition: string;
  onDone: () => void;
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

  const handleAdd = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    const newAppliedJob = `${jdCode} - ${jdPosition}`;
    const ids = Array.from(selected);

    for (const id of ids) {
      await supabase.from("candidates").update({
        applied_job: newAppliedJob,
        updated_at: new Date().toISOString(),
      }).eq("id", id);
    }

    setSaving(false);
    setMessage(`${ids.length}${t("jd.candidateAdded")}`);
    setSelected(new Set());
    // 검색 결과 갱신
    if (query.trim().length >= 2) search(query);
    setTimeout(() => onDone(), 1200);
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
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="w-full text-[12px] px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-900 outline-none focus:border-[#3182F6]"
          >
            {PLATFORM_OPTIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-gray-500 mb-0.5 block">{t("jd.posting.status")}</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full text-[12px] px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-900 outline-none focus:border-[#3182F6]"
          >
            {POSTING_STATUS_KEYS.map((s) => (
              <option key={s.value} value={s.value}>{t(s.labelKey)}</option>
            ))}
          </select>
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
  const statusOption = POSTING_STATUS_KEYS.find((s) => s.value === posting.status);
  const sColor = statusOption?.color || "#8B95A1";

  return (
    <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-200/60 px-3 py-2.5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[11px] font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">
            {posting.platform}
          </span>
          <select
            value={posting.status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="text-[10px] font-medium rounded-full px-2 py-0.5 border-none outline-none cursor-pointer"
            style={{ backgroundColor: sColor + "18", color: sColor }}
          >
            {POSTING_STATUS_KEYS.map((s) => (
              <option key={s.value} value={s.value}>{t(s.labelKey)}</option>
            ))}
          </select>
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
