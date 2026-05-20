import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateFinalSummary } from "@/lib/interview/openai";

export const runtime = "nodejs";
export const maxDuration = 30;

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

  const { data: responses } = await supabase
    .from("interview_responses")
    .select("*, interview_questions(category)")
    .eq("session_id", session.id)
    .order("question_order");

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

  return NextResponse.json({ success: true, totalScore, maxScore });
}
