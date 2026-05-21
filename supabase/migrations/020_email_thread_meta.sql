-- 스레드 메타 정보 (별표, 삭제 등)
create table email_thread_meta (
  thread_id uuid primary key,
  starred boolean not null default false,
  deleted_at timestamptz
);
