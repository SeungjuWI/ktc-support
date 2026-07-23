"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getUserProfile } from "@/lib/supabase-auth";
import { useAdminI18n } from "@/lib/admin-i18n";
import { getCached, setCached } from "@/lib/admin-cache";

type UserProfile = {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  role: "super_admin" | "admin" | "user";
  status: "pending" | "approved" | "rejected";
  company_name: string | null;
  contact_name: string | null;
  created_at: string;
};

export default function AdminUsersPage() {
  const { t } = useAdminI18n();
  const [myRole, setMyRole] = useState<string>("admin");
  const [users, setUsers] = useState<UserProfile[]>(() => getCached<UserProfile[]>("admin:users") ?? []);
  const [tab, setTab] = useState<"all" | "super_admin" | "admin" | "user">("all");
  const [loading, setLoading] = useState(() => !getCached("admin:users"));
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // 메뉴 외부 클릭 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // 모달 열릴 때 배경 스크롤 방지
  useEffect(() => {
    if (showPendingModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [showPendingModal]);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const p = await getUserProfile(session.user.id);
        if (p) setMyRole(p.role);
      }
      await loadUsers();
    }
    init();
  }, []);

  useEffect(() => { if (!loading) setCached("admin:users", users); }, [users, loading]);

  async function loadUsers() {
    const { data } = await supabase
      .from("user_profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setUsers(data as UserProfile[]);
    setLoading(false);
  }

  async function updateStatus(userId: string, status: "approved" | "rejected") {
    await supabase
      .from("user_profiles")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (status === "approved") {
      const target = users.find((u) => u.id === userId);
      if (target) {
        try {
          await fetch("/api/send-approval-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: target.email, name: target.name }),
          });
        } catch (e) {
          console.error("메일 발송 에러:", e);
        }
      }
    }

    await loadUsers();
  }

  async function deleteUser(userId: string, name: string) {
    if (!confirm(`${name}${t("users.deleteConfirm")}`)) return;
    await fetch("/api/admin/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    await loadUsers();
  }

  async function updateRole(userId: string, role: "super_admin" | "admin" | "user") {
    await supabase
      .from("user_profiles")
      .update({ role, updated_at: new Date().toISOString() })
      .eq("id", userId);
    await loadUsers();
  }

  const isSuperAdmin = myRole === "super_admin";
  const pendingUsers = users.filter((u) => u.status === "pending");
  const approvedUsers = users.filter((u) => u.status === "approved");

  const filtered = (() => {
    if (tab === "all") return approvedUsers;
    if (tab === "super_admin") return approvedUsers.filter((u) => u.role === "super_admin");
    if (tab === "admin") return approvedUsers.filter((u) => u.role === "admin");
    return approvedUsers.filter((u) => u.role === "user");
  })();

  const ROLE_LABELS: Record<string, string> = {
    super_admin: t("users.roleSuperAdmin"),
    admin: t("users.roleAdmin"),
    user: t("users.roleUser"),
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-medium text-gray-900 tracking-tight mb-1">
            {t("users.title")}
          </h1>
          <p className="text-[14px] text-gray-500">
            {t("users.desc")}
          </p>
        </div>
        {pendingUsers.length > 0 && (
          <button
            onClick={() => setShowPendingModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl text-[13px] font-medium hover:bg-blue-600 transition-colors"
          >
            {t("users.pendingApproval")}
            <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-[12px]">{pendingUsers.length}</span>
          </button>
        )}
      </div>

      {/* 탭: 전체 / 관리자 / 기업 */}
      <div className="flex gap-2 mb-6">
        {(["all", "super_admin", "admin", "user"] as const).map((t_key) => {
          const count = t_key === "all" ? approvedUsers.length :
            t_key === "super_admin" ? approvedUsers.filter((u) => u.role === "super_admin").length :
            t_key === "admin" ? approvedUsers.filter((u) => u.role === "admin").length :
            approvedUsers.filter((u) => u.role === "user").length;
          const labels = { all: t("users.tabAll"), super_admin: t("users.tabSuperAdmin"), admin: t("users.tabAdmin"), user: t("users.tabCompany") };
          return (
            <button
              key={t_key}
              onClick={() => setTab(t_key)}
              className={`px-[14px] py-[7px] rounded-full text-[13px] transition-colors ${
                tab === t_key
                  ? "bg-gray-900 text-white"
                  : "bg-white border-[0.5px] border-gray-200 text-gray-700 hover:border-gray-300"
              }`}
            >
              {labels[t_key]} {count > 0 && <span className="ml-1">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* 사용자 목록 */}
      {loading ? (
        <div className="text-center py-16">
          <p className="text-[14px] text-gray-500">{t("common.loading")}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[14px] text-gray-500">{t("users.noUsers")}</p>
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
                    {u.contact_name || u.name || t("users.noName")}
                    {u.company_name && (
                      <span className="text-[13px] font-normal text-gray-500"> · {u.company_name}</span>
                    )}
                  </p>
                  <p className="text-[13px] text-gray-500 truncate">{u.email}</p>
                </div>
                <span className={`text-[11px] font-medium px-2 py-1 rounded-full ${
                  u.role === "super_admin" ? "text-[#E8590C] bg-[#FFF8F0]" :
                  u.role === "admin" ? "text-blue-500 bg-blue-50" :
                  "text-gray-500 bg-gray-100"
                }`}>
                  {ROLE_LABELS[u.role]}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[12px] text-gray-500">
                  {new Date(u.created_at).toLocaleDateString("ko-KR")}
                </span>

                {isSuperAdmin && u.email !== "ktc@likelion.net" && (
                  <div className="relative" ref={openMenuId === u.id ? menuRef : undefined}>
                    <button
                      onClick={() => setOpenMenuId(openMenuId === u.id ? null : u.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B95A1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
                      </svg>
                    </button>
                    {openMenuId === u.id && (
                      <div className="absolute right-0 top-full mt-1 min-w-[160px] bg-white border border-gray-200/80 rounded-xl py-1 z-50"
                        style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
                        {u.role !== "super_admin" && (
                          <button onClick={() => { updateRole(u.id, "super_admin"); setOpenMenuId(null); }}
                            className="w-full text-left px-3.5 py-2 text-[13px] text-[#E8590C] hover:bg-gray-50 transition-colors">
                            {t("users.promoteSuperAdmin")}
                          </button>
                        )}
                        {u.role !== "admin" && (
                          <button onClick={() => { updateRole(u.id, "admin"); setOpenMenuId(null); }}
                            className="w-full text-left px-3.5 py-2 text-[13px] text-blue-500 hover:bg-gray-50 transition-colors">
                            {t("users.promoteAdmin")}
                          </button>
                        )}
                        {u.role !== "user" && (
                          <button onClick={() => { updateRole(u.id, "user"); setOpenMenuId(null); }}
                            className="w-full text-left px-3.5 py-2 text-[13px] text-gray-600 hover:bg-gray-50 transition-colors">
                            {t("users.demote")}
                          </button>
                        )}
                        <div className="border-t border-gray-100 my-1" />
                        <button onClick={() => { deleteUser(u.id, u.contact_name || u.name || u.email); setOpenMenuId(null); }}
                          className="w-full text-left px-3.5 py-2 text-[13px] text-red-500 hover:bg-red-50 transition-colors">
                          {t("users.deleteUser")}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 가입 승인 모달 */}
      {showPendingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowPendingModal(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-[560px] max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 px-6 py-5 border-b border-gray-100 rounded-t-2xl flex items-center justify-between">
              <div>
                <h3 className="text-[16px] font-medium text-gray-900">{t("users.pendingApproval")}</h3>
                <p className="text-[13px] text-gray-500 mt-0.5">{pendingUsers.length}{t("users.pendingCount")}</p>
              </div>
              <button onClick={() => setShowPendingModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7684" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-4 space-y-3">
              {pendingUsers.length === 0 ? (
                <p className="text-center py-8 text-[14px] text-gray-500">{t("users.noPending")}</p>
              ) : (
                pendingUsers.map((u) => (
                  <div key={u.id} className="border-[0.5px] border-gray-200/60 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="w-9 h-9 rounded-full" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center">
                          <span className="text-[13px] font-medium text-blue-500">
                            {u.name?.charAt(0) || u.email?.charAt(0) || "?"}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-gray-900 truncate">
                          {u.contact_name || u.name || t("users.noName")}
                          {u.company_name && (
                            <span className="text-[12px] font-normal text-gray-500"> · {u.company_name}</span>
                          )}
                        </p>
                        <p className="text-[12px] text-gray-500 truncate">{u.email}</p>
                      </div>
                      <span className="text-[11px] text-gray-400">
                        {new Date(u.created_at).toLocaleDateString("ko-KR")}
                      </span>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => updateStatus(u.id, "rejected")}
                        className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-[13px] font-medium hover:bg-gray-200 transition-colors"
                      >
                        {t("users.reject")}
                      </button>
                      <button
                        onClick={() => updateStatus(u.id, "approved")}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg text-[13px] font-medium hover:bg-blue-600 transition-colors"
                      >
                        {t("users.approve")}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
