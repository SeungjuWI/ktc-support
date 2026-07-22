import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { readEmployees, normalizeName } from "@/lib/qualified-sheets";

export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// KTC Ops Employee 탭(실제 입사자)과 DB 동기화:
//  - Employee 명단과 매칭되는 후보 → final_passed (매칭 완료/입사)
//  - Employee 명단에 없는 기존 final_passed → sent_to_company (구 체계의 "최종합격=기업 전달" 의미 보정)
export async function POST(req: NextRequest) {
  const { dryRun } = await req.json().catch(() => ({ dryRun: false }));
  const supabase = getSupabaseAdmin();

  const employees = await readEmployees();

  const candidates: { id: string; full_name: string; email: string | null; pipeline_status: string }[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("candidates")
      .select("id, full_name, email, pipeline_status")
      .range(from, from + 999);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data || data.length === 0) break;
    candidates.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }

  const byEmail = new Map<string, typeof candidates[number]>();
  const byName = new Map<string, typeof candidates[number]>();
  for (const c of candidates) {
    if (c.email) byEmail.set(c.email.trim().toLowerCase(), c);
    byName.set(normalizeName(c.full_name), c);
  }

  const matched: { candidate: typeof candidates[number]; employee: { name: string; email: string; company: string; status: string } }[] = [];
  const unmatchedEmployees: { name: string; email: string; company: string }[] = [];
  for (const e of employees) {
    const c = byEmail.get(e.email.toLowerCase()) || byName.get(normalizeName(e.name));
    if (c) matched.push({ candidate: c, employee: { name: e.name, email: e.email, company: e.company, status: e.status } });
    else unmatchedEmployees.push({ name: e.name, email: e.email, company: e.company });
  }

  const hiredIds = new Set(matched.map((m) => m.candidate.id));
  const toPromote = matched.filter((m) => m.candidate.pipeline_status !== "final_passed");
  const toDemote = candidates.filter((c) => c.pipeline_status === "final_passed" && !hiredIds.has(c.id));

  if (dryRun) {
    return NextResponse.json({
      success: true,
      dryRun: true,
      employeeCount: employees.length,
      matchedCount: matched.length,
      toPromote: toPromote.map((m) => ({ id: m.candidate.id, name: m.candidate.full_name, from: m.candidate.pipeline_status, company: m.employee.company })),
      toDemote: toDemote.map((c) => ({ id: c.id, name: c.full_name })),
      unmatchedEmployees,
    });
  }

  const now = new Date().toISOString();
  let promoted = 0;
  let demoted = 0;
  if (toPromote.length > 0) {
    const { error } = await supabase
      .from("candidates")
      .update({ pipeline_status: "final_passed", updated_at: now })
      .in("id", toPromote.map((m) => m.candidate.id));
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    promoted = toPromote.length;
  }
  if (toDemote.length > 0) {
    const { error } = await supabase
      .from("candidates")
      .update({ pipeline_status: "sent_to_company", updated_at: now })
      .in("id", toDemote.map((c) => c.id));
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    demoted = toDemote.length;
  }

  return NextResponse.json({
    success: true,
    employeeCount: employees.length,
    matchedCount: matched.length,
    promoted,
    demoted,
    unmatchedEmployees,
  });
}
