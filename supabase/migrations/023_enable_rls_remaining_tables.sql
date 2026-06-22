-- 023: RLS가 빠진 테이블에 RLS 활성화 + admin 전용 정책
-- 대상: candidates, email_messages, email_thread_meta
-- 배경: 이 세 테이블은 RLS가 꺼져 있어 anon 키만 알면 누구나 읽기/수정/삭제 가능했음
--       (Supabase 보안 경고: rls_disabled_in_public)
-- 원칙: 이 테이블들은 모두 admin/super_admin 전용 데이터.
--   - admin 페이지는 브라우저에서 anon 키 + 로그인 세션(JWT)으로 접근 → 아래 정책으로 허용
--   - 서버 API 라우트는 SUPABASE_SERVICE_ROLE_KEY 사용 → RLS를 우회하므로 영향 없음
--   - 일반 user / 비로그인(anon)은 전부 차단

-- 공통: admin 또는 super_admin 인지 확인하는 헬퍼
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_profiles
    where id = auth.uid() and role in ('admin', 'super_admin')
  );
$$;

-- ============================================================
-- candidates
-- ============================================================
alter table candidates enable row level security;

drop policy if exists "candidates_admin_all" on candidates;
create policy "candidates_admin_all" on candidates
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- email_messages
-- ============================================================
alter table email_messages enable row level security;

drop policy if exists "email_messages_admin_all" on email_messages;
create policy "email_messages_admin_all" on email_messages
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- email_thread_meta
-- ============================================================
alter table email_thread_meta enable row level security;

drop policy if exists "email_thread_meta_admin_all" on email_thread_meta;
create policy "email_thread_meta_admin_all" on email_thread_meta
  for all
  using (public.is_admin())
  with check (public.is_admin());
