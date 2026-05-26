"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { signInWithGoogle, signOut, getUserProfile } from "@/lib/supabase-auth";
import { Header } from "@/app/components/Header";
import type { User } from "@supabase/supabase-js";

type UserProfile = {
  role: "super_admin" | "admin" | "user" | "company_admin" | "employee";
  status: "pending" | "approved" | "rejected";
  name: string;
  email: string;
  avatar_url: string;
  company_name: string | null;
  contact_name: string | null;
};

function LoginContent() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type") === "work" ? "work" : "talent";
  const [loginType, setLoginType] = useState<"talent" | "work">(initialType);

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // 가입 신청 폼 상태
  const [regForm, setRegForm] = useState({ companyName: "", contactName: "" });
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});
  const [regSubmitting, setRegSubmitting] = useState(false);

  useEffect(() => {
    async function loadSession() {
      const { data: { session } } = await supabase.auth.getSession();
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        const p = await getUserProfile(u.id, true);
        setProfile(p as UserProfile | null);
      }
      setLoading(false);
    }

    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          const p = await getUserProfile(u.id, true);
          setProfile(p as UserProfile | null);
          setLoading(false);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function handleGoogleLogin() {
    const { error } = await signInWithGoogle();
    if (error) alert("로그인 중 오류가 발생했습니다: " + error.message);
  }

  async function handleSignOut() {
    await signOut();
    setUser(null);
    setProfile(null);
  }

  async function handleDeleteAccount() {
    if (!confirm("정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
    if (!user) return;

    await fetch("/api/delete-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    });

    await signOut();
    setUser(null);
    setProfile(null);
    window.location.href = "/";
  }

  async function handleRegSubmit() {
    const errors: Record<string, string> = {};
    if (!regForm.companyName.trim()) errors.companyName = "필수 입력 항목입니다";
    if (!regForm.contactName.trim()) errors.contactName = "필수 입력 항목입니다";

    if (Object.keys(errors).length > 0) {
      setRegErrors(errors);
      return;
    }

    setRegSubmitting(true);
    const { error } = await supabase
      .from("user_profiles")
      .update({
        company_name: regForm.companyName.trim(),
        contact_name: regForm.contactName.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user!.id);

    if (error) {
      alert("저장 중 오류가 발생했습니다. 다시 시도해주세요.");
      setRegSubmitting(false);
      return;
    }

    // 관리자에게 알림 이메일 발송 (실패해도 가입 신청은 정상 처리)
    fetch("/api/notify-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "signup",
        email: profile!.email,
        name: profile!.name,
        companyName: regForm.companyName.trim(),
        contactName: regForm.contactName.trim(),
      }),
    }).catch(() => {});

    // 프로필 다시 로드
    const p = await getUserProfile(user!.id, true);
    setProfile(p as UserProfile | null);
    setRegSubmitting(false);
  }

  // 가입 신청 폼이 필요한지 판별: 일반 유저만 (admin/super_admin은 제외)
  const needsRegistration = user && profile && !profile.company_name && profile.role === "user";

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <p className="text-[14px] text-gray-500">로딩 중...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F8FA] flex flex-col">
      <Header />

      <div className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-[400px]">

          {/* 로그인 안 된 상태 */}
          {!user && (
            <>
              {/* 모드 선택 탭 */}
              <div className="flex bg-gray-100 rounded-xl p-1 mb-8">
                <button
                  onClick={() => setLoginType("talent")}
                  className={`flex-1 py-2.5 rounded-[10px] text-[13px] font-medium transition-colors ${
                    loginType === "talent" ? "bg-white text-gray-900" : "text-gray-500"
                  }`}
                >
                  인재 열람
                </button>
                <button
                  onClick={() => setLoginType("work")}
                  className={`flex-1 py-2.5 rounded-[10px] text-[13px] font-medium transition-colors ${
                    loginType === "work" ? "bg-white text-gray-900" : "text-gray-500"
                  }`}
                >
                  기업 관리 / 직원
                </button>
              </div>

              <div className="text-center mb-10">
                <img src="/logo.png" alt="" width={56} height={56} className="rounded-[8px] mx-auto mb-5" />
                {loginType === "work" ? (
                  <>
                    <h1 className="text-[24px] font-medium text-gray-900 tracking-tight mb-3">
                      팀에 합류하세요
                    </h1>
                    <p className="text-[14px] text-gray-500 leading-relaxed">
                      초대받은 Google 계정으로 로그인하면<br />바로 업무를 시작할 수 있습니다
                    </p>
                  </>
                ) : (
                  <>
                    <h1 className="text-[24px] font-medium text-gray-900 tracking-tight mb-3">
                      검증된 베트남 IT 인재,<br />지금 바로 확인하세요
                    </h1>
                    <p className="text-[14px] text-gray-500 leading-relaxed">
                      이력서 분석부터 능력치 평가까지 완료된<br />인재 카드를 열람할 수 있습니다
                    </p>
                  </>
                )}
              </div>

              <div className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl p-6">
                <button
                  onClick={handleGoogleLogin}
                  className="w-full py-3.5 bg-white border-[0.5px] border-gray-200 rounded-xl text-[15px] font-medium text-gray-900 hover:bg-gray-50 active:scale-[0.98] transition flex items-center justify-center gap-3"
                >
                  <svg width="20" height="20" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                  Google 계정으로 로그인
                </button>
                <p className="text-[12px] text-gray-400 text-center mt-4">
                  {loginType === "work" ? "승인된 계정으로 로그인해주세요" : "기업 담당자 계정으로 로그인해주세요"}
                </p>
              </div>

              {loginType === "talent" && (
                <div className="flex items-center justify-center gap-4 mt-8">
                  <div className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8B95A1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                      <path d="M22 4L12 14.01l-3-3" />
                    </svg>
                    <span className="text-[12px] text-gray-500">KTC 검증 인재</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8B95A1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                      <path d="M22 4L12 14.01l-3-3" />
                    </svg>
                    <span className="text-[12px] text-gray-500">능력치 카드</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8B95A1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                      <path d="M22 4L12 14.01l-3-3" />
                    </svg>
                    <span className="text-[12px] text-gray-500">즉시 채용</span>
                  </div>
                </div>
              )}

              {loginType === "work" && (
                <div className="flex items-center justify-center gap-4 mt-8">
                  <div className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8B95A1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                      <path d="M22 4L12 14.01l-3-3" />
                    </svg>
                    <span className="text-[12px] text-gray-500">출퇴근 체크</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8B95A1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                      <path d="M22 4L12 14.01l-3-3" />
                    </svg>
                    <span className="text-[12px] text-gray-500">업무 관리</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8B95A1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                      <path d="M22 4L12 14.01l-3-3" />
                    </svg>
                    <span className="text-[12px] text-gray-500">일일 보고</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* 로그인 됨 - 프로필 로딩 실패 */}
          {user && !profile && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-5">
                <span className="text-[22px] font-medium text-gray-400">
                  {user.email?.charAt(0)?.toUpperCase() || "?"}
                </span>
              </div>
              <h1 className="text-[22px] font-medium text-gray-900 tracking-tight mb-2">
                로그인 완료
              </h1>
              <p className="text-[14px] text-gray-500 mb-6">
                {user.email}
              </p>
              <div className="flex flex-col gap-3">
                <Link
                  href="/talents"
                  className="w-full py-3.5 bg-blue-500 text-white rounded-xl text-[15px] font-medium hover:bg-blue-600 active:scale-[0.98] transition text-center"
                >
                  인재 둘러보기
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-[13px] text-gray-500 hover:text-gray-700 transition-colors"
                >
                  로그아웃
                </button>
              </div>
            </div>
          )}

          {/* 로그인 됨 - 가입 신청 폼 (회사명/담당자명 미입력) */}
          {needsRegistration && (
            <div>
              <div className="text-center mb-8">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-16 h-16 rounded-full mx-auto mb-4" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                    <span className="text-[22px] font-medium text-blue-500">
                      {profile.name?.charAt(0) || profile.email?.charAt(0) || "?"}
                    </span>
                  </div>
                )}
                <h1 className="text-[22px] font-medium text-gray-900 tracking-tight mb-2">
                  가입 신청
                </h1>
                <p className="text-[14px] text-gray-500 leading-relaxed">
                  서비스 이용을 위해 아래 정보를 입력해주세요
                </p>
              </div>

              <div className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl p-6">
                {/* 이메일 (읽기 전용) */}
                <div className="mb-4">
                  <label className="text-[13px] text-gray-500 mb-1.5 block">이메일</label>
                  <div className="w-full px-3.5 py-3 bg-gray-50 border-[0.5px] border-gray-200/60 rounded-xl text-[14px] text-gray-500">
                    {profile.email}
                  </div>
                </div>

                {/* 이름 (읽기 전용 — Google에서 가져옴) */}
                {profile.name && (
                  <div className="mb-4">
                    <label className="text-[13px] text-gray-500 mb-1.5 block">이름</label>
                    <div className="w-full px-3.5 py-3 bg-gray-50 border-[0.5px] border-gray-200/60 rounded-xl text-[14px] text-gray-500">
                      {profile.name}
                    </div>
                  </div>
                )}

                {/* 회사명 */}
                <div className="mb-4">
                  <label className="text-[13px] text-gray-500 mb-1.5 block">회사명</label>
                  <input
                    type="text"
                    placeholder="예: ABC상사"
                    value={regForm.companyName}
                    onChange={(e) => {
                      setRegForm((prev) => ({ ...prev, companyName: e.target.value }));
                      if (regErrors.companyName) setRegErrors((prev) => { const n = { ...prev }; delete n.companyName; return n; });
                    }}
                    className={`w-full px-3.5 py-3 bg-white border-[0.5px] rounded-xl text-[14px] text-gray-900 outline-none transition-colors placeholder:text-gray-400 ${
                      regErrors.companyName ? "border-red-400 focus:border-red-400" : "border-gray-200/60 focus:border-blue-500"
                    }`}
                  />
                  {regErrors.companyName && <p className="text-[11px] text-red-500 mt-1">{regErrors.companyName}</p>}
                </div>

                {/* 담당자명 */}
                <div className="mb-6">
                  <label className="text-[13px] text-gray-500 mb-1.5 block">담당자명</label>
                  <input
                    type="text"
                    placeholder="예: 김인사"
                    value={regForm.contactName}
                    onChange={(e) => {
                      setRegForm((prev) => ({ ...prev, contactName: e.target.value }));
                      if (regErrors.contactName) setRegErrors((prev) => { const n = { ...prev }; delete n.contactName; return n; });
                    }}
                    className={`w-full px-3.5 py-3 bg-white border-[0.5px] rounded-xl text-[14px] text-gray-900 outline-none transition-colors placeholder:text-gray-400 ${
                      regErrors.contactName ? "border-red-400 focus:border-red-400" : "border-gray-200/60 focus:border-blue-500"
                    }`}
                  />
                  {regErrors.contactName && <p className="text-[11px] text-red-500 mt-1">{regErrors.contactName}</p>}
                </div>

                <button
                  onClick={handleRegSubmit}
                  disabled={regSubmitting}
                  className="w-full py-3.5 bg-blue-500 text-white rounded-xl text-[15px] font-medium hover:bg-blue-600 active:scale-[0.98] transition disabled:opacity-60"
                >
                  {regSubmitting ? "제출 중..." : "가입 신청하기"}
                </button>
              </div>

              <button
                onClick={handleSignOut}
                className="w-full mt-4 text-[13px] text-gray-500 hover:text-gray-700 transition-colors text-center"
              >
                로그아웃
              </button>
            </div>
          )}

          {/* 로그인 됨 - 승인 대기 (가입 신청 완료 후) */}
          {user && profile?.status === "pending" && !needsRegistration && (
            <div className="text-center">
              <img src="/time.png" alt="" width={64} height={64} className="mx-auto mb-5" />
              <h1 className="text-[22px] font-medium text-gray-900 tracking-tight mb-3">
                가입 신청이 완료되었습니다
              </h1>
              <p className="text-[14px] text-gray-500 mb-2">
                {profile.email}
              </p>
              <p className="text-[14px] text-gray-500 leading-relaxed mb-8">
                현재 승인 대기 중입니다.<br />승인이 완료되면 메일로 안내드리겠습니다.
              </p>
              <button
                onClick={handleSignOut}
                className="text-[13px] text-gray-500 hover:text-gray-700 transition-colors"
              >
                로그아웃
              </button>
            </div>
          )}

          {/* 로그인 됨 - 승인 거절 */}
          {user && profile?.status === "rejected" && !needsRegistration && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E8590C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M15 9l-6 6M9 9l6 6"/>
                </svg>
              </div>
              <h1 className="text-[22px] font-medium text-gray-900 tracking-tight mb-3">
                가입이 승인되지 않았습니다
              </h1>
              <p className="text-[14px] text-gray-500 mb-8">
                문의사항이 있으시면 ktc@likelion.net으로 연락해주세요.
              </p>
              <button
                onClick={handleSignOut}
                className="text-[13px] text-gray-500 hover:text-gray-700 transition-colors"
              >
                로그아웃
              </button>
            </div>
          )}

          {/* 로그인 됨 - 승인 완료: 프로필 */}
          {user && profile?.status === "approved" && !needsRegistration && (
            <div>
              {/* 프로필 카드 */}
              <div className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl p-6 mb-4">
                <div className="flex items-center gap-4 mb-5">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-14 h-14 rounded-full" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
                      <span className="text-[20px] font-medium text-blue-500">
                        {profile.name?.charAt(0) || profile.email?.charAt(0) || "?"}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[17px] font-medium text-gray-900 truncate">
                      {profile.name || "사용자"}
                    </p>
                    <p className="text-[13px] text-gray-500 truncate">{profile.email}</p>
                  </div>
                  <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${
                    profile.role === "super_admin" ? "text-[#E8590C] bg-[#FFF8F0]" :
                    profile.role === "admin" ? "text-blue-500 bg-blue-50" :
                    profile.role === "company_admin" ? "text-[#1D9E75] bg-[#E6F7F1]" :
                    profile.role === "employee" ? "text-[#6B7684] bg-[#F2F4F6]" :
                    "text-gray-500 bg-gray-100"
                  }`}>
                    {profile.role === "super_admin" ? "총 관리자" : profile.role === "admin" ? "관리자" : profile.role === "company_admin" ? "기업 관리자" : profile.role === "employee" ? "직원" : "일반"}
                  </span>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-[13px] text-gray-500">계정 상태</span>
                    <span className="text-[13px] text-[#1D9E75] font-medium">승인됨</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-[13px] text-gray-500">이메일</span>
                    <span className="text-[13px] text-gray-900">{profile.email}</span>
                  </div>
                  {profile.company_name && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-[13px] text-gray-500">회사</span>
                      <span className="text-[13px] text-gray-900">{profile.company_name}</span>
                    </div>
                  )}
                  {profile.contact_name && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-[13px] text-gray-500">담당자</span>
                      <span className="text-[13px] text-gray-900">{profile.contact_name}</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className="w-full py-3.5 bg-white border-[0.5px] border-gray-200/60 rounded-2xl text-[14px] text-gray-500 hover:bg-gray-50 transition-colors"
              >
                로그아웃
              </button>
              <button
                onClick={handleDeleteAccount}
                className="w-full mt-4 text-[12px] text-gray-400 hover:text-red-500 transition-colors"
              >
                회원 탈퇴
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <p className="text-[14px] text-gray-500">로딩 중...</p>
      </main>
    }>
      <LoginContent />
    </Suspense>
  );
}
