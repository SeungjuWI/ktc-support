"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getUserProfile } from "@/lib/supabase-auth";

export default function ReportPage() {
  const [content, setContent] = useState("");
  const [existingReport, setExistingReport] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [userId, setUserId] = useState("");
  const [companyId, setCompanyId] = useState("");

  const [today] = useState(() => new Date().toISOString().split("T")[0]);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const profile = await getUserProfile(session.user.id);
      if (!profile) return;
      setUserId(session.user.id);
      setCompanyId(profile.company_id || "");

      const { data } = await supabase
        .from("daily_reports")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("report_date", today)
        .single();

      if (data) {
        setExistingReport(data);
        setContent(data.content);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    if (!content.trim() || !userId || !companyId) return;
    setSaving(true);

    if (existingReport) {
      const { data } = await supabase
        .from("daily_reports")
        .update({ content: content.trim(), updated_at: new Date().toISOString() })
        .eq("id", existingReport.id)
        .select()
        .single();
      if (data) setExistingReport(data);
    } else {
      const { data } = await supabase
        .from("daily_reports")
        .insert({ user_id: userId, company_id: companyId, report_date: today, content: content.trim() })
        .select()
        .single();
      if (data) setExistingReport(data);
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return <p className="text-[14px] text-gray-500">로딩 중...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[22px] font-medium text-gray-900">업무 보고</h1>
        <span className="text-[13px] text-gray-500">{today}</span>
      </div>

      <div className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl p-5">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="오늘 진행한 업무를 작성해주세요..."
          rows={10}
          className="w-full text-[14px] text-gray-900 outline-none resize-none placeholder:text-gray-400 leading-relaxed"
        />

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <div>
            {saved && <span className="text-[13px] text-[#1D9E75]">저장되었습니다</span>}
            {existingReport && !saved && (
              <span className="text-[11px] text-gray-400">
                마지막 수정: {new Date(existingReport.updated_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !content.trim()}
            className="px-5 py-2.5 bg-[#3182F6] text-white rounded-xl text-[14px] font-medium hover:bg-[#2272EB] active:scale-[0.98] transition disabled:opacity-60"
          >
            {saving ? "저장 중..." : existingReport ? "수정하기" : "저장하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
