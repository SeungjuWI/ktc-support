import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://vtm-neon.vercel.app";
const LOGO_URL = `${BASE_URL}/logo.png`;

function buildOutboundHtml(body: string, threadId: string): string {
  const replyUrl = `${BASE_URL}/reply/${threadId}`;
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 20px;">
      <div style="margin-bottom: 28px;">
        <img src="${LOGO_URL}" alt="VTM" width="36" height="36" style="border-radius: 6px;" />
      </div>
      <div style="font-size: 15px; color: #191F28; line-height: 1.8; white-space: pre-wrap;">${body}</div>
      <div style="margin-top: 32px; text-align: center;">
        <a href="${replyUrl}"
           style="display: inline-block; background: #3182F6; color: white; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 14px; font-weight: 500;">
          Reply / Trả lời
        </a>
      </div>
      <p style="font-size: 12px; color: #B0B8C1; text-align: center; margin-top: 12px;">
        Please use the button above to reply. / Vui lòng sử dụng nút trên để trả lời.
      </p>
      <div style="border-top: 1px solid #E5E8EB; padding-top: 20px; margin-top: 32px;">
        <p style="font-size: 12px; color: #B0B8C1; line-height: 1.6; margin: 0;">
          VTM Recruitment · Likelion
        </p>
      </div>
    </div>
  `;
}

// GET: 스레드 목록 (최신 메시지 기준 정렬)
export async function GET() {
  const supabase = getSupabaseAdmin();

  // 삭제된 스레드 ID 조회
  const { data: deletedMeta } = await supabase
    .from("email_thread_meta")
    .select("thread_id")
    .not("deleted_at", "is", null);
  const deletedIds = new Set((deletedMeta || []).map((m) => m.thread_id));

  // 별표 정보 조회
  const { data: starredMeta } = await supabase
    .from("email_thread_meta")
    .select("thread_id")
    .eq("starred", true);
  const starredIds = new Set((starredMeta || []).map((m) => m.thread_id));

  // 모든 메시지를 가져와서 스레드별로 그룹핑
  const { data, error } = await supabase
    .from("email_messages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 스레드별로 그룹핑
  const threadMap = new Map<string, {
    thread_id: string;
    subject: string;
    to_email: string;
    to_name: string | null;
    last_message_at: string;
    message_count: number;
    unread_count: number;
    last_direction: string;
    last_body_text: string | null;
    starred: boolean;
  }>();

  for (const msg of data || []) {
    if (deletedIds.has(msg.thread_id)) continue;
    const existing = threadMap.get(msg.thread_id);
    if (!existing) {
      threadMap.set(msg.thread_id, {
        thread_id: msg.thread_id,
        subject: msg.subject,
        to_email: msg.direction === "outbound" ? msg.to_email : msg.from_email,
        to_name: msg.to_name,
        last_message_at: msg.created_at,
        message_count: 1,
        unread_count: msg.direction === "inbound" && !msg.read_at ? 1 : 0,
        last_direction: msg.direction,
        last_body_text: msg.body_text,
        starred: starredIds.has(msg.thread_id),
      });
    } else {
      existing.message_count++;
      if (msg.direction === "inbound" && !msg.read_at) existing.unread_count++;
    }
  }

  // 별표 먼저, 그 안에서 최신순
  const threads = Array.from(threadMap.values()).sort((a, b) => {
    if (a.starred !== b.starred) return a.starred ? -1 : 1;
    return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
  });

  return NextResponse.json({ threads });
}

// PATCH: 별표 토글 / DELETE: 스레드 삭제
export async function PATCH(req: NextRequest) {
  const { threadId, starred } = await req.json();
  if (!threadId) return NextResponse.json({ error: "threadId required" }, { status: 400 });

  const supabase = getSupabaseAdmin();

  // upsert
  const { error } = await supabase
    .from("email_thread_meta")
    .upsert({ thread_id: threadId, starred }, { onConflict: "thread_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { threadId } = await req.json();
  if (!threadId) return NextResponse.json({ error: "threadId required" }, { status: 400 });

  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("email_thread_meta")
    .upsert({ thread_id: threadId, deleted_at: new Date().toISOString() }, { onConflict: "thread_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// POST: 새 이메일 발송 (새 스레드 또는 기존 스레드에 답장)
export async function POST(req: NextRequest) {
  const { toEmail, toName, subject, bodyText, threadId, sentBy } = await req.json();

  if (!toEmail || !subject || !bodyText) {
    return NextResponse.json({ error: "toEmail, subject, bodyText required" }, { status: 400 });
  }

  const finalThreadId = threadId || randomUUID();
  const supabase = getSupabaseAdmin();

  const bodyHtml = buildOutboundHtml(bodyText.replace(/</g, "&lt;").replace(/>/g, "&gt;"), finalThreadId);

  // 이메일 발송
  try {
    await transporter.sendMail({
      from: `"VTM Recruitment" <${process.env.GMAIL_USER}>`,
      to: toEmail,
      subject,
      html: bodyHtml,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Email send failed" },
      { status: 500 }
    );
  }

  // DB 로깅
  const insertPayload: Record<string, unknown> = {
    thread_id: finalThreadId,
    direction: "outbound",
    from_email: process.env.GMAIL_USER || "unknown",
    to_email: toEmail,
    to_name: toName || null,
    subject,
    body_html: bodyHtml,
    body_text: bodyText,
  };
  // sent_by는 유효한 UUID일 때만 포함 (외래키 에러 방지)
  if (sentBy) insertPayload.sent_by = sentBy;

  const { error: insertErr } = await supabase.from("email_messages").insert(insertPayload);

  if (insertErr) {
    console.error("DB insert error:", insertErr.message, insertErr);
    return NextResponse.json({ success: true, threadId: finalThreadId, dbError: insertErr.message });
  }

  return NextResponse.json({ success: true, threadId: finalThreadId });
}
