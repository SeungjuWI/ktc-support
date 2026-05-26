"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getUserProfile } from "@/lib/supabase-auth";
import { supabase } from "@/lib/supabase";
import { NotificationBell } from "@/app/components/NotificationBell";

const NAV_ITEMS = [
  { href: "/work", label: "홈", icon: "home" },
  { href: "/work/checkin", label: "출퇴근", icon: "checkin" },
  { href: "/work/projects", label: "프로젝트", icon: "projects" },
  { href: "/work/report", label: "업무 보고", icon: "report" },
];

function NavIcon({ type }: { type: string }) {
  if (type === "home") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    );
  }
  if (type === "checkin") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
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
  if (type === "report") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    );
  }
  return null;
}

export default function WorkLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [, setUserName] = useState("");

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = "/login"; return; }
      const profile = await getUserProfile(session.user.id);
      if (!profile || (profile.role !== "employee" && profile.role !== "super_admin" && profile.role !== "admin")) { window.location.href = "/"; return; }
      setUserName(profile.name || profile.email);
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
        <div className="mx-auto max-w-[640px] px-5 h-[56px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/work" className="flex items-center gap-2">
              <img src="/logo.png" alt="VTM" width={24} height={24} className="rounded-[4px]" />
              <span className="text-[18px] text-gray-900 tracking-tight" style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>
                Vtm
              </span>
            </Link>
            <span className="text-[12px] text-[#6B7684] bg-[#F2F4F6] px-2 py-0.5 rounded-full">직원</span>
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

      <div className="mx-auto max-w-[640px] px-5 py-6">
        {/* 모바일 친화적 탭 네비게이션 */}
        <nav className="flex gap-2 mb-6 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === "/work"
              ? pathname === "/work"
              : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-gray-900 text-white"
                    : "bg-white border-[0.5px] border-gray-200 text-gray-700 hover:border-gray-300"
                }`}>
                <NavIcon type={item.icon} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main>{children}</main>
      </div>
    </div>
  );
}
