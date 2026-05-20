import type { SupabaseClient } from "@supabase/supabase-js";
import type { ScreeningResult } from "./gemini-screening";
import { extractAndUploadPhoto } from "./extract-photo";

function scoreToGrade(score: number): string {
  if (score >= 85) return "S";
  if (score >= 70) return "A";
  if (score >= 55) return "B";
  return "C";
}

function mapLocation(loc: string): string {
  if (!loc) return "기타";
  if (/ho chi minh|hcm|호치민|hồ chí minh/i.test(loc)) return "호치민";
  if (/ha noi|hanoi|하노이|hà nội/i.test(loc)) return "하노이";
  if (/da nang|danang|다낭|đà nẵng/i.test(loc)) return "다낭";
  return "기타";
}

interface CandidateRow {
  id: string;
  full_name: string;
  position: string | null;
  yoe: string | null;
  city: string | null;
  cv_url: string | null;
  llm_score: number | null;
  llm_summary: string | null;
}

export async function createTalentCard(
  supabase: SupabaseClient,
  candidate: CandidateRow,
  result: ScreeningResult,
  jobCode: string,
  pdfBuffer?: Buffer | null
) {
  const score = result.score || 0;
  const topSkills = result.top_skills.slice(0, 5);
  const strengthsKo = result.strengths_ko || result.strengths_en || [];
  const careerHistory = (result.career_history || []).map((ch) => ({
    tier: ch.company,
    position: ch.position,
    startDate: ch.period?.split("-")[0]?.trim() || "",
    endDate: ch.period?.split("-")[1]?.trim() || "현재",
    current: (ch.period || "").toLowerCase().includes("present"),
  }));

  // 중복 체크: 같은 이름의 talent가 이미 있으면 기존 것에 연결
  const { data: existingTalent } = await supabase
    .from("talents")
    .select("id")
    .eq("name", candidate.full_name)
    .maybeSingle();

  if (existingTalent) {
    await supabase
      .from("candidates")
      .update({ talent_id: existingTalent.id })
      .eq("id", candidate.id);
    return existingTalent;
  }

  const { data: talent } = await supabase
    .from("talents")
    .insert({
      name: candidate.full_name,
      role: result.role || candidate.position || "Unknown",
      years_exp: Math.round(result.years_exp || parseInt((candidate.yoe || "0").match(/(\d+)/)?.[1] || "0")),
      location: mapLocation(result.location || candidate.city || ""),
      ovr_score: score,
      ovr_grade: scoreToGrade(score),
      top_skills: topSkills.length >= 2 ? [topSkills[0], topSkills[1]] : [topSkills[0] || "", topSkills[1] || ""],
      korean_level: 1,
      desired_salary_krw: 0,
      availability: "negotiable",
      ktc_comment: result.summary_ko || result.summary_en || "",
      abilities: result.abilities || { technical: 0, english: 0, collaboration: 0, stability: 0, growth: 0 },
      detailed_skills: topSkills.map((s, idx) => ({
        name: s,
        score: Math.max(50, 95 - idx * 8),
        type: idx < 3 ? "core" : "sub",
      })),
      career_history: careerHistory,
      tags: [...strengthsKo.slice(0, 3)],
      verification: ["서류 합격"],
      resume_url: candidate.cv_url || null,
      published: false,
    })
    .select("id")
    .single();

  if (talent) {
    await supabase
      .from("candidates")
      .update({ talent_id: talent.id })
      .eq("id", candidate.id);

    // PDF에서 프로필 사진 추출
    if (pdfBuffer) {
      const photoUrl = await extractAndUploadPhoto(supabase, pdfBuffer, talent.id);
      if (photoUrl) {
        await supabase
          .from("talents")
          .update({ photo_url: photoUrl })
          .eq("id", talent.id);
      }
    }
  }

  return talent;
}

// 후보자 상태 변경 시 인재 카드 태그 업데이트
export async function updateTalentVerification(
  supabase: SupabaseClient,
  candidateId: string,
  newStatus: string
) {
  // candidate에서 talent_id 가져오기
  const { data: candidate } = await supabase
    .from("candidates")
    .select("talent_id")
    .eq("id", candidateId)
    .single();

  if (!candidate?.talent_id) return;

  const chips: string[] = [];
  if (["passed", "ai_interview_sent", "ai_interview_done", "final_passed"].includes(newStatus)) {
    chips.push("서류 합격");
  }
  if (["ai_interview_done", "final_passed"].includes(newStatus)) {
    chips.push("인터뷰 합격");
  }

  await supabase
    .from("talents")
    .update({ verification: chips, updated_at: new Date().toISOString() })
    .eq("id", candidate.talent_id);
}
