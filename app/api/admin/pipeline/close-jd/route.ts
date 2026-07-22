import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { loadAllJDs, matchJobCode } from "@/lib/jd-data";
import { readQualifiedRows, updateQualifiedStatus } from "@/lib/qualified-sheets";

export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// 매칭 완료된 공고의 잔여 후보 일괄 탈락 처리 (DB + Qualified 시트)
// dryRun: true면 대상만 집계해서 반환
export async function POST(req: NextRequest) {
  const { jdCode, dryRun } = await req.json();
  if (!jdCode) {
    return NextResponse.json({ error: "jdCode required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const allJDs = await loadAllJDs(supabase);

  // DB: 해당 JD의 진행 중(터미널 아님) 후보
  const active: { id: string; full_name: string; applied_job: string | null; pipeline_status: string }[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("candidates")
      .select("id, full_name, applied_job, pipeline_status")
      .not("pipeline_status", "in", "(final_passed,rejected,screening_failed)")
      .range(from, from + 999);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data || data.length === 0) break;
    active.push(...data.filter((c) => matchJobCode(c.applied_job || "", allJDs) === jdCode));
    if (data.length < 1000) break;
    from += 1000;
  }

  // 시트: 해당 JD의 종결 안 된 행
  let sheetTargets: { tab: string; rowIndex: number; name: string; status: string }[] = [];
  try {
    const rows = await readQualifiedRows();
    sheetTargets = rows
      .filter((r) => matchJobCode(r.position, allJDs) === jdCode)
      .filter((r) => !["passed", "rejected", "closed"].includes(r.status.toLowerCase()))
      .map((r) => ({ tab: r.tab, rowIndex: r.rowIndex, name: r.name, status: r.status }));
  } catch {
    // 시트 읽기 실패 시 DB만 처리
  }

  if (dryRun) {
    return NextResponse.json({
      success: true,
      dryRun: true,
      dbTargets: active.map((c) => ({ id: c.id, name: c.full_name, status: c.pipeline_status })),
      sheetTargets,
    });
  }

  // DB 일괄 탈락
  let dbUpdated = 0;
  if (active.length > 0) {
    const { error } = await supabase
      .from("candidates")
      .update({
        pipeline_status: "rejected",
        rejection_reason: `Position closed — ${jdCode} matched (KTC Ops)`,
        updated_at: new Date().toISOString(),
      })
      .in("id", active.map((c) => c.id));
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    dbUpdated = active.length;
  }

  // 시트 일괄 업데이트
  let sheetUpdated = 0;
  const sheetErrors: string[] = [];
  for (const t of sheetTargets) {
    try {
      await updateQualifiedStatus(t.tab, t.rowIndex, "rejected");
      sheetUpdated++;
    } catch (e) {
      sheetErrors.push(`${t.tab}#${t.rowIndex}: ${e instanceof Error ? e.message : "failed"}`);
    }
  }

  return NextResponse.json({ success: true, dbUpdated, sheetUpdated, sheetErrors });
}
