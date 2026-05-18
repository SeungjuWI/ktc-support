import { createClient } from "@supabase/supabase-js";
import { fetchAllCandidates } from "@/lib/google-sheets";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        send({ type: "status", message: "시트 데이터 불러오는 중..." });
        const allCandidates = await fetchAllCandidates();

        // 우선 대상 회사만 필터 (빈 배열이면 전체)
        const PRIORITY_JOBS = /FPT401|AW801|LM1001|SHU1101|SHU1102/i;
        const candidates = PRIORITY_JOBS.source !== "(?:)"
          ? allCandidates.filter((c) => PRIORITY_JOBS.test(c.applied_job || ""))
          : allCandidates;

        const total = candidates.length;
        send({ type: "status", message: `전체 ${allCandidates.length}명 중 대상 ${total}명. DB 저장 시작...`, total });

        const supabase = getSupabaseAdmin();
        let inserted = 0;
        let errors = 0;

        // 50개씩 배치 upsert
        const BATCH_SIZE = 50;
        for (let i = 0; i < total; i += BATCH_SIZE) {
          const batch = candidates.slice(i, i + BATCH_SIZE).map((c) => ({
            full_name: c.full_name,
            email: c.email || null,
            phone: c.phone || null,
            city: c.city || null,
            university: c.university || null,
            graduation_year: c.graduation_year || null,
            position: c.position || null,
            yoe: c.yoe || null,
            cv_url: c.cv_url || null,
            portfolio_url: c.portfolio_url || null,
            skills: c.skills || null,
            source: c.source,
            applied_date: c.applied_date || null,
            applied_job: c.applied_job || null,
            applied_company: c.applied_company || null,
            sheet_source: c.sheet_source,
            sheet_row_identifier: c.sheet_row_identifier,
            updated_at: new Date().toISOString(),
          }));

          const { error } = await supabase.from("candidates").upsert(batch, {
            onConflict: "sheet_source,sheet_row_identifier",
            ignoreDuplicates: false,
          });

          if (error) {
            errors += batch.length;
          } else {
            inserted += batch.length;
          }

          const progress = Math.min(100, Math.round(((i + batch.length) / total) * 100));
          send({ type: "progress", progress, inserted, errors, total });
        }

        send({
          type: "done",
          total,
          inserted,
          errors,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        send({ type: "error", message });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
