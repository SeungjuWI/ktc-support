"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentUser, getUserProfile } from "@/lib/supabase-auth";

type UserProfile = {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  role: "admin" | "user";
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");

  useEffect(() => {
    async function init() {
      const user = await getCurrentUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }
      const profile = await getUserProfile(user.id);
      if (!profile || profile.role !== "admin") {
        window.location.href = "/";
        return;
      }
      setIsAdmin(true);
      await loadUsers();
      setLoading(false);
    }
    init();
  }, []);

  async function loadUsers() {
    const { data } = await supabase
      .from("user_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setUsers(data as UserProfile[]);
  }

  async function updateStatus(userId: string, status: "approved" | "rejected") {
    await supabase
      .from("user_profiles")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", userId);

    await loadUsers();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <p className="text-[14px] text-gray-500">로딩 중...</p>
      </main>
    );
  }

  if (!isAdmin) return null;

  const filtered = users.filter((u) => u.status === tab);

  return (
    <main className="min-h-screen bg-[#F7F8FA]">
      {/* 헤더 */}
      <header className="bg-white sticky top-0 z-10">
        <div className="mx-auto max-w-[1080px] px-5 h-[56px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="VTM" width={24} height={24} className="rounded-[4px]" />
            <span className="text-[18px] text-gray-900 tracking-tight" style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>
              Vtm
            </span>
          </Link>
          <Link
            href="/login"
            className="text-[14px] text-gray-500 hover:text-gray-700 transition-colors"
          >
            내 계정
          </Link>
        </div>
        <div className="h-[0.5px] bg-gray-200/80" />
      </header>

      <div className="mx-auto max-w-[720px] px-5 pt-8 pb-16">
        <h1 className="text-[22px] font-medium text-gray-900 tracking-tight mb-1">
          관리자
        </h1>
        <p className="text-[14px] text-gray-500 mb-6">
          가입 승인 및 사용자 관리
        </p>

        {/* 탭 */}
        <div className="flex gap-2 mb-6">
          {(["pending", "approved", "rejected"] as const).map((t) => {
            const count = users.filter((u) => u.status === t).length;
            const labels = { pending: "대기", approved: "승인", rejected: "거절" };
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-[14px] py-[7px] rounded-full text-[13px] transition-colors ${
                  tab === t
                    ? "bg-gray-900 text-white"
                    : "bg-white border-[0.5px] border-gray-200 text-gray-700 hover:border-gray-300"
                }`}
              >
                {labels[t]} {count > 0 && <span className="ml-1">{count}</span>}
              </button>
            );
          })}
        </div>

        {/* 사용자 목록 */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[14px] text-gray-500">
              {tab === "pending" ? "대기 중인 사용자가 없습니다" :
               tab === "approved" ? "승인된 사용자가 없습니다" :
               "거절된 사용자가 없습니다"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((u) => (
              <div
                key={u.id}
                className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl p-5"
              >
                <div className="flex items-center gap-3 mb-3">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                      <span className="text-[14px] font-medium text-blue-500">
                        {u.name?.charAt(0) || u.email?.charAt(0) || "?"}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-medium text-gray-900 truncate">
                      {u.name || "이름 없음"}
                    </p>
                    <p className="text-[13px] text-gray-500 truncate">{u.email}</p>
                  </div>
                  {u.role === "admin" && (
                    <span className="text-[11px] font-medium text-blue-500 bg-blue-50 px-2 py-1 rounded-full">
                      관리자
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-gray-500">
                    {new Date(u.created_at).toLocaleDateString("ko-KR")}
                  </span>

                  {tab === "pending" && u.role !== "admin" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStatus(u.id, "rejected")}
                        className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-[13px] font-medium hover:bg-gray-200 transition-colors"
                      >
                        거절
                      </button>
                      <button
                        onClick={() => updateStatus(u.id, "approved")}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg text-[13px] font-medium hover:bg-blue-600 transition-colors"
                      >
                        승인
                      </button>
                    </div>
                  )}

                  {tab === "approved" && u.role !== "admin" && (
                    <button
                      onClick={() => updateStatus(u.id, "rejected")}
                      className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-[13px] font-medium hover:bg-gray-200 transition-colors"
                    >
                      권한 해제
                    </button>
                  )}

                  {tab === "rejected" && (
                    <button
                      onClick={() => updateStatus(u.id, "approved")}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg text-[13px] font-medium hover:bg-blue-600 transition-colors"
                    >
                      승인
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
