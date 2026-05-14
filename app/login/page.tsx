"use client";

import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("[Login attempt]", { email });
    alert("로그인 기능은 준비 중입니다. 인재 둘러보기는 로그인 없이 가능합니다.");
  }

  return (
    <main className="min-h-screen bg-[#F7F8FA] flex flex-col">
      {/* 헤더 */}
      <header className="bg-white">
        <div className="mx-auto max-w-[1080px] px-5 h-[56px] flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="VTM" width={24} height={24} className="rounded-[4px]" />
            <span className="text-[18px] text-gray-900 tracking-tight" style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>
              Vtm
            </span>
          </Link>
        </div>
        <div className="h-[0.5px] bg-gray-200/80" />
      </header>

      {/* 로그인 폼 */}
      <div className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-[400px]">
          <div className="text-center mb-8">
            <h1 className="text-[22px] font-medium text-gray-900 tracking-tight mb-2">
              로그인
            </h1>
            <p className="text-[14px] text-gray-500">
              기업 담당자 계정으로 로그인하세요
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="bg-white border-[0.5px] border-gray-200/60 rounded-[20px] p-6">
              {/* 이메일 */}
              <div className="mb-4">
                <label className="text-[13px] font-medium text-gray-600 mb-2 block">
                  이메일
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="이메일 주소를 입력하세요"
                  className="w-full px-3.5 py-3 border-[0.5px] border-gray-200/60 rounded-xl text-[14px] text-gray-900 outline-none focus:border-blue-500 transition-colors placeholder:text-gray-400"
                />
              </div>

              {/* 비밀번호 */}
              <div className="mb-6">
                <label className="text-[13px] font-medium text-gray-600 mb-2 block">
                  비밀번호
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  className="w-full px-3.5 py-3 border-[0.5px] border-gray-200/60 rounded-xl text-[14px] text-gray-900 outline-none focus:border-blue-500 transition-colors placeholder:text-gray-400"
                />
              </div>

              {/* 로그인 버튼 */}
              <button
                type="submit"
                className="w-full py-3.5 bg-blue-500 text-white rounded-xl text-[15px] font-medium hover:bg-blue-600 active:scale-[0.98] transition"
              >
                로그인
              </button>
            </div>

            {/* 하단 링크 */}
            <div className="flex items-center justify-center gap-4 mt-5">
              <button
                type="button"
                onClick={() =>
                  alert("비밀번호 찾기 기능은 준비 중입니다.")
                }
                className="text-[13px] text-gray-500 hover:text-gray-700 transition-colors"
              >
                비밀번호 찾기
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={() =>
                  alert("회원가입 기능은 준비 중입니다.")
                }
                className="text-[13px] text-gray-500 hover:text-gray-700 transition-colors"
              >
                회원가입
              </button>
            </div>
          </form>

          {/* 둘러보기 안내 */}
          <div className="bg-white border-[0.5px] border-gray-200/60 rounded-[20px] px-5 py-4 mt-6 text-center">
            <p className="text-[13px] text-gray-600 mb-2">
              아직 계정이 없으신가요?
            </p>
            <Link
              href="/talents"
              className="text-[14px] text-blue-500 font-medium hover:text-blue-600 transition-colors"
            >
              로그인 없이 인재 둘러보기 →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
