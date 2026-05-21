import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  // 연결된 talent 카드도 삭제
  const { data: candidate } = await supabase
    .from("candidates")
    .select("talent_id")
    .eq("id", id)
    .single();

  if (candidate?.talent_id) {
    await supabase.from("talents").delete().eq("id", candidate.talent_id);
  }

  // interview_sessions 삭제
  await supabase.from("interview_sessions").delete().eq("candidate_id", id);

  const { error } = await supabase.from("candidates").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("candidates")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
