import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function POST(req: NextRequest) {
  const { email, companyId, companyName, role, invitedBy } = await req.json();

  if (!email || !companyId) {
    return NextResponse.json({ error: "email and companyId are required" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 이미 초대된 이메일인지 확인
  const { data: existing } = await supabase
    .from("company_invites")
    .select("id")
    .eq("company_id", companyId)
    .eq("email", email)
    .eq("status", "pending")
    .single();

  if (existing) {
    return NextResponse.json({ error: "이미 초대된 이메일입니다" }, { status: 400 });
  }

  // 초대 레코드 생성
  const { error: insertError } = await supabase.from("company_invites").insert({
    company_id: companyId,
    email,
    role: role || "employee",
    invited_by: invitedBy,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // 이미 가입된 유저라면 바로 배정
  const { data: existingUser } = await supabase
    .from("user_profiles")
    .select("id, role")
    .eq("email", email)
    .single();

  if (existingUser && existingUser.role === "user") {
    await supabase
      .from("user_profiles")
      .update({
        company_id: companyId,
        role: role || "employee",
        status: "approved",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingUser.id);

    await supabase
      .from("company_invites")
      .update({ status: "accepted" })
      .eq("company_id", companyId)
      .eq("email", email);

    return NextResponse.json({ success: true, autoAssigned: true });
  }

  // 초대 이메일 발송
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://vtm-neon.vercel.app";
    await transporter.sendMail({
      from: `"베팀" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `[베팀] ${companyName || "기업"}에서 초대했습니다`,
      html: `
        <div style="font-family: 'Apple SD Gothic Neo', 'Pretendard', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <div style="margin-bottom: 28px;">
            <img src="${siteUrl}/logo.png" alt="베팀" width="36" height="36" style="border-radius: 6px;" />
          </div>
          <p style="font-size: 15px; color: #191F28; line-height: 1.8; margin: 0 0 24px;">
            안녕하세요,<br/>
            <strong>${companyName || "기업"}</strong>에서 베팀 직원으로 초대했습니다.
          </p>
          <p style="font-size: 15px; color: #4E5968; line-height: 1.8; margin: 0 0 32px;">
            아래 버튼을 클릭하여 가입하시면 바로 시작할 수 있습니다.
          </p>
          <div style="text-align: center; margin-bottom: 32px;">
            <a href="${siteUrl}/login?type=work"
               style="display: inline-block; background: #3182F6; color: white; text-decoration: none; padding: 14px 36px; border-radius: 10px; font-size: 15px; font-weight: 500;">
              가입하기
            </a>
          </div>
          <div style="border-top: 1px solid #E5E8EB; padding-top: 20px;">
            <p style="font-size: 12px; color: #B0B8C1; line-height: 1.6; margin: 0;">
              베팀 · 멋쟁이사자처럼 신사업본부<br/>
              문의: ktc@likelion.net
            </p>
          </div>
        </div>
      `,
    });
  } catch (e) {
    console.error("초대 이메일 발송 실패:", e);
  }

  return NextResponse.json({ success: true });
}
