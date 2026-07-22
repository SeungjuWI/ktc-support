import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { loadAllJDs, matchJobCode } from "@/lib/jd-data";
import { readQualifiedRows, readOpsFunnel, readEmployees, type QualifiedRow } from "@/lib/qualified-sheets";

export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// 스크리닝 합격 풀로 취급하는 상태 (레거시 AI 인터뷰 상태 포함)
const SCREENED_STATUSES = ["passed", "ai_interview_sent", "ai_interview_done", "ai_interview_passed"];

export async function GET() {
  const supabase = getSupabaseAdmin();

  // 후보자 전체 (필요 컬럼만, 페이지네이션)
  const candidates: { applied_job: string | null; pipeline_status: string }[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("candidates")
      .select("applied_job, pipeline_status")
      .range(from, from + 999);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data || data.length === 0) break;
    candidates.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }

  const allJDs = await loadAllJDs(supabase);

  const [qualifiedResult, opsResult, employeesResult] = await Promise.allSettled([
    readQualifiedRows(),
    readOpsFunnel(),
    readEmployees(),
  ]);
  const qualified = qualifiedResult.status === "fulfilled" ? qualifiedResult.value : [];
  const ops = opsResult.status === "fulfilled" ? opsResult.value : [];
  const employees = employeesResult.status === "fulfilled" ? employeesResult.value : [];
  const sheetErrors: string[] = [];
  if (qualifiedResult.status === "rejected") sheetErrors.push(`Qualified sheet: ${qualifiedResult.reason?.message || "read failed"}`);
  if (opsResult.status === "rejected") sheetErrors.push(`KTC Ops sheet: ${opsResult.reason?.message || "read failed"}`);
  if (employeesResult.status === "rejected") sheetErrors.push(`Employee tab: ${employeesResult.reason?.message || "read failed"}`);

  // 전체 퍼널 합계 (DB 기준)
  const totals = {
    total: candidates.length,
    pending: candidates.filter((c) => c.pipeline_status === "new").length,
    screened: candidates.filter((c) => SCREENED_STATUSES.includes(c.pipeline_status)).length,
    sentToCompany: candidates.filter((c) => c.pipeline_status === "sent_to_company").length,
    interviewing: candidates.filter((c) => c.pipeline_status === "interviewing").length,
    matched: candidates.filter((c) => c.pipeline_status === "final_passed").length,
    rejected: candidates.filter((c) => ["rejected", "screening_failed"].includes(c.pipeline_status)).length,
    opsHired: employees.length,
    opsActive: employees.filter((e) => e.status === "Ing").length,
  };

  // JD 코드별 DB 카운트
  const dbByJD: Record<string, { total: number; screened: number; sentToCompany: number; interviewing: number; matched: number }> = {};
  for (const c of candidates) {
    const code = matchJobCode(c.applied_job || "", allJDs);
    if (!code) continue;
    if (!dbByJD[code]) dbByJD[code] = { total: 0, screened: 0, sentToCompany: 0, interviewing: 0, matched: 0 };
    const b = dbByJD[code];
    b.total++;
    if (SCREENED_STATUSES.includes(c.pipeline_status)) b.screened++;
    if (c.pipeline_status === "sent_to_company") b.sentToCompany++;
    if (c.pipeline_status === "interviewing") b.interviewing++;
    if (c.pipeline_status === "final_passed") b.matched++;
  }

  // Qualified 시트 행 → JD 코드 매핑
  const qualifiedByJD: Record<string, QualifiedRow[]> = {};
  for (const row of qualified) {
    const code = matchJobCode(row.position, allJDs) || "";
    const key = code || `tab:${row.tab}`;
    if (!qualifiedByJD[key]) qualifiedByJD[key] = [];
    qualifiedByJD[key].push(row);
  }

  // JD별 통합 뷰: KTC Ops 퍼널 기준으로 구성
  const jdRows = ops.map((o) => {
    const jd = o.jdCode && allJDs[o.jdCode] ? allJDs[o.jdCode] : null;
    const db = o.jdCode ? dbByJD[o.jdCode] : undefined;
    const sheetRows = o.jdCode ? qualifiedByJD[o.jdCode] || [] : [];
    const statusCounts: Record<string, number> = {};
    for (const r of sheetRows) {
      const s = r.status || "(없음)";
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    }
    return {
      jdCode: o.jdCode,
      opsCode: o.code,
      category: o.category,
      funnel: o.funnel,
      company: jd?.company || o.company,
      position: jd?.position || o.position,
      db: db || { total: 0, screened: 0, sentToCompany: 0, interviewing: 0, matched: 0 },
      sheetCount: sheetRows.length,
      sheetStatusCounts: statusCounts,
    };
  });

  return NextResponse.json({
    totals,
    jdRows,
    qualified,
    sheetErrors,
    syncedAt: new Date().toISOString(),
  });
}
