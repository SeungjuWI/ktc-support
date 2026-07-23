import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { loadAllJDs, matchJobCode } from "@/lib/jd-data";
import { fetchAllRows } from "@/lib/fetch-all-rows";
import { readQualifiedRows, readOpsFunnel, readEmployees, type QualifiedRow, type OpsFunnelRow, type EmployeeRow } from "@/lib/qualified-sheets";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const SCREENED_STATUSES = ["passed"];

// 구글시트 3종 읽기는 호출당 0.5~2초 → 60초 인메모리 캐시로 대시보드 진입 지연 제거.
// 시트를 직접 수정하는 동기화 직후에는 ?fresh=1로 캐시를 무시하고 다시 읽는다.
const SHEET_TTL_MS = 60_000;
let sheetCache: { at: number; qualified: QualifiedRow[]; ops: OpsFunnelRow[]; employees: EmployeeRow[] } | null = null;

export async function GET(req: Request) {
  const supabase = getSupabaseAdmin();
  const fresh = new URL(req.url).searchParams.get("fresh") === "1";
  const cachedSheets = !fresh && sheetCache && Date.now() - sheetCache.at < SHEET_TTL_MS ? sheetCache : null;

  // DB(후보자·JD)와 구글시트 3종을 전부 병렬로 읽기 (직렬 실행 시 지연이 누적됨)
  const [candidatesResult, jdResult, qualifiedResult, opsResult, employeesResult] = await Promise.allSettled([
    fetchAllRows<{ applied_job: string | null; pipeline_status: string }>(
      supabase, "candidates", "applied_job, pipeline_status"
    ),
    loadAllJDs(supabase),
    cachedSheets ? Promise.resolve(cachedSheets.qualified) : readQualifiedRows(),
    cachedSheets ? Promise.resolve(cachedSheets.ops) : readOpsFunnel(),
    cachedSheets ? Promise.resolve(cachedSheets.employees) : readEmployees(),
  ]);

  if (candidatesResult.status === "rejected") {
    return NextResponse.json({ error: String(candidatesResult.reason) }, { status: 500 });
  }
  if (candidatesResult.value.error) {
    return NextResponse.json({ error: candidatesResult.value.error }, { status: 500 });
  }
  if (jdResult.status === "rejected") {
    return NextResponse.json({ error: String(jdResult.reason) }, { status: 500 });
  }
  const candidates = candidatesResult.value.rows;
  const allJDs = jdResult.value;
  const qualified = qualifiedResult.status === "fulfilled" ? qualifiedResult.value : [];
  const ops = opsResult.status === "fulfilled" ? opsResult.value : [];
  const employees = employeesResult.status === "fulfilled" ? employeesResult.value : [];
  const sheetErrors: string[] = [];
  if (qualifiedResult.status === "rejected") sheetErrors.push(`Qualified sheet: ${qualifiedResult.reason?.message || "read failed"}`);
  if (opsResult.status === "rejected") sheetErrors.push(`KTC Ops sheet: ${opsResult.reason?.message || "read failed"}`);
  if (employeesResult.status === "rejected") sheetErrors.push(`Employee tab: ${employeesResult.reason?.message || "read failed"}`);

  if (!cachedSheets && sheetErrors.length === 0) {
    sheetCache = { at: Date.now(), qualified, ops, employees };
  }

  // 전체 퍼널 합계 (DB 기준)
  const totals = {
    total: candidates.length,
    pending: candidates.filter((c) => c.pipeline_status === "new").length,
    screened: candidates.filter((c) => SCREENED_STATUSES.includes(c.pipeline_status)).length,
    readyToForward: candidates.filter((c) => c.pipeline_status === "ready_to_forward").length,
    sentToCompany: candidates.filter((c) => c.pipeline_status === "sent_to_company").length,
    interviewing: candidates.filter((c) => c.pipeline_status === "interviewing").length,
    offer: candidates.filter((c) => c.pipeline_status === "offer").length,
    matched: candidates.filter((c) => c.pipeline_status === "final_passed").length,
    rejected: candidates.filter((c) => ["rejected", "screening_failed"].includes(c.pipeline_status)).length,
    rejectedOnly: candidates.filter((c) => c.pipeline_status === "rejected").length,
    screeningFailed: candidates.filter((c) => c.pipeline_status === "screening_failed").length,
    opsHired: employees.length,
    opsActive: employees.filter((e) => e.status === "Ing").length,
  };

  // JD 코드별 DB 카운트
  const dbByJD: Record<string, { total: number; screened: number; readyToForward: number; sentToCompany: number; interviewing: number; offer: number; matched: number }> = {};
  for (const c of candidates) {
    const code = matchJobCode(c.applied_job || "", allJDs);
    if (!code) continue;
    if (!dbByJD[code]) dbByJD[code] = { total: 0, screened: 0, readyToForward: 0, sentToCompany: 0, interviewing: 0, offer: 0, matched: 0 };
    const b = dbByJD[code];
    b.total++;
    if (SCREENED_STATUSES.includes(c.pipeline_status)) b.screened++;
    if (c.pipeline_status === "ready_to_forward") b.readyToForward++;
    if (c.pipeline_status === "sent_to_company") b.sentToCompany++;
    if (c.pipeline_status === "interviewing") b.interviewing++;
    if (c.pipeline_status === "offer") b.offer++;
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
      db: db || { total: 0, screened: 0, readyToForward: 0, sentToCompany: 0, interviewing: 0, offer: 0, matched: 0 },
      sheetCount: sheetRows.length,
      sheetStatusCounts: statusCounts,
    };
  });

  return NextResponse.json({
    totals,
    jdRows,
    sheetErrors,
    syncedAt: new Date().toISOString(),
  });
}
