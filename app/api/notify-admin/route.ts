import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

const ADMIN_EMAIL = "ktc@likelion.net";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

type NotifyPayload =
  | {
      type: "signup";
      email: string;
      name?: string;
      companyName: string;
      contactName: string;
    }
  | {
      type: "inquiry";
      companyName: string;
      contactName: string;
      contactEmail: string;
      talentRole: string;
      talentYearsExp: number;
      talentOvr: number;
      message?: string;
    };

export async function POST(req: NextRequest) {
  const payload: NotifyPayload = await req.json();

  if (!payload.type) {
    return NextResponse.json({ error: "type is required" }, { status: 400 });
  }

  try {
    if (payload.type === "signup") {
      await transporter.sendMail({
        from: `"KTC Support 알림" <${process.env.GMAIL_USER}>`,
        to: ADMIN_EMAIL,
        subject: `[KTC Support] 새 가입 신청: ${payload.companyName} - ${payload.contactName}`,
        html: `
          <div style="font-family: 'Apple SD Gothic Neo', 'Pretendard', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 20px;">
            <h2 style="font-size: 18px; color: #191F28; margin: 0 0 20px;">새 가입 신청이 들어왔습니다</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #E5E8EB; color: #8B95A1; font-size: 14px; width: 80px;">이메일</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #E5E8EB; color: #191F28; font-size: 14px;">${payload.email}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #E5E8EB; color: #8B95A1; font-size: 14px;">이름</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #E5E8EB; color: #191F28; font-size: 14px;">${payload.name || "-"}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #E5E8EB; color: #8B95A1; font-size: 14px;">회사명</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #E5E8EB; color: #191F28; font-size: 14px;">${payload.companyName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #8B95A1; font-size: 14px;">담당자명</td>
                <td style="padding: 10px 0; color: #191F28; font-size: 14px;">${payload.contactName}</td>
              </tr>
            </table>
            <div style="margin-top: 24px; text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_BASE_URL || "https://ktc-support.vercel.app"}/admin/roles"
                 style="display: inline-block; background: #3182F6; color: white; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 14px;">
                승인 페이지로 이동
              </a>
            </div>
          </div>
        `,
      });
    } else if (payload.type === "inquiry") {
      await transporter.sendMail({
        from: `"KTC Support 알림" <${process.env.GMAIL_USER}>`,
        to: ADMIN_EMAIL,
        subject: `[KTC Support] 인재 문의: ${payload.companyName} → ${payload.talentRole} ${payload.talentYearsExp}년차 (OVR ${payload.talentOvr})`,
        html: `
          <div style="font-family: 'Apple SD Gothic Neo', 'Pretendard', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 20px;">
            <h2 style="font-size: 18px; color: #191F28; margin: 0 0 20px;">인재 문의가 들어왔습니다</h2>
            <div style="background: #F9FAFB; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
              <p style="font-size: 13px; color: #8B95A1; margin: 0 0 8px;">요청 대상 인재</p>
              <p style="font-size: 15px; color: #191F28; margin: 0;">
                ${payload.talentRole} · ${payload.talentYearsExp}년차 · OVR ${payload.talentOvr}
              </p>
            </div>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #E5E8EB; color: #8B95A1; font-size: 14px; width: 80px;">회사명</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #E5E8EB; color: #191F28; font-size: 14px;">${payload.companyName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #E5E8EB; color: #8B95A1; font-size: 14px;">담당자</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #E5E8EB; color: #191F28; font-size: 14px;">${payload.contactName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; ${payload.message ? "border-bottom: 1px solid #E5E8EB;" : ""} color: #8B95A1; font-size: 14px;">이메일</td>
                <td style="padding: 10px 0; ${payload.message ? "border-bottom: 1px solid #E5E8EB;" : ""} color: #191F28; font-size: 14px;">${payload.contactEmail}</td>
              </tr>
              ${payload.message ? `
              <tr>
                <td style="padding: 10px 0; color: #8B95A1; font-size: 14px; vertical-align: top;">메시지</td>
                <td style="padding: 10px 0; color: #191F28; font-size: 14px;">${payload.message}</td>
              </tr>
              ` : ""}
            </table>
            <div style="margin-top: 24px; text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_BASE_URL || "https://ktc-support.vercel.app"}/admin/inquiries"
                 style="display: inline-block; background: #3182F6; color: white; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 14px;">
                문의 관리 페이지로 이동
              </a>
            </div>
          </div>
        `,
      });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    console.error("notify-admin error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
