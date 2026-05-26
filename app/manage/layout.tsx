"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getUserProfile } from "@/lib/supabase-auth";
import { supabase } from "@/lib/supabase";
import { NotificationBell } from "@/app/components/NotificationBell";

const NAV_ITEMS = [
  { href: "/manage", label: "대시보드", icon: "dashboard" },
  { href: "/manage/employees", label: "직원 관리", icon: "employees" },
  { href: "/manage/projects", label: "프로젝트", icon: "projects" },
  { href: "/manage/attendance", label: "출퇴근 현황", icon: "attendance" },
  { href: "/manage/reports", label: "업무 보고", icon: "reports" },
  { href: "/manage/settings", label: "회사 정보", icon: "settings" },
];

function NavIcon({ type }: { type: string }) {
  if (type === "dashboard") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    );
  }
  if (type === "employees") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="4" />
        <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
        <path d="M16 3.13a4 4 0 010 7.75M21 21v-2a4 4 0 00-3-3.85" />
      </svg>
    );
  }
  if (type === "projects") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
      </svg>
    );
  }
  if (type === "attendance") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    );
  }
  if (type === "reports") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    );
  }
  if (type === "settings") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15 1.65 1.65 0 003.17 14H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68 1.65 1.65 0 0010 3.17V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    );
  }
  return null;
}

export default function ManageLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = "/login"; return; }
      const profile = await getUserProfile(session.user.id);
      if (!profile || (profile.role !== "company_admin" && profile.role !== "super_admin" && profile.role !== "admin")) { window.location.href = "/"; return; }
      setCompanyName(profile.company_name || "");
      setAuthorized(true);
      setLoading(false);
    }
    check();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <p className="text-[14px] text-gray-500">로딩 중...</p>
      </main>
    );
  }

  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <header className="bg-white sticky top-0 z-10">
        <div className="mx-auto max-w-[1080px] px-5 h-[56px] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/manage" className="flex items-center gap-2">
              <img src="/logo.png" alt="VTM" width={24} height={24} className="rounded-[4px]" />
              <span className="text-[18px] text-gray-900 tracking-tight" style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>
                Vtm
              </span>
            </Link>
            <span className="text-[12px] text-[#1D9E75] bg-[#E6F7F1] px-2 py-0.5 rounded-full">기업 관리</span>
            {companyName && (
              <span className="text-[12px] text-gray-500">{companyName}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Link href="/login" className="w-8 h-8 rounded-full border-[1.5px] border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors">
              <svg width="18" height="18" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="11" r="4.5" stroke="#8B95A1" strokeWidth="2"/>
                <path d="M5.5 24c0-4.14 3.82-7.5 8.5-7.5s8.5 3.36 8.5 7.5" stroke="#8B95A1" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </Link>
          </div>
        </div>
        <div className="h-[0.5px] bg-gray-200/80" />
      </header>

      <div className="mx-auto max-w-[1080px] px-5 py-6 flex gap-6">
        <nav className="w-[200px] flex-shrink-0 hidden md:block">
          <div className="flex flex-col gap-0.5">
            {NAV_ITEMS.map((item) => {
              const isActive = item.href === "/manage"
                ? pathname === "/manage"
                : pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[14px] transition-colors ${
                    isActive ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
                  }`}>
                  <NavIcon type={item.icon} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
