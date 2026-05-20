import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// 세션 리스트 (각 세션의 답변 수 포함)
export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data: sessions } = await supabase
    .from("interview_sessions")
    .select("*")
    .order("created_at", { ascending: false });

  // 답변 수 조회 (in_progress, abandoned 세션용)
  const sessionsWithCount = await Promise.all(
    (sessions || []).map(async (s) => {
      if (s.status === "in_progress" || s.status === "abandoned") {
        const { count } = await supabase
          .from("interview_responses")
          .select("*", { count: "exact", head: true })
          .eq("session_id", s.id);
        return { ...s, response_count: count || 0 };
      }
      return s;
    })
  );

  return NextResponse.json({ success: true, sessions: sessionsWithCount });
}

// 코드 N개 발급
const CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function generateCode() {
  let code = "KTC-";
  for (let i = 0; i < 6; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
  return code;
}

export async function POST(req: NextRequest) {
  const { count } = await req.json();
  const n = Math.min(Math.max(1, parseInt(count, 10) || 1), 100);
  const supabase = getSupabaseAdmin();
  const codes: string[] = [];

  for (let i = 0; i < n; i++) {
    let code = generateCode();
    let attempts = 0;
    while (attempts < 5) {
      const { data: existing } = await supabase
        .from("interview_sessions").select("id").eq("access_code", code).maybeSingle();
      if (!existing) break;
      code = generateCode();
      attempts++;
    }

    const { error } = await supabase.from("interview_sessions").insert({
      access_code: code,
      status: "pending",
    });
    if (!error) codes.push(code);
  }

  return NextResponse.json({ success: true, codes });
}
