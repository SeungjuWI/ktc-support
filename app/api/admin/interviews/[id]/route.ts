import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
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

// 사람 결정 저장
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

  return NextResponse.json({ success: true });
}
