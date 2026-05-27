import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const REFERENCE_DATA = `아래는 실제 매칭된 베트남 IT 인재의 월급(Gross VND) 참고 데이터입니다:

[개발자]
- Developer Intern, 0년차: 5,500,000 ~ 8,600,000
- Developer, 4년차: 36,000,000
- Developer (추정 시니어): 65,000,000
- Developer (추정 주니어~미드): 7,800,000 ~ 26,200,000

[비개발]
- IT Comtor, 3년차: 10,700,000
- UX/UI Design: 7,000,000
- Graphic Design: 15,000,000

추가 시장 데이터 (2025-2026, 한국 기업 원격근무 기준):
- Junior Dev (1-2yr): 8M~15M
- Mid Dev (3-5yr): 15M~30M
- Senior Dev (5-7yr): 25M~45M
- Lead/Principal (8yr+): 40M~70M
- Junior Designer (0-2yr): 7M~12M
- Mid Designer (3-5yr): 12M~20M
- Senior Designer (6yr+): 18M~30M
- Data/AI Junior: 8M~15M, Mid: 15M~30M, Senior: 28M~50M
- QA Junior: 7M~12M, Mid: 11M~20M, Senior: 18M~30M
- IT Comtor/BrSE Junior: 8M~12M, Mid: 10M~18M, Senior: 16M~25M
- Marketing Junior: 6M~10M, Mid: 10M~16M, Senior: 14M~22M`;


interface TalentRow {
  id: string;
  name: string;
  role: string;
  years_exp: number;
  location: string;
  ovr_score: number;
  ovr_grade: string;
  top_skills: string[];
  abilities: Record<string, number>;
  detailed_skills: { name: string; score: number; type: string }[];
  career_history: { tier: string; position: string; startDate: string; endDate: string }[];
  salary_min_vnd: number | null;
}

export async function POST(req: Request) {
  try {
    const { overwrite } = await req.json().catch(() => ({ overwrite: false }));
    const supabase = getSupabaseAdmin();

    // salary가 없거나 overwrite인 인재들 가져오기
    let query = supabase
      .from("talents")
      .select("id, name, role, years_exp, location, ovr_score, ovr_grade, top_skills, abilities, detailed_skills, career_history, salary_min_vnd")
      .order("created_at", { ascending: true });

    if (!overwrite) {
      query = query.or("salary_min_vnd.is.null,salary_min_vnd.eq.0");
    }

    const { data: talents, error } = await query;
    if (error) return Response.json({ error: error.message }, { status: 500 });
    if (!talents || talents.length === 0) {
      return Response.json({ message: "추정할 인재가 없습니다.", updated: 0 });
    }

    // 5명씩 배치로 처리 (하나의 프롬프트에 여러 명)
    const BATCH_SIZE = 5;
    let updated = 0;
    const errors: string[] = [];

    console.log(`[estimate-salaries] 총 ${talents.length}건 처리 시작 (배치 ${BATCH_SIZE}명씩)`);

    for (let i = 0; i < talents.length; i += BATCH_SIZE) {
      const batch = talents.slice(i, i + BATCH_SIZE) as TalentRow[];
      console.log(`[estimate-salaries] 배치 ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(talents.length / BATCH_SIZE)} (${i + 1}~${Math.min(i + BATCH_SIZE, talents.length)}번째)`);

      const profiles = batch.map((t, idx) => {
        const skills = t.detailed_skills?.map((s) => `${s.name}(${s.score})`).join(", ") || t.top_skills?.join(", ") || "";
        const career = t.career_history?.map((c) => `${c.tier} - ${c.position} (${c.startDate}~${c.endDate})`).join(" → ") || "N/A";
        const abilities = t.abilities ? Object.entries(t.abilities).map(([k, v]) => `${k}:${v}`).join(", ") : "N/A";

        return `[Talent ${idx + 1}] id=${t.id}
Role: ${t.role} | YoE: ${t.years_exp}yr | Location: ${t.location}
OVR: ${t.ovr_score} (${t.ovr_grade}) | Skills: ${skills}
Career: ${career}
Abilities: ${abilities}`;
      }).join("\n\n");

      const batchPrompt = `You are a Vietnam IT salary estimation expert.
Given multiple talent profiles, estimate realistic monthly salary ranges (Gross VND) for each person working remotely for a Korean company.

${REFERENCE_DATA}

## Rules
1. Consider: role, years_exp, top_skills, skill depth/breadth, career_history (company tier, progression), ovr_score, abilities
2. Higher ovr_score (85+) = top of range or above. Lower (<55) = bottom of range.
3. Niche/in-demand skills (AI/ML, DevOps, Cloud, Kubernetes, React Native) command premium
4. Career progression (promotions, tier-1 companies) = higher salary
5. Return a TIGHT range (max should be ~1.5x~2x of min, not wider)
6. Round to nearest 500,000 VND
7. Return JSON object with key "results" containing array: {"results": [{"id": "uuid", "salary_min_vnd": number, "salary_max_vnd": number}, ...]}

## Talent Profiles
${profiles}

Return ONLY the JSON object with "results" key.`;

      try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4.1-mini",
            messages: [{ role: "user", content: batchPrompt }],
            temperature: 0.2,
            max_tokens: 2048,
            response_format: { type: "json_object" },
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          errors.push(`Batch ${i}: API ${res.status} - ${errText.substring(0, 100)}`);
          continue;
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
          errors.push(`Batch ${i}: Empty response`);
          continue;
        }

        const parsed = JSON.parse(content);
        const results: { id: string; salary_min_vnd: number; salary_max_vnd: number }[] =
          parsed.results || parsed.talents || parsed.data || (Array.isArray(parsed) ? parsed : []);

        if (results.length === 0) {
          errors.push(`Batch ${i}: Empty results. Keys: ${Object.keys(parsed).join(",")}`);
          continue;
        }

        for (const r of results) {
          if (!r.id || !r.salary_min_vnd || !r.salary_max_vnd) continue;

          const { error: updateErr } = await supabase
            .from("talents")
            .update({
              salary_min_vnd: r.salary_min_vnd,
              salary_max_vnd: r.salary_max_vnd,
              updated_at: new Date().toISOString(),
            })
            .eq("id", r.id);

          if (updateErr) {
            errors.push(`Update ${r.id}: ${updateErr.message}`);
          } else {
            updated++;
            console.log(`  ✓ ${r.id} → ${(r.salary_min_vnd/1000000).toFixed(1)}M~${(r.salary_max_vnd/1000000).toFixed(1)}M VND`);
          }
        }

        // Rate limit 방지
        if (i + BATCH_SIZE < talents.length) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Unknown";
        errors.push(`Batch ${i}: ${errMsg}`);
        console.error(`  ✗ Batch ${i} 에러:`, errMsg);
      }
    }

    console.log(`[estimate-salaries] 완료: ${updated}/${talents.length}건 업데이트`);

    return Response.json({
      message: `${updated}/${talents.length}건 연봉 추정 완료`,
      updated,
      total: talents.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
