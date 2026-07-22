import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { loadAllJDs } from "@/lib/jd-data";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// 후보자를 다른 JD로 복제 (멀티 지원 스크리닝용). 이미 같은 이메일+JD 행이 있으면 그걸 반환.
export async function POST(req: NextRequest) {
  const { candidateId, jdCode } = await req.json();
  if (!candidateId || !jdCode) {
    return NextResponse.json({ error: "candidateId and jdCode required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: orig } = await supabase.from("candidates").select("*").eq("id", candidateId).single();
  if (!orig) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

  const allJDs = await loadAllJDs(supabase);
  const jd = allJDs[jdCode];
  if (!jd) return NextResponse.json({ error: `Unknown JD code: ${jdCode}` }, { status: 400 });

  // 이미 같은 사람 × 같은 JD 행이 있으면 재사용
  if (orig.email) {
    const { data: dup } = await supabase
      .from("candidates")
      .select("id")
      .eq("email", orig.email)
      .ilike("applied_job", `${jdCode}%`)
      .limit(1);
    if (dup && dup.length > 0) {
      return NextResponse.json({ success: true, id: dup[0].id, existed: true });
    }
  }

  const now = new Date().toISOString();
  const { data: inserted, error } = await supabase
    .from("candidates")
    .insert({
      full_name: orig.full_name,
      email: orig.email,
      phone: orig.phone,
      city: orig.city,
      university: orig.university,
      graduation_year: orig.graduation_year,
      position: orig.position,
      yoe: orig.yoe,
      cv_url: orig.cv_url,
      portfolio_url: orig.portfolio_url,
      skills: orig.skills,
      source: orig.source,
      applied_date: orig.applied_date,
      applied_job: `${jdCode} - ${jd.position}`,
      applied_company: jd.company,
      pipeline_status: "new",
      sheet_row_identifier: `${orig.sheet_row_identifier || orig.id}::${jdCode}`,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, id: inserted.id, existed: false });
}
