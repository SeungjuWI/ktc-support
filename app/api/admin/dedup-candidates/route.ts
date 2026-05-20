import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST() {
  const supabase = getSupabaseAdmin();

  // 전체 candidates 조회
  const { data: candidates, error } = await supabase
    .from("candidates")
    .select("id, full_name, email, phone, sheet_source, sheet_row_identifier, pipeline_status, created_at")
    .order("created_at", { ascending: true });

  if (error || !candidates) {
    return NextResponse.json({ error: error?.message || "No data" }, { status: 500 });
  }

  // sheet_row_identifier 기준으로 그룹핑
  const groups = new Map<string, typeof candidates>();
  for (const c of candidates) {
    if (!c.sheet_row_identifier) continue;
    const key = c.sheet_row_identifier;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }

  let deleted = 0;
  const deleteIds: string[] = [];

  for (const [, group] of Array.from(groups)) {
    if (group.length <= 1) continue;

    // 진행된 상태(new가 아닌)가 있으면 그걸 keep, 아니면 가장 먼저 생성된 것 keep
    const sorted = group.sort((a, b) => {
      const aProgress = a.pipeline_status !== "new" ? 1 : 0;
      const bProgress = b.pipeline_status !== "new" ? 1 : 0;
      if (aProgress !== bProgress) return bProgress - aProgress;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    // 첫 번째(keep) 외 나머지 삭제 대상
    for (let i = 1; i < sorted.length; i++) {
      deleteIds.push(sorted[i].id);
    }
  }

  if (deleteIds.length > 0) {
    // batch delete (50개씩)
    for (let i = 0; i < deleteIds.length; i += 50) {
      const batch = deleteIds.slice(i, i + 50);
      await supabase.from("candidates").delete().in("id", batch);
      deleted += batch.length;
    }
  }

  return NextResponse.json({
    total: candidates.length,
    duplicateGroups: Array.from(groups.values()).filter((g) => g.length > 1).length,
    deleted,
  });
}
