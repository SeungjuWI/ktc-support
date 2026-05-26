"use client";

const PERMISSIONS = [
  "인재 열람",
  "인재 등록 / 수정 / 삭제",
  "인재 게시 상태 관리",
  "사용자 가입 승인 / 거절",
  "관리자 임명 / 해제",
  "기업 생성 / 직원 배정",
  "소속 직원 관리",
  "출퇴근 / 업무 보고",
];

const ROLES = [
  {
    name: "일반",
    badge: "text-gray-500 bg-gray-100",
    allowed: [true, false, false, false, false, false, false, false],
  },
  {
    name: "직원",
    badge: "text-[#6B7684] bg-[#F2F4F6]",
    allowed: [false, false, false, false, false, false, false, true],
  },
  {
    name: "기업 관리자",
    badge: "text-[#1D9E75] bg-[#E6F7F1]",
    allowed: [false, false, false, false, false, false, true, false],
  },
  {
    name: "관리자",
    badge: "text-blue-500 bg-blue-50",
    allowed: [true, true, true, true, false, false, false, false],
  },
  {
    name: "총 관리자",
    badge: "text-[#E8590C] bg-[#FFF8F0]",
    allowed: [true, true, true, true, true, true, false, false],
  },
];

function Check() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M5 9l3 3 5-5" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function X() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M6 6l6 6M12 6l-6 6" stroke="#D1D6DB" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function RolesPage() {
  return (
    <div>
      <h1 className="text-[22px] font-medium text-gray-900 tracking-tight mb-1">
        권한 안내
      </h1>
      <p className="text-[14px] text-gray-500 mb-8">
        등급별 접근 가능한 기능을 안내합니다
      </p>

      <div className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl overflow-hidden overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-[13px] text-gray-500 font-normal px-5 py-3.5">권한</th>
              {ROLES.map((r) => (
                <th key={r.name} className="text-center px-4 py-3.5">
                  <span className={`text-[12px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${r.badge}`}>
                    {r.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((perm, i) => (
              <tr key={perm} className={i < PERMISSIONS.length - 1 ? "border-b border-gray-100/60" : ""}>
                <td className="text-[13px] text-gray-700 px-5 py-3.5 whitespace-nowrap">{perm}</td>
                {ROLES.map((r) => (
                  <td key={r.name} className="text-center px-4 py-3.5">
                    <span className="inline-flex justify-center">
                      {r.allowed[i] ? <Check /> : <X />}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[12px] text-gray-400 mt-5 px-1 leading-[18px]">
        * 총 관리자 및 관리자 임명은 총 관리자가 사용자 관리 &gt; 승인 탭에서 할 수 있습니다.<br />
        * 기업 배정 및 직원/기업관리자 역할 부여도 사용자 관리에서 할 수 있습니다.
      </p>
    </div>
  );
}
