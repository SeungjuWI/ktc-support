import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  readQualifiedRows,
  normalizeName,
  SHEET_TO_PIPELINE,
  PIPELINE_RANK,
} from "@/lib/qualified-sheets";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Qualified 시트의 Status를 앱 DB로 역방향 동기화.
//  - 시트 상태가 앱보다 앞 단계면 건너뜀 (앱을 뒤로 되돌리지 않음)
//  - final_passed(매칭 완료)는 절대 변경하지 않음
//  - "not selected" → rejected
export async function POST(req: NextRequest) {
  const { dryRun } = await req.json().catch(() => ({ dryRun: false }));
  const supabase = getSupabaseAdmin();

  const rows = await readQualifiedRows();

  const candidates: { id: string; full_name: string; email: string | null; pipeline_status: string }[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("candidates")
      .select("id, full_name, email, pipeline_status")
      .order("id")
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

  const updates: { id: string; name: string; from: string; to: string; tab: string }[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    const target = SHEET_TO_PIPELINE[r.status.trim().toLowerCase()];
    if (!target) continue; // 날짜/메모 등 매핑 안 되는 값은 무시
    const c = byEmail.get(r.email.toLowerCase()) || byName.get(normalizeName(r.name));
    if (!c || seen.has(c.id)) continue;
    // 종결 상태(매칭 완료·탈락·스크리닝 실패)는 시트로 되살리지 않음 (시트 Status가 더 오래된 정보일 수 있음)
    if (["final_passed", "rejected", "screening_failed"].includes(c.pipeline_status)) continue;
    if (c.pipeline_status === target) continue;
    if (target !== "rejected") {
      const cur = PIPELINE_RANK[c.pipeline_status] ?? 0;
      const tgt = PIPELINE_RANK[target] ?? 0;
      if (tgt <= cur) continue; // 앞 단계로 되돌리지 않음
    }
    seen.add(c.id);
    updates.push({ id: c.id, name: c.full_name, from: c.pipeline_status, to: target, tab: r.tab });
  }

  if (dryRun) {
    return NextResponse.json({ success: true, dryRun: true, sheetRows: rows.length, updates });
  }

  const now = new Date().toISOString();
  let updated = 0;
  // 대상 상태별로 묶어서 일괄 업데이트
  const byTarget = new Map<string, string[]>();
  for (const u of updates) {
    if (!byTarget.has(u.to)) byTarget.set(u.to, []);
    byTarget.get(u.to)!.push(u.id);
  }
  for (const [target, ids] of Array.from(byTarget.entries())) {
    const patch: Record<string, unknown> = { pipeline_status: target, updated_at: now };
    if (target === "rejected") patch.rejection_reason = "Not selected (Qualified sheet)";
    const { error } = await supabase.from("candidates").update(patch).in("id", ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    updated += ids.length;
  }

  return NextResponse.json({ success: true, sheetRows: rows.length, updated, updates });
}
