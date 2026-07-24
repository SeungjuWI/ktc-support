/* ai_interview_passed(폐지된 상태) → passed(서류합격) 정규화.
   대상: Designbook / Camon Social 지원자. npx tsx scripts/normalize-ai-passed.ts [--apply] */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { updateTalentVerification } from "@/lib/create-talent-card";
import {
  readQualifiedRows,
  findQualifiedRow,
  updateQualifiedStatus,
  PIPELINE_TO_SHEET_STATUS,
} from "@/lib/qualified-sheets";

const APPLY = process.argv.includes("--apply");
const NEW_STATUS = "passed";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Designbook / Camon Social 판별 (applied_job 코드 접두사 또는 applied_company)
function isTarget(job: string | null, company: string | null): boolean {
  const j = (job || "").toUpperCase();
  const c = (company || "").toLowerCase();
  if (j.startsWith("DB2") || j.startsWith("CS2")) return true;
  if (c.includes("designbook") || c.includes("camon")) return true;
  return false;
}

async function main() {
  const { data, error } = await supabase
    .from("candidates")
    .select("id, full_name, email, applied_job, applied_company")
    .eq("pipeline_status", "ai_interview_passed");
  if (error) { console.error(error); process.exit(1); }

  const targets = (data || []).filter((c) => isTarget(c.applied_job, c.applied_company));
  const skipped = (data || []).filter((c) => !isTarget(c.applied_job, c.applied_company));

  console.log(`\nai_interview_passed 총 ${data?.length ?? 0}명 중 대상 ${targets.length}명${APPLY ? " (실제 반영)" : " (DRY-RUN — 반영 안 함)"}`);
  targets.forEach((c) => console.log(`  ✓ ${c.full_name}  job=${c.applied_job ?? "∅"}  company=${c.applied_company ?? "∅"}`));
  if (skipped.length) {
    console.log(`\n[제외 — Designbook/Camon 아님]`);
    skipped.forEach((c) => console.log(`  · ${c.full_name}  job=${c.applied_job ?? "∅"}  company=${c.applied_company ?? "∅"}`));
  }

  if (!APPLY) {
    console.log(`\n반영하려면: npx tsx scripts/normalize-ai-passed.ts --apply\n`);
    return;
  }
  if (targets.length === 0) { console.log("대상 없음. 종료."); return; }

  const ids = targets.map((c) => c.id);

  // 1) pipeline_status 일괄 변경
  const { error: upErr } = await supabase
    .from("candidates")
    .update({ pipeline_status: NEW_STATUS, updated_at: new Date().toISOString() })
    .in("id", ids);
  if (upErr) { console.error("update 실패:", upErr); process.exit(1); }
  console.log(`\n✅ candidates ${ids.length}명 pipeline_status → '${NEW_STATUS}'`);

  // 2) talent 검증 칩 갱신 (talent 카드 있는 경우만)
  for (const id of ids) await updateTalentVerification(supabase, id, NEW_STATUS);
  console.log(`✅ talent verification 갱신 완료`);

  // 3) Qualified 시트: 이미 있는 행만 상태 반영 (없으면 skip — passed는 append 대상 아님)
  const sheetStatus = PIPELINE_TO_SHEET_STATUS[NEW_STATUS];
  if (sheetStatus) {
    let updated = 0;
    try {
      const rows = await readQualifiedRows();
      for (const c of targets) {
        try {
          const row = findQualifiedRow(rows, c.email, c.full_name);
          if (row) { await updateQualifiedStatus(row.tab, row.rowIndex, sheetStatus); updated++; }
        } catch (e) {
          console.warn(`  시트 반영 실패 ${c.full_name}: ${e instanceof Error ? e.message : e}`);
        }
      }
      console.log(`✅ Qualified 시트 기존 행 ${updated}건 반영 (나머지는 시트에 없어 skip)`);
    } catch (e) {
      console.warn(`시트 읽기 실패(앱 상태 변경은 완료됨): ${e instanceof Error ? e.message : e}`);
    }
  }

  console.log(`\n완료.\n`);
}

main();
