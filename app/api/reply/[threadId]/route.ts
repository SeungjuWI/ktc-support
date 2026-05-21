import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// POST: 외부 사용자가 웹폼으로 답장
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;
  const { fromEmail, fromName, bodyText } = await req.json();

  if (!bodyText || !bodyText.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // 원본 스레드 존재 확인
  const { data: original } = await supabase
    .from("email_messages")
    .select("subject, from_email, to_email")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!original) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  const senderEmail = fromEmail || original.to_email;

  const { error } = await supabase.from("email_messages").insert({
    thread_id: threadId,
    direction: "inbound",
    from_email: senderEmail,
    to_email: original.from_email,
    to_name: fromName || null,
    subject: `Re: ${original.subject}`,
    body_html: `<p>${bodyText.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>")}</p>`,
    body_text: bodyText,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
