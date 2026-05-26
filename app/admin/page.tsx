"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getUserProfile } from "@/lib/supabase-auth";

type UserProfile = {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  role: "super_admin" | "admin" | "user" | "company_admin" | "employee";
  status: "pending" | "approved" | "rejected";
  company_name: string | null;
  contact_name: string | null;
  company_id: string | null;
  created_at: string;
};

type Company = {
  id: string;
  name: string;
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "총 관리자",
  admin: "관리자",
  user: "일반",
  company_admin: "기업 관리자",
  employee: "직원",
};

const ROLE_BADGE: Record<string, string> = {
  super_admin: "text-[#E8590C] bg-[#FFF8F0]",
  admin: "text-blue-500 bg-blue-50",
  user: "text-gray-500 bg-gray-100",
  company_admin: "text-[#1D9E75] bg-[#E6F7F1]",
  employee: "text-[#6B7684] bg-[#F2F4F6]",
};

export default function AdminUsersPage() {
  const [myRole, setMyRole] = useState<string>("admin");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [loading, setLoading] = useState(true);
  // 기업 배정 모달 상태
  const [assignTarget, setAssignTarget] = useState<UserProfile | null>(null);
  const [assignCompanyId, setAssignCompanyId] = useState("");
  const [assignRole, setAssignRole] = useState<"company_admin" | "employee">("employee");

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const p = await getUserProfile(session.user.id);
        if (p) setMyRole(p.role);
      }
      await Promise.all([loadUsers(), loadCompanies()]);
    }
    init();
  }, []);

  async function loadUsers() {
    const { data } = await supabase
      .from("user_profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setUsers(data as UserProfile[]);
    setLoading(false);
  }

  async function loadCompanies() {
    const { data } = await supabase
      .from("companies")
      .select("id, name")
      .order("name", { ascending: true });
    if (data) setCompanies(data);
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
          const res = await fetch("/api/send-approval-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: target.email, name: target.name }),
          });
          if (!res.ok) {
            const err = await res.json();
            console.error("메일 발송 실패:", err);
          }
        } catch (e) {
          console.error("메일 발송 에러:", e);
        }
      }
    }

    await loadUsers();
  }

  async function updateRole(userId: string, role: "super_admin" | "admin" | "user") {
    await supabase
      .from("user_profiles")
      .update({ role, updated_at: new Date().toISOString() })
      .eq("id", userId);
    await loadUsers();
  }

  function openAssignModal(user: UserProfile) {
    setAssignTarget(user);
    setAssignCompanyId(user.company_id || (companies[0]?.id || ""));
    setAssignRole(user.role === "company_admin" ? "company_admin" : "employee");
  }

  async function handleAssign() {
    if (!assignTarget || !assignCompanyId) return;
    await supabase
      .from("user_profiles")
      .update({
        company_id: assignCompanyId,
        role: assignRole,
        updated_at: new Date().toISOString(),
      })
      .eq("id", assignTarget.id);
    setAssignTarget(null);
    await loadUsers();
  }

  async function handleUnassign(userId: string) {
    await supabase
      .from("user_profiles")
      .update({ company_id: null, role: "user", updated_at: new Date().toISOString() })
      .eq("id", userId);
    await loadUsers();
  }

  const isSuperAdmin = myRole === "super_admin";
  const filtered = users.filter((u) => u.status === tab);

  function getCompanyName(companyId: string | null) {
    if (!companyId) return null;
    return companies.find((c) => c.id === companyId)?.name || null;
  }

  return (
    <div>
      <h1 className="text-[22px] font-medium text-gray-900 tracking-tight mb-1">
        사용자 관리
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
      {loading ? (
        <div className="text-center py-16">
          <p className="text-[14px] text-gray-500">로딩 중...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[14px] text-gray-500">
            {tab === "pending" ? "대기 중인 사용자가 없습니다" :
             tab === "approved" ? "승인된 사용자가 없습니다" :
             "거절된 사용자가 없습니다"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((u) => {
            const companyName = getCompanyName(u.company_id);
            return (
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
                      {u.contact_name || u.name || "이름 없음"}
                      {u.company_name && (
                        <span className="text-[13px] font-normal text-gray-500"> · {u.company_name}</span>
                      )}
                    </p>
                    <p className="text-[13px] text-gray-500 truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {companyName && (
                      <span className="text-[11px] text-[#3182F6] bg-[#E8F3FF] px-2 py-0.5 rounded-full">
                        {companyName}
                      </span>
                    )}
                    <span className={`text-[11px] font-medium px-2 py-1 rounded-full ${ROLE_BADGE[u.role] || "text-gray-500 bg-gray-100"}`}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-gray-500">
                    {new Date(u.created_at).toLocaleDateString("ko-KR")}
                  </span>

                  <div className="flex items-center gap-2">
                    {/* 기업 배정 버튼 (승인된 유저에게만, 기존 admin/super_admin 제외) */}
                    {tab === "approved" && isSuperAdmin && !["admin", "super_admin"].includes(u.role) && (
                      <>
                        {u.company_id ? (
                          <button
                            onClick={() => handleUnassign(u.id)}
                            className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors bg-gray-100 text-gray-500 hover:bg-gray-200"
                          >
                            기업 해제
                          </button>
                        ) : null}
                        <button
                          onClick={() => openAssignModal(u)}
                          className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors bg-[#E6F7F1] text-[#1D9E75] hover:bg-[#D0F0E4]"
                        >
                          {u.company_id ? "기업 변경" : "기업 배정"}
                        </button>
                      </>
                    )}

                    {/* 총 관리자만 역할 임명 가능 */}
                    {isSuperAdmin && u.role === "user" && tab === "approved" && (
                      <>
                        <button
                          onClick={() => updateRole(u.id, "admin")}
                          className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors bg-gray-100 text-gray-500 hover:bg-gray-200"
                        >
                          관리자 임명
                        </button>
                        <button
                          onClick={() => updateRole(u.id, "super_admin")}
                          className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors bg-[#FFF8F0] text-[#E8590C] hover:bg-orange-100"
                        >
                          총관리자 임명
                        </button>
                      </>
                    )}

                    {isSuperAdmin && u.role === "admin" && tab === "approved" && (
                      <button
                        onClick={() => updateRole(u.id, "super_admin")}
                        className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors bg-[#FFF8F0] text-[#E8590C] hover:bg-orange-100"
                      >
                        총관리자 임명
                      </button>
                    )}

                    {tab === "pending" && u.role !== "super_admin" && (
                      <>
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
                      </>
                    )}

                    {tab === "approved" && (u.role === "admin" || u.role === "super_admin") && isSuperAdmin && u.email !== "ktc@likelion.net" && (
                      <button
                        onClick={() => updateRole(u.id, "user")}
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
              </div>
            );
          })}
        </div>
      )}

      {/* 기업 배정 모달 */}
      {assignTarget && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center px-5" onClick={() => setAssignTarget(null)}>
          <div className="bg-white rounded-2xl w-full max-w-[420px] p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-[18px] font-medium text-gray-900 mb-1">기업 배정</h2>
            <p className="text-[13px] text-gray-500 mb-5">
              {assignTarget.contact_name || assignTarget.name || assignTarget.email}
            </p>

            {companies.length === 0 ? (
              <p className="text-[14px] text-gray-400 mb-5">등록된 기업이 없습니다. 먼저 기업을 추가하세요.</p>
            ) : (
              <>
                <div className="mb-4">
                  <label className="text-[13px] text-gray-500 mb-1.5 block">기업 선택</label>
                  <select
                    value={assignCompanyId}
                    onChange={(e) => setAssignCompanyId(e.target.value)}
                    className="w-full px-3.5 py-2.5 border-[0.5px] border-gray-200/60 rounded-xl text-[14px] text-gray-900 outline-none focus:border-[#3182F6] bg-white"
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-6">
                  <label className="text-[13px] text-gray-500 mb-1.5 block">역할</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAssignRole("employee")}
                      className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium transition-colors ${
                        assignRole === "employee"
                          ? "bg-gray-900 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      직원
                    </button>
                    <button
                      onClick={() => setAssignRole("company_admin")}
                      className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium transition-colors ${
                        assignRole === "company_admin"
                          ? "bg-gray-900 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      기업 관리자
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setAssignTarget(null)}
                className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl text-[14px] font-medium hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              {companies.length > 0 && (
                <button
                  onClick={handleAssign}
                  className="flex-1 py-3 bg-[#3182F6] text-white rounded-xl text-[14px] font-medium hover:bg-[#2272EB] transition-colors"
                >
                  배정하기
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
