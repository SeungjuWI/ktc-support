import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { code, name, email, phone } = body;
  if (!code || !name) {
    return NextResponse.json({ success: false, message: "Missing fields" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const userAgent = req.headers.get("user-agent") || "";
  const ip = req.headers.get("x-forwarded-for") || "";

  const { data, error } = await supabase
    .from("interview_sessions")
    .update({
      candidate_name: name,
      candidate_email: email || null,
      candidate_phone: phone || null,
      status: "in_progress",
      started_at: new Date().toISOString(),
      user_agent: userAgent,
      ip_address: ip,
    })
    .eq("access_code", code.toUpperCase())
    .eq("status", "pending")
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { success: false, message: "Cannot start session" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, sessionId: data.id });
}
