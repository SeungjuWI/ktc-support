"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getUserProfile } from "@/lib/supabase-auth";

type Employee = {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
  created_at: string;
};

type Invite = {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [userId, setUserId] = useState("");

  // 초대 폼
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"employee" | "company_admin">("employee");
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const profile = await getUserProfile(session.user.id);
      if (!profile) return;
      const cid = profile.company_id;
      setCompanyId(cid || "");
      setCompanyName(profile.company_name || "");
      setUserId(session.user.id);
      if (!cid) { setLoading(false); return; }

      await Promise.all([loadEmployees(cid), loadInvites(cid)]);
      setLoading(false);
    }
    load();
  }, []);

  async function loadEmployees(cid: string) {
    const { data } = await supabase
      .from("user_profiles")
      .select("id, name, email, avatar_url, created_at")
      .eq("company_id", cid)
      .in("role", ["employee", "company_admin"])
      .order("created_at", { ascending: false });
    setEmployees(data || []);
  }

  async function loadInvites(cid: string) {
    const { data } = await supabase
      .from("company_invites")
      .select("id, email, role, status, created_at")
      .eq("company_id", cid)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    setInvites((data || []) as Invite[]);
  }

  async function handleInvite() {
    if (!inviteEmail.trim() || !companyId) return;
    setInviting(true);
    setInviteResult(null);

    try {
      const res = await fetch("/api/invite-employee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          companyId,
          companyName,
          role: inviteRole,
          invitedBy: userId,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setInviteResult({ ok: false, msg: data.error || "초대 실패" });
      } else if (data.autoAssigned) {
        setInviteResult({ ok: true, msg: "이미 가입된 유저입니다. 바로 배정되었습니다." });
        await loadEmployees(companyId);
      } else {
        setInviteResult({ ok: true, msg: "초대 이메일을 발송했습니다." });
      }

      setInviteEmail("");
      await loadInvites(companyId);
    } catch {
      setInviteResult({ ok: false, msg: "네트워크 오류" });
    }
    setInviting(false);
  }

  async function cancelInvite(inviteId: string) {
    await supabase.from("company_invites").delete().eq("id", inviteId);
    await loadInvites(companyId);
  }

  if (loading) return <p className="text-[14px] text-gray-500">로딩 중...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-medium text-gray-900">직원 관리</h1>
        <button
          onClick={() => { setShowInvite(!showInvite); setInviteResult(null); }}
          className="px-4 py-2 bg-[#3182F6] text-white rounded-xl text-[13px] font-medium hover:bg-[#2272EB] active:scale-[0.98] transition"
        >
          + 직원 초대
        </button>
      </div>

      {/* 초대 폼 */}
      {showInvite && (
        <div className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl p-5 mb-4">
          <p className="text-[14px] font-medium text-gray-900 mb-3">이메일로 초대</p>
          <div className="flex gap-3 mb-3">
            <input
              type="email"
              placeholder="초대할 이메일 주소"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              className="flex-1 px-3.5 py-2.5 bg-white border-[0.5px] border-gray-200/60 rounded-xl text-[14px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#3182F6]"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "employee" | "company_admin")}
              className="px-3 py-2.5 border-[0.5px] border-gray-200/60 rounded-xl text-[13px] text-gray-700 outline-none bg-white"
            >
              <option value="employee">직원</option>
              <option value="company_admin">기업 관리자</option>
            </select>
            <button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim()}
              className="px-5 py-2.5 bg-[#3182F6] text-white rounded-xl text-[13px] font-medium hover:bg-[#2272EB] disabled:opacity-60"
            >
              {inviting ? "발송 중..." : "초대"}
            </button>
          </div>
          {inviteResult && (
            <p className={`text-[13px] ${inviteResult.ok ? "text-[#1D9E75]" : "text-red-500"}`}>
              {inviteResult.msg}
            </p>
          )}
        </div>
      )}

      {/* 대기 중 초대 */}
      {invites.length > 0 && (
        <div className="mb-6">
          <p className="text-[12px] text-gray-500 mb-2">대기 중인 초대 ({invites.length})</p>
          <div className="flex flex-col gap-2">
            {invites.map((inv) => (
              <div key={inv.id} className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#F2F4F6] flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B0B8C1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-gray-700 truncate">{inv.email}</p>
                  <p className="text-[11px] text-gray-400">{inv.role === "company_admin" ? "기업 관리자" : "직원"} · {new Date(inv.created_at).toLocaleDateString("ko-KR")}</p>
                </div>
                <button onClick={() => cancelInvite(inv.id)} className="text-[11px] text-gray-400 hover:text-red-500">취소</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 직원 목록 */}
      <p className="text-[12px] text-gray-500 mb-2">멤버 ({employees.length}명)</p>
      {employees.length === 0 ? (
        <div className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl p-8 text-center">
          <p className="text-[14px] text-gray-400 mb-2">등록된 직원이 없습니다</p>
          <p className="text-[12px] text-gray-400">위 초대 버튼으로 직원을 초대하세요</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {employees.map((emp) => (
            <div key={emp.id} className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl p-4 flex items-center gap-4">
              {emp.avatar_url ? (
                <img src={emp.avatar_url} alt="" className="w-10 h-10 rounded-full" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#F2F4F6] flex items-center justify-center">
                  <span className="text-[14px] font-medium text-gray-500">
                    {emp.name?.charAt(0) || emp.email?.charAt(0) || "?"}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium text-gray-900 truncate">{emp.name || "이름 없음"}</p>
                <p className="text-[12px] text-gray-500 truncate">{emp.email}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
