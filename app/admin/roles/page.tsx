"use client";

import { useAdminI18n } from "@/lib/admin-i18n";

// [일반(기업), 관리자, 총 관리자] 순서의 허용 여부
const PERMISSIONS: { labelKey: string; allowed: [boolean, boolean, boolean] }[] = [
  { labelKey: "roles.perm.viewTalents", allowed: [true, true, true] },
  { labelKey: "roles.perm.dashboard", allowed: [false, true, true] },
  { labelKey: "roles.perm.candidates", allowed: [false, true, true] },
  { labelKey: "roles.perm.jd", allowed: [false, true, true] },
  { labelKey: "roles.perm.talentCards", allowed: [false, true, true] },
  { labelKey: "roles.perm.ops", allowed: [false, true, true] },
  { labelKey: "roles.perm.approveUsers", allowed: [false, true, true] },
  { labelKey: "roles.perm.dataPipeline", allowed: [false, false, true] },
  { labelKey: "roles.perm.manageAdmins", allowed: [false, false, true] },
];

const ROLE_COLS = [
  { labelKey: "users.roleUser", badge: "text-gray-500 bg-gray-100" },
  { labelKey: "users.roleAdmin", badge: "text-blue-500 bg-blue-50" },
  { labelKey: "users.roleSuperAdmin", badge: "text-[#E8590C] bg-[#FFF8F0]" },
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
  const { t } = useAdminI18n();

  return (
    <div>
      <h1 className="text-[22px] font-medium text-gray-900 tracking-tight mb-1">
        {t("nav.roles")}
      </h1>
      <p className="text-[14px] text-gray-500 mb-8">{t("roles.subtitle")}</p>

      <div className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-[13px] text-gray-500 font-normal px-5 py-3.5">{t("roles.colPermission")}</th>
              {ROLE_COLS.map((r) => (
                <th key={r.labelKey} className="text-center px-4 py-3.5">
                  <span className={`text-[12px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${r.badge}`}>
                    {t(r.labelKey)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((perm, i) => (
              <tr key={perm.labelKey} className={i < PERMISSIONS.length - 1 ? "border-b border-gray-100/60" : ""}>
                <td className="text-[13px] text-gray-700 px-5 py-3.5">{t(perm.labelKey)}</td>
                {perm.allowed.map((ok, col) => (
                  <td key={col} className="text-center px-4 py-3.5">
                    <span className="inline-flex justify-center">
                      {ok ? <Check /> : <X />}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[12px] text-gray-400 mt-5 px-1 leading-[18px]">{t("roles.note")}</p>
    </div>
  );
}
