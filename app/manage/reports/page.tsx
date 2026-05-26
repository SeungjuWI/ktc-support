"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getUserProfile } from "@/lib/supabase-auth";

type Report = {
  id: string;
  report_date: string;
  content: string;
  created_at: string;
  user_profiles: { name: string; email: string; avatar_url: string } | null;
};

export default function ManageReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const profile = await getUserProfile(session.user.id);
      if (!profile) return;
      const cid = profile.company_id;
      if (!cid) { setLoading(false); return; }

      const { data } = await supabase
        .from("daily_reports")
        .select("id, report_date, content, created_at, user_profiles(name, email, avatar_url)")
        .eq("company_id", cid)
        .eq("report_date", selectedDate)
        .order("created_at", { ascending: true });

      setReports((data as unknown as Report[]) || []);
      setLoading(false);
    }
    load();
  }, [selectedDate]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-medium text-gray-900">업무 보고</h1>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => { setSelectedDate(e.target.value); setLoading(true); }}
          className="px-3 py-2 border-[0.5px] border-gray-200 rounded-xl text-[13px] text-gray-700 outline-none focus:border-[#3182F6]"
        />
      </div>

      {loading ? (
        <p className="text-[14px] text-gray-500">로딩 중...</p>
      ) : reports.length === 0 ? (
        <div className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl p-8 text-center">
          <p className="text-[14px] text-gray-400">해당 날짜의 업무 보고가 없습니다</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map((report) => {
            const emp = report.user_profiles;
            return (
              <div key={report.id} className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  {emp?.avatar_url ? (
                    <img src={emp.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#F2F4F6] flex items-center justify-center">
                      <span className="text-[12px] text-gray-500">{emp?.name?.charAt(0) || "?"}</span>
                    </div>
                  )}
                  <div>
                    <p className="text-[14px] font-medium text-gray-900">{emp?.name || emp?.email || "-"}</p>
                    <p className="text-[11px] text-gray-400">
                      {new Date(report.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                <div className="text-[14px] text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {report.content}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
