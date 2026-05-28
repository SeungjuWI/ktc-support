import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { updateTalentVerification } from "@/lib/create-talent-card";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function findOrCreateCandidate(supabase: any, session: any): Promise<string | null> {
  if (session.candidate_email) {
    const { data: existing } = await supabase
      .from("candidates")
      .select("id")
      .eq("email", session.candidate_email)
      .maybeSingle();
    if (existing) return existing.id;
  }

  const { data: created, error } = await supabase
    .from("candidates")
    .insert({
      full_name: session.candidate_name || "Unknown",
      email: session.candidate_email || null,
      phone: session.candidate_phone || null,
      applied_company: session.applied_company || null,
      applied_job: session.applied_position || null,
      source: "ai_interview",
      pipeline_status: "new",
    })
    .select("id")
    .single();

  if (error || !created) return null;
  return created.id;
}

export async function PATCH(req: NextRequest) {
  const { ids, decision } = await req.json();

  if (!ids || !Array.isArray(ids) || ids.length === 0 || !decision) {
    return NextResponse.json({ success: false, error: "ids and decision required" }, { status: 400 });
  }

  if (!["pass", "fail", "hold"].includes(decision)) {
    return NextResponse.json({ success: false, error: "invalid decision" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // 일괄 decision 업데이트
  const { error } = await supabase.from("interview_sessions").update({
    human_decision: decision,
    human_reviewed_at: new Date().toISOString(),
  }).in("id", ids);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  // candidate pipeline_status 자동 변경
  if (decision === "pass" || decision === "fail") {
    const { data: sessions } = await supabase
      .from("interview_sessions")
      .select("id, candidate_id, candidate_name, candidate_email, candidate_phone, applied_company, applied_position")
      .in("id", ids);

    for (const s of sessions || []) {
      let candidateId = s.candidate_id;

      // candidate_id 없으면 매칭 또는 생성
      if (!candidateId) {
        candidateId = await findOrCreateCandidate(supabase, s);
        if (candidateId) {
          await supabase.from("interview_sessions").update({ candidate_id: candidateId }).eq("id", s.id);
        }
      }

      if (!candidateId) continue;

      if (decision === "pass") {
        const updateData: Record<string, string> = {
          pipeline_status: "ai_interview_passed",
          updated_at: new Date().toISOString(),
        };
        if (s.applied_company) updateData.applied_company = s.applied_company;
        if (s.applied_position) updateData.applied_job = s.applied_position;
        await supabase.from("candidates").update(updateData).eq("id", candidateId);
        await updateTalentVerification(supabase, candidateId, "ai_interview_passed");
      } else if (decision === "fail") {
        await supabase.from("candidates").update({
          pipeline_status: "rejected",
          rejection_reason: "AI interview rejected",
          updated_at: new Date().toISOString(),
        }).eq("id", candidateId);
      }
    }
  }

  return NextResponse.json({ success: true, updated: ids.length });
}
