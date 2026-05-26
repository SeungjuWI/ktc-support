"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Company = {
  id: string;
  name: string;
  created_at: string;
  member_count?: number;
};

type CompanyMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url: string;
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // 이메일로 멤버 추가
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState<"employee" | "company_admin">("employee");
  const [adding, setAdding] = useState(false);
  const [addResult, setAddResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => { loadCompanies(); }, []);

  async function loadCompanies() {
    const { data } = await supabase
      .from("companies")
      .select("id, name, created_at")
      .order("created_at", { ascending: false });

    if (data) {
      // 각 회사별 멤버 수 조회
      const withCounts = await Promise.all(
        data.map(async (c) => {
          const { count } = await supabase
            .from("user_profiles")
            .select("*", { count: "exact", head: true })
            .eq("company_id", c.id);
          return { ...c, member_count: count || 0 };
        })
      );
      setCompanies(withCounts);
    }
    setLoading(false);
  }

  async function handleCreate() {
    if (!formName.trim()) return;
    setCreating(true);
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase
      .from("companies")
      .insert({ name: formName.trim(), created_by: session?.user.id });
    if (!error) {
      setFormName("");
      setShowForm(false);
      await loadCompanies();
    }
    setCreating(false);
  }

  async function handleDelete(companyId: string) {
    if (!confirm("이 기업을 삭제하시겠습니까? 소속 직원의 company_id가 해제됩니다.")) return;

    // 소속 유저의 company_id 해제 + role을 user로 복구
    await supabase
      .from("user_profiles")
      .update({ company_id: null, role: "user", updated_at: new Date().toISOString() })
      .eq("company_id", companyId);

    await supabase.from("companies").delete().eq("id", companyId);
    setExpandedId(null);
    await loadCompanies();
  }

  async function toggleExpand(companyId: string) {
    if (expandedId === companyId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(companyId);
    setMembersLoading(true);
    const { data } = await supabase
      .from("user_profiles")
      .select("id, name, email, role, avatar_url")
      .eq("company_id", companyId)
      .order("role", { ascending: true });
    setMembers((data as CompanyMember[]) || []);
    setMembersLoading(false);
  }

  async function removeMember(userId: string) {
    await supabase
      .from("user_profiles")
      .update({ company_id: null, role: "user", updated_at: new Date().toISOString() })
      .eq("id", userId);
    // 리프레시
    if (expandedId) {
      await toggleExpand(expandedId);
      await loadCompanies();
    }
  }

  async function handleAddByEmail(companyId: string) {
    if (!addEmail.trim()) return;
    setAdding(true);
    setAddResult(null);

    // 이메일로 유저 찾기
    const { data: user } = await supabase
      .from("user_profiles")
      .select("id, role, company_id")
      .eq("email", addEmail.trim())
      .single();

    if (!user) {
      // 유저가 없으면 초대 생성
      const { error } = await supabase.from("company_invites").insert({
        company_id: companyId,
        email: addEmail.trim(),
        role: addRole,
      });
      if (error?.code === "23505") {
        setAddResult({ ok: false, msg: "이미 초대된 이메일입니다" });
      } else if (error) {
        setAddResult({ ok: false, msg: error.message });
      } else {
        setAddResult({ ok: true, msg: "미가입 유저 — 초대가 등록되었습니다. 가입 시 자동 배정됩니다." });
      }
      setAdding(false);
      return;
    }

    if (user.company_id) {
      setAddResult({ ok: false, msg: "이미 다른 기업에 배정된 유저입니다" });
      setAdding(false);
      return;
    }

    // 바로 배정
    await supabase
      .from("user_profiles")
      .update({ company_id: companyId, role: addRole, status: "approved", updated_at: new Date().toISOString() })
      .eq("id", user.id);

    setAddResult({ ok: true, msg: "배정 완료" });
    setAddEmail("");
    await toggleExpand(companyId);
    await loadCompanies();
    setAdding(false);
  }

  const ROLE_LABELS: Record<string, string> = {
    company_admin: "기업 관리자",
    employee: "직원",
    user: "일반",
    admin: "관리자",
    super_admin: "총 관리자",
  };

  const ROLE_BADGE: Record<string, string> = {
    company_admin: "text-[#1D9E75] bg-[#E6F7F1]",
    employee: "text-[#6B7684] bg-[#F2F4F6]",
    user: "text-gray-500 bg-gray-100",
    admin: "text-blue-500 bg-blue-50",
    super_admin: "text-[#E8590C] bg-[#FFF8F0]",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-medium text-gray-900 tracking-tight mb-1">기업 관리</h1>
          <p className="text-[14px] text-gray-500">기업 생성 및 직원 배정</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-[#3182F6] text-white rounded-xl text-[13px] font-medium hover:bg-[#2272EB] active:scale-[0.98] transition"
        >
          + 기업 추가
        </button>
      </div>

      {showForm && (
        <div className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl p-5 mb-4">
          <p className="text-[14px] font-medium text-gray-900 mb-3">새 기업 등록</p>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="기업명"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="flex-1 px-3.5 py-2.5 bg-white border-[0.5px] border-gray-200/60 rounded-xl text-[14px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#3182F6]"
            />
            <button
              onClick={handleCreate}
              disabled={creating || !formName.trim()}
              className="px-5 py-2.5 bg-[#3182F6] text-white rounded-xl text-[13px] font-medium hover:bg-[#2272EB] disabled:opacity-60"
            >
              {creating ? "생성 중..." : "생성"}
            </button>
            <button onClick={() => { setShowForm(false); setFormName(""); }} className="px-3 py-2.5 text-[13px] text-gray-500 hover:text-gray-700">
              취소
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-[14px] text-gray-500 text-center py-16">로딩 중...</p>
      ) : companies.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[14px] text-gray-400">등록된 기업이 없습니다</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {companies.map((c) => (
            <div key={c.id} className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl overflow-hidden">
              <div
                className="p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50/50 transition-colors"
                onClick={() => toggleExpand(c.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#E8F3FF] flex items-center justify-center">
                    <span className="text-[14px] font-medium text-[#3182F6]">{c.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-[15px] font-medium text-gray-900">{c.name}</p>
                    <p className="text-[12px] text-gray-500">
                      {c.member_count || 0}명 · {new Date(c.created_at).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                    className="px-3 py-1.5 text-[12px] text-gray-400 hover:text-red-500 transition-colors"
                  >
                    삭제
                  </button>
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B0B8C1" strokeWidth="2" strokeLinecap="round"
                    className={`transition-transform ${expandedId === c.id ? "rotate-180" : ""}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>

              {expandedId === c.id && (
                <div className="border-t border-gray-100 px-5 py-4">
                  {/* 이메일로 추가 */}
                  <div className="flex gap-2 mb-4">
                    <input
                      type="email"
                      placeholder="이메일로 멤버 추가"
                      value={addEmail}
                      onChange={(e) => { setAddEmail(e.target.value); setAddResult(null); }}
                      onKeyDown={(e) => e.key === "Enter" && handleAddByEmail(c.id)}
                      className="flex-1 px-3 py-2 border-[0.5px] border-gray-200/60 rounded-xl text-[13px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#3182F6]"
                    />
                    <select
                      value={addRole}
                      onChange={(e) => setAddRole(e.target.value as "employee" | "company_admin")}
                      className="px-2.5 py-2 border-[0.5px] border-gray-200/60 rounded-xl text-[12px] text-gray-700 outline-none bg-white"
                    >
                      <option value="employee">직원</option>
                      <option value="company_admin">관리자</option>
                    </select>
                    <button
                      onClick={() => handleAddByEmail(c.id)}
                      disabled={adding || !addEmail.trim()}
                      className="px-4 py-2 bg-[#3182F6] text-white rounded-xl text-[12px] font-medium hover:bg-[#2272EB] disabled:opacity-60"
                    >
                      {adding ? "..." : "추가"}
                    </button>
                  </div>
                  {addResult && (
                    <p className={`text-[12px] mb-3 ${addResult.ok ? "text-[#1D9E75]" : "text-red-500"}`}>{addResult.msg}</p>
                  )}

                  {membersLoading ? (
                    <p className="text-[13px] text-gray-500">로딩 중...</p>
                  ) : members.length === 0 ? (
                    <p className="text-[13px] text-gray-400">배정된 멤버가 없습니다</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {members.map((m) => (
                        <div key={m.id} className="flex items-center gap-3 py-2">
                          {m.avatar_url ? (
                            <img src={m.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[#F2F4F6] flex items-center justify-center">
                              <span className="text-[11px] text-gray-500">{m.name?.charAt(0) || "?"}</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] text-gray-900 truncate">{m.name || m.email}</p>
                            <p className="text-[11px] text-gray-500 truncate">{m.email}</p>
                          </div>
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${ROLE_BADGE[m.role] || "text-gray-500 bg-gray-100"}`}>
                            {ROLE_LABELS[m.role] || m.role}
                          </span>
                          <button
                            onClick={() => removeMember(m.id)}
                            className="text-[11px] text-gray-400 hover:text-red-500"
                          >
                            해제
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
