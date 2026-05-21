import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateFinalSummary } from "@/lib/interview/openai";

export const runtime = "nodejs";
export const maxDuration = 60;

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const { code } = await req.json();
  if (!code) return NextResponse.json({ success: false }, { status: 400 });

  const supabase = getSupabaseAdmin();

  const { data: session } = await supabase
    .from("interview_sessions")
    .select("*")
    .eq("access_code", code.toUpperCase())
    .single();
  if (!session) return NextResponse.json({ success: false }, { status: 404 });

  // 비동기 채점 완료 대기 (최대 30초, 2초 간격 폴링)
  let responses: Record<string, any>[] | null = null;
  for (let i = 0; i < 15; i++) {
    const { data } = await supabase
      .from("interview_responses")
      .select("*, interview_questions(category)")
      .eq("session_id", session.id)
      .order("question_order");

    if (!data || data.length === 0) {
      return NextResponse.json({ success: false, message: "No responses" }, { status: 400 });
    }

    const allScored = data.every((r: Record<string, any>) => r.score !== null);
    if (allScored) {
      responses = data;
      break;
    }

    // 아직 채점 안 된 응답이 있으면 대기
    if (i < 14) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } else {
      // 타임아웃 — 현재까지 결과로 진행
      responses = data;
    }
  }

  if (!responses || responses.length === 0) {
    return NextResponse.json({ success: false, message: "No responses" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalScore = responses.reduce((sum: number, r: Record<string, any>) => sum + (r.score || 0), 0);
  const maxScore = responses.length * 10;

  let aiSummary = "";
  try {
    aiSummary = await generateFinalSummary({
      candidateName: session.candidate_name || "Unknown",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      responses: responses.map((r: Record<string, any>) => ({
        category: r.interview_questions?.category || "Unknown",
        score: r.score || 0,
        reasoning: r.score_reasoning || "",
        transcript: r.transcript || "",
      })),
      totalScore,
      maxScore,
    });
  } catch (err) {
    console.error("Summary error:", err);
  }

  await supabase
    .from("interview_sessions")
    .update({
      status: "scored",
      completed_at: new Date().toISOString(),
      total_score: totalScore,
      ai_summary: aiSummary,
    })
    .eq("id", session.id);

  // 연결된 후보자 상태를 ai_interview_done으로 업데이트
  if (session.candidate_id) {
    await supabase
      .from("candidates")
      .update({
        pipeline_status: "ai_interview_done",
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.candidate_id);
  }

  return NextResponse.json({ success: true, totalScore, maxScore });
}
