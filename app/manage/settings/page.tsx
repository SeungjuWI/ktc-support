"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { getUserProfile } from "@/lib/supabase-auth";

type CompanyInfo = {
  id: string;
  name: string;
  logo_url: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  description: string | null;
  created_at: string;
};

export default function ManageSettingsPage() {
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [userId, setUserId] = useState("");
  const [, setCompanyId] = useState("");

  // 폼
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    description: "",
  });

  // 로고 업로드
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // 회사 없을 때 새로 생성
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  // 내 프로필
  const [myName, setMyName] = useState("");
  const [myEmail, setMyEmail] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUserId(session.user.id);
      const profile = await getUserProfile(session.user.id);
      if (!profile) return;

      setMyName(profile.name || "");
      setMyEmail(profile.email || "");

      const cid = profile.company_id;
      if (!cid) { setLoading(false); return; }
      setCompanyId(cid);

      const { data: comp } = await supabase
        .from("companies")
        .select("id, name, logo_url, email, phone, address, description, created_at")
        .eq("id", cid)
        .single();

      if (comp) {
        setCompany(comp as CompanyInfo);
        setForm({
          name: comp.name || "",
          email: comp.email || "",
          phone: comp.phone || "",
          address: comp.address || "",
          description: comp.description || "",
        });
      }

      const { count } = await supabase
        .from("user_profiles")
        .select("*", { count: "exact", head: true })
        .eq("company_id", cid);
      setMemberCount(count || 0);
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    if (!form.name.trim() || !company) return;
    setSaving(true);
    await supabase
      .from("companies")
      .update({
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        description: form.description.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", company.id);
    setCompany((prev) => prev ? { ...prev, name: form.name.trim(), email: form.email.trim() || null, phone: form.phone.trim() || null, address: form.address.trim() || null, description: form.description.trim() || null } : null);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !company) return;
    setUploading(true);

    const ext = file.name.split(".").pop();
    const path = `company-logos/${company.id}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("public")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      alert("업로드 실패: " + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("public").getPublicUrl(path);
    const logoUrl = urlData.publicUrl + "?t=" + Date.now();

    await supabase.from("companies").update({ logo_url: logoUrl, updated_at: new Date().toISOString() }).eq("id", company.id);
    setCompany((prev) => prev ? { ...prev, logo_url: logoUrl } : null);
    setUploading(false);
  }

  async function handleCreateCompany() {
    if (!newName.trim() || !userId) return;
    setCreating(true);

    const { data, error } = await supabase
      .from("companies")
      .insert({ name: newName.trim(), created_by: userId })
      .select("id, name, logo_url, email, phone, address, description, created_at")
      .single();

    if (error || !data) {
      alert("생성 실패: " + (error?.message || ""));
      setCreating(false);
      return;
    }

    // 내 프로필에 company_id 연결
    await supabase
      .from("user_profiles")
      .update({ company_id: data.id, role: "company_admin", updated_at: new Date().toISOString() })
      .eq("id", userId);

    // 캐시 클리어
    sessionStorage.removeItem("vtm:profile");

    setCompany(data as CompanyInfo);
    setCompanyId(data.id);
    setForm({ name: data.name, email: "", phone: "", address: "", description: "" });
    setCreating(false);
  }

  if (loading) return <p className="text-[14px] text-gray-500">로딩 중...</p>;

  // 회사 없으면 생성 폼
  if (!company) {
    return (
      <div>
        <h1 className="text-[22px] font-medium text-gray-900 mb-4">회사 정보</h1>
        <div className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl p-6">
          <p className="text-[14px] text-gray-700 mb-4">아직 등록된 회사가 없습니다. 새로 만들어보세요.</p>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="회사명 입력"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateCompany()}
              className="flex-1 px-3.5 py-3 bg-white border-[0.5px] border-gray-200/60 rounded-xl text-[14px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#3182F6]"
            />
            <button
              onClick={handleCreateCompany}
              disabled={creating || !newName.trim()}
              className="px-5 py-3 bg-[#3182F6] text-white rounded-xl text-[14px] font-medium hover:bg-[#2272EB] disabled:opacity-60"
            >
              {creating ? "생성 중..." : "회사 만들기"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-medium text-gray-900">회사 정보</h1>
        {saved && <span className="text-[13px] text-[#1D9E75]">저장되었습니다</span>}
      </div>

      {/* 로고 + 회사명 */}
      <div className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-5 mb-5">
          {/* 로고 */}
          <div className="relative group">
            {company.logo_url ? (
              <img src={company.logo_url} alt="" className="w-16 h-16 rounded-2xl object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-[#E8F3FF] flex items-center justify-center">
                <span className="text-[22px] font-medium text-[#3182F6]">{company.name.charAt(0)}</span>
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {uploading ? (
                <span className="text-[10px] text-white">업로드 중...</span>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </div>

          <div className="flex-1">
            <p className="text-[11px] text-gray-400 mb-1">회사명</p>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full text-[18px] font-medium text-gray-900 outline-none border-b border-transparent focus:border-[#3182F6] pb-0.5"
            />
            <p className="text-[12px] text-gray-400 mt-1">
              멤버 {memberCount}명 · 등록 {new Date(company.created_at).toLocaleDateString("ko-KR")}
            </p>
          </div>
        </div>

        {/* 상세 필드 */}
        <div className="grid gap-4">
          <div>
            <label className="text-[12px] text-gray-500 mb-1.5 block">대표 이메일</label>
            <input
              type="email"
              placeholder="company@example.com"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              className="w-full px-3.5 py-2.5 bg-white border-[0.5px] border-gray-200/60 rounded-xl text-[14px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#3182F6]"
            />
          </div>
          <div>
            <label className="text-[12px] text-gray-500 mb-1.5 block">연락처</label>
            <input
              type="tel"
              placeholder="010-0000-0000"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              className="w-full px-3.5 py-2.5 bg-white border-[0.5px] border-gray-200/60 rounded-xl text-[14px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#3182F6]"
            />
          </div>
          <div>
            <label className="text-[12px] text-gray-500 mb-1.5 block">주소</label>
            <input
              type="text"
              placeholder="서울특별시 강남구..."
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              className="w-full px-3.5 py-2.5 bg-white border-[0.5px] border-gray-200/60 rounded-xl text-[14px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#3182F6]"
            />
          </div>
          <div>
            <label className="text-[12px] text-gray-500 mb-1.5 block">회사 소개</label>
            <textarea
              placeholder="간단한 회사 소개를 작성해주세요"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={3}
              className="w-full px-3.5 py-2.5 bg-white border-[0.5px] border-gray-200/60 rounded-xl text-[14px] text-gray-900 outline-none resize-none placeholder:text-gray-400 focus:border-[#3182F6]"
            />
          </div>
        </div>

        <div className="flex justify-end mt-5">
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            className="px-6 py-2.5 bg-[#3182F6] text-white rounded-xl text-[14px] font-medium hover:bg-[#2272EB] active:scale-[0.98] transition disabled:opacity-60"
          >
            {saving ? "저장 중..." : "저장하기"}
          </button>
        </div>
      </div>

      {/* 내 계정 정보 */}
      <div className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl p-5">
        <p className="text-[14px] font-medium text-gray-900 mb-4">내 계정</p>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-50">
            <span className="text-[13px] text-gray-500">이름</span>
            <span className="text-[13px] text-gray-900">{myName || "-"}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-50">
            <span className="text-[13px] text-gray-500">이메일</span>
            <span className="text-[13px] text-gray-900">{myEmail}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-[13px] text-gray-500">역할</span>
            <span className="text-[12px] font-medium text-[#1D9E75] bg-[#E6F7F1] px-2.5 py-1 rounded-full">기업 관리자</span>
          </div>
        </div>
      </div>
    </div>
  );
}
