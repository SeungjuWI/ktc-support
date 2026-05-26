"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getUserProfile } from "@/lib/supabase-auth";

type AttendanceRecord = {
  id: string;
  check_in: string;
  check_out: string | null;
  note: string | null;
  user_id: string;
  user_profiles: { name: string; email: string; avatar_url: string } | null;
};

type WeeklyStat = {
  name: string;
  email: string;
  avatar_url: string;
  totalHours: number;
  days: number;
};

export default function ManageAttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [view, setView] = useState<"daily" | "weekly">("daily");
  const [companyId, setCompanyId] = useState("");

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const profile = await getUserProfile(session.user.id);
      if (!profile?.company_id) { setLoading(false); return; }
      setCompanyId(profile.company_id);
    }
    init();
  }, []);

  useEffect(() => {
    if (!companyId) return;
    if (view === "daily") loadDaily();
    else loadWeekly();
  }, [selectedDate, view, companyId]);

  async function loadDaily() {
    setLoading(true);
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const { data } = await supabase
      .from("attendance")
      .select("id, check_in, check_out, note, user_id, user_profiles(name, email, avatar_url)")
      .eq("company_id", companyId)
      .gte("check_in", selectedDate)
      .lt("check_in", nextDay.toISOString().split("T")[0])
      .order("check_in", { ascending: true });

    setRecords((data as unknown as AttendanceRecord[]) || []);
    setLoading(false);
  }

  async function loadWeekly() {
    setLoading(true);
    // 선택된 날짜의 월요일 구하기
    const d = new Date(selectedDate);
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 7);

    const { data } = await supabase
      .from("attendance")
      .select("check_in, check_out, user_id, user_profiles(name, email, avatar_url)")
      .eq("company_id", companyId)
      .gte("check_in", monday.toISOString().split("T")[0])
      .lt("check_in", sunday.toISOString().split("T")[0]);

    const recs = (data as unknown as AttendanceRecord[]) || [];

    // 직원별 집계
    const map = new Map<string, WeeklyStat>();
    for (const r of recs) {
      if (!map.has(r.user_id)) {
        map.set(r.user_id, {
          name: r.user_profiles?.name || r.user_profiles?.email || "-",
          email: r.user_profiles?.email || "",
          avatar_url: r.user_profiles?.avatar_url || "",
          totalHours: 0,
          days: 0,
        });
      }
      const stat = map.get(r.user_id)!;
      if (r.check_out) {
        stat.totalHours += (new Date(r.check_out).getTime() - new Date(r.check_in).getTime()) / 3600000;
      }
      stat.days += 1;
    }

    setWeeklyStats(Array.from(map.values()).sort((a, b) => b.totalHours - a.totalHours));
    setLoading(false);
  }

  function getWeekLabel() {
    const d = new Date(selectedDate);
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return `${monday.getMonth() + 1}/${monday.getDate()} ~ ${sunday.getMonth() + 1}/${sunday.getDate()}`;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-medium text-gray-900">출퇴근 현황</h1>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-xl p-0.5">
            <button
              onClick={() => setView("daily")}
              className={`px-3 py-1.5 rounded-[10px] text-[12px] font-medium transition-colors ${view === "daily" ? "bg-white text-gray-900" : "text-gray-500"}`}
            >
              일별
            </button>
            <button
              onClick={() => setView("weekly")}
              className={`px-3 py-1.5 rounded-[10px] text-[12px] font-medium transition-colors ${view === "weekly" ? "bg-white text-gray-900" : "text-gray-500"}`}
            >
              주간
            </button>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border-[0.5px] border-gray-200 rounded-xl text-[13px] text-gray-700 outline-none focus:border-[#3182F6]"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-[14px] text-gray-500">로딩 중...</p>
      ) : view === "daily" ? (
        /* 일별 뷰 */
        records.length === 0 ? (
          <div className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl p-8 text-center">
            <p className="text-[14px] text-gray-400">출근 기록이 없습니다</p>
          </div>
        ) : (
          <div className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-[12px] text-gray-500 font-normal px-4 py-3">직원</th>
                  <th className="text-left text-[12px] text-gray-500 font-normal px-4 py-3">출근</th>
                  <th className="text-left text-[12px] text-gray-500 font-normal px-4 py-3">퇴근</th>
                  <th className="text-left text-[12px] text-gray-500 font-normal px-4 py-3">근무 시간</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec) => {
                  const checkIn = new Date(rec.check_in);
                  const checkOut = rec.check_out ? new Date(rec.check_out) : null;
                  const hours = checkOut ? ((checkOut.getTime() - checkIn.getTime()) / 3600000).toFixed(1) : "-";
                  const emp = rec.user_profiles;
                  return (
                    <tr key={rec.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {emp?.avatar_url ? (
                            <img src={emp.avatar_url} alt="" className="w-7 h-7 rounded-full" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-[#F2F4F6] flex items-center justify-center">
                              <span className="text-[11px] text-gray-500">{emp?.name?.charAt(0) || "?"}</span>
                            </div>
                          )}
                          <span className="text-[13px] text-gray-900">{emp?.name || emp?.email || "-"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-gray-700">
                        {checkIn.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-gray-700">
                        {checkOut ? checkOut.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) : (
                          <span className="text-[#1D9E75]">근무 중</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-gray-700">{hours}h</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        /* 주간 뷰 */
        <>
          <p className="text-[13px] text-gray-500 mb-4">{getWeekLabel()}</p>
          {weeklyStats.length === 0 ? (
            <div className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl p-8 text-center">
              <p className="text-[14px] text-gray-400">해당 주의 출근 기록이 없습니다</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {weeklyStats.map((stat) => {
                const avgHours = stat.days > 0 ? stat.totalHours / stat.days : 0;
                const barWidth = Math.min(100, (stat.totalHours / 40) * 100); // 40h = 100%
                return (
                  <div key={stat.email} className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      {stat.avatar_url ? (
                        <img src={stat.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#F2F4F6] flex items-center justify-center">
                          <span className="text-[11px] text-gray-500">{stat.name.charAt(0)}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-gray-900">{stat.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[15px] font-medium text-gray-900">{stat.totalHours.toFixed(1)}h</p>
                        <p className="text-[11px] text-gray-400">{stat.days}일 · 평균 {avgHours.toFixed(1)}h/일</p>
                      </div>
                    </div>
                    {/* 근무시간 바 */}
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${barWidth}%`,
                          backgroundColor: barWidth >= 100 ? "#1D9E75" : barWidth >= 75 ? "#3182F6" : "#E8590C",
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-gray-400">0h</span>
                      <span className="text-[10px] text-gray-400">40h</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
