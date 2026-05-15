import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { email, name } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const { error } = await resend.emails.send({
    from: "베팀 <onboarding@resend.dev>",
    to: email,
    subject: "[베팀] 가입이 승인되었습니다.",
    html: `
      <div style="font-family: 'Apple SD Gothic Neo', 'Pretendard', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <div style="margin-bottom: 28px;">
          <img src="https://vtm-neon.vercel.app/logo.png" alt="베팀" width="36" height="36" style="border-radius: 6px;" />
        </div>
        <p style="font-size: 15px; color: #191F28; line-height: 1.8; margin: 0 0 24px;">
          안녕하세요, ${name || "회원"}님.<br/>
          베팀입니다.
        </p>
        <p style="font-size: 15px; color: #191F28; line-height: 1.8; margin: 0 0 8px;">
          가입 승인이 완료되었습니다.
        </p>
        <p style="font-size: 15px; color: #4E5968; line-height: 1.8; margin: 0 0 32px;">
          아래 버튼을 클릭하시면 검증된 베트남 IT 인재를 바로 확인하실 수 있습니다.
        </p>
        <div style="text-align: center; margin-bottom: 32px;">
          <a href="https://vtm-neon.vercel.app/talents"
             style="display: inline-block; background: #3182F6; color: white; text-decoration: none; padding: 14px 36px; border-radius: 10px; font-size: 15px; font-weight: 500;">
            인재 확인하기
          </a>
        </div>
        <p style="font-size: 15px; color: #4E5968; line-height: 1.8; margin: 0 0 32px;">
          감사합니다.
        </p>
        <div style="border-top: 1px solid #E5E8EB; padding-top: 20px;">
          <p style="font-size: 12px; color: #B0B8C1; line-height: 1.6; margin: 0;">
            베팀 · 멋쟁이사자처럼 신사업본부<br/>
            문의: wsj@likelion.net
          </p>
        </div>
      </div>
    `,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
