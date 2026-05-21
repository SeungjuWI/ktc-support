import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

// GET: 스레드 정보 조회 (답장 페이지에서 발신자 정보 표시용)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;
  const supabase = getSupabaseAdmin();

  const { data: original } = await supabase
    .from("email_messages")
    .select("to_email, to_name")
    .eq("thread_id", threadId)
    .eq("direction", "outbound")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!original) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  return NextResponse.json({ to_email: original.to_email, to_name: original.to_name });
}

// POST: 외부 사용자가 웹폼으로 답장
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;
  const { bodyText } = await req.json();

  if (!bodyText || !bodyText.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // 원본 스레드에서 수신자(= 답장 발신자) 정보 자동 조회
  const { data: original } = await supabase
    .from("email_messages")
    .select("subject, from_email, to_email, to_name")
    .eq("thread_id", threadId)
    .eq("direction", "outbound")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!original) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  const { error } = await supabase.from("email_messages").insert({
    thread_id: threadId,
    direction: "inbound",
    from_email: original.to_email,
    to_email: original.from_email,
    to_name: original.to_name,
    subject: `Re: ${original.subject}`,
    body_html: `<p>${bodyText.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>")}</p>`,
    body_text: bodyText,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
