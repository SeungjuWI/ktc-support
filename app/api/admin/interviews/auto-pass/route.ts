import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { updateTalentVerification } from "@/lib/create-talent-card";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function calcGrade(screening: number | null, interview: number | null): { score: number; grade: string } | null {
  if (screening === null || screening === undefined || interview === null || interview === undefined) return null;
  const normalizedInterview = (interview / 70) * 100;
  const combined = Math.round((screening + normalizedInterview) / 2);
  let grade = "F";
  if (combined >= 80) grade = "A";
  else if (combined >= 65) grade = "B";
  else if (combined >= 50) grade = "C";
  else if (combined >= 35) grade = "D";
  return { score: combined, grade };
}

// C등급 이상 자동 PASS 처리
export async function POST() {
  const supabase = getSupabaseAdmin();

  // 인터뷰 완료(scored) + human_decision 없는 세션 조회
  const { data: sessions, error } = await supabase
    .from("interview_sessions")
    .select("id, candidate_id, candidate_email, total_score, human_decision")
    .eq("status", "scored")
    .is("human_decision", null);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  const sessionList = sessions || [];
  if (sessionList.length === 0) {
    return NextResponse.json({ success: true, processed: 0, results: [], message: "No unreviewed scored sessions found" });
  }

  // 1) candidate_id로 직접 조회
  const candidateIds = Array.from(new Set(sessionList.filter(s => s.candidate_id).map(s => s.candidate_id)));

  // 2) candidate_id가 없는 세션은 이메일로 매칭
  const orphanEmails = sessionList.filter(s => !s.candidate_id && s.candidate_email).map(s => s.candidate_email);

  // candidates 조회: id + llm_score + talent_id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allCandidates: any[] = [];
  if (candidateIds.length > 0) {
    const { data } = await supabase
      .from("candidates")
      .select("id, email, llm_score, talent_id")
      .in("id", candidateIds);
    if (data) allCandidates.push(...data);
  }
  if (orphanEmails.length > 0) {
    const { data } = await supabase
      .from("candidates")
      .select("id, email, llm_score, talent_id")
      .in("email", orphanEmails);
    if (data) {
      const existingIds = new Set(allCandidates.map(c => c.id));
      allCandidates.push(...data.filter(c => !existingIds.has(c.id)));
    }
  }

  // candidate id/email → llm_score 맵
  const candidateByIdMap: Record<string, { llm_score: number | null; talent_id: string | null; id: string }> = {};
  const candidateByEmailMap: Record<string, { llm_score: number | null; talent_id: string | null; id: string }> = {};
  for (const c of allCandidates) {
    candidateByIdMap[c.id] = { llm_score: c.llm_score, talent_id: c.talent_id, id: c.id };
    if (c.email) candidateByEmailMap[c.email] = { llm_score: c.llm_score, talent_id: c.talent_id, id: c.id };
  }

  // talent_id → ovr_score (talents 테이블) 조회
  const talentIds = Array.from(new Set(allCandidates.filter(c => c.talent_id).map(c => c.talent_id)));
  let screeningScoreMap: Record<string, number> = {};
  if (talentIds.length > 0) {
    const { data: talents } = await supabase
      .from("talents")
      .select("id, ovr_score")
      .in("id", talentIds);
    if (talents) {
      screeningScoreMap = Object.fromEntries(talents.map(t => [t.id, t.ovr_score]));
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: any[] = [];

  for (const s of sessionList) {
    // candidate 찾기: candidate_id 우선, 없으면 이메일로
    const candidate = s.candidate_id
      ? candidateByIdMap[s.candidate_id]
      : (s.candidate_email ? candidateByEmailMap[s.candidate_email] : null);

    // screening score: talents.ovr_score 우선, 없으면 candidates.llm_score fallback
    let screeningScore: number | null = null;
    if (candidate?.talent_id && screeningScoreMap[candidate.talent_id] !== undefined) {
      screeningScore = screeningScoreMap[candidate.talent_id];
    } else if (candidate?.llm_score !== null && candidate?.llm_score !== undefined) {
      screeningScore = candidate.llm_score;
    }

    const candidateId = s.candidate_id || candidate?.id || null;
    const gradeResult = calcGrade(screeningScore, s.total_score);

    if (!gradeResult) {
      results.push({ id: s.id, candidate_id: candidateId, screening_score: screeningScore, interview_score: s.total_score, combined_score: 0, grade: "N/A", action: "skipped (missing scores)" });
      continue;
    }

    if (["A", "B", "C"].includes(gradeResult.grade)) {
      // 세션 업데이트
      const sessionUpdate: Record<string, string> = {
        human_decision: "pass",
        human_review_note: `Auto-pass: grade ${gradeResult.grade} (combined ${gradeResult.score})`,
        human_reviewed_at: new Date().toISOString(),
      };
      // candidate_id가 없었던 세션은 이메일 매칭된 candidate_id도 연결
      if (!s.candidate_id && candidate?.id) {
        sessionUpdate.candidate_id = candidate.id;
      }
      await supabase.from("interview_sessions").update(sessionUpdate).eq("id", s.id);

      // candidate pipeline 업데이트
      if (candidateId) {
        await supabase.from("candidates").update({
          pipeline_status: "ai_interview_passed",
          updated_at: new Date().toISOString(),
        }).eq("id", candidateId);
        await updateTalentVerification(supabase, candidateId, "ai_interview_passed");
      }

      results.push({ id: s.id, candidate_id: candidateId, screening_score: screeningScore, interview_score: s.total_score, combined_score: gradeResult.score, grade: gradeResult.grade, action: "pass" });
    } else {
      results.push({ id: s.id, candidate_id: candidateId, screening_score: screeningScore, interview_score: s.total_score, combined_score: gradeResult.score, grade: gradeResult.grade, action: `skipped (grade ${gradeResult.grade})` });
    }
  }

  const passed = results.filter(r => r.action === "pass");
  return NextResponse.json({ success: true, processed: results.length, passed_count: passed.length, results });
}
