import { createClient } from "@supabase/supabase-js";
import { screenCandidate } from "@/lib/gemini-screening";
import { JD_MAP, matchJobCode, buildJDText } from "@/lib/jd-data";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// 단일 후보자 스크리닝
export async function POST(req: Request) {
  try {
    const { candidateId } = await req.json();
    const supabase = getSupabaseAdmin();

    const { data: candidate } = await supabase
      .from("candidates")
      .select("*")
      .eq("id", candidateId)
      .single();

    if (!candidate) {
      return Response.json({ error: "후보자를 찾을 수 없습니다." }, { status: 404 });
    }

    if (!candidate.cv_url) {
      return Response.json({ error: "CV 링크가 없습니다." }, { status: 400 });
    }

    // applied_job으로 JD 매칭
    const jobCode = matchJobCode(candidate.applied_job || "");
    if (!jobCode || !JD_MAP[jobCode]) {
      return Response.json({ error: "매칭되는 JD가 없습니다." }, { status: 400 });
    }

    const jd = JD_MAP[jobCode];
    const jdText = buildJDText(jd);

    const result = await screenCandidate(candidate.cv_url, jdText);

    if ("error" in result) {
      return Response.json({ error: result.error }, { status: 500 });
    }

    // 결과 저장
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
        rejection_reason: result.verdict === "FAIL"
          ? `LLM screening failed (${result.score}/100): ${result.gaps_en.join(", ")}`
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", candidateId);

    return Response.json({
      success: true,
      result: {
        score: result.score,
        verdict: result.verdict,
        yoe_check: result.yoe_check,
        strengths_en: result.strengths_en,
        gaps_en: result.gaps_en,
        company: jd.company,
        position: jd.position,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
