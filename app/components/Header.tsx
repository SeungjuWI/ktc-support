"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { signOut, getUserProfile } from "@/lib/supabase-auth";

export function Header() {
  const [user, setUser] = useState<{ email?: string; avatar?: string; isAdmin?: boolean } | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    async function loadUser(u: { id: string; email?: string; user_metadata: Record<string, string> }) {
      const profile = await getUserProfile(u.id);
      setUser({
        email: u.email,
        avatar: u.user_metadata?.avatar_url || u.user_metadata?.picture,
        isAdmin: profile?.role === "admin" || profile?.role === "super_admin",
      });
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadUser(session.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadUser(session.user);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    await signOut();
    setUser(null);
    setShowMenu(false);
  }

  return (
    <header className="bg-white sticky top-0 z-50">
      <div className="mx-auto max-w-[1080px] px-5 h-[56px] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="VTM" width={24} height={24} className="rounded-[4px]" />
          <span className="text-[18px] text-gray-900 tracking-tight" style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>
            Vtm
          </span>
        </Link>

        <div className="flex items-center gap-5">
          <nav className="hidden sm:flex items-center gap-5">
            <Link href={user ? "/talents" : "/login"} className="text-[14px] text-gray-600 hover:text-gray-900 transition-colors">
              인재 열람
            </Link>
            <Link href="/notice" className="text-[14px] text-gray-600 hover:text-gray-900 transition-colors">
              공지사항
            </Link>
            <Link href="/qna" className="text-[14px] text-gray-600 hover:text-gray-900 transition-colors">
              Q&A
            </Link>
          </nav>

          {user ? (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-full border-[1.5px] border-gray-300 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 28 28" fill="none">
                  <circle cx="14" cy="11" r="4.5" stroke="#8B95A1" strokeWidth="2"/>
                  <path d="M5.5 24c0-4.14 3.82-7.5 8.5-7.5s8.5 3.36 8.5 7.5" stroke="#8B95A1" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-10 z-50 bg-white border-[0.5px] border-gray-200 rounded-xl py-2 min-w-[180px]">
                  <p className="px-4 py-2 text-[12px] text-gray-500 truncate">{user.email}</p>
                  <div className="h-[0.5px] bg-gray-200/60 my-1" />
                  <Link
                    href="/login"
                    onClick={() => setShowMenu(false)}
                    className="block px-4 py-2 text-[14px] text-gray-700 hover:bg-gray-50"
                  >
                    내 계정
                  </Link>
                  {user.isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setShowMenu(false)}
                      className="block px-4 py-2 text-[14px] text-gray-700 hover:bg-gray-50"
                    >
                      관리자 대시보드
                    </Link>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2 text-[14px] text-gray-700 hover:bg-gray-50"
                  >
                    로그아웃
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <Link
            href="/login"
            className="text-[14px] text-blue-500 font-medium hover:text-blue-600 transition-colors"
          >
            로그인
          </Link>
        )}
        </div>
      </div>
      <div className="h-[0.5px] bg-gray-200/80" />
    </header>
  );
}
