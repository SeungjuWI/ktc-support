import { Talent } from "@/lib/types";
import { translateRole } from "@/lib/i18n";

function getScoreStyle(score: number) {
  if (score >= 85) return "bg-grade-s-bg text-grade-s-text";
  if (score >= 70) return "bg-grade-a-bg text-grade-a-text";
  return "bg-grade-b-bg text-grade-b-text";
}

const VERIFY_COLORS: Record<string, string> = {
  "서류 합격": "#3182F6",
  "인터뷰 합격": "#1D9E75",
};

export function TalentCard({ talent, blurPhoto }: { talent: Talent; blurPhoto?: boolean }) {
  const verification = (talent as unknown as { verification?: string[] }).verification || [];
  const skills = (talent.top_skills?.[0] && talent.top_skills[0] !== "")
    ? talent.top_skills.filter(Boolean)
    : (talent.tags || []).slice(0, 3);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 cursor-pointer transition-all duration-100 hover:border-gray-300 active:scale-[0.98]">
      <div className="flex items-start justify-between mb-3">
        <img src={talent.photo_url || "/default-profile.png"} alt="" className={`w-[42px] h-[42px] rounded-full object-cover ${blurPhoto ? "blur-[2px]" : ""}`} />
        <span className={`text-[13px] font-medium px-2.5 py-[3px] rounded-full ${getScoreStyle(talent.ovr_score)}`}>
          {talent.ovr_score}
        </span>
      </div>

      <p className="text-[15px] font-medium text-gray-900 leading-tight">{translateRole(talent.role)}</p>
      <p className="text-[12px] text-gray-500 mt-[2px]">
        {talent.years_exp > 0 ? `${talent.years_exp}년차` : "신입"} · {talent.location}
      </p>

      {/* 스킬 태그 */}
      {skills.length > 0 && (
        <div className="flex gap-1 mt-[10px] flex-wrap">
          {skills.slice(0, 3).map((skill) => (
            <span key={skill} className="text-[11px] text-gray-600 bg-gray-100 px-[7px] py-[3px] rounded-full leading-[18px] inline-flex items-center">
              {skill}
            </span>
          ))}
        </div>
      )}

      {/* 하단: 검증 칩 + 연봉 */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <div className="flex gap-1.5">
          {verification.map((chip) => (
            <span key={chip} className="text-[10px] px-[7px] py-[2px] rounded-full leading-[16px] inline-flex items-center"
              style={{ backgroundColor: (VERIFY_COLORS[chip] || "#8B95A1") + "15", color: VERIFY_COLORS[chip] || "#8B95A1" }}>
              {chip}
            </span>
          ))}
        </div>
        {talent.salary_min_vnd > 0 && (
          <span className="text-[13px] font-medium" style={{ color: "#FF5500" }}>
            {(talent.salary_min_vnd / 1000000).toFixed(0)}~{(talent.salary_max_vnd / 1000000).toFixed(0)}M
          </span>
        )}
      </div>
    </div>
  );
}
