"use client";

import { useState, useRef, useEffect } from "react";

export type RoleFilter = string;
export type SortOption = string;

const ROLE_CATEGORIES: { label: string; roles: string[] }[] = [
  { label: "전체", roles: [] },
  {
    label: "개발자",
    roles: ["프론트엔드", "백엔드", "풀스택", "DevOps", "모바일"],
  },
  {
    label: "디자이너",
    roles: ["UI/UX 디자이너", "그래픽 디자이너", "모션 디자이너"],
  },
  {
    label: "데이터",
    roles: ["데이터 분석가", "데이터 엔지니어", "AI/ML"],
  },
  { label: "QA", roles: ["QA"] },
];

const SORT_OPTIONS: { label: string; value: string }[] = [
  { label: "추천순", value: "recommended" },
  { label: "연봉 낮은순", value: "salary_asc" },
  { label: "연봉 높은순", value: "salary_desc" },
  { label: "경력 높은순", value: "exp_desc" },
  { label: "경력 낮은순", value: "exp_asc" },
  { label: "한국어 잘하는순", value: "korean_desc" },
  { label: "최근 등록순", value: "newest" },
];

interface FilterChipsProps {
  onRoleChange?: (roles: string[]) => void;
  onSortChange?: (sort: string) => void;
}

export function FilterChips({ onRoleChange, onSortChange }: FilterChipsProps) {
  const [activeCategory, setActiveCategory] = useState("전체");
  const [activeSubRole, setActiveSubRole] = useState<string | null>(null);
  const [sort, setSort] = useState("recommended");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  // 드롭다운 바깥 클릭 시 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setShowSortDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const currentCategory = ROLE_CATEGORIES.find((c) => c.label === activeCategory);
  const hasSubRoles = currentCategory && currentCategory.roles.length > 0;

  function handleCategoryClick(label: string) {
    setActiveCategory(label);
    setActiveSubRole(null);
    const cat = ROLE_CATEGORIES.find((c) => c.label === label);
    onRoleChange?.(cat?.roles.length ? cat.roles : []);
  }

  function handleSubRoleClick(role: string) {
    if (activeSubRole === role) {
      // 다시 클릭하면 해제 → 상위 카테고리 전체
      setActiveSubRole(null);
      onRoleChange?.(currentCategory?.roles || []);
    } else {
      setActiveSubRole(role);
      onRoleChange?.([role]);
    }
  }

  function handleSortClick(value: string) {
    setSort(value);
    setShowSortDropdown(false);
    onSortChange?.(value);
  }

  const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label || "추천순";

  return (
    <div className="space-y-2.5">
      {/* 상위 카테고리 + 정렬 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {ROLE_CATEGORIES.map(({ label }) => {
            const isActive = activeCategory === label;
            return (
              <button
                key={label}
                onClick={() => handleCategoryClick(label)}
                className={`whitespace-nowrap text-[13px] px-[14px] py-[7px] rounded-full transition-colors duration-100 ${
                  isActive
                    ? "bg-[#191F28] text-white"
                    : "bg-white border border-[#E5E8EB] text-[#4E5968] hover:border-[#D1D6DB]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* 정렬 드롭다운 */}
        <div className="relative ml-3" ref={sortRef}>
          <button
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            className="whitespace-nowrap text-[12px] text-[#6B7684] hover:text-[#191F28] transition-colors flex items-center gap-1"
          >
            {sortLabel}
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {showSortDropdown && (
            <div className="absolute right-0 top-full mt-1.5 bg-white border border-[#E5E8EB] rounded-xl py-1.5 z-20 min-w-[140px]">
              {SORT_OPTIONS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => handleSortClick(value)}
                  className={`block w-full text-left px-4 py-2 text-[13px] transition-colors ${
                    sort === value
                      ? "text-[#3182F6] bg-[#E8F3FF]/50"
                      : "text-[#4E5968] hover:bg-[#F9FAFB]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 세부 직무 칩 */}
      {hasSubRoles && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {currentCategory.roles.map((role) => {
            const isActive = activeSubRole === role;
            return (
              <button
                key={role}
                onClick={() => handleSubRoleClick(role)}
                className={`whitespace-nowrap text-[12px] px-3 py-[5px] rounded-full transition-colors duration-100 ${
                  isActive
                    ? "bg-[#3182F6] text-white"
                    : "bg-[#F2F4F6] text-[#6B7684] hover:bg-[#E5E8EB]"
                }`}
              >
                {role}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
