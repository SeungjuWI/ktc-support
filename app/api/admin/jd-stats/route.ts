import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { matchJobCode, type JobDescription } from "@/lib/jd-data";
import { fetchAllRows } from "@/lib/fetch-all-rows";
import { readOpsFunnel, type OpsFunnelRow } from "@/lib/qualified-sheets";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface JDStat {
  code: string;
  jd: JobDescription;
  status: "active" | "closed";
  funnel: string | null;
  totalCandidates: number;
  statusCounts: Record<string, number>;
}

export interface UnregisteredStat {
  code: string;
  totalCandidates: number;
  statusCounts: Record<string, number>;
}

// Ops 시트 funnel 기준 마감 판정: 7.(계약)·9.(완료)·Drop
function isClosedFunnel(funnel: string): boolean {
  const f = funnel.trim();
  return f.startsWith("7.") || f.startsWith("9.") || f.toLowerCase().startsWith("drop");
}

// Ops 시트 읽기는 호출당 0.5~1초 → 60초 인메모리 캐시
const OPS_TTL_MS = 60_000;
let opsCache: { at: number; rows: OpsFunnelRow[] } | null = null;

interface JDRow extends JobDescription {
  code: string;
}

export async function GET() {
  const supabase = getSupabaseAdmin();

  const [candidatesResult, jdResult, opsResult] = await Promise.allSettled([
    fetchAllRows<{ applied_job: string | null; applied_company: string | null; pipeline_status: string }>(
      supabase, "candidates", "applied_job, applied_company, pipeline_status"
    ),
    supabase.from("jd_definitions").select("*"),
    opsCache && Date.now() - opsCache.at < OPS_TTL_MS
      ? Promise.resolve(opsCache.rows)
      : readOpsFunnel(),
  ]);

  if (candidatesResult.status === "rejected" || candidatesResult.value.error) {
    const msg = candidatesResult.status === "rejected"
      ? String(candidatesResult.reason)
      : candidatesResult.value.error;
    return NextResponse.json({ error: msg }, { status: 500 });
  }
  if (jdResult.status === "rejected" || jdResult.value.error) {
    const msg = jdResult.status === "rejected"
      ? String(jdResult.reason)
      : jdResult.value.error!.message;
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const candidates = candidatesResult.value.rows;
  const jdRows = (jdResult.value.data || []) as JDRow[];
  const ops = opsResult.status === "fulfilled" ? opsResult.value : [];
  const opsError = opsResult.status === "rejected";
  if (!opsError) opsCache = { at: Date.now(), rows: ops };

  // DB의 jd_definitions만 목록의 기준으로 삼는다 (JD_MAP 병합 X — 삭제한 JD가 부활하지 않도록)
  const jdMap: Record<string, JobDescription> = {};
  for (const row of jdRows) {
    jdMap[row.code] = {
      company: row.company,
      position: row.position,
      experience: row.experience,
      hires: row.hires,
      salary: row.salary,
      responsibilities: row.responsibilities,
      qualifications: row.qualifications,
      preferred: row.preferred,
    };
  }

  // 후보자 카운트 — 대시보드와 동일한 matchJobCode 하나로 통일
  const countsByCode: Record<string, Record<string, number>> = {};
  const unregisteredCounts: Record<string, Record<string, number>> = {};
  for (const c of candidates) {
    if (!c.applied_job) continue;
    const matched = matchJobCode(c.applied_job, jdMap, c.applied_company || undefined);
    if (matched && jdMap[matched]) {
      const bucket = (countsByCode[matched] ||= {});
      bucket[c.pipeline_status] = (bucket[c.pipeline_status] || 0) + 1;
      continue;
    }
    // JD 목록에 없는 코드로 지원한 후보자 → 미등록 코드로 노출 (유령 방지)
    const prefix = matched || c.applied_job.match(/^([A-Z]+\d{2,})/)?.[1];
    if (prefix) {
      const bucket = (unregisteredCounts[prefix] ||= {});
      bucket[c.pipeline_status] = (bucket[c.pipeline_status] || 0) + 1;
    }
  }

  // JD 코드별 Ops funnel — 매칭 행이 있고 전부 마감 funnel이면 closed
  const opsByCode: Record<string, OpsFunnelRow[]> = {};
  for (const o of ops) {
    if (!o.jdCode) continue;
    (opsByCode[o.jdCode] ||= []).push(o);
  }

  const jds: JDStat[] = Object.entries(jdMap).map(([code, jd]) => {
    const statusCounts = countsByCode[code] || {};
    const totalCandidates = Object.values(statusCounts).reduce((a, b) => a + b, 0);
    const opsRows = opsByCode[code] || [];
    const closed = opsRows.length > 0 && opsRows.every((o) => isClosedFunnel(o.funnel));
    return {
      code,
      jd,
      status: closed ? "closed" : "active",
      funnel: opsRows[0]?.funnel || null,
      totalCandidates,
      statusCounts,
    };
  });

  const unregistered: UnregisteredStat[] = Object.entries(unregisteredCounts)
    .map(([code, statusCounts]) => ({
      code,
      totalCandidates: Object.values(statusCounts).reduce((a, b) => a + b, 0),
      statusCounts,
    }))
    .sort((a, b) => b.totalCandidates - a.totalCandidates);

  return NextResponse.json({ jds, unregistered, opsError });
}
