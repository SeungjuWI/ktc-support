import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { updateTalentVerification } from "@/lib/create-talent-card";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// candidate_id가 없는 세션에서 email로 기존 candidate 매칭, 없으면 신규 생성
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function findOrCreateCandidate(supabase: any, session: any): Promise<string | null> {
  // 1) email로 기존 candidate 매칭
  if (session.candidate_email) {
    const { data: existing } = await supabase
      .from("candidates")
      .select("id")
      .eq("email", session.candidate_email)
      .maybeSingle();
    if (existing) return existing.id;
  }

  // 2) 신규 생성
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

// 세션 상세 + 음성 signed URL
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabaseAdmin();
  const { data: session } = await supabase
    .from("interview_sessions").select("*").eq("id", params.id).single();
  if (!session) return NextResponse.json({ success: false }, { status: 404 });

  const { data: responses } = await supabase
    .from("interview_responses")
    .select("*, interview_questions(category, question_text_en, question_text_vi)")
    .eq("session_id", params.id)
    .order("question_order");

  const responsesWithUrl = await Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (responses || []).map(async (r: any) => {
      let audioUrl = "";
      if (r.audio_storage_path) {
        const { data } = await supabase.storage
          .from("interviews").createSignedUrl(r.audio_storage_path, 3600);
        audioUrl = data?.signedUrl || "";
      }
      return { ...r, audioUrl };
    })
  );

  return NextResponse.json({ success: true, session, responses: responsesWithUrl });
}

// 사람 결정 저장 (기본 정보는 발급 시 확정, 수정 불가)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { decision, note } = await req.json();
  const supabase = getSupabaseAdmin();

  await supabase.from("interview_sessions").update({
    human_decision: decision,
    human_review_note: note,
    human_reviewed_at: new Date().toISOString(),
  }).eq("id", params.id);

  // PASS/FAIL 시 candidate pipeline_status 자동 변경
  const { data: session } = await supabase
    .from("interview_sessions")
    .select("candidate_id, candidate_name, candidate_email, candidate_phone, applied_company, applied_position")
    .eq("id", params.id)
    .single();

  if (session) {
    let candidateId = session.candidate_id;

    // candidate_id가 없으면 email로 매칭 또는 신규 생성
    if (!candidateId && (decision === "pass" || decision === "fail")) {
      candidateId = await findOrCreateCandidate(supabase, session);
      if (candidateId) {
        await supabase.from("interview_sessions").update({ candidate_id: candidateId }).eq("id", params.id);
      }
    }

    if (candidateId) {
      if (decision === "pass") {
        const updateData: Record<string, string> = {
          pipeline_status: "ai_interview_passed",
          updated_at: new Date().toISOString(),
        };
        if (session.applied_company) updateData.applied_company = session.applied_company;
        if (session.applied_position) updateData.applied_job = session.applied_position;
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

  return NextResponse.json({ success: true });
}

// 세션 삭제
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabaseAdmin();

  // 관련 응답 먼저 삭제
  await supabase.from("interview_responses").delete().eq("session_id", params.id);
  // 세션 삭제
  const { error } = await supabase.from("interview_sessions").delete().eq("id", params.id);
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
