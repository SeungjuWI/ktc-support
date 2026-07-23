import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// 상세 모달용 단건 조회 (목록 API가 제외하는 llm_summary 포함 전체 컬럼)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("candidates")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  try {
    const { data: candidate } = await supabase
      .from("candidates")
      .select("talent_id")
      .eq("id", id)
      .single();

    // 1. interview_responses → interview_sessions (cascade 걸려있지만 명시적으로)
    const { data: sessions } = await supabase
      .from("interview_sessions")
      .select("id")
      .eq("candidate_id", id);

    if (sessions && sessions.length > 0) {
      const sessionIds = sessions.map((s) => s.id);
      await supabase.from("interview_responses").delete().in("session_id", sessionIds);
      await supabase.from("interview_sessions").delete().eq("candidate_id", id);
    }

    // 2. talent 관련 (favorites → talents)
    if (candidate?.talent_id) {
      await supabase.from("talent_favorites").delete().eq("talent_id", candidate.talent_id);
      // candidates FK 해제 먼저
      await supabase.from("candidates").update({ talent_id: null }).eq("id", id);
      await supabase.from("talents").delete().eq("id", candidate.talent_id);
    }

    // 3. candidate 삭제
    const { error } = await supabase.from("candidates").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
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
