import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    console.error("[Thread API] SUPABASE_SERVICE_ROLE_KEY is not set!");
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

// GET: 특정 스레드의 모든 메시지
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("email_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  // 디버그: 서비스키가 제대로 동작하는지 확인
  const keyPrefix = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").substring(0, 10);
  console.log("[Thread API]", threadId, "→ rows:", data?.length, "error:", error?.message, "keyPrefix:", keyPrefix, "directions:", data?.map((m) => m.direction));

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 인바운드 메시지 읽음 처리
  const unreadIds = (data || [])
    .filter((m) => m.direction === "inbound" && !m.read_at)
    .map((m) => m.id);

  if (unreadIds.length > 0) {
    await supabase
      .from("email_messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds);
  }

  return NextResponse.json({ messages: data, _debug: { threadId, count: data?.length, keySet: !!process.env.SUPABASE_SERVICE_ROLE_KEY } });
}
