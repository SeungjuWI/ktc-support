import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  const supabase = getSupabaseAdmin();

  // ai_interview_passed 또는 final_passed 상태인 후보자 조회
  const { data: candidates } = await supabase
    .from("candidates")
    .select("*")
    .in("pipeline_status", ["ai_interview_passed", "final_passed"])
    .order("applied_company", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: true });

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ success: true, items: [] });
  }

  // talent_id → ovr_score 조회
  const talentIds = Array.from(new Set(candidates.filter((c) => c.talent_id).map((c) => c.talent_id)));
  let screeningScoreMap: Record<string, number> = {};
  if (talentIds.length > 0) {
    const { data: talents } = await supabase
      .from("talents")
      .select("id, ovr_score")
      .in("id", talentIds);
    if (talents) {
      screeningScoreMap = Object.fromEntries(talents.map((t) => [t.id, t.ovr_score]));
    }
  }

  // candidate_id → interview_session (최신 scored 우선)
  const candidateIds = candidates.map((c) => c.id);
  const { data: sessions } = await supabase
    .from("interview_sessions")
    .select("candidate_id, total_score, ai_summary, completed_at, applied_company, applied_position")
    .in("candidate_id", candidateIds)
    .order("created_at", { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessionMap: Record<string, any> = {};
  for (const s of sessions || []) {
    if (!sessionMap[s.candidate_id]) {
      sessionMap[s.candidate_id] = s;
    }
  }

  // 조합
  const items = candidates.map((c) => {
    const session = sessionMap[c.id] || null;

    // screening score: talents.ovr_score 우선, candidates.llm_score fallback
    let screeningScore: number | null = null;
    if (c.talent_id && screeningScoreMap[c.talent_id] !== undefined) {
      screeningScore = screeningScoreMap[c.talent_id];
    } else if (c.llm_score != null) {
      screeningScore = c.llm_score;
    }

    let strengthsKo: string[] = [];
    if (c.llm_summary) {
      try {
        const summary = JSON.parse(c.llm_summary);
        strengthsKo = summary.strengths_ko || summary.strengths_en || summary.strengths || [];
      } catch { /* ignore */ }
    }

    return {
      id: c.id,
      candidate_name: c.full_name || "",
      applied_company: session?.applied_company || c.applied_company || "",
      applied_position: session?.applied_position || c.applied_job || "",
      yoe: c.yoe || "",
      screening_score: screeningScore,
      strengths_ko: strengthsKo,
      ai_summary: session?.ai_summary || "",
      cv_url: c.cv_url || "",
      total_score: session?.total_score || null,
      completed_at: session?.completed_at || null,
    };
  });

  return NextResponse.json({ success: true, items });
}
