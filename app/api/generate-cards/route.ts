import { createClient } from "@supabase/supabase-js";
import { extractAndUploadPhoto } from "@/lib/extract-photo";
import { google } from "googleapis";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function scoreToGrade(score: number): string {
  if (score >= 85) return "S";
  if (score >= 70) return "A";
  if (score >= 55) return "B";
  return "C";
}

async function downloadPdfForPhoto(url: string): Promise<Buffer | null> {
  try {
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/?]+)/);
    if (driveMatch) {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          private_key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
        },
        scopes: ["https://www.googleapis.com/auth/drive.readonly"],
      });
      const drive = google.drive({ version: "v3", auth });
      const res = await drive.files.get({ fileId: driveMatch[1], alt: "media" }, { responseType: "arraybuffer" });
      return Buffer.from(res.data as ArrayBuffer);
    }
    const res = await fetch(url, { redirect: "follow", headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.subarray(0, 5).toString().includes("PDF")) return buf;
    return null;
  } catch {
    return null;
  }
}

function mapLocation(loc: string): string {
  if (!loc) return "기타";
  if (/ho chi minh|hcm|호치민|hồ chí minh/i.test(loc)) return "호치민";
  if (/ha noi|hanoi|하노이|hà nội/i.test(loc)) return "하노이";
  if (/da nang|danang|다낭|đà nẵng/i.test(loc)) return "다낭";
  return "기타";
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

        const { data: passed } = await supabase
          .from("candidates")
          .select("*")
          .eq("pipeline_status", "passed")
          .is("talent_id", null)
          .not("llm_score", "is", null);

        if (!passed || passed.length === 0) {
          send({ type: "done", total: 0, created: 0 });
          controller.close();
          return;
        }

        send({ type: "status", message: `${passed.length}명의 합격자 카드 생성 시작...`, total: passed.length });

        let created = 0;
        let errors = 0;

        for (let i = 0; i < passed.length; i++) {
          const c = passed[i];
          const llm = c.llm_summary ? JSON.parse(c.llm_summary) : {};
          const score = c.llm_score || 0;

          const role = llm.role || c.position || "Unknown";
          const yearsExp = Math.round(llm.years_exp || parseInt((c.yoe || "0").match(/(\d+)/)?.[1] || "0"));
          const location = mapLocation(llm.location || c.city || "");
          const topSkills: string[] = (llm.top_skills || []).slice(0, 5);
          const strengthsKo: string[] = llm.strengths_ko || llm.strengths || [];
          const summaryKo = llm.summary_ko || llm.summary || "";
          const abilities = llm.abilities || { technical: 0, english: 0, collaboration: 0, stability: 0, growth: 0 };

          const careerHistory = (llm.career_history || []).map((ch: { company: string; position: string; period: string }) => ({
            tier: ch.company,
            position: ch.position,
            startDate: ch.period?.split("-")[0]?.trim() || "",
            endDate: ch.period?.split("-")[1]?.trim() || "현재",
            current: (ch.period || "").toLowerCase().includes("present"),
          }));

          // 중복 체크: 같은 이름의 talent가 이미 있으면 기존 것에 연결
          const { data: existingTalent } = await supabase
            .from("talents")
            .select("id")
            .eq("name", c.full_name)
            .maybeSingle();

          if (existingTalent) {
            await supabase.from("candidates").update({ talent_id: existingTalent.id }).eq("id", c.id);
            created++;
            send({ type: "created", current: i + 1, total: passed.length, name: c.full_name, score, role, progress: Math.round(((i + 1) / passed.length) * 100), note: "linked to existing" });
            continue;
          }

          const { data: talent, error } = await supabase
            .from("talents")
            .insert({
              name: c.full_name,
              role,
              years_exp: yearsExp,
              location,
              ovr_score: score,
              ovr_grade: scoreToGrade(score),
              top_skills: topSkills.length >= 2 ? [topSkills[0], topSkills[1]] : [topSkills[0] || "", topSkills[1] || ""],
              korean_level: 1,
              desired_salary_krw: 0,
              availability: "negotiable",
              ktc_comment: summaryKo,
              abilities,
              detailed_skills: topSkills.map((s: string, idx: number) => ({
                name: s,
                score: Math.max(50, 95 - idx * 8),
                type: idx < 3 ? "core" : "sub",
              })),
              career_history: careerHistory,
              tags: strengthsKo.slice(0, 3),
              verification: ["서류 합격"],
              resume_url: c.cv_url || null,
              published: false,
            })
            .select("id")
            .single();

          if (error) {
            errors++;
            send({ type: "error_item", name: c.full_name, error: error.message });
          } else if (talent) {
            await supabase
              .from("candidates")
              .update({ talent_id: talent.id })
              .eq("id", c.id);

            // PDF에서 프로필 사진 추출
            if (c.cv_url) {
              const pdfBuf = await downloadPdfForPhoto(c.cv_url);
              if (pdfBuf) {
                const photoUrl = await extractAndUploadPhoto(supabase, pdfBuf, talent.id);
                if (photoUrl) {
                  await supabase.from("talents").update({ photo_url: photoUrl }).eq("id", talent.id);
                }
              }
            }

            created++;
            send({
              type: "created",
              current: i + 1,
              total: passed.length,
              name: c.full_name,
              score,
              role,
              progress: Math.round(((i + 1) / passed.length) * 100),
            });
          }
        }

        send({ type: "done", total: passed.length, created, errors });
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
