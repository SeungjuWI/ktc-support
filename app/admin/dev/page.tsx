"use client";

import Link from "next/link";

export default function DevModePage() {
  const views = [
    {
      label: "일반 유저",
      desc: "인재 열람 화면",
      href: "/talents",
      color: "text-gray-600 bg-gray-100",
    },
    {
      label: "기업 관리자",
      desc: "직원/프로젝트/출퇴근 관리",
      href: "/manage",
      color: "text-[#1D9E75] bg-[#E6F7F1]",
    },
    {
      label: "직원",
      desc: "출퇴근/업무/보고",
      href: "/work",
      color: "text-[#6B7684] bg-[#F2F4F6]",
    },
  ];

  return (
    <div>
      <h1 className="text-[22px] font-medium text-gray-900 tracking-tight mb-1">개발자 모드</h1>
      <p className="text-[14px] text-gray-500 mb-6">
        각 role의 화면을 직접 확인할 수 있습니다. admin/super_admin은 모든 뷰에 접근 가능합니다.
      </p>

      <div className="flex flex-col gap-3">
        {views.map((v) => (
          <Link
            key={v.href}
            href={v.href}
            className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl p-5 hover:border-gray-300 transition-colors flex items-center justify-between"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[12px] font-medium px-2.5 py-1 rounded-full ${v.color}`}>{v.label}</span>
              </div>
              <p className="text-[13px] text-gray-500">{v.desc}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-gray-400">{v.href}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B0B8C1" strokeWidth="2" strokeLinecap="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-6 p-4 bg-[#E8F3FF] border-[0.5px] border-[#3182F6]/20 rounded-2xl">
        <p className="text-[12px] text-[#3182F6]">
          admin/super_admin 계정은 DB role 변경 없이 /manage, /work 페이지에 직접 접근할 수 있습니다. 데이터 조회는 company_id가 없으면 빈 화면이 나올 수 있습니다.
        </p>
      </div>
    </div>
  );
}
