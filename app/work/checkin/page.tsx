"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getUserProfile } from "@/lib/supabase-auth";

export default function CheckinPage() {
  const [todayRecord, setTodayRecord] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [userId, setUserId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const profile = await getUserProfile(session.user.id);
      if (!profile) return;
      setUserId(session.user.id);
      setCompanyId(profile.company_id || "");

      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", session.user.id)
        .gte("check_in", today)
        .order("check_in", { ascending: false })
        .limit(1);

      setTodayRecord(data?.[0] || null);
      setLoading(false);
    }
    load();
  }, []);

  async function handleCheckIn() {
    if (!userId || !companyId) return;
    setActing(true);
    const { data, error } = await supabase
      .from("attendance")
      .insert({ user_id: userId, company_id: companyId, check_in: new Date().toISOString() })
      .select()
      .single();
    if (!error && data) setTodayRecord(data);
    setActing(false);
  }

  async function handleCheckOut() {
    if (!todayRecord) return;
    setActing(true);
    const { data, error } = await supabase
      .from("attendance")
      .update({ check_out: new Date().toISOString() })
      .eq("id", todayRecord.id)
      .select()
      .single();
    if (!error && data) setTodayRecord(data);
    setActing(false);
  }

  if (loading) return <p className="text-[14px] text-gray-500">로딩 중...</p>;

  const checkedIn = !!todayRecord;
  const checkedOut = !!todayRecord?.check_out;

  return (
    <div>
      <h1 className="text-[22px] font-medium text-gray-900 mb-6">출퇴근</h1>

      <div className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl p-8 text-center">
        <p className="text-[48px] font-medium text-gray-900 mb-2" style={{ fontVariantNumeric: "tabular-nums" }}>
          {currentTime.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </p>
        <p className="text-[14px] text-gray-500 mb-8">
          {currentTime.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
        </p>

        {!checkedIn && (
          <button
            onClick={handleCheckIn}
            disabled={acting}
            className="w-full max-w-[280px] py-4 bg-[#3182F6] text-white rounded-2xl text-[16px] font-medium hover:bg-[#2272EB] active:scale-[0.98] transition disabled:opacity-60"
          >
            {acting ? "처리 중..." : "출근하기"}
          </button>
        )}

        {checkedIn && !checkedOut && (
          <div>
            <p className="text-[14px] text-[#1D9E75] mb-4">
              출근 완료 — {new Date(todayRecord.check_in).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
            </p>
            <button
              onClick={handleCheckOut}
              disabled={acting}
              className="w-full max-w-[280px] py-4 bg-gray-900 text-white rounded-2xl text-[16px] font-medium hover:bg-gray-800 active:scale-[0.98] transition disabled:opacity-60"
            >
              {acting ? "처리 중..." : "퇴근하기"}
            </button>
          </div>
        )}

        {checkedIn && checkedOut && (
          <div>
            <p className="text-[14px] text-gray-500">
              출근 {new Date(todayRecord.check_in).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
              {" → "}
              퇴근 {new Date(todayRecord.check_out).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
            </p>
            <p className="text-[13px] text-[#1D9E75] mt-2">오늘 근무 완료</p>
          </div>
        )}
      </div>
    </div>
  );
}
