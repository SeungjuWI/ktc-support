import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
    .select("id, status")
    .eq("access_code", code.toUpperCase())
    .single();

  if (!session || session.status !== "in_progress") {
    return NextResponse.json({ success: false });
  }

  // 답변 수 확인
  const { count } = await supabase
    .from("interview_responses")
    .select("*", { count: "exact", head: true })
    .eq("session_id", session.id);

  await supabase
    .from("interview_sessions")
    .update({
      status: "abandoned",
      completed_at: new Date().toISOString(),
    })
    .eq("id", session.id);

  return NextResponse.json({ success: true, answeredCount: count || 0 });
}
