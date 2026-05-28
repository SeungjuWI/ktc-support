import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  const supabase = getSupabaseAdmin();

  const { data: candidates } = await supabase
    .from("candidates")
    .select("*")
    .in("pipeline_status", ["ai_interview_passed", "final_passed"])
    .order("applied_company", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: true });

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ success: true, items: [] });
  }

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

  const items = candidates.map((c) => {
    const session = sessionMap[c.id] || null;
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

// 인라인 편집 저장
export async function PATCH(req: NextRequest) {
  const { updates } = await req.json();
  // updates: Array<{ id, candidate_name?, applied_company?, applied_position?, yoe?, cv_url?, strengths_ko?, ai_summary? }>

  if (!updates || !Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json({ error: "updates required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  for (const u of updates) {
    const candidateUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (u.candidate_name !== undefined) candidateUpdate.full_name = u.candidate_name;
    if (u.applied_company !== undefined) candidateUpdate.applied_company = u.applied_company;
    if (u.applied_position !== undefined) candidateUpdate.applied_job = u.applied_position;
    if (u.yoe !== undefined) candidateUpdate.yoe = u.yoe;
    if (u.cv_url !== undefined) candidateUpdate.cv_url = u.cv_url;

    if (Object.keys(candidateUpdate).length > 1) {
      await supabase.from("candidates").update(candidateUpdate).eq("id", u.id);
    }

    // strengths_ko → llm_summary JSON 내 업데이트
    if (u.strengths_ko !== undefined) {
      const { data: c } = await supabase.from("candidates").select("llm_summary").eq("id", u.id).single();
      let summary = {};
      try { summary = c?.llm_summary ? JSON.parse(c.llm_summary) : {}; } catch { /* */ }
      (summary as Record<string, unknown>).strengths_ko = u.strengths_ko;
      await supabase.from("candidates").update({ llm_summary: JSON.stringify(summary) }).eq("id", u.id);
    }

    // ai_summary → interview_sessions.ai_summary
    if (u.ai_summary !== undefined) {
      await supabase.from("interview_sessions").update({ ai_summary: u.ai_summary }).eq("candidate_id", u.id);
    }
  }

  return NextResponse.json({ success: true, updated: updates.length });
}
