import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { randomUUID } from "crypto";

export const maxDuration = 60;

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function generateCode() {
  let code = "KTC-";
  for (let i = 0; i < 6; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
  return code;
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://vtm.kr";
const INTERVIEW_BASE = `${BASE_URL}/interview`;
const LOGO_URL = `${BASE_URL}/logo.png`;

function getDefaultDeadlineISO(): string {
  // 내일 오전 10시 베트남 시간 (GMT+7)
  const now = new Date();
  const vn = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
  const tomorrow = new Date(vn);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const y = tomorrow.getFullYear();
  const m = String(tomorrow.getMonth() + 1).padStart(2, "0");
  const d = String(tomorrow.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}T10:00:00+07:00`;
}

function formatDeadlineForEmail(isoStr: string): string {
  // ISO 문자열 → "May 22, 2026 at 13:00" 형식 (베트남 시간)
  const date = new Date(isoStr);
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const vnStr = date.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh", hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  // 파싱: MM/DD/YYYY, HH:MM
  const parts = vnStr.match(/(\d+)\/(\d+)\/(\d+),?\s*(\d+):(\d+)/);
  if (!parts) return isoStr;
  const [, mo, day, year, hr, min] = parts;
  return `${months[Number(mo) - 1]} ${Number(day)}, ${year} at ${hr}:${min}`;
}

function buildEmailHtml(name: string, company: string, code: string, deadlineISO: string, threadId: string): string {
  const interviewUrl = INTERVIEW_BASE;
  const deadlineDisplay = formatDeadlineForEmail(deadlineISO);
  const replyUrl = `${BASE_URL}/reply/${threadId}`;
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 20px;">
      <div style="margin-bottom: 28px;">
        <img src="${LOGO_URL}" alt="VTM" width="36" height="36" style="border-radius: 6px;" />
      </div>

      <p style="font-size: 15px; color: #191F28; line-height: 1.8; margin: 0 0 20px;">
        Dear <strong>${name}</strong>,
      </p>

      <p style="font-size: 15px; color: #191F28; line-height: 1.8; margin: 0 0 8px;">
        This is <strong>VTM</strong>, the recruitment agency for <strong>${company}</strong>. Congratulations on passing the document screening!
      </p>

      <p style="font-size: 15px; color: #4E5968; line-height: 1.8; margin: 0 0 8px;">
        The next step is an <strong>AI voice interview</strong>.
      </p>

      <p style="font-size: 15px; color: #4E5968; line-height: 1.8; margin: 0 0 8px;">
        This interview method was introduced to evaluate your skills more fairly. You can complete it at any time that suits you — it only takes about <strong>15 minutes</strong>, regardless of the interviewer's schedule.
      </p>

      <p style="font-size: 15px; color: #4E5968; line-height: 1.8; margin: 0 0 24px;">
        No additional software is required — simply click the link below to get started. If you pass this round, we will contact you separately to arrange a final interview with the company.
      </p>

      <div style="text-align: center; margin-bottom: 16px;">
        <a href="${interviewUrl}"
           style="display: inline-block; background: #3182F6; color: white; text-decoration: none; padding: 14px 36px; border-radius: 10px; font-size: 15px; font-weight: 500;">
          Start Interview
        </a>
      </div>

      <div style="background: #F9FAFB; border-radius: 12px; padding: 20px; margin-bottom: 24px; text-align: center;">
        <p style="font-size: 13px; color: #8B95A1; margin: 0 0 8px;">Access Code</p>
        <p style="font-size: 24px; font-weight: 600; color: #191F28; margin: 0; letter-spacing: 2px; font-family: monospace;">${code}</p>
      </div>

      <div style="background: #F9FAFB; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
        <p style="font-size: 13px; color: #191F28; font-weight: 500; margin: 0 0 4px;">Deadline</p>
        <p style="font-size: 15px; color: #E8590C; font-weight: 500; margin: 0 0 8px;">
          ${deadlineDisplay} (Vietnam time, GMT+7)
        </p>
        <p style="font-size: 13px; color: #8B95A1; margin: 0;">
          If not completed by the deadline, the application will be automatically closed.
        </p>
      </div>

      <div style="background: #FFF8F0; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
        <p style="font-size: 13px; color: #E8590C; font-weight: 500; margin: 0 0 8px;">Before you begin, please note:</p>
        <ul style="font-size: 13px; color: #6B7684; line-height: 1.8; margin: 0; padding-left: 18px;">
          <li>You may only attempt the interview <strong>once</strong> — retakes are not available</li>
          <li>Please use a <strong>stable Wi-Fi or internet connection</strong></li>
          <li>Closing or refreshing the browser during the interview will <strong>end your session</strong></li>
          <li>Please <strong>read all on-screen instructions</strong> carefully before starting</li>
        </ul>
      </div>

      <p style="font-size: 15px; color: #4E5968; line-height: 1.8; margin: 0 0 8px;">
        If you have any questions, please click the button below to contact us.
      </p>

      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${replyUrl}"
           style="display: inline-block; background: #F2F4F6; color: #4E5968; text-decoration: none; padding: 10px 24px; border-radius: 10px; font-size: 14px;">
          Contact Us / Liên hệ
        </a>
      </div>

      <p style="font-size: 15px; color: #4E5968; line-height: 1.8; margin: 0 0 32px;">
        Best of luck!
      </p>

      <p style="font-size: 15px; color: #191F28; line-height: 1.8; margin: 0 0 32px;">
        <strong>Sean</strong><br/>VTM Recruitment Team
      </p>

      <div style="border-top: 1px solid #E5E8EB; padding-top: 20px;">
        <p style="font-size: 12px; color: #B0B8C1; line-height: 1.6; margin: 0;">
          VTM Recruitment · Likelion
        </p>
      </div>
    </div>
  `;
}

// candidate_ids 배열을 받아서 각각 고유 코드 발급 + 이메일 발송
export async function POST(req: NextRequest) {
  const body = await req.json();

  // 테스트 모드: testEmail이 있으면 DB 조회 없이 바로 발송
  if (body.testEmail) {
    const code = generateCode();
    const deadline = getDefaultDeadlineISO();
    const company = body.company || "Test Company";
    const name = body.name || "Test User";
    const threadId = randomUUID();
    const subject = `[${company}] Congratulations on passing the screening — AI Interview link`;
    const emailHtml = buildEmailHtml(name, company, code, deadline, threadId);
    try {
      await transporter.sendMail({
        from: `"VTM Recruitment" <${process.env.GMAIL_USER}>`,
        to: body.testEmail,
        subject,
        html: emailHtml,
      });
      // DB 로깅
      const supabase = getSupabaseAdmin();
      await supabase.from("email_messages").insert({
        thread_id: threadId,
        direction: "outbound",
        from_email: process.env.GMAIL_USER,
        to_email: body.testEmail,
        to_name: name,
        subject,
        body_html: emailHtml,
        body_text: `AI Interview invitation for ${company}\nAccess Code: ${code}\nDeadline: ${deadline}`,
      });
      return NextResponse.json({ success: true, code, deadline, sent: true });
    } catch (e) {
      return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
    }
  }

  const { candidateIds, deadline: customDeadline } = body;
  if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
    return NextResponse.json({ error: "candidateIds required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const deadline = customDeadline || getDefaultDeadlineISO();
  // DB 저장용 ISO 문자열로 정규화
  const deadlineISO = new Date(deadline).toISOString();

  // 후보자 정보 조회
  const { data: candidates } = await supabase
    .from("candidates")
    .select("id, full_name, email, phone, applied_company, applied_job")
    .in("id", candidateIds);

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ error: "No candidates found" }, { status: 404 });
  }

  const results: { candidateId: string; name: string; email: string; code: string; sent: boolean; error?: string }[] = [];

  for (const c of candidates) {
    if (!c.email) {
      results.push({ candidateId: c.id, name: c.full_name, email: "", code: "", sent: false, error: "No email" });
      continue;
    }

    // 이미 발송된 세션이 있는지 체크
    const { data: existing } = await supabase
      .from("interview_sessions")
      .select("id, access_code")
      .eq("candidate_id", c.id)
      .maybeSingle();

    if (existing) {
      results.push({ candidateId: c.id, name: c.full_name, email: c.email, code: existing.access_code, sent: false, error: "Already sent" });
      continue;
    }

    // 고유 코드 생성
    let code = generateCode();
    let attempts = 0;
    while (attempts < 5) {
      const { data: dup } = await supabase
        .from("interview_sessions")
        .select("id")
        .eq("access_code", code)
        .maybeSingle();
      if (!dup) break;
      code = generateCode();
      attempts++;
    }

    const company = c.applied_company || c.applied_job || "the position";
    const threadId = randomUUID();

    // interview_session 생성
    const { error: insertErr } = await supabase.from("interview_sessions").insert({
      access_code: code,
      candidate_id: c.id,
      candidate_name: c.full_name,
      candidate_email: c.email,
      candidate_phone: c.phone || null,
      applied_company: company,
      deadline: deadlineISO,
      status: "pending",
    });

    if (insertErr) {
      results.push({ candidateId: c.id, name: c.full_name, email: c.email, code, sent: false, error: insertErr.message });
      continue;
    }

    // 이메일 발송
    const emailSubject = `[${company}] Congratulations on passing the screening — AI Interview link`;
    const emailHtml = buildEmailHtml(c.full_name, company, code, deadline, threadId);
    try {
      await transporter.sendMail({
        from: `"VTM Recruitment" <${process.env.GMAIL_USER}>`,
        to: c.email,
        subject: emailSubject,
        html: emailHtml,
      });

      // 이메일 DB 로깅
      await supabase.from("email_messages").insert({
        thread_id: threadId,
        direction: "outbound",
        from_email: process.env.GMAIL_USER,
        to_email: c.email,
        to_name: c.full_name,
        subject: emailSubject,
        body_html: emailHtml,
        body_text: `AI Interview invitation for ${company}\nAccess Code: ${code}\nDeadline: ${deadline}`,
      });

      // 후보자 상태 업데이트
      await supabase.from("candidates").update({
        pipeline_status: "ai_interview_sent",
        updated_at: new Date().toISOString(),
      }).eq("id", c.id);

      results.push({ candidateId: c.id, name: c.full_name, email: c.email, code, sent: true });
    } catch (emailErr) {
      results.push({
        candidateId: c.id,
        name: c.full_name,
        email: c.email,
        code,
        sent: false,
        error: emailErr instanceof Error ? emailErr.message : "Email failed",
      });
    }
  }

  return NextResponse.json({
    success: true,
    total: results.length,
    sent: results.filter((r) => r.sent).length,
    failed: results.filter((r) => !r.sent).length,
    results,
  });
}
