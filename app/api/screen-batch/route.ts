import { createClient } from "@supabase/supabase-js";
import { screenCandidate } from "@/lib/gemini-screening";
import { JD_MAP, matchJobCode, buildJDText } from "@/lib/jd-data";
import { createTalentCard } from "@/lib/create-talent-card";

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
        const supabase = getSupabaseAdmin();

        // JD 매칭 가능하고, CV 있고, 아직 스크리닝 안 된 후보자만
        const { data: candidates } = await supabase
          .from("candidates")
          .select("*")
          .is("llm_score", null)
          .not("cv_url", "is", null)
          .in("pipeline_status", ["new", "reviewing"]);

        if (!candidates || candidates.length === 0) {
          send({ type: "done", total: 0, passed: 0, failed: 0, skipped: 0 });
          controller.close();
          return;
        }

        // 우선 처리 대상 회사 (없으면 전체)
        const PRIORITY_CODES = ["FPT401", "AW801", "LM1001", "SHU1101", "SHU1102"];

        const matchable = candidates.filter((c) => {
          const code = matchJobCode(c.applied_job || "");
          if (!code || !JD_MAP[code]) return false;
          // 우선 대상 필터 (빈 배열이면 전체)
          if (PRIORITY_CODES.length > 0) return PRIORITY_CODES.includes(code);
          return true;
        });

        const total = matchable.length;
        const skippedCount = candidates.length - total;

        send({
          type: "status",
          message: `${candidates.length}명 중 JD 매칭 가능: ${total}명, 스킵: ${skippedCount}명`,
          total,
        });

        let passed = 0;
        let failed = 0;
        let errors = 0;

        for (let i = 0; i < matchable.length; i++) {
          const c = matchable[i];
          const jobCode = matchJobCode(c.applied_job || "")!;
          const jd = JD_MAP[jobCode];
          const jdText = buildJDText(jd);

          send({
            type: "screening",
            current: i + 1,
            total,
            name: c.full_name,
            company: jd.company,
            position: jd.position,
          });

          try {
            const result = await screenCandidate(c.cv_url, jdText);

            if (result && "score" in result) {
              await supabase
                .from("candidates")
                .update({
                  llm_score: result.score,
                  llm_summary: JSON.stringify({
                    yoe_check: result.yoe_check,
                    verdict: result.verdict,
                    strengths_en: result.strengths_en,
                    strengths_ko: result.strengths_ko,
                    gaps_en: result.gaps_en,
                    gaps_ko: result.gaps_ko,
                    role: result.role,
                    years_exp: result.years_exp,
                    location: result.location,
                    top_skills: result.top_skills,
                    career_history: result.career_history,
                    abilities: result.abilities,
                    summary_en: result.summary_en,
                    summary_ko: result.summary_ko,
                    raw_response: result.raw_response,
                    job_code: jobCode,
                    company: jd.company,
                    position: jd.position,
                  }),
                  pipeline_status: result.verdict === "PASS" ? "passed" : "rejected",
                  rejection_reason:
                    result.verdict === "FAIL"
                      ? `LLM screening failed (${result.score}/100): ${result.gaps_en.join(", ")}`
                      : null,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", c.id);

              if (result.verdict === "PASS") {
                passed++;
                // 합격 시 자동으로 인재 카드 생성 (PDF 버퍼 포함 → 사진 추출)
                await createTalentCard(supabase, c, result, jobCode, result.pdfBuffer);
              } else {
                failed++;
              }

              send({
                type: "result",
                current: i + 1,
                total,
                name: c.full_name,
                score: result.score,
                verdict: result.verdict,
                progress: Math.round(((i + 1) / total) * 100),
              });
            } else {
              errors++;
              const errMsg = result && "error" in result ? (result as { error: string }).error : "알 수 없는 오류";
              send({
                type: "result",
                current: i + 1,
                total,
                name: c.full_name,
                score: null,
                verdict: "ERROR",
                error: errMsg,
                progress: Math.round(((i + 1) / total) * 100),
              });
            }
          } catch {
            errors++;
            send({
              type: "result",
              current: i + 1,
              total,
              name: c.full_name,
              score: null,
              verdict: "ERROR",
              progress: Math.round(((i + 1) / total) * 100),
            });
          }

          // Rate limiting: 빠르게 보내되 429 나면 대기
          if (i < matchable.length - 1) {
            await new Promise((r) => setTimeout(r, 1500));
          }
        }

        send({ type: "done", total, passed, failed, errors, skipped: skippedCount });
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
