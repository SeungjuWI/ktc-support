import type { SupabaseClient } from "@supabase/supabase-js";

// Supabase 기본 1000 row 제한 우회: count 조회 후 모든 페이지를 병렬로 fetch
// (기존 순차 페이지네이션은 페이지 수만큼 왕복 지연이 누적됨)
export async function fetchAllRows<T>(
  supabase: SupabaseClient,
  table: string,
  columns: string,
  orderBy: { column: string; ascending: boolean }[] = [{ column: "id", ascending: true }]
): Promise<{ rows: T[]; error: string | null }> {
  const PAGE = 1000;
  const { count, error: countError } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });
  if (countError) return { rows: [], error: countError.message };
  const total = count || 0;
  if (total === 0) return { rows: [], error: null };

  const pages = Math.ceil(total / PAGE);
  const results = await Promise.all(
    Array.from({ length: pages }, (_, i) => {
      let q = supabase.from(table).select(columns);
      for (const o of orderBy) q = q.order(o.column, { ascending: o.ascending });
      return q.range(i * PAGE, i * PAGE + PAGE - 1);
    })
  );

  const rows: T[] = [];
  for (const r of results) {
    if (r.error) return { rows: [], error: r.error.message };
    rows.push(...((r.data || []) as T[]));
  }
  return { rows, error: null };
}
