import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: "public" }, global: { headers: { "x-supabase-max-rows": "5000" } } }
  );
}

export async function GET() {
  const supabase = getSupabaseAdmin();

  // Supabase 기본 1000 row 제한 우회: 페이지네이션으로 전체 fetch
  const all: Record<string, unknown>[] = [];
  const PAGE = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, from + PAGE - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  return NextResponse.json(all);
}

export async function POST(req: Request) {
  const supabase = getSupabaseAdmin();
  const body = await req.json();

  const { full_name, email, phone, city, position, yoe, cv_url, portfolio_url, skills, source, applied_date, applied_job, applied_company, pipeline_status } = body;

  if (!full_name || !source) {
    return NextResponse.json({ error: "full_name and source are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("candidates")
    .insert({
      full_name,
      email: email || null,
      phone: phone || null,
      city: city || null,
      position: position || null,
      yoe: yoe || null,
      cv_url: cv_url || null,
      portfolio_url: portfolio_url || null,
      skills: skills || null,
      source,
      applied_date: applied_date || null,
      applied_job: applied_job || null,
      applied_company: applied_company || null,
      pipeline_status: pipeline_status || "new",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
