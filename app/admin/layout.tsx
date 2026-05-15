"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentUser, getUserProfile } from "@/lib/supabase-auth";

const NAV_ITEMS = [
  { href: "/admin", label: "사용자 관리", icon: "users" },
  { href: "/admin/talents", label: "인재 관리", icon: "talents" },
  { href: "/admin/roles", label: "권한 안내", icon: "roles" },
];

function NavIcon({ type }: { type: string }) {
  if (type === "users") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="4" />
        <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
        <path d="M16 3.13a4 4 0 010 7.75M21 21v-2a4 4 0 00-3-3.85" />
      </svg>
    );
  }
  if (type === "roles") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAdmin() {
      const user = await getCurrentUser();
      if (!user) { window.location.href = "/login"; return; }
      const profile = await getUserProfile(user.id);
      if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) { window.location.href = "/"; return; }
      setAuthorized(true);
      setLoading(false);
    }
    checkAdmin();
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
      {/* 헤더 */}
      <header className="bg-white sticky top-0 z-10">
        <div className="mx-auto max-w-[1080px] px-5 h-[56px] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="VTM" width={24} height={24} className="rounded-[4px]" />
              <span className="text-[18px] text-gray-900 tracking-tight" style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>
                Vtm
              </span>
            </Link>
            <span className="text-[12px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">관리자</span>
          </div>
          <Link href="/login" className="w-8 h-8 rounded-full border-[1.5px] border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors">
            <svg width="18" height="18" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="11" r="4.5" stroke="#8B95A1" strokeWidth="2"/>
              <path d="M5.5 24c0-4.14 3.82-7.5 8.5-7.5s8.5 3.36 8.5 7.5" stroke="#8B95A1" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </Link>
        </div>
        <div className="h-[0.5px] bg-gray-200/80" />
      </header>

      <div className="mx-auto max-w-[1080px] px-5 py-6 flex gap-6">
        {/* 사이드바 */}
        <nav className="w-[200px] flex-shrink-0 hidden md:block">
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[14px] transition-colors ${
                    isActive
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <NavIcon type={item.icon} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* 모바일 탭 */}
        <div className="flex gap-2 mb-4 md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-5 py-3 z-10">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[13px] transition-colors ${
                  isActive
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 bg-gray-100"
                }`}
              >
                <NavIcon type={item.icon} />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* 메인 콘텐츠 */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
