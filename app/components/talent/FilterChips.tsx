"use client";

import { useState } from "react";

const FILTERS = ["전체", "개발자", "디자이너", "한국어 가능", "즉시 합류"];

export function FilterChips() {
  const [active, setActive] = useState("전체");

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
      {FILTERS.map((label) => {
        const isActive = active === label;
        return (
          <button
            key={label}
            onClick={() => setActive(label)}
            className={`whitespace-nowrap text-[13px] px-[14px] py-[7px] rounded-full transition-colors duration-100 ${
              isActive
                ? "bg-gray-900 text-white"
                : "bg-white border-0.5 border-gray-200 text-gray-700 hover:border-gray-300"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
