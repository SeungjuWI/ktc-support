"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getUserProfile } from "@/lib/supabase-auth";
import Link from "next/link";

type TaskItem = {
  id: string;
  title: string;
  status: string;
  priority: string;
  projects: { name: string } | null;
};

type CheckinRecord = {
  id: string;
  check_in: string;
  check_out: string | null;
};

export default function WorkHome() {
  const [userName, setUserName] = useState("");
  const [todayCheckin, setTodayCheckin] = useState<CheckinRecord | null>(null);
  const [myTasks, setMyTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const profile = await getUserProfile(session.user.id);
      if (!profile) return;
      setUserName(profile.name || "");

      const companyId = profile.company_id;
      if (!companyId) { setLoading(false); return; }

      const today = new Date().toISOString().split("T")[0];

      const [checkinRes, tasksRes] = await Promise.all([
        supabase.from("attendance").select("*").eq("user_id", session.user.id).gte("check_in", today).order("check_in", { ascending: false }).limit(1),
        supabase.from("tasks").select("*, projects(name)").eq("assignee_id", session.user.id).in("status", ["todo", "in_progress"]).order("due_date", { ascending: true }).limit(5),
      ]);

      setTodayCheckin((checkinRes.data?.[0] as CheckinRecord) || null);
      setMyTasks((tasksRes.data as unknown as TaskItem[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <p className="text-[14px] text-gray-500">로딩 중...</p>;

  return (
    <div>
      <h1 className="text-[22px] font-medium text-gray-900 mb-1">
        안녕하세요, {userName || "직원"}님
      </h1>
      <p className="text-[14px] text-gray-500 mb-6">
        {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
      </p>

      {/* 출퇴근 상태 */}
      <div className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl p-5 mb-4">
        <p className="text-[12px] text-gray-500 mb-3">오늘 출퇴근</p>
        {todayCheckin ? (
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#1D9E75]" />
            <span className="text-[14px] text-gray-900">
              출근 {new Date(todayCheckin.check_in).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
            </span>
            {todayCheckin.check_out && (
              <span className="text-[14px] text-gray-500 ml-2">
                → 퇴근 {new Date(todayCheckin.check_out).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        ) : (
          <Link href="/work/checkin" className="text-[14px] text-[#3182F6]">출근 체크하기 →</Link>
        )}
      </div>

      {/* 내 업무 */}
      <div className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[12px] text-gray-500">내 업무</p>
          <Link href="/work/projects" className="text-[12px] text-[#3182F6]">전체 보기</Link>
        </div>
        {myTasks.length === 0 ? (
          <p className="text-[14px] text-gray-400">배정된 업무가 없습니다</p>
        ) : (
          <div className="flex flex-col gap-2">
            {myTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  task.priority === "urgent" ? "bg-red-500" :
                  task.priority === "high" ? "bg-[#E8590C]" :
                  "bg-gray-300"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] text-gray-900 truncate">{task.title}</p>
                  <p className="text-[11px] text-gray-500">{task.projects?.name}</p>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                  task.status === "in_progress" ? "text-[#3182F6] bg-[#E8F3FF]" : "text-gray-500 bg-gray-100"
                }`}>
                  {task.status === "in_progress" ? "진행 중" : "대기"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
