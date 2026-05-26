"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getUserProfile } from "@/lib/supabase-auth";

type Stats = {
  employees: number;
  activeProjects: number;
  todayCheckins: number;
  pendingTasks: number;
};

type RecentReport = {
  id: string;
  content: string;
  report_date: string;
  user_profiles: { name: string; avatar_url: string } | null;
};

type UrgentTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  project_id: string;
  projects: { name: string } | null;
  user_profiles: { name: string } | null;
};

export default function ManageDashboard() {
  const [stats, setStats] = useState<Stats>({ employees: 0, activeProjects: 0, todayCheckins: 0, pendingTasks: 0 });
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [urgentTasks, setUrgentTasks] = useState<UrgentTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const profile = await getUserProfile(session.user.id);
      if (!profile?.company_id) { setLoading(false); return; }

      const companyId = profile.company_id;
      const today = new Date().toISOString().split("T")[0];

      const [empRes, projRes, checkinRes, taskRes, reportsRes, urgentRes] = await Promise.all([
        supabase.from("user_profiles").select("*", { count: "exact", head: true }).eq("company_id", companyId).eq("role", "employee"),
        supabase.from("projects").select("*", { count: "exact", head: true }).eq("company_id", companyId).eq("status", "active"),
        supabase.from("attendance").select("*", { count: "exact", head: true }).eq("company_id", companyId).gte("check_in", today),
        supabase.from("tasks").select("*", { count: "exact", head: true }).eq("company_id", companyId).in("status", ["todo", "in_progress"]),
        // 최근 보고 3개
        supabase.from("daily_reports").select("id, content, report_date, user_profiles(name, avatar_url)").eq("company_id", companyId).order("created_at", { ascending: false }).limit(3),
        // 긴급/기한초과 태스크
        supabase.from("tasks").select("id, title, status, priority, due_date, project_id, projects(name), user_profiles:assignee_id(name)").eq("company_id", companyId).in("status", ["todo", "in_progress"]).or(`priority.eq.urgent,priority.eq.high,due_date.lte.${today}`).order("priority", { ascending: true }).limit(5),
      ]);

      setStats({
        employees: empRes.count || 0,
        activeProjects: projRes.count || 0,
        todayCheckins: checkinRes.count || 0,
        pendingTasks: taskRes.count || 0,
      });
      setRecentReports((reportsRes.data as unknown as RecentReport[]) || []);
      setUrgentTasks((urgentRes.data as unknown as UrgentTask[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  const statCards = [
    { label: "직원 수", value: stats.employees, color: "#3182F6", href: "/manage/employees" },
    { label: "진행 중 프로젝트", value: stats.activeProjects, color: "#1D9E75", href: "/manage/projects" },
    { label: "오늘 출근", value: stats.todayCheckins, color: "#E8590C", href: "/manage/attendance" },
    { label: "진행 중 업무", value: stats.pendingTasks, color: "#8B95A1", href: "/manage/projects" },
  ];

  const PRIORITY_DOT: Record<string, string> = { low: "bg-gray-300", medium: "bg-[#3182F6]", high: "bg-[#E8590C]", urgent: "bg-red-500" };

  return (
    <div>
      <h1 className="text-[22px] font-medium text-gray-900 mb-6">대시보드</h1>

      {loading ? (
        <p className="text-[14px] text-gray-500">로딩 중...</p>
      ) : (
        <>
          {/* 통계 카드 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {statCards.map((card) => (
              <Link key={card.label} href={card.href} className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl p-5 hover:border-gray-300 transition-colors">
                <p className="text-[12px] text-gray-500 mb-2">{card.label}</p>
                <p className="text-[28px] font-medium" style={{ color: card.color }}>{card.value}</p>
              </Link>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* 긴급/주의 업무 */}
            <div className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[14px] font-medium text-gray-900">주의 업무</p>
                <Link href="/manage/projects" className="text-[12px] text-[#3182F6]">전체 보기</Link>
              </div>
              {urgentTasks.length === 0 ? (
                <p className="text-[13px] text-gray-400 py-4 text-center">긴급하거나 기한 초과된 업무가 없습니다</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {urgentTasks.map((task) => {
                    const isOverdue = task.due_date && new Date(task.due_date) < new Date();
                    return (
                      <Link key={task.id} href={`/manage/projects/${task.project_id}`} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 -mx-2 px-2 rounded-lg">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[task.priority]}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-gray-900 truncate">{task.title}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-gray-500">{task.projects?.name}</span>
                            {task.user_profiles?.name && (
                              <span className="text-[11px] text-gray-400">{task.user_profiles.name}</span>
                            )}
                          </div>
                        </div>
                        {isOverdue && (
                          <span className="text-[10px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full flex-shrink-0">기한초과</span>
                        )}
                        {task.priority === "urgent" && (
                          <span className="text-[10px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full flex-shrink-0">긴급</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 최근 업무 보고 */}
            <div className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[14px] font-medium text-gray-900">최근 업무 보고</p>
                <Link href="/manage/reports" className="text-[12px] text-[#3182F6]">전체 보기</Link>
              </div>
              {recentReports.length === 0 ? (
                <p className="text-[13px] text-gray-400 py-4 text-center">아직 업무 보고가 없습니다</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {recentReports.map((report) => (
                    <div key={report.id} className="border-b border-gray-50 last:border-0 pb-3 last:pb-0">
                      <div className="flex items-center gap-2 mb-1">
                        {report.user_profiles?.avatar_url ? (
                          <img src={report.user_profiles.avatar_url} alt="" className="w-5 h-5 rounded-full" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-[#F2F4F6] flex items-center justify-center">
                            <span className="text-[9px] text-gray-500">{report.user_profiles?.name?.charAt(0) || "?"}</span>
                          </div>
                        )}
                        <span className="text-[12px] text-gray-700">{report.user_profiles?.name || "-"}</span>
                        <span className="text-[11px] text-gray-400">{report.report_date}</span>
                      </div>
                      <p className="text-[13px] text-gray-600 line-clamp-2 leading-relaxed">{report.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
