"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getUserProfile } from "@/lib/supabase-auth";
import { supabase } from "@/lib/supabase";
import { AdminI18nProvider, useAdminI18n, LangSelector } from "@/lib/admin-i18n";

const NAV_KEYS = [
  // 내부 관리
  { href: "/admin", labelKey: "nav.users", icon: "users", group: "internal" },
  { href: "/admin/companies", labelKey: "nav.companies", icon: "companies", group: "internal" },
  { href: "/admin/roles", labelKey: "nav.roles", icon: "roles", group: "internal" },
  { href: "/admin/dev", labelKey: "nav.dev", icon: "dev", group: "internal" },
  // KTC 채용 업무
  { href: "/admin/jd", labelKey: "nav.jd", icon: "jd", group: "ktc" },
  { href: "/admin/candidates", labelKey: "nav.candidates", icon: "candidates", group: "ktc" },
  { href: "/admin/pool", labelKey: "nav.pool", icon: "pool", group: "ktc" },
  { href: "/admin/interviews", labelKey: "nav.interviews", icon: "interviews", group: "ktc" },
  { href: "/admin/messages", labelKey: "nav.messages", icon: "messages", group: "ktc" },
  { href: "/admin/delivery", labelKey: "nav.delivery", icon: "delivery", group: "ktc" },
  // VTM 인재 열람
  { href: "/admin/talents", labelKey: "nav.talents", icon: "talents", group: "vtm" },
  { href: "/admin/inquiries", labelKey: "nav.inquiries", icon: "inquiries", group: "vtm" },
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
  if (type === "inquiries") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    );
  }
  if (type === "candidates") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        <path d="M9 14l2 2 4-4" />
      </svg>
    );
  }
  if (type === "pool") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="19" y1="8" x2="19" y2="14" />
        <line x1="22" y1="11" x2="16" y2="11" />
      </svg>
    );
  }
  if (type === "interviews") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
        <path d="M19 10v2a7 7 0 01-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    );
  }
  if (type === "profiles") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    );
  }
  if (type === "messages") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    );
  }
  if (type === "jd") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    );
  }
  if (type === "delivery") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        <path d="M12 11l4 4M12 11l-4 4M12 11v8" />
      </svg>
    );
  }
  if (type === "dev") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    );
  }
  if (type === "companies") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
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

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useAdminI18n();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [vocUnread, setVocUnread] = useState(0);

  useEffect(() => {
    async function checkAdmin() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = "/login"; return; }
      const profile = await getUserProfile(session.user.id);
      if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) { window.location.href = "/"; return; }
      setAuthorized(true);
      setLoading(false);
    }
    checkAdmin();
  }, []);

  useEffect(() => {
    if (!authorized) return;
    async function fetchUnread() {
      const { count } = await supabase
        .from("email_messages")
        .select("*", { count: "exact", head: true })
        .eq("direction", "inbound")
        .is("read_at", null);
      setVocUnread(count || 0);
    }
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    // 메시지 읽음 시 즉시 갱신
    window.addEventListener("voc-read", fetchUnread);
    return () => {
      clearInterval(interval);
      window.removeEventListener("voc-read", fetchUnread);
    };
  }, [authorized]);

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
          <div className="flex items-center gap-3">
            <LangSelector />
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
        {/* 사이드바 */}
        <nav className="w-[200px] flex-shrink-0 hidden md:block">
          <div className="flex flex-col gap-0.5">
            {/* 내부 관리 */}
            <p className="px-3 pt-1 pb-1.5 text-[11px] text-[#B0B8C1] tracking-wide">{t("nav.group.internal")}</p>
            {NAV_KEYS.filter((i) => i.group === "internal").map((item) => {
              const isActive = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[14px] transition-colors ${isActive ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
                  <NavIcon type={item.icon} />
                  {t(item.labelKey)}
                </Link>
              );
            })}
            {/* KTC 채용 업무 */}
            <div className="h-px bg-[#F2F4F6] my-2" />
            <p className="px-3 pt-1 pb-1.5 text-[11px] text-[#B0B8C1] tracking-wide">{t("nav.group.ktc")}</p>
            {NAV_KEYS.filter((i) => i.group === "ktc").map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[14px] transition-colors ${isActive ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
                  <NavIcon type={item.icon} />
                  {t(item.labelKey)}
                  {item.icon === "messages" && vocUnread > 0 && (
                    <span className={`ml-auto text-[10px] font-medium w-[18px] h-[18px] rounded-full flex items-center justify-center ${isActive ? "bg-white text-gray-900" : "bg-[#E8590C] text-white"}`}>
                      {vocUnread}
                    </span>
                  )}
                </Link>
              );
            })}
            {/* VTM 인재 열람 */}
            <div className="h-px bg-[#F2F4F6] my-2" />
            <p className="px-3 pt-1 pb-1.5 text-[11px] text-[#B0B8C1] tracking-wide">{t("nav.group.vtm")}</p>
            {NAV_KEYS.filter((i) => i.group === "vtm").map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[14px] transition-colors ${isActive ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
                  <NavIcon type={item.icon} />
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* 모바일 탭 */}
        <div className="flex gap-2 mb-4 md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-5 py-3 z-10">
          {NAV_KEYS.map((item) => {
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
                {t(item.labelKey)}
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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminI18nProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AdminI18nProvider>
  );
}
