import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { fetchAllRows } from "@/lib/fetch-all-rows";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: "public" }, global: { headers: { "x-supabase-max-rows": "5000" } } }
  );
}

// 목록에 필요한 컬럼만 (llm_summary는 후보당 수 KB의 스크리닝 JSON → 상세 모달에서 개별 로드)
const LIST_COLUMNS =
  "id, full_name, email, phone, city, position, yoe, cv_url, portfolio_url, skills, source, applied_date, applied_job, applied_company, pipeline_status, phone_interview_note, rejection_reason, llm_score, talent_id, created_at";

export async function GET() {
  const supabase = getSupabaseAdmin();

  const { rows, error } = await fetchAllRows(supabase, "candidates", LIST_COLUMNS, [
    { column: "created_at", ascending: false },
    { column: "id", ascending: true },
  ]);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json(rows);
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
