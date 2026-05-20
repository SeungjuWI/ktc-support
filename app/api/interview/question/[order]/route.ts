import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: { order: string } }
) {
  const order = parseInt(params.order, 10);
  const code = req.nextUrl.searchParams.get("code")?.toUpperCase();
  if (!code || isNaN(order)) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: session } = await supabase
    .from("interview_sessions")
    .select("status")
    .eq("access_code", code)
    .single();
  if (!session || session.status !== "in_progress") {
    return NextResponse.json({ success: false, message: "Invalid session" }, { status: 403 });
  }

  const { data: question } = await supabase
    .from("interview_questions")
    .select("*")
    .eq("order_num", order)
    .eq("is_active", true)
    .single();
  if (!question) {
    return NextResponse.json({ success: false }, { status: 404 });
  }

  let ttsSignedUrl = "";
  if (question.tts_audio_path) {
    const { data: signed } = await supabase.storage
      .from("interviews")
      .createSignedUrl(question.tts_audio_path, 600);
    ttsSignedUrl = signed?.signedUrl || "";
  }

  const { count: totalCount } = await supabase
    .from("interview_questions")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  return NextResponse.json({
    success: true,
    question,
    ttsSignedUrl,
    totalCount: totalCount || 7,
  });
}
