/* 읽기 전용: ai_interview_passed 상태 지원자 확인. npx tsx scripts/inspect-ai-passed.ts */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data, error } = await supabase
    .from("candidates")
    .select("id, full_name, email, applied_job, applied_company, pipeline_status")
    .eq("pipeline_status", "ai_interview_passed");

  if (error) { console.error(error); process.exit(1); }

  console.log(`\n=== pipeline_status = 'ai_interview_passed' 총 ${data?.length ?? 0}명 ===\n`);
  const byCompany: Record<string, number> = {};
  for (const c of data || []) {
    const key = `${c.applied_job ?? "∅"}  |  company=${c.applied_company ?? "∅"}`;
    byCompany[key] = (byCompany[key] || 0) + 1;
  }
  console.log("[applied_job / applied_company 분포]");
  Object.entries(byCompany).sort((a, b) => b[1] - a[1]).forEach(([k, v]) =>
    console.log(`  ${v.toString().padStart(3)}  ${k}`)
  );

  console.log("\n[개별 목록]");
  for (const c of data || []) {
    console.log(`  ${c.full_name}  <${c.email ?? "no-email"}>  job=${c.applied_job ?? "∅"}  company=${c.applied_company ?? "∅"}`);
  }
}

main();
