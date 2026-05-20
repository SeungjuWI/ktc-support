import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.toUpperCase().trim();
  if (!code) {
    return NextResponse.json({ success: false, message: "Code required" });
  }

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("interview_sessions")
    .select("status")
    .eq("access_code", code)
    .maybeSingle();

  if (!data) {
    return NextResponse.json({ success: false, message: "Invalid code" });
  }
  if (data.status !== "pending") {
    return NextResponse.json({
      success: false,
      message: "This code has already been used.",
    });
  }
  return NextResponse.json({ success: true, status: data.status });
}
