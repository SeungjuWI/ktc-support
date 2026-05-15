import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const { userId } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // service_role key가 없으면 user_profiles만 삭제 (auth.users는 유지)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  // user_profiles 삭제
  const adminClient = createClient(supabaseUrl, serviceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  await adminClient.from("user_profiles").delete().eq("id", userId);

  // service_role key가 있으면 auth.users에서도 삭제
  if (serviceKey) {
    await adminClient.auth.admin.deleteUser(userId);
  }

  return NextResponse.json({ success: true });
}
