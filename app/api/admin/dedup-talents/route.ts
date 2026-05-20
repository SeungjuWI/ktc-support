import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// 중복 talents 정리: 같은 이름으로 여러 카드가 있으면 최신 1개만 유지
export async function POST() {
  const supabase = getSupabaseAdmin();

  // 모든 talents 조회
  const { data: allTalents } = await supabase
    .from("talents")
    .select("id, name, created_at, ovr_score")
    .order("created_at", { ascending: false });

  if (!allTalents || allTalents.length === 0) {
    return NextResponse.json({ success: true, message: "No talents found", removed: 0 });
  }

  // 이름별 그룹핑
  const groups = new Map<string, typeof allTalents>();
  for (const t of allTalents) {
    const key = t.name.trim().toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  let removed = 0;
  const details: { name: string; kept: string; removed: string[] }[] = [];

  for (const [, group] of groups) {
    if (group.length <= 1) continue;

    // 가장 높은 점수의 카드 유지, 동점이면 최신
    group.sort((a, b) => (b.ovr_score || 0) - (a.ovr_score || 0) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const keep = group[0];
    const dupes = group.slice(1);

    for (const dupe of dupes) {
      // 중복 talent를 참조하는 candidates를 유지할 talent로 연결
      await supabase
        .from("candidates")
        .update({ talent_id: keep.id })
        .eq("talent_id", dupe.id);

      // 중복 talent 삭제
      await supabase.from("talents").delete().eq("id", dupe.id);
      removed++;
    }

    details.push({
      name: keep.name,
      kept: keep.id,
      removed: dupes.map((d) => d.id),
    });
  }

  return NextResponse.json({
    success: true,
    totalTalents: allTalents.length,
    duplicateGroups: details.length,
    removed,
    details,
  });
}

// GET으로 중복 현황만 조회 (삭제 안 함)
export async function GET() {
  const supabase = getSupabaseAdmin();

  const { data: allTalents } = await supabase
    .from("talents")
    .select("id, name, created_at, ovr_score")
    .order("created_at", { ascending: false });

  if (!allTalents) {
    return NextResponse.json({ success: true, duplicates: [] });
  }

  const groups = new Map<string, typeof allTalents>();
  for (const t of allTalents) {
    const key = t.name.trim().toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  const duplicates = Array.from(groups.entries())
    .filter(([, g]) => g.length > 1)
    .map(([name, g]) => ({ name, count: g.length, ids: g.map((t) => t.id) }));

  return NextResponse.json({
    success: true,
    totalTalents: allTalents.length,
    duplicateGroups: duplicates.length,
    totalDuplicates: duplicates.reduce((sum, d) => sum + d.count - 1, 0),
    duplicates,
  });
}
