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

        const candidates = allCandidates;

        const total = candidates.length;
        send({ type: "status", message: `전체 ${total}명. DB 저장 시작...`, total });

        const supabase = getSupabaseAdmin();
        let inserted = 0;
        let updated = 0;
        let skipped = 0;
        let errors = 0;

        // 기존 후보자의 식별자 + pipeline_status 조회 (1000행 제한 우회)
        send({ type: "status", message: "기존 후보자 조회 중..." });
        const existingAll: { full_name: string; email: string | null; phone: string | null; sheet_row_identifier: string; pipeline_status: string; applied_job: string | null; applied_company: string | null }[] = [];
        {
          const PAGE = 1000;
          let from = 0;
          while (true) {
            const { data } = await supabase
              .from("candidates")
              .select("full_name, email, phone, sheet_row_identifier, pipeline_status, applied_job, applied_company")
              .range(from, from + PAGE - 1);
            if (!data || data.length === 0) break;
            existingAll.push(...data);
            if (data.length < PAGE) break;
            from += PAGE;
          }
        }

        // 중복 체크용 맵 구축: sheet_row_identifier + 이메일 + 이름+전화번호
        // identifier가 바뀌어도 이메일이나 이름+전화번호로 잡아냄
        const existingMap = new Map<string, string>(); // key → pipeline_status (non-"new" 우선)
        const setMap = (key: string, status: string) => {
          if (!key) return;
          const current = existingMap.get(key);
          if (!current || current === "new") {
            existingMap.set(key, status);
          }
        };
        // 같은 사람이라도 다른 공고(JD) 지원이면 별도 행으로 받기 위해 사람 키에 공고 키를 붙임
        const jobKey = (aj?: string | null, ac?: string | null) => {
          const m = (aj || "").match(/[A-Z]{2,}\d{2,}/);
          if (m) return m[0];
          return `${(aj || "").trim().toLowerCase()}|${(ac || "").trim().toLowerCase()}`;
        };
        existingAll.forEach((e) => {
          // 1차: sheet_row_identifier
          setMap(e.sheet_row_identifier, e.pipeline_status);
          // 2차: 이메일+공고 (identifier가 바뀌어도 매칭, 다른 공고 지원은 새 행)
          if (e.email) setMap(`${e.email}::${jobKey(e.applied_job, e.applied_company)}`, e.pipeline_status);
          // 3차: 이름+전화번호+공고 (이메일 없는 경우 대비)
          if (e.full_name && e.phone) setMap(`${e.full_name}-${e.phone}::${jobKey(e.applied_job, e.applied_company)}`, e.pipeline_status);
        });

        // 이번 동기화에서도 같은 row_identifier 중복 방지
        const seenInBatch = new Set<string>();

        send({ type: "status", message: `기존 ${existingMap.size}명 확인. 동기화 시작...` });

        // 새 후보자만 insert, 기존은 pipeline_status 외 정보만 update
        const BATCH_SIZE = 50;
        for (let i = 0; i < total; i += BATCH_SIZE) {
          const chunk = candidates.slice(i, i + BATCH_SIZE);
          const newRows = [];
          const updateRows = [];

          for (const c of chunk) {
            const rowId = c.sheet_row_identifier;
            // 같은 batch 내 중복 스킵
            if (seenInBatch.has(rowId)) { skipped++; continue; }
            seenInBatch.add(rowId);
            // 다중 키로 기존 후보자 매칭: identifier → 이메일 → 이름+전화번호
            const cJobKey = jobKey(c.applied_job, c.applied_company);
            const existingStatus = existingMap.get(rowId)
              ?? (c.email ? existingMap.get(`${c.email}::${cJobKey}`) : undefined)
              ?? (c.full_name && c.phone ? existingMap.get(`${c.full_name}-${c.phone}::${cJobKey}`) : undefined);
            const row = {
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
            };

            if (existingStatus === undefined) {
              newRows.push({ ...row, pipeline_status: "new" });
            } else if (existingStatus === "new") {
              // 아직 처리 안 된 후보자만 정보 업데이트
              updateRows.push(row);
            } else {
              // 이미 스크리닝/합격/불합격 등 진행된 후보자는 스킵
              skipped++;
            }
          }

          // 새 후보자 insert
          if (newRows.length > 0) {
            const { error } = await supabase.from("candidates").insert(newRows);
            if (error) errors += newRows.length;
            else inserted += newRows.length;
          }

          // 대기 상태 후보자 정보 업데이트 (pipeline_status 건드리지 않음)
          for (const row of updateRows) {
            const { error } = await supabase
              .from("candidates")
              .update(row)
              .eq("sheet_source", row.sheet_source)
              .eq("sheet_row_identifier", row.sheet_row_identifier);
            if (error) errors++;
            else updated++;
          }

          const progress = Math.min(100, Math.round(((i + chunk.length) / total) * 100));
          send({ type: "progress", progress, inserted, errors, total });
        }

        send({
          type: "done",
          total,
          inserted,
          updated,
          skipped,
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
