import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// 최종합격자 목록 (candidate + interview_session + talent 조인)
export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const candidateId = req.nextUrl.searchParams.get("candidateId");

  if (candidateId) {
    // 단일 후보자의 종합 프로필 데이터
    const { data: candidate } = await supabase
      .from("candidates")
      .select("*")
      .eq("id", candidateId)
      .single();

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    // 인재 카드
    let talent = null;
    if (candidate.talent_id) {
      const { data } = await supabase
        .from("talents")
        .select("*")
        .eq("id", candidate.talent_id)
        .single();
      talent = data;
    }

    // AI 인터뷰 세션 (최신 scored 우선)
    const { data: sessions } = await supabase
      .from("interview_sessions")
      .select("*")
      .eq("candidate_id", candidateId)
      .order("created_at", { ascending: false });

    const session = sessions?.find((s) => s.status === "scored") || sessions?.[0] || null;

    // 인터뷰 응답
    let responses = null;
    if (session) {
      const { data } = await supabase
        .from("interview_responses")
        .select("*, interview_questions(category, question_text_en, question_text_vi)")
        .eq("session_id", session.id)
        .order("question_order");
      responses = data;
    }

    return NextResponse.json({ candidate, talent, session, responses });
  }

  // 최종합격자 목록
  const { data: candidates } = await supabase
    .from("candidates")
    .select("*")
    .in("pipeline_status", ["ready_to_forward", "sent_to_company", "interviewing", "offer", "final_passed"])
    .order("updated_at", { ascending: false });

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ candidates: [], profiles: [] });
  }

  // 연관 talent 카드
  const talentIds = Array.from(new Set(candidates.map((c) => c.talent_id).filter(Boolean)));
  let talents: Record<string, unknown>[] = [];
  if (talentIds.length > 0) {
    const { data } = await supabase.from("talents").select("*").in("id", talentIds);
    talents = data || [];
  }
  const talentMap = Object.fromEntries(talents.map((t) => [(t as { id: string }).id, t]));

  // 연관 인터뷰 세션
  const candidateIds = candidates.map((c) => c.id);
  const { data: sessions } = await supabase
    .from("interview_sessions")
    .select("id, candidate_id, status, total_score, ai_summary, access_code")
    .in("candidate_id", candidateIds)
    .order("created_at", { ascending: false });

  const sessionMap: Record<string, typeof sessions extends (infer T)[] | null ? T : never> = {};
  for (const s of sessions || []) {
    if (!sessionMap[s.candidate_id] || s.status === "scored") {
      sessionMap[s.candidate_id] = s;
    }
  }

  const profiles = candidates.map((c) => ({
    candidate: c,
    talent: c.talent_id ? talentMap[c.talent_id] || null : null,
    session: sessionMap[c.id] || null,
  }));

  return NextResponse.json({ candidates, profiles });
}
